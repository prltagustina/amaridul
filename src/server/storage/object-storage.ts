import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/** S3-compatible in production (pending approval); private local folder in development. */
export interface ObjectStorage {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

const KEY_PATTERN = /^[a-z0-9][a-z0-9/_.-]*$/;
// Lab certificates, lot images and institutional PDFs. Anything else needs a deliberate decision.
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export class InvalidStorageKeyError extends Error {}
export class DisallowedContentTypeError extends Error {}

/** Files live outside public/, so they are never served directly. */
export class LocalObjectStorage implements ObjectStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private resolve(key: string): string {
    if (!KEY_PATTERN.test(key) || key.includes("..")) throw new InvalidStorageKeyError(`Clave inválida: ${key}`);
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new InvalidStorageKeyError(`Clave fuera del almacenamiento: ${key}`);
    return full;
  }

  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    const file = this.resolve(key);
    if (!ALLOWED_TYPES.has(contentType)) throw new DisallowedContentTypeError(`Tipo no permitido: ${contentType}`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  }

  async get(key: string): Promise<Uint8Array | null> {
    try {
      return await readFile(this.resolve(key));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }
}

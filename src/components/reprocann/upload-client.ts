"use client";

import { fileSizeLabel } from "@/lib/file-size";

// The browser side of sending a REPROCANN file to private storage, shared by the member's form
// and the admin's load and import. The server checks every file again, by its content.

export const MAX_BYTES = 10 * 1024 * 1024;
const TYPE_OF: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };
const ACCEPTED = new Set(Object.values(TYPE_OF));
export const ACCEPT_ATTR = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

export const typeOf = (f: File) => (ACCEPTED.has(f.type) ? f.type : (TYPE_OF[f.name.split(".").pop()?.toLowerCase() ?? ""] ?? ""));

/** What the browser can tell before sending. */
export function problemWith(f: File): string | undefined {
  if (f.size === 0) return "El archivo está vacío.";
  if (f.size > MAX_BYTES) return `El archivo pesa ${fileSizeLabel(f.size)}: el máximo es 10 MB.`;
  if (!typeOf(f)) return "Tiene que ser un PDF, JPG o PNG.";
}

const SEND_ERROR: Record<number, string> = {
  400: "No pudimos recibir el archivo. Volvé a elegirlo.",
  404: "Tu sesión terminó. Volvé a ingresar.",
  409: "No pudimos recibir el archivo. Volvé a elegirlo.",
  413: "El archivo pesa más de 10 MB.",
  415: "Tiene que ser un PDF, JPG o PNG.",
};

export type UploadTarget = { mode: "local" | "blob"; route: string };

/** Puts one file at `key` in private storage. Throws an Error with a message for people. */
export async function sendFile(target: UploadTarget, key: string, file: File): Promise<void> {
  try {
    if (target.mode === "blob") {
      const { upload } = await import("@vercel/blob/client");
      await upload(key, file, { access: "private", handleUploadUrl: target.route, contentType: typeOf(file) });
      return;
    }
    const res = await fetch(`${target.route}?clave=${encodeURIComponent(key)}`, { method: "PUT", body: file, headers: { "content-type": typeOf(file) } });
    if (res.status !== 204) throw new Error(SEND_ERROR[res.status] ?? "");
  } catch (e) {
    const message = e instanceof Error ? `${e.name} ${e.message}` : "";
    if (e instanceof Error && Object.values(SEND_ERROR).includes(e.message)) throw e;
    if (/too large|FileTooLarge/i.test(message)) throw new Error(SEND_ERROR[413]);
    if (/content ?type/i.test(message)) throw new Error(SEND_ERROR[415]);
    throw new Error("No pudimos enviar el archivo. Revisá tu conexión y probá de nuevo.");
  }
}

/** SHA-256 of a file, computed in the browser: lets an import be checked without sending the files. */
export async function fileSha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** The real type of a file from its first bytes, as the server reads it. */
export async function sniffType(file: File): Promise<string> {
  const b = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const starts = (sig: number[]) => b.length >= sig.length && sig.every((x, i) => b[i] === x);
  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  return "otro";
}

import "server-only";
import { del, get, put } from "@vercel/blob";
import type { ObjectStorage } from "./object-storage";

/**
 * Vercel Blob with private access: files are only reachable with the store's token, from the
 * server. Every call asks for private access; there is no public variant to fall back to.
 * Reads and writes use BLOB_READ_WRITE_TOKEN.
 */
export class PrivateBlobStorage implements ObjectStorage {
  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await put(key, Buffer.from(body), { access: "private", contentType, addRandomSuffix: false, allowOverwrite: false });
  }

  async get(key: string): Promise<Uint8Array | null> {
    const found = await get(key, { access: "private" });
    if (!found || found.statusCode !== 200) return null;
    return new Uint8Array(await new Response(found.stream).arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    await del(key);
  }
}

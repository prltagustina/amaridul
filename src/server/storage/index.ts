import "server-only";
import { getEnv } from "@/server/env";
import { LocalObjectStorage, type ObjectStorage } from "./object-storage";
import { PrivateBlobStorage } from "./private-blob-storage";

type StorageEnv = { VERCEL?: string; BLOB_READ_WRITE_TOKEN?: string; REPROCANN_UPLOADS?: string; APP_ENV?: string; STORAGE_DIR?: string };

const isDevelopmentMachine = (env: StorageEnv) => !env.VERCEL && (env.APP_ENV === "local" || env.APP_ENV === "test");

/**
 * Where member documents live: a private folder outside public/ on the development machine, a
 * private Vercel Blob store on a deployment. Null when neither is configured: there is no public
 * alternative, the documents simply cannot be stored or read there.
 */
export function documentStorage(env: StorageEnv = { ...process.env, APP_ENV: getEnv().APP_ENV, STORAGE_DIR: getEnv().STORAGE_DIR }): ObjectStorage | null {
  if (env.VERCEL) return env.BLOB_READ_WRITE_TOKEN ? new PrivateBlobStorage() : null;
  return isDevelopmentMachine(env) ? new LocalObjectStorage(env.STORAGE_DIR ?? ".data/storage") : null;
}

export type UploadMode = "local" | "blob" | "unavailable";

/**
 * How a member's browser sends a file. On a deployment the file goes straight to the private store
 * (functions accept 4.5 MB at most) and only once REPROCANN_UPLOADS=on, set after checking that the
 * store is private and that the site's security policy lets the browser reach it.
 */
export function uploadMode(env: StorageEnv = { ...process.env, APP_ENV: getEnv().APP_ENV }): UploadMode {
  if (env.VERCEL) return env.BLOB_READ_WRITE_TOKEN && env.REPROCANN_UPLOADS === "on" ? "blob" : "unavailable";
  return isDevelopmentMachine(env) ? "local" : "unavailable";
}

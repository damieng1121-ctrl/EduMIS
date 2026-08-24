import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

/**
 * Local-disk file storage for tenant logo uploads. Fine for a single
 * container/dev use, but doesn't survive a redeploy and won't work across
 * multiple Cloud Run instances — swap this module for a Google Cloud
 * Storage-backed implementation (same functions) before going to
 * production. Nothing outside this file needs to change to do that: callers
 * only deal in opaque storage keys, never filesystem paths directly.
 */

const STORAGE_ROOT = process.env.UPLOAD_STORAGE_DIR
  ? path.resolve(process.env.UPLOAD_STORAGE_DIR)
  : path.resolve(process.cwd(), "storage", "uploads");

export class UploadTooLargeError extends Error {}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "file";
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB — a nav-bar/login logo, not a photo library

/** One logo per tenant — a fresh upload always replaces the previous file. */
export async function saveTenantLogo(tenantId: string, fileName: string, data: Buffer): Promise<{ key: string }> {
  if (data.byteLength > MAX_LOGO_BYTES) {
    throw new UploadTooLargeError(`File exceeds ${MAX_LOGO_BYTES / (1024 * 1024)}MB limit`);
  }
  const key = path.posix.join("tenant-logos", tenantId, sanitizeFileName(fileName));
  const onDisk = resolveOnDisk(key);
  await mkdir(path.dirname(onDisk), { recursive: true });
  await writeFile(onDisk, data);
  return { key };
}

function resolveOnDisk(key: string): string {
  const resolved = path.resolve(STORAGE_ROOT, key);
  // Defense in depth against a malformed/malicious key escaping the storage root.
  if (!resolved.startsWith(STORAGE_ROOT + path.sep)) {
    throw new Error("Invalid storage key");
  }
  return resolved;
}

export async function readUpload(key: string): Promise<Buffer> {
  return readFile(resolveOnDisk(key));
}

export async function deleteUpload(key: string): Promise<void> {
  await unlink(resolveOnDisk(key)).catch(() => {});
}

import { S3Client } from "@aws-sdk/client-s3";
import { requireEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const R2_BUCKET = "bulk-images";

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB per file

let _r2: S3Client | null = null;

export function getR2Client(): S3Client {
  if (_r2) return _r2;
  _r2 = new S3Client({
    region: "auto",
    endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY"),
      secretAccessKey: requireEnv("R2_SECRET_KEY"),
    },
  });
  return _r2;
}

export function r2CdnUrl(): string {
  return requireEnv("NEXT_PUBLIC_R2_CDN_URL");
}

/** Returns the authenticated user id or throws. */
export async function requireAuthUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Unauthorized");
  }
  return user.id;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidProjectId(id: string): boolean {
  return UUID_RE.test(id);
}

/** Guards object keys used in R2 lookups against traversal / empty segments. */
export function sanitizeObjectKey(key: string): boolean {
  if (!key || key.length > 1024) return false;
  if (key.startsWith("/") || key.includes("\\")) return false;
  return key
    .split("/")
    .every((part) => part.length > 0 && part !== "." && part !== "..");
}

/** Guards user-supplied filenames before they become part of an object key. */
export function sanitizeFileName(name: string): boolean {
  if (!name || name.length > 200) return false;
  if (name.trim() !== name) return false;
  if (name.startsWith(".") || name.includes("/") || name.includes("\\")) {
    return false;
  }
  return !name.split(".").includes("..");
}

"use client";

import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabase/client";
import { todayIST } from "@/lib/date";

const BUCKET = "photos";

/**
 * Compresses a camera photo to ~300 KB (site networks are slow) and uploads it to
 * the private bucket at  <company_id>/<machine_id>/<date>-<kind>-<random>.jpg
 * Returns the storage path to save in the database.
 */
export async function uploadPhoto(
  file: File,
  companyId: string,
  machineId: string,
  kind: "start" | "end" | "breakdown",
): Promise<string> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: "image/jpeg",
  });
  const random = Math.random().toString(36).slice(2, 10);
  const path = `${companyId}/${machineId}/${todayIST()}-${kind}-${random}.jpg`;
  const { error } = await supabase().storage.from(BUCKET).upload(path, compressed, { contentType: "image/jpeg" });
  if (error) throw error;
  return path;
}

/** Signed URLs (valid 1 hour) for private photos, keyed by path. */
export async function signedUrls(paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  if (unique.length === 0) return {};
  const { data } = await supabase().storage.from(BUCKET).createSignedUrls(unique, 60 * 60);
  const out: Record<string, string> = {};
  for (const item of data ?? []) if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  return out;
}

import { createClient } from '@/lib/supabase/client';
import { normalizeImageKey } from '@/app/sandbox/utils/data';
import type { DataImageMap } from '@/app/sandbox/types';

const BUCKET = 'data-images';

/** Upload a batch of image files to Supabase Storage and return the DataImageMap + total bytes uploaded. */
export async function uploadDataImages(
  userId: string,
  projectId: string,
  files: File[],
): Promise<{ map: DataImageMap; bytesUploaded: number }> {
  const supabase = createClient();
  const map: DataImageMap = {};
  let bytesUploaded = 0;

  await Promise.all(
    files.map(async (file) => {
      const path = `${userId}/${projectId}/${file.name}`;

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true });

      if (error) {
        console.error(`Failed to upload ${file.name}:`, error.message);
        return;
      }

      bytesUploaded += file.size;

      // Create a signed URL for immediate use
      const { data: signedData } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 3600);

      if (signedData?.signedUrl) {
        map[file.name.toLowerCase()] = signedData.signedUrl;
        map[normalizeImageKey(file.name)] = signedData.signedUrl;
      }
    }),
  );

  return { map, bytesUploaded };
}

/** Load all data images for a project from Supabase Storage. */
export async function loadDataImages(
  userId: string,
  projectId: string,
): Promise<DataImageMap> {
  const supabase = createClient();
  const folder = `${userId}/${projectId}`;

  const { data: files, error } = await supabase.storage
    .from(BUCKET)
    .list(folder);

  if (error || !files || files.length === 0) return {};

  const map: DataImageMap = {};

  // Generate signed URLs for all files
  const paths = files
    .filter((f) => f.name && !f.name.startsWith('.'))
    .map((f) => `${folder}/${f.name}`);

  if (paths.length === 0) return {};

  const { data: signedUrls } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, 3600);

  if (signedUrls) {
    for (const item of signedUrls) {
      if (!item.signedUrl || item.error) continue;
      // Extract filename from path
      const fileName = item.path?.split('/').pop();
      if (!fileName) continue;
      map[fileName.toLowerCase()] = item.signedUrl;
      map[normalizeImageKey(fileName)] = item.signedUrl;
    }
  }

  return map;
}

/** Delete all data images for a project from Supabase Storage. Returns bytes freed. */
export async function deleteProjectDataImages(
  userId: string,
  projectId: string,
): Promise<number> {
  const supabase = createClient();
  const folder = `${userId}/${projectId}`;

  const { data: files } = await supabase.storage
    .from(BUCKET)
    .list(folder);

  if (!files || files.length === 0) return 0;

  let bytesFreed = 0;
  for (const f of files) {
    bytesFreed += f.metadata?.size ?? 0;
  }

  const paths = files.map((f) => `${folder}/${f.name}`);
  await supabase.storage.from(BUCKET).remove(paths);

  return bytesFreed;
}

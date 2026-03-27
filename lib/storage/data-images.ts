import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { normalizeImageKey } from "@/app/sandbox/utils/data";
import type { DataImageMap } from "@/app/sandbox/types";

const BUCKET = "bulk-images";
const CDN_URL = process.env.NEXT_PUBLIC_R2_CDN_URL; // e.g. https://cdn.yoursite.com or your r2.dev URL

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
});

/** Get the public CDN URL for a given path */
function getPublicUrl(path: string): string {
  return `${CDN_URL}/${path}`;
}

/** Upload a batch of image files to R2 and return the DataImageMap + total bytes uploaded. */
export async function uploadDataImages(
  userId: string,
  projectId: string,
  files: File[],
): Promise<{ map: DataImageMap; bytesUploaded: number }> {
  const map: DataImageMap = {};
  let bytesUploaded = 0;

  await Promise.all(
    files.map(async (file) => {
      const path = `${userId}/${projectId}/${file.name}`;
      const arrayBuffer = await file.arrayBuffer();

      try {
        await r2.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: path,
            Body: Buffer.from(arrayBuffer),
            ContentType: file.type || "image/jpeg",
          }),
        );

        bytesUploaded += file.size;

        const publicUrl = getPublicUrl(path);
        map[file.name.toLowerCase()] = publicUrl;
        map[normalizeImageKey(file.name)] = publicUrl;
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }),
  );

  return { map, bytesUploaded };
}

/** Load all data images for a project from R2. */
export async function loadDataImages(
  userId: string,
  projectId: string,
): Promise<DataImageMap> {
  const folder = `${userId}/${projectId}/`;

  const { Contents } = await r2.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: folder,
    }),
  );

  if (!Contents || Contents.length === 0) return {};

  const map: DataImageMap = {};

  for (const obj of Contents) {
    if (!obj.Key) continue;
    const fileName = obj.Key.split("/").pop();
    if (!fileName || fileName.startsWith(".")) continue;

    const publicUrl = getPublicUrl(obj.Key);
    map[fileName.toLowerCase()] = publicUrl;
    map[normalizeImageKey(fileName)] = publicUrl;
  }

  return map;
}

/** Delete all data images for a project from R2. Returns bytes freed. */
export async function deleteProjectDataImages(
  userId: string,
  projectId: string,
): Promise<number> {
  const folder = `${userId}/${projectId}/`;

  const { Contents } = await r2.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: folder,
    }),
  );

  if (!Contents || Contents.length === 0) return 0;

  const bytesFreed = Contents.reduce((acc, obj) => acc + (obj.Size ?? 0), 0);

  await r2.send(
    new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: {
        Objects: Contents.map((obj) => ({ Key: obj.Key! })),
      },
    }),
  );

  return bytesFreed;
}

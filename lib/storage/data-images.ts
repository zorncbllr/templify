import { normalizeImageKey } from "@/app/sandbox/utils/data";
import type { DataImageMap } from "@/app/sandbox/types";

export async function uploadDataImages(
  userId: string,
  projectId: string,
  files: File[],
): Promise<{ map: DataImageMap; bytesUploaded: number }> {
  const formData = new FormData();
  formData.append("userId", userId);
  formData.append("projectId", projectId);
  files.forEach((f) => formData.append("files", f));

  const res = await fetch("/api/r2/upload", { method: "POST", body: formData });
  const text = await res.text();
  if (!res.ok) throw new Error(`Upload failed: ${text}`);

  const { results, bytesUploaded } = JSON.parse(text);

  const map: DataImageMap = {};
  for (const [name, url] of Object.entries(results as Record<string, string>)) {
    map[name.toLowerCase()] = url;
    map[normalizeImageKey(name)] = url;
  }
  return { map, bytesUploaded };
}

export async function loadDataImages(
  userId: string,
  projectId: string,
): Promise<DataImageMap> {
  const res = await fetch(
    `/api/r2/list?userId=${userId}&projectId=${projectId}`,
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`List failed: ${text}`);
  const { files } = JSON.parse(text);

  const map: DataImageMap = {};
  for (const { key, url } of files) {
    const fileName = key.split("/").pop();
    if (!fileName) continue;
    map[fileName.toLowerCase()] = url;
    map[normalizeImageKey(fileName)] = url;
  }
  return map;
}

export async function deleteProjectDataImages(
  userId: string,
  projectId: string,
): Promise<number> {
  const res = await fetch("/api/r2/delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, projectId }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Delete failed: ${text}`);

  const { bytesFreed } = JSON.parse(text);
  return bytesFreed;
}

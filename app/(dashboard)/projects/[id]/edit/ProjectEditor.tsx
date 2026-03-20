"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  CanvasObject,
  CanvasSize,
  RowData,
  DataImageMap,
} from "@/app/sandbox/types";
import Editor from "@/app/sandbox/components/Editor";
import { createClient } from "@/lib/supabase/client";
import { parseSpreadsheet } from "@/app/sandbox/utils/data";
import {
  uploadDataImages,
  loadDataImages,
  deleteProjectDataImages,
} from "@/lib/storage/data-images";
import { getPlanLimits } from "@/lib/config/pricing";

interface ProjectEditorProps {
  project: {
    id: string;
    objects: CanvasObject[];
    canvas_width: number;
    canvas_height: number;
    columns: string[];
    data_images_label: string | null;
    data_file_url: string | null;
    data_file_path: string | null;
    name: string;
  };
  userPlan: string;
  userId: string;
  displayName: string;
  storageUsed: number;
}

export default function ProjectEditor({
  project,
  userPlan,
  userId,
  displayName,
  storageUsed: initialStorageUsed,
}: ProjectEditorProps) {
  const [rows, setRows] = useState<RowData[]>([]);
  const [dataImages, setDataImages] = useState<DataImageMap>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [storageUsed, setStorageUsed] = useState(initialStorageUsed);

  const limits = getPlanLimits(userPlan);

  useEffect(() => {
    async function loadAll() {
      const promises: Promise<void>[] = [];

      // Load data file
      if (project.data_file_url) {
        promises.push(
          (async () => {
            try {
              const res = await fetch(project.data_file_url!);
              const blob = await res.blob();
              const fileName =
                project.data_file_path?.split("/").pop() ?? "data.xlsx";
              const file = new File([blob], fileName, { type: blob.type });
              const { rows: parsedRows } = await parseSpreadsheet(file);
              setRows(parsedRows);
            } catch {
              // Continue without data file
            }
          })(),
        );
      }

      // Load data images from storage
      promises.push(
        (async () => {
          try {
            const map = await loadDataImages(userId, project.id);
            if (Object.keys(map).length > 0) {
              setDataImages(map);
            }
          } catch {
            // Continue without data images
          }
        })(),
      );

      await Promise.all(promises);
      setDataLoading(false);
    }

    loadAll();
  }, [project.data_file_url, project.data_file_path, userId, project.id]);

  const handleSave = useCallback(
    async (state: { objects: CanvasObject[]; canvasSize: CanvasSize }) => {
      const supabase = createClient();
      await supabase
        .from("projects")
        .update({
          objects: state.objects as any,
          canvas_width: state.canvasSize.width,
          canvas_height: state.canvasSize.height,
        })
        .eq("id", project.id);
    },
    [project.id],
  );

  const handleDataImagesUpload = useCallback(
    async (files: FileList): Promise<DataImageMap> => {
      const imageFiles = Array.from(files).filter(
        (f) => /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(f.name) || f.type.startsWith("image/"),
      );
      if (!imageFiles.length) return {};

      // Check storage cap
      const totalSize = imageFiles.reduce((sum, f) => sum + f.size, 0);
      if (storageUsed + totalSize > limits.storageBytes) {
        throw new Error(
          `Storage limit exceeded. You have ${formatBytes(limits.storageBytes - storageUsed)} remaining. Upgrade your plan for more storage.`,
        );
      }

      // Delete existing images for this project first
      const bytesFreed = await deleteProjectDataImages(userId, project.id);

      // Upload new images
      const { map, bytesUploaded } = await uploadDataImages(
        userId,
        project.id,
        imageFiles,
      );

      // Update storage_used in profile
      const newStorageUsed = storageUsed - bytesFreed + bytesUploaded;
      setStorageUsed(newStorageUsed);
      const supabase = createClient();
      await supabase.rpc("update_storage_used", {
        delta: bytesUploaded - bytesFreed,
      });

      setDataImages(map);
      return map;
    },
    [userId, project.id, storageUsed, limits.storageBytes],
  );

  const handleDataImagesClear = useCallback(async () => {
    const bytesFreed = await deleteProjectDataImages(userId, project.id);
    setStorageUsed((prev) => prev - bytesFreed);
    setDataImages({});
    const supabase = createClient();
    await supabase.rpc("update_storage_used", { delta: -bytesFreed });
  }, [userId, project.id]);

  if (dataLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#0a0a10",
          color: "rgba(240,237,232,0.5)",
          fontSize: 14,
        }}
      >
        Loading project data...
      </div>
    );
  }

  return (
    <Editor
      projectId={project.id}
      initialObjects={project.objects}
      initialCanvasSize={{
        width: project.canvas_width,
        height: project.canvas_height,
      }}
      initialColumns={project.columns}
      initialRows={rows}
      initialDataImages={dataImages}
      initialDataFileName={project.data_file_path?.split("/").pop() ?? null}
      initialDataImagesLabel={project.data_images_label}
      initialProjectName={project.name}
      watermark={userPlan === "free"}
      user={{ plan: userPlan, displayName }}
      onSave={handleSave}
      onDataImagesUpload={handleDataImagesUpload}
      onDataImagesClear={handleDataImagesClear}
      maxPhotoColumns={limits.maxPhotoColumns}
      maxRows={limits.maxRows}
    />
  );
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

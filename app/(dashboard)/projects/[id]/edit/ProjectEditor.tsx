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
    data_rows: RowData[];
    data_images_label: string | null;
    data_file_name: string | null;
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
  const [dataImages, setDataImages] = useState<DataImageMap>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [storageUsed, setStorageUsed] = useState(initialStorageUsed);

  const limits = getPlanLimits(userPlan);

  useEffect(() => {
    async function loadDataImagesFromStorage() {
      try {
        const map = await loadDataImages(userId, project.id);
        if (Object.keys(map).length > 0) {
          setDataImages(map);
        }
      } catch {
        // Continue without data images
      }
      setDataLoading(false);
    }

    loadDataImagesFromStorage();
  }, [userId, project.id]);

  const handleSave = useCallback(
    async (state: {
      objects: CanvasObject[];
      canvasSize: CanvasSize;
      columns: string[];
      rows: RowData[];
      dataImagesLabel: string | null;
      dataFileName: string | null;
      thumbnail: string | null;
    }) => {
      const supabase = createClient();
      const updateData: Record<string, any> = {
        objects: state.objects as any,
        canvas_width: state.canvasSize.width,
        canvas_height: state.canvasSize.height,
        columns: state.columns as any,
        data_rows: state.rows as any,
        row_count: state.rows.length,
        data_images_label: state.dataImagesLabel,
        data_file_name: state.dataFileName,
      };
      if (state.thumbnail !== null) {
        updateData.thumbnail = state.thumbnail;
      }
      const { error } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", project.id);
      if (error) {
        console.error("Project save failed:", error.message);
        throw error;
      }
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
      initialRows={project.data_rows}
      initialDataImages={dataImages}
      initialDataFileName={project.data_file_name}
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

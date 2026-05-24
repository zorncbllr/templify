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
        (f) =>
          /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(f.name) ||
          f.type.startsWith("image/"),
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
    return <EditorSkeleton />;
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

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-[rgba(255,255,255,0.03)] ${className ?? ""}`}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 60%, transparent 100%)",
          animation: "skeleton-shimmer 1.8s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-app-bg-deep">
      <style>{`
        @keyframes skeleton-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes skeleton-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <header
        className="flex items-center justify-between px-4 h-[50px] border-b border-border/60 shrink-0"
        style={{ animation: "skeleton-fade-in 0.3s ease-out" }}
      >
        <div className="flex items-center gap-2.5">
          <Shimmer className="w-[26px] h-[26px] !rounded-md" />
          <Shimmer className="w-[70px] h-[13px]" />
          <div className="w-px h-[18px] bg-[rgba(255,255,255,0.06)]" />
          <Shimmer className="w-[120px] h-[13px]" />
          <div className="w-px h-[18px] bg-[rgba(255,255,255,0.06)]" />
          <div className="flex gap-0.5">
            <Shimmer className="w-7 h-7" />
            <Shimmer className="w-7 h-7" />
          </div>
          <Shimmer className="w-[110px] h-[28px]" />
        </div>
        <div className="flex items-center gap-2">
          <Shimmer className="w-[90px] h-[32px]" />
          <Shimmer className="w-[190px] h-[32px]" />
          <div className="w-px h-[18px] bg-[rgba(255,255,255,0.06)]" />
          <Shimmer className="w-[42px] h-[22px]" />
          <Shimmer className="w-[80px] h-[13px]" />
          <Shimmer className="w-7 h-7" />
          <Shimmer className="w-7 h-7" />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <aside
          className="w-[200px] shrink-0 border-r border-r-[rgba(255,255,255,0.06)] bg-[#0e0e0e] flex flex-col"
          style={{ animation: "skeleton-fade-in 0.4s ease-out" }}
        >
          {/* Image upload area */}
          <div className="px-2.5 py-2 border-b border-b-[rgba(255,255,255,0.06)]">
            <Shimmer className="w-full h-[42px]" />
          </div>

          {/* Data file area */}
          <div className="px-2.5 py-2 border-b border-b-[rgba(255,255,255,0.06)]">
            <Shimmer className="w-full h-[42px]" />
          </div>

          {/* Data images area */}
          <div className="px-2.5 py-2 border-b border-b-[rgba(255,255,255,0.06)]">
            <Shimmer className="w-full h-[42px]" />
          </div>

          {/* Layers section */}
          <div className="px-2.5 pt-3 flex flex-col gap-2">
            <Shimmer className="w-[50px] h-[8px]" />
            <div className="flex flex-col gap-1.5 mt-1">
              <Shimmer className="w-full h-[30px]" />
              <Shimmer className="w-full h-[30px]" />
              <Shimmer className="w-full h-[30px]" />
            </div>
          </div>

          {/* Shortcuts section at bottom */}
          <div className="mt-auto px-2.5 pb-3">
            <Shimmer className="w-[70px] h-[8px]" />
          </div>
        </aside>

        {/* Canvas area */}
        <main
          className="flex-1 bg-app-bg-deep flex items-center justify-center relative"
          style={{ animation: "skeleton-fade-in 0.5s ease-out" }}
        >
          <Shimmer className="w-[420px] h-[280px] !rounded-lg" />
          {/* Zoom controls hint */}
          <div className="absolute bottom-4 right-4 flex gap-1">
            <Shimmer className="w-7 h-7" />
            <Shimmer className="w-7 h-7" />
            <Shimmer className="w-7 h-7" />
          </div>
          {/* Page info hint */}
          <Shimmer className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[140px] h-[10px]" />
        </main>

        {/* Right panel */}
        <aside
          className="w-[248px] shrink-0 border-l border-l-[rgba(255,255,255,0.06)] bg-[#0e0e0e] flex flex-col overflow-hidden"
          style={{ animation: "skeleton-fade-in 0.6s ease-out" }}
        >
          {/* Properties header */}
          <div className="px-3 pt-3 pb-2 border-b border-b-[rgba(255,255,255,0.06)]">
            <Shimmer className="w-[70px] h-[8px]" />
            <div className="flex gap-2 mt-2.5">
              <Shimmer className="flex-1 h-[30px]" />
              <Shimmer className="flex-1 h-[30px]" />
            </div>
            <div className="flex gap-2 mt-2">
              <Shimmer className="flex-1 h-[30px]" />
              <Shimmer className="flex-1 h-[30px]" />
            </div>
          </div>

          {/* Style section */}
          <div className="px-3 pt-3 pb-2 border-b border-b-[rgba(255,255,255,0.06)]">
            <Shimmer className="w-[50px] h-[8px]" />
            <Shimmer className="w-full h-[30px] mt-2.5" />
            <Shimmer className="w-full h-[30px] mt-2" />
            <div className="flex gap-2 mt-2">
              <Shimmer className="flex-1 h-[30px]" />
              <Shimmer className="flex-1 h-[30px]" />
            </div>
          </div>

          {/* Shadow section */}
          <div className="px-3 pt-3 pb-2 border-b border-b-[rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between">
              <Shimmer className="w-[55px] h-[8px]" />
              <Shimmer className="w-[32px] h-[16px] !rounded-full" />
            </div>
          </div>

          {/* Border section */}
          <div className="px-3 pt-3 pb-2">
            <div className="flex items-center justify-between">
              <Shimmer className="w-[45px] h-[8px]" />
              <Shimmer className="w-[32px] h-[16px] !rounded-full" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

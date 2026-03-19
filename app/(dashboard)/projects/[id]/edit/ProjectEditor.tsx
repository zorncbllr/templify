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
  };
  userPlan: string;
}

export default function ProjectEditor({
  project,
  userPlan,
}: ProjectEditorProps) {
  const [rows, setRows] = useState<RowData[]>([]);
  const [dataImages] = useState<DataImageMap>({});
  const [dataLoading, setDataLoading] = useState(!!project.data_file_url);

  useEffect(() => {
    if (!project.data_file_url) return;

    async function loadDataFile() {
      try {
        const res = await fetch(project.data_file_url!);
        const blob = await res.blob();
        const fileName =
          project.data_file_path?.split("/").pop() ?? "data.xlsx";
        const file = new File([blob], fileName, { type: blob.type });
        const { rows: parsedRows } = await parseSpreadsheet(file);
        setRows(parsedRows);
      } catch {
        // If data file fails to load, continue without it
      } finally {
        setDataLoading(false);
      }
    }

    loadDataFile();
  }, [project.data_file_url, project.data_file_path]);

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
    [project.id]
  );

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
      initialDataFileName={
        project.data_file_path?.split("/").pop() ?? null
      }
      initialDataImagesLabel={project.data_images_label}
      watermark={userPlan === "free"}
      user={{ plan: userPlan }}
      onSave={handleSave}
    />
  );
}

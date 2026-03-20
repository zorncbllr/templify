import { useState } from "react";
import type {
  CanvasObject,
  ImageObject,
  DataImageMap,
  RowData,
} from "../types/index";
import { PLACEHOLDER_SRC } from "../types/constants";
import { resolveDataImageSrc } from "../utils/data";
import { ToggleSwitch } from "./StylePanels";
import { IconCamera, IconClose, IconCheck } from "@/components/Icons";

// ─── DataImagesPanel ──────────────────────────────────────────────────────────

export function DataImagesPanel({
  dataImages,
  dataImagesLabel,
  dataImagesLoading,
  autoDetectedColumns,
  objects,
  onUpload,
  onClear,
  onPlacePhoto,
}: {
  dataImages: DataImageMap;
  dataImagesLabel: string | null;
  dataImagesLoading: boolean;
  autoDetectedColumns: string[];
  objects: CanvasObject[];
  onUpload: (files: FileList) => void;
  onClear: () => void;
  onPlacePhoto: (column: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const imageCount = Object.keys(dataImages).length / 2;

  return (
    <div className="px-2.5 py-2 border-b border-[rgba(255,255,255,0.06)]">
      {dataImagesLabel ? (
        <div className="bg-[rgba(99,179,237,0.05)] border border-[rgba(99,179,237,0.2)] rounded-md px-2 py-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[5px] min-w-0">
              <span className="shrink-0">
                <IconCamera size={11} />
              </span>
              <span className="text-[9px] font-semibold text-[#63b3ed] overflow-hidden text-ellipsis whitespace-nowrap">
                {dataImagesLabel}
              </span>
              <span className="text-[8px] text-[rgba(240,237,232,0.3)] shrink-0">
                {Math.round(imageCount)} img
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <label className="text-[8px] text-[rgba(240,237,232,0.4)] cursor-pointer underline">
                Replace
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && onUpload(e.target.files)}
                />
              </label>
              <button
                onClick={onClear}
                className="bg-transparent border-none text-[rgba(240,237,232,0.3)] cursor-pointer text-[10px] p-0"
              >
                <IconClose size={9} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files) onUpload(e.dataTransfer.files);
          }}
          className="flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer"
          style={{
            background: dragOver
              ? "rgba(99,179,237,0.08)"
              : "rgba(255,255,255,0.02)",
            border: `1.5px dashed ${dragOver ? "#63b3ed" : "rgba(255,255,255,0.09)"}`,
          }}
        >
          {dataImagesLoading ? (
            <div
              className="w-3.5 h-3.5 rounded-full animate-spin shrink-0"
              style={{
                border: "2px solid rgba(99,179,237,0.2)",
                borderTop: "2px solid #63b3ed",
              }}
            />
          ) : (
            <IconCamera size={14} />
          )}
          <div>
            <p className="text-[10px] font-semibold text-[rgba(240,237,232,0.5)]">
              {dataImagesLoading ? "Loading…" : "Upload Photos"}
            </p>
            <p className="text-[8px] text-[rgba(240,237,232,0.22)]">
              Select multiple images
            </p>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && onUpload(e.target.files)}
          />
        </label>
      )}

      {autoDetectedColumns.length > 0 && (
        <div className="mt-1.5">
          <p className="text-[8px] text-[rgba(240,237,232,0.22)] mb-[3px] leading-[1.4]">
            Photo fields — click to place:
          </p>
          <div className="flex flex-col gap-0.5">
            {autoDetectedColumns.map((col) => {
              const cnt = objects.filter(
                (o) =>
                  o.kind === "image" &&
                  (o as ImageObject).isDataImage &&
                  (o as ImageObject).dataImageColumn === col,
              ).length;
              return (
                <button
                  key={col}
                  onClick={() => onPlacePhoto(col)}
                  className="chip w-full text-left px-[7px] py-1 rounded-md text-[9px] font-medium cursor-pointer flex items-center justify-between"
                  style={{
                    background:
                      cnt > 0
                        ? "rgba(99,179,237,0.08)"
                        : "rgba(255,255,255,0.02)",
                    border: `1px solid ${cnt > 0 ? "rgba(99,179,237,0.28)" : "rgba(255,255,255,0.07)"}`,
                    color: cnt > 0 ? "#63b3ed" : "rgba(240,237,232,0.55)",
                  }}
                >
                  <div className="flex items-center gap-[5px] min-w-0 leading-none">
                    <span className="flex items-center leading-[0] shrink-0 translate-y-[-2px]">
                      <IconCamera size={10} />
                    </span>
                    <span className="font-mono text-[9px] overflow-hidden text-ellipsis whitespace-nowrap">
                      {col}
                    </span>
                  </div>
                  <span className="flex items-center gap-[3px] shrink-0">
                    {cnt > 0 && (
                      <span className="flex items-center bg-[rgba(99,179,237,0.2)] text-[#63b3ed] rounded-md px-1 py-0 text-[8px] font-bold">
                        {cnt}
                      </span>
                    )}
                    <span className="flex items-center opacity-40 text-[10px]">
                      +
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DataImageInfo ────────────────────────────────────────────────────────────

export function DataImageInfo({
  obj,
  dataImages,
  rows,
  baseRowIndex,
}: {
  obj: ImageObject;
  dataImages: DataImageMap;
  rows: RowData[];
  baseRowIndex: number;
}) {
  const previewSrc = resolveDataImageSrc(
    obj.isDataImage,
    obj.dataImageColumn,
    0,
    obj.src,
    rows,
    baseRowIndex,
    dataImages,
  );
  const hasMatch =
    previewSrc && previewSrc !== PLACEHOLDER_SRC && previewSrc !== obj.src;
  const currentRow = rows[baseRowIndex] ?? null;

  return (
    <div className="p-2.5 rounded-md bg-[rgba(99,179,237,0.05)] border border-[rgba(99,179,237,0.25)] flex flex-col gap-2">
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 10, color: "rgba(240,237,232,0.45)" }}>
          Photo column
        </span>
        <span
          style={{
            padding: "2px 7px",
            borderRadius: 6,
            fontSize: 9,
            fontWeight: 700,
            background: "rgba(99,179,237,0.15)",
            border: "1px solid rgba(99,179,237,0.28)",
            color: "#63b3ed",
            fontFamily: "monospace",
          }}
        >
          {obj.dataImageColumn || "—"}
        </span>
        <span
          style={{
            marginLeft: "auto",
            padding: "1px 5px",
            borderRadius: 6,
            fontSize: 8,
            fontWeight: 700,
            background: "rgba(99,179,237,0.1)",
            color: "rgba(99,179,237,0.55)",
            border: "1px solid rgba(99,179,237,0.15)",
          }}
        >
          AUTO
        </span>
      </div>

      {obj.dataImageColumn && (
        <div
          style={{
            padding: "7px 8px",
            borderRadius: 6,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p
            style={{
              fontSize: 8,
              color: "rgba(240,237,232,0.3)",
              marginBottom: 5,
            }}
          >
            PREVIEW · CURRENT ROW
          </p>
          {hasMatch ? (
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <img
                src={previewSrc!}
                alt="preview"
                style={{
                  width: 36,
                  height: 36,
                  objectFit: "cover",
                  borderRadius: 6,
                  border: "1px solid rgba(99,179,237,0.3)",
                  flexShrink: 0,
                }}
              />
              <div>
                <p style={{ fontSize: 9, color: "#63b3ed", fontWeight: 600 }}>
                  <IconCheck size={10} /> Match found
                </p>
                <p
                  style={{
                    fontSize: 8,
                    color: "rgba(240,237,232,0.3)",
                    marginTop: 2,
                  }}
                >
                  Value:{" "}
                  <span
                    style={{
                      fontFamily: "monospace",
                      color: "rgba(240,237,232,0.5)",
                    }}
                  >
                    {currentRow?.[obj.dataImageColumn] ?? "—"}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px dashed rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <IconCamera size={14} style={{ opacity: 0.3 }} />
              </div>
              <div>
                <p style={{ fontSize: 9, color: "#f6ad55", fontWeight: 600 }}>
                  No match yet
                </p>
                <p
                  style={{
                    fontSize: 8,
                    color: "rgba(240,237,232,0.3)",
                    marginTop: 2,
                  }}
                >
                  Upload photos to match{" "}
                  <span
                    style={{
                      fontFamily: "monospace",
                      color: "rgba(240,237,232,0.5)",
                    }}
                  >
                    {currentRow?.[obj.dataImageColumn] ?? "—"}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

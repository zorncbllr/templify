import { useState } from "react";
import type { CanvasObject, ImageObject, DataImageMap, RowData } from "../types";
import { PLACEHOLDER_SRC } from "../types/constants";
import { resolveDataImageSrc } from "../utils/data";
import { ToggleSwitch } from "./StylePanels";

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
    <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(240,237,232,0.28)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
        Photo Data
      </p>

      {dataImagesLabel ? (
        <div style={{ background: "rgba(99,179,237,0.05)", border: "1px solid rgba(99,179,237,0.2)", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
              <span style={{ flexShrink: 0 }}>📷</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#63b3ed", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {dataImagesLabel}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 5 }}>
              <label style={{ fontSize: 9, color: "rgba(240,237,232,0.4)", cursor: "pointer", textDecoration: "underline" }}>
                Replace
                <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => e.target.files && onUpload(e.target.files)} />
              </label>
              <button onClick={onClear} style={{ background: "none", border: "none", color: "rgba(240,237,232,0.3)", cursor: "pointer", fontSize: 11 }}>✕</button>
            </div>
          </div>
          <p style={{ fontSize: 10, color: "rgba(240,237,232,0.35)" }}>
            {Math.round(imageCount)} photo{imageCount === 1 ? "" : "s"} loaded
          </p>
        </div>
      ) : (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) onUpload(e.dataTransfer.files); }}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
            padding: "12px 10px", borderRadius: 9, cursor: "pointer",
            background: dragOver ? "rgba(99,179,237,0.08)" : "rgba(255,255,255,0.02)",
            border: `1.5px dashed ${dragOver ? "#63b3ed" : "rgba(255,255,255,0.09)"}`,
          }}
        >
          {dataImagesLoading ? (
            <div style={{ width: 18, height: 18, border: "2px solid rgba(99,179,237,0.2)", borderTop: "2px solid #63b3ed", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          ) : (
            <span style={{ fontSize: 18 }}>📷</span>
          )}
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(240,237,232,0.5)", marginBottom: 1 }}>
              {dataImagesLoading ? "Loading…" : "Upload Photos"}
            </p>
            <p style={{ fontSize: 9, color: "rgba(240,237,232,0.22)" }}>Select multiple images</p>
          </div>
          <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => e.target.files && onUpload(e.target.files)} />
        </label>
      )}

      {autoDetectedColumns.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 9, color: "rgba(240,237,232,0.22)", marginBottom: 5, lineHeight: 1.5 }}>
            Photo field{autoDetectedColumns.length > 1 ? "s" : ""} — click to place:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {autoDetectedColumns.map((col) => {
              const cnt = objects.filter(
                (o) => o.kind === "image" && (o as ImageObject).isDataImage && (o as ImageObject).dataImageColumn === col,
              ).length;
              return (
                <button
                  key={col}
                  onClick={() => onPlacePhoto(col)}
                  className="chip"
                  style={{
                    width: "100%", textAlign: "left", padding: "5px 8px", borderRadius: 7,
                    fontSize: 10, fontWeight: 500, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: cnt > 0 ? "rgba(99,179,237,0.08)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${cnt > 0 ? "rgba(99,179,237,0.28)" : "rgba(255,255,255,0.07)"}`,
                    color: cnt > 0 ? "#63b3ed" : "rgba(240,237,232,0.55)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                    <span style={{ fontSize: 10, flexShrink: 0 }}>📷</span>
                    <span style={{ fontFamily: "monospace", fontSize: 9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col}</span>
                  </div>
                  <span style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                    {cnt > 0 && (
                      <span style={{ background: "rgba(99,179,237,0.2)", color: "#63b3ed", borderRadius: 3, padding: "0 4px", fontSize: 8, fontWeight: 700 }}>{cnt}</span>
                    )}
                    <span style={{ fontSize: 10, opacity: 0.4 }}>+</span>
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
  const previewSrc = resolveDataImageSrc(obj.isDataImage, obj.dataImageColumn, obj.columnOffset, obj.src, rows, baseRowIndex, dataImages);
  const hasMatch = previewSrc && previewSrc !== PLACEHOLDER_SRC && previewSrc !== obj.src;
  const currentRow = rows[baseRowIndex] ?? null;

  return (
    <div style={{ padding: "10px", borderRadius: 9, background: "rgba(99,179,237,0.05)", border: "1px solid rgba(99,179,237,0.25)", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 10, color: "rgba(240,237,232,0.45)" }}>Photo column</span>
        <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 700, background: "rgba(99,179,237,0.15)", border: "1px solid rgba(99,179,237,0.28)", color: "#63b3ed", fontFamily: "monospace" }}>
          {obj.dataImageColumn || "—"}
        </span>
        <span style={{ marginLeft: "auto", padding: "1px 5px", borderRadius: 4, fontSize: 8, fontWeight: 700, background: "rgba(99,179,237,0.1)", color: "rgba(99,179,237,0.55)", border: "1px solid rgba(99,179,237,0.15)" }}>
          AUTO
        </span>
      </div>

      {obj.dataImageColumn && (
        <div style={{ padding: "7px 8px", borderRadius: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: 8, color: "rgba(240,237,232,0.3)", marginBottom: 5 }}>PREVIEW · CURRENT ROW</p>
          {hasMatch ? (
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <img src={previewSrc!} alt="preview" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4, border: "1px solid rgba(99,179,237,0.3)", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 9, color: "#63b3ed", fontWeight: 600 }}>✓ Match found</p>
                <p style={{ fontSize: 8, color: "rgba(240,237,232,0.3)", marginTop: 2 }}>
                  Value:{" "}
                  <span style={{ fontFamily: "monospace", color: "rgba(240,237,232,0.5)" }}>
                    {currentRow?.[obj.dataImageColumn] ?? "—"}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 36, height: 36, borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 14, opacity: 0.3 }}>📷</span>
              </div>
              <div>
                <p style={{ fontSize: 9, color: "#f6ad55", fontWeight: 600 }}>No match yet</p>
                <p style={{ fontSize: 8, color: "rgba(240,237,232,0.3)", marginTop: 2 }}>
                  Upload photos to match{" "}
                  <span style={{ fontFamily: "monospace", color: "rgba(240,237,232,0.5)" }}>
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

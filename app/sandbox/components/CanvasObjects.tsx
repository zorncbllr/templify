import { useMemo, useState, useEffect } from "react";
import type {
  ImageObject,
  TextField,
  CanvasObject,
  RowData,
  DataImageMap,
} from "../types/index";
import { PLACEHOLDER_SRC } from "../types/constants";
import {
  shadowCSS,
  textShadowCSS,
  shrinkFontSize,
  generateCodeDataURL,
} from "../utils/rendering";
import { resolveDataImageSrc } from "../utils/data";
import { useDragResize } from "../hooks/useDragResize";
import { SelectionHandles } from "./SelectionHandles";
import { IconCamera, IconImage } from "@/components/Icons";

// ─── ImageEl ─────────────────────────────────────────────────────────────────

export function ImageEl({
  obj,
  selected,
  onSelect,
  onDrag,
  onResize,
  scale,
  rows,
  baseRowIndex,
  dataImages,
  onClickUp,
}: {
  obj: ImageObject;
  selected: boolean;
  onSelect: (id: number, e: React.MouseEvent) => void;
  onDrag: (id: number, dx: number, dy: number, live: boolean) => void;
  onResize: (id: number, p: Partial<CanvasObject>, live: boolean) => void;
  scale: number;
  rows: RowData[];
  baseRowIndex: number;
  dataImages: DataImageMap;
  onClickUp?: (id: number) => void;
}) {
  const resolvedSrc = resolveDataImageSrc(
    obj.isDataImage,
    obj.dataImageColumn,
    0,
    obj.src,
    rows,
    baseRowIndex,
    dataImages,
  );

  const { handleMouseDown, handleResizeDown, handleRotateDown } = useDragResize(
    obj,
    onSelect,
    onDrag,
    onResize,
    scale,
    onClickUp,
  );

  if (obj.isBackground) {
    return (
      <div
        style={{ position: "absolute", inset: 0, zIndex: 0 }}
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={resolvedSrc}
          alt={obj.name}
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "fill",
            display: "block",
            opacity: obj.opacity,
          }}
        />
        {selected && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              border: "2px solid #e8ff47",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 8 / Math.min(Math.max(scale, 0.3), 3),
                left: 8 / Math.min(Math.max(scale, 0.3), 3),
                padding: "0 6px",
                height: 18,
                borderRadius: 6,
                background: "rgba(232,255,71,0.9)",
                color: "#0a0a10",
                fontSize: 9,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 3,
                whiteSpace: "nowrap",
                transform: `scale(${1 / Math.min(Math.max(scale, 0.3), 3)})`,
                transformOrigin: "top left",
                pointerEvents: "none",
              }}
            >
              <IconImage size={10} /> Background
            </div>
          </div>
        )}
      </div>
    );
  }

  const borderVal = obj.border?.enabled
    ? `${obj.border.width}px ${obj.border.style} ${obj.border.color}`
    : "none";
  const radiusVal = obj.borderRadius ?? 0;

  return (
    <div
      onMouseDown={handleMouseDown}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: obj.x,
        top: obj.y,
        width: obj.width,
        height: obj.height,
        zIndex: obj.zIndex,
        cursor: "move",
        userSelect: "none",
        overflow: "visible",
        outline: selected ? "1.5px solid #e8ff47" : "1.5px solid transparent",
        transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
        filter: obj.shadow.enabled
          ? `drop-shadow(${shadowCSS(obj.shadow)})`
          : "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          borderRadius: radiusVal,
          boxSizing: "border-box",
          pointerEvents: "none",
        }}
      >
        {resolvedSrc === PLACEHOLDER_SRC ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              background:
                "repeating-conic-gradient(rgba(99,179,237,0.07) 0% 25%, rgba(99,179,237,0.02) 0% 50%) 0 0 / 14px 14px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              opacity: obj.opacity,
              boxSizing: "border-box",
            }}
          >
            <IconCamera size={22} style={{ opacity: 0.5 }} />
            <span
              style={{
                fontSize: 8,
                color: "rgba(99,179,237,0.7)",
                fontWeight: 700,
                textAlign: "center",
                padding: "0 6px",
                lineHeight: 1.4,
              }}
            >
              {obj.dataImageColumn || "Data Photo"}
            </span>
            <span
              style={{
                fontSize: 7,
                color: "rgba(99,179,237,0.4)",
                textAlign: "center",
                padding: "0 6px",
              }}
            >
              matched by column value
            </span>
          </div>
        ) : (
          <img
            src={resolvedSrc}
            alt={obj.name}
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "fill",
              display: "block",
              opacity: obj.opacity,
            }}
          />
        )}
      </div>

      {obj.border?.enabled && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: radiusVal,
            border: borderVal,
            boxSizing: "border-box",
            pointerEvents: "none",
          }}
        />
      )}

      {selected && (
        <>
          <div
            style={{
              position: "absolute",
              top: -(18 + 4) / Math.min(Math.max(scale, 0.3), 3),
              left: 0,
              background: "#0c0c14",
              border: "1px solid rgba(99,179,237,0.35)",
              color: "#63b3ed",
              fontSize: 9,
              fontWeight: 700,
              padding: "0 6px",
              height: 18,
              display: "flex",
              alignItems: "center",
              gap: 3,
              borderRadius: 6,
              whiteSpace: "nowrap",
              transform: `scale(${1 / Math.min(Math.max(scale, 0.3), 3)})`,
              transformOrigin: "top left",
              pointerEvents: "none",
            }}
          >
            {obj.isDataImage ? (
              <>
                <IconCamera size={10} /> {obj.dataImageColumn || "Data Photo"}
              </>
            ) : (
              <>
                <IconImage size={10} /> {obj.name}
              </>
            )}
          </div>
          <SelectionHandles
            onDown={handleResizeDown}
            onRotateDown={handleRotateDown}
            scale={scale}
          />
        </>
      )}
    </div>
  );
}

// ─── TextEl ──────────────────────────────────────────────────────────────────

export function TextEl({
  obj,
  selected,
  onSelect,
  onDrag,
  onResize,
  currentRow,
  rows,
  scale,
  onClickUp,
}: {
  obj: TextField;
  selected: boolean;
  onSelect: (id: number, e: React.MouseEvent) => void;
  onDrag: (id: number, dx: number, dy: number, live: boolean) => void;
  onResize: (id: number, p: Partial<CanvasObject>, live: boolean) => void;
  currentRow: RowData | null;
  rows: RowData[];
  scale: number;
  onClickUp?: (id: number) => void;
}) {
  const { handleMouseDown, handleResizeDown, handleRotateDown } = useDragResize(
    obj,
    onSelect,
    onDrag,
    onResize,
    scale,
    onClickUp,
  );

  const rawText = useMemo(() => {
    if (!currentRow) return "";
    const ci = rows.indexOf(currentRow);
    return ci >= 0 && ci < rows.length ? (rows[ci][obj.column] ?? "") : "";
  }, [currentRow, rows, obj.column]);

  const codeType = obj.codeType ?? "text";

  const [codeDataUrl, setCodeDataUrl] = useState<string | null>(null);
  useEffect(() => {
    if (codeType === "text") {
      setCodeDataUrl(null);
      return;
    }
    if (!rawText) {
      setCodeDataUrl(null);
      return;
    }
    generateCodeDataURL(rawText, codeType, obj.width, obj.height, obj.color)
      .then(setCodeDataUrl)
      .catch(() => setCodeDataUrl(null));
  }, [rawText, codeType, obj.width, obj.height, obj.color]);

  const displaySize = useMemo(
    () =>
      codeType === "text" && obj.textOverflow === "shrink"
        ? shrinkFontSize(
            rawText,
            obj.width,
            obj.height,
            obj.fontFamily,
            obj.fontSize,
            obj.bold,
            obj.italic,
          )
        : obj.fontSize,
    [
      rawText,
      codeType,
      obj.width,
      obj.height,
      obj.fontFamily,
      obj.fontSize,
      obj.bold,
      obj.italic,
      obj.textOverflow,
    ],
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: obj.x,
        top: obj.y,
        width: obj.width,
        height: obj.height,
        zIndex: obj.zIndex,
        cursor: "move",
        userSelect: "none",
        overflow: "visible",
        transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow:
            (obj.textOverflow ?? "visible") === "visible" && codeType === "text"
              ? "visible"
              : "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent:
            codeType !== "text"
              ? "center"
              : obj.textAlign === "left"
                ? "flex-start"
                : obj.textAlign === "right"
                  ? "flex-end"
                  : "center",
          padding: codeType === "text" ? "0 3px" : 0,
          boxSizing: "border-box",
          pointerEvents: "none",
        }}
      >
        {codeType !== "text" ? (
          codeDataUrl ? (
            <img
              src={codeDataUrl}
              alt={codeType}
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
          ) : (
            // Placeholder when no data
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                border: "1.5px dashed rgba(232,255,71,0.25)",
                borderRadius: 6,
                boxSizing: "border-box",
              }}
            >
              <span
                style={{
                  fontSize: 8,
                  color: "rgba(232,255,71,0.5)",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {codeType === "qr" ? "QR Code" : "Barcode"}
              </span>
              <span style={{ fontSize: 7, color: "rgba(240,237,232,0.25)" }}>
                {obj.column}
              </span>
            </div>
          )
        ) : (
          <span
            style={{
              display: obj.textAlign === "justify" ? "block" : "inline",
              width: obj.textAlign === "justify" ? "100%" : undefined,
              lineHeight: 1.2,
              whiteSpace: obj.textAlign === "justify" ? "normal" : "nowrap",
              overflow: "visible",
              fontFamily: `'${obj.fontFamily}', serif`,
              fontSize: displaySize,
              color: obj.color,
              fontWeight: obj.fontWeight ?? (obj.bold ? 700 : 400),
              fontStyle: obj.italic ? "italic" : "normal",
              textAlign: obj.textAlign,
              textShadow:
                obj.shadow.enabled ||
                (obj.shadow.thickness && obj.shadow.thickness > 0)
                  ? textShadowCSS(obj.shadow)
                  : "none",
            }}
          >
            {rawText}
          </span>
        )}
      </div>
      {selected && (
        <SelectionHandles
          onDown={handleResizeDown}
          onRotateDown={handleRotateDown}
          scale={scale}
        />
      )}
    </div>
  );
}

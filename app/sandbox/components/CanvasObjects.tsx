import { useMemo } from "react";
import type {
  ImageObject,
  TextField,
  CanvasObject,
  RowData,
  DataImageMap,
} from "../types/index";
import { PLACEHOLDER_SRC } from "../types/constants";
import { shadowCSS, textShadowCSS, shrinkFontSize } from "../utils/rendering";
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
    obj.columnOffset,
    obj.src,
    rows,
    baseRowIndex,
    dataImages,
  );

  const { handleMouseDown, handleResizeDown } = useDragResize(
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
                top: 8,
                left: 8,
                padding: "2px 7px",
                borderRadius: 4,
                background: "rgba(232,255,71,0.9)",
                color: "#0a0a10",
                fontSize: 9,
                fontWeight: 700,
              }}
            >
              Background
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
              top: -24,
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
              borderRadius: 4,
              whiteSpace: "nowrap",
            }}
          >
            {obj.isDataImage
              ? <><IconCamera size={10} /> {obj.dataImageColumn || "Data Photo"}</>
              : <><IconImage size={10} /> {obj.name}</>}
          </div>
          <SelectionHandles onDown={handleResizeDown} scale={scale} />
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
  const { handleMouseDown, handleResizeDown } = useDragResize(
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
    const ti = ci + obj.columnOffset;
    return ti >= 0 && ti < rows.length ? (rows[ti][obj.column] ?? "") : "";
  }, [currentRow, rows, obj.column, obj.columnOffset]);

  const displaySize = useMemo(
    () =>
      shrinkFontSize(
        rawText,
        obj.width,
        obj.height,
        obj.fontFamily,
        obj.fontSize,
        obj.bold,
        obj.italic,
      ),
    [
      rawText,
      obj.width,
      obj.height,
      obj.fontFamily,
      obj.fontSize,
      obj.bold,
      obj.italic,
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
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "visible",
          display: "flex",
          alignItems: "center",
          justifyContent:
            obj.textAlign === "right"
              ? "flex-end"
              : obj.textAlign === "center"
                ? "center"
                : "flex-start",
          padding: "0 3px",
          boxSizing: "border-box",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            display: "inline",
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            overflow: "visible",
            fontFamily: `'${obj.fontFamily}', serif`,
            fontSize: displaySize,
            color: obj.color,
            fontWeight: obj.bold ? "bold" : "normal",
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
      </div>
      {selected && <SelectionHandles onDown={handleResizeDown} scale={scale} />}
    </div>
  );
}

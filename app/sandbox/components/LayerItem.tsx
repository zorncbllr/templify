import { useState, useRef, useEffect } from "react";
import type { CanvasObject, ImageObject, TextField } from "../types/index";
import { IconCamera, IconImage, IconDragHandle, IconClose } from "@/components/Icons";

// ─── LayerItem ────────────────────────────────────────────────────────────────

export function LayerItem({
  obj,
  selected,
  onSelect,
  onDelete,
  dragHandlers,
}: {
  obj: CanvasObject;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  dragHandlers: {
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    draggingId: number | null;
  };
}) {
  const isImg = obj.kind === "image";
  const imgObj = isImg ? (obj as ImageObject) : null;
  const label = isImg
    ? imgObj!.isDataImage
      ? imgObj!.dataImageColumn || "Data Photo"
      : imgObj!.name
    : `{{${(obj as TextField).column}}}`;
  const isBg = isImg && imgObj!.isBackground;
  const offset = !isImg ? (obj as TextField).columnOffset : 0;
  const isDragging = dragHandlers.draggingId === obj.id;

  return (
    <div
      draggable
      onDragStart={dragHandlers.onDragStart}
      onDragOver={dragHandlers.onDragOver}
      onDrop={dragHandlers.onDrop}
      onDragEnd={dragHandlers.onDragEnd}
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 8px",
        borderRadius: 7,
        cursor: "grab",
        userSelect: "none",
        background: selected
          ? "rgba(232,255,71,0.07)"
          : "rgba(255,255,255,0.02)",
        border: `1px solid ${selected ? "rgba(232,255,71,0.18)" : "rgba(255,255,255,0.05)"}`,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}
      >
        <span
          style={{ fontSize: 9, color: "rgba(240,237,232,0.2)", flexShrink: 0 }}
        >
          <IconDragHandle size={10} />
        </span>
        <span style={{ fontSize: 11, flexShrink: 0 }}>
          {isImg ? (imgObj!.isDataImage ? <IconCamera size={12} /> : <IconImage size={12} />) : "T"}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: selected ? "#e8ff47" : "rgba(240,237,232,0.75)",
          }}
        >
          {label}
        </span>
        {isBg && (
          <span
            style={{
              fontSize: 8,
              padding: "1px 4px",
              borderRadius: 3,
              background: "rgba(232,255,71,0.12)",
              color: "#e8ff47",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            BG
          </span>
        )}
        {isImg && imgObj!.isDataImage && !isBg && (
          <span
            style={{
              fontSize: 8,
              padding: "1px 4px",
              borderRadius: 3,
              background: "rgba(99,179,237,0.15)",
              color: "#63b3ed",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            AUTO
          </span>
        )}
        {!isImg && offset !== 0 && (
          <span
            style={{
              fontSize: 8,
              padding: "1px 4px",
              borderRadius: 3,
              background: "rgba(232,255,71,0.08)",
              color: "#e8ff47",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {offset > 0 ? `+${offset}` : offset}
          </span>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={{
          width: 16,
          height: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "rgba(240,237,232,0.2)",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = "rgba(240,237,232,0.2)")
        }
      >
        <IconClose size={10} />
      </button>
    </div>
  );
}

// ─── DimensionInputs ──────────────────────────────────────────────────────────

export function DimensionInputs({
  selectedObj,
  updateBgDimension,
  updateObj,
  hidePosition,
}: {
  selectedObj: CanvasObject;
  updateBgDimension: (axis: "width" | "height", v: number) => void;
  updateObj: (key: string, value: unknown) => void;
  hidePosition?: boolean;
}) {
  const isImage = selectedObj.kind === "image";
  const [wStr, setWStr] = useState(() => String(Math.round(selectedObj.width)));
  const [hStr, setHStr] = useState(() =>
    String(Math.round(selectedObj.height)),
  );
  const [xStr, setXStr] = useState(() => String(Math.round(selectedObj.x)));
  const [yStr, setYStr] = useState(() => String(Math.round(selectedObj.y)));

  const prevIdRef = useRef<number>(selectedObj.id);
  useEffect(() => {
    if (prevIdRef.current !== selectedObj.id) {
      prevIdRef.current = selectedObj.id;
      setWStr(String(Math.round(selectedObj.width)));
      setHStr(String(Math.round(selectedObj.height)));
      setXStr(String(Math.round(selectedObj.x)));
      setYStr(String(Math.round(selectedObj.y)));
    }
  }, [selectedObj]);

  const focusedField = useRef<string | null>(null);
  useEffect(() => {
    if (focusedField.current !== "w")
      setWStr(String(Math.round(selectedObj.width)));
  }, [selectedObj.width]);
  useEffect(() => {
    if (focusedField.current !== "h")
      setHStr(String(Math.round(selectedObj.height)));
  }, [selectedObj.height]);
  useEffect(() => {
    if (focusedField.current !== "x")
      setXStr(String(Math.round(selectedObj.x)));
  }, [selectedObj.x]);
  useEffect(() => {
    if (focusedField.current !== "y")
      setYStr(String(Math.round(selectedObj.y)));
  }, [selectedObj.y]);

  const commitW = () => {
    const v = parseInt(wStr, 10);
    if (isFinite(v) && v > 0) {
      isImage ? updateBgDimension("width", v) : updateObj("width", v);
    } else setWStr(String(Math.round(selectedObj.width)));
  };
  const commitH = () => {
    const v = parseInt(hStr, 10);
    if (isFinite(v) && v > 0) {
      isImage ? updateBgDimension("height", v) : updateObj("height", v);
    } else setHStr(String(Math.round(selectedObj.height)));
  };
  const commitX = () => {
    const v = parseInt(xStr, 10);
    if (isFinite(v)) updateObj("x", v);
    else setXStr(String(Math.round(selectedObj.x)));
  };
  const commitY = () => {
    const v = parseInt(yStr, 10);
    if (isFinite(v)) updateObj("y", v);
    else setYStr(String(Math.round(selectedObj.y)));
  };

  const onKey =
    (commit: () => void) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
    };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "4px 7px",
    borderRadius: 6,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#f0ede8",
    fontSize: 11,
    fontFamily: "monospace",
    textAlign: "center",
    outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 9,
    color: "rgba(240,237,232,0.25)",
    marginBottom: 3,
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 7,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "rgba(240,237,232,0.28)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Size & Position
        </p>
        {isImage && (
          <span
            style={{
              fontSize: 8,
              color: "rgba(240,237,232,0.25)",
              letterSpacing: "0.04em",
            }}
          >
            AR locked
          </span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          { label: "W", str: wStr, set: setWStr, commit: commitW, field: "w" },
          { label: "H", str: hStr, set: setHStr, commit: commitH, field: "h" },
          ...(!hidePosition
            ? [
                { label: "X", str: xStr, set: setXStr, commit: commitX, field: "x" },
                { label: "Y", str: yStr, set: setYStr, commit: commitY, field: "y" },
              ]
            : []),
        ].map(({ label, str, set, commit, field }) => (
          <div key={field}>
            <p style={labelStyle}>{label}</p>
            <input
              type="number"
              value={str}
              step={isImage && (field === "w" || field === "h") ? 10 : 1}
              onChange={(e) => {
                const newVal = e.target.value;
                set(newVal);
                // Only commit on spinner clicks (not typing).
                // Spinner clicks produce inputType !== "insertText".
                const evt = e.nativeEvent as InputEvent;
                const isSpinner = evt.inputType && evt.inputType !== "insertText";
                if (isSpinner && (field === "w" || field === "h")) {
                  const v = parseInt(newVal, 10);
                  if (isFinite(v) && v > 0) {
                    if (field === "w") {
                      isImage ? updateBgDimension("width", v) : updateObj("width", v);
                    } else {
                      isImage ? updateBgDimension("height", v) : updateObj("height", v);
                    }
                  }
                }
              }}
              onFocus={() => {
                focusedField.current = field;
              }}
              onBlur={() => {
                focusedField.current = null;
                commit();
              }}
              onKeyDown={onKey(commit)}
              style={inputStyle}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

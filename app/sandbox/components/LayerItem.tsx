import { useState, useRef, useEffect } from "react";
import type { CanvasObject, ImageObject, TextField } from "../types/index";
import {
  IconCamera,
  IconImage,
  IconDragHandle,
  IconClose,
  IconRotate,
} from "@/components/Icons";

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
    : `${(obj as TextField).column}`;
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
      className="flex items-center justify-between px-2 py-1.5 rounded-md cursor-grab select-none"
      style={{
        background: selected
          ? "rgba(232,255,71,0.07)"
          : "rgba(255,255,255,0.02)",
        border: `1px solid ${selected ? "rgba(232,255,71,0.18)" : "rgba(255,255,255,0.05)"}`,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[9px] text-[rgba(240,237,232,0.2)] shrink-0">
          <IconDragHandle size={10} />
        </span>
        <span className="text-[11px] shrink-0">
          {isImg ? (
            imgObj!.isDataImage ? (
              <IconCamera size={12} />
            ) : (
              <IconImage size={12} />
            )
          ) : (
            "T"
          )}
        </span>
        <span
          className="text-[10px] font-medium overflow-hidden text-ellipsis whitespace-nowrap"
          style={{
            color: selected ? "#e8ff47" : "rgba(240,237,232,0.75)",
          }}
        >
          {label}
        </span>
        {isBg && (
          <span className="text-[8px] px-1 py-px rounded-md bg-[rgba(232,255,71,0.12)] text-[#e8ff47] font-bold shrink-0">
            BG
          </span>
        )}
        {isImg && imgObj!.isDataImage && !isBg && (
          <span className="text-[8px] px-1 py-px rounded-md bg-[rgba(99,179,237,0.15)] text-[#63b3ed] font-bold shrink-0">
            AUTO
          </span>
        )}
        {!isImg && offset !== 0 && (
          <span className="text-[8px] px-1 py-px rounded-md bg-[rgba(232,255,71,0.08)] text-[#e8ff47] font-bold shrink-0">
            {offset > 0 ? `+${offset}` : offset}
          </span>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="w-4 h-4 flex items-center justify-center text-[10px] bg-transparent border-none cursor-pointer shrink-0"
        style={{
          color: "rgba(240,237,232,0.2)",
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
  const [rotStr, setRotStr] = useState(() => String(selectedObj.rotation ?? 0));

  const prevIdRef = useRef<number>(selectedObj.id);
  useEffect(() => {
    if (prevIdRef.current !== selectedObj.id) {
      prevIdRef.current = selectedObj.id;
      setWStr(String(Math.round(selectedObj.width)));
      setHStr(String(Math.round(selectedObj.height)));
      setXStr(String(Math.round(selectedObj.x)));
      setYStr(String(Math.round(selectedObj.y)));
      setRotStr(String(selectedObj.rotation ?? 0));
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
  useEffect(() => {
    if (focusedField.current !== "rot")
      setRotStr(String(selectedObj.rotation ?? 0));
  }, [selectedObj.rotation]);

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
  const commitRot = () => {
    const v = parseFloat(rotStr);
    if (isFinite(v)) updateObj("rotation", ((v % 360) + 360) % 360);
    else setRotStr(String(selectedObj.rotation ?? 0));
  };

  const onKey =
    (commit: () => void) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
    };

  const inputClassName =
    "w-full px-[7px] py-1 rounded-md bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[#f0ede8] text-[11px] font-mono text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const labelClassName = "text-[9px] text-[rgba(240,237,232,0.25)] mb-[3px]";

  return (
    <div>
      <div className="flex items-center justify-between mb-[7px]">
        <p className="text-[10px] font-bold text-[rgba(240,237,232,0.28)] uppercase tracking-[0.08em]">
          Size & Position
        </p>
        {isImage && (
          <span className="text-[8px] text-[rgba(240,237,232,0.25)] tracking-[0.04em]">
            AR locked
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { label: "W", str: wStr, set: setWStr, commit: commitW, field: "w" },
          { label: "H", str: hStr, set: setHStr, commit: commitH, field: "h" },
          ...(!hidePosition
            ? [
                {
                  label: "X",
                  str: xStr,
                  set: setXStr,
                  commit: commitX,
                  field: "x",
                },
                {
                  label: "Y",
                  str: yStr,
                  set: setYStr,
                  commit: commitY,
                  field: "y",
                },
              ]
            : []),
        ].map(({ label, str, set, commit, field }) => (
          <div key={field}>
            <p className={labelClassName}>{label}</p>
            <input
              type="number"
              value={str}
              step={isImage && (field === "w" || field === "h") ? 10 : 1}
              onChange={(e) => set(e.target.value)}
              onFocus={() => {
                focusedField.current = field;
              }}
              onBlur={() => {
                focusedField.current = null;
                commit();
              }}
              onKeyDown={onKey(commit)}
              className={inputClassName}
            />
          </div>
        ))}
      </div>
      {!hidePosition && (
        <div className="mt-1.5">
          <p className={labelClassName}>
            <IconRotate
              size={8}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: 3,
              }}
            />
            Rotation
          </p>
          <div className="relative" style={{ width: 80 }}>
            <input
              type="number"
              value={rotStr}
              onChange={(e) => setRotStr(e.target.value)}
              onFocus={() => {
                focusedField.current = "rot";
              }}
              onBlur={() => {
                focusedField.current = null;
                commitRot();
              }}
              onKeyDown={onKey(commitRot)}
              className={inputClassName}
              style={{ paddingRight: 24 }}
            />
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-[rgba(240,237,232,0.25)] pointer-events-none">
              deg
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

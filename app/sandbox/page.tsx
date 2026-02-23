"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";

type RowData = Record<string, string>;
type Shadow = {
  enabled: boolean;
  x: number;
  y: number;
  blur: number;
  color: string;
};
type BaseObj = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};
type ImageObject = BaseObj & {
  kind: "image";
  src: string;
  name: string;
  opacity: number;
  shadow: Shadow;
  isBackground: boolean;
  naturalWidth: number;
  naturalHeight: number;
};
type TextField = BaseObj & {
  kind: "field";
  column: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  shadow: Shadow;
  columnOffset: number;
  textAlign: "left" | "center" | "right" | "justify";
};
type CanvasObject = ImageObject | TextField;
type CanvasSize = { width: number; height: number };

const DEFAULT_SHADOW: Shadow = {
  enabled: false,
  x: 2,
  y: 2,
  blur: 8,
  color: "rgba(0,0,0,0.35)",
};

const PRESET_GROUPS = [
  {
    group: "Print",
    items: [
      { label: "A4 Portrait", w: 595, h: 842 },
      { label: "A4 Landscape", w: 842, h: 595 },
      { label: "Letter", w: 612, h: 792 },
      { label: "ID Card", w: 336, h: 213 },
      { label: "Business Card", w: 350, h: 200 },
    ],
  },
  {
    group: "Presentation",
    items: [
      { label: "16:9 HD", w: 960, h: 540 },
      { label: "4:3 Classic", w: 800, h: 600 },
      { label: "Widescreen", w: 1280, h: 720 },
    ],
  },
  {
    group: "Social Media",
    items: [
      { label: "Instagram Post", w: 600, h: 600 },
      { label: "Instagram Story", w: 450, h: 800 },
      { label: "Facebook Post", w: 940, h: 788 },
      { label: "YouTube Thumb", w: 1280, h: 720 },
    ],
  },
  {
    group: "Certificate",
    items: [
      { label: "Certificate", w: 792, h: 612 },
      { label: "Diploma", w: 864, h: 648 },
    ],
  },
];

const GOOGLE_FONTS = [
  { name: "Playfair Display", category: "Serif" },
  { name: "Lora", category: "Serif" },
  { name: "Merriweather", category: "Serif" },
  { name: "EB Garamond", category: "Serif" },
  { name: "Cormorant Garamond", category: "Serif" },
  { name: "Libre Baskerville", category: "Serif" },
  { name: "DM Sans", category: "Sans-serif" },
  { name: "Nunito", category: "Sans-serif" },
  { name: "Poppins", category: "Sans-serif" },
  { name: "Raleway", category: "Sans-serif" },
  { name: "Outfit", category: "Sans-serif" },
  { name: "Plus Jakarta Sans", category: "Sans-serif" },
  { name: "Rubik", category: "Sans-serif" },
  { name: "Manrope", category: "Sans-serif" },
  { name: "Syne", category: "Sans-serif" },
  { name: "Cinzel", category: "Display" },
  { name: "Bebas Neue", category: "Display" },
  { name: "Oswald", category: "Display" },
  { name: "Teko", category: "Display" },
  { name: "Dancing Script", category: "Script" },
  { name: "Great Vibes", category: "Script" },
  { name: "Pacifico", category: "Script" },
  { name: "Sacramento", category: "Script" },
  { name: "JetBrains Mono", category: "Mono" },
  { name: "Fira Code", category: "Mono" },
  { name: "Source Code Pro", category: "Mono" },
];
const FONT_CATS = ["All", "Serif", "Sans-serif", "Display", "Script", "Mono"];

const BATCH_OPTIONS = [1, 2, 3, 4, 6, 8, 9] as const;
type BatchSize = (typeof BATCH_OPTIONS)[number];

function batchGrid(count: number): { cols: number; rows: number } {
  if (count === 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  if (count === 3) return { cols: 3, rows: 1 };
  if (count === 4) return { cols: 2, rows: 2 };
  if (count === 6) return { cols: 3, rows: 2 };
  if (count === 8) return { cols: 4, rows: 2 };
  if (count === 9) return { cols: 3, rows: 3 };
  return { cols: 1, rows: 1 };
}

async function loadSheetJS(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).XLSX) {
      resolve((window as any).XLSX);
      return;
    }
    const s = document.createElement("script");
    s.src =
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => resolve((window as any).XLSX);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function parseSpreadsheet(
  file: File,
): Promise<{ columns: string[]; rows: RowData[] }> {
  const XLSX = await loadSheetJS();
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, {
    type: "array",
    cellText: true,
    cellDates: true,
    dateNF: "yyyy-mm-dd",
  });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: false,
  });
  if (!rawRows.length) return { columns: [], rows: [] };
  let bestIdx = 0,
    bestScore = -Infinity;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i];
    let score = 0,
      nz = 0;
    for (const cell of row) {
      const v = String(cell ?? "").trim();
      if (!v) continue;
      nz++;
      if (isNaN(Number(v))) score += 3;
      if (/^[a-zA-Z]/.test(v)) score += 2;
      if (v.length > 60) score -= 5;
    }
    score += nz;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  const seen = new Map<string, number>();
  const columns: string[] = rawRows[bestIdx]
    .map((h: any, ci: number) => {
      let name =
        String(h ?? "")
          .replace(/^\uFEFF/, "")
          .replace(/\u00A0/g, " ")
          .replace(/[\r\n]+/g, " ")
          .trim()
          .replace(/\s+/g, "_")
          .replace(/[^\w.\-]/g, "")
          .replace(/^_+|_+$/g, "") || `col_${ci + 1}`;
      if (seen.has(name)) {
        const n = seen.get(name)! + 1;
        seen.set(name, n);
        name = `${name}_${n}`;
      } else seen.set(name, 1);
      return name;
    })
    .filter((c: string) => c.length > 0);
  const dataRows: RowData[] = rawRows
    .slice(bestIdx + 1)
    .filter((r: any[]) => r.some((c: any) => String(c ?? "").trim()))
    .map((r: any[]) => {
      const o: RowData = {};
      columns.forEach((col, i) => {
        o[col] = String(r[i] ?? "").trim();
      });
      return o;
    });
  return { columns, rows: dataRows };
}

let _measureEl: HTMLSpanElement | null = null;
function getMeasureEl(): HTMLSpanElement {
  if (!_measureEl && typeof document !== "undefined") {
    _measureEl = document.createElement("span");
    _measureEl.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;visibility:hidden;white-space:nowrap;line-height:1;padding:0;margin:0;border:0;";
    document.body.appendChild(_measureEl);
  }
  return _measureEl!;
}

function shrinkFontSize(
  text: string,
  maxW: number,
  maxH: number,
  family: string,
  maxSize: number,
  bold: boolean,
  italic: boolean,
): number {
  if (!text || typeof document === "undefined") return maxSize;
  const availW = maxW - 6;
  if (availW <= 0) return maxSize;
  const el = getMeasureEl();
  let size = maxSize;
  while (size > 4) {
    el.style.fontFamily = `'${family}', serif`;
    el.style.fontSize = `${size}px`;
    el.style.fontWeight = bold ? "bold" : "normal";
    el.style.fontStyle = italic ? "italic" : "normal";
    el.textContent = text;
    if (el.offsetWidth <= availW && el.offsetHeight <= maxH) break;
    size--;
  }
  return size;
}

const shadowCSS = (s: Shadow) =>
  s.enabled ? `${s.x}px ${s.y}px ${s.blur}px ${s.color}` : "none";

type HandleKey = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const HANDLES: { key: HandleKey; cursor: string; pos: React.CSSProperties }[] =
  [
    { key: "nw", cursor: "nwse-resize", pos: { top: -5, left: -5 } },
    {
      key: "n",
      cursor: "ns-resize",
      pos: { top: -5, left: "50%", transform: "translateX(-50%)" },
    },
    { key: "ne", cursor: "nesw-resize", pos: { top: -5, right: -5 } },
    {
      key: "e",
      cursor: "ew-resize",
      pos: { top: "50%", right: -5, transform: "translateY(-50%)" },
    },
    { key: "se", cursor: "nwse-resize", pos: { bottom: -5, right: -5 } },
    {
      key: "s",
      cursor: "ns-resize",
      pos: { bottom: -5, left: "50%", transform: "translateX(-50%)" },
    },
    { key: "sw", cursor: "nesw-resize", pos: { bottom: -5, left: -5 } },
    {
      key: "w",
      cursor: "ew-resize",
      pos: { top: "50%", left: -5, transform: "translateY(-50%)" },
    },
  ];

function SelectionHandles({
  onDown,
}: {
  onDown: (h: HandleKey, e: React.MouseEvent) => void;
}) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: "1.5px solid #e8ff47",
          pointerEvents: "none",
          boxSizing: "border-box",
        }}
      />
      {HANDLES.map(({ key, cursor, pos }) => (
        <div
          key={key}
          data-handle={key}
          onMouseDown={(e) => onDown(key, e)}
          style={{
            position: "absolute",
            width: 10,
            height: 10,
            borderRadius: 2,
            background: "#fff",
            border: "1.5px solid #e8ff47",
            boxShadow: "0 1px 5px rgba(0,0,0,0.4)",
            cursor,
            zIndex: 10,
            ...pos,
          }}
        />
      ))}
    </>
  );
}

function useDragResize(
  obj: CanvasObject,
  onSelect: (id: number) => void,
  onDrag: (id: number, x: number, y: number, live: boolean) => void,
  onResize: (id: number, p: Partial<CanvasObject>, live: boolean) => void,
  scale: number,
) {
  const drag = useRef<{
    sx: number;
    sy: number;
    ox: number;
    oy: number;
  } | null>(null);
  const resize = useRef<any>(null);
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-handle]")) return;
    e.stopPropagation();
    onSelect(obj.id);
    drag.current = { sx: e.clientX, sy: e.clientY, ox: obj.x, oy: obj.y };
    const mv = (e: MouseEvent) => {
      if (!drag.current) return;
      onDrag(
        obj.id,
        drag.current.ox + (e.clientX - drag.current.sx) / scale,
        drag.current.oy + (e.clientY - drag.current.sy) / scale,
        true,
      );
    };
    const up = (e: MouseEvent) => {
      if (drag.current)
        onDrag(
          obj.id,
          drag.current.ox + (e.clientX - drag.current.sx) / scale,
          drag.current.oy + (e.clientY - drag.current.sy) / scale,
          false,
        );
      drag.current = null;
      window.removeEventListener("mousemove", mv);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
  };
  const handleResizeDown = (h: HandleKey, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(obj.id);
    resize.current = {
      h,
      sx: e.clientX,
      sy: e.clientY,
      ox: obj.x,
      oy: obj.y,
      ow: obj.width,
      oh: obj.height,
      fs: (obj as TextField).fontSize,
      ar: obj.width / obj.height,
    };
    const compute = (e: MouseEvent) => {
      const r = resize.current;
      if (!r) return null;
      const dx = (e.clientX - r.sx) / scale,
        dy = (e.clientY - r.sy) / scale,
        MIN = 20;
      let nx = r.ox,
        ny = r.oy,
        nw = r.ow,
        nh = r.oh;
      if (h.includes("e")) nw = Math.max(MIN, r.ow + dx);
      if (h.includes("w")) {
        nw = Math.max(MIN, r.ow - dx);
        nx = r.ox + r.ow - nw;
      }
      if (h.includes("s")) nh = Math.max(MIN, r.oh + dy);
      if (h.includes("n")) {
        nh = Math.max(MIN, r.oh - dy);
        ny = r.oy + r.oh - nh;
      }
      if (e.shiftKey) {
        const isH = h === "e" || h === "w",
          isV = h === "n" || h === "s";
        if (isH) {
          nh = Math.round(nw / r.ar);
          if (h === "n") ny = r.oy + r.oh - nh;
        } else if (isV) {
          nw = Math.round(nh * r.ar);
          if (h === "w") nx = r.ox + r.ow - nw;
        } else {
          const sc = Math.max(nw / r.ow, nh / r.oh);
          nw = Math.round(r.ow * sc);
          nh = Math.round(r.oh * sc);
          if (h.includes("w")) nx = r.ox + r.ow - nw;
          if (h.includes("n")) ny = r.oy + r.oh - nh;
        }
      }
      const patch: any = {
        x: Math.round(nx),
        y: Math.round(ny),
        width: Math.round(nw),
        height: Math.round(nh),
      };
      if (r.fs !== undefined)
        patch.fontSize = Math.round(
          Math.min(120, Math.max(6, r.fs * (nh / r.oh))),
        );
      return patch;
    };
    const mv = (e: MouseEvent) => {
      const p = compute(e);
      if (p) onResize(obj.id, p, true);
    };
    const up = (e: MouseEvent) => {
      const p = compute(e);
      if (p) onResize(obj.id, p, false);
      resize.current = null;
      window.removeEventListener("mousemove", mv);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
  };
  return { handleMouseDown, handleResizeDown };
}

function ImageEl({
  obj,
  selected,
  onSelect,
  onDrag,
  onResize,
  scale,
}: {
  obj: ImageObject;
  selected: boolean;
  onSelect: (id: number) => void;
  onDrag: (id: number, x: number, y: number, live: boolean) => void;
  onResize: (id: number, p: Partial<CanvasObject>, live: boolean) => void;
  scale: number;
}) {
  const { handleMouseDown, handleResizeDown } = useDragResize(
    obj,
    onSelect,
    onDrag,
    onResize,
    scale,
  );
  if (obj.isBackground) {
    return (
      <div
        style={{ position: "absolute", inset: 0, zIndex: 0 }}
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={obj.src}
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
      <img
        src={obj.src}
        alt={obj.name}
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "fill",
          display: "block",
          opacity: obj.opacity,
          pointerEvents: "none",
        }}
      />
      {selected && (
        <>
          <div
            style={{
              position: "absolute",
              top: -24,
              left: 0,
              background: "#0c0c14",
              border: "1px solid rgba(232,255,71,0.3)",
              color: "#e8ff47",
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
            🖼 {obj.name}
          </div>
          <SelectionHandles onDown={handleResizeDown} />
        </>
      )}
    </div>
  );
}

function TextEl({
  obj,
  selected,
  onSelect,
  onDrag,
  onResize,
  currentRow,
  rows,
  scale,
}: {
  obj: TextField;
  selected: boolean;
  onSelect: (id: number) => void;
  onDrag: (id: number, x: number, y: number, live: boolean) => void;
  onResize: (id: number, p: Partial<CanvasObject>, live: boolean) => void;
  currentRow: RowData | null;
  rows: RowData[];
  scale: number;
}) {
  const { handleMouseDown, handleResizeDown } = useDragResize(
    obj,
    onSelect,
    onDrag,
    onResize,
    scale,
  );
  const rawText = useMemo(() => {
    if (!currentRow) return "";
    const ci = rows.indexOf(currentRow),
      ti = ci + obj.columnOffset;
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
          overflow: "hidden",
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
            fontFamily: `'${obj.fontFamily}', serif`,
            fontSize: displaySize,
            color: obj.color,
            fontWeight: obj.bold ? "bold" : "normal",
            fontStyle: obj.italic ? "italic" : "normal",
            textAlign: obj.textAlign,
            textShadow: obj.shadow.enabled ? shadowCSS(obj.shadow) : "none",
            lineHeight: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {rawText}
        </span>
      </div>
      {selected && <SelectionHandles onDown={handleResizeDown} />}
    </div>
  );
}

function FontPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (f: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(""),
    [cat, setCat] = useState("All");
  const ref = useRef<HTMLDivElement>(null);
  const filtered = useMemo(
    () =>
      GOOGLE_FONTS.filter(
        (f) =>
          (cat === "All" || f.category === cat) &&
          f.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [cat, search],
  );
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const loadFont = useCallback((name: string) => {
    const id = `gf-${name.replace(/\s+/g, "-")}`;
    if (!document.getElementById(id)) {
      const l = document.createElement("link");
      l.id = id;
      l.rel = "stylesheet";
      l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;700&display=swap`;
      document.head.appendChild(l);
    }
  }, []);
  useEffect(() => {
    loadFont(value);
  }, [value, loadFont]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%",
          padding: "7px 10px",
          borderRadius: 7,
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${open ? "rgba(232,255,71,0.4)" : "rgba(255,255,255,0.1)"}`,
          color: "#f0ede8",
          fontSize: 13,
          fontFamily: `'${value}',serif`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          outline: "none",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: 10,
            opacity: 0.4,
            fontFamily: "DM Sans,sans-serif",
            flexShrink: 0,
            marginLeft: 4,
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#1a1a26",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            zIndex: 300,
            boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "8px 8px 4px" }}>
            <input
              autoFocus
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "5px 9px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f0ede8",
                fontSize: 11,
                outline: "none",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: 3,
              padding: "0 8px 6px",
              flexWrap: "wrap",
            }}
          >
            {FONT_CATS.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  padding: "2px 7px",
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  background:
                    cat === c
                      ? "rgba(232,255,71,0.15)"
                      : "rgba(255,255,255,0.05)",
                  color: cat === c ? "#e8ff47" : "rgba(240,237,232,0.4)",
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <div
            style={{
              maxHeight: 180,
              overflowY: "auto",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {filtered.map((f) => {
              loadFont(f.name);
              return (
                <button
                  key={f.name}
                  onClick={() => {
                    onChange(f.name);
                    setOpen(false);
                    setSearch("");
                  }}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background:
                      value === f.name
                        ? "rgba(232,255,71,0.08)"
                        : "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      fontFamily: `'${f.name}',serif`,
                      fontSize: 13,
                      color: value === f.name ? "#e8ff47" : "#f0ede8",
                    }}
                  >
                    {f.name}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      opacity: 0.3,
                      fontFamily: "DM Sans,sans-serif",
                    }}
                  >
                    {f.category}
                  </span>
                </button>
              );
            })}
            {!filtered.length && (
              <p
                style={{
                  padding: "10px",
                  fontSize: 11,
                  color: "rgba(240,237,232,0.25)",
                  textAlign: "center",
                }}
              >
                No fonts found
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ShadowPanel({
  shadow,
  onChange,
}: {
  shadow: Shadow;
  onChange: (s: Shadow) => void;
}) {
  const set = (k: keyof Shadow, v: any) => onChange({ ...shadow, [k]: v });
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "rgba(240,237,232,0.28)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Shadow
        </span>
        <button
          onClick={() => set("enabled", !shadow.enabled)}
          style={{
            width: 30,
            height: 16,
            borderRadius: 8,
            background: shadow.enabled ? "#e8ff47" : "rgba(255,255,255,0.1)",
            border: "none",
            cursor: "pointer",
            position: "relative",
            transition: "background 0.2s",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: shadow.enabled ? 14 : 2,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: shadow.enabled ? "#0a0a10" : "white",
              transition: "left 0.15s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          />
        </button>
      </div>
      {shadow.enabled && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 7,
            padding: "9px",
            borderRadius: 7,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            // Prevent the panel itself from overflowing its parent
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", gap: 7 }}>
            <div
              style={{
                position: "relative",
                width: 26,
                height: 26,
                borderRadius: 5,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.1)",
                flexShrink: 0,
              }}
            >
              <input
                type="color"
                value={shadow.color.startsWith("r") ? "#000000" : shadow.color}
                onChange={(e) => set("color", e.target.value)}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  transform: "scale(1.5)",
                }}
              />
            </div>
            <input
              value={shadow.color}
              onChange={(e) => set("color", e.target.value)}
              style={{
                flex: 1,
                minWidth: 0, // allow the input to shrink below its content size
                padding: "4px 7px",
                borderRadius: 5,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f0ede8",
                fontSize: 10,
                fontFamily: "monospace",
                outline: "none",
              }}
            />
          </div>
          {(
            [
              ["X", "x", -20, 20],
              ["Y", "y", -20, 20],
              ["Blur", "blur", 0, 40],
            ] as [string, keyof Shadow, number, number][]
          ).map(([label, k, min, max]) => (
            <div
              key={k as string}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                minWidth: 0, // allow row to shrink
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color: "rgba(240,237,232,0.3)",
                  width: 20, // slightly narrower
                  flexShrink: 0,
                }}
              >
                {label}
              </span>
              <input
                type="range"
                min={min}
                max={max}
                value={shadow[k] as number}
                onChange={(e) => set(k, Number(e.target.value))}
                style={{
                  flex: 1,
                  minWidth: 0, // key fix: lets the slider compress
                  height: "3px",
                  accentColor: "#e8ff47",
                }}
              />
              <span
                style={{
                  fontSize: 9,
                  color: "#e8ff47",
                  width: 28, // enough for "-20px"
                  textAlign: "right",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {shadow[k]}px
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SizePicker({
  current,
  onSelect,
  onClose,
}: {
  current: CanvasSize;
  onSelect: (s: CanvasSize, l: string) => void;
  onClose: () => void;
}) {
  const [cw, setCw] = useState(String(current.width)),
    [ch, setCh] = useState(String(current.height));
  const [grp, setGrp] = useState("All");
  const apply = () => {
    const w = Math.max(100, Math.min(2000, parseInt(cw) || 960)),
      h = Math.max(100, Math.min(2000, parseInt(ch) || 540));
    onSelect({ width: w, height: h }, "Custom");
  };
  const allGroups = ["All", ...PRESET_GROUPS.map((g) => g.group)];
  const items = PRESET_GROUPS.flatMap((g) =>
    grp === "All" || g.group === grp ? g.items : [],
  );
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#14141e",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 14,
          padding: 22,
          width: 520,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: "#f0ede8" }}>
            Canvas Size
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "rgba(240,237,232,0.4)",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
        <div
          style={{
            display: "flex",
            gap: 5,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          {allGroups.map((g) => (
            <button
              key={g}
              onClick={() => setGrp(g)}
              style={{
                padding: "3px 9px",
                borderRadius: 5,
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                background:
                  grp === g
                    ? "rgba(232,255,71,0.15)"
                    : "rgba(255,255,255,0.05)",
                color: grp === g ? "#e8ff47" : "rgba(240,237,232,0.45)",
              }}
            >
              {g}
            </button>
          ))}
        </div>
        <div style={{ overflowY: "auto", flex: 1, marginBottom: 14 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 6,
            }}
          >
            {items.map((item) => {
              const active =
                current.width === item.w && current.height === item.h;
              const asp = item.w / item.h,
                mD = 28,
                tw = asp >= 1 ? mD : Math.round(mD * asp),
                th = asp < 1 ? mD : Math.round(mD / asp);
              return (
                <button
                  key={item.label}
                  onClick={() =>
                    onSelect({ width: item.w, height: item.h }, item.label)
                  }
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 5,
                    padding: "9px 5px",
                    borderRadius: 8,
                    cursor: "pointer",
                    border: `1.5px solid ${active ? "#e8ff47" : "rgba(255,255,255,0.07)"}`,
                    background: active
                      ? "rgba(232,255,71,0.07)"
                      : "rgba(255,255,255,0.02)",
                  }}
                >
                  <div
                    style={{
                      width: tw,
                      height: th,
                      borderRadius: 2,
                      background: active
                        ? "rgba(232,255,71,0.4)"
                        : "rgba(255,255,255,0.13)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: active ? "#e8ff47" : "rgba(240,237,232,0.7)",
                      textAlign: "center",
                      lineHeight: 1.3,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{ fontSize: 8, color: "rgba(240,237,232,0.25)" }}
                  >
                    {item.w}×{item.h}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            paddingTop: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-end", gap: 7 }}>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: 9,
                  color: "rgba(240,237,232,0.3)",
                  marginBottom: 4,
                }}
              >
                Width
              </p>
              <input
                type="number"
                value={cw}
                onChange={(e) => setCw(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#f0ede8",
                  fontSize: 12,
                  outline: "none",
                }}
              />
            </div>
            <span
              style={{
                color: "rgba(240,237,232,0.25)",
                fontSize: 13,
                paddingBottom: 6,
              }}
            >
              ×
            </span>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: 9,
                  color: "rgba(240,237,232,0.3)",
                  marginBottom: 4,
                }}
              >
                Height
              </p>
              <input
                type="number"
                value={ch}
                onChange={(e) => setCh(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#f0ede8",
                  fontSize: 12,
                  outline: "none",
                }}
              />
            </div>
            <button
              onClick={apply}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                background: "#e8ff47",
                border: "none",
                color: "#0a0a10",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span style={{ fontSize: 11, color: "rgba(240,237,232,0.55)" }}>
        {label}
      </span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 30,
          height: 16,
          borderRadius: 8,
          background: value ? "#e8ff47" : "rgba(255,255,255,0.1)",
          border: "none",
          cursor: "pointer",
          position: "relative",
          transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: value ? 14 : 2,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: value ? "#0a0a10" : "white",
            transition: "left 0.15s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </button>
    </div>
  );
}

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: "rgba(240,237,232,0.28)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 7,
      }}
    >
      {children as any}
    </p>
  );
}

function KbdHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "2px 0",
      }}
    >
      <span style={{ fontSize: 10, color: "rgba(240,237,232,0.33)" }}>
        {label}
      </span>
      <div style={{ display: "flex", gap: 2 }}>
        {keys.map((k) => (
          <span
            key={k}
            style={{
              fontSize: 9,
              padding: "1px 4px",
              borderRadius: 3,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(240,237,232,0.4)",
              fontFamily: "monospace",
            }}
          >
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Batch Stepper ────────────────────────────────────────────────────────────
function BatchStepper({
  value,
  onChange,
  totalRows,
}: {
  value: BatchSize;
  onChange: (v: BatchSize) => void;
  totalRows: number;
}) {
  const idx = BATCH_OPTIONS.indexOf(value);
  const prev = () => onChange(BATCH_OPTIONS[Math.max(0, idx - 1)]);
  const next = () =>
    onChange(BATCH_OPTIONS[Math.min(BATCH_OPTIONS.length - 1, idx + 1)]);
  const { cols, rows } = batchGrid(value);
  const pageCount = totalRows > 0 ? Math.ceil(totalRows / value) : "—";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        borderRadius: 10,
        background:
          value > 1 ? "rgba(232,255,71,0.08)" : "rgba(255,255,255,0.06)",
        border: `1px solid ${value > 1 ? "rgba(232,255,71,0.3)" : "rgba(255,255,255,0.12)"}`,
      }}
      title={`Batch ${value} records per page → ${pageCount} page${pageCount === 1 ? "" : "s"}`}
    >
      <button
        onClick={prev}
        disabled={idx === 0}
        style={{
          width: 20,
          height: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 4,
          background: "none",
          border: "none",
          color: idx === 0 ? "rgba(240,237,232,0.15)" : "rgba(240,237,232,0.7)",
          cursor: idx === 0 ? "not-allowed" : "pointer",
          fontSize: 11,
        }}
      >
        ◂
      </button>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: 2,
          width: 26,
          height: 18,
        }}
      >
        {Array.from({ length: cols * rows }).map((_, i) => (
          <div
            key={i}
            style={{
              borderRadius: 1,
              background:
                value > 1 ? "rgba(232,255,71,0.7)" : "rgba(240,237,232,0.35)",
            }}
          />
        ))}
      </div>
      <div style={{ lineHeight: 1.2 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: value > 1 ? "#e8ff47" : "rgba(240,237,232,0.6)",
            whiteSpace: "nowrap",
          }}
        >
          {value === 1 ? "1 per page" : `${value} per page`}
        </div>
        {totalRows > 0 && (
          <div
            style={{
              fontSize: 8,
              color: "rgba(240,237,232,0.35)",
              whiteSpace: "nowrap",
            }}
          >
            {pageCount} page{pageCount === 1 ? "" : "s"} total
          </div>
        )}
      </div>
      <button
        onClick={next}
        disabled={idx === BATCH_OPTIONS.length - 1}
        style={{
          width: 20,
          height: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 4,
          background: "none",
          border: "none",
          color:
            idx === BATCH_OPTIONS.length - 1
              ? "rgba(240,237,232,0.15)"
              : "rgba(240,237,232,0.7)",
          cursor: idx === BATCH_OPTIONS.length - 1 ? "not-allowed" : "pointer",
          fontSize: 11,
        }}
      >
        ▸
      </button>
    </div>
  );
}

async function loadScript(src: string, globalKey: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any)[globalKey]) {
      resolve((window as any)[globalKey]);
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve((window as any)[globalKey]);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function renderBatchedPageToCanvas(
  objects: CanvasObject[],
  canvasSize: CanvasSize,
  rows: RowData[],
  pageRowStart: number,
  batch: number,
): Promise<HTMLCanvasElement> {
  const { cols, rows: gridRows } = batchGrid(batch);
  const pageW = canvasSize.width * cols;
  const pageH = canvasSize.height * gridRows;
  const page = document.createElement("div");
  page.style.cssText = `position:fixed;top:-99999px;left:-99999px;width:${pageW}px;height:${pageH}px;overflow:hidden;background:#fff;`;
  document.body.appendChild(page);

  for (let slot = 0; slot < batch; slot++) {
    const rowIdx = pageRowStart + slot;
    if (rowIdx >= rows.length) break;
    const rowData = rows[rowIdx];
    const col = slot % cols;
    const row = Math.floor(slot / cols);
    const ox = col * canvasSize.width;
    const oy = row * canvasSize.height;
    const cell = document.createElement("div");
    cell.style.cssText = `position:absolute;left:${ox}px;top:${oy}px;width:${canvasSize.width}px;height:${canvasSize.height}px;overflow:hidden;`;
    page.appendChild(cell);
    const bgImg = objects.find(
      (o) => o.kind === "image" && (o as ImageObject).isBackground,
    ) as ImageObject | undefined;
    if (bgImg) {
      const img = document.createElement("img");
      img.src = bgImg.src;
      img.style.cssText = `position:absolute;inset:0;width:100%;height:100%;object-fit:fill;opacity:${bgImg.opacity};`;
      cell.appendChild(img);
    }
    const sorted = [...objects].sort((a, b) => a.zIndex - b.zIndex);
    const ci = rowIdx; // use absolute row index for rendering
    for (const obj of sorted) {
      if (obj.kind === "image") {
        const imgObj = obj as ImageObject;
        if (imgObj.isBackground) continue;
        const img = document.createElement("img");
        img.src = imgObj.src;
        img.style.cssText = `position:absolute;left:${imgObj.x}px;top:${imgObj.y}px;width:${imgObj.width}px;height:${imgObj.height}px;opacity:${imgObj.opacity};object-fit:fill;`;
        if (imgObj.shadow.enabled)
          img.style.filter = `drop-shadow(${shadowCSS(imgObj.shadow)})`;
        cell.appendChild(img);
      } else {
        const f = obj as TextField;
        const ti = ci + f.columnOffset;
        const text =
          ti >= 0 && ti < rows.length ? (rows[ti][f.column] ?? "") : "";
        const fs = shrinkFontSize(
          text,
          f.width,
          f.height,
          f.fontFamily,
          f.fontSize,
          f.bold,
          f.italic,
        );
        const span = document.createElement("div");
        span.textContent = text;
        span.style.cssText = [
          `position:absolute;left:${f.x}px;top:${f.y}px;width:${f.width}px;height:${f.height}px;overflow:hidden;`,
          `font-family:'${f.fontFamily}',serif;font-size:${fs}px;color:${f.color};`,
          `font-weight:${f.bold ? "bold" : "normal"};font-style:${f.italic ? "italic" : "normal"};`,
          `text-align:${f.textAlign};display:flex;align-items:center;`,
          `justify-content:${f.textAlign === "right" ? "flex-end" : f.textAlign === "center" ? "center" : "flex-start"};`,
          `padding:0 3px;white-space:nowrap;box-sizing:border-box;`,
          f.shadow.enabled ? `text-shadow:${shadowCSS(f.shadow)};` : "",
        ].join("");
        cell.appendChild(span);
      }
    }
  }

  const imgs = page.querySelectorAll("img");
  await Promise.all(
    Array.from(imgs).map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((r) => {
            img.onload = r;
            img.onerror = r;
          }),
    ),
  );
  const h2c = await loadScript(
    "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
    "html2canvas",
  );
  const resultCanvas = await h2c(page, {
    useCORS: true,
    allowTaint: true,
    scale: 2,
    width: pageW,
    height: pageH,
    x: 0,
    y: 0,
    scrollX: 0,
    scrollY: 0,
    backgroundColor: "#ffffff",
  });
  document.body.removeChild(page);
  return resultCanvas;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

async function exportRecords(
  format: string,
  objects: CanvasObject[],
  canvasSize: CanvasSize,
  rows: RowData[],
  batch: number,
  onProgress: (pct: number) => void,
) {
  if (!rows.length) rows = [{}];
  onProgress(5);
  const totalPages = Math.ceil(rows.length / batch);
  if (format === "PNG") {
    for (let p = 0; p < totalPages; p++) {
      const cv = await renderBatchedPageToCanvas(
        objects,
        canvasSize,
        rows,
        p * batch,
        batch,
      );
      await new Promise<void>((resolve) =>
        cv.toBlob((blob) => {
          if (blob)
            downloadBlob(
              blob,
              batch === 1
                ? `record_${p + 1}.png`
                : `page_${p + 1}_x${batch}.png`,
            );
          resolve();
        }, "image/png"),
      );
      onProgress(Math.round(10 + (p / totalPages) * 90));
    }
  } else if (format === "PDF") {
    const jsPDF = await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      "jspdf",
    );
    const { jsPDF: JsPDF } = jsPDF;
    const { cols, rows: gridRows } = batchGrid(batch);
    const pageW = canvasSize.width * cols;
    const pageH = canvasSize.height * gridRows;
    const pW = pageW * 0.264583,
      pH = pageH * 0.264583;
    let pdf: any = null;
    for (let p = 0; p < totalPages; p++) {
      const cv = await renderBatchedPageToCanvas(
        objects,
        canvasSize,
        rows,
        p * batch,
        batch,
      );
      const imgData = cv.toDataURL("image/png");
      if (!pdf)
        pdf = new JsPDF({
          orientation: pW > pH ? "l" : "p",
          unit: "mm",
          format: [pW, pH],
        });
      else pdf.addPage([pW, pH], pW > pH ? "l" : "p");
      pdf.addImage(imgData, "PNG", 0, 0, pW, pH);
      onProgress(Math.round(10 + (p / totalPages) * 88));
    }
    if (pdf) pdf.save("templify_export.pdf");
  }
  onProgress(100);
}

const MAX_PAST = 25,
  MAX_FUTURE = 25;
function useUndoRedo<T>(init: T) {
  const past = useRef<T[]>([]);
  const present = useRef<T>(init);
  const future = useRef<T[]>([]);
  const [, rerender] = useState(0);
  const bump = () => rerender((n) => n + 1);
  const push = useCallback((val: T) => {
    past.current.push(present.current);
    if (past.current.length > MAX_PAST) past.current.shift();
    present.current = val;
    future.current = [];
    bump();
  }, []);
  const setState = useCallback(
    (next: T | ((p: T) => T), commit = true) => {
      const val =
        typeof next === "function"
          ? (next as (p: T) => T)(present.current)
          : next;
      if (commit) push(val);
      else {
        present.current = val;
        bump();
      }
    },
    [push],
  );
  const undoFn = useCallback(() => {
    if (!past.current.length) return;
    future.current.unshift(present.current);
    if (future.current.length > MAX_FUTURE) future.current.pop();
    present.current = past.current.pop()!;
    bump();
  }, []);
  const redoFn = useCallback(() => {
    if (!future.current.length) return;
    past.current.push(present.current);
    if (past.current.length > MAX_PAST) past.current.shift();
    present.current = future.current.shift()!;
    bump();
  }, []);
  const undoRef = useRef(undoFn);
  undoRef.current = undoFn;
  const redoRef = useRef(redoFn);
  redoRef.current = redoFn;
  return {
    state: present.current,
    setState,
    undo: undoFn,
    redo: redoFn,
    undoRef,
    redoRef,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}

function LayerItem({
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
  const label = isImg
    ? (obj as ImageObject).name
    : `{{${(obj as TextField).column}}}`;
  const isBg = isImg && (obj as ImageObject).isBackground;
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
        transition: "all 0.1s",
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
          ⠿
        </span>
        <span style={{ fontSize: 11, flexShrink: 0 }}>
          {isImg ? "🖼" : "T"}
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
        ✕
      </button>
    </div>
  );
}

// ─── Floating Page Navigator (bottom bar) ─────────────────────────────────────
function FloatingPageNav({
  pageIndex,
  totalPages,
  batchSize,
  onPageChange,
  onBatchChange,
  rows,
}: {
  pageIndex: number;
  totalPages: number;
  batchSize: BatchSize;
  onPageChange: (p: number) => void;
  onBatchChange: (b: BatchSize) => void;
  rows: RowData[];
}) {
  if (totalPages === 0) return null;

  const startRow = pageIndex * batchSize + 1;
  const endRow = Math.min((pageIndex + 1) * batchSize, rows.length);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        borderRadius: 16,
        background: "rgba(12,12,20,0.92)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        animation: "slideUp 0.2s ease",
      }}
    >
      {/* Batch stepper */}
      <BatchStepper
        value={batchSize}
        onChange={onBatchChange}
        totalRows={rows.length}
      />

      <div
        style={{ width: 1, height: 28, background: "rgba(255,255,255,0.1)" }}
      />

      {/* Page navigator */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          onClick={() => onPageChange(0)}
          disabled={pageIndex === 0}
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color:
              pageIndex === 0
                ? "rgba(240,237,232,0.15)"
                : "rgba(240,237,232,0.6)",
            cursor: pageIndex === 0 ? "not-allowed" : "pointer",
            fontSize: 9,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ⟨⟨
        </button>
        <button
          onClick={() => onPageChange(Math.max(0, pageIndex - 1))}
          disabled={pageIndex === 0}
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color:
              pageIndex === 0
                ? "rgba(240,237,232,0.15)"
                : "rgba(240,237,232,0.6)",
            cursor: pageIndex === 0 ? "not-allowed" : "pointer",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ‹
        </button>

        <div style={{ textAlign: "center", minWidth: 90 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#f0ede8" }}>
            Page {pageIndex + 1}{" "}
            <span style={{ color: "rgba(240,237,232,0.3)" }}>
              / {totalPages}
            </span>
          </div>
          <div
            style={{
              fontSize: 9,
              color: "rgba(240,237,232,0.35)",
              marginTop: 1,
            }}
          >
            Rows {startRow}–{endRow} of {rows.length}
          </div>
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages - 1, pageIndex + 1))}
          disabled={pageIndex === totalPages - 1}
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color:
              pageIndex === totalPages - 1
                ? "rgba(240,237,232,0.15)"
                : "rgba(240,237,232,0.6)",
            cursor: pageIndex === totalPages - 1 ? "not-allowed" : "pointer",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ›
        </button>
        <button
          onClick={() => onPageChange(totalPages - 1)}
          disabled={pageIndex === totalPages - 1}
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color:
              pageIndex === totalPages - 1
                ? "rgba(240,237,232,0.15)"
                : "rgba(240,237,232,0.6)",
            cursor: pageIndex === totalPages - 1 ? "not-allowed" : "pointer",
            fontSize: 9,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ⟩⟩
        </button>
      </div>
    </div>
  );
}

export default function TemplifyEditor() {
  const [mounted, setMounted] = useState(false);
  const {
    state: objects,
    setState: setObjectsRaw,
    undo,
    redo,
    undoRef,
    redoRef,
    canUndo,
    canRedo,
  } = useUndoRedo<CanvasObject[]>([]);
  const setObjects = useCallback(
    (
      u: CanvasObject[] | ((p: CanvasObject[]) => CanvasObject[]),
      live = false,
    ) => {
      setObjectsRaw(u as any, !live);
    },
    [setObjectsRaw],
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [clipboard, setClipboard] = useState<CanvasObject | null>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: 960,
    height: 540,
  });
  const [activePreset, setActivePreset] = useState("16:9 HD");
  const [showSizePicker, setShowSizePicker] = useState(false);
  // ── Page-based navigation (replaces rowIndex) ──
  // pageIndex = which page (group of batchSize rows) we're previewing
  const [pageIndex, setPageIndex] = useState(0);
  const [exportFormat, setExportFormat] = useState("PNG");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [rightTab, setRightTab] = useState<"layers" | "style">("layers");
  const [imgDragOver, setImgDragOver] = useState(false);
  const [xlsxDragOver, setXlsxDragOver] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<RowData[]>([]);
  const [dataFileName, setDataFileName] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [layerDraggingId, setLayerDraggingId] = useState<number | null>(null);
  const [batchSize, setBatchSize] = useState<BatchSize>(1);
  const nextZ = useRef(100);

  const MAX_W = 840,
    MAX_H = 560;
  const scale = Math.min(
    1,
    MAX_W / canvasSize.width,
    MAX_H / canvasSize.height,
  );

  // ── Derived values ──
  // totalPages = how many pages given current batch size
  const totalPages = rows.length > 0 ? Math.ceil(rows.length / batchSize) : 0;
  // The absolute row index of the FIRST row on the current preview page
  const previewRowStart = pageIndex * batchSize;
  // The row shown in the canvas preview (always first row of the current page)
  const currentRow = useMemo(() => {
    if (rows.length === 0) return null;
    const idx = Math.min(previewRowStart, rows.length - 1);
    return rows[idx];
  }, [rows, previewRowStart]);

  // When batchSize changes, clamp pageIndex so we don't go out of bounds
  useEffect(() => {
    if (totalPages > 0 && pageIndex >= totalPages) {
      setPageIndex(totalPages - 1);
    }
  }, [batchSize, totalPages, pageIndex]);

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    const id = "gf-DM-Sans";
    if (!document.getElementById(id)) {
      const l = document.createElement("link");
      l.id = id;
      l.rel = "stylesheet";
      l.href =
        "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  const selectedObj = useMemo(
    () => objects.find((o) => o.id === selectedId) ?? null,
    [objects, selectedId],
  );
  const layersSorted = useMemo(
    () => [...objects].sort((a, b) => b.zIndex - a.zIndex),
    [objects],
  );
  const bgImage = useMemo(
    () =>
      objects.find(
        (o) => o.kind === "image" && (o as ImageObject).isBackground,
      ) as ImageObject | undefined,
    [objects],
  );

  const selectedIdRef = useRef<number | null>(null);
  const clipboardRef = useRef<CanvasObject | null>(null);
  const objectsRef = useRef<CanvasObject[]>([]);
  selectedIdRef.current = selectedId;
  clipboardRef.current = clipboard;
  objectsRef.current = objects;

  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (e.target as HTMLElement).isContentEditable
      )
        return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoRef.current();
        return;
      }
      if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redoRef.current();
        return;
      }
      const sid = selectedIdRef.current;
      const selObj = objectsRef.current.find((o) => o.id === sid) ?? null;
      if ((e.key === "Delete" || e.key === "Backspace") && sid !== null) {
        e.preventDefault();
        setObjects((p) => p.filter((o) => o.id !== sid));
        setSelectedId(null);
        return;
      }
      if (ctrl && e.key === "c" && selObj) {
        e.preventDefault();
        setClipboard(selObj);
        return;
      }
      if (ctrl && e.key === "v" && clipboardRef.current) {
        e.preventDefault();
        const cb = clipboardRef.current;
        const n: CanvasObject = {
          ...cb,
          id: Date.now(),
          x: cb.x + 20,
          y: cb.y + 20,
          zIndex: nextZ.current++,
        };
        setObjects((p) => [...p, n]);
        setSelectedId(n.id);
        return;
      }
      if (ctrl && e.key === "d" && selObj) {
        e.preventDefault();
        const d: CanvasObject = {
          ...selObj,
          id: Date.now(),
          x: selObj.x + 20,
          y: selObj.y + 20,
          zIndex: nextZ.current++,
        };
        setObjects((p) => [...p, d]);
        setSelectedId(d.id);
        return;
      }
      if (ctrl && e.key === "b" && selObj?.kind === "field") {
        e.preventDefault();
        setObjects((p) =>
          p.map((o) =>
            o.id === selObj.id
              ? ({ ...o, bold: !(o as TextField).bold } as CanvasObject)
              : o,
          ),
        );
        return;
      }
      if (ctrl && e.key === "i" && selObj?.kind === "field") {
        e.preventDefault();
        setObjects((p) =>
          p.map((o) =>
            o.id === selObj.id
              ? ({ ...o, italic: !(o as TextField).italic } as CanvasObject)
              : o,
          ),
        );
        return;
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        return;
      }
      if (
        sid !== null &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx =
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy =
          e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        setObjects((p) =>
          p.map((o) =>
            o.id === sid
              ? ({ ...o, x: o.x + dx, y: o.y + dy } as CanvasObject)
              : o,
          ),
        );
      }
    };
    window.addEventListener("keydown", dn, { capture: true });
    return () => window.removeEventListener("keydown", dn, { capture: true });
  }, []);

  const handleDataFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv", "tsv"].includes(ext || "")) {
      setDataError("Please upload XLSX, XLS, CSV, or TSV.");
      return;
    }
    setDataLoading(true);
    setDataError(null);
    try {
      const { columns: cols, rows: rd } = await parseSpreadsheet(file);
      if (!cols.length) {
        setDataError("No columns detected.");
        setDataLoading(false);
        return;
      }
      setColumns(cols);
      setRows(rd);
      setDataFileName(file.name);
      setPageIndex(0);
      setObjects((p) =>
        p.filter(
          (o) => o.kind !== "field" || cols.includes((o as TextField).column),
        ),
      );
    } catch (err: any) {
      setDataError(`Parse error: ${err?.message || "Unknown"}`);
    }
    setDataLoading(false);
  };

  const addImage = useCallback(
    (src: string, name: string, nw: number, nh: number) => {
      const mW = Math.min(canvasSize.width * 0.85, 600),
        s = mW / nw,
        w = Math.round(nw * s),
        h = Math.round(nh * s);
      const obj: ImageObject = {
        kind: "image",
        id: Date.now(),
        src,
        name,
        x: Math.round((canvasSize.width - w) / 2),
        y: Math.round((canvasSize.height - h) / 2),
        width: w,
        height: h,
        zIndex: nextZ.current++,
        opacity: 1,
        shadow: { ...DEFAULT_SHADOW },
        isBackground: false,
        naturalWidth: nw,
        naturalHeight: nh,
      };
      setObjects((p) => [...p, obj]);
      setSelectedId(obj.id);
      setRightTab("style");
    },
    [canvasSize, setObjects],
  );

  const addField = useCallback(
    (column: string) => {
      const existing = objectsRef.current.filter(
        (o) => o.kind === "field" && (o as TextField).column === column,
      );
      const fields = objectsRef.current.filter((o) => o.kind === "field");
      const obj: TextField = {
        kind: "field",
        id: Date.now(),
        column,
        x: 40,
        y: 40 + fields.length * 52,
        width: 260,
        height: 40,
        fontSize: 22,
        fontFamily: "Playfair Display",
        color: "#1a1a1a",
        bold: false,
        italic: false,
        zIndex: nextZ.current++,
        shadow: { ...DEFAULT_SHADOW },
        columnOffset: existing.length,
        textAlign: "left",
      };
      setObjects((p) => [...p, obj]);
      setSelectedId(obj.id);
      setRightTab("style");
    },
    [setObjects],
  );

  const handleDrag = useCallback(
    (id: number, x: number, y: number, live: boolean) => {
      setObjects((p) => p.map((o) => (o.id === id ? { ...o, x, y } : o)), live);
    },
    [setObjects],
  );
  const handleResize = useCallback(
    (id: number, patch: Partial<CanvasObject>, live: boolean) => {
      setObjects(
        (p) =>
          p.map((o) =>
            o.id === id ? ({ ...o, ...patch } as CanvasObject) : o,
          ),
        live,
      );
    },
    [setObjects],
  );
  const deleteObj = useCallback(
    (id: number) => {
      setObjects((p) => p.filter((o) => o.id !== id));
      setSelectedId((s) => (s === id ? null : s));
    },
    [setObjects],
  );
  const updateObj = useCallback(
    (key: string, value: unknown) => {
      const sid = selectedIdRef.current;
      if (sid === null) return;
      setObjects((p) =>
        p.map((o) =>
          o.id === sid ? ({ ...o, [key]: value } as CanvasObject) : o,
        ),
      );
    },
    [setObjects],
  );

  const setAsBackground = useCallback(
    (id: number, enable: boolean) => {
      setObjects((p) =>
        p.map((o) => {
          if (o.kind !== "image") return o;
          const img = o as ImageObject;
          if (img.id === id && enable)
            return {
              ...img,
              isBackground: true,
              x: 0,
              y: 0,
              width: canvasSize.width,
              height: canvasSize.height,
              zIndex: 0,
            };
          if (img.id === id && !enable) return { ...img, isBackground: false };
          if (enable) return { ...img, isBackground: false };
          return o;
        }),
      );
    },
    [setObjects, canvasSize],
  );

  const handleImageFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .forEach((f) => {
          const r = new FileReader();
          r.onload = (ev) => {
            const src = ev.target?.result as string;
            const img = new window.Image();
            img.onload = () =>
              addImage(
                src,
                f.name.replace(/\.[^.]+$/, ""),
                img.naturalWidth,
                img.naturalHeight,
              );
            img.src = src;
          };
          r.readAsDataURL(f);
        });
    },
    [addImage],
  );

  const layerDragOver = useRef<number | null>(null);
  const makeDragHandlers = useCallback(
    (obj: CanvasObject) => ({
      draggingId: layerDraggingId,
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = "move";
        setLayerDraggingId(obj.id);
      },
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        layerDragOver.current = obj.id;
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const fromId = layerDraggingId,
          toId = layerDragOver.current;
        if (!fromId || !toId || fromId === toId) return;
        setObjects((p) => {
          const fromObj = p.find((o) => o.id === fromId),
            toObj = p.find((o) => o.id === toId);
          if (!fromObj || !toObj) return p;
          const fromZ = fromObj.zIndex,
            toZ = toObj.zIndex;
          return p.map((o) =>
            o.id === fromId
              ? ({ ...o, zIndex: toZ } as CanvasObject)
              : o.id === toId
                ? ({ ...o, zIndex: fromZ } as CanvasObject)
                : o,
          );
        });
        setLayerDraggingId(null);
        layerDragOver.current = null;
      },
      onDragEnd: () => {
        setLayerDraggingId(null);
        layerDragOver.current = null;
      },
    }),
    [layerDraggingId, setObjects],
  );

  const doExport = useCallback(async () => {
    if (exportProgress !== null) return;
    setExportProgress(0);
    try {
      await exportRecords(
        exportFormat,
        objects,
        canvasSize,
        rows,
        batchSize,
        (pct) => setExportProgress(pct),
      );
    } catch (err: any) {
      alert(`Export failed: ${err?.message || "Unknown error"}`);
    } finally {
      setTimeout(() => setExportProgress(null), 800);
    }
  }, [exportFormat, objects, canvasSize, rows, batchSize, exportProgress]);

  if (!mounted) return null;

  return (
    <div
      style={{
        background: "#0a0a10",
        color: "#f0ede8",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'DM Sans',sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px;}
        input[type=range]{accent-color:#e8ff47;cursor:pointer;} input[type=color]{border:none;background:none;cursor:pointer;padding:0;}
        .chip:hover{background:rgba(232,255,71,0.09)!important;border-color:rgba(232,255,71,0.3)!important;color:#e8ff47!important;}
        .undob:disabled{opacity:0.18;cursor:not-allowed!important;} .undob:not(:disabled):hover{background:rgba(255,255,255,0.08)!important;}
        button{font-family:'DM Sans',sans-serif;}
        @keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
      `}</style>

      {exportProgress !== null && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#14141e",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 14,
              padding: "28px 36px",
              minWidth: 260,
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: 14 }}>
              {exportProgress < 100 ? (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    border: "3px solid rgba(232,255,71,0.2)",
                    borderTop: "3px solid #e8ff47",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                    margin: "0 auto",
                  }}
                />
              ) : (
                <span style={{ fontSize: 24 }}>✅</span>
              )}
            </div>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#f0ede8",
                marginBottom: 10,
              }}
            >
              {exportProgress < 100
                ? `Exporting… ${exportProgress}%`
                : "Export complete!"}
            </p>
            {totalPages > 0 && exportProgress < 100 && (
              <p
                style={{
                  fontSize: 10,
                  color: "rgba(240,237,232,0.35)",
                  marginBottom: 10,
                }}
              >
                {totalPages} page{totalPages === 1 ? "" : "s"} · {batchSize}×
                batch
              </p>
            )}
            <div
              style={{
                height: 4,
                background: "rgba(255,255,255,0.1)",
                borderRadius: 4,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${exportProgress}%`,
                  background: "#e8ff47",
                  borderRadius: 4,
                  transition: "width 0.3s",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Header ─────────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          height: 50,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "#0c0c14",
          flexShrink: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div
              style={{
                width: 26,
                height: 26,
                background: "#e8ff47",
                borderRadius: 7,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 900,
                color: "#0a0a10",
              }}
            >
              ✦
            </div>
            <span
              style={{
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "-0.02em",
              }}
            >
              Templify
            </span>
          </div>
          <div
            style={{
              width: 1,
              height: 18,
              background: "rgba(255,255,255,0.08)",
            }}
          />
          <div style={{ display: "flex", gap: 2 }}>
            <button
              className="undob"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(240,237,232,0.55)",
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ↩
            </button>
            <button
              className="undob"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(240,237,232,0.55)",
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ↪
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <button
            onClick={() => setShowSizePicker(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              borderRadius: 7,
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(240,237,232,0.7)",
            }}
          >
            <span>⬚</span>
            <span>{activePreset}</span>
            <span style={{ fontSize: 9, color: "rgba(240,237,232,0.3)" }}>
              {canvasSize.width}×{canvasSize.height}
            </span>
          </button>

          <div style={{ position: "relative" }}>
            <div
              style={{
                display: "flex",
                borderRadius: 7,
                overflow: "hidden",
                border: "1px solid rgba(232,255,71,0.4)",
              }}
            >
              <button
                onClick={doExport}
                disabled={exportProgress !== null}
                style={{
                  padding: "4px 12px",
                  background: "#e8ff47",
                  color: "#0a0a10",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: exportProgress !== null ? "not-allowed" : "pointer",
                  border: "none",
                  opacity: exportProgress !== null ? 0.7 : 1,
                }}
              >
                {exportProgress !== null
                  ? `${exportProgress}%`
                  : totalPages > 1
                    ? `Export ${exportFormat} · ${totalPages}p`
                    : `Export ${exportFormat}`}
              </button>
              <button
                onClick={() => setShowExportMenu((p) => !p)}
                style={{
                  padding: "4px 7px",
                  background: "#e8ff47",
                  color: "#0a0a10",
                  fontSize: 10,
                  cursor: "pointer",
                  border: "none",
                  borderLeft: "1px solid rgba(0,0,0,0.15)",
                }}
              >
                ▾
              </button>
            </div>
            {showExportMenu && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  marginTop: 3,
                  background: "#1a1a26",
                  border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: 8,
                  overflow: "hidden",
                  zIndex: 50,
                  boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                  minWidth: 100,
                  animation: "slideIn 0.12s ease",
                }}
              >
                {["PNG", "PDF"].map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setExportFormat(f);
                      setShowExportMenu(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "7px 12px",
                      textAlign: "left",
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "none",
                      background: "transparent",
                      color:
                        exportFormat === f
                          ? "#e8ff47"
                          : "rgba(240,237,232,0.7)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    {f}
                    {exportFormat === f && (
                      <span style={{ fontSize: 9 }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ─── Left panel ─────────────────────────────────────────────── */}
        <aside
          style={{
            width: 210,
            flexShrink: 0,
            borderRight: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            background: "#0e0e18",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 12,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "rgba(240,237,232,0.28)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              Template / Image
            </p>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setImgDragOver(true);
              }}
              onDragLeave={() => setImgDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setImgDragOver(false);
                handleImageFiles(e.dataTransfer.files);
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
                padding: "12px 10px",
                borderRadius: 9,
                cursor: "pointer",
                transition: "all 0.2s",
                background: imgDragOver
                  ? "rgba(232,255,71,0.1)"
                  : "rgba(232,255,71,0.03)",
                border: `1.5px dashed ${imgDragOver ? "#e8ff47" : "rgba(232,255,71,0.22)"}`,
              }}
            >
              <div style={{ fontSize: 22 }}>🖼</div>
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: imgDragOver ? "#e8ff47" : "rgba(240,237,232,0.6)",
                    marginBottom: 1,
                  }}
                >
                  Upload Image
                </p>
                <p style={{ fontSize: 9, color: "rgba(240,237,232,0.25)" }}>
                  or drag & drop
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) => handleImageFiles(e.target.files)}
              />
            </label>
          </div>
          <div
            style={{
              padding: 12,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "rgba(240,237,232,0.28)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              Data Source
            </p>
            {dataFileName ? (
              <div
                style={{
                  background: "rgba(232,255,71,0.04)",
                  border: "1px solid rgba(232,255,71,0.15)",
                  borderRadius: 8,
                  padding: "8px 10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 3,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      minWidth: 0,
                    }}
                  >
                    <span style={{ color: "#e8ff47", flexShrink: 0 }}>📊</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#e8ff47",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {dataFileName}
                    </span>
                  </div>
                  <label
                    style={{
                      cursor: "pointer",
                      fontSize: 11,
                      color: "rgba(240,237,232,0.3)",
                      marginLeft: 5,
                      flexShrink: 0,
                    }}
                    title="Replace"
                  >
                    ↺
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.tsv"
                      style={{ display: "none" }}
                      onChange={(e) =>
                        e.target.files?.[0] && handleDataFile(e.target.files[0])
                      }
                    />
                  </label>
                </div>
                <p style={{ fontSize: 10, color: "rgba(240,237,232,0.35)" }}>
                  {rows.length} rows · {columns.length} cols
                </p>
              </div>
            ) : (
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setXlsxDragOver(true);
                }}
                onDragLeave={() => setXlsxDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setXlsxDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleDataFile(f);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 5,
                  padding: "12px 10px",
                  borderRadius: 9,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: xlsxDragOver
                    ? "rgba(232,255,71,0.06)"
                    : "rgba(255,255,255,0.02)",
                  border: `1.5px dashed ${xlsxDragOver ? "#e8ff47" : "rgba(255,255,255,0.09)"}`,
                }}
              >
                {dataLoading ? (
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      border: "2px solid rgba(232,255,71,0.2)",
                      borderTop: "2px solid #e8ff47",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 18 }}>📂</span>
                )}
                <div style={{ textAlign: "center" }}>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "rgba(240,237,232,0.5)",
                      marginBottom: 1,
                    }}
                  >
                    {dataLoading ? "Loading…" : "Upload Data"}
                  </p>
                  <p style={{ fontSize: 9, color: "rgba(240,237,232,0.22)" }}>
                    XLSX · CSV · TSV
                  </p>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv"
                  style={{ display: "none" }}
                  onChange={(e) =>
                    e.target.files?.[0] && handleDataFile(e.target.files[0])
                  }
                />
              </label>
            )}
            {dataError && (
              <p
                style={{
                  fontSize: 10,
                  color: "#f87171",
                  marginTop: 5,
                  lineHeight: 1.4,
                }}
              >
                {dataError}
              </p>
            )}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            <p
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "rgba(240,237,232,0.28)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              Text Fields
            </p>
            {columns.length === 0 ? (
              <p
                style={{
                  fontSize: 11,
                  color: "rgba(240,237,232,0.18)",
                  lineHeight: 1.6,
                }}
              >
                Upload a data file to see columns.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {columns.map((col) => {
                  const cnt = objects.filter(
                    (o) =>
                      o.kind === "field" && (o as TextField).column === col,
                  ).length;
                  return (
                    <button
                      key={col}
                      onClick={() => addField(col)}
                      className="chip"
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "5px 8px",
                        borderRadius: 7,
                        fontSize: 10,
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all 0.15s",
                        background:
                          cnt > 0
                            ? "rgba(232,255,71,0.05)"
                            : "rgba(255,255,255,0.02)",
                        border: `1px solid ${cnt > 0 ? "rgba(232,255,71,0.15)" : "rgba(255,255,255,0.06)"}`,
                        color: cnt > 0 ? "#e8ff47" : "rgba(240,237,232,0.6)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: 9,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >{`{{${col}}}`}</span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                          flexShrink: 0,
                        }}
                      >
                        {cnt > 0 && (
                          <span
                            style={{
                              background: "rgba(232,255,71,0.15)",
                              color: "#e8ff47",
                              borderRadius: 3,
                              padding: "0 4px",
                              fontSize: 8,
                              fontWeight: 700,
                            }}
                          >
                            {cnt}
                          </span>
                        )}
                        <span style={{ fontSize: 10, opacity: 0.4 }}>+</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div
            style={{
              padding: 12,
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "rgba(240,237,232,0.28)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              Shortcuts
            </p>
            <KbdHint keys={["Ctrl", "Z"]} label="Undo" />
            <KbdHint keys={["Ctrl", "Y"]} label="Redo" />
            <KbdHint keys={["Ctrl", "D"]} label="Duplicate" />
            <KbdHint keys={["Ctrl", "B"]} label="Bold" />
            <KbdHint keys={["Ctrl", "I"]} label="Italic" />
            <KbdHint keys={["Del"]} label="Delete" />
          </div>
        </aside>

        {/* ─── Canvas ─────────────────────────────────────────────────── */}
        <main
          style={{
            flex: 1,
            background: "#07070e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            padding: 36,
            overflow: "hidden",
          }}
          onClick={() => setSelectedId(null)}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.02) 1px,transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "center center",
              flexShrink: 0,
              width: canvasSize.width,
              height: canvasSize.height,
              position: "relative",
            }}
          >
            <div
              id="templify-canvas"
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: bgImage ? 0 : 5,
                background: "#fff",
                boxShadow:
                  "0 20px 80px rgba(0,0,0,0.9),0 0 0 1px rgba(255,255,255,0.04)",
                overflow: "hidden",
              }}
            >
              {objects.length === 0 && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ fontSize: 40, opacity: 0.07 }}>🖼</div>
                  <p
                    style={{
                      color: "rgba(10,10,16,0.18)",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    Upload a template to begin
                  </p>
                </div>
              )}
            </div>
            {bgImage && (
              <ImageEl
                key={bgImage.id}
                obj={bgImage}
                selected={selectedId === bgImage.id}
                onSelect={setSelectedId}
                onDrag={handleDrag}
                onResize={handleResize}
                scale={scale}
              />
            )}
            {objects
              .filter(
                (o) => !(o.kind === "image" && (o as ImageObject).isBackground),
              )
              .map((obj) =>
                obj.kind === "image" ? (
                  <ImageEl
                    key={obj.id}
                    obj={obj as ImageObject}
                    selected={selectedId === obj.id}
                    onSelect={setSelectedId}
                    onDrag={handleDrag}
                    onResize={handleResize}
                    scale={scale}
                  />
                ) : (
                  <TextEl
                    key={obj.id}
                    obj={obj as TextField}
                    selected={selectedId === obj.id}
                    onSelect={setSelectedId}
                    onDrag={handleDrag}
                    onResize={handleResize}
                    currentRow={currentRow}
                    rows={rows}
                    scale={scale}
                  />
                ),
              )}
          </div>

          {/* ─── Canvas footer label ─── */}
          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 9,
              color: "rgba(240,237,232,0.12)",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            {canvasSize.width}×{canvasSize.height}px · {activePreset}
            {batchSize > 1 ? ` · ${batchSize}× batch` : ""}
          </div>

          {/* ─── Floating page navigator ─── */}
          <FloatingPageNav
            pageIndex={pageIndex}
            totalPages={totalPages}
            batchSize={batchSize}
            onPageChange={setPageIndex}
            onBatchChange={(b) => {
              setBatchSize(b);
              setPageIndex(0);
            }}
            rows={rows}
          />
        </main>

        {/* ─── Right panel ────────────────────────────────────────────── */}
        <aside
          style={{
            width: 248,
            flexShrink: 0,
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            background: "#0e0e18",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
            }}
          >
            {(["layers", "style"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  cursor: "pointer",
                  background: "transparent",
                  border: "none",
                  color:
                    rightTab === tab ? "#e8ff47" : "rgba(240,237,232,0.28)",
                  borderBottom:
                    rightTab === tab
                      ? "2px solid #e8ff47"
                      : "2px solid transparent",
                }}
              >
                {tab === "layers" ? "Layers" : "Style"}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {rightTab === "layers" && (
              <div style={{ padding: 12 }}>
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "rgba(240,237,232,0.28)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                  }}
                >
                  Objects ({objects.length}) — drag to reorder
                </p>
                {objects.length === 0 ? (
                  <p
                    style={{
                      fontSize: 11,
                      color: "rgba(240,237,232,0.18)",
                      textAlign: "center",
                      paddingBlock: 28,
                      lineHeight: 1.7,
                    }}
                  >
                    No objects yet.
                  </p>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 3 }}
                  >
                    {layersSorted.map((o) => (
                      <LayerItem
                        key={o.id}
                        obj={o}
                        selected={selectedId === o.id}
                        onSelect={() => {
                          setSelectedId(o.id);
                          setRightTab("style");
                        }}
                        onDelete={() => deleteObj(o.id)}
                        dragHandlers={makeDragHandlers(o)}
                      />
                    ))}
                  </div>
                )}
                <p
                  style={{
                    fontSize: 9,
                    color: "rgba(240,237,232,0.2)",
                    marginTop: 10,
                    lineHeight: 1.5,
                  }}
                >
                  Top of list = front of canvas.
                  <br />
                  Drag ⠿ handle to reorder layers.
                </p>
              </div>
            )}
            {rightTab === "style" && (
              <div
                style={{
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                {!selectedObj ? (
                  <p
                    style={{
                      fontSize: 11,
                      color: "rgba(240,237,232,0.18)",
                      textAlign: "center",
                      paddingBlock: 28,
                      lineHeight: 1.7,
                    }}
                  >
                    Select an object
                    <br />
                    to edit its style.
                  </p>
                ) : (
                  <>
                    <div
                      style={{
                        padding: "7px 9px",
                        borderRadius: 7,
                        background: "rgba(232,255,71,0.05)",
                        border: "1px solid rgba(232,255,71,0.12)",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#e8ff47",
                          fontFamily: "monospace",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {selectedObj.kind === "image"
                          ? `🖼 ${(selectedObj as ImageObject).name}`
                          : `T  {{${(selectedObj as TextField).column}}}`}
                      </p>
                    </div>
                    <div>
                      <SLabel>Size & Position</SLabel>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 6,
                        }}
                      >
                        {(
                          [
                            ["W", "width"],
                            ["H", "height"],
                            ["X", "x"],
                            ["Y", "y"],
                          ] as [string, string][]
                        ).map(([l, k]) => (
                          <div key={k}>
                            <p
                              style={{
                                fontSize: 9,
                                color: "rgba(240,237,232,0.25)",
                                marginBottom: 3,
                              }}
                            >
                              {l}
                            </p>
                            <input
                              type="number"
                              value={Math.round((selectedObj as any)[k])}
                              onChange={(e) =>
                                updateObj(k, Number(e.target.value))
                              }
                              style={{
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
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <SLabel>Layer Order</SLabel>
                      <div style={{ display: "flex", gap: 5 }}>
                        <button
                          onClick={() => {
                            if (selectedId)
                              setObjects((p) =>
                                p.map((o) =>
                                  o.id === selectedId
                                    ? ({
                                        ...o,
                                        zIndex: nextZ.current++,
                                      } as CanvasObject)
                                    : o,
                                ),
                              );
                          }}
                          style={{
                            flex: 1,
                            padding: "5px 0",
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: "pointer",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "rgba(240,237,232,0.6)",
                          }}
                        >
                          ↑ Fwd
                        </button>
                        <button
                          onClick={() => {
                            if (selectedId)
                              setObjects((p) => {
                                const m =
                                  Math.min(...p.map((o) => o.zIndex)) - 1;
                                return p.map((o) =>
                                  o.id === selectedId
                                    ? ({ ...o, zIndex: m } as CanvasObject)
                                    : o,
                                );
                              });
                          }}
                          style={{
                            flex: 1,
                            padding: "5px 0",
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: "pointer",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "rgba(240,237,232,0.6)",
                          }}
                        >
                          ↓ Back
                        </button>
                      </div>
                    </div>
                    {selectedObj.kind === "image" &&
                      (() => {
                        const img = selectedObj as ImageObject;
                        return (
                          <>
                            <div
                              style={{
                                padding: "10px",
                                borderRadius: 9,
                                background: img.isBackground
                                  ? "rgba(232,255,71,0.05)"
                                  : "rgba(255,255,255,0.02)",
                                border: `1px solid ${img.isBackground ? "rgba(232,255,71,0.18)" : "rgba(255,255,255,0.06)"}`,
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                              }}
                            >
                              <Toggle
                                value={img.isBackground}
                                onChange={(v) => setAsBackground(img.id, v)}
                                label="Canvas Background"
                              />
                              {img.isBackground && (
                                <div
                                  style={{
                                    paddingTop: 7,
                                    borderTop:
                                      "1px solid rgba(255,255,255,0.06)",
                                  }}
                                >
                                  <p
                                    style={{
                                      fontSize: 9,
                                      color: "rgba(240,237,232,0.38)",
                                      lineHeight: 1.5,
                                      marginBottom: 7,
                                    }}
                                  >
                                    Synced to{" "}
                                    <span
                                      style={{
                                        color: "#e8ff47",
                                        fontWeight: 700,
                                      }}
                                    >
                                      {img.naturalWidth}×{img.naturalHeight}px
                                    </span>
                                  </p>
                                  <button
                                    onClick={() => {
                                      const MAX = 2000,
                                        nw = img.naturalWidth,
                                        nh = img.naturalHeight,
                                        s = Math.min(1, MAX / nw, MAX / nh);
                                      setCanvasSize({
                                        width: Math.round(nw * s),
                                        height: Math.round(nh * s),
                                      });
                                      setObjects((p) =>
                                        p.map((o) =>
                                          o.id === img.id
                                            ? ({
                                                ...o,
                                                width: Math.round(nw * s),
                                                height: Math.round(nh * s),
                                              } as CanvasObject)
                                            : o,
                                        ),
                                      );
                                      setActivePreset("Image Size");
                                    }}
                                    style={{
                                      width: "100%",
                                      padding: "4px 0",
                                      borderRadius: 5,
                                      fontSize: 9,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      background: "rgba(232,255,71,0.07)",
                                      border: "1px solid rgba(232,255,71,0.18)",
                                      color: "#e8ff47",
                                    }}
                                  >
                                    ↺ Re-sync Size
                                  </button>
                                </div>
                              )}
                            </div>
                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  marginBottom: 5,
                                }}
                              >
                                <SLabel>Opacity</SLabel>
                                <span
                                  style={{
                                    fontSize: 9,
                                    color: "#e8ff47",
                                    fontWeight: 700,
                                  }}
                                >
                                  {Math.round(img.opacity * 100)}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={Math.round(img.opacity * 100)}
                                onChange={(e) =>
                                  updateObj(
                                    "opacity",
                                    Number(e.target.value) / 100,
                                  )
                                }
                                style={{
                                  width: "100%",
                                  height: "3px",
                                  accentColor: "#e8ff47",
                                }}
                              />
                            </div>
                            {!img.isBackground && (
                              <ShadowPanel
                                shadow={img.shadow}
                                onChange={(s) => updateObj("shadow", s)}
                              />
                            )}
                          </>
                        );
                      })()}
                    {selectedObj.kind === "field" &&
                      (() => {
                        const f = selectedObj as TextField;
                        return (
                          <>
                            <div>
                              <SLabel>Row Offset</SLabel>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 5,
                                  background: "rgba(255,255,255,0.03)",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  borderRadius: 8,
                                  padding: "5px 8px",
                                }}
                              >
                                <button
                                  onClick={() =>
                                    updateObj(
                                      "columnOffset",
                                      f.columnOffset - 1,
                                    )
                                  }
                                  style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: 5,
                                    background: "rgba(255,255,255,0.06)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    color: "rgba(240,237,232,0.6)",
                                    cursor: "pointer",
                                    fontSize: 13,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  −
                                </button>
                                <div
                                  style={{
                                    flex: 1,
                                    display: "flex",
                                    gap: 3,
                                    justifyContent: "center",
                                  }}
                                >
                                  {[-1, 0, 1].map((v) => (
                                    <button
                                      key={v}
                                      onClick={() =>
                                        updateObj("columnOffset", v)
                                      }
                                      style={{
                                        padding: "2px 7px",
                                        borderRadius: 5,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        border: "none",
                                        background:
                                          f.columnOffset === v
                                            ? "#e8ff47"
                                            : "rgba(255,255,255,0.06)",
                                        color:
                                          f.columnOffset === v
                                            ? "#0a0a10"
                                            : "rgba(240,237,232,0.45)",
                                        transition: "all 0.12s",
                                      }}
                                    >
                                      {v === 0 ? "±0" : v > 0 ? `+${v}` : v}
                                    </button>
                                  ))}
                                  {Math.abs(f.columnOffset) > 1 && (
                                    <span
                                      style={{
                                        padding: "2px 7px",
                                        borderRadius: 5,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        background: "#e8ff47",
                                        color: "#0a0a10",
                                      }}
                                    >
                                      {f.columnOffset > 0
                                        ? `+${f.columnOffset}`
                                        : f.columnOffset}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() =>
                                    updateObj(
                                      "columnOffset",
                                      f.columnOffset + 1,
                                    )
                                  }
                                  style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: 5,
                                    background: "rgba(255,255,255,0.06)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    color: "rgba(240,237,232,0.6)",
                                    cursor: "pointer",
                                    fontSize: 13,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <div>
                              <SLabel>Font</SLabel>
                              <FontPicker
                                value={f.fontFamily}
                                onChange={(v) => updateObj("fontFamily", v)}
                              />
                            </div>
                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: 6,
                                }}
                              >
                                <SLabel>Font Size</SLabel>
                                <span
                                  style={{
                                    fontSize: 9,
                                    color: "#e8ff47",
                                    fontWeight: 700,
                                  }}
                                >
                                  {f.fontSize}px
                                </span>
                              </div>
                              <input
                                type="range"
                                min={6}
                                max={120}
                                value={f.fontSize}
                                onChange={(e) =>
                                  updateObj("fontSize", Number(e.target.value))
                                }
                                style={{
                                  width: "100%",
                                  height: "3px",
                                  accentColor: "#e8ff47",
                                }}
                              />
                              <p
                                style={{
                                  fontSize: 9,
                                  color: "rgba(240,237,232,0.22)",
                                  marginTop: 4,
                                }}
                              >
                                Auto-shrinks if text overflows box
                              </p>
                            </div>
                            <div>
                              <SLabel>Alignment</SLabel>
                              <div style={{ display: "flex", gap: 4 }}>
                                {(
                                  [
                                    "left",
                                    "center",
                                    "right",
                                    "justify",
                                  ] as const
                                ).map((align) => (
                                  <button
                                    key={align}
                                    onClick={() =>
                                      updateObj("textAlign", align)
                                    }
                                    title={align}
                                    style={{
                                      flex: 1,
                                      padding: "7px 2px",
                                      borderRadius: 6,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      background:
                                        f.textAlign === align
                                          ? "rgba(232,255,71,0.15)"
                                          : "rgba(255,255,255,0.04)",
                                      border: `1px solid ${f.textAlign === align ? "rgba(232,255,71,0.35)" : "rgba(255,255,255,0.08)"}`,
                                    }}
                                  >
                                    {align === "left" && (
                                      <svg
                                        width="12"
                                        height="10"
                                        viewBox="0 0 12 10"
                                        fill={
                                          f.textAlign === align
                                            ? "#e8ff47"
                                            : "rgba(240,237,232,0.4)"
                                        }
                                      >
                                        <rect
                                          x="0"
                                          y="0"
                                          width="12"
                                          height="1.5"
                                          rx=".75"
                                        />
                                        <rect
                                          x="0"
                                          y="3.5"
                                          width="8"
                                          height="1.5"
                                          rx=".75"
                                        />
                                        <rect
                                          x="0"
                                          y="7"
                                          width="12"
                                          height="1.5"
                                          rx=".75"
                                        />
                                      </svg>
                                    )}
                                    {align === "center" && (
                                      <svg
                                        width="12"
                                        height="10"
                                        viewBox="0 0 12 10"
                                        fill={
                                          f.textAlign === align
                                            ? "#e8ff47"
                                            : "rgba(240,237,232,0.4)"
                                        }
                                      >
                                        <rect
                                          x="0"
                                          y="0"
                                          width="12"
                                          height="1.5"
                                          rx=".75"
                                        />
                                        <rect
                                          x="2"
                                          y="3.5"
                                          width="8"
                                          height="1.5"
                                          rx=".75"
                                        />
                                        <rect
                                          x="0"
                                          y="7"
                                          width="12"
                                          height="1.5"
                                          rx=".75"
                                        />
                                      </svg>
                                    )}
                                    {align === "right" && (
                                      <svg
                                        width="12"
                                        height="10"
                                        viewBox="0 0 12 10"
                                        fill={
                                          f.textAlign === align
                                            ? "#e8ff47"
                                            : "rgba(240,237,232,0.4)"
                                        }
                                      >
                                        <rect
                                          x="0"
                                          y="0"
                                          width="12"
                                          height="1.5"
                                          rx=".75"
                                        />
                                        <rect
                                          x="4"
                                          y="3.5"
                                          width="8"
                                          height="1.5"
                                          rx=".75"
                                        />
                                        <rect
                                          x="0"
                                          y="7"
                                          width="12"
                                          height="1.5"
                                          rx=".75"
                                        />
                                      </svg>
                                    )}
                                    {align === "justify" && (
                                      <svg
                                        width="12"
                                        height="10"
                                        viewBox="0 0 12 10"
                                        fill={
                                          f.textAlign === align
                                            ? "#e8ff47"
                                            : "rgba(240,237,232,0.4)"
                                        }
                                      >
                                        <rect
                                          x="0"
                                          y="0"
                                          width="12"
                                          height="1.5"
                                          rx=".75"
                                        />
                                        <rect
                                          x="0"
                                          y="3.5"
                                          width="12"
                                          height="1.5"
                                          rx=".75"
                                        />
                                        <rect
                                          x="0"
                                          y="7"
                                          width="12"
                                          height="1.5"
                                          rx=".75"
                                        />
                                      </svg>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <SLabel>Color</SLabel>
                              <div style={{ display: "flex", gap: 6 }}>
                                <div
                                  style={{
                                    position: "relative",
                                    width: 28,
                                    height: 28,
                                    borderRadius: 6,
                                    overflow: "hidden",
                                    border: "1px solid rgba(255,255,255,0.12)",
                                    flexShrink: 0,
                                  }}
                                >
                                  <input
                                    type="color"
                                    value={f.color}
                                    onChange={(e) =>
                                      updateObj("color", e.target.value)
                                    }
                                    style={{
                                      position: "absolute",
                                      inset: 0,
                                      width: "100%",
                                      height: "100%",
                                      cursor: "pointer",
                                      transform: "scale(1.5)",
                                    }}
                                  />
                                </div>
                                <input
                                  value={f.color}
                                  onChange={(e) =>
                                    updateObj("color", e.target.value)
                                  }
                                  style={{
                                    flex: 1,
                                    padding: "5px 7px",
                                    borderRadius: 6,
                                    background: "rgba(255,255,255,0.05)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    color: "#f0ede8",
                                    fontSize: 11,
                                    fontFamily: "monospace",
                                    outline: "none",
                                  }}
                                />
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 4,
                                  marginTop: 7,
                                }}
                              >
                                {[
                                  "#1a1a1a",
                                  "#ffffff",
                                  "#e8ff47",
                                  "#4a90e2",
                                  "#e74c3c",
                                  "#2ecc71",
                                  "#f59e0b",
                                  "#8b5cf6",
                                ].map((c) => (
                                  <button
                                    key={c}
                                    onClick={() => updateObj("color", c)}
                                    style={{
                                      width: 20,
                                      height: 20,
                                      borderRadius: 4,
                                      background: c,
                                      border: "none",
                                      cursor: "pointer",
                                      outline:
                                        f.color === c
                                          ? "2px solid #e8ff47"
                                          : "none",
                                      outlineOffset: 1,
                                      transition: "transform 0.1s",
                                    }}
                                    onMouseEnter={(e) =>
                                      (e.currentTarget.style.transform =
                                        "scale(1.2)")
                                    }
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.transform =
                                        "scale(1)")
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                            <div>
                              <SLabel>Style</SLabel>
                              <div style={{ display: "flex", gap: 5 }}>
                                <button
                                  onClick={() => updateObj("bold", !f.bold)}
                                  style={{
                                    flex: 1,
                                    padding: "6px 0",
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    background: f.bold
                                      ? "rgba(232,255,71,0.12)"
                                      : "rgba(255,255,255,0.04)",
                                    border: `1px solid ${f.bold ? "rgba(232,255,71,0.3)" : "rgba(255,255,255,0.08)"}`,
                                    color: f.bold
                                      ? "#e8ff47"
                                      : "rgba(240,237,232,0.5)",
                                  }}
                                >
                                  B
                                </button>
                                <button
                                  onClick={() => updateObj("italic", !f.italic)}
                                  style={{
                                    flex: 1,
                                    padding: "6px 0",
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontStyle: "italic",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    background: f.italic
                                      ? "rgba(232,255,71,0.12)"
                                      : "rgba(255,255,255,0.04)",
                                    border: `1px solid ${f.italic ? "rgba(232,255,71,0.3)" : "rgba(255,255,255,0.08)"}`,
                                    color: f.italic
                                      ? "#e8ff47"
                                      : "rgba(240,237,232,0.5)",
                                  }}
                                >
                                  I
                                </button>
                              </div>
                            </div>
                            <ShadowPanel
                              shadow={f.shadow}
                              onChange={(s) => updateObj("shadow", s)}
                            />
                          </>
                        );
                      })()}
                    <button
                      onClick={() => deleteObj(selectedObj.id)}
                      style={{
                        width: "100%",
                        padding: "7px 0",
                        borderRadius: 7,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        background: "rgba(239,68,68,0.07)",
                        border: "1px solid rgba(239,68,68,0.18)",
                        color: "rgba(248,113,113,0.85)",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(239,68,68,0.14)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(239,68,68,0.07)")
                      }
                    >
                      Remove object
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ─── Current page row preview ─── */}
          {currentRow && (
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
                padding: 12,
                flexShrink: 0,
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              <p
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "rgba(240,237,232,0.28)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 7,
                }}
              >
                Page {pageIndex + 1} · Rows {previewRowStart + 1}–
                {Math.min(previewRowStart + batchSize, rows.length)}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {Object.entries(currentRow).map(([k, v]) => (
                  <div key={k}>
                    <span
                      style={{
                        fontSize: 9,
                        color: "rgba(240,237,232,0.22)",
                        fontFamily: "monospace",
                        display: "block",
                      }}
                    >
                      {k}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "rgba(240,237,232,0.7)",
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
      {showSizePicker && (
        <SizePicker
          current={canvasSize}
          onSelect={(s, l) => {
            setCanvasSize(s);
            setActivePreset(l);
            setShowSizePicker(false);
          }}
          onClose={() => setShowSizePicker(false)}
        />
      )}
    </div>
  );
}

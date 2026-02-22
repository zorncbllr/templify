"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type RowData = Record<string, string>;

type Shadow = {
  enabled: boolean;
  x: number;
  y: number;
  blur: number;
  color: string;
};

type BaseObject = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};
type ImageObject = BaseObject & {
  kind: "image";
  src: string;
  name: string;
  opacity: number;
  shadow: Shadow;
};
type TextField = BaseObject & {
  kind: "field";
  column: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  shadow: Shadow;
};
type CanvasObject = ImageObject | TextField;

type CanvasSize = { width: number; height: number };
type PresetKey = string;

const DEFAULT_SHADOW: Shadow = {
  enabled: false,
  x: 2,
  y: 2,
  blur: 8,
  color: "rgba(0,0,0,0.35)",
};

// ─── CANVAS PRESETS ───────────────────────────────────────────────────────────
type PresetGroup = {
  group: string;
  items: { label: string; w: number; h: number; icon: string }[];
};
const PRESET_GROUPS: PresetGroup[] = [
  {
    group: "Print",
    items: [
      { label: "A4 Portrait", w: 595, h: 842, icon: "📄" },
      { label: "A4 Landscape", w: 842, h: 595, icon: "📄" },
      { label: "A3 Portrait", w: 842, h: 1191, icon: "📃" },
      { label: "Letter", w: 612, h: 792, icon: "📋" },
      { label: "ID Card", w: 336, h: 213, icon: "🪪" },
      { label: "Business Card", w: 350, h: 200, icon: "💼" },
      { label: "Flyer", w: 595, h: 842, icon: "📰" },
    ],
  },
  {
    group: "Presentation",
    items: [
      { label: "16:9 HD", w: 960, h: 540, icon: "🖥" },
      { label: "4:3 Classic", w: 800, h: 600, icon: "📺" },
      { label: "Widescreen", w: 1280, h: 720, icon: "🎬" },
    ],
  },
  {
    group: "Social Media",
    items: [
      { label: "Instagram Post", w: 600, h: 600, icon: "📸" },
      { label: "Instagram Story", w: 450, h: 800, icon: "📱" },
      { label: "Facebook Post", w: 940, h: 788, icon: "👍" },
      { label: "Twitter Banner", w: 1500, h: 500, icon: "🐦" },
      { label: "LinkedIn Banner", w: 1128, h: 191, icon: "💼" },
      { label: "YouTube Thumb", w: 1280, h: 720, icon: "▶️" },
    ],
  },
  {
    group: "Certificate & Award",
    items: [
      { label: "Certificate", w: 792, h: 612, icon: "🏆" },
      { label: "Award Landscape", w: 900, h: 636, icon: "🥇" },
      { label: "Diploma", w: 864, h: 648, icon: "🎓" },
    ],
  },
  {
    group: "Banner",
    items: [
      { label: "Wide Banner", w: 900, h: 300, icon: "🏳" },
      { label: "Leaderboard", w: 728, h: 90, icon: "📊" },
      { label: "Square", w: 600, h: 600, icon: "⬛" },
    ],
  },
];

// ─── GOOGLE FONTS ─────────────────────────────────────────────────────────────
// Curated list of popular Google Fonts with categories
const GOOGLE_FONTS: { name: string; category: string }[] = [
  // Serif
  { name: "Playfair Display", category: "Serif" },
  { name: "Lora", category: "Serif" },
  { name: "Merriweather", category: "Serif" },
  { name: "EB Garamond", category: "Serif" },
  { name: "Crimson Text", category: "Serif" },
  { name: "Cormorant Garamond", category: "Serif" },
  { name: "Libre Baskerville", category: "Serif" },
  { name: "PT Serif", category: "Serif" },
  { name: "Cardo", category: "Serif" },
  { name: "Vollkorn", category: "Serif" },
  // Sans-serif
  { name: "DM Sans", category: "Sans-serif" },
  { name: "Nunito", category: "Sans-serif" },
  { name: "Poppins", category: "Sans-serif" },
  { name: "Raleway", category: "Sans-serif" },
  { name: "Josefin Sans", category: "Sans-serif" },
  { name: "Outfit", category: "Sans-serif" },
  { name: "Plus Jakarta Sans", category: "Sans-serif" },
  { name: "Syne", category: "Sans-serif" },
  { name: "Urbanist", category: "Sans-serif" },
  { name: "Figtree", category: "Sans-serif" },
  { name: "Rubik", category: "Sans-serif" },
  { name: "Manrope", category: "Sans-serif" },
  // Display
  { name: "Cinzel", category: "Display" },
  { name: "Bebas Neue", category: "Display" },
  { name: "Abril Fatface", category: "Display" },
  { name: "Righteous", category: "Display" },
  { name: "Teko", category: "Display" },
  { name: "Oswald", category: "Display" },
  { name: "Secular One", category: "Display" },
  // Script / Handwriting
  { name: "Dancing Script", category: "Script" },
  { name: "Great Vibes", category: "Script" },
  { name: "Pacifico", category: "Script" },
  { name: "Satisfy", category: "Script" },
  { name: "Sacramento", category: "Script" },
  { name: "Alex Brush", category: "Script" },
  { name: "Pinyon Script", category: "Script" },
  // Monospace
  { name: "JetBrains Mono", category: "Mono" },
  { name: "Fira Code", category: "Mono" },
  { name: "Source Code Pro", category: "Mono" },
];

const FONT_CATEGORIES = [
  "All",
  "Serif",
  "Sans-serif",
  "Display",
  "Script",
  "Mono",
];

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_COLUMNS = ["full_name", "course", "date", "id_number", "award"];
const MOCK_ROWS: RowData[] = [
  {
    full_name: "Juan dela Cruz",
    course: "BSIT",
    date: "Feb 22, 2026",
    id_number: "2021-00123",
    award: "With Honors",
  },
  {
    full_name: "Ma. Theresa Bautista-Reyes",
    course: "BSCS",
    date: "Feb 22, 2026",
    id_number: "2021-00456",
    award: "With High Honors",
  },
  {
    full_name: "Carlo Mendoza",
    course: "BSECE",
    date: "Feb 22, 2026",
    id_number: "2021-00789",
    award: "With Honors",
  },
];
const EXPORT_FORMATS = ["PNG", "PDF", "PPTX", "DOCX"];

// ─── SHADOW CSS HELPER ────────────────────────────────────────────────────────
function shadowCSS(s: Shadow): string {
  if (!s.enabled) return "none";
  return `${s.x}px ${s.y}px ${s.blur}px ${s.color}`;
}

// ─── HANDLE DEFS ──────────────────────────────────────────────────────────────
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
  onResizeDown,
}: {
  onResizeDown: (h: HandleKey, e: React.MouseEvent) => void;
}) {
  return (
    <>
      {HANDLES.map(({ key, cursor, pos }) => (
        <div
          key={key}
          data-handle={key}
          onMouseDown={(e) => onResizeDown(key, e)}
          style={{
            position: "absolute",
            width: 10,
            height: 10,
            borderRadius: 2,
            background: "#fff",
            border: "1.5px solid #6366f1",
            boxShadow: "0 1px 5px rgba(0,0,0,0.3)",
            cursor,
            zIndex: 10,
            boxSizing: "border-box",
            ...pos,
          }}
        />
      ))}
    </>
  );
}

// ─── SHARED DRAG/RESIZE ───────────────────────────────────────────────────────
function useDragResize(
  obj: CanvasObject,
  onSelect: (id: number) => void,
  onDrag: (id: number, x: number, y: number) => void,
  onResize: (id: number, p: Partial<CanvasObject>) => void,
) {
  const dragRef = useRef<{
    sx: number;
    sy: number;
    ox: number;
    oy: number;
  } | null>(null);
  const resizeRef = useRef<{
    h: HandleKey;
    sx: number;
    sy: number;
    ox: number;
    oy: number;
    ow: number;
    oh: number;
    fs?: number;
    ar: number;
  } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-handle]") || t.closest("[data-del]")) return;
    e.stopPropagation();
    onSelect(obj.id);
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: obj.x, oy: obj.y };
    const mv = (e: MouseEvent) => {
      if (!dragRef.current) return;
      onDrag(
        obj.id,
        dragRef.current.ox + e.clientX - dragRef.current.sx,
        dragRef.current.oy + e.clientY - dragRef.current.sy,
      );
    };
    const up = () => {
      dragRef.current = null;
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
    resizeRef.current = {
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
    const mv = (e: MouseEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      const dx = e.clientX - r.sx,
        dy = e.clientY - r.sy,
        MIN = 40;
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
      const patch: Partial<CanvasObject> = {
        x: Math.round(nx),
        y: Math.round(ny),
        width: Math.round(nw),
        height: Math.round(nh),
      };
      if (r.fs !== undefined)
        (patch as Partial<TextField>).fontSize = Math.round(
          Math.min(72, Math.max(8, r.fs * (nh / r.oh))),
        );
      onResize(obj.id, patch);
    };
    const up = () => {
      resizeRef.current = null;
      window.removeEventListener("mousemove", mv);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
  };
  return { handleMouseDown, handleResizeDown };
}

// ─── IMAGE ELEMENT ────────────────────────────────────────────────────────────
function ImageEl({
  obj,
  isSelected,
  onSelect,
  onDrag,
  onResize,
  onDelete,
}: {
  obj: ImageObject;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onDrag: (id: number, x: number, y: number) => void;
  onResize: (id: number, p: Partial<CanvasObject>) => void;
  onDelete: (id: number) => void;
}) {
  const { handleMouseDown, handleResizeDown } = useDragResize(
    obj,
    onSelect,
    onDrag,
    onResize,
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
        boxSizing: "border-box",
        overflow: "visible",
        outline: isSelected ? "1.5px solid #6366f1" : "1.5px solid transparent",
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
      {isSelected && (
        <>
          <div
            style={{
              position: "absolute",
              top: -28,
              left: 0,
              height: 22,
              display: "flex",
              alignItems: "center",
            }}
          >
            <div
              style={{
                padding: "0 8px",
                height: 22,
                borderRadius: 5,
                background: "rgba(16,16,26,0.96)",
                border: "1px solid rgba(99,102,241,0.35)",
                color: "#a5b4fc",
                fontSize: 10,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                whiteSpace: "nowrap",
                fontFamily: "DM Sans,sans-serif",
                gap: 4,
              }}
            >
              🖼 {obj.name}
            </div>
          </div>
          <button
            data-del
            onClick={(e) => {
              e.stopPropagation();
              onDelete(obj.id);
            }}
            style={{
              position: "absolute",
              top: -28,
              right: 0,
              height: 22,
              paddingInline: 8,
              borderRadius: 5,
              background: "#ef4444",
              border: "none",
              color: "white",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              boxShadow: "0 2px 8px rgba(239,68,68,0.4)",
              zIndex: 30,
              fontFamily: "DM Sans,sans-serif",
            }}
          >
            ✕
          </button>
          <SelectionHandles onResizeDown={handleResizeDown} />
        </>
      )}
    </div>
  );
}

// ─── TEXT ELEMENT ─────────────────────────────────────────────────────────────
function TextEl({
  obj,
  isSelected,
  onSelect,
  onDrag,
  onResize,
  onDelete,
  previewData,
}: {
  obj: TextField;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onDrag: (id: number, x: number, y: number) => void;
  onResize: (id: number, p: Partial<CanvasObject>) => void;
  onDelete: (id: number) => void;
  previewData: RowData | null;
}) {
  const { handleMouseDown, handleResizeDown } = useDragResize(
    obj,
    onSelect,
    onDrag,
    onResize,
  );
  const displayText = previewData
    ? previewData[obj.column] || `{{${obj.column}}}`
    : `{{${obj.column}}}`;
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
        fontFamily: `'${obj.fontFamily}',serif`,
        fontSize: obj.fontSize,
        color: obj.color,
        fontWeight: obj.bold ? "bold" : "normal",
        fontStyle: obj.italic ? "italic" : "normal",
        cursor: "move",
        userSelect: "none",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        overflow: "visible",
        outline: isSelected ? "1.5px solid #6366f1" : "1.5px solid transparent",
        textShadow: obj.shadow.enabled ? shadowCSS(obj.shadow) : "none",
      }}
    >
      <span
        style={{
          display: "block",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          width: "100%",
          padding: "0 4px",
          lineHeight: 1.2,
        }}
      >
        {displayText}
      </span>
      {isSelected && <SelectionHandles onResizeDown={handleResizeDown} />}
    </div>
  );
}

// ─── FONT PICKER ─────────────────────────────────────────────────────────────
function FontPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (f: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
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

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  // Load Google Font when selected or shown in picker
  const loadFont = (name: string) => {
    const id = `gf-${name.replace(/\s+/g, "-")}`;
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;700&display=swap`;
      document.head.appendChild(link);
    }
  };

  useEffect(() => {
    loadFont(value);
  }, [value]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${open ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.1)"}`,
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
        <span>{value}</span>
        <span
          style={{
            fontSize: 10,
            color: "rgba(240,237,232,0.4)",
            fontFamily: "DM Sans,sans-serif",
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#1a1a26",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            zIndex: 200,
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
            overflow: "hidden",
          }}
        >
          {/* Search */}
          <div style={{ padding: "10px 10px 6px" }}>
            <input
              placeholder="Search fonts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: 7,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f0ede8",
                fontSize: 12,
                outline: "none",
                fontFamily: "DM Sans,sans-serif",
              }}
            />
          </div>
          {/* Category tabs */}
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: "0 10px 8px",
              flexWrap: "wrap",
            }}
          >
            {FONT_CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  padding: "2px 8px",
                  borderRadius: 5,
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  fontFamily: "DM Sans,sans-serif",
                  background:
                    cat === c
                      ? "rgba(99,102,241,0.25)"
                      : "rgba(255,255,255,0.05)",
                  color: cat === c ? "#a5b4fc" : "rgba(240,237,232,0.45)",
                }}
              >
                {c}
              </button>
            ))}
          </div>
          {/* Font list */}
          <div
            style={{
              maxHeight: 200,
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
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background:
                      value === f.name
                        ? "rgba(99,102,241,0.12)"
                        : "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      fontFamily: `'${f.name}',serif`,
                      fontSize: 14,
                      color: value === f.name ? "#a5b4fc" : "#f0ede8",
                    }}
                  >
                    {f.name}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: "rgba(240,237,232,0.3)",
                      fontFamily: "DM Sans,sans-serif",
                    }}
                  >
                    {f.category}
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p
                style={{
                  padding: "12px",
                  fontSize: 11,
                  color: "rgba(240,237,232,0.3)",
                  fontFamily: "DM Sans,sans-serif",
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

// ─── SHADOW CONTROLS ──────────────────────────────────────────────────────────
function ShadowPanel({
  shadow,
  onChange,
}: {
  shadow: Shadow;
  onChange: (s: Shadow) => void;
}) {
  const set = (key: keyof Shadow, val: Shadow[keyof Shadow]) =>
    onChange({ ...shadow, [key]: val });
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 10,
            fontWeight: 700,
            color: "rgba(240,237,232,0.3)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Shadow
        </p>
        <button
          onClick={() => set("enabled", !shadow.enabled)}
          style={{
            width: 32,
            height: 18,
            borderRadius: 9,
            background: shadow.enabled ? "#6366f1" : "rgba(255,255,255,0.1)",
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
              left: shadow.enabled ? 16 : 2,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "white",
              transition: "left 0.2s",
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
            gap: 8,
            padding: "10px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {/* Color */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                position: "relative",
                width: 28,
                height: 28,
                borderRadius: 6,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.1)",
                flexShrink: 0,
              }}
            >
              <input
                type="color"
                value={
                  shadow.color.startsWith("rgba") ||
                  shadow.color.startsWith("rgb")
                    ? "#000000"
                    : shadow.color
                }
                onChange={(e) => set("color", e.target.value)}
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
              type="text"
              value={shadow.color}
              onChange={(e) => set("color", e.target.value)}
              style={{
                flex: 1,
                padding: "5px 8px",
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
          {/* X / Y / Blur sliders */}
          {(
            [
              ["X Offset", "x", -20, 20],
              ["Y Offset", "y", -20, 20],
              ["Blur", "blur", 0, 40],
            ] as [string, keyof Shadow, number, number][]
          ).map(([label, key, min, max]) => (
            <div key={key}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 10, color: "rgba(240,237,232,0.35)" }}>
                  {label}
                </span>
                <span
                  style={{ fontSize: 10, color: "#a5b4fc", fontWeight: 600 }}
                >
                  {shadow[key]}px
                </span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                value={shadow[key] as number}
                onChange={(e) => set(key, Number(e.target.value))}
                style={{
                  width: "100%",
                  height: "4px",
                  accentColor: "#6366f1",
                  cursor: "pointer",
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SIZE PICKER MODAL ────────────────────────────────────────────────────────
function SizePicker({
  current,
  onSelect,
  onClose,
}: {
  current: CanvasSize;
  onSelect: (s: CanvasSize, l: string) => void;
  onClose: () => void;
}) {
  const [cw, setCw] = useState(String(current.width));
  const [ch, setCh] = useState(String(current.height));
  const [activeGroup, setActiveGroup] = useState("All");
  const apply = () => {
    const w = Math.max(100, Math.min(2000, parseInt(cw) || current.width)),
      h = Math.max(100, Math.min(2000, parseInt(ch) || current.height));
    onSelect({ width: w, height: h }, "Custom");
  };

  const allGroups = ["All", ...PRESET_GROUPS.map((g) => g.group)];
  const displayItems = PRESET_GROUPS.flatMap((g) =>
    activeGroup === "All" || g.group === activeGroup ? g.items : [],
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 200,
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
          borderRadius: 16,
          padding: 24,
          width: 560,
          maxHeight: "85vh",
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
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: "#f0ede8",
              fontFamily: "DM Sans,sans-serif",
            }}
          >
            Canvas Size
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "rgba(240,237,232,0.4)",
              fontSize: 18,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Group filter tabs */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          {allGroups.map((g) => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                fontFamily: "DM Sans,sans-serif",
                transition: "all 0.15s",
                background:
                  activeGroup === g
                    ? "rgba(99,102,241,0.2)"
                    : "rgba(255,255,255,0.05)",
                color: activeGroup === g ? "#a5b4fc" : "rgba(240,237,232,0.45)",
              }}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Preset grid */}
        <div style={{ overflowY: "auto", flex: 1, marginBottom: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 7,
            }}
          >
            {displayItems.map((item) => {
              const active =
                current.width === item.w && current.height === item.h;
              const maxD = 32,
                asp = item.w / item.h,
                tw = asp >= 1 ? maxD : Math.round(maxD * asp),
                th = asp < 1 ? maxD : Math.round(maxD / asp);
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
                    gap: 6,
                    padding: "10px 6px",
                    borderRadius: 9,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    border: `1.5px solid ${active ? "#6366f1" : "rgba(255,255,255,0.07)"}`,
                    background: active
                      ? "rgba(99,102,241,0.12)"
                      : "rgba(255,255,255,0.02)",
                  }}
                >
                  <div
                    style={{
                      width: tw,
                      height: th,
                      borderRadius: 2,
                      background: active
                        ? "rgba(99,102,241,0.45)"
                        : "rgba(255,255,255,0.13)",
                      border: `1px solid ${active ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.15)"}`,
                    }}
                  />
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      fontWeight: 600,
                      color: active ? "#a5b4fc" : "rgba(240,237,232,0.75)",
                      fontFamily: "DM Sans,sans-serif",
                      textAlign: "center",
                      lineHeight: 1.3,
                    }}
                  >
                    {item.label}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 9,
                      color: "rgba(240,237,232,0.28)",
                      fontFamily: "DM Sans,sans-serif",
                    }}
                  >
                    {item.w}×{item.h}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            paddingTop: 14,
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(240,237,232,0.3)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontFamily: "DM Sans,sans-serif",
            }}
          >
            Custom Size
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: 10,
                  color: "rgba(240,237,232,0.3)",
                  fontFamily: "DM Sans,sans-serif",
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
                  padding: "7px 10px",
                  borderRadius: 7,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#f0ede8",
                  fontSize: 13,
                  fontFamily: "DM Sans,sans-serif",
                  outline: "none",
                }}
              />
            </div>
            <span
              style={{
                color: "rgba(240,237,232,0.25)",
                marginTop: 18,
                fontSize: 14,
              }}
            >
              ×
            </span>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: 10,
                  color: "rgba(240,237,232,0.3)",
                  fontFamily: "DM Sans,sans-serif",
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
                  padding: "7px 10px",
                  borderRadius: 7,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#f0ede8",
                  fontSize: 13,
                  fontFamily: "DM Sans,sans-serif",
                  outline: "none",
                }}
              />
            </div>
            <button
              onClick={apply}
              style={{
                marginTop: 18,
                padding: "7px 16px",
                borderRadius: 7,
                background: "#6366f1",
                border: "none",
                color: "white",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "DM Sans,sans-serif",
                whiteSpace: "nowrap",
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

// ─── KEYBOARD HINT ────────────────────────────────────────────────────────────
function KbdHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "3px 0",
      }}
    >
      <span style={{ fontSize: 10, color: "rgba(240,237,232,0.33)" }}>
        {label}
      </span>
      <div style={{ display: "flex", gap: 3 }}>
        {keys.map((k) => (
          <span
            key={k}
            style={{
              fontSize: 9,
              padding: "1px 5px",
              borderRadius: 4,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.11)",
              color: "rgba(240,237,232,0.45)",
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

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function SandboxPage() {
  const [mounted, setMounted] = useState(false);
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [clipboard, setClipboard] = useState<CanvasObject | null>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: 960,
    height: 540,
  });
  const [activePreset, setActivePreset] = useState("16:9 HD");
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [exportFormat, setExportFormat] = useState("PNG");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [rightTab, setRightTab] = useState<"layers" | "style">("layers");
  const [dragOver, setDragOver] = useState(false);
  const nextZ = useRef(1);
  const rows = MOCK_ROWS;
  const columns = MOCK_COLUMNS;

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedObj = objects.find((o) => o.id === selectedId) ?? null;
  const previewData = isPreviewMode ? rows[previewIndex] : null;
  const sortedByZ = useMemo(
    () => [...objects].sort((a, b) => b.zIndex - a.zIndex),
    [objects],
  );

  // Load DM Sans by default
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

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(true);
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedId !== null
      ) {
        e.preventDefault();
        setObjects((p) => p.filter((o) => o.id !== selectedId));
        setSelectedId(null);
        return;
      }
      if (ctrl && e.key === "c" && selectedObj) {
        e.preventDefault();
        setClipboard(selectedObj);
        return;
      }
      if (ctrl && e.key === "v" && clipboard) {
        e.preventDefault();
        const n: CanvasObject = {
          ...clipboard,
          id: Date.now(),
          x: clipboard.x + 20,
          y: clipboard.y + 20,
          zIndex: nextZ.current++,
        };
        setObjects((p) => [...p, n]);
        setSelectedId(n.id);
        return;
      }
      if (ctrl && e.key === "d" && selectedObj) {
        e.preventDefault();
        const d: CanvasObject = {
          ...selectedObj,
          id: Date.now(),
          x: selectedObj.x + 20,
          y: selectedObj.y + 20,
          zIndex: nextZ.current++,
        };
        setObjects((p) => [...p, d]);
        setSelectedId(d.id);
        return;
      }
      if (e.key === "Escape") setSelectedId(null);
      if (
        selectedId !== null &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const delta = {
          ArrowUp: { x: 0, y: -step },
          ArrowDown: { x: 0, y: step },
          ArrowLeft: { x: -step, y: 0 },
          ArrowRight: { x: step, y: 0 },
        }[e.key]!;
        setObjects((p) =>
          p.map((o) =>
            o.id === selectedId
              ? ({ ...o, x: o.x + delta.x, y: o.y + delta.y } as CanvasObject)
              : o,
          ),
        );
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(false);
    };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
    };
  }, [selectedId, selectedObj, clipboard]);

  // ── Object ops ────────────────────────────────────────────────────────────
  const addImage = (src: string, name: string) => {
    const img = new window.Image();
    img.onload = () => {
      const maxW = Math.min(canvasSize.width * 0.85, 600);
      const s = maxW / img.naturalWidth,
        w = Math.round(img.naturalWidth * s),
        h = Math.round(img.naturalHeight * s);
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
      };
      setObjects((p) => [...p, obj]);
      setSelectedId(obj.id);
      setRightTab("style");
    };
    img.src = src;
  };

  const addField = useCallback(
    (column: string) => {
      const fields = objects.filter((o) => o.kind === "field");
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
      };
      setObjects((p) => [...p, obj]);
      setSelectedId(obj.id);
      setRightTab("style");
    },
    [objects],
  );

  const handleDrag = useCallback((id: number, x: number, y: number) => {
    setObjects((p) => p.map((o) => (o.id === id ? { ...o, x, y } : o)));
  }, []);
  const handleResize = useCallback(
    (id: number, patch: Partial<CanvasObject>) => {
      setObjects((p) =>
        p.map((o) => (o.id === id ? ({ ...o, ...patch } as CanvasObject) : o)),
      );
    },
    [],
  );
  const deleteObj = useCallback((id: number) => {
    setObjects((p) => p.filter((o) => o.id !== id));
    setSelectedId(null);
  }, []);
  const updateObj = useCallback(
    (key: string, value: unknown) => {
      setObjects((p) =>
        p.map((o) =>
          o.id === selectedId ? ({ ...o, [key]: value } as CanvasObject) : o,
        ),
      );
    },
    [selectedId],
  );
  const bringFwd = () => {
    if (!selectedId) return;
    setObjects((p) =>
      p.map((o) =>
        o.id === selectedId
          ? ({ ...o, zIndex: nextZ.current++ } as CanvasObject)
          : o,
      ),
    );
  };
  const sendBack = () => {
    if (!selectedId) return;
    setObjects((p) => {
      const m = Math.max(0, Math.min(...p.map((o) => o.zIndex)) - 1);
      return p.map((o) =>
        o.id === selectedId ? ({ ...o, zIndex: m } as CanvasObject) : o,
      );
    });
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .forEach((f) =>
        addImage(URL.createObjectURL(f), f.name.replace(/\.[^.]+$/, "")),
      );
  };

  const MAX_W = 860,
    MAX_H = 570;
  const scale = Math.min(
    1,
    MAX_W / canvasSize.width,
    MAX_H / canvasSize.height,
  );

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
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px;}
        input[type=range]{accent-color:#6366f1;cursor:pointer;}
        input[type=color]{border:none;background:none;cursor:pointer;padding:0;border-radius:6px;}
        .chip:hover{background:rgba(99,102,241,0.12)!important;border-color:rgba(99,102,241,0.3)!important;color:#c4b5fd!important;}
        .layer-item:hover{background:rgba(255,255,255,0.04)!important;}
        .tab-btn{transition:all 0.15s;}
        button{font-family:'DM Sans',sans-serif;}
      `}</style>

      {/* ── TOPBAR ── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
          height: 52,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "#0c0c14",
          flexShrink: 0,
          zIndex: 20,
        }}
      >
        {/* Logo + steps */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                background: "#e8ff47",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 900,
                color: "#0a0a10",
              }}
            >
              ✦
            </div>
            <span
              style={{
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: "-0.02em",
              }}
            >
              Templify
            </span>
          </div>
          <div
            style={{
              width: 1,
              height: 20,
              background: "rgba(255,255,255,0.08)",
            }}
          />
          {/* Stepper */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[
              { n: 1, label: "Data" },
              { n: 2, label: "Design" },
              { n: 3, label: "Preview" },
            ].map((s, i) => (
              <div
                key={s.n}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 7,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "1px solid transparent",
                    background: "transparent",
                    color: "rgba(240,237,232,0.4)",
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.07)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.3)",
                    }}
                  >
                    {s.n}
                  </span>
                  {s.label}
                </button>
                {i < 2 && (
                  <div
                    style={{
                      width: 16,
                      height: 1,
                      background: "rgba(255,255,255,0.07)",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Canvas size */}
          <button
            onClick={() => setShowSizePicker(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(240,237,232,0.7)",
            }}
          >
            <span>⬚</span>
            <span>{activePreset}</span>
            <span style={{ fontSize: 10, color: "rgba(240,237,232,0.3)" }}>
              {canvasSize.width}×{canvasSize.height}
            </span>
          </button>

          {/* Preview */}
          <button
            onClick={() => setIsPreviewMode((p) => !p)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
              background: isPreviewMode
                ? "rgba(232,255,71,0.12)"
                : "rgba(255,255,255,0.05)",
              border: `1px solid ${isPreviewMode ? "rgba(232,255,71,0.3)" : "rgba(255,255,255,0.1)"}`,
              color: isPreviewMode ? "#e8ff47" : "rgba(240,237,232,0.7)",
            }}
          >
            <span>{isPreviewMode ? "●" : "○"}</span>
            <span>{isPreviewMode ? "Previewing" : "Preview"}</span>
            {isPreviewMode && (
              <span
                style={{
                  background: "#e8ff47",
                  color: "#0a0a10",
                  borderRadius: 4,
                  padding: "1px 6px",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {previewIndex + 1}/{rows.length}
              </span>
            )}
          </button>

          {/* Export */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                display: "flex",
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid rgba(232,255,71,0.35)",
              }}
            >
              <button
                onClick={() =>
                  alert(`Exporting ${rows.length} records as ${exportFormat}…`)
                }
                style={{
                  padding: "5px 14px",
                  background: "#e8ff47",
                  color: "#0a0a10",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "none",
                }}
              >
                Export {exportFormat}
              </button>
              <button
                onClick={() => setShowExportMenu((p) => !p)}
                style={{
                  padding: "5px 8px",
                  background: "#e8ff47",
                  color: "#0a0a10",
                  fontSize: 11,
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
                  top: "calc(100%+4px)",
                  background: "#1a1a26",
                  border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: 10,
                  overflow: "hidden",
                  zIndex: 50,
                  boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                  minWidth: 110,
                  marginTop: 4,
                }}
              >
                {EXPORT_FORMATS.map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setExportFormat(f);
                      setShowExportMenu(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 14px",
                      textAlign: "left",
                      fontSize: 11,
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
                    {exportFormat === f && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── LEFT PANEL ── */}
        <aside
          style={{
            width: 220,
            flexShrink: 0,
            borderRight: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            background: "#0e0e18",
            overflow: "hidden",
          }}
        >
          {/* Image upload — prominent */}
          <div
            style={{
              padding: 14,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "rgba(240,237,232,0.28)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 10,
              }}
            >
              Template / Image
            </p>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFiles(e.dataTransfer.files);
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "16px 12px",
                borderRadius: 10,
                cursor: "pointer",
                transition: "all 0.2s",
                background: dragOver
                  ? "rgba(99,102,241,0.12)"
                  : "rgba(99,102,241,0.05)",
                border: `1.5px dashed ${dragOver ? "#6366f1" : "rgba(99,102,241,0.3)"}`,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: dragOver
                    ? "rgba(99,102,241,0.25)"
                    : "rgba(99,102,241,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  transition: "all 0.2s",
                }}
              >
                🖼
              </div>
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: dragOver ? "#a5b4fc" : "rgba(240,237,232,0.65)",
                    marginBottom: 2,
                  }}
                >
                  Upload Image
                </p>
                <p style={{ fontSize: 10, color: "rgba(240,237,232,0.28)" }}>
                  or drag & drop here
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          </div>

          {/* Data */}
          <div
            style={{
              padding: 14,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "rgba(240,237,232,0.28)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              Data Source
            </p>
            <div
              style={{
                background: "rgba(232,255,71,0.05)",
                border: "1px solid rgba(232,255,71,0.15)",
                borderRadius: 10,
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <span style={{ color: "#e8ff47" }}>📊</span>
                <span
                  style={{ fontSize: 12, fontWeight: 600, color: "#e8ff47" }}
                >
                  data.xlsx
                </span>
              </div>
              <p style={{ fontSize: 11, color: "rgba(240,237,232,0.38)" }}>
                {rows.length} rows · {columns.length} cols
              </p>
            </div>
          </div>

          {/* Text fields */}
          <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "rgba(240,237,232,0.28)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              Text Fields
            </p>
            <p
              style={{
                fontSize: 10,
                color: "rgba(240,237,232,0.22)",
                marginBottom: 10,
                lineHeight: 1.5,
              }}
            >
              Click to place on canvas
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {columns.map((col) => {
                const added = objects.some(
                  (o) => o.kind === "field" && (o as TextField).column === col,
                );
                return (
                  <button
                    key={col}
                    onClick={() => addField(col)}
                    className="chip"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "7px 10px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.15s",
                      background: added
                        ? "rgba(232,255,71,0.06)"
                        : "rgba(255,255,255,0.03)",
                      border: `1px solid ${added ? "rgba(232,255,71,0.2)" : "rgba(255,255,255,0.07)"}`,
                      color: added ? "#e8ff47" : "rgba(240,237,232,0.6)",
                    }}
                  >
                    <span
                      style={{ fontFamily: "monospace", fontSize: 11 }}
                    >{`{{${col}}}`}</span>
                    <span style={{ fontSize: 12, opacity: 0.5 }}>
                      {added ? "✓" : "+"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shortcuts */}
          <div
            style={{
              padding: 14,
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "rgba(240,237,232,0.28)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              Shortcuts
            </p>
            <KbdHint keys={["Ctrl", "D"]} label="Duplicate" />
            <KbdHint keys={["Ctrl", "C"]} label="Copy" />
            <KbdHint keys={["Ctrl", "V"]} label="Paste" />
            <KbdHint keys={["Del"]} label="Delete" />
            <KbdHint keys={["⇧", "drag"]} label="Lock ratio" />
            <KbdHint keys={["Esc"]} label="Deselect" />
          </div>
        </aside>

        {/* ── CANVAS ── */}
        <main
          style={{
            flex: 1,
            overflowAuto: "auto",
            background: "#07070e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            padding: 40,
          }}
          onClick={() => setSelectedId(null)}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.025) 1px,transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Scale wrapper */}
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
            {/* White canvas surface */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 6,
                background: "#ffffff",
                boxShadow:
                  "0 20px 80px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.06)",
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
                    gap: 10,
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ fontSize: 48, opacity: 0.1 }}>🖼</div>
                  <p
                    style={{
                      color: "rgba(10,10,16,0.22)",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    Upload a template to begin
                  </p>
                  <p style={{ color: "rgba(10,10,16,0.14)", fontSize: 11 }}>
                    or add text fields from the left
                  </p>
                </div>
              )}
              {isPreviewMode && (
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    zIndex: 999,
                    background: "rgba(10,10,16,0.8)",
                    backdropFilter: "blur(8px)",
                    borderRadius: 8,
                    padding: "4px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#e8ff47",
                      animation: "pulse 1.5s infinite",
                    }}
                  />
                  <span
                    style={{ fontSize: 11, color: "#e8ff47", fontWeight: 600 }}
                  >
                    Row {previewIndex + 1} / {rows.length}
                  </span>
                </div>
              )}
            </div>

            {/* Objects */}
            {objects.map((obj) =>
              obj.kind === "image" ? (
                <ImageEl
                  key={obj.id}
                  obj={obj as ImageObject}
                  isSelected={selectedId === obj.id && !isPreviewMode}
                  onSelect={setSelectedId}
                  onDrag={handleDrag}
                  onResize={handleResize}
                  onDelete={deleteObj}
                />
              ) : (
                <TextEl
                  key={obj.id}
                  obj={obj as TextField}
                  isSelected={selectedId === obj.id && !isPreviewMode}
                  onSelect={setSelectedId}
                  onDrag={handleDrag}
                  onResize={handleResize}
                  onDelete={deleteObj}
                  previewData={previewData}
                />
              ),
            )}
          </div>

          {/* Shift hint */}
          {shiftHeld && selectedObj && (
            <div
              style={{
                position: "absolute",
                top: 14,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(99,102,241,0.92)",
                backdropFilter: "blur(8px)",
                borderRadius: 8,
                padding: "4px 14px",
                fontSize: 11,
                fontWeight: 600,
                color: "white",
                pointerEvents: "none",
                whiteSpace: "nowrap",
                boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
              }}
            >
              ⇧ Shift — proportional resize
            </div>
          )}

          {/* Canvas label */}
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 10,
              color: "rgba(240,237,232,0.15)",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            {canvasSize.width} × {canvasSize.height} px · {activePreset}
          </div>

          {/* Preview nav */}
          {isPreviewMode && (
            <div
              style={{
                position: "absolute",
                bottom: 36,
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "rgba(20,20,32,0.95)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 16,
                padding: "8px 16px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}
            >
              <button
                onClick={() => setPreviewIndex((p) => Math.max(0, p - 1))}
                disabled={previewIndex === 0}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(240,237,232,0.7)",
                  cursor: "pointer",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: previewIndex === 0 ? 0.3 : 1,
                }}
              >
                ←
              </button>
              <div style={{ display: "flex", gap: 5 }}>
                {rows.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPreviewIndex(i)}
                    style={{
                      height: 8,
                      borderRadius: 4,
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      width: previewIndex === i ? 22 : 8,
                      background:
                        previewIndex === i
                          ? "#e8ff47"
                          : "rgba(255,255,255,0.2)",
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 11, color: "rgba(240,237,232,0.45)" }}>
                {previewIndex + 1}/{rows.length}
              </span>
              <button
                onClick={() =>
                  setPreviewIndex((p) => Math.min(rows.length - 1, p + 1))
                }
                disabled={previewIndex === rows.length - 1}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(240,237,232,0.7)",
                  cursor: "pointer",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: previewIndex === rows.length - 1 ? 0.3 : 1,
                }}
              >
                →
              </button>
              <div
                style={{
                  width: 1,
                  height: 16,
                  background: "rgba(255,255,255,0.1)",
                }}
              />
              <button
                onClick={() => setIsPreviewMode(false)}
                style={{
                  fontSize: 11,
                  color: "rgba(240,237,232,0.4)",
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                }}
              >
                ✕ Exit
              </button>
            </div>
          )}
        </main>

        {/* ── RIGHT PANEL ── */}
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
          {/* Tabs */}
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
                className="tab-btn"
                style={{
                  flex: 1,
                  padding: "11px 0",
                  fontSize: 11,
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
            {/* LAYERS */}
            {rightTab === "layers" && (
              <div style={{ padding: 14 }}>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "rgba(240,237,232,0.28)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 10,
                  }}
                >
                  Objects ({objects.length})
                </p>
                {objects.length === 0 ? (
                  <p
                    style={{
                      fontSize: 12,
                      color: "rgba(240,237,232,0.2)",
                      textAlign: "center",
                      paddingBlock: 32,
                      lineHeight: 1.7,
                    }}
                  >
                    No objects yet.
                    <br />
                    Upload images or add fields.
                  </p>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 5 }}
                  >
                    {sortedByZ.map((o) => {
                      const isImg = o.kind === "image";
                      const lbl = isImg
                        ? (o as ImageObject).name
                        : `{{${(o as TextField).column}}}`;
                      return (
                        <div
                          key={o.id}
                          className="layer-item"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "7px 10px",
                            borderRadius: 8,
                            cursor: "pointer",
                            transition: "all 0.12s",
                            background:
                              selectedId === o.id
                                ? "rgba(99,102,241,0.1)"
                                : "rgba(255,255,255,0.02)",
                            border: `1px solid ${selectedId === o.id ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.05)"}`,
                          }}
                          onClick={() => {
                            setSelectedId(o.id);
                            setRightTab("style");
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 7,
                              minWidth: 0,
                            }}
                          >
                            <span style={{ fontSize: 12, flexShrink: 0 }}>
                              {isImg ? "🖼" : "T"}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 500,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                color:
                                  selectedId === o.id
                                    ? "#a5b4fc"
                                    : "rgba(240,237,232,0.75)",
                              }}
                            >
                              {lbl}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteObj(o.id);
                            }}
                            style={{
                              width: 18,
                              height: 18,
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
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.color = "#f87171")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.color =
                                "rgba(240,237,232,0.2)")
                            }
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STYLE */}
            {rightTab === "style" && (
              <div
                style={{
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                }}
              >
                {!selectedObj ? (
                  <p
                    style={{
                      fontSize: 12,
                      color: "rgba(240,237,232,0.2)",
                      textAlign: "center",
                      paddingBlock: 32,
                      lineHeight: 1.7,
                    }}
                  >
                    Select an object
                    <br />
                    to edit its style.
                  </p>
                ) : (
                  <>
                    {/* Identity */}
                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "rgba(99,102,241,0.07)",
                        border: "1px solid rgba(99,102,241,0.18)",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#a5b4fc",
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

                    {/* Size & Position */}
                    <div>
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "rgba(240,237,232,0.28)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: 8,
                        }}
                      >
                        Size & Position
                      </p>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 7,
                        }}
                      >
                        {(
                          [
                            ["W", "width"],
                            ["H", "height"],
                            ["X", "x"],
                            ["Y", "y"],
                          ] as [string, keyof CanvasObject][]
                        ).map(([l, k]) => (
                          <div key={k}>
                            <p
                              style={{
                                fontSize: 10,
                                color: "rgba(240,237,232,0.25)",
                                marginBottom: 3,
                              }}
                            >
                              {l}
                            </p>
                            <input
                              type="number"
                              value={Math.round(
                                (selectedObj as Record<string, unknown>)[
                                  k as string
                                ] as number,
                              )}
                              onChange={(e) =>
                                updateObj(k as string, Number(e.target.value))
                              }
                              style={{
                                width: "100%",
                                padding: "5px 8px",
                                borderRadius: 7,
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "#f0ede8",
                                fontSize: 12,
                                fontFamily: "monospace",
                                textAlign: "center",
                                outline: "none",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Layer order */}
                    <div>
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "rgba(240,237,232,0.28)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: 8,
                        }}
                      >
                        Layer
                      </p>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={bringFwd}
                          style={{
                            flex: 1,
                            padding: "6px 0",
                            borderRadius: 7,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "rgba(240,237,232,0.6)",
                          }}
                        >
                          ↑ Forward
                        </button>
                        <button
                          onClick={sendBack}
                          style={{
                            flex: 1,
                            padding: "6px 0",
                            borderRadius: 7,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "rgba(240,237,232,0.6)",
                          }}
                        >
                          ↓ Backward
                        </button>
                      </div>
                    </div>

                    {/* IMAGE-SPECIFIC */}
                    {selectedObj.kind === "image" &&
                      (() => {
                        const img = selectedObj as ImageObject;
                        return (
                          <>
                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  marginBottom: 6,
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
                                  Opacity
                                </p>
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "#a5b4fc",
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
                                  height: "4px",
                                  accentColor: "#6366f1",
                                }}
                              />
                            </div>
                            <ShadowPanel
                              shadow={img.shadow}
                              onChange={(s) => updateObj("shadow", s)}
                            />
                          </>
                        );
                      })()}

                    {/* TEXT-SPECIFIC */}
                    {selectedObj.kind === "field" &&
                      (() => {
                        const f = selectedObj as TextField;
                        return (
                          <>
                            {/* Font picker */}
                            <div>
                              <p
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: "rgba(240,237,232,0.28)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.08em",
                                  marginBottom: 8,
                                }}
                              >
                                Font
                              </p>
                              <FontPicker
                                value={f.fontFamily}
                                onChange={(v) => updateObj("fontFamily", v)}
                              />
                            </div>

                            {/* Size */}
                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  marginBottom: 6,
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
                                  Size
                                </p>
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "#a5b4fc",
                                    fontWeight: 700,
                                  }}
                                >
                                  {f.fontSize}px
                                </span>
                              </div>
                              <input
                                type="range"
                                min={8}
                                max={120}
                                value={f.fontSize}
                                onChange={(e) =>
                                  updateObj("fontSize", Number(e.target.value))
                                }
                                style={{
                                  width: "100%",
                                  height: "4px",
                                  accentColor: "#6366f1",
                                  background: `linear-gradient(to right,#6366f1 ${((f.fontSize - 8) / 112) * 100}%,rgba(255,255,255,0.1) 0%)`,
                                }}
                              />
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  marginTop: 2,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 9,
                                    color: "rgba(240,237,232,0.2)",
                                  }}
                                >
                                  8
                                </span>
                                <span
                                  style={{
                                    fontSize: 9,
                                    color: "rgba(240,237,232,0.2)",
                                  }}
                                >
                                  120
                                </span>
                              </div>
                            </div>

                            {/* Color */}
                            <div>
                              <p
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: "rgba(240,237,232,0.28)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.08em",
                                  marginBottom: 8,
                                }}
                              >
                                Color
                              </p>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 7,
                                  alignItems: "center",
                                }}
                              >
                                <div
                                  style={{
                                    position: "relative",
                                    width: 32,
                                    height: 32,
                                    borderRadius: 7,
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
                                  type="text"
                                  value={f.color}
                                  onChange={(e) =>
                                    updateObj("color", e.target.value)
                                  }
                                  style={{
                                    flex: 1,
                                    padding: "6px 8px",
                                    borderRadius: 7,
                                    background: "rgba(255,255,255,0.05)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    color: "#f0ede8",
                                    fontSize: 12,
                                    fontFamily: "monospace",
                                    outline: "none",
                                  }}
                                />
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 5,
                                  marginTop: 8,
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
                                      width: 22,
                                      height: 22,
                                      borderRadius: 5,
                                      background: c,
                                      border: "none",
                                      cursor: "pointer",
                                      outline:
                                        f.color === c
                                          ? "2px solid #6366f1"
                                          : "none",
                                      outlineOffset: 1.5,
                                      transition: "transform 0.1s",
                                    }}
                                    onMouseEnter={(e) =>
                                      (e.currentTarget.style.transform =
                                        "scale(1.15)")
                                    }
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.transform =
                                        "scale(1)")
                                    }
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Bold / Italic */}
                            <div>
                              <p
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: "rgba(240,237,232,0.28)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.08em",
                                  marginBottom: 8,
                                }}
                              >
                                Style
                              </p>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button
                                  onClick={() => updateObj("bold", !f.bold)}
                                  style={{
                                    flex: 1,
                                    padding: "7px 0",
                                    borderRadius: 7,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                    background: f.bold
                                      ? "rgba(99,102,241,0.15)"
                                      : "rgba(255,255,255,0.04)",
                                    border: `1px solid ${f.bold ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.09)"}`,
                                    color: f.bold
                                      ? "#a5b4fc"
                                      : "rgba(240,237,232,0.5)",
                                  }}
                                >
                                  B
                                </button>
                                <button
                                  onClick={() => updateObj("italic", !f.italic)}
                                  style={{
                                    flex: 1,
                                    padding: "7px 0",
                                    borderRadius: 7,
                                    fontSize: 13,
                                    fontStyle: "italic",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                    background: f.italic
                                      ? "rgba(99,102,241,0.15)"
                                      : "rgba(255,255,255,0.04)",
                                    border: `1px solid ${f.italic ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.09)"}`,
                                    color: f.italic
                                      ? "#a5b4fc"
                                      : "rgba(240,237,232,0.5)",
                                  }}
                                >
                                  I
                                </button>
                              </div>
                            </div>

                            {/* Shadow */}
                            <ShadowPanel
                              shadow={f.shadow}
                              onChange={(s) => updateObj("shadow", s)}
                            />
                          </>
                        );
                      })()}

                    {/* Delete */}
                    <button
                      onClick={() => deleteObj(selectedObj.id)}
                      style={{
                        width: "100%",
                        padding: "8px 0",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        background: "rgba(239,68,68,0.07)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        color: "rgba(248,113,113,0.85)",
                        transition: "all 0.15s",
                        marginTop: 2,
                      }}
                      onMouseEnter={(e) => {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "rgba(239,68,68,0.14)";
                      }}
                      onMouseLeave={(e) => {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "rgba(239,68,68,0.07)";
                      }}
                    >
                      Remove object
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Preview row data */}
          {isPreviewMode && previewData && (
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
                padding: 14,
                flexShrink: 0,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "rgba(240,237,232,0.28)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 8,
                }}
              >
                Row {previewIndex + 1} Data
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(previewData).map(([k, v]) => (
                  <div key={k}>
                    <span
                      style={{
                        fontSize: 10,
                        color: "rgba(240,237,232,0.25)",
                        fontFamily: "monospace",
                        display: "block",
                      }}
                    >
                      {k}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
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

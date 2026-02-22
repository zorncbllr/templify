"use client";
import { useState, useRef, useEffect, useCallback } from "react";

// ─── TYPES ───────────────────────────────────────────────────────────────────
type RowData = Record<string, string>;

type Field = {
  id: number;
  column: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  maxWidth: number;
};

type DragRef = {
  mouseX: number;
  mouseY: number;
  fieldX: number;
  fieldY: number;
} | null;

type CanvasFieldProps = {
  field: Field;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onDrag: (id: number, x: number, y: number) => void;
  onDelete: (id: number) => void;
  previewData: RowData | null;
};

// ─── MOCK DATA ───────────────────────────────────────────────────────────────
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

const FONT_OPTIONS = [
  "DM Sans",
  "Playfair Display",
  "Georgia",
  "Arial",
  "Courier New",
  "Trebuchet MS",
];
const EXPORT_FORMATS = ["PNG", "PDF", "PPTX", "DOCX"];

// ─── FIELD COMPONENT ─────────────────────────────────────────────────────────
function CanvasField({
  field,
  isSelected,
  onSelect,
  onDrag,
  onDelete,
  previewData,
}: CanvasFieldProps) {
  const dragStart = useRef<DragRef>(null);

  const displayText = previewData
    ? previewData[field.column] || `{{${field.column}}}`
    : `{{${field.column}}}`;

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".delete-btn")) return;
    e.stopPropagation();
    onSelect(field.id);
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      fieldX: field.x,
      fieldY: field.y,
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      onDrag(
        field.id,
        dragStart.current.fieldX + dx,
        dragStart.current.fieldY + dy,
      );
    };
    const onMouseUp = () => {
      dragStart.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: field.x,
        top: field.y,
        fontFamily: field.fontFamily,
        fontSize: field.fontSize,
        color: field.color,
        fontWeight: field.bold ? "bold" : "normal",
        fontStyle: field.italic ? "italic" : "normal",
        cursor: "grab",
        userSelect: "none",
        padding: "4px 6px",
        borderRadius: "4px",
        border: isSelected
          ? "1.5px dashed #e8ff47"
          : "1.5px dashed transparent",
        background: isSelected ? "rgba(232,255,71,0.08)" : "transparent",
        whiteSpace: "nowrap",
        maxWidth: field.maxWidth,
        overflow: "hidden",
        textOverflow: "ellipsis",
        boxSizing: "border-box",
      }}
    >
      {displayText}
      {isSelected && (
        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(field.id);
          }}
          style={{
            position: "absolute",
            top: -10,
            right: -10,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#ff4444",
            border: "none",
            color: "white",
            fontSize: 11,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function SandboxPage() {
  const [mounted, setMounted] = useState(false);

  const [columns] = useState<string[]>(MOCK_COLUMNS);
  const [rows] = useState<RowData[]>(MOCK_ROWS);
  const [dataLoaded] = useState(true);

  const [bgImage, setBgImage] = useState<string | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const [exportFormat, setExportFormat] = useState("PNG");
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [activeStep, setActiveStep] = useState(1);
  const [rightTab, setRightTab] = useState<"fields" | "style">("fields");

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;

  const addField = useCallback(
    (column: string) => {
      const newField: Field = {
        id: Date.now(),
        column,
        x: 60,
        y: 60 + fields.length * 40,
        fontSize: 18,
        fontFamily: "DM Sans",
        color: "#1a1a1a",
        bold: false,
        italic: false,
        maxWidth: 280,
      };
      setFields((prev) => [...prev, newField]);
      setSelectedFieldId(newField.id);
      setRightTab("style");
    },
    [fields.length],
  );

  const handleDrag = useCallback((id: number, x: number, y: number) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, x, y } : f)));
  }, []);

  const deleteField = useCallback((id: number) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    setSelectedFieldId(null);
  }, []);

  const updateField = useCallback(
    (key: keyof Field, value: Field[keyof Field]) => {
      setFields((prev) =>
        prev.map((f) =>
          f.id === selectedFieldId ? { ...f, [key]: value } : f,
        ),
      );
    },
    [selectedFieldId],
  );

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setBgImage(url);
    setActiveStep(2);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setActiveStep(2);
  };

  if (!mounted) return null;

  const previewData: RowData | null = isPreviewMode ? rows[previewIndex] : null;

  return (
    <div
      className="bg-[#0d0d12] text-[#f0ede8] h-screen flex flex-col overflow-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .field-chip:hover { background: rgba(232,255,71,0.1) !important; border-color: rgba(232,255,71,0.3) !important; }
        input[type=range] { accent-color: #e8ff47; }
        input[type=color] { border: none; background: none; cursor: pointer; width: 32px; height: 32px; padding: 0; border-radius: 6px; }
      `}</style>

      {/* ── TOP BAR ── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07] bg-[#0d0d12] shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#e8ff47] rounded-lg flex items-center justify-center text-[#0a0a0f] text-xs font-bold">
              ✦
            </div>
            <span className="font-bold text-sm tracking-tight">Templify</span>
          </div>

          <div className="w-px h-5 bg-white/10" />

          <div className="flex items-center gap-1">
            {[
              { n: 1, label: "Data" },
              { n: 2, label: "Design" },
              { n: 3, label: "Preview" },
            ].map((s, i) => (
              <div key={s.n} className="flex items-center gap-1">
                <button
                  onClick={() => setActiveStep(s.n)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background:
                      activeStep === s.n
                        ? "rgba(232,255,71,0.12)"
                        : "transparent",
                    color:
                      activeStep === s.n
                        ? "#e8ff47"
                        : activeStep > s.n
                          ? "rgba(240,237,232,0.5)"
                          : "rgba(240,237,232,0.35)",
                    border:
                      activeStep === s.n
                        ? "1px solid rgba(232,255,71,0.25)"
                        : "1px solid transparent",
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background:
                        activeStep > s.n
                          ? "#e8ff47"
                          : activeStep === s.n
                            ? "rgba(232,255,71,0.2)"
                            : "rgba(255,255,255,0.08)",
                      color:
                        activeStep > s.n
                          ? "#0a0a0f"
                          : activeStep === s.n
                            ? "#e8ff47"
                            : "rgba(255,255,255,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {activeStep > s.n ? "✓" : s.n}
                  </span>
                  {s.label}
                </button>
                {i < 2 && (
                  <div
                    style={{
                      width: 20,
                      height: 1,
                      background: "rgba(255,255,255,0.08)",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsPreviewMode((p) => !p);
              setActiveStep(3);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
            style={{
              background: isPreviewMode
                ? "rgba(232,255,71,0.12)"
                : "transparent",
              borderColor: isPreviewMode
                ? "rgba(232,255,71,0.3)"
                : "rgba(255,255,255,0.12)",
              color: isPreviewMode ? "#e8ff47" : "rgba(240,237,232,0.6)",
            }}
          >
            <span>{isPreviewMode ? "👁 Previewing" : "👁 Preview"}</span>
            {isPreviewMode && (
              <span className="bg-[#e8ff47] text-[#0a0a0f] px-1.5 rounded text-[10px] font-bold">
                {previewIndex + 1}/{rows.length}
              </span>
            )}
          </button>

          <div className="relative">
            <div className="flex rounded-lg overflow-hidden border border-[rgba(232,255,71,0.3)]">
              <button
                className="px-4 py-1.5 bg-[#e8ff47] text-[#0a0a0f] text-xs font-bold hover:bg-[#d4eb30] transition-all"
                onClick={() =>
                  alert(
                    `Exporting ${rows.length} records as ${exportFormat}...`,
                  )
                }
              >
                Export {exportFormat}
              </button>
              <button
                onClick={() => setShowExportMenu((p) => !p)}
                className="px-2 py-1.5 bg-[#e8ff47] text-[#0a0a0f] border-l border-black/15 hover:bg-[#d4eb30] transition-all text-xs"
              >
                ▾
              </button>
            </div>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[#1a1a24] border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl min-w-[120px]">
                {EXPORT_FORMATS.map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setExportFormat(f);
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-white/5 transition-all flex items-center justify-between"
                    style={{
                      color:
                        exportFormat === f
                          ? "#e8ff47"
                          : "rgba(240,237,232,0.7)",
                    }}
                  >
                    {f} {exportFormat === f && "✓"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN LAYOUT ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT PANEL ── */}
        <aside className="w-[220px] shrink-0 border-r border-white/[0.07] flex flex-col bg-[#0f0f16] overflow-hidden">
          <div className="p-4 border-b border-white/[0.06]">
            <p className="text-[10px] font-bold text-[#f0ede8]/30 tracking-widest uppercase mb-3">
              Data Source
            </p>
            {dataLoaded ? (
              <div className="bg-[rgba(232,255,71,0.06)] border border-[rgba(232,255,71,0.15)] rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[#e8ff47] text-sm">📊</span>
                  <span className="text-[12px] font-semibold text-[#e8ff47]">
                    data.xlsx
                  </span>
                </div>
                <p className="text-[11px] text-[#f0ede8]/40">
                  {rows.length} rows · {columns.length} columns
                </p>
                <button className="mt-2 text-[10px] text-[#f0ede8]/30 hover:text-[#f0ede8]/60 transition-all underline">
                  Replace file
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 p-4 border border-dashed border-white/15 rounded-xl cursor-pointer hover:border-[rgba(232,255,71,0.3)] hover:bg-[rgba(232,255,71,0.03)] transition-all">
                <span className="text-2xl">📊</span>
                <span className="text-[11px] text-[#f0ede8]/40 text-center">
                  Upload Excel or CSV
                </span>
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={handleExcelUpload}
                />
              </label>
            )}
          </div>

          {dataLoaded && (
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-[10px] font-bold text-[#f0ede8]/30 tracking-widest uppercase mb-3">
                Columns
              </p>
              <p className="text-[10px] text-[#f0ede8]/25 mb-3 leading-relaxed">
                Click a column to add it to the canvas
              </p>
              <div className="flex flex-col gap-1.5">
                {columns.map((col) => {
                  const alreadyAdded = fields.some((f) => f.column === col);
                  return (
                    <button
                      key={col}
                      onClick={() => addField(col)}
                      className="field-chip w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all flex items-center justify-between"
                      style={{
                        background: alreadyAdded
                          ? "rgba(232,255,71,0.06)"
                          : "rgba(255,255,255,0.03)",
                        border: alreadyAdded
                          ? "1px solid rgba(232,255,71,0.2)"
                          : "1px solid rgba(255,255,255,0.06)",
                        color: alreadyAdded
                          ? "#e8ff47"
                          : "rgba(240,237,232,0.65)",
                      }}
                    >
                      <span className="font-mono text-[11px]">{`{{${col}}}`}</span>
                      {alreadyAdded ? (
                        <span className="text-[10px] opacity-60">✓</span>
                      ) : (
                        <span className="text-[10px] opacity-30">+</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="p-4 border-t border-white/[0.06]">
            <p className="text-[10px] font-bold text-[#f0ede8]/30 tracking-widest uppercase mb-3">
              Background
            </p>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/10 cursor-pointer hover:border-[rgba(232,255,71,0.3)] hover:bg-[rgba(232,255,71,0.03)] transition-all">
              <span className="text-sm">🖼</span>
              <span className="text-[11px] text-[#f0ede8]/40">
                {bgImage ? "Change image" : "Upload template"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBgUpload}
              />
            </label>
          </div>
        </aside>

        {/* ── CANVAS ── */}
        <main
          className="flex-1 overflow-auto bg-[#080810] flex items-center justify-center p-8 relative"
          onClick={() => setSelectedFieldId(null)}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div
            ref={canvasRef}
            className="relative shadow-2xl"
            style={{
              width: 794,
              height: 561,
              background: bgImage ? "transparent" : "#ffffff",
              borderRadius: 8,
              overflow: "hidden",
              boxShadow:
                "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)",
              flexShrink: 0,
            }}
          >
            {bgImage && (
              <img
                src={bgImage}
                alt="template background"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            )}

            {!bgImage && fields.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
                <div className="text-4xl opacity-20">🖼</div>
                <p className="text-[#0a0a0f]/30 text-sm font-medium">
                  Upload a background image to start
                </p>
                <p className="text-[#0a0a0f]/20 text-xs">
                  or add fields directly to the blank canvas
                </p>
              </div>
            )}

            {isPreviewMode && (
              <div className="absolute top-3 right-3 z-10">
                <div className="bg-[#0a0a0f]/80 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#e8ff47] animate-pulse" />
                  <span className="text-[11px] text-[#e8ff47] font-semibold">
                    Row {previewIndex + 1} of {rows.length}
                  </span>
                </div>
              </div>
            )}

            {fields.map((field) => (
              <CanvasField
                key={field.id}
                field={field}
                isSelected={selectedFieldId === field.id && !isPreviewMode}
                onSelect={setSelectedFieldId}
                onDrag={handleDrag}
                onDelete={deleteField}
                previewData={previewData}
              />
            ))}
          </div>

          {isPreviewMode && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[#1a1a24]/95 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-3 shadow-2xl">
              <button
                onClick={() => setPreviewIndex((p) => Math.max(0, p - 1))}
                disabled={previewIndex === 0}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all border border-white/10 disabled:opacity-30"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                ←
              </button>

              <div className="flex items-center gap-2">
                {rows.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPreviewIndex(i)}
                    className="rounded-full transition-all border-0 cursor-pointer"
                    style={{
                      width: previewIndex === i ? 24 : 8,
                      height: 8,
                      background:
                        previewIndex === i
                          ? "#e8ff47"
                          : "rgba(255,255,255,0.2)",
                    }}
                  />
                ))}
              </div>

              <span className="text-[12px] text-[#f0ede8]/50 font-medium px-1">
                {previewIndex + 1} / {rows.length}
              </span>

              <button
                onClick={() =>
                  setPreviewIndex((p) => Math.min(rows.length - 1, p + 1))
                }
                disabled={previewIndex === rows.length - 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all border border-white/10 disabled:opacity-30"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                →
              </button>

              <div className="w-px h-5 bg-white/10" />

              <button
                onClick={() => setIsPreviewMode(false)}
                className="text-[11px] text-[#f0ede8]/40 hover:text-[#f0ede8]/70 transition-all font-medium"
              >
                ✕ Exit preview
              </button>
            </div>
          )}
        </main>

        {/* ── RIGHT PANEL ── */}
        <aside className="w-[240px] shrink-0 border-l border-white/[0.07] flex flex-col bg-[#0f0f16] overflow-hidden">
          <div className="flex border-b border-white/[0.06] shrink-0">
            {(["fields", "style"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className="flex-1 py-3 text-[11px] font-bold tracking-wider uppercase transition-all cursor-pointer"
                style={{
                  color: rightTab === tab ? "#e8ff47" : "rgba(240,237,232,0.3)",
                  background: "transparent",
                  border: "none",
                  borderBottom:
                    rightTab === tab
                      ? "2px solid #e8ff47"
                      : "2px solid transparent",
                }}
              >
                {tab === "fields" ? "Fields" : "Style"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* FIELDS TAB */}
            {rightTab === "fields" && (
              <div className="p-4">
                <p className="text-[10px] font-bold text-[#f0ede8]/30 tracking-widest uppercase mb-3">
                  Canvas Fields ({fields.length})
                </p>
                {fields.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[12px] text-[#f0ede8]/25 leading-relaxed">
                      No fields yet.
                      <br />
                      Click a column on the left to add it.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {fields.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => {
                          setSelectedFieldId(f.id);
                          setRightTab("style");
                        }}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all"
                        style={{
                          background:
                            selectedFieldId === f.id
                              ? "rgba(232,255,71,0.08)"
                              : "rgba(255,255,255,0.03)",
                          border:
                            selectedFieldId === f.id
                              ? "1px solid rgba(232,255,71,0.2)"
                              : "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <div>
                          <p
                            className="text-[11px] font-semibold"
                            style={{
                              color:
                                selectedFieldId === f.id
                                  ? "#e8ff47"
                                  : "#f0ede8",
                            }}
                          >
                            {f.column}
                          </p>
                          <p className="text-[10px] text-[#f0ede8]/30 mt-0.5">
                            {f.fontSize}px · {f.fontFamily}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteField(f.id);
                          }}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] text-[#f0ede8]/30 hover:text-red-400 hover:bg-red-400/10 transition-all border-0 bg-transparent cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STYLE TAB */}
            {rightTab === "style" && (
              <div className="p-4">
                {!selectedField ? (
                  <div className="text-center py-8">
                    <p className="text-[12px] text-[#f0ede8]/25 leading-relaxed">
                      Select a field on the canvas to style it.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {/* Field name */}
                    <div>
                      <p className="text-[10px] font-bold text-[#f0ede8]/30 tracking-widest uppercase mb-2">
                        Field
                      </p>
                      <div className="px-3 py-2 rounded-lg bg-[rgba(232,255,71,0.06)] border border-[rgba(232,255,71,0.15)]">
                        <p className="text-[12px] font-semibold text-[#e8ff47] font-mono">{`{{${selectedField.column}}}`}</p>
                      </div>
                    </div>

                    {/* Font family */}
                    <div>
                      <p className="text-[10px] font-bold text-[#f0ede8]/30 tracking-widest uppercase mb-2">
                        Font
                      </p>
                      <select
                        value={selectedField.fontFamily}
                        onChange={(e) =>
                          updateField("fontFamily", e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-lg text-[12px] font-medium appearance-none cursor-pointer"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#f0ede8",
                          outline: "none",
                        }}
                      >
                        {FONT_OPTIONS.map((f) => (
                          <option
                            key={f}
                            value={f}
                            style={{ background: "#1a1a24" }}
                          >
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Font size */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] font-bold text-[#f0ede8]/30 tracking-widest uppercase">
                          Size
                        </p>
                        <span className="text-[11px] text-[#e8ff47] font-bold">
                          {selectedField.fontSize}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={8}
                        max={72}
                        value={selectedField.fontSize}
                        onChange={(e) =>
                          updateField("fontSize", Number(e.target.value))
                        }
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #e8ff47 ${((selectedField.fontSize - 8) / 64) * 100}%, rgba(255,255,255,0.1) 0%)`,
                        }}
                      />
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-[#f0ede8]/20">8</span>
                        <span className="text-[10px] text-[#f0ede8]/20">
                          72
                        </span>
                      </div>
                    </div>

                    {/* Color */}
                    <div>
                      <p className="text-[10px] font-bold text-[#f0ede8]/30 tracking-widest uppercase mb-2">
                        Color
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                          <input
                            type="color"
                            value={selectedField.color}
                            onChange={(e) =>
                              updateField("color", e.target.value)
                            }
                            className="absolute inset-0 w-full h-full cursor-pointer"
                            style={{ transform: "scale(1.5)" }}
                          />
                        </div>
                        <input
                          type="text"
                          value={selectedField.color}
                          onChange={(e) => updateField("color", e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg text-[12px] font-mono"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "#f0ede8",
                            outline: "none",
                          }}
                        />
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        {[
                          "#1a1a1a",
                          "#ffffff",
                          "#e8ff47",
                          "#4a90e2",
                          "#e74c3c",
                          "#2ecc71",
                        ].map((c) => (
                          <button
                            key={c}
                            onClick={() => updateField("color", c)}
                            className="w-6 h-6 rounded-md border-0 cursor-pointer transition-all hover:scale-110"
                            style={{
                              background: c,
                              outline:
                                selectedField.color === c
                                  ? "2px solid #e8ff47"
                                  : "none",
                              outlineOffset: 1,
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Bold / Italic */}
                    <div>
                      <p className="text-[10px] font-bold text-[#f0ede8]/30 tracking-widest uppercase mb-2">
                        Style
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            updateField("bold", !selectedField.bold)
                          }
                          className="flex-1 py-2 rounded-lg text-sm font-bold transition-all border cursor-pointer"
                          style={{
                            background: selectedField.bold
                              ? "rgba(232,255,71,0.12)"
                              : "rgba(255,255,255,0.04)",
                            borderColor: selectedField.bold
                              ? "rgba(232,255,71,0.3)"
                              : "rgba(255,255,255,0.08)",
                            color: selectedField.bold
                              ? "#e8ff47"
                              : "rgba(240,237,232,0.5)",
                          }}
                        >
                          B
                        </button>
                        <button
                          onClick={() =>
                            updateField("italic", !selectedField.italic)
                          }
                          className="flex-1 py-2 rounded-lg text-sm italic transition-all border cursor-pointer"
                          style={{
                            background: selectedField.italic
                              ? "rgba(232,255,71,0.12)"
                              : "rgba(255,255,255,0.04)",
                            borderColor: selectedField.italic
                              ? "rgba(232,255,71,0.3)"
                              : "rgba(255,255,255,0.08)",
                            color: selectedField.italic
                              ? "#e8ff47"
                              : "rgba(240,237,232,0.5)",
                          }}
                        >
                          I
                        </button>
                      </div>
                    </div>

                    {/* Max width */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] font-bold text-[#f0ede8]/30 tracking-widest uppercase">
                          Max Width
                        </p>
                        <span className="text-[11px] text-[#e8ff47] font-bold">
                          {selectedField.maxWidth}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={80}
                        max={750}
                        value={selectedField.maxWidth}
                        onChange={(e) =>
                          updateField("maxWidth", Number(e.target.value))
                        }
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #e8ff47 ${((selectedField.maxWidth - 80) / 670) * 100}%, rgba(255,255,255,0.1) 0%)`,
                        }}
                      />
                    </div>

                    {/* Position */}
                    <div>
                      <p className="text-[10px] font-bold text-[#f0ede8]/30 tracking-widest uppercase mb-2">
                        Position
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {(["x", "y"] as const).map((key) => (
                          <div key={key}>
                            <p className="text-[10px] text-[#f0ede8]/25 mb-1 uppercase">
                              {key}
                            </p>
                            <input
                              type="number"
                              value={Math.round(selectedField[key] as number)}
                              onChange={(e) =>
                                updateField(key, Number(e.target.value))
                              }
                              className="w-full px-2 py-1.5 rounded-lg text-[12px] font-mono text-center"
                              style={{
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "#f0ede8",
                                outline: "none",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => deleteField(selectedField.id)}
                      className="w-full py-2 rounded-lg text-[12px] font-semibold transition-all border cursor-pointer mt-2"
                      style={{
                        background: "rgba(255,68,68,0.06)",
                        borderColor: "rgba(255,68,68,0.2)",
                        color: "rgba(255,100,100,0.8)",
                      }}
                    >
                      Remove field
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preview row data */}
          {isPreviewMode && previewData && (
            <div className="border-t border-white/[0.06] p-4 shrink-0">
              <p className="text-[10px] font-bold text-[#f0ede8]/30 tracking-widest uppercase mb-3">
                Row {previewIndex + 1} Data
              </p>
              <div className="flex flex-col gap-1.5">
                {Object.entries(previewData).map(([k, v]) => (
                  <div key={k} className="flex flex-col">
                    <span className="text-[10px] text-[#f0ede8]/25 font-mono">
                      {k}
                    </span>
                    <span className="text-[11px] text-[#f0ede8]/70 truncate">
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

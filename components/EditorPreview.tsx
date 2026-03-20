import { useState } from "react";
import PanelSection from "./PanelSection";
import RLabel from "./RLabel";
import {
  IconSparkle,
  IconUndo,
  IconImage,
  IconBarChart,
  IconCamera,
  IconClose,
  IconGrid,
  IconDragHandle,
  IconMinus,
  IconFitScreen,
  IconChevronsLeft,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsRight,
  IconChevronDown,
  IconFolder,
  IconArrowUp,
  IconArrowDown,
} from "./Icons";

const sampleData = [
  {
    Name: "Arnoldos Paldos",
    Age: "20",
    Course: "BS Computer Science",
    Image_Path: "arnoldos.jpg",
  },
  {
    Name: "Ma. Theresa Reyes",
    Age: "21",
    Course: "BSIT",
    Image_Path: "theresa.jpg",
  },
  {
    Name: "Carlo Mendoza",
    Age: "22",
    Course: "BSECE",
    Image_Path: "carlo.jpg",
  },
];

const SWATCH_COLORS = [
  "#e8ff47",
  "#ffffff",
  "#4caf50",
  "#2196f3",
  "#e53935",
  "#ff9800",
  "#9c27b0",
];

function EditorPreview() {
  const [row, setRow] = useState(0);
  const [fontSize, setFontSize] = useState(42);
  const [bold, setBold] = useState(true);
  const [italic, setItalic] = useState(false);
  const [color, setColor] = useState("#1a1a1a");
  const data = sampleData[row];

  return (
    <div
      className="font-[DM_Sans,sans-serif] bg-app-bg-deep border border-white/[0.08] rounded-md overflow-hidden select-none"
      style={{ boxShadow: "0 40px 120px rgba(0,0,0,0.85)" }}
    >
      {/* Top bar */}
      <header className="flex items-center justify-between px-[14px] h-[44px] border-b border-white/[0.06] bg-app-bg-deep">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 bg-app-accent rounded-md flex items-center justify-center text-app-bg">
              <IconSparkle size={10} />
            </div>
            <span className="text-xs font-bold text-app-text">Templify</span>
          </div>
          <div className="w-px h-3.5 bg-white/[0.08]" />
          <div className="flex gap-0.5">
            {[false, true].map((flip, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-md border border-white/[0.08] flex items-center justify-center text-app-text/[0.28]"
              >
                <IconUndo
                  size={11}
                  style={flip ? { transform: "scaleX(-1)" } : undefined}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 px-2 py-[3px] rounded-md bg-white/[0.04] border border-white/[0.08]">
            <span className="text-[8px] text-app-text/[0.3]">Canvas</span>
            <span className="text-[9px] font-semibold text-app-text/[0.6] font-mono">
              960x540px
            </span>
          </div>
        </div>
        <button className="flex items-center gap-[5px] px-3 h-7 rounded-md text-[10px] font-bold cursor-default bg-app-accent border-none text-app-bg">
          <IconGrid size={10} />
          <span>Print Imposition & Export</span>
          <span className="text-[7px] bg-black/[0.12] px-1 py-px rounded-md tracking-[0.04em]">
            GA
          </span>
        </button>
      </header>

      {/* Body */}
      <div className="flex h-full">
        {/* LEFT PANEL */}
        <div className="w-[172px] border-r border-white/[0.06] bg-app-panel flex h-[37.5rem] flex-col shrink-0">
          <PanelSection label="Template / Image">
            <label className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg cursor-default border-[1.5px] border-dashed border-app-accent/[0.22] bg-app-accent/[0.03]">
              <IconImage size={18} color="rgba(240,237,232,0.4)" />
              <p className="text-[10px] font-semibold text-app-text/[0.5] m-0">
                Select Template
              </p>
              <p className="text-[8px] text-app-text/[0.22] m-0">
                auto-resizes canvas
              </p>
            </label>
          </PanelSection>

          <PanelSection label="Data Source">
            <div className="bg-app-accent/[0.04] border border-app-accent/[0.15] rounded-lg px-[9px] py-[7px]">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-[5px]">
                  <IconBarChart size={10} color="#e8ff47" />
                  <span className="text-[10px] font-semibold text-app-accent">
                    test.xlsx
                  </span>
                </div>
                <span className="text-[10px] text-app-text/[0.3]">
                  ↺
                </span>
              </div>
              <p className="text-[9px] text-app-text/[0.35] m-0">
                3 rows · 4 cols
              </p>
            </div>
          </PanelSection>

          <PanelSection label="Photo Data">
            <div className="bg-app-accent-blue/[0.05] border border-app-accent-blue/[0.2] rounded-lg px-[9px] py-[7px]">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-[5px]">
                  <IconCamera size={10} color="#63b3ed" />
                  <span className="text-[10px] font-semibold text-app-accent-blue">
                    3 photos
                  </span>
                </div>
                <div className="flex gap-1.5 items-center">
                  <span className="text-[9px] text-app-text/[0.35] underline">
                    Replace
                  </span>
                  <IconClose size={8} color="rgba(240,237,232,0.25)" />
                </div>
              </div>
              <p className="text-[9px] text-app-text/[0.35] m-0">
                3 photos loaded
              </p>
            </div>
            <div className="mt-[7px]">
              <p className="text-[8px] text-app-text/[0.22] mb-1">
                Photo field — click to place:
              </p>
              <div className="px-[7px] py-1 rounded-md text-[9px] font-medium flex items-center justify-between bg-white/[0.02] border border-white/[0.07] text-app-text/[0.55]">
                <span className="flex items-center gap-1">
                  <IconCamera size={9} />
                  <span className="font-mono text-[8px]">Image_Path</span>
                </span>
                <span className="opacity-40">+</span>
              </div>
            </div>
          </PanelSection>

          <PanelSection label="Text Fields">
            <div className="flex flex-col gap-[3px]">
              {[
                { col: "Name", placed: true },
                { col: "Age", placed: false },
                { col: "Course", placed: false },
              ].map(({ col, placed }) => (
                <div
                  key={col}
                  className={`px-[7px] py-1 rounded-md text-[9px] font-medium font-mono flex items-center justify-between ${
                    placed
                      ? "bg-app-accent/[0.05] border border-app-accent/[0.15] text-app-accent"
                      : "bg-white/[0.02] border border-white/[0.06] text-app-text/[0.6]"
                  }`}
                >
                  {`{{${col}}}`}
                  <span className="flex items-center gap-[3px]">
                    {placed && (
                      <span className="bg-app-accent/[0.15] text-app-accent rounded-md px-[3px] text-[7px] font-bold">
                        1
                      </span>
                    )}
                    <span className="opacity-40 text-[10px]">+</span>
                  </span>
                </div>
              ))}
            </div>
          </PanelSection>
        </div>

        {/* CANVAS */}
        <div className="flex-1 bg-app-canvas relative flex items-center justify-center h-[37.5rem]">
          {/* dot grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.025) 1px,transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />

          {/* White canvas */}
          <div
            className="mx-12 my-12 w-[540px] h-[304px] bg-white rounded-md relative overflow-hidden"
            style={{
              boxShadow:
                "0 20px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)",
            }}
          >
            {/* The selected Name field */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[55%]">
              {/* Label tag above */}
              <div className="absolute -top-[19px] left-0 bg-app-bg-deep border border-app-accent/[0.3] text-app-accent text-[8px] font-bold px-[5px] py-px rounded-md whitespace-nowrap font-mono flex items-center">
                T {"{{Name}}"}
              </div>
              {/* Text element with selection outline */}
              <div className="relative outline-[1.5px] outline outline-app-accent px-2 py-[3px] cursor-move">
                <span
                  style={{
                    fontSize: Math.round(fontSize * 0.52),
                    fontWeight: bold ? "bold" : "normal",
                    fontStyle: italic ? "italic" : "normal",
                    color: color,
                    fontFamily: "'Merriweather', serif",
                    whiteSpace: "nowrap",
                    display: "block",
                    lineHeight: 1.2,
                    transition: "all 0.12s",
                  }}
                >
                  {data.Name}
                </span>
                {/* 8 resize handles */}
                {[
                  { top: -5, left: -5 },
                  { top: -5, left: "50%", marginLeft: -4 },
                  { top: -5, right: -5 },
                  { top: "50%", right: -5, marginTop: -4 },
                  { bottom: -5, right: -5 },
                  { bottom: -5, left: "50%", marginLeft: -4 },
                  { bottom: -5, left: -5 },
                  { top: "50%", left: -5, marginTop: -4 },
                ].map((pos, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 rounded-sm bg-white border-[1.5px] border-app-accent"
                    style={{
                      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                      ...pos,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Page nav bar */}
          <div
            className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-app-bg/[0.92] border border-white/[0.1] backdrop-blur-[12px]"
          >
            {[
              {
                icon: <IconChevronsLeft size={10} />,
                action: () => setRow(0),
                disabled: row === 0,
              },
              {
                icon: <IconChevronLeft size={10} />,
                action: () => setRow((r) => Math.max(0, r - 1)),
                disabled: row === 0,
              },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={btn.action}
                className="w-5 h-5 rounded border border-white/[0.1] bg-white/[0.06] flex items-center justify-center"
                style={{
                  color: btn.disabled
                    ? "rgba(240,237,232,0.15)"
                    : "rgba(240,237,232,0.6)",
                  cursor: btn.disabled ? "default" : "pointer",
                }}
              >
                {btn.icon}
              </button>
            ))}
            <div className="text-center min-w-[72px]">
              <div className="text-[10px] font-bold text-app-text">
                Row {row + 1}{" "}
                <span className="text-app-text/[0.3]">
                  / {sampleData.length}
                </span>
              </div>
              <div className="text-[8px] text-app-text/[0.35] mt-px">
                {data
                  ? Object.values(data).filter(Boolean)[0]?.slice(0, 20)
                  : "—"}
              </div>
            </div>
            {[
              {
                icon: <IconChevronRight size={10} />,
                action: () =>
                  setRow((r) => Math.min(sampleData.length - 1, r + 1)),
                disabled: row === sampleData.length - 1,
              },
              {
                icon: <IconChevronsRight size={10} />,
                action: () => setRow(sampleData.length - 1),
                disabled: row === sampleData.length - 1,
              },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={btn.action}
                className="w-5 h-5 rounded border border-white/[0.1] bg-white/[0.06] flex items-center justify-center"
                style={{
                  color: btn.disabled
                    ? "rgba(240,237,232,0.15)"
                    : "rgba(240,237,232,0.6)",
                  cursor: btn.disabled ? "default" : "pointer",
                }}
              >
                {btn.icon}
              </button>
            ))}
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-3.5 right-3.5 flex flex-col bg-app-bg/[0.92] border border-white/[0.1] rounded-md overflow-hidden">
            <div className="w-7 h-7 flex items-center justify-center text-app-text/[0.5] border-b border-white/[0.07]">
              +
            </div>
            <div className="w-7 h-5 flex items-center justify-center text-[7px] font-bold text-app-accent border-b border-white/[0.07]">
              100%
            </div>
            <div className="w-7 h-7 flex items-center justify-center text-app-text/[0.5] border-b border-white/[0.07]">
              <IconMinus size={12} />
            </div>
            <div className="w-7 h-7 flex items-center justify-center text-app-text/[0.5]">
              <IconFitScreen size={12} />
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-[196px] border-l border-white/[0.06] bg-app-panel flex flex-col shrink-0 h-[37.5rem]">
          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] shrink-0">
            {["Layers", "Style"].map((tab) => (
              <button
                key={tab}
                className={`flex-1 py-[9px] text-[8px] font-bold tracking-[0.06em] uppercase text-center cursor-default bg-transparent border-none ${
                  tab === "Style"
                    ? "text-app-accent border-b-2 border-app-accent"
                    : "text-app-text/[0.28] border-b-2 border-transparent"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5">
            {/* Selected pill */}
            <div className="px-2 py-[5px] rounded-md mb-2.5 bg-app-accent/[0.05] border border-app-accent/[0.12]">
              <p className="text-[9px] font-semibold text-app-accent font-mono m-0">
                T {"{{Name}}"}
              </p>
            </div>

            {/* Size & Position */}
            <RLabel>Size & Position</RLabel>
            <div className="grid grid-cols-2 gap-[5px] mb-2.5">
              {[
                ["W", "329"],
                ["H", "76"],
                ["X", "463"],
                ["Y", "121"],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-[8px] text-app-text/[0.25] mb-[3px]">
                    {l}
                  </p>
                  <input
                    readOnly
                    value={v}
                    className="w-full px-1.5 py-1 rounded-md text-center bg-white/[0.05] border border-white/[0.1] text-app-text text-[10px] font-mono outline-none box-border"
                  />
                </div>
              ))}
            </div>

            {/* Layer order */}
            <RLabel>Layer Order</RLabel>
            <div className="flex gap-[5px] mb-2.5">
              {[
                { icon: <IconArrowUp size={9} />, label: "Fwd" },
                { icon: <IconArrowDown size={9} />, label: "Back" },
              ].map((b, i) => (
                <div
                  key={i}
                  className="flex-1 py-1 rounded-md text-center text-[9px] font-semibold text-app-text/[0.6] bg-white/[0.04] border border-white/[0.09] flex items-center justify-center gap-[3px]"
                >
                  {b.icon} {b.label}
                </div>
              ))}
            </div>

            {/* Font */}
            <RLabel>Font</RLabel>
            <div className="px-2 py-[5px] rounded-md mb-2 bg-white/[0.04] border border-white/[0.1] flex justify-between items-center font-[Merriweather,serif] text-[11px] text-app-text">
              Merriweather
              <IconChevronDown size={9} style={{ opacity: 0.4 }} />
            </div>

            {/* Font size */}
            <RLabel>Font Size</RLabel>
            <div className="flex items-center gap-[5px] mb-2.5">
              <input
                type="range"
                min={8}
                max={80}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="flex-1 h-[3px] min-w-0"
                style={{ accentColor: "#e8ff47" }}
              />
              <span className="text-[9px] text-app-accent font-bold w-7 text-right">
                {fontSize}px
              </span>
            </div>

            {/* Alignment */}
            <RLabel>Alignment</RLabel>
            <div className="flex gap-[3px] mb-2.5">
              {[0, 1, 2, 3].map((ai) => (
                <div
                  key={ai}
                  className={`flex-1 h-7 rounded-md flex items-center justify-center ${
                    ai === 0
                      ? "bg-app-accent/[0.15] border border-app-accent/[0.35]"
                      : "bg-white/[0.04] border border-white/[0.08]"
                  }`}
                >
                  <svg
                    width="11"
                    height="9"
                    viewBox="0 0 11 9"
                    fill={ai === 0 ? "#e8ff47" : "rgba(240,237,232,0.35)"}
                  >
                    <rect x="0" y="0" width="11" height="1.3" rx=".65" />
                    <rect
                      x={ai === 1 ? 1.5 : ai === 2 ? 3 : 0}
                      y="3.2"
                      width={ai === 3 ? 11 : 8}
                      height="1.3"
                      rx=".65"
                    />
                    <rect x="0" y="6.4" width="11" height="1.3" rx=".65" />
                  </svg>
                </div>
              ))}
            </div>

            {/* Color */}
            <RLabel>Color</RLabel>
            <div className="flex gap-[5px] mb-[5px]">
              <div
                className="w-[26px] h-fit rounded-md border border-white/[0.12] shrink-0"
                style={{ background: color }}
              />
              <div className="flex-1 px-[7px] py-1 rounded-md bg-white/[0.05] border border-white/[0.1] text-app-text text-[10px] font-mono">
                {color}
              </div>
            </div>
            <div className="flex gap-[3px] mb-2.5">
              {SWATCH_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-[18px] h-[18px] rounded-md border-none cursor-pointer shrink-0"
                  style={{
                    background: c,
                    outline: color === c ? "2px solid #e8ff47" : "none",
                    outlineOffset: 1,
                  }}
                />
              ))}
            </div>

            {/* Style B / I */}
            <RLabel>Style</RLabel>
            <div className="flex gap-1 mb-2.5">
              <button
                onClick={() => setBold((b) => !b)}
                className={`flex-1 py-[5px] rounded-md text-xs font-bold cursor-pointer ${
                  bold
                    ? "bg-app-accent/[0.12] border border-app-accent/[0.3] text-app-accent"
                    : "bg-white/[0.04] border border-white/[0.08] text-app-text/[0.5]"
                }`}
              >
                B
              </button>
              <button
                onClick={() => setItalic((b) => !b)}
                className={`flex-1 py-[5px] rounded-md text-xs italic font-semibold cursor-pointer ${
                  italic
                    ? "bg-app-accent/[0.12] border border-app-accent/[0.3] text-app-accent"
                    : "bg-white/[0.04] border border-white/[0.08] text-app-text/[0.5]"
                }`}
              >
                I
              </button>
            </div>

            {/* Shadow toggle */}
            <div className="flex items-center justify-between mb-3.5">
              <RLabel>Shadow</RLabel>
              <div className="w-7 h-3.5 rounded-full bg-white/[0.1] relative">
                <div
                  className="absolute top-px left-px w-3 h-3 rounded-full bg-white"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
                />
              </div>
            </div>

            {/* Remove */}
            <div className="py-1.5 rounded-md text-center text-[10px] font-semibold bg-app-danger/[0.07] border border-app-danger/[0.18] text-app-danger/85">
              Remove object
            </div>
          </div>

          {/* Row data at bottom */}
          <div className="border-t border-white/[0.06] px-2.5 py-2 shrink-0">
            <p className="text-[8px] font-bold text-app-text/[0.25] uppercase tracking-[0.08em] mb-[5px]">
              Row {row + 1} / {sampleData.length}
            </p>
            {Object.entries(data).map(([k, v]) => (
              <div key={k} className="mb-[3px]">
                <span className="text-[8px] text-app-text/[0.22] font-mono block">
                  {k}
                </span>
                <span className="text-[9px] text-app-text/[0.65] block overflow-hidden text-ellipsis whitespace-nowrap">
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditorPreview;

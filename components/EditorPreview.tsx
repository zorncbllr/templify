import { useState } from "react";
import PanelSection from "./PanelSection";
import RLabel from "./RLabel";

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

const miniBtn: React.CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: 4,
  flexShrink: 0,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "rgba(240,237,232,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  cursor: "default",
};

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
      style={{
        fontFamily: "'DM Sans', sans-serif",
        background: "#0c0c14",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 40px 120px rgba(0,0,0,0.85)",
        userSelect: "none",
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "#0a0a10",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              background: "#e8ff47",
              borderRadius: 5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 900,
              color: "#0a0a10",
            }}
          >
            ✦
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#f0ede8" }}>
            Templify
          </span>
          <div
            style={{
              width: 1,
              height: 12,
              background: "rgba(255,255,255,0.08)",
              margin: "0 2px",
            }}
          />
          {["↩", "↪"].map((s, i) => (
            <div
              key={i}
              style={{
                width: 24,
                height: 24,
                borderRadius: 5,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                color: "rgba(240,237,232,0.28)",
              }}
            >
              {s}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              padding: "3px 10px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              fontSize: 9,
              color: "rgba(240,237,232,0.4)",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span style={{ opacity: 0.5 }}>⬚</span> 16:9 HD 960×540
          </div>
          <div
            style={{
              display: "flex",
              borderRadius: 6,
              overflow: "hidden",
              border: "1px solid rgba(232,255,71,0.5)",
            }}
          >
            <div
              style={{
                padding: "3px 12px",
                background: "#e8ff47",
                color: "#0a0a10",
                fontSize: 9,
                fontWeight: 700,
              }}
            >
              Export PNG · 3p
            </div>
            <div
              style={{
                padding: "3px 7px",
                background: "#e8ff47",
                color: "#0a0a10",
                fontSize: 9,
                borderLeft: "1px solid rgba(0,0,0,0.15)",
              }}
            >
              ▾
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: "flex", height: "full" }}>
        {/* LEFT PANEL */}
        <div
          style={{
            width: 172,
            borderRight: "1px solid rgba(255,255,255,0.06)",
            background: "#0e0e18",
            display: "flex",
            height: "37.5rem",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          <PanelSection label="Template / Image">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "10px 8px",
                borderRadius: 8,
                border: "1.5px dashed rgba(232,255,71,0.25)",
                background: "rgba(232,255,71,0.02)",
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                }}
              >
                🖼
              </div>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "rgba(240,237,232,0.5)",
                  margin: 0,
                }}
              >
                Upload Image
              </p>
              <p
                style={{
                  fontSize: 8,
                  color: "rgba(240,237,232,0.22)",
                  margin: 0,
                }}
              >
                or drag & drop
              </p>
            </div>
          </PanelSection>

          <PanelSection label="Data Source">
            <div
              style={{
                background: "rgba(232,255,71,0.04)",
                border: "1px solid rgba(232,255,71,0.15)",
                borderRadius: 8,
                padding: "7px 9px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 2,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 10 }}>📊</span>
                  <span
                    style={{ fontSize: 10, fontWeight: 600, color: "#e8ff47" }}
                  >
                    test.xlsx
                  </span>
                </div>
                <span style={{ fontSize: 10, color: "rgba(240,237,232,0.3)" }}>
                  ↺
                </span>
              </div>
              <p
                style={{
                  fontSize: 9,
                  color: "rgba(240,237,232,0.35)",
                  margin: 0,
                }}
              >
                3 rows · 4 cols
              </p>
              <div
                style={{
                  marginTop: 6,
                  padding: "4px 6px",
                  borderRadius: 5,
                  background: "rgba(99,179,237,0.06)",
                  border: "1px solid rgba(99,179,237,0.15)",
                }}
              >
                <p
                  style={{
                    fontSize: 7,
                    fontWeight: 700,
                    color: "rgba(99,179,237,0.7)",
                    letterSpacing: "0.05em",
                    margin: "0 0 2px",
                  }}
                >
                  ✦ AUTO-DETECTED
                </p>
                <p
                  style={{
                    fontSize: 8,
                    color: "rgba(99,179,237,0.8)",
                    margin: 0,
                  }}
                >
                  1 photo column placed on canvas
                </p>
              </div>
            </div>
          </PanelSection>

          <PanelSection label="Photo Data">
            <div
              style={{
                background: "rgba(99,179,237,0.05)",
                border: "1px solid rgba(99,179,237,0.2)",
                borderRadius: 8,
                padding: "7px 9px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 2,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span>📷</span>
                  <span
                    style={{ fontSize: 10, fontWeight: 600, color: "#63b3ed" }}
                  >
                    3 photos
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <span
                    style={{
                      fontSize: 9,
                      color: "rgba(240,237,232,0.35)",
                      textDecoration: "underline",
                    }}
                  >
                    Replace
                  </span>
                  <span
                    style={{ fontSize: 10, color: "rgba(240,237,232,0.25)" }}
                  >
                    ✕
                  </span>
                </div>
              </div>
              <p
                style={{
                  fontSize: 9,
                  color: "rgba(240,237,232,0.35)",
                  margin: 0,
                }}
              >
                3 photos loaded
              </p>
            </div>
            <div style={{ marginTop: 7 }}>
              <p
                style={{
                  fontSize: 8,
                  color: "rgba(240,237,232,0.22)",
                  marginBottom: 4,
                }}
              >
                Photo field — click to place:
              </p>
              <div
                style={{
                  padding: "4px 7px",
                  borderRadius: 6,
                  fontSize: 9,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(240,237,232,0.55)",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 9 }}>📷</span>
                  <span style={{ fontFamily: "monospace", fontSize: 8 }}>
                    Image_Path
                  </span>
                </span>
                <span style={{ opacity: 0.4 }}>+</span>
              </div>
            </div>
          </PanelSection>

          <PanelSection label="Text Fields">
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {[
                { col: "Name", placed: true },
                { col: "Age", placed: false },
                { col: "Course", placed: false },
              ].map(({ col, placed }) => (
                <div
                  key={col}
                  style={{
                    padding: "4px 7px",
                    borderRadius: 6,
                    fontSize: 9,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: placed
                      ? "rgba(232,255,71,0.05)"
                      : "rgba(255,255,255,0.02)",
                    border: `1px solid ${placed ? "rgba(232,255,71,0.15)" : "rgba(255,255,255,0.06)"}`,
                    color: placed ? "#e8ff47" : "rgba(240,237,232,0.6)",
                    fontFamily: "monospace",
                  }}
                >
                  {`{{${col}}}`}
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 3 }}
                  >
                    {placed && (
                      <span
                        style={{
                          background: "rgba(232,255,71,0.15)",
                          color: "#e8ff47",
                          borderRadius: 3,
                          padding: "0 3px",
                          fontSize: 7,
                          fontWeight: 700,
                        }}
                      >
                        1
                      </span>
                    )}
                    <span style={{ opacity: 0.4, fontSize: 10 }}>+</span>
                  </span>
                </div>
              ))}
            </div>
          </PanelSection>
        </div>

        {/* CANVAS */}
        <div
          style={{
            flex: 1,
            background: "#07070e",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "37.5rem",
          }}
        >
          {/* dot grid */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.025) 1px,transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />

          {/* White canvas */}
          <div
            style={{
              margin: "3rem 3rem",
              width: 540,
              height: 304,
              background: "#ffffff",
              borderRadius: 3,
              position: "relative",
              overflow: "hidden",
              boxShadow:
                "0 20px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)",
            }}
          >
            {/* The selected {{Name}} field */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -55%)",
              }}
            >
              {/* Label tag above */}
              <div
                style={{
                  position: "absolute",
                  top: -19,
                  left: 0,
                  background: "#0c0c14",
                  border: "1px solid rgba(232,255,71,0.3)",
                  color: "#e8ff47",
                  fontSize: 8,
                  fontWeight: 700,
                  padding: "1px 5px",
                  borderRadius: 3,
                  whiteSpace: "nowrap",
                  fontFamily: "monospace",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                T {"{{Name}}"}
              </div>
              {/* Text element with selection outline */}
              <div
                style={{
                  position: "relative",
                  outline: "1.5px solid #e8ff47",
                  padding: "3px 8px",
                  cursor: "move",
                }}
              >
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
                    style={{
                      position: "absolute",
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: "#fff",
                      border: "1.5px solid #e8ff47",
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
            style={{
              position: "absolute",
              bottom: 14,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 20,
              background: "rgba(10,10,16,0.92)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(12px)",
            }}
          >
            {/* Batch stepper */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 8px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <span style={{ fontSize: 9, color: "rgba(240,237,232,0.35)" }}>
                ◂
              </span>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 1,
                  background: "rgba(240,237,232,0.3)",
                }}
              />
              <div style={{ lineHeight: 1.2 }}>
                <div
                  style={{
                    fontSize: 7,
                    fontWeight: 700,
                    color: "rgba(240,237,232,0.6)",
                  }}
                >
                  1 per page
                </div>
                <div style={{ fontSize: 6, color: "rgba(240,237,232,0.3)" }}>
                  3 pages total
                </div>
              </div>
              <span style={{ fontSize: 9, color: "rgba(240,237,232,0.35)" }}>
                ▸
              </span>
            </div>
            <div
              style={{
                width: 1,
                height: 24,
                background: "rgba(255,255,255,0.1)",
              }}
            />
            {/* Page nav */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {["⟨⟨", "‹"].map((btn, i) => (
                <button
                  key={i}
                  onClick={() => i === 1 && setRow((r) => Math.max(0, r - 1))}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 5,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color:
                      row === 0
                        ? "rgba(240,237,232,0.15)"
                        : "rgba(240,237,232,0.6)",
                    cursor: row === 0 ? "default" : "pointer",
                    fontSize: i === 0 ? 8 : 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {btn}
                </button>
              ))}
              <div style={{ textAlign: "center", minWidth: 80 }}>
                <div
                  style={{ fontSize: 10, fontWeight: 700, color: "#f0ede8" }}
                >
                  Page {row + 1}{" "}
                  <span style={{ color: "rgba(240,237,232,0.3)" }}>
                    / {sampleData.length}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: "rgba(240,237,232,0.35)",
                    marginTop: 1,
                  }}
                >
                  Rows {row + 1}–{row + 1} of {sampleData.length}
                </div>
              </div>
              {["›", "⟩⟩"].map((btn, i) => (
                <button
                  key={i}
                  onClick={() =>
                    i === 0 &&
                    setRow((r) => Math.min(sampleData.length - 1, r + 1))
                  }
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 5,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color:
                      row === sampleData.length - 1
                        ? "rgba(240,237,232,0.15)"
                        : "rgba(240,237,232,0.6)",
                    cursor:
                      row === sampleData.length - 1 ? "default" : "pointer",
                    fontSize: i === 1 ? 8 : 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>

          {/* Zoom controls */}
          <div
            style={{
              position: "absolute",
              bottom: 14,
              right: 14,
              display: "flex",
              flexDirection: "column",
              background: "rgba(10,10,16,0.92)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 9,
              overflow: "hidden",
            }}
          >
            {[
              { l: "+", h: 28, sz: 16 },
              { l: "100%", h: 20, sz: 7, y: true },
              { l: "−", h: 28, sz: 16 },
              { l: "⊡", h: 28, sz: 11 },
            ].map((z, i) => (
              <div
                key={i}
                style={{
                  width: 30,
                  height: z.h,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: z.sz,
                  fontWeight: z.y ? 700 : 400,
                  color: z.y ? "#e8ff47" : "rgba(240,237,232,0.5)",
                  borderBottom:
                    i < 3 ? "1px solid rgba(255,255,255,0.07)" : "none",
                }}
              >
                {z.l}
              </div>
            ))}
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 5,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 8,
              color: "rgba(240,237,232,0.08)",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            960×540px · 16:9 HD · 100%
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div
          style={{
            width: 196,
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            background: "#0e0e18",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            height: "37.5rem",
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
            {["LAYERS", "STYLE", "CANVAS"].map((tab) => (
              <div
                key={tab}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textAlign: "center" as const,
                  color: tab === "STYLE" ? "#e8ff47" : "rgba(240,237,232,0.28)",
                  borderBottom:
                    tab === "STYLE"
                      ? "2px solid #e8ff47"
                      : "2px solid transparent",
                }}
              >
                {tab}
              </div>
            ))}
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              padding: 10,
            }}
          >
            {/* Selected pill */}
            <div
              style={{
                padding: "5px 8px",
                borderRadius: 6,
                marginBottom: 10,
                background: "rgba(232,255,71,0.05)",
                border: "1px solid rgba(232,255,71,0.12)",
              }}
            >
              <p
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: "#e8ff47",
                  fontFamily: "monospace",
                  margin: 0,
                }}
              >
                T {"{{Name}}"}
              </p>
            </div>

            {/* Size & Position */}
            <RLabel>Size & Position</RLabel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 5,
                marginBottom: 10,
              }}
            >
              {[
                ["W", "329"],
                ["H", "76"],
                ["X", "463"],
                ["Y", "121"],
              ].map(([l, v]) => (
                <div key={l}>
                  <p
                    style={{
                      fontSize: 8,
                      color: "rgba(240,237,232,0.25)",
                      marginBottom: 3,
                    }}
                  >
                    {l}
                  </p>
                  <input
                    readOnly
                    value={v}
                    style={{
                      width: "100%",
                      padding: "4px 6px",
                      borderRadius: 5,
                      textAlign: "center" as const,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#f0ede8",
                      fontSize: 10,
                      fontFamily: "monospace",
                      outline: "none",
                      boxSizing: "border-box" as const,
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Layer order */}
            <RLabel>Layer Order</RLabel>
            <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
              {["↑ Fwd", "↓ Back"].map((b) => (
                <div
                  key={b}
                  style={{
                    flex: 1,
                    padding: "4px 0",
                    borderRadius: 5,
                    textAlign: "center" as const,
                    fontSize: 9,
                    fontWeight: 600,
                    color: "rgba(240,237,232,0.6)",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.09)",
                  }}
                >
                  {b}
                </div>
              ))}
            </div>

            {/* Row Offset */}
            <RLabel>Row Offset</RLabel>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginBottom: 10,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 7,
                padding: "4px 6px",
              }}
            >
              <div style={miniBtn}>−</div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  gap: 3,
                  justifyContent: "center",
                }}
              >
                {[-1, 0, 1].map((v) => (
                  <div
                    key={v}
                    style={{
                      padding: "2px 5px",
                      borderRadius: 4,
                      fontSize: 9,
                      fontWeight: 700,
                      background:
                        v === 0 ? "#e8ff47" : "rgba(255,255,255,0.05)",
                      color: v === 0 ? "#0a0a10" : "rgba(240,237,232,0.45)",
                    }}
                  >
                    {v === 0 ? "±0" : v > 0 ? `+${v}` : v}
                  </div>
                ))}
              </div>
              <div style={miniBtn}>+</div>
            </div>

            {/* Font */}
            <RLabel>Font</RLabel>
            <div
              style={{
                padding: "5px 8px",
                borderRadius: 6,
                marginBottom: 8,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: "'Merriweather', serif",
                fontSize: 11,
                color: "#f0ede8",
              }}
            >
              Merriweather <span style={{ fontSize: 9, opacity: 0.4 }}>▾</span>
            </div>

            {/* Font size */}
            <RLabel>Font Size</RLabel>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                marginBottom: 10,
              }}
            >
              <input
                type="range"
                min={8}
                max={80}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                style={{
                  flex: 1,
                  height: "3px",
                  accentColor: "#e8ff47",
                  minWidth: 0,
                }}
              />
              <span
                style={{
                  fontSize: 9,
                  color: "#e8ff47",
                  fontWeight: 700,
                  width: 28,
                  textAlign: "right" as const,
                }}
              >
                {fontSize}px
              </span>
            </div>

            {/* Alignment */}
            <RLabel>Alignment</RLabel>
            <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
              {[0, 1, 2, 3].map((ai) => (
                <div
                  key={ai}
                  style={{
                    flex: 1,
                    height: 28,
                    borderRadius: 5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      ai === 0
                        ? "rgba(232,255,71,0.15)"
                        : "rgba(255,255,255,0.04)",
                    border: `1px solid ${ai === 0 ? "rgba(232,255,71,0.35)" : "rgba(255,255,255,0.08)"}`,
                  }}
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
            <div style={{ display: "flex", gap: 5, marginBottom: 5 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 5,
                  background: color,
                  border: "1px solid rgba(255,255,255,0.12)",
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  flex: 1,
                  padding: "4px 7px",
                  borderRadius: 5,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#f0ede8",
                  fontSize: 10,
                  fontFamily: "monospace",
                }}
              >
                {color}
              </div>
            </div>
            <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
              {SWATCH_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 3,
                    background: c,
                    border: "none",
                    cursor: "pointer",
                    flexShrink: 0,
                    outline: color === c ? "2px solid #e8ff47" : "none",
                    outlineOffset: 1,
                  }}
                />
              ))}
            </div>

            {/* Style B / I */}
            <RLabel>Style</RLabel>
            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
              <button
                onClick={() => setBold((b) => !b)}
                style={{
                  flex: 1,
                  padding: "5px 0",
                  borderRadius: 5,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: bold
                    ? "rgba(232,255,71,0.12)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${bold ? "rgba(232,255,71,0.3)" : "rgba(255,255,255,0.08)"}`,
                  color: bold ? "#e8ff47" : "rgba(240,237,232,0.5)",
                }}
              >
                B
              </button>
              <button
                onClick={() => setItalic((b) => !b)}
                style={{
                  flex: 1,
                  padding: "5px 0",
                  borderRadius: 5,
                  fontSize: 12,
                  fontStyle: "italic",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: italic
                    ? "rgba(232,255,71,0.12)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${italic ? "rgba(232,255,71,0.3)" : "rgba(255,255,255,0.08)"}`,
                  color: italic ? "#e8ff47" : "rgba(240,237,232,0.5)",
                }}
              >
                I
              </button>
            </div>

            {/* Shadow toggle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <RLabel>Shadow</RLabel>
              <div
                style={{
                  width: 28,
                  height: 14,
                  borderRadius: 7,
                  background: "rgba(255,255,255,0.1)",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 1,
                    left: 1,
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "white",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }}
                />
              </div>
            </div>

            {/* Remove */}
            <div
              style={{
                padding: "6px 0",
                borderRadius: 6,
                textAlign: "center" as const,
                fontSize: 10,
                fontWeight: 600,
                background: "rgba(239,68,68,0.07)",
                border: "1px solid rgba(239,68,68,0.18)",
                color: "rgba(248,113,113,0.85)",
              }}
            >
              Remove object
            </div>
          </div>

          {/* Row data at bottom */}
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              padding: "8px 10px",
              flexShrink: 0,
            }}
          >
            <p
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: "rgba(240,237,232,0.25)",
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                marginBottom: 5,
              }}
            >
              Page {row + 1} · Rows {row + 1}–{row + 1}
            </p>
            {Object.entries(data).map(([k, v]) => (
              <div key={k} style={{ marginBottom: 3 }}>
                <span
                  style={{
                    fontSize: 8,
                    color: "rgba(240,237,232,0.22)",
                    fontFamily: "monospace",
                    display: "block",
                  }}
                >
                  {k}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    color: "rgba(240,237,232,0.65)",
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
      </div>
    </div>
  );
}

export default EditorPreview;

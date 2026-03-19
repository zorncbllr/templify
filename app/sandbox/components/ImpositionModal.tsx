import { useState, useRef, useEffect, useCallback } from "react";
import type {
  CanvasObject,
  CanvasSize,
  RowData,
  DataImageMap,
  ImpositionResult,
} from "../types/index";
import { SHEET_PRESETS } from "../types/constants";
import { runImpositionGA } from "../lib/impositionGA";
import { TemplateThumbnail } from "./TemplateThumbnail";
import { IconGrid, IconClose, IconArrowDown, IconRotate } from "@/components/Icons";

const PREVIEW_W = 520;
const MM_TO_PX = 2.835;

export function ImpositionModal({
  canvasSize,
  totalCards,
  objects,
  rows,
  pageIndex,
  dataImages,
  exportFormat,
  onExportFormatChange,
  onExport,
  exportProgress,
  onClose,
}: {
  canvasSize: CanvasSize;
  totalCards: number;
  objects: CanvasObject[];
  rows: RowData[];
  pageIndex: number;
  dataImages: DataImageMap;
  exportFormat: string;
  onExportFormatChange: (f: string) => void;
  onExport: (layout: ImpositionResult, sheet: { w: number; h: number }) => void;
  exportProgress: number | null;
  onClose: () => void;
}) {
  const customSheet = {
    label: "Default",
    w: canvasSize.width,
    h: canvasSize.height,
  };
  const [selectedSheet, setSelectedSheet] = useState(customSheet);
  const [allowRotation, setAllowRotation] = useState(true);
  const [minBleedMm, setMinBleedMm] = useState(3);
  const [gaRunning, setGaRunning] = useState(false);
  const [gaGen, setGaGen] = useState(0);
  const [bestResult, setBestResult] = useState<ImpositionResult | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const isCustomSheet = selectedSheet.label === "Default";
  const minBleedPx = Math.round(minBleedMm * MM_TO_PX);
  const totalPages = bestResult
    ? Math.ceil(totalCards / bestResult.count)
    : null;

  const runGA = useCallback(() => {
    if (stopRef.current) stopRef.current();

    // Default sheet matches the template exactly — skip GA, just 1 card per sheet.
    if (isCustomSheet) {
      setBestResult({
        gene: {
          marginTop: 0,
          marginRight: 0,
          marginBottom: 0,
          marginLeft: 0,
          gapX: 0,
          gapY: 0,
          rotation: 0,
        },
        cols: 1,
        rows: 1,
        count: 1,
        wastePercent: 0,
        cutLines: 0,
        fitness: 1,
        cardW: canvasSize.width,
        cardH: canvasSize.height,
        printAreaW: canvasSize.width,
        printAreaH: canvasSize.height,
        offsetX: 0,
        offsetY: 0,
      });
      setGaRunning(false);
      setGaGen(0);
      return;
    }

    setGaRunning(true);
    setGaGen(0);
    const stop = runImpositionGA({
      cardW: canvasSize.width,
      cardH: canvasSize.height,
      sheetW: selectedSheet.w,
      sheetH: selectedSheet.h,
      minBleedPx,
      allowRotation,
      onProgress: (best, gen, done) => {
        setBestResult(best);
        setGaGen(gen);
        if (done) {
          setGaRunning(false);
          stopRef.current = null;
        }
      },
    });
    stopRef.current = stop;
  }, [canvasSize, selectedSheet, isCustomSheet, minBleedPx, allowRotation]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runGA();
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [runGA]);

  useEffect(() => {
    return () => {
      if (stopRef.current) stopRef.current();
    };
  }, []);

  const previewScale = PREVIEW_W / selectedSheet.w;
  const previewH = Math.round(selectedSheet.h * previewScale);
  const cardPreviewW = bestResult
    ? Math.round(bestResult.cardW * previewScale)
    : Math.round(canvasSize.width * previewScale);
  const cardPreviewH = bestResult
    ? Math.round(bestResult.cardH * previewScale)
    : Math.round(canvasSize.height * previewScale);
  const gapPreviewX = bestResult
    ? Math.round(bestResult.gene.gapX * previewScale)
    : 3;
  const gapPreviewY = bestResult
    ? Math.round(bestResult.gene.gapY * previewScale)
    : 3;
  const offsetPreviewX = bestResult
    ? Math.round(bestResult.offsetX * previewScale)
    : 5;
  const offsetPreviewY = bestResult
    ? Math.round(bestResult.offsetY * previewScale)
    : 5;
  const isRotated = bestResult?.gene.rotation === 1;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.82)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#12121c",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 16,
          padding: 24,
          width: "fit-content",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          gap: 0,
          boxShadow: "0 40px 120px rgba(0,0,0,0.8)",
          animation: "popIn 0.18s ease",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: "rgba(232,255,71,0.12)",
                border: "1px solid rgba(232,255,71,0.3)",
                borderRadius: 9,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
              }}
            >
              <IconGrid size={15} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#f0ede8",
                  letterSpacing: "-0.02em",
                }}
              >
                Print Imposition & Export
              </h2>
              <p
                style={{
                  fontSize: 10,
                  color: "rgba(240,237,232,0.35)",
                  marginTop: 1,
                }}
              >
                GA-optimized card layout on print sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "rgba(240,237,232,0.3)",
              fontSize: 18,
              cursor: "pointer",
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
            }}
          >
            <IconClose size={14} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 20, flex: 1, overflow: "hidden" }}>
          {/* Left controls */}
          <div
            style={{
              width: 220,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              overflowY: "auto",
            }}
          >
            {/* Sheet size dropdown */}
            <div>
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
                Sheet Size
              </p>
              <select
                value={selectedSheet.label}
                onChange={(e) => {
                  const label = e.target.value;
                  if (label === "Default") {
                    setSelectedSheet(customSheet);
                  } else {
                    const preset = SHEET_PRESETS.find((s) => s.label === label);
                    if (preset) setSelectedSheet(preset);
                  }
                }}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "#1a1a28",
                  color: "#f0ede8",
                  appearance: "auto",
                }}
              >
                <option value="Default">
                  Default ({customSheet.w}×{customSheet.h})
                </option>
                <optgroup label="ISO A Series">
                  {SHEET_PRESETS.filter((s) => s.label.startsWith("A")).map((s) => (
                    <option key={s.label} value={s.label}>
                      {s.label} ({s.w}×{s.h})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="ISO B Series">
                  {SHEET_PRESETS.filter((s) => s.label.startsWith("B")).map((s) => (
                    <option key={s.label} value={s.label}>
                      {s.label} ({s.w}×{s.h})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="US / North American">
                  {SHEET_PRESETS.filter((s) =>
                    ["Letter", "Legal", "Tabloid", "Executive"].includes(s.label)
                  ).map((s) => (
                    <option key={s.label} value={s.label}>
                      {s.label} ({s.w}×{s.h})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Square / Specialty">
                  {SHEET_PRESETS.filter((s) => s.label.startsWith("Square")).map((s) => (
                    <option key={s.label} value={s.label}>
                      {s.label} ({s.w}×{s.h})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Min bleed */}
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
                    fontSize: 9,
                    fontWeight: 700,
                    color: "rgba(240,237,232,0.28)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Min Bleed Gap
                </p>
                <span
                  style={{ fontSize: 9, color: "#e8ff47", fontWeight: 700 }}
                >
                  {minBleedMm}mm
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={minBleedMm}
                onChange={(e) => setMinBleedMm(Number(e.target.value))}
                style={{ width: "100%", height: "3px", accentColor: "#e8ff47" }}
              />
              <div style={{ display: "flex", gap: 4, marginTop: 7 }}>
                {[0, 2, 3, 5, 8].map((v) => (
                  <button
                    key={v}
                    onClick={() => setMinBleedMm(v)}
                    style={{
                      flex: 1,
                      padding: "4px 2px",
                      borderRadius: 5,
                      fontSize: 9,
                      fontWeight: 700,
                      cursor: "pointer",
                      border: "none",
                      background:
                        minBleedMm === v
                          ? "rgba(232,255,71,0.15)"
                          : "rgba(255,255,255,0.05)",
                      color:
                        minBleedMm === v ? "#e8ff47" : "rgba(240,237,232,0.4)",
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Card info */}
            <div
              style={{
                padding: "9px 10px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
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
                Card
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span
                    style={{ fontSize: 9, color: "rgba(240,237,232,0.35)" }}
                  >
                    Size
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: "#f0ede8",
                      fontFamily: "monospace",
                    }}
                  >
                    {canvasSize.width}×{canvasSize.height}px
                  </span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span
                    style={{ fontSize: 9, color: "rgba(240,237,232,0.35)" }}
                  >
                    Total cards
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: "#f0ede8",
                      fontFamily: "monospace",
                    }}
                  >
                    {totalCards || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Optimized Result */}
            {bestResult && bestResult.count > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "rgba(240,237,232,0.28)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Optimized Result
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 6,
                  }}
                >
                  {[
                    [
                      "Cards / sheet",
                      `${bestResult.count} (${bestResult.cols}×${bestResult.rows})`,
                      "#e8ff47",
                    ],
                    [
                      "Paper waste",
                      `${bestResult.wastePercent.toFixed(1)}%`,
                      bestResult.wastePercent < 20
                        ? "#4ade80"
                        : bestResult.wastePercent < 40
                          ? "#f6ad55"
                          : "#f87171",
                    ],
                    [
                      "Total sheets",
                      totalCards
                        ? `${Math.ceil(totalCards / bestResult.count)} sheets`
                        : "—",
                      "rgba(240,237,232,0.7)",
                    ],
                    [
                      "Gap H/V",
                      `${bestResult.gene.gapX}×${bestResult.gene.gapY}px`,
                      "rgba(240,237,232,0.5)",
                    ],
                  ].map(([label, value, color]) => (
                    <div
                      key={label as string}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 8,
                          color: "rgba(240,237,232,0.3)",
                          marginBottom: 3,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {label}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: color as string,
                        }}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    padding: "9px 12px",
                    borderRadius: 8,
                    background: "rgba(232,255,71,0.04)",
                    border: "1px solid rgba(232,255,71,0.15)",
                  }}
                >
                  <p
                    style={{
                      fontSize: 9,
                      color: "rgba(240,237,232,0.4)",
                      lineHeight: 1.6,
                    }}
                  >
                    Margins: T{bestResult.gene.marginTop} R
                    {bestResult.gene.marginRight} B
                    {bestResult.gene.marginBottom} L{bestResult.gene.marginLeft}
                    px
                    {bestResult.gene.rotation === 1 && (
                      <span style={{ color: "#63b3ed" }}>
                        {" "}
                        · Cards rotated 90°
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ) : gaRunning ? (
              <div
                style={{
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    border: "2px solid rgba(232,255,71,0.2)",
                    borderTop: "2px solid #e8ff47",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
                <p style={{ fontSize: 10, color: "rgba(240,237,232,0.3)" }}>
                  Optimizing… gen {gaGen}/200
                </p>
              </div>
            ) : null}

            {/* Export */}
            <div
              style={{
                padding: "12px",
                borderRadius: 10,
                background: "rgba(232,255,71,0.04)",
                border: "1px solid rgba(232,255,71,0.18)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginTop: "auto",
              }}
            >
              <p
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "rgba(240,237,232,0.28)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Export
              </p>
              <div style={{ display: "flex", gap: 4 }}>
                {["PNG", "PDF"].map((f) => (
                  <button
                    key={f}
                    onClick={() => onExportFormatChange(f)}
                    style={{
                      flex: 1,
                      padding: "5px 0",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                      border: `1px solid ${exportFormat === f ? "rgba(232,255,71,0.4)" : "rgba(255,255,255,0.08)"}`,
                      background:
                        exportFormat === f
                          ? "rgba(232,255,71,0.12)"
                          : "rgba(255,255,255,0.04)",
                      color:
                        exportFormat === f
                          ? "#e8ff47"
                          : "rgba(240,237,232,0.4)",
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button
                onClick={() => bestResult && onExport(bestResult, { w: selectedSheet.w, h: selectedSheet.h })}
                disabled={exportProgress !== null || !bestResult}
                style={{
                  width: "100%",
                  padding: "9px 0",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: exportProgress !== null ? "not-allowed" : "pointer",
                  background: exportProgress !== null ? "#b8cc38" : "#e8ff47",
                  border: "none",
                  color: "#0a0a10",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  opacity: exportProgress !== null ? 0.7 : 1,
                }}
              >
                {exportProgress !== null ? (
                  <>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        border: "1.5px solid rgba(0,0,0,0.2)",
                        borderTop: "1.5px solid rgba(0,0,0,0.7)",
                        borderRadius: "50%",
                        animation: "spin 0.6s linear infinite",
                      }}
                    />
                    <span>Exporting… {exportProgress}%</span>
                  </>
                ) : (
                  <>
                    <IconArrowDown size={12} />
                    <span>
                      Export {exportFormat}
                      {totalCards > 1 ? ` · ${totalCards} records` : ""}
                    </span>
                  </>
                )}
              </button>
              {exportProgress !== null && (
                <div
                  style={{
                    height: 3,
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
              )}
            </div>
          </div>

          {/* Right preview */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              overflow: "auto",
            }}
          >
            <div>
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
                Sheet Preview
              </p>
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
              >
                <div
                  style={{
                    position: "relative",
                    width: PREVIEW_W,
                    height: previewH,
                    background: "#fff",
                    borderRadius: 4,
                    boxShadow:
                      "0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)",
                    flexShrink: 0,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage:
                        "repeating-linear-gradient(45deg, rgba(0,0,0,0.015) 0px, rgba(0,0,0,0.015) 1px, transparent 1px, transparent 8px)",
                      backgroundSize: "8px 8px",
                    }}
                  />

                  {bestResult &&
                    bestResult.count > 0 &&
                    Array.from({
                      length: bestResult.cols * bestResult.rows,
                    }).map((_, i) => {
                      const col = i % bestResult.cols;
                      const row = Math.floor(i / bestResult.cols);
                      const x =
                        offsetPreviewX + col * (cardPreviewW + gapPreviewX);
                      const y =
                        offsetPreviewY + row * (cardPreviewH + gapPreviewY);
                      const hasRecord = totalCards === 0 || i < totalCards;
                      return (
                        <div
                          key={i}
                          style={{
                            position: "absolute",
                            left: x,
                            top: y,
                            width: cardPreviewW,
                            height: cardPreviewH,
                            overflow: "hidden",
                            boxShadow: hasRecord
                              ? "0 0 0 0.5px rgba(232,255,71,0.5)"
                              : "0 0 0 0.5px rgba(255,255,255,0.12)",
                          }}
                        >
                          {hasRecord && objects.length > 0 ? (
                            <TemplateThumbnail
                              objects={objects}
                              canvasSize={canvasSize}
                              rows={rows}
                              pageIndex={i % Math.max(1, rows.length)}
                              dataImages={dataImages}
                              width={cardPreviewW}
                              height={cardPreviewH}
                              rotate={isRotated}
                            />
                          ) : hasRecord ? (
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                background: "rgba(232,255,71,0.18)",
                                border: "1px solid rgba(232,255,71,0.6)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: Math.min(8, cardPreviewH * 0.25),
                                  color: "rgba(0,0,0,0.3)",
                                  fontWeight: 700,
                                }}
                              >
                                {isRotated ? <IconRotate size={Math.min(8, cardPreviewH * 0.25)} /> : ""}
                              </span>
                            </div>
                          ) : (
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                background: "rgba(255,255,255,0.03)",
                                border: "1px dashed rgba(255,255,255,0.1)",
                              }}
                            />
                          )}
                        </div>
                      );
                    })}

                  {/* Cut lines */}
                  {bestResult &&
                    bestResult.cols > 1 &&
                    bestResult.rows > 0 &&
                    Array.from({ length: bestResult.cols - 1 }).map((_, i) => {
                      const x =
                        offsetPreviewX +
                        (i + 1) * cardPreviewW +
                        i * gapPreviewX +
                        Math.round(gapPreviewX / 2);
                      return (
                        <div
                          key={`v${i}`}
                          style={{
                            position: "absolute",
                            left: x,
                            top: 0,
                            width: 1,
                            height: "100%",
                            background: "rgba(99,179,237,0.4)",
                            pointerEvents: "none",
                          }}
                        />
                      );
                    })}
                  {bestResult &&
                    bestResult.rows > 1 &&
                    bestResult.cols > 0 &&
                    Array.from({ length: bestResult.rows - 1 }).map((_, i) => {
                      const y =
                        offsetPreviewY +
                        (i + 1) * cardPreviewH +
                        i * gapPreviewY +
                        Math.round(gapPreviewY / 2);
                      return (
                        <div
                          key={`h${i}`}
                          style={{
                            position: "absolute",
                            left: 0,
                            top: y,
                            width: "100%",
                            height: 1,
                            background: "rgba(99,179,237,0.4)",
                            pointerEvents: "none",
                          }}
                        />
                      );
                    })}

                  {gaRunning && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        background: bestResult
                          ? "rgba(18,18,28,0.55)"
                          : "rgba(18,18,28,0.96)",
                        backdropFilter: "blur(1px)",
                        transition: "background 0.2s",
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          border: "2.5px solid rgba(232,255,71,0.15)",
                          borderTop: "2.5px solid #e8ff47",
                          borderRadius: "50%",
                          animation: "spin 0.65s linear infinite",
                        }}
                      />
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          color: "rgba(232,255,71,0.7)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        gen {gaGen} / 200
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

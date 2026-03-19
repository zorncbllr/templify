"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type {
  CanvasObject,
  CanvasSize,
  RowData,
  DataImageMap,
  ImageObject,
  TextField,
  ImpositionResult,
} from "./types/index";
import {
  DEFAULT_SHADOW,
  DEFAULT_BORDER,
  SCALE_PRESETS,
  IMAGE_EXTS,
  PLACEHOLDER_SRC,
} from "./types/constants";
import {
  parseSpreadsheet,
  detectImageColumns,
  normalizeImageKey,
} from "./utils/data";
import { exportRecords } from "./utils/export";
import { LayerItem, DimensionInputs } from "./components/LayerItem";
import { ZoomControls, FloatingPageNav, KbdHint } from "./components/Controls";
import { ShadowPanel, BorderPanel } from "./components/StylePanels";
import { ImpositionModal } from "./components/ImpositionModal";
import { useUndoRedo } from "./hooks/useUndoRedo";
import { ImageEl, TextEl } from "./components/CanvasObjects";
import { DataImageInfo, DataImagesPanel } from "./components/DataPanel";
import { FontPicker } from "./components/FontPicker";

// ─── Unified undo state ───────────────────────────────────────────────────────
// Keeping canvasSize alongside objects means a single undo/redo call restores
// both the layout AND the canvas dimensions together — no drift.
interface EditorState {
  objects: CanvasObject[];
  canvasSize: CanvasSize;
}

// ─── Proportional remapping helper ───────────────────────────────────────────
// When the canvas is resized (e.g. a new background image is dropped in, or the
// user edits W/H directly), every non-background object should stay "in the same
// relative position" on the new canvas.
function remapObjects(
  objects: CanvasObject[],
  oldSize: CanvasSize,
  newSize: CanvasSize,
): CanvasObject[] {
  if (oldSize.width === newSize.width && oldSize.height === newSize.height)
    return objects;

  const rx = newSize.width / Math.max(1, oldSize.width);
  const ry = newSize.height / Math.max(1, oldSize.height);

  return objects.map((o) => {
    // Background images are pinned to 0,0 and sized to fill the canvas —
    // they don't need remapping (their render size is derived elsewhere).
    if (o.kind === "image" && (o as ImageObject).isBackground) return o;

    return {
      ...o,
      x: Math.round(o.x * rx),
      y: Math.round(o.y * ry),
      width: Math.round(o.width * rx),
      height: Math.round(o.height * ry),
      // Keep fontSize proportional for text fields (use the average scale so
      // text doesn't blow up on very non-uniform resizes).
      ...(o.kind === "field"
        ? {
            fontSize: Math.max(
              6,
              Math.round((o as TextField).fontSize * ((rx + ry) / 2)),
            ),
          }
        : {}),
    } as CanvasObject;
  });
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

const TEXT_COLORS = [
  "#1a1a1a",
  "#ffffff",
  "#e8ff47",
  "#4a90e2",
  "#e74c3c",
  "#2ecc71",
  "#f59e0b",
  "#8b5cf6",
];

export default function TemplifyEditor() {
  const [mounted, setMounted] = useState(false);

  // ─── Unified undo/redo for objects + canvasSize ───────────────────────────
  const {
    state: editorState,
    setState: setEditorStateRaw,
    undo,
    redo,
    undoRef,
    redoRef,
    canUndo,
    canRedo,
  } = useUndoRedo<EditorState>({
    objects: [],
    canvasSize: { width: 960, height: 540 },
  });

  // Convenience destructure — read-only; always mutate via setEditorState.
  const objects = editorState.objects;
  const canvasSize = editorState.canvasSize;

  // Wrap the raw setter so callers don't have to think about the shape.
  // `live` = true → no undo snapshot (e.g. mid-drag); false (default) → snapshot.
  const setEditorState = useCallback(
    (
      updater: EditorState | ((prev: EditorState) => EditorState),
      live = false,
    ) => {
      setEditorStateRaw(updater as any, !live);
    },
    [setEditorStateRaw],
  );

  // Helpers that touch only one slice, kept for readability.
  const setObjects = useCallback(
    (
      u: CanvasObject[] | ((prev: CanvasObject[]) => CanvasObject[]),
      live = false,
    ) => {
      setEditorState(
        (prev) => ({
          ...prev,
          objects: typeof u === "function" ? u(prev.objects) : u,
        }),
        live,
      );
    },
    [setEditorState],
  );

  const setCanvasSize = useCallback(
    (newSize: CanvasSize, live = false) => {
      setEditorState((prev) => ({ ...prev, canvasSize: newSize }), live);
    },
    [setEditorState],
  );

  // ─── Multi-select state ───────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [primaryId, setPrimaryId] = useState<number | null>(null);
  const selectedIdsRef = useRef<Set<number>>(new Set());
  const primaryIdRef = useRef<number | null>(null);
  selectedIdsRef.current = selectedIds;
  primaryIdRef.current = primaryId;

  const selectOne = useCallback((id: number | null) => {
    if (id === null) {
      setSelectedIds(new Set());
      setPrimaryId(null);
    } else {
      setSelectedIds(new Set([id]));
      setPrimaryId(id);
    }
  }, []);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPrimaryId(id);
  }, []);

  const rangeSelect = useCallback((id: number, sorted: CanvasObject[]) => {
    const ids = sorted.map((o) => o.id);
    const anchor = primaryIdRef.current ?? id;
    const a = ids.indexOf(anchor);
    const b = ids.indexOf(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (a === -1 || b === -1) {
        next.add(id);
      } else {
        const lo = Math.min(a, b),
          hi = Math.max(a, b);
        for (let i = lo; i <= hi; i++) next.add(ids[i]);
      }
      return next;
    });
    setPrimaryId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setPrimaryId(null);
  }, []);

  // ─── Other state ──────────────────────────────────────────────────────────
  const [clipboard, setClipboard] = useState<CanvasObject | null>(null);
  const [canvasScale, setCanvasScale] = useState<number>(1.0);
  const [showImpositionModal, setShowImpositionModal] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [exportFormat, setExportFormat] = useState("PNG");
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
  const [dataImages, setDataImages] = useState<DataImageMap>({});
  const [dataImagesLabel, setDataImagesLabel] = useState<string | null>(null);
  const [dataImagesLoading, setDataImagesLoading] = useState(false);
  const [autoDetectedImageColumns, setAutoDetectedImageColumns] = useState<
    string[]
  >([]);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const nextZ = useRef(100);

  const totalPages = rows.length;
  const currentRow = useMemo(() => {
    if (rows.length === 0) return null;
    return rows[Math.min(pageIndex, rows.length - 1)];
  }, [rows, pageIndex]);

  const effectiveCanvasSize = useMemo(() => {
    const w = Math.round(canvasSize.width * canvasScale);
    const h = Math.round(canvasSize.height * canvasScale);
    return {
      width: isFinite(w) && w > 0 ? w : 960,
      height: isFinite(h) && h > 0 ? h : 540,
    };
  }, [canvasSize, canvasScale]);

  // ─── Derived selection helpers ────────────────────────────────────────────
  const primaryObj = useMemo(
    () =>
      primaryId != null
        ? (objects.find((o) => o.id === primaryId) ?? null)
        : null,
    [objects, primaryId],
  );
  const selectedObjs = useMemo(
    () => objects.filter((o) => selectedIds.has(o.id)),
    [objects, selectedIds],
  );
  const selectedId = primaryId;
  const selectedObj = primaryObj;
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

  const allText =
    selectedObjs.length > 0 && selectedObjs.every((o) => o.kind === "field");
  const allImages =
    selectedObjs.length > 0 &&
    selectedObjs.every(
      (o) => o.kind === "image" && !(o as ImageObject).isBackground,
    );
  const multiSelected = selectedIds.size > 1;
  const anySelected = selectedIds.size > 0;

  const clipboardRef = useRef<CanvasObject | null>(null);
  const objectsRef = useRef<CanvasObject[]>([]);
  clipboardRef.current = clipboard;
  objectsRef.current = objects;

  // Keep a ref to the latest canvasSize for use inside callbacks that close
  // over stale values (e.g. keyboard handler).
  const canvasSizeRef = useRef<CanvasSize>(canvasSize);
  canvasSizeRef.current = canvasSize;

  // ─── Viewport ─────────────────────────────────────────────────────────────
  const computeFitZoom = useCallback(() => {
    if (!canvasAreaRef.current) return 1;
    const rect = canvasAreaRef.current.getBoundingClientRect();
    return Math.min(
      1,
      (rect.width - 80) / effectiveCanvasSize.width,
      (rect.height - 80) / effectiveCanvasSize.height,
    );
  }, [effectiveCanvasSize]);

  const fitToScreen = useCallback(() => {
    const z = computeFitZoom();
    setZoom(z);
    setPanX(0);
    setPanY(0);
  }, [computeFitZoom]);

  useEffect(() => {
    if (mounted) fitToScreen();
  }, [effectiveCanvasSize, mounted]);

  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.08 : -0.08;
        setZoom((z) => Math.min(4, Math.max(0.1, z + delta)));
      } else {
        setPanX((p) => p - e.deltaX);
        setPanY((p) => p - e.deltaY);
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [mounted]);

  const spaceHeld = useRef(false);
  const [panCursor, setPanCursor] = useState(false);
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.code === "Space" && !spaceHeld.current) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        spaceHeld.current = true;
        setPanCursor(true);
        e.preventDefault();
      }
    };
    const ku = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeld.current = false;
        setPanCursor(false);
        isPanning.current = false;
      }
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, []);

  const startPan = useCallback(
    (clientX: number, clientY: number) => {
      isPanning.current = true;
      panStart.current = { x: clientX, y: clientY, px: panX, py: panY };
      const mv = (e: MouseEvent) => {
        if (!isPanning.current) return;
        setPanX(panStart.current.px + (e.clientX - panStart.current.x));
        setPanY(panStart.current.py + (e.clientY - panStart.current.y));
      };
      const up = () => {
        isPanning.current = false;
        window.removeEventListener("mousemove", mv);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", mv);
      window.addEventListener("mouseup", up);
    },
    [panX, panY],
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        startPan(e.clientX, e.clientY);
      }
    },
    [startPan],
  );

  const handleSpacePanStart = useCallback(
    (e: React.MouseEvent) => {
      if (!spaceHeld.current) return;
      e.preventDefault();
      e.stopPropagation();
      startPan(e.clientX, e.clientY);
    },
    [startPan],
  );

  const handleZoomDelta = useCallback((delta: number) => {
    setZoom((z) =>
      Math.min(4, Math.max(0.1, Math.round((z + delta) * 10) / 10)),
    );
  }, []);

  useEffect(() => {
    if (totalPages > 0 && pageIndex >= totalPages) setPageIndex(totalPages - 1);
  }, [totalPages, pageIndex]);
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

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
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
      if (ctrl && e.key === "=") {
        e.preventDefault();
        setZoom((z) => Math.min(4, z + 0.1));
        return;
      }
      if (ctrl && e.key === "-") {
        e.preventDefault();
        setZoom((z) => Math.max(0.1, z - 0.1));
        return;
      }
      if (ctrl && e.key === "0") {
        e.preventDefault();
        fitToScreen();
        return;
      }

      if (ctrl && e.key === "a") {
        e.preventDefault();
        const nonBg = objectsRef.current.filter(
          (o) => !(o.kind === "image" && (o as ImageObject).isBackground),
        );
        if (nonBg.length > 0) {
          setSelectedIds(new Set(nonBg.map((o) => o.id)));
          setPrimaryId(nonBg[0].id);
          setRightTab("style");
        }
        return;
      }

      if (e.key === "Escape") {
        clearSelection();
        return;
      }

      const ids = selectedIdsRef.current;
      const pid = primaryIdRef.current;
      const selObjs = objectsRef.current.filter((o) => ids.has(o.id));
      const selObj = objectsRef.current.find((o) => o.id === pid) ?? null;

      if ((e.key === "Delete" || e.key === "Backspace") && ids.size > 0) {
        e.preventDefault();
        setObjects((p) => p.filter((o) => !ids.has(o.id)));
        clearSelection();
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
        selectOne(n.id);
        return;
      }
      if (ctrl && e.key === "d" && selObjs.length > 0) {
        e.preventDefault();
        const dupes: CanvasObject[] = selObjs.map((o) => ({
          ...o,
          id: Date.now() + Math.random(),
          x: o.x + 20,
          y: o.y + 20,
          zIndex: nextZ.current++,
        }));
        setObjects((p) => [...p, ...dupes]);
        setSelectedIds(new Set(dupes.map((d) => d.id)));
        setPrimaryId(dupes[dupes.length - 1].id);
        return;
      }
      if (ctrl && e.key === "b") {
        e.preventDefault();
        setObjects((p) =>
          p.map((o) =>
            ids.has(o.id) && o.kind === "field"
              ? ({ ...o, bold: !(o as TextField).bold } as CanvasObject)
              : o,
          ),
        );
        return;
      }
      if (ctrl && e.key === "i") {
        e.preventDefault();
        setObjects((p) =>
          p.map((o) =>
            ids.has(o.id) && o.kind === "field"
              ? ({ ...o, italic: !(o as TextField).italic } as CanvasObject)
              : o,
          ),
        );
        return;
      }
      if (
        ids.size > 0 &&
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
            ids.has(o.id)
              ? ({ ...o, x: o.x + dx, y: o.y + dy } as CanvasObject)
              : o,
          ),
        );
      }
    };
    window.addEventListener("keydown", dn, { capture: true });
    return () => window.removeEventListener("keydown", dn, { capture: true });
  }, [fitToScreen, clearSelection, selectOne]);

  // ─── Object mutations ─────────────────────────────────────────────────────
  const addDataPhotoObjectRef = useRef<(column: string) => void>(() => {});
  const addDataPhotoObject = useCallback(
    (column: string) => {
      const W = Math.round(canvasSize.width * 0.3);
      const H = Math.round(W * 1.2);
      const existing = objectsRef.current.filter(
        (o) =>
          o.kind === "image" &&
          (o as ImageObject).isDataImage &&
          (o as ImageObject).dataImageColumn === column,
      );
      const obj: ImageObject = {
        kind: "image",
        id: Date.now(),
        src: PLACEHOLDER_SRC,
        name: `Photo · ${column}`,
        x: Math.round((canvasSize.width - W) / 2) + existing.length * 20,
        y: Math.round((canvasSize.height - H) / 2) + existing.length * 20,
        width: W,
        height: H,
        zIndex: nextZ.current++,
        opacity: 1,
        shadow: { ...DEFAULT_SHADOW },
        border: { ...DEFAULT_BORDER },
        borderRadius: 0,
        isBackground: false,
        naturalWidth: W,
        naturalHeight: H,
        isDataImage: true,
        dataImageColumn: column,
        columnOffset: 0,
      };
      setObjects((p) => [...p, obj]);
      selectOne(obj.id);
      setRightTab("style");
    },
    [canvasSize, setObjects, selectOne],
  );
  addDataPhotoObjectRef.current = addDataPhotoObject;

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
      const imgCols = detectImageColumns(rd, cols);
      setAutoDetectedImageColumns(imgCols);
      setColumns(cols);
      setRows(rd);
      setDataFileName(file.name);
      setPageIndex(0);
      setObjects((p) =>
        p.filter(
          (o) => o.kind !== "field" || cols.includes((o as TextField).column),
        ),
      );
      if (imgCols.length > 0) {
        setTimeout(() => {
          imgCols.forEach((col) => {
            const alreadyPlaced = objectsRef.current.some(
              (o) =>
                o.kind === "image" &&
                (o as ImageObject).isDataImage &&
                (o as ImageObject).dataImageColumn === col,
            );
            if (!alreadyPlaced) addDataPhotoObjectRef.current(col);
          });
        }, 0);
      }
    } catch (err: any) {
      setDataError(`Parse error: ${err?.message || "Unknown"}`);
    }
    setDataLoading(false);
  };

  const handleDataImagesUpload = useCallback(async (files: FileList) => {
    const imageFiles = Array.from(files).filter(
      (f) => IMAGE_EXTS.test(f.name) || f.type.startsWith("image/"),
    );
    if (!imageFiles.length) return;
    setDataImagesLoading(true);
    const map: DataImageMap = {};
    await Promise.all(
      imageFiles.map(
        (f) =>
          new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target?.result as string;
              map[f.name.toLowerCase()] = src;
              map[normalizeImageKey(f.name)] = src;
              resolve();
            };
            reader.readAsDataURL(f);
          }),
      ),
    );
    setDataImages(map);
    setDataImagesLabel(
      `${imageFiles.length} photo${imageFiles.length === 1 ? "" : "s"}`,
    );
    setDataImagesLoading(false);
  }, []);

  // ─── addImage ─────────────────────────────────────────────────────────────
  // When a new background image is added we:
  //   1. Compute the new canvas size from the image dimensions.
  //   2. Remap all existing non-background objects proportionally.
  //   3. Commit everything as a single undoable snapshot.
  const addImage = useCallback(
    (src: string, name: string, nw: number, nh: number) => {
      const MAX = 2000,
        s = Math.min(1, MAX / nw, MAX / nh);
      const newW = Math.round(nw * s),
        newH = Math.round(nh * s);
      const newSize: CanvasSize = { width: newW, height: newH };

      setEditorState((prev) => {
        // Replace old background, remap every other object to the new canvas.
        const withoutBg = prev.objects.filter(
          (o) => !(o.kind === "image" && (o as ImageObject).isBackground),
        );
        const remapped = remapObjects(withoutBg, prev.canvasSize, newSize);

        const bgObj: ImageObject = {
          kind: "image",
          id: Date.now(),
          src,
          name,
          x: 0,
          y: 0,
          width: newW,
          height: newH,
          zIndex: nextZ.current++,
          opacity: 1,
          shadow: { ...DEFAULT_SHADOW },
          border: { ...DEFAULT_BORDER },
          borderRadius: 0,
          isBackground: true,
          naturalWidth: nw,
          naturalHeight: nh,
          isDataImage: false,
          dataImageColumn: "",
          columnOffset: 0,
        };

        return { objects: [...remapped, bgObj], canvasSize: newSize };
      });

      // Select the new background after the state settles.
      // We can't read the new id synchronously, so we defer selection to the
      // next tick after React flushes.
      setTimeout(() => {
        const bg = objectsRef.current.find(
          (o) => o.kind === "image" && (o as ImageObject).isBackground,
        );
        if (bg) {
          selectOne(bg.id);
          setRightTab("style");
        }
      }, 0);
    },
    [setEditorState, selectOne],
  );

  // ─── updateBgDimension ────────────────────────────────────────────────────
  // User manually edits the W or H of the background image (= canvas size).
  // We scale the new dimension while preserving aspect ratio, then remap all
  // other objects to fit the new canvas.
  // updateBgDimension receives values already in BASE pixels (unscaled).
  // The caller (styleApplyPrimary) is responsible for dividing by canvasScale.
  const updateBgDimension = useCallback(
    (axis: "width" | "height", newVal: number) => {
      if (!newVal || !isFinite(newVal) || newVal < 1) return;
      const sid = primaryIdRef.current;
      if (sid === null) return;

      setEditorState((prev) => {
        const target = prev.objects.find((o) => o.id === sid);
        if (!target) return prev;

        const img = target as ImageObject;

        // ── Non-background image: just resize that object, no canvas change ──
        if (!img.isBackground) {
          const ar = img.width / Math.max(1, img.height);
          let newW = img.width,
            newH = img.height;
          if (axis === "width") {
            newW = newVal;
            newH = Math.round(newVal / ar);
          } else {
            newH = newVal;
            newW = Math.round(newVal * ar);
          }
          if (!isFinite(newH) || newH < 1 || !isFinite(newW) || newW < 1)
            return prev;
          return {
            ...prev,
            objects: prev.objects.map((o) =>
              o.id === sid
                ? ({ ...img, width: newW, height: newH } as CanvasObject)
                : o,
            ),
          };
        }

        // ── Background image: derive new canvas size + remap all other objects ──
        const arW = img.naturalWidth > 0 ? img.naturalWidth : img.width;
        const arH = img.naturalHeight > 0 ? img.naturalHeight : img.height;
        const ar = arW / Math.max(1, arH);

        let baseW = img.width,
          baseH = img.height;
        if (axis === "width") {
          baseW = newVal;
          baseH = Math.round(newVal / ar);
        } else {
          baseH = newVal;
          baseW = Math.round(newVal * ar);
        }
        if (!isFinite(baseW) || !isFinite(baseH) || baseW < 1 || baseH < 1)
          return prev;

        const newSize: CanvasSize = { width: baseW, height: baseH };

        // Remap non-background objects proportionally.
        const updatedObjects = prev.objects.map((o) => {
          if (o.id === sid) {
            // Update the background image dimensions to match the new canvas
            // size. Do NOT overwrite naturalWidth/naturalHeight — those store
            // the original image's true pixel dimensions and are used to
            // compute the aspect ratio on every subsequent resize. Overwriting
            // them would cause the AR to drift after the first manual edit.
            return {
              ...img,
              x: 0,
              y: 0,
              width: baseW,
              height: baseH,
            } as CanvasObject;
          }
          if (o.kind === "image" && (o as ImageObject).isBackground) return o;
          // Proportionally remap this object.
          const rx = baseW / Math.max(1, prev.canvasSize.width);
          const ry = baseH / Math.max(1, prev.canvasSize.height);
          const remapped: CanvasObject = {
            ...o,
            x: Math.round(o.x * rx),
            y: Math.round(o.y * ry),
            width: Math.round(o.width * rx),
            height: Math.round(o.height * ry),
            ...(o.kind === "field"
              ? {
                  fontSize: Math.max(
                    6,
                    Math.round((o as TextField).fontSize * ((rx + ry) / 2)),
                  ),
                }
              : {}),
          };
          return remapped;
        });

        return { objects: updatedObjects, canvasSize: newSize };
      });
    },
    [setEditorState, canvasScale],
  );

  const addField = useCallback(
    (column: string) => {
      const fields = objectsRef.current.filter((o) => o.kind === "field");
      const existing = objectsRef.current.filter(
        (o) => o.kind === "field" && (o as TextField).column === column,
      );
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
      selectOne(obj.id);
      setRightTab("style");
    },
    [setObjects, selectOne],
  );

  const handleDrag = useCallback(
    (id: number, x: number, y: number, live: boolean) => {
      const bx = x / canvasScale,
        by = y / canvasScale;
      setObjects(
        (p) => p.map((o) => (o.id === id ? { ...o, x: bx, y: by } : o)),
        live,
      );
    },
    [setObjects, canvasScale],
  );

  const handleResize = useCallback(
    (id: number, patch: Partial<CanvasObject>, live: boolean) => {
      const basePatch: Partial<CanvasObject> = { ...patch };
      (["x", "y", "width", "height"] as const).forEach((f) => {
        if (f in basePatch)
          (basePatch as any)[f] = (basePatch as any)[f] / canvasScale;
      });
      setObjects(
        (p) =>
          p.map((o) =>
            o.id === id ? ({ ...o, ...basePatch } as CanvasObject) : o,
          ),
        live,
      );
    },
    [setObjects, canvasScale],
  );

  const deleteObj = useCallback(
    (id: number) => {
      setObjects((p) => p.filter((o) => o.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setPrimaryId((prev) => (prev === id ? null : prev));
    },
    [setObjects],
  );

  const deleteSelected = useCallback(() => {
    const ids = selectedIdsRef.current;
    setObjects((p) => p.filter((o) => !ids.has(o.id)));
    clearSelection();
  }, [setObjects, clearSelection]);

  const updateSelected = useCallback(
    (key: string, value: unknown) => {
      const ids = selectedIdsRef.current;
      if (ids.size === 0) return;
      setObjects((p) =>
        p.map((o) =>
          ids.has(o.id) ? ({ ...o, [key]: value } as CanvasObject) : o,
        ),
      );
    },
    [setObjects],
  );

  const updateObj = useCallback(
    (key: string, value: unknown) => {
      const sid = primaryIdRef.current;
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
          return p.map((o) =>
            o.id === fromId
              ? ({ ...o, zIndex: toObj.zIndex } as CanvasObject)
              : o.id === toId
                ? ({ ...o, zIndex: fromObj.zIndex } as CanvasObject)
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

  const doExport = useCallback(async (layout: ImpositionResult, sheet: { w: number; h: number }) => {
    if (exportProgress !== null) return;
    setExportProgress(0);
    try {
      await exportRecords(
        exportFormat,
        objects,
        canvasSize,
        rows,
        dataImages,
        layout,
        sheet,
        (pct) => setExportProgress(pct),
      );
    } catch (err: any) {
      alert(`Export failed: ${err?.message || "Unknown error"}`);
    } finally {
      setTimeout(() => setExportProgress(null), 800);
    }
  }, [exportFormat, objects, canvasSize, rows, dataImages, exportProgress]);

  if (!mounted) return null;

  const isBackgroundSelected =
    selectedObj?.kind === "image" && (selectedObj as ImageObject).isBackground;

  const scaleObj = (obj: CanvasObject): CanvasObject => {
    const s = canvasScale;

    // Helper: scale a shadow object's pixel dimensions.
    const scaleShadow = (shadow: typeof DEFAULT_SHADOW) =>
      shadow?.enabled
        ? {
            ...shadow,
            x: shadow.x * s,
            y: shadow.y * s,
            blur: shadow.blur * s,
            thickness: shadow.thickness * s,
          }
        : shadow;

    if (obj.kind === "image" && (obj as ImageObject).isBackground) {
      return {
        ...obj,
        x: 0,
        y: 0,
        width: Math.round(canvasSize.width * s),
        height: Math.round(canvasSize.height * s),
        // Background images can have opacity but no border/shadow/radius,
        // so no extra scaling needed here.
      };
    }

    if (obj.kind === "image") {
      const img = obj as ImageObject;
      return {
        ...img,
        x: img.x * s,
        y: img.y * s,
        width: img.width * s,
        height: img.height * s,
        // Scale all visual decoration proportionally.
        borderRadius: (img.borderRadius ?? 0) * s,
        border: img.border
          ? { ...img.border, width: (img.border.width ?? 0) * s }
          : img.border,
        shadow: scaleShadow(img.shadow),
      } as CanvasObject;
    }

    // Text field
    const field = obj as TextField;
    return {
      ...field,
      x: field.x * s,
      y: field.y * s,
      width: field.width * s,
      height: field.height * s,
      fontSize: Math.max(6, field.fontSize * s),
      shadow: scaleShadow(field.shadow),
    } as CanvasObject;
  };

  const stylePrimary = selectedObj;
  const styleApply = (key: string, value: unknown) =>
    updateSelected(key, value);

  const styleApplyPrimary = (key: string, value: unknown) => {
    // Width/height edits on the background image must go through updateBgDimension
    // so that canvasSize updates and all other objects are remapped together.
    if (
      (key === "width" || key === "height") &&
      typeof value === "number" &&
      stylePrimary?.kind === "image" &&
      (stylePrimary as ImageObject).isBackground
    ) {
      // DimensionInputs receives the unscaled bg object, so value is already
      // in base pixels — pass it straight through with a clean integer round.
      updateBgDimension(key, Math.round(value));
      return;
    }
    const spatialKeys = ["x", "y", "width", "height"];
    if (spatialKeys.includes(key) && typeof value === "number")
      updateObj(key, value / canvasScale);
    else updateObj(key, value);
  };

  const handleModifierSelect = (e: React.MouseEvent, id: number) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.shiftKey) rangeSelect(id, layersSorted);
      else toggleSelect(id);
    } else if (e.shiftKey) {
      rangeSelect(id, layersSorted);
    } else {
      selectOne(id);
    }
    setRightTab("style");
  };

  const handleLayerClick = (e: React.MouseEvent, id: number) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.shiftKey) rangeSelect(id, layersSorted);
      else toggleSelect(id);
    } else if (e.shiftKey) {
      rangeSelect(id, layersSorted);
    } else {
      selectOne(id);
      setRightTab("style");
    }
  };

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
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {exportProgress !== null && !showImpositionModal && (
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

      {showImpositionModal && (
        <ImpositionModal
          canvasSize={canvasSize}
          totalCards={rows.length || 1}
          objects={objects}
          rows={rows}
          pageIndex={pageIndex}
          dataImages={dataImages}
          exportFormat={exportFormat}
          onExportFormatChange={setExportFormat}
          onExport={doExport}
          exportProgress={exportProgress}
          onClose={() => setShowImpositionModal(false)}
        />
      )}

      {/* Header */}
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 9px",
              borderRadius: 7,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span style={{ fontSize: 9, color: "rgba(240,237,232,0.3)" }}>
              Canvas
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "rgba(240,237,232,0.6)",
                fontFamily: "monospace",
              }}
            >
              {canvasSize.width}×{canvasSize.height}px
            </span>
          </div>
          {selectedIds.size > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 9px",
                borderRadius: 7,
                background: "rgba(232,255,71,0.08)",
                border: "1px solid rgba(232,255,71,0.2)",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: "#e8ff47" }}>
                {selectedIds.size} selected
              </span>
              <button
                onClick={clearSelection}
                style={{
                  fontSize: 9,
                  color: "rgba(232,255,71,0.6)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowImpositionModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0 14px",
            height: 32,
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            background: "#e8ff47",
            border: "none",
            color: "#0a0a10",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#d4eb3f")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#e8ff47")}
        >
          <span style={{ fontSize: 12 }}>⬚</span>
          <span>Print Imposition & Export</span>
          <span
            style={{
              fontSize: 8,
              background: "rgba(0,0,0,0.12)",
              padding: "1px 5px",
              borderRadius: 3,
              letterSpacing: "0.04em",
            }}
          >
            GA
          </span>
        </button>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left panel */}
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
          {/* Image upload */}
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
                  Select Template
                </p>
                <p style={{ fontSize: 9, color: "rgba(240,237,232,0.25)" }}>
                  auto-resizes canvas
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

          {/* Data source */}
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

          <DataImagesPanel
            dataImages={dataImages}
            dataImagesLabel={dataImagesLabel}
            dataImagesLoading={dataImagesLoading}
            autoDetectedColumns={autoDetectedImageColumns}
            objects={objects}
            onUpload={handleDataImagesUpload}
            onClear={() => {
              setDataImages({});
              setDataImagesLabel(null);
            }}
            onPlacePhoto={addDataPhotoObject}
          />

          {/* Text fields */}
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
                {columns
                  .filter((col) => !autoDetectedImageColumns.includes(col))
                  .map((col) => {
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

          {/* Shortcuts */}
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
            <KbdHint keys={["Ctrl", "A"]} label="Select All" />
            <KbdHint keys={["Ctrl", "D"]} label="Duplicate" />
            <KbdHint keys={["Ctrl", "click"]} label="Multi-select" />
            <KbdHint keys={["Ctrl", "Shift", "click"]} label="Range select" />
            <KbdHint keys={["Ctrl", "="]} label="Zoom In" />
            <KbdHint keys={["Ctrl", "-"]} label="Zoom Out" />
            <KbdHint keys={["Space", "drag"]} label="Pan" />
            <KbdHint keys={["Del"]} label="Delete" />
          </div>
        </aside>

        {/* Canvas */}
        <main
          ref={canvasAreaRef}
          style={{
            flex: 1,
            background: "#07070e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
            cursor: panCursor ? "grab" : "default",
          }}
          onClick={(e) => {
            if (!isPanning.current && !(e.ctrlKey || e.metaKey))
              clearSelection();
          }}
          onMouseDown={(e) => {
            handleCanvasMouseDown(e);
            handleSpacePanStart(e);
          }}
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
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                transform: `translate(${panX}px,${panY}px) scale(${zoom})`,
                transformOrigin: "center center",
                flexShrink: 0,
                width: effectiveCanvasSize.width,
                height: effectiveCanvasSize.height,
                position: "relative",
              }}
            >
              <div
                id="templify-canvas"
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#ffffff",
                  boxShadow:
                    "0 20px 60px rgba(0,0,0,0.9),0 0 0 1px rgba(255,255,255,0.04)",
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
                    obj={scaleObj(bgImage) as ImageObject}
                    selected={selectedIds.has(bgImage.id)}
                    onSelect={(id, e) => handleModifierSelect(e, id)}
                    onDrag={handleDrag}
                    onResize={handleResize}
                    scale={zoom}
                    rows={rows.length > 0 ? rows : [{}]}
                    baseRowIndex={pageIndex}
                    dataImages={dataImages}
                  />
              )}
              {objects
                .filter(
                  (o) =>
                    !(o.kind === "image" && (o as ImageObject).isBackground),
                )
                .map((obj) =>
                  obj.kind === "image" ? (
                      <ImageEl
                        key={obj.id}
                        obj={scaleObj(obj) as ImageObject}
                        selected={selectedIds.has(obj.id)}
                        onSelect={(id, e) => handleModifierSelect(e, id)}
                        onDrag={handleDrag}
                        onResize={handleResize}
                        scale={zoom}
                        rows={rows.length > 0 ? rows : [{}]}
                        baseRowIndex={pageIndex}
                        dataImages={dataImages}
                      />
                  ) : (
                      <TextEl
                        key={obj.id}
                        obj={scaleObj(obj) as TextField}
                        selected={selectedIds.has(obj.id)}
                        onSelect={(id, e) => handleModifierSelect(e, id)}
                        onDrag={handleDrag}
                        onResize={handleResize}
                        currentRow={
                          rows.length > 0
                            ? rows[Math.min(pageIndex, rows.length - 1)]
                            : null
                        }
                        rows={rows}
                        scale={zoom}
                      />
                  ),
                )}
            </div>
          </div>
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
            {canvasSize.width}×{canvasSize.height}px · Scale{" "}
            {Math.round(canvasScale * 100)}% · Zoom {Math.round(zoom * 100)}%
          </div>
          <FloatingPageNav
            pageIndex={pageIndex}
            totalPages={totalPages}
            onPageChange={setPageIndex}
            rows={rows}
          />
          <ZoomControls
            zoom={zoom}
            onZoom={handleZoomDelta}
            onReset={() => {
              setZoom(1);
              setPanX(0);
              setPanY(0);
            }}
            onFit={fitToScreen}
          />
        </main>

        {/* Right panel */}
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
                  fontSize: 9,
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
            {/* ── LAYERS TAB ─────────────────────────────────────────────── */}
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
                      <div
                        key={o.id}
                        onClick={(e) => handleLayerClick(e, o.id)}
                        style={{
                          outline: selectedIds.has(o.id)
                            ? "1px solid rgba(232,255,71,0.4)"
                            : "none",
                          borderRadius: 7,
                          cursor: "pointer",
                        }}
                      >
                        <LayerItem
                          obj={o}
                          selected={selectedIds.has(o.id)}
                          onSelect={() => {}}
                          onDelete={() => deleteObj(o.id)}
                          dragHandlers={makeDragHandlers(o)}
                        />
                      </div>
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
                  Ctrl+click or Ctrl+Shift+click to multi-select.
                  <br />
                  Drag ⠿ handle to reorder layers.
                </p>
              </div>
            )}

            {/* ── STYLE TAB ──────────────────────────────────────────────── */}
            {rightTab === "style" && (
              <div
                style={{
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                {/* Canvas scale */}
                <div
                  style={{
                    padding: "12px",
                    borderRadius: 9,
                    background: "rgba(232,255,71,0.03)",
                    border: "1px solid rgba(232,255,71,0.1)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <SLabel>Canvas Scale</SLabel>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#e8ff47",
                      }}
                    >
                      {Math.round(canvasScale * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={25}
                    max={300}
                    step={5}
                    value={Math.round(canvasScale * 100)}
                    onChange={(e) =>
                      setCanvasScale(Number(e.target.value) / 100)
                    }
                    style={{
                      width: "100%",
                      height: "3px",
                      accentColor: "#e8ff47",
                      marginBottom: 8,
                    }}
                  />
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {SCALE_PRESETS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setCanvasScale(s)}
                        style={{
                          flex: 1,
                          minWidth: 30,
                          padding: "4px 2px",
                          borderRadius: 5,
                          fontSize: 9,
                          fontWeight: 700,
                          cursor: "pointer",
                          border: "none",
                          background:
                            Math.abs(canvasScale - s) < 0.01
                              ? "rgba(232,255,71,0.2)"
                              : "rgba(255,255,255,0.05)",
                          color:
                            Math.abs(canvasScale - s) < 0.01
                              ? "#e8ff47"
                              : "rgba(240,237,232,0.4)",
                        }}
                      >
                        {Math.round(s * 100)}%
                      </button>
                    ))}
                  </div>
                  <p
                    style={{
                      fontSize: 8,
                      color: "rgba(240,237,232,0.2)",
                      marginTop: 8,
                      lineHeight: 1.5,
                    }}
                  >
                    Scales canvas render size. Current base: {canvasSize.width}×
                    {canvasSize.height}px
                  </p>
                </div>

                {!anySelected ? (
                  <p
                    style={{
                      fontSize: 11,
                      color: "rgba(240,237,232,0.18)",
                      textAlign: "center",
                      paddingBlock: 12,
                      lineHeight: 1.7,
                    }}
                  >
                    Select an object to edit its style.
                  </p>
                ) : (
                  <>
                    {/* Selection indicator */}
                    <div
                      style={{
                        padding: "7px 9px",
                        borderRadius: 7,
                        background: "rgba(232,255,71,0.05)",
                        border: "1px solid rgba(232,255,71,0.12)",
                      }}
                    >
                      {multiSelected ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <p
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: "#e8ff47",
                              fontFamily: "monospace",
                            }}
                          >
                            {selectedIds.size} objects selected
                          </p>
                          <button
                            onClick={clearSelection}
                            style={{
                              fontSize: 9,
                              color: "rgba(232,255,71,0.5)",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            ✕ clear
                          </button>
                        </div>
                      ) : stylePrimary ? (
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
                          {stylePrimary.kind === "image"
                            ? (stylePrimary as ImageObject).isDataImage
                              ? `📷 ${(stylePrimary as ImageObject).dataImageColumn || "Data Photo"}`
                              : `🖼 ${(stylePrimary as ImageObject).name}`
                            : `T  {{${(stylePrimary as TextField).column}}}`}
                        </p>
                      ) : null}
                    </div>

                    {multiSelected && (
                      <p
                        style={{
                          fontSize: 9,
                          color: "rgba(232,255,71,0.45)",
                          lineHeight: 1.5,
                        }}
                      >
                        Style changes apply to all {selectedIds.size} selected
                        objects. Position/size only affects the primary object.
                      </p>
                    )}

                    {!multiSelected && stylePrimary && (
                      <DimensionInputs
                        selectedObj={
                          stylePrimary.kind === "image" &&
                          (stylePrimary as ImageObject).isBackground
                            ? stylePrimary // show base pixels for canvas/bg
                            : scaleObj(stylePrimary) // show scaled pixels for other objects
                        }
                        updateBgDimension={updateBgDimension}
                        updateObj={styleApplyPrimary}
                      />
                    )}

                    {!multiSelected && !isBackgroundSelected && anySelected && (
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
                    )}

                    {/* ── IMAGE STYLES ────────────────────────────────────── */}
                    {(allImages ||
                      (!multiSelected &&
                        stylePrimary?.kind === "image" &&
                        !(stylePrimary as ImageObject).isBackground)) &&
                      (() => {
                        const img = stylePrimary as ImageObject | null;
                        return (
                          <>
                            {!multiSelected &&
                              img &&
                              !img.isBackground &&
                              img.isDataImage && (
                                <DataImageInfo
                                  obj={img}
                                  dataImages={dataImages}
                                  rows={rows}
                                  baseRowIndex={Math.min(
                                    pageIndex,
                                    rows.length - 1,
                                  )}
                                />
                              )}
                            {!multiSelected &&
                              img &&
                              !img.isBackground &&
                              img.isDataImage && (
                                <div>
                                  <SLabel>Row Offset</SLabel>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 5,
                                      background: "rgba(255,255,255,0.03)",
                                      border:
                                        "1px solid rgba(255,255,255,0.08)",
                                      borderRadius: 8,
                                      padding: "5px 8px",
                                    }}
                                  >
                                    <button
                                      onClick={() =>
                                        updateObj(
                                          "columnOffset",
                                          (img.columnOffset ?? 0) - 1,
                                        )
                                      }
                                      style={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: 5,
                                        background: "rgba(255,255,255,0.06)",
                                        border:
                                          "1px solid rgba(255,255,255,0.1)",
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
                                              (img.columnOffset ?? 0) === v
                                                ? "#e8ff47"
                                                : "rgba(255,255,255,0.06)",
                                            color:
                                              (img.columnOffset ?? 0) === v
                                                ? "#0a0a10"
                                                : "rgba(240,237,232,0.45)",
                                          }}
                                        >
                                          {v === 0 ? "±0" : v > 0 ? `+${v}` : v}
                                        </button>
                                      ))}
                                    </div>
                                    <button
                                      onClick={() =>
                                        updateObj(
                                          "columnOffset",
                                          (img.columnOffset ?? 0) + 1,
                                        )
                                      }
                                      style={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: 5,
                                        background: "rgba(255,255,255,0.06)",
                                        border:
                                          "1px solid rgba(255,255,255,0.1)",
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
                              )}
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
                                  {Math.round((img?.opacity ?? 1) * 100)}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={Math.round((img?.opacity ?? 1) * 100)}
                                onChange={(e) =>
                                  styleApply(
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
                            {!img?.isBackground && (
                              <div>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: 5,
                                  }}
                                >
                                  <SLabel>Corner Radius</SLabel>
                                  <span
                                    style={{
                                      fontSize: 9,
                                      color: "#e8ff47",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {img?.borderRadius ?? 0}px
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={
                                    img
                                      ? Math.round(
                                          Math.min(img.width, img.height) / 2,
                                        )
                                      : 100
                                  }
                                  value={img?.borderRadius ?? 0}
                                  onChange={(e) =>
                                    styleApply(
                                      "borderRadius",
                                      Number(e.target.value),
                                    )
                                  }
                                  style={{
                                    width: "100%",
                                    height: "3px",
                                    accentColor: "#e8ff47",
                                  }}
                                />
                              </div>
                            )}
                            {!img?.isBackground && (
                              <BorderPanel
                                border={img?.border ?? DEFAULT_BORDER}
                                onChange={(b) => styleApply("border", b)}
                              />
                            )}
                            {!img?.isBackground && (
                              <ShadowPanel
                                shadow={img?.shadow ?? DEFAULT_SHADOW}
                                onChange={(s) => styleApply("shadow", s)}
                              />
                            )}
                          </>
                        );
                      })()}

                    {/* Background image opacity only */}
                    {!multiSelected &&
                      stylePrimary?.kind === "image" &&
                      (stylePrimary as ImageObject).isBackground &&
                      (() => {
                        const img = stylePrimary as ImageObject;
                        return (
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
                                styleApply(
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
                        );
                      })()}

                    {/* ── TEXT STYLES ─────────────────────────────────────── */}
                    {(allText ||
                      (!multiSelected && stylePrimary?.kind === "field")) &&
                      (() => {
                        const f = stylePrimary as TextField | null;
                        return (
                          <>
                            {!multiSelected && f && (
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
                                        }}
                                      >
                                        {v === 0 ? "±0" : v > 0 ? `+${v}` : v}
                                      </button>
                                    ))}
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
                            )}
                            <div>
                              <SLabel>Font</SLabel>
                              <FontPicker
                                value={f?.fontFamily ?? "Playfair Display"}
                                onChange={(v) => styleApply("fontFamily", v)}
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
                                  {f?.fontSize ?? 22}px
                                </span>
                              </div>
                              <input
                                type="range"
                                min={6}
                                max={120}
                                value={f?.fontSize ?? 22}
                                onChange={(e) =>
                                  styleApply("fontSize", Number(e.target.value))
                                }
                                style={{
                                  width: "100%",
                                  height: "3px",
                                  accentColor: "#e8ff47",
                                }}
                              />
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
                                      styleApply("textAlign", align)
                                    }
                                    style={{
                                      flex: 1,
                                      padding: "7px 2px",
                                      borderRadius: 6,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      background:
                                        f?.textAlign === align
                                          ? "rgba(232,255,71,0.15)"
                                          : "rgba(255,255,255,0.04)",
                                      border: `1px solid ${f?.textAlign === align ? "rgba(232,255,71,0.35)" : "rgba(255,255,255,0.08)"}`,
                                    }}
                                  >
                                    <svg
                                      width="12"
                                      height="10"
                                      viewBox="0 0 12 10"
                                      fill={
                                        f?.textAlign === align
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
                                        x={
                                          align === "center"
                                            ? 2
                                            : align === "right"
                                              ? 4
                                              : 0
                                        }
                                        y="3.5"
                                        width={align === "justify" ? 12 : 8}
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
                                    value={f?.color ?? "#1a1a1a"}
                                    onChange={(e) =>
                                      styleApply("color", e.target.value)
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
                                  value={f?.color ?? "#1a1a1a"}
                                  onChange={(e) =>
                                    styleApply("color", e.target.value)
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
                                {TEXT_COLORS.map((c) => (
                                  <button
                                    key={c}
                                    onClick={() => styleApply("color", c)}
                                    style={{
                                      width: 20,
                                      height: 20,
                                      borderRadius: 4,
                                      background: c,
                                      border: "none",
                                      cursor: "pointer",
                                      outline:
                                        f?.color === c
                                          ? "2px solid #e8ff47"
                                          : "none",
                                      outlineOffset: 1,
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
                                  onClick={() => styleApply("bold", !f?.bold)}
                                  style={{
                                    flex: 1,
                                    padding: "6px 0",
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    background: f?.bold
                                      ? "rgba(232,255,71,0.12)"
                                      : "rgba(255,255,255,0.04)",
                                    border: `1px solid ${f?.bold ? "rgba(232,255,71,0.3)" : "rgba(255,255,255,0.08)"}`,
                                    color: f?.bold
                                      ? "#e8ff47"
                                      : "rgba(240,237,232,0.5)",
                                  }}
                                >
                                  B
                                </button>
                                <button
                                  onClick={() =>
                                    styleApply("italic", !f?.italic)
                                  }
                                  style={{
                                    flex: 1,
                                    padding: "6px 0",
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontStyle: "italic",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    background: f?.italic
                                      ? "rgba(232,255,71,0.12)"
                                      : "rgba(255,255,255,0.04)",
                                    border: `1px solid ${f?.italic ? "rgba(232,255,71,0.3)" : "rgba(255,255,255,0.08)"}`,
                                    color: f?.italic
                                      ? "#e8ff47"
                                      : "rgba(240,237,232,0.5)",
                                  }}
                                >
                                  I
                                </button>
                              </div>
                            </div>
                            <ShadowPanel
                              shadow={f?.shadow ?? DEFAULT_SHADOW}
                              onChange={(s) => styleApply("shadow", s)}
                              isText
                            />
                          </>
                        );
                      })()}

                    {/* Delete */}
                    <button
                      onClick={deleteSelected}
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
                      {multiSelected
                        ? `Remove ${selectedIds.size} objects`
                        : "Remove object"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Row data preview */}
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
                Row {pageIndex + 1} of {rows.length}
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
    </div>
  );
}

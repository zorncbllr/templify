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
  Shadow,
} from "../types/index";
import {
  DEFAULT_SHADOW,
  DEFAULT_BORDER,
  IMAGE_EXTS,
  PLACEHOLDER_SRC,
} from "../types/constants";
import {
  parseSpreadsheet,
  detectImageColumns,
  normalizeImageKey,
} from "../utils/data";
import { measureTextDimensions } from "../utils/rendering";
import { exportRecords } from "../utils/export";
import { LayerItem, DimensionInputs } from "./LayerItem";
import { ZoomControls, FloatingPageNav, KbdHint } from "./Controls";
import { ShadowPanel, BorderPanel, NumInput } from "./StylePanels";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ImpositionModal } from "./ImpositionModal";
import { useUndoRedo } from "../hooks/useUndoRedo";
import { ImageEl, TextEl } from "./CanvasObjects";
import { DataImageInfo, DataImagesPanel } from "./DataPanel";
import { FontPicker } from "./FontPicker";
import {
  IconSparkle,
  IconUndo,
  IconClose,
  IconGrid,
  IconImage,
  IconBarChart,
  IconCamera,
  IconDragHandle,
  IconArrowDown,
  IconArrowUp,
  IconMinus,
  IconCheckCircle,
  IconFolder,
  IconChevronDown,
  IconType,
  IconEyedropper,
  IconQrCode,
  IconBarcode,
  IconShrink,
  IconExpand,
  IconFitScreen,
  IconTrash,
  IconRotate,
  IconSettings,
  IconLogOut,
} from "@/components/Icons";
import { signOut } from "@/lib/auth/actions";
import { ChevronUpIcon } from "lucide-react";

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
  const avg = (rx + ry) / 2;

  return objects.map((o) => {
    if (o.kind === "image" && (o as ImageObject).isBackground) return o;

    const shadow =
      o.kind === "image" ? (o as ImageObject).shadow : (o as TextField).shadow;
    const scaledShadow: Shadow = {
      ...shadow,
      x: shadow.x * avg,
      y: shadow.y * avg,
      blur: shadow.blur * avg,
    };

    if (o.kind === "field") {
      const f = o as TextField;
      return {
        ...f,
        x: f.x * rx,
        y: f.y * ry,
        width: f.width * rx,
        height: f.height * ry,
        fontSize: Math.max(6, f.fontSize * avg),
        shadow: scaledShadow,
      } as CanvasObject;
    }

    const img = o as ImageObject;
    return {
      ...img,
      x: img.x * rx,
      y: img.y * ry,
      width: img.width * rx,
      height: img.height * ry,
      borderRadius: img.borderRadius * avg,
      border: {
        ...img.border,
        width: img.border.width * avg,
      },
      shadow: scaledShadow,
    } as CanvasObject;
  });
}

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-[rgba(240,237,232,0.28)] uppercase tracking-[0.08em] mb-[7px]">
      {children as any}
    </p>
  );
}

interface EditorProps {
  initialObjects?: CanvasObject[];
  initialCanvasSize?: CanvasSize;
  initialColumns?: string[];
  initialRows?: RowData[];
  initialDataFileName?: string | null;
  initialDataImagesLabel?: string | null;
  initialDataImages?: DataImageMap;
  watermark?: boolean;
  onSave?: (state: { objects: CanvasObject[]; canvasSize: CanvasSize }) => void;
  projectId?: string | null;
  user?: { plan: string; displayName?: string } | null;
}

export default function Editor({
  initialObjects,
  initialCanvasSize,
  initialColumns,
  initialRows,
  initialDataFileName,
  initialDataImagesLabel,
  initialDataImages,
  watermark = true,
  onSave,
  projectId,
  user,
}: EditorProps = {}) {
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
    objects: initialObjects ?? [],
    canvasSize: initialCanvasSize ?? { width: 960, height: 540 },
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

  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    if (!onSave) return;
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        onSave(editorState);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("error");
      }
    }, 800);
  }, [editorState, onSave]);

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
  const [showImpositionModal, setShowImpositionModal] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [exportFormat, setExportFormat] = useState("PNG");
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [rightTab, setRightTab] = useState<"layers" | "style">("layers");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [imgDragOver, setImgDragOver] = useState(false);
  const [xlsxDragOver, setXlsxDragOver] = useState(false);
  const [columns, setColumns] = useState<string[]>(initialColumns ?? []);
  const [rows, setRows] = useState<RowData[]>(initialRows ?? []);
  const [dataFileName, setDataFileName] = useState<string | null>(
    initialDataFileName ?? null,
  );
  const [dataError, setDataError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [layerDraggingId, setLayerDraggingId] = useState<number | null>(null);
  const [dataImages, setDataImages] = useState<DataImageMap>(
    initialDataImages ?? {},
  );
  const [dataImagesLabel, setDataImagesLabel] = useState<string | null>(
    initialDataImagesLabel ?? null,
  );
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
  const nextZ = useRef(
    initialObjects && initialObjects.length > 0
      ? Math.max(100, ...initialObjects.map((o) => o.zIndex)) + 1
      : 100,
  );

  const totalPages = rows.length;
  const currentRow = useMemo(() => {
    if (rows.length === 0) return null;
    return rows[Math.min(pageIndex, rows.length - 1)];
  }, [rows, pageIndex]);

  const effectiveCanvasSize = canvasSize;

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
      const ctrl = e.ctrlKey || e.metaKey;
      const tag = (e.target as HTMLElement).tagName;
      const inInput =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (e.target as HTMLElement).isContentEditable;
      // Allow Ctrl+B / Ctrl+I even when an input is focused
      if (inInput && !(ctrl && (e.key === "b" || e.key === "i"))) return;
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
          p.map((o) => {
            if (!ids.has(o.id) || o.kind !== "field") return o;
            const tf = o as TextField;
            const newBold = !tf.bold;
            return {
              ...tf,
              bold: newBold,
              fontWeight: newBold ? 700 : 400,
            } as CanvasObject;
          }),
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
      const limitedRd = user?.plan === "free" ? rd.slice(0, 25) : rd;
      setRows(limitedRd);
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
  const updateBgDimension = useCallback(
    (axis: "width" | "height", newVal: number) => {
      if (!newVal || !isFinite(newVal) || newVal < 1) return;

      setEditorState((prev) => {
        const sid = primaryIdRef.current;
        // Fall back to the background image when nothing is selected
        const target =
          sid !== null
            ? prev.objects.find((o) => o.id === sid)
            : prev.objects.find(
                (o) => o.kind === "image" && (o as ImageObject).isBackground,
              );
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
              o.id === target.id
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

        // Remap non-background objects proportionally (including borders,
        // shadows, border-radius, font size).
        const remapped = remapObjects(prev.objects, prev.canvasSize, newSize);

        // Update the background image dimensions to match the new canvas.
        const updatedObjects = remapped.map((o) =>
          o.id === target.id
            ? ({
                ...img,
                x: 0,
                y: 0,
                width: baseW,
                height: baseH,
              } as CanvasObject)
            : o,
        );

        return { objects: updatedObjects, canvasSize: newSize };
      });
    },
    [setEditorState],
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
        fontWeight: 400,
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
    (id: number, dx: number, dy: number, live: boolean) => {
      const ids = selectedIdsRef.current;
      // If the dragged object is part of a multi-selection, move all selected objects
      const moveIds = ids.has(id) && ids.size > 1 ? ids : new Set([id]);
      setObjects(
        (p) =>
          p.map((o) =>
            moveIds.has(o.id) ? { ...o, x: o.x + dx, y: o.y + dy } : o,
          ),
        live,
      );
    },
    [setObjects],
  );

  const handleResize = useCallback(
    (id: number, patch: Partial<CanvasObject>, live: boolean) => {
      const ids = selectedIdsRef.current;
      const isMulti = ids.has(id) && ids.size > 1;

      setObjects((p) => {
        if (!isMulti) {
          return p.map((o) =>
            o.id === id ? ({ ...o, ...patch } as CanvasObject) : o,
          );
        }

        // Find the primary object to compute scale ratios
        const primary = p.find((o) => o.id === id);
        if (!primary) return p;

        // Rotation-only patch → apply same rotation to all selected
        if (
          patch.rotation != null &&
          patch.width == null &&
          patch.height == null
        ) {
          return p.map((o) => {
            if (!ids.has(o.id)) return o;
            return { ...o, rotation: patch.rotation } as CanvasObject;
          });
        }

        const sx = patch.width != null ? patch.width / primary.width : 1;
        const sy = patch.height != null ? patch.height / primary.height : 1;
        // How much the primary's origin shifted (for handles like nw, n, w)
        const odx = patch.x != null ? patch.x - primary.x : 0;
        const ody = patch.y != null ? patch.y - primary.y : 0;

        return p.map((o) => {
          if (o.id === id) return { ...o, ...patch } as CanvasObject;
          if (!ids.has(o.id)) return o;

          // Scale other selected objects proportionally
          const relX = o.x - primary.x;
          const relY = o.y - primary.y;
          const updated: any = {
            ...o,
            x: Math.round(primary.x + odx + relX * sx),
            y: Math.round(primary.y + ody + relY * sy),
            width: Math.round(o.width * sx),
            height: Math.round(o.height * sy),
          };
          if (o.kind === "field" && (o as TextField).fontSize) {
            const avgScale = (sx + sy) / 2;
            updated.fontSize = Math.max(
              6,
              Math.round((o as TextField).fontSize * avgScale),
            );
          }
          return updated as CanvasObject;
        });
      }, live);
    },
    [setObjects],
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

  const doExport = useCallback(
    async (layout: ImpositionResult, sheet: { w: number; h: number }) => {
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
          watermark,
          (pct) => setExportProgress(pct),
        );
      } catch (err: any) {
        alert(`Export failed: ${err?.message || "Unknown error"}`);
      } finally {
        setTimeout(() => setExportProgress(null), 800);
      }
    },
    [
      exportFormat,
      objects,
      canvasSize,
      rows,
      dataImages,
      exportProgress,
      watermark,
    ],
  );

  if (!mounted) return null;

  const isBackgroundSelected =
    selectedObj?.kind === "image" && (selectedObj as ImageObject).isBackground;

  const stylePrimary = selectedObj;
  const styleApply = (key: string, value: unknown) =>
    updateSelected(key, value);

  const styleApplyWithAutoFit = (key: string, value: unknown) => {
    const ids = selectedIdsRef.current;
    if (ids.size === 0) return;
    setObjects((p) =>
      p.map((o) => {
        if (!ids.has(o.id)) return o;
        const updated = { ...o, [key]: value } as CanvasObject;
        if (updated.kind !== "field") return updated;
        const tf = updated as TextField;
        if ((tf.codeType ?? "text") !== "text") return updated;
        const ci = currentRow ? rows.indexOf(currentRow) : -1;
        const ti = ci >= 0 ? ci + tf.columnOffset : -1;
        const text =
          ti >= 0 && ti < rows.length ? (rows[ti][tf.column] ?? "") : "";
        if (!text) return updated;
        const m = measureTextDimensions(
          text,
          tf.fontFamily,
          tf.fontSize,
          tf.bold,
          tf.italic,
        );
        return { ...tf, width: m.width, height: m.height } as CanvasObject;
      }),
    );
  };

  const styleApplyPrimary = (key: string, value: unknown) => {
    // Width/height edits on the background image must go through updateBgDimension
    // so that canvasSize updates and all other objects are remapped together.
    if (
      (key === "width" || key === "height") &&
      typeof value === "number" &&
      stylePrimary?.kind === "image" &&
      (stylePrimary as ImageObject).isBackground
    ) {
      updateBgDimension(key, Math.round(value));
      return;
    }
    updateObj(key, value);
  };

  const handleModifierSelect = (e: React.MouseEvent, id: number) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.shiftKey) rangeSelect(id, layersSorted);
      else toggleSelect(id);
    } else if (e.shiftKey) {
      rangeSelect(id, layersSorted);
    } else if (
      selectedIdsRef.current.has(id) &&
      selectedIdsRef.current.size > 1
    ) {
      // Clicking an already-selected object in a multi-selection:
      // don't deselect others yet — allow multi-drag. The deselect-to-single
      // happens on mouseUp if the user didn't drag (handled in useDragResize).
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
    <div className="dark fixed inset-0 flex flex-col overflow-hidden bg-app-bg text-app-text font-[DM_Sans,sans-serif] z-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        // *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px;}
        input[type=range]{accent-color:#e8ff47;cursor:pointer;} input[type=color]{border:none;background:none;cursor:pointer;padding:0;}
        .chip:hover{background:rgba(232,255,71,0.09)!important;border-color:rgba(232,255,71,0.3)!important;color:#e8ff47!important;}
        .undob:disabled{opacity:0.18;cursor:not-allowed!important;} .undob:not(:disabled):hover{background:rgba(255,255,255,0.08)!important;}
        button{font-family:'DM Sans',sans-serif;}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {exportProgress !== null && !showImpositionModal && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.7)] z-[500] flex items-center justify-center">
          <div className="bg-[#14141e] border border-[rgba(255,255,255,0.1)] rounded-md px-9 py-7 min-w-[260px] text-center">
            <div className="mb-3.5">
              {exportProgress < 100 ? (
                <div
                  className="w-9 h-9 rounded-full mx-auto"
                  style={{
                    border: "3px solid rgba(232,255,71,0.2)",
                    borderTop: "3px solid #e8ff47",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
              ) : (
                <IconCheckCircle size={24} color="#4ade80" />
              )}
            </div>
            <p className="text-sm font-semibold text-[#f0ede8] mb-2.5">
              {exportProgress < 100
                ? `Exporting… ${exportProgress}%`
                : "Export complete!"}
            </p>
            <div className="h-1 bg-[rgba(255,255,255,0.1)] rounded-md">
              <div
                className="h-full bg-[#e8ff47] rounded-md transition-[width] duration-300"
                style={{ width: `${exportProgress}%` }}
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
      <header className="flex items-center justify-between px-4 h-[50px] border-b border-border/60 bg-app-bg-deep shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <a
            href={user ? "/dashboard" : "/"}
            className="flex items-center gap-[7px] no-underline"
          >
            <div className="w-[26px] h-[26px] bg-app-accent rounded-md flex items-center justify-center text-xs font-black text-app-bg">
              <IconSparkle size={12} />
            </div>
            <span className="font-bold text-[13px] tracking-[-0.02em] text-app-text">
              Templify
            </span>
          </a>
          <div className="w-px h-[18px] bg-[rgba(255,255,255,0.08)]" />
          <div className="flex gap-0.5">
            <button
              className="undob w-7 h-7 rounded-md bg-transparent border border-[rgba(255,255,255,0.08)] text-[rgba(240,237,232,0.55)] text-[13px] cursor-pointer flex items-center justify-center"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              <IconUndo size={13} />
            </button>
            <button
              className="undob w-7 h-7 rounded-md bg-transparent border border-[rgba(255,255,255,0.08)] text-[rgba(240,237,232,0.55)] text-[13px] cursor-pointer flex items-center justify-center"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
            >
              <IconUndo size={13} style={{ transform: "scaleX(-1)" }} />
            </button>
          </div>
          <div className="flex items-center gap-[5px] py-1 px-2.5 rounded-md bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]">
            <span className="text-[9px] text-[rgba(240,237,232,0.3)]">
              Canvas
            </span>
            <span className="text-[10px] font-semibold text-[rgba(240,237,232,0.6)] font-mono">
              {canvasSize.width}×{canvasSize.height}px
            </span>
          </div>
          {selectedIds.size > 1 && (
            <div className="flex items-center gap-[5px] py-1 px-2.5 rounded-md bg-[rgba(232,255,71,0.08)] border border-[rgba(232,255,71,0.2)]">
              <span className="text-[10px] font-bold text-app-accent">
                {selectedIds.size} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-[9px] text-[rgba(232,255,71,0.6)] bg-transparent border-none cursor-pointer p-0"
              >
                <IconClose size={10} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImpositionModal(true)}
            className="flex items-center gap-1.5 px-3.5 h-8 rounded-md text-[11px] font-bold cursor-pointer bg-app-accent border-none text-app-bg"
            onMouseEnter={(e) => (e.currentTarget.style.background = "#d4eb3f")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}
          >
            <IconGrid size={12} />
            <span>Print Imposition & Export</span>
            <span className="text-[8px] bg-[rgba(0,0,0,0.12)] px-[5px] py-px rounded-md tracking-[0.04em]">
              GA
            </span>
          </button>

          {user && (
            <>
              <div className="w-px h-[18px] bg-[rgba(255,255,255,0.08)]" />

              {/* Plan badge */}
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.06em] rounded-md px-2 py-0.5 shrink-0"
                style={{
                  color:
                    user.plan !== "free" ? "#e8ff47" : "rgba(240,237,232,0.4)",
                  background:
                    user.plan !== "free"
                      ? "rgba(232,255,71,0.08)"
                      : "rgba(255,255,255,0.04)",
                  border: `1px solid ${user.plan !== "free" ? "rgba(232,255,71,0.2)" : "rgba(255,255,255,0.08)"}`,
                }}
              >
                {user.plan !== "free" ? "Pro" : "Free"}
              </span>

              {/* User name */}
              {user.displayName && (
                <span
                  className="text-[12px] text-[rgba(240,237,232,0.5)] max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap shrink"
                  title={user.displayName}
                >
                  {user.displayName}
                </span>
              )}

              {/* Settings */}
              <a
                href="/settings"
                className="flex items-center justify-center w-7 h-7 rounded-md text-[rgba(240,237,232,0.4)] hover:text-[rgba(240,237,232,0.7)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                title="Settings"
              >
                <IconSettings size={14} />
              </a>

              {/* Sign out */}
              <button
                onClick={() => signOut()}
                className="flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-none text-[rgba(240,237,232,0.4)] hover:text-[rgba(240,237,232,0.7)] hover:bg-[rgba(255,255,255,0.06)] cursor-pointer transition-colors"
                title="Sign out"
              >
                <IconLogOut size={14} />
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <aside className="w-[200px] shrink-0 border-r border-r-[rgba(255,255,255,0.06)] flex flex-col bg-[#0e0e18] overflow-hidden p-0">
          {/* Image upload */}
          <div className="px-2.5 py-2 border-b border-b-[rgba(255,255,255,0.06)]">
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
              className="flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer"
              style={{
                background: imgDragOver
                  ? "rgba(232,255,71,0.1)"
                  : "rgba(232,255,71,0.03)",
                border: `1.5px dashed ${imgDragOver ? "#e8ff47" : "rgba(232,255,71,0.22)"}`,
              }}
            >
              <IconImage size={16} />
              <div>
                <p
                  className="text-[10px] font-semibold"
                  style={{
                    color: imgDragOver ? "#e8ff47" : "rgba(240,237,232,0.6)",
                  }}
                >
                  Select Template
                </p>
                <p className="text-[8px] text-[rgba(240,237,232,0.22)]">
                  auto-resizes canvas
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleImageFiles(e.target.files)}
              />
            </label>
          </div>

          {/* Data source */}
          <div className="px-2.5 py-2 border-b border-b-[rgba(255,255,255,0.06)]">
            {dataFileName ? (
              <div className="bg-[rgba(232,255,71,0.04)] border border-[rgba(232,255,71,0.15)] rounded-md px-2 py-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[5px] min-w-0">
                    <span className="text-[#e8ff47] shrink-0">
                      <IconBarChart size={11} />
                    </span>
                    <span className="text-[9px] font-semibold text-[#e8ff47] overflow-hidden text-ellipsis whitespace-nowrap">
                      {dataFileName}
                    </span>
                    <span className="text-[8px] text-[rgba(240,237,232,0.3)] shrink-0">
                      {rows.length}r · {columns.length}c
                    </span>
                  </div>
                  <label
                    className="cursor-pointer text-[10px] text-[rgba(240,237,232,0.3)] ml-1 shrink-0"
                    title="Replace"
                  >
                    ↺
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.tsv"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files?.[0] && handleDataFile(e.target.files[0])
                      }
                    />
                  </label>
                </div>
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
                className="flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer"
                style={{
                  background: xlsxDragOver
                    ? "rgba(232,255,71,0.06)"
                    : "rgba(255,255,255,0.02)",
                  border: `1.5px dashed ${xlsxDragOver ? "#e8ff47" : "rgba(255,255,255,0.09)"}`,
                }}
              >
                {dataLoading ? (
                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{
                      border: "2px solid rgba(232,255,71,0.2)",
                      borderTop: "2px solid #e8ff47",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                ) : (
                  <IconFolder size={14} />
                )}
                <div>
                  <p className="text-[10px] font-semibold text-[rgba(240,237,232,0.5)]">
                    {dataLoading ? "Loading…" : "Upload Data"}
                  </p>
                  <p className="text-[8px] text-[rgba(240,237,232,0.22)]">
                    XLSX · CSV · TSV
                  </p>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && handleDataFile(e.target.files[0])
                  }
                />
              </label>
            )}
            {dataError && (
              <p
                style={{
                  fontSize: 9,
                  color: "#f87171",
                  marginTop: 4,
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
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 10px" }}>
            <p
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: "rgba(240,237,232,0.25)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 4,
              }}
            >
              Fields
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
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
                          padding: "4px 7px",
                          borderRadius: 6,
                          fontSize: 9,
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
                            fontSize: 8,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >{`${col}`}</span>
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
                                borderRadius: 6,
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

          {/* Shortcuts (collapsible) */}
          <div
            style={{
              padding: "6px 12px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <button
              onClick={() => setShortcutsOpen((v) => !v)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "rgba(240,237,232,0.28)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Shortcuts
              </span>
              <ChevronUpIcon
                size={10}
                color="rgba(240,237,232,0.28)"
                style={{
                  transform: shortcutsOpen ? "rotate(180deg)" : "none",
                  transition: "transform 0.15s",
                }}
              />
            </button>
            {shortcutsOpen && (
              <div style={{ marginTop: 6 }}>
                <KbdHint keys={["Ctrl", "Z"]} label="Undo" />
                <KbdHint keys={["Ctrl", "Y"]} label="Redo" />
                <KbdHint keys={["Ctrl", "A"]} label="Select All" />
                <KbdHint keys={["Ctrl", "D"]} label="Duplicate" />
                <KbdHint keys={["Ctrl", "click"]} label="Multi-select" />
                <KbdHint
                  keys={["Ctrl", "Shift", "click"]}
                  label="Range select"
                />
                <KbdHint keys={["Ctrl", "="]} label="Zoom In" />
                <KbdHint keys={["Ctrl", "-"]} label="Zoom Out" />
                <KbdHint keys={["Space", "drag"]} label="Pan" />
                <KbdHint keys={["Del"]} label="Delete" />
              </div>
            )}
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
                data-canvas-root
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#ffffff",
                  boxShadow:
                    "0 20px 60px rgba(0,0,0,0.9),0 0 0 1px rgba(255,255,255,0.04)",
                  overflow: "visible",
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
                    <IconImage size={40} style={{ opacity: 0.07 }} />
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
                  obj={bgImage}
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
                      obj={obj as ImageObject}
                      selected={selectedIds.has(obj.id)}
                      onSelect={(id, e) => handleModifierSelect(e, id)}
                      onDrag={handleDrag}
                      onResize={handleResize}
                      scale={zoom}
                      rows={rows.length > 0 ? rows : [{}]}
                      baseRowIndex={pageIndex}
                      dataImages={dataImages}
                      onClickUp={selectOne}
                    />
                  ) : (
                    <TextEl
                      key={obj.id}
                      obj={obj as TextField}
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
                      onClickUp={selectOne}
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
            {canvasSize.width}×{canvasSize.height}px · Zoom{" "}
            {Math.round(zoom * 100)}%
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
                          borderRadius: 6,
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
                  Drag <IconDragHandle
                    size={8}
                    style={{ display: "inline" }}
                  />{" "}
                  handle to reorder layers.
                </p>
              </div>
            )}

            {/* ── STYLE TAB ──────────────────────────────────────────────── */}
            {rightTab === "style" && (
              <div
                style={{
                  padding: "8px 10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                {!anySelected || isBackgroundSelected ? (
                  <>
                    {/* Template / canvas styles */}
                    <div
                      style={{
                        padding: "7px 9px",
                        borderRadius: 6,
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
                        }}
                      >
                        Template
                      </p>
                    </div>
                    {bgImage && (
                      <DimensionInputs
                        selectedObj={bgImage}
                        updateBgDimension={updateBgDimension}
                        updateObj={() => {}}
                        hidePosition
                      />
                    )}
                    {!bgImage && (
                      <p
                        style={{
                          fontSize: 11,
                          color: "rgba(240,237,232,0.18)",
                          textAlign: "center",
                          paddingBlock: 12,
                          lineHeight: 1.7,
                        }}
                      >
                        Add a background image to set canvas size.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    {/* Selection indicator */}
                    <div
                      style={{
                        padding: "7px 9px",
                        borderRadius: 6,
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
                            <IconClose size={9} /> clear
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
                          {stylePrimary.kind === "image" ? (
                            (stylePrimary as ImageObject).isDataImage ? (
                              <>
                                <IconCamera size={10} />{" "}
                                {(stylePrimary as ImageObject)
                                  .dataImageColumn || "Data Photo"}
                              </>
                            ) : (
                              <>
                                <IconImage size={10} />{" "}
                                {(stylePrimary as ImageObject).name}
                              </>
                            )
                          ) : (
                            `T  {{${(stylePrimary as TextField).column}}}`
                          )}
                        </p>
                      ) : null}
                    </div>

                    {multiSelected && (
                      <div className="mt-1.5">
                        <p className="text-[9px] text-[rgba(240,237,232,0.25)] mb-[3px]">
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
                            value={stylePrimary?.rotation ?? 0}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (isFinite(v))
                                styleApply("rotation", ((v % 360) + 360) % 360);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === "Escape")
                                e.currentTarget.blur();
                            }}
                            className="w-full px-[7px] py-1 rounded-md bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[#f0ede8] text-[11px] font-mono text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            style={{ paddingRight: 24 }}
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-[rgba(240,237,232,0.25)] pointer-events-none">
                            deg
                          </span>
                        </div>
                      </div>
                    )}

                    {!multiSelected && stylePrimary && (
                      <DimensionInputs
                        selectedObj={
                          stylePrimary.kind === "image" &&
                          (stylePrimary as ImageObject).isBackground
                            ? stylePrimary // show base pixels for canvas/bg
                            : stylePrimary
                        }
                        updateBgDimension={updateBgDimension}
                        updateObj={styleApplyPrimary}
                      />
                    )}

                    {!multiSelected && !isBackgroundSelected && anySelected && (
                      <div
                        style={{
                          display: "flex",
                          gap: 3,
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          title="Bring Forward"
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
                            padding: "3px 8px",
                            borderRadius: 6,
                            cursor: "pointer",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "rgba(240,237,232,0.5)",
                            fontSize: 9,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <IconArrowUp size={9} /> Fwd
                        </button>
                        <button
                          title="Send Backward"
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
                            padding: "3px 8px",
                            borderRadius: 6,
                            cursor: "pointer",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "rgba(240,237,232,0.5)",
                            fontSize: 9,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <IconArrowDown size={9} /> Back
                        </button>
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
                            <div>
                              <SLabel>Opacity</SLabel>
                              <NumInput
                                value={Math.round((img?.opacity ?? 1) * 100)}
                                min={0}
                                max={100}
                                suffix="%"
                                onChange={(v) => styleApply("opacity", v / 100)}
                                style={{ width: 72 }}
                              />
                            </div>
                            {!img?.isBackground && (
                              <div>
                                <SLabel>Corner Radius</SLabel>
                                <NumInput
                                  value={img?.borderRadius ?? 0}
                                  min={0}
                                  max={
                                    img
                                      ? Math.round(
                                          Math.min(img.width, img.height) / 2,
                                        )
                                      : 999
                                  }
                                  suffix="px"
                                  onChange={(v) =>
                                    styleApply("borderRadius", v)
                                  }
                                  style={{ width: 72 }}
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

                    {/* ── TEXT STYLES ─────────────────────────────────────── */}
                    {(allText ||
                      (!multiSelected && stylePrimary?.kind === "field")) &&
                      (() => {
                        const f = stylePrimary as TextField | null;
                        return (
                          <>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-end",
                              }}
                            >
                              <div>
                                <SLabel>Display As</SLabel>
                                <div style={{ display: "flex", gap: 3 }}>
                                  {(["text", "qr", "barcode"] as const).map(
                                    (mode) => {
                                      const active =
                                        (f?.codeType ?? "text") === mode;
                                      const icons: Record<
                                        string,
                                        React.ReactNode
                                      > = {
                                        text: <IconType size={12} />,
                                        qr: <IconQrCode size={12} />,
                                        barcode: <IconBarcode size={12} />,
                                      };
                                      return (
                                        <button
                                          key={mode}
                                          title={
                                            mode === "text"
                                              ? "Text"
                                              : mode === "qr"
                                                ? "QR Code"
                                                : "Barcode"
                                          }
                                          onClick={() => {
                                            const ids = selectedIdsRef.current;
                                            if (ids.size === 0) return;
                                            setObjects((p) =>
                                              p.map((o) => {
                                                if (
                                                  !ids.has(o.id) ||
                                                  o.kind !== "field"
                                                )
                                                  return o;
                                                const tf = o as TextField;
                                                const prev =
                                                  tf.codeType ?? "text";
                                                if (prev === mode) return o;
                                                let w = tf.width,
                                                  h = tf.height;
                                                if (mode === "qr") {
                                                  const side = Math.max(w, h);
                                                  w = side;
                                                  h = side;
                                                } else if (mode === "barcode") {
                                                  w = Math.max(w, h * 2.5);
                                                  h = Math.min(h, w * 0.4);
                                                } else {
                                                  // Auto-fit to text content
                                                  const ci = currentRow
                                                    ? rows.indexOf(currentRow)
                                                    : -1;
                                                  const ti =
                                                    ci >= 0
                                                      ? ci + tf.columnOffset
                                                      : -1;
                                                  const text =
                                                    ti >= 0 && ti < rows.length
                                                      ? (rows[ti][tf.column] ??
                                                        "")
                                                      : "";
                                                  if (text) {
                                                    const m =
                                                      measureTextDimensions(
                                                        text,
                                                        tf.fontFamily,
                                                        tf.fontSize,
                                                        tf.bold,
                                                        tf.italic,
                                                      );
                                                    w = m.width;
                                                    h = m.height;
                                                  } else {
                                                    h = Math.round(
                                                      tf.fontSize * 1.4 + 8,
                                                    );
                                                  }
                                                }
                                                return {
                                                  ...tf,
                                                  codeType: mode,
                                                  width: w,
                                                  height: h,
                                                } as CanvasObject;
                                              }),
                                            );
                                          }}
                                          style={{
                                            width: 32,
                                            height: 28,
                                            borderRadius: 6,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: active
                                              ? "rgba(232,255,71,0.12)"
                                              : "rgba(255,255,255,0.04)",
                                            border: `1px solid ${active ? "rgba(232,255,71,0.3)" : "rgba(255,255,255,0.08)"}`,
                                            color: active
                                              ? "#e8ff47"
                                              : "rgba(240,237,232,0.5)",
                                          }}
                                        >
                                          {icons[mode]}
                                        </button>
                                      );
                                    },
                                  )}
                                </div>
                              </div>
                              {(f?.codeType ?? "text") === "text" && (
                                <div>
                                  <SLabel>Text Fit</SLabel>
                                  <div style={{ display: "flex", gap: 3 }}>
                                    {(
                                      [
                                        [
                                          "shrink",
                                          "Auto Shrink",
                                          <IconShrink size={12} />,
                                        ],
                                        [
                                          "visible",
                                          "Overflow Visible",
                                          <IconExpand size={12} />,
                                        ],
                                      ] as [string, string, React.ReactNode][]
                                    ).map(([mode, label, icon]) => {
                                      const active =
                                        (f?.textOverflow ?? "visible") === mode;
                                      return (
                                        <button
                                          key={mode}
                                          title={label}
                                          onClick={() =>
                                            styleApply("textOverflow", mode)
                                          }
                                          style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 6,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: active
                                              ? "rgba(232,255,71,0.12)"
                                              : "rgba(255,255,255,0.04)",
                                            border: `1px solid ${active ? "rgba(232,255,71,0.3)" : "rgba(255,255,255,0.08)"}`,
                                            color: active
                                              ? "#e8ff47"
                                              : "rgba(240,237,232,0.5)",
                                          }}
                                        >
                                          {icon}
                                        </button>
                                      );
                                    })}
                                    <button
                                      title="Auto Fit to text content"
                                      onClick={() => {
                                        const ids = selectedIdsRef.current;
                                        if (ids.size === 0) return;
                                        setObjects((p) =>
                                          p.map((o) => {
                                            if (
                                              !ids.has(o.id) ||
                                              o.kind !== "field"
                                            )
                                              return o;
                                            const tf = o as TextField;
                                            const ci = currentRow
                                              ? rows.indexOf(currentRow)
                                              : -1;
                                            const ti =
                                              ci >= 0
                                                ? ci + tf.columnOffset
                                                : -1;
                                            const text =
                                              ti >= 0 && ti < rows.length
                                                ? (rows[ti][tf.column] ?? "")
                                                : "";
                                            if (!text) return o;
                                            const m = measureTextDimensions(
                                              text,
                                              tf.fontFamily,
                                              tf.fontSize,
                                              tf.bold,
                                              tf.italic,
                                            );
                                            return {
                                              ...tf,
                                              width: m.width,
                                              height: m.height,
                                            } as CanvasObject;
                                          }),
                                        );
                                      }}
                                      style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 6,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        background: "rgba(255,255,255,0.04)",
                                        border:
                                          "1px solid rgba(255,255,255,0.08)",
                                        color: "rgba(240,237,232,0.5)",
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background =
                                          "rgba(232,255,71,0.12)";
                                        e.currentTarget.style.borderColor =
                                          "rgba(232,255,71,0.3)";
                                        e.currentTarget.style.color = "#e8ff47";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background =
                                          "rgba(255,255,255,0.04)";
                                        e.currentTarget.style.borderColor =
                                          "rgba(255,255,255,0.08)";
                                        e.currentTarget.style.color =
                                          "rgba(240,237,232,0.5)";
                                      }}
                                    >
                                      <IconFitScreen size={12} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                            {(f?.codeType ?? "text") === "text" && (
                              <>
                                <div>
                                  <SLabel>Font</SLabel>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 4,
                                      alignItems: "center",
                                    }}
                                  >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <FontPicker
                                        value={
                                          f?.fontFamily ?? "Playfair Display"
                                        }
                                        onChange={(v) =>
                                          styleApply("fontFamily", v)
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <div style={{ display: "flex", gap: 3 }}>
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
                                          padding: "5px 2px",
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
                                          width="11"
                                          height="9"
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
                                    <div
                                      style={{
                                        width: 1,
                                        background: "rgba(255,255,255,0.06)",
                                        margin: "0 1px",
                                      }}
                                    />
                                    <button
                                      onClick={() =>
                                        styleApply("italic", !f?.italic)
                                      }
                                      title="Italic"
                                      style={{
                                        width: 28,
                                        padding: "5px 0",
                                        borderRadius: 6,
                                        fontSize: 11,
                                        fontStyle: "italic",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        flexShrink: 0,
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
                                <div>
                                  <SLabel>Weight</SLabel>
                                  <div className="flex gap-2 items-center">
                                    <Select
                                      value={String(
                                        f?.fontWeight ?? (f?.bold ? 700 : 400),
                                      )}
                                      onValueChange={(v) => {
                                        const w = Number(v);
                                        styleApply("fontWeight", w);
                                        styleApply("bold", w >= 700);
                                      }}
                                    >
                                      <SelectTrigger
                                        size="sm"
                                        className="w-full h-7 text-[10px] font-mono"
                                      >
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="dark">
                                        {[
                                          100, 200, 300, 400, 500, 600, 700,
                                          800, 900,
                                        ].map((w) => {
                                          const labels: Record<number, string> =
                                            {
                                              100: "Thin",
                                              200: "Extra Light",
                                              300: "Light",
                                              400: "Regular",
                                              500: "Medium",
                                              600: "Semi Bold",
                                              700: "Bold",
                                              800: "Extra Bold",
                                              900: "Black",
                                            };
                                          return (
                                            <SelectItem
                                              key={w}
                                              value={String(w)}
                                              className="text-[10px] font-mono"
                                            >
                                              {w} — {labels[w]}
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectContent>
                                    </Select>
                                    <NumInput
                                      value={f?.fontSize ?? 22}
                                      min={4}
                                      max={999}
                                      suffix="px"
                                      onChange={(v) =>
                                        styleApplyWithAutoFit("fontSize", v)
                                      }
                                    />
                                  </div>
                                </div>
                              </>
                            )}
                            <div>
                              <SLabel>Color</SLabel>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 4,
                                  alignItems: "center",
                                }}
                              >
                                <div
                                  style={{
                                    position: "relative",
                                    width: 26,
                                    height: 26,
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
                                    // flex: 1,
                                    width: 72,
                                    // minWidth: 0,
                                    padding: "5px 6px",
                                    borderRadius: 6,
                                    background: "rgba(255,255,255,0.05)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    color: "#f0ede8",
                                    fontSize: 10,
                                    fontFamily: "monospace",
                                    outline: "none",
                                  }}
                                />
                                {"EyeDropper" in window && (
                                  <button
                                    title="Pick color from screen"
                                    onClick={async () => {
                                      try {
                                        const ed = new (
                                          window as any
                                        ).EyeDropper();
                                        const result = await ed.open();
                                        if (result?.sRGBHex)
                                          styleApply("color", result.sRGBHex);
                                      } catch {}
                                    }}
                                    style={{
                                      width: 26,
                                      height: 26,
                                      borderRadius: 6,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      background: "rgba(255,255,255,0.04)",
                                      border:
                                        "1px solid rgba(255,255,255,0.08)",
                                      color: "rgba(240,237,232,0.5)",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <IconEyedropper size={12} />
                                  </button>
                                )}
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
                      title={
                        multiSelected
                          ? `Remove ${selectedIds.size} objects`
                          : "Remove object"
                      }
                      onClick={deleteSelected}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
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
                      <IconTrash size={12} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

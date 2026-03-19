import { useRef } from "react";
import type { CanvasObject, HandleKey, TextField } from "../types/index";

export function useDragResize(
  obj: CanvasObject,
  onSelect: (id: number, e: React.MouseEvent) => void,
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
    onSelect(obj.id, e);
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
    onSelect(obj.id, e);
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
      const dx = (e.clientX - r.sx) / scale;
      const dy = (e.clientY - r.sy) / scale;
      const MIN = 20;
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
        const isH = h === "e" || h === "w";
        const isV = h === "n" || h === "s";
        if (isH) {
          nh = Math.round(nw / r.ar);
          if (h.includes("n")) ny = r.oy + r.oh - nh;
        } else if (isV) {
          nw = Math.round(nh * r.ar);
          if (h.includes("w")) nx = r.ox + r.ow - nw;
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

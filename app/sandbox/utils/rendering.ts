import type { Shadow } from "../types/index";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";

export const shadowCSS = (s: Shadow): string =>
  s.enabled ? `${s.x}px ${s.y}px ${s.blur}px ${s.color}` : "none";

export function textShadowCSS(s: Shadow): string {
  if (!s.enabled && (!s.thickness || s.thickness === 0)) return "none";
  const parts: string[] = [];
  if (s.thickness && s.thickness > 0) {
    const t = s.thickness;
    const steps = Math.max(8, Math.round(t * 6));
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * 2 * Math.PI;
      parts.push(
        `${Math.round(Math.cos(angle) * t * 10) / 10}px ${Math.round(Math.sin(angle) * t * 10) / 10}px 0px ${s.color}`,
      );
    }
  }
  if (s.enabled) parts.push(`${s.x}px ${s.y}px ${s.blur}px ${s.color}`);
  return parts.length ? parts.join(", ") : "none";
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

export function shrinkFontSize(
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

/** Measure the pixel dimensions of text with given font settings. */
export function measureTextDimensions(
  text: string,
  family: string,
  fontSize: number,
  bold: boolean,
  italic: boolean,
): { width: number; height: number } {
  if (!text || typeof document === "undefined") return { width: 60, height: fontSize * 1.4 };
  const el = getMeasureEl();
  el.style.fontFamily = `'${family}', serif`;
  el.style.fontSize = `${fontSize}px`;
  el.style.fontWeight = bold ? "bold" : "normal";
  el.style.fontStyle = italic ? "italic" : "normal";
  el.textContent = text;
  return { width: el.offsetWidth + 10, height: Math.max(el.offsetHeight + 8, fontSize * 1.4) };
}

export function downloadBlob(blob: Blob, filename: string) {
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

export async function generateCodeDataURL(
  text: string,
  type: "qr" | "barcode",
  width: number,
  height: number,
  color: string,
): Promise<string | null> {
  if (!text) return null;
  if (type === "qr") {
    try {
      return await QRCode.toDataURL(text, {
        width: Math.min(width, height),
        margin: 1,
        color: { dark: color, light: "#ffffff" },
      });
    } catch {
      return null;
    }
  } else {
    const canvas = document.createElement("canvas");
    try {
      JsBarcode(canvas, text, {
        format: "CODE128",
        lineColor: color,
        background: "#ffffff",
        width: 2,
        height: Math.max(20, height - 8),
        displayValue: false,
        margin: 4,
      });
      return canvas.toDataURL();
    } catch {
      return null;
    }
  }
}

/**
 * Render a QR code or barcode directly to an HTMLCanvasElement.
 * Used by the export path to avoid the data-URL → Image round-trip
 * which can fail due to crossOrigin / canvas-tainting edge cases.
 */
export async function generateCodeCanvas(
  text: string,
  type: "qr" | "barcode",
  width: number,
  height: number,
  color: string,
): Promise<HTMLCanvasElement | null> {
  if (!text) return null;
  if (type === "qr") {
    const canvas = document.createElement("canvas");
    try {
      await QRCode.toCanvas(canvas, text, {
        width: Math.max(width, height),
        margin: 1,
        color: { dark: color, light: "#ffffff" },
      });
      return canvas;
    } catch {
      return null;
    }
  } else {
    const canvas = document.createElement("canvas");
    try {
      JsBarcode(canvas, text, {
        format: "CODE128",
        lineColor: color,
        background: "#ffffff",
        width: 2,
        height: Math.max(20, height - 8),
        displayValue: false,
        margin: 4,
      });
      return canvas;
    } catch {
      return null;
    }
  }
}

const _scriptCache: Record<string, Promise<any>> = {};

export function loadScript(src: string, globalKey: string): Promise<any> {
  if ((window as any)[globalKey]) return Promise.resolve((window as any)[globalKey]);
  if (src in _scriptCache) return _scriptCache[src];
  _scriptCache[src] = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => {
      const val = (window as any)[globalKey];
      if (val) resolve(val);
      else reject(new Error(`${globalKey} not found after loading ${src}`));
    };
    s.onerror = () => {
      delete _scriptCache[src];
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(s);
  });
  return _scriptCache[src];
}

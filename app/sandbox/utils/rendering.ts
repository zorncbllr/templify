import type { Shadow } from "../types/index";

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

export async function loadScript(src: string, globalKey: string): Promise<any> {
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

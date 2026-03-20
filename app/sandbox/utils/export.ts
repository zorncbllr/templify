import type { CanvasObject, CanvasSize, RowData, DataImageMap, ImageObject, TextField, ImpositionResult } from "../types";
import { resolveDataImageSrc } from "./data";
import { shrinkFontSize, loadScript, downloadBlob, generateCodeCanvas } from "./rendering";

/** Load an image from a src URL and return it as an HTMLImageElement. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Retry without crossOrigin for data: URLs or local blobs
      const retry = new Image();
      retry.onload = () => resolve(retry);
      retry.onerror = reject;
      retry.src = src;
    };
    img.src = src;
  });
}

/**
 * Draw a rounded-rect clipping path.
 */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Render a single card directly to a canvas using the Canvas 2D API.
 * No html2canvas — avoids cross-origin stylesheet and CSS color issues.
 */
/** Render a small JPEG thumbnail of the template (max 300px wide).
 *  Renders directly at thumbnail scale — no full-res intermediate canvas. */
export async function renderThumbnail(
  objects: CanvasObject[],
  canvasSize: CanvasSize,
  rows: RowData[],
  dataImages: DataImageMap,
): Promise<string> {
  const maxW = 300;
  const scale = Math.min(maxW / canvasSize.width, 1);
  const thumbW = Math.round(canvasSize.width * scale);
  const thumbH = Math.round(canvasSize.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = thumbW;
  canvas.height = thumbH;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

  const sorted = [...objects].sort((a, b) => a.zIndex - b.zIndex);

  for (const obj of sorted) {
    if (obj.kind === "image") {
      const imgObj = obj as ImageObject;
      const src = imgObj.isDataImage
        ? resolveDataImageSrc(
            imgObj.isDataImage, imgObj.dataImageColumn, 0,
            imgObj.src, rows, 0, dataImages,
          )
        : imgObj.src;

      let img: HTMLImageElement;
      try { img = await loadImage(src); } catch { continue; }

      const x = imgObj.isBackground ? 0 : imgObj.x;
      const y = imgObj.isBackground ? 0 : imgObj.y;
      const w = imgObj.isBackground ? canvasSize.width : imgObj.width;
      const h = imgObj.isBackground ? canvasSize.height : imgObj.height;
      const radius = imgObj.isBackground ? 0 : (imgObj.borderRadius ?? 0);

      ctx.save();
      ctx.globalAlpha = imgObj.opacity;

      if (!imgObj.isBackground && imgObj.rotation) {
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.translate(cx, cy);
        ctx.rotate((imgObj.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      if (radius > 0) {
        roundRectPath(ctx, x, y, w, h, radius);
        ctx.clip();
      }

      ctx.drawImage(img, x, y, w, h);
      ctx.restore();
    } else {
      const f = obj as TextField;
      const text = rows.length > 0 ? (rows[0][f.column] ?? "") : "";
      if (!text) continue;

      const codeType = f.codeType ?? "text";

      ctx.save();

      if (f.rotation) {
        const cx = f.x + f.width / 2;
        const cy = f.y + f.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate((f.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      if (codeType === "qr" || codeType === "barcode") {
        const codeCanvas = await generateCodeCanvas(text, codeType, f.width, f.height, f.color);
        if (codeCanvas) {
          ctx.drawImage(codeCanvas, f.x, f.y, f.width, f.height);
        }
        ctx.restore();
        continue;
      }

      const fs = f.textOverflow === "shrink"
        ? shrinkFontSize(text, f.width, f.height, f.fontFamily, f.fontSize, f.bold, f.italic)
        : f.fontSize;

      if (f.textOverflow === "shrink") {
        ctx.beginPath();
        ctx.rect(f.x, f.y, f.width, f.height);
        ctx.clip();
      }

      const fontStyle = f.italic ? "italic" : "normal";
      const fontWeight = f.fontWeight ?? (f.bold ? 700 : 400);
      ctx.font = `${fontStyle} ${fontWeight} ${fs}px '${f.fontFamily}', serif`;
      ctx.fillStyle = f.color;

      let textX = f.x + 3;
      if (f.textAlign === "center") { ctx.textAlign = "center"; textX = f.x + f.width / 2; }
      else if (f.textAlign === "right") { ctx.textAlign = "right"; textX = f.x + f.width - 3; }
      else { ctx.textAlign = "left"; }

      ctx.textBaseline = "middle";
      ctx.fillText(text, textX, f.y + f.height / 2);
      ctx.restore();
    }
  }

  return canvas.toDataURL("image/jpeg", 0.5);
}

export async function renderSingleCard(
  objects: CanvasObject[],
  canvasSize: CanvasSize,
  rows: RowData[],
  rowIndex: number,
  dataImages: DataImageMap,
  watermark = false,
): Promise<HTMLCanvasElement> {
  const SCALE = 2;
  const canvas = document.createElement("canvas");
  canvas.width = canvasSize.width * SCALE;
  canvas.height = canvasSize.height * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

  const sorted = [...objects].sort((a, b) => a.zIndex - b.zIndex);

  for (const obj of sorted) {
    if (obj.kind === "image") {
      const imgObj = obj as ImageObject;
      const src = imgObj.isDataImage
        ? resolveDataImageSrc(
            imgObj.isDataImage,
            imgObj.dataImageColumn,
            0,
            imgObj.src,
            rows,
            rowIndex,
            dataImages,
          )
        : imgObj.src;

      let img: HTMLImageElement;
      try {
        img = await loadImage(src);
      } catch {
        continue; // skip broken images
      }

      const x = imgObj.isBackground ? 0 : imgObj.x;
      const y = imgObj.isBackground ? 0 : imgObj.y;
      const w = imgObj.isBackground ? canvasSize.width : imgObj.width;
      const h = imgObj.isBackground ? canvasSize.height : imgObj.height;
      const radius = imgObj.isBackground ? 0 : (imgObj.borderRadius ?? 0);

      ctx.save();
      ctx.globalAlpha = imgObj.opacity;

      // Rotation
      if (!imgObj.isBackground && imgObj.rotation) {
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.translate(cx, cy);
        ctx.rotate((imgObj.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      // Drop shadow
      if (imgObj.shadow?.enabled) {
        ctx.shadowOffsetX = imgObj.shadow.x;
        ctx.shadowOffsetY = imgObj.shadow.y;
        ctx.shadowBlur = imgObj.shadow.blur;
        ctx.shadowColor = imgObj.shadow.color;
      }

      // Clip for border-radius
      if (radius > 0) {
        roundRectPath(ctx, x, y, w, h, radius);
        ctx.clip();
      }

      ctx.drawImage(img, x, y, w, h);

      // Reset shadow before drawing border
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";

      // Border
      if (imgObj.border?.enabled && imgObj.border.width > 0) {
        const bw = imgObj.border.width;
        ctx.strokeStyle = imgObj.border.color;
        ctx.lineWidth = bw;
        if (imgObj.border.style === "dashed") ctx.setLineDash([bw * 3, bw * 2]);
        else if (imgObj.border.style === "dotted") ctx.setLineDash([bw, bw]);
        else ctx.setLineDash([]);
        roundRectPath(ctx, x + bw / 2, y + bw / 2, w - bw, h - bw, Math.max(0, radius - bw / 2));
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();
    } else {
      const f = obj as TextField;
      const text =
        rowIndex >= 0 && rowIndex < rows.length ? (rows[rowIndex][f.column] ?? "") : "";
      if (!text) continue;

      const codeType = f.codeType ?? "text";

      ctx.save();

      // Rotation
      if (f.rotation) {
        const cx = f.x + f.width / 2;
        const cy = f.y + f.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate((f.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      if (codeType === "qr" || codeType === "barcode") {
        const codeCanvas = await generateCodeCanvas(text, codeType, f.width, f.height, f.color);
        if (codeCanvas) {
          ctx.drawImage(codeCanvas, f.x, f.y, f.width, f.height);
        }
        ctx.restore();
        continue;
      }

      const fs = f.textOverflow === "shrink"
        ? shrinkFontSize(
            text,
            f.width,
            f.height,
            f.fontFamily,
            f.fontSize,
            f.bold,
            f.italic,
          )
        : f.fontSize;

      // Clip to text field bounds (only when shrinking)
      if (f.textOverflow === "shrink") {
        ctx.beginPath();
        ctx.rect(f.x, f.y, f.width, f.height);
        ctx.clip();
      }

      const fontStyle = f.italic ? "italic" : "normal";
      const fontWeight = f.fontWeight ?? (f.bold ? 700 : 400);
      ctx.font = `${fontStyle} ${fontWeight} ${fs}px '${f.fontFamily}', serif`;
      ctx.fillStyle = f.color;

      // Horizontal alignment
      let textX = f.x + 3; // padding
      if (f.textAlign === "center") {
        ctx.textAlign = "center";
        textX = f.x + f.width / 2;
      } else if (f.textAlign === "right") {
        ctx.textAlign = "right";
        textX = f.x + f.width - 3;
      } else {
        ctx.textAlign = "left";
      }

      // Vertical center
      ctx.textBaseline = "middle";
      const textY = f.y + f.height / 2;

      // Text shadow / stroke outline (thickness)
      if (f.shadow.thickness && f.shadow.thickness > 0) {
        ctx.strokeStyle = f.shadow.color;
        ctx.lineWidth = f.shadow.thickness * 2;
        ctx.lineJoin = "round";
        ctx.strokeText(text, textX, textY);
      }
      if (f.shadow.enabled) {
        ctx.shadowOffsetX = f.shadow.x;
        ctx.shadowOffsetY = f.shadow.y;
        ctx.shadowBlur = f.shadow.blur;
        ctx.shadowColor = f.shadow.color;
      }

      ctx.fillText(text, textX, textY);
      ctx.restore();
    }
  }

  if (watermark) {
    ctx.save();
    const fs = Math.max(8, Math.round(canvasSize.width * 0.018));
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#000000";
    ctx.font = `bold ${fs}px sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    const tx = canvasSize.width - 6;
    const ty = canvasSize.height - 4;
    ctx.fillText("Made with Templify", tx, ty);
    // Sparkle icon
    const textW = ctx.measureText("Made with Templify").width;
    const iconSize = fs * 0.9;
    const iconX = tx - textW - iconSize - 2;
    const iconY = ty - fs * 0.85;
    ctx.save();
    ctx.translate(iconX, iconY);
    ctx.scale(iconSize / 24, iconSize / 24);
    ctx.beginPath();
    ctx.moveTo(12, 1);
    ctx.quadraticCurveTo(12.5, 11, 23, 12);
    ctx.quadraticCurveTo(12.5, 13, 12, 23);
    ctx.quadraticCurveTo(11.5, 13, 1, 12);
    ctx.quadraticCurveTo(11.5, 11, 12, 1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  return canvas;
}

/**
 * Render a single imposition sheet canvas by compositing pre-rendered card
 * canvases according to the GA layout result.
 */
function renderImpositionSheet(
  cardCanvases: HTMLCanvasElement[],
  layout: ImpositionResult,
  sheetW: number,
  sheetH: number,
): HTMLCanvasElement {
  const scale = 2;
  const sheet = document.createElement("canvas");
  sheet.width = sheetW * scale;
  sheet.height = sheetH * scale;
  const ctx = sheet.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, sheetW, sheetH);

  const isRotated = layout.gene.rotation === 1;
  const cardW = layout.cardW;
  const cardH = layout.cardH;

  for (let i = 0; i < cardCanvases.length; i++) {
    const col = i % layout.cols;
    const row = Math.floor(i / layout.cols);
    const x = layout.offsetX + col * (cardW + layout.gene.gapX);
    const y = layout.offsetY + row * (cardH + layout.gene.gapY);

    ctx.save();
    if (isRotated) {
      // The card was rendered at its original (unrotated) size.
      // cardW/cardH in the layout are already swapped for rotation,
      // so we rotate the original canvas into the rotated slot.
      ctx.translate(x + cardW, y);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(cardCanvases[i], 0, 0, cardH, cardW);
    } else {
      ctx.drawImage(cardCanvases[i], x, y, cardW, cardH);
    }
    ctx.restore();
  }

  return sheet;
}

export async function exportRecords(
  format: string,
  objects: CanvasObject[],
  canvasSize: CanvasSize,
  rows: RowData[],
  dataImages: DataImageMap,
  layout: ImpositionResult,
  sheet: { w: number; h: number },
  watermark: boolean,
  onProgress: (pct: number) => void,
) {
  if (!rows.length) rows = [{}];
  onProgress(5);

  const totalCards = rows.length;
  const cardsPerSheet = layout.count;
  const totalSheets = Math.ceil(totalCards / cardsPerSheet);

  // Pre-render all individual cards
  const cardCanvases: HTMLCanvasElement[] = [];
  for (let i = 0; i < totalCards; i++) {
    cardCanvases.push(
      await renderSingleCard(objects, canvasSize, rows, i, dataImages, watermark),
    );
    onProgress(Math.round(5 + (i / totalCards) * 45));
  }

  if (format === "PNG") {
    const JSZip = await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
      "JSZip",
    );
    const zip = new JSZip();

    for (let s = 0; s < totalSheets; s++) {
      const startIdx = s * cardsPerSheet;
      const endIdx = Math.min(startIdx + cardsPerSheet, totalCards);
      const sheetCards = cardCanvases.slice(startIdx, endIdx);
      const sheetCanvas = renderImpositionSheet(sheetCards, layout, sheet.w, sheet.h);



      const blob = await new Promise<Blob>((resolve) =>
        sheetCanvas.toBlob((b) => resolve(b!), "image/png"),
      );
      zip.file(`sheet_${s + 1}.png`, blob);
      onProgress(Math.round(50 + ((s + 1) / totalSheets) * 45));
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, "templify_export.zip");
  } else if (format === "PDF") {
    const jsPDF = await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      "jspdf",
    );
    const { jsPDF: JsPDF } = jsPDF;
    const pxToMm = 0.264583;
    const pW = sheet.w * pxToMm;
    const pH = sheet.h * pxToMm;
    let pdf: any = null;

    for (let s = 0; s < totalSheets; s++) {
      const startIdx = s * cardsPerSheet;
      const endIdx = Math.min(startIdx + cardsPerSheet, totalCards);
      const sheetCards = cardCanvases.slice(startIdx, endIdx);
      const sheetCanvas = renderImpositionSheet(sheetCards, layout, sheet.w, sheet.h);



      const imgData = sheetCanvas.toDataURL("image/png");

      if (!pdf) {
        pdf = new JsPDF({
          orientation: pW > pH ? "l" : "p",
          unit: "mm",
          format: [pW, pH],
        });
      } else {
        pdf.addPage([pW, pH], pW > pH ? "l" : "p");
      }
      pdf.addImage(imgData, "PNG", 0, 0, pW, pH);
      onProgress(Math.round(50 + ((s + 1) / totalSheets) * 45));
    }

    if (pdf) pdf.save("templify_export.pdf");
  }
  onProgress(100);
}

import type { CanvasObject, CanvasSize, RowData, DataImageMap, ImageObject, TextField } from "../types";
import { resolveDataImageSrc } from "./data";
import { shrinkFontSize, textShadowCSS, shadowCSS, loadScript, downloadBlob } from "./rendering";

export async function renderSingleCard(
  objects: CanvasObject[],
  canvasSize: CanvasSize,
  rows: RowData[],
  rowIndex: number,
  dataImages: DataImageMap,
): Promise<HTMLCanvasElement> {
  const page = document.createElement("div");
  page.style.cssText = `position:fixed;top:-99999px;left:-99999px;width:${canvasSize.width}px;height:${canvasSize.height}px;overflow:hidden;background:#fff;`;
  document.body.appendChild(page);

  const bgImg = objects.find(
    (o) => o.kind === "image" && (o as ImageObject).isBackground,
  ) as ImageObject | undefined;

  if (bgImg) {
    const img = document.createElement("img");
    img.src = bgImg.src;
    img.style.cssText = `position:absolute;inset:0;width:100%;height:100%;object-fit:fill;opacity:${bgImg.opacity};`;
    page.appendChild(img);
  }

  const sorted = [...objects].sort((a, b) => a.zIndex - b.zIndex);
  for (const obj of sorted) {
    if (obj.kind === "image") {
      const imgObj = obj as ImageObject;
      if (imgObj.isBackground) continue;
      const img = document.createElement("img");
      img.src = imgObj.isDataImage
        ? resolveDataImageSrc(
            imgObj.isDataImage,
            imgObj.dataImageColumn,
            imgObj.columnOffset,
            imgObj.src,
            rows,
            rowIndex,
            dataImages,
          )
        : imgObj.src;
      img.style.cssText = `position:absolute;left:${imgObj.x}px;top:${imgObj.y}px;width:${imgObj.width}px;height:${imgObj.height}px;opacity:${imgObj.opacity};object-fit:fill;border-radius:${imgObj.borderRadius ?? 0}px;box-sizing:border-box;${imgObj.border?.enabled ? `border:${imgObj.border.width}px ${imgObj.border.style} ${imgObj.border.color};` : ""}`;
      if (imgObj.shadow.enabled)
        img.style.filter = `drop-shadow(${shadowCSS(imgObj.shadow)})`;
      page.appendChild(img);
    } else {
      const f = obj as TextField;
      const ti = rowIndex + f.columnOffset;
      const text =
        ti >= 0 && ti < rows.length ? (rows[ti][f.column] ?? "") : "";
      const fs = shrinkFontSize(
        text,
        f.width,
        f.height,
        f.fontFamily,
        f.fontSize,
        f.bold,
        f.italic,
      );
      const span = document.createElement("div");
      span.textContent = text;
      span.style.cssText = [
        `position:absolute;left:${f.x}px;top:${f.y}px;width:${f.width}px;height:${f.height}px;overflow:hidden;`,
        `font-family:'${f.fontFamily}',serif;font-size:${fs}px;color:${f.color};`,
        `font-weight:${f.bold ? "bold" : "normal"};font-style:${f.italic ? "italic" : "normal"};`,
        `text-align:${f.textAlign};display:flex;align-items:center;`,
        `justify-content:${f.textAlign === "right" ? "flex-end" : f.textAlign === "center" ? "center" : "flex-start"};`,
        `padding:0 3px;white-space:nowrap;box-sizing:border-box;`,
        f.shadow.enabled || (f.shadow.thickness && f.shadow.thickness > 0)
          ? `text-shadow:${textShadowCSS(f.shadow)};`
          : "",
      ].join("");
      page.appendChild(span);
    }
  }

  const imgs = page.querySelectorAll("img");
  await Promise.all(
    Array.from(imgs).map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((r) => {
            img.onload = r;
            img.onerror = r;
          }),
    ),
  );

  const h2c = await loadScript(
    "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
    "html2canvas",
  );
  const resultCanvas = await h2c(page, {
    useCORS: true,
    allowTaint: true,
    scale: 2,
    width: canvasSize.width,
    height: canvasSize.height,
    x: 0,
    y: 0,
    scrollX: 0,
    scrollY: 0,
    backgroundColor: "#ffffff",
  });

  document.body.removeChild(page);
  return resultCanvas;
}

export async function exportRecords(
  format: string,
  objects: CanvasObject[],
  canvasSize: CanvasSize,
  rows: RowData[],
  dataImages: DataImageMap,
  onProgress: (pct: number) => void,
) {
  if (!rows.length) rows = [{}];
  onProgress(5);
  const totalRows = rows.length;

  if (format === "PNG") {
    for (let i = 0; i < totalRows; i++) {
      const cv = await renderSingleCard(objects, canvasSize, rows, i, dataImages);
      await new Promise<void>((resolve) =>
        cv.toBlob((blob) => {
          if (blob) downloadBlob(blob, `record_${i + 1}.png`);
          resolve();
        }, "image/png"),
      );
      onProgress(Math.round(10 + (i / totalRows) * 90));
    }
  } else if (format === "PDF") {
    const jsPDF = await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      "jspdf",
    );
    const { jsPDF: JsPDF } = jsPDF;
    const pW = canvasSize.width * 0.264583;
    const pH = canvasSize.height * 0.264583;
    let pdf: any = null;
    for (let i = 0; i < totalRows; i++) {
      const cv = await renderSingleCard(objects, canvasSize, rows, i, dataImages);
      const imgData = cv.toDataURL("image/png");
      if (!pdf)
        pdf = new JsPDF({
          orientation: pW > pH ? "l" : "p",
          unit: "mm",
          format: [pW, pH],
        });
      else pdf.addPage([pW, pH], pW > pH ? "l" : "p");
      pdf.addImage(imgData, "PNG", 0, 0, pW, pH);
      onProgress(Math.round(10 + (i / totalRows) * 88));
    }
    if (pdf) pdf.save("templify_export.pdf");
  }
  onProgress(100);
}

import type { RowData, DataImageMap } from "../types";
import { IMAGE_EXTS } from "../types/constants";

export function normalizeImageKey(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .trim();
}

export function detectImageColumns(
  rows: RowData[],
  columns: string[],
  sampleSize = 20,
  threshold = 0.5,
): string[] {
  if (!rows.length || !columns.length) return [];
  const sample = rows.slice(0, sampleSize);
  const detected: string[] = [];
  for (const col of columns) {
    const values = sample
      .map((r) => (r[col] ?? "").trim())
      .filter((v) => v.length > 0);
    if (!values.length) continue;
    const matchCount = values.filter((v) => {
      if (IMAGE_EXTS.test(v)) return true;
      if (
        v.length < 80 &&
        !/\s/.test(v) &&
        /^[a-zA-Z0-9_\-().]+$/.test(v) &&
        v.length >= 2
      ) {
        const colLower = col.toLowerCase();
        if (
          colLower.includes("photo") ||
          colLower.includes("image") ||
          colLower.includes("img") ||
          colLower.includes("picture") ||
          colLower.includes("avatar") ||
          colLower.includes("headshot") ||
          colLower.includes("pic") ||
          colLower.includes("portrait")
        )
          return true;
      }
      return false;
    }).length;
    if (matchCount / values.length >= threshold) detected.push(col);
  }
  return detected;
}

async function loadSheetJS(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).XLSX) {
      resolve((window as any).XLSX);
      return;
    }
    const s = document.createElement("script");
    s.src =
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => resolve((window as any).XLSX);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export async function parseSpreadsheet(
  file: File,
): Promise<{ columns: string[]; rows: RowData[] }> {
  const XLSX = await loadSheetJS();
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, {
    type: "array",
    cellText: true,
    cellDates: true,
    dateNF: "yyyy-mm-dd",
  });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: false,
  });
  if (!rawRows.length) return { columns: [], rows: [] };

  let bestIdx = 0, bestScore = -Infinity;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i];
    let score = 0, nz = 0;
    for (const cell of row) {
      const v = String(cell ?? "").trim();
      if (!v) continue;
      nz++;
      if (isNaN(Number(v))) score += 3;
      if (/^[a-zA-Z]/.test(v)) score += 2;
      if (v.length > 60) score -= 5;
    }
    score += nz;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  const seen = new Map<string, number>();
  const columns: string[] = rawRows[bestIdx]
    .map((h: any, ci: number) => {
      let name =
        String(h ?? "")
          .replace(/^\uFEFF/, "")
          .replace(/\u00A0/g, " ")
          .replace(/[\r\n]+/g, " ")
          .trim()
          .replace(/\s+/g, "_")
          .replace(/[^\w.\-]/g, "")
          .replace(/^_+|_+$/g, "") || `col_${ci + 1}`;
      if (seen.has(name)) {
        const n = seen.get(name)! + 1;
        seen.set(name, n);
        name = `${name}_${n}`;
      } else seen.set(name, 1);
      return name;
    })
    .filter((c: string) => c.length > 0);

  const dataRows: RowData[] = rawRows
    .slice(bestIdx + 1)
    .filter((r: any[]) => r.some((c: any) => String(c ?? "").trim()))
    .map((r: any[]) => {
      const o: RowData = {};
      columns.forEach((col, i) => {
        o[col] = String(r[i] ?? "").trim();
      });
      return o;
    });

  return { columns, rows: dataRows };
}

export function resolveDataImageSrc(
  isDataImage: boolean,
  dataImageColumn: string,
  columnOffset: number,
  src: string,
  rows: RowData[],
  baseRowIndex: number,
  dataImages: DataImageMap,
): string {
  if (!isDataImage || !dataImageColumn) return src;
  const offset = columnOffset ?? 0;
  const ti = baseRowIndex + offset;
  const row = ti >= 0 && ti < rows.length ? rows[ti] : null;
  if (!row) return src;
  const rawValue = (row[dataImageColumn] ?? "").trim();
  if (!rawValue) return src;
  return (
    dataImages[rawValue.toLowerCase()] ??
    dataImages[normalizeImageKey(rawValue)] ??
    src
  );
}

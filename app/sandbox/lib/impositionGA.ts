import type { ImpositionGene, ImpositionResult } from "../types/index";

/**
 * Deterministic imposition solver.
 *
 * The optimal card layout on a sheet is a closed-form arithmetic problem —
 * a genetic algorithm adds noise without benefit. We enumerate every valid
 * (rotation × cols × rows) combination, score them, and return the best.
 *
 * runImpositionGA preserves the exact same async/callback API so no other
 * file needs to change.
 *
 * Scoring (strict priority order):
 *   1. Maximise cards per sheet   ← dominant
 *   2. Minimise paper waste
 *   3. Prefer fewer cut lines     ← tiebreaker
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ImpositionGAParams = {
  cardW: number;
  cardH: number;
  sheetW: number;
  sheetH: number;
  minBleedPx: number;
  allowRotation: boolean;
  onProgress: (best: ImpositionResult, gen: number, done: boolean) => void;
};

// ─── Build one candidate result ───────────────────────────────────────────────

function makeResult(
  cols: number,
  rows: number,
  rotation: 0 | 1,
  gap: number,
  cardW: number,
  cardH: number,
  sheetW: number,
  sheetH: number,
): ImpositionResult {
  const cW = rotation === 0 ? cardW : cardH;
  const cH = rotation === 0 ? cardH : cardW;

  const usedW = cols * cW + (cols - 1) * gap;
  const usedH = rows * cH + (rows - 1) * gap;

  // Centre the grid — symmetric margins, extra pixel to right/bottom if odd
  const marginLeft = Math.floor((sheetW - usedW) / 2);
  const marginTop = Math.floor((sheetH - usedH) / 2);
  const marginRight = sheetW - usedW - marginLeft;
  const marginBottom = sheetH - usedH - marginTop;

  const gene: ImpositionGene = {
    gapX: gap,
    gapY: gap,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    rotation,
  };

  const count = cols * rows;
  const usedArea = count * cW * cH;
  const sheetArea = sheetW * sheetH;
  const wastePercent = Math.max(0, ((sheetArea - usedArea) / sheetArea) * 100);
  const cutLines = (cols > 1 ? cols - 1 : 0) + (rows > 1 ? rows - 1 : 0) + 4;

  // Strict priority: cards >> waste >> cuts
  const fitness = count * 1_000_000 - wastePercent * 100 - cutLines;

  return {
    gene,
    cols,
    rows,
    count,
    wastePercent,
    cutLines,
    fitness,
    cardW: cW,
    cardH: cH,
    printAreaW: sheetW - marginLeft - marginRight,
    printAreaH: sheetH - marginTop - marginBottom,
    offsetX: marginLeft,
    offsetY: marginTop,
  };
}

// ─── Exhaustive solver ────────────────────────────────────────────────────────

function solve(
  cardW: number,
  cardH: number,
  sheetW: number,
  sheetH: number,
  minBleedPx: number,
  allowRotation: boolean,
): ImpositionResult {
  const gap = Math.max(0, Math.round(minBleedPx));
  const rotations: (0 | 1)[] = allowRotation ? [0, 1] : [0];
  let best: ImpositionResult | null = null;

  for (const rot of rotations) {
    const cW = rot === 0 ? cardW : cardH;
    const cH = rot === 0 ? cardH : cardW;

    const maxCols = Math.floor((sheetW + gap) / (cW + gap));
    const maxRows = Math.floor((sheetH + gap) / (cH + gap));
    if (maxCols < 1 || maxRows < 1) continue;

    for (let cols = 1; cols <= maxCols; cols++) {
      for (let rows = 1; rows <= maxRows; rows++) {
        const neededW = cols * cW + (cols - 1) * gap;
        const neededH = rows * cH + (rows - 1) * gap;
        if (neededW > sheetW || neededH > sheetH) continue;

        const r = makeResult(
          cols,
          rows,
          rot,
          gap,
          cardW,
          cardH,
          sheetW,
          sheetH,
        );
        if (!best || r.fitness > best.fitness) best = r;
      }
    }
  }

  // Absolute fallback
  return best ?? makeResult(1, 1, 0, gap, cardW, cardH, sheetW, sheetH);
}

// ─── evalImpositionGene (kept for any external callers) ──────────────────────

export function evalImpositionGene(
  gene: ImpositionGene,
  cardW: number,
  cardH: number,
  sheetW: number,
  sheetH: number,
  _minBleedPx: number,
): ImpositionResult {
  const cW = gene.rotation === 0 ? cardW : cardH;
  const cH = gene.rotation === 0 ? cardH : cardW;
  const printW = sheetW - gene.marginLeft - gene.marginRight;
  const printH = sheetH - gene.marginTop - gene.marginBottom;

  if (printW < cW || printH < cH) {
    return {
      gene,
      cols: 0,
      rows: 0,
      count: 0,
      wastePercent: 100,
      cutLines: 0,
      fitness: -9999,
      cardW: cW,
      cardH: cH,
      printAreaW: Math.max(0, printW),
      printAreaH: Math.max(0, printH),
      offsetX: gene.marginLeft,
      offsetY: gene.marginTop,
    };
  }

  const cols = Math.max(1, Math.floor((printW + gene.gapX) / (cW + gene.gapX)));
  const rows = Math.max(1, Math.floor((printH + gene.gapY) / (cH + gene.gapY)));
  const count = cols * rows;
  const usedW = cols * cW + (cols - 1) * gene.gapX;
  const usedH = rows * cH + (rows - 1) * gene.gapY;
  const usedArea = count * cW * cH;
  const sheetArea = sheetW * sheetH;
  const wastePercent = Math.max(0, ((sheetArea - usedArea) / sheetArea) * 100);
  const cutLines = (cols > 1 ? cols - 1 : 0) + (rows > 1 ? rows - 1 : 0) + 4;
  const fitness = count * 1_000_000 - wastePercent * 100 - cutLines;
  const offsetX = Math.round(gene.marginLeft + (printW - usedW) / 2);
  const offsetY = Math.round(gene.marginTop + (printH - usedH) / 2);

  return {
    gene,
    cols,
    rows,
    count,
    wastePercent,
    cutLines,
    fitness,
    cardW: cW,
    cardH: cH,
    printAreaW: printW,
    printAreaH: printH,
    offsetX,
    offsetY,
  };
}

// ─── Public API (identical signature — no callers need to change) ─────────────

export function runImpositionGA(params: ImpositionGAParams): () => void {
  const {
    cardW,
    cardH,
    sheetW,
    sheetH,
    minBleedPx,
    allowRotation,
    onProgress,
  } = params;
  let cancelled = false;

  setTimeout(() => {
    if (cancelled) return;
    const result = solve(
      cardW,
      cardH,
      sheetW,
      sheetH,
      minBleedPx,
      allowRotation,
    );
    onProgress(result, 1, false); // "computing…" frame
    setTimeout(() => {
      if (cancelled) return;
      onProgress(result, 200, true); // done — result is already optimal
    }, 0);
  }, 0);

  return () => {
    cancelled = true;
  };
}

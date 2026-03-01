import type { ImpositionGene, ImpositionResult } from "../types/index";

export function evalImpositionGene(
  gene: ImpositionGene,
  cardW: number,
  cardH: number,
  sheetW: number,
  sheetH: number,
  minBleedPx: number,
): ImpositionResult {
  const cW = gene.rotation === 0 ? cardW : cardH;
  const cH = gene.rotation === 0 ? cardH : cardW;
  const printW = sheetW - gene.marginLeft - gene.marginRight;
  const printH = sheetH - gene.marginTop - gene.marginBottom;

  if (printW <= cW * 0.5 || printH <= cH * 0.5) {
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
      printAreaW: printW,
      printAreaH: printH,
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

  let fitness = 0;
  fitness += count * 500;
  fitness -= wastePercent * 1.5;
  fitness -= cutLines * 4;

  const gridBalance = 1 - Math.abs(cols - rows) / Math.max(cols, rows);
  fitness += gridBalance * 10;

  const hSymmetry =
    1 -
    Math.abs(gene.marginLeft - gene.marginRight) /
      Math.max(gene.marginLeft + gene.marginRight, 1);
  const vSymmetry =
    1 -
    Math.abs(gene.marginTop - gene.marginBottom) /
      Math.max(gene.marginTop + gene.marginBottom, 1);
  fitness += (hSymmetry + vSymmetry) * 15;

  if (gene.gapX < minBleedPx) fitness -= (minBleedPx - gene.gapX) * 40;
  if (gene.gapY < minBleedPx) fitness -= (minBleedPx - gene.gapY) * 40;

  const MIN_MARGIN = 5;
  if (gene.marginTop < MIN_MARGIN)
    fitness -= (MIN_MARGIN - gene.marginTop) * 30;
  if (gene.marginRight < MIN_MARGIN)
    fitness -= (MIN_MARGIN - gene.marginRight) * 30;
  if (gene.marginBottom < MIN_MARGIN)
    fitness -= (MIN_MARGIN - gene.marginBottom) * 30;
  if (gene.marginLeft < MIN_MARGIN)
    fitness -= (MIN_MARGIN - gene.marginLeft) * 30;

  const excessGapX = Math.max(0, gene.gapX - 20);
  const excessGapY = Math.max(0, gene.gapY - 20);
  fitness -= excessGapX * 5 + excessGapY * 5;

  const idealOffsetX = gene.marginLeft + (printW - usedW) / 2;
  const idealOffsetY = gene.marginTop + (printH - usedH) / 2;

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
    offsetX: Math.round(idealOffsetX),
    offsetY: Math.round(idealOffsetY),
  };
}

function randomImpositionGene(allowRotation: boolean): ImpositionGene {
  return {
    gapX: Math.round(Math.random() * 20 + 2),
    gapY: Math.round(Math.random() * 20 + 2),
    marginTop: Math.round(Math.random() * 30 + 5),
    marginRight: Math.round(Math.random() * 30 + 5),
    marginBottom: Math.round(Math.random() * 30 + 5),
    marginLeft: Math.round(Math.random() * 30 + 5),
    rotation: (allowRotation && Math.random() > 0.5 ? 1 : 0) as 0 | 1,
  };
}

function mutateGene(
  g: ImpositionGene,
  strength: number,
  allowRotation: boolean,
): ImpositionGene {
  const r = () => (Math.random() - 0.5) * strength;
  return {
    gapX: Math.max(0, Math.round(g.gapX + r())),
    gapY: Math.max(0, Math.round(g.gapY + r())),
    marginTop: Math.max(0, Math.round(g.marginTop + r())),
    marginRight: Math.max(0, Math.round(g.marginRight + r())),
    marginBottom: Math.max(0, Math.round(g.marginBottom + r())),
    marginLeft: Math.max(0, Math.round(g.marginLeft + r())),
    rotation:
      allowRotation && Math.random() < 0.05
        ? ((g.rotation === 0 ? 1 : 0) as 0 | 1)
        : g.rotation,
  };
}

function crossoverGenes(a: ImpositionGene, b: ImpositionGene): ImpositionGene {
  const t = () => Math.random() > 0.5;
  return {
    gapX: t() ? a.gapX : b.gapX,
    gapY: t() ? a.gapY : b.gapY,
    marginTop: t() ? a.marginTop : b.marginTop,
    marginRight: t() ? a.marginRight : b.marginRight,
    marginBottom: t() ? a.marginBottom : b.marginBottom,
    marginLeft: t() ? a.marginLeft : b.marginLeft,
    rotation: t() ? a.rotation : b.rotation,
  };
}

export type ImpositionGAParams = {
  cardW: number;
  cardH: number;
  sheetW: number;
  sheetH: number;
  minBleedPx: number;
  allowRotation: boolean;
  onProgress: (best: ImpositionResult, gen: number, done: boolean) => void;
};

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
  const POP = 120,
    GENS = 200;
  let stopped = false;
  const population: ImpositionGene[] = [];

  // Seed every plausible grid combination
  const seedRotations: (0 | 1)[] = allowRotation ? [0, 1] : [0];
  for (const rot of seedRotations) {
    const cW2 = rot === 0 ? cardW : cardH;
    const cH2 = rot === 0 ? cardH : cardW;
    const maxCols = Math.ceil(sheetW / Math.max(cW2, 1));
    const maxRows = Math.ceil(sheetH / Math.max(cH2, 1));
    for (let sc = 1; sc <= maxCols; sc++) {
      for (let sr = 1; sr <= maxRows; sr++) {
        const gap = minBleedPx;
        const totalW = sc * cW2 + (sc - 1) * gap;
        const totalH = sr * cH2 + (sr - 1) * gap;
        if (totalW > sheetW || totalH > sheetH) continue;
        const marginH = Math.max(5, Math.floor((sheetW - totalW) / 2));
        const marginV = Math.max(5, Math.floor((sheetH - totalH) / 2));
        population.push({
          gapX: gap,
          gapY: gap,
          marginTop: marginV,
          marginRight: marginH,
          marginBottom: marginV,
          marginLeft: marginH,
          rotation: rot,
        });
      }
    }
  }

  population.push({
    gapX: 5,
    gapY: 5,
    marginTop: 20,
    marginRight: 15,
    marginBottom: 20,
    marginLeft: 15,
    rotation: 0,
  });

  while (population.length < POP)
    population.push(randomImpositionGene(allowRotation));

  let gen = 0,
    mutStrength = 12;

  const tick = () => {
    if (stopped) return;
    const scored = population
      .map((g) => ({
        g,
        r: evalImpositionGene(g, cardW, cardH, sheetW, sheetH, minBleedPx),
      }))
      .sort((a, b) => b.r.fitness - a.r.fitness);

    const best = scored[0].r;
    if (gen % 10 === 0 || gen === GENS - 1)
      onProgress(best, gen, gen >= GENS - 1);
    if (gen >= GENS - 1) return;

    const eliteCount = Math.max(4, Math.floor(POP * 0.2));
    const elite = scored.slice(0, eliteCount).map((x) => x.g);

    if (gen % 20 === 0 && gen > 0) {
      const topFew = scored.slice(0, 5).map((x) => x.r.fitness);
      const spread = topFew[0] - topFew[4];
      if (spread < 5) mutStrength = Math.min(20, mutStrength * 1.5);
      else mutStrength = Math.max(1, mutStrength * 0.85);
    }

    const next: ImpositionGene[] = [...elite];
    while (next.length < Math.floor(POP * 0.6)) {
      const pA = elite[Math.floor(Math.random() * elite.length)];
      const pB = elite[Math.floor(Math.random() * eliteCount)];
      next.push(crossoverGenes(pA, pB));
    }
    while (next.length < POP - 10) {
      const base = elite[Math.floor(Math.random() * elite.length)];
      next.push(mutateGene(base, mutStrength, allowRotation));
    }
    while (next.length < POP) next.push(randomImpositionGene(allowRotation));

    population.splice(0, population.length, ...next);
    gen++;
    setTimeout(tick, 0);
  };

  setTimeout(tick, 0);
  return () => {
    stopped = true;
  };
}

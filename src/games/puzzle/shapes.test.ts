import { describe, expect, it } from 'vitest';
import { buildPieces, computeGrid } from './grid';
import { generateEdges, piecePath, seededRandom, shapeMetrics, type PathCommand } from './shapes';

const W = 1600;
const H = 1200;
const grid = computeGrid(12, W, H);
const pieces = buildPieces(grid, W, H);
const metrics = shapeMetrics(W, H, grid);
const edges = generateEdges(grid, 'test:12');
const path = (id: number) => piecePath(grid, edges, pieces[id], metrics);
const curves = (cmds: PathCommand[]) => cmds.filter((c) => c.op === 'C');

describe('seededRandom', () => {
  it('is herhaalbaar per seed en verschilt tussen seeds', () => {
    const a = seededRandom('x');
    const b = seededRandom('x');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(seededRandom('x')()).not.toBe(seededRandom('y')());
  });
});

describe('generateEdges', () => {
  it('maakt precies de binnenranden van het raster', () => {
    expect(edges.vertical).toHaveLength(grid.rows);
    expect(edges.vertical[0]).toHaveLength(grid.cols - 1);
    expect(edges.horizontal).toHaveLength(grid.rows - 1);
    expect(edges.horizontal[0]).toHaveLength(grid.cols);
  });

  it('geeft dezelfde vormen voor dezelfde seed', () => {
    expect(generateEdges(grid, 'test:12')).toEqual(edges);
    expect(generateEdges(grid, 'andere:12')).not.toEqual(edges);
  });
});

describe('piecePath', () => {
  it('begint linksboven en eindigt weer op dat punt', () => {
    const cmds = path(5);
    const m = metrics.margin;
    expect(cmds[0]).toEqual({ op: 'M', x: m, y: m });
    const last = cmds[cmds.length - 1];
    expect(last).toMatchObject({ op: 'L', x: m, y: m });
  });

  it('heeft rechte buitenranden en gebogen binnenranden', () => {
    // Hoekstuk 0: alleen rechter- en onderrand zijn binnenranden → 2 × 6 bochten.
    expect(curves(path(0))).toHaveLength(12);
    // Middenstuk 5 heeft vier binnenranden.
    expect(curves(path(5))).toHaveLength(24);
    // Hoekstuk rechtsonder: alleen boven en links.
    expect(curves(path(11))).toHaveLength(12);
  });

  it('past: de gedeelde rand van twee buren is dezelfde lijn', () => {
    const left = pieces[5];
    const right = pieces[6];
    const abs = (piece: typeof left, p: { x: number; y: number }) =>
      `${Math.round((p.x + piece.rect.x - metrics.margin) * 1000)},${Math.round((p.y + piece.rect.y - metrics.margin) * 1000)}`;
    type Cubic = Extract<PathCommand, { op: 'C' }>;
    // Rechterrand van stuk 5 = bochten 7–12; linkerrand van stuk 6 = laatste 6 bochten.
    const a = curves(path(5)).slice(6, 12) as Cubic[];
    const b = curves(path(6)).slice(18, 24) as Cubic[];
    // Achterstevoren lopen verwisselt c1 en c2: vergelijk de controlepunten als verzameling.
    const controls = (piece: typeof left, cs: Cubic[]) => new Set(cs.flatMap((c) => [abs(piece, c.c1), abs(piece, c.c2)]));
    expect(controls(right, b)).toEqual(controls(left, a));
    // De top van de nop is dezelfde plek.
    expect(abs(right, b[2].to)).toBe(abs(left, a[2].to));
  });

  it('laat de nop binnen de marge van de bitmap', () => {
    for (const piece of pieces) {
      const w = piece.rect.width + 2 * metrics.margin;
      const h = piece.rect.height + 2 * metrics.margin;
      for (const c of piecePath(grid, edges, piece, metrics)) {
        const pts = c.op === 'C' ? [c.c1, c.c2, c.to] : [c];
        for (const p of pts) {
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThanOrEqual(w);
          expect(p.y).toBeLessThanOrEqual(h);
        }
      }
    }
  });
});

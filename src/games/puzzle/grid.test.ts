import { describe, expect, it } from 'vitest';
import { allowedPieceCounts, buildPieces, computeGrid, pieceRect } from './grid';

describe('computeGrid', () => {
  it('volgt de tabel uit het PRD voor een liggende 4:3-foto', () => {
    const expected: Record<number, [number, number]> = {
      4: [2, 2], 8: [4, 2], 12: [4, 3], 16: [4, 4], 20: [5, 4], 24: [6, 4], 48: [8, 6],
    };
    for (const [n, [cols, rows]] of Object.entries(expected)) {
      expect(computeGrid(Number(n), 1600, 1200)).toEqual({ cols, rows });
    }
  });

  it('draait kolommen en rijen om bij een staande foto', () => {
    expect(computeGrid(12, 1200, 1600)).toEqual({ cols: 3, rows: 4 });
    expect(computeGrid(8, 1200, 1600)).toEqual({ cols: 2, rows: 4 });
  });

  it('geeft voor elk toegestaan aantal een raster met precies dat aantal stukjes', () => {
    for (const [w, h] of [[1600, 1200], [1200, 1600], [1000, 1000], [3000, 1000]]) {
      for (const n of allowedPieceCounts()) {
        const { cols, rows } = computeGrid(n, w, h);
        expect(cols * rows).toBe(n);
      }
    }
  });

  it('weigert aantallen buiten 4–48 of geen veelvoud van 4', () => {
    for (const n of [0, 3, 6, 52]) expect(() => computeGrid(n, 100, 100)).toThrow();
  });
});

describe('pieceRect / buildPieces', () => {
  it('dekt de afbeelding precies af, ook als die niet deelbaar is', () => {
    const grid = { cols: 5, rows: 4 };
    const w = 1003;
    const h = 751;
    const pieces = buildPieces(grid, w, h);
    expect(pieces).toHaveLength(20);
    const area = pieces.reduce((sum, p) => sum + p.rect.width * p.rect.height, 0);
    expect(area).toBe(w * h);
    const last = pieceRect(grid, 4, 3, w, h);
    expect(last.x + last.width).toBe(w);
    expect(last.y + last.height).toBe(h);
  });

  it('markeert randstukken en hoeken', () => {
    const pieces = buildPieces({ cols: 4, rows: 3 }, 400, 300);
    const edges = (i: number) => pieces[i].isEdge;
    expect(edges(0)).toEqual({ top: true, left: true, right: false, bottom: false });
    expect(edges(5)).toEqual({ top: false, left: false, right: false, bottom: false });
    expect(edges(11)).toEqual({ top: false, left: false, right: true, bottom: true });
  });
});

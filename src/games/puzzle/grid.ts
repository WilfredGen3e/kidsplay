export const MIN_PIECES = 4;
export const MAX_PIECES = 48;

export interface Grid {
  cols: number;
  rows: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function allowedPieceCounts(): number[] {
  const counts: number[] = [];
  for (let n = MIN_PIECES; n <= MAX_PIECES; n += 4) counts.push(n);
  return counts;
}

/**
 * Kiest kolommen × rijen met zo vierkant mogelijke stukjes. Bij een liggende (of
 * vierkante) foto zijn er minstens zoveel kolommen als rijen; staand wordt omgedraaid.
 */
export function computeGrid(pieces: number, imageWidth: number, imageHeight: number): Grid {
  if (!allowedPieceCounts().includes(pieces)) {
    throw new Error(`Ongeldig aantal stukjes: ${pieces}`);
  }
  const portrait = imageHeight > imageWidth;
  const [long, short] = portrait ? [imageHeight, imageWidth] : [imageWidth, imageHeight];

  let best: Grid | undefined;
  let bestScore = Infinity;
  for (let rows = 1; rows * rows <= pieces; rows++) {
    if (pieces % rows !== 0) continue;
    const cols = pieces / rows;
    const score = Math.abs(Math.log(long / cols / (short / rows)));
    if (score < bestScore) {
      bestScore = score;
      best = { cols, rows };
    }
  }
  const { cols, rows } = best!;
  return portrait ? { cols: rows, rows: cols } : { cols, rows };
}

/** Rechthoek van stuk (col, row) in een afbeelding van `width` × `height`, zonder gaten of overlap. */
export function pieceRect(grid: Grid, col: number, row: number, width: number, height: number): Rect {
  const x0 = Math.round((col * width) / grid.cols);
  const x1 = Math.round(((col + 1) * width) / grid.cols);
  const y0 = Math.round((row * height) / grid.rows);
  const y1 = Math.round(((row + 1) * height) / grid.rows);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

export interface PieceInfo {
  id: number;
  col: number;
  row: number;
  /** Plek van het stuk in de voltooide puzzel (pixels in de verkleinde afbeelding). */
  rect: Rect;
  isEdge: { top: boolean; right: boolean; bottom: boolean; left: boolean };
}

export function buildPieces(grid: Grid, width: number, height: number): PieceInfo[] {
  const pieces: PieceInfo[] = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      pieces.push({
        id: row * grid.cols + col,
        col,
        row,
        rect: pieceRect(grid, col, row, width, height),
        isEdge: {
          top: row === 0,
          right: col === grid.cols - 1,
          bottom: row === grid.rows - 1,
          left: col === 0,
        },
      });
    }
  }
  return pieces;
}

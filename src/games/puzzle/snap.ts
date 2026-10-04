import type { Grid, PieceInfo } from './grid';

/**
 * Positie (x, y) is de linkerbovenhoek van het stuk in afbeeldingspixels, met de linkerbovenhoek
 * van het canvas als nulpunt. De juiste plek van een stuk is dus precies `info.rect.x/y`.
 */
export interface SnapPiece {
  info: PieceInfo;
  x: number;
  y: number;
  locked: boolean;
  /** Stukken met dezelfde groep bewegen samen; een los stuk is zijn eigen groep. */
  group: number;
}

export type DropResult =
  | { kind: 'none' }
  | { kind: 'lock'; dx: number; dy: number }
  | { kind: 'merge'; dx: number; dy: number; withGroup: number };

export const MIN_SNAP_PX = 15;
export const SNAP_FRACTION = 0.2;

/** Snap-afstand in schermpixels: 20% van de stukbreedte, minimaal 15 px. `factor` voor ruim/krap. */
export function snapDistance(pieceWidthPx: number, factor = 1): number {
  return Math.max(MIN_SNAP_PX, SNAP_FRACTION * pieceWidthPx) * factor;
}

export function neighborIds(grid: Grid, id: number): number[] {
  const col = id % grid.cols;
  const row = Math.floor(id / grid.cols);
  const out: number[] = [];
  if (col > 0) out.push(id - 1);
  if (col < grid.cols - 1) out.push(id + 1);
  if (row > 0) out.push(id - grid.cols);
  if (row < grid.rows - 1) out.push(id + grid.cols);
  return out;
}

function isEdgePiece(p: SnapPiece): boolean {
  const e = p.info.isEdge;
  return e.top || e.right || e.bottom || e.left;
}

/**
 * Bekijkt een zojuist losgelaten groep (`pieces` is geïndexeerd op stuk-id, `dist` in
 * afbeeldingspixels). Vastklikken kan alleen op de juiste plek én tegen de rand of een
 * vastgeklikt stuk; anders kan de groep aan een losse buur vastklikken.
 */
export function evaluateDrop(pieces: SnapPiece[], grid: Grid, group: number, dist: number): DropResult {
  const moved = pieces.filter((p) => p.group === group);

  let lock: DropResult = { kind: 'none' };
  let lockDist = Infinity;
  for (const m of moved) {
    const dx = m.info.rect.x - m.x;
    const dy = m.info.rect.y - m.y;
    const d = Math.hypot(dx, dy);
    if (d > dist || d >= lockDist) continue;
    const anchored = isEdgePiece(m) || neighborIds(grid, m.info.id).some((n) => pieces[n].locked);
    if (anchored) {
      lock = { kind: 'lock', dx, dy };
      lockDist = d;
    }
  }
  if (lock.kind === 'lock') return lock;

  let merge: DropResult = { kind: 'none' };
  let mergeDist = Infinity;
  for (const m of moved) {
    for (const n of neighborIds(grid, m.info.id)) {
      const other = pieces[n];
      if (other.group === group || other.locked) continue;
      const dx = other.x + (m.info.rect.x - other.info.rect.x) - m.x;
      const dy = other.y + (m.info.rect.y - other.info.rect.y) - m.y;
      const d = Math.hypot(dx, dy);
      if (d <= dist && d < mergeDist) {
        merge = { kind: 'merge', dx, dy, withGroup: other.group };
        mergeDist = d;
      }
    }
  }
  return merge;
}

/**
 * Past het resultaat van evaluateDrop toe, net zo lang tot er niets meer verandert (een stuk
 * kan eerst aan een buur klikken en daarna met de hele groep aan de rand). Geeft de stukken
 * terug die van plek, groep of vastgeklikt-status zijn veranderd.
 */
export function applyDrop<T extends SnapPiece>(
  pieces: T[],
  grid: Grid,
  group: number,
  dist: number,
): { changed: T[]; locked: boolean } {
  const before = pieces.map((p) => ({ x: p.x, y: p.y, locked: p.locked, group: p.group }));
  let g = group;
  let locked = false;

  for (let i = 0; i < pieces.length; i++) {
    const result = evaluateDrop(pieces, grid, g, dist);
    if (result.kind === 'none') break;
    const members = pieces.filter((p) => p.group === g);
    for (const m of members) {
      m.x += result.dx;
      m.y += result.dy;
    }
    if (result.kind === 'lock') {
      for (const m of members) {
        m.x = m.info.rect.x;
        m.y = m.info.rect.y;
        m.locked = true;
      }
      locked = true;
      break;
    }
    for (const m of members) m.group = result.withGroup;
    g = result.withGroup;
  }

  const changed = pieces.filter((p, i) => {
    const b = before[i];
    return p.x !== b.x || p.y !== b.y || p.locked !== b.locked || p.group !== b.group;
  });
  return { changed, locked };
}

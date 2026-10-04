import type { Grid, PieceInfo } from './grid';

/** Kubische bezier van het huidige punt naar (x, y). */
export interface Curve {
  c1: Point;
  c2: Point;
  to: Point;
}
export interface Point {
  x: number;
  y: number;
}

/** Eén binnenrand tussen twee stukjes: de nop zit aan de kant van `sign` (+1 = rechts/onder). */
export interface EdgeShape {
  sign: 1 | -1;
  /** Verschuiving van de nop langs de rand, als fractie van de randlengte. */
  shift: number;
}

export interface JigsawEdges {
  /** [rij][kolom]: rand tussen kolom en kolom+1. */
  vertical: EdgeShape[][];
  /** [rij][kolom]: rand tussen rij en rij+1. */
  horizontal: EdgeShape[][];
}

export interface ShapeMetrics {
  /** Diepte van een nop in afbeeldingspixels. */
  depth: number;
  /** Extra ruimte rondom een stukje voor de noppen, in afbeeldingspixels. */
  margin: number;
}

/** Pseudo-willekeurig maar herhaalbaar, zodat een hervatte puzzel dezelfde vormen krijgt. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateEdges(grid: Grid, seed: string): JigsawEdges {
  const random = seededRandom(seed);
  const edge = (): EdgeShape => ({ sign: random() < 0.5 ? 1 : -1, shift: (random() - 0.5) * 0.12 });
  const make = (rows: number, cols: number) =>
    Array.from({ length: rows }, () => Array.from({ length: cols }, edge));
  return {
    vertical: make(grid.rows, Math.max(grid.cols - 1, 0)),
    horizontal: make(Math.max(grid.rows - 1, 0), grid.cols),
  };
}

export function shapeMetrics(imageW: number, imageH: number, grid: Grid): ShapeMetrics {
  const base = Math.min(imageW / grid.cols, imageH / grid.rows);
  return { depth: base * 0.22, margin: Math.ceil(base * 0.25) };
}

/**
 * Nop in een rand van lengte `len`, in (langs, uit)-coördinaten met de rand op uit = 0.
 * Begint en eindigt op de rand; het stuk ertussen is een rechte lijn.
 */
function knob(len: number, depth: number, shift: number): Curve[] {
  const k = len * (0.5 + shift);
  const nw = len * 0.06;
  const hw = len * 0.11;
  const a = depth;
  const pt = (x: number, y: number): Point => ({ x, y });
  return [
    { c1: pt(k - 1.2 * nw, 0.05 * a), c2: pt(k - 1.05 * nw, 0.25 * a), to: pt(k - nw, 0.4 * a) },
    { c1: pt(k - 0.95 * nw, 0.55 * a), c2: pt(k - 1.05 * hw, 0.55 * a), to: pt(k - hw, 0.8 * a) },
    { c1: pt(k - 1.1 * hw, 1.05 * a), c2: pt(k - 0.4 * hw, 1.1 * a), to: pt(k, a) },
    { c1: pt(k + 0.4 * hw, 1.1 * a), c2: pt(k + 1.1 * hw, 1.05 * a), to: pt(k + hw, 0.8 * a) },
    { c1: pt(k + 1.05 * hw, 0.55 * a), c2: pt(k + 0.95 * nw, 0.55 * a), to: pt(k + nw, 0.4 * a) },
    { c1: pt(k + 1.05 * nw, 0.25 * a), c2: pt(k + 1.2 * nw, 0.05 * a), to: pt(k + 1.5 * nw, 0) },
  ];
}
/** Beginpunt van de eerste bocht van `knob` (de rand loopt daar recht naartoe). */
function knobStart(len: number, shift: number): number {
  return len * (0.5 + shift) - 1.5 * len * 0.06;
}

export type PathCommand =
  | { op: 'M' | 'L'; x: number; y: number }
  | { op: 'C'; c1: Point; c2: Point; to: Point };

/**
 * Pad van één rand van `from` naar `to` (assen-gericht). `bulge` is de richting van een positieve nop
 * (eenheidsvector, haaks op de rand), `sign` of de nop die kant op of juist de andere kant op wijst.
 * Gedeelde randen worden in beide stukjes uit dezelfde knob-vorm opgebouwd, dus passen exact.
 */
function edgePath(from: Point, to: Point, bulge: Point, edge: EdgeShape | undefined, depth: number): PathCommand[] {
  if (!edge) return [{ op: 'L', x: to.x, y: to.y }];
  // Altijd in de 'canonieke' richting (omhoog→omlaag of links→rechts) opbouwen.
  const forward = from.x < to.x || from.y < to.y;
  const start = forward ? from : to;
  const end = forward ? to : from;
  const len = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
  const dir = { x: (end.x - start.x) / len, y: (end.y - start.y) / len };
  const n = { x: bulge.x * edge.sign, y: bulge.y * edge.sign };
  const map = (p: Point): Point => ({
    x: start.x + dir.x * p.x + n.x * p.y,
    y: start.y + dir.y * p.x + n.y * p.y,
  });
  const s = knobStart(len, edge.shift);
  const curves = knob(len, depth, edge.shift);

  const cmds: PathCommand[] = [];
  // Van begin naar de nop, de nop zelf, en van de nop naar het eind.
  const sPoint = map({ x: s, y: 0 });
  const ePoint = map(curves[curves.length - 1].to);
  const abs = curves.map((c) => ({ c1: map(c.c1), c2: map(c.c2), to: map(c.to) }));
  if (forward) {
    cmds.push({ op: 'L', x: sPoint.x, y: sPoint.y });
    for (const c of abs) cmds.push({ op: 'C', ...c });
    cmds.push({ op: 'L', x: end.x, y: end.y });
  } else {
    // Omgekeerde looprichting: dezelfde bochten achterstevoren.
    cmds.push({ op: 'L', x: ePoint.x, y: ePoint.y });
    const pts = [sPoint, ...abs.map((c) => c.to)];
    for (let i = abs.length - 1; i >= 0; i--) {
      cmds.push({ op: 'C', c1: abs[i].c2, c2: abs[i].c1, to: pts[i] });
    }
    cmds.push({ op: 'L', x: to.x, y: to.y });
  }
  return cmds;
}

/**
 * Pad (met de klok mee) van een stukje in coördinaten van zijn eigen bitmap: de rechthoek van het
 * stukje begint op (margin, margin). Randen aan de buitenkant van de puzzel blijven recht.
 */
export function piecePath(
  grid: Grid,
  edges: JigsawEdges,
  piece: PieceInfo,
  metrics: ShapeMetrics,
): PathCommand[] {
  const { col, row, rect } = piece;
  const m = metrics.margin;
  const d = metrics.depth;
  const tl = { x: m, y: m };
  const tr = { x: m + rect.width, y: m };
  const br = { x: m + rect.width, y: m + rect.height };
  const bl = { x: m, y: m + rect.height };
  const down = { x: 0, y: 1 };
  const right = { x: 1, y: 0 };

  const top = row > 0 ? edges.horizontal[row - 1][col] : undefined;
  const rightEdge = col < grid.cols - 1 ? edges.vertical[row][col] : undefined;
  const bottom = row < grid.rows - 1 ? edges.horizontal[row][col] : undefined;
  const left = col > 0 ? edges.vertical[row][col - 1] : undefined;

  return [
    { op: 'M', x: tl.x, y: tl.y },
    ...edgePath(tl, tr, down, top, d),
    ...edgePath(tr, br, right, rightEdge, d),
    ...edgePath(br, bl, down, bottom, d),
    ...edgePath(bl, tl, right, left, d),
  ];
}

export function toPath2D(commands: PathCommand[]): Path2D {
  const path = new Path2D();
  for (const c of commands) {
    if (c.op === 'C') path.bezierCurveTo(c.c1.x, c.c1.y, c.c2.x, c.c2.y, c.to.x, c.to.y);
    else if (c.op === 'M') path.moveTo(c.x, c.y);
    else path.lineTo(c.x, c.y);
  }
  path.closePath();
  return path;
}

/** Eén canvas per stuk met de klassieke puzzelvorm; het stuk zelf begint op (margin, margin). */
export function sliceJigsaw(
  image: HTMLCanvasElement,
  pieces: PieceInfo[],
  grid: Grid,
  edges: JigsawEdges,
  metrics: ShapeMetrics,
): Map<number, HTMLCanvasElement> {
  const m = metrics.margin;
  const result = new Map<number, HTMLCanvasElement>();
  for (const piece of pieces) {
    const { rect } = piece;
    const canvas = document.createElement('canvas');
    canvas.width = rect.width + 2 * m;
    canvas.height = rect.height + 2 * m;
    const g = canvas.getContext('2d')!;
    const path = toPath2D(piecePath(grid, edges, piece, metrics));
    g.save();
    g.clip(path);
    g.drawImage(image, rect.x - m, rect.y - m, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    g.restore();
    g.lineWidth = Math.max(1.5, metrics.depth * 0.04);
    g.strokeStyle = 'rgb(0 0 0 / 28%)';
    g.stroke(path);
    result.set(piece.id, canvas);
  }
  return result;
}

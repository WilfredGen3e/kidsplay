/**
 * Zoomen en verschuiven van het speelvlak (puzzels voor volwassenen). Alles is zuivere rekenkunde.
 *
 * De "wereld" is het speelvlak zonder zoom: het bord staat daarin op (left, top) met afmeting (width, height).
 * De weergave schaalt de wereld met `zoom` en verschuift hem met (panX, panY), in speelvlak-pixels:
 *   scherm = pan + wereld × zoom
 */
export interface Viewport {
  zoom: number;
  panX: number;
  panY: number;
}

export interface ViewBox {
  stageW: number;
  stageH: number;
  /** Bord in wereldcoördinaten, zonder zoom. */
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Hoogste schaal (schermpixels per afbeeldingspixel): 2 is 1:1 op een retina-scherm; daarboven wordt de foto alleen maar wazig. */
export const MAX_SCALE = 2;
/** Hoeveel van het bord minstens in beeld moet blijven als het groter is dan het speelvlak. */
const EDGE_ROOM = 120;

export const IDENTITY: Viewport = { zoom: 1, panX: 0, panY: 0 };

export function maxZoomFor(baseScale: number): number {
  return Math.max(1, MAX_SCALE / baseScale);
}

function clampAxis(pan: number, zoom: number, left: number, size: number, stage: number): number {
  const length = size * zoom;
  const origin = left * zoom;
  const low = length <= stage ? 0 : stage - length - EDGE_ROOM;
  const high = length <= stage ? stage - length : EDGE_ROOM;
  return Math.min(Math.max(pan + origin, low), high) - origin;
}

/** Houdt de zoom binnen de grenzen en het bord in beeld. Op zoom 1 staat alles gecentreerd. */
export function clampViewport(v: Viewport, box: ViewBox, maxZoom: number): Viewport {
  const zoom = Math.min(Math.max(v.zoom, 1), maxZoom);
  if (zoom <= 1) return IDENTITY;
  return {
    zoom,
    panX: clampAxis(v.panX, zoom, box.left, box.width, box.stageW),
    panY: clampAxis(v.panY, zoom, box.top, box.height, box.stageH),
  };
}

/** Zoomt naar `newZoom` zo dat het punt (cx, cy) in het speelvlak op dezelfde plek onder de vinger blijft. */
export function zoomAt(v: Viewport, cx: number, cy: number, newZoom: number, box: ViewBox, maxZoom: number): Viewport {
  const zoom = Math.min(Math.max(newZoom, 1), maxZoom);
  const k = zoom / v.zoom;
  return clampViewport({ zoom, panX: cx - (cx - v.panX) * k, panY: cy - (cy - v.panY) * k }, box, maxZoom);
}

export function panBy(v: Viewport, dx: number, dy: number, box: ViewBox, maxZoom: number): Viewport {
  return clampViewport({ ...v, panX: v.panX + dx, panY: v.panY + dy }, box, maxZoom);
}

/** Zet het wereldpunt (wx, wy) in het midden van het speelvlak. */
export function centerOn(v: Viewport, wx: number, wy: number, box: ViewBox, maxZoom: number): Viewport {
  return clampViewport({ ...v, panX: box.stageW / 2 - wx * v.zoom, panY: box.stageH / 2 - wy * v.zoom }, box, maxZoom);
}

/** Is het wereldpunt (wx, wy) in beeld, met een rand van `margin` pixels? */
export function isVisible(v: Viewport, wx: number, wy: number, box: ViewBox, margin = 40): boolean {
  const x = v.panX + wx * v.zoom;
  const y = v.panY + wy * v.zoom;
  return x >= margin && x <= box.stageW - margin && y >= margin && y <= box.stageH - margin;
}

import { describe, expect, it } from 'vitest';
import { IDENTITY, MAX_SCALE, centerOn, clampViewport, isVisible, maxZoomFor, panBy, zoomAt, type ViewBox } from './viewport';

// Speelvlak van 1000 × 700, bord van 900 × 600 in het midden.
const box: ViewBox = { stageW: 1000, stageH: 700, left: 50, top: 50, width: 900, height: 600 };
const maxZoom = 6;
const screenOf = (v: { zoom: number; panX: number; panY: number }, wx: number, wy: number) => ({
  x: v.panX + wx * v.zoom,
  y: v.panY + wy * v.zoom,
});

describe('viewport', () => {
  it('begint gecentreerd zonder zoom', () => {
    expect(clampViewport(IDENTITY, box, maxZoom)).toEqual(IDENTITY);
  });

  it('houdt het punt onder de aanwijzer vast bij zoomen', () => {
    const v = zoomAt(IDENTITY, 300, 200, 3, box, maxZoom);
    expect(v.zoom).toBe(3);
    // Wereldpunt dat vóór het zoomen op (300, 200) stond.
    const after = screenOf(v, 300, 200);
    expect(after.x).toBeCloseTo(300);
    expect(after.y).toBeCloseTo(200);
  });

  it('houdt ook een tweede zoom op hetzelfde punt vast', () => {
    const a = zoomAt(IDENTITY, 800, 500, 2, box, maxZoom);
    // Wat nu op (400, 300) op het scherm staat, blijft daar bij verder zoomen.
    const world = { x: (400 - a.panX) / a.zoom, y: (300 - a.panY) / a.zoom };
    const b = zoomAt(a, 400, 300, 4, box, maxZoom);
    const screen = screenOf(b, world.x, world.y);
    expect(screen.x).toBeCloseTo(400);
    expect(screen.y).toBeCloseTo(300);
  });

  it('begrenst de zoom op 1 en het maximum', () => {
    expect(zoomAt(IDENTITY, 0, 0, 0.2, box, maxZoom).zoom).toBe(1);
    expect(zoomAt(IDENTITY, 0, 0, 50, box, maxZoom).zoom).toBe(maxZoom);
  });

  it('zet bij terugzoomen naar 1 alles weer in het midden', () => {
    const zoomed = zoomAt(IDENTITY, 800, 600, 4, box, maxZoom);
    const back = zoomAt(zoomed, 100, 100, 1, box, maxZoom);
    expect(back).toEqual(IDENTITY);
  });

  it('laat het bord niet uit beeld schuiven', () => {
    const zoomed = zoomAt(IDENTITY, 500, 350, 3, box, maxZoom);
    const far = panBy(zoomed, 99999, 99999, box, maxZoom);
    // Linkerrand van het bord blijft hoogstens 120 px van de linkerkant van het speelvlak.
    expect(far.panX + box.left * far.zoom).toBeLessThanOrEqual(120);
    const farOther = panBy(zoomed, -99999, -99999, box, maxZoom);
    const right = farOther.panX + (box.left + box.width) * farOther.zoom;
    expect(right).toBeGreaterThanOrEqual(box.stageW - 120);
  });

  it('centreert een punt in het midden van het speelvlak', () => {
    const v = zoomAt(IDENTITY, 500, 350, 3, box, maxZoom);
    const centered = centerOn(v, 700, 450, box, maxZoom);
    const s = screenOf(centered, 700, 450);
    expect(s.x).toBeCloseTo(500);
    expect(s.y).toBeCloseTo(350);
  });

  it('weet of een punt in beeld is', () => {
    const v = zoomAt(IDENTITY, 500, 350, 3, box, maxZoom);
    expect(isVisible(v, 500, 350, box)).toBe(true);
    expect(isVisible(v, 60, 60, box)).toBe(false);
  });

  it('rekent de maximale zoom uit de gewenste maximale schaal', () => {
    expect(maxZoomFor(0.5)).toBe(MAX_SCALE / 0.5);
    expect(maxZoomFor(10)).toBe(1);
  });
});

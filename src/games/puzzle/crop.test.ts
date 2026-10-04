import { describe, expect, it } from 'vitest';
import { clampView, coverScale, cropFromView, zoomAround } from './crop';

const frame = { width: 400, height: 300 };

describe('crop', () => {
  it('bedekt het kader minimaal', () => {
    expect(coverScale(4000, 3000, frame)).toBeCloseTo(0.1);
    expect(coverScale(3000, 4000, frame)).toBeCloseTo(400 / 3000);
  });

  it('laat de foto niet los van het kader schuiven', () => {
    const v = clampView({ scale: 0.1, x: 50, y: -999 }, 4000, 3000, frame);
    expect(v).toEqual({ scale: 0.1, x: 0, y: 0 });
    expect(clampView({ scale: 0.01, x: 0, y: 0 }, 4000, 3000, frame).scale).toBeCloseTo(0.1);
  });

  it('geeft bij volledig zicht de hele foto terug', () => {
    const crop = cropFromView({ scale: 0.1, x: 0, y: 0 }, 4000, 3000, frame);
    expect(crop.x).toBeCloseTo(0);
    expect(crop.width).toBeCloseTo(1);
    expect(crop.height).toBeCloseTo(1);
  });

  it('geeft na inzoomen een kleinere uitsnede rond het midden', () => {
    const start = { scale: 0.1, x: 0, y: 0 };
    const zoomed = zoomAround(start, 0.2, { x: 200, y: 150 }, 4000, 3000, frame);
    const crop = cropFromView(zoomed, 4000, 3000, frame);
    expect(crop.width).toBeCloseTo(0.5);
    expect(crop.height).toBeCloseTo(0.5);
    expect(crop.x + crop.width / 2).toBeCloseTo(0.5);
    expect(crop.y + crop.height / 2).toBeCloseTo(0.5);
  });

  it('blijft binnen de foto', () => {
    const far = clampView({ scale: 0.2, x: -99999, y: -99999 }, 4000, 3000, frame);
    const crop = cropFromView(far, 4000, 3000, frame);
    expect(crop.x + crop.width).toBeCloseTo(1);
    expect(crop.y + crop.height).toBeCloseTo(1);
  });
});

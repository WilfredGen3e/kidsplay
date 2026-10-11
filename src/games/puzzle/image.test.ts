import { describe, expect, it } from 'vitest';
import { MAX_ADULT_PIXELS, MAX_ADULT_SIDE, MAX_IMAGE_WIDTH, targetScale } from './image';

describe('targetScale', () => {
  it('verkleint gewone puzzels op breedte tot 2048 en vergroot nooit', () => {
    expect(targetScale(4096, 3072, false)).toBe(MAX_IMAGE_WIDTH / 4096);
    expect(targetScale(1000, 800, false)).toBe(1);
  });
  it('laat volwassenenpuzzels tot 4096 px op de langste zijde', () => {
    const k = targetScale(6000, 4000, true);
    expect(6000 * k).toBeLessThanOrEqual(MAX_ADULT_SIDE + 1e-6);
    expect(6000 * k * (4000 * k)).toBeLessThanOrEqual(MAX_ADULT_PIXELS + 1);
  });
  it('houdt een staande foto binnen de pixelgrens', () => {
    const k = targetScale(4000, 6000, true);
    expect(6000 * k).toBeLessThanOrEqual(MAX_ADULT_SIDE + 1e-6);
  });
  it('begrenst een vierkante foto op het aantal pixels', () => {
    const k = targetScale(5000, 5000, true);
    expect(5000 * k * (5000 * k)).toBeLessThanOrEqual(MAX_ADULT_PIXELS + 1);
  });
  it('vergroot een kleine foto niet', () => {
    expect(targetScale(1600, 1200, true)).toBe(1);
  });
});

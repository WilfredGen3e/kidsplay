import { describe, expect, it } from 'vitest';
import { clampToStage, fitScale } from './layout';

describe('fitScale', () => {
  it('past een liggende foto op de beperkende zijde', () => {
    expect(fitScale(1000, 1000, 2000, 1000, 1)).toBe(0.5);
    expect(fitScale(1000, 400, 2000, 1000, 1)).toBe(0.4);
  });
});

describe('clampToStage', () => {
  it('laat een stuk binnen het vlak ongemoeid', () => {
    expect(clampToStage(100, 50, 80, 60, 1000, 800)).toEqual({ x: 100, y: 50 });
  });
  it('houdt het midden van het stuk binnen het vlak', () => {
    expect(clampToStage(-500, 5000, 80, 60, 1000, 800)).toEqual({ x: -40, y: 770 });
  });
});

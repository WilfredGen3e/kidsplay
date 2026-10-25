import { describe, expect, it } from 'vitest';
import {
  bitmapMegabytes,
  clearBusy,
  clearCrash,
  collectCrash,
  describeMeasurement,
  markBusy,
  readMeasurement,
  saveMeasurement,
  type MetingStore,
} from './meting';

function memoryStore(): MetingStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe('meting', () => {
  it('schat het geheugen van de stukjes', () => {
    // 1024 × 1024 × 4 bytes = 4 MB
    expect(bitmapMegabytes([{ width: 1024, height: 1024 }])).toBe(4);
    expect(bitmapMegabytes([])).toBe(0);
    // 500 stukjes van 256 × 246 ≈ 120 MB
    expect(bitmapMegabytes(Array.from({ length: 500 }, () => ({ width: 256, height: 246 })))).toBe(120);
  });

  it('bewaart en leest de laatste meting', () => {
    const store = memoryStore();
    expect(readMeasurement(store)).toBeUndefined();
    saveMeasurement(store, { pieces: 500, loadMs: 340, bitmapMb: 120, at: '2026-10-11T17:00:00.000Z' });
    expect(readMeasurement(store)).toMatchObject({ pieces: 500, bitmapMb: 120 });
  });

  it('beschrijft een meting in gewone taal', () => {
    expect(describeMeasurement({ pieces: 500, loadMs: 340, bitmapMb: 120, at: '' })).toBe(
      '500 stukjes · geladen in 0,3 s · stukjes ≈ 120 MB',
    );
    expect(describeMeasurement({ pieces: 300, loadMs: 12_400, bitmapMb: 70, heapMb: 10, at: '' })).toBe(
      '300 stukjes · geladen in 12 s · stukjes ≈ 70 MB · JS-geheugen 10 MB',
    );
  });

  it('meldt niets als de puzzel netjes gesloten is', () => {
    const store = memoryStore();
    markBusy(store, 500);
    clearBusy(store);
    expect(collectCrash(store)).toBeUndefined();
  });

  it('meldt een abrupt gestopte app bij het volgende opstarten, en onthoudt dat', () => {
    const store = memoryStore();
    markBusy(store, 500, new Date('2026-10-11T17:00:00.000Z'));
    expect(collectCrash(store)).toEqual({ pieces: 500, at: '2026-10-11T17:00:00.000Z' });
    // Daarna staat het merk er niet meer, maar de melding blijft tot de ouder hem wist.
    expect(collectCrash(store)).toEqual({ pieces: 500, at: '2026-10-11T17:00:00.000Z' });
    clearCrash(store);
    expect(collectCrash(store)).toBeUndefined();
  });

  it('is bestand tegen kapotte opslag', () => {
    const broken: MetingStore = {
      getItem: () => '{kapot',
      setItem: () => {
        throw new Error('vol');
      },
      removeItem: () => {
        throw new Error('vol');
      },
    };
    expect(readMeasurement(broken)).toBeUndefined();
    expect(() => saveMeasurement(broken, { pieces: 1, loadMs: 1, bitmapMb: 1, at: '' })).not.toThrow();
    expect(() => clearBusy(broken)).not.toThrow();
    expect(collectCrash(broken)).toBeUndefined();
  });
});

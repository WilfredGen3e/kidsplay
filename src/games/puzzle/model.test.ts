import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, isVisibleFor, loadSettings } from './model';
import type { GameData } from '../../platform/types';

describe('isVisibleFor', () => {
  it('toont een puzzel voor iedereen of alleen voor gekozen profielen', () => {
    expect(isVisibleFor({ visibleFor: 'all' }, 'anna')).toBe(true);
    expect(isVisibleFor({ visibleFor: ['anna'] }, 'anna')).toBe(true);
    expect(isVisibleFor({ visibleFor: ['anna'] }, 'bram')).toBe(false);
    expect(isVisibleFor({ visibleFor: [] }, 'anna')).toBe(false);
  });
});

describe('loadSettings', () => {
  const dataWith = (saved: unknown): GameData =>
    ({ get: async () => saved }) as unknown as GameData;

  it('geeft de standaardinstellingen als er niets bewaard is', async () => {
    expect(await loadSettings(dataWith(undefined))).toEqual(DEFAULT_SETTINGS);
  });
  it('vult ontbrekende velden aan met de standaard', async () => {
    expect(await loadSettings(dataWith({ snap: 'ruim' }))).toEqual({ ...DEFAULT_SETTINGS, snap: 'ruim' });
  });
});

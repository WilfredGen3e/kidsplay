import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import {
  addPoints,
  claimGift,
  defaultRewardState,
  loadRewards,
  normalizeRewardState,
  pendingGifts,
  savingProgress,
  updateRewards,
} from './rewards';
import { IndexedDbStorage } from './storage/indexeddb';

describe('spaarstand', () => {
  it('begint op 0 met drempel 50', () => {
    expect(defaultRewardState()).toEqual({ points: 0, threshold: 50, order: 'fixed' });
  });

  it('geeft een cadeautje bij de drempel en laat restpunten doorschuiven', () => {
    const s = addPoints(defaultRewardState(), 53);
    expect(pendingGifts(s)).toBe(1);
    const after = claimGift(s);
    expect(after.points).toBe(3);
    expect(pendingGifts(after)).toBe(0);
    expect(savingProgress(after)).toEqual({ have: 3, need: 50, remaining: 47 });
  });

  it('geeft meerdere cadeautjes achter elkaar bij veel punten', () => {
    let s = addPoints({ ...defaultRewardState(), threshold: 20 }, 45);
    expect(pendingGifts(s)).toBe(2);
    s = claimGift(claimGift(s));
    expect(s.points).toBe(5);
    expect(claimGift(s)).toBe(s);
  });

  it('negeert negatieve aantallen en herstelt ongeldige opslag', () => {
    expect(addPoints(defaultRewardState(), -5).points).toBe(0);
    expect(normalizeRewardState({ points: -1, threshold: 0, order: 'x' as never })).toEqual(defaultRewardState());
    expect(normalizeRewardState({ points: 7, threshold: 20, order: 'random' })).toEqual({
      points: 7,
      threshold: 20,
      order: 'random',
    });
  });

  it('bewaart punten per profiel, ook bij snel opeenvolgende toevoegingen', async () => {
    const storage = await IndexedDbStorage.open('rewards-test');
    await Promise.all([1, 2, 3, 4, 5].map(() => updateRewards(storage, 'a', (s) => addPoints(s, 1))));
    expect((await loadRewards(storage, 'a')).points).toBe(5);
    expect((await loadRewards(storage, 'b')).points).toBe(0);
    await storage.remove('a');
    expect((await loadRewards(storage, 'a')).points).toBe(0);
    storage.close();
  });
});

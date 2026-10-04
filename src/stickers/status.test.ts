import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { createGameData } from '../platform/context';
import { addPoints, updateRewards } from '../platform/rewards';
import { IndexedDbStorage } from '../platform/storage/indexeddb';
import { saveSticker, STICKERS_ID, type Sticker } from './model';
import { loadSavings } from './status';

it('toont pas cadeautjes als er stickers zijn om te winnen', async () => {
  const storage = await IndexedDbStorage.open('status-test');
  const data = createGameData(storage.records, STICKERS_ID);
  await updateRewards(storage, 'a', (s) => addPoints({ ...s, threshold: 10 }, 23));

  expect(await loadSavings(storage, data, 'a')).toEqual({ have: 3, need: 10, remaining: 7, gifts: 0 });

  const sticker = { id: 's1', name: 'Eén', order: 0, forProfile: null } as Sticker;
  await saveSticker(data, sticker);
  expect((await loadSavings(storage, data, 'a')).gifts).toBe(2);

  await saveSticker(data, { ...sticker, forProfile: 'b' });
  expect((await loadSavings(storage, data, 'a')).gifts).toBe(0);
  storage.close();
});

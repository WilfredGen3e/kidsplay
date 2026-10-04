import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { IndexedDbStorage } from './indexeddb';
import type { Profile } from '../types';

const anna: Profile = {
  id: 'anna',
  name: 'Anna',
  color: '#f4a',
  avatar: '🦊',
  drawerSide: 'left',
  soundOn: true,
};

let n = 0;
let storage: IndexedDbStorage;
beforeEach(async () => {
  storage = await IndexedDbStorage.open(`test-${n++}`);
});

describe('profielen', () => {
  it('bewaart, leest en wijzigt een profiel', async () => {
    await storage.put(anna);
    expect(await storage.get('anna')).toEqual(anna);
    await storage.put({ ...anna, name: 'Anne' });
    expect((await storage.list()).map((p) => p.name)).toEqual(['Anne']);
  });

  it('geeft undefined voor een onbekend profiel', async () => {
    expect(await storage.get('nope')).toBeUndefined();
  });
});

describe('voortgang', () => {
  it('bewaart voortgang per profiel en spel', async () => {
    await storage.save('anna', 'puzzel', { stars: 2 });
    await storage.save('anna', 'dummy', { taps: 5 });
    await storage.save('bram', 'puzzel', { stars: 9 });
    expect(await storage.load('anna', 'puzzel')).toEqual({ stars: 2 });
    expect(await storage.load('bram', 'puzzel')).toEqual({ stars: 9 });
    expect(await storage.load('bram', 'dummy')).toBeUndefined();
  });

  it('overschrijft eerdere voortgang', async () => {
    await storage.save('anna', 'dummy', { taps: 1 });
    await storage.save('anna', 'dummy', { taps: 2 });
    expect(await storage.load('anna', 'dummy')).toEqual({ taps: 2 });
  });

  it('blijft bestaan na opnieuw openen', async () => {
    await storage.save('anna', 'dummy', { taps: 3 });
    storage.close();
    const again = await IndexedDbStorage.open(`test-${n - 1}`);
    expect(await again.load('anna', 'dummy')).toEqual({ taps: 3 });
  });

  it('verwijdert bij het wissen van een profiel alleen diens voortgang', async () => {
    await storage.put(anna);
    await storage.save('anna', 'puzzel', { stars: 1 });
    await storage.save('anna', 'dummy', { taps: 1 });
    await storage.save('bram', 'puzzel', { stars: 4 });
    await storage.remove('anna');
    expect(await storage.get('anna')).toBeUndefined();
    expect(await storage.load('anna', 'puzzel')).toBeUndefined();
    expect(await storage.load('anna', 'dummy')).toBeUndefined();
    expect(await storage.load('bram', 'puzzel')).toEqual({ stars: 4 });
  });
});

describe('spelgegevens', () => {
  it('bewaart gegevens per spel en collectie', async () => {
    await storage.records.put('puzzle', 'puzzles', 'a', { name: 'A' });
    await storage.records.put('puzzle', 'puzzles', 'b', { name: 'B' });
    await storage.records.put('puzzle', 'settings', 'x', { snap: 'normaal' });
    await storage.records.put('ander', 'puzzles', 'c', { name: 'C' });
    expect(await storage.records.list('puzzle', 'puzzles')).toEqual([{ name: 'A' }, { name: 'B' }]);
    expect(await storage.records.get('puzzle', 'settings', 'x')).toEqual({ snap: 'normaal' });
    expect(await storage.records.get('puzzle', 'puzzles', 'zzz')).toBeUndefined();
  });

  it('verwijdert één record', async () => {
    await storage.records.put('puzzle', 'puzzles', 'a', 1);
    await storage.records.put('puzzle', 'puzzles', 'b', 2);
    await storage.records.remove('puzzle', 'puzzles', 'a');
    expect(await storage.records.list('puzzle', 'puzzles')).toEqual([2]);
  });
});

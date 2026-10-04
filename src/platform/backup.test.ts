// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { createBackup, decodeBlobs, encodeBlobs, parseBackup, restoreBackup } from './backup';
import { IndexedDbStorage } from './storage/indexeddb';

const text = (b: Blob) =>
  new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.readAsText(b);
  });

it('zet profielen, voortgang en puzzels (met Blob) terug na een back-up', async () => {
  const a = await IndexedDbStorage.open('backup-a');
  await a.put({ id: 'p1', name: 'Mila', color: '#f00', avatar: '🐱', drawerSide: 'left', soundOn: true });
  await a.save('p1', 'puzzle', { stars: 3 });
  await a.records.put('puzzle', 'puzzles', 'x', { title: 'Hond', seeded: true });

  const json = JSON.stringify(await createBackup(a));

  const b = await IndexedDbStorage.open('backup-b');
  await b.put({ id: 'oud', name: 'Weg', color: '#000', avatar: '🐶', drawerSide: 'left', soundOn: true });
  await restoreBackup(b, parseBackup(json));

  expect((await b.list()).map((p) => p.id)).toEqual(['p1']);
  expect(await b.load('p1', 'puzzle')).toEqual({ stars: 3 });
  expect(await b.records.get('puzzle', 'puzzles', 'x')).toEqual({ title: 'Hond', seeded: true });
});

// fake-indexeddb bewaart geen jsdom-Blobs, dus de Blob-omzetting testen we los van de opslag.
it('zet Blobs diep in een object om naar JSON en terug', async () => {
  const value = { title: 'Hond', pieces: [{ image: new Blob(['hallo'], { type: 'image/png' }) }] };
  const roundTrip = decodeBlobs(JSON.parse(JSON.stringify(await encodeBlobs(value)))) as typeof value;
  expect(roundTrip.title).toBe('Hond');
  expect(roundTrip.pieces[0].image.type).toBe('image/png');
  expect(await text(roundTrip.pieces[0].image)).toBe('hallo');
});

it('weigt een ongeldig bestand af', () => {
  expect(() => parseBackup('niet json')).toThrow();
  expect(() => parseBackup('{"format":"iets-anders"}')).toThrow();
});

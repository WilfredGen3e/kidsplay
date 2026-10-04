// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { startApp } from './app';
import { dummyGame } from './games/dummy';
import { seedDemoProfiles } from './platform/seed';
import { IndexedDbStorage } from './platform/storage/indexeddb';

const q = <T extends Element>(root: ParentNode, sel: string) => root.querySelector<T>(sel)!;
const tick = () => new Promise((r) => setTimeout(r, 10));

it('profiel kiezen → spel starten → huisknop terug', async () => {
  const storage = await IndexedDbStorage.open('app-test');
  await seedDemoProfiles(storage);
  const root = document.createElement('div');
  await startApp(root, { profiles: storage, progress: storage, games: [dummyGame] });

  const names = [...root.querySelectorAll('.profile-tile')].map((t) => t.getAttribute('aria-label'));
  expect(names).toEqual(['Anna', 'Bram']);

  q<HTMLButtonElement>(root, '.profile-tile').click();
  await tick();
  expect(q(root, '.header-name').textContent).toBe('Anna');

  q<HTMLButtonElement>(root, '.game-tile').click();
  await tick();
  for (let i = 0; i < 10; i++) q<HTMLButtonElement>(root, '.game-area button').click();
  await tick();

  q<HTMLButtonElement>(root, '.home').click();
  await tick();
  expect(q(root, '.stars').textContent).toBe('⭐ 1');
  expect(await storage.load('demo-2', 'dummy')).toBeUndefined();
});

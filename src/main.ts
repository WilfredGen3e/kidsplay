import './style.css';
import { startApp } from './app';
import { puzzleGame } from './games/puzzle';
import { getGames, registerGame } from './platform/registry';
import { createGameData } from './platform/context';
import { IndexedDbStorage } from './platform/storage/indexeddb';

registerGame(puzzleGame);

const storage = await IndexedDbStorage.open();
for (const game of getGames()) await game.init?.(createGameData(storage.records, game.id));
await startApp(document.querySelector<HTMLDivElement>('#app')!, {
  profiles: storage,
  progress: storage,
  records: storage.records,
  games: getGames(),
});

import './style.css';
import { startApp } from './app';
import { dummyGame } from './games/dummy';
import { getGames, registerGame } from './platform/registry';
import { seedDemoProfiles } from './platform/seed';
import { IndexedDbStorage } from './platform/storage/indexeddb';

registerGame(dummyGame);

const storage = await IndexedDbStorage.open();
await seedDemoProfiles(storage);
await startApp(document.querySelector<HTMLDivElement>('#app')!, {
  profiles: storage,
  progress: storage,
  games: getGames(),
});

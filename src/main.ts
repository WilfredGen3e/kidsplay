import './style.css';
import { startApp } from './app';
import { puzzleGame } from './games/puzzle';
import { getGames, registerGame } from './platform/registry';
import { createGameData } from './platform/context';
import { createBackup, parseBackup, restoreBackup } from './platform/backup';
import { IndexedDbStorage } from './platform/storage/indexeddb';

registerGame(puzzleGame);

const storage = await IndexedDbStorage.open();
for (const game of getGames()) await game.init?.(createGameData(storage.records, game.id));
await startApp(document.querySelector<HTMLDivElement>('#app')!, {
  profiles: storage,
  progress: storage,
  records: storage.records,
  games: getGames(),
  backup: {
    create: async () => JSON.stringify(await createBackup(storage)),
    restore: (text) => restoreBackup(storage, parseBackup(text)),
  },
});

// Offline als webapp (iPad/Safari, GitHub Pages); niet in de Tauri-app, daar zit alles al in het pakket.
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && import.meta.env.PROD) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
  // Vraag Safari de gegevens te bewaren; mislukt dat, dan blijft de back-up de vangrail.
  navigator.storage?.persist?.().catch(() => {});
}

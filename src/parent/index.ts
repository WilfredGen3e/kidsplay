import { createGameData } from '../platform/context';
import type { GameModule, ProfileStore, ProgressStore, RecordStore } from '../platform/types';
import { manageStickers } from '../stickers/manage';
import { STICKERS_ID } from '../stickers/model';
import { el, iconButton } from '../ui/dom';
import { showBackup, type BackupActions } from './backup';
import { showProfiles } from './profiles';
import { showOverview } from './progress';

export interface ParentDeps {
  profiles: ProfileStore;
  progress: ProgressStore;
  records: RecordStore;
  games: GameModule[];
  backup?: BackupActions;
  /** Terug naar het profielscherm. */
  exit(): void;
}

/** Ouderdeel: menu met profielen, spelbeheer en voortgang. */
export function showParentMenu(root: HTMLElement, deps: ParentDeps): void {
  let cleanup: void | (() => void);
  const menu = () => {
    cleanup?.();
    cleanup = undefined;
    showParentMenu(root, deps);
  };

  const screen = el('div', 'parent-screen');
  const header = el('header', 'parent-header');
  header.append(iconButton('🏠', 'Klaar', 'round-button', deps.exit), el('h1', '', 'Ouderdeel'));
  screen.append(header);

  const grid = el('div', 'parent-menu');
  const tile = (icon: string, label: string, onClick: () => void) => {
    const b = el('button', 'parent-tile');
    b.type = 'button';
    b.append(el('span', 'parent-tile-icon', icon), el('span', '', label));
    b.addEventListener('click', onClick);
    grid.append(b);
  };

  tile('👤', 'Profielen', () => void showProfiles(root, { profiles: deps.profiles, progress: deps.progress, records: deps.records, back: menu }));
  for (const game of deps.games) {
    if (!game.manage) continue;
    tile(game.icon, game.name, async () => {
      cleanup = game.manage!(root, {
        profiles: await deps.profiles.list(),
        data: createGameData(deps.records, game.id),
        back: menu,
      });
    });
  }
  tile('🎁', 'Stickers', async () => {
    cleanup = manageStickers(root, {
      profiles: await deps.profiles.list(),
      data: createGameData(deps.records, STICKERS_ID),
      back: menu,
    });
  });
  if (deps.backup) tile('💾', 'Back-up', () => showBackup(root, { ...deps.backup!, back: menu }));
  tile('📊', 'Voortgang', () => void showOverview(root, { ...deps, back: menu }));

  screen.append(grid);
  root.replaceChildren(screen);
}

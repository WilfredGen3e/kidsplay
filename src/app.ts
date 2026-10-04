import { createGameContext, createGameData } from './platform/context';
import type { GameModule, Profile, ProfileStore, ProgressStore, RecordStore } from './platform/types';
import { showParentCheck } from './parent/check';
import { showParentMenu } from './parent';
import { avatarNode, el, iconButton } from './ui/dom';

export interface AppDeps {
  profiles: ProfileStore;
  progress: ProgressStore;
  records: RecordStore;
  games: GameModule[];
}

export function startApp(root: HTMLElement, deps: AppDeps): Promise<void> {
  let cleanup: void | (() => void);

  function show(...nodes: Node[]) {
    cleanup?.();
    cleanup = undefined;
    root.replaceChildren(...nodes);
  }

  async function showProfiles() {
    const screen = el('main', 'screen');
    const grid = el('div', 'grid');
    for (const profile of await deps.profiles.list()) {
      const tile = el('button', 'tile profile-tile');
      tile.type = 'button';
      tile.style.background = profile.color;
      tile.setAttribute('aria-label', profile.name);
      tile.append(avatarNode(profile.avatar, 'tile-icon'), el('span', 'tile-name', profile.name));
      tile.addEventListener('click', () => void showGames(profile));
      grid.append(tile);
    }
    const gear = iconButton('⚙️', 'Ouders', 'corner-button gear', showParent);
    show(screen);
    if (grid.children.length === 0) grid.append(el('div', 'empty-state', '👋'), el('p', 'empty-hint', 'Nog geen profielen — tik op het tandwiel (⚙️) om er een te maken.'));
    screen.append(grid, gear);
  }

  function showParent() {
    showParentCheck(
      root,
      () => {
        show();
        showParentMenu(root, { ...deps, exit: () => void showProfiles() });
      },
      () => void showProfiles(),
    );
  }

  async function showGames(profile: Profile) {
    const screen = el('main', 'screen');
    const header = el('header', 'header');
    header.style.background = profile.color;
    header.append(
      iconButton('🏠', 'Terug', 'round-button', () => void showProfiles()),
      avatarNode(profile.avatar, 'tile-icon'),
      el('h1', 'header-name', profile.name),
    );
    const grid = el('div', 'grid');
    for (const game of deps.games) {
      const saved = await deps.progress.load(profile.id, game.id);
      const { stars } = game.summarize(saved);
      const tile = el('button', 'tile game-tile');
      tile.type = 'button';
      tile.setAttribute('aria-label', game.name);
      tile.append(
        el('span', 'tile-icon', game.icon),
        el('span', 'tile-name', game.name),
        el('span', 'stars', stars > 0 ? `⭐ ${stars}` : ''),
      );
      tile.addEventListener('click', () => showGame(profile, game));
      grid.append(tile);
    }
    show(screen);
    screen.append(header, grid);
  }

  function showGame(profile: Profile, game: GameModule) {
    const screen = el('main', 'screen game-screen');
    const home = iconButton('🏠', 'Terug', 'corner-button home', () => void showGames(profile));
    const area = el('div', 'game-area');
    show(screen);
    screen.append(area, home);
    const ctx = createGameContext(
      profile,
      game.id,
      deps.progress,
      createGameData(deps.records, game.id),
      () => void showGames(profile),
    );
    cleanup = game.start(area, ctx);
  }

  return showProfiles();
}

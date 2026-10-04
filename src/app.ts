import { createGameContext, createGameData } from './platform/context';
import type { GameModule, Profile, ProfileStore, ProgressStore, RecordStore } from './platform/types';
import { showParentCheck } from './parent/check';
import { showParentMenu } from './parent';
import { startBook } from './stickers/book';
import { startGifts } from './stickers/gifts';
import { STICKERS_ID } from './stickers/model';
import { loadSavings } from './stickers/status';
import { avatarNode, el, iconButton } from './ui/dom';
import { savingsBar } from './ui/savings';

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
    const stickerData = createGameData(deps.records, STICKERS_ID);
    const rewards = el('div', 'reward-row');
    try {
      const savings = await loadSavings(deps.progress, stickerData, profile.id);
      const bookButton = el('button', 'book-button');
      bookButton.type = 'button';
      bookButton.setAttribute('aria-label', 'Stickerboek');
      bookButton.append(el('span', 'book-button-icon', '📖'));
      bookButton.addEventListener('click', () => void showBook(profile));
      rewards.append(savingsBar(savings, () => void showGifts(profile)), bookButton);
    } catch {
      // Zonder spaarstand blijven de spellen gewoon werken.
    }
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
    screen.append(header, rewards, grid);
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
      {
        savings: () => loadSavings(deps.progress, createGameData(deps.records, STICKERS_ID), profile.id),
        openGifts: () => void showGifts(profile),
      },
    );
    cleanup = game.start(area, ctx);
  }

  function showGifts(profile: Profile) {
    const screen = el('main', 'screen');
    show(screen);
    cleanup = startGifts(screen, {
      profile,
      progress: deps.progress,
      data: createGameData(deps.records, STICKERS_ID),
      onDone: () => void showGames(profile),
      openBook: () => void showBook(profile),
    });
  }

  async function showBook(profile: Profile) {
    const screen = el('main', 'screen book-host');
    const profiles = await deps.profiles.list();
    show(screen);
    cleanup = startBook(screen, {
      profiles,
      viewer: profile,
      data: createGameData(deps.records, STICKERS_ID),
      onBack: () => void showGames(profile),
    });
  }

  return showProfiles();
}

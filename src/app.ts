import { applyBackfill, updateRewards } from './platform/rewards';
import { createGameContext, createGameData } from './platform/context';
import type { GameModule, Profile, ProfileStore, ProgressStore, RecordStore } from './platform/types';
import { showParentCheck } from './parent/check';
import { showParentMenu } from './parent';
import type { BackupActions } from './parent/backup';
import type { UpdateActions } from './platform/update';
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
  /** Back-up maken en terugzetten; ontbreekt in tests zonder echte opslag. */
  backup?: BackupActions;
  /** Nieuwe versie ophalen (alleen in de webapp/PWA). */
  update?: UpdateActions;
  games: GameModule[];
}

export function startApp(root: HTMLElement, deps: AppDeps): Promise<void> {
  let cleanup: void | (() => void);
  // Sessie: leeft tot het kind terug is op het profielenscherm (zie GameContext.session).
  let session: Record<string, unknown> = {};

  function show(...nodes: Node[]) {
    cleanup?.();
    cleanup = undefined;
    root.replaceChildren(...nodes);
  }

  async function showProfiles() {
    session = {};
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
    if (deps.update) screen.append(refreshButton(deps.update));
  }

  /** Linksboven: zoekt de nieuwste versie van de app en laadt die. */
  function refreshButton(update: UpdateActions): HTMLButtonElement {
    const button = iconButton('🔄', 'Nieuwe versie ophalen', 'corner-button refresh', async () => {
      if (button.classList.contains('busy')) return;
      if (update.isReady()) return update.reload();
      button.classList.add('busy');
      const result = await update.check();
      button.classList.remove('busy', 'has-update');
      if (result === 'nieuw') return update.reload();
      button.textContent = result === 'actueel' ? '✅' : '📴';
      setTimeout(() => (button.textContent = '🔄'), 2500);
    });
    const mark = () => button.classList.add('has-update');
    if (update.isReady()) mark();
    update.onReady(mark);
    return button;
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
      session,
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

  /** Kinderen die al puzzels gelegd hebben, krijgen daar eenmalig spaarpunten voor. */
  async function backfillRewards() {
    for (const profile of await deps.profiles.list()) {
      let past = 0;
      for (const game of deps.games) {
        if (game.earnedPoints) past += game.earnedPoints(await deps.progress.load(profile.id, game.id));
      }
      await updateRewards(deps.progress, profile.id, (state) => applyBackfill(state, past));
    }
  }

  return backfillRewards()
    .catch(() => {
      // Zonder bijschrijven blijft alles werken; de volgende start probeert het opnieuw.
    })
    .then(showProfiles);
}

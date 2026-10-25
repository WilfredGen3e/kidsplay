import type { GameContext, GameModule, OverviewRow } from '../../platform/types';
import { spawnConfetti } from '../../ui/confetti';
import { el, iconButton } from '../../ui/dom';
import { playFanfare } from '../../ui/sound';
import { savingsBar } from '../../ui/savings';
import { LEVELS, currentLevel, finishLevel, isEasy, levelName, levelsDone, makeItems, themeOf, timesDone, type ChessProgress } from './levels';
import { mountLevel } from './play';
import { THEMES, pieceSvg, type Theme } from './pieces';
import { mountBoard } from './view';

export const GAME_ID = 'schaken';

function start(root: HTMLElement, ctx: GameContext): () => void {
  let stop = () => {};
  let stopped = false;

  // Opslagacties lopen achter elkaar, zodat ze elkaar niet overschrijven.
  let queue: Promise<unknown> = Promise.resolve();
  const update = (change: (current: ChessProgress | undefined) => ChessProgress) => {
    queue = queue
      .then(async () => ctx.progress.save(change(await ctx.progress.load<ChessProgress>())))
      .catch(() => {
        // Opslag mislukt: het kind speelt gewoon door.
      });
    return queue;
  };
  const loadProgress = async () => {
    await queue;
    try {
      return await ctx.progress.load<ChessProgress>();
    } catch {
      return undefined;
    }
  };

  const swap = (next: () => void) => {
    stop();
    stop = () => {};
    next();
  };

  async function showMap() {
    stop();
    stop = () => {};
    const progress = await loadProgress();
    if (stopped) return;
    const next = currentLevel(progress);
    const theme = themeOf(progress);
    const map = el('div', `schaken sk-map sk-theme-${theme}`);
    const grid = el('div', 'sk-levels');
    LEVELS.forEach((level, i) => {
      const done = timesDone(progress, i) > 0;
      const tile = el('button', 'sk-tile');
      tile.type = 'button';
      tile.setAttribute('aria-label', levelName(level));
      tile.classList.toggle('sk-tile-next', i === next);
      const icon = el('span', 'sk-tile-icon');
      icon.innerHTML = pieceSvg({ kind: level.kind, color: 'w' }, theme);
      tile.append(icon, el('span', 'sk-tile-badge', done ? '⭐' : i === next ? '▶️' : ''));
      if (level.badge) tile.append(el('span', 'sk-tile-mode', level.badge));
      tile.addEventListener('click', () => void playLevel(i));
      grid.append(tile);
    });
    const free = el('button', 'sk-tile sk-tile-free');
    free.type = 'button';
    free.setAttribute('aria-label', 'Vrij oefenen');
    free.append(el('span', 'sk-tile-icon sk-tile-crown', '👑'));
    free.addEventListener('click', () => swap(() => (stop = mountBoard(root, theme, () => void showMap()))));
    grid.append(free);
    // Uiterlijk kiezen: twee knoppen met de koning van elk thema, geen tekst.
    const themes = el('div', 'sk-themes');
    for (const option of THEMES) {
      const button = el('button', 'sk-theme-pick');
      button.type = 'button';
      button.setAttribute('aria-label', option);
      button.classList.toggle('sk-pick-on', option === theme);
      button.innerHTML = pieceSvg({ kind: 'K', color: 'w' }, option);
      button.addEventListener('click', () => void chooseTheme(option));
      themes.append(button);
    }
    map.append(grid, themes);
    root.replaceChildren(map);
  }

  async function chooseTheme(theme: Theme) {
    await update((current) => ({ done: {}, ...current, theme }));
    if (!stopped) void showMap();
  }

  async function playLevel(levelIndex: number) {
    const progress = await loadProgress();
    if (stopped) return;
    swap(() => {
      const level = LEVELS[levelIndex];
      const items = makeItems(level, isEasy(progress, levelIndex));
      stop = mountLevel(root, {
        level,
        theme: themeOf(progress),
        items,
        soundOn: ctx.profile.soundOn,
        // Direct aanroepen (zonder await): de wachtrij van de spaarpunten loopt dan voor op het lezen van de stand.
        onExerciseDone: () => void ctx.addPoints(1).catch(() => {}),
        onFinished: (clean) => void finished(levelIndex, clean, items.length),
        onBack: () => void showMap(),
      });
    });
  }

  async function finished(levelIndex: number, clean: number, total: number) {
    void update((current) => finishLevel(current, levelIndex, clean, total).progress);
    const savings = await ctx.savings().catch(() => undefined);
    if (stopped) return;
    const overlay = el('div', 'celebration');
    spawnConfetti(overlay);
    const card = el('div', 'celebration-card');
    card.append(el('div', 'celebration-star', '⭐'));
    // Geen spaarpot en geen aftelling; alleen een klaarstaand cadeautje of het volle dagmaximum.
    if (savings && (savings.gifts > 0 || savings.dayFull)) card.append(savingsBar(savings, ctx.openGifts, false));
    const buttons = el('div', 'celebration-buttons');
    buttons.append(iconButton('🏠', 'Klaar', 'round-button celebration-home', ctx.exit));
    if (!savings?.dayFull) buttons.append(iconButton('🗺️', 'Andere level', 'round-button', () => void showMap()));
    card.append(buttons);
    overlay.append(card);
    root.append(overlay);
    if (ctx.profile.soundOn) playFanfare();
  }

  void showMap();

  return () => {
    stopped = true;
    stop();
    root.replaceChildren();
  };
}

export const schakenGame: GameModule = {
  id: GAME_ID,
  name: 'Schaken',
  icon: '👑',
  start,
  summarize(progress) {
    return { stars: levelsDone(progress as ChessProgress | undefined) };
  },
  async overview(progress): Promise<OverviewRow[]> {
    const p = progress as ChessProgress | undefined;
    return LEVELS.flatMap((level, i) => {
      const times = timesDone(p, i);
      return times > 0
        ? [{ title: `Level ${i + 1}: ${levelName(level)}`, details: [`${times}× gehaald`], done: true }]
        : [];
    });
  },
};

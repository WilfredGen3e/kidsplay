import type { GameContext, GameModule, OverviewRow } from '../../platform/types';
import { spawnConfetti } from '../../ui/confetti';
import { el, iconButton } from '../../ui/dom';
import { playFanfare } from '../../ui/sound';
import { savingsBar } from '../../ui/savings';
import { makeExercises } from './exercises';
import { LEVELS, levelsDone, nextLevel, recordLevelDone, timesDone, type ChessProgress } from './levels';
import { mountLevel } from './play';
import { pieceName, pieceSvg } from './pieces';
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
    const next = nextLevel(progress);
    const map = el('div', 'schaken sk-map');
    const grid = el('div', 'sk-levels');
    LEVELS.forEach((level, i) => {
      const done = timesDone(progress, i) > 0;
      const tile = el('button', 'sk-tile');
      tile.type = 'button';
      tile.setAttribute('aria-label', pieceName(level.kind));
      tile.classList.toggle('sk-tile-next', i === next);
      const icon = el('span', 'sk-tile-icon');
      icon.innerHTML = pieceSvg({ kind: level.kind, color: 'w' });
      tile.append(icon, el('span', 'sk-tile-badge', done ? '⭐' : i === next ? '▶️' : ''));
      tile.addEventListener('click', () => playLevel(i));
      grid.append(tile);
    });
    const free = el('button', 'sk-tile sk-tile-free');
    free.type = 'button';
    free.setAttribute('aria-label', 'Vrij oefenen');
    free.append(el('span', 'sk-tile-icon sk-tile-crown', '👑'));
    free.addEventListener('click', () => swap(() => (stop = mountBoard(root, () => void showMap()))));
    grid.append(free);
    map.append(grid);
    root.replaceChildren(map);
  }

  function playLevel(levelIndex: number) {
    swap(() => {
      const level = LEVELS[levelIndex];
      stop = mountLevel(root, {
        level,
        exercises: makeExercises(level.kind),
        soundOn: ctx.profile.soundOn,
        // Direct aanroepen (zonder await): de wachtrij van de spaarpunten loopt dan voor op het lezen van de stand.
        onExerciseDone: () => void ctx.addPoints(1).catch(() => {}),
        onFinished: () => void finished(levelIndex),
        onBack: () => void showMap(),
      });
    });
  }

  async function finished(levelIndex: number) {
    void update((current) => recordLevelDone(current, levelIndex));
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
        ? [{ title: `Level ${i + 1}: ${pieceName(level.kind)}`, details: [`${times}× gehaald`], done: true }]
        : [];
    });
  },
};

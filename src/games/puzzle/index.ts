import type { GameContext, GameModule, OverviewRow } from '../../platform/types';
import { el, iconButton } from '../../ui/dom';
import { showCelebration } from './celebration';
import { blobToCanvas, loadImage } from './image';
import {
  GAME_ID,
  SNAP_FACTORS,
  isVisibleFor,
  listPuzzles,
  loadSettings,
  type Puzzle,
} from './model';
import { manage } from './manage';
import {
  addResult,
  bestTime,
  findSnapshot,
  formatTime,
  saveSnapshot,
  starCount,
  type PuzzleProgress,
  type PuzzleSnapshot,
} from './progress';
import { ensureSamplePuzzle } from './seed';
import { mountPuzzle } from './view';

function start(root: HTMLElement, ctx: GameContext): () => void {
  let stop = () => {};
  let stopped = false;
  const urls: string[] = [];
  const url = (blob: Blob) => {
    const u = URL.createObjectURL(blob);
    urls.push(u);
    return u;
  };

  // Opslagacties lopen achter elkaar, zodat snel opeenvolgende zetten elkaar niet overschrijven.
  let queue: Promise<unknown> = Promise.resolve();
  const update = (change: (current: PuzzleProgress | undefined) => PuzzleProgress) => {
    queue = queue
      .then(async () => ctx.progress.save(change(await ctx.progress.load<PuzzleProgress>())))
      .catch(() => {
        // Opslag mislukt: het kind speelt gewoon door.
      });
    return queue;
  };
  const loadProgress = async () => {
    await queue;
    try {
      return await ctx.progress.load<PuzzleProgress>();
    } catch {
      return undefined;
    }
  };

  async function showPicker() {
    stop();
    stop = () => {};
    const [all, progress] = await Promise.all([listPuzzles(ctx.data), loadProgress()]);
    if (stopped) return;
    const puzzles = all.filter((p) => isVisibleFor(p, ctx.profile.id));

    const screen = el('div', 'picker');
    const grid = el('div', 'grid');
    if (puzzles.length === 0) {
      grid.append(el('div', 'empty-state', '🧩'));
      screen.append(grid, el('p', 'empty-hint', 'Nog geen puzzels — maak er een in het ouderdeel (⚙️).'));
    }
    for (const puzzle of puzzles) {
      const stars = (progress?.results ?? []).filter((r) => r.puzzleId === puzzle.id).length;
      const busy = (progress?.inProgress ?? []).some((s) => s.puzzleId === puzzle.id);
      const tile = el('button', 'tile puzzle-tile');
      tile.type = 'button';
      tile.setAttribute('aria-label', puzzle.name);
      const img = el('img', 'puzzle-thumb');
      img.src = url(puzzle.thumb);
      img.alt = '';
      img.draggable = false;
      tile.append(img, el('span', 'tile-name', puzzle.name));
      const badges = `${busy ? '▶️ ' : ''}${stars > 0 ? `⭐ ${stars}` : ''}`;
      tile.append(el('span', 'stars', badges));
      tile.addEventListener('click', () => {
        if (puzzle.pieceOptions.length === 1) void play(puzzle, puzzle.pieceOptions[0]);
        else showCounts(puzzle, progress);
      });
      grid.append(tile);
    }
    if (puzzles.length > 0) screen.append(grid);
    root.replaceChildren(screen);
  }

  function showCounts(puzzle: Puzzle, progress: PuzzleProgress | undefined) {
    const screen = el('div', 'picker');
    const back = iconButton('⬅️', 'Terug', 'corner-button back', () => void showPicker());
    const preview = el('img', 'count-preview');
    preview.src = url(puzzle.thumb);
    preview.alt = '';
    const grid = el('div', 'grid count-grid');
    for (const count of puzzle.pieceOptions) {
      const done = (progress?.results ?? []).some((r) => r.puzzleId === puzzle.id && r.pieces === count);
      const busy = findSnapshot(progress, puzzle.id, count) !== undefined;
      const tile = el('button', 'tile count-tile');
      tile.type = 'button';
      tile.setAttribute('aria-label', `${count}`);
      tile.append(el('span', 'tile-icon', String(count)), el('span', 'stars', `${busy ? '▶️ ' : ''}${done ? '⭐' : ''}`));
      tile.addEventListener('click', () => void play(puzzle, count));
      grid.append(tile);
    }
    screen.append(back, preview, grid);
    root.replaceChildren(screen);
  }

  async function play(puzzle: Puzzle, pieces: number, fresh = false) {
    stop();
    stop = () => {};
    const [settings, progress, image] = await Promise.all([
      loadSettings(ctx.data),
      loadProgress(),
      loadImage(puzzle.image).then(blobToCanvas),
    ]);
    if (stopped) return;

    stop = mountPuzzle(root, {
      puzzleId: puzzle.id,
      image,
      pieces,
      drawerSide: ctx.profile.drawerSide,
      soundOn: ctx.profile.soundOn,
      snapFactor: SNAP_FACTORS[settings.snap],
      preview: settings.preview,
      ghost: settings.ghost,
      hint: settings.hint,
      restore: fresh ? undefined : findSnapshot(progress, puzzle.id, pieces),
      onLock: (count) => void ctx.addPoints(count).catch(() => {}),
      onProgress: (snapshot: PuzzleSnapshot) => void update((current) => saveSnapshot(current, snapshot)),
      onComplete: async (timeMs) => {
        const previous = await loadProgress();
        // De punten van de laatste stukjes staan al in de wachtrij; lezen wacht daarop.
        const savings = await ctx.savings().catch(() => undefined);
        if (stopped) return;
        const best = bestTime(previous, puzzle.id, pieces);
        showCelebration(root, {
          timeMs,
          isRecord: best !== undefined && timeMs < best,
          soundOn: ctx.profile.soundOn,
          onAgain: () => void play(puzzle, pieces, true),
          onPick: () => void showPicker(),
          onHome: ctx.exit,
          savings,
          onGifts: ctx.openGifts,
        });
        void update((current) =>
          addResult(current, { puzzleId: puzzle.id, pieces, timeMs, completedAt: new Date().toISOString() }),
        );
      },
    });
  }

  void showPicker();

  return () => {
    stopped = true;
    stop();
    for (const u of urls) URL.revokeObjectURL(u);
    root.replaceChildren();
  };
}

export const puzzleGame: GameModule = {
  id: GAME_ID,
  name: 'Fotopuzzel',
  icon: '🧩',
  init: ensureSamplePuzzle,
  start,
  summarize(progress) {
    return { stars: starCount(progress as PuzzleProgress | undefined) };
  },
  manage,
  async overview(progress, data): Promise<OverviewRow[]> {
    const p = progress as PuzzleProgress | undefined;
    const puzzles = new Map((await listPuzzles(data)).map((x) => [x.id, x]));
    const fmt = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
    const rows: OverviewRow[] = [];
    for (const s of p?.inProgress ?? []) {
      const puzzle = puzzles.get(s.puzzleId);
      rows.push({
        title: puzzle?.name ?? 'Verwijderde puzzel',
        image: puzzle ? URL.createObjectURL(puzzle.thumb) : undefined,
        details: [`${s.pieces} stukjes`, 'Bezig', formatTime(s.elapsedMs)],
        done: false,
      });
    }
    for (const r of [...(p?.results ?? [])].reverse()) {
      const puzzle = puzzles.get(r.puzzleId);
      rows.push({
        title: puzzle?.name ?? 'Verwijderde puzzel',
        image: puzzle ? URL.createObjectURL(puzzle.thumb) : undefined,
        details: [`${r.pieces} stukjes`, 'Voltooid', formatTime(r.timeMs), fmt.format(new Date(r.completedAt))],
        done: true,
      });
    }
    return rows;
  },
};

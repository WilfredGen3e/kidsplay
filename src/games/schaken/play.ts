import { el, iconButton } from '../../ui/dom';
import { playSparkle } from '../../ui/sound';
import { renderBoard } from './board';
import { bestMoves, boardFor, stepsLeft } from './exercises';
import { sentenceFor, type Item, type Level } from './levels';
import type { Theme } from './pieces';
import { goodMoves, isMateMove, isPuzzle, isSafeMove, opponentMove, type Puzzle } from './puzzles';
import {
  SIZE,
  findKing,
  hasLegalMove,
  legalMoves,
  movePiece,
  movesFor,
  pieceAt,
  sameSquare,
  squaresOf,
  type Board,
  type Square,
} from './rules';

/** Zoveel keer er iets misgaat, dan laat het spel zien welke kant op. */
const MISSES_FOR_HINT = 2;
/** Even de tijd om de ster te zien dansen voor het volgende opdrachtje. */
const NEXT_DELAY_MS = 1100;
/** Hoe lang een gevaarlijke of foute zet te zien blijft voor het stuk terugspringt. */
const OOPS_MS = 900;
/** Bedenktijd van de tegenstander in de partij. */
const OPPONENT_MS = 800;

export interface PlayOptions {
  level: Level;
  theme: Theme;
  items: Item[];
  soundOn: boolean;
  /** Een opdrachtje is gehaald (voor de spaarpunten); `clean` als het zonder omweg ging. */
  onExerciseDone: (clean: boolean) => void;
  /** Alle opdrachtjes van het level zijn gedaan; `clean` is het aantal dat zonder omweg ging. */
  onFinished: (clean: number) => void;
  onBack: () => void;
}

/** Eén level: opdrachtje voor opdrachtje. Nooit een foutmelding; fout is gewoon nog een keer proberen. */
export function mountLevel(root: HTMLElement, opts: PlayOptions): () => void {
  let index = 0;
  let board: Board;
  let selected: Square | undefined;
  let moved: Square | undefined;
  let won = false;
  /** Even niet aanraken: een stuk springt terug of de tegenstander denkt na. */
  let locked = false;
  let misses = 0;
  let clean = 0;
  let check: Square | undefined;
  let oops: Square | undefined;
  /** Welke opdrachtjes zijn gehaald (voor de sterretjes). */
  const results: boolean[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  const wrap = el('div', `schaken schaken-play sk-theme-${opts.theme}`);
  const boardEl = el('div', 'sk-board');
  const side = el('div', 'sk-side');
  const sentenceEl = el('p', 'sk-sentence');
  const stars = el('div', 'sk-progress');
  side.append(sentenceEl, stars, iconButton('⬅️', 'Terug', 'round-button sk-back', opts.onBack));
  wrap.append(boardEl, side);
  root.replaceChildren(wrap);

  const item = () => opts.items[index];
  const puzzle = (): Puzzle | undefined => (isPuzzle(item()) ? (item() as Puzzle) : undefined);
  const later = (ms: number, action: () => void) => {
    timer = setTimeout(action, ms);
  };

  /** Zetten van het gekozen stuk: bij schaak en mat gelden de echte regels, anders de bewegingsregels. */
  const movesOf = (from: Square) => (puzzle() ? legalMoves(board, from) : movesFor(board, from));

  const hintsFor = (): Square[] => {
    if (!selected || won || locked || misses < MISSES_FOR_HINT) return [];
    const p = puzzle();
    if (p) return goodMoves({ ...p, board }, selected);
    const ex = item();
    if (isPuzzle(ex)) return [];
    const best = bestMoves(ex, selected)[0];
    return best ? [best] : [];
  };

  const render = () => {
    const it = item();
    renderBoard(
      boardEl,
      {
        board,
        theme: opts.theme,
        selected,
        targets: selected && !locked ? movesOf(selected) : [],
        moved,
        goal: isPuzzle(it) ? undefined : it.goal,
        hints: hintsFor(),
        check,
        oops,
        won,
      },
      tap,
    );
    sentenceEl.textContent = sentenceFor(opts.level, it);
    stars.replaceChildren(...opts.items.map((_, i) => el('span', results[i] ? 'sk-star sk-star-on' : 'sk-star', '⭐')));
  };

  const begin = () => {
    const it = item();
    board = isPuzzle(it) ? it.board : boardFor(it, it.start);
    selected = undefined;
    moved = undefined;
    check = undefined;
    oops = undefined;
    won = false;
    locked = false;
    misses = 0;
    render();
  };

  /** Dit opdrachtje is voorbij; `success` = gehaald (ster en punt), anders gewoon door naar het volgende. */
  const finishItem = (success: boolean) => {
    won = true;
    locked = true;
    results[index] = success;
    if (success) {
      if (misses === 0) clean += 1;
      if (opts.soundOn) playSparkle();
      opts.onExerciseDone(misses === 0);
    }
    render();
    later(NEXT_DELAY_MS, () => {
      index += 1;
      if (index < opts.items.length) begin();
      else opts.onFinished(clean);
    });
  };

  /** Een zet die niet goed was: even laten zien, dan springt het stuk terug naar waar het begon. */
  const oopsThenReset = (to: Square) => {
    locked = true;
    oops = to;
    moved = to;
    selected = undefined;
    misses += 1;
    render();
    later(OOPS_MS, () => {
      const p = puzzle()!;
      board = p.board;
      moved = undefined;
      oops = undefined;
      locked = false;
      render();
    });
  };

  // — De partij —

  const reachedEnd = (color: 'w' | 'b') =>
    squaresOf(board, color).some((sq) => (color === 'w' ? sq.row === SIZE - 1 : sq.row === 0));

  /** Na elke zet: is het afgelopen, of wie is aan de beurt? */
  const afterGameMove = (mover: 'w' | 'b') => {
    if (reachedEnd('w') || squaresOf(board, 'b').length === 0) return finishItem(true);
    if (reachedEnd('b') || squaresOf(board, 'w').length === 0) return finishItem(false);
    const next = mover === 'w' ? 'b' : 'w';
    if (hasLegalMove(board, next)) return next === 'b' ? opponentTurn() : unlock();
    // De ander kan niet zetten: hij slaat een beurt over.
    if (hasLegalMove(board, mover)) return mover === 'b' ? opponentTurn() : unlock();
    return finishItem(false);
  };
  const unlock = () => {
    locked = false;
    render();
  };
  const opponentTurn = () => {
    locked = true;
    render();
    later(OPPONENT_MS, () => {
      const move = opponentMove(board, Math.random, (item() as Puzzle).gentle);
      if (move) {
        board = movePiece(board, move.from, move.to).board;
        moved = move.to;
      }
      afterGameMove('b');
    });
  };

  // — Tikken —

  const tap = (sq: Square) => {
    if (won || locked) return;
    const it = item();
    const targets = selected ? movesOf(selected) : [];
    if (selected && targets.some((t) => sameSquare(t, sq))) {
      const from = selected;
      const p = puzzle();
      if (p?.mode === 'safe' || p?.mode === 'mate') {
        const good = p.mode === 'safe' ? isSafeMove(board, from, sq) : isMateMove(board, from, sq);
        board = movePiece(board, from, sq).board;
        moved = sq;
        selected = undefined;
        if (good) {
          if (p.mode === 'mate') check = findKing(board, 'b');
          return finishItem(true);
        }
        board = movePiece(p.board, from, sq).board;
        return oopsThenReset(sq);
      }
      if (p?.mode === 'game') {
        board = movePiece(board, from, sq).board;
        moved = sq;
        selected = undefined;
        return afterGameMove('w');
      }
      // Loop naar de ster (ook bij slaan).
      const ex = it as Exclude<Item, Puzzle>;
      const before = stepsLeft(ex, from);
      board = movePiece(board, from, sq).board;
      moved = sq;
      selected = undefined;
      if (sameSquare(sq, ex.goal)) return finishItem(true);
      // Een zet die niet dichterbij brengt telt als misser; het kind begint gewoon opnieuw met tikken.
      if (stepsLeft(ex, sq) >= before) misses += 1;
    } else if (pieceAt(board, sq)?.color === 'w' && !(selected && sameSquare(selected, sq))) {
      selected = sq;
      moved = undefined;
    } else {
      selected = undefined;
    }
    render();
  };

  begin();
  return () => {
    if (timer) clearTimeout(timer);
    root.replaceChildren();
  };
}

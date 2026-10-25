import { el, iconButton } from '../../ui/dom';
import { playSparkle } from '../../ui/sound';
import { renderBoard } from './board';
import { bestMoves, boardFor, stepsLeft, type Exercise } from './exercises';
import type { Theme } from './pieces';
import { sentenceFor, type Level } from './levels';
import { movePiece, movesFor, pieceAt, sameSquare, type Board, type Square } from './rules';

/** Zoveel zetten die niet dichterbij komen, dan laat het spel zien welke kant op. */
const MISSES_FOR_HINT = 2;
/** Even de tijd om de ster te zien dansen voor het volgende opdrachtje. */
const NEXT_DELAY_MS = 1100;

export interface PlayOptions {
  level: Level;
  theme: Theme;
  exercises: Exercise[];
  soundOn: boolean;
  /** Een opdrachtje is gehaald (voor de spaarpunten); `clean` als het zonder omweg ging. */
  onExerciseDone: (clean: boolean) => void;
  /** Alle opdrachtjes van het level zijn gehaald; `clean` is het aantal dat zonder omweg ging. */
  onFinished: (clean: number) => void;
  onBack: () => void;
}

/** Eén level: opdrachtje voor opdrachtje met een stuk naar de ster lopen. Nooit een foutmelding. */
export function mountLevel(root: HTMLElement, opts: PlayOptions): () => void {
  let index = 0;
  let board: Board;
  let selected: Square | undefined;
  let moved: Square | undefined;
  let won = false;
  let misses = 0;
  let clean = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const wrap = el('div', `schaken schaken-play sk-theme-${opts.theme}`);
  const boardEl = el('div', 'sk-board');
  const side = el('div', 'sk-side');
  const sentenceEl = el('p', 'sk-sentence');
  const stars = el('div', 'sk-progress');
  side.append(sentenceEl, stars, iconButton('⬅️', 'Terug', 'round-button sk-back', opts.onBack));
  wrap.append(boardEl, side);
  root.replaceChildren(wrap);

  const exercise = () => opts.exercises[index];
  const sentence = () => sentenceFor(opts.level, exercise());

  const render = () => {
    const ex = exercise();
    const targets = selected ? movesFor(board, selected) : [];
    const hint =
      selected && misses >= MISSES_FOR_HINT && !won ? bestMoves(ex, selected)[0] : undefined;
    renderBoard(boardEl, { board, theme: opts.theme, selected, targets, moved, goal: ex.goal, hint, won }, tap);
    sentenceEl.textContent = sentence();
    stars.replaceChildren(
      ...opts.exercises.map((_, i) => el('span', i < index || (won && i === index) ? 'sk-star sk-star-on' : 'sk-star', '⭐')),
    );
  };

  const begin = () => {
    const ex = exercise();
    board = boardFor(ex, ex.start);
    selected = undefined;
    moved = undefined;
    won = false;
    misses = 0;
    render();
  };

  const tap = (sq: Square) => {
    if (won) return;
    const ex = exercise();
    const targets = selected ? movesFor(board, selected) : [];
    if (selected && targets.some((t) => sameSquare(t, sq))) {
      const before = stepsLeft(ex, selected);
      board = movePiece(board, selected, sq).board;
      moved = sq;
      selected = undefined;
      if (sameSquare(sq, ex.goal)) {
        won = true;
        render();
        if (opts.soundOn) playSparkle();
        if (misses === 0) clean += 1;
        opts.onExerciseDone(misses === 0);
        timer = setTimeout(() => {
          if (index + 1 < opts.exercises.length) {
            index += 1;
            begin();
          } else {
            index += 1;
            opts.onFinished(clean);
          }
        }, NEXT_DELAY_MS);
        return;
      }
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

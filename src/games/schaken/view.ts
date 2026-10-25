import { el } from '../../ui/dom';
import { pieceName, pieceSvg } from './pieces';
import {
  SIZE,
  emptyBoard,
  movePiece,
  movesFor,
  pieceAt,
  sameSquare,
  startBoard,
  withPiece,
  type Board,
  type Kind,
  type Square,
} from './rules';

/** Volgorde van het keuzerijtje: van eenvoudig naar ingewikkeld. */
const PICKER: Kind[] = ['R', 'B', 'Q', 'N', 'K', 'P'];

/** Waar een los stuk begint: pionnen op hun beginrij, de rest in het midden. */
const SOLO_START: Record<Kind, Square> = {
  R: { col: 3, row: 3 },
  B: { col: 3, row: 3 },
  Q: { col: 3, row: 3 },
  N: { col: 3, row: 3 },
  K: { col: 3, row: 3 },
  P: { col: 3, row: 1 },
};

/**
 * Oefenbord: kies een stuk, tik erop en zie waar het naartoe mag, tik op een bolletje om te lopen.
 * Het kind kan niets fout doen; er zijn geen beurten en geen regels die blokkeren.
 */
export function mountBoard(root: HTMLElement): () => void {
  let board: Board = emptyBoard();
  let selected: Square | undefined;
  let moved: Square | undefined;
  let chosen: Kind | 'all' = 'Q';

  const wrap = el('div', 'schaken');
  const boardEl = el('div', 'sk-board');
  const picker = el('div', 'sk-picker');
  wrap.append(boardEl, picker);
  root.replaceChildren(wrap);

  const setup = (what: Kind | 'all') => {
    chosen = what;
    selected = undefined;
    moved = undefined;
    board =
      what === 'all'
        ? startBoard()
        : withPiece(emptyBoard(), SOLO_START[what], { kind: what, color: 'w' });
    render();
  };

  const tap = (sq: Square) => {
    const targets = selected ? movesFor(board, selected) : [];
    if (selected && targets.some((t) => sameSquare(t, sq))) {
      board = movePiece(board, selected, sq).board;
      moved = sq;
      selected = undefined;
    } else if (pieceAt(board, sq) && !(selected && sameSquare(selected, sq))) {
      selected = sq;
      moved = undefined;
    } else {
      selected = undefined;
    }
    render();
  };

  const render = () => {
    const targets = selected ? movesFor(board, selected) : [];
    const cells: HTMLElement[] = [];
    for (let row = SIZE - 1; row >= 0; row--) {
      for (let col = 0; col < SIZE; col++) {
        const sq = { col, row };
        const piece = pieceAt(board, sq);
        const isTarget = targets.some((t) => sameSquare(t, sq));
        const cell = el('button', 'sk-sq');
        cell.type = 'button';
        cell.classList.add((col + row) % 2 === 0 ? 'sk-dark' : 'sk-light');
        if (selected && sameSquare(selected, sq)) cell.classList.add('sk-selected');
        if (isTarget) cell.classList.add(piece ? 'sk-capture' : 'sk-target');
        cell.dataset.col = String(col);
        cell.dataset.row = String(row);
        if (piece) {
          cell.setAttribute('aria-label', pieceName(piece.kind));
          const holder = el('span', 'sk-piece');
          if (moved && sameSquare(moved, sq)) holder.classList.add('sk-landed');
          holder.innerHTML = pieceSvg(piece);
          cell.append(holder);
        }
        cell.addEventListener('click', () => tap(sq));
        cells.push(cell);
      }
    }
    boardEl.replaceChildren(...cells);

    picker.replaceChildren(
      ...PICKER.map((kind) => {
        const button = el('button', 'sk-pick');
        button.type = 'button';
        button.setAttribute('aria-label', pieceName(kind));
        button.classList.toggle('sk-pick-on', chosen === kind);
        button.innerHTML = pieceSvg({ kind, color: 'w' });
        button.addEventListener('click', () => setup(kind));
        return button;
      }),
      (() => {
        const button = el('button', 'sk-pick sk-pick-all', '👑');
        button.type = 'button';
        button.setAttribute('aria-label', 'Alle stukken');
        button.classList.toggle('sk-pick-on', chosen === 'all');
        button.addEventListener('click', () => setup('all'));
        return button;
      })(),
    );
  };

  setup('Q');
  return () => root.replaceChildren();
}

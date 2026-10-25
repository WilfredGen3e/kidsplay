import { el, iconButton } from '../../ui/dom';
import { renderBoard } from './board';
import { pieceName, pieceSvg, type Theme } from './pieces';
import {
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
export function mountBoard(root: HTMLElement, theme: Theme, onBack: () => void): () => void {
  let board: Board = emptyBoard();
  let selected: Square | undefined;
  let moved: Square | undefined;
  let chosen: Kind | 'all' = 'Q';

  const wrap = el('div', `schaken sk-theme-${theme}`);
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
    renderBoard(boardEl, { board, theme, selected, moved, targets: selected ? movesFor(board, selected) : [] }, tap);

    picker.replaceChildren(
      ...PICKER.map((kind) => {
        const button = el('button', 'sk-pick');
        button.type = 'button';
        button.setAttribute('aria-label', pieceName(kind));
        button.classList.toggle('sk-pick-on', chosen === kind);
        button.innerHTML = pieceSvg({ kind, color: 'w' }, theme);
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
      iconButton('⬅️', 'Terug', 'round-button sk-back', onBack),
    );
  };

  setup('Q');
  return () => root.replaceChildren();
}

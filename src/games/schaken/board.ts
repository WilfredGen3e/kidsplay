import { el } from '../../ui/dom';
import { pieceName, pieceSvg, type Theme } from './pieces';
import { SIZE, pieceAt, sameSquare, type Board, type Square } from './rules';

export interface BoardState {
  board: Board;
  theme: Theme;
  selected?: Square;
  /** Vakjes waar het gekozen stuk naartoe mag (gouden bolletjes). */
  targets: Square[];
  /** Het vakje waar een stuk net is geland (plofje). */
  moved?: Square;
  /** Het vakje met de ster. */
  goal?: Square;
  /** Het bolletje dat extra opvalt als het kind hulp nodig heeft. */
  hint?: Square;
  /** Het doel is gehaald: de ster danst. */
  won?: boolean;
}

/** Tekent het bord opnieuw in `boardEl`; `onTap` krijgt het aangetikte vakje. */
export function renderBoard(boardEl: HTMLElement, state: BoardState, onTap: (sq: Square) => void): void {
  const cells: HTMLElement[] = [];
  for (let row = SIZE - 1; row >= 0; row--) {
    for (let col = 0; col < SIZE; col++) {
      const sq = { col, row };
      const piece = pieceAt(state.board, sq);
      const cell = el('button', 'sk-sq');
      cell.type = 'button';
      cell.classList.add((col + row) % 2 === 0 ? 'sk-dark' : 'sk-light');
      if (state.selected && sameSquare(state.selected, sq)) cell.classList.add('sk-selected');
      if (state.targets.some((t) => sameSquare(t, sq))) cell.classList.add(piece ? 'sk-capture' : 'sk-target');
      if (state.hint && sameSquare(state.hint, sq)) cell.classList.add('sk-hint');
      if (state.goal && sameSquare(state.goal, sq)) {
        cell.classList.add('sk-goal');
        if (piece) cell.classList.add('sk-goal-piece');
        if (state.won) cell.classList.add('sk-won');
      }
      cell.dataset.col = String(col);
      cell.dataset.row = String(row);
      if (piece) {
        cell.setAttribute('aria-label', pieceName(piece.kind));
        const holder = el('span', 'sk-piece');
        if (state.moved && sameSquare(state.moved, sq)) holder.classList.add('sk-landed');
        holder.innerHTML = pieceSvg(piece, state.theme);
        cell.append(holder);
      }
      cell.addEventListener('click', () => onTap(sq));
      cells.push(cell);
    }
  }
  boardEl.replaceChildren(...cells);
}

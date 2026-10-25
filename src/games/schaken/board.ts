import { el } from '../../ui/dom';
import { pieceName, pieceSvg, type Theme } from './pieces';
import { SIZE, pieceAt, sameSquare, type Board, type Square } from './rules';

/**
 * Welk lapje (patroon) elk vakje krijgt, rij voor rij van onder naar boven. Vast en onregelmatig, zodat het een quilt lijkt;
 * elk patroon komt op lichte én donkere vakjes voor en vakjes van dezelfde kleur naast of boven elkaar zijn nooit gelijk.
 */
const PATCHES = '3112312330023001223112310130023031223112300130021231223112300130';

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
  /** Bolletjes die extra opvallen als het kind hulp nodig heeft. */
  hints?: Square[];
  /** Het vakje van een koning die schaak staat (rode rand). */
  check?: Square;
  /** Het vakje waar het stuk op een gevaarlijke plek staat (schudt even). */
  oops?: Square;
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
      // Het patroon hangt niet samen met licht of donker, zodat het dambord altijd goed te zien blijft.
      cell.classList.add((col + row) % 2 === 0 ? 'sk-dark' : 'sk-light', `sk-v${PATCHES[row * SIZE + col]}`);
      if (state.selected && sameSquare(state.selected, sq)) cell.classList.add('sk-selected');
      if (state.targets.some((t) => sameSquare(t, sq))) cell.classList.add(piece ? 'sk-capture' : 'sk-target');
      if (state.hints?.some((h) => sameSquare(h, sq))) cell.classList.add('sk-hint');
      if (state.check && sameSquare(state.check, sq)) cell.classList.add('sk-check');
      if (state.oops && sameSquare(state.oops, sq)) cell.classList.add('sk-oops');
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

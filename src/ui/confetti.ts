import { el } from './dom';

const CONFETTI_COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac'];

/** Valt confetti over `parent`; de stukjes ruimen zichzelf niet op, de ouder doet dat. */
export function spawnConfetti(parent: HTMLElement, count = 60): void {
  for (let i = 0; i < count; i++) {
    const piece = el('span', 'confetti');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.animationDelay = `${Math.random() * 2}s`;
    piece.style.animationDuration = `${2.5 + Math.random() * 2}s`;
    parent.append(piece);
  }
}

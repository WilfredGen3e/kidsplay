import { el, iconButton } from '../../ui/dom';
import { formatTime } from './progress';
import { playFanfare } from './sound';

export interface CelebrationOptions {
  timeMs: number;
  /** Sneller dan de vorige beste tijd. */
  isRecord: boolean;
  soundOn: boolean;
  onAgain: () => void;
  onHome: () => void;
}

const CONFETTI_COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac'];

/** Feestscherm over het spel heen: confetti, ster, speeltijd en knoppen voor nog eens / naar huis. */
export function showCelebration(parent: HTMLElement, opts: CelebrationOptions): HTMLElement {
  const overlay = el('div', 'celebration');

  for (let i = 0; i < 60; i++) {
    const piece = el('span', 'confetti');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.animationDelay = `${Math.random() * 2}s`;
    piece.style.animationDuration = `${2.5 + Math.random() * 2}s`;
    overlay.append(piece);
  }

  const card = el('div', 'celebration-card');
  card.append(
    el('div', 'celebration-star', '⭐'),
    el('div', 'celebration-time', `⏱️ ${formatTime(opts.timeMs)}`),
  );
  if (opts.isRecord) card.append(el('div', 'celebration-record', '🏆'));
  const buttons = el('div', 'celebration-buttons');
  buttons.append(
    iconButton('🔄', 'Nog een keer', 'round-button', opts.onAgain),
    iconButton('🏠', 'Terug', 'round-button', opts.onHome),
  );
  card.append(buttons);
  overlay.append(card);
  parent.append(overlay);

  if (opts.soundOn) playFanfare();
  return overlay;
}

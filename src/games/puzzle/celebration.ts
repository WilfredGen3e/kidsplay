import { spawnConfetti } from '../../ui/confetti';
import { el, iconButton } from '../../ui/dom';
import { savingsBar } from '../../ui/savings';
import type { SavingsInfo } from '../../platform/types';
import { formatTime } from './progress';
import { playFanfare } from '../../ui/sound';

export interface CelebrationOptions {
  timeMs: number;
  /** Sneller dan de vorige beste tijd. */
  isRecord: boolean;
  soundOn: boolean;
  onAgain: () => void;
  /** Naar de puzzelkeuze. */
  onPick?: () => void;
  onHome: () => void;
  /** Spaarstand voor de stickerbeloning, met een knop naar de cadeautjes als er een klaarstaat. */
  savings?: SavingsInfo;
  onGifts?: () => void;
}

/** Feestscherm over het spel heen: confetti, ster, speeltijd en knoppen voor nog eens / naar huis. */
export function showCelebration(parent: HTMLElement, opts: CelebrationOptions): HTMLElement {
  const overlay = el('div', 'celebration');

  spawnConfetti(overlay);

  const card = el('div', 'celebration-card');
  card.append(
    el('div', 'celebration-star', '⭐'),
    el('div', 'celebration-time', `⏱️ ${formatTime(opts.timeMs)}`),
  );
  if (opts.isRecord) card.append(el('div', 'celebration-record', '🏆'));
  if (opts.savings) card.append(savingsBar(opts.savings, opts.onGifts));
  const buttons = el('div', 'celebration-buttons');
  buttons.append(
    iconButton('🔄', 'Nog een keer', 'round-button', opts.onAgain),
  );
  if (opts.onPick) buttons.append(iconButton('🧩', 'Andere puzzel', 'round-button', opts.onPick));
  buttons.append(iconButton('🏠', 'Terug', 'round-button', opts.onHome));
  card.append(buttons);
  overlay.append(card);
  parent.append(overlay);

  if (opts.soundOn) playFanfare();
  return overlay;
}

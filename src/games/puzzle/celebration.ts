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
  /** Naar de puzzelkeuze; klein naast de huisknop. Ontbreekt zodra het dagmaximum bereikt is. */
  onPick?: () => void;
  /** De hoofdknop: klaar, terug naar het spellenoverzicht. */
  onHome: () => void;
  /** Alleen voor een klaarstaand cadeautje (🎁) of het volle dagmaximum (🌙); de spaarpot zelf blijft weg. */
  savings?: SavingsInfo;
  onGifts?: () => void;
}

/** Feestscherm over het spel heen: confetti, ster, speeltijd en een grote huisknop en een kleine knop voor een andere puzzel. */
export function showCelebration(parent: HTMLElement, opts: CelebrationOptions): HTMLElement {
  const overlay = el('div', 'celebration');

  spawnConfetti(overlay);

  const card = el('div', 'celebration-card');
  card.append(
    el('div', 'celebration-star', '⭐'),
    el('div', 'celebration-time', `⏱️ ${formatTime(opts.timeMs)}`),
  );
  if (opts.isRecord) card.append(el('div', 'celebration-record', '🏆'));
  // Geen spaarpot en geen aftelling: de volgende puzzel wordt niet aangeprezen.
  const { savings } = opts;
  if (savings && (savings.gifts > 0 || savings.dayFull)) card.append(savingsBar(savings, opts.onGifts, false));
  const buttons = el('div', 'celebration-buttons');
  buttons.append(iconButton('🏠', 'Klaar', 'round-button celebration-home', opts.onHome));
  if (opts.onPick && !savings?.dayFull) buttons.append(iconButton('🧩', 'Andere puzzel', 'round-button celebration-pick', opts.onPick));
  card.append(buttons);
  overlay.append(card);
  parent.append(overlay);

  if (opts.soundOn) playFanfare();
  return overlay;
}

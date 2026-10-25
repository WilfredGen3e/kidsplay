import type { SavingsInfo } from '../platform/types';
import { el } from './dom';

/**
 * Spaarpot die zich vult, bewust zonder getallen (geen aftelling); is het dagmaximum bereikt, dan staat er een 🌙;
 * bij een klaar cadeautje een 🎁-knop. Met `showJar = false` ontbreekt de pot (feestscherm).
 */
export function savingsBar(info: SavingsInfo, onGifts?: () => void, showJar = true): HTMLElement {
  const bar = el('div', 'savings');
  const jar = el('div', 'jar');
  jar.setAttribute('role', 'img');
  jar.setAttribute('aria-label', 'Spaarpot');
  const fill = el('div', 'jar-fill');
  fill.style.height = '0%';
  jar.append(el('div', 'jar-lid'), fill);
  // Eerst leeg tekenen en dan laten vollopen, zodat het vullen zichtbaar is.
  requestAnimationFrame(() => requestAnimationFrame(() => (fill.style.height = `${Math.round((info.have / info.need) * 100)}%`)));

  const left = el('div', 'savings-jar');
  if (showJar) left.append(jar);
  if (info.dayFull) {
    const moon = el('span', 'savings-moon', '🌙');
    moon.setAttribute('role', 'img');
    moon.setAttribute('aria-label', 'Genoeg voor vandaag');
    left.append(moon);
  }
  if (left.childElementCount > 0) bar.append(left);

  if (info.gifts > 0 && onGifts) {
    const gift = el('button', 'gift-button');
    gift.type = 'button';
    gift.setAttribute('aria-label', 'Cadeautje openmaken');
    gift.append(el('span', 'gift-button-icon', '🎁'));
    if (info.gifts > 1) gift.append(el('span', 'gift-button-count', `×${info.gifts}`));
    gift.addEventListener('click', onGifts);
    bar.append(gift);
  }
  return bar;
}

import type { SavingsInfo } from '../platform/types';
import { el } from './dom';

/** Spaarpot die zich vult, met daaronder hoeveel stukjes er nog nodig zijn; bij een klaar cadeautje een 🎁-knop. */
export function savingsBar(info: SavingsInfo, onGifts?: () => void): HTMLElement {
  const bar = el('div', 'savings');
  const jar = el('div', 'jar');
  jar.setAttribute('role', 'img');
  jar.setAttribute('aria-label', `Nog ${info.remaining} stukjes tot een cadeautje`);
  const fill = el('div', 'jar-fill');
  fill.style.height = '0%';
  jar.append(el('div', 'jar-lid'), fill, el('div', 'jar-count', `${info.have}/${info.need}`));
  // Eerst leeg tekenen en dan laten vollopen, zodat het vullen zichtbaar is.
  requestAnimationFrame(() => requestAnimationFrame(() => (fill.style.height = `${Math.round((info.have / info.need) * 100)}%`)));

  const label = el('div', 'savings-label');
  label.append(el('span', '', 'Nog'), el('strong', '', String(info.remaining)), el('span', '', '🧩'));
  const left = el('div', 'savings-jar');
  left.append(jar, label);
  bar.append(left);

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

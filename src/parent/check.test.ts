// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { newSum, showParentCheck } from './check';

it('maakt sommen uit de tafels van 6 t/m 9', () => {
  for (let i = 0; i < 50; i++) {
    const { a, b, answer } = newSum();
    expect(a).toBeGreaterThanOrEqual(6);
    expect(a).toBeLessThanOrEqual(9);
    expect(b).toBeGreaterThanOrEqual(6);
    expect(b).toBeLessThanOrEqual(9);
    expect(answer).toBe(a * b);
  }
});

function press(root: HTMLElement, keys: string) {
  for (const k of keys) {
    [...root.querySelectorAll<HTMLButtonElement>('.key')].find((b) => b.textContent === k)!.click();
  }
}
const answerOf = (root: HTMLElement) => {
  const [a, b] = root.querySelector('.check-question')!.textContent!.split('=')[0].split('×').map((x) => Number(x));
  return String(a * b);
};

it('laat een ouder door bij het goede antwoord', () => {
  const root = document.createElement('div');
  const pass = vi.fn();
  showParentCheck(root, pass, () => {});
  press(root, answerOf(root));
  press(root, '✓');
  expect(pass).toHaveBeenCalledOnce();
});

it('laat een fout antwoord niet door en geeft een nieuwe som', () => {
  const root = document.createElement('div');
  const pass = vi.fn();
  showParentCheck(root, pass, () => {});
  press(root, '1');
  press(root, '✓');
  expect(pass).not.toHaveBeenCalled();
  expect(root.querySelector('.check-display')!.textContent!.trim()).toBe('');
});

it('annuleert met ✗', () => {
  const root = document.createElement('div');
  const cancel = vi.fn();
  showParentCheck(root, () => {}, cancel);
  root.querySelector<HTMLButtonElement>('.check-cancel')!.click();
  expect(cancel).toHaveBeenCalledOnce();
});

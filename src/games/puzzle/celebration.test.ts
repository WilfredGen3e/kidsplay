// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { showCelebration } from './celebration';

it('toont de speeltijd en roept de knoppen aan', () => {
  const parent = document.createElement('div');
  const onAgain = vi.fn();
  const onHome = vi.fn();
  showCelebration(parent, { timeMs: 252_000, isRecord: true, soundOn: false, onAgain, onHome });

  expect(parent.querySelector('.celebration-time')!.textContent).toContain('4 min 12 s');
  expect(parent.querySelector('.celebration-record')).not.toBeNull();
  const [again, home] = parent.querySelectorAll<HTMLButtonElement>('.celebration-buttons button');
  again.click();
  home.click();
  expect(onAgain).toHaveBeenCalledOnce();
  expect(onHome).toHaveBeenCalledOnce();
});

it('toont geen beker zonder record', () => {
  const parent = document.createElement('div');
  showCelebration(parent, { timeMs: 1000, isRecord: false, soundOn: false, onAgain() {}, onHome() {} });
  expect(parent.querySelector('.celebration-record')).toBeNull();
});

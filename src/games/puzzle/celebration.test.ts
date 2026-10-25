// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import type { SavingsInfo } from '../../platform/types';
import { showCelebration } from './celebration';

const savings = (over: Partial<SavingsInfo> = {}): SavingsInfo => ({ have: 5, need: 50, remaining: 45, gifts: 0, dayFull: false, ...over });
const base = { timeMs: 1000, isRecord: false, soundOn: false, onHome() {} };

it('toont de speeltijd en roept de knoppen aan, met 🏠 Klaar als hoofdknop', () => {
  const parent = document.createElement('div');
  const onPick = vi.fn();
  const onHome = vi.fn();
  showCelebration(parent, { ...base, timeMs: 252_000, isRecord: true, onPick, onHome });

  expect(parent.querySelector('.celebration-time')!.textContent).toContain('4 min 12 s');
  expect(parent.querySelector('.celebration-record')).not.toBeNull();
  const buttons = parent.querySelectorAll<HTMLButtonElement>('.celebration-buttons button');
  expect(buttons).toHaveLength(2);
  expect(buttons[0].classList.contains('celebration-home')).toBe(true);
  expect(parent.textContent).not.toContain('Nog een keer');
  buttons[1].click();
  buttons[0].click();
  expect(onPick).toHaveBeenCalledOnce();
  expect(onHome).toHaveBeenCalledOnce();
});

it('toont geen beker zonder record', () => {
  const parent = document.createElement('div');
  showCelebration(parent, base);
  expect(parent.querySelector('.celebration-record')).toBeNull();
});

it('toont geen spaarpot, alleen een klaarstaand cadeautje', () => {
  const parent = document.createElement('div');
  showCelebration(parent, { ...base, savings: savings() });
  expect(parent.querySelector('.savings')).toBeNull();

  const withGift = document.createElement('div');
  showCelebration(withGift, { ...base, savings: savings({ gifts: 1 }), onGifts() {} });
  expect(withGift.querySelector('.gift-button')).not.toBeNull();
  expect(withGift.querySelector('.jar')).toBeNull();
});

it('toont bij een vol dagmaximum 🌙 en geen knop voor een andere puzzel', () => {
  const parent = document.createElement('div');
  showCelebration(parent, { ...base, onPick() {}, savings: savings({ dayFull: true }) });
  expect(parent.querySelector('.savings-moon')).not.toBeNull();
  expect(parent.querySelector('.celebration-pick')).toBeNull();
  expect(parent.querySelectorAll('.celebration-buttons button')).toHaveLength(1);
});

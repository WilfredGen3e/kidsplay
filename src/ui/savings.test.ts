// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { savingsBar } from './savings';

const info = { have: 12, need: 50, remaining: 38, gifts: 0, dayFull: false };

describe('savingsBar', () => {
  it('toont geen getallen of aftelling', () => {
    const bar = savingsBar(info);
    expect(bar.textContent).toBe('');
    expect(bar.querySelector('.jar')).not.toBeNull();
  });

  it('toont een maan als het dagmaximum bereikt is', () => {
    expect(savingsBar(info).querySelector('.savings-moon')).toBeNull();
    expect(savingsBar({ ...info, dayFull: true }).querySelector('.savings-moon')?.textContent).toBe('🌙');
  });

  it('toont het cadeautje met aantal', () => {
    const bar = savingsBar({ ...info, gifts: 2 }, () => {});
    expect(bar.querySelector('.gift-button')?.textContent).toContain('×2');
  });
});

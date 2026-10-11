import { describe, expect, it } from 'vitest';
import { allowedCounts, isAllowed, recordCompleted, sessionOf } from './session';

describe('sessieregel', () => {
  it('laat in een verse sessie alles toe', () => {
    const session = sessionOf({});
    expect(allowedCounts(session, [4, 8, 12])).toEqual([4, 8, 12]);
  });

  it('staat na 4 stukjes alleen nog meer stukjes toe', () => {
    const bag: Record<string, unknown> = {};
    recordCompleted(bag, 4);
    const session = sessionOf(bag);
    expect(isAllowed(session, 4)).toBe(false);
    expect(allowedCounts(session, [4, 8, 12])).toEqual([8, 12]);
  });

  it('kan dezelfde puzzel niet met hetzelfde aantal opnieuw', () => {
    const bag: Record<string, unknown> = {};
    recordCompleted(bag, 12);
    expect(isAllowed(sessionOf(bag), 12)).toBe(false);
  });

  it('wordt steeds strenger, nooit milder', () => {
    const bag: Record<string, unknown> = {};
    recordCompleted(bag, 12);
    recordCompleted(bag, 4);
    expect(sessionOf(bag).highest).toBe(12);
  });

  it('laat niets meer over na het grootste aantal', () => {
    const bag: Record<string, unknown> = {};
    recordCompleted(bag, 48);
    expect(allowedCounts(sessionOf(bag), [4, 24, 48])).toEqual([]);
  });

  it('is tegen een kapotte stand bestand', () => {
    expect(sessionOf({ puzzle: { highest: 'x' } }).highest).toBe(0);
    expect(sessionOf({ puzzle: null }).highest).toBe(0);
  });
});

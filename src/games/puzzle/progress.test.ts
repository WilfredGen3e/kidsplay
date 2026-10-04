import { describe, expect, it } from 'vitest';
import { addResult, bestTime, formatTime, starCount } from './progress';

const result = (timeMs: number, pieces = 12, puzzleId = 'strand') => ({
  puzzleId,
  pieces,
  timeMs,
  completedAt: '2026-10-04T10:00:00.000Z',
});

describe('voortgang', () => {
  it('begint leeg en telt een ster per voltooide puzzel', () => {
    expect(starCount(undefined)).toBe(0);
    const p = addResult(addResult(undefined, result(1000)), result(2000));
    expect(starCount(p)).toBe(2);
  });

  it('wijzigt de oude voortgang niet', () => {
    const before = addResult(undefined, result(1000));
    addResult(before, result(2000));
    expect(before.results).toHaveLength(1);
  });

  it('geeft de snelste tijd per puzzel en aantal stukjes', () => {
    const p = addResult(addResult(addResult(undefined, result(9000)), result(5000)), result(1000, 24));
    expect(bestTime(p, 'strand', 12)).toBe(5000);
    expect(bestTime(p, 'strand', 24)).toBe(1000);
    expect(bestTime(p, 'strand', 8)).toBeUndefined();
    expect(bestTime(p, 'bos', 12)).toBeUndefined();
    expect(bestTime(undefined, 'strand', 12)).toBeUndefined();
  });
});

describe('formatTime', () => {
  it('toont minuten en seconden', () => {
    expect(formatTime(252_000)).toBe('4 min 12 s');
    expect(formatTime(45_400)).toBe('45 s');
    expect(formatTime(60_000)).toBe('1 min 0 s');
  });
});

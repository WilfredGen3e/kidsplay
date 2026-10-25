import { describe, expect, it } from 'vitest';
import { LEVELS, levelsDone, nextLevel, recordLevelDone, sentenceFor, timesDone } from './levels';

describe('voortgang', () => {
  it('begint leeg en onthoudt uitgespeelde levels', () => {
    expect(levelsDone(undefined)).toBe(0);
    const p = recordLevelDone(recordLevelDone(undefined, 0), 0);
    expect(timesDone(p, 0)).toBe(2);
    expect(levelsDone(p)).toBe(1);
  });
  it('past de oude voortgang niet aan', () => {
    const p = recordLevelDone(undefined, 1);
    recordLevelDone(p, 1);
    expect(timesDone(p, 1)).toBe(1);
  });
  it('nextLevel is het eerste dat nog niet is gehaald', () => {
    expect(nextLevel(undefined)).toBe(0);
    let p = recordLevelDone(undefined, 0);
    p = recordLevelDone(p, 2);
    expect(nextLevel(p)).toBe(1);
    for (let i = 0; i < LEVELS.length; i++) p = recordLevelDone(p, i);
    expect(nextLevel(p)).toBeUndefined();
  });
});

describe('zinnetjes', () => {
  it('elk level heeft één kort zinnetje', () => {
    for (const level of LEVELS) {
      for (const text of [level.sentence, level.captureSentence].filter(Boolean) as string[]) {
        expect(text.split(' ').length).toBeLessThanOrEqual(6);
        expect(text.split('.').filter(Boolean)).toHaveLength(1);
      }
    }
  });
  it('de pion krijgt een ander zinnetje bij slaan', () => {
    const pawn = LEVELS.find((l) => l.kind === 'P')!;
    const free = { kind: 'P' as const, start: { col: 0, row: 1 }, goal: { col: 0, row: 2 }, enemies: [] };
    const hit = { ...free, enemies: [free.goal] };
    expect(sentenceFor(pawn, free)).toBe(pawn.sentence);
    expect(sentenceFor(pawn, hit)).toBe(pawn.captureSentence);
  });
});

import { describe, expect, it } from 'vitest';
import { LEVELS, currentLevel, finishLevel, isEasy, levelsDone, sentenceFor, timesDone } from './levels';

describe('voortgang', () => {
  it('begint leeg bij level 1', () => {
    expect(levelsDone(undefined)).toBe(0);
    expect(currentLevel(undefined)).toBe(0);
  });
  it('onthoudt hoe vaak een level is uitgespeeld', () => {
    const p = finishLevel(finishLevel(undefined, 0, 3, 5).progress, 0, 3, 5).progress;
    expect(timesDone(p, 0)).toBe(2);
    expect(levelsDone(p)).toBe(1);
  });
  it('past de oude voortgang niet aan', () => {
    const p = finishLevel(undefined, 1, 5, 5).progress;
    finishLevel(p, 1, 5, 5);
    expect(timesDone(p, 1)).toBe(1);
  });
  it('oude voortgang zonder current: het eerste level dat nog niet gehaald is', () => {
    expect(currentLevel({ done: { '0': 1, '2': 1 } })).toBe(1);
    expect(currentLevel({ done: Object.fromEntries(LEVELS.map((_, i) => [String(i), 1])) })).toBeUndefined();
  });
});

describe('automatisch niveau', () => {
  it('bijna alles in één keer goed: door naar het volgende level', () => {
    for (const clean of [4, 5]) {
      const r = finishLevel(undefined, 0, clean, 5);
      expect(r.outcome).toBe('up');
      expect(currentLevel(r.progress)).toBe(1);
    }
  });
  it('de helft goed: hetzelfde level nog een keer, geen makkelijkere opdrachtjes', () => {
    for (const clean of [2, 3]) {
      const r = finishLevel(undefined, 0, clean, 5);
      expect(r.outcome).toBe('same');
      expect(currentLevel(r.progress)).toBe(0);
      expect(isEasy(r.progress, 0)).toBe(false);
    }
  });
  it('bijna alles met omwegen: hetzelfde level met makkelijkere opdrachtjes, en nooit terug', () => {
    const r = finishLevel(undefined, 0, 0, 5);
    expect(r.outcome).toBe('easier');
    expect(currentLevel(r.progress)).toBe(0);
    expect(isEasy(r.progress, 0)).toBe(true);
    const again = finishLevel(r.progress, 0, 5, 5);
    expect(isEasy(again.progress, 0)).toBe(false);
    expect(currentLevel(again.progress)).toBe(1);
  });
  it('een eerder level overdoen haalt het kind niet terug', () => {
    let p = finishLevel(undefined, 0, 5, 5).progress;
    p = finishLevel(p, 1, 5, 5).progress;
    expect(currentLevel(p)).toBe(2);
    p = finishLevel(p, 0, 0, 5).progress;
    expect(currentLevel(p)).toBe(2);
    p = finishLevel(p, 0, 5, 5).progress;
    expect(currentLevel(p)).toBe(2);
  });
  it('na het laatste level zijn alle levels gehaald', () => {
    let p = undefined as ReturnType<typeof finishLevel>['progress'] | undefined;
    for (let i = 0; i < LEVELS.length; i++) p = finishLevel(p, i, 5, 5).progress;
    expect(currentLevel(p)).toBeUndefined();
    expect(levelsDone(p)).toBe(LEVELS.length);
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

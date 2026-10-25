import { describe, expect, it } from 'vitest';
import { LEVELS } from './levels';
import { EXERCISES_PER_LEVEL, bestMoves, captureExercises, makeExercises, stepsLeft, type Exercise } from './exercises';
import { sameSquare } from './rules';

/** Vaste reeks "willekeurige" getallen, zodat de test elke keer hetzelfde doet. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('stepsLeft', () => {
  const ex = (kind: Exercise['kind'], start: [number, number], goal: [number, number]): Exercise => ({
    kind,
    start: { col: start[0], row: start[1] },
    goal: { col: goal[0], row: goal[1] },
    enemies: [],
  });
  it('toren: één zet op dezelfde lijn, twee zetten erbuiten', () => {
    expect(stepsLeft(ex('R', [0, 0], [0, 7]), { col: 0, row: 0 })).toBe(1);
    expect(stepsLeft(ex('R', [0, 0], [5, 3]), { col: 0, row: 0 })).toBe(2);
  });
  it('loper: een vakje van de andere kleur kan nooit', () => {
    expect(stepsLeft(ex('B', [0, 0], [1, 0]), { col: 0, row: 0 })).toBe(Infinity);
  });
  it('paard: twee zetten naar het buurvakje', () => {
    expect(stepsLeft(ex('N', [0, 0], [1, 0]), { col: 0, row: 0 })).toBe(3);
  });
  it('0 zetten als je er al staat', () => {
    expect(stepsLeft(ex('K', [2, 2], [2, 2]), { col: 2, row: 2 })).toBe(0);
  });
});

describe('bestMoves', () => {
  it('geeft alleen zetten die dichterbij komen', () => {
    const ex: Exercise = { kind: 'R', start: { col: 0, row: 0 }, goal: { col: 5, row: 3 }, enemies: [] };
    const best = bestMoves(ex, ex.start);
    expect(best.length).toBeGreaterThan(0);
    for (const sq of best) expect(stepsLeft(ex, sq)).toBe(1);
  });
});

describe('makeExercises', () => {
  it('maakt per level vijf haalbare opdrachtjes, van makkelijk naar lastiger', () => {
    for (const [i, level] of LEVELS.entries()) {
      for (let seed = 1; seed <= 20; seed++) {
        const list = makeExercises(level.kind, seeded(seed * 7 + i));
        expect(list).toHaveLength(EXERCISES_PER_LEVEL);
        const steps = list.map((ex) => stepsLeft(ex, ex.start));
        for (const n of steps) expect(Number.isFinite(n) && n >= 1).toBe(true);
        expect(steps[steps.length - 1]).toBeGreaterThanOrEqual(steps[0]);
        for (const ex of list) expect(sameSquare(ex.start, ex.goal)).toBe(false);
      }
    }
  });
  it('de pion slaat in de laatste twee opdrachtjes', () => {
    const list = makeExercises('P', seeded(3));
    expect(list.slice(0, 3).every((ex) => ex.enemies.length === 0)).toBe(true);
    for (const ex of list.slice(3)) {
      expect(ex.enemies.some((sq) => sameSquare(sq, ex.goal))).toBe(true);
      expect(stepsLeft(ex, ex.start)).toBe(1);
    }
  });
  it('de pion blijft binnen het bord, ook aan de rand', () => {
    for (let seed = 1; seed <= 50; seed++) {
      for (const ex of makeExercises('P', seeded(seed))) {
        for (const sq of [ex.start, ex.goal, ...ex.enemies]) {
          expect(sq.col).toBeGreaterThanOrEqual(0);
          expect(sq.col).toBeLessThan(8);
        }
      }
    }
  });

  it('de makkelijke reeks is niet lastiger dan de gewone', () => {
    for (const level of LEVELS) {
      for (let seed = 1; seed <= 20; seed++) {
        const total = (easy: boolean) =>
          makeExercises(level.kind, seeded(seed), easy)
            .map((ex) => stepsLeft(ex, ex.start))
            .reduce((a, b) => a + b, 0);
        expect(makeExercises(level.kind, seeded(seed), true)).toHaveLength(EXERCISES_PER_LEVEL);
        expect(total(true)).toBeLessThanOrEqual(total(false));
      }
    }
  });
});

describe('captureExercises', () => {
  it('vijf opdrachtjes, elk met een ander stuk, de ster staat op een tegenstander', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const list = captureExercises(seeded(seed));
      expect(list).toHaveLength(5);
      expect(new Set(list.map((ex) => ex.kind)).size).toBe(5);
      for (const ex of list) {
        expect(ex.enemies.some((sq) => sameSquare(sq, ex.goal))).toBe(true);
        expect(Number.isFinite(stepsLeft(ex, ex.start))).toBe(true);
      }
    }
  });
  it('makkelijk = alles in één zet', () => {
    for (const ex of captureExercises(seeded(9), true)) expect(stepsLeft(ex, ex.start)).toBe(1);
  });
});


import { describe, expect, it } from 'vitest';
import {
  addResult,
  bestTime,
  findSnapshot,
  formatTime,
  saveSnapshot,
  starCount,
  type PuzzleSnapshot,
} from './progress';

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

const snapshot = (over: Partial<PuzzleSnapshot> = {}): PuzzleSnapshot => ({
  puzzleId: 'strand',
  pieces: 4,
  elapsedMs: 5000,
  state: [
    { id: 0, where: 'stage', x: 0, y: 0, locked: true, group: 0 },
    { id: 1, where: 'stage', x: 340, y: 120, locked: false, group: 1 },
    { id: 2, where: 'tray', x: 0, y: 0, locked: false, group: 2 },
    { id: 3, where: 'tray', x: 0, y: 0, locked: false, group: 3 },
  ],
  trayOrder: [3, 2],
  ...over,
});

describe('tussenstand', () => {
  it('bewaart en vindt de tussenstand per puzzel en aantal stukjes', () => {
    const p = saveSnapshot(undefined, snapshot());
    expect(findSnapshot(p, 'strand', 4)).toEqual(snapshot());
    expect(findSnapshot(p, 'strand', 8)).toBeUndefined();
    expect(findSnapshot(p, 'bos', 4)).toBeUndefined();
    expect(findSnapshot(undefined, 'strand', 4)).toBeUndefined();
  });

  it('vervangt een eerdere tussenstand en behoudt de resultaten', () => {
    const base = addResult(undefined, result(1000, 4));
    const p = saveSnapshot(saveSnapshot(base, snapshot({ elapsedMs: 1 })), snapshot({ elapsedMs: 2 }));
    expect(p.inProgress).toHaveLength(1);
    expect(findSnapshot(p, 'strand', 4)?.elapsedMs).toBe(2);
    expect(p.results).toHaveLength(1);
  });

  it('wist de tussenstand bij voltooien', () => {
    const p = addResult(saveSnapshot(undefined, snapshot()), result(9000, 4));
    expect(findSnapshot(p, 'strand', 4)).toBeUndefined();
    expect(starCount(p)).toBe(1);
  });

  it('negeert een tussenstand die niet meer klopt', () => {
    const bad = [
      snapshot({ state: snapshot().state.slice(1) }),
      snapshot({ trayOrder: [3] }),
      snapshot({ elapsedMs: NaN }),
      snapshot({ state: snapshot().state.map((s) => ({ ...s, id: 0 })) }),
    ];
    for (const b of bad) expect(findSnapshot(saveSnapshot(undefined, b), 'strand', 4)).toBeUndefined();
  });
});

describe('piecesPlaced', () => {
  it('telt voltooide puzzels en vastgeklikte stukjes van halve puzzels', async () => {
    const { piecesPlaced } = await import('./progress');
    const piece = (id: number, locked: boolean) => ({ id, where: 'stage' as const, x: 0, y: 0, locked, group: id });
    expect(piecesPlaced(undefined)).toBe(0);
    expect(
      piecesPlaced({
        results: [
          { puzzleId: 'a', pieces: 12, timeMs: 1, completedAt: '' },
          { puzzleId: 'b', pieces: 4, timeMs: 1, completedAt: '' },
        ],
        inProgress: [{ puzzleId: 'c', pieces: 4, elapsedMs: 0, trayOrder: [], state: [piece(0, true), piece(1, true), piece(2, false), piece(3, false)] }],
      }),
    ).toBe(18);
  });
});

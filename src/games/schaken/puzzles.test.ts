import { describe, expect, it } from 'vitest';
import {
  MATE_POSITIONS,
  gameExercises,
  goodMoves,
  isSafeMove,
  mateExercises,
  mirror,
  opponentMove,
  parse,
  safeExercises,
} from './puzzles';
import { findKing, inCheck, legalMoves, movesFor, pieceAt, squaresOf, startBoard } from './rules';

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('veilig staan', () => {
  it('elke opdracht heeft veilige én gevaarlijke zetten, en één wit stuk', () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const puzzle of safeExercises(seeded(seed))) {
        const [from] = squaresOf(puzzle.board, 'w');
        expect(squaresOf(puzzle.board, 'w')).toHaveLength(1);
        const moves = movesFor(puzzle.board, from);
        const safe = moves.filter((to) => isSafeMove(puzzle.board, from, to));
        expect(safe.length).toBeGreaterThanOrEqual(2);
        expect(moves.length - safe.length).toBeGreaterThanOrEqual(2);
        expect(goodMoves(puzzle, from)).toHaveLength(safe.length);
      }
    }
  });
  it('maakt vijf opdrachtjes met oplopend aantal pionnen', () => {
    const list = safeExercises(seeded(5));
    expect(list).toHaveLength(5);
    const pawns = list.map((p) => squaresOf(p.board, 'b').length);
    expect(pawns[4]).toBeGreaterThanOrEqual(pawns[0]);
  });
});

describe('mat in één', () => {
  it('elke stelling heeft minstens één zet die mat zet, en staat niet al schaak', () => {
    for (const text of MATE_POSITIONS) {
      for (const board of [parse(text), mirror(parse(text))]) {
        expect(inCheck(board, 'b')).toBe(false);
        expect(inCheck(board, 'w')).toBe(false);
        const puzzle = { mode: 'mate' as const, board };
        const solutions = squaresOf(board, 'w').flatMap((from) => goodMoves(puzzle, from));
        expect(solutions.length, text).toBeGreaterThanOrEqual(1);
      }
    }
  });
  it('spiegelen verandert de oplossing niet', () => {
    const [puzzle] = mateExercises(() => 0.9);
    const flipped = { ...puzzle, board: mirror(puzzle.board) };
    const count = (p: typeof puzzle) => squaresOf(p.board, 'w').flatMap((f) => goodMoves(p, f)).length;
    expect(count(flipped)).toBe(count(puzzle));
    expect(findKing(flipped.board, 'b')).toBeDefined();
  });
  it('maakt vijf verschillende stellingen', () => {
    const list = mateExercises(seeded(2));
    expect(list).toHaveLength(5);
  });
});

describe('kleine partij', () => {
  it('drie witte en drie zwarte pionnen', () => {
    for (const puzzle of gameExercises(seeded(4))) {
      expect(squaresOf(puzzle.board, 'w')).toHaveLength(3);
      expect(squaresOf(puzzle.board, 'b')).toHaveLength(3);
    }
  });
  it('de tegenstander doet altijd een geldige zet, en slaat niet als hij vriendelijk is', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const [puzzle] = gameExercises(seeded(seed));
      const move = opponentMove(puzzle.board, seeded(seed))!;
      expect(legalMoves(puzzle.board, move.from)).toContainEqual(move.to);
      expect(pieceAt(puzzle.board, move.from)?.color).toBe('b');
    }
    // zwarte pion kan slaan: staand tegenover een witte pion schuin voor hem
    const board = gameExercises(() => 0)[0].board;
    expect(opponentMove(board, () => 0.99, true)).toBeDefined();
  });
  it('geen zet als de tegenstander vastzit', () => {
    expect(opponentMove(startBoard(), () => 0, false)).toBeDefined();
    expect(opponentMove(startBoard().map((p) => (p?.color === 'w' ? p : undefined)), () => 0)).toBeUndefined();
  });
});

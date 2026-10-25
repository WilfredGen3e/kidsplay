import { describe, expect, it } from 'vitest';
import {
  emptyBoard,
  inCheck,
  isCheckmate,
  legalMoves,
  movePiece,
  movesFor,
  pieceAt,
  startBoard,
  withPiece,
  type Board,
  type Kind,
  type Color,
} from './rules';

const put = (board: Board, col: number, row: number, kind: Kind, color: Color = 'w') =>
  withPiece(board, { col, row }, { kind, color });
const count = (kind: Kind, col: number, row: number, setup: (b: Board) => Board = (b) => b) =>
  movesFor(setup(put(emptyBoard(), col, row, kind)), { col, row }).length;

describe('movesFor op een leeg bord', () => {
  it('toren: 14 vanaf elk vakje', () => {
    expect(count('R', 3, 3)).toBe(14);
    expect(count('R', 0, 0)).toBe(14);
  });
  it('loper: 13 in het midden, 7 in de hoek', () => {
    expect(count('B', 3, 3)).toBe(13);
    expect(count('B', 0, 0)).toBe(7);
  });
  it('dame: 27 in het midden', () => {
    expect(count('Q', 3, 3)).toBe(27);
  });
  it('paard: 8 in het midden, 2 in de hoek', () => {
    expect(count('N', 3, 3)).toBe(8);
    expect(count('N', 0, 0)).toBe(2);
  });
  it('koning: 8 in het midden, 3 in de hoek', () => {
    expect(count('K', 3, 3)).toBe(8);
    expect(count('K', 0, 0)).toBe(3);
  });
});

describe('blokkeren en slaan', () => {
  it('een eigen stuk blokkeert en mag niet geslagen worden', () => {
    const board = put(put(emptyBoard(), 0, 0, 'R'), 0, 3, 'P');
    const moves = movesFor(board, { col: 0, row: 0 });
    expect(moves).toContainEqual({ col: 0, row: 2 });
    expect(moves).not.toContainEqual({ col: 0, row: 3 });
    expect(moves).not.toContainEqual({ col: 0, row: 4 });
  });
  it('een tegenstander mag geslagen worden, maar je kunt er niet doorheen', () => {
    const board = put(put(emptyBoard(), 0, 0, 'R'), 0, 3, 'P', 'b');
    const moves = movesFor(board, { col: 0, row: 0 });
    expect(moves).toContainEqual({ col: 0, row: 3 });
    expect(moves).not.toContainEqual({ col: 0, row: 4 });
  });
  it('een paard springt over stukken heen', () => {
    expect(movesFor(startBoard(), { col: 1, row: 0 })).toHaveLength(2);
  });
});

describe('pion', () => {
  it('vanaf de beginplek 1 of 2 vakjes vooruit', () => {
    expect(movesFor(startBoard(), { col: 4, row: 1 })).toEqual([
      { col: 4, row: 2 },
      { col: 4, row: 3 },
    ]);
  });
  it('zwart loopt naar beneden', () => {
    expect(movesFor(startBoard(), { col: 4, row: 6 })).toEqual([
      { col: 4, row: 5 },
      { col: 4, row: 4 },
    ]);
  });
  it('buiten de beginplek maar 1 vakje', () => {
    expect(count('P', 4, 2)).toBe(1);
  });
  it('wordt geblokkeerd door een stuk recht voor zich', () => {
    const board = put(put(emptyBoard(), 4, 1, 'P'), 4, 2, 'P', 'b');
    expect(movesFor(board, { col: 4, row: 1 })).toEqual([]);
  });
  it('slaat alleen schuin, en alleen een tegenstander', () => {
    let board = put(emptyBoard(), 4, 3, 'P');
    board = put(board, 5, 4, 'N', 'b');
    board = put(board, 3, 4, 'N', 'w');
    expect(movesFor(board, { col: 4, row: 3 })).toEqual([
      { col: 4, row: 4 },
      { col: 5, row: 4 },
    ]);
  });
});

describe('beginopstelling', () => {
  it('heeft 32 stukken en 20 eerste zetten voor wit', () => {
    const board = startBoard();
    expect(board.filter(Boolean)).toHaveLength(32);
    let total = 0;
    board.forEach((piece, i) => {
      if (piece?.color === 'w') total += movesFor(board, { col: i % 8, row: Math.floor(i / 8) }).length;
    });
    expect(total).toBe(20);
  });
});

describe('movePiece', () => {
  it('verplaatst een stuk en meldt een geslagen stuk', () => {
    const board = put(put(emptyBoard(), 0, 0, 'R'), 0, 5, 'N', 'b');
    const result = movePiece(board, { col: 0, row: 0 }, { col: 0, row: 5 });
    expect(pieceAt(result.board, { col: 0, row: 0 })).toBeUndefined();
    expect(pieceAt(result.board, { col: 0, row: 5 })?.kind).toBe('R');
    expect(result.captured).toEqual({ kind: 'N', color: 'b' });
  });
  it('laat het oude bord ongemoeid', () => {
    const board = put(emptyBoard(), 0, 0, 'R');
    movePiece(board, { col: 0, row: 0 }, { col: 0, row: 5 });
    expect(pieceAt(board, { col: 0, row: 0 })?.kind).toBe('R');
  });
  it('een pion op de overkant wordt een dame', () => {
    const board = put(emptyBoard(), 2, 6, 'P');
    const result = movePiece(board, { col: 2, row: 6 }, { col: 2, row: 7 });
    expect(pieceAt(result.board, { col: 2, row: 7 })?.kind).toBe('Q');
  });
});

describe('schaak en mat', () => {
  const parse = (...items: [Kind, Color, number, number][]) =>
    items.reduce((b, [kind, color, col, row]) => put(b, col, row, kind, color), emptyBoard());

  it('ziet schaak door een toren', () => {
    const board = parse(['K', 'b', 7, 7], ['R', 'w', 0, 7], ['K', 'w', 0, 0]);
    expect(inCheck(board, 'b')).toBe(true);
    expect(inCheck(board, 'w')).toBe(false);
  });
  it('een pion geeft schaak schuin, niet recht vooruit', () => {
    expect(inCheck(parse(['K', 'b', 4, 4], ['P', 'w', 3, 3], ['K', 'w', 0, 0]), 'b')).toBe(true);
    expect(inCheck(parse(['K', 'b', 4, 4], ['P', 'w', 4, 3], ['K', 'w', 0, 0]), 'b')).toBe(false);
  });
  it('een koning mag niet naast de andere koning of in schaak lopen', () => {
    const board = parse(['K', 'w', 4, 4], ['K', 'b', 4, 6]);
    expect(legalMoves(board, { col: 4, row: 4 })).not.toContainEqual({ col: 4, row: 5 });
    expect(legalMoves(board, { col: 4, row: 4 })).toContainEqual({ col: 3, row: 4 });
  });
  it('een vastgezet stuk mag niet weg', () => {
    const board = parse(['K', 'w', 0, 0], ['R', 'w', 3, 0], ['R', 'b', 7, 0], ['K', 'b', 7, 7]);
    const moves = legalMoves(board, { col: 3, row: 0 });
    expect(moves.every((m) => m.row === 0)).toBe(true);
  });
  it('herkent een mat (rij achteraan)', () => {
    const board = parse(
      ['K', 'b', 7, 7],
      ['P', 'b', 6, 6],
      ['P', 'b', 7, 6],
      ['R', 'w', 0, 7],
      ['K', 'w', 6, 0],
    );
    expect(isCheckmate(board, 'b')).toBe(true);
  });
  it('schaak is nog geen mat als de koning weg kan', () => {
    const board = parse(['K', 'b', 7, 7], ['R', 'w', 0, 7], ['K', 'w', 0, 0]);
    expect(isCheckmate(board, 'b')).toBe(false);
  });
});

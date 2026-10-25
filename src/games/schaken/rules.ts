/** Zetregels van het schaakspel: puur en zonder DOM, zodat ze goed te testen zijn. */

export type Color = 'w' | 'b';
export type Kind = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';

export interface Piece {
  kind: Kind;
  color: Color;
}

/** `row` 0 is de onderkant (de kant van wit), `col` 0 is links (de a-lijn). */
export interface Square {
  col: number;
  row: number;
}

/** 64 vakjes; index = row * 8 + col. */
export type Board = readonly (Piece | undefined)[];

export const SIZE = 8;

export function emptyBoard(): Board {
  return Array.from({ length: SIZE * SIZE }, () => undefined);
}

const index = (sq: Square) => sq.row * SIZE + sq.col;

export function inside(sq: Square): boolean {
  return sq.col >= 0 && sq.col < SIZE && sq.row >= 0 && sq.row < SIZE;
}

export function pieceAt(board: Board, sq: Square): Piece | undefined {
  return inside(sq) ? board[index(sq)] : undefined;
}

export function withPiece(board: Board, sq: Square, piece: Piece | undefined): Board {
  const next = [...board];
  next[index(sq)] = piece;
  return next;
}

export function sameSquare(a: Square, b: Square): boolean {
  return a.col === b.col && a.row === b.row;
}

/** De beginopstelling van een volledig spel. */
export function startBoard(): Board {
  const order: Kind[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  let board = emptyBoard();
  order.forEach((kind, col) => {
    board = withPiece(board, { col, row: 0 }, { kind, color: 'w' });
    board = withPiece(board, { col, row: 7 }, { kind, color: 'b' });
    board = withPiece(board, { col, row: 1 }, { kind: 'P', color: 'w' });
    board = withPiece(board, { col, row: 6 }, { kind: 'P', color: 'b' });
  });
  return board;
}

const ROOK_DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const BISHOP_DIRS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const KNIGHT_JUMPS = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
];

/**
 * Alle zetten die een stuk volgens de bewegingsregels mag doen.
 * Nog zonder schaakregels (schaak, rokade, en passant): een stuk beweegt en slaat zoals het hoort,
 * en mag nooit een eigen stuk slaan.
 */
export function movesFor(board: Board, from: Square): Square[] {
  const piece = pieceAt(board, from);
  if (!piece) return [];
  const moves: Square[] = [];

  const canLand = (sq: Square) => inside(sq) && pieceAt(board, sq)?.color !== piece.color;
  const slide = (dirs: number[][]) => {
    for (const [dc, dr] of dirs) {
      let sq = { col: from.col + dc, row: from.row + dr };
      while (inside(sq)) {
        const there = pieceAt(board, sq);
        if (there) {
          if (there.color !== piece.color) moves.push(sq);
          break;
        }
        moves.push(sq);
        sq = { col: sq.col + dc, row: sq.row + dr };
      }
    }
  };
  const step = (offsets: number[][]) => {
    for (const [dc, dr] of offsets) {
      const sq = { col: from.col + dc, row: from.row + dr };
      if (canLand(sq)) moves.push(sq);
    }
  };

  switch (piece.kind) {
    case 'R':
      slide(ROOK_DIRS);
      break;
    case 'B':
      slide(BISHOP_DIRS);
      break;
    case 'Q':
      slide([...ROOK_DIRS, ...BISHOP_DIRS]);
      break;
    case 'N':
      step(KNIGHT_JUMPS);
      break;
    case 'K':
      step([...ROOK_DIRS, ...BISHOP_DIRS]);
      break;
    case 'P': {
      const dir = piece.color === 'w' ? 1 : -1;
      const startRow = piece.color === 'w' ? 1 : 6;
      const one = { col: from.col, row: from.row + dir };
      if (inside(one) && !pieceAt(board, one)) {
        moves.push(one);
        const two = { col: from.col, row: from.row + 2 * dir };
        if (from.row === startRow && !pieceAt(board, two)) moves.push(two);
      }
      for (const dc of [-1, 1]) {
        const sq = { col: from.col + dc, row: from.row + dir };
        const there = pieceAt(board, sq);
        if (there && there.color !== piece.color) moves.push(sq);
      }
      break;
    }
  }
  return moves;
}

export interface MoveResult {
  board: Board;
  captured?: Piece;
}

/** Voert een zet uit (zonder te controleren of hij mag). Een pion op de overkant wordt een dame. */
export function movePiece(board: Board, from: Square, to: Square): MoveResult {
  const piece = pieceAt(board, from);
  if (!piece) return { board };
  const captured = pieceAt(board, to);
  const lastRow = piece.color === 'w' ? SIZE - 1 : 0;
  const landed: Piece = piece.kind === 'P' && to.row === lastRow ? { kind: 'Q', color: piece.color } : piece;
  return { board: withPiece(withPiece(board, from, undefined), to, landed), captured };
}

import {
  SIZE,
  emptyBoard,
  isAttacked,
  isCheckmate,
  legalMoves,
  movePiece,
  movesFor,
  pieceAt,
  sameSquare,
  squaresOf,
  withPiece,
  type Board,
  type Kind,
  type Square,
} from './rules';

/** Opdrachten waarbij je niet naar een ster loopt: veilig staan, mat zetten, een kleine partij. */
export interface Puzzle {
  mode: 'safe' | 'mate' | 'game';
  board: Board;
  /** Alleen bij `game`: de tegenstander slaat nooit (voor een kind dat moeite heeft). */
  gentle?: boolean;
}

export const isPuzzle = (item: object): item is Puzzle => 'mode' in item;

const pick = <T>(list: readonly T[], rng: () => number): T => list[Math.floor(rng() * list.length)];

function shuffle<T>(list: readonly T[], rng: () => number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Staat het stuk na deze zet op een vakje waar een zwart stuk het kan slaan? */
export function isSafeMove(board: Board, from: Square, to: Square): boolean {
  return !isAttacked(movePiece(board, from, to).board, to, 'b');
}

/** Zet je met deze zet de zwarte koning mat? */
export function isMateMove(board: Board, from: Square, to: Square): boolean {
  return isCheckmate(movePiece(board, from, to).board, 'b');
}

/** De zetten van het stuk op `from` die de opdracht oplossen; hulp voor een kind dat vastzit. */
export function goodMoves(puzzle: Puzzle, from: Square): Square[] {
  if (puzzle.mode === 'safe') return legalMoves(puzzle.board, from).filter((to) => isSafeMove(puzzle.board, from, to));
  if (puzzle.mode === 'mate') return legalMoves(puzzle.board, from).filter((to) => isMateMove(puzzle.board, from, to));
  return [];
}

const randomSquare = (rng: () => number, rows: [number, number] = [0, SIZE - 1]): Square => ({
  col: Math.floor(rng() * SIZE),
  row: rows[0] + Math.floor(rng() * (rows[1] - rows[0] + 1)),
});

const SAFE_KINDS: Kind[] = ['R', 'B', 'Q', 'N', 'K'];

/**
 * Level 8: één wit stuk en een paar zwarte pionnen. Sommige vakjes zijn gevaarlijk (een pion slaat daar),
 * andere veilig; het kind kiest een veilig vakje. Meer pionnen = lastiger.
 */
export function safeExercises(rng: () => number = Math.random, easy = false): Puzzle[] {
  const pawns = easy ? [1, 1, 1, 1, 2] : [1, 1, 2, 2, 3];
  const result: Puzzle[] = [];
  for (const count of pawns) {
    for (let tries = 0; tries < 5000; tries++) {
      const kind = pick(SAFE_KINDS, rng);
      const start = randomSquare(rng);
      let board = withPiece(emptyBoard(), start, { kind, color: 'w' });
      const spots: Square[] = [];
      for (let i = 0; i < count; i++) {
        const sq = randomSquare(rng, [1, SIZE - 2]);
        if (sameSquare(sq, start) || spots.some((s) => sameSquare(s, sq))) continue;
        spots.push(sq);
        board = withPiece(board, sq, { kind: 'P', color: 'b' });
      }
      if (spots.length !== count) continue;
      const moves = movesFor(board, start);
      const safe = moves.filter((to) => isSafeMove(board, start, to)).length;
      if (safe >= 2 && moves.length - safe >= 2) {
        result.push({ mode: 'safe', board });
        break;
      }
    }
  }
  return result;
}

/** Een stelling als tekst: per stuk kleur (w/b), soort, vlak (bijv. `wRa1`). */
export function parse(text: string): Board {
  let board = emptyBoard();
  for (const part of text.split(' ')) {
    const [color, kind, file, rank] = part;
    board = withPiece(board, { col: file.charCodeAt(0) - 97, row: Number(rank) - 1 }, {
      kind: kind as Kind,
      color: color as 'w' | 'b',
    });
  }
  return board;
}

/** Spiegelt een bord links-rechts, zodat dezelfde opdracht er anders uitziet. */
export function mirror(board: Board): Board {
  let result = emptyBoard();
  squaresOf(board, 'w')
    .concat(squaresOf(board, 'b'))
    .forEach((sq) => {
      result = withPiece(result, { col: SIZE - 1 - sq.col, row: sq.row }, pieceAt(board, sq));
    });
  return result;
}

/** Stellingen waarin wit in één zet mat zet. */
export const MATE_POSITIONS = [
  'wKg1 wRa1 bKh8 bPg7 bPh7',
  'wKe6 wRa1 bKe8',
  'wKg6 wQb1 bKh8',
  'wKb6 wQh2 bKa8',
  'wKa1 wRa7 wRb2 bKe8',
  'wKa1 wNd6 bKh8 bRg8 bPg7 bPh7',
] as const;

/** Level 9: vijf stellingen waarin je de koning mat zet, willekeurig gespiegeld. */
export function mateExercises(rng: () => number = Math.random): Puzzle[] {
  return shuffle(MATE_POSITIONS, rng)
    .slice(0, 5)
    .map((text) => {
      const board = parse(text);
      return { mode: 'mate' as const, board: rng() < 0.5 ? mirror(board) : board };
    });
}

/** Level 10: drie pionnen tegen drie pionnen; wie eerst aan de overkant is, wint. */
export function gameExercises(rng: () => number = Math.random, easy = false): Puzzle[] {
  const columns = () => shuffle([0, 1, 2, 3, 4, 5, 6, 7], rng).slice(0, 3);
  return [0, 1, 2].map(() => {
    let board = emptyBoard();
    for (const col of columns()) board = withPiece(board, { col, row: 1 }, { kind: 'P', color: 'w' });
    for (const col of columns()) board = withPiece(board, { col, row: 6 }, { kind: 'P', color: 'b' });
    return { mode: 'game' as const, board, gentle: easy };
  });
}

/**
 * De zet van de tegenstander (zwart): vooral gewoon vooruit, slaan doet hij maar af en toe,
 * en nooit als `gentle`. Zo is hij een leuke tegenstander en geen sterke.
 */
export function opponentMove(board: Board, rng: () => number = Math.random, gentle = false): { from: Square; to: Square } | undefined {
  const all = squaresOf(board, 'b').flatMap((from) => legalMoves(board, from).map((to) => ({ from, to })));
  const captures = all.filter((m) => pieceAt(board, m.to));
  const quiet = all.filter((m) => !pieceAt(board, m.to));
  if (captures.length > 0 && !gentle && (quiet.length === 0 || rng() < 0.3)) return pick(captures, rng);
  if (quiet.length > 0) return pick(quiet, rng);
  return captures.length > 0 && !gentle ? pick(captures, rng) : undefined;
}

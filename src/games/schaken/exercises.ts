import {
  SIZE,
  emptyBoard,
  inside,
  movesFor,
  sameSquare,
  withPiece,
  type Board,
  type Kind,
  type Square,
} from './rules';

/** Eén opdrachtje: loop met het stuk naar de ster. */
export interface Exercise {
  kind: Kind;
  start: Square;
  goal: Square;
  /** Tegenstanders (zwarte pionnen); staat er een op `goal`, dan haal je de ster door te slaan. */
  enemies: Square[];
}

/** Het bord met het stuk op `at` en de tegenstanders erbij. */
export function boardFor(ex: Exercise, at: Square): Board {
  let board = emptyBoard();
  for (const sq of ex.enemies) board = withPiece(board, sq, { kind: 'P', color: 'b' });
  return withPiece(board, at, { kind: ex.kind, color: 'w' });
}

/** Minste aantal zetten vanaf `from` naar de ster; `Infinity` als het niet kan. */
export function stepsLeft(ex: Exercise, from: Square): number {
  if (sameSquare(from, ex.goal)) return 0;
  const seen = new Set([from.row * SIZE + from.col]);
  let frontier = [from];
  for (let steps = 1; frontier.length > 0; steps++) {
    const next: Square[] = [];
    for (const sq of frontier) {
      for (const to of movesFor(boardFor(ex, sq), sq)) {
        if (sameSquare(to, ex.goal)) return steps;
        const key = to.row * SIZE + to.col;
        if (!seen.has(key)) {
          seen.add(key);
          next.push(to);
        }
      }
    }
    frontier = next;
  }
  return Infinity;
}

/** De zetten vanaf `from` die dichter bij de ster brengen; hulp voor een kind dat vastzit. */
export function bestMoves(ex: Exercise, from: Square): Square[] {
  const here = stepsLeft(ex, from);
  return movesFor(boardFor(ex, from), from).filter((to) => stepsLeft(ex, to) < here);
}

export const EXERCISES_PER_LEVEL = 5;

/** Aantal zetten dat elk van de vijf opdrachtjes minstens nodig heeft: begint makkelijk, wordt langer. */
const STEPS: Partial<Record<Kind, number[]>> = {
  R: [1, 1, 2, 2, 2],
  B: [1, 1, 2, 2, 2],
  Q: [1, 1, 1, 2, 2],
  N: [1, 1, 2, 2, 3],
  K: [1, 2, 2, 3, 4],
};

const randomSquare = (rng: () => number): Square => ({
  col: Math.floor(rng() * SIZE),
  row: Math.floor(rng() * SIZE),
});

function pawnExercises(rng: () => number): Exercise[] {
  const col = Math.floor(rng() * SIZE);
  const side = (c: number) => (c === 0 ? 1 : c === SIZE - 1 || rng() < 0.5 ? -1 : 1);
  const diag = (c: number, row: number): Square => ({ col: c + side(c), row });
  const free = (from: Square, to: Square): Exercise => ({ kind: 'P', start: from, goal: to, enemies: [] });
  const capture = (from: Square, enemy: Square, decoy?: Square): Exercise => ({
    kind: 'P',
    start: from,
    goal: enemy,
    enemies: decoy ? [enemy, decoy] : [enemy],
  });
  const second = (colB: number) => ({ col: colB, row: 2 });
  const third = (colB: number) => ({ col: colB, row: 3 });
  return [
    free({ col, row: 1 }, { col, row: 2 }),
    free({ col, row: 1 }, { col, row: 3 }),
    free({ col, row: 1 }, { col, row: 4 }),
    capture(second(col), diag(col, 3)),
    capture(third(col), diag(col, 4), { col, row: 4 }),
  ];
}

/** Maakt de vijf opdrachtjes van een level: steeds een andere ster, makkelijk naar lastiger. */
export function makeExercises(kind: Kind, rng: () => number = Math.random): Exercise[] {
  if (kind === 'P') return pawnExercises(rng);
  const wanted = STEPS[kind] ?? [1, 1, 2, 2, 2];
  const result: Exercise[] = [];
  for (const steps of wanted) {
    for (let tries = 0; tries < 5000; tries++) {
      const start = randomSquare(rng);
      const goal = randomSquare(rng);
      if (!inside(start) || sameSquare(start, goal)) continue;
      const previous = result[result.length - 1];
      if (previous && sameSquare(previous.goal, goal)) continue;
      const ex: Exercise = { kind, start, goal, enemies: [] };
      if (stepsLeft(ex, start) === steps) {
        result.push(ex);
        break;
      }
    }
  }
  return result;
}

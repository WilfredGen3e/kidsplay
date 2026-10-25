import type { Kind } from './rules';
import type { Exercise } from './exercises';

export interface Level {
  kind: Kind;
  /** Eén zinnetje op AVI M3-niveau: korte woorden, zodat een kind van 5 het zelf kan lezen. */
  sentence: string;
  /** Zinnetje voor opdrachtjes waarin geslagen wordt. */
  captureSentence?: string;
}

/** De leerlevels op volgorde: eerst hoe elk stuk beweegt. */
export const LEVELS: readonly Level[] = [
  { kind: 'R', sentence: 'De toren loopt recht.' },
  { kind: 'B', sentence: 'De tovenares loopt schuin.' },
  { kind: 'Q', sentence: 'De koningin loopt recht en schuin.' },
  { kind: 'N', sentence: 'De eenhoorn springt.' },
  { kind: 'K', sentence: 'De koning loopt één stap.' },
  { kind: 'P', sentence: 'De prinses loopt vooruit.', captureSentence: 'De prinses pakt schuin.' },
];

export function sentenceFor(level: Level, ex: Exercise): string {
  return ex.enemies.length > 0 && level.captureSentence ? level.captureSentence : level.sentence;
}

/** Bewaard per kind: hoe vaak elk level is uitgespeeld (sleutel = nummer van het level). */
export interface ChessProgress {
  done: Record<string, number>;
}

export function timesDone(progress: ChessProgress | undefined, level: number): number {
  return progress?.done[String(level)] ?? 0;
}

export function recordLevelDone(progress: ChessProgress | undefined, level: number): ChessProgress {
  return { done: { ...progress?.done, [String(level)]: timesDone(progress, level) + 1 } };
}

/** Aantal levels dat minstens één keer is uitgespeeld. */
export function levelsDone(progress: ChessProgress | undefined): number {
  return LEVELS.filter((_, i) => timesDone(progress, i) > 0).length;
}

/** Het eerste level dat nog niet is gehaald; `undefined` als ze allemaal zijn gehaald. */
export function nextLevel(progress: ChessProgress | undefined): number | undefined {
  const index = LEVELS.findIndex((_, i) => timesDone(progress, i) === 0);
  return index === -1 ? undefined : index;
}

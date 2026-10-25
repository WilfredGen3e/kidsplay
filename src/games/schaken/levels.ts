import type { Theme } from './pieces';
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

/** Bewaard per kind. */
export interface ChessProgress {
  /** Hoe vaak elk level is uitgespeeld (sleutel = nummer van het level). */
  done: Record<string, number>;
  /** Het level waar het kind nu aan toe is (het ▶️); ontbreekt bij oudere voortgang. */
  current?: number;
  /** Levels waar het vorige keer veel misging: de volgende keer makkelijkere opdrachtjes. */
  easy?: Record<string, boolean>;
  /** Het uiterlijk dat het kind koos; ontbreekt = `prinses`. */
  theme?: Theme;
}

export function themeOf(progress: ChessProgress | undefined): Theme {
  return progress?.theme ?? 'prinses';
}

export function timesDone(progress: ChessProgress | undefined, level: number): number {
  return progress?.done[String(level)] ?? 0;
}

/** Aantal levels dat minstens één keer is uitgespeeld. */
export function levelsDone(progress: ChessProgress | undefined): number {
  return LEVELS.filter((_, i) => timesDone(progress, i) > 0).length;
}

/** Moet dit level makkelijkere opdrachtjes krijgen? */
export function isEasy(progress: ChessProgress | undefined, level: number): boolean {
  return progress?.easy?.[String(level)] === true;
}

/** Het level waar het kind nu aan toe is; `undefined` als ze allemaal zijn gehaald. */
export function currentLevel(progress: ChessProgress | undefined): number | undefined {
  const fallback = LEVELS.findIndex((_, i) => timesDone(progress, i) === 0);
  const index = progress?.current ?? (fallback === -1 ? LEVELS.length : fallback);
  return index >= LEVELS.length ? undefined : index;
}

/** Wat er na een level gebeurt: door naar het volgende, nog een keer, of eerst makkelijker oefenen. */
export type Outcome = 'up' | 'same' | 'easier';

/**
 * Verwerkt een uitgespeeld level. `clean` is het aantal opdrachtjes dat in één keer goed ging, zonder omweg.
 * Vrijwel alles in één keer goed: door naar het volgende level. Vrijwel alles met omwegen: hetzelfde level
 * nog een keer met makkelijkere opdrachtjes. Daartussen: hetzelfde level opnieuw. Nooit terug naar een lager level.
 */
export function finishLevel(
  progress: ChessProgress | undefined,
  level: number,
  clean: number,
  total: number,
): { progress: ChessProgress; outcome: Outcome } {
  const outcome: Outcome = clean >= total - 1 ? 'up' : clean <= 1 ? 'easier' : 'same';
  const key = String(level);
  const easy = { ...progress?.easy };
  if (outcome === 'up') delete easy[key];
  if (outcome === 'easier') easy[key] = true;
  const before = currentLevel(progress) ?? LEVELS.length;
  const current = outcome === 'up' ? Math.max(before, level + 1) : before;
  return {
    progress: { ...progress, done: { ...progress?.done, [key]: timesDone(progress, level) + 1 }, current, easy },
    outcome,
  };
}

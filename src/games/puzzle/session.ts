/**
 * Sessieregel voor kleine puzzels: wie in een sessie een puzzel met N stukjes heeft voltooid, kan daarna
 * alleen nog puzzels met méér dan N stukjes doen. Zo is steeds opnieuw 4 stukjes leggen voor spaarpunten
 * geen optie, en kan dezelfde puzzel niet met hetzelfde aantal opnieuw.
 *
 * Een sessie loopt vanaf het kiezen van een profiel tot het kind terug is op het profielenscherm
 * (`GameContext.session`); de stand leeft alleen in het geheugen.
 */
export interface PuzzleSession {
  /** Hoogste aantal stukjes dat in deze sessie is voltooid; 0 zolang er niets voltooid is. */
  highest: number;
}

export const SESSION_KEY = 'puzzle';

export function sessionOf(bag: Record<string, unknown>): PuzzleSession {
  const saved = bag[SESSION_KEY] as Partial<PuzzleSession> | undefined;
  return { highest: Number.isFinite(saved?.highest) && saved!.highest! > 0 ? saved!.highest! : 0 };
}

export function recordCompleted(bag: Record<string, unknown>, pieces: number): void {
  const current = sessionOf(bag);
  bag[SESSION_KEY] = { highest: Math.max(current.highest, pieces) } satisfies PuzzleSession;
}

export function isAllowed(session: PuzzleSession, pieces: number): boolean {
  return pieces > session.highest;
}

/** De aantallen die het kind nu nog mag kiezen. */
export function allowedCounts(session: PuzzleSession, options: number[]): number[] {
  return options.filter((n) => isAllowed(session, n));
}

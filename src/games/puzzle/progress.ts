export interface PuzzleResult {
  puzzleId: string;
  pieces: number;
  timeMs: number;
  /** ISO-datum van voltooien. */
  completedAt: string;
}

export interface SavedPiece {
  id: number;
  where: 'tray' | 'stage';
  /** Afbeeldingspixels, nulpunt linkerbovenhoek van het canvas; alleen betekenisvol op het canvas. */
  x: number;
  y: number;
  locked: boolean;
  group: number;
}

/** Tussenstand van een half gelegde puzzel. */
export interface PuzzleSnapshot {
  puzzleId: string;
  pieces: number;
  /** Eerdere speeltijd; die loopt door bij hervatten. */
  elapsedMs: number;
  state: SavedPiece[];
  /** Stuk-id's in de volgorde waarin ze in de lade liggen. */
  trayOrder: number[];
}

/** Wat het puzzelspel per profiel bewaart. */
export interface PuzzleProgress {
  results: PuzzleResult[];
  /** Hoogstens één tussenstand per puzzel en aantal stukjes. */
  inProgress?: PuzzleSnapshot[];
}

const sameGame = (a: { puzzleId: string; pieces: number }, b: { puzzleId: string; pieces: number }) =>
  a.puzzleId === b.puzzleId && a.pieces === b.pieces;

/** Voegt een voltooide puzzel toe en wist de tussenstand daarvan. */
export function addResult(progress: PuzzleProgress | undefined, result: PuzzleResult): PuzzleProgress {
  return {
    results: [...(progress?.results ?? []), result],
    inProgress: (progress?.inProgress ?? []).filter((s) => !sameGame(s, result)),
  };
}

export function saveSnapshot(progress: PuzzleProgress | undefined, snapshot: PuzzleSnapshot): PuzzleProgress {
  return {
    results: progress?.results ?? [],
    inProgress: [...(progress?.inProgress ?? []).filter((s) => !sameGame(s, snapshot)), snapshot],
  };
}

/** Geeft de tussenstand alleen terug als die nog klopt met de puzzel (anders begint het kind opnieuw). */
export function findSnapshot(
  progress: PuzzleProgress | undefined,
  puzzleId: string,
  pieces: number,
): PuzzleSnapshot | undefined {
  const found = progress?.inProgress?.find((s) => sameGame(s, { puzzleId, pieces }));
  return found && isValidSnapshot(found, pieces) ? found : undefined;
}

export function isValidSnapshot(s: PuzzleSnapshot, pieces: number): boolean {
  if (s.state.length !== pieces || !Number.isFinite(s.elapsedMs) || s.elapsedMs < 0) return false;
  const ids = new Set(s.state.map((p) => p.id));
  if (ids.size !== pieces || [...ids].some((id) => !Number.isInteger(id) || id < 0 || id >= pieces)) return false;
  if (s.state.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isInteger(p.group))) return false;
  const inTray = s.state.filter((p) => p.where === 'tray').map((p) => p.id).sort((a, b) => a - b);
  const order = [...s.trayOrder].sort((a, b) => a - b);
  return inTray.length === order.length && inTray.every((id, i) => id === order[i]);
}

/** Snelste tijd voor deze puzzel met dit aantal stukjes. */
export function bestTime(progress: PuzzleProgress | undefined, puzzleId: string, pieces: number): number | undefined {
  const times = (progress?.results ?? [])
    .filter((r) => r.puzzleId === puzzleId && r.pieces === pieces)
    .map((r) => r.timeMs);
  return times.length > 0 ? Math.min(...times) : undefined;
}

/** Eén ster per voltooide puzzel. */
export function starCount(progress: PuzzleProgress | undefined): number {
  return progress?.results.length ?? 0;
}

/** "4 min 12 s", of "45 s" onder de minuut. */
export function formatTime(ms: number): string {
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes > 0 ? `${minutes} min ${seconds} s` : `${seconds} s`;
}

/** Stukjes die dit kind al gelegd heeft: voltooide puzzels plus de vastgeklikte stukjes van halve puzzels. */
export function piecesPlaced(progress: PuzzleProgress | undefined): number {
  const done = (progress?.results ?? []).reduce((sum, r) => sum + r.pieces, 0);
  const partial = (progress?.inProgress ?? []).reduce((sum, s) => sum + s.state.filter((p) => p.locked).length, 0);
  return done + partial;
}

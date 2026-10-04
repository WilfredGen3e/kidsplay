export interface PuzzleResult {
  puzzleId: string;
  pieces: number;
  timeMs: number;
  /** ISO-datum van voltooien. */
  completedAt: string;
}

/** Wat het puzzelspel per profiel bewaart. */
export interface PuzzleProgress {
  results: PuzzleResult[];
}

export function addResult(progress: PuzzleProgress | undefined, result: PuzzleResult): PuzzleProgress {
  return { results: [...(progress?.results ?? []), result] };
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

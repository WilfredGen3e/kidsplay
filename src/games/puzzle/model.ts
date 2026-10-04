import type { GameData } from '../../platform/types';

export const GAME_ID = 'puzzle';

export interface Puzzle {
  id: string;
  name: string;
  /** Uitgesneden en verkleinde foto (maximaal 2048 px breed). */
  image: Blob;
  thumb: Blob;
  /** Aantallen stukjes waaruit het kind kan kiezen. */
  pieceOptions: number[];
  /** 'all' = iedereen, ook profielen die later bijkomen. */
  visibleFor: string[] | 'all';
  createdAt: string;
}

export type SnapSetting = 'ruim' | 'normaal' | 'krap';

export interface PuzzleSettings {
  snap: SnapSetting;
  preview: boolean;
  ghost: boolean;
  hint: boolean;
}

export const DEFAULT_SETTINGS: PuzzleSettings = { snap: 'normaal', preview: true, ghost: false, hint: true };

export const SNAP_FACTORS: Record<SnapSetting, number> = { ruim: 1.6, normaal: 1, krap: 0.6 };

export const DEFAULT_PIECE_OPTIONS = [4, 8, 12, 16, 24];

export function isVisibleFor(puzzle: Pick<Puzzle, 'visibleFor'>, profileId: string): boolean {
  return puzzle.visibleFor === 'all' || puzzle.visibleFor.includes(profileId);
}

export async function loadSettings(data: GameData): Promise<PuzzleSettings> {
  const saved = await data.get<Partial<PuzzleSettings>>('settings', 'main');
  return { ...DEFAULT_SETTINGS, ...saved };
}

export function saveSettings(data: GameData, settings: PuzzleSettings): Promise<void> {
  return data.put('settings', 'main', settings);
}

export async function listPuzzles(data: GameData): Promise<Puzzle[]> {
  const puzzles = await data.list<Puzzle>('puzzles');
  return puzzles.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

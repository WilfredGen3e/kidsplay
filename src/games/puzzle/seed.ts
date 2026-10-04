import type { GameData } from '../../platform/types';
import { canvasToBlob, thumbnail } from './image';
import { GAME_ID, DEFAULT_PIECE_OPTIONS, type Puzzle } from './model';
import { makeSampleImage } from './sample';

/** Zet bij de eerste start één voorbeeldpuzzel klaar; verwijderen door de ouder blijft zo. */
export async function ensureSamplePuzzle(data: GameData): Promise<void> {
  if (await data.get('meta', 'sampleSeeded')) return;
  if ((await data.list('puzzles')).length > 0) {
    await data.put('meta', 'sampleSeeded', true);
    return;
  }
  const canvas = makeSampleImage();
  const puzzle: Puzzle = {
    id: `${GAME_ID}-voorbeeld`,
    name: 'Landschap',
    image: await canvasToBlob(canvas),
    thumb: await canvasToBlob(thumbnail(canvas)),
    pieceOptions: DEFAULT_PIECE_OPTIONS,
    visibleFor: 'all',
    createdAt: new Date().toISOString(),
  };
  await data.put('puzzles', puzzle.id, puzzle);
  // Pas na het aanmaken: een onderbroken start probeert het de volgende keer opnieuw.
  await data.put('meta', 'sampleSeeded', true);
}

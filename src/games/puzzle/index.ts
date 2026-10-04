import type { GameModule } from '../../platform/types';
import { showCelebration } from './celebration';
import { addResult, bestTime, starCount, type PuzzleProgress } from './progress';
import { makeSampleImage } from './sample';
import { mountPuzzle } from './view';

// Voorlopig altijd de voorbeeldafbeelding met 12 stukjes; puzzels van de ouder volgen later.
const SAMPLE_PUZZLE_ID = 'voorbeeld';
const SAMPLE_PIECES = 12;

export const puzzleGame: GameModule = {
  id: 'puzzle',
  name: 'Fotopuzzel',
  icon: '🧩',
  start(root, ctx) {
    let stop = () => {};

    const run = () => {
      stop = mountPuzzle(root, {
        image: makeSampleImage(),
        pieces: SAMPLE_PIECES,
        drawerSide: ctx.profile.drawerSide,
        soundOn: ctx.profile.soundOn,
        onComplete: async (timeMs) => {
          let previous: PuzzleProgress | undefined;
          try {
            previous = await ctx.progress.load<PuzzleProgress>();
          } catch {
            // Opslag niet beschikbaar: het feest gaat gewoon door.
          }
          const best = bestTime(previous, SAMPLE_PUZZLE_ID, SAMPLE_PIECES);
          showCelebration(root, {
            timeMs,
            isRecord: best !== undefined && timeMs < best,
            soundOn: ctx.profile.soundOn,
            onAgain: () => {
              stop();
              run();
            },
            onHome: ctx.exit,
          });
          await ctx.progress.save(
            addResult(previous, {
              puzzleId: SAMPLE_PUZZLE_ID,
              pieces: SAMPLE_PIECES,
              timeMs,
              completedAt: new Date().toISOString(),
            }),
          );
        },
      });
    };

    run();
    return () => stop();
  },
  summarize(progress) {
    return { stars: starCount(progress as PuzzleProgress | undefined) };
  },
};

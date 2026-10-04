import type { GameModule } from '../../platform/types';
import { showCelebration } from './celebration';
import {
  addResult,
  bestTime,
  findSnapshot,
  saveSnapshot,
  starCount,
  type PuzzleProgress,
  type PuzzleSnapshot,
} from './progress';
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
    let stopped = false;

    // Opslagacties lopen achter elkaar, zodat snel opeenvolgende zetten elkaar niet overschrijven.
    let queue: Promise<unknown> = Promise.resolve();
    const update = (change: (current: PuzzleProgress | undefined) => PuzzleProgress) => {
      queue = queue
        .then(async () => ctx.progress.save(change(await ctx.progress.load<PuzzleProgress>())))
        .catch(() => {
          // Opslag mislukt: het kind speelt gewoon door.
        });
      return queue;
    };

    const run = (restore?: PuzzleSnapshot) => {
      stop = mountPuzzle(root, {
        puzzleId: SAMPLE_PUZZLE_ID,
        image: makeSampleImage(),
        pieces: SAMPLE_PIECES,
        drawerSide: ctx.profile.drawerSide,
        soundOn: ctx.profile.soundOn,
        restore,
        onProgress: (snapshot) => void update((current) => saveSnapshot(current, snapshot)),
        onComplete: async (timeMs) => {
          await queue;
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
          void update((current) =>
            addResult(current, {
              puzzleId: SAMPLE_PUZZLE_ID,
              pieces: SAMPLE_PIECES,
              timeMs,
              completedAt: new Date().toISOString(),
            }),
          );
        },
      });
    };

    void (async () => {
      let progress: PuzzleProgress | undefined;
      try {
        progress = await ctx.progress.load<PuzzleProgress>();
      } catch {
        // Zonder opslag begint het kind gewoon opnieuw.
      }
      if (!stopped) run(findSnapshot(progress, SAMPLE_PUZZLE_ID, SAMPLE_PIECES));
    })();

    return () => {
      stopped = true;
      stop();
    };
  },
  summarize(progress) {
    return { stars: starCount(progress as PuzzleProgress | undefined) };
  },
};

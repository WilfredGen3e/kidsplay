import type { GameModule } from '../../platform/types';
import { makeSampleImage } from './sample';
import { mountPuzzle } from './view';

export const puzzleGame: GameModule = {
  id: 'puzzle',
  name: 'Fotopuzzel',
  icon: '🧩',
  start(root, ctx) {
    // Voorlopig altijd de voorbeeldafbeelding met 12 stukjes; puzzels van de ouder volgen later.
    return mountPuzzle(root, {
      image: makeSampleImage(),
      pieces: 12,
      drawerSide: ctx.profile.drawerSide,
    });
  },
  summarize() {
    return { stars: 0 };
  },
};

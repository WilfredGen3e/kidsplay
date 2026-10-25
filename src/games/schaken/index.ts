import type { GameModule } from '../../platform/types';
import { mountBoard } from './view';

export const GAME_ID = 'schaken';

export const schakenGame: GameModule = {
  id: GAME_ID,
  name: 'Schaken',
  icon: '👑',
  start(root) {
    return mountBoard(root);
  },
  summarize() {
    return { stars: 0 };
  },
};

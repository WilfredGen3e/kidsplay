import type { GameContext, Profile, ProgressStore } from './types';

export function createGameContext(
  profile: Profile,
  gameId: string,
  store: ProgressStore,
  exit: () => void,
): GameContext {
  return {
    profile,
    exit,
    progress: {
      load: <T>() => store.load<T>(profile.id, gameId),
      save: <T>(data: T) => store.save(profile.id, gameId, data),
    },
  };
}

import type { GameContext, GameData, Profile, ProgressStore, RecordStore } from './types';

export function createGameData(records: RecordStore, gameId: string): GameData {
  return {
    list: (collection) => records.list(gameId, collection),
    get: (collection, id) => records.get(gameId, collection, id),
    put: (collection, id, value) => records.put(gameId, collection, id, value),
    remove: (collection, id) => records.remove(gameId, collection, id),
  };
}

export function createGameContext(
  profile: Profile,
  gameId: string,
  store: ProgressStore,
  data: GameData,
  exit: () => void,
): GameContext {
  return {
    profile,
    data,
    exit,
    progress: {
      load: <T>() => store.load<T>(profile.id, gameId),
      save: <T>(data: T) => store.save(profile.id, gameId, data),
    },
  };
}

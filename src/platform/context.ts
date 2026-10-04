import { addPoints, updateRewards } from './rewards';
import type { GameContext, GameData, SavingsInfo, Profile, ProgressStore, RecordStore } from './types';

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
  rewards: { savings: () => Promise<SavingsInfo>; openGifts: () => void },
): GameContext {
  return {
    profile,
    data,
    exit,
    savings: rewards.savings,
    openGifts: rewards.openGifts,
    addPoints: async (count) => {
      await updateRewards(store, profile.id, (state) => addPoints(state, count));
    },
    progress: {
      load: <T>() => store.load<T>(profile.id, gameId),
      save: <T>(data: T) => store.save(profile.id, gameId, data),
    },
  };
}

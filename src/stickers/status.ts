import { loadRewards, pendingGifts, savingProgress } from '../platform/rewards';
import type { GameData, ProgressStore, SavingsInfo } from '../platform/types';
import { visibleStickers } from './logic';
import { listStickers } from './model';

/** Spaarstand van een kind; cadeautjes tellen pas mee als er stickers zijn om te winnen. */
export async function loadSavings(progress: ProgressStore, stickerData: GameData, profileId: string): Promise<SavingsInfo> {
  const [state, stickers] = await Promise.all([loadRewards(progress, profileId), listStickers(stickerData)]);
  const { have, need, remaining } = savingProgress(state);
  return { have, need, remaining, gifts: visibleStickers(stickers, profileId).length > 0 ? pendingGifts(state) : 0 };
}

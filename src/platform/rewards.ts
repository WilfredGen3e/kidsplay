import type { ProgressStore } from './types';

export const DEFAULT_THRESHOLD = 50;
export const REWARDS_KEY = 'platform:rewards';

/** Spaarstand van één kind: puntensaldo, drempel per sticker en hoe de volgende sticker gekozen wordt. */
export interface RewardState {
  /** Nog niet verzilverde punten; restpunten schuiven door naar de volgende sticker. */
  points: number;
  threshold: number;
  order: 'fixed' | 'random';
  /** Punten uit eerder gespeelde puzzels zijn al bijgeschreven (eenmalig, bij de komst van het stickerboek). */
  backfilled?: boolean;
  /** De ouder heeft de volgorde zelf gekozen; anders geldt willekeurig. */
  orderSet?: boolean;
}

export function defaultRewardState(): RewardState {
  return { points: 0, threshold: DEFAULT_THRESHOLD, order: 'random' };
}

/** Vult ontbrekende of ongeldige velden aan, zodat oude of beschadigde opslag nooit stukgaat. */
export function normalizeRewardState(saved: Partial<RewardState> | undefined): RewardState {
  const base = defaultRewardState();
  if (!saved) return base;
  const threshold = Number.isInteger(saved.threshold) && saved.threshold! >= 1 ? saved.threshold! : base.threshold;
  const points = Number.isInteger(saved.points) && saved.points! >= 0 ? saved.points! : 0;
  // Standaard willekeurig; 'op volgorde' alleen als de ouder dat bewust koos.
  const order = saved.orderSet && saved.order === 'fixed' ? 'fixed' : 'random';
  return {
    points,
    threshold,
    order,
    ...(saved.orderSet ? { orderSet: true } : {}),
    ...(saved.backfilled ? { backfilled: true } : {}),
  };
}

export function addPoints(state: RewardState, count: number): RewardState {
  return { ...state, points: state.points + Math.max(0, Math.floor(count)) };
}

/** Aantal cadeautjes dat het kind nu mag openmaken. */
export function pendingGifts(state: RewardState): number {
  return Math.floor(state.points / state.threshold);
}

/** Verzilvert één cadeautje; de restpunten blijven staan. */
export function claimGift(state: RewardState): RewardState {
  if (pendingGifts(state) < 1) return state;
  return { ...state, points: state.points - state.threshold };
}

/** Voor de spaarbalk: hoever het kind is richting de volgende sticker. */
export function savingProgress(state: RewardState): { have: number; need: number; remaining: number } {
  const have = state.points % state.threshold;
  return { have, need: state.threshold, remaining: state.threshold - have };
}

// Wijzigingen per profiel lopen achter elkaar, zodat snel opeenvolgende punten elkaar niet overschrijven.
const queues = new Map<string, Promise<unknown>>();

export async function loadRewards(store: ProgressStore, profileId: string): Promise<RewardState> {
  await queues.get(profileId);
  return normalizeRewardState(await store.load<RewardState>(profileId, REWARDS_KEY));
}

export function updateRewards(
  store: ProgressStore,
  profileId: string,
  change: (state: RewardState) => RewardState,
): Promise<RewardState> {
  const run = (queues.get(profileId) ?? Promise.resolve()).catch(() => {}).then(async () => {
    const next = change(normalizeRewardState(await store.load<RewardState>(profileId, REWARDS_KEY)));
    await store.save(profileId, REWARDS_KEY, next);
    return next;
  });
  queues.set(profileId, run);
  return run;
}

/** Schrijft eenmalig de punten van vroeger gespeelde spellen bij; een tweede keer gebeurt er niets. */
export function applyBackfill(state: RewardState, pastPoints: number): RewardState {
  if (state.backfilled) return state;
  return { ...addPoints(state, pastPoints), backfilled: true };
}

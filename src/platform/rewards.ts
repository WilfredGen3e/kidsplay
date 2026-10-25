import type { ProgressStore } from './types';

export const DEFAULT_THRESHOLD = 50;
export const DEFAULT_MAX_PER_DAY = 2;
export const REWARDS_KEY = 'platform:rewards';

/** Spaarstand van één kind: puntensaldo, drempel per sticker en hoe de volgende sticker gekozen wordt. */
export interface RewardState {
  /** Nog niet verzilverde punten; restpunten schuiven door naar de volgende sticker. */
  points: number;
  threshold: number;
  order: 'fixed' | 'random';
  /** Punten uit eerder gespeelde puzzels zijn al bijgeschreven (eenmalig, bij de komst van het stickerboek). */
  backfilled?: boolean;
  /** De ouder heeft de volgorde zelf gekozen; anders geldt op volgorde. */
  orderSet?: boolean;
  /** Hoeveel stickers per dag verdiend kunnen worden; daarna tellen punten pas morgen weer. */
  maxPerDay: number;
  /** Datum (lokaal, JJJJ-MM-DD) waarop `todayPoints` is bijgehouden. */
  day?: string;
  /** Punten die op `day` zijn bijgeschreven; telt mee voor het dagmaximum. */
  todayPoints?: number;
}

export function defaultRewardState(): RewardState {
  return { points: 0, threshold: DEFAULT_THRESHOLD, order: 'fixed', maxPerDay: DEFAULT_MAX_PER_DAY };
}

/** Vult ontbrekende of ongeldige velden aan, zodat oude of beschadigde opslag nooit stukgaat. */
export function normalizeRewardState(saved: Partial<RewardState> | undefined): RewardState {
  const base = defaultRewardState();
  if (!saved) return base;
  const threshold = Number.isInteger(saved.threshold) && saved.threshold! >= 1 ? saved.threshold! : base.threshold;
  const points = Number.isInteger(saved.points) && saved.points! >= 0 ? saved.points! : 0;
  // Standaard op volgorde (voorspelbaar); willekeurig alleen als de ouder dat bewust koos.
  const order = saved.orderSet && saved.order === 'random' ? 'random' : 'fixed';
  const maxPerDay = Number.isInteger(saved.maxPerDay) && saved.maxPerDay! >= 1 ? saved.maxPerDay! : base.maxPerDay;
  const todayPoints = Number.isInteger(saved.todayPoints) && saved.todayPoints! >= 0 ? saved.todayPoints! : 0;
  return {
    points,
    threshold,
    order,
    maxPerDay,
    ...(saved.day ? { day: saved.day, todayPoints } : {}),
    ...(saved.orderSet ? { orderSet: true } : {}),
    ...(saved.backfilled ? { backfilled: true } : {}),
  };
}

export function addPoints(state: RewardState, count: number): RewardState {
  return { ...state, points: state.points + Math.max(0, Math.floor(count)) };
}

/** Lokale datum als JJJJ-MM-DD; de dag wisselt dus om middernacht van het apparaat. */
export function dayKey(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function pointsToday(state: RewardState, now: Date): number {
  return state.day === dayKey(now) ? state.todayPoints ?? 0 : 0;
}

/** Hoeveel punten er vandaag nog bij mogen voordat het dagmaximum aan stickers bereikt is. */
export function roomToday(state: RewardState, now: Date = new Date()): number {
  return Math.max(0, state.maxPerDay * state.threshold - pointsToday(state, now));
}

/** Het dagmaximum is bereikt: puzzelen kan nog, maar er komen vandaag geen punten meer bij. */
export function dayFull(state: RewardState, now: Date = new Date()): boolean {
  return roomToday(state, now) === 0;
}

/** Schrijft punten bij als gewoon spelen, met het dagmaximum als grens. Restpunten van gisteren tellen niet mee. */
export function earnPoints(state: RewardState, count: number, now: Date = new Date()): RewardState {
  const earned = Math.min(Math.max(0, Math.floor(count)), roomToday(state, now));
  return { ...state, points: state.points + earned, day: dayKey(now), todayPoints: pointsToday(state, now) + earned };
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

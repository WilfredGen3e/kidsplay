import { GOLD_PREFIX, type AlbumEntry, type Sticker } from './model';

export const SLOTS_PER_PAGE = 6;
const COLS = 3;
const ROWS = 2;

export const isGold = (stickerId: string) => stickerId.startsWith(GOLD_PREFIX);
export const goldId = (now = Date.now()) => `${GOLD_PREFIX}${now}`;

/** Stickers die dit kind kan verdienen, op volgorde. */
export function visibleStickers(stickers: Sticker[], profileId: string): Sticker[] {
  return stickers.filter((s) => s.forProfile === null || s.forProfile === profileId).sort((a, b) => a.order - b.order);
}

/**
 * De volgende sticker: nooit een dubbele zolang de set niet compleet is.
 * `undefined` betekent: alles verzameld, dus een gouden compleet-sticker.
 */
export function pickNext(
  stickers: Sticker[],
  ownedIds: ReadonlySet<string>,
  order: 'fixed' | 'random',
  rng: () => number = Math.random,
): Sticker | undefined {
  const missing = stickers.filter((s) => !ownedIds.has(s.id));
  if (missing.length === 0) return undefined;
  return order === 'random' ? missing[Math.floor(rng() * missing.length)] : missing[0];
}

/** Startplek van de n-de sticker (vanaf 0): een raster van 3 × 2 per pagina. */
export function slotFor(index: number): { page: number; x: number; y: number } {
  const page = Math.floor(index / SLOTS_PER_PAGE);
  const slot = index % SLOTS_PER_PAGE;
  return { page, x: ((slot % COLS) + 0.5) / COLS, y: (Math.floor(slot / COLS) + 0.5) / ROWS };
}

export function clampPosition(x: number, y: number, margin = 0.08): { x: number; y: number } {
  const clamp = (v: number) => Math.min(1 - margin, Math.max(margin, v));
  return { x: clamp(x), y: clamp(y) };
}

/** Verwijderen mag alleen zolang geen kind de sticker verdiend heeft. */
export function canDelete(stickerId: string, album: AlbumEntry[]): boolean {
  return !album.some((e) => e.stickerId === stickerId);
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

/** Aantal pagina's om te tonen: minstens één, anders tot en met de laatst gebruikte pagina. */
export function pageCount(album: AlbumEntry[]): number {
  return Math.max(1, ...album.map((e) => e.page + 1));
}

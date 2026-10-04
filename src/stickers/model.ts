import type { GameData } from '../platform/types';

/** Spel-id waaronder stickers en stickerboeken in de RecordStore staan. */
export const STICKERS_ID = 'stickers';
export const GOLD_PREFIX = 'gold:';

/** Uitsnede in editor-eenheden (kader van FLIPPO_FRAME px) op de al gedraaide afbeelding. */
export interface FlippoCrop {
  x: number;
  y: number;
  scale: number;
  rotation: 0 | 90 | 180 | 270;
}

export interface Sticker {
  id: string;
  name: string;
  /** Originele afbeelding (maximaal 2048 px), zodat de uitsnede later aan te passen is. */
  original: Blob;
  /** Ronde PNG van 512 × 512 met transparante buitenkant. */
  png: Blob;
  crop: FlippoCrop;
  /** Randkleur of geen rand. */
  border: string | null;
  glitter: boolean;
  rarity: 'normal' | 'special';
  /** Alleen voor dit profiel; anders voor iedereen. */
  forProfile: string | null;
  order: number;
}

export interface AlbumEntry {
  profileId: string;
  /** Sticker-id, of `gold:<tijd>` voor een gouden compleet-sticker. */
  stickerId: string;
  earnedAt: string;
  /** Pagina in het boek, vanaf 0. */
  page: number;
  /** Midden van de sticker als fractie (0–1) van de pagina. */
  x: number;
  y: number;
}

export const albumKey = (profileId: string, stickerId: string) => `${profileId}:${stickerId}`;

export async function listStickers(data: GameData): Promise<Sticker[]> {
  const all = await data.list<Sticker>('stickers');
  return all.sort((a, b) => a.order - b.order);
}

export function saveSticker(data: GameData, sticker: Sticker): Promise<void> {
  return data.put('stickers', sticker.id, sticker);
}

export function removeSticker(data: GameData, id: string): Promise<void> {
  return data.remove('stickers', id);
}

export async function listAlbum(data: GameData, profileId: string): Promise<AlbumEntry[]> {
  const all = await data.list<AlbumEntry>('album');
  return all.filter((e) => e.profileId === profileId).sort((a, b) => a.earnedAt.localeCompare(b.earnedAt));
}

export async function listAllAlbums(data: GameData): Promise<AlbumEntry[]> {
  return data.list<AlbumEntry>('album');
}

export function saveAlbumEntry(data: GameData, entry: AlbumEntry): Promise<void> {
  return data.put('album', albumKey(entry.profileId, entry.stickerId), entry);
}

export async function removeAlbum(data: GameData, profileId: string): Promise<void> {
  for (const entry of await listAlbum(data, profileId)) await data.remove('album', albumKey(profileId, entry.stickerId));
}

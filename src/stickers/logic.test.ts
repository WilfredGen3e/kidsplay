import { describe, expect, it } from 'vitest';
import { canDelete, clampPosition, moveItem, pageCount, pickNext, slotFor, visibleStickers } from './logic';
import type { AlbumEntry, Sticker } from './model';

const sticker = (id: string, order: number, forProfile: string | null = null) =>
  ({ id, order, forProfile, name: id }) as Sticker;
const entry = (stickerId: string, page = 0) =>
  ({ profileId: 'a', stickerId, page, x: 0.5, y: 0.5, earnedAt: '' }) as AlbumEntry;

describe('stickers kiezen', () => {
  const set = [sticker('c', 3), sticker('a', 1), sticker('b', 2)];

  it('toont alleen stickers voor iedereen of voor dit kind, op volgorde', () => {
    const mixed = [...set, sticker('d', 4, 'x'), sticker('e', 5, 'y')];
    expect(visibleStickers(mixed, 'x').map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('geeft op volgorde de eerste die het kind nog niet heeft', () => {
    expect(pickNext(visibleStickers(set, 'x'), new Set(['a']), 'fixed')?.id).toBe('b');
  });

  it('geeft willekeurig alleen een sticker die nog ontbreekt', () => {
    const stickers = visibleStickers(set, 'x');
    for (let i = 0; i < 20; i++) expect(['b', 'c']).toContain(pickNext(stickers, new Set(['a']), 'random')?.id);
    expect(pickNext(stickers, new Set(['a']), 'random', () => 0.99)?.id).toBe('c');
  });

  it('geeft niets terug als alles verzameld is (dan komt de gouden sticker)', () => {
    expect(pickNext(visibleStickers(set, 'x'), new Set(['a', 'b', 'c']), 'fixed')).toBeUndefined();
  });
});

describe('stickerboek', () => {
  it('legt stickers in een raster van 6 per pagina', () => {
    expect(slotFor(0)).toEqual({ page: 0, x: 1 / 6, y: 0.25 });
    expect(slotFor(5)).toEqual({ page: 0, x: 5 / 6, y: 0.75 });
    expect(slotFor(6).page).toBe(1);
  });

  it('houdt een sticker binnen de pagina', () => {
    expect(clampPosition(-1, 2)).toEqual({ x: 0.08, y: 0.92 });
    expect(clampPosition(0.4, 0.6)).toEqual({ x: 0.4, y: 0.6 });
  });

  it('telt pagina’s', () => {
    expect(pageCount([])).toBe(1);
    expect(pageCount([entry('a', 0), entry('b', 2)])).toBe(3);
  });

  it('verwijderen kan alleen als niemand de sticker heeft', () => {
    expect(canDelete('a', [entry('b')])).toBe(true);
    expect(canDelete('a', [entry('a')])).toBe(false);
  });

  it('verplaatst een item in de lijst', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });
});

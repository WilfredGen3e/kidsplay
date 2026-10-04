import type { GameData, Profile } from '../platform/types';
import { avatarNode, el, iconButton } from '../ui/dom';
import { createUrlBag } from '../ui/urls';
import { goldStickerUrl } from './flippo';
import { clampPosition, isGold, pageCount, visibleStickers } from './logic';
import { listAlbum, listStickers, saveAlbumEntry, type AlbumEntry, type Sticker } from './model';

export interface BookDeps {
  profiles: Profile[];
  /** Het kind dat het boek opent; alleen in het eigen album mag verplaatst worden. */
  viewer: Profile;
  data: GameData;
  /** Terug naar het spellenoverzicht. */
  onBack(): void;
}

const OVERVIEW = 0; // pagina-index 0 is het overzicht; album-pagina n staat op index n + 1

/** Stickerboek: overzichtspagina, vrije pagina's om te slepen, en de albums van de anderen om te bekijken. */
export function startBook(root: HTMLElement, deps: BookDeps): () => void {
  const urls = createUrlBag();
  let stopped = false;
  let ownerId = deps.viewer.id;
  let pageIndex = OVERVIEW;
  let stickers: Sticker[] = [];
  const albums = new Map<string, AlbumEntry[]>();
  let z = 10;

  const owner = () => deps.profiles.find((p) => p.id === ownerId) ?? deps.viewer;
  const imageOf = (entry: AlbumEntry): { src: string; name: string } | undefined => {
    if (isGold(entry.stickerId)) return { src: goldStickerUrl(), name: 'Compleet' };
    const s = stickers.find((x) => x.id === entry.stickerId);
    return s ? { src: urls.url(s.png), name: s.name } : undefined;
  };

  async function load() {
    stickers = await listStickers(deps.data);
    for (const p of deps.profiles) albums.set(p.id, await listAlbum(deps.data, p.id));
    if (!deps.profiles.some((p) => p.id === deps.viewer.id)) albums.set(deps.viewer.id, await listAlbum(deps.data, deps.viewer.id));
    if (!stopped) render();
  }

  function render() {
    const profile = owner();
    const own = profile.id === deps.viewer.id;
    const album = albums.get(profile.id) ?? [];
    const pages = pageCount(album);
    pageIndex = Math.min(pageIndex, pages); // index 0 = overzicht, 1..pages = album-pagina's

    const screen = el('div', 'book-screen');
    screen.style.setProperty('--owner', profile.color);

    // Bovenbalk: huisknop, avatars van alle profielen, wiens boek open is
    const top = el('header', 'book-top');
    top.append(iconButton('🏠', 'Terug', 'round-button', deps.onBack));
    const people = el('div', 'book-people');
    const everyone = deps.profiles.some((p) => p.id === deps.viewer.id) ? deps.profiles : [deps.viewer, ...deps.profiles];
    for (const p of everyone) {
      const chip = el('button', `book-person${p.id === ownerId ? ' active' : ''}`);
      chip.type = 'button';
      chip.setAttribute('aria-label', p.name);
      chip.style.background = p.color;
      chip.append(avatarNode(p.avatar, 'book-avatar'));
      chip.addEventListener('click', () => {
        ownerId = p.id;
        pageIndex = OVERVIEW;
        render();
      });
      people.append(chip);
    }
    top.append(people);
    const banner = el('div', 'book-banner');
    banner.append(avatarNode(profile.avatar, 'book-avatar'), el('strong', '', `${own ? '' : '👀 '}${profile.name}`));
    top.append(banner);

    const page = el('div', 'book-page');
    if (pageIndex === OVERVIEW) overviewPage(page, profile, album);
    else albumPage(page, album, pageIndex - 1, own);

    const nav = el('div', 'book-nav');
    const prev = iconButton('◀️', 'Vorige pagina', 'round-button', () => {
      pageIndex--;
      render();
    });
    prev.disabled = pageIndex === 0;
    const nextButton = iconButton('▶️', 'Volgende pagina', 'round-button', () => {
      pageIndex++;
      render();
    });
    nextButton.disabled = pageIndex >= pages;
    const dots = el('div', 'book-dots');
    for (let i = 0; i <= pages; i++) {
      const dot = el('button', `book-dot${i === pageIndex ? ' active' : ''}`, i === 0 ? '⭐' : '');
      dot.type = 'button';
      dot.setAttribute('aria-label', i === 0 ? 'Overzicht' : `Pagina ${i}`);
      dot.addEventListener('click', () => {
        pageIndex = i;
        render();
      });
      dots.append(dot);
    }
    nav.append(prev, dots, nextButton);

    screen.append(top, page, nav);
    root.replaceChildren(screen);
  }

  /** Alle stickers uit de set; lege silhouetten voor wat nog te verdienen valt. */
  function overviewPage(page: HTMLElement, profile: Profile, album: AlbumEntry[]) {
    const owned = new Set(album.map((e) => e.stickerId));
    const set = visibleStickers(stickers, profile.id);
    const count = el('div', 'book-count', `⭐ ${set.filter((s) => owned.has(s.id)).length} / ${set.length}`);
    const grid = el('div', 'book-overview');
    for (const s of set) {
      const img = el('img', `book-sticker${owned.has(s.id) ? '' : ' silhouette'}`);
      img.src = urls.url(s.png);
      img.alt = owned.has(s.id) ? s.name : '';
      img.draggable = false;
      grid.append(img);
    }
    for (const _gold of album.filter((e) => isGold(e.stickerId))) {
      const img = el('img', 'book-sticker');
      img.src = goldStickerUrl();
      img.alt = 'Compleet';
      img.draggable = false;
      grid.append(img);
    }
    if (set.length === 0) grid.append(el('div', 'empty-state', '🎁'));
    page.append(count, grid);
  }

  function albumPage(page: HTMLElement, album: AlbumEntry[], index: number, own: boolean) {
    for (const entry of album.filter((e) => e.page === index)) {
      const image = imageOf(entry);
      if (!image) continue;
      const img = el('img', `book-sticker free${own ? ' movable' : ''}`);
      img.src = image.src;
      img.alt = image.name;
      img.draggable = false;
      img.style.left = `${entry.x * 100}%`;
      img.style.top = `${entry.y * 100}%`;
      page.append(img);
      if (own) enableDrag(img, page, entry);
    }
    if (album.every((e) => e.page !== index)) page.append(el('div', 'book-empty', '📖'));
  }

  /** Slepen met pointer-events op `window`; de plek wordt bij loslaten bewaard. */
  function enableDrag(img: HTMLImageElement, page: HTMLElement, entry: AlbumEntry) {
    img.addEventListener('pointerdown', (down) => {
      down.preventDefault();
      img.style.zIndex = String(++z);
      img.classList.add('dragging');
      const rect = page.getBoundingClientRect();
      const grab = { x: down.clientX - (rect.left + entry.x * rect.width), y: down.clientY - (rect.top + entry.y * rect.height) };
      const move = (e: PointerEvent) => {
        const { x, y } = clampPosition((e.clientX - grab.x - rect.left) / rect.width, (e.clientY - grab.y - rect.top) / rect.height);
        entry.x = x;
        entry.y = y;
        img.style.left = `${x * 100}%`;
        img.style.top = `${y * 100}%`;
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        img.classList.remove('dragging');
        void saveAlbumEntry(deps.data, entry).catch(() => {});
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
  }

  void load();
  return () => {
    stopped = true;
    urls.revoke();
  };
}

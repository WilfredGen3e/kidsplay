import { claimGift, loadRewards, pendingGifts, updateRewards } from '../platform/rewards';
import type { GameData, Profile, ProgressStore } from '../platform/types';
import { spawnConfetti } from '../ui/confetti';
import { el, iconButton } from '../ui/dom';
import { playFanfare, playRip, playSparkle } from '../ui/sound';
import { createUrlBag } from '../ui/urls';
import { goldStickerUrl } from './flippo';
import { goldId, pickNext, slotFor, visibleStickers } from './logic';
import { listAlbum, listStickers, saveAlbumEntry, type Sticker } from './model';

export interface GiftDeps {
  profile: Profile;
  progress: ProgressStore;
  /** Gegevens van de stickers (RecordStore onder `STICKERS_ID`). */
  data: GameData;
  /** Naar het spellenoverzicht. */
  onDone(): void;
  /** Naar het stickerboek. */
  openBook(): void;
}

const PAPERS = ['#fa5252', '#fd7e14', '#fab005', '#40c057', '#15aabf', '#4c6ef5', '#be4bdb', '#f06595'];
const RIBBONS = ['#fff3bf', '#ffffff', '#ffc9c9', '#d0ebff', '#e5dbff'];
const TAPS_TO_OPEN = 3;
const MIN_GIFTS = 5;
const MAX_GIFTS = 8;

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function giftNode(paper: string, ribbon: string): HTMLElement {
  const gift = el('div', 'gift');
  gift.style.setProperty('--paper', paper);
  gift.style.setProperty('--ribbon', ribbon);
  gift.append(el('span', 'gift-bow', '🎀'));
  return gift;
}

/**
 * Cadeautjesscherm: kies een pakje, scheur het open, de sticker vliegt naar het boek.
 * Welke sticker erin zit staat al vast; alle pakjes bevatten dezelfde. Geeft een opruimfunctie terug.
 */
export function startGifts(root: HTMLElement, deps: GiftDeps): () => void {
  const urls = createUrlBag();
  const timers = new Set<number>();
  let stopped = false;
  const later = (ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (!stopped) fn();
    }, ms);
    timers.add(id);
  };

  const screen = el('div', 'gift-screen');
  const stage = el('div', 'gift-stage');
  const home = iconButton('🏠', 'Terug', 'corner-button home', deps.onDone);
  const book = iconButton('📖', 'Stickerboek', 'corner-button gift-book', deps.openBook);
  const counter = el('div', 'gift-counter');
  screen.append(stage, counter, home, book);
  root.replaceChildren(screen);
  spawnConfetti(screen, 24);

  async function next() {
    const [state, all] = await Promise.all([loadRewards(deps.progress, deps.profile.id), listStickers(deps.data)]);
    if (stopped) return;
    const stickers = visibleStickers(all, deps.profile.id);
    const gifts = pendingGifts(state);
    if (gifts < 1 || stickers.length === 0) return deps.onDone();
    const album = await listAlbum(deps.data, deps.profile.id);
    const prize = pickNext(stickers, new Set(album.map((e) => e.stickerId)), state.order);
    counter.textContent = `🎁 ×${gifts}`;
    choose(prize, album.length);
  }

  /** Een rij ingepakte pakjes; het kind kiest er één, de rest schuift weg. */
  function choose(prize: Sticker | undefined, ownedCount: number) {
    const count = MIN_GIFTS + Math.floor(Math.random() * (MAX_GIFTS - MIN_GIFTS + 1));
    const papers = shuffled(PAPERS);
    const row = el('div', 'gift-row');
    const gifts: HTMLElement[] = [];
    for (let i = 0; i < count; i++) {
      const button = el('button', 'gift-choice');
      button.type = 'button';
      button.setAttribute('aria-label', 'Cadeautje');
      const paper = papers[i % papers.length];
      const ribbon = pick(RIBBONS);
      button.append(giftNode(paper, ribbon));
      button.style.animationDelay = `${i * 0.08}s`;
      button.addEventListener('click', () => {
        if (row.classList.contains('picked')) return;
        row.classList.add('picked');
        button.classList.add('chosen');
        gifts.forEach((g) => g !== button && g.classList.add('gone'));
        if (soundOn()) playSparkle();
        later(750, () => unwrap(prize, ownedCount, paper, ribbon));
      });
      gifts.push(button);
      row.append(button);
    }
    stage.replaceChildren(row);
  }

  const soundOn = () => deps.profile.soundOn;

  /** Het gekozen pakje groot; een paar tikken scheuren het papier weg. */
  function unwrap(prize: Sticker | undefined, ownedCount: number, paper: string, ribbon: string) {
    const big = el('button', 'gift-big');
    big.type = 'button';
    big.setAttribute('aria-label', 'Openmaken');
    big.style.setProperty('--paper', paper);
    big.style.setProperty('--ribbon', ribbon);
    const image = el('img', 'gift-sticker');
    image.alt = prize?.name ?? 'Gouden sticker';
    image.src = prize ? urls.url(prize.png) : goldStickerUrl();
    image.draggable = false;
    const strips = [0, 1, 2].map((i) => {
      const strip = el('span', `gift-strip strip-${i}`);
      strip.append(el('span', 'gift-strip-ribbon'));
      return strip;
    });
    big.append(image, ...strips);
    const hint = el('div', 'gift-hint');
    const dots = Array.from({ length: TAPS_TO_OPEN }, () => el('span', 'tap-dot', '●'));
    hint.append(el('span', 'gift-finger', '👆'), ...dots);
    stage.replaceChildren(big, hint);

    let taps = 0;
    let revealed = false;
    big.addEventListener('click', (e) => {
      if (revealed) return;
      const strip = strips[taps];
      taps++;
      dots.forEach((d, i) => d.classList.toggle('done', i < taps));
      strip.classList.add('off');
      big.classList.remove('shake');
      void big.offsetWidth;
      big.classList.add('shake');
      snippets(big, e.clientX, e.clientY, paper);
      if (soundOn()) playRip();
      if (taps >= TAPS_TO_OPEN) {
        revealed = true;
        hint.remove();
        reveal(prize, ownedCount, big, image);
      }
    });
  }

  /** Papiersnippers vanaf de plek waar getikt is. */
  function snippets(parent: HTMLElement, clientX: number, clientY: number, color: string) {
    const rect = parent.getBoundingClientRect();
    const x = clientX ? clientX - rect.left : rect.width / 2;
    const y = clientY ? clientY - rect.top : rect.height / 2;
    for (let i = 0; i < 14; i++) {
      const bit = el('span', 'snippet');
      bit.style.left = `${x}px`;
      bit.style.top = `${y}px`;
      bit.style.background = color;
      bit.style.setProperty('--dx', `${(Math.random() - 0.5) * 320}px`);
      bit.style.setProperty('--dy', `${-60 - Math.random() * 220}px`);
      bit.style.setProperty('--rot', `${(Math.random() - 0.5) * 900}deg`);
      parent.append(bit);
      later(1200, () => bit.remove());
    }
  }

  /** Sticker tevoorschijn; nu wordt hij ook echt verdiend en opgeslagen. */
  async function reveal(prize: Sticker | undefined, ownedCount: number, big: HTMLElement, image: HTMLImageElement) {
    big.classList.add('revealed');
    spawnConfetti(screen, 50);
    if (soundOn()) playFanfare();
    const slot = slotFor(ownedCount);
    try {
      await updateRewards(deps.progress, deps.profile.id, claimGift);
      await saveAlbumEntry(deps.data, {
        profileId: deps.profile.id,
        stickerId: prize?.id ?? goldId(),
        earnedAt: new Date().toISOString(),
        ...slot,
      });
    } catch {
      // Opslaan mislukt: het kind ziet de sticker toch; het cadeautje blijft dan nog klaarstaan.
    }
    later(2600, () => fly(big, image));
    big.addEventListener('click', () => fly(big, image), { once: true });
  }

  let flying = false;
  function fly(big: HTMLElement, image: HTMLImageElement) {
    if (flying || stopped) return;
    flying = true;
    const from = image.getBoundingClientRect();
    const to = book.getBoundingClientRect();
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    if (soundOn()) playSparkle();
    const done = () => {
      flying = false;
      big.remove();
      void next();
    };
    if (typeof image.animate !== 'function') return done();
    const flight = image.animate(
      [
        { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.1) rotate(360deg)`, opacity: 0.9 },
      ],
      { duration: 900, easing: 'cubic-bezier(0.5, 0, 0.8, 0.4)', fill: 'forwards' },
    );
    flight.finished.then(
      () => {
        book.classList.add('bounce');
        later(500, () => book.classList.remove('bounce'));
        done();
      },
      () => done(),
    );
  }

  void next();
  return () => {
    stopped = true;
    for (const id of timers) clearTimeout(id);
    urls.revoke();
  };
}

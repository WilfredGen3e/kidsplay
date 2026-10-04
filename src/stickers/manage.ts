import { clampView, coverScale, zoomAround, type View } from '../games/puzzle/crop';
import { loadImage } from '../games/puzzle/image';
import type { GameData, Profile } from '../platform/types';
import { confirmDialog, el, iconButton, textButton } from '../ui/dom';
import { createUrlBag } from '../ui/urls';
import {
  BORDER_COLORS,
  FLIPPO_FRAME,
  FLIPPO_SIZE,
  fitCanvas,
  renderFlippo,
  rotateCanvas,
  toBlob,
} from './flippo';
import { canDelete } from './logic';
import { listAllAlbums, type AlbumEntry, listStickers, removeSticker, saveSticker, type FlippoCrop, type Sticker } from './model';

export interface StickerManageDeps {
  profiles: Profile[];
  data: GameData;
  back(): void;
}

const MAX_ZOOM = 4;
const PREVIEW_SIZE = 128;

/** Ouderscherm voor stickers: lijst met slepen om te ordenen, en de flippo-editor. */
export function manageStickers(root: HTMLElement, deps: StickerManageDeps): () => void {
  const urls = createUrlBag();

  async function showList() {
    const [stickers, album] = await Promise.all([listStickers(deps.data), listAllAlbums(deps.data)]);
    const screen = el('div', 'parent-screen');
    const head = el('header', 'parent-header');
    head.append(iconButton('⬅️', 'Terug', 'round-button', deps.back), el('h1', '', 'Stickers'));
    screen.append(head);

    const card = el('section', 'card');
    const bar = el('div', 'card-head');
    bar.append(el('h2', '', 'Stickers'), textButton('➕ Nieuwe sticker', 'btn btn-primary', () => void showEditor()));
    card.append(bar);
    if (stickers.length === 0) {
      card.append(el('p', 'muted', 'Nog geen stickers. Maak een ronde flippo van een plaatje; kinderen winnen ze met hun spaarpunten.'));
    } else {
      card.append(el('p', 'muted', 'Sleep aan ☰ om de volgorde te veranderen. Kinderen krijgen de stickers in deze volgorde (of willekeurig, per profiel in te stellen).'));
    }
    const list = el('div', 'sticker-list');
    for (const sticker of stickers) list.append(row(sticker, album));
    card.append(list);
    screen.append(card);
    root.replaceChildren(screen);
    enableReorder(list, stickers);
  }

  function row(sticker: Sticker, album: AlbumEntry[]): HTMLElement {
    const earnedBy = album.filter((e) => e.stickerId === sticker.id).length;
    const node = el('div', 'puzzle-row sticker-row');
    node.dataset.id = sticker.id;
    const handle = el('span', 'drag-handle', '☰');
    handle.setAttribute('aria-label', 'Slepen om te verplaatsen');
    const img = el('img', 'sticker-thumb');
    img.src = urls.url(sticker.png);
    img.alt = '';
    const info = el('div', 'row-info');
    const who = sticker.forProfile ? (deps.profiles.find((p) => p.id === sticker.forProfile)?.name ?? 'één kind') : 'iedereen';
    info.append(
      el('strong', '', `${sticker.rarity === 'special' ? '✨ ' : ''}${sticker.name}`),
      el('span', 'muted', `Voor ${who} · ${earnedBy === 0 ? 'nog niet verdiend' : `door ${earnedBy} ${earnedBy === 1 ? 'kind' : 'kinderen'} verdiend`}`),
    );
    const remove = textButton('🗑️', 'btn btn-danger', async () => {
      const ok = await confirmDialog(root, { icon: '🗑️', message: `Sticker "${sticker.name}" verwijderen?`, confirmLabel: 'Verwijderen' });
      if (!ok) return;
      await removeSticker(deps.data, sticker.id);
      await showList();
    });
    if (!canDelete(sticker.id, album)) {
      remove.disabled = true;
      remove.title = 'Al verdiend door een kind';
    }
    node.append(handle, img, info, textButton('✏️ Wijzig', 'btn', () => void showEditor(sticker)), remove);
    return node;
  }

  /** Slepen met pointer-events op `window` (zie LESSONS: pointer capture gaat verloren als het element verhuist). */
  function enableReorder(list: HTMLElement, stickers: Sticker[]) {
    list.querySelectorAll<HTMLElement>('.drag-handle').forEach((handle) => {
      handle.addEventListener('pointerdown', (down) => {
        down.preventDefault();
        const dragged = handle.closest<HTMLElement>('.sticker-row')!;
        dragged.classList.add('dragging');
        const move = (e: PointerEvent) => {
          const others = [...list.children].filter((c) => c !== dragged) as HTMLElement[];
          const before = others.find((c) => {
            const r = c.getBoundingClientRect();
            return e.clientY < r.top + r.height / 2;
          });
          if (before) list.insertBefore(dragged, before);
          else list.append(dragged);
        };
        const up = async () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
          dragged.classList.remove('dragging');
          const ids = [...list.children].map((c) => (c as HTMLElement).dataset.id);
          const byId = new Map(stickers.map((s) => [s.id, s]));
          await Promise.all(
            ids.map((id, order) => {
              const s = byId.get(id!)!;
              return s.order === order ? undefined : saveSticker(deps.data, { ...s, order });
            }),
          );
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      });
    });
  }

  async function showEditor(existing?: Sticker) {
    const screen = el('div', 'parent-screen');
    const head = el('header', 'parent-header');
    head.append(
      iconButton('⬅️', 'Terug', 'round-button', () => void showList()),
      el('h1', '', existing ? 'Sticker wijzigen' : 'Nieuwe sticker'),
    );
    screen.append(head);
    const card = el('section', 'card');

    // Toestand van de editor
    let source: HTMLCanvasElement | undefined; // origineel, maximaal 2048 px
    let sourceType: 'image/png' | 'image/jpeg' = 'image/jpeg';
    let rotation: FlippoCrop['rotation'] = 0;
    let rotated: HTMLCanvasElement | undefined;
    let view: View = { scale: 1, x: 0, y: 0 };
    let border: string | null = existing?.border ?? null;
    let glitter = existing?.glitter ?? false;
    let rarity: Sticker['rarity'] = existing?.rarity ?? 'normal';
    let forProfile: string | null = existing?.forProfile ?? null;
    const frame = { width: FLIPPO_FRAME, height: FLIPPO_FRAME };

    const message = el('p', 'muted');
    const editorArea = el('div', 'flippo-editor');

    // --- afbeelding kiezen
    const drop = el('label', 'dropzone');
    drop.append(el('span', 'dropzone-icon', '📷'), el('span', '', 'Sleep een plaatje hierheen of klik om te kiezen (JPG of PNG)'));
    const input = el('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,.jpg,.jpeg,.png';
    input.hidden = true;
    drop.append(input);
    drop.addEventListener('dragover', (e) => {
      e.preventDefault();
      drop.classList.add('over');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('over');
      const file = e.dataTransfer?.files[0];
      if (file) void useFile(file);
    });
    input.addEventListener('change', () => {
      if (input.files?.[0]) void useFile(input.files[0]);
    });

    async function useFile(file: File) {
      message.textContent = '';
      try {
        const img = await loadImage(file);
        source = fitCanvas(img);
        sourceType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      } catch {
        message.textContent = 'Dit plaatje kan niet worden gelezen. Probeer een JPG of PNG (een screenshot werkt altijd).';
        return;
      }
      if (!name.value) name.value = file.name.replace(/\.[^.]+$/, '');
      rotation = 0;
      resetView();
      buildEditor();
    }

    function resetView() {
      if (!source) return;
      rotated = rotateCanvas(source, rotation);
      const scale = coverScale(rotated.width, rotated.height, frame);
      view = clampView({ scale, x: (frame.width - rotated.width * scale) / 2, y: (frame.height - rotated.height * scale) / 2 }, rotated.width, rotated.height, frame);
    }

    // --- editor: kader met cirkel, zoom, draaien, rand, voorbeeld
    const previewCanvas = el('canvas', 'flippo-preview');
    previewCanvas.width = PREVIEW_SIZE;
    previewCanvas.height = PREVIEW_SIZE;
    let raf = 0;
    const updatePreview = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!rotated) return;
        const ctx = previewCanvas.getContext('2d')!;
        ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
        ctx.drawImage(renderFlippo(rotated, view, border, glitter, PREVIEW_SIZE), 0, 0);
      });
    };

    function buildEditor() {
      if (!rotated) return;
      const w = rotated.width;
      const h = rotated.height;
      const stage = el('div', 'flippo-stage');
      stage.style.width = `${frame.width}px`;
      stage.style.height = `${frame.height}px`;
      const pic = el('canvas', 'flippo-pic');
      pic.width = w;
      pic.height = h;
      pic.getContext('2d')!.drawImage(rotated, 0, 0);
      const mask = el('div', 'flippo-mask');
      const ring = el('div', 'flippo-ring');
      stage.append(pic, mask, ring);
      const apply = () => {
        pic.style.width = `${w * view.scale}px`;
        pic.style.height = `${h * view.scale}px`;
        pic.style.transform = `translate(${view.x}px, ${view.y}px)`;
        ring.style.borderColor = border ?? 'rgb(255 255 255 / 85%)';
        updatePreview();
      };

      const min = coverScale(w, h, frame);
      const zoom = el('input', 'zoom');
      zoom.type = 'range';
      zoom.min = String(min);
      zoom.max = String(min * MAX_ZOOM);
      zoom.step = String(min / 100);
      const setZoom = (scale: number) => {
        view = zoomAround(view, Math.min(min * MAX_ZOOM, Math.max(min, scale)), { x: frame.width / 2, y: frame.height / 2 }, w, h, frame);
        zoom.value = String(view.scale);
        apply();
      };
      zoom.value = String(view.scale);
      zoom.addEventListener('input', () => setZoom(Number(zoom.value)));

      let drag: { x: number; y: number; vx: number; vy: number } | undefined;
      stage.addEventListener('pointerdown', (e) => {
        stage.setPointerCapture(e.pointerId);
        drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
      });
      stage.addEventListener('pointermove', (e) => {
        if (!drag) return;
        view = clampView({ ...view, x: drag.vx + e.clientX - drag.x, y: drag.vy + e.clientY - drag.y }, w, h, frame);
        apply();
      });
      stage.addEventListener('pointerup', () => (drag = undefined));
      stage.addEventListener('pointercancel', () => (drag = undefined));
      // Knijpen op een trackpad komt als wheel met ctrlKey binnen; gewoon scrollen zoomt ook.
      stage.addEventListener(
        'wheel',
        (e) => {
          e.preventDefault();
          setZoom(view.scale * Math.exp(-e.deltaY * (e.ctrlKey ? 0.02 : 0.004)));
        },
        { passive: false },
      );
      // Safari/WebKit (ook de Mac-app) stuurt gesture-events voor knijpen.
      let gestureStart = view.scale;
      stage.addEventListener('gesturestart', (e) => {
        e.preventDefault();
        gestureStart = view.scale;
      });
      stage.addEventListener('gesturechange', (e) => {
        e.preventDefault();
        setZoom(gestureStart * ((e as unknown as { scale: number }).scale || 1));
      });

      const rotate = textButton('🔄 Draaien', 'btn', () => {
        rotation = ((rotation + 90) % 360) as FlippoCrop['rotation'];
        resetView();
        buildEditor();
      });
      const zoomRow = el('div', 'row');
      zoomRow.append(el('span', 'row-label', '🔍 Zoom'), zoom, rotate);

      const colors = el('div', 'chips');
      const mark = () => colors.querySelectorAll<HTMLElement>('.color-swatch').forEach((x) => x.classList.toggle('active', x.dataset.color === String(border)));
      for (const color of [null, ...BORDER_COLORS]) {
        const c = el('button', 'color-swatch');
        c.type = 'button';
        c.dataset.color = String(color);
        c.setAttribute('aria-label', color ?? 'Geen rand');
        if (color) c.style.background = color;
        else c.textContent = '🚫';
        c.addEventListener('click', () => {
          border = color;
          mark();
          apply();
        });
        colors.append(c);
      }
      mark();

      const glitterBox = el('input', 'switch');
      glitterBox.type = 'checkbox';
      glitterBox.checked = glitter;
      glitterBox.addEventListener('change', () => {
        glitter = glitterBox.checked;
        apply();
      });
      const glitterRow = el('label', 'row');
      glitterRow.append(el('span', 'row-label', '✨ Glitterrand'), glitterBox);

      const left = el('div', 'flippo-left');
      left.append(stage, zoomRow, el('p', 'muted', 'Sleep het plaatje op zijn plek, zoom met de schuifbalk of knijp op de trackpad.'));
      const right = el('div', 'flippo-right');
      right.append(el('h3', '', '🖼️ Zo ziet het kind hem'), previewCanvas, el('h3', '', '🎨 Rand'), colors, glitterRow);
      const layout = el('div', 'flippo-layout');
      layout.append(left, right);
      editorArea.replaceChildren(layout);
      apply();
    }

    // --- naam, zeldzaamheid, voor wie
    const name = el('input', 'text-input');
    name.type = 'text';
    name.placeholder = 'Naam van de sticker';
    name.maxLength = 30;
    name.value = existing?.name ?? '';
    const nameRow = el('label', 'row');
    nameRow.append(el('span', 'row-label', '🏷️ Naam'), name);

    const rarityBox = el('div', 'segmented');
    for (const [value, label] of [['normal', 'Gewoon'], ['special', '✨ Speciaal']] as const) {
      const b = textButton(label, `seg${rarity === value ? ' active' : ''}`, () => {
        rarity = value;
        rarityBox.querySelectorAll('.seg').forEach((x) => x.classList.toggle('active', x === b));
      });
      rarityBox.append(b);
    }
    const rarityRow = el('div', 'row');
    rarityRow.append(el('span', 'row-label', '💎 Zeldzaamheid'), rarityBox);

    const forBox = el('div', 'segmented');
    for (const [value, label] of [[null, '👨‍👩‍👧 Iedereen'], ...deps.profiles.map((p) => [p.id, p.name] as const)] as const) {
      const b = textButton(label, `seg${forProfile === value ? ' active' : ''}`, () => {
        forProfile = value;
        forBox.querySelectorAll('.seg').forEach((x) => x.classList.toggle('active', x === b));
      });
      forBox.append(b);
    }
    const forRow = el('div', 'row');
    forRow.append(el('span', 'row-label', '👧 Voor'), forBox);

    const error = el('p', 'error-text');
    const save = textButton('💾 Opslaan', 'btn btn-primary btn-big', async () => {
      error.textContent = '';
      if (!source || !rotated) return void (error.textContent = 'Kies eerst een plaatje.');
      if (!name.value.trim()) return void (error.textContent = 'Geef de sticker een naam.');
      save.disabled = true;
      try {
        const png = await toBlob(renderFlippo(rotated, view, border, glitter, FLIPPO_SIZE), 'image/png');
        const crop: FlippoCrop = { x: view.x, y: view.y, scale: view.scale, rotation };
        const sticker: Sticker = {
          id: existing?.id ?? `sticker-${Date.now().toString(36)}`,
          name: name.value.trim(),
          original: existing && source === loaded ? existing.original : await toBlob(source, sourceType),
          png,
          crop,
          border,
          glitter,
          rarity,
          forProfile,
          order: existing?.order ?? (await listStickers(deps.data)).length,
        };
        await saveSticker(deps.data, sticker);
        await showList();
      } catch {
        error.textContent = 'Opslaan is niet gelukt. Probeer het nog eens.';
        save.disabled = false;
      }
    });

    card.append(drop, message, editorArea, nameRow, rarityRow, forRow, error, save);
    screen.append(card);
    root.replaceChildren(screen);

    // Bestaande sticker: origineel en uitsnede terughalen.
    let loaded: HTMLCanvasElement | undefined;
    if (existing) {
      try {
        loaded = fitCanvas(await loadImage(existing.original));
        source = loaded;
        sourceType = existing.original.type === 'image/png' ? 'image/png' : 'image/jpeg';
        rotation = existing.crop.rotation;
        rotated = rotateCanvas(source, rotation);
        view = clampView({ scale: existing.crop.scale, x: existing.crop.x, y: existing.crop.y }, rotated.width, rotated.height, frame);
        buildEditor();
      } catch {
        message.textContent = 'Het originele plaatje kan niet worden gelezen. Kies een nieuw plaatje.';
      }
    }
  }

  void showList();
  return () => urls.revoke();
}

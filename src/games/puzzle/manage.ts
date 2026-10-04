import type { ManageContext, Profile } from '../../platform/types';
import { avatarNode, confirmDialog, el, iconButton, textButton } from '../../ui/dom';
import { ASPECTS, clampView, coverScale, cropFromView, zoomAround, type AspectName, type View } from './crop';
import { canvasToBlob, cropAndScale, loadImage, thumbnail } from './image';
import { MAX_PIECES, MIN_PIECES, allowedPieceCounts } from './grid';
import {
  DEFAULT_PIECE_OPTIONS,
  GAME_ID,
  listPuzzles,
  loadSettings,
  saveSettings,
  type Puzzle,
  type PuzzleSettings,
  type SnapSetting,
} from './model';

export function manage(root: HTMLElement, ctx: ManageContext): () => void {
  const urls: string[] = [];
  const url = (blob: Blob) => {
    const u = URL.createObjectURL(blob);
    urls.push(u);
    return u;
  };

  async function showList() {
    const [settings, puzzles] = await Promise.all([loadSettings(ctx.data), listPuzzles(ctx.data)]);
    const screen = el('div', 'parent-screen');
    screen.append(header('Fotopuzzel', ctx.back));

    // Moeilijkheid
    const diff = el('section', 'card');
    diff.append(el('h2', '', 'Moeilijkheid'));
    const snapRow = el('div', 'row');
    snapRow.append(el('span', 'row-label', '🧲 Vastklikafstand'));
    const seg = el('div', 'segmented');
    for (const option of ['ruim', 'normaal', 'krap'] as SnapSetting[]) {
      const b = textButton(option[0].toUpperCase() + option.slice(1), `seg${settings.snap === option ? ' active' : ''}`, async () => {
        settings.snap = option;
        await saveSettings(ctx.data, settings);
        seg.querySelectorAll('.seg').forEach((s) => s.classList.remove('active'));
        b.classList.add('active');
      });
      seg.append(b);
    }
    snapRow.append(seg);
    diff.append(snapRow);
    diff.append(
      toggleRow('🖼️ Voorbeeldplaatje tonen', settings, 'preview'),
      toggleRow('👻 Spookbeeld op het canvas', settings, 'ghost'),
      toggleRow('💡 Hulpknop', settings, 'hint'),
    );
    screen.append(diff);

    // Puzzels
    const list = el('section', 'card');
    const head = el('div', 'card-head');
    head.append(el('h2', '', 'Puzzels'), textButton('➕ Nieuwe puzzel', 'btn btn-primary', () => showEditor()));
    list.append(head);
    if (puzzles.length === 0) list.append(el('p', 'muted', 'Nog geen puzzels. Maak er een van een eigen foto.'));
    for (const puzzle of puzzles) {
      const row = el('div', 'puzzle-row');
      const img = el('img', 'row-thumb');
      img.src = url(puzzle.thumb);
      img.alt = '';
      const info = el('div', 'row-info');
      info.append(
        el('strong', '', puzzle.name),
        el('span', 'muted', `${puzzle.pieceOptions.join(', ')} stukjes · ${visibleSummary(puzzle, ctx.profiles)}`),
      );
      row.append(
        img,
        info,
        textButton('✏️ Wijzig', 'btn', () => showEditor(puzzle)),
        textButton('🗑️', 'btn btn-danger', async () => {
          const ok = await confirmDialog(root, {
            icon: '🗑️',
            message: `Puzzel "${puzzle.name}" verwijderen? De voortgang ervan blijft in de lijst staan.`,
            confirmLabel: 'Verwijderen',
          });
          if (!ok) return;
          await ctx.data.remove('puzzles', puzzle.id);
          await showList();
        }),
      );
      list.append(row);
    }
    screen.append(list);
    root.replaceChildren(screen);
  }

  function toggleRow<K extends 'preview' | 'ghost' | 'hint'>(label: string, settings: PuzzleSettings, key: K) {
    const row = el('label', 'row');
    const box = el('input', 'switch');
    box.type = 'checkbox';
    box.checked = settings[key];
    box.addEventListener('change', () => {
      settings[key] = box.checked;
      void saveSettings(ctx.data, settings);
    });
    row.append(el('span', 'row-label', label), box);
    return row;
  }

  function showEditor(existing?: Puzzle) {
    const screen = el('div', 'parent-screen');
    screen.append(header(existing ? 'Puzzel wijzigen' : 'Nieuwe puzzel', () => void showList()));

    const card = el('section', 'card');
    let img: HTMLImageElement | undefined;
    let aspect: AspectName = 'liggend';
    let view: View = { scale: 1, x: 0, y: 0 };
    let frame = { width: 560, height: 420 };
    const cropArea = el('div', 'crop-area');
    const message = el('p', 'muted');

    // --- foto kiezen (alleen bij een nieuwe puzzel)
    if (!existing) {
      const drop = el('label', 'dropzone');
      drop.append(el('span', 'dropzone-icon', '📷'), el('span', '', 'Sleep een foto hierheen of klik om te kiezen (JPG, PNG, HEIC)'));
      const input = el('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png';
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
      card.append(drop, message, cropArea);
    } else {
      const thumb = el('img', 'row-thumb big');
      thumb.src = url(existing.thumb);
      card.append(thumb);
    }

    async function useFile(file: File) {
      message.textContent = '';
      try {
        img = await loadImage(file);
      } catch {
        img = undefined;
        message.textContent = 'Deze foto kan niet worden gelezen. Probeer een JPG of PNG.';
        cropArea.replaceChildren();
        return;
      }
      if (!name.value) name.value = file.name.replace(/\.[^.]+$/, '');
      resetView();
      renderCrop();
    }

    function frameFor(a: AspectName) {
      const ratio = ASPECTS[a].ratio;
      return ratio >= 1 ? { width: 560, height: Math.round(560 / ratio) } : { width: Math.round(420 * ratio), height: 420 };
    }

    function resetView() {
      if (!img) return;
      frame = frameFor(aspect);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const scale = coverScale(w, h, frame);
      view = clampView({ scale, x: (frame.width - w * scale) / 2, y: (frame.height - h * scale) / 2 }, w, h, frame);
    }

    function renderCrop() {
      if (!img) return;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const box = el('div', 'crop-frame');
      box.style.width = `${frame.width}px`;
      box.style.height = `${frame.height}px`;
      const pic = el('img', 'crop-img');
      pic.draggable = false;
      const apply = () => {
        pic.style.width = `${w * view.scale}px`;
        pic.style.height = `${h * view.scale}px`;
        pic.style.transform = `translate(${view.x}px, ${view.y}px)`;
      };
      // Het origineel blijft in het geheugen; de weergave gebruikt een eigen URL.
      const src = urlOfImage(img);
      pic.src = src;
      apply();
      box.append(pic);

      let drag: { x: number; y: number; vx: number; vy: number } | undefined;
      box.addEventListener('pointerdown', (e) => {
        box.setPointerCapture(e.pointerId);
        drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
      });
      box.addEventListener('pointermove', (e) => {
        if (!drag) return;
        view = clampView({ ...view, x: drag.vx + e.clientX - drag.x, y: drag.vy + e.clientY - drag.y }, w, h, frame);
        apply();
      });
      box.addEventListener('pointerup', () => (drag = undefined));

      const min = coverScale(w, h, frame);
      const zoom = el('input', 'zoom');
      zoom.type = 'range';
      zoom.min = String(min);
      zoom.max = String(min * 4);
      zoom.step = String(min / 100);
      zoom.value = String(view.scale);
      const setZoom = (scale: number) => {
        view = zoomAround(view, Math.min(min * 4, Math.max(min, scale)), { x: frame.width / 2, y: frame.height / 2 }, w, h, frame);
        zoom.value = String(view.scale);
        apply();
      };
      zoom.addEventListener('input', () => setZoom(Number(zoom.value)));
      box.addEventListener('wheel', (e) => {
        e.preventDefault();
        setZoom(view.scale * Math.exp(-e.deltaY * 0.01));
      }, { passive: false });

      const aspects = el('div', 'segmented');
      for (const key of Object.keys(ASPECTS) as AspectName[]) {
        aspects.append(
          textButton(`${ASPECTS[key].icon} ${key[0].toUpperCase()}${key.slice(1)}`, `seg${key === aspect ? ' active' : ''}`, () => {
            aspect = key;
            resetView();
            renderCrop();
          }),
        );
      }
      const controls = el('div', 'row');
      controls.append(el('span', 'row-label', '🔍 Zoom'), zoom);
      cropArea.replaceChildren(aspects, box, controls, el('p', 'muted', 'Sleep de foto en zoom tot het belangrijke deel in beeld is.'));
    }

    // --- naam, aantallen, zichtbaarheid
    const name = el('input', 'text-input');
    name.type = 'text';
    name.placeholder = 'Naam van de puzzel';
    name.value = existing?.name ?? '';
    const nameRow = el('label', 'row');
    nameRow.append(el('span', 'row-label', '🏷️ Naam'), name);

    const counts = new Set(existing?.pieceOptions ?? DEFAULT_PIECE_OPTIONS);
    const countsBox = el('div', 'chips');
    for (const n of allowedPieceCounts()) {
      const chip = textButton(String(n), `chip${counts.has(n) ? ' active' : ''}`, () => {
        if (counts.has(n)) counts.delete(n);
        else counts.add(n);
        chip.classList.toggle('active', counts.has(n));
      });
      countsBox.append(chip);
    }

    const visible = existing ? (existing.visibleFor === 'all' ? new Set(ctx.profiles.map((p) => p.id)) : new Set(existing.visibleFor)) : new Set(ctx.profiles.map((p) => p.id));
    const visBox = el('div', 'chips');
    for (const profile of ctx.profiles) {
      const chip = el('button', `chip chip-profile${visible.has(profile.id) ? ' active' : ''}`);
      chip.type = 'button';
      chip.append(avatarNode(profile.avatar, 'chip-avatar'), el('span', '', profile.name));
      chip.addEventListener('click', () => {
        if (visible.has(profile.id)) visible.delete(profile.id);
        else visible.add(profile.id);
        chip.classList.toggle('active', visible.has(profile.id));
      });
      visBox.append(chip);
    }

    const error = el('p', 'error-text');
    const save = textButton('💾 Opslaan', 'btn btn-primary btn-big', async () => {
      error.textContent = '';
      if (!name.value.trim()) return void (error.textContent = 'Geef de puzzel een naam.');
      if (counts.size === 0) return void (error.textContent = `Kies minstens één aantal stukjes (${MIN_PIECES}–${MAX_PIECES}).`);
      if (!existing && !img) return void (error.textContent = 'Kies eerst een foto.');
      save.disabled = true;
      try {
        const pieceOptions = [...counts].sort((a, b) => a - b);
        const visibleFor = ctx.profiles.length > 0 && ctx.profiles.every((p) => visible.has(p.id)) ? 'all' : [...visible];
        let puzzle: Puzzle;
        if (existing) {
          puzzle = { ...existing, name: name.value.trim(), pieceOptions, visibleFor };
        } else {
          const cropped = cropAndScale(img!, cropFromView(view, img!.naturalWidth, img!.naturalHeight, frame));
          puzzle = {
            id: `${GAME_ID}-${Date.now().toString(36)}`,
            name: name.value.trim(),
            image: await canvasToBlob(cropped),
            thumb: await canvasToBlob(thumbnail(cropped)),
            pieceOptions,
            visibleFor,
            createdAt: new Date().toISOString(),
          };
        }
        await ctx.data.put('puzzles', puzzle.id, puzzle);
        await showList();
      } catch {
        error.textContent = 'Opslaan is niet gelukt. Probeer het nog eens.';
        save.disabled = false;
      }
    });

    card.append(
      nameRow,
      el('h3', '', '🧩 Aantal stukjes om uit te kiezen'),
      countsBox,
      el('h3', '', '👧 Zichtbaar voor'),
      visBox,
      error,
      save,
    );
    screen.append(card);
    root.replaceChildren(screen);
  }

  const imageUrls = new WeakMap<HTMLImageElement, string>();
  function urlOfImage(image: HTMLImageElement): string {
    // loadImage geeft al een geladen element; maak een eigen kopie als URL voor de weergave.
    let u = imageUrls.get(image);
    if (!u) {
      const canvas = document.createElement('canvas');
      const k = Math.min(1, 1600 / image.naturalWidth);
      canvas.width = Math.round(image.naturalWidth * k);
      canvas.height = Math.round(image.naturalHeight * k);
      canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
      u = canvas.toDataURL('image/jpeg', 0.85);
      imageUrls.set(image, u);
    }
    return u;
  }

  void showList();
  return () => {
    for (const u of urls) URL.revokeObjectURL(u);
  };
}

function header(title: string, onBack: () => void): HTMLElement {
  const h = el('header', 'parent-header');
  h.append(iconButton('⬅️', 'Terug', 'round-button', onBack), el('h1', '', title));
  return h;
}

function visibleSummary(puzzle: Puzzle, profiles: Profile[]): string {
  if (puzzle.visibleFor === 'all') return 'iedereen';
  const names = profiles.filter((p) => (puzzle.visibleFor as string[]).includes(p.id)).map((p) => p.name);
  return names.length > 0 ? names.join(', ') : 'niemand';
}

import type { ManageContext, Profile } from '../../platform/types';
import { avatarNode, confirmDialog, el, parentHeader as header, textButton } from '../../ui/dom';
import { showCodeEntry, showLibrary } from './library-ui';
import { NO_IMAGE_ON_CLIPBOARD, createCropper, readClipboardImage, type Cropper } from './cropper';
import { canvasToBlob, thumbnail } from './image';
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
    head.append(
      el('h2', '', 'Puzzels'),
      textButton('📋 Foto plakken', 'btn btn-primary', async () => {
        // Kopieer eerst een foto (bijvoorbeeld in Safari); deze knop maakt er meteen een puzzel van.
        let image: Blob | undefined;
        try {
          image = await readClipboardImage();
        } catch {
          // geen toestemming: de editor toont dan het plakvak
        }
        showEditor(undefined, image, !image);
      }),
      textButton('➕ Nieuwe puzzel', 'btn', () => showEditor()),
    );
    list.append(head);
    const back = () => void showList();
    const shared = el('div', 'row');
    shared.append(
      textButton('📚 Bibliotheek', 'btn', () => showLibrary(root, ctx, back)),
      textButton('🔢 Code invoeren', 'btn', () => showCodeEntry(root, ctx, back)),
    );
    list.append(shared);
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

  function showEditor(existing?: Puzzle, pasted?: Blob, noImage = false) {
    const screen = el('div', 'parent-screen');
    screen.append(header(existing ? 'Puzzel wijzigen' : 'Nieuwe puzzel', () => void showList()));

    const card = el('section', 'card');
    let cropper: Cropper | undefined;

    // --- foto kiezen (alleen bij een nieuwe puzzel)
    if (!existing) {
      cropper = createCropper((fileName) => {
        if (!name.value) name.value = fileName;
      });
      card.append(cropper.element);
      if (pasted) void cropper.load(pasted);
      else if (noImage) cropper.notice(NO_IMAGE_ON_CLIPBOARD);
    } else {
      const thumb = el('img', 'row-thumb big');
      thumb.src = url(existing.thumb);
      card.append(thumb);
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
      if (!existing && !cropper?.hasImage()) return void (error.textContent = 'Kies eerst een foto.');
      save.disabled = true;
      try {
        const pieceOptions = [...counts].sort((a, b) => a - b);
        const visibleFor = ctx.profiles.length > 0 && ctx.profiles.every((p) => visible.has(p.id)) ? 'all' : [...visible];
        let puzzle: Puzzle;
        if (existing) {
          puzzle = { ...existing, name: name.value.trim(), pieceOptions, visibleFor };
        } else {
          const cropped = cropper!.result();
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

  void showList();
  return () => {
    for (const u of urls) URL.revokeObjectURL(u);
  };
}

function visibleSummary(puzzle: Puzzle, profiles: Profile[]): string {
  if (puzzle.visibleFor === 'all') return 'iedereen';
  const names = profiles.filter((p) => (puzzle.visibleFor as string[]).includes(p.id)).map((p) => p.name);
  return names.length > 0 ? names.join(', ') : 'niemand';
}

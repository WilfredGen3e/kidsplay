import { el, iconButton } from '../../ui/dom';
import { buildPieces, computeGrid } from './grid';
import { clampToStage, fitScale } from './layout';
import type { PuzzleSnapshot } from './progress';
import { generateEdges, shapeMetrics, sliceJigsaw } from './shapes';
import { playClick } from './sound';
import { applyDrop, snapDistance, type SnapPiece } from './snap';

const TRAY_WIDTH = 168;
const TRAY_ITEM = 120;
const LIFT_SCALE = 1.05;
const DRAG_THRESHOLD = 5;
const SNAP_ANIMATION_MS = 120;

interface PieceState extends SnapPiece {
  el: HTMLCanvasElement;
  where: 'tray' | 'stage';
}

export interface PuzzleOptions {
  puzzleId: string;
  image: HTMLCanvasElement;
  pieces: number;
  drawerSide: 'left' | 'right';
  soundOn: boolean;
  /** Factor op de snap-afstand: ruim > 1, krap < 1. */
  snapFactor?: number;
  /** Aangeroepen zodra het laatste stuk vastklikt, met de speeltijd sinds het eerste opgepakte stuk. */
  onComplete?: (timeMs: number) => void;
  /** Aangeroepen met het aantal stukjes dat net voor het eerst is vastgeklikt (voor de spaarpunten). */
  onLock?: (count: number) => void;
  /** Hervat vanaf deze tussenstand (die moet kloppen met `pieces`). */
  restore?: PuzzleSnapshot;
  /** Aangeroepen na elke zet, zodat de tussenstand bewaard kan worden. */
  onProgress?: (snapshot: PuzzleSnapshot) => void;
  /** Voorbeeldplaatje beschikbaar (aan/uit te zetten door het kind). */
  preview?: boolean;
  /** Spookbeeld van de foto zacht op het canvas. */
  ghost?: boolean;
  /** Hulpknop die laat oplichten waar een stukje hoort. */
  hint?: boolean;
}

function scaledCopy(source: HTMLCanvasElement, maxWidth: number): HTMLCanvasElement {
  const k = Math.min(1, maxWidth / source.width);
  const copy = document.createElement('canvas');
  copy.width = Math.round(source.width * k);
  copy.height = Math.round(source.height * k);
  copy.getContext('2d')!.drawImage(source, 0, 0, copy.width, copy.height);
  return copy;
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Bouwt lade, canvas en sleep-gedrag in `root`; geeft een opruimfunctie terug. */
export function mountPuzzle(root: HTMLElement, opts: PuzzleOptions): () => void {
  const { image } = opts;
  const grid = computeGrid(opts.pieces, image.width, image.height);
  const infos = buildPieces(grid, image.width, image.height);
  const metrics = shapeMetrics(image.width, image.height, grid);
  const margin = metrics.margin;
  const edges = generateEdges(grid, `${opts.puzzleId}:${opts.pieces}`);
  const bitmaps = sliceJigsaw(image, infos, grid, edges, metrics);

  const wrap = el('div', `puzzle puzzle-${opts.drawerSide}`);
  const trayPanel = el('div', 'tray-panel');
  trayPanel.style.width = `${TRAY_WIDTH}px`;
  const trayHead = el('div', 'tray-head');
  const tray = el('div', 'tray');
  // Scrollen met een trackpad is lastig voor jonge kinderen: pijlen boven en onder de lade.
  const scrollStep = () => (TRAY_ITEM + 16) * 2;
  const upButton = iconButton('⬆️', 'Omhoog', 'tool-button tray-arrow', () =>
    tray.scrollBy({ top: -scrollStep(), behavior: 'smooth' }),
  );
  const downButton = iconButton('⬇️', 'Omlaag', 'tool-button tray-arrow', () =>
    tray.scrollBy({ top: scrollStep(), behavior: 'smooth' }),
  );
  trayPanel.append(trayHead, upButton, tray, downButton);
  const stage = el('div', 'stage');
  const board = el('div', 'board');
  stage.append(board);
  wrap.append(trayPanel, stage);

  if (opts.ghost) {
    const ghost = scaledCopy(image, 1024);
    ghost.className = 'ghost';
    board.append(ghost);
  }

  // Voorbeeld en hulpknop staan boven de lade, zodat ze nooit over het canvas of de stukjes liggen.
  const tools = el('div', 'tray-tools');
  let previewCard: HTMLElement | undefined;
  if (opts.preview) {
    previewCard = el('div', 'preview-card');
    previewCard.append(scaledCopy(image, 320));
    tools.append(iconButton('🖼️', 'Voorbeeld', 'tool-button', () => previewCard!.classList.toggle('hidden')));
  }
  if (opts.hint) {
    tools.append(iconButton('💡', 'Hulp', 'tool-button', () => showHint()));
  }
  if (tools.children.length > 0) trayHead.append(tools);
  if (previewCard) trayHead.append(previewCard);
  root.replaceChildren(wrap);

  // Geïndexeerd op stuk-id (evaluateDrop rekent daarmee).
  const pieces: PieceState[] = infos.map((info) => {
    const canvas = bitmaps.get(info.id)!;
    canvas.className = 'piece';
    canvas.dataset.id = String(info.id);
    canvas.dataset.col = String(info.col);
    canvas.dataset.row = String(info.row);
    return { info, el: canvas, where: 'tray', x: 0, y: 0, locked: false, group: info.id };
  });

  // Positie en schaal van het canvas in het speelvlak; stukken staan in afbeeldingspixels.
  let scale = 1;
  let boardLeft = 0;
  let boardTop = 0;
  let z = 1;
  let startedAt: number | undefined;
  let completed = false;
  const elapsedBefore = opts.restore?.elapsedMs ?? 0;
  const elapsed = () => elapsedBefore + (startedAt === undefined ? 0 : performance.now() - startedAt);
  let selected: PieceState | undefined;
  let lastTouched: PieceState | undefined;

  const groupOf = (p: PieceState) => (p.where === 'tray' ? [p] : pieces.filter((q) => q.group === p.group));

  function setTraySize(p: PieceState) {
    const w = p.info.rect.width + 2 * margin;
    const h = p.info.rect.height + 2 * margin;
    const k = TRAY_ITEM / Math.max(w, h);
    p.el.style.width = `${w * k}px`;
    p.el.style.height = `${h * k}px`;
    p.el.style.transform = '';
  }

  function setBoardSize(p: PieceState) {
    p.el.style.width = `${(p.info.rect.width + 2 * margin) * scale}px`;
    p.el.style.height = `${(p.info.rect.height + 2 * margin) * scale}px`;
  }

  function render(p: PieceState) {
    if (p.where !== 'stage') return;
    const lift = p.el.classList.contains('dragging') && groupOf(p).length === 1;
    p.el.style.transform = `translate(${boardLeft + (p.x - margin) * scale}px, ${boardTop + (p.y - margin) * scale}px)${lift ? ` scale(${LIFT_SCALE})` : ''}`;
  }

  function layout() {
    const rect = stage.getBoundingClientRect();
    scale = fitScale(rect.width, rect.height, image.width, image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    boardLeft = (rect.width - w) / 2;
    boardTop = (rect.height - h) / 2;
    board.style.width = `${w}px`;
    board.style.height = `${h}px`;
    board.style.left = `${boardLeft}px`;
    board.style.top = `${boardTop}px`;
    for (const p of pieces) {
      if (p.where !== 'stage') continue;
      setBoardSize(p);
      render(p);
    }
  }

  function snapshot(): PuzzleSnapshot {
    const byEl = new Map<Element, PieceState>(pieces.map((p) => [p.el, p]));
    return {
      puzzleId: opts.puzzleId,
      pieces: opts.pieces,
      elapsedMs: elapsed(),
      state: pieces.map((p) => ({ id: p.info.id, where: p.where, x: p.x, y: p.y, locked: p.locked, group: p.group })),
      trayOrder: [...tray.children].map((c) => byEl.get(c)!.info.id),
    };
  }

  function toTray(p: PieceState) {
    p.where = 'tray';
    p.el.classList.remove('loose', 'dragging');
    setTraySize(p);
    tray.append(p.el);
    opts.onProgress?.(snapshot());
  }

  function lift(members: PieceState[]) {
    startedAt ??= performance.now();
    for (const m of members) {
      m.where = 'stage';
      m.el.classList.add('dragging');
      m.el.style.zIndex = String(++z);
      setBoardSize(m);
      stage.append(m.el);
    }
  }

  /** Legt de groep neer: houdt hem in beeld en laat hem eventueel vastklikken. */
  function settle(p: PieceState) {
    const s = stage.getBoundingClientRect();
    const c = clampToStage(
      boardLeft + p.x * scale,
      boardTop + p.y * scale,
      p.info.rect.width * scale,
      p.info.rect.height * scale,
      s.width,
      s.height,
    );
    const dx = (c.x - boardLeft) / scale - p.x;
    const dy = (c.y - boardTop) / scale - p.y;
    for (const m of groupOf(p)) {
      m.x += dx;
      m.y += dy;
      m.el.classList.remove('dragging');
      m.el.classList.add('loose');
    }

    const dist = snapDistance((image.width / grid.cols) * scale, opts.snapFactor) / scale;
    const lockedBefore = new Set(pieces.filter((m) => m.locked));
    const { changed, locked } = applyDrop(pieces, grid, p.group, dist);
    for (const m of changed) {
      m.el.classList.add('snapping');
      setTimeout(() => m.el.classList.remove('snapping'), SNAP_ANIMATION_MS + 40);
      if (m.locked) {
        m.el.classList.remove('loose');
        m.el.classList.add('locked');
        m.el.style.zIndex = '0';
      }
    }
    for (const m of pieces) render(m);
    if (locked && opts.soundOn) playClick();
    // Een vergrendeld stuk ontgrendelt nooit; hersteld uit een tussenstand telt dus niet nog eens mee.
    const newlyLocked = pieces.filter((m) => m.locked && !lockedBefore.has(m)).length;
    if (newlyLocked > 0) opts.onLock?.(newlyLocked);
    if (!completed && pieces.every((m) => m.locked)) {
      completed = true;
      opts.onComplete?.(elapsed());
    } else {
      opts.onProgress?.(snapshot());
    }
  }

  /** Laat kort oplichten waar het gekozen (of laatst gepakte) stukje hoort. */
  function showHint() {
    const target =
      selected ??
      (lastTouched && !lastTouched.locked ? lastTouched : undefined) ??
      pieces.find((p) => !p.locked && p.where === 'tray') ??
      pieces.find((p) => !p.locked);
    if (!target) return;
    const flash = el('div', 'hint-flash');
    flash.style.left = `${boardLeft + target.info.rect.x * scale}px`;
    flash.style.top = `${boardTop + target.info.rect.y * scale}px`;
    flash.style.width = `${target.info.rect.width * scale}px`;
    flash.style.height = `${target.info.rect.height * scale}px`;
    stage.append(flash);
    setTimeout(() => flash.remove(), 1800);
  }

  function select(p: PieceState | undefined) {
    selected?.el.classList.remove('selected');
    selected = p;
    p?.el.classList.add('selected');
  }

  function attachDrag(p: PieceState) {
    p.el.addEventListener('pointerdown', (down) => {
      if (p.locked) return;
      down.preventDefault();
      const start = p.el.getBoundingClientRect();
      // Greep als fractie van het stuk: blijft kloppen als het stuk van maat wisselt.
      const fx = (down.clientX - start.left) / start.width;
      const fy = (down.clientY - start.top) / start.height;
      // Een stuk uit de lade wisselt van maat en volgt de aanwijzer; een stuk op het canvas schuift mee.
      const fromTray = p.where === 'tray';
      let members: PieceState[] = [];
      let origin: { x: number; y: number }[] = [];
      let lifted = false;
      lastTouched = p;

      const move = (e: PointerEvent) => {
        if (!lifted) {
          if (Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) < DRAG_THRESHOLD) return;
          lifted = true;
          select(undefined);
          members = groupOf(p);
          origin = members.map((m) => ({ x: m.x, y: m.y }));
          lift(members);
        }
        if (fromTray) {
          const s = stage.getBoundingClientRect();
          p.x = (e.clientX - s.left - boardLeft) / scale - fx * (p.info.rect.width + 2 * margin) + margin;
          p.y = (e.clientY - s.top - boardTop) / scale - fy * (p.info.rect.height + 2 * margin) + margin;
        } else {
          const dx = (e.clientX - down.clientX) / scale;
          const dy = (e.clientY - down.clientY) / scale;
          members.forEach((m, i) => {
            m.x = origin[i].x + dx;
            m.y = origin[i].y + dy;
          });
        }
        members.forEach(render);
      };

      const up = (e: PointerEvent) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        if (!lifted) {
          if (p.where === 'tray') select(selected === p ? undefined : p);
          return;
        }
        const t = trayPanel.getBoundingClientRect();
        const overTray = e.clientX >= t.left && e.clientX <= t.right && e.clientY >= t.top && e.clientY <= t.bottom;
        if (overTray && members.length === 1) toTray(p);
        else settle(p);
      };

      // Op window, niet op het stuk: bij het optillen verhuist het element naar het speelvlak en dan
      // vervalt de pointer capture, waardoor loslaten boven iets anders het stuk 'vast' liet zitten.
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
  }

  // Klikken in plaats van slepen: kies een stuk in de lade en klik daarna op het canvas.
  stage.addEventListener('click', (e) => {
    if (!selected || (e.target !== stage && e.target !== board)) return;
    const p = selected;
    select(undefined);
    const s = stage.getBoundingClientRect();
    p.x = (e.clientX - s.left - boardLeft) / scale - p.info.rect.width / 2;
    p.y = (e.clientY - s.top - boardTop) / scale - p.info.rect.height / 2;
    lift([p]);
    settle(p);
  });

  const restore = opts.restore;
  const trayOrder = restore ? restore.trayOrder.map((id) => pieces[id]) : shuffled(pieces);
  for (const p of trayOrder) {
    setTraySize(p);
    tray.append(p.el);
  }
  for (const saved of restore?.state ?? []) {
    if (saved.where !== 'stage') continue;
    const p = pieces[saved.id];
    Object.assign(p, { where: 'stage', x: saved.x, y: saved.y, locked: saved.locked, group: saved.group });
    p.el.classList.add(saved.locked ? 'locked' : 'loose');
    p.el.style.zIndex = saved.locked ? '0' : String(++z);
    stage.append(p.el);
  }
  for (const p of pieces) attachDrag(p);

  layout();
  window.addEventListener('resize', layout);
  return () => {
    window.removeEventListener('resize', layout);
    root.replaceChildren();
  };
}

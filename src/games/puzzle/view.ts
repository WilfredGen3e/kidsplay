import { el } from '../../ui/dom';
import { buildPieces, computeGrid } from './grid';
import { sliceRectangular } from './image';
import { clampToStage, fitScale } from './layout';
import type { PuzzleSnapshot } from './progress';
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
  /** Hervat vanaf deze tussenstand (die moet kloppen met `pieces`). */
  restore?: PuzzleSnapshot;
  /** Aangeroepen na elke zet, zodat de tussenstand bewaard kan worden. */
  onProgress?: (snapshot: PuzzleSnapshot) => void;
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
  const bitmaps = sliceRectangular(image, infos);

  const wrap = el('div', `puzzle puzzle-${opts.drawerSide}`);
  const tray = el('div', 'tray');
  tray.style.width = `${TRAY_WIDTH}px`;
  const stage = el('div', 'stage');
  const board = el('div', 'board');
  stage.append(board);
  wrap.append(tray, stage);
  root.replaceChildren(wrap);

  // Geïndexeerd op stuk-id (evaluateDrop rekent daarmee).
  const pieces: PieceState[] = infos.map((info) => {
    const canvas = bitmaps.get(info.id)!;
    canvas.className = 'piece';
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

  const groupOf = (p: PieceState) => (p.where === 'tray' ? [p] : pieces.filter((q) => q.group === p.group));

  function setTraySize(p: PieceState) {
    const k = TRAY_ITEM / Math.max(p.info.rect.width, p.info.rect.height);
    p.el.style.width = `${p.info.rect.width * k}px`;
    p.el.style.height = `${p.info.rect.height * k}px`;
    p.el.style.transform = '';
  }

  function setBoardSize(p: PieceState) {
    p.el.style.width = `${p.info.rect.width * scale}px`;
    p.el.style.height = `${p.info.rect.height * scale}px`;
  }

  function render(p: PieceState) {
    if (p.where !== 'stage') return;
    const lift = p.el.classList.contains('dragging') && groupOf(p).length === 1;
    p.el.style.transform = `translate(${boardLeft + p.x * scale}px, ${boardTop + p.y * scale}px)${lift ? ` scale(${LIFT_SCALE})` : ''}`;
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
    if (!completed && pieces.every((m) => m.locked)) {
      completed = true;
      opts.onComplete?.(elapsed());
    } else {
      opts.onProgress?.(snapshot());
    }
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
      p.el.setPointerCapture(down.pointerId);
      const start = p.el.getBoundingClientRect();
      // Greep als fractie van het stuk: blijft kloppen als het stuk van maat wisselt.
      const fx = (down.clientX - start.left) / start.width;
      const fy = (down.clientY - start.top) / start.height;
      // Een stuk uit de lade wisselt van maat en volgt de aanwijzer; een stuk op het canvas schuift mee.
      const fromTray = p.where === 'tray';
      let members: PieceState[] = [];
      let origin: { x: number; y: number }[] = [];
      let lifted = false;

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
          p.x = (e.clientX - s.left - boardLeft) / scale - fx * p.info.rect.width;
          p.y = (e.clientY - s.top - boardTop) / scale - fy * p.info.rect.height;
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
        p.el.removeEventListener('pointermove', move);
        p.el.removeEventListener('pointerup', up);
        p.el.removeEventListener('pointercancel', up);
        if (!lifted) {
          if (p.where === 'tray') select(selected === p ? undefined : p);
          return;
        }
        const t = tray.getBoundingClientRect();
        const overTray = e.clientX >= t.left && e.clientX <= t.right && e.clientY >= t.top && e.clientY <= t.bottom;
        if (overTray && members.length === 1) toTray(p);
        else settle(p);
      };

      p.el.addEventListener('pointermove', move);
      p.el.addEventListener('pointerup', up);
      p.el.addEventListener('pointercancel', up);
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

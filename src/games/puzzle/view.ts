import { el } from '../../ui/dom';
import { buildPieces, computeGrid, type PieceInfo } from './grid';
import { sliceRectangular } from './image';
import { clampToStage, fitScale } from './layout';

const TRAY_WIDTH = 168;
const TRAY_ITEM = 120;
const LIFT_SCALE = 1.05;
const DRAG_THRESHOLD = 5;

interface PieceState {
  info: PieceInfo;
  el: HTMLCanvasElement;
  where: 'tray' | 'loose';
  x: number;
  y: number;
}

export interface PuzzleOptions {
  image: HTMLCanvasElement;
  pieces: number;
  drawerSide: 'left' | 'right';
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

  const pieces: PieceState[] = infos.map((info) => {
    const canvas = bitmaps.get(info.id)!;
    canvas.className = 'piece';
    return { info, el: canvas, where: 'tray', x: 0, y: 0 };
  });

  let scale = 1;
  let z = 1;
  let selected: PieceState | undefined;

  const boardSize = () => ({ w: image.width * scale, h: image.height * scale });
  const sizeOnBoard = (p: PieceState) => ({ w: p.info.rect.width * scale, h: p.info.rect.height * scale });

  function setTraySize(p: PieceState) {
    const k = TRAY_ITEM / Math.max(p.info.rect.width, p.info.rect.height);
    p.el.style.width = `${p.info.rect.width * k}px`;
    p.el.style.height = `${p.info.rect.height * k}px`;
    p.el.style.transform = '';
  }

  function setBoardSize(p: PieceState) {
    const { w, h } = sizeOnBoard(p);
    p.el.style.width = `${w}px`;
    p.el.style.height = `${h}px`;
  }

  function place(p: PieceState, x: number, y: number, lift = false) {
    p.x = x;
    p.y = y;
    p.el.style.transform = `translate(${x}px, ${y}px)${lift ? ` scale(${LIFT_SCALE})` : ''}`;
  }

  function layout() {
    const rect = stage.getBoundingClientRect();
    scale = fitScale(rect.width, rect.height, image.width, image.height);
    const { w, h } = boardSize();
    board.style.width = `${w}px`;
    board.style.height = `${h}px`;
    board.style.left = `${(rect.width - w) / 2}px`;
    board.style.top = `${(rect.height - h) / 2}px`;
    for (const p of pieces) if (p.where === 'loose') setBoardSize(p);
  }

  function toTray(p: PieceState) {
    p.where = 'tray';
    p.el.classList.remove('loose', 'dragging');
    setTraySize(p);
    tray.append(p.el);
  }

  function toStage(p: PieceState, x: number, y: number) {
    const rect = stage.getBoundingClientRect();
    const { w, h } = sizeOnBoard(p);
    const pos = clampToStage(x, y, w, h, rect.width, rect.height);
    p.where = 'loose';
    p.el.classList.add('loose');
    p.el.classList.remove('dragging');
    p.el.style.zIndex = String(++z);
    setBoardSize(p);
    stage.append(p.el);
    place(p, pos.x, pos.y);
  }

  function select(p: PieceState | undefined) {
    selected?.el.classList.remove('selected');
    selected = p;
    p?.el.classList.add('selected');
  }

  for (const p of shuffled(pieces)) {
    setTraySize(p);
    tray.append(p.el);
    attachDrag(p);
  }

  function attachDrag(p: PieceState) {
    p.el.addEventListener('pointerdown', (down) => {
      down.preventDefault();
      p.el.setPointerCapture(down.pointerId);
      const start = p.el.getBoundingClientRect();
      // Positie van de greep binnen het stuk, als fractie: blijft kloppen als het stuk van maat wisselt.
      const fx = (down.clientX - start.left) / start.width;
      const fy = (down.clientY - start.top) / start.height;
      let lifted = false;

      const follow = (e: PointerEvent) => {
        const s = stage.getBoundingClientRect();
        const { w, h } = sizeOnBoard(p);
        place(p, e.clientX - s.left - fx * w, e.clientY - s.top - fy * h, true);
      };

      const move = (e: PointerEvent) => {
        if (!lifted) {
          if (Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) < DRAG_THRESHOLD) return;
          lifted = true;
          select(undefined);
          p.where = 'loose';
          p.el.classList.add('dragging');
          p.el.style.zIndex = String(++z);
          setBoardSize(p);
          stage.append(p.el);
        }
        follow(e);
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
        if (overTray) toTray(p);
        else toStage(p, p.x, p.y);
      };

      p.el.addEventListener('pointermove', move);
      p.el.addEventListener('pointerup', up);
      p.el.addEventListener('pointercancel', up);
    });
  }

  // Klikken in plaats van slepen: kies een stuk in de lade en klik daarna op het canvas.
  stage.addEventListener('click', (e) => {
    if (!selected || (e.target !== stage && e.target !== board)) return;
    const s = stage.getBoundingClientRect();
    const { w, h } = sizeOnBoard(selected);
    const p = selected;
    select(undefined);
    toStage(p, e.clientX - s.left - w / 2, e.clientY - s.top - h / 2);
  });

  layout();
  window.addEventListener('resize', layout);
  return () => {
    window.removeEventListener('resize', layout);
    root.replaceChildren();
  };
}

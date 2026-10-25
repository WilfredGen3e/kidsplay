import { el, iconButton } from '../../ui/dom';
import { buildPieces, computeGrid } from './grid';
import { clampToStage, fitScale } from './layout';
import { bitmapMegabytes } from './meting';
import {
  IDENTITY,
  centerOn,
  clampViewport,
  isVisible,
  maxZoomFor,
  panBy,
  zoomAt,
  type ViewBox,
  type Viewport,
} from './viewport';
import type { PuzzleSnapshot } from './progress';
import { generateEdges, shapeMetrics, sliceJigsaw } from './shapes';
import { applyDrop, snapDistance, type SnapPiece } from './snap';

const TRAY_WIDTH = 168;
const TRAY_ITEM = 120;
/** Grote puzzels: kolommen in de lade en de bijbehorende stukgrootte. */
const TRAY_COLUMN_ITEM: Record<number, number> = { 1: 120, 2: 100, 3: 88, 4: 76 };
const TRAY_COLUMNS_KEY = 'kidsplay-lade-kolommen';
type TrayFilter = 'all' | 'edge' | 'rest';
const LIFT_SCALE = 1.05;
const DRAG_THRESHOLD = 5;
const SNAP_ANIMATION_MS = 120;
const ZOOM_STEP = 1.5;
/** Aan de rand van het speelvlak schuift het beeld mee tijdens het slepen. */
const EDGE_ZONE = 56;
const EDGE_SPEED = 14;
const EDGE_DWELL_MS = 300;

interface PieceState extends SnapPiece {
  el: HTMLCanvasElement;
  where: 'tray' | 'stage';
}

export interface PuzzleOptions {
  puzzleId: string;
  image: HTMLCanvasElement;
  pieces: number;
  drawerSide: 'left' | 'right';
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
  /** Zoomen en verschuiven (grote puzzels voor volwassenen). */
  zoomable?: boolean;
  /** Aangeroepen als de puzzel op het scherm staat, met laadtijd en geheugen van de stukjes. */
  onMounted?: (stats: { loadMs: number; bitmapMb: number }) => void;
}

function storedTrayColumns(): number {
  try {
    const n = Number(localStorage.getItem(TRAY_COLUMNS_KEY));
    return n in TRAY_COLUMN_ITEM ? n : 3;
  } catch {
    return 3;
  }
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
  const startedMounting = performance.now();
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
  // Lade: bij grote puzzels meerdere kolommen en een filter; anders één kolom van 120 px.
  let trayCols = opts.zoomable ? storedTrayColumns() : 1;
  let trayItem = opts.zoomable ? TRAY_COLUMN_ITEM[trayCols] : TRAY_ITEM;
  let trayFilter: TrayFilter = 'all';
  // Scrollen met een trackpad is lastig voor jonge kinderen: pijlen boven en onder de lade.
  const scrollStep = () => (opts.zoomable ? Math.max(160, tray.clientHeight * 0.8) : (TRAY_ITEM + 16) * 2);
  const upButton = iconButton('⬆️', 'Omhoog', 'tool-button tray-arrow', () =>
    tray.scrollBy({ top: -scrollStep(), behavior: 'smooth' }),
  );
  const downButton = iconButton('⬇️', 'Omlaag', 'tool-button tray-arrow', () =>
    tray.scrollBy({ top: scrollStep(), behavior: 'smooth' }),
  );
  trayPanel.append(trayHead, upButton, tray, downButton);
  const stage = el('div', `stage${opts.zoomable ? ' zoomable' : ''}`);
  // Bord, stukjes en hulpflits staan in één laag die voor zoomen en verschuiven met één transform meebeweegt.
  const world = el('div', 'world');
  const board = el('div', 'board');
  world.append(board);
  stage.append(world);
  wrap.append(trayPanel, stage);

  if (opts.ghost) {
    const ghost = scaledCopy(image, 1024);
    ghost.className = 'ghost';
    board.append(ghost);
  }

  // Voorbeeld en hulpknop staan boven de lade, zodat ze nooit over het canvas of de stukjes liggen.
  const tools = el('div', 'tray-tools');
  const zoomLabel = el('span', 'zoom-label', '🔍');
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

  const filterButtons: Partial<Record<TrayFilter, HTMLButtonElement>> = {};
  const isEdgePiece = (p: PieceState) => Object.values(p.info.isEdge).some(Boolean);
  const matchesFilter = (p: PieceState) =>
    trayFilter === 'all' || (trayFilter === 'edge' ? isEdgePiece(p) : !isEdgePiece(p));
  function updateTrayStats() {
    if (!opts.zoomable) return;
    const inTray = pieces.filter((p) => p.where === 'tray');
    const edge = inTray.filter(isEdgePiece).length;
    const counts: Record<TrayFilter, number> = { all: inTray.length, edge, rest: inTray.length - edge };
    const names: Record<TrayFilter, string> = { all: 'Alles', edge: 'Rand', rest: 'Rest' };
    for (const key of Object.keys(names) as TrayFilter[]) {
      filterButtons[key]!.textContent = `${names[key]} ${counts[key]}`;
    }
  }
  function applyFilter() {
    for (const p of pieces) {
      if (p.where === 'tray') p.el.classList.toggle('filtered-out', !matchesFilter(p));
    }
    for (const [key, button] of Object.entries(filterButtons)) button!.classList.toggle('active', key === trayFilter);
    tray.scrollTop = 0;
  }
  /** Zet het aantal kolommen: breedte van de lade, stukgrootte en indeling van het speelvlak. */
  function applyTrayLayout() {
    if (!opts.zoomable) return;
    trayItem = TRAY_COLUMN_ITEM[trayCols];
    const gap = 8;
    trayPanel.style.width = `${trayCols * trayItem + (trayCols - 1) * gap + 16 + 14}px`;
    tray.classList.toggle('multi', trayCols > 1);
    colsButton.textContent = `▦ ${trayCols}`;
    for (const p of pieces) if (p.where === 'tray') setTraySize(p);
    layout();
  }
  const colsButton = el('button', 'tool-button tray-cols');
  if (opts.zoomable) {
    colsButton.type = 'button';
    colsButton.setAttribute('aria-label', 'Kolommen in de lade');
    colsButton.addEventListener('click', () => {
      trayCols = (trayCols % 4) + 1;
      try {
        localStorage.setItem(TRAY_COLUMNS_KEY, String(trayCols));
      } catch {
        // Zonder opslag blijft de keuze alleen voor deze puzzel.
      }
      applyTrayLayout();
    });
    const filter = el('div', 'tray-filter');
    for (const key of ['all', 'edge', 'rest'] as TrayFilter[]) {
      const b = el('button', 'tray-filter-button');
      b.type = 'button';
      b.addEventListener('click', () => {
        trayFilter = key;
        applyFilter();
      });
      filterButtons[key] = b;
      filter.append(b);
    }
    const controls = el('div', 'tray-controls');
    controls.append(colsButton, filter);
    trayHead.append(controls);
  }
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

  // Basisindeling: het canvas past in het speelvlak (zonder zoom). Stukken staan in afbeeldingspixels.
  let baseScale = 1;
  let baseLeft = 0;
  let baseTop = 0;
  // Weergave daarbovenop: zoom en verschuiving (alleen bij `zoomable`).
  let view: Viewport = IDENTITY;
  // Wat het scherm werkelijk laat zien, in speelvlak-pixels; hiermee rekenen we aanwijzer om naar afbeelding.
  let scale = 1;
  let boardLeft = 0;
  let boardTop = 0;
  let panMoved = false;
  /** Er wordt een stuk gesleept: dan niet zoomen of verschuiven met de achtergrond. */
  let dragging = false;
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
    const k = trayItem / Math.max(w, h);
    p.el.style.width = `${w * k}px`;
    p.el.style.height = `${h * k}px`;
    p.el.style.transform = '';
  }

  function setBoardSize(p: PieceState) {
    p.el.style.width = `${(p.info.rect.width + 2 * margin) * baseScale}px`;
    p.el.style.height = `${(p.info.rect.height + 2 * margin) * baseScale}px`;
  }

  function render(p: PieceState) {
    if (p.where !== 'stage') return;
    const lift = p.el.classList.contains('dragging') && groupOf(p).length === 1;
    p.el.style.transform = `translate(${baseLeft + (p.x - margin) * baseScale}px, ${baseTop + (p.y - margin) * baseScale}px)${lift ? ` scale(${LIFT_SCALE})` : ''}`;
  }

  const boxOf = (): ViewBox => {
    const rect = stage.getBoundingClientRect();
    return {
      stageW: rect.width,
      stageH: rect.height,
      left: baseLeft,
      top: baseTop,
      width: image.width * baseScale,
      height: image.height * baseScale,
    };
  };
  const maxZoom = () => (opts.zoomable ? maxZoomFor(baseScale) : 1);

  /** Past de zoomlaag toe en rekent de effectieve schaal en positie opnieuw uit. */
  function applyView(next: Viewport = view) {
    view = clampViewport(next, boxOf(), maxZoom());
    world.style.transform = view.zoom === 1 ? '' : `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`;
    scale = baseScale * view.zoom;
    // De gestreepte rand blijft even dik, ook als de wereld vergroot wordt.
    board.style.borderWidth = `${4 / view.zoom}px`;
    board.style.margin = `${-4 / view.zoom}px`;
    boardLeft = view.panX + baseLeft * view.zoom;
    boardTop = view.panY + baseTop * view.zoom;
    zoomLabel.textContent = view.zoom === 1 ? '🔍' : `${Math.round(view.zoom * 100)}%`;
  }

  function layout() {
    const rect = stage.getBoundingClientRect();
    baseScale = fitScale(rect.width, rect.height, image.width, image.height);
    const w = image.width * baseScale;
    const h = image.height * baseScale;
    baseLeft = (rect.width - w) / 2;
    baseTop = (rect.height - h) / 2;
    board.style.width = `${w}px`;
    board.style.height = `${h}px`;
    board.style.left = `${baseLeft}px`;
    board.style.top = `${baseTop}px`;
    for (const p of pieces) {
      if (p.where !== 'stage') continue;
      setBoardSize(p);
      render(p);
    }
    applyView();
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
    p.el.classList.toggle('filtered-out', !matchesFilter(p));
    updateTrayStats();
    opts.onProgress?.(snapshot());
  }

  function lift(members: PieceState[]) {
    startedAt ??= performance.now();
    for (const m of members) {
      m.where = 'stage';
      m.el.classList.add('dragging');
      m.el.style.zIndex = String(++z);
      setBoardSize(m);
      m.el.classList.remove('filtered-out');
      world.append(m.el);
    }
    updateTrayStats();
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
    const { changed } = applyDrop(pieces, grid, p.group, dist);
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
    flash.style.left = `${baseLeft + target.info.rect.x * baseScale}px`;
    flash.style.top = `${baseTop + target.info.rect.y * baseScale}px`;
    flash.style.width = `${target.info.rect.width * baseScale}px`;
    flash.style.height = `${target.info.rect.height * baseScale}px`;
    world.append(flash);
    // Staat de plek buiten beeld, dan schuift het beeld erheen.
    if (opts.zoomable) {
      const wx = baseLeft + (target.info.rect.x + target.info.rect.width / 2) * baseScale;
      const wy = baseTop + (target.info.rect.y + target.info.rect.height / 2) * baseScale;
      if (!isVisible(view, wx, wy, boxOf())) applyView(centerOn(view, wx, wy, boxOf(), maxZoom()));
    }
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
      let panAtLift = { x: 0, y: 0 };
      let pointer = { x: down.clientX, y: down.clientY };
      let edgeFrame = 0;
      let edgeSince: number | undefined;
      lastTouched = p;

      /** Zet de groep onder de aanwijzer; rekent met de huidige zoom en verschuiving. */
      const place = () => {
        if (fromTray) {
          const s = stage.getBoundingClientRect();
          p.x = (pointer.x - s.left - boardLeft) / scale - fx * (p.info.rect.width + 2 * margin) + margin;
          p.y = (pointer.y - s.top - boardTop) / scale - fy * (p.info.rect.height + 2 * margin) + margin;
        } else {
          // Schuift het beeld tijdens het slepen, dan blijft het stuk onder de aanwijzer.
          const dx = (pointer.x - down.clientX - (view.panX - panAtLift.x)) / scale;
          const dy = (pointer.y - down.clientY - (view.panY - panAtLift.y)) / scale;
          members.forEach((m, i) => {
            m.x = origin[i].x + dx;
            m.y = origin[i].y + dy;
          });
        }
        members.forEach(render);
      };

      /** Houdt de aanwijzer lang genoeg aan de rand van het speelvlak, dan schuift het beeld die kant op. */
      const edgeScroll = (now: number) => {
        edgeFrame = 0;
        if (!lifted) return;
        const s = stage.getBoundingClientRect();
        const inside = pointer.x >= s.left && pointer.x <= s.right && pointer.y >= s.top && pointer.y <= s.bottom;
        let vx = 0;
        let vy = 0;
        if (inside) {
          if (pointer.x < s.left + EDGE_ZONE) vx = EDGE_SPEED;
          else if (pointer.x > s.right - EDGE_ZONE) vx = -EDGE_SPEED;
          if (pointer.y < s.top + EDGE_ZONE) vy = EDGE_SPEED;
          else if (pointer.y > s.bottom - EDGE_ZONE) vy = -EDGE_SPEED;
        }
        if (vx === 0 && vy === 0) {
          edgeSince = undefined;
        } else {
          edgeSince ??= now;
          if (now - edgeSince >= EDGE_DWELL_MS) {
            applyView(panBy(view, vx, vy, boxOf(), maxZoom()));
            place();
          }
        }
        edgeFrame = requestAnimationFrame(edgeScroll);
      };

      const move = (e: PointerEvent) => {
        pointer = { x: e.clientX, y: e.clientY };
        if (!lifted) {
          if (Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) < DRAG_THRESHOLD) return;
          lifted = true;
          dragging = true;
          select(undefined);
          members = groupOf(p);
          origin = members.map((m) => ({ x: m.x, y: m.y }));
          panAtLift = { x: view.panX, y: view.panY };
          lift(members);
          if (opts.zoomable) edgeFrame = requestAnimationFrame(edgeScroll);
        }
        place();
      };

      const up = (e: PointerEvent) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        cancelAnimationFrame(edgeFrame);
        dragging = false;
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
    if (panMoved) return void (panMoved = false);
    if (!selected || (e.target !== stage && e.target !== world && e.target !== board)) return;
    const p = selected;
    select(undefined);
    const s = stage.getBoundingClientRect();
    p.x = (e.clientX - s.left - boardLeft) / scale - p.info.rect.width / 2;
    p.y = (e.clientY - s.top - boardTop) / scale - p.info.rect.height / 2;
    lift([p]);
    settle(p);
  });

  // --- Zoomen en verschuiven (alleen grote puzzels voor volwassenen) ---
  const pointers = new Map<number, { x: number; y: number }>();
  let gesture:
    | { kind: 'pan'; x: number; y: number; start: Viewport }
    | { kind: 'pinch'; distance: number; cx: number; cy: number; start: Viewport }
    | undefined;
  let disposeZoom = () => {};

  if (opts.zoomable) {
    const stageCenter = () => {
      const r = stage.getBoundingClientRect();
      return { x: r.width / 2, y: r.height / 2 };
    };
    const zoomBy = (factor: number, at = stageCenter()) =>
      applyView(zoomAt(view, at.x, at.y, view.zoom * factor, boxOf(), maxZoom()));

    // Knoppen: dubbele functie van de middelste knop is "alles zien".
    const controls = el('div', 'zoom-controls');
    const fit = el('button', 'tool-button zoom-fit');
    fit.type = 'button';
    fit.setAttribute('aria-label', 'Alles zien');
    fit.append(zoomLabel);
    fit.addEventListener('click', () => applyView(IDENTITY));
    controls.append(
      iconButton('➕', 'Inzoomen', 'tool-button', () => zoomBy(ZOOM_STEP)),
      fit,
      iconButton('➖', 'Uitzoomen', 'tool-button', () => zoomBy(1 / ZOOM_STEP)),
    );
    stage.append(controls);

    const localPoint = (e: { clientX: number; clientY: number }) => {
      const r = stage.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const startGesture = () => {
      const points = [...pointers.values()];
      if (points.length === 1) {
        gesture = { kind: 'pan', x: points[0].x, y: points[0].y, start: view };
      } else if (points.length >= 2) {
        const [a, b] = points;
        const mid = localPoint({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
        gesture = { kind: 'pinch', distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: mid.x, cy: mid.y, start: view };
      } else {
        gesture = undefined;
      }
    };

    // Achtergrond slepen verschuift, twee vingers knijpen zoomt. Een stuk dat al gepakt is (defaultPrevented) niet.
    stage.addEventListener('pointerdown', (e) => {
      if (e.defaultPrevented || dragging || (e.target as HTMLElement).closest('.zoom-controls')) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      stage.setPointerCapture(e.pointerId);
      startGesture();
    });
    stage.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId) || !gesture || dragging) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (gesture.kind === 'pan') {
        const dx = e.clientX - gesture.x;
        const dy = e.clientY - gesture.y;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) panMoved = true;
        if (panMoved) applyView(panBy(gesture.start, dx, dy, boxOf(), maxZoom()));
      } else {
        const [a, b] = [...pointers.values()];
        if (!a || !b) return;
        const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const mid = localPoint({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
        const zoomed = zoomAt(gesture.start, gesture.cx, gesture.cy, gesture.start.zoom * (distance / gesture.distance), boxOf(), maxZoom());
        applyView(panBy(zoomed, mid.x - gesture.cx, mid.y - gesture.cy, boxOf(), maxZoom()));
        panMoved = true;
      }
    });
    const endPointer = (e: PointerEvent) => {
      if (!pointers.delete(e.pointerId)) return;
      startGesture();
      // Na loslaten duurt 'click' nog even; panMoved wordt daar (of hier, bij geen click) weer gewist.
      if (pointers.size === 0 && panMoved) setTimeout(() => (panMoved = false), 0);
    };
    stage.addEventListener('pointerup', endPointer);
    stage.addEventListener('pointercancel', endPointer);

    // Scrollwiel van een muis zoomt; knijpen op een trackpad (ctrl+wiel) zoomt vloeiend; twee vingers vegen verschuift.
    stage.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (dragging) return;
        const at = localPoint(e);
        const pinch = e.ctrlKey || e.metaKey;
        const mouseWheel = e.deltaMode !== 0 || (Math.abs(e.deltaY) >= 50 && e.deltaX === 0);
        if (pinch || mouseWheel) {
          zoomBy(Math.exp((-e.deltaY * (pinch ? 0.01 : 0.0035)) * (e.deltaMode === 1 ? 16 : 1)), at);
        } else {
          applyView(panBy(view, -e.deltaX, -e.deltaY, boxOf(), maxZoom()));
        }
      },
      { passive: false },
    );
    // Safari en WebKit (iPad, Mac-app) sturen gesture-events voor knijpen; houd de pagina zelf stil.
    let gestureStart = 1;
    stage.addEventListener('gesturestart', (e) => {
      e.preventDefault();
      gestureStart = view.zoom;
    });
    stage.addEventListener('gesturechange', (e) => {
      e.preventDefault();
      if (pointers.size >= 2 || dragging) return;
      const scaleFactor = (e as unknown as { scale?: number }).scale || 1;
      applyView(zoomAt(view, stageCenter().x, stageCenter().y, gestureStart * scaleFactor, boxOf(), maxZoom()));
    });
    disposeZoom = () => pointers.clear();
  }

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
    world.append(p.el);
  }
  for (const p of pieces) attachDrag(p);

  if (opts.zoomable) {
    applyFilter();
    updateTrayStats();
    applyTrayLayout();
  }
  layout();
  window.addEventListener('resize', layout);
  opts.onMounted?.({ loadMs: performance.now() - startedMounting, bitmapMb: bitmapMegabytes(bitmaps.values()) });
  return () => {
    window.removeEventListener('resize', layout);
    disposeZoom();
    root.replaceChildren();
  };
}

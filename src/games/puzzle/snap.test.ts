import { describe, expect, it } from 'vitest';
import { buildPieces } from './grid';
import { applyDrop, evaluateDrop, neighborIds, snapDistance, type SnapPiece } from './snap';

// 4 × 3 raster, stukjes van 100 × 100 in een afbeelding van 400 × 300.
const grid = { cols: 4, rows: 3 };

function setup(): SnapPiece[] {
  return buildPieces(grid, 400, 300).map((info) => ({
    info,
    x: 1000 + info.id * 300, // ver van alles
    y: 1000,
    locked: false,
    group: info.id,
  }));
}
const DIST = 20;

describe('snapDistance', () => {
  it('is 20% van de breedte met een minimum van 15 px', () => {
    expect(snapDistance(200)).toBe(40);
    expect(snapDistance(40)).toBe(15);
    expect(snapDistance(200, 1.5)).toBe(60);
  });
});

describe('neighborIds', () => {
  it('geeft buren zonder over de rand te lopen', () => {
    expect(neighborIds(grid, 0).sort()).toEqual([1, 4]);
    expect(neighborIds(grid, 5).sort()).toEqual([1, 4, 6, 9]);
    expect(neighborIds(grid, 3).sort()).toEqual([2, 7]);
  });
});

describe('vastklikken', () => {
  it('klikt een randstuk vast dat bij zijn juiste plek ligt', () => {
    const pieces = setup();
    pieces[0].x = 12;
    pieces[0].y = -8;
    const { changed, locked } = applyDrop(pieces, grid, 0, DIST);
    expect(locked).toBe(true);
    expect(changed).toEqual([pieces[0]]);
    expect(pieces[0]).toMatchObject({ x: 0, y: 0, locked: true });
  });

  it('laat een randstuk los liggen als het te ver weg ligt', () => {
    const pieces = setup();
    pieces[0].x = 50;
    pieces[0].y = 0;
    expect(applyDrop(pieces, grid, 0, DIST).changed).toEqual([]);
    expect(pieces[0].locked).toBe(false);
  });

  it('klikt een middenstuk niet vast zonder vastgeklikte buur', () => {
    const pieces = setup();
    pieces[5].x = 101;
    pieces[5].y = 99;
    expect(evaluateDrop(pieces, grid, 5, DIST).kind).toBe('none');
  });

  it('klikt een middenstuk wel vast naast een vastgeklikt stuk', () => {
    const pieces = setup();
    Object.assign(pieces[1], { x: 100, y: 0, locked: true });
    pieces[5].x = 105;
    pieces[5].y = 95;
    applyDrop(pieces, grid, 5, DIST);
    expect(pieces[5]).toMatchObject({ x: 100, y: 100, locked: true });
  });

  it('klikt niet vast als de buur wel vastzit maar het stuk niet op de juiste plek ligt', () => {
    const pieces = setup();
    Object.assign(pieces[1], { x: 100, y: 0, locked: true });
    pieces[5].x = 160;
    pieces[5].y = 100;
    expect(applyDrop(pieces, grid, 5, DIST).changed).toEqual([]);
  });
});

describe('losse groepen', () => {
  it('klikt twee buren aan elkaar, waar ze ook liggen', () => {
    const pieces = setup();
    Object.assign(pieces[5], { x: 500, y: 400 });
    Object.assign(pieces[6], { x: 610, y: 395 }); // moet 600,400 zijn
    const { changed, locked } = applyDrop(pieces, grid, 6, DIST);
    expect(locked).toBe(false);
    expect(changed).toEqual([pieces[6]]);
    expect(pieces[6]).toMatchObject({ x: 600, y: 400, group: pieces[5].group });
  });

  it('klikt geen stukken aan elkaar die geen buren zijn', () => {
    const pieces = setup();
    Object.assign(pieces[5], { x: 500, y: 400 });
    Object.assign(pieces[7], { x: 700, y: 400 });
    expect(applyDrop(pieces, grid, 7, DIST).changed).toEqual([]);
  });

  it('klikt een hele groep vast als één stuk aan de rand goed ligt', () => {
    const pieces = setup();
    Object.assign(pieces[0], { x: 300, y: 300, group: 0 });
    Object.assign(pieces[1], { x: 400, y: 300, group: 0 });
    Object.assign(pieces[4], { x: 300, y: 400, group: 0 });
    // groep verschuift zodat stuk 0 bijna op (0,0) ligt
    for (const i of [0, 1, 4]) {
      pieces[i].x -= 296;
      pieces[i].y -= 303;
    }
    const { locked } = applyDrop(pieces, grid, 0, DIST);
    expect(locked).toBe(true);
    expect(pieces[0]).toMatchObject({ x: 0, y: 0, locked: true });
    expect(pieces[1]).toMatchObject({ x: 100, y: 0, locked: true });
    expect(pieces[4]).toMatchObject({ x: 0, y: 100, locked: true });
  });

  it('klikt twee randstukken los van elkaar vast', () => {
    const pieces = setup();
    Object.assign(pieces[0], { x: 3, y: 4 }); // randstuk, bijna goed, maar nog niet gedropt
    pieces[0].group = 0;
    Object.assign(pieces[1], { x: 100, y: 0 });
    // Laat stuk 1 los: het klikt zelf vast (randstuk, juiste plek) terwijl 0 los blijft.
    expect(applyDrop(pieces, grid, 1, DIST).locked).toBe(true);
    // Stuk 0 daarna: randstuk bij juiste plek → vast.
    expect(applyDrop(pieces, grid, 0, DIST).locked).toBe(true);
    expect(pieces[0].locked && pieces[1].locked).toBe(true);
  });
});

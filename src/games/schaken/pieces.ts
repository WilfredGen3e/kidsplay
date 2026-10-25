import { woodShapes } from './pieces-wood';
import type { Color, Kind, Piece } from './rules';

/** Het uiterlijk van de stukken en het bord: `prinses` (roze en paars) of `hout` (houten stukken). */
export type Theme = 'prinses' | 'hout';
export const THEMES: readonly Theme[] = ['prinses', 'hout'];

/** Kleuren per kant: wit is roze, zwart is paars. */
const PALETTE: Record<Color, { fill: string; dark: string; shine: string }> = {
  w: { fill: '#ff8cc6', dark: '#b8286f', shine: '#ffd3ea' },
  b: { fill: '#9b7bf2', dark: '#4b2aa8', shine: '#d4c6ff' },
};

const GOLD = '#ffd43b';
const GOLD_DARK = '#c58a00';

/** Elk figuurtje in een vak van 100×100; de voet staat altijd onderaan. */
function shapes(kind: Kind, c: { fill: string; dark: string; shine: string }): string {
  const body = `fill="${c.fill}" stroke="${c.dark}" stroke-width="3" stroke-linejoin="round"`;
  const gold = `fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width="2.5" stroke-linejoin="round"`;
  const face = (x: number, y: number) =>
    `<circle cx="${x - 5}" cy="${y}" r="1.8" fill="${c.dark}"/><circle cx="${x + 5}" cy="${y}" r="1.8" fill="${c.dark}"/>` +
    `<path d="M${x - 3} ${y + 5} q3 3 6 0" fill="none" stroke="${c.dark}" stroke-width="1.8" stroke-linecap="round"/>`;
  const base = `<rect x="22" y="84" width="56" height="8" rx="4" ${body}/>`;
  const dress = (top: number, half: number) =>
    `<path d="M${50 - half} ${top} Q50 ${top - 6} ${50 + half} ${top} L74 85 L26 85 Z" ${body}/>`;
  const crown = (x: number, y: number, w: number) =>
    `<path d="M${x - w} ${y} l${w * 0.3} -${w * 0.9} l${w * 0.7} ${w * 0.6} l${w * 0.7} -${w * 1.2} l${w * 0.7} ${w * 1.2} l${w * 0.7} -${w * 0.6} l${w * 0.3} ${w * 0.9} Z" ${gold}/>`;

  switch (kind) {
    case 'P':
      return (
        base +
        dress(52, 12) +
        `<circle cx="50" cy="38" r="11" ${body}/>` +
        face(50, 38) +
        crown(44, 28, 4)
      );
    case 'R':
      return (
        base +
        `<path d="M30 84 L33 44 H67 L70 84 Z" ${body}/>` +
        `<path d="M28 44 V22 h9 v8 h8 v-8 h10 v8 h8 v-8 h9 v22 Z" ${body}/>` +
        `<path d="M43 84 V66 a7 7 0 0 1 14 0 V84 Z" fill="${c.dark}"/>` +
        `<path d="M46 20 V8 l12 4 l-12 4" fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width="2" stroke-linejoin="round"/>`
      );
    case 'B':
      return (
        base +
        dress(58, 13) +
        `<circle cx="50" cy="46" r="10" ${body}/>` +
        face(50, 47) +
        `<path d="M38 41 L50 10 L62 41 Q50 36 38 41 Z" ${body}/>` +
        `<path d="M50 20 l2 5 5 .5 -4 3.5 1.5 5 -4.5 -3 -4.5 3 1.5 -5 -4 -3.5 5 -.5 Z" ${gold} transform="translate(0 2) scale(.9) translate(5.5 1.5)"/>`
      );
    case 'N':
      return (
        base +
        `<path d="M30 84 C30 62 38 52 47 44 C40 42 33 43 27 48 L24 41 C28 30 40 22 54 22 C70 24 78 40 74 58 C72 68 72 76 72 84 Z" ${body}/>` +
        `<path d="M54 22 L50 6 L62 21 Z" ${gold}/>` +
        `<path d="M56 24 C64 28 70 36 70 48" fill="none" stroke="${c.shine}" stroke-width="4" stroke-linecap="round"/>` +
        `<circle cx="47" cy="34" r="2.6" fill="${c.dark}"/>` +
        `<path d="M24 41 l-4 3 l4 3" fill="none" stroke="${c.dark}" stroke-width="2" stroke-linecap="round"/>`
      );
    case 'Q':
      return (
        base +
        dress(54, 16) +
        `<circle cx="50" cy="40" r="11" ${body}/>` +
        face(50, 41) +
        crown(38, 31, 5) +
        `<circle cx="50" cy="16" r="3" ${gold}/>`
      );
    case 'K':
      // Rechte romp met schouders en een riem in plaats van een jurk, zodat hij anders is dan de koningin.
      return (
        base +
        `<path d="M36 56 L33 85 L67 85 L64 56 Z" ${body}/>` +
        `<rect x="34" y="70" width="32" height="6" fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width="2"/>` +
        `<path d="M32 58 Q50 50 68 58 L66 64 Q50 58 34 64 Z" ${body}/>` +
        `<circle cx="50" cy="42" r="11" ${body}/>` +
        face(50, 43) +
        crown(38, 33, 5) +
        `<path d="M50 26 V8 M43 14 H57" stroke="${GOLD_DARK}" stroke-width="7" stroke-linecap="round"/>` +
        `<path d="M50 26 V8 M43 14 H57" stroke="${GOLD}" stroke-width="3.5" stroke-linecap="round"/>`
      );
  }
}

/** SVG-tekst van één figuurtje; vult het vak waarin het staat. */
export function pieceSvg(piece: Piece, theme: Theme = 'prinses'): string {
  const inner = theme === 'hout' ? woodShapes(piece.kind, piece.color) : shapes(piece.kind, PALETTE[piece.color]);
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
}

const NAMES: Record<Kind, string> = {
  K: 'koning',
  Q: 'koningin',
  R: 'kasteel',
  B: 'tovenares',
  N: 'eenhoorn',
  P: 'prinsesje',
};

export function pieceName(kind: Kind): string {
  return NAMES[kind];
}

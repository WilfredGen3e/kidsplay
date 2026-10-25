import type { Color, Kind } from './rules';

/** Houten Staunton-stukken: crème (wit) en bruin (zwart), met een zachte houtglans. */
const WOOD: Record<Color, { fill: string; mid: string; dark: string; shine: string }> = {
  w: { fill: '#f8e8c4', mid: '#e2c58c', dark: '#a47c46', shine: '#fff8e6' },
  b: { fill: '#ad6f40', mid: '#86512c', dark: '#45270f', shine: '#d19062' },
};

const GOLD = '#ffd43b';
const GOLD_DARK = '#c58a00';

export function woodShapes(kind: Kind, color: Color): string {
  const c = WOOD[color];
  const grad = `url(#wood-${color})`;
  const body = `fill="${grad}" stroke="${c.dark}" stroke-width="2.8" stroke-linejoin="round"`;
  const defs =
    `<defs><linearGradient id="wood-${color}" x1="0" x2="1" y1="0" y2="0">` +
    `<stop offset="0" stop-color="${c.mid}"/><stop offset=".3" stop-color="${c.fill}"/>` +
    `<stop offset=".55" stop-color="${c.shine}"/><stop offset="1" stop-color="${c.mid}"/></linearGradient></defs>`;
  // Voet en kraagje: elk stuk heeft dezelfde onderkant, zoals een echt houten stuk.
  const foot =
    `<path d="M24 92 Q24 84 33 83 H67 Q76 84 76 92 Z" ${body}/>` +
    `<ellipse cx="50" cy="82" rx="19" ry="3.5" ${body}/>`;
  const collar = (y: number, rx: number) => `<ellipse cx="50" cy="${y}" rx="${rx}" ry="3.6" ${body}/>`;
  const gold = `fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width="2.4" stroke-linejoin="round"`;
  const crown = (y: number, half: number, spikes: number) => {
    const step = (half * 2) / (spikes * 2);
    let d = `M${50 - half} ${y}`;
    for (let i = 0; i < spikes; i++) {
      d += ` L${50 - half + step * (2 * i + 1)} ${y - 13} L${50 - half + step * (2 * i + 2)} ${y - 3}`;
    }
    d += ` L${50 + half} ${y + 4} L${50 - half} ${y + 4} Z`;
    return `<path d="${d}" ${gold}/>`;
  };

  let figure = '';
  switch (kind) {
    case 'P':
      figure =
        `<path d="M43 47 Q38 66 31 82 H69 Q62 66 57 47 Z" ${body}/>` +
        collar(47, 14) +
        `<circle cx="50" cy="33" r="12" ${body}/>`;
      break;
    case 'R':
      figure =
        `<path d="M38 42 L33 82 H67 L62 42 Z" ${body}/>` +
        collar(42, 17) +
        `<path d="M32 40 V20 h9 v7 h6 v-7 h6 v7 h6 v-7 h9 V40 Z" ${body}/>` +
        `<path d="M36 33 H64" stroke="${c.dark}" stroke-width="2" opacity=".5"/>`;
      break;
    case 'B':
      figure =
        `<path d="M42 52 Q36 68 31 82 H69 Q64 68 58 52 Z" ${body}/>` +
        collar(52, 13) +
        `<path d="M50 14 C62 26 62 44 50 50 C38 44 38 26 50 14 Z" ${body}/>` +
        `<path d="M46 28 L58 36" stroke="${c.dark}" stroke-width="3" stroke-linecap="round"/>` +
        `<circle cx="50" cy="12" r="4.5" ${body}/>`;
      break;
    case 'N':
      figure =
        `<path d="M31 82 C31 64 38 54 47 46 C40 44 33 45 27 50 L24 43 C27 31 40 22 54 22 C70 24 79 40 74 58 C72 68 72 76 72 82 Z" ${body}/>` +
        `<path d="M54 22 L51 12 L61 21 Z" ${body}/>` +
        `<path d="M58 26 C66 30 71 38 70 50" fill="none" stroke="${c.dark}" stroke-width="3.5" stroke-linecap="round" opacity=".55"/>` +
        `<circle cx="46" cy="35" r="2.8" fill="${c.dark}"/>` +
        `<ellipse cx="27" cy="46" rx="1.8" ry="2.4" fill="${c.dark}"/>`;
      break;
    case 'Q':
      figure =
        `<path d="M40 50 Q33 68 29 82 H71 Q67 68 60 50 Z" ${body}/>` +
        collar(50, 14) +
        `<circle cx="50" cy="40" r="10" ${body}/>` +
        crown(33, 14, 3) +
        `<circle cx="50" cy="15" r="3.2" ${gold}/>`;
      break;
    case 'K': {
      const ink = c.dark;
      figure =
        `<path d="M40 54 Q33 70 29 82 H71 Q67 70 60 54 Z" ${body}/>` +
        collar(54, 15) +
        `<circle cx="50" cy="40" r="13" fill="#f4c9a0" stroke="#8a5530" stroke-width="2.4"/>` +
        `<path d="M38 44 Q40 56 50 58 Q60 56 62 44 Q56 50 50 50 Q44 50 38 44 Z" fill="#7a4a28"/>` +
        `<circle cx="45" cy="38" r="1.8" fill="${ink}"/><circle cx="55" cy="38" r="1.8" fill="${ink}"/>` +
        `<path d="M43 44 Q50 41 57 44" fill="none" stroke="#5a3418" stroke-width="3" stroke-linecap="round"/>` +
        `<path d="M46 48 q4 3 8 0" fill="none" stroke="#a04040" stroke-width="1.8" stroke-linecap="round"/>` +
        crown(29, 13, 3).replace(/<path/, '<path') +
        `<circle cx="50" cy="14" r="3.4" ${gold}/>`;
      break;
    }
  }
  return defs + foot + figure;
}

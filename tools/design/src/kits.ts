// Lo que cambia por dirección y no es CSS: fuentes, emblema procedural, símbolos del mapa e
// íconos. Exploración de P2.2: el kit elegido se vuelve tokens y componentes en `packages/ui`.

export type DirectionId = 'grabado' | 'observatorio' | 'suizo';

export const DIRECTIONS: readonly DirectionId[] = ['grabado', 'observatorio', 'suizo'];

export interface Kit {
  readonly id: DirectionId;
  readonly letter: 'A' | 'B' | 'C';
  readonly name: string;
  readonly tagline: string;
  /** Hoja de Google Fonts (solo maquetas; el producto auto-hospeda las fuentes, D66). */
  readonly fonts: string;
  /** Emblema de una polity (SVG), determinista por semilla. */
  emblem(seed: number, size: number): string;
  /** Símbolo de asentamiento por nivel (0 aldea … 4 metrópolis); `capital` si es capital. */
  settlement(level: number, capital: boolean): string;
  battle(): string;
}

/** Mezcla de enteros de 32 bits (avalancha). */
function mix32(seed: number): number {
  let h = seed >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Generador chico y determinista: `pick(n)` da un entero en [0, n). */
function picker(seed: number) {
  let s = mix32(seed);
  return (n: number) => {
    s = mix32(s + 0x9e3779b9);
    return s % n;
  };
}

const svg = (w: number, h: number, body: string, cls = '') =>
  `<svg class="${cls}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${body}</svg>`;

// ── A · Grabado ───────────────────────────────────────────────────────────────────────────────
// Escudo francés moderno con la regla de los esmaltes: metal sobre color o color sobre metal.
const METALS = ['#d9a21b', '#f6f5f1'];
const COLOURS = ['#a83a4a', '#2f5d8c', '#3f7d4e', '#2b2620', '#6c4a7e'];
const SHIELD = 'M2 2 H38 V20 C38 33 29 41 20 46 C11 41 2 33 2 20 Z';

function heraldry(seed: number, size: number): string {
  const pick = picker(seed);
  const metalField = pick(2) === 0;
  const field = metalField ? METALS[pick(2)] : COLOURS[pick(COLOURS.length)];
  const charge = metalField ? COLOURS[pick(COLOURS.length)] : METALS[pick(2)];
  const ordinaries = [
    `<rect x="2" y="17" width="36" height="11" fill="${charge}"/>`, // faja
    `<rect x="14.5" y="2" width="11" height="46" fill="${charge}"/>`, // palo
    `<path d="M2 2 L12 2 L38 32 L38 42 Z" fill="${charge}"/>`, // banda
    `<path d="M2 40 L20 16 L38 40 L38 30 L20 7 L2 30 Z" fill="${charge}"/>`, // cabrio
    `<path d="M15 2 H25 V18 H38 V27 H25 V48 H15 V27 H2 V18 H15 Z" fill="${charge}"/>`, // cruz
    `<rect x="2" y="2" width="36" height="12" fill="${charge}"/>`, // jefe
  ];
  const charges = [
    `<circle cx="20" cy="24" r="6" fill="${charge}" stroke="#2b2620" stroke-width=".8"/>`, // bezante
    `<path d="M20 15 L22.4 21.6 L29.5 21.8 L23.9 26.1 L25.9 32.9 L20 28.9 L14.1 32.9 L16.1 26.1 L10.5 21.8 L17.6 21.6 Z" fill="${charge}" stroke="#2b2620" stroke-width=".8"/>`, // estrella
    `<path d="M20 14 L27 24 L20 34 L13 24 Z" fill="${charge}" stroke="#2b2620" stroke-width=".8"/>`, // losange
  ];
  const useCharge = pick(3) === 0;
  const body = useCharge ? charges[pick(charges.length)] : ordinaries[pick(ordinaries.length)];
  const s = size / 48;
  return svg(
    40 * s,
    48 * s,
    `<g transform="scale(${s})"><clipPath id="sh${seed}"><path d="${SHIELD}"/></clipPath>
     <g clip-path="url(#sh${seed})"><rect width="40" height="50" fill="${field}"/>${body}</g>
     <path d="${SHIELD}" fill="none" stroke="#2b2620" stroke-width="1.4"/></g>`,
    'emblem',
  );
}

// ── B · Observatorio ──────────────────────────────────────────────────────────────────────────
// Sigilo: un polígono regular en una escala graduada, con radios según la semilla.
const B_PALETTE = ['#ea988d', '#ccae63', '#84c38d', '#58c3d2', '#96aff1', '#d49ad1'];

function sigil(seed: number, size: number): string {
  const pick = picker(seed);
  const sides = 3 + pick(5);
  const color = B_PALETTE[pick(B_PALETTE.length)];
  const rot = pick(360);
  const pts = Array.from({ length: sides }, (_, i) => {
    const a = ((rot + (360 * i) / sides) * Math.PI) / 180;
    return `${(24 + 13 * Math.cos(a)).toFixed(2)},${(24 + 13 * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
  const spokes = Array.from({ length: 1 + pick(3) }, (_, i) => {
    const a = ((rot + (360 * i * 2) / sides) * Math.PI) / 180;
    return `<line x1="24" y1="24" x2="${(24 + 13 * Math.cos(a)).toFixed(2)}" y2="${(24 + 13 * Math.sin(a)).toFixed(2)}"/>`;
  }).join('');
  const ticks = Array.from({ length: 24 }, (_, i) => {
    const a = (i * 15 * Math.PI) / 180;
    const r1 = i % 6 === 0 ? 19 : 20.5;
    return `<line x1="${(24 + r1 * Math.cos(a)).toFixed(2)}" y1="${(24 + r1 * Math.sin(a)).toFixed(2)}" x2="${(24 + 22 * Math.cos(a)).toFixed(2)}" y2="${(24 + 22 * Math.sin(a)).toFixed(2)}"/>`;
  }).join('');
  const s = size / 48;
  return svg(
    48 * s,
    48 * s,
    `<g transform="scale(${s})" fill="none" stroke="#d9d4c7" stroke-width="1">
       <circle cx="24" cy="24" r="22" stroke-opacity=".5"/>${ticks}
       <polygon points="${pts}" fill="${color}" fill-opacity=".9" stroke="${color}"/>
       <g stroke="#15171a" stroke-width="1.4">${spokes}</g>
       <circle cx="24" cy="24" r="2" fill="#15171a" stroke="none"/></g>`,
    'emblem',
  );
}

// ── C · Atlas suizo ───────────────────────────────────────────────────────────────────────────
// Bandera rectangular 3:2 de colores planos.
const FLAG = ['#b8322e', '#21508c', '#2f7a4f', '#e3b23c', '#f7f7f5', '#1f1f1f'];

function flag(seed: number, size: number): string {
  const pick = picker(seed);
  const a = FLAG[pick(FLAG.length)] ?? '#000';
  let b = FLAG[pick(FLAG.length)] ?? '#fff';
  if (b === a) b = a === '#f7f7f5' ? '#21508c' : '#f7f7f5';
  let c = FLAG[pick(FLAG.length)] ?? '#000';
  if (c === b) c = a;
  const patterns = [
    `<rect width="30" height="10" fill="${a}"/><rect y="10" width="30" height="10" fill="${b}"/>`,
    `<rect width="10" height="20" fill="${a}"/><rect x="10" width="10" height="20" fill="${b}"/><rect x="20" width="10" height="20" fill="${c}"/>`,
    `<rect width="30" height="20" fill="${a}"/><rect x="8" width="4" height="20" fill="${b}"/><rect y="8" width="30" height="4" fill="${b}"/>`,
    `<rect width="30" height="20" fill="${a}"/><rect width="13" height="10" fill="${b}"/>`,
    `<rect width="30" height="20" fill="${a}"/><path d="M0 20 L30 0 L30 6 L9 20 Z" fill="${b}"/>`,
    `<rect width="30" height="20" fill="${a}"/><circle cx="15" cy="10" r="5" fill="${b}"/>`,
  ];
  const s = size / 30;
  return svg(
    30 * s,
    20 * s,
    `<g transform="scale(${s})">${patterns[pick(patterns.length)]}<rect x=".25" y=".25" width="29.5" height="19.5" fill="none" stroke="#1f1f1f" stroke-opacity=".35" stroke-width=".5"/></g>`,
    'emblem',
  );
}

export const KITS: Readonly<Record<DirectionId, Kit>> = {
  grabado: {
    id: 'grabado',
    letter: 'A',
    name: 'Grabado',
    tagline: 'La historia como documento',
    fonts:
      'https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&display=swap',
    emblem: heraldry,
    settlement: (level, capital) => {
      const r = [2.2, 3, 3.8, 4.6, 5.4][level] ?? 3;
      const c = 8;
      const inner =
        level >= 3
          ? `<circle cx="${c}" cy="${c}" r="${r - 1.6}" fill="#2b2620"/>`
          : level >= 1
            ? `<circle cx="${c}" cy="${c}" r="1" fill="#2b2620"/>`
            : '';
      const cap = capital
        ? `<circle cx="${c}" cy="${c}" r="${r + 2}" fill="none" stroke="#2b2620" stroke-width=".9"/>`
        : '';
      return svg(
        16,
        16,
        `<circle cx="${c}" cy="${c}" r="${r}" fill="#f6f5f1" stroke="#2b2620" stroke-width="1.1"/>${inner}${cap}`,
        'sym',
      );
    },
    battle: () =>
      svg(
        16,
        16,
        '<g stroke="#2b2620" stroke-width="1.3" stroke-linecap="square"><path d="M3 3 L13 13 M13 3 L3 13"/><path d="M2 6 L6 2 M10 2 L14 6" stroke-width="1"/></g>',
        'sym',
      ),
  },
  observatorio: {
    id: 'observatorio',
    letter: 'B',
    name: 'Observatorio',
    tagline: 'La historia como experimento observado',
    fonts:
      'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Condensed:wght@400;500;600&display=swap',
    emblem: sigil,
    settlement: (level, capital) => {
      const s = [2, 4, 5.5, 7, 8.5][level] ?? 4;
      const o = 8 - s / 2;
      const fill = capital ? '#eb5e34' : level >= 2 ? '#e6e2d8' : 'none';
      const ring = capital
        ? `<rect x="${o - 2.5}" y="${o - 2.5}" width="${s + 5}" height="${s + 5}" fill="none" stroke="#eb5e34" stroke-width="1"/>`
        : '';
      return svg(
        16,
        16,
        `<rect x="${o}" y="${o}" width="${s}" height="${s}" fill="${fill}" stroke="#e6e2d8" stroke-width="1"/>${ring}`,
        'sym',
      );
    },
    battle: () =>
      svg(
        16,
        16,
        '<g stroke="#eb5e34" stroke-width="1.5"><path d="M4 4 L12 12 M12 4 L4 12"/></g><circle cx="8" cy="8" r="7" fill="none" stroke="#eb5e34" stroke-width=".8"/>',
        'sym',
      ),
  },
  suizo: {
    id: 'suizo',
    letter: 'C',
    name: 'Atlas suizo',
    tagline: 'La historia como obra de referencia',
    fonts:
      'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=Schibsted+Grotesk:wght@400;500;600;700&display=swap',
    emblem: flag,
    settlement: (level, capital) => {
      const r = [1.8, 2.4, 3, 3.7, 4.4][level] ?? 2.4;
      const body = capital
        ? `<rect x="${8 - r - 0.6}" y="${8 - r - 0.6}" width="${2 * r + 1.2}" height="${2 * r + 1.2}" fill="#1f1f1f" stroke="#fff" stroke-width="1.2"/>`
        : level >= 2
          ? `<circle cx="8" cy="8" r="${r}" fill="#1f1f1f" stroke="#fff" stroke-width="1.2"/>`
          : `<circle cx="8" cy="8" r="${r}" fill="#fff" stroke="#1f1f1f" stroke-width="1"/>`;
      return svg(16, 16, body, 'sym');
    },
    battle: () =>
      svg(
        16,
        16,
        '<g stroke="#b8322e" stroke-width="1.6" stroke-linecap="round"><path d="M3.5 3.5 L12.5 12.5 M12.5 3.5 L3.5 12.5"/></g>',
        'sym',
      ),
  },
};

/** Íconos de la UI: la geometría es común; el trazo (grosor, puntas) lo pone el CSS de cada dirección. */
export const ICONS: Readonly<Record<string, string>> = {
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  summary: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  save: '<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/>',
  export: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  share:
    '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  why: '<path d="M6 4v6a4 4 0 0 0 4 4h8M14 10l4 4-4 4"/>',
  layers: '<path d="M12 4 3 9l9 5 9-5zM3 14l9 5 9-5"/>',
  open: '<path d="M9 5H5v14h14v-4M13 5h6v6M19 5l-8 8"/>',
};

export function icon(name: string): string {
  return `<svg class="icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">${ICONS[name] ?? ''}</svg>`;
}

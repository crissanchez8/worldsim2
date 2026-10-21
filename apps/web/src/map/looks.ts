// Looks del mapa para explorar las tres direcciones de diseño de P2.2 (D58), con `?look=`.
//
// HERRAMIENTA DE EXPLORACIÓN, no Design System: sirve para sacar renders reales de cada dirección
// para las maquetas. Después de la elección (P2.3) el look elegido pasa a los tokens de
// `packages/ui` (D61) y este archivo se reduce a ese look o desaparece. `p1` es el mapa de P1 tal
// cual (el valor por defecto).
//
// Colores en sRGB 0–255. Distancias de dibujo en px de pantalla; elevaciones en m.
import type { Rgb } from './colors';
import { BORDERS, PALETTE, SEMANTIC_ZOOM } from './config';

export const LOOK_IDS = ['p1', 'grabado', 'observatorio', 'suizo'] as const;
export type LookId = (typeof LOOK_IDS)[number];

export function isLookId(value: string): value is LookId {
  return (LOOK_IDS as readonly string[]).includes(value);
}

/** Cómo se pinta la tierra debajo del relleno político. */
export type LandStyle =
  /** Color del bioma dominante (P1). */
  | { readonly mode: 'biome' }
  /** Un solo color (papel, placa). */
  | { readonly mode: 'flat'; readonly color: Rgb }
  /** Tintes hipsométricos: color por elevación (m), interpolado entre paradas crecientes. */
  | { readonly mode: 'hypso'; readonly stops: readonly (readonly [number, Rgb])[] };

export interface MapLook {
  readonly id: LookId;
  /** Fondo de la escena y niebla. */
  readonly sky: Rgb;
  readonly water: {
    readonly shallow: Rgb;
    readonly deep: Rgb;
    readonly lake: Rgb;
    readonly river: Rgb;
    /** Luz plana del agua (multiplicador); null = la de P1 (ambiente + sol). */
    readonly light: number | null;
    /** Bandas de profundidad (count); 0 = continuo. */
    readonly bands: number;
    /**
     * Caudal relativo mínimo de los ríos visibles a cualquier zoom (0–1, escala log): generalización
     * cartográfica, solo los ríos grandes. 0 = el de P1 (depende del zoom).
     */
    readonly riverMinT: number;
  };
  readonly land: LandStyle;
  /** Sombreado del relieve: 0 = sin sombra, 1 = completo; la sombra tiende a `shadow`. */
  readonly shade: { readonly strength: number; readonly shadow: Rgb | null };
  /** Línea de costa (mar y lagos); null = sin línea. */
  readonly coast: { readonly color: Rgb; readonly alpha: number; readonly px: number } | null;
  /** Curvas de nivel en tierra; null = sin curvas. */
  readonly contours: {
    readonly intervalM: number;
    readonly color: Rgb;
    readonly alpha: number;
    readonly px: number;
  } | null;
  /** Retícula de meridianos y paralelos cada `degrees` (el mundo mide 360° × 180°). */
  readonly graticule: {
    readonly degrees: number;
    readonly color: Rgb;
    readonly alpha: number;
    readonly px: number;
  } | null;
  readonly political: {
    /** Opacidad del relleno de cerca y de lejos (fraction). */
    readonly fillNear: number;
    readonly fillFar: number;
    /** Banda de color a lo largo de la frontera (coloreado de contorno): ancho y opacidad extra. */
    readonly band: { readonly px: number; readonly alpha: number } | null;
    /** Halo claro a ambos lados de la frontera. */
    readonly halo: { readonly px: number; readonly color: Rgb; readonly alpha: number } | null;
    /** Línea de frontera: color fijo o `darken` (el tono del relleno, oscurecido por `darken`). */
    readonly border:
      | { readonly color: Rgb; readonly alpha: number; readonly px: number }
      | { readonly darken: number; readonly alpha: number; readonly px: number };
    /** Paleta política (K colores); null = el color por id de P1 (`colorFromSeed`). */
    readonly palette: readonly Rgb[] | null;
  };
  /** Fronteras de provincia; `alpha` multiplica a la del zoom semántico (`BORDERS.provinceAlpha`). */
  readonly provinceBorder: { readonly color: Rgb; readonly alpha: number };
  readonly selection: { readonly color: Rgb; readonly alpha: number };
}

const rgb = (hex: string): Rgb => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/** Tinta ferrogálica (A) y blanco hueso (B). */
const INK = rgb('#2b2620');
const BONE = rgb('#d9d4c7');

export const LOOKS: Readonly<Record<LookId, MapLook>> = {
  p1: {
    id: 'p1',
    sky: [(PALETTE.sky >> 16) & 0xff, (PALETTE.sky >> 8) & 0xff, PALETTE.sky & 0xff],
    water: {
      shallow: PALETTE.waterShallow,
      deep: PALETTE.waterDeep,
      lake: PALETTE.lake,
      river: PALETTE.river,
      light: null,
      bands: 0,
      riverMinT: 0,
    },
    land: { mode: 'biome' },
    shade: { strength: 1, shadow: null },
    coast: null,
    contours: null,
    graticule: null,
    political: {
      fillNear: SEMANTIC_ZOOM.fillNear,
      fillFar: SEMANTIC_ZOOM.fillFar,
      band: null,
      halo: null,
      border: { color: PALETTE.politicalBorder, alpha: 0.85, px: BORDERS.politicalPx },
      palette: null,
    },
    provinceBorder: { color: PALETTE.provinceBorder, alpha: 1 },
    selection: { color: PALETTE.selection, alpha: 0.3 },
  },

  // A · Grabado: papel blanco recién impreso (no envejecido), tinta ferrogálica, coloreado de
  // contorno a mano (banda de acuarela en la frontera, lavado tenue adentro).
  grabado: {
    id: 'grabado',
    sky: rgb('#f6f5f1'),
    water: {
      shallow: rgb('#d9e4e8'),
      deep: rgb('#bfd0d9'),
      lake: rgb('#d2e0e6'),
      river: rgb('#46688a'),
      light: 1,
      bands: 0,
      riverMinT: 0.3,
    },
    land: { mode: 'flat', color: rgb('#f6f5f1') },
    shade: { strength: 0.75, shadow: rgb('#5c5042') },
    coast: { color: INK, alpha: 0.9, px: 1.3 },
    contours: null,
    graticule: { degrees: 10, color: INK, alpha: 0.14, px: 0.8 },
    political: {
      fillNear: 0.1,
      fillFar: 0.16,
      band: { px: 9, alpha: 0.55 },
      halo: null,
      border: { color: INK, alpha: 0.7, px: 1.2 },
      palette: [
        '#c8506a', // laca de granza
        '#d9a21b', // gutagamba
        '#2f9c8a', // verdete
        '#2f5d8c', // azul de Prusia
        '#d8572a', // bermellón
        '#6e9a3a', // verde vejiga
        '#8a5a9e', // violeta de granza
        '#b98a52', // ocre
        '#8e3f2c', // siena tostada
        '#d48fb0', // rosa de laca
        '#5f7d2a', // verde oliva
        '#5aa3d4', // azul cobalto
      ].map(rgb),
    },
    provinceBorder: { color: INK, alpha: 0.5 },
    selection: { color: rgb('#d8572a'), alpha: 0.28 },
  },

  // B · Observatorio: placa de grafito mate, curvas de nivel, retícula graduada, un color de
  // señal (bermellón) y relleno político luminoso pero desaturado.
  observatorio: {
    id: 'observatorio',
    sky: rgb('#15171a'),
    water: {
      shallow: rgb('#1f2a33'),
      deep: rgb('#10161c'),
      lake: rgb('#22303b'),
      river: rgb('#4a7487'),
      light: 1,
      bands: 5,
      riverMinT: 0.25,
    },
    land: { mode: 'flat', color: rgb('#2e3033') },
    shade: { strength: 0.9, shadow: rgb('#131416') },
    coast: { color: BONE, alpha: 0.55, px: 1 },
    contours: { intervalM: 500, color: rgb('#8a8f94'), alpha: 0.28, px: 0.9 },
    graticule: { degrees: 10, color: BONE, alpha: 0.1, px: 0.8 },
    political: {
      fillNear: 0.26,
      fillFar: 0.48,
      band: null,
      halo: null,
      border: { color: rgb('#e6e2d8'), alpha: 0.8, px: 1.1 },
      palette: [
        '#ea988d',
        '#b37646',
        '#ccae63',
        '#818e44',
        '#84c38d',
        '#2f9a86',
        '#58c3d2',
        '#458ebb',
        '#96aff1',
        '#8d79bb',
        '#d49ad1',
        '#b66c86',
      ].map(rgb),
    },
    provinceBorder: { color: BONE, alpha: 0.35 },
    selection: { color: rgb('#eb5e34'), alpha: 0.35 },
  },

  // C · Atlas suizo: blanco neutro, tintes hipsométricos apagados con sombreado tipo Imhof
  // (sombra violácea), relleno plano de atlas escolar, frontera en el tono oscuro del relleno con
  // halo blanco.
  suizo: {
    id: 'suizo',
    sky: rgb('#fbfbfa'),
    water: {
      shallow: rgb('#cfe2ee'),
      deep: rgb('#a9c8de'),
      lake: rgb('#c4dcea'),
      river: rgb('#5e8fb8'),
      light: 1,
      bands: 0,
      riverMinT: 0.3,
    },
    land: {
      mode: 'hypso',
      stops: [
        [0, rgb('#dfe7d0')],
        [500, rgb('#ebe8cf')],
        [1500, rgb('#e6d9bf')],
        [3000, rgb('#d8cdbf')],
        [4500, rgb('#f2f0ec')],
      ],
    },
    shade: { strength: 1, shadow: rgb('#6c6f8c') },
    coast: { color: rgb('#4f7ea3'), alpha: 0.65, px: 1 },
    contours: null,
    graticule: { degrees: 10, color: rgb('#5e8fb8'), alpha: 0.16, px: 0.8 },
    political: {
      fillNear: 0.35,
      fillFar: 0.55,
      band: null,
      halo: { px: 4, color: rgb('#ffffff'), alpha: 0.55 },
      border: { darken: 0.42, alpha: 0.95, px: 1.4 },
      palette: [
        '#ffbebd',
        '#dea280',
        '#f2cf94',
        '#b4b676',
        '#b7e3ad',
        '#77c3a9',
        '#8ee6ea',
        '#76bcdd',
        '#b4d6ff',
        '#b0a8e4',
        '#eec3f7',
        '#db9bb9',
      ].map(rgb),
    },
    provinceBorder: { color: rgb('#5a5a5a'), alpha: 0.45 },
    selection: { color: rgb('#1e1e1e'), alpha: 0.16 },
  },
};

/** Mezcla de enteros de 32 bits (avalancha), para repartir colores en la paleta del look. */
function mix32(seed: number): number {
  let h = seed >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Pasa el relleno político a la paleta del look: cada color distinto (uno por polity) va a un
 * color de la paleta por un hash de su RGB. Es solo para las maquetas: dos vecinos pueden caer en
 * el mismo color; el coloreo de grafo es D63.
 */
export function lookPoliticalColors(rgba: Uint8Array, look: MapLook): Uint8Array {
  const palette = look.political.palette;
  if (!palette) return rgba;
  const out = new Uint8Array(rgba.length);
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    const a = rgba[i + 3] ?? 0;
    if (a === 0) continue;
    const key = ((rgba[i] ?? 0) << 16) | ((rgba[i + 1] ?? 0) << 8) | (rgba[i + 2] ?? 0);
    const c = palette[mix32(key) % palette.length] ?? [0, 0, 0];
    out[i] = c[0];
    out[i + 1] = c[1];
    out[i + 2] = c[2];
    out[i + 3] = a;
  }
  return out;
}

// Datos REALES de la rebanada para las maquetas de P2.2: semilla 1, mundo mediano, continentes,
// k = 13000 (1000 d.C.), transcriptos de `data/ui-es.json` (scripts/extract-ui.mjs, la UI de P1
// en español). Los nombres, fechas, cifras y términos del porqué son los que da el motor; no hay
// nada inventado. Rótulos y símbolos del mapa salen de `public/renders/<look>/<toma>.json`.
import ui from './data/ui-es.json';

/** Líneas "AÑO era texto" (teletipo y eventos de la ficha); "por: …" es la causa de la anterior. */
function parseEvents(block: string): { year: string; text: string; cause?: string }[] {
  const out: { year: string; text: string; cause?: string }[] = [];
  for (const line of block.split('\n').map((l) => l.trim())) {
    const cause = /^por: (.+)$/.exec(line);
    const last = out.at(-1);
    if (cause && last) {
      last.cause = cause[1] ?? '';
      continue;
    }
    const m = /^(\d[\d.]* (?:a\.C\.|d\.C\.)) (.+)$/.exec(line);
    if (m) out.push({ year: m[1] ?? '', text: m[2] ?? '' });
  }
  return out;
}

const polityText = ui.polityPageWhy;
const rulersMatch = /Gobernantes\n\+(\d+) anteriores(.*)\n/.exec(polityText);
const rulerNames = (rulersMatch?.[2] ?? '').match(/[A-Z][a-z]*/g) ?? [];
/** Gobernantes que se muestran (los últimos). */
const RULERS_SHOWN = 8;

export const WORLD = {
  title: 'Semilla 1',
  params: ['Mediano', 'Continentes'],
  year: '1000 d.C.',
  era: 'Edad moderna temprana',
  head: '1900 d.C.',
  msPerYear: '1,48',
  k: 13000,
  endK: 13900,
  /** Estados activos y provincias con dueño en k (`__live.frame(k)`), de 1.501 provincias. */
  polities: 83,
  ownedProvinces: 1126,
  provinces: 1501,
} as const;

/** Eras del contenido de P1 (`Eras`), en orden. */
export const ERAS = [
  'Prehistoria',
  'Neolítico',
  'Edad del bronce',
  'Edad del hierro',
  'Edad moderna temprana',
] as const;

/** Bandas de eras y marcadores (significancia ≥ 0,8) hasta k, de `__live.timeline(k)`. */
export const TIMELINE = {
  bands: ui.timeline.bands,
  markers: ui.timeline.markers.map((m) => m.k),
};

export interface TickerLine {
  readonly year: string;
  readonly text: string;
  /** Tipo de evento (para el símbolo). */
  readonly kind: 'ruler' | 'death' | 'famine' | 'battle' | 'war' | 'peace';
}

/** Tipo de evento del teletipo, por su texto (para el símbolo). */
function tickerKind(text: string): TickerLine['kind'] {
  if (text.startsWith('Batalla')) return 'battle';
  if (text.includes('declara la guerra')) return 'war';
  if (/^(Paz|Termina la guerra)/.test(text)) return 'peace';
  if (/hambruna/i.test(text)) return 'famine';
  if (text.startsWith('Muere')) return 'death';
  return 'ruler';
}

/** Teletipo real en k (los primeros, del más nuevo al más viejo). */
export const TICKER: readonly TickerLine[] = parseEvents(ui.ticker)
  .slice(0, 9)
  .map((e) => ({ ...e, kind: tickerKind(e.text) }));

export interface Fact {
  readonly label: string;
  readonly value: string;
  /** Texto secundario (unidad, rótulo, contexto). */
  readonly note?: string;
  /** El valor es un link a otra entidad. */
  readonly link?: boolean;
}

export interface WhyTerm {
  /** `×` multiplica, `+` suma (en la unidad del stat). */
  readonly op: '×' | '+';
  readonly value: string;
  readonly source: string;
  readonly kind: 'innovation';
}

export interface WhyStat {
  readonly label: string;
  readonly value: string;
  readonly unit: string;
  readonly base: string;
  readonly terms: readonly WhyTerm[];
}

const inno = (op: '×' | '+', value: string, source: string): WhyTerm => ({
  op,
  value,
  source,
  kind: 'innovation',
});

export const POLITY = {
  id: 104,
  name: 'Mautu',
  kind: 'Estado',
  founded: '2278 a.C.',
  status: 'activo',
  colorSeed: 104,
  facts: [
    { label: 'Fundación', value: '2278 a.C.' },
    { label: 'Capital', value: 'Maimai', note: 'provincia 401', link: true },
    { label: 'Provincias', value: '41' },
    { label: 'Población', value: '19.040.655', note: 'personas' },
    { label: 'Gobernante', value: 'Jawai', note: 'desde 960 d.C.', link: true },
    { label: 'Heredero', value: 'Pubuyai', link: true },
  ] satisfies Fact[],
  rulersEarlier: Number(rulersMatch?.[1] ?? 0) + rulerNames.length - RULERS_SHOWN,
  rulers: rulerNames.slice(-RULERS_SHOWN),
  wars: [
    ...(/Guerras\n(.*)\n/.exec(polityText)?.[1] ?? '').matchAll(/([A-Z][a-z]+) \(([^)]+)\)/g),
  ].map((m) => ({ against: m[1] ?? '', year: m[2] ?? '' })),
  why: {
    computed: 'calculado para 1000 d.C. en 55 ms',
    stats: [
      {
        label: 'Fuerza militar',
        value: '566.325',
        unit: 'puntos',
        base: '190.400',
        terms: [
          inno('×', '1,1', 'Metalurgia del cobre'),
          inno('×', '1,3', 'Bronce'),
          inno('×', '1,3', 'Hierro'),
          inno('×', '1,6', 'Pólvora'),
        ],
      },
      {
        label: 'Alcance administrativo',
        value: '100',
        unit: 'días',
        base: '25',
        terms: [
          inno('+', '10', 'Rueda'),
          inno('+', '25', 'Escritura'),
          inno('+', '20', 'Moneda acuñada'),
          inno('+', '20', 'Pólvora'),
        ],
      },
    ] satisfies WhyStat[],
  },
  /** Eventos de la ficha, en orden (con su causa cuando la tiene): todos los del motor. */
  events: parseEvents(polityText.split('Eventos (con sus causas)')[1] ?? ''),
} as const;

export const PROVINCE = {
  id: 401,
  name: 'provincia 401',
  settlement: 'Maimai',
  settlementLevel: 'Gran ciudad',
  owner: 'Mautu',
  population: '846.885',
  urban: '16,1 %',
  culture: 'Haimair',
  knows: [
    'Agricultura',
    'Pastoreo',
    'Cerámica',
    'Rueda',
    'Metalurgia del cobre',
    'Arado',
    'Escritura',
    'Bronce',
    'Hierro',
    'Moneda acuñada',
    'Rotación de cultivos',
    'Imprenta',
    'Pólvora',
  ],
  state: [
    { label: 'Tierra cultivada', value: '94,4 %' },
    { label: 'Alimento / necesidad', value: '100 %' },
    { label: 'Población por cultura', value: 'Haimair 846.897' },
  ] satisfies Fact[],
  why: {
    computed: 'calculado para 1000 d.C. en 0 ms',
    stats: [
      {
        label: 'Rendimiento del cultivo',
        value: '3,12',
        unit: 't por km² y año',
        base: '0,8',
        terms: [
          inno('×', '1,1', 'Cerámica'),
          inno('×', '1,5', 'Arado'),
          inno('×', '1,05', 'Bronce'),
          inno('×', '1,25', 'Hierro'),
          inno('×', '1,8', 'Rotación de cultivos'),
        ],
      },
      {
        label: 'Tierra cultivable alcanzable',
        value: '100 %',
        unit: 'proporción',
        base: '40 %',
        terms: [
          inno('+', '20 %', 'Arado'),
          inno('+', '20 %', 'Hierro'),
          inno('+', '20 %', 'Rotación de cultivos'),
        ],
      },
      {
        label: 'Difusión del conocimiento',
        value: '0,019',
        unit: 'por año',
        base: '0,006',
        terms: [
          inno('×', '1,2', 'Rueda'),
          inno('×', '1,5', 'Escritura'),
          inno('×', '1,2', 'Moneda acuñada'),
          inno('×', '1,5', 'Imprenta'),
        ],
      },
      {
        label: 'Fracción urbana base',
        value: '8 %',
        unit: 'proporción',
        base: '3 %',
        terms: [
          inno('+', '2 %', 'Escritura'),
          inno('+', '1 %', 'Moneda acuñada'),
          inno('+', '2 %', 'Imprenta'),
        ],
      },
    ] satisfies WhyStat[],
  },
  events: parseEvents(ui.provincePageWhy.split('Eventos (con sus causas)')[1] ?? ''),
} as const;

export const MAP_MODES = ['Político', 'Bioma dominante', 'Un color por provincia', 'Sin relleno'];

/** Niveles de asentamiento del contenido de P1 (0 = aldea … 4 = metrópolis). */
export const SETTLEMENT_LEVELS = [
  'Aldea',
  'Pueblo',
  'Ciudad',
  'Gran ciudad',
  'Metrópolis',
] as const;

/** Lado de una celda del mundo mediano (km): 40.075 km de circunferencia / 2048 celdas. */
export const KM_PER_CELL = 40_075 / 2048;

/** Datos de una toma del mapa (scripts/shoot-map.mjs). */
export interface Shot {
  readonly width: number;
  readonly height: number;
  readonly year: number | null;
  readonly polities: readonly {
    readonly id: number;
    readonly name: string | null;
    readonly provinces: number;
    readonly world: readonly [number, number];
    readonly anchor: readonly [number, number] | null;
    readonly capital: number;
    readonly capitalAt: readonly [number, number] | null;
  }[];
  readonly settlements: readonly {
    readonly province: number;
    readonly level: number;
    readonly name: string | null;
    readonly owner: number;
    readonly at: readonly [number, number] | null;
  }[];
}

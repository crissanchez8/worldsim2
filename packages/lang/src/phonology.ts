// Idioma v1 (P1.3; DEVELOPMENT_PLAN §16 · P1.3): una fonología simple por idioma, sacada de una
// seed, y un generador de nombres romanizados. P4 (`packages/lang` completo) agrega morfología,
// cambio fonético y familias, reemplazando esto en el lugar.
import { rng } from '@ws/core';

/** Inventario de consonantes posibles (romanización) con su peso de aparición en un idioma. */
const CONSONANTS: readonly (readonly [string, number])[] = [
  ['p', 6],
  ['t', 9],
  ['k', 8],
  ['b', 5],
  ['d', 6],
  ['g', 5],
  ['m', 9],
  ['n', 10],
  ['s', 9],
  ['l', 8],
  ['r', 8],
  ['h', 4],
  ['f', 3],
  ['v', 3],
  ['z', 2],
  ['sh', 3],
  ['ch', 2],
  ['th', 2],
  ['y', 4],
  ['w', 3],
  ['q', 1],
  ['x', 1],
  ['j', 2],
  ['ng', 2],
];
const VOWELS: readonly (readonly [string, number])[] = [
  ['a', 10],
  ['e', 8],
  ['i', 8],
  ['o', 7],
  ['u', 6],
  ['ae', 1],
  ['ai', 2],
  ['au', 1],
  ['ei', 1],
  ['ou', 1],
  ['y', 1],
];

/** Fonología de un idioma: inventarios y probabilidades de la sílaba (C)V(C). */
export interface Phonology {
  readonly consonants: readonly string[];
  readonly vowels: readonly string[];
  /** Probabilidad de ataque y de coda por sílaba (fraction). */
  readonly onset: number;
  readonly coda: number;
  /** Consonantes permitidas en coda (subconjunto). */
  readonly codas: readonly string[];
  /** Sufijo de topónimos (puede ser vacío). */
  readonly placeSuffix: string;
}

const SUB_PHONOLOGY = 1;

function pickWeighted(
  d: rng.Draw,
  items: readonly (readonly [string, number])[],
  count: number,
): string[] {
  const pool = items.map(([s, w]) => [s, w] as [string, number]);
  const out: string[] = [];
  while (out.length < count && pool.length > 0) {
    const k = d.weighted(pool.map(([, w]) => w));
    const [s] = pool.splice(k, 1)[0] ?? [''];
    out.push(s);
  }
  return out;
}

/** Fonología determinista a partir de la seed del idioma (`Language.phonologySeed`). */
export function createPhonology(seed: number): Phonology {
  const d = rng.createRng(seed).stream(rng.Streams.naming).sub(SUB_PHONOLOGY).at(0, 0);
  const consonants = pickWeighted(d, CONSONANTS, d.intBetween(7, 13));
  const vowels = pickWeighted(d, VOWELS, d.intBetween(3, 6));
  const codas = consonants.filter((c) => c.length === 1 && 'mnlrsktz'.includes(c));
  const onset = d.range(0.6, 0.95);
  const coda = codas.length === 0 ? 0 : d.range(0.05, 0.45);
  const suffix = d.chance(0.6) ? syllable(d, consonants, vowels, codas, 1, coda) : '';
  return { consonants, vowels, onset, coda, codas, placeSuffix: suffix };
}

function syllable(
  d: rng.Draw,
  consonants: readonly string[],
  vowels: readonly string[],
  codas: readonly string[],
  onset: number,
  coda: number,
): string {
  let s = '';
  if (consonants.length > 0 && d.chance(onset)) s += d.pick(consonants);
  s += d.pick(vowels);
  if (codas.length > 0 && d.chance(coda)) s += d.pick(codas);
  return s;
}

/** Largo mínimo de un nombre (count, letras). */
const MIN_NAME_LETTERS = 3;

/** Tipos de nombre: cambian la cantidad de sílabas y los sufijos. */
export type NameKind = 'person' | 'place' | 'polity' | 'culture' | 'language';

const SYLLABLES: Readonly<Record<NameKind, readonly [number, number]>> = {
  person: [2, 3],
  place: [2, 3],
  polity: [2, 3],
  culture: [2, 3],
  language: [2, 3],
};

/** Saca letras repetidas de a tres o más y vocales dobles iguales ("aa" → "a"). */
function tidy(word: string): string {
  let out = '';
  for (const ch of word) {
    const n = out.length;
    if (n >= 2 && out[n - 1] === ch && out[n - 2] === ch) continue;
    if (n >= 1 && out[n - 1] === ch && 'aeiouy'.includes(ch)) continue;
    out += ch;
  }
  return out;
}

/** Nombre romanizado (con mayúscula inicial) en un idioma. */
export function makeName(phonology: Phonology, kind: NameKind, d: rng.Draw): string {
  const [min, max] = SYLLABLES[kind];
  const count = d.intBetween(min, max);
  let word = '';
  for (let i = 0; i < count; i++) {
    // La primera sílaba casi siempre tiene ataque: los nombres que empiezan en vocal son raros.
    const onset = i === 0 ? Math.max(phonology.onset, 0.85) : phonology.onset;
    word += syllable(
      d,
      phonology.consonants,
      phonology.vowels,
      phonology.codas,
      onset,
      phonology.coda,
    );
  }
  if (kind === 'place' && phonology.placeSuffix !== '' && d.chance(0.5))
    word += phonology.placeSuffix;
  let clean = tidy(word);
  // Nombres de 1–2 letras ("I", "Ae") no se leen como nombres: se agrega una sílaba con ataque.
  for (let guard = 0; clean.length < MIN_NAME_LETTERS && guard < 4; guard++) {
    word += syllable(d, phonology.consonants, phonology.vowels, phonology.codas, 1, 0);
    clean = tidy(word);
  }
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

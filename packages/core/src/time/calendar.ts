// Calendario del mundo (docs/model.md §3.1): años enteros SIN año 0. Negativo = a.C.,
// positivo = d.C.; al 1 a.C. (−1) le sigue el 1 d.C. (1). Toda aritmética de duraciones pasa por
// el índice astronómico (…, −1 a.C. → 0, 1 d.C. → 1), nunca restando años calendario a mano.
// El texto ("a.C.", "BC") vive en @ws/i18n.

/** Estaciones del año: 4, neutrales respecto del hemisferio. */
export const SEASONS_PER_YEAR = 4;
export type Season = 0 | 1 | 2 | 3;

export function isValidYear(year: number): boolean {
  return Number.isInteger(year) && year !== 0;
}

function assertYear(year: number): void {
  if (!isValidYear(year)) throw new Error(`año inválido: ${year} (entero distinto de 0)`);
}

/** Año calendario → índice astronómico (el 1 a.C. es el 0). */
export function toAstro(year: number): number {
  assertYear(year);
  return year < 0 ? year + 1 : year;
}

/** Índice astronómico → año calendario. */
export function fromAstro(astro: number): number {
  if (!Number.isInteger(astro)) throw new Error(`índice astronómico inválido: ${astro}`);
  return astro <= 0 ? astro - 1 : astro;
}

/** Suma n años (n puede ser negativo) saltando el año 0. */
export function addYears(year: number, n: number): number {
  if (!Number.isInteger(n)) throw new Error(`años a sumar inválidos: ${n}`);
  return fromAstro(toAstro(year) + n);
}

export function nextYear(year: number): number {
  return addYears(year, 1);
}

/** Años transcurridos de `from` a `to` (negativo si `to` es anterior). */
export function yearsBetween(from: number, to: number): number {
  return toAstro(to) - toAstro(from);
}

/** Índice de tick (0 = año de inicio de la corrida). */
export function tickIndex(year: number, startYear: number): number {
  return yearsBetween(startYear, year);
}

/** ¿Corre en este año un sistema de cadencia "cada n años"? (múltiplos del índice astronómico) */
export function isEveryNYears(year: number, n: number): boolean {
  if (!Number.isInteger(n) || n < 1) throw new Error(`cadencia inválida: cada ${n} años`);
  const astro = toAstro(year);
  return ((astro % n) + n) % n === 0;
}

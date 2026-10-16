// Formateadores dependientes del idioma. El motor guarda años y cantidades como números
// (docs/model.md §3.1); el texto se arma acá. Intl se permite fuera del motor.
import type { i18n } from 'i18next';

/** Número con los separadores del idioma activo (es: 12.000 · en: 12,000). */
export function formatNumber(instance: i18n, value: number): string {
  return new Intl.NumberFormat(instance.language).format(value);
}

/** Año calendario del mundo (sin año 0): −12000 → "12.000 a.C." / "12,000 BC". */
export function formatYear(instance: i18n, year: number): string {
  if (!Number.isInteger(year) || year === 0) throw new Error(`año inválido: ${year}`);
  // Los años de 4 cifras no llevan separador en ningún idioma (1900); desde 5 cifras sí (12.000).
  const text = new Intl.NumberFormat(instance.language, { useGrouping: 'min2' }).format(
    Math.abs(year),
  );
  return year < 0
    ? instance.t('time.yearBC', { year: text })
    : instance.t('time.yearAD', { year: text });
}

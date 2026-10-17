// Formato de números del inspector y del resumen (Intl del idioma activo; nada de texto suelto).
import { formatNumber } from '@ws/i18n';
import type { i18n as I18n } from 'i18next';

/** Personas, redondeadas. */
export function formatPersons(i18n: I18n, persons: number): string {
  return formatNumber(i18n, Math.round(persons));
}

/** Fracción → porcentaje con un decimal (sin el signo: lo pone la plantilla). */
export function formatPercent(i18n: I18n, fraction: number): string {
  return formatNumber(i18n, Math.round(fraction * 1000) / 10);
}

/** Valor de un stat según su unidad (fracciones en %, tasas con 4 decimales). */
export function formatStat(i18n: I18n, unit: string, value: number): string {
  switch (unit) {
    case 'fraction':
      return `${formatPercent(i18n, value)} %`;
    case 'per_year':
      return formatNumber(i18n, Math.round(value * 10_000) / 10_000);
    case 'score':
      return formatNumber(i18n, Math.round(value));
    default:
      return formatNumber(i18n, Math.round(value * 100) / 100);
  }
}

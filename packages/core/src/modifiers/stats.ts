import type { Unit } from '../store/units';

/**
 * Forma de agregación de un stat (docs/model.md §5.12):
 * - `additive`:       (base + Σ add) × Π mul
 * - `multiplicative`:  base × Π mul + Σ add
 * Después se aplican los topes (`min`: como mucho v) y pisos (`max`: como poco v) de los
 * modificadores, y al final el rango propio del stat.
 */
export type Combine = 'additive' | 'multiplicative';

export interface StatDef {
  readonly unit: Unit;
  readonly combine: Combine;
  /** Rango válido del valor final (acota después de todo). */
  readonly min?: number;
  readonly max?: number;
  readonly doc?: string;
}

const NAME = /^[a-z][A-Za-z0-9]*$/;

/** Declara el registro de stats. Las claves son el identificador estable del stat. */
export function defineStats<const T extends Readonly<Record<string, StatDef>>>(defs: T): T {
  // eslint-disable-next-line no-restricted-properties -- solo valida nombres y rangos
  for (const [key, def] of Object.entries(defs)) {
    if (!NAME.test(key)) throw new Error(`stat: nombre inválido "${key}"`);
    if (def.min !== undefined && def.max !== undefined && def.min > def.max) {
      throw new Error(`stat ${key}: min > max`);
    }
  }
  return Object.freeze({ ...defs });
}

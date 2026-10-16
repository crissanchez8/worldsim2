// Parámetros de la simulación ficticia del spike B. No es un modelo histórico: es una carga de
// trabajo con la forma del motor real (pops por provincia, territorio que cambia, deltas,
// eventos) para medir Worker, mensajes, historia y determinismo.

export interface SimConfig {
  readonly seed: number;
  /** Grilla de provincias con wrap este-oeste. */
  readonly width: number;
  readonly height: number;
  readonly popsPerProvince: number;
  readonly cultures: number;
  /** Polities iniciales: bloques de blockSize × blockSize provincias. */
  readonly blockSize: number;
  readonly startYear: number;
  readonly years: number;
  /** Keyframe completo y visual cada N años (§8.4 del plan: 100). */
  readonly keyframeEvery: number;
}

export const DEFAULT_CONFIG: SimConfig = {
  seed: 1,
  width: 50, // 50 × 30 = 1.500 provincias (D21)
  height: 30,
  popsPerProvince: 10, // 15.000 pops
  cultures: 40,
  blockSize: 5,
  startYear: -12000,
  years: 14000,
  keyframeEvery: 100,
};

/** Constantes de la dinámica ficticia (con unidad). */
export const DYNAMICS = {
  baseGrowth: 0.0008, // per_year: crecimiento de base
  fertilityGrowth: 0.004, // per_year por unidad de fertilidad sobre 0,5
  noise: 0.02, // per_year: amplitud del ruido anual
  capacityPerFertility: 40000, // persons por provincia con fertilidad 1
  capacityPressure: 0.05, // per_year por unidad de sobrecarga
  assimilation: 0.002, // per_year: fracción que pasa a la cultura mayoritaria
  attackChance: 0.004, // per_year por provincia
  secessionChance: 0.00005, // per_year por provincia
  minPopSize: 1, // persons
} as const;

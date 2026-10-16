// Parámetros de la simulación (regla de oro 9: con unidad y comentario). Los de calibración de
// cada sistema llegan con su sistema (P1.3).

export const SIM_DEFAULTS = {
  /** Primer año simulado (year; D11: ≈12.000 a.C.). */
  startYear: -12000,
  /** Último año simulado (year; S1: ≈1900). */
  endYear: 1900,
} as const;

export const LEDGER = {
  /** Tamaño mínimo de un pop (persons, I3): por debajo se fusiona con el más parecido. */
  minPopSize: 1,
  /** Tolerancia relativa de la conservación de población (fraction, I2). */
  conservationTolerance: 1e-9,
} as const;

export const INITIAL_STATE = {
  /**
   * Densidad de forrajeros con habitabilidad 1 (persons_per_km2). Tierra hacia 10.000 a.C.:
   * ~4 M de personas en ~100 M km² habitables ≈ 0,04/km² de promedio; con habitabilidad media
   * ~0,4, la densidad en la mejor tierra ronda 0,1. P1.3 la calibra contra el Apéndice A.
   */
  foragerDensity: 0.1,
} as const;

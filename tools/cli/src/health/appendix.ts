// Curvas de referencia del Apéndice A del plan (calibración): bandas de población mundial y
// ventanas de los primeros hitos. Las poblaciones se escalan por la tierra del mundo relativa a la
// de la Tierra. En P1 son informativas: no frenan la salud (BRIEF P1.8).

/** Tierra emergida de la Tierra (km2). */
export const EARTH_LAND_KM2 = 149_000_000;

/** Banda de población mundial de la Tierra (persons) por año. */
export const POPULATION_BANDS: readonly {
  readonly year: number;
  readonly min: number;
  readonly max: number;
}[] = [
  { year: -10000, min: 1e6, max: 10e6 },
  { year: -5000, min: 3e6, max: 30e6 },
  { year: -3000, min: 8e6, max: 60e6 },
  { year: -1000, min: 25e6, max: 100e6 },
  { year: 1, min: 100e6, max: 400e6 },
  { year: 1000, min: 150e6, max: 450e6 },
  { year: 1500, min: 250e6, max: 700e6 },
  { year: 1800, min: 500e6, max: 1400e6 },
  { year: 1900, min: 900e6, max: 2200e6 },
];

/** Hito → ventana aceptable del primer caso mundial (years, calendario). */
export const MILESTONES: readonly {
  readonly key: string;
  readonly from: number;
  readonly to: number;
}[] = [
  { key: 'agriculture', from: -11000, to: -6000 },
  { key: 'firstCity', from: -5500, to: -2500 },
  { key: 'writing', from: -4500, to: -1500 },
  { key: 'bronze', from: -4500, to: -2000 },
  { key: 'iron', from: -2000, to: 200 },
  { key: 'coinage', from: -1500, to: 500 },
  { key: 'printing', from: 500, to: 1700 },
  { key: 'gunpowder', from: 300, to: 1500 },
  { key: 'oceanNavigation', from: 900, to: 1700 },
];

/** Población de una polity por encima de esta fracción de la mundial = hegemón universal. */
export const HEGEMON_SHARE = 0.5;

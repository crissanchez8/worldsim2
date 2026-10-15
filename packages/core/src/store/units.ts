// Unidades físicas de los campos del estado (CLAUDE.md, regla de oro 5). Todo campo declara
// la suya; los adimensionales también (ratio, fraction, score…). El glosario completo, con
// definiciones, vive en docs/model.md §3.2 (un test verifica que coincidan).
export const UNITS = [
  // conteos
  'persons', // personas
  'persons_per_km2', // densidad
  'count', // cantidad de cosas (edificios, unidades…)
  // espacio
  'm', // metros (altitud, profundidad)
  'km', // kilómetros (distancias)
  'km2', // kilómetros cuadrados (superficies)
  'degrees', // latitud/longitud
  'days', // días de viaje de referencia (costo del grafo de movimiento)
  // tiempo
  'years', // duración en años
  'year', // año calendario (sin año 0; ver core/time)
  'season', // estación (0..3)
  // materia y dinero
  'tons', // toneladas
  'tons_per_year',
  'coins', // unidad monetaria de cuenta (plata de ley estándar)
  'coins_per_year',
  'coins_per_ton',
  // clima
  'celsius',
  'mm_per_year',
  'm3_per_s', // caudal
  // adimensionales
  'fraction', // [0, 1]
  'ratio', // ≥ 0, sin techo
  'score', // índice adimensional con rango documentado en model.md
  'per_year', // tasa anual (p. ej. crecimiento)
  // discretos
  'enum', // valor de una enumeración de content/
  'flag', // booleano 0/1
  'id', // referencia a otra entidad (0 = ninguna)
  'bits', // bitset
  'text', // texto (nombres generados)
] as const;

export type Unit = (typeof UNITS)[number];

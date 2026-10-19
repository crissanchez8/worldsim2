// Biomas v1 (P1.1; DEVELOPMENT_PLAN §12.4: P3 los lleva a ≈14). La clasificación de una celda de
// tierra es la PRIMERA fila cuyas condiciones cumple, en el orden de la tabla (tipo Whittaker:
// temperatura media anual × precipitación, más la altura para el alpino). La última fila no tiene
// condiciones: garantiza que toda celda tenga bioma (lo valida la tabla).
import { z } from 'zod';
import { defineTable } from '../table';

const fraction = z.number().min(0).max(1);

export const Biomes = defineTable(
  'biome',
  z
    .object({
      key: z.string(),
      /** Temperatura media anual: la celda cumple si tMin ≤ T < tMax (celsius). */
      tMin: z.number().optional(),
      tMax: z.number().optional(),
      /** Precipitación anual: pMin ≤ P < pMax (mm_per_year). */
      pMin: z.number().nonnegative().optional(),
      pMax: z.number().positive().optional(),
      /** Altura mínima sobre el nivel del mar (m). */
      minElevation: z.number().optional(),
      /** Atracción para asentarse (score [0, 1]): densidad de provincias y población inicial. */
      habitability: fraction,
      /** Parte de la tierra apta para cultivo (fraction). */
      arable: fraction,
      /** Multiplicador del tiempo de viaje por el terreno (ratio; 1 = llanura abierta). */
      moveCost: z.number().positive(),
    })
    .strict(),
  [
    { key: 'ice', tMax: -10, habitability: 0, arable: 0, moveCost: 3 },
    {
      key: 'alpine',
      minElevation: 3000,
      tMax: 8,
      habitability: 0.05,
      arable: 0.02,
      moveCost: 3,
    },
    { key: 'tundra', tMax: -2, habitability: 0.1, arable: 0.02, moveCost: 1.5 },
    { key: 'taiga', tMax: 4, habitability: 0.25, arable: 0.1, moveCost: 1.6 },
    { key: 'desert', pMax: 250, habitability: 0.08, arable: 0.03, moveCost: 1.8 },
    { key: 'grassland', tMax: 18, pMax: 500, habitability: 0.7, arable: 0.6, moveCost: 1 },
    { key: 'temperateForest', tMax: 18, habitability: 0.8, arable: 0.45, moveCost: 1.4 },
    { key: 'savanna', pMax: 1100, habitability: 0.6, arable: 0.35, moveCost: 1.1 },
    { key: 'tropicalForest', habitability: 0.5, arable: 0.2, moveCost: 2.2 },
  ],
);

/** Primera fila que cumple (índice de `Biomes`). */
export function classifyBiome(temperature: number, precipitation: number, elevation: number) {
  const rows = Biomes.rows;
  for (let i = 0; i < rows.length; i++) {
    const b = rows[i];
    if (b === undefined) break;
    if (b.tMin !== undefined && temperature < b.tMin) continue;
    if (b.tMax !== undefined && temperature >= b.tMax) continue;
    if (b.pMin !== undefined && precipitation < b.pMin) continue;
    if (b.pMax !== undefined && precipitation >= b.pMax) continue;
    if (b.minElevation !== undefined && elevation < b.minElevation) continue;
    return i;
  }
  return rows.length - 1;
}

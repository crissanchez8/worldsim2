// Parámetros de mundo (docs/model.md §4.1): tamaños y tipos de mapa. Los detalles físicos de
// cada tipo (placas, proporciones) los agrega el worldgen en P1.1.
import { z } from 'zod';
import { defineTable } from '../table';

const count = z.number().int().positive();

export const WorldSizes = defineTable(
  'worldSize',
  z.object({
    key: z.string(),
    /** Ancho del ráster (count, celdas; el perímetro E-O con wrap). Potencia de 2 para el render. */
    width: count,
    /** Alto del ráster (count, celdas; de polo a polo). */
    height: count,
    /** Provincias objetivo (count; D21: ≈1.500 en el mediano). */
    provinceTarget: count,
  }),
  [
    // Para tests y desarrollo: 4 veces menos celdas, provincias más grandes.
    { key: 'small', width: 1024, height: 512, provinceTarget: 400 },
    // Por defecto (D21; spike A: 2048×1024 a 60 fps).
    { key: 'medium', width: 2048, height: 1024, provinceTarget: 1500 },
  ],
);

export const MapTypes = defineTable('mapType', z.object({ key: z.string() }), [
  { key: 'continents' },
  { key: 'pangaea' },
  { key: 'archipelago' },
]);

// Parámetros de mundo (docs/model.md §4.1): tamaños y tipos de mapa. Los tipos se definen en
// placas (DEVELOPMENT_PLAN §12): cuántas hay, cuántas son continentales y si se agrupan.
import { z } from 'zod';
import { defineTable } from '../table';

const count = z.number().int().positive();
const fraction = z.number().min(0).max(1);

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
    /** Zonas marítimas objetivo (count). */
    seaZoneTarget: count,
  }),
  [
    // Para tests y desarrollo: 4 veces menos celdas (de ~39 km), provincias más grandes.
    { key: 'small', width: 1024, height: 512, provinceTarget: 400, seaZoneTarget: 80 },
    // Por defecto (D21; spike A: 2048×1024 a 60 fps). Celdas de ~19,6 km.
    { key: 'medium', width: 2048, height: 1024, provinceTarget: 1500, seaZoneTarget: 250 },
  ],
);

export const MapTypes = defineTable(
  'mapType',
  z.object({
    key: z.string(),
    /** Placas tectónicas (count). */
    plates: count,
    /** Placas continentales (count, ≤ plates): donde se concentra la tierra. */
    continentalPlates: count,
    /** Si las continentales se eligen vecinas entre sí (un supercontinente). */
    clustered: z.boolean(),
    /** Peso del ruido frente a las placas (ratio): más alto = costas más recortadas e islas. */
    noiseWeight: z.number().positive(),
    /** Fracción de tierra sugerida (fraction) para la pantalla de crear mundo. */
    defaultLandFraction: fraction,
  }),
  [
    {
      key: 'continents',
      plates: 16,
      continentalPlates: 6,
      clustered: false,
      noiseWeight: 0.45,
      defaultLandFraction: 0.3,
    },
    {
      key: 'pangaea',
      plates: 14,
      continentalPlates: 5,
      clustered: true,
      noiseWeight: 0.4,
      defaultLandFraction: 0.3,
    },
    {
      key: 'archipelago',
      plates: 32,
      continentalPlates: 10,
      clustered: false,
      noiseWeight: 0.8,
      defaultLandFraction: 0.2,
    },
  ],
);

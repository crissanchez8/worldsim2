// Datos de render que salen del `WorldStatic` (CPU, puro): texturas y cintas de río. Se mide su
// costo en la carga (`MapReport.load.mapDataMs`).
import type { WorldStatic } from '@ws/worldgen';
import { biomeColors, provinceColors, type ColorMode } from './colors';
import { CHUNK_SIZE, RIVERS } from './config';
import {
  buildRiverGeometry,
  flowT,
  type RiverColumnGeometry,
  smoothRiver,
  traceRivers,
} from './rivers';
import { colorTableTexels, heightTexels, provinceIdTexels, surfaceTexels } from './textures';

export interface MapData {
  readonly texels: {
    readonly height: Uint16Array;
    readonly surface: Uint8Array;
    readonly ids: Uint8Array;
    readonly colors: Uint8Array;
  };
  readonly rivers: readonly RiverColumnGeometry[];
  readonly riverLines: number;
  /** Elevación máxima del ráster (m). */
  readonly maxElevation: number;
}

export function buildMapData(world: WorldStatic, colorMode: ColorMode): MapData {
  const r = world.raster;
  let maxElevation = 0;
  for (const e of r.elevation) if (e > maxElevation) maxElevation = e;
  const lines = traceRivers(r, RIVERS.minFlow).map((l) => smoothRiver(l, RIVERS.smoothing));
  return {
    texels: {
      height: heightTexels(r.elevation, r.water),
      surface: surfaceTexels(r.water, r.biome, biomeColors()),
      ids: provinceIdTexels(r.province, r.width, r.height),
      colors: colorTableTexels(provinceColors(colorMode, world.provinces), world.provinces.count),
    },
    rivers: buildRiverGeometry(lines, r.width, CHUNK_SIZE, (f) =>
      flowT(f, RIVERS.minFlow, RIVERS.maxFlow),
    ),
    riverLines: lines.length,
    maxElevation,
  };
}

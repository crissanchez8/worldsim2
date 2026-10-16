// Zonas marítimas v1 (P1.1): regiones del océano por crecimiento uniforme desde semillas
// espaciadas; los mares cerrados reciben su propia zona.
import { rng } from '@ws/core';
import { Water } from './hydrology';
import { SUB_SEA_SEEDS } from './provinces';
import { D8_LENGTH, type Grid } from './raster';
import { assignRegions, placeSeeds } from './regions';
import type { SeaZoneStatic } from './world-static';

export function assignSeaZones(
  seed: number,
  g: Grid,
  target: number,
  water: Uint8Array,
): { readonly seaZone: Uint16Array; readonly count: number } {
  const n = g.width * g.height;
  const passable = new Uint8Array(n);
  let oceanCells = 0;
  for (let i = 0; i < n; i++) {
    if (water[i] === Water.ocean) {
      passable[i] = 1;
      oceanCells++;
    }
  }
  const candidates = new Int32Array(oceanCells);
  let at = 0;
  for (let i = 0; i < n; i++) if (passable[i]) candidates[at++] = i;
  const seeds = placeSeeds(g, {
    target,
    candidates,
    stream: rng.createRng(seed).stream(rng.Streams.worldgenProvinces).sub(SUB_SEA_SEEDS),
  });
  const seaZone = new Uint16Array(n);
  const count = assignRegions(g, seeds, seaZone, passable, (_f, _t, k) => D8_LENGTH[k] ?? 1);
  return { seaZone, count };
}

export function seaZoneStatics(
  g: Grid,
  cellKm: number,
  seaZone: Uint16Array,
  count: number,
  water: Uint8Array,
): SeaZoneStatic {
  const { width, height } = g;
  const area = new Float64Array(count + 1);
  const coastal = new Uint8Array(count + 1);
  const cellArea = cellKm * cellKm;
  const land = (j: number) => j >= 0 && water[j] !== Water.ocean;
  for (let i = 0; i < seaZone.length; i++) {
    const z = seaZone[i] ?? 0;
    if (z === 0) continue;
    area[z] = (area[z] ?? 0) + cellArea;
    if (coastal[z]) continue;
    const x = i % width;
    const y = (i - x) / width;
    if (
      land(y * width + ((x + 1) % width)) ||
      land(y * width + ((x + width - 1) % width)) ||
      land(y > 0 ? i - width : -1) ||
      land(y + 1 < height ? i + width : -1)
    ) {
      coastal[z] = 1;
    }
  }
  return { count, area, coastal };
}

// Marcadores (datos puros): asentamientos por nivel y batallas. La capa instanciada
// (`marker-layer.ts`) los dibuja; P1.3/P1.6 pasan los reales. En P1.2 hay datos de prueba.
import { neighborsOf, type WorldStatic } from '@ws/worldgen';
import { MARKERS, PALETTE } from './config';
import { wrap } from './wrap';

export interface SettlementMarker {
  /** Posición en celdas del ráster (x con wrap; se aceptan fracciones). */
  readonly x: number;
  readonly y: number;
  /** Nivel 0 (aldea) … 4 (metrópolis): `SettlementLevel` de P1.3. */
  readonly level: number;
}

export interface BattleMarker {
  readonly x: number;
  readonly y: number;
  /** 1 = de este año, 0 = vieja (se achica). */
  readonly recency: number;
}

/** Floats por instancia: x, z, radio (px), sin uso · r, g, b (lineal), sin uso. */
export const MARKER_FLOATS = 8;

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function writeInstance(
  out: Float32Array,
  i: number,
  x: number,
  y: number,
  radiusPx: number,
  rgb: readonly number[],
): void {
  const o = i * MARKER_FLOATS;
  out[o] = x;
  out[o + 1] = y;
  out[o + 2] = radiusPx;
  out[o + 4] = srgbToLinear(rgb[0] ?? 0);
  out[o + 5] = srgbToLinear(rgb[1] ?? 0);
  out[o + 6] = srgbToLinear(rgb[2] ?? 0);
}

const LEVELS = MARKERS.settlementRadiusPx.length;

export function settlementInstances(markers: readonly SettlementMarker[]): Float32Array {
  const out = new Float32Array(markers.length * MARKER_FLOATS);
  markers.forEach((m, i) => {
    const level = Math.min(LEVELS - 1, Math.max(0, Math.round(m.level)));
    writeInstance(
      out,
      i,
      m.x,
      m.y,
      MARKERS.settlementRadiusPx[level] ?? 0,
      PALETTE.settlement[level] ?? PALETTE.battle,
    );
  });
  return out;
}

export function battleInstances(markers: readonly BattleMarker[]): Float32Array {
  const [r0, r1] = MARKERS.battleRadiusPx;
  const out = new Float32Array(markers.length * MARKER_FLOATS);
  markers.forEach((m, i) => {
    const t = Math.min(1, Math.max(0, m.recency));
    writeInstance(out, i, m.x, m.y, r0 + (r1 - r0) * t, PALETTE.battle);
  });
  return out;
}

/** Habitabilidad mínima para un asentamiento de prueba (score). */
const TEST_SETTLEMENT_MIN_HABITABILITY = 0.45;
/** Una batalla de prueba cada tantas provincias (count). */
const TEST_BATTLE_EVERY = 97;

/**
 * Datos de prueba deterministas: un asentamiento en el centroide de cada provincia habitable (nivel
 * por habitabilidad) y algunas batallas en fronteras entre provincias vecinas.
 */
export function testMarkers(world: Pick<WorldStatic, 'raster' | 'provinces' | 'graph'>): {
  settlements: SettlementMarker[];
  battles: BattleMarker[];
} {
  const p = world.provinces;
  const width = world.raster.width;
  const settlements: SettlementMarker[] = [];
  const battles: BattleMarker[] = [];
  for (let id = 1; id <= p.count; id++) {
    const h = p.habitability[id] ?? 0;
    const x = p.centroidX[id] ?? 0;
    const y = p.centroidY[id] ?? 0;
    if (h >= TEST_SETTLEMENT_MIN_HABITABILITY) {
      const t = (h - TEST_SETTLEMENT_MIN_HABITABILITY) / (1 - TEST_SETTLEMENT_MIN_HABITABILITY);
      settlements.push({ x, y, level: Math.min(LEVELS - 1, Math.floor(t * LEVELS)) });
    }
    if (id % TEST_BATTLE_EVERY === 0) {
      const other = neighborsOf(world.graph, id)[0];
      if (other === undefined) continue;
      // Punto medio entre los centroides, por el camino corto del wrap.
      let dx = (p.centroidX[other] ?? 0) - x;
      if (dx > width / 2) dx -= width;
      else if (dx < -width / 2) dx += width;
      battles.push({
        x: wrap(x + dx / 2, width),
        y: (y + (p.centroidY[other] ?? 0)) / 2,
        recency: (id % 5) / 4,
      });
    }
  }
  return { settlements, battles };
}

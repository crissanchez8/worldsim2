// Estado de la simulación ficticia, armado con las primitivas reales de @ws/core.
import { events, math, rng, scheduler, store } from '@ws/core';
import { DEFAULT_CONFIG, type SimConfig } from './config';
import { PopDeltaBuffer } from './pop-deltas';

const { createTable, defineSchema, Globals } = store;

export const provinceSchema = defineSchema('province', 1, {
  owner: { type: 'ref', unit: 'id', ref: 'polity' },
  fertility: { type: 'f32', unit: 'fraction' },
});
export const popSchema = defineSchema('pop', 1, {
  province: { type: 'ref', unit: 'id', ref: 'province' },
  culture: { type: 'u16', unit: 'enum' },
  size: { type: 'f64', unit: 'persons' },
});
export const politySchema = defineSchema('polity', 1, {
  founded: { type: 'i32', unit: 'year' },
  colorSeed: { type: 'u32', unit: 'id' },
});
export const worldSchema = defineSchema('world', 1, {
  year: { type: 'i32', unit: 'year', doc: 'próximo año a simular' },
  nextEventId: { type: 'u32', unit: 'id' },
});

export interface TerritoryRequest {
  readonly province: number;
  readonly newOwner: number;
  /** Mayor gana (secesión 3 > conquista 2); a igual prioridad, la primera emitida. */
  readonly priority: number;
  readonly cause: 'conquest' | 'secession';
  readonly causeEvent: number | null;
}

/** Vistas derivadas (no son estado; las recalcula `derive` al final de cada tick, M3). */
export interface Derived {
  provincePop: Float64Array;
  majorityCulture: Uint16Array;
  polityStrength: Float64Array;
  /** Índice denso provincia → filas de pops (CSR): filas de `popRowsStart[p]` a `popRowsStart[p+1]`. */
  popRowsStart: Uint32Array;
  popRows: Uint32Array;
}

export function createEventTypes() {
  const registry = new events.EventRegistry();
  return {
    registry,
    territoryChanged: registry.define<{ from: number; to: number; cause: string }>({
      key: 'territory.changed',
      threshold: 0,
      significance: () => 0.2,
    }),
    polityFormed: registry.define<{ founded: number }>({
      key: 'polity.formed',
      threshold: 0,
      significance: () => 0.5,
    }),
  };
}

export function createState(config: SimConfig = DEFAULT_CONFIG) {
  const n = config.width * config.height;
  const province = createTable(provinceSchema, { capacity: n });
  const pop = createTable(popSchema, { capacity: n * config.popsPerProvince });
  const polity = createTable(politySchema, { capacity: 256 });
  const world = new Globals(worldSchema, { year: config.startYear, nextEventId: 1 });
  return { province, pop, polity, world };
}
export type State = ReturnType<typeof createState>;

/** Partes del estado en orden fijo (snapshot y hash). */
export function partsOf(state: State) {
  return [state.world, state.province, state.pop, state.polity] as const;
}

/** Vecinos 4-conexos con wrap este-oeste (0 = borde norte/sur). Estático, no es estado. */
export function buildNeighbors(config: SimConfig): Uint32Array {
  const { width: w, height: h } = config;
  const out = new Uint32Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      out[i] = y * w + ((x + w - 1) % w) + 1; // oeste (wrap)
      out[i + 1] = y * w + ((x + 1) % w) + 1; // este (wrap)
      out[i + 2] = y > 0 ? (y - 1) * w + x + 1 : 0; // norte
      out[i + 3] = y < h - 1 ? (y + 1) * w + x + 1 : 0; // sur
    }
  }
  return out;
}

/** Estado inicial determinista a partir de la seed. */
export function populate(state: State, config: SimConfig = DEFAULT_CONFIG): void {
  const { width: w, height: h, blockSize: b, cultures, popsPerProvince, seed } = config;
  const blocksX = Math.ceil(w / b);
  const blocksY = Math.ceil(h / b);
  for (let i = 0; i < blocksX * blocksY; i++) {
    state.polity.add({
      founded: config.startYear,
      colorSeed: rng.rngUint32(seed, rng.Streams.spike, 3, i, config.startYear, 0),
    });
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const id = y * w + x + 1;
      const wave = math.sin((x * math.TAU) / w) * math.cos(((y + 0.5) * math.PI) / h - math.PI / 2);
      const jitter = rng.rngUniform(seed, rng.Streams.spike, 3, id, config.startYear, 1);
      const fertility = math.clamp(0.5 + 0.35 * wave + 0.3 * (jitter - 0.5), 0.05, 1);
      state.province.add({
        owner: 1 + Math.floor(x / b) + Math.floor(y / b) * blocksX,
        fertility,
      });
      const baseCulture = (Math.floor(x / 10) + Math.floor(y / 10) * 5) % cultures;
      for (let k = 0; k < popsPerProvince; k++) {
        state.pop.add({
          province: id,
          culture: 1 + ((baseCulture + k * 7) % cultures),
          size: k === 0 ? 2000 * fertility : (200 * fertility) / k,
        });
      }
    }
  }
}

export function emptyDerived(): Derived {
  return {
    provincePop: new Float64Array(0),
    majorityCulture: new Uint16Array(0),
    polityStrength: new Float64Array(0),
    popRowsStart: new Uint32Array(0),
    popRows: new Uint32Array(0),
  };
}

export function createBuffers() {
  return {
    popDeltas: new PopDeltaBuffer('popDeltas'),
    territoryRequests: scheduler.createBuffer<TerritoryRequest>('territoryRequests'),
  };
}

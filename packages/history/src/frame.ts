// Lo que el mapa y el inspector necesitan de un año sin re-simular (ADR-008, D50): el marco
// visual (dueño, nivel de asentamiento, cultura mayoritaria e innovaciones por provincia, y la
// capital de cada polity activa) y, cada 10 años, la población y la fracción urbana por provincia.
// Todo se extrae del estado y de las vistas derivadas al final de un año; no es estado.
import { math } from '@ws/core';
import type { SimContext } from '@ws/sim';

/** Sin asentamiento (`VisualFrame.level`). */
export const NO_LEVEL = 255;

export interface VisualFrame {
  /** Índice = id de provincia (el 0 no se usa). */
  readonly owner: Uint32Array;
  /** Índice de SettlementLevels; NO_LEVEL sin asentamiento. */
  readonly level: Uint8Array;
  readonly culture: Uint32Array;
  /** Bits como `Province.knownInnovations`. */
  readonly innovations: Uint32Array;
  /** Capital de cada polity activa (polity → provincia). */
  readonly capitals: Map<number, number>;
}

export function emptyFrame(provinces: number): VisualFrame {
  return {
    owner: new Uint32Array(provinces + 1),
    level: new Uint8Array(provinces + 1).fill(NO_LEVEL),
    culture: new Uint32Array(provinces + 1),
    innovations: new Uint32Array(provinces + 1),
    capitals: new Map(),
  };
}

export function cloneFrame(f: VisualFrame): VisualFrame {
  return {
    owner: f.owner.slice(),
    level: f.level.slice(),
    culture: f.culture.slice(),
    innovations: f.innovations.slice(),
    capitals: new Map(f.capitals),
  };
}

export function captureFrame(w: SimContext): VisualFrame {
  const n = w.world.provinces.count;
  const f = emptyFrame(n);
  const owner = w.state.province.column('owner');
  const known = w.state.province.column('knownInnovations');
  for (let p = 1; p <= n; p++) {
    f.owner[p] = owner[p - 1] ?? 0;
    f.innovations[p] = known[p - 1] ?? 0;
    f.culture[p] = w.derived.majorityCulture[p] ?? 0;
  }
  const { settlement } = w.state;
  for (const row of settlement.rows()) {
    f.level[settlement.column('province')[row] ?? 0] = settlement.column('level')[row] ?? 0;
  }
  for (const [id, rec] of w.state.polity.entries()) {
    if (rec.ended === 0) f.capitals.set(id, rec.capital);
  }
  return f;
}

/** Población máxima representable en la serie (persons): el logaritmo se reparte en u16. */
const LOG_MAX = math.log(1e10);

/** Población (persons) → u16 logarítmico (error relativo ≤ ~0,02 %). */
export function quantizePopulation(persons: number): number {
  if (!(persons > 0)) return 0;
  return Math.min(65535, Math.max(1, Math.round((math.log(1 + persons) / LOG_MAX) * 65535)));
}

export function dequantizePopulation(q: number): number {
  return q === 0 ? 0 : math.expm1((q / 65535) * LOG_MAX);
}

/** Muestra de la serie por provincia: población (u16 log) y fracción urbana (u8). */
export interface SeriesSample {
  readonly population: Uint16Array;
  readonly urban: Uint8Array;
}

export function captureSeries(w: SimContext): SeriesSample {
  const n = w.world.provinces.count;
  const population = new Uint16Array(n + 1);
  const urban = new Uint8Array(n + 1);
  for (let p = 1; p <= n; p++)
    population[p] = quantizePopulation(w.derived.provincePopulation[p] ?? 0);
  const { settlement } = w.state;
  for (const row of settlement.rows()) {
    const share = settlement.column('urbanShare')[row] ?? 0;
    urban[settlement.column('province')[row] ?? 0] = Math.round(math.clamp(share, 0, 1) * 255);
  }
  return { population, urban };
}

/**
 * Delta visual de un año: cambios respecto del marco anterior, en palabras u32:
 * [nOwner, (p, dueño)…, nLevel, (p, nivel)…, nCulture, (p, cultura)…, nInnov, (p, bits)…,
 *  nCapital, (polity, capital)…] — una capital 0 significa que la polity dejó de estar activa.
 */
export function encodeDelta(prev: VisualFrame, next: VisualFrame): Uint32Array {
  const words: number[] = [];
  const section = (a: ArrayLike<number>, b: ArrayLike<number>) => {
    const at = words.length;
    words.push(0);
    let count = 0;
    for (let p = 1; p < b.length; p++) {
      if (a[p] !== b[p]) {
        words.push(p, b[p] ?? 0);
        count++;
      }
    }
    words[at] = count;
  };
  section(prev.owner, next.owner);
  section(prev.level, next.level);
  section(prev.culture, next.culture);
  section(prev.innovations, next.innovations);
  const at = words.length;
  words.push(0);
  let count = 0;
  for (const [id, capital] of next.capitals) {
    if (prev.capitals.get(id) !== capital) {
      words.push(id, capital);
      count++;
    }
  }
  for (const id of prev.capitals.keys()) {
    if (!next.capitals.has(id)) {
      words.push(id, 0);
      count++;
    }
  }
  words[at] = count;
  return Uint32Array.from(words);
}

export function applyDelta(f: VisualFrame, delta: Uint32Array): void {
  let i = 0;
  const section = (target: Uint32Array | Uint8Array) => {
    const count = delta[i++] ?? 0;
    for (let k = 0; k < count; k++) {
      const p = delta[i++] ?? 0;
      target[p] = delta[i++] ?? 0;
    }
  };
  section(f.owner);
  section(f.level);
  section(f.culture);
  section(f.innovations);
  const count = delta[i++] ?? 0;
  for (let k = 0; k < count; k++) {
    const id = delta[i++] ?? 0;
    const capital = delta[i++] ?? 0;
    if (capital === 0) f.capitals.delete(id);
    else f.capitals.set(id, capital);
  }
}

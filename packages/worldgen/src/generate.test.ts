import { describe, expect, it, vi } from 'vitest';
import {
  D8_DX,
  D8_DY,
  generateWorld,
  NO_DIR,
  validateParams,
  Water,
  WORLDGEN_STAGES,
  type WorldParams,
  type WorldStatic,
} from './index';

// Generar un mundo chico tarda ~1 s; algunos tests generan varios.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const cache = new Map<string, WorldStatic>();
function world(params: Partial<WorldParams> = {}): WorldStatic {
  const p: WorldParams = {
    seed: 1,
    size: 'small',
    mapType: 'continents',
    landFraction: 0.3,
    ...params,
  };
  const key = JSON.stringify(p);
  let w = cache.get(key);
  if (!w) {
    w = generateWorld(p);
    cache.set(key, w);
  }
  return w;
}

function downstream(w: WorldStatic, i: number): number {
  const { width } = w.raster;
  const k = w.raster.flowDir[i] ?? NO_DIR;
  const x = i % width;
  const y = (i - x) / width;
  return (y + (D8_DY[k] ?? 0)) * width + ((x + (D8_DX[k] ?? 0) + width) % width);
}

describe('worldgen v1 · determinismo', () => {
  it('misma seed → mismo hash; otra seed o tipo → otro', () => {
    const a = world();
    expect(generateWorld(a.params).hash).toBe(a.hash);
    expect(world({ seed: 2 }).hash).not.toBe(a.hash);
    expect(world({ mapType: 'pangaea' }).hash).not.toBe(a.hash);
  });

  it('golden del mundo chico (si cambia a propósito, subir ENGINE_VERSION y actualizar)', () => {
    expect(world().hash).toBe('2db5ea9ae165bbf5');
  });

  it('avisa cada etapa en orden', () => {
    const stages: string[] = [];
    generateWorld({ seed: 3, size: 'small', mapType: 'archipelago', landFraction: 0.2 }, (s) =>
      stages.push(s),
    );
    expect(stages).toEqual([...WORLDGEN_STAGES]);
  });
});

describe('worldgen v1 · relieve y agua', () => {
  it.each([
    ['continents', 0.3],
    ['pangaea', 0.4],
    ['archipelago', 0.15],
  ] as const)(
    '%s: fracción de tierra dentro de ±5%% del parámetro (%s)',
    (mapType, landFraction) => {
      const w = world({ mapType, landFraction, seed: 5 });
      let land = 0;
      for (const v of w.raster.water) if (v !== Water.ocean) land++;
      const f = land / w.raster.water.length;
      expect(Math.abs(f - landFraction) / landFraction).toBeLessThanOrEqual(0.05);
    },
  );

  it('el wrap E-O no tiene costura (control: la mitad opuesta del mundo sí difiere)', () => {
    const w = world();
    const { width, height, elevation } = w.raster;
    const diff = (x1: number, x2: number) => {
      let sum = 0;
      for (let y = 0; y < height; y++) {
        sum += Math.abs((elevation[y * width + x1] ?? 0) - (elevation[y * width + x2] ?? 0));
      }
      return sum / height;
    };
    let interior = 0;
    for (let x = 0; x < width - 1; x += 16) interior += diff(x, x + 1);
    interior /= Math.ceil((width - 1) / 16);
    const seam = diff(width - 1, 0);
    const opposite = diff(0, width / 2);
    expect(seam).toBeLessThan(interior * 2.5);
    expect(opposite).toBeGreaterThan(seam * 4);
  });

  it('ningún tramo de río sube y el caudal no baja aguas abajo', () => {
    const w = world({ seed: 7 });
    const { water, flowDir, elevation, flow } = w.raster;
    let checked = 0;
    for (let i = 0; i < water.length; i++) {
      if (water[i] === Water.ocean || flowDir[i] === NO_DIR) continue;
      const j = downstream(w, i);
      if (water[j] === Water.ocean) continue;
      expect(elevation[j] ?? 0).toBeLessThanOrEqual(elevation[i] ?? 0);
      expect(flow[j] ?? 0).toBeGreaterThanOrEqual(flow[i] ?? 0);
      checked++;
    }
    expect(checked).toBeGreaterThan(10_000);
  });

  it('todo drena: desde cualquier celda de tierra se llega al océano siguiendo el desagüe', () => {
    const w = world();
    const { water, flowDir } = w.raster;
    for (let i = 0; i < water.length; i += 97) {
      if (water[i] === Water.ocean) continue;
      let c = i;
      let steps = 0;
      while (water[c] !== Water.ocean && flowDir[c] !== NO_DIR && steps < water.length) {
        c = downstream(w, c);
        steps++;
      }
      expect(water[c]).toBe(Water.ocean);
    }
  });
});

describe('worldgen v1 · provincias y mares', () => {
  it('toda celda de tierra tiene provincia; el agua no; cada océano tiene zona', () => {
    const w = world({ mapType: 'archipelago', landFraction: 0.2 });
    const { water, province, seaZone } = w.raster;
    for (let i = 0; i < water.length; i++) {
      if (water[i] === Water.land) expect(province[i]).toBeGreaterThan(0);
      else expect(province[i]).toBe(0);
      if (water[i] === Water.ocean) expect(seaZone[i]).toBeGreaterThan(0);
      else expect(seaZone[i]).toBe(0);
    }
  });

  it('toda provincia es conexa (8-conexa, con wrap)', () => {
    const w = world({ mapType: 'archipelago', landFraction: 0.2 });
    const { width, height, province } = w.raster;
    const first = new Int32Array(w.provinces.count + 1).fill(-1);
    const cells = new Uint32Array(w.provinces.count + 1);
    for (let i = 0; i < province.length; i++) {
      const p = province[i] ?? 0;
      if (p === 0) continue;
      cells[p] = (cells[p] ?? 0) + 1;
      if ((first[p] ?? -1) < 0) first[p] = i;
    }
    const seen = new Uint8Array(province.length);
    for (let p = 1; p <= w.provinces.count; p++) {
      const stack = [first[p] ?? 0];
      seen[first[p] ?? 0] = 1;
      let reached = 0;
      while (stack.length > 0) {
        const i = stack.pop() ?? 0;
        reached++;
        const x = i % width;
        const y = (i - x) / width;
        for (let k = 0; k < 8; k++) {
          const ny = y + (D8_DY[k] ?? 0);
          if (ny < 0 || ny >= height) continue;
          const j = ny * width + ((x + (D8_DX[k] ?? 0) + width) % width);
          if (seen[j] || province[j] !== p) continue;
          seen[j] = 1;
          stack.push(j);
        }
      }
      expect(reached, `provincia ${p}`).toBe(cells[p]);
    }
  });

  it('cantidad cerca del objetivo; el área suma la tierra; datos en rango', () => {
    const w = world();
    const p = w.provinces;
    expect(p.count).toBeGreaterThan(400 * 0.9);
    expect(p.count).toBeLessThan(400 * 1.2);
    let land = 0;
    for (const v of w.raster.water) if (v === Water.land) land++;
    let area = 0;
    for (let i = 1; i <= p.count; i++) {
      area += p.area[i] ?? 0;
      expect(p.habitability[i]).toBeGreaterThanOrEqual(0);
      expect(p.habitability[i]).toBeLessThanOrEqual(1);
      expect(p.ruggedness[i]).toBeLessThanOrEqual(1);
      expect(Math.abs(p.centroidLat[i] ?? 99)).toBeLessThanOrEqual(90);
    }
    expect(area).toBeCloseTo(land * w.raster.cellKm * w.raster.cellKm, 0);
  });

  it('el archipiélago tiene estrechos que conectan islas', () => {
    const w = world({ mapType: 'archipelago', landFraction: 0.2 });
    expect([...w.graph.kind].filter((k) => k === 1).length).toBeGreaterThan(0);
  });
});

describe('worldgen v1 · parámetros', () => {
  it('rechaza parámetros inválidos', () => {
    const ok: WorldParams = { seed: 1, size: 'small', mapType: 'continents', landFraction: 0.3 };
    expect(() => {
      validateParams(ok);
    }).not.toThrow();
    expect(() => {
      validateParams({ ...ok, seed: -1 });
    }).toThrow(/seed/);
    expect(() => {
      validateParams({ ...ok, size: 'huge' });
    }).toThrow(/huge/);
    expect(() => {
      validateParams({ ...ok, landFraction: 0.99 });
    }).toThrow(/fracción/);
  });
});

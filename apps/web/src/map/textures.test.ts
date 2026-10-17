import { DataUtils } from 'three';
import { describe, expect, it } from 'vitest';
import { COLOR_STRIDE } from './colors';
import {
  COLOR_TABLE_WIDTH,
  colorTableSize,
  colorTableTexel,
  colorTableTexels,
  decodeProvinceId,
  dilateProvinceIds,
  heightTexels,
  provinceIdTexels,
  surfaceTexels,
} from './textures';

describe('textura de ids de provincia (RG8)', () => {
  it('codifica 16 bits y el shader los recupera', () => {
    const ids = [0, 1, 255, 256, 257, 1500, 4097, 65535];
    const province = Uint16Array.from(ids);
    const texels = provinceIdTexels(province, ids.length, 1, 0);
    ids.forEach((id, i) => {
      const r = (texels[i * 2] ?? 0) / 255;
      const g = (texels[i * 2 + 1] ?? 0) / 255;
      expect(decodeProvinceId(r, g)).toBe(id);
    });
  });

  it('dilata los ids 2 celdas hacia el agua, con wrap E-O y sin tocar la tierra', () => {
    // Fila de 8 celdas: tierra 7 en la columna 0, el resto agua.
    const province = Uint16Array.from([7, 0, 0, 0, 0, 0, 0, 0]);
    const out = dilateProvinceIds(province, 8, 1, 2);
    // Hacia el este: columnas 1 y 2; hacia el oeste por la costura: columnas 7 y 6.
    expect([...out]).toEqual([7, 7, 7, 0, 0, 0, 7, 7]);
    expect([...province]).toEqual([7, 0, 0, 0, 0, 0, 0, 0]);
    // N-S sin wrap: una celda de tierra en el polo no aparece en el polo opuesto.
    const col = Uint16Array.from([3, 0, 0, 0, 0]);
    expect([...dilateProvinceIds(col, 1, 5, 2)]).toEqual([3, 3, 3, 0, 0]);
    // La tierra conserva su id aunque tenga vecinos de otra provincia; el agua toma el del
    // vecino en orden E, O, S, N (la celda 4 toma el de la 0 por la costura).
    expect([...dilateProvinceIds(Uint16Array.from([1, 2, 0, 0, 0]), 5, 1, 1)]).toEqual([
      1, 2, 2, 0, 1,
    ]);
  });
});

describe('tabla de colores por provincia', () => {
  it('el color de la provincia id queda en el texel (id mód ancho, ⌊id / ancho⌋)', () => {
    const count = 1500;
    const rgba = new Uint8Array((count + 1) * COLOR_STRIDE);
    for (let id = 0; id <= count; id++) {
      rgba.set([id & 0xff, id >>> 8, 255 - (id % 256), 200], id * COLOR_STRIDE);
    }
    const table = colorTableTexels(rgba, count);
    const { width, height } = colorTableSize(count);
    expect(width).toBe(COLOR_TABLE_WIDTH);
    expect(height).toBe(Math.ceil(1501 / COLOR_TABLE_WIDTH));
    expect(table.length).toBe(width * height * 4);
    for (const id of [0, 1, 255, 256, 700, 1499, 1500]) {
      const { x, y } = colorTableTexel(id);
      const o = (y * width + x) * 4;
      expect([...table.subarray(o, o + 4)]).toEqual([id & 0xff, id >>> 8, 255 - (id % 256), 200]);
    }
    // Lo que sobra de la última fila queda transparente.
    expect(table[table.length - 1]).toBe(0);
  });

  it('reescribe la tabla existente (cambio de año) y rechaza tamaños inválidos', () => {
    const count = 3;
    const target = colorTableTexels(new Uint8Array(16).fill(9), count);
    const again = colorTableTexels(new Uint8Array(16).fill(4), count, target);
    expect(again).toBe(target);
    expect(target[0]).toBe(4);
    expect(() => colorTableTexels(new Uint8Array(12), count)).toThrow(/largo 12/);
    expect(() => colorTableTexels(new Uint8Array(16), count, new Uint8Array(8))).toThrow();
  });
});

describe('altura y superficie', () => {
  it('RG16F: elevación en medio flotante y máscara de lago', () => {
    const elevation = Float32Array.from([-4000, 0, 812.5, 6497]);
    const water = Uint8Array.from([1, 0, 2, 0]);
    const t = heightTexels(elevation, water);
    expect(t.length).toBe(8);
    expect(DataUtils.fromHalfFloat(t[0] ?? 0)).toBe(-4000);
    expect(DataUtils.fromHalfFloat(t[4] ?? 0)).toBe(812.5);
    expect(DataUtils.fromHalfFloat(t[6] ?? 0)).toBe(6496); // R16F: ≈ 4 m de paso a 6.000 m
    expect([t[1], t[3], t[7]].map((v) => DataUtils.fromHalfFloat(v ?? 0))).toEqual([0, 0, 0]);
    expect(DataUtils.fromHalfFloat(t[5] ?? 0)).toBe(1);
  });

  it('superficie premultiplicada: tierra con su color y alfa 255; océano y lago en cero', () => {
    const water = Uint8Array.from([0, 1, 2, 0]);
    const biome = Uint8Array.from([1, 255, 255, 0]);
    const colors = [
      [10, 20, 30],
      [40, 50, 60],
    ] as const;
    const t = surfaceTexels(water, biome, colors);
    expect([...t]).toEqual([40, 50, 60, 255, 0, 0, 0, 0, 0, 0, 0, 0, 10, 20, 30, 255]);
    expect(() => surfaceTexels(Uint8Array.from([0]), Uint8Array.from([5]), colors)).toThrow();
  });
});

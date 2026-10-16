// Datos de las texturas del mapa (funciones puras: arrays tipados, sin GPU).
//
// - Altura: RG16F (R32F no es filtrable sin features opcionales; ≈ 4 m de precisión a 6.000 m).
//   R = elevación (m; los lagos a su nivel de desborde), G = máscara de lago (0/1). La máscara va
//   aparte porque la elevación filtrada no distingue un lago de una costa de mar: a media celda
//   de la orilla, tierra (+500 m) y mar (−10 m) promedian positivo.
// - Superficie: RGBA8 con el color del bioma PREMULTIPLICADO por la máscara de tierra (alfa). Con
//   filtro lineal, rgb / a es el promedio de los colores de tierra vecinos: el agua no ensucia el
//   color de la costa (la costa misma sale del cruce por cero de la elevación).
// - Ids de provincia: RG8 (16 bits) con filtro NEAREST; el shader lo decodifica igual que
//   `decodeProvinceId`.
// - Tabla de colores por provincia: RGBA8 de `COLOR_TABLE_WIDTH` de ancho (≈1.500 colores en 6
//   filas); cambiar de año = reescribir esta tabla (≈ 6 KB).
import { Water } from '@ws/worldgen';
import { DataUtils } from 'three';
import { COLOR_STRIDE, type Rgb } from './colors';

/** Medio flotante de 1 (la máscara de lago). */
const HALF_ONE = DataUtils.toHalfFloat(1);

export function heightTexels(elevation: Float32Array, water: Uint8Array): Uint16Array {
  const out = new Uint16Array(elevation.length * 2);
  for (let i = 0; i < elevation.length; i++) {
    out[i * 2] = DataUtils.toHalfFloat(elevation[i] ?? 0);
    out[i * 2 + 1] = water[i] === Water.lake ? HALF_ONE : 0;
  }
  return out;
}

/** Tierra = `water` 0 (el océano y los lagos van con alfa 0). */
export function surfaceTexels(
  water: Uint8Array,
  biome: Uint8Array,
  colors: readonly Rgb[],
): Uint8Array {
  const out = new Uint8Array(water.length * 4);
  for (let i = 0; i < water.length; i++) {
    if (water[i] !== Water.land) continue;
    const c = colors[biome[i] ?? 0];
    if (!c) throw new Error(`mapa: bioma ${biome[i] ?? '?'} sin color en la celda ${i}`);
    const o = i * 4;
    out[o] = c[0];
    out[o + 1] = c[1];
    out[o + 2] = c[2];
    out[o + 3] = 255;
  }
  return out;
}

/**
 * Celdas de agua que reciben el id de la provincia vecina (count). La costa se dibuja con la
 * máscara suave de tierra; sin esto, el relleno (NEAREST) se corta en escalera media celda antes.
 * Solo afecta la textura: el picking usa el ráster.
 */
export const ID_DILATE_CELLS = 2;

/** Ids de provincia dilatados `steps` celdas hacia el agua (vecinos E, O, S, N; wrap E-O). */
export function dilateProvinceIds(
  province: Uint16Array,
  width: number,
  height: number,
  steps: number,
): Uint16Array {
  let current = province;
  for (let s = 0; s < steps; s++) {
    const next = current.slice();
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const i = row + x;
        if (current[i] !== 0) continue;
        // Vecinos en orden fijo: E, O (con wrap), S, N; −1 = fuera de los polos.
        const neighbors = [
          row + (x + 1 === width ? 0 : x + 1),
          row + (x === 0 ? width - 1 : x - 1),
          y + 1 < height ? i + width : -1,
          y > 0 ? i - width : -1,
        ];
        for (const j of neighbors) {
          const id = j < 0 ? 0 : (current[j] ?? 0);
          if (id !== 0) {
            next[i] = id;
            break;
          }
        }
      }
    }
    current = next;
  }
  return current;
}

export function provinceIdTexels(
  province: Uint16Array,
  width: number,
  height: number,
  dilate = ID_DILATE_CELLS,
): Uint8Array {
  const ids = dilateProvinceIds(province, width, height, dilate);
  const out = new Uint8Array(ids.length * 2);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i] ?? 0;
    out[i * 2] = id & 0xff;
    out[i * 2 + 1] = id >>> 8;
  }
  return out;
}

/** Lo que hace el shader con un texel RG8 (canales normalizados a [0, 1]). */
export function decodeProvinceId(r01: number, g01: number): number {
  return Math.round(r01 * 255) + Math.round(g01 * 255) * 256;
}

/** Ancho de la tabla de colores (texels): potencia de 2, < 4096 en cualquier GPU. */
export const COLOR_TABLE_WIDTH = 256;

export function colorTableSize(count: number): { readonly width: number; readonly height: number } {
  return {
    width: COLOR_TABLE_WIDTH,
    height: Math.max(1, Math.ceil((count + 1) / COLOR_TABLE_WIDTH)),
  };
}

/** Texel de la tabla que guarda el color de la provincia `id` (el shader usa la misma cuenta). */
export function colorTableTexel(id: number): { readonly x: number; readonly y: number } {
  return { x: id % COLOR_TABLE_WIDTH, y: Math.floor(id / COLOR_TABLE_WIDTH) };
}

/**
 * Copia los colores por provincia (RGBA8 por id, `(count + 1) · 4` bytes) a la tabla. `target`
 * permite reescribir la tabla existente (cambio de año) sin reasignar.
 */
export function colorTableTexels(rgba: Uint8Array, count: number, target?: Uint8Array): Uint8Array {
  if (rgba.length !== (count + 1) * COLOR_STRIDE) {
    throw new Error(
      `mapa: colores de largo ${rgba.length}, se esperaban ${(count + 1) * COLOR_STRIDE} (count + 1 provincias × RGBA)`,
    );
  }
  const { width, height } = colorTableSize(count);
  const out = target ?? new Uint8Array(width * height * 4);
  if (out.length !== width * height * 4) throw new Error('mapa: tabla de colores de otro tamaño');
  // La tabla es fila por fila con el mismo orden que los ids: es una copia directa.
  out.set(rgba);
  out.fill(0, rgba.length);
  return out;
}

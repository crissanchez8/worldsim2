import { describe, expect, it } from 'vitest';
import { MAP_HEIGHT, MAP_WIDTH } from './config';
import { generateHeightmap, heightmapHash } from './heightmap';

describe('generateHeightmap', () => {
  it('es determinista y depende de la seed', () => {
    const a = generateHeightmap(7, 256, 128);
    const b = generateHeightmap(7, 256, 128);
    const c = generateHeightmap(8, 256, 128);
    expect(heightmapHash(a)).toBe(heightmapHash(b));
    expect(heightmapHash(a)).not.toBe(heightmapHash(c));
  });

  it('no tiene costura E-O: el salto entre la última y la primera columna es como el de adentro', () => {
    const map = generateHeightmap(3, 512, 256);
    const { width, height, elevation } = map;
    let seam = 0;
    let inner = 0;
    for (let y = 0; y < height; y++) {
      const row = y * width;
      seam = Math.max(seam, Math.abs((elevation[row] ?? 0) - (elevation[row + width - 1] ?? 0)));
      for (let x = 1; x < width; x++) {
        const d = Math.abs((elevation[row + x] ?? 0) - (elevation[row + x - 1] ?? 0));
        inner = Math.max(inner, d);
      }
    }
    expect(inner).toBeGreaterThan(0);
    expect(seam).toBeLessThanOrEqual(inner);
  });

  it('el ancho no es una pared: cortar el mapa en otra columna sí deja salto', () => {
    // Control de la prueba anterior: sin el cilindro, la columna 0 y la del medio no son vecinas.
    const map = generateHeightmap(3, 512, 256);
    let jump = 0;
    for (let y = 0; y < map.height; y++) {
      const row = y * map.width;
      const d = (map.elevation[row] ?? 0) - (map.elevation[row + map.width / 2] ?? 0);
      jump = Math.max(jump, Math.abs(d));
    }
    expect(jump).toBeGreaterThan(1000);
  });

  it('el mapa completo 2048×1024 da el hash de referencia (el mismo que muestra el HUD)', () => {
    // Golden de regresión del spike: si cambia el generador o core/math, cambia este valor.
    const map = generateHeightmap(1, MAP_WIDTH, MAP_HEIGHT);
    expect(heightmapHash(map)).toBe('0fc08e0e41c36265');
    expect(map.landFraction).toBeGreaterThan(0.25);
    expect(map.landFraction).toBeLessThan(0.55);
  });
});

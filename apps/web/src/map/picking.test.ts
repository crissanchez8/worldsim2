import { describe, expect, it } from 'vitest';
import { pickCell, raycastSurface, type Ray } from './picking';

/** Ráster de prueba: provincia = columna + 1 (así cada columna tiene su id), fila 0 agua. */
function stripes(width: number, height: number) {
  const n = width * height;
  const province = new Uint16Array(n);
  const water = new Uint8Array(n);
  const biome = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const x = i % width;
    const y = Math.floor(i / width);
    if (y === 0) {
      water[i] = 1;
      biome[i] = 255;
    } else {
      province[i] = x + 1;
      biome[i] = x % 9;
    }
  }
  return { width, height, province, water, biome };
}

describe('pickCell (provincia por coordenada de mundo, con wrap)', () => {
  const r = stripes(64, 8);

  it('devuelve la provincia de la celda que contiene el punto', () => {
    expect(pickCell(r, 10, 3)).toMatchObject({ cellX: 10, cellY: 3, province: 11, water: 0 });
    expect(pickCell(r, 10.49, 3.2)?.province).toBe(11);
    expect(pickCell(r, 10.51, 3.2)?.province).toBe(12);
  });

  it('del otro lado de la costura y en otras copias del mundo es la misma provincia', () => {
    expect(pickCell(r, -0.6, 3)?.province).toBe(64);
    expect(pickCell(r, -0.4, 3)?.province).toBe(1);
    expect(pickCell(r, 63.6, 3)?.province).toBe(1);
    expect(pickCell(r, 64 * 3 + 5, 3)?.province).toBe(6);
    expect(pickCell(r, -64 * 2 + 5, 3)?.province).toBe(6);
  });

  it('agua = provincia 0; fuera de los polos no hay celda', () => {
    expect(pickCell(r, 10, 0)).toMatchObject({ province: 0, water: 1, biome: 255 });
    expect(pickCell(r, 10, -1)).toBeNull();
    expect(pickCell(r, 10, 8)).toBeNull();
  });
});

function ray(origin: [number, number, number], target: [number, number, number]): Ray {
  const d = [target[0] - origin[0], target[1] - origin[1], target[2] - origin[2]] as const;
  const len = Math.hypot(...d);
  return { origin, direction: [d[0] / len, d[1] / len, d[2] / len] };
}

describe('raycastSurface', () => {
  it('sobre un plano a nivel del mar cae donde el rayo cruza y = 0', () => {
    const hit = raycastSurface(ray([0, 10, 0], [5, 0, 7]), () => 0, 0, 100);
    expect(hit?.x).toBeCloseTo(5, 3);
    expect(hit?.z).toBeCloseTo(7, 3);
  });

  it('una meseta tapa lo que está detrás: el rayo pega en la pared, no en el suelo', () => {
    // Meseta de altura 4 para x ≥ 10; el rayo apunta al suelo en x = 14 (que está detrás).
    const surface = (x: number) => (x >= 10 ? 4 : 0);
    const hit = raycastSurface(ray([0, 8, 0], [14, 0, 0]), surface, 4, 100);
    expect(hit).not.toBeNull();
    expect(hit?.x).toBeGreaterThanOrEqual(10 - 0.01);
    expect(hit?.x).toBeLessThan(10.3);
    // Sin la meseta, el mismo rayo llega al suelo en x = 14.
    expect(raycastSurface(ray([0, 8, 0], [14, 0, 0]), () => 0, 4, 100)?.x).toBeCloseTo(14, 3);
  });

  it('un rayo que sube o no llega en maxT no pega', () => {
    expect(raycastSurface(ray([0, 1, 0], [5, 2, 0]), () => 0, 0, 100)).toBeNull();
    expect(raycastSurface(ray([0, 10, 0], [100, 0, 0]), () => 0, 0, 50)).toBeNull();
  });

  it('pick de punta a punta: un rayo a través de la costura elige la provincia correcta', () => {
    const r = stripes(64, 8);
    // Cámara en x = 2 mirando al oeste: cruza la costura y cae en x = −3,2 → columna 61.
    const hit = raycastSurface(ray([2, 6, 4], [-3.2, 0, 4]), () => 0, 0, 100);
    expect(hit).not.toBeNull();
    expect(pickCell(r, hit?.x ?? 0, hit?.z ?? 0)?.province).toBe(62);
  });
});

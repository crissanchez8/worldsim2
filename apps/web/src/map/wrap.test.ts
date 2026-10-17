import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, LOD_STEPS } from './config';
import { cellAt, distanceToChunk, lodForDistance, nearestCopyX, sampleBilinear } from './wrap';

const W = 2048;

describe('nearestCopyX (wrap E-O de los chunks)', () => {
  it('cada chunk queda a menos de medio mundo de la cámara, en todo el recorrido', () => {
    for (let cam = -W; cam <= 2 * W; cam += 37) {
      for (let x0 = 0; x0 < W; x0 += CHUNK_SIZE) {
        const x = nearestCopyX(x0, CHUNK_SIZE, cam, W);
        const center = x + CHUNK_SIZE / 2;
        expect(Math.abs(center - cam)).toBeLessThanOrEqual(W / 2);
        // Es una copia del chunk: misma posición módulo el ancho.
        expect((((x - x0) % W) + W) % W).toBe(0);
      }
    }
  });

  it('con la cámara junto a la costura, el último chunk aparece del otro lado', () => {
    // Cámara en x = 10: el chunk [1920, 2048) se dibuja en [−128, 0), pegado al chunk 0.
    expect(nearestCopyX(W - CHUNK_SIZE, CHUNK_SIZE, 10, W)).toBe(-CHUNK_SIZE);
    expect(nearestCopyX(0, CHUNK_SIZE, 10, W)).toBe(0);
    // Del otro lado de la costura (x = 2040), el chunk 0 va en [2048, 2176).
    expect(nearestCopyX(0, CHUNK_SIZE, W - 8, W)).toBe(W);
  });
});

describe('LOD', () => {
  it('0 hasta la distancia base y uno más cada vez que se duplica', () => {
    const base = 160;
    expect(lodForDistance(0, base, LOD_STEPS.length)).toBe(0);
    expect(lodForDistance(159.9, base, LOD_STEPS.length)).toBe(0);
    expect(lodForDistance(160, base, LOD_STEPS.length)).toBe(1);
    expect(lodForDistance(319, base, LOD_STEPS.length)).toBe(1);
    expect(lodForDistance(320, base, LOD_STEPS.length)).toBe(2);
    expect(lodForDistance(1e9, base, LOD_STEPS.length)).toBe(LOD_STEPS.length - 1);
  });

  it('la distancia a un chunk es 0 adentro y crece afuera (3D)', () => {
    expect(distanceToChunk(64, 0, 64, 0, 0, 128)).toBe(0);
    expect(distanceToChunk(64, 30, 64, 0, 0, 128)).toBe(30);
    expect(distanceToChunk(-30, 0, 64, 0, 0, 128)).toBe(30);
    expect(distanceToChunk(128 + 3, 4, 64, 0, 0, 128)).toBe(5);
  });
});

describe('cellAt (la celda que muestrea la GPU con NEAREST)', () => {
  it('la celda x ocupa [x − 0,5, x + 0,5)', () => {
    expect(cellAt(W, 1024, 10, 20)).toEqual({ x: 10, y: 20 });
    expect(cellAt(W, 1024, 10.49, 20.49)).toEqual({ x: 10, y: 20 });
    expect(cellAt(W, 1024, 10.5, 20.5)).toEqual({ x: 11, y: 21 });
    expect(cellAt(W, 1024, 9.5, 19.5)).toEqual({ x: 10, y: 20 });
  });

  it('envuelve en X (copias del mundo) y no en Z', () => {
    expect(cellAt(W, 1024, -0.4, 5)).toEqual({ x: 0, y: 5 });
    expect(cellAt(W, 1024, -0.6, 5)).toEqual({ x: W - 1, y: 5 });
    expect(cellAt(W, 1024, W - 0.4, 5)).toEqual({ x: 0, y: 5 });
    expect(cellAt(W, 1024, 3 * W + 7, 5)).toEqual({ x: 7, y: 5 });
    expect(cellAt(W, 1024, -5 * W - 7, 5)).toEqual({ x: W - 7, y: 5 });
    expect(cellAt(W, 1024, 5, -0.6)).toBeNull();
    expect(cellAt(W, 1024, 5, 1023.5)).toBeNull();
    expect(cellAt(W, 1024, 5, 1023.4)).toEqual({ x: 5, y: 1023 });
  });
});

describe('sampleBilinear (como el filtro lineal de la GPU)', () => {
  const w = 4;
  const h = 3;
  // Valor = 10·fila + columna.
  const values = Float32Array.from({ length: w * h }, (_, i) => 10 * Math.floor(i / w) + (i % w));

  it('en los centros de celda devuelve el valor exacto', () => {
    expect(sampleBilinear(values, w, h, 2, 1)).toBe(12);
    expect(sampleBilinear(values, w, h, 0, 0)).toBe(0);
    expect(sampleBilinear(values, w, h, 3, 2)).toBe(23);
  });

  it('interpola a través de la costura E-O', () => {
    // Entre la columna 3 (valor 3) y la 0 (valor 0) de la fila 0.
    expect(sampleBilinear(values, w, h, 3.5, 0)).toBeCloseTo(1.5, 6);
    expect(sampleBilinear(values, w, h, -0.5, 0)).toBeCloseTo(1.5, 6);
    expect(sampleBilinear(values, w, h, w + 1, 1)).toBe(11);
  });

  it('se queda en el borde en Z (polos)', () => {
    expect(sampleBilinear(values, w, h, 1, -3)).toBe(1);
    expect(sampleBilinear(values, w, h, 1, 7)).toBe(21);
    expect(sampleBilinear(values, w, h, 1, 1.5)).toBeCloseTo(16, 6);
  });
});

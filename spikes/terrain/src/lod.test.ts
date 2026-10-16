import { describe, expect, it } from 'vitest';
import { distanceToChunk, lodForDistance, nearestCopyX } from './lod';

const W = 2048;
const C = 128;

describe('nearestCopyX', () => {
  it('deja el chunk donde está si la cámara está cerca', () => {
    expect(nearestCopyX(1024, C, 1000, W)).toBe(1024);
  });

  it('cruza la costura: con la cámara en x≈0, el último chunk aparece al oeste', () => {
    expect(nearestCopyX(W - C, C, 10, W)).toBe(-C);
    expect(nearestCopyX(0, C, W - 10, W)).toBe(W);
  });

  it('cada chunk queda a menos de medio mundo de la cámara', () => {
    for (let cam = 0; cam < W; cam += 37) {
      for (let x0 = 0; x0 < W; x0 += C) {
        const center = nearestCopyX(x0, C, cam, W) + C / 2;
        expect(Math.abs(center - cam)).toBeLessThanOrEqual(W / 2);
      }
    }
  });
});

describe('distanceToChunk', () => {
  it('es la altura de la cámara si está encima del chunk', () => {
    expect(distanceToChunk(50, 30, 50, 0, 0, C)).toBe(30);
  });

  it('suma la distancia horizontal al borde más cercano', () => {
    expect(distanceToChunk(-40, 0, 64, 0, 0, C)).toBe(40);
    expect(distanceToChunk(C + 30, 40, C + 40, 0, 0, C)).toBe(
      Math.sqrt(30 * 30 + 40 * 40 + 40 * 40),
    );
  });
});

describe('lodForDistance', () => {
  it('duplica el umbral por nivel y satura en el último', () => {
    expect(lodForDistance(0, 160, 5)).toBe(0);
    expect(lodForDistance(159, 160, 5)).toBe(0);
    expect(lodForDistance(160, 160, 5)).toBe(1);
    expect(lodForDistance(319, 160, 5)).toBe(1);
    expect(lodForDistance(320, 160, 5)).toBe(2);
    expect(lodForDistance(1280, 160, 5)).toBe(4);
    expect(lodForDistance(1e9, 160, 5)).toBe(4);
  });
});

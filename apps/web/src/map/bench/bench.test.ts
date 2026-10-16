import { describe, expect, it } from 'vitest';
import { cameraLimits } from '../camera';
import { FrameRecorder, percentile } from './metrics';
import { tourPose } from './tour';

describe('métricas de cuadros', () => {
  it('percentil con interpolación lineal', () => {
    expect(percentile([3, 1, 2], 50)).toBe(2);
    expect(percentile([0, 10], 25)).toBe(2.5);
    expect(percentile([], 50)).toBeNaN();
  });

  it('resumen: fps, tirones y cola de GPU', () => {
    const rec = new FrameRecorder();
    for (let i = 0; i < 99; i++) rec.push(1000 / 60, 1, 1);
    rec.push(100, 2, 3);
    const s = rec.summary();
    expect(s.frames).toBe(100);
    expect(s.janks).toBe(1);
    expect(s.frameMsMax).toBe(100);
    expect(s.gpuQueueMax).toBe(3);
    expect(s.fpsAvg).toBeCloseTo(100 / ((99 * 1000) / 60 / 1000 + 0.1), 6);
  });
});

describe('recorrido de medición', () => {
  it('cruza la costura dos veces y alterna cerca y lejos', () => {
    for (const [w, h] of [
      [2048, 1024],
      [1024, 512],
    ] as const) {
      const limits = cameraLimits(w, h);
      const start = tourPose(0, 60, limits);
      const end = tourPose(60, 60, limits);
      // Arranca antes de la costura (x = ancho) y avanza más de una vuelta: la cruza dos veces.
      expect(start.x).toBeLessThan(w);
      expect(end.x).toBeGreaterThan(2 * w);
      const distances = Array.from({ length: 61 }, (_, t) => tourPose(t, 60, limits).distance);
      expect(Math.min(...distances)).toBeLessThan(limits.minDistance * 2);
      expect(Math.max(...distances)).toBeGreaterThan(limits.maxDistance * 0.8);
    }
  });
});

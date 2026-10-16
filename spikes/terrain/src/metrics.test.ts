import { describe, expect, it } from 'vitest';
import { FrameRecorder, percentile } from './metrics';
import { tourPose } from './tour';

describe('percentile', () => {
  it('interpola entre rangos y no depende del orden', () => {
    expect(percentile([3, 1, 2, 4, 5], 50)).toBe(3);
    expect(percentile([1, 2, 3, 4], 50)).toBe(2.5);
    expect(percentile([10, 0], 95)).toBeCloseTo(9.5);
    expect(percentile([], 50)).toBeNaN();
  });
});

describe('FrameRecorder', () => {
  it('calcula fps promedio y p5 a partir de los intervalos', () => {
    const r = new FrameRecorder();
    for (let i = 0; i < 95; i++) r.push(10, 1, 1);
    for (let i = 0; i < 5; i++) r.push(40, 1, 3);
    const s = r.summary();
    expect(s.frames).toBe(100);
    expect(s.seconds).toBeCloseTo(1.15);
    expect(s.fpsAvg).toBeCloseTo(100 / 1.15);
    // p95 del tiempo de cuadro cae entre 10 y 40 ms; el p5 de fps, entre 25 y 100.
    expect(s.fpsP5).toBeGreaterThan(25);
    expect(s.fpsP5).toBeLessThan(100);
    expect(s.janks).toBe(5);
    expect(s.gpuSamples).toBe(0);
    expect(s.gpuMsAvg).toBeNaN();
    expect(s.gpuQueueAvg).toBeCloseTo(1.1);
    expect(s.gpuQueueMax).toBe(3);
  });
});

describe('tourPose', () => {
  it('cruza la costura E-O y da más de una vuelta', () => {
    const W = 2048;
    const start = tourPose(0, 60, W, 1024).x;
    const end = tourPose(60, 60, W, 1024).x;
    expect(start).toBeLessThan(W);
    expect(end).toBeGreaterThan(start + W);
  });

  it('alterna cerca y lejos (fuerza cambios de LOD)', () => {
    const near = tourPose(0, 60, 2048, 1024).distance;
    const far = tourPose(15, 60, 2048, 1024).distance;
    expect(far).toBeGreaterThan(near * 5);
  });
});

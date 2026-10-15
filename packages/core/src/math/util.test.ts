import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { clamp, invLerp, lerp, remap, sigmoid, smoothstep, wrap, wrapDelta } from './index';

const finite = fc.double({ min: -1e9, max: 1e9, noNaN: true, noDefaultInfinity: true });

describe('core/math · utilidades', () => {
  it('wrap devuelve siempre un valor en [0, period)', () => {
    fc.assert(
      fc.property(finite, fc.double({ min: 1e-3, max: 1e6, noNaN: true }), (x, period) => {
        const r = wrap(x, period);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(period);
      }),
    );
  });

  it('wrap: casos del cilindro E-O', () => {
    expect(wrap(-1, 360)).toBe(359);
    expect(wrap(360, 360)).toBe(0);
    expect(wrap(725, 360)).toBe(5);
    expect(wrap(-1e-17, 360)).toBeLessThan(360);
    expect(wrap(-5e-324, 360)).toBe(0);
  });

  it('wrapDelta toma el camino más corto alrededor del cilindro', () => {
    expect(wrapDelta(350, 10, 360)).toBe(20);
    expect(wrapDelta(10, 350, 360)).toBe(-20);
    expect(wrapDelta(0, 180, 360)).toBe(-180);
  });

  it('clamp, lerp, invLerp, remap, smoothstep', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
    expect(invLerp(10, 20, 12.5)).toBe(0.25);
    expect(remap(5, 0, 10, 100, 200)).toBe(150);
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
    expect(smoothstep(0, 1, 2)).toBe(1);
  });

  it('sigmoid es estable en los extremos y simétrica', () => {
    expect(sigmoid(-1000)).toBe(0);
    expect(sigmoid(1000)).toBe(1);
    expect(sigmoid(0)).toBe(0.5);
    fc.assert(
      fc.property(fc.double({ min: -30, max: 30, noNaN: true }), (x) => {
        expect(Math.abs(sigmoid(x) + sigmoid(-x) - 1)).toBeLessThan(1e-15);
      }),
    );
  });
});

import { describe, expect, it, vi } from 'vitest';
import { mathBattery, rngBattery, runYears } from './battery';

// La batería tarda ~2 s local y en el runner del CI pasó los 5 s por defecto (L-017).
vi.setConfig({ testTimeout: 60_000 });

describe('spike C · batería', () => {
  it('es determinista en Node', () => {
    expect(mathBattery()).toEqual(mathBattery());
    expect(rngBattery()).toBe(rngBattery());
    const a: string[] = [];
    const b: string[] = [];
    runYears(30, (_i, h) => a.push(h));
    runYears(30, (_i, h) => b.push(h));
    expect(a).toEqual(b);
  });

  it('cubre todas las funciones de core/math que el motor puede usar', () => {
    expect(Object.keys(mathBattery()).sort()).toEqual([
      'acos',
      'asin',
      'atan',
      'atan2',
      'cos',
      'exp',
      'expm1',
      'hypot',
      'log',
      'log10',
      'log1p',
      'log2',
      'pow',
      'sigmoid',
      'sin',
      'sqrt',
      'tan',
      'tanh',
    ]);
  });
});

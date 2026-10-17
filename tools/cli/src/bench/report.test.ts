import { describe, expect, it } from 'vitest';
import { type BenchReport, compare, formatTable, overBudget } from './report';

const report = (calibrationMs: number, value: number): BenchReport => ({
  engine: '0.0.0',
  machine: { cpu: 'x', platform: 'y', node: 'z' },
  calibrationMs,
  worldgenSeconds: null,
  peakHeapMB: 1,
  metrics: [{ key: 'a', value, unit: 'ms' }],
});

describe('ws bench · comparación', () => {
  it('normaliza por la calibración de cada máquina', () => {
    // máquina el doble de lenta y métrica el doble: no es regresión
    expect(compare(report(20, 2), report(10, 1), 0.5)).toEqual([]);
  });

  it('marca lo que empeora más que la tolerancia', () => {
    const r = compare(report(10, 1.6), report(10, 1), 0.5);
    expect(r.map((x) => x.key)).toEqual(['a']);
    expect(compare(report(10, 1.4), report(10, 1), 0.5)).toEqual([]);
  });

  it('la tabla muestra el cociente normalizado', () => {
    expect(formatTable(report(10, 1.5), report(10, 1))).toContain('1.50×');
  });

  it('los tamaños no se normalizan por la calibración', () => {
    const size = (cal: number, mb: number): BenchReport => ({
      ...report(cal, 0),
      metrics: [{ key: 'w', value: mb, unit: 'MB' }],
    });
    // máquina el doble de rápida con el mismo archivo: no es regresión
    expect(compare(size(5, 6), size(10, 6), 0.5)).toEqual([]);
    expect(compare(size(10, 10), size(10, 6), 0.5).map((x) => x.key)).toEqual(['w']);
  });

  it('presupuestos: los de tiempo se estiran en una máquina más lenta; los de tamaño, no', () => {
    const at = (cal: number, key: string, value: number, unit: string): BenchReport => ({
      ...report(cal, 0),
      metrics: [{ key, value, unit }],
    });
    // 600 ms de estado completo: fuera en el M1 Pro (≤ 500), dentro en una máquina 2× más lenta.
    expect(overBudget(at(4.8, 'world.medium.fullStateMaxMs', 600, 'ms'))).toHaveLength(1);
    expect(overBudget(at(9.6, 'world.medium.fullStateMaxMs', 600, 'ms'))).toHaveLength(0);
    expect(overBudget(at(9.6, 'world.medium.wsimMB', 21, 'MB'))).toHaveLength(1);
  });
});

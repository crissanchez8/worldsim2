import { describe, expect, it } from 'vitest';
import { type BenchReport, compare, formatTable } from './report';

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
});

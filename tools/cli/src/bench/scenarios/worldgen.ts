// Tiempo de generación del mundo mediano (P1.1; criterio de salida de P1: ≤ 20 s en Chrome).
// Una sola corrida: tarda unos segundos y la varianza es chica frente al presupuesto.
import { performance } from 'node:perf_hooks';
import { generateWorld } from '@ws/worldgen';
import type { Metric } from '../report';

export function worldgenScenario(): Metric {
  const t0 = performance.now();
  generateWorld({ seed: 1, size: 'medium', mapType: 'continents', landFraction: 0.3 });
  return { key: 'worldgen.medium', value: (performance.now() - t0) / 1000, unit: 's' };
}

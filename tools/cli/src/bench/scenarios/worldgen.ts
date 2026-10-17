// Tiempo de generación del mundo mediano (P1.1; criterio de salida de P1: ≤ 20 s en Chrome).
// Una sola corrida: tarda unos segundos y la varianza es chica frente al presupuesto.
import { performance } from 'node:perf_hooks';
import { generateWorld, type WorldStatic } from '@ws/worldgen';
import type { Metric } from '../report';

export function worldgenScenario(): { metric: Metric; world: WorldStatic } {
  const t0 = performance.now();
  const world = generateWorld({
    seed: 1,
    size: 'medium',
    mapType: 'continents',
    landFraction: 0.3,
  });
  return {
    metric: { key: 'worldgen.medium', value: (performance.now() - t0) / 1000, unit: 's' },
    world,
  };
}

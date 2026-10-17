import { History } from '@ws/history';
import { Sim } from '@ws/sim';
import { createGridWorld } from '@ws/worldgen';
import { describe, expect, it, vi } from 'vitest';
import { SimEngine } from './sim-engine';
import type { SimResponse } from './sim-protocol';

// Simulan cientos de años en el mismo proceso: bajo `pnpm check` y en el runner del CI, más (L-017).
vi.setConfig({ testTimeout: 60_000 });

/** Worker de mentira: tareas en cola, reloj que avanza 1 ms por consulta (tandas de ~16 años). */
function harness() {
  const posted: SimResponse[] = [];
  const queue: (() => void)[] = [];
  let clock = 0;
  const engine = new SimEngine({
    // Copia como postMessage: el espejo no comparte arrays con la historia del Worker.
    post: (message) => posted.push(structuredClone(message)),
    schedule: (run) => queue.push(run),
    now: () => clock++,
    sliceMs: 16,
  });
  const drain = () => {
    while (queue.length > 0) queue.shift()?.();
  };
  const of = <T extends SimResponse['type']>(type: T) =>
    posted.filter((m): m is Extract<SimResponse, { type: T }> => m.type === type);
  return { engine, posted, drain, of, queue };
}

const world = createGridWorld({ seed: 3, width: 16, height: 8 });

function referenceHash(years: number): string {
  const sim = Sim.create(world);
  for (let i = 0; i < years; i++) sim.step();
  return sim.hash();
}

describe('Worker de simulación · motor', () => {
  it('simula por tandas hasta el objetivo y el espejo arma la misma historia', () => {
    const h = harness();
    h.engine.handle({ type: 'init', world });
    const ready = h.of('ready')[0];
    expect(ready?.endK).toBe(13900);
    expect(ready?.canContinue).toBe(true);
    if (!ready) return;
    const mirror = History.fromData(world, ready.data);
    h.engine.handle({ type: 'target', k: 120 });
    h.drain();
    const batches = h.of('batch');
    expect(batches.length).toBeGreaterThan(3); // por tandas, no de una
    for (const b of batches) mirror.append(b.batch);
    expect(mirror.years).toBe(120);
    expect(batches.at(-1)?.head).toBe(120);
    // Un objetivo menor no simula; uno mayor que la corrida se acota.
    h.engine.handle({ type: 'target', k: 50 });
    h.drain();
    expect(h.engine.head).toBe(120);
  });

  it('el estado completo a una fecha es el exacto (cabeza y pasado)', () => {
    const h = harness();
    h.engine.handle({ type: 'init', world });
    h.engine.handle({ type: 'target', k: 130 });
    h.drain();
    h.engine.handle({ type: 'fullState', id: 1, k: 130 });
    h.engine.handle({ type: 'fullState', id: 2, k: 57 });
    const [head, past] = h.of('fullState');
    expect(head?.hash).toBe(referenceHash(130));
    expect(past?.hash).toBe(referenceHash(57));
  });

  it('guardar a mitad de corrida y continuar desde el archivo da el mismo hash', () => {
    const a = harness();
    a.engine.handle({ type: 'init', world });
    a.engine.handle({ type: 'target', k: 140 });
    a.drain();
    a.engine.handle({ type: 'save', id: 7 });
    const saved = a.of('saved')[0];
    expect(saved?.head).toBe(140);
    if (!saved) return;

    const b = harness();
    b.engine.handle({ type: 'init', world, file: saved.bytes });
    const ready = b.of('ready')[0];
    expect(ready?.data.deltas.length).toBe(140);
    b.engine.handle({ type: 'target', k: 260 });
    b.drain();
    expect(b.engine.head).toBe(260);
    b.engine.handle({ type: 'fullState', id: 1, k: 260 });
    expect(b.of('fullState')[0]?.hash).toBe(referenceHash(260));
  });

  it('un archivo de otro mundo se rechaza con un error claro', () => {
    const a = harness();
    a.engine.handle({ type: 'init', world });
    a.engine.handle({ type: 'save', id: 1 });
    const bytes = a.of('saved')[0]?.bytes;
    const other = createGridWorld({ seed: 4, width: 16, height: 8 });
    const b = harness();
    b.engine.handle({ type: 'init', world: other, ...(bytes ? { file: bytes } : {}) });
    expect(b.of('error')[0]?.message).toMatch(/no es el del archivo/);
  });
});

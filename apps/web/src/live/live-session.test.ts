import { Sim } from '@ws/sim';
import { createGridWorld } from '@ws/worldgen';
import { describe, expect, it, vi } from 'vitest';
import { SimClient, type SimWorkerLike } from '../worker/sim-client';
import { SimEngine } from '../worker/sim-engine';
import type { SimRequest, SimResponse } from '../worker/sim-protocol';
import { type LiveStatus, LiveSession } from './live-session';

// Simulan cientos de años en el mismo proceso: bajo `pnpm check` y en el runner del CI, más (L-017).
vi.setConfig({ testTimeout: 60_000 });

const world = createGridWorld({ seed: 5, width: 16, height: 8 });

/** Worker en el mismo proceso (mensajes copiados) + bucle de cuadros manual. */
function rig(fastForward = false) {
  const tasks: (() => void)[] = [];
  let clock = 0;
  const fake: SimWorkerLike = {
    onmessage: null,
    onerror: null,
    postMessage: (message: SimRequest) => {
      engine.handle(structuredClone(message));
    },
    terminate: () => undefined,
  };
  const engine = new SimEngine({
    post: (message: SimResponse) => {
      fake.onmessage?.({ data: structuredClone(message) } as MessageEvent<SimResponse>);
    },
    schedule: (run) => tasks.push(run),
    now: () => clock++,
    sliceMs: 16,
  });
  let pendingFrame: ((t: number) => void) | null = null;
  const frames: number[] = [];
  const statuses: LiveStatus[] = [];
  const session = new LiveSession(
    world,
    {
      onFrame: (_frame, k) => frames.push(k),
      onStatus: (s) => statuses.push(s),
      onError: (m) => {
        throw new Error(m);
      },
    },
    {
      fastForward,
      createClient: (events) => new SimClient(fake, events),
      loop: {
        request: (run) => {
          pendingFrame = run;
          return 1;
        },
        cancel: () => {
          pendingFrame = null;
        },
      },
    },
  );
  return {
    session,
    engine,
    frames,
    statuses,
    /** Corre tandas del Worker (todas las pendientes, o `max`). */
    work: (max = Infinity) => {
      for (let i = 0; i < max && tasks.length > 0; i++) tasks.shift()?.();
    },
    frame: (timeMs: number) => {
      const run = pendingFrame;
      pendingFrame = null;
      run?.(timeMs);
    },
  };
}

describe('sesión en vivo', () => {
  it('reproduce desde el espejo mientras el Worker simula por delante (D49)', () => {
    const r = rig();
    expect(r.frames).toEqual([0]); // el estado inicial apenas llega `ready`
    r.work(); // el Worker llena el colchón
    expect(r.engine.head).toBe(500);
    r.frame(0);
    r.frame(100); // 0,1 s a 60 años/s
    expect(r.frames.at(-1)).toBe(6);
    expect(r.statuses.at(-1)?.year).toBe(-11995);
    expect(r.statuses.at(-1)?.head).toBe(500);
  });

  it('"máx." sigue a la cabeza; rebobinar muestra el pasado exacto del espejo', async () => {
    const r = rig();
    r.work();
    r.session.setSpeed('max');
    r.frame(0);
    r.frame(16);
    expect(r.frames.at(-1)).toBe(500);
    r.work(10); // con "máx." el objetivo es toda la corrida
    expect(r.engine.head).toBeGreaterThan(500);
    r.session.scrub(120);
    expect(r.frames.at(-1)).toBe(120);
    const reference = Sim.create(world);
    for (let i = 0; i < 120; i++) reference.step();
    const state = await r.session.fullState(120);
    expect(state.hash).toBe(reference.hash());
  });

  it('link compartido: simula todo a máx. y queda en pausa al principio, listo para reproducir', () => {
    const r = rig(true);
    expect(r.statuses.at(-1)?.fastForward).toBe('running');
    expect(r.statuses.at(-1)?.speed).toBe('max');
    r.frame(0);
    r.frame(16); // con "máx." el objetivo es toda la corrida
    r.work();
    expect(r.engine.head).toBe(13900);
    const done = r.statuses.at(-1);
    expect(done?.fastForward).toBe('done');
    expect(done?.speed).toBe(0);
    expect(done?.k).toBe(0);
    // Elegir una velocidad toma el control.
    r.session.setSpeed(1);
    expect(r.statuses.at(-1)?.fastForward).toBe('off');
  });
});

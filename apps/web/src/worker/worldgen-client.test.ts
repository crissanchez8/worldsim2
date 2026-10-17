import {
  createGridWorld,
  hashWorldStatic,
  transferables,
  WORLDGEN_STAGES,
  type WorldParams,
} from '@ws/worldgen';
import { describe, expect, it, vi } from 'vitest';
import { WorldgenClient, type WorkerLike } from './worldgen-client';
import {
  handleWorldgenRequest,
  type WorldgenRequest,
  type WorldgenResponse,
} from './worldgen-protocol';

/** Genera un mundo chico real: segundos, más con `pnpm check` en paralelo (ms). */
const REAL_WORLD_TIMEOUT_MS = 30_000;

const SMALL: WorldParams = { seed: 3, size: 'small', mapType: 'continents', landFraction: 0.3 };

/** Worker falso: guarda los pedidos y deja responder a mano. */
class FakeWorker implements WorkerLike {
  onmessage: WorkerLike['onmessage'] = null;
  onerror: WorkerLike['onerror'] = null;
  readonly requests: WorldgenRequest[] = [];
  terminated = false;

  postMessage(message: WorldgenRequest): void {
    this.requests.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  reply(message: WorldgenResponse): void {
    this.onmessage?.({ data: message } as MessageEvent<WorldgenResponse>);
  }
}

describe('handleWorldgenRequest (lado Worker)', () => {
  it(
    'avisa cada etapa en orden y envía el mundo con todos sus buffers transferidos',
    () => {
      const posted: { message: WorldgenResponse; transfer: Transferable[] }[] = [];
      handleWorldgenRequest({ id: 5, params: SMALL }, (message, transfer = []) => {
        posted.push({ message, transfer });
      });
      const progress = posted.filter((p) => p.message.type === 'progress');
      expect(progress.map((p) => (p.message.type === 'progress' ? p.message.stage : ''))).toEqual([
        ...WORLDGEN_STAGES,
      ]);
      const done = posted.at(-1);
      expect(done?.message.type).toBe('done');
      if (done?.message.type !== 'done') return;
      expect(done.message.id).toBe(5);
      // El mundo llega íntegro (el hash recalculado coincide) y con todos sus buffers transferidos.
      expect(hashWorldStatic(done.message.world)).toBe(done.message.world.hash);
      expect(done.transfer).toEqual(transferables(done.message.world));
      expect(done.transfer.length).toBeGreaterThan(20);
      expect(done.message.generateMs).toBeGreaterThan(0);
    },
    REAL_WORLD_TIMEOUT_MS,
  );

  it('un error del worldgen vuelve como mensaje, no como excepción', () => {
    const posted: WorldgenResponse[] = [];
    handleWorldgenRequest({ id: 1, params: { ...SMALL, landFraction: 2 } }, (m) => {
      posted.push(m);
    });
    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({ type: 'error', id: 1 });
  });
});

describe('WorldgenClient (lado página)', () => {
  // El cliente no mira el mundo: alcanza uno de grilla (barato).
  const world = createGridWorld({ seed: 1, width: 8, height: 4 });

  it('resuelve cada pedido con su respuesta (aunque lleguen desordenadas) y reporta el progreso', async () => {
    const fake = new FakeWorker();
    const client = new WorldgenClient(fake);
    const progressA = vi.fn();
    const a = client.generate(SMALL, progressA);
    const b = client.generate({ ...SMALL, seed: 4 });
    expect(fake.requests.map((r) => r.id)).toEqual([1, 2]);
    fake.reply({ type: 'progress', id: 1, stage: 'relief', index: 1, total: 10 });
    fake.reply({ type: 'done', id: 2, world, generateMs: 7, postedAt: 0 });
    fake.reply({ type: 'done', id: 1, world, generateMs: 9, postedAt: 0 });
    // Comparar por identidad: un `toMatchObject` sobre los arrays del mundo tarda segundos.
    const [ra, rb] = await Promise.all([a, b]);
    expect(rb.generateMs).toBe(7);
    expect(ra.generateMs).toBe(9);
    expect(ra.world).toBe(world);
    expect(progressA).toHaveBeenCalledWith('relief', 1, 10);
  });

  it('rechaza con el error del Worker; dispose termina el Worker y rechaza lo pendiente', async () => {
    const fake = new FakeWorker();
    const client = new WorldgenClient(fake);
    const failed = client.generate(SMALL);
    fake.reply({ type: 'error', id: 1, message: 'seed inválida' });
    await expect(failed).rejects.toThrow('worldgen: seed inválida');

    const pending = client.generate(SMALL);
    client.dispose();
    expect(fake.terminated).toBe(true);
    await expect(pending).rejects.toThrow(/cerrado/);
    await expect(client.generate(SMALL)).rejects.toThrow(/cerrado/);
  });

  it('si el Worker se cae, rechaza todo lo pendiente', async () => {
    const fake = new FakeWorker();
    const client = new WorldgenClient(fake);
    const a = client.generate(SMALL);
    const b = client.generate(SMALL);
    fake.onerror?.({ message: 'boom' } as ErrorEvent);
    await expect(a).rejects.toThrow(/boom/);
    await expect(b).rejects.toThrow(/boom/);
  });
});

import { describe, expect, it } from 'vitest';
import { MemoryWorldStore, type NewSavedWorld } from './world-store';

const meta = (savedAt: number): NewSavedWorld => ({
  params: { seed: 1, size: 'small', mapType: 'continents', landFraction: 0.3 },
  worldHash: 'h',
  engineVersion: '0.1.3',
  years: 100,
  lastYear: -11901,
  savedAt,
  size: 3,
});

// La versión de IndexedDB cumple el mismo contrato; se prueba en el navegador (E2E de la web).
describe('mundos guardados (contrato)', () => {
  it('guardar, listar del más nuevo al más viejo, cargar y borrar', async () => {
    const store = new MemoryWorldStore();
    const a = await store.save(meta(10), Uint8Array.of(1, 2, 3));
    const b = await store.save(meta(20), Uint8Array.of(4, 5, 6));
    expect((await store.list()).map((w) => w.id)).toEqual([b, a]);
    const loaded = await store.load(a);
    expect([...(loaded?.file ?? [])]).toEqual([1, 2, 3]);
    expect(loaded?.meta.id).toBe(a);
    await store.remove(a);
    expect(await store.load(a)).toBeNull();
    expect((await store.list()).map((w) => w.id)).toEqual([b]);
  });
});

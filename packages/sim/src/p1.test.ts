import { generateWorld, type WorldStatic } from '@ws/worldgen';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Sim, summarize, yearHash } from './index';
import { mortality } from './systems/characters';
import { vitalRates } from './systems/demography';
import { provinceFood } from './systems/production';
import { urbanTarget } from './systems/settlements';

// La rebanada completa sobre el mundo chico real. Generar el mundo tarda ~1 s y 8.000 años sin
// chequeos ~5 s: se hace una vez y los tests continúan desde snapshots.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

let world: WorldStatic;
let midRun: Uint8Array; // estado al −4000, con agricultura, pueblos, polities y guerras
beforeAll(() => {
  world = generateWorld({ seed: 1, size: 'small', mapType: 'continents', landFraction: 0.3 });
  const sim = Sim.create(world);
  while (sim.year < -4000) sim.step();
  midRun = sim.snapshot();
});

describe('rebanada P1 · sistemas juntos', () => {
  it('60 años desde el −4000 con guard de contratos e invariantes en cada tick', () => {
    const sim = Sim.load(world, midRun, { checks: true });
    const kinds = new Set<string>();
    for (let i = 0; i < 60; i++) for (const e of sim.step().events) kinds.add(e.type);
    const s = summarize(sim.ctx, sim.year);
    expect(s.activePolities).toBeGreaterThan(5);
    expect(s.farmingProvinces).toBeGreaterThan(50);
    // Lo que tiene que pasar en 300 años de este mundo (propiedad observable, L-004).
    for (const k of ['ruler.succeeded', 'person.died', 'territory.changed', 'settlement.grew']) {
      expect(kinds.has(k), k).toBe(true);
    }
  });

  it('guardar/cargar a mitad de corrida → continuación idéntica año por año', () => {
    const a = Sim.load(world, midRun);
    const b = Sim.load(world, a.snapshot());
    for (let i = 0; i < 200; i++) expect(yearHash(b, b.step())).toBe(yearHash(a, a.step()));
  });

  it('misma seed → mismo mundo y mismos hashes año por año', () => {
    expect(generateWorld(world.params).hash).toBe(world.hash);
    const a = Sim.create(world);
    const b = Sim.create(world);
    for (let i = 0; i < 500; i++) expect(yearHash(b, b.step())).toBe(yearHash(a, a.step()));
  });

  it('golden: estado al −4000 (si cambia a propósito, subir ENGINE_VERSION y actualizar)', () => {
    expect(Sim.load(world, midRun).hash()).toBe('fdf064f9d346d36f');
  });

  it('la historia tiene forma: agricultura, pueblos y polities antes del −4000', () => {
    const s = summarize(Sim.load(world, midRun).ctx, -4000);
    expect(s.innovations).toContain('agriculture');
    expect(s.settlementsByLevel[1] ?? 0).toBeGreaterThan(0);
    expect(s.population).toBeGreaterThan(5e6);
    // Cota gruesa: la calibración fina (bandas del Apéndice A) la mide `ws health`.
    expect(s.population).toBeLessThan(2e9);
  });
});

describe('rebanada P1 · fórmulas', () => {
  it('el cultivo rinde más que el forrajeo y las innovaciones lo multiplican', () => {
    const forage = provinceFood(1000, 0.5, 0.6, 0, 0);
    const farmed = provinceFood(1000, 0.5, 0.6, 1, 0);
    const plough = provinceFood(1000, 0.5, 0.6, 1, 1 << 5);
    expect(farmed).toBeGreaterThan(forage * 10);
    expect(plough).toBeGreaterThan(farmed);
  });

  it('con alimento justo la población apenas crece; con hambre, cae; con excedente, sube', () => {
    const net = (r: number) => {
      const v = vitalRates(r, 0);
      return v.birth - v.death;
    };
    expect(net(1)).toBeGreaterThan(0);
    expect(net(1)).toBeLessThan(0.002);
    expect(net(0.8)).toBeLessThan(-0.05);
    expect(net(2)).toBeGreaterThan(net(1));
  });

  it('la mortalidad crece con la edad y es alta en la infancia', () => {
    expect(mortality(2)).toBeGreaterThan(mortality(20));
    expect(mortality(70)).toBeGreaterThan(mortality(40));
    expect(mortality(120)).toBeLessThanOrEqual(1);
  });

  it('la fracción urbana crece con el cultivo y la densidad, con tope', () => {
    expect(urbanTarget(0, 0, 10)).toBe(0);
    expect(urbanTarget(1, 0, 10)).toBeGreaterThan(urbanTarget(1, 0, 1));
    expect(urbanTarget(1, 0xffff, 1e6)).toBeLessThanOrEqual(0.3);
  });
});

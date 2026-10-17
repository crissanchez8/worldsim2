import { generateWorld } from '@ws/worldgen';
import { describe, expect, it, vi } from 'vitest';
import { KNOWLEDGE, PRODUCTION, SETTLEMENTS } from './config';
import { explainPolity, explainProvince } from './explain';
import { Sim } from './sim';
import { withInnovations } from './stats';
import { administrativeReach, militaryStrength } from './systems/power';

// Simula miles de años en el mundo chico: bajo `pnpm check` y en el CI, más que el default (L-017).
vi.setConfig({ testTimeout: 120_000 });

describe('el "por qué" de los stats (inspector)', () => {
  it('cuenta lo mismo que los sistemas: bases, innovaciones y valor', () => {
    const world = generateWorld({
      seed: 1,
      size: 'small',
      mapType: 'continents',
      landFraction: 0.3,
    });
    const sim = Sim.create(world);
    while (sim.year < 1) sim.step();
    const ctx = sim.ctx;
    const known = ctx.state.province.column('knownInnovations');
    const popcount = (b: number) => b.toString(2).replaceAll('0', '').length;
    // La polity cuya capital conoce más innovaciones (para que haya términos que explicar).
    let polity = 0;
    let capital = 0;
    for (const [id, rec] of ctx.state.polity.entries()) {
      if (rec.ended !== 0 || rec.capital === 0) continue;
      if (popcount(known[rec.capital - 1] ?? 0) > popcount(known[capital - 1] ?? 0)) {
        polity = id;
        capital = rec.capital;
      }
    }
    expect(polity).toBeGreaterThan(0);
    const bits = known[capital - 1] ?? 0;

    const list = explainProvince(ctx, capital, sim.year);
    const p = Object.fromEntries(list.map((e) => [e.stat, e]));
    expect(p['cropYield']?.value).toBe(withInnovations('cropYield', PRODUCTION.cropYieldT, bits));
    expect(p['forageYield']?.value).toBe(
      withInnovations('forageYield', PRODUCTION.forageYieldT, bits),
    );
    expect(p['cropReach']?.value).toBe(
      withInnovations('cropReach', PRODUCTION.cropReachBase, bits),
    );
    expect(p['diffusionRate']?.value).toBe(
      KNOWLEDGE.diffusionBase * withInnovations('diffusionRate', 1, bits),
    );
    expect(p['urbanShare']?.value).toBe(withInnovations('urbanShare', SETTLEMENTS.urbanBase, bits));
    // Cada término de innovación nombra una innovación que la provincia conoce.
    for (const e of list) {
      for (const t of e.innovations) expect(bits & (1 << t.source.id)).not.toBe(0);
    }
    expect(p['cropYield']?.innovations.length).toBeGreaterThan(0);

    const q = Object.fromEntries(explainPolity(ctx, polity, sim.year).map((e) => [e.stat, e]));
    expect(q['combatStrength']?.value).toBe(militaryStrength(ctx, polity));
    expect(q['reach']?.value).toBe(administrativeReach(ctx, polity));
  });
});

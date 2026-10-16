import { createGridWorld } from '@ws/worldgen';
import { describe, expect, it } from 'vitest';
import { checkInvariants, InvariantError, Sim, totalPopulation } from './index';

// Controles negativos del verificador: cada invariante roto a mano tiene que detectarse.
function fresh() {
  const sim = Sim.create(createGridWorld({ seed: 1, width: 6, height: 4 }));
  return { sim, ctx: sim.ctx, before: totalPopulation(sim.ctx.state) };
}

describe('checkInvariants', () => {
  it('un estado recién creado los cumple', () => {
    const { ctx, before } = fresh();
    expect(() => {
      checkInvariants(ctx, before);
    }).not.toThrow();
  });

  it('I2: gente que aparece sin nacimientos', () => {
    const { ctx, before } = fresh();
    const size = ctx.state.pop.column('size');
    size[0] = (size[0] ?? 0) + 1;
    expect(() => {
      checkInvariants(ctx, before);
    }).toThrow(/I2/);
  });

  it('I3: un pop de menos de una persona', () => {
    const { ctx } = fresh();
    const size = ctx.state.pop.column('size');
    size[0] = 0.5;
    expect(() => {
      checkInvariants(ctx, totalPopulation(ctx.state));
    }).toThrow(/I3/);
  });

  it('I4: una provincia con un dueño que no existe', () => {
    const { ctx, before } = fresh();
    ctx.state.province.column('owner')[0] = 42;
    expect(() => {
      checkInvariants(ctx, before);
    }).toThrow(/I4/);
  });

  it('I5: dos pops con la misma clave en una provincia', () => {
    const { ctx } = fresh();
    const { pop } = ctx.state;
    const row = 0;
    pop.add({
      province: pop.column('province')[row] ?? 0,
      culture: 0,
      religion: 0,
      stratum: 0,
      size: 10,
    });
    expect(() => {
      checkInvariants(ctx, totalPopulation(ctx.state));
    }).toThrow(InvariantError);
  });

  it('I10: un tamaño infinito', () => {
    const { ctx } = fresh();
    ctx.state.pop.column('size')[0] = Number.POSITIVE_INFINITY;
    expect(() => {
      checkInvariants(ctx, Number.POSITIVE_INFINITY);
    }).toThrow(/I2|I10/);
  });
});

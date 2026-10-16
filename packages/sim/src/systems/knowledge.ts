// knowledge v1 (P1.3; docs/model.md §5.6 y §9): invención y difusión por adyacencia de ≈14
// innovaciones. Todo se evalúa sobre el conocimiento del inicio del tick (una innovación recién
// aprendida no destraba otra en el mismo año ni se difunde hasta el año siguiente).
// No hace: pérdida, inventores, eras regionales, difusión por mar o rutas (P5).
import { Innovations, SettlementLevels } from '@ws/content';
import { rng } from '@ws/core';
import { KNOWLEDGE } from '../config';
import type { SimSystem } from '../context';
import { withInnovations } from '../stats';

interface Rule {
  readonly bit: number;
  readonly prereqMask: number;
  readonly arable: number;
  readonly coastal: boolean;
  readonly settlement: number; // índice mínimo de nivel; −1 = sin requisito
  readonly chance: number;
}

const RULES: readonly Rule[] = Innovations.rows.map((row, i) => ({
  bit: 1 << i,
  prereqMask: row.prerequisites.reduce((m, key) => m | (1 << Innovations.indexOf(key)), 0),
  arable: row.requires.arable ?? 0,
  coastal: row.requires.coastal ?? false,
  settlement:
    row.requires.settlement === undefined ? -1 : SettlementLevels.indexOf(row.requires.settlement),
  chance: row.inventionChance,
}));

/** Nivel de asentamiento por provincia (−1 = sin asentamiento), del estado al inicio del tick. */
export function settlementLevels(
  settlement: { rows(): Iterable<number>; column(k: 'province' | 'level'): ArrayLike<number> },
  count: number,
): Int8Array {
  const out = new Int8Array(count + 1).fill(-1);
  const province = settlement.column('province');
  const level = settlement.column('level');
  for (const row of settlement.rows()) out[province[row] ?? 0] = level[row] ?? 0;
  return out;
}

export const knowledge: SimSystem = {
  contract: {
    name: 'knowledge',
    phase: 'knowledge',
    cadence: { kind: 'annual' },
    reads: [
      'province.knownInnovations',
      'province.owner',
      'pop.size',
      'settlement.province',
      'settlement.level',
    ],
    writes: ['province.knownInnovations'],
    emits: ['innovation.invented'],
  },
  run(w, tick) {
    const { province } = w.state;
    const { count, area, arableFraction, coastal } = w.world.provinces;
    const { offsets, neighbors, baseCost } = w.world.graph;
    const bitsColumn = province.column('knownInnovations');
    const before = bitsColumn.slice(0, count); // conocimiento del inicio del tick (fila = id − 1)
    const owner = province.column('owner');
    const levels = settlementLevels(w.state.settlement, count);
    const stream = rng.createRng(w.world.params.seed).stream(rng.Streams.knowledge);
    let world = w.derived.worldInnovations;

    for (let p = 1; p <= count; p++) {
      const population = w.derived.provincePopulation[p] ?? 0;
      if (population <= 0) continue;
      const bits = before[p - 1] ?? 0;
      const areaKm2 = area[p] ?? 0;
      const density = areaKm2 > 0 ? population / areaKm2 : 0;
      const sizeFactor =
        (areaKm2 / KNOWLEDGE.inventionAreaRefKm2) *
        Math.sqrt(density / KNOWLEDGE.inventionDensityRef);
      const diffusion = KNOWLEDGE.diffusionBase * withInnovations('diffusionRate', 1, bits);
      let learned = 0;
      RULES.forEach((rule, i) => {
        if ((bits & rule.bit) !== 0 || (bits & rule.prereqMask) !== rule.prereqMask) return;
        // El suelo exigido es para INVENTAR; para adoptar alcanza con algo cultivable.
        const arable = arableFraction[p] ?? 0;
        if (rule.arable > 0 && arable <= 0) return;
        const canInvent = arable >= rule.arable;
        if (rule.coastal && !coastal[p]) return;
        if ((levels[p] ?? -1) < rule.settlement) return;
        let contacts = 0;
        for (let e = offsets[p] ?? 0; e < (offsets[p + 1] ?? 0); e++) {
          const q = neighbors[e] ?? 0;
          if (((before[q - 1] ?? 0) & rule.bit) === 0) continue;
          const same = (owner[q - 1] ?? 0) !== 0 && owner[q - 1] === owner[p - 1];
          const near = KNOWLEDGE.diffusionRefDays / Math.max(1, baseCost[e] ?? 1);
          contacts += (same ? KNOWLEDGE.samePolityDiffusion : 1) * near;
        }
        const invent = canInvent ? rule.chance * sizeFactor : 0;
        const u = stream
          .sub(i + 1)
          .at(p, tick.year)
          .uniform();
        if (u < invent) {
          learned |= rule.bit;
          const firstInWorld = (world & rule.bit) === 0;
          world |= rule.bit;
          tick.events.emit(w.types.innovationInvented, {
            actors: [],
            place: { kind: 'province', id: p },
            data: { innovation: i, firstInWorld },
          });
        } else if (u < invent + diffusion * contacts) {
          learned |= rule.bit;
        }
      });
      if (learned !== 0) bitsColumn[p - 1] = (bits | learned) >>> 0;
    }
  },
};

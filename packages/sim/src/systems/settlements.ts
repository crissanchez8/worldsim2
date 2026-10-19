// settlements v1 (P1.3; docs/model.md §5.4 y §6): un asentamiento por provincia como máximo. La
// fracción urbana va hacia un objetivo que dan el cultivo, las innovaciones y la densidad; el
// nivel sigue a la población urbana con histéresis ±15 %. Nombre en el idioma de la cultura
// mayoritaria de la provincia.
// No hace: ruinas, edificios, puertos, caminos, varios asentamientos por provincia (P4/P6).
import { SettlementLevels } from '@ws/content';
import { math } from '@ws/core';
import { SETTLEMENTS } from '../config';
import type { SimSystem } from '../context';
import { assignName } from '../names';
import { withInnovations } from '../stats';
import { agrarianShare } from './production';

const MIN_URBAN = SettlementLevels.rows.map((r) => r.minUrban);
const UP = 1 + SETTLEMENTS.hysteresis;
const DOWN = 1 - SETTLEMENTS.hysteresis;

/** Fracción urbana objetivo (fraction) de una provincia. */
export function urbanTarget(cropShare: number, bits: number, density: number): number {
  const base = withInnovations('urbanShare', SETTLEMENTS.urbanBase, bits);
  const densityFactor = math.clamp(
    Math.sqrt(density / SETTLEMENTS.urbanDensityRef),
    SETTLEMENTS.urbanDensityMin,
    SETTLEMENTS.urbanDensityMax,
  );
  return Math.min(SETTLEMENTS.urbanMax, agrarianShare(cropShare) * base * densityFactor);
}

export const settlements: SimSystem = {
  contract: {
    name: 'settlements',
    phase: 'settlements',
    cadence: { kind: 'annual' },
    reads: [
      'province.cropShare',
      'province.knownInnovations',
      'pop.province',
      'pop.culture',
      'pop.size',
      'culture.language',
      'language.phonologySeed',
    ],
    writes: ['settlement.*', 'name.own'],
    emits: ['settlement.founded', 'settlement.grew', 'settlement.declined'],
  },
  run(w, tick) {
    const { settlement, province, culture } = w.state;
    const { count, area } = w.world.provinces;
    const crop = province.column('cropShare');
    const bits = province.column('knownInnovations');
    const byProvince = new Int32Array(count + 1).fill(-1);
    let worldMax = -1;
    for (const row of settlement.rows()) {
      byProvince[settlement.column('province')[row] ?? 0] = row;
      worldMax = Math.max(worldMax, settlement.column('level')[row] ?? 0);
    }
    const anyBefore = settlement.size > 0;
    let foundedThisTick = false;

    for (let p = 1; p <= count; p++) {
      const population = w.derived.provincePopulation[p] ?? 0;
      if (population <= 0) continue;
      const target = urbanTarget(crop[p - 1] ?? 0, bits[p - 1] ?? 0, population / (area[p] ?? 1));
      const row = byProvince[p] ?? -1;
      if (row < 0) {
        if (population * target < (MIN_URBAN[0] ?? 0) * UP) continue;
        const cultureId = w.derived.majorityCulture[p] ?? 0;
        const language = culture.get(cultureId)?.language ?? 0;
        const name =
          language === 0
            ? 0
            : assignName(w.state, w.world.params.seed, language, 'place', tick.year, 'settlements');
        const id = settlement.add({
          province: p,
          urbanShare: target,
          level: 0,
          founded: tick.year,
          name,
        });
        const firstInWorld = !anyBefore && !foundedThisTick;
        foundedThisTick = true;
        tick.events.emit(w.types.settlementFounded, {
          actors: [{ kind: 'settlement', id }],
          place: { kind: 'province', id: p },
          causes: [
            {
              kind: 'fact',
              entity: { kind: 'province', id: p },
              field: 'cropShare',
              year: tick.year,
            },
          ],
          data: { level: 0, firstInWorld },
        });
        continue;
      }
      const id = settlement.idAt(row);
      const shareColumn = settlement.column('urbanShare');
      const share =
        (shareColumn[row] ?? 0) + SETTLEMENTS.urbanAdjustRate * (target - (shareColumn[row] ?? 0));
      shareColumn[row] = share;
      const urban = population * share;
      const levelColumn = settlement.column('level');
      const from = levelColumn[row] ?? 0;
      let level = from;
      while (level + 1 < MIN_URBAN.length && urban >= (MIN_URBAN[level + 1] ?? Infinity) * UP)
        level++;
      while (level > 0 && urban < (MIN_URBAN[level] ?? 0) * DOWN) level--;
      if (level === from) continue;
      levelColumn[row] = level;
      const place = { kind: 'province', id: p } as const;
      const actors = [{ kind: 'settlement', id }];
      if (level > from) {
        const firstInWorld = level > worldMax;
        worldMax = Math.max(worldMax, level);
        tick.events.emit(w.types.settlementGrew, {
          actors,
          place,
          data: { from, to: level, urban, firstInWorld },
        });
      } else {
        tick.events.emit(w.types.settlementDeclined, {
          actors,
          place,
          data: { from, to: level, urban },
        });
      }
    }
  },
};

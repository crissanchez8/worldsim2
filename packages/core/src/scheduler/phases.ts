// Las 14 fases del tick (docs/model.md §7), en orden fijo.
export const PHASES = [
  'environment',
  'production',
  'markets',
  'consumption',
  'populationMovement',
  'knowledge',
  'society',
  'state',
  'diplomacy',
  'war',
  'cultureFaith',
  'settlements',
  'consolidation',
  'chronicle',
] as const;

export type Phase = (typeof PHASES)[number];

export function phaseIndex(phase: Phase): number {
  return PHASES.indexOf(phase);
}

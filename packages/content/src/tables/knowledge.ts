// Conocimiento v1 (P1.3; docs/model.md §5.6): ≈14 innovaciones con prerrequisitos, requisitos de
// entorno y efectos, y las eras de P1 como vista derivada del conjunto conocido. P5 lo reemplaza
// por el grafo de ≈150 innovaciones con pérdida y eras regionales.
//
// Los efectos son datos: los sistemas los aplican sobre el bitset de cada provincia
// (`Province.knownInnovations`), con la innovación como fuente en el `explain` del stat.
import { z } from 'zod';
import { defineTable } from '../table';

/** Stats sobre los que actúan las innovaciones de P1. */
export const INNOVATION_STATS = [
  'cropYield', // tons_per_year por km2 cultivado (production)
  'forageYield', // tons_per_year por km2 forrajeado (production)
  'combatStrength', // score ≥ 0 (military)
  'diffusionRate', // per_year (knowledge)
  'urbanShare', // fraction (settlements): suma a la fracción urbana objetivo
  'reach', // days: alcance administrativo de una polity (statecraft)
] as const;

export const Innovations = defineTable(
  'innovation',
  z
    .object({
      key: z.string(),
      /** Claves de innovaciones que tienen que conocerse antes (y estar antes en la tabla). */
      prerequisites: z.array(z.string()),
      /** Requisitos de la provincia (todos opcionales). */
      requires: z
        .object({
          /** Fracción cultivable mínima (fraction). */
          arable: z.number().min(0).max(1).optional(),
          coastal: z.boolean().optional(),
          /** Nivel mínimo de asentamiento (clave de SettlementLevels). */
          settlement: z.string().optional(),
        })
        .strict(),
      /** Probabilidad anual de invención en una provincia elegible de 10.000 personas (per_year). */
      inventionChance: z.number().positive(),
      effects: z.array(
        z
          .object({
            stat: z.enum(INNOVATION_STATS),
            op: z.enum(['mul', 'add']),
            /** ratio si op = mul; en la unidad del stat si op = add. */
            value: z.number(),
          })
          .strict(),
      ),
    })
    .strict(),
  [
    {
      key: 'agriculture',
      prerequisites: [],
      requires: { arable: 0.2 },
      inventionChance: 8e-7,
      effects: [], // habilita el cultivo (production)
    },
    {
      key: 'pastoralism',
      prerequisites: [],
      requires: {},
      inventionChance: 6e-7,
      effects: [{ stat: 'forageYield', op: 'mul', value: 1.6 }],
    },
    {
      key: 'pottery',
      prerequisites: ['agriculture'],
      requires: {},
      inventionChance: 1e-5,
      effects: [{ stat: 'cropYield', op: 'mul', value: 1.1 }],
    },
    {
      key: 'wheel',
      prerequisites: ['agriculture'],
      requires: {},
      inventionChance: 3e-6,
      effects: [
        { stat: 'diffusionRate', op: 'mul', value: 1.2 },
        { stat: 'reach', op: 'add', value: 5 },
      ],
    },
    {
      key: 'copper',
      prerequisites: ['pottery'],
      requires: { settlement: 'town' },
      inventionChance: 1e-5,
      effects: [{ stat: 'combatStrength', op: 'mul', value: 1.1 }],
    },
    {
      key: 'plough',
      prerequisites: ['agriculture', 'wheel'],
      requires: {},
      inventionChance: 5e-6,
      effects: [{ stat: 'cropYield', op: 'mul', value: 1.5 }],
    },
    {
      key: 'writing',
      prerequisites: ['agriculture'],
      requires: { settlement: 'city' },
      inventionChance: 1.5e-5,
      effects: [
        { stat: 'diffusionRate', op: 'mul', value: 1.5 },
        { stat: 'urbanShare', op: 'add', value: 0.02 },
        { stat: 'reach', op: 'add', value: 10 },
      ],
    },
    {
      key: 'bronze',
      prerequisites: ['copper'],
      requires: {},
      inventionChance: 8e-6,
      effects: [
        { stat: 'combatStrength', op: 'mul', value: 1.3 },
        { stat: 'cropYield', op: 'mul', value: 1.05 },
      ],
    },
    {
      key: 'iron',
      prerequisites: ['bronze'],
      requires: {},
      inventionChance: 4e-6,
      effects: [
        { stat: 'combatStrength', op: 'mul', value: 1.3 },
        { stat: 'cropYield', op: 'mul', value: 1.25 },
      ],
    },
    {
      key: 'coinage',
      prerequisites: ['writing', 'bronze'],
      requires: {},
      inventionChance: 8e-6,
      effects: [
        { stat: 'diffusionRate', op: 'mul', value: 1.2 },
        { stat: 'urbanShare', op: 'add', value: 0.01 },
        { stat: 'reach', op: 'add', value: 10 },
      ],
    },
    {
      key: 'cropRotation',
      prerequisites: ['plough', 'iron'],
      requires: {},
      inventionChance: 1.5e-6,
      effects: [{ stat: 'cropYield', op: 'mul', value: 1.4 }],
    },
    {
      key: 'oceanNavigation',
      prerequisites: ['iron', 'coinage'],
      requires: { coastal: true },
      inventionChance: 2e-6,
      effects: [{ stat: 'diffusionRate', op: 'mul', value: 1.2 }],
    },
    {
      key: 'printing',
      prerequisites: ['writing', 'coinage'],
      requires: { settlement: 'greatCity' },
      inventionChance: 2e-6,
      effects: [
        { stat: 'diffusionRate', op: 'mul', value: 1.5 },
        { stat: 'urbanShare', op: 'add', value: 0.02 },
      ],
    },
    {
      key: 'gunpowder',
      prerequisites: ['iron', 'coinage'],
      requires: {},
      inventionChance: 1.5e-6,
      effects: [
        { stat: 'combatStrength', op: 'mul', value: 1.6 },
        { stat: 'reach', op: 'add', value: 10 },
      ],
    },
  ],
);

/** Eras de P1 (vista derivada): la más avanzada cuya alguna innovación de entrada se conoce. */
export const Eras = defineTable(
  'era',
  z
    .object({
      key: z.string(),
      /** Se entra con cualquiera de estas innovaciones (vacío = la era inicial). */
      enteredBy: z.array(z.string()),
    })
    .strict(),
  [
    { key: 'prehistory', enteredBy: [] },
    { key: 'neolithic', enteredBy: ['agriculture'] },
    { key: 'bronzeAge', enteredBy: ['bronze'] },
    { key: 'ironAge', enteredBy: ['iron'] },
    { key: 'earlyModern', enteredBy: ['printing', 'oceanNavigation'] },
  ],
);

/** Niveles de asentamiento por población urbana (persons), de menor a mayor. */
export const SettlementLevels = defineTable(
  'settlementLevel',
  z.object({ key: z.string(), minUrban: z.number().positive() }).strict(),
  [
    { key: 'village', minUrban: 500 },
    { key: 'town', minUrban: 5_000 },
    { key: 'city', minUrban: 25_000 },
    { key: 'greatCity', minUrban: 100_000 },
    { key: 'metropolis', minUrban: 500_000 },
  ],
);

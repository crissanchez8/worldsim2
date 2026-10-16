// Sociedad y política en su versión de P1 (docs/model.md §5.3 y §5.8): un solo estrato y una
// sola ley de sucesión. P4 trae los estratos y P7 el resto de las leyes.
import { z } from 'zod';
import { defineTable } from '../table';

export const Strata = defineTable('stratum', z.object({ key: z.string() }), [
  // P1: población sin estratificar (P4.6 la reemplaza en el lugar).
  { key: 'common' },
]);

export const Laws = defineTable(
  'law',
  z.object({
    key: z.string(),
    /** Categoría de la ley (una ley vigente por categoría y polity). */
    category: z.enum(['succession']),
  }),
  [{ key: 'primogeniture', category: 'succession' }],
);

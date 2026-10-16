// El glosario de unidades de docs/model.md (§3.2) y `UNITS` de @ws/core tienen que coincidir:
// el documento es la fuente de verdad del modelo y el código no puede desviarse en silencio.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { UNITS } from '@ws/core/store';
import { describe, expect, it } from 'vitest';

const model = readFileSync(resolve(import.meta.dirname, '../../../docs/model.md'), 'utf8');

function glossaryUnits(markdown: string): string[] {
  const start = markdown.indexOf('### 3.2 Glosario de unidades');
  const end = markdown.indexOf('\n## ', start);
  if (start < 0 || end < 0) throw new Error('no encontré §3.2 en docs/model.md');
  const section = markdown.slice(start, end);
  return [...section.matchAll(/^\| `([a-z0-9_]+)` \|/gm)].map((m) => m[1] ?? '');
}

describe('docs/model.md ↔ código', () => {
  it('el glosario de unidades coincide con UNITS', () => {
    const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
    expect(glossaryUnits(model).sort(cmp)).toEqual([...UNITS].sort(cmp));
  });
});

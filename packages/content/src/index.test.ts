import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  CONTENT_HASH,
  CONTENT_TABLES,
  canonicalJson,
  ContentError,
  contentHash,
  defineTable,
  WorldSizes,
} from './index';

const rowSchema = z.object({ key: z.string(), weight: z.number().positive() });

describe('defineTable', () => {
  const table = defineTable('demo', rowSchema, [
    { key: 'alpha', weight: 1 },
    { key: 'beta', weight: 2 },
  ]);

  it('índice = posición; búsqueda por clave e índice', () => {
    expect(table.indexOf('beta')).toBe(1);
    expect(table.at(0).key).toBe('alpha');
    expect(table.byKey('beta').weight).toBe(2);
    expect(() => table.indexOf('gamma')).toThrow(ContentError);
    expect(() => table.at(2)).toThrow(ContentError);
  });

  it('valida cada fila con el esquema, con la ruta del error', () => {
    expect(() =>
      defineTable('demo', rowSchema, [
        { key: 'alpha', weight: 1 },
        { key: 'beta', weight: -1 },
      ]),
    ).toThrow(/demo\[1\]\.weight/);
  });

  it('claves únicas y bien formadas; nombre válido; al menos una fila', () => {
    expect(() =>
      defineTable('demo', rowSchema, [
        { key: 'a', weight: 1 },
        { key: 'a', weight: 2 },
      ]),
    ).toThrow(/repetida/);
    expect(() => defineTable('demo', rowSchema, [{ key: 'Mal', weight: 1 }])).toThrow(/inválida/);
    expect(() => defineTable('Demo', rowSchema, [{ key: 'a', weight: 1 }])).toThrow(/nombre/);
    expect(() => defineTable('demo', rowSchema, [])).toThrow(/sin filas/);
  });

  it('las filas quedan congeladas', () => {
    const row = table.at(0) as { weight: number };
    expect(() => {
      row.weight = 5;
    }).toThrow(TypeError);
    expect(Object.isFrozen(table.rows)).toBe(true);
  });
});

describe('canonicalJson', () => {
  it('no depende del orden de las claves', () => {
    expect(canonicalJson({ b: 1, a: { d: [1, 2], c: 'x' } })).toBe(
      canonicalJson({ a: { c: 'x', d: [1, 2] }, b: 1 }),
    );
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('distingue 0 de −0, omite undefined y rechaza no finitos', () => {
    expect(canonicalJson(-0)).not.toBe(canonicalJson(0));
    expect(canonicalJson({ a: undefined, b: null })).toBe('{"b":null}');
    expect(() => canonicalJson(Number.NaN)).toThrow(/no finito/);
    expect(() => canonicalJson({ a: Number.POSITIVE_INFINITY })).toThrow(/no finito/);
  });
});

describe('hash de contenido', () => {
  it('golden: solo cambia si cambia el contenido (al cambiarlo a propósito, actualizar acá)', () => {
    expect(CONTENT_HASH).toMatch(/^[0-9a-f]{16}$/);
    expect(CONTENT_HASH).toBe('17e5ae7f612b67f7');
  });

  it('un valor, el orden de las filas o el orden de las tablas cambian el hash', () => {
    const base = contentHash();
    const edited = defineTable(
      'worldSize',
      z.object({
        key: z.string(),
        width: z.number(),
        height: z.number(),
        provinceTarget: z.number(),
      }),
      WorldSizes.rows.map((r) => (r.key === 'medium' ? { ...r, provinceTarget: 1501 } : r)),
    );
    const others = CONTENT_TABLES.slice(1);
    expect(contentHash([edited, ...others])).not.toBe(base);
    const reordered = defineTable(
      'worldSize',
      z.object({ key: z.string() }).loose(),
      [...WorldSizes.rows].reverse(),
    );
    expect(contentHash([reordered, ...others])).not.toBe(base);
    expect(contentHash([...others, WorldSizes])).not.toBe(base);
    expect(contentHash([...CONTENT_TABLES])).toBe(base);
  });

  it('nombres de tabla únicos', () => {
    const names = CONTENT_TABLES.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

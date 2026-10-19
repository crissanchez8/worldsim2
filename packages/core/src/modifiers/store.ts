// Modificadores con fuente (docs/model.md §5.12, regla de oro 4). Un stat calculado es
// base + modificadores; `explain` devuelve cada término con su fuente para el inspector.
//
// Dueño por fila: cada modificador lo cambia o borra solo el sistema que lo creó (`owner`).
// El índice objetivo+stat → ids es memoria derivada (se reconstruye al cargar), no estado.
import type { EntityRef } from '../events/types';
import type { ByteReader, ByteWriter } from '../serialize/bytes';
import type { GuardSnapshot, StatePart } from '../serialize/serializable';
import type { Id } from '../store/id';
import { defineSchema } from '../store/schema';
import { SparseTable } from '../store/sparse';
import type { Combine, StatDef } from './stats';

export type ModifierOp = 'add' | 'mul' | 'min' | 'max';
const OPS: readonly ModifierOp[] = ['add', 'mul', 'min', 'max'];

const modifierSchema = defineSchema('modifier', 1, {
  targetKind: { type: 'str', unit: 'text' },
  targetId: { type: 'ref', unit: 'id' },
  stat: { type: 'str', unit: 'text' },
  op: { type: 'u8', unit: 'enum', doc: 'índice en OPS' },
  value: { type: 'f64', unit: 'ratio', doc: 'en la unidad del stat (o ratio si op = mul)' },
  sourceKind: { type: 'str', unit: 'text' },
  sourceId: { type: 'ref', unit: 'id' },
  owner: { type: 'str', unit: 'text', doc: 'sistema dueño de la fila' },
  start: { type: 'i32', unit: 'year' },
  expires: { type: 'i32', unit: 'year', doc: '0 = permanente; activo si start ≤ año < expires' },
});

export interface ModifierInit<S extends string> {
  readonly target: EntityRef;
  readonly stat: S;
  readonly op: ModifierOp;
  readonly value: number;
  readonly source: EntityRef;
  readonly owner: string;
  readonly start: number;
  /** 0 o ausente = permanente. */
  readonly expires?: number;
}

export interface ExplainTerm {
  readonly modifier: number;
  readonly op: ModifierOp;
  readonly value: number;
  readonly source: EntityRef;
  readonly owner: string;
}

export interface Explanation {
  readonly target: EntityRef;
  readonly stat: string;
  readonly combine: Combine;
  readonly base: number;
  /** Términos agrupados por operación, en el orden exacto en que se aplican. */
  readonly add: readonly ExplainTerm[];
  readonly mul: readonly ExplainTerm[];
  readonly caps: readonly ExplainTerm[];
  readonly floors: readonly ExplainTerm[];
  /** Rango del stat (si acotó el resultado). */
  readonly clampedTo?: number;
  readonly value: number;
}

interface Row {
  readonly id: number;
  readonly targetKind: string;
  readonly targetId: number;
  readonly stat: string;
  readonly op: number;
  readonly value: number;
  readonly sourceKind: string;
  readonly sourceId: number;
  readonly owner: string;
  readonly start: number;
  readonly expires: number;
}

const indexKey = (kind: string, id: number, stat: string) => `${kind}#${id}#${stat}`;

/**
 * Orden de aplicación dentro de una operación: por CONTENIDO (tipo e id de fuente, valor, dueño)
 * y recién al final por id. Así el resultado es idéntico bit a bit sin importar en qué orden se
 * crearon los modificadores (dos términos que solo difieren en id tienen el mismo valor).
 */
function compareTerms(a: Row, b: Row): number {
  if (a.sourceKind !== b.sourceKind) return a.sourceKind < b.sourceKind ? -1 : 1;
  if (a.sourceId !== b.sourceId) return a.sourceId - b.sourceId;
  if (a.value !== b.value) return a.value < b.value ? -1 : 1;
  if (a.owner !== b.owner) return a.owner < b.owner ? -1 : 1;
  return a.id - b.id;
}

export class ModifierStore<S extends Readonly<Record<string, StatDef>>> implements StatePart {
  readonly stats: S;
  private readonly table = new SparseTable<'modifier', typeof modifierSchema.fields>(
    modifierSchema,
  );
  private readonly index = new Map<string, number[]>();
  readonly partName = 'modifier';
  readonly schemaDescription: string;

  constructor(stats: S) {
    this.stats = stats;
    this.schemaDescription = this.table.schemaDescription;
  }

  get size(): number {
    return this.table.size;
  }

  private statDef(stat: string): StatDef {
    const def = this.stats[stat];
    if (!def) throw new Error(`modificador: stat desconocido "${stat}"`);
    return def;
  }

  add(init: ModifierInit<keyof S & string>): Id<'modifier'> {
    this.statDef(init.stat);
    if (!Number.isFinite(init.value)) throw new Error(`modificador ${init.stat}: valor no finito`);
    const expires = init.expires ?? 0;
    if (expires !== 0 && expires <= init.start) {
      throw new Error(`modificador ${init.stat}: vence antes de empezar`);
    }
    const id = this.table.add({
      targetKind: init.target.kind,
      targetId: init.target.id,
      stat: init.stat,
      op: OPS.indexOf(init.op),
      value: init.value,
      sourceKind: init.source.kind,
      sourceId: init.source.id,
      owner: init.owner,
      start: init.start,
      expires,
    });
    this.indexAdd(id, init.target.kind, init.target.id, init.stat);
    return id;
  }

  /** Borra un modificador. Solo puede hacerlo su dueño. */
  remove(id: number, owner: string): void {
    const row = this.table.require(id);
    if (row.owner !== owner) {
      throw new Error(`modificador ${id}: lo creó ${row.owner}, no ${owner} (dueño por fila)`);
    }
    this.drop(id);
  }

  /** Borra todos los modificadores de un objetivo (cuando la entidad termina, I16). */
  removeTarget(target: EntityRef): number {
    let removed = 0;
    for (const stat of this.statKeys()) {
      const ids = this.index.get(indexKey(target.kind, target.id, stat));
      if (!ids) continue;
      for (const id of [...ids]) {
        this.drop(id);
        removed++;
      }
    }
    return removed;
  }

  /** Limpieza física de vencidos (no cambia ningún valor; la hace el ledger en la fase 13). */
  purgeExpired(year: number): number {
    const expired: number[] = [];
    for (const [id, row] of this.table.entries()) {
      if (row.expires !== 0 && row.expires <= year) expired.push(id);
    }
    for (const id of expired) this.drop(id);
    return expired.length;
  }

  private statKeys(): string[] {
    // eslint-disable-next-line no-restricted-properties -- el orden lo fijan los ids de modificador, no las claves
    return Object.keys(this.stats);
  }

  private drop(id: number): void {
    const row = this.table.require(id);
    const key = indexKey(row.targetKind, row.targetId, row.stat);
    const ids = this.index.get(key);
    if (ids) {
      const at = ids.indexOf(id);
      if (at >= 0) ids.splice(at, 1);
      if (ids.length === 0) this.index.delete(key);
    }
    this.table.remove(id);
  }

  private indexAdd(id: number, kind: string, targetId: number, stat: string): void {
    const key = indexKey(kind, targetId, stat);
    const ids = this.index.get(key);
    if (ids) ids.push(id);
    else this.index.set(key, [id]);
  }

  private activeRows(target: EntityRef, stat: string, year: number): Row[] {
    const ids = this.index.get(indexKey(target.kind, target.id, stat)) ?? [];
    const rows: Row[] = [];
    for (const id of ids) {
      const r = this.table.require(id);
      if (r.start <= year && (r.expires === 0 || year < r.expires)) rows.push({ id, ...r });
    }
    return rows;
  }

  /** Explicación completa del valor de un stat (para el inspector). */
  explain(target: EntityRef, stat: keyof S & string, base: number, year: number): Explanation {
    const def = this.statDef(stat);
    const rows = this.activeRows(target, stat, year);
    const term = (r: Row): ExplainTerm => ({
      modifier: r.id,
      op: OPS[r.op] ?? 'add',
      value: r.value,
      source: { kind: r.sourceKind, id: r.sourceId },
      owner: r.owner,
    });
    const group = (op: ModifierOp) =>
      rows
        .filter((r) => OPS[r.op] === op)
        .sort(compareTerms)
        .map(term);
    const add = group('add');
    const mul = group('mul');
    const caps = group('min');
    const floors = group('max');

    let value = base;
    if (def.combine === 'additive') {
      for (const t of add) value += t.value;
      for (const t of mul) value *= t.value;
    } else {
      for (const t of mul) value *= t.value;
      for (const t of add) value += t.value;
    }
    for (const t of caps) value = Math.min(value, t.value);
    for (const t of floors) value = Math.max(value, t.value);
    let clampedTo: number | undefined;
    if (def.min !== undefined && value < def.min) value = clampedTo = def.min;
    if (def.max !== undefined && value > def.max) value = clampedTo = def.max;

    return {
      target,
      stat,
      combine: def.combine,
      base,
      add,
      mul,
      caps,
      floors,
      ...(clampedTo === undefined ? {} : { clampedTo }),
      value,
    };
  }

  /** Valor efectivo de un stat = base + modificadores activos en ese año. */
  value(target: EntityRef, stat: keyof S & string, base: number, year: number): number {
    return this.explain(target, stat, base, year).value;
  }

  writeState(w: ByteWriter): void {
    this.table.writeState(w);
  }

  readState(r: ByteReader): void {
    this.table.readState(r);
    for (const [id, row] of this.table.entries()) {
      this.indexAdd(id, row.targetKind, row.targetId, row.stat);
    }
  }

  guardSnapshot(): GuardSnapshot {
    return this.table.guardSnapshot();
  }
}

// Pipeline del tick (docs/model.md §7, ADR en P0.12). Corre los sistemas en el orden declarado
// (que tiene que respetar las fases), con sus cadencias, y en modo guard verifica que cada
// sistema escriba solo lo que declaró: compara la huella por campo de cada parte del estado
// antes y después del sistema.
import type { EventBus } from '../events/bus';
import type { GuardSnapshot, StatePart } from '../serialize/serializable';
import { isEveryNYears, type Season } from '../time';
import type { SystemContract, SystemDef } from './contract';
import { phaseIndex } from './phases';

/** Lo mínimo que el pipeline necesita de un buffer (nombre y si quedó vacío). */
export interface BufferLike {
  readonly name: string;
  readonly size: number;
}

export class ContractError extends Error {
  override name = 'ContractError';
}

const FIELD = /^[a-z][A-Za-z0-9]*\.([a-z][A-Za-z0-9]*|\*|#rows|own)$/;

function partOf(field: string): string {
  return field.slice(0, field.indexOf('.'));
}

/** ¿Dos declaraciones de escritura se pisan? (`own` nunca: es dueño por fila) */
function overlaps(a: string, b: string): boolean {
  if (a.endsWith('.own') || b.endsWith('.own')) return false;
  if (a === b) return true;
  return (
    (a.endsWith('.*') && partOf(a) === partOf(b)) || (b.endsWith('.*') && partOf(b) === partOf(a))
  );
}

function allows(writes: readonly string[], changed: string): boolean {
  const part = partOf(changed);
  return writes.some((w) => w === changed || w === `${part}.*` || w === `${part}.own`);
}

export interface RunOptions {
  readonly year: number;
  readonly events: EventBus;
  /** Guard de contratos (dev y tests): partes del estado a vigilar. */
  readonly guard?: { readonly parts: readonly StatePart[] };
}

export interface TickReport {
  /** Sistemas ejecutados, en orden (los estacionales con su estación: `military@2`). */
  readonly ran: readonly string[];
}

export class Pipeline<W> {
  private readonly systems: readonly SystemDef<W>[];
  private readonly buffers: readonly BufferLike[];
  private validatedFields = false;

  constructor(systems: readonly SystemDef<W>[], buffers: readonly BufferLike[] = []) {
    this.systems = systems;
    this.buffers = buffers;
    this.validateStatic();
  }

  get contracts(): readonly SystemContract[] {
    return this.systems.map((s) => s.contract);
  }

  /** Validaciones que no necesitan el estado: orden de fases, nombres, escritor único, buffers. */
  private validateStatic(): void {
    const names = new Set<string>();
    let lastPhase = -1;
    const writers: { field: string; system: string }[] = [];
    const producers = new Map<string, number[]>();
    const consumers = new Map<string, number[]>();
    const bufferNames = new Set(this.buffers.map((b) => b.name));

    this.systems.forEach(({ contract: c }, index) => {
      if (names.has(c.name)) throw new ContractError(`sistema repetido: ${c.name}`);
      names.add(c.name);
      const phase = phaseIndex(c.phase);
      if (phase < lastPhase) {
        throw new ContractError(`${c.name} (fase ${c.phase}) está después de una fase posterior`);
      }
      lastPhase = phase;
      if (
        c.cadence.kind === 'everyNYears' &&
        !(Number.isInteger(c.cadence.years) && c.cadence.years >= 1)
      ) {
        throw new ContractError(`${c.name}: cadencia inválida`);
      }
      for (const field of [...c.reads, ...c.writes]) {
        if (!FIELD.test(field)) throw new ContractError(`${c.name}: campo mal formado "${field}"`);
      }
      for (const field of c.writes) {
        const other = writers.find((w) => overlaps(w.field, field));
        if (other) {
          throw new ContractError(
            `escritor único: ${c.name} declara "${field}" y ${other.system} ya declara "${other.field}"`,
          );
        }
        writers.push({ field, system: c.name });
      }
      for (const b of c.produces ?? []) producers.set(b, [...(producers.get(b) ?? []), index]);
      for (const b of c.consumes ?? []) consumers.set(b, [...(consumers.get(b) ?? []), index]);
    });

    for (const name of new Set([...producers.keys(), ...consumers.keys()])) {
      if (!bufferNames.has(name)) throw new ContractError(`buffer "${name}" no registrado`);
      const cons = consumers.get(name) ?? [];
      if (cons.length !== 1) {
        throw new ContractError(
          `buffer "${name}" tiene ${cons.length} consumidores (debe tener 1)`,
        );
      }
      const consumer = cons[0] ?? 0;
      for (const p of producers.get(name) ?? []) {
        if (p >= consumer) {
          const pc = this.systems[p]?.contract.name ?? '?';
          const cc = this.systems[consumer]?.contract.name ?? '?';
          throw new ContractError(`buffer "${name}": ${pc} produce después de que ${cc} consume`);
        }
      }
    }
  }

  /** Verifica que todo campo declarado exista en las partes del estado (atrapa typos). */
  private validateFields(parts: readonly StatePart[]): void {
    const known = new Set<string>();
    const partNames = new Set<string>();
    for (const part of parts) {
      partNames.add(part.partName);
      known.add(`${part.partName}.#rows`);
      for (const key of part.guardSnapshot().fields.keys()) known.add(key);
    }
    for (const { contract: c } of this.systems) {
      for (const field of [...c.reads, ...c.writes]) {
        const part = partOf(field);
        const wildcard = field.endsWith('.*') || field.endsWith('.own');
        if (wildcard ? !partNames.has(part) : !known.has(field)) {
          throw new ContractError(`${c.name}: "${field}" no existe en el estado`);
        }
      }
    }
    this.validatedFields = true;
  }

  private shouldRun(contract: SystemContract, year: number): boolean {
    return contract.cadence.kind !== 'everyNYears' || isEveryNYears(year, contract.cadence.years);
  }

  /** Corre un tick completo. */
  runTick(world: W, options: RunOptions): TickReport {
    const guard = options.guard;
    if (guard && !this.validatedFields) this.validateFields(guard.parts);
    const ran: string[] = [];

    for (const system of this.systems) {
      const c = system.contract;
      if (!this.shouldRun(c, options.year)) continue;
      const seasons: (Season | undefined)[] =
        c.cadence.kind === 'seasonal' ? [0, 1, 2, 3] : [undefined];
      for (const season of seasons) {
        const before = guard ? guard.parts.map((p) => p.guardSnapshot()) : null;
        options.events.setEmitter(c.name, new Set(c.emits));
        try {
          system.run(world, {
            year: options.year,
            events: options.events,
            ...(season === undefined ? {} : { season }),
          });
        } finally {
          options.events.setEmitter(null, null);
        }
        if (guard && before) {
          guard.parts.forEach((part, k) => {
            const prev = before[k];
            if (!prev) return;
            for (const key of changedKeys(part.partName, prev, part.guardSnapshot())) {
              if (!allows(c.writes, key)) {
                throw new ContractError(
                  `${c.name} escribió "${key}" sin declararlo en su contrato`,
                );
              }
            }
          });
        }
        ran.push(season === undefined ? c.name : `${c.name}@${season}`);
      }
    }

    for (const buffer of this.buffers) {
      if (buffer.size !== 0) {
        throw new ContractError(`buffer "${buffer.name}" no quedó vacío al final del tick (I9)`);
      }
    }
    return { ran };
  }
}

function same(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v: unknown, i) => Object.is(v, b[i]));
  }
  return Object.is(a, b);
}

/** Claves que cambiaron entre dos instantáneas de una parte (ver `GuardSnapshot`). */
export function changedKeys(
  partName: string,
  before: GuardSnapshot,
  after: GuardSnapshot,
): string[] {
  const out: string[] = [];
  if (before.rows !== after.rows) out.push(`${partName}.#rows`);
  for (const [key, prev] of before.fields) {
    const next = after.fields.get(key);
    if (!next) continue;
    // Recorrido conjunto de dos listas de ids crecientes: solo filas comunes.
    let i = 0;
    let j = 0;
    while (i < before.ids.length && j < after.ids.length) {
      const a = before.ids[i] ?? 0;
      const b = after.ids[j] ?? 0;
      if (a < b) i++;
      else if (a > b) j++;
      else {
        if (!same(prev[i], next[j])) {
          out.push(key);
          break;
        }
        i++;
        j++;
      }
    }
  }
  return out;
}

export function createPipeline<W>(
  systems: readonly SystemDef<W>[],
  buffers: readonly BufferLike[] = [],
): Pipeline<W> {
  return new Pipeline(systems, buffers);
}

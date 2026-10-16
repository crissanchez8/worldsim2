// Buffer de deltas de población en structure-of-arrays (sin un objeto por delta). El spike B
// midió la diferencia contra un FlowBuffer de objetos (docs/phases/P00/spikes.md).

export const DELTA_GROWTH = 0;
export const DELTA_TRANSFER = 1;

export class PopDeltaBuffer {
  readonly name: string;
  private capacity = 1024;
  private length = 0;
  pop = new Uint32Array(this.capacity);
  kind = new Uint8Array(this.capacity);
  persons = new Float64Array(this.capacity);
  toCulture = new Uint16Array(this.capacity);

  constructor(name: string) {
    this.name = name;
  }

  get size(): number {
    return this.length;
  }

  private grow(): void {
    this.capacity *= 2;
    const pop = new Uint32Array(this.capacity);
    pop.set(this.pop);
    const kind = new Uint8Array(this.capacity);
    kind.set(this.kind);
    const persons = new Float64Array(this.capacity);
    persons.set(this.persons);
    const toCulture = new Uint16Array(this.capacity);
    toCulture.set(this.toCulture);
    this.pop = pop;
    this.kind = kind;
    this.persons = persons;
    this.toCulture = toCulture;
  }

  push(pop: number, kind: number, persons: number, toCulture: number): void {
    if (this.length === this.capacity) this.grow();
    const i = this.length++;
    this.pop[i] = pop;
    this.kind[i] = kind;
    this.persons[i] = persons;
    this.toCulture[i] = toCulture;
  }

  /** Cantidad de deltas pendientes; después de leerlos, `clear()` (vacío en la frontera, I9). */
  clear(): void {
    this.length = 0;
  }
}

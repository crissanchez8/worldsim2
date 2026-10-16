// Buffers de flujo (docs/model.md §8): viven dentro del tick, tienen productores declarados y un
// único consumidor, y tienen que quedar vacíos en la frontera del tick (I9).
// Este es el buffer de OBJETOS, para flujos fríos (pocos ítems por tick). Los calientes van en
// `SoaBuffer` (soa-buffer.ts).

export class FlowBuffer<T> {
  readonly name: string;
  private items: T[] = [];

  constructor(name: string) {
    this.name = name;
  }

  push(item: T): void {
    this.items.push(item);
  }

  get size(): number {
    return this.items.length;
  }

  /** Entrega los ítems en orden de llegada y deja el buffer vacío. */
  drain(): T[] {
    const out = this.items;
    this.items = [];
    return out;
  }
}

export function createBuffer<T>(name: string): FlowBuffer<T> {
  return new FlowBuffer<T>(name);
}

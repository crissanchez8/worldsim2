// Ids de entidad: uint32, monótonos, NUNCA reutilizados (la historia los referencia para
// siempre). 0 significa "ninguno".
declare const idBrand: unique symbol;

/** Id de una entidad de tipo K (marca de tipo: no se mezclan ids de provincias y de pops). */
export type Id<K extends string = string> = number & { readonly [idBrand]: K };

export const NO_ID = 0;
const MAX_ID = 0xffffffff;

export class IdAllocator<K extends string = string> {
  private nextId: number;

  constructor(next = 1) {
    if (!Number.isInteger(next) || next < 1 || next > MAX_ID + 1) {
      throw new Error(`IdAllocator: next inválido ${next}`);
    }
    this.nextId = next;
  }

  /** Asigna el próximo id. */
  next(): Id<K> {
    if (this.nextId > MAX_ID) throw new Error('IdAllocator: se agotaron los ids uint32');
    return this.nextId++ as Id<K>;
  }

  /** Próximo id que se va a asignar (estado serializable del asignador). */
  peek(): number {
    return this.nextId;
  }

  /** Garantiza que los próximos ids sean > id (al cargar un snapshot). */
  ensureAbove(id: number): void {
    if (id >= this.nextId) this.nextId = id + 1;
  }
}

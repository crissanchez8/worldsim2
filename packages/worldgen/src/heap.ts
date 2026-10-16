// Montículo binario mínimo con arrays tipados (Dijkstra, relleno de depresiones). Clave f64 y, a
// igual clave, el ítem menor primero: el orden de salida es total y no depende de la historia de
// inserciones (determinismo).

export class MinHeap {
  private keys: Float64Array;
  private items: Int32Array;
  private length = 0;

  constructor(capacity = 1024) {
    this.keys = new Float64Array(Math.max(1, capacity));
    this.items = new Int32Array(Math.max(1, capacity));
  }

  get size(): number {
    return this.length;
  }

  private less(a: number, b: number): boolean {
    const ka = this.keys[a] ?? 0;
    const kb = this.keys[b] ?? 0;
    return ka < kb || (ka === kb && (this.items[a] ?? 0) < (this.items[b] ?? 0));
  }

  private swap(a: number, b: number): void {
    const k = this.keys[a] ?? 0;
    const it = this.items[a] ?? 0;
    this.keys[a] = this.keys[b] ?? 0;
    this.items[a] = this.items[b] ?? 0;
    this.keys[b] = k;
    this.items[b] = it;
  }

  push(item: number, key: number): void {
    if (this.length === this.keys.length) {
      // Crecer en una sentencia aparte y recién después escribir (L-007).
      const keys = new Float64Array(this.keys.length * 2);
      keys.set(this.keys);
      const items = new Int32Array(this.items.length * 2);
      items.set(this.items);
      this.keys = keys;
      this.items = items;
    }
    let i = this.length++;
    this.keys[i] = key;
    this.items[i] = item;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.less(i, parent)) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  /** Clave del mínimo (antes de `pop`). */
  peekKey(): number {
    return this.keys[0] ?? 0;
  }

  /** Saca el ítem de menor clave. Falla si está vacío. */
  pop(): number {
    if (this.length === 0) throw new Error('MinHeap vacío');
    const top = this.items[0] ?? 0;
    this.length--;
    if (this.length > 0) {
      this.keys[0] = this.keys[this.length] ?? 0;
      this.items[0] = this.items[this.length] ?? 0;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.length && this.less(l, m)) m = l;
        if (r < this.length && this.less(r, m)) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }
}

// Deltas visuales (§8.4 del plan): lo que el mapa necesita para mostrar un año sin re-simular.
// En este spike: dueño y cultura mayoritaria por provincia.

/** Vista del mapa en un año: dueño y cultura mayoritaria por provincia (índice = id − 1). */
export interface MapView {
  readonly owners: Uint32Array;
  readonly cultures: Uint16Array;
}

export function cloneView(view: MapView): MapView {
  return { owners: view.owners.slice(), cultures: view.cultures.slice() };
}

/**
 * Codifica los cambios de `prev` a `next` como palabras uint32:
 *   [año, nDueños, (provincia, dueño)×n, nCulturas, (provincia, cultura)×m]
 * Los años negativos se guardan en complemento a dos.
 */
export function encodeDelta(year: number, prev: MapView, next: MapView): Uint32Array {
  const owners: number[] = [];
  const cultures: number[] = [];
  for (let i = 0; i < next.owners.length; i++) {
    const o = next.owners[i] ?? 0;
    if (o !== prev.owners[i]) owners.push(i + 1, o);
    const c = next.cultures[i] ?? 0;
    if (c !== prev.cultures[i]) cultures.push(i + 1, c);
  }
  const out = new Uint32Array(3 + owners.length + cultures.length);
  out[0] = year >>> 0;
  out[1] = owners.length / 2;
  out.set(owners, 2);
  out[2 + owners.length] = cultures.length / 2;
  out.set(cultures, 3 + owners.length);
  return out;
}

/** Aplica un delta codificado (en el lugar) y devuelve su largo en palabras. */
export function applyDelta(view: MapView, words: Uint32Array, at = 0): number {
  let i = at + 1;
  const nOwners = words[i++] ?? 0;
  for (let k = 0; k < nOwners; k++) {
    const p = words[i++] ?? 0;
    view.owners[p - 1] = words[i++] ?? 0;
  }
  const nCultures = words[i++] ?? 0;
  for (let k = 0; k < nCultures; k++) {
    const p = words[i++] ?? 0;
    view.cultures[p - 1] = words[i++] ?? 0;
  }
  return i - at;
}

/** Año de un delta codificado. */
export function deltaYear(words: Uint32Array, at = 0): number {
  return (words[at] ?? 0) | 0;
}

// Servicio de nombres (docs/model.md §9, "Servicio de nombres"): no es un sistema; lo usan los
// sistemas al crear entidades. La fila `Name` la escribe el sistema que nombra (dueño por fila).
import { createPhonology, makeName, type NameKind, type Phonology } from '@ws/lang';
import { rng } from '@ws/core';
import type { SimState } from './state';

const KINDS: readonly NameKind[] = ['person', 'place', 'polity', 'culture', 'language'];

/** Caché de fonologías por seed (memoria derivada: se reconstruye sola, no es estado). */
const phonologies = new Map<number, Phonology>();

function phonologyOf(state: SimState, language: number): Phonology {
  const seed = state.language.require(language).phonologySeed;
  let ph = phonologies.get(seed);
  if (!ph) {
    ph = createPhonology(seed);
    phonologies.set(seed, ph);
  }
  return ph;
}

/**
 * Crea una fila `Name` en el idioma dado y devuelve su id. El azar sale del stream `naming`
 * con el id que va a recibir el nombre como entidad: determinista y sin colisiones de cursor.
 */
export function assignName(
  state: SimState,
  worldSeed: number,
  language: number,
  kind: NameKind,
  year: number,
  owner: string,
): number {
  const nextId = state.name.allocator.peek();
  const d = rng
    .createRng(worldSeed)
    .stream(rng.Streams.naming)
    .sub(KINDS.indexOf(kind) + 1)
    .at(nextId, year);
  const text = makeName(phonologyOf(state, language), kind, d);
  return state.name.add({ text, language, assigned: year, owner });
}

/** Texto de un nombre (o '' si es 0). */
export function nameText(state: SimState, id: number): string {
  return id === 0 ? '' : (state.name.get(id)?.text ?? '');
}

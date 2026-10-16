// Serialización binaria de eventos para la historia (.wsim) y hash de los eventos de un tick
// (los tests de determinismo comparan estado Y eventos).
import { hash64 } from '../hash';
import { type ByteReader, ByteWriter, SerializeError } from '../serialize/bytes';
import type { Season } from '../time';
import type { Cause, EntityRef, EventData, GameEvent } from './types';

const NO_SEASON = 255;

function writeRef(w: ByteWriter, ref: EntityRef): void {
  w.str(ref.kind);
  w.u32(ref.id);
}

function readRef(r: ByteReader): EntityRef {
  return { kind: r.str(), id: r.u32() };
}

export function writeEvent(w: ByteWriter, e: GameEvent): void {
  w.varuint(e.id);
  w.str(e.type);
  w.i32(e.year);
  w.u8(e.season ?? NO_SEASON);
  w.varuint(e.actors.length);
  for (const a of e.actors) writeRef(w, a);
  w.u8(e.place ? 1 : 0);
  if (e.place) writeRef(w, e.place);
  w.varuint(e.causes.length);
  for (const c of e.causes) {
    if (c.kind === 'event') {
      w.u8(0);
      w.varuint(c.id);
    } else {
      w.u8(1);
      writeRef(w, c.entity);
      w.str(c.field);
      w.i32(c.year);
    }
  }
  // JSON canónico: el orden de claves es el de construcción, determinista en el motor.
  w.str(JSON.stringify(e.data));
  w.f64(e.significance);
}

export function readEvent(r: ByteReader): GameEvent {
  const id = r.varuint();
  const type = r.str();
  const year = r.i32();
  const season = r.u8();
  const actors: EntityRef[] = [];
  for (let n = r.varuint(); n > 0; n--) actors.push(readRef(r));
  const place = r.u8() === 1 ? readRef(r) : undefined;
  const causes: Cause[] = [];
  for (let n = r.varuint(); n > 0; n--) {
    const kind = r.u8();
    if (kind === 0) causes.push({ kind: 'event', id: r.varuint() });
    else if (kind === 1)
      causes.push({ kind: 'fact', entity: readRef(r), field: r.str(), year: r.i32() });
    else throw new SerializeError(`evento ${id}: tipo de causa ${kind}`);
  }
  const data = JSON.parse(r.str()) as EventData;
  const significance = r.f64();
  return {
    id,
    type,
    year,
    ...(season === NO_SEASON ? {} : { season: season as Season }),
    actors,
    ...(place ? { place } : {}),
    causes,
    data,
    significance,
  };
}

/** Hash de 64 bits de una lista de eventos (en orden). */
export function hashEvents(events: readonly GameEvent[]): string {
  const w = new ByteWriter();
  w.varuint(events.length);
  for (const e of events) writeEvent(w, e);
  return hash64(w.finish());
}

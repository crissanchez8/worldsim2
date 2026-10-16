// Snapshot binario versionado del estado completo (ADR-004).
//
//   'WSST' · formato u16 · ENGINE_VERSION str · cuerpo
//   cuerpo = cantidad de partes · por parte: nombre, descripción de esquema, largo, bytes
//
// El hash de estado se calcula sobre el CUERPO serializado: si un campo está en el estado,
// está en el hash, sin listas aparte que se puedan desactualizar (lección H-10).
import { hash64 } from '../hash';
import { ByteReader, ByteWriter, SerializeError } from './bytes';
import type { Serializable } from './serializable';

const MAGIC = [0x57, 0x53, 0x53, 0x54] as const; // 'WSST'
export const STATE_FORMAT_VERSION = 1;

function body(parts: readonly Serializable[]): Uint8Array {
  const names = new Set<string>();
  const w = new ByteWriter();
  w.varuint(parts.length);
  for (const part of parts) {
    if (names.has(part.partName)) throw new SerializeError(`parte repetida: ${part.partName}`);
    names.add(part.partName);
    const inner = new ByteWriter();
    part.writeState(inner);
    const bytes = inner.finish();
    w.str(part.partName);
    w.str(part.schemaDescription);
    w.varuint(bytes.length);
    w.bytes(bytes);
  }
  return w.finish();
}

/** Snapshot completo (con cabecera). El orden de `parts` es parte del formato. */
export function serializeState(parts: readonly Serializable[], engineVersion: string): Uint8Array {
  const w = new ByteWriter();
  for (const b of MAGIC) w.u8(b);
  w.u16(STATE_FORMAT_VERSION);
  w.str(engineVersion);
  w.bytes(body(parts));
  return w.finish();
}

/** Hash de 64 bits del estado (sin cabecera). */
export function hashState(parts: readonly Serializable[]): string {
  return hash64(body(parts));
}

/** Hash de una sola parte (para el guard de contratos y para localizar divergencias). */
export function hashPart(part: Serializable): string {
  const w = new ByteWriter();
  part.writeState(w);
  return hash64(w.finish());
}

/** Carga un snapshot sobre partes VACÍAS con los mismos nombres, esquemas y orden. */
export function deserializeState(
  data: Uint8Array,
  parts: readonly Serializable[],
  engineVersion: string,
): void {
  const r = new ByteReader(data);
  for (const b of MAGIC) {
    if (r.u8() !== b) throw new SerializeError('no es un snapshot de worldSim2 (magic)');
  }
  const format = r.u16();
  if (format !== STATE_FORMAT_VERSION) {
    throw new SerializeError(
      `formato de snapshot ${format} no soportado (esperado ${STATE_FORMAT_VERSION})`,
    );
  }
  const savedEngine = r.str();
  if (savedEngine !== engineVersion) {
    throw new SerializeError(
      `snapshot del motor ${savedEngine}; este es ${engineVersion} (un estado solo continúa en la misma versión)`,
    );
  }
  const count = r.varuint();
  if (count !== parts.length) {
    throw new SerializeError(`el snapshot tiene ${count} partes; se esperaban ${parts.length}`);
  }
  for (const part of parts) {
    const name = r.str();
    const description = r.str();
    if (name !== part.partName) {
      throw new SerializeError(`parte "${name}" donde se esperaba "${part.partName}"`);
    }
    if (description !== part.schemaDescription) {
      throw new SerializeError(
        `esquema incompatible en "${name}":\n  snapshot: ${description}\n  motor:    ${part.schemaDescription}`,
      );
    }
    const inner = new ByteReader(r.bytes(r.varuint()));
    part.readState(inner);
    inner.end();
  }
  r.end();
}

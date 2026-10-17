// Formato de historia `.wsim` v0 (ADR-008, opción B: D44). Contenedor por bloques comprimidos
// por separado:
//
//   'WSIM' · formato u16 · ENGINE_VERSION · STATE_VERSION · hash del WorldStatic · parámetros
//   (JSON) · años · bloques: [etiqueta 4 bytes · largo varuint · datos]
//     META  intervalos (keyframes visuales, series) y metadatos
//     VKEY  marcos visuales cada 100 años        DELT  deltas visuales anuales
//     SERI  series por provincia cada 10 años (diferencias con la muestra anterior, zigzag)
//     AGGR  agregados mundiales por año
//     EVNT  log de eventos                       KEYF  estados completos cada 1.000 años
//     FINL  estado final exacto (para continuar la corrida en la misma versión)
//
// El mundo físico no va: se regenera de los parámetros (su hash va en la cabecera). Un archivo de
// otra versión del motor se puede VER (bloques visuales y eventos) pero no continuar. Δ v0: sin
// INDX (el archivo se carga entero; el índice de la enciclopedia es P11).
import { ENGINE_VERSION, events, serialize } from '@ws/core';
import { STATE_VERSION } from '@ws/sim';
import type { WorldParams } from '@ws/worldgen';
import { deflateSync, inflateSync } from 'fflate';
import type { SeriesSample, VisualFrame } from './frame';
import type { HistoryData } from './history';

export const WSIM_FORMAT = 0;
const MAGIC = [0x57, 0x53, 0x49, 0x4d] as const; // 'WSIM'

export const WSIM_POLICY = {
  /** Keyframes completos en el archivo cada tantos años (years; D44: 1.000). */
  fileKeyframeEvery: 1000,
  /** Nivel de compresión de los bloques (deflate 0–9). */
  deflateLevel: 9,
} as const;

export interface WsimHeader {
  readonly format: number;
  readonly engineVersion: string;
  readonly stateVersion: string;
  readonly worldHash: string;
  readonly params: WorldParams;
  readonly years: number;
}

export interface WsimFile {
  readonly header: WsimHeader;
  readonly data: HistoryData;
  /** Estado final exacto (snapshot WSST sin comprimir). */
  readonly final: Uint8Array;
}

const { ByteWriter, ByteReader, SerializeError } = serialize;
type Writer = InstanceType<typeof ByteWriter>;
type Reader = InstanceType<typeof ByteReader>;

function writeFrame(w: Writer, f: VisualFrame): void {
  w.varuint(f.owner.length);
  w.numeric(f.owner, f.owner.length);
  w.numeric(f.level, f.level.length);
  w.numeric(f.culture, f.culture.length);
  w.numeric(f.innovations, f.innovations.length);
  w.varuint(f.capitals.size);
  for (const [id, capital] of f.capitals) {
    w.varuint(id);
    w.varuint(capital);
  }
}

function readFrame(r: Reader): VisualFrame {
  const n = r.varuint();
  const owner = new Uint32Array(n);
  r.numeric(owner, n);
  const level = new Uint8Array(n);
  r.numeric(level, n);
  const culture = new Uint32Array(n);
  r.numeric(culture, n);
  const innovations = new Uint32Array(n);
  r.numeric(innovations, n);
  const capitals = new Map<number, number>();
  for (let c = r.varuint(); c > 0; c--) capitals.set(r.varuint(), r.varuint());
  return { owner, level, culture, innovations, capitals };
}

/** Entero con signo → varuint (zigzag: 0, −1, 1, −2… → 0, 1, 2, 3…). */
const zigzag = (d: number): number => (d >= 0 ? 2 * d : -2 * d - 1);
const unzigzag = (z: number): number => (z % 2 === 0 ? z / 2 : -(z + 1) / 2);

/** Cada muestra como diferencia con la anterior: la población cambia poco por década. */
function writeSeries(w: Writer, series: readonly SeriesSample[]): void {
  const len = series[0]?.population.length ?? 0;
  w.varuint(series.length);
  w.varuint(len);
  let prev: SeriesSample = { population: new Uint16Array(len), urban: new Uint8Array(len) };
  for (const s of series) {
    for (let p = 0; p < len; p++)
      w.varuint(zigzag((s.population[p] ?? 0) - (prev.population[p] ?? 0)));
    for (let p = 0; p < len; p++) w.varuint(zigzag((s.urban[p] ?? 0) - (prev.urban[p] ?? 0)));
    prev = s;
  }
}

function readSeries(r: Reader): SeriesSample[] {
  const n = r.varuint();
  const len = r.varuint();
  const out: SeriesSample[] = [];
  let prev: SeriesSample = { population: new Uint16Array(len), urban: new Uint8Array(len) };
  for (let i = 0; i < n; i++) {
    const population = new Uint16Array(len);
    const urban = new Uint8Array(len);
    for (let p = 0; p < len; p++) population[p] = (prev.population[p] ?? 0) + unzigzag(r.varuint());
    for (let p = 0; p < len; p++) urban[p] = (prev.urban[p] ?? 0) + unzigzag(r.varuint());
    prev = { population, urban };
    out.push(prev);
  }
  return out;
}

function block(out: Writer, tag: string, payload: Uint8Array, compress = true): void {
  for (let i = 0; i < 4; i++) out.u8(tag.charCodeAt(i));
  const bytes = compress ? deflateSync(payload, { level: WSIM_POLICY.deflateLevel }) : payload;
  out.varuint(bytes.length);
  out.bytes(bytes);
}

/** Arma el `.wsim` de una historia y del estado final de la corrida (snapshot WSST). */
export function encodeWsim(
  params: WorldParams,
  worldHash: string,
  data: HistoryData,
  final: Uint8Array,
): Uint8Array {
  const out = new ByteWriter();
  for (const b of MAGIC) out.u8(b);
  out.u16(WSIM_FORMAT);
  out.str(ENGINE_VERSION);
  out.str(STATE_VERSION);
  out.str(worldHash);
  out.str(JSON.stringify(params));
  out.varuint(data.deltas.length);

  const meta = new ByteWriter();
  meta.str(
    JSON.stringify({
      startYear: data.startYear,
      keyframeEvery: data.keyframeEvery,
      seriesEvery: data.seriesEvery,
      fileKeyframeEvery: WSIM_POLICY.fileKeyframeEvery,
    }),
  );
  block(out, 'META', meta.finish());

  const vkey = new ByteWriter();
  vkey.varuint(data.visual.length);
  for (const f of data.visual) writeFrame(vkey, f);
  block(out, 'VKEY', vkey.finish());

  const delt = new ByteWriter();
  delt.varuint(data.deltas.length);
  for (const d of data.deltas) {
    delt.varuint(d.length);
    for (const word of d) delt.varuint(word);
  }
  block(out, 'DELT', delt.finish());

  const seri = new ByteWriter();
  writeSeries(seri, data.series);
  block(out, 'SERI', seri.finish());

  const aggr = new ByteWriter();
  const a = data.aggregates;
  aggr.varuint(a.population.length);
  for (let i = 0; i < a.population.length; i++) {
    aggr.f64(a.population[i] ?? 0);
    aggr.varuint(a.polities[i] ?? 0);
    aggr.f64(a.largestPolity[i] ?? 0);
    aggr.u8(a.era[i] ?? 0);
    aggr.f32(a.urbanization[i] ?? 0);
  }
  block(out, 'AGGR', aggr.finish());

  const evnt = new ByteWriter();
  evnt.varuint(data.events.length);
  for (const year of data.events) {
    evnt.varuint(year.length);
    for (const e of year) events.writeEvent(evnt, e);
  }
  block(out, 'EVNT', evnt.finish());

  // Keyframes completos solo cada fileKeyframeEvery (ya vienen comprimidos: sin doble deflate).
  const keyf = new ByteWriter();
  const kept = [...data.keyframes.entries()]
    .filter(([k]) => k % WSIM_POLICY.fileKeyframeEvery === 0)
    .sort((x, y) => x[0] - y[0]);
  keyf.varuint(kept.length);
  for (const [k, bytes] of kept) {
    keyf.varuint(k);
    keyf.varuint(bytes.length);
    keyf.bytes(bytes);
  }
  block(out, 'KEYF', keyf.finish(), false);
  block(out, 'FINL', final);
  return out.finish();
}

function readHeader(r: Reader): WsimHeader {
  for (const b of MAGIC)
    if (r.u8() !== b) throw new SerializeError('no es un archivo .wsim (magic)');
  const format = r.u16();
  if (format !== WSIM_FORMAT)
    throw new SerializeError(`.wsim formato ${format} (este motor lee ${WSIM_FORMAT})`);
  return {
    format,
    engineVersion: r.str(),
    stateVersion: r.str(),
    worldHash: r.str(),
    params: JSON.parse(r.str()) as WorldParams,
    years: r.varuint(),
  };
}

/** Bloques tal como están en el archivo (comprimidos), en orden. */
function rawBlocks(r: Reader): { tag: string; bytes: Uint8Array }[] {
  const out: { tag: string; bytes: Uint8Array }[] = [];
  while (r.remaining > 0) {
    let tag = '';
    for (let i = 0; i < 4; i++) tag += String.fromCharCode(r.u8());
    out.push({ tag, bytes: r.bytes(r.varuint()) });
  }
  return out;
}

/** Cabecera y tamaño en el archivo (bytes) de cada bloque, sin descomprimir. */
export function inspectWsim(bytes: Uint8Array): {
  readonly header: WsimHeader;
  readonly blocks: readonly { readonly tag: string; readonly bytes: number }[];
} {
  const r = new ByteReader(bytes);
  const header = readHeader(r);
  return { header, blocks: rawBlocks(r).map((b) => ({ tag: b.tag, bytes: b.bytes.length })) };
}

/** Lee un `.wsim`. Falla con un error claro si no es un archivo de worldSim2 o de otro formato. */
export function decodeWsim(bytes: Uint8Array): WsimFile {
  const r = new ByteReader(bytes);
  const header = readHeader(r);
  const blocks = new Map<string, Uint8Array>();
  for (const b of rawBlocks(r))
    blocks.set(b.tag, b.tag === 'KEYF' ? b.bytes : inflateSync(b.bytes));
  const need = (tag: string): Reader => {
    const b = blocks.get(tag);
    if (!b) throw new SerializeError(`.wsim sin bloque ${tag}`);
    return new ByteReader(b);
  };
  const meta = JSON.parse(need('META').str()) as {
    startYear: number;
    keyframeEvery: number;
    seriesEvery: number;
  };

  const vkey = need('VKEY');
  const visual: VisualFrame[] = [];
  for (let n = vkey.varuint(); n > 0; n--) visual.push(readFrame(vkey));

  const delt = need('DELT');
  const deltas: Uint32Array[] = [];
  for (let n = delt.varuint(); n > 0; n--) {
    const d = new Uint32Array(delt.varuint());
    for (let i = 0; i < d.length; i++) d[i] = delt.varuint();
    deltas.push(d);
  }

  const series = readSeries(need('SERI'));

  const aggr = need('AGGR');
  const aggregates = {
    population: [] as number[],
    polities: [] as number[],
    largestPolity: [] as number[],
    era: [] as number[],
    urbanization: [] as number[],
  };
  for (let n = aggr.varuint(); n > 0; n--) {
    aggregates.population.push(aggr.f64());
    aggregates.polities.push(aggr.varuint());
    aggregates.largestPolity.push(aggr.f64());
    aggregates.era.push(aggr.u8());
    aggregates.urbanization.push(aggr.f32());
  }

  const evnt = need('EVNT');
  const eventLog: events.GameEvent[][] = [];
  for (let n = evnt.varuint(); n > 0; n--) {
    const year: events.GameEvent[] = [];
    for (let m = evnt.varuint(); m > 0; m--) year.push(events.readEvent(evnt));
    eventLog.push(year);
  }

  const keyf = need('KEYF');
  const keyframes = new Map<number, Uint8Array>();
  for (let n = keyf.varuint(); n > 0; n--) {
    const k = keyf.varuint();
    keyframes.set(k, keyf.bytes(keyf.varuint()));
  }
  const final = blocks.get('FINL');
  if (!final) throw new SerializeError('.wsim sin bloque FINL');

  return {
    header,
    data: {
      startYear: meta.startYear,
      keyframeEvery: meta.keyframeEvery,
      seriesEvery: meta.seriesEvery,
      visual,
      deltas,
      series,
      aggregates,
      events: eventLog,
      keyframes,
    },
    final,
  };
}

/** ¿Se puede continuar la corrida de este archivo con este motor? (si no, solo se ve) */
export function canContinue(header: WsimHeader): boolean {
  return header.engineVersion === ENGINE_VERSION && header.stateVersion === STATE_VERSION;
}

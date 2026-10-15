// Registro ÚNICO de streams del RNG (ADR-002). Los ids son constantes explícitas: nunca se
// generan por orden de registro y nunca se reasignan, para que agregar un sistema no altere
// el azar de los demás. Un id usado no se reutiliza aunque el stream se elimine.

declare const streamBrand: unique symbol;
export type StreamId = number & { readonly [streamBrand]: true };

/** Valida ids únicos en [1, 0xffff] y congela el registro. */
export function defineStreams<const T extends Record<string, number>>(
  ids: T,
): { readonly [K in keyof T]: StreamId } {
  const seen = new Map<number, string>();
  // eslint-disable-next-line no-restricted-properties -- solo valida unicidad: el orden no cambia el resultado
  for (const [name, id] of Object.entries(ids)) {
    if (!Number.isInteger(id) || id < 1 || id > 0xffff) {
      throw new Error(`stream "${name}": id ${id} fuera de [1, 0xffff]`);
    }
    const other = seen.get(id);
    if (other !== undefined) throw new Error(`streams "${other}" y "${name}" comparten id ${id}`);
    seen.set(id, name);
  }
  return Object.freeze({ ...ids }) as unknown as { readonly [K in keyof T]: StreamId };
}

export const Streams = defineStreams({
  // 0x00xx · core, tests y herramientas
  test: 0x0001,
  bench: 0x0002,
  // 0x01xx · worldgen (P1/P3)
  worldgenPlates: 0x0101,
  worldgenNoise: 0x0102,
  worldgenErosion: 0x0103,
  worldgenClimate: 0x0104,
  worldgenHydrology: 0x0105,
  worldgenProvinces: 0x0106,
  worldgenSpecies: 0x0107,
  worldgenDeposits: 0x0108,
  // 0x02xx · sistemas de simulación (DEVELOPMENT_PLAN §11.3)
  environment: 0x0201,
  production: 0x0202,
  markets: 0x0203,
  demography: 0x0204,
  migration: 0x0205,
  assimilation: 0x0206,
  epidemics: 0x0207,
  knowledge: 0x0208,
  settlements: 0x0209,
  estates: 0x020a,
  characters: 0x020b,
  succession: 0x020c,
  schemes: 0x020d,
  statecraft: 0x020e,
  regime: 0x020f,
  agenda: 0x0210,
  diplomacy: 0x0211,
  military: 0x0212,
  culture: 0x0213,
  language: 0x0214,
  faith: 0x0215,
  // 0x03xx · nombres y relato
  naming: 0x0301,
  chronicle: 0x0302,
  // 0xffxx · spikes (descartables)
  spike: 0xff01,
});

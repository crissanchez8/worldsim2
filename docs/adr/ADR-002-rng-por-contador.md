# ADR-002 · RNG por contador con streams

| | |
|---|---|
| **Fecha** | 2026-10-15 |
| **Estado** | Aceptado |
| **Fase** | P0 |
| **Decisión en log** | D39 |

## Contexto
El proyecto anterior recalibró el golden 24 veces (H-12): agregar un sistema o cambiar el orden
del tick alteraba el azar de todo. Necesitamos azar reproducible por seed, independiente del
orden de ejecución, y estable cuando se agregan sistemas.

## Opciones consideradas
| Opción | Pros | Contras |
|---|---|---|
| **Por contador: hash(seed, stream, sub, entidad, año, k) (elegida)** | Sin estado global; no depende del orden; agregar un sistema no toca a los demás; paralelizable | Cada número cuesta un hash (≈23 ns por palabra de 32 bits) |
| PRNG con estado por sistema (xoshiro, PCG) | Muy rápido | El estado es parte del snapshot; el orden de consumo dentro del sistema importa; difícil de razonar al refactorizar |
| PRNG global | Trivial | Exactamente el error del proyecto anterior |

## Decisión
- Núcleo: **XXH32 de 6 palabras** `[seed, stream, sub, entidad, año, k]`, implementado propio y
  verificado contra los vectores publicados de xxHash. Dos carriles (seeds de XXH32 distintas)
  dan 64 bits por paso: `uniform()` tiene 53 bits de resolución.
- API: `createRng(seed).stream(Streams.x).sub(n).at(entidad, año)` → cursor `Draw` con
  `uint32`, `uniform`, `int`, `intBetween`, `range`, `chance`, `normal` (método polar con
  `core/math`), `weighted`, `pick`, `shuffle`. Acceso sin asignaciones `rngUint32`/`rngUniform`
  para lazos calientes.
- **Registro único de streams** (`core/rng/streams.ts`) con ids constantes en [1, 0xffff],
  agrupados por rango (0x01xx worldgen, 0x02xx sistemas, 0x03xx relato, 0xffxx spikes). Un id
  usado no se reasigna nunca.
- Seeds de texto con `seedFromString` (XXH32 del UTF-8).

## Consecuencias
- Positivas: el golden solo cambia cuando cambia la lógica del sistema que lo consume.
- Negativas: costo por número. Medido: `Draw.uniform` ≈ 47 ns (dos XXH32). Con presupuesto de
  10 ms/año, 100.000 uniformes por año consumirían ~4,7 ms. Mitigaciones si el bench lo pide
  (P1.9): `uint32()` de un carril (la mitad), muestreo por agregados en vez de por individuo.
- Revisar si: el perfilado de P1 muestra al RNG > 20% del tick.

## Evidencia
- Tests: vectores de referencia de XXH32; chi² con p = 0,001 a lo largo del contador, de
  entidades y de años; bits balanceados (±1%); correlación < 0,02 entre streams, entidades y
  pasos; normal con media 0 y varianza 1; propiedades con fast-check.
- Golden de valores fijos en `rng.test.ts`.

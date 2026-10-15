# ADR-004 · Almacenes de estado, serialización y hash

| | |
|---|---|
| **Fecha** | 2026-10-15 |
| **Estado** | Aceptado |
| **Fase** | P0 |
| **Decisión en log** | D41 |

## Contexto
≈1.500 provincias y decenas de miles de pops durante 14.000 años, transferibles al hilo
principal sin copiar, con ids que la historia referencia para siempre. En el proyecto anterior
parte del estado no estaba en el snapshot ni en el hash (H-10).

## Opciones consideradas
| Opción | Pros | Contras |
|---|---|---|
| **SoA con arrays tipados + tablas escasas (elegida)** | Compacto, rápido, transferible; serialización en bloque | Más verboso que objetos |
| Objetos por entidad (AoS) | Cómodo | Lento, pesado en memoria, no transferible |
| ECS genérico (bitECS, etc.) | Ecosistema | Pensado para juegos con componentes dinámicos; ids reciclados por defecto |

Hash de estado:

| Opción | Rendimiento medido | Notas |
|---|---|---|
| **2×XXH32 con seeds distintas (elegida)** | ≈ 3.300 MB/s | 64 bits; suficiente para detectar divergencias y regresiones |
| XXH64 emulado con pares de uint32 | ≈ 50 MB/s | 65× más lento: la multiplicación de 64 bits sin BigInt es cara |
| XXH64 con BigInt | (no medido) | BigInt es aún más lento en lazos calientes |

## Decisión
- **Ids:** uint32 monótonos por tipo de entidad, nunca reutilizados; 0 = ninguno; `Id<K>` con
  marca de tipo.
- **Esquemas declarativos** con unidad física obligatoria por campo (`UNITS`), versión y
  descripción canónica (`province@1{area:f64:km2,…}`).
- **Table (SoA):** una columna tipada por campo; filas en orden de id (búsqueda binaria para
  id → fila, sin índices que crezcan con la historia); bajas lógicas y `compact()` explícito
  que preserva el orden. Acceso directo a columnas para lazos calientes.
- **SparseTable:** `Map` (orden de inserción = orden de id) con escalares, `str`, `refs`,
  `f64s`. **Globals:** escalares del mundo.
- **Snapshot `WSST`:** formato u16 + `ENGINE_VERSION` + por parte nombre, descripción de esquema
  y bytes. Solo filas vivas (el hash no depende de cuándo se compactó). Errores explícitos ante
  magic, formato, versión de motor o esquema incompatibles, y datos truncados o sobrantes.
- **Hash de estado = hash64 de los bytes serializados del cuerpo.** No hay lista de campos
  hasheados que mantener: si está en el estado, está en el hash.
- **NaN prohibido en el estado:** el serializador falla con la ubicación (`tabla.campo#id`).
  0 y −0 se distinguen.
- **Copia en bloque** de columnas en tablas compactas (little-endian, con detección de
  plataforma y camino de respaldo valor por valor que da los mismos bytes).

## Consecuencias
- Positivas: snapshot y hash de un estado de 15.000 pops en < 1 ms, lo que permite hashear por
  año en los tests de determinismo (spike C). Ningún campo queda afuera del hash.
- Negativas: los esquemas se versionan a mano; un snapshot viejo no carga en un motor nuevo
  (es lo deseado: un seed reproduce solo dentro de la misma versión, §8.3).
- El guard de contratos (P0.10) puede usar `hashPart` por columna o por parte para detectar
  escrituras fuera de contrato.
- Revisar si: aparece una plataforma big-endian relevante (el camino de respaldo ya existe), o
  el tamaño de los keyframes supera el presupuesto de `.wsim` (ADR-008).

## Evidencia
15.000 filas × 10 campos (615 KiB), Node 24 en M1 Pro:

| Operación | Antes de la copia en bloque | Después |
|---|---|---|
| serializeState | 9,0 ms | 0,79 ms |
| hashState | 9,7 ms | 0,96 ms |
| deserializeState | 4,6 ms | 0,15 ms |

Tests: ida y vuelta bit a bit con estados aleatorios, toda mutación de celda cambia el hash,
la compactación no lo cambia, camino rápido = camino lento (validados con mutación, L-008),
golden de un estado fijo.

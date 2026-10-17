# ADR-008 · Formato de historia `.wsim` v0

| | |
|---|---|
| **Fecha** | 2026-10-16 |
| **Estado** | Aceptado el 2026-10-16 con la opción B (D44) |
| **Fase** | P0 (especificación; se implementa en P1.4) |
| **Decisión en log** | D44 |

## Contexto
Compartir sin backend (D18): la historia de un mundo como archivo, ≤ 20 MB comprimido (§2 del
plan). Rebobinar es *ver* el pasado (§8.4). El mundo físico se regenera del seed.

El spike B midió, para un estado mínimo (1.500 provincias, 15.000 pops con 3 campos):
- keyframe completo comprimido: **~93 KB**; 140 keyframes (cada 100 años) = **13 MB**;
- keyframes visuales (dueño + cultura): 10 KB crudos c/u; deltas visuales de 14.000 años: 0,24 MB;
- estado completo a una fecha = keyframe + re-simulación: 250–460 ms con keyframes cada 100 años.

El estado del motor real (pops con 10 campos, mercados, personajes, religiones, modificadores…)
va a ser **varias veces mayor**: con keyframes completos cada 100 años, el archivo pasaría los
20 MB con holgura.

## Formato propuesto (v0)
Contenedor por bloques, cada uno independiente y comprimido (deflate, fflate) para acceso al azar:

```
'WSIM' · formato u16 · ENGINE_VERSION · hash de contenido · seed · parámetros (JSON)
· hash del WorldStatic · formato de estado ('WSST' v1)
bloques: [tipo 4 bytes · largo · datos]
  META  parámetros, nombre del mundo, años, metadatos de la corrida
  KEYF  keyframes de estado completo (snapshot WSST comprimido) con su año
  VKEY  keyframes visuales (lo que el mapa necesita) con su año
  DELT  deltas visuales anuales (y estacionales para ejércitos), por siglos
  EVNT  log de eventos (codec de core/events), por siglos
  FINL  estado completo final, exacto (para continuar la corrida en la misma versión)
  INDX  índice año → bloques; índice de la enciclopedia (P11)
```

## Opciones para la política de keyframes completos
| Opción | Pros | Contras |
|---|---|---|
| A · Cada 100 años en el archivo (lo que dice el plan) | Estado completo de cualquier año en < 0,5 s | Supera 20 MB con el estado real (~13 MB ya con el mínimo) |
| **B · En memoria cada 100 años; en el archivo cada 1.000 años + el estado final exacto (recomendada)** | Archivo dentro de presupuesto (~14 keyframes); en la sesión en vivo el rebobinado completo sigue siendo rápido; el mapa a la fecha siempre es instantáneo (VKEY + DELT) | Con un archivo cargado, el estado completo de un año arbitrario cuesta hasta 999 años de re-simulación (varios segundos); el inspector "a la fecha" tiene que vivir de resúmenes en DELT/EVNT, no del estado completo |
| C · Keyframes con floats cuantizados (f32) | Más chicos | El estado deja de ser exacto: rompe "continuar con hash idéntico"; solo sirve para mostrar |

**Se eligió B** (D44), con el **inspector "a la fecha" alimentado por resúmenes** por entidad en los
deltas (población, dueño, nivel, régimen…: lo define P1.4/P11), y el estado completo exacto solo
al final (continuar) y cada 1.000 años (re-simulación).
**No recomiendo C:** un estado inexacto contradice la regla "si está en el estado, está en el
hash" y vuelve no verificables los archivos compartidos.

## Consecuencias
- El intervalo de keyframes del archivo y el de memoria son parámetros (config con unidad: años).
- Un archivo de otra `ENGINE_VERSION` se puede **ver** (bloques visuales y eventos) pero no
  continuar.
- Revisar en P1 con el tamaño real del estado y en P11 con el índice de la enciclopedia.

## Evidencia
Spike B (`docs/phases/P00/spikes.md`): tamaños y latencias citados arriba.

## Medición con el estado real (P1.4, 2026-10-16)
Mundo mediano, seed 1, 13.900 años (−12000 → 1900), motor 0.1.3: `pnpm ws run --size medium
--wsim out/p14/medium-s1.wsim`.

| Bloque | Tamaño en el archivo |
|---|---|
| META | 61 B |
| VKEY (140 marcos visuales) | 0,05 MB |
| DELT (13.900 deltas anuales) | 0,06 MB |
| SERI (1.391 muestras × 1.501 provincias, en diferencias zigzag) | 2,14 MB |
| AGGR (agregados por año) | 0,17 MB |
| EVNT (51.508 eventos) | 1,69 MB |
| KEYF (14 keyframes completos de ~84 KB) | 1,18 MB |
| FINL (estado final exacto) | 0,40 MB |
| **Total** | **5,69 MB** (presupuesto 20 MB) |

- En memoria: 140 keyframes × ~96 KB = 13,5 MB; marcos visuales 2,7 MB; series 6,3 MB.
- Mapa a la fecha (VKEY + hasta 99 deltas): ≤ 0,1 ms (D45: 16 ms).
- Estado completo a la fecha en vivo (keyframe cada 100 años + re-simulación): promedio 167 ms,
  máximo 278 ms (D45: 500 ms). Desde el archivo (cada 1.000 años): promedio 1,5 s, máximo 2,1 s:
  con progreso, como prevé D01-c.
- Grabar cuesta 0,4 ms/año (la simulación, 1,6 ms/año); codificar el archivo 1,7 s, leerlo 0,4 s.
- **Δ v0:** sin INDX (el archivo se carga entero; el índice de la enciclopedia es P11); eventos por
  año, no por siglo; la serie va en diferencias (con las muestras crudas eran 3,9 MB).
- **Riesgo:** EVNT crece con los eventos de cada fase (≈ 33 B por evento comprimido; el codec escribe
  tipo y datos como texto). Si pesa, va un bloque columnar con diccionario de tipos (P11).

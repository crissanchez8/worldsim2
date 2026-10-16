# ADR-008 · Formato de historia `.wsim` v0

| | |
|---|---|
| **Fecha** | 2026-10-16 |
| **Estado** | Propuesto (🔶 política de keyframes a decidir con Cristian en el checkpoint 3) |
| **Fase** | P0 (especificación; se implementa en P1.4) |
| **Decisión en log** | — (pendiente) |

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

**Recomiendo B**, con el **inspector "a la fecha" alimentado por resúmenes** por entidad en los
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

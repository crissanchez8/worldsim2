# REPORT — P01 · Rebanada vertical

| | |
|---|---|
| **Fecha de cierre** | — (borrador del 2026-10-17) |
| **Estado** | 📝 Borrador: falta el checkpoint 3 (recorrido de Cristian), el QA gate con su evidencia y el OK de cierre |
| **BRIEF** | `docs/phases/P01/BRIEF.md` (aprobado el 2026-10-16, D48–D54) |
| **PR / rama** | https://github.com/crissanchez8/worldsim2/pull/2 · `phase/p01-rebanada` |
| **Preview** | https://phase-p01-rebanada.worldsim2.pages.dev |

## 1. Resumen
La rebanada vertical funciona de punta a punta en la web, sin backend:
- se crea un mundo físico (placas, relieve, clima, biomas, ríos, ~1.500 provincias) en ~4 s;
- se simulan 13.900 años de gente, conocimiento, asentamientos, estados, sucesión y guerra con
  11 sistemas con contrato, en un Worker y de forma determinista (mismo hash por año en Node,
  Chromium, Firefox y WebKit);
- se mira en un mapa 3D con relleno político, al ritmo de la era dominante y con línea de tiempo
  y teletipo;
- se puede rebobinar cualquier año, preguntar el "por qué" de cada stat a esa fecha, recorrer un
  resumen con listas, gráficos y fichas, guardar y continuar con el mismo hash, y compartir un
  link que reproduce el mismo mundo en otro navegador.

La UI es neutra a propósito: el diseño llega en P2.

## 2. Tareas
| Tarea | Estado | Notas |
|---|---|---|
| P1.0 Bases (SoA, ledger, derive, contenido, esqueleto de sim, suite de determinismo) | ✅ hecha | Las tablas y los campos se crean con el sistema que los usa (Δ) |
| P1.1 Worldgen v1 en su Worker | ✅ hecha | Mediano en 3,6–3,8 s (Node y Chrome); el host del Worker de la web llegó con P1.2 |
| P1.2 Mapa v1 | ✅ hecha | Sesión paralela; mergeada con el OK de Cristian (rama `claude/eager-lamport-065b7b`) |
| P1.3 Simulación v1 | ✅ hecha | 9 sistemas + ledger + derive; cambios al modelo en D55 |
| P1.4 Historia v1 y `.wsim` v0 | ✅ hecha | Sin bloque INDX (P11); IndexedDB llegó con P1.5 |
| P1.5 Tiempo y director v1 | ✅ hecha | Worker por tandas, simulación adelantada (D49), ritmo por era (D48), línea de tiempo, mundos guardados |
| 🎨 Wireframes | ✅ aprobados | D57, con las 3 recomendaciones |
| P1.6 UI v1 funcional y neutra | ✅ hecha | Crear, vivo con inspector y teletipo, resumen y fichas, es/en |
| P1.7 Compartir v1 | ✅ hecha | Link con versión, avance rápido con progreso, huellas, aviso de versión |
| P1.8 Salud v1 (`ws health`) | ✅ hecha | 10 seeds; calibración v1 con dispersión pendiente (P4/P5) |
| P1.9 Rendimiento | ✅ hecha | Escenario `world-medium`, presupuestos en el bench, medición en el navegador; no hizo falta optimizar el motor |
| P1.10 Cierre | ⚠️ en curso | Spikes borrados (tag `p00-spikes` publicado con el OK de Cristian), `model.md` v1.1, prompt de P2, bases del bench (M1 Pro y runner); faltan el checkpoint 3 y el OK |

Subtareas: se marcan en el BRIEF al cerrar.

## 3. Desvíos respecto del BRIEF
- **Modelo (D53, D55, D51):**
  - `Province.cropShare` en lugar de `landUse` ×5;
  - `Title` mínimo con `heir` (dueño characters);
  - guerra = `War` + `Front` en lugar de `WarSide`;
  - batallas, tratados e invenciones solo como eventos;
  - efectos de innovaciones como datos sobre el bitset;
  - invención ∝ área × √densidad y difusión por días;
  - sin reclamos (P7).

  Todo quedó en `model.md` v1.1.
- **Historia:**
  - el grabador corre fuera del pipeline (no es el sistema `chronicle`, que pasa a P11);
  - sin bloque INDX;
  - eventos por año y no por siglo;
  - la serie va en diferencias zigzag (con las muestras crudas el `.wsim` pesaba 7,4 MB; quedó en 5,7 MB).
- **Ritmo (D56):** la tabla de D48 se mantiene, pero la mediana de 10 seeds da 13,7 min y no 10 ± 1, por la dispersión bimodal de la simulación; se mide de nuevo después de calibrar en P4/P5. `PLAYBACK` vive en `packages/history` (no en la config de la web) para que `ws health` use la misma función.
- **UI:**
  - la línea de tiempo funcional llegó con P1.5;
  - las columnas del resumen muestran valores a la fecha, no máximos históricos;
  - el "por qué" cubre los stats con base sin estado del año (natalidad y mortalidad quedan fuera);
  - el color político sale del id de polity (el coloreo de grafo es P2.4).
- **Compartir:** el modo "link compartido" lo marca `v=` en la URL; un mundo abierto desde "Crear" se reproduce a 1×.
- **Robustez:** la simulación arranca cuando el mundo existe, sin esperar al mapa (un fallo del mapa es un aviso). Lo destapó el CI de Firefox sin GPU.

## 4. Decisiones tomadas en la fase
| # | Decisión | Link |
|---|---|---|
| D48 | Ritmo por era dominante con piso de 15 min | `decisions.md` |
| D49 | Simulación adelantada con colchón (~500 años) | ″ |
| D50 | Inspector a la fecha = resúmenes en los deltas + registros + eventos; "por qué" exacto a pedido | ″ |
| D51 | Alcance de la rebanada; reclamos a P7 | ″ |
| D52 | `spikes/` se borra al cerrar P1 | ″ |
| D53 | Cambios al modelo para P1 (`Settlement.name`, `Title` mínimo, `Person` sin rasgos) | ″ |
| D54 | Dependencias nuevas (zod, TanStack Router y Virtual, zustand, uPlot) | ″ |
| D55 | Cambios al modelo de P1.3 | ″ |
| D56 | El objetivo de 10 ± 1 min se mide después de P4/P5 | ″ |
| D57 | Wireframes aprobados con las 3 recomendaciones | ″ |
| — | Merge de P1.2 en la rama de fase (OK de Cristian en el chat) | STATUS |

## 5. Métricas
| Métrica | Antes (P0) | Después (P1) | Objetivo |
|---|---|---|---|
| Tests (cantidad / verdes) | 404 unitarios + 3 Playwright | 567 unitarios (sin los spikes) + 3 de la suite de determinismo + 12 E2E de la web (6 casos × Chromium y Firefox, uno se saltea en Firefox a propósito) / todos verdes | — |
| ms por año simulado (prom. / p95) | 2,38 / 2,75 (año sintético) | Mediano real: 1,43 / 2,1 (Node, M1 Pro) · Worker: 1,42 (Chrome) y 2,98 (Firefox) | ≤ 10 / ≤ 25 |
| Corrida completa a máx. (−12000 → 1900, mediano) | 45 s con carga ficticia | 20 s (Chrome con GPU) · 42 s (Firefox) | ≤ 3 min |
| Duración a 1× (10 seeds) | — | Mediana 13,7 min (4,0–15,0) | ≈ 10 min (D56: se mide de nuevo en P4/P5) |
| Generación de mundo (mediano) | — | 3,8 s (Node y Chrome) · 6,6 s (Firefox) | ≤ 20 s |
| Primer cuadro del mapa (mediano) | — | 4,6 s (Chrome) · 7,5 s (Firefox) | — |
| fps (prom. / p5) | Chrome visible 118,8 / 107,5 | Recorrido headless: Chrome 60,0 / 59,9 · Firefox 59,3 / 57,1 (P1.2; las visibles las mide Cristian) | 60 / ≥ 45 |
| Tareas largas durante la corrida | — | 0 (Chrome y Firefox) | — |
| Rebobinar el mapa | 0,03 ms | ≤ 0,1 ms (Node) · ≤ 0,5 ms con el mapa (Chrome) · 2 ms (Firefox) | ≤ 16 ms |
| Estado completo a una fecha | 250–460 ms | 237 ms (Node) · 218 ms (Chrome) · 487 ms (Firefox) | ≤ 500 ms |
| `.wsim` de la corrida completa | 13 MB estimados (estado mínimo) | 5,69 MB (keyframe completo de 394 KB) | ≤ 20 MB |
| Carga de "Crear" (JS) | — | 298 kB (96 kB gzip); el mundo se carga a pedido | — |
| Salud histórica (10 seeds) | No aplica | 0 invariantes rotos, 0 hegemones; población en banda: 7/10 en el 1 d.C., 0/10 en 1900; hitos: ver `docs/phases/P01/health-baseline.json` | Bandas del Apéndice A |
| Hash golden | `877b14a0153e633b` (estado de prueba) | Contenido `15186f8acc4f4229` · mundo chico `2db5ea9ae165bbf5` · simulación a −4000 `fdf064f9d346d36f` · `ENGINE_VERSION` 0.1.3 | — |

## 6. Evidencia
- Capturas (`docs/phases/P01/img/`):
  - mapa: `mapa-p12-*.jpg`;
  - vista en vivo: `vivo-p15.jpg`;
  - crear, vivo con el porqué, resumen y ficha en inglés: `p16-*.jpg`.
- Wireframes aprobados: `docs/phases/P01/wireframes/`.
- Mediciones:
  - mapa: `docs/phases/P01/mapa.md`;
  - historia: ADR-008 §Medición;
  - bench: `docs/phases/P01/bench-baseline.json` (M1 Pro) y `bench-baseline-ci.json` (runner del CI): el keyframe y el `.wsim` miden lo mismo byte por byte en las dos máquinas;
  - navegador: `apps/web/scripts/measure-live.mjs`.
- Salud: `docs/phases/P01/health-p13.md` y `health-baseline.json`.
- CI: jobs `check`, `determinism` (suite del motor + E2E de la web), `health` y `deploy` en el PR #2.
- ⏳ Checkpoint 3: el recorrido de Cristian (10 min a 1×, rebobinar, resumen, link en otro navegador, Safari en la página de determinismo).

## 7. Criterios de salida
- [x] Mundo mediano generado en ≤ 20 s: 3,8 s en Chrome (build, M1 Pro, `measure-live.mjs`)
- [ ] 12.000 a.C. → 1900 en ≈10 min a velocidad normal y ≤ 3 min a velocidad máxima:
  - **máx.:** ✅ 20 s en Chrome, 42 s en Firefox;
  - **1×:** ❌ mediana de 13,7 min; queda abierto por D56 hasta P4/P5.
- [x] Rebobinar a cualquier año: el mapa y el inspector muestran ese año (E2E de la línea de tiempo y del inspector) · ⏳ recorrido de Cristian
- [x] Guardar/cargar a mitad de corrida → continuación con hash idéntico (test de Node + E2E en Chromium y Firefox)
- [x] Un link compartido reproduce el mismo mundo: el E2E da la misma huella en Chromium y en Firefox · ⏳ Cristian en otro navegador
- [x] Toda entidad del resumen tiene ficha navegable; 3 gráficos correctos (E2E: fila → ficha; tres gráficos de los agregados por año)
- [x] El toggle es/en cambia toda la UI y los textos de eventos (E2E; sin regenerar el mundo)
- [x] Rebobinar el mapa ≤ 16 ms; estado completo a una fecha ≤ 500 ms (Firefox, justo: 487 ms)
- [x] Hash por año idéntico en Chromium, Firefox, WebKit y Node con el motor real (job `determinism`) · ⏳ Safari a mano (Cristian)
- [x] `.wsim` de una corrida completa ≤ 20 MB: 5,69 MB
- [x] `ws health` de 10 seeds sin invariantes rotos; contratos con guard en todos los tests
- [ ] Cero errores de consola; CI verde; bench dentro del presupuesto; líneas base regeneradas:
  - ✅ cero errores (E2E);
  - ✅ CI verde hasta P1.7; P1.9 y el cierre, en curso;
  - ✅ bench dentro del presupuesto en el M1 Pro y en el runner (1,84 ms/año, estado completo 325 ms);
  - ✅ las dos bases regeneradas (`bench-baseline.json`, `bench-baseline-ci.json`).
- [ ] REPORT escrito, docs actualizados (`model.md` v1.1, ADR-008, `CLAUDE.md`), prompt de P2 refrescado: ✅ los docs y el prompt; ⏳ este REPORT, que cierra con el checkpoint 3

## 8. Deuda técnica y pendientes
| Ítem | Impacto | Cuándo se paga |
|---|---|---|
| Dispersión bimodal entre seeds (tecnología temprana o estancamiento) y población estancada después del 1500 | Duración a 1× fuera de 10 ± 1 min; bandas del Apéndice A sin cumplir en 1800–1900 | P4/P5 (calibración por pilar; un barrido automático de parámetros podría ayudar) |
| Estado completo desde un archivo: hasta 999 años de re-simulación (1,5–2,1 s) sin barra de progreso | Esperas largas en el "por qué" de un mundo cargado | P11 (o regenerar keyframes en segundo plano) |
| Firefox: estado completo a 487 ms (presupuesto 500) | Poco margen | Si pesa: keyframes en memoria cada 50 años (el doble de memoria) |
| EVNT pesa 1,7 MB (~33 B por evento, tipo y datos como texto) | Crece con cada fase | P11 (bloque columnar con diccionario de tipos) |
| El heredero puede ser el mismo que el titular durante el año de la sucesión | Dato raro en el porqué de un personaje | P7 |
| Historia de otra versión del motor: sin registro de entidades (nombres como "estado 12") | Solo afecta archivos viejos | Cuando haya migraciones de formato |
| Natalidad y mortalidad fuera del "por qué" (su base usa el excedente de alimento del año) | El porqué de la demografía no se ve | P4 (guardar el excedente o derivarlo) |

## 9. LEARNINGS nuevos
- L-015 `not.toThrow(Clase)` pasa con otro error
- L-016 `Stream.sub` reemplaza el sub-stream, no lo anida
- L-017 Tests pesados con timeout por defecto fallan bajo `pnpm check` y en el runner (promovida a CLAUDE.md)
- L-018 a L-021 (P1.2): el primer cuadro no se ve cuando `render()` vuelve; el panel oculto del navegador integrado frena los Workers; comparar un `WorldStatic` con `toMatchObject` tarda segundos; geometría invisible por el sentido de los triángulos
- L-022 Archivos que difieren solo en mayúsculas rompen el typecheck en macOS
- L-023 Probar un protocolo de `postMessage` en Node sin copiar los mensajes engaña
- L-024 `useTranslation` cambia `t` e `i18n` al cambiar de idioma: un efecto caro que depende de ellos se re-ejecuta

## 10. Documentos actualizados
- [x] `docs/model.md` (v1.1)
- [ ] `docs/DEVELOPMENT_PLAN.md` (no cambió el alcance de las fases; D56 mueve la meta de duración a 1× a P4/P5)
- [x] `docs/decisions.md` (D48–D57)
- [x] `docs/STATUS.md`
- [x] `docs/prompts/P02-diseno.md` (refrescado con el estado de partida y las trampas de P1)
- [x] `CLAUDE.md` (comandos `ws run`, `ws health`, bench, suite de determinismo, E2E y medición de la web; regla L-017)
- [x] ADR-008 (medición con el estado real)
- [ ] `docs/design-system.md` (no existe hasta P2)

## 11. Recomendación para la próxima fase
- **P2 diseña sobre lo que existe:** la estructura aprobada (D57) y los renders reales del mapa; el prompt de P2 ya lista las pantallas, los componentes y las pruebas que deben seguir verdes.
- **P2.4 (paleta política):** reemplazar `colorFromSeed(id)` por el coloreo de grafo con estabilidad temporal; el estado ya tiene `Polity.colorSeed`.
- **Riesgo para P4/P5:** la calibración de la simulación es lo más débil de la rebanada. Conviene preparar desde P4 un barrido de parámetros con `ws health` (sesión aparte), porque la dispersión entre seeds condiciona la duración a 1× y las bandas históricas.
- **Rendimiento:** hay margen grande (1,4 ms/año contra 10). Lo que más va a crecer es el estado (personas, nombres) y el log de eventos: vigilar el keyframe (394 KB) y EVNT en cada fase con `ws bench`.

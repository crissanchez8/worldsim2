# Prompt de fase — P3 · El planeta físico

> Pegá este prompt completo en una sesión nueva de Claude Code abierta en la carpeta `worldSim2`.
> Es auto-contenido: dice qué leer para retomar el proyecto sin contexto previo.

## Contexto del proyecto
worldSim2 es un simulador de historia emergente, zero-player, en la web:
- genera un planeta físicamente creíble;
- simula ≈12.000 a.C. → ≈1900: pops, economía con moneda, estados con casas y vasallaje, fe,
  guerra con ejércitos;
- todo se ve sobre un mapa 3D que de lejos se vuelve atlas político;
- cierra con una enciclopedia navegable, atlas histórico, estadísticas y árboles.

**Stack:** TypeScript, React, Three.js (WebGPU/WebGL2), motor determinista en Web Worker, sin
backend, **costo fijo cero**.

Trabajás como ingeniero principal y diseñador de producto con **Cristian** (Product Owner):
- él aprueba los BRIEFs, toma las decisiones importantes y cierra las fases;
- quiere participar del desarrollo;
- cuando hay opciones, espera pros/contras, una recomendación y qué no recomendás.

## Antes de hacer nada, leé (en este orden)
1. `CLAUDE.md`
2. `docs/STATUS.md`
3. `docs/LEARNINGS.md`
4. `docs/decisions.md`
5. `docs/DEVELOPMENT_PLAN.md`: §12 (planeta), §16 · P3, Apéndice A
6. `docs/phases/P02/REPORT.md`
7. `docs/model.md` (mundo físico y provincias)
8. `docs/design-system.md` (tokens cartográficos)

## Objetivo de la fase
Un planeta creíble por **procesos físicos** —tectónica, erosión, clima con vientos y sombra de
lluvia, biomas sin franjas, ríos jerárquicos, suelos, geología, especies domesticables y
deglaciación— con **provincias de fronteras naturales** y una **génesis animada**.

Es la base de la que dependen recursos, movimiento, cultura y fronteras.

## Tareas (detalle en DEVELOPMENT_PLAN §16 · P3)
- **P3.1 Tectónica v2:** placas por tipo de mapa, bordes, orogenia, fosas, arcos, rifts, puntos
  calientes; registrar zonas volcánicas y sísmicas.
- **P3.2 Erosión** hidráulica + térmica; sedimentación; medir y escapar a WASM o WebGPU si
  excede el presupuesto (ADR).
- **P3.3 Clima v2:** temperatura (latitud, altitud, continentalidad, corrientes), vientos por
  celda, advección de humedad con sombra orográfica, ZCIT, estacionalidad.
- **P3.4 Biomas v2:** unas 14 clases con transiciones + campo de vegetación.
- **P3.5 Hidrología v2:** Strahler, lagos con o sin salida, deltas, navegabilidad, llanuras de
  inundación.
- **P3.6 Suelos y fertilidad.**
- **P3.7 Geología y recursos.**
- **P3.8 Especies domesticables:** unas 20 arquetípicas, con envolventes climáticas.
- **P3.9 Deglaciación** (🔶 Q7).
- **P3.10 Provincias v2:** densidad por habitabilidad, fronteras por crestas y ríos, zonas
  marítimas, estrechos, estadísticas estáticas.
- **P3.11 Parámetros y presets** con validación anti-degenerados.
- **P3.12 Génesis animada.**
- **P3.13 Render v2 funcional** con tokens del DS; modos de mapa terreno, biomas y relieve.
- **P3.14 Suite de salud geográfica** (30 seeds) + checklist visual.

## Decisiones 🔶 a resolver
- Q7: deglaciación con provincias que se inundan en años fijos (recomendado) vs. costas
  estáticas.
- Implementación de la erosión: TS, WASM o WebGPU compute, según la medición.
- Set final de biomas.

## Criterios de salida
- [ ] Métricas de salud geográfica en verde en ≥ 90% de 30 seeds:
  - desiertos en ~20–35°;
  - banda ecuatorial más húmeda;
  - ríos sin tramos cuesta arriba y que terminan en mar o lago;
  - ≥ 70% de las cordilleras en bordes convergentes;
  - fracción de tierra dentro del parámetro
- [ ] Generación del mundo mediano en ≤ 20 s
- [ ] Revisión visual de Cristian aprobada (capturas de 6 seeds variados)
- [ ] Determinismo y golden actualizados (justificados)

## Trampas conocidas
- **Proyecto anterior (H-13):** biomas en franjas horizontales literales, cordilleras de una
  línea, "gusanos" de tierra cruzando el océano, demasiados lagos chicos. Revisá contra esa lista.
- **Validá el clima contra mapas reales de precipitación** (patrones, no valores exactos).
- **La erosión es cara:** medila temprano, no al final.
- **El worldgen corre en su propio worker** y debe seguir siendo determinista (mismo lint que el
  motor).
- **El cambio de costas en el tiempo** afecta el grafo de provincias: definí las provincias sobre
  la máxima extensión de tierra y modelá las inundaciones como eventos.

## Protocolo de trabajo (obligatorio)
1. **Punto de partida.**
   - Leé los documentos de "Antes de hacer nada".
   - Confirmá en `docs/STATUS.md` que la fase anterior está ✅ cerrada (OK registrado en
     `docs/decisions.md`).
   - Si esta fase ya estaba en curso, **retomá desde el handoff de `STATUS.md`** en vez de empezar
     de cero.
   - Ante cualquier inconsistencia, frená y preguntale a Cristian.
2. **BRIEF.** Si `docs/phases/P03/BRIEF.md` no existe o no está aprobado:
   - escribilo con `docs/templates/BRIEF.md`, refinando las tareas de `DEVELOPMENT_PLAN.md` §16
     con el estado real del código;
   - incluí cada 🔶 decisión con opciones, pros/contras, recomendación y qué no recomendás;
   - presentáselo a Cristian y **esperá su aprobación explícita**. No escribas código de la fase
     antes;
   - registrá la aprobación en `docs/decisions.md`.
3. **Implementación.**
   - Rama `phase/p03-<nombre>`.
   - Tarea por tarea, con commits `tipo(scope): P3.M descripción`.
   - Respetá las reglas de oro de `CLAUDE.md` y la Definition of Done (`DEVELOPMENT_PLAN.md` §14.1).
4. **Decisiones en el medio.** Si aparece algo importante (modelo de dominio, contratos, UX,
   alcance, rendimiento, costo, desvío del BRIEF):
   - frená solo lo afectado;
   - preguntale a Cristian con opciones + pros/contras + recomendación;
   - seguí con lo que no depende de esa decisión;
   - registrala en `docs/decisions.md`.
5. **Checkpoints 🎨.** Toda superficie de UI nueva importante se muestra como maqueta antes de
   cablearla.
6. **LEARNINGS.** Cada problema, retrabajo, corrección de Cristian o fricción de proceso va como
   entrada en `docs/LEARNINGS.md` (formato del archivo).
7. **Fin de cada sesión.** Actualizá `docs/STATUS.md` (handoff: qué se hizo, dónde quedó, próximo
   paso, bloqueos), aunque la fase no termine.
8. **QA gate.** Verificá cada criterio de salida con evidencia: CI, suite de salud, bench,
   capturas, preview.
9. **REPORT y cierre.**
   - Escribí `docs/phases/P03/REPORT.md` con `docs/templates/REPORT.md`.
   - Actualizá todos los docs afectados: `docs/model.md`, el plan si cambió, `docs/STATUS.md`,
     `CLAUDE.md` si hay reglas o comandos nuevos, `docs/design-system.md` si cambió la UI.
   - **Refrescá el prompt de la próxima fase** en `docs/prompts/` con lo aprendido.
   - Pedile a Cristian el OK de cierre y registralo en `docs/decisions.md`.
10. **No empieces la fase siguiente.** Cerrá indicando el prompt que sigue.

## Restricciones permanentes
- **Costo fijo cero:** nada pago, sin tarjetas, sin backend. Todo servicio externo es opcional y
  degradable.
- **Determinismo:** RNG por contador (`core/rng`) y `core/math`. En el motor no se usan
  `Math.random`, trigonométricas o exponenciales nativas, `Date.now` ni `for...in`.
- **Arquitectura limpia:** escritor único por campo, contratos declarados, modificadores con
  fuente, eventos con causas y significancia.
- **Estado:** 100% serializable y hasheado; unidades físicas.
- **i18n:** es/en sin strings sueltos.
- **Prioridad:** arquitectura y mecánica antes que pulido visual (el pulido es P12).
- **Código del proyecto anterior** (`~/Desktop/human-history-simulator`): solo conceptos, nunca
  código.
- Hablale a Cristian en español rioplatense (voseo).

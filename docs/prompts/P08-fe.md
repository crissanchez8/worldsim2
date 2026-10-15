# Prompt de fase — P8 · Fe

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
5. `docs/DEVELOPMENT_PLAN.md`: §10.7, §11.2, §16 · P8
6. `docs/phases/P07/REPORT.md`
7. `docs/model.md`: religión, estamentos (clero), hooks económicos y de legitimidad
8. `docs/design-system.md`

## Objetivo de la fase
Religiones que **nacen del entorno y de la historia**:
- cultos populares → politeísmos organizados → nuevas fes de profetas en crisis;
- **doctrinas que cambian el comportamiento** de otros sistemas;
- unen culturas, se difunden por rutas y conquistas, sostienen o socavan la legitimidad y se
  fracturan en cismas con linaje.

## Tareas (detalle en DEVELOPMENT_PLAN §16 · P8)
- **P8.1 Modelo v2:** doctrinas con efecto, panteón, clero, cabeza de la fe, sitios, linaje.
- **P8.2 Origen** desde el entorno y la cultura; politeísmos con ciudades y sacerdocio.
- **P8.3 Profetas y nuevas fes** (era axial emergente).
- **P8.4 Difusión y conversión:** misiones, conquista, sincretismo; flujos en pops.
- **P8.5 Instituciones:** clero como estamento, economías de templo, relación con el Estado.
- **P8.6 Sitios sagrados y peregrinación:** flujos, legitimidad, casus belli (hook P9).
- **P8.7 Cismas, herejías y reformas** con linaje.
- **P8.8 Efectos cruzados:** unidad, legitimidad, usura, prohibiciones, guerra santa, pacifismo.
- **P8.9 UI funcional:** modo religión, ficha de religión, árbol de linajes, panteón.
- **P8.10 Calibración.**

## Decisiones 🔶 a resolver
- Pool de doctrinas y sus efectos.
- Reglas de fundación de nuevas fes.
- Representación del panteón (cuánto detalle narrativo).

## Criterios de salida
- [ ] Cada doctrina tiene al menos un efecto observable en el "por qué" de otro sistema
- [ ] En ≥ 80% de los seeds: ≥ 1 fe trans-estatal y ≥ 1 cisma con linaje
- [ ] Pocas fes grandes y muchas locales; el mapa religioso no calca el político

## Trampas conocidas
- **Doctrinas cosméticas:** la regla es "sin efecto, no entra".
- **Homogeneización:** una fe que convierte todo el mundo indica que falta fricción de
  conversión o resistencia institucional.
- **Proyecto anterior:** el monoteísmo no lograba dominar sin conversión por conquista. Acá ese
  mecanismo está desde el diseño.

## Protocolo de trabajo (obligatorio)
1. **Punto de partida.**
   - Leé los documentos de "Antes de hacer nada".
   - Confirmá en `docs/STATUS.md` que la fase anterior está ✅ cerrada (OK registrado en
     `docs/decisions.md`).
   - Si esta fase ya estaba en curso, **retomá desde el handoff de `STATUS.md`** en vez de empezar
     de cero.
   - Ante cualquier inconsistencia, frená y preguntale a Cristian.
2. **BRIEF.** Si `docs/phases/P08/BRIEF.md` no existe o no está aprobado:
   - escribilo con `docs/templates/BRIEF.md`, refinando las tareas de `DEVELOPMENT_PLAN.md` §16
     con el estado real del código;
   - incluí cada 🔶 decisión con opciones, pros/contras, recomendación y qué no recomendás;
   - presentáselo a Cristian y **esperá su aprobación explícita**. No escribas código de la fase
     antes;
   - registrá la aprobación en `docs/decisions.md`.
3. **Implementación.**
   - Rama `phase/p08-<nombre>`.
   - Tarea por tarea, con commits `tipo(scope): P8.M descripción`.
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
   - Escribí `docs/phases/P08/REPORT.md` con `docs/templates/REPORT.md`.
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

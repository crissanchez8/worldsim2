# Prompt de fase — P9 · Guerra y diplomacia

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
4. `docs/decisions.md` (D15)
5. `docs/DEVELOPMENT_PLAN.md`: §10.8, §11.2, §16 · P9
6. `docs/phases/P08/REPORT.md`
7. `docs/model.md`: guerra, diplomacia, contratos de vasallaje (levas), economía (equipamiento, mano de obra)
8. `docs/design-system.md`

## Objetivo de la fase
Guerras con **causas, objetivos y desenlaces**:
- ejércitos que marchan con **logística** (suministro y desgaste);
- batallas y sitios con nombre;
- flotas;
- tratados con términos;
- diplomacia con memoria;
- una **IA de agenda** que persigue objetivos de varios años **sin favorecer la belicosidad**;
- nómadas de la estepa como patrón emergente.

## Tareas (detalle en DEVELOPMENT_PLAN §16 · P9)
Se divide en **sub-hitos con checkpoint de Cristian**.
- **P9a — Ejércitos y combate:**
  - P9.1 unidades por era (contenido);
  - P9.2 reclutamiento con costo económico;
  - P9.3 movimiento estacional, A*, suministro, desgaste, transporte naval;
  - P9.4 batallas;
  - P9.5 sitios y saqueos;
  - P9.6 flotas, bloqueos, piratería.
- **P9b — Guerras y paz:**
  - P9.7 entidad guerra (objetivos, puntaje, cansancio, aliados);
  - P9.8 paz y tratados.
- **P9c — Diplomacia y agenda:**
  - P9.9 relaciones con memoria, tratados, coaliciones contra el hegemón, reputación;
  - P9.10 IA de agenda;
  - P9.11 nómadas de la estepa.
- **P9.12 UI funcional:** ejércitos y flotas en movimiento, batallas, sitios, frentes; modos
  ocupación y alianzas; fichas de guerra, batalla y general.
- **P9.13 Calibración y rendimiento.**

## Decisiones 🔶 a resolver
- Modelo de batalla (Lanchester con ventajas cruzadas, recomendado).
- Lista de objetivos de guerra.
- Pesos de la utilidad de la agenda (calibrados con la suite).
- Presupuesto de ejércitos simultáneos.

## Criterios de salida
- [ ] 0 hegemones universales en 30 seeds; ≥ 1 potencia longeva no conquistadora en ≥ 70% de los seeds
- [ ] Toda guerra tiene causa, objetivo y desenlace legibles en su ficha
- [ ] Logística visible: ejércitos que pierden fuerza en desierto o invierno
- [ ] Bench dentro del presupuesto con guerras activas

## Trampas conocidas
- **Proyecto anterior (H-06, H-07):** guerra como dados de frontera y alianzas por tirada.
  Principio heredado que sí vale: la guerra tiene costo real y las potencias mercantiles y
  defensivas deben poder prevalecer.
- **Sub-pasos estacionales caros:** solo donde hay guerra activa.
- **Una IA demasiado "inteligente" es lenta y opaca:** utilidad simple + agenda explícita +
  "por qué" visible.

## Protocolo de trabajo (obligatorio)
1. **Punto de partida.**
   - Leé los documentos de "Antes de hacer nada".
   - Confirmá en `docs/STATUS.md` que la fase anterior está ✅ cerrada (OK registrado en
     `docs/decisions.md`).
   - Si esta fase ya estaba en curso, **retomá desde el handoff de `STATUS.md`** en vez de empezar
     de cero.
   - Ante cualquier inconsistencia, frená y preguntale a Cristian.
2. **BRIEF.** Si `docs/phases/P09/BRIEF.md` no existe o no está aprobado:
   - escribilo con `docs/templates/BRIEF.md`, refinando las tareas de `DEVELOPMENT_PLAN.md` §16
     con el estado real del código;
   - incluí cada 🔶 decisión con opciones, pros/contras, recomendación y qué no recomendás;
   - presentáselo a Cristian y **esperá su aprobación explícita**. No escribas código de la fase
     antes;
   - registrá la aprobación en `docs/decisions.md`.
3. **Implementación.**
   - Rama `phase/p09-<nombre>`.
   - Tarea por tarea, con commits `tipo(scope): P9.M descripción`.
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
   - Escribí `docs/phases/P09/REPORT.md` con `docs/templates/REPORT.md`.
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

# Prompt de fase — P12 · Inmersión visual

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
4. `docs/decisions.md` (D5, D7, D23, D25 y la dirección de diseño elegida en P2)
5. `docs/DEVELOPMENT_PLAN.md`: §8.5 (render), §16 · P12
6. `docs/phases/P11/REPORT.md`
7. `docs/design-system.md` (dirección y lenguaje cartográfico)
8. Skills `impeccable` y `frontend-design` para UI y movimiento

## Objetivo de la fase
El "frontend lindo" (D23). El mapa pasa de funcional a **inmersivo**:
- terreno PBR de calidad;
- agua;
- vegetación con deforestación dinámica;
- **ciudades procedurales por era y estilo cultural**;
- paisaje humano (campos, caminos, minas, ferrocarriles);
- vida (caravanas, barcos, ejércitos, humo);
- atmósfera;
- un atlas de alta calidad.

Todo coherente con la dirección de diseño de P2 y dentro del presupuesto de fps.

## Tareas (detalle en DEVELOPMENT_PLAN §16 · P12)
- **P12.1 Dirección de arte 3D 🎨:** style frames + shortlist de assets CC0 + manifiesto de
  licencias.
- **P12.2 Terreno de calidad** (CDLOD/clipmaps, splatting PBR, triplanar).
- **P12.3 Agua** (océano, ríos, lagos, hielo).
- **P12.4 Vegetación** instanciada y dinámica.
- **P12.5 Asentamientos procedurales** por era × estilo.
- **P12.6 Paisaje humano.**
- **P12.7 Vida.**
- **P12.8 Atmósfera.**
- **P12.9 Atlas de alta calidad.**
- **P12.10 Transiciones** de zoom y de era.
- **P12.11 Movimiento de UI** con tokens del DS.
- **P12.12 Rendimiento visual** y presets de calidad.

## Decisiones 🔶 a resolver
- Style frames y assets elegidos.
- Presets de calidad.
- Qué elementos de "vida" entran según el costo en fps.

## Criterios de salida
- [ ] ≥ 60 fps promedio en calidad alta y ≥ 45 fps en p5 (M-series); calidad baja usable en GPUs integradas viejas
- [ ] Revisión visual de Cristian contra los style frames aprobada
- [ ] Manifiesto de licencias completo (100% CC0/OFL/MIT/ISC)
- [ ] Las ciudades se distinguen por era y cultura a simple vista (test ciego con 6 capturas)

## Trampas conocidas
- **Inconsistencia entre packs CC0:** dirección de arte + recoloreo + preferencia por procedural.
- **Caída de fps:** medí cada capa al agregarla, no al final.
- **Nada de assets con licencia dudosa o de pago** (D7, D24). Registrá la fuente de cada asset en
  el manifiesto.
- **Verificá en el navegador integrado con capturas;** pedile a Cristian la revisión en su
  máquina.

## Protocolo de trabajo (obligatorio)
1. **Punto de partida.**
   - Leé los documentos de "Antes de hacer nada".
   - Confirmá en `docs/STATUS.md` que la fase anterior está ✅ cerrada (OK registrado en
     `docs/decisions.md`).
   - Si esta fase ya estaba en curso, **retomá desde el handoff de `STATUS.md`** en vez de empezar
     de cero.
   - Ante cualquier inconsistencia, frená y preguntale a Cristian.
2. **BRIEF.** Si `docs/phases/P12/BRIEF.md` no existe o no está aprobado:
   - escribilo con `docs/templates/BRIEF.md`, refinando las tareas de `DEVELOPMENT_PLAN.md` §16
     con el estado real del código;
   - incluí cada 🔶 decisión con opciones, pros/contras, recomendación y qué no recomendás;
   - presentáselo a Cristian y **esperá su aprobación explícita**. No escribas código de la fase
     antes;
   - registrá la aprobación en `docs/decisions.md`.
3. **Implementación.**
   - Rama `phase/p12-<nombre>`.
   - Tarea por tarea, con commits `tipo(scope): P12.M descripción`.
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
   - Escribí `docs/phases/P12/REPORT.md` con `docs/templates/REPORT.md`.
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

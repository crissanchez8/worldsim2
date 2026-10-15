# Prompt de fase — P13 · Publicación

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
4. `docs/decisions.md` (D1, D18, D24)
5. `docs/DEVELOPMENT_PLAN.md`: §5 (Q9–Q14), §7 (costo cero), §16 · P13
6. `docs/phases/P12/REPORT.md`
7. `docs/design-system.md`
8. Skill `impeccable` para landing y onboarding

## Objetivo de la fase
Salir al mundo:
- links y galería de mundos destacados;
- versionado del motor;
- landing y página "Cómo funciona" para el portfolio;
- onboarding;
- i18n completo, accesibilidad, rendimiento final, compatibilidad de navegadores;
- licencias;
- lanzamiento con **costo fijo cero verificado**.

## Tareas (detalle en DEVELOPMENT_PLAN §16 · P13)
- **P13.1 Compartir v2:** URL, importar `.wsim` arrastrando, galería estática (Q12), imágenes OG.
- **P13.2 Versionado del motor** (🔶 estrategia para links viejos).
- **P13.3 Landing 🎨.**
- **P13.4 "Cómo funciona" 🎨** (Q14).
- **P13.5 Onboarding.**
- **P13.6 i18n completo.**
- **P13.7 Accesibilidad.**
- **P13.8 Rendimiento final.**
- **P13.9 Compatibilidad.**
- **P13.10 Observabilidad opcional** (Q9, Q10).
- **P13.11 Legal y licencias.**
- **P13.12 Lanzamiento.**

## Decisiones 🔶 a resolver
- Q9 analytics
- Q10 errores
- Q11 dominio (recomendado: no, por costo)
- Q12 mundos destacados
- Q14 "Cómo funciona"
- Estrategia de versiones viejas

## Criterios de salida
- [ ] Lighthouse ≥ 90 performance y ≥ 95 accesibilidad en landing y resumen
- [ ] Matriz de navegadores verde (Chrome, Edge, Safari, Firefox; incluido el fallback WebGL2)
- [ ] Un visitante sin contexto entiende y disfruta un mundo destacado en < 1 min (prueba con 2 personas)
- [ ] Costo fijo: USD 0 verificado (ningún servicio con tarjeta o plan pago)

## Trampas conocidas
- **Límites de hosting:** 25 MiB por archivo para los mundos destacados; re-verificá los límites
  gratuitos actuales.
- **Publicar algo es hacia afuera:** confirmá con Cristian antes de cada acción pública (anuncios,
  posts, cambios de visibilidad del repo).
- **Links de versiones viejas:** no los rompas en silencio; mostrá un aviso claro y ofrecé
  re-simular.

## Protocolo de trabajo (obligatorio)
1. **Punto de partida.**
   - Leé los documentos de "Antes de hacer nada".
   - Confirmá en `docs/STATUS.md` que la fase anterior está ✅ cerrada (OK registrado en
     `docs/decisions.md`).
   - Si esta fase ya estaba en curso, **retomá desde el handoff de `STATUS.md`** en vez de empezar
     de cero.
   - Ante cualquier inconsistencia, frená y preguntale a Cristian.
2. **BRIEF.** Si `docs/phases/P13/BRIEF.md` no existe o no está aprobado:
   - escribilo con `docs/templates/BRIEF.md`, refinando las tareas de `DEVELOPMENT_PLAN.md` §16
     con el estado real del código;
   - incluí cada 🔶 decisión con opciones, pros/contras, recomendación y qué no recomendás;
   - presentáselo a Cristian y **esperá su aprobación explícita**. No escribas código de la fase
     antes;
   - registrá la aprobación en `docs/decisions.md`.
3. **Implementación.**
   - Rama `phase/p13-<nombre>`.
   - Tarea por tarea, con commits `tipo(scope): P13.M descripción`.
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
   - Escribí `docs/phases/P13/REPORT.md` con `docs/templates/REPORT.md`.
   - Actualizá todos los docs afectados: `docs/model.md`, el plan si cambió, `docs/STATUS.md`,
     `CLAUDE.md` si hay reglas o comandos nuevos, `docs/design-system.md` si cambió la UI.
   - **Actualizá el roadmap** (`DEVELOPMENT_PLAN.md` §18) con lo aprendido.
   - Pedile a Cristian el OK de cierre y registralo en `docs/decisions.md`.
10. **No empieces la fase siguiente.** Es la última fase de v1: cerrá proponiendo el plan de post-lanzamiento.

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

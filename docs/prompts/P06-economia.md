# Prompt de fase — P6 · Economía

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
4. `docs/decisions.md` (D14)
5. `docs/DEVELOPMENT_PLAN.md`: §10.4, §11.2, §16 · P6
6. `docs/phases/P05/REPORT.md`
7. `docs/model.md`: economía, flujos entre sistemas, contratos
8. `docs/design-system.md`

## Objetivo de la fase
Una economía real:
- **bienes** que se producen y consumen;
- **mercados** regionales con precios que responden a la escasez;
- **rutas** que transportan bienes y dejan ganancias a mercaderes y peajes;
- **moneda** cuya oferta genera **inflación** (minas, saqueo, envilecimiento).

Hay ganadores y perdedores del comercio.

## Tareas (detalle en DEVELOPMENT_PLAN §16 · P6)
- **P6.1 Bienes:** unos 25, con valor, perecibilidad, volumen y sustitutos.
- **P6.2 Métodos de producción** con cadenas clave (agricultura, metalurgia, textiles,
  construcción, astilleros).
- **P6.3 Producción:** buffers por provincia.
- **P6.4 Demanda** por estrato en niveles + demanda estatal (hook).
- **P6.5 Mercados:** áreas por conectividad, precios con inercia y cotas, graneros, hambrunas por
  precio.
- **P6.6 Rutas:** arbitraje menos transporte, peajes y riesgo; rutas famosas con nombre.
- **P6.7 Moneda:**
  - economía de bienes antes de acuñar;
  - cecas, ley del metal;
  - oferta monetaria → nivel de precios;
  - drenaje de metal;
  - efecto Potosí.
- **P6.8 Crisis económicas** con causas.
- **P6.9 Ciudades y comercio:** hubs en cruces geográficos.
- **P6.10 UI funcional:** modos de precio, flujos, áreas de mercado y riqueza; rutas visibles;
  fichas de bien, mercado y ruta; gráficos.
- **P6.11 Calibración y rendimiento** del solver.

## Decisiones 🔶 a resolver
- Lista final de bienes y cadenas.
- Algoritmo de formación de precios (tâtonnement con inercia, recomendado).
- Criterio de áreas de mercado.

## Criterios de salida
- [ ] Sequía regional → suba medible del precio del grano + flujos de importación
- [ ] Nueva mina de plata → inflación medible en los mercados conectados
- [ ] Guerra o bloqueo que corta una ruta → caída del ingreso del hub afectado
- [ ] Sin hiperinflaciones sin causa; precios acotados (tests de propiedades)
- [ ] Bench dentro del presupuesto

## Trampas conocidas
- **Inestabilidad numérica de precios:** inercia, cotas y tests de propiedades desde el principio.
- **Tentación Victoria 3:** máximo unos 25 bienes y cadenas cortas.
- **La *decisión* de envilecer la moneda y el fisco del Estado son de P7.** Acá van solo el
  mecanismo y los hooks.
- **Proyecto anterior (H-04):** "comercio = cantidad de vecinos". Acá el comercio son bienes que
  se mueven por precio.

## Protocolo de trabajo (obligatorio)
1. **Punto de partida.**
   - Leé los documentos de "Antes de hacer nada".
   - Confirmá en `docs/STATUS.md` que la fase anterior está ✅ cerrada (OK registrado en
     `docs/decisions.md`).
   - Si esta fase ya estaba en curso, **retomá desde el handoff de `STATUS.md`** en vez de empezar
     de cero.
   - Ante cualquier inconsistencia, frená y preguntale a Cristian.
2. **BRIEF.** Si `docs/phases/P06/BRIEF.md` no existe o no está aprobado:
   - escribilo con `docs/templates/BRIEF.md`, refinando las tareas de `DEVELOPMENT_PLAN.md` §16
     con el estado real del código;
   - incluí cada 🔶 decisión con opciones, pros/contras, recomendación y qué no recomendás;
   - presentáselo a Cristian y **esperá su aprobación explícita**. No escribas código de la fase
     antes;
   - registrá la aprobación en `docs/decisions.md`.
3. **Implementación.**
   - Rama `phase/p06-<nombre>`.
   - Tarea por tarea, con commits `tipo(scope): P6.M descripción`.
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
   - Escribí `docs/phases/P06/REPORT.md` con `docs/templates/REPORT.md`.
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

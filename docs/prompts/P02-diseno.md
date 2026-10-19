# Prompt de fase — P2 · Dirección de diseño y Design System

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
4. `docs/decisions.md` (D5, D7, D23, D25; de P1: D48–D50 tiempo e historia, D57 wireframes)
5. `docs/DEVELOPMENT_PLAN.md`: §13 (UX y rutas), §15.5 (diseño y anti-slop), §16 · P2
6. `docs/phases/P01/REPORT.md`, con capturas de la rebanada (`docs/phases/P01/img/`), y los
   wireframes aprobados (`docs/phases/P01/wireframes/`)
7. Cargá las skills `impeccable`, `frontend-design`, `design-system-generator` y `dataviz` cuando
   llegue su momento

## Objetivo de la fase
Decidir cómo se **siente** el producto (interfaz + lenguaje cartográfico del atlas) y compilarlo
en un **Design System** (`packages/ui` + `docs/design-system.md`), para que toda pantalla futura
se arme y no se invente. La rebanada se re-viste con el DS.

**Cristian elige la dirección; vos proponés.**

## Estado de partida (lo que dejó P1)
- **La UI neutra que se re-viste** (`apps/web/src`), con la estructura de los wireframes aprobados
  (D57). P2 cambia el **aspecto**; cambiar la estructura es una decisión que se pregunta:
  - rutas (TanStack Router): `/` crear, `/mundo?…` vivo, `/mundo/resumen`, `/mundo/resumen/$kind/$id`;
  - pantallas en `screens/` (CreateScreen, WorldLayout, LiveHud, SummaryScreen, EntityScreen);
  - inspector = ficha (`entity/EntityCard`, con `WhyPanel`: el "por qué" de cada stat, base +
    innovaciones + modificadores); barra de tiempo, línea de tiempo y teletipo en `live/`;
    gráficos uPlot y lista virtualizada en `summary/`; compartir en `ui/SharePanel`;
  - estilos: un solo `base.css` neutro con variables (`--bg`, `--fg`, `--panel`, `--line`…).
- **Mapa:** WebGPU/TSL con respaldo WebGL2 (`apps/web/src/map`). El relleno político hoy es
  provisorio (`colorFromSeed(id de polity)` en `map/colors.ts`); P2.4 lo reemplaza por el
  coloreo de grafo (el estado ya tiene `Polity.colorSeed`). Paleta de prueba en `map/config.ts`.
- **Renders reales para las maquetas:** `pnpm --filter @ws/web build` + `vite preview`, y
  `node apps/web/scripts/measure-map.mjs chrome "<url>" --shot x.png` (pose con `?x=&z=&distance=`)
  o `measure-live.mjs`. Usá el Chrome instalado (con GPU): el Chromium de Playwright no tiene GPU
  y dibuja por software.
- **`packages/ui`** está vacío: es donde va el DS. No importa el motor (lo hace cumplir
  dependency-cruiser); recibe datos derivados.
- **Pruebas que tienen que seguir verdes al re-vestir (P2.11):** el E2E de la web
  (`apps/web/e2e`, Chromium y Firefox) encuentra los controles por **rol y nombre accesible** en
  español ("Guardar", "Cargar", "Compartir", "Calcular el porqué", el radio "1×", el slider de la
  línea de tiempo…). Si un nombre cambia, se cambia el test en el mismo commit.

## Tareas (detalle en DEVELOPMENT_PLAN §16 · P2)
- **P2.1 Investigación:** moodboard (cartografía histórica, Paradox, DF Legends, Civ, datos
  editoriales, instrumentos), lista de anti-referencias "AI slop", inventario de superficies.
- **P2.2 Tres direcciones de diseño 🎨** realmente distintas. Cada una con:
  - concepto;
  - paleta UI + paleta política + rampas de modos de mapa;
  - tipografías OFL;
  - íconos y símbolos;
  - lenguaje del atlas;
  - movimiento;
  - maquetas sobre **renders reales** del mapa: vista en vivo, ficha de enciclopedia, recorte de
    atlas, inspector con "por qué".
- **P2.3 Elección 🔶 de Cristian** + nombre definitivo del proyecto (Q5) si encaja.
- **P2.4 Tokens:**
  - colores;
  - **generador de paleta política** con coloreo de grafo y estabilidad temporal;
  - rampas aptas para daltonismo;
  - tipografía y jerarquía de rótulos;
  - espaciado, elevación, grosores de frontera;
  - movimiento;
  - validación AA programática.
- **P2.5–P2.7 Componentes:** primitivos, de datos (incluido `ModifierBreakdown`) y de dominio
  (TimeControls, Timeline, EntityLink, Emblem heráldico procedural…); gráficos sobre uPlot;
  íconos y símbolos de mapa.
- **P2.8 Layout shell** de la vista en vivo y del resumen; atajos de teclado.
- **P2.9 Galería** (Ladle o Storybook) desplegada en el preview.
- **P2.10 `docs/design-system.md`:** tokens, reglas, guía cartográfica, voz es/en, a11y,
  checklist anti-slop.
- **P2.11 Re-vestir la rebanada** con el DS, sin regresiones.

## Decisiones 🔶 a resolver
- La dirección de diseño (o la mezcla).
- El nombre del proyecto (Q5).
- Herramienta de galería (Ladle vs Storybook).

## Criterios de salida
- [ ] Dirección elegida y registrada en `decisions.md`
- [ ] Contraste AA del 100% de los pares de texto documentados
- [ ] Paleta política: polities vecinas siempre distinguibles (test sobre 30 mundos)
- [ ] Galería completa, accesible por teclado, sin errores de axe
- [ ] Auditoría `impeccable` aprobada y checklist anti-slop cumplida
- [ ] Rebanada re-vestida sin regresiones (E2E verde)

## Trampas conocidas
- **AI slop:** nada de gradientes violetas genéricos, glassmorphism por defecto, emojis como
  íconos, tarjetas SaaS, tipografía "de siempre" sin razón, sombras difusas por todos lados. Cada
  elección se justifica desde el concepto.
- **Tres direcciones que son variaciones de color de una misma idea no son tres direcciones.**
  Tienen que diferir en concepto, tipografía y lenguaje cartográfico.
- **Solo fuentes con licencia libre** (OFL), auto-hospedadas: costo cero.
- **No diseñes en el vacío:** las maquetas usan capturas reales del mapa de la rebanada.
- **No construyas componentes especulativos:** solo los que necesitan P3–P11 según el plan.
- **Es una fase de diseño, pero la arquitectura del paquete `ui` también cuenta:** no importa el
  motor; recibe datos derivados.
- **El lint de texto de UI** rechaza cualquier texto suelto en JSX, puntuación incluida (": ",
  " · "): las etiquetas van por i18n y los separadores por CSS (patrón `Facts`/`Inline` de
  `entity/Facts.tsx`).
- **Efectos caros y el idioma (L-024):** `useTranslation` devuelve otro `t` y otro `i18n` al
  cambiar de idioma; un efecto con montaje caro (mapa, Workers) no depende de ellos (usá
  `ui/i18n.ts`). El E2E verifica que cambiar de idioma no regenera el mundo.
- **Rendimiento ya medido** (P1.9, `docs/phases/P01/REPORT.md`): no lo empeores sin medir
  (`pnpm ws bench`, `measure-live.mjs`). Las fuentes y los íconos suman peso a la carga de "Crear"
  (hoy 298 kB).

## Protocolo de trabajo (obligatorio)
1. **Punto de partida.**
   - Leé los documentos de "Antes de hacer nada".
   - Confirmá en `docs/STATUS.md` que la fase anterior está ✅ cerrada (OK registrado en
     `docs/decisions.md`).
   - Si esta fase ya estaba en curso, **retomá desde el handoff de `STATUS.md`** en vez de empezar
     de cero.
   - Ante cualquier inconsistencia, frená y preguntale a Cristian.
2. **BRIEF.** Si `docs/phases/P02/BRIEF.md` no existe o no está aprobado:
   - escribilo con `docs/templates/BRIEF.md`, refinando las tareas de `DEVELOPMENT_PLAN.md` §16
     con el estado real del código;
   - incluí cada 🔶 decisión con opciones, pros/contras, recomendación y qué no recomendás;
   - presentáselo a Cristian y **esperá su aprobación explícita**. No escribas código de la fase
     antes;
   - registrá la aprobación en `docs/decisions.md`.
3. **Implementación.**
   - Rama `phase/p02-<nombre>`.
   - Tarea por tarea, con commits `tipo(scope): P2.M descripción`.
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
   - Escribí `docs/phases/P02/REPORT.md` con `docs/templates/REPORT.md`.
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

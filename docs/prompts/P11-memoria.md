# Prompt de fase — P11 · Memoria y relato

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
4. `docs/decisions.md` (D16, D17)
5. `docs/DEVELOPMENT_PLAN.md`: §8.4 (historia), §10.9, §13, §16 · P11
6. `docs/phases/P10/REPORT.md`
7. `docs/model.md`: eventos, episodios, significancia
8. `docs/design-system.md`
9. Skill `dataviz` para los gráficos; skill `claude-api` antes de tocar el cliente del LLM

## Objetivo de la fase
Que la historia del mundo se pueda **recorrer y contar**:
- significancia v2 y episodios jerárquicos;
- **enciclopedia** completa con búsqueda y modo "a la fecha";
- **atlas histórico**;
- **árboles**: dinastías, religiones, idiomas, culturas, tecnología;
- **estadísticas**;
- **crónica procedural** es/en;
- **LLM BYOK** opcional;
- modo director;
- pantalla de resumen final.

## Tareas (detalle en DEVELOPMENT_PLAN §16 · P11)
- **P11.1 Significancia v2 y episodios;** eras regionales con nombre.
- **P11.2 Enciclopedia 🎨:** plantillas por tipo, búsqueda, ranking por era, "a la fecha",
  enlaces validados.
- **P11.3 Atlas histórico 🎨:** cualquier año, animación de fronteras, comparación, exportar
  imagen.
- **P11.4 Árboles 🎨.**
- **P11.5 Estadísticas 🎨.**
- **P11.6 Crónica procedural** sin relleno (cada frase cita hechos).
- **P11.7 LLM BYOK** (🔶 Q8):
  - clave solo en el navegador, apagado por defecto;
  - top-N de hechos por era;
  - streaming, caché;
  - estimación de costo;
  - fallback procedural.
- **P11.8 Modo director.**
- **P11.9 Pantalla de resumen final 🎨.**
- **P11.10 QA:** rendimiento con ~100k eventos, accesibilidad de lectura, cero enlaces rotos.

## Decisiones 🔶 a resolver
- Q8: modelo del LLM (BYOK recomendado) y modelo de Claude por defecto (consultá la skill
  `claude-api` para ids y precios vigentes).
- Criterios de significancia y top-N por categoría y era.

## Criterios de salida
- [ ] Toda entidad del mundo tiene ficha, aparece en la búsqueda y enlaza sus relaciones
- [ ] El atlas muestra cualquier año en ≤ 500 ms
- [ ] La crónica procedural cubre todas las eras con hechos concretos (revisión de Cristian sobre 3 mundos)
- [ ] LLM BYOK funciona con la clave de Cristian y degrada bien sin ella

## Trampas conocidas
- **Costo cero:** el proyecto nunca paga el LLM. La clave es del usuario, vive en su navegador y
  solo viaja a la API de Anthropic.
- **"Palabra vacía":** el prompt alimenta hechos concretos rankeados y pide conectarlos sin
  relleno (lección del proyecto anterior).
- **Volumen de datos en el cliente:** índices perezosos y listas virtualizadas.

## Protocolo de trabajo (obligatorio)
1. **Punto de partida.**
   - Leé los documentos de "Antes de hacer nada".
   - Confirmá en `docs/STATUS.md` que la fase anterior está ✅ cerrada (OK registrado en
     `docs/decisions.md`).
   - Si esta fase ya estaba en curso, **retomá desde el handoff de `STATUS.md`** en vez de empezar
     de cero.
   - Ante cualquier inconsistencia, frená y preguntale a Cristian.
2. **BRIEF.** Si `docs/phases/P11/BRIEF.md` no existe o no está aprobado:
   - escribilo con `docs/templates/BRIEF.md`, refinando las tareas de `DEVELOPMENT_PLAN.md` §16
     con el estado real del código;
   - incluí cada 🔶 decisión con opciones, pros/contras, recomendación y qué no recomendás;
   - presentáselo a Cristian y **esperá su aprobación explícita**. No escribas código de la fase
     antes;
   - registrá la aprobación en `docs/decisions.md`.
3. **Implementación.**
   - Rama `phase/p11-<nombre>`.
   - Tarea por tarea, con commits `tipo(scope): P11.M descripción`.
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
   - Escribí `docs/phases/P11/REPORT.md` con `docs/templates/REPORT.md`.
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

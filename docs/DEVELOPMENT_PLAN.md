# worldSim2 — Development Plan

| | |
|---|---|
| **Versión** | 1.1 — aprobada (ajustes de P0: D44, D45) |
| **Fecha** | 2026-10-14 |
| **Autores** | Cristian Sánchez (Product Owner) + Claude (Ingeniero principal / Diseñador de producto) |
| **Estado** | 🟢 Aprobado 2026-10-14 — P0 por abrir |
| **Repo** | Se crea en P0 (`worldsim2`, nombre definitivo 🔶 Q5) |
| **Reemplaza a** | `docs/PLAN.md` (v0.1, visión inicial) |

---

## 0. Cómo leer este plan

- ✅ **DECIDIDO**: decisión tomada juntos (§4). No se reabre salvo que aparezcan hechos nuevos.
- 🔶 **DECISIÓN**: necesita tu definición. Cada una trae opciones, pros/contras y mi recomendación,
  y está marcada con la fase que la necesita.
- 📋 **BRIEF**: alcance de la fase. Lo escribo antes de empezar y **no avanzo sin tu aprobación**.
- 📝 **REPORT**: cierre de la fase: qué se hizo, métricas, desvíos, aprendizajes y docs actualizados.
- 🎨 **MOCK**: checkpoint visual. Toda superficie de UI importante se aprueba como maqueta
  estática antes de cablearla.
- 🧪 **QA GATE**: criterios de salida verificados. Nada cierra sin tu OK registrado.
- Las fases van de **P0 a P13** y las tareas se numeran `P4.3`, para referenciarlas en commits,
  PRs y conversaciones. Las subtareas son casillas `- [ ]` que el REPORT marca.
- **El tiempo no es la restricción; el alcance y la calidad sí.** Los tamaños (S/M/L/XL) son
  esfuerzo relativo, no fechas.
- Fuentes de verdad: este plan + `docs/decisions.md` (log append-only) + `docs/STATUS.md`
  (dónde estamos) + `docs/model.md` (modelo de dominio, desde P0).

---

## 1. Resumen ejecutivo

**worldSim2** es un simulador de historia emergente, *zero-player*, que corre en el navegador.
El usuario configura un planeta (tipo de mapa, nivel del mar, edad, clima, tamaño, seed). El
motor lo genera con procesos físicos (tectónica, erosión, clima, hidrología) y simula unos
**14.000 años** (≈12.000 a.C. → ≈1900): bandas nómadas que domestican especies, fundan aldeas y
ciudades, forman jefaturas, reinos e imperios, crean idiomas, religiones, mercados y dinastías,
y pelean guerras con ejércitos visibles. Todo emerge de reglas trazables, nada está guionado.

Se observa en vivo sobre un mapa **3D que de lejos se funde en un atlas político**, en
**5–15 minutos**, con pausa, velocidades y rebobinado. Al final hay una **enciclopedia
navegable** (estilo Legends de Dwarf Fortress), un **atlas histórico**, **estadísticas** y
**árboles** (dinastías, religiones, idiomas, tecnología).

**Síntesis de referencias** (✅ D4): el esqueleto de Paradox (provincias, pops, capas,
dinastías, mercados), la memoria de Dwarf Fortress (grafo de figuras y eventos, enciclopedia),
la vida de WorldBox (mapa que se mueve, todo inspeccionable) y la estética de Civilization y
Humankind (terreno legible, ciudades que cambian por era).

**Arquitectura:**
- web estática y gratuita, en TypeScript;
- motor determinista en un Web Worker;
- React para la interfaz;
- Three.js (WebGPU con fallback WebGL2) para el mapa;
- sin backend ni base de datos;
- **costo fijo cero** (✅ D24).

**Estrategia:** primero una **rebanada vertical** sobre la arquitectura definitiva (P1); después
la **dirección de diseño y el Design System** (P2); después se profundiza cada pilar del motor
(P3–P10); por último memoria, inmersión visual y publicación (P11–P13). La arquitectura y la
mecánica van **antes** que el frontend lindo (✅ D23).

---

## 2. Visión, objetivos y métricas de éxito

### Visión
Que cada mundo se sienta **creíble** (la geografía tiene sentido físico, la historia tiene la
forma de la real), **explicable** (cada imperio que cae tiene causas que se pueden ver),
**vivo** (el mapa se mueve y cuenta) y **memorable** (al final hay una historia que dan ganas
de recorrer y compartir).

### Objetivos
1. **Geografía física creíble** que determine recursos, cultura, movimiento y fronteras.
2. **Historia emergente con causalidad trazable**: ningún número es una caja negra.
3. **Profundidad sistémica** (economía, política, fe, guerra) que interactúa, no que se suma.
4. **Experiencia inmersiva y legible** a la vez.
5. **Memoria rica** del mundo: enciclopedia, atlas, árboles, crónica.
6. **Web pública, rápida y gratuita**, apta como pieza de portfolio.
7. **Base técnica sólida**: determinismo, tests de salud, rendimiento medido.

### Métricas de éxito (objetivos v1; revisadas en P0 con los spikes: D45)

| Métrica | Objetivo |
|---|---|
| Generación de mundo mediano (Chrome, M-series) | ≤ 20 s |
| Corrida headless completa, mundo mediano | ≤ 3 min |
| Costo por año simulado | promedio ≤ 10 ms, p95 ≤ 25 ms |
| Render en vivo | 60 fps promedio, p5 ≥ 45 fps (M-series, calidad alta) |
| Memoria del navegador | ≤ 1,5 GB en el pico |
| Archivo de historia (`.wsim`) | ≤ 20 MB comprimido (con la política de keyframes del ADR-008, D44) |
| Rebobinar el mapa a cualquier año | ≤ 16 ms (un cuadro) |
| Estado completo de una fecha (en vivo) | ≤ 500 ms |
| Determinismo | 100% hash idéntico en Chromium, WebKit, Firefox y Node, **verificado por año en CI** |
| Salud histórica | ≥ 80% de los seeds dentro de las bandas de cada curva de referencia (Apéndice A) |
| Diversidad de poder | 0 hegemones universales en 30 seeds; ≥ 3 regímenes distintos coexistiendo en 1500 d.C. en ≥ 80% de los seeds |
| Explicabilidad | 100% de colapsos, cambios de régimen y guerras con causas enlazadas |
| Lighthouse (landing y resumen) | ≥ 90 performance, ≥ 95 accesibilidad |
| Costo fijo mensual | **USD 0** |

---

## 3. Usuarios

| Usuario | Quién | Qué necesita | Superficie |
|---|---|---|---|
| **Visitante curioso** | Llega por un link o el portfolio | Ver algo impresionante en menos de 1 min, sin configurar nada | Landing con mundo destacado, galería |
| **Creador de mundos** | Quiere "su" mundo | Configurar, generar, mirar, compartir | Crear mundo, vista en vivo |
| **Historiador** | Le interesa el detalle | Recorrer enciclopedia, árboles, estadísticas, capas del mapa | Resumen, enciclopedia, atlas |
| **Reclutador / par técnico** | Evalúa el portfolio | Entender qué hay detrás y su calidad | "Cómo funciona", código público |
| **Vos (autor)** | Construís y calibrás | Herramientas de depuración, reportes de salud, bench | CLI, panel de inspección de desarrollo |

---

## 4. Decisiones tomadas

| # | Decisión | Elección | Por qué |
|---|---|---|---|
| D1 | Destino | ✅ Web pública / portfolio | Que otros lo vean con un link |
| D2 | Plataforma | ✅ TypeScript + Three.js (WebGPU, fallback WebGL2); motor en Web Worker; Rust→WASM solo si el perfilado lo exige | Web pública, UI de datos rica, trabajo por texto con Claude Code, tu stack |
| D3 | Hardware | ✅ Desktop/laptop moderna | Permite terreno 3D y simulación pesada |
| D4 | Referencias | ✅ Paradox (esqueleto) + DF (memoria) + WorldBox (vida) + Civ/Humankind (estética) | Ver §1 |
| D5 | Estilo de mapa | ✅ Híbrido: 3D de cerca, atlas político de lejos | Inmersión y legibilidad |
| D6 | Geometría | ✅ Plano con wrap este-oeste (cilindro) | Circunnavegable, simple de simular y renderizar |
| D7 | Assets | ✅ Librerías CC0 + procedural | Calidad sin costo ni riesgo de licencias |
| D8 | Rol | ✅ Observador puro | Foco en la simulación, no en el gameplay |
| D9 | Ejecución | ✅ En vivo + rebobinar | Ver mientras pasa y volver atrás |
| D10 | Duración | ✅ 5–15 min a velocidad normal | Ritmo de "película" |
| D11 | Inicio | ✅ ≈12.000 a.C., mundo ya poblado | Foco en neolítico → industria |
| D12 | Calibración | ✅ Forma de la historia real, con variación | Creíble pero no calcado |
| D13 | Personajes | ✅ "Casas, no cortes" (§10.6) | Vasallajes, intriga y casas menores sin el costo de CK |
| D14 | Economía | ✅ Bienes + mercados + moneda (inflación, deuda) | Pedido explícito; nivel intermedio |
| D15 | Guerra | ✅ Ejércitos visibles, batallas y sitios con nombre, tratados | Narrable y visible |
| D16 | Narrativa | ✅ Idiomas procedurales + LLM opcional solo para la crónica | Coherencia y costo cero |
| D17 | Resumen | ✅ Enciclopedia + estadísticas + atlas + árboles | Memoria completa |
| D18 | Compartir | ✅ Seed + parámetros en el link + historia como archivo | Sin backend |
| D19 | Proceso | ✅ Rebanada vertical primero, sobre la arquitectura definitiva | Validar el todo antes de profundizar |
| D20 | Idioma | ✅ Bilingüe es/en desde el día 1 | Barato al inicio, caro después |
| D21 | Escala | ✅ ≈1.500 provincias por defecto, configurable | Rendimiento y riqueza |
| D22 | Contrato de trabajo | ✅ BRIEF, REPORT, decisiones compartidas, prompts de fase, LEARNINGS (§15) | Tu participación y la continuidad entre sesiones |
| D23 | Prioridad | ✅ Arquitectura y mecánica antes que frontend lindo | Bases sólidas primero |
| D24 | Costo | ✅ Costo fijo cero (§7) | Restricción del proyecto |
| D25 | Diseño | ✅ Elegís entre 3 direcciones mock (P2), después se genera el Design System; sin "AI slop" | Identidad propia y coherencia |

**Supuestos** (no preguntados; se confirman o corrigen en el BRIEF de la fase indicada):

| # | Supuesto | Fase |
|---|---|---|
| S1 | La corrida termina ≈1900 (carbón, vapor, ferrocarril, telégrafo), con fecha configurable | P10 |
| S2 | Mundo realista: solo humanos, sin magia, nombres ficticios (no es la Tierra) | P0 |
| S3 | Temas sensibles (esclavitud, servidumbre, masacres) se tratan de forma sistémica y sobria | P4/P7 |
| S4 | Navegadores: Chrome, Edge, Safari y Firefox recientes de escritorio | P0 |
| S5 | Código público en GitHub (portfolio y CI gratis ilimitado) | P0 (Q2) |

---

## 5. Preguntas abiertas

### Bloquean P0
| # | Pregunta | Opciones | Mi recomendación |
|---|---|---|---|
| Q1 | Hosting estático | **Cloudflare Pages** (ancho de banda ilimitado, previews por rama, sin tarjeta) · GitHub Pages (simple, 1 GB, 100 GB/mes) · Vercel Hobby (solo uso no comercial) | Cloudflare Pages; GitHub Pages como plan B. Los límites se verifican en P0 (ADR-007) |
| Q2 | Visibilidad del repo | **Público** (portfolio, Actions ilimitado) · Privado (2.000 min/mes de CI) | Público |
| Q3 | Cuenta de GitHub | Personal `crissanchez8` · organización nueva | Personal |
| Q4 | Licencia del código | **MIT** · AGPL-3.0 (obliga a compartir derivados) · todos los derechos reservados | MIT, o AGPL si te preocupa que lo copien |

### Bloquean P1–P2
| # | Pregunta | Mi recomendación |
|---|---|---|
| Q5 | Nombre del proyecto (repo, subdominio, marca) | Nombre de trabajo `worldSim2` hasta P2; el definitivo sale junto con la dirección de diseño |
| Q6 | ¿Cuándo va el Design System? | **P2, después de la rebanada.** Las decisiones de diseño y el DS base van temprano (coherencia de toda la UI que se agrega en P3–P11); el pulido visual y la inmersión 3D van en P12 (D23) |

### Bloquean fases posteriores
| # | Pregunta | Fase | Mi recomendación |
|---|---|---|---|
| Q7 | Deglaciación con costas que cambian (provincias que se inundan) | P3 | Sí, como inundación de provincias bajas en años fijos (sin geometría dinámica) |
| Q8 | Modelo del LLM | P11 | **BYOK**: el usuario pega su propia clave, que vive en su navegador; apagado por defecto; crónica procedural siempre disponible |
| Q9 | Analytics | P13 | Cloudflare Web Analytics (gratis, sin cookies) o ninguna |
| Q10 | Errores en producción | P13 | Sentry plan gratuito, opcional |
| Q11 | Dominio propio (≈USD 10/año rompe D24) | P13 | No; subdominio gratuito (`*.pages.dev`) |
| Q12 | Mundos destacados de la galería (cuántos, cuáles) | P13 | 6–10, curados por vos entre seeds generados |

### No bloquean
- Q13: ¿audio ambiental (CC0)? Roadmap, salvo que lo pidas.
- Q14: ¿página "Cómo funciona" con detalle técnico para el portfolio? Recomendado (P13).

---

## 6. Alcance

### Entra (v1)
- Generación física del planeta con parámetros tipo Civ y génesis animada.
- Simulación de ≈12.000 a.C. a ≈1900:
  - demografía, subsistencia y domesticación;
  - cultura e idiomas;
  - conocimiento, economía de mercados con moneda;
  - estados, casas y personajes con nivel de detalle;
  - regímenes con transiciones, religión;
  - guerra con ejércitos, diplomacia;
  - shocks climáticos y epidemias, colapsos, exploración e industrialización temprana.
- Vista en vivo con mapa 3D + atlas, modos de mapa, inspector con el "por qué" de cada número,
  controles de tiempo, rebobinado y modo director.
- Resumen: enciclopedia, atlas histórico, estadísticas, árboles, crónica procedural (+ LLM BYOK).
- Guardar y cargar en el navegador, exportar e importar `.wsim`, links compartibles, galería de
  mundos destacados.
- es/en; desktop.

### No entra (v1)
- Jugar una nación.
- Modo dios.
- Multijugador.
- Cuentas y backend.
- Mobile.
- La Tierra real.
- Fantasía o magia.
- Eras posteriores a ≈1900.
- Simulación de cada individuo.
- Editor manual de mapas.
- Mods.
- Audio.
- Globo esférico.

### Roadmap
Cada ítem futuro tiene una condición que lo dispara (§18).

---

## 7. Política de costo cero (✅ D24)

**Regla:** ninguna pieza de la arquitectura depende de un servicio pago. Todo servicio externo es
**opcional y degradable**. Los límites gratuitos se re-verifican en P0 (ADR-007) y al publicar
(P13), porque cambian.

| Necesidad | Solución gratuita | Límites a vigilar | Plan B |
|---|---|---|---|
| Hosting de la app | Cloudflare Pages Free (🔶 Q1) | Builds/mes, cantidad de archivos, 25 MiB por archivo | GitHub Pages |
| Previews por rama/PR | Cloudflare Pages preview deployments | Builds/mes | Preview local + capturas |
| Repo + CI | GitHub público + Actions | Minutos (ilimitados en repos públicos) | Suites pesadas solo local o nocturnas |
| Persistencia | Nada en servidor: IndexedDB del navegador + archivos `.wsim` | Cuota de almacenamiento del navegador | Exportar a archivo |
| Compartir | URL con seed+params+versión; `.wsim`; galería como archivos estáticos | 25 MiB por archivo destacado | Re-simular desde el seed |
| LLM | BYOK en el navegador (clave del usuario, va directo a la API de Anthropic) | — | Crónica procedural |
| Fuentes | OFL (Google Fonts) auto-hospedadas | — | — |
| Assets 3D/texturas | CC0 (Poly Haven, ambientCG, Quaternius, Kenney) | — | Procedural |
| Íconos | Lucide (ISC) / Phosphor (MIT) + set propio | — | — |
| Analytics | Cloudflare Web Analytics (opcional) | — | Ninguna |
| Errores | Sentry Developer (opcional) | Eventos/mes | Consola + reportes manuales |
| Dominio | Subdominio gratuito | — | — |

---

## 8. Arquitectura

### 8.1 Monorepo

```
worldsim2/
├─ apps/
│  └─ web/                    Vite + React + TS
│     ├─ src/routes/          landing, crear, mundo (vivo), resumen, enciclopedia, galería, cómo-funciona, ajustes
│     ├─ src/map/             renderer Three.js: terreno, agua, ríos, fronteras, rellenos, rótulos, marcadores, atlas
│     ├─ src/screens/         composición de pantallas con @ws/ui
│     ├─ src/worker/          host de los workers (simulación y worldgen) y protocolo de mensajes
│     └─ src/state/           store de UI (zustand) + suscripción a deltas
├─ packages/
│  ├─ core/        rng, math determinista, ids, stores SoA, serialización + hash, eventos, modificadores, scheduler, calendario
│  ├─ worldgen/    tectónica, erosión, clima, biomas, hidrología, suelos, geología, especies, provincias, mares
│  ├─ content/     tablas de datos (bienes, innovaciones, edificios, doctrinas, regímenes, leyes, unidades, rasgos) + validación zod
│  ├─ lang/        idiomas procedurales: fonología, morfología, cambio fonético, familias, nombres
│  ├─ sim/         sistemas de simulación, pipeline del tick, IA de agenda
│  ├─ history/     grabación (keyframes + deltas), consultas "a la fecha", formato .wsim
│  ├─ chronicle/   significancia, episodios, derivación de la enciclopedia, plantillas es/en, cliente LLM opcional
│  ├─ i18n/        catálogos es/en, formateadores (a.C./d.C., números, unidades)
│  └─ ui/          Design System: tokens, componentes, charts, íconos (desde P2)
├─ tools/
│  ├─ cli/         ws run · ws health · ws bench · ws inspect · ws worldgen
│  └─ assets/      pipeline glTF/KTX2/meshopt + manifiesto de licencias
├─ docs/           plan, modelo, decisiones, estado, aprendizajes, fases, prompts, ADRs, diseño
└─ CLAUDE.md       puerta de entrada para cada sesión
```

**Fronteras entre paquetes** (se verifican con lint en CI):
- `core`, `worldgen`, `content`, `lang`, `sim`, `history` y `chronicle` son **motor**: no importan
  React, Three.js, DOM ni nada de `apps/`.
- `ui` no importa el motor; recibe datos ya derivados.
- Solo `apps/web` une motor, UI y render.

### 8.2 Topología en tiempo de ejecución

```
┌───────────────────────────── Navegador ──────────────────────────────┐
│  Hilo principal                              Worker de simulación     │
│  ┌───────────────┐    comandos (play, vel.,  ┌─────────────────────┐  │
│  │ React UI      │ ── rebobinar, inspeccionar)│ sim: tick anual     │  │
│  │ (pantallas)   │ ─────────────────────────▶ │ + sub-pasos de      │  │
│  │               │ ◀───────────────────────── │   guerra            │  │
│  └──────┬────────┘   deltas visuales +        │ history: keyframes  │  │
│         │            eventos (ArrayBuffer     │   + deltas          │  │
│  ┌──────▼────────┐   transferibles)           └──────────┬──────────┘  │
│  │ Three.js map  │                            ┌──────────▼──────────┐  │
│  │ (WebGPU/GL2)  │                            │ Worker de worldgen  │  │
│  └───────────────┘                            └─────────────────────┘  │
│  IndexedDB: mundos guardados, ajustes, caché de crónicas               │
└────────────────────────────────────────────────────────────────────────┘
      ▲ estático (Cloudflare Pages): app, galería .wsim, assets
      └ opcional: api.anthropic.com con la clave del usuario (BYOK)
```

### 8.3 Motor por dentro

- **Almacenes orientados a datos:**
  - Provincias y pops en *structure-of-arrays* con arrays tipados: rápido, compacto y
    transferible sin copiar.
  - Entidades escasas (personajes, casas, guerras, ejércitos, religiones, mercados) en tablas
    por id.
  - **Los ids nunca se reutilizan**, para que la historia los referencie siempre.
- **Regla de escritor único:** cada campo del estado tiene **un solo sistema dueño** que lo
  escribe; los demás lo leen. Los sistemas se comunican por **buffers de flujo** explícitos (por
  ejemplo, la demanda de un mercado) y por eventos. Así se evitan las cachés transitorias
  acopladas al orden del tick del proyecto anterior.
- **Contratos:** cada sistema declara `{lee, escribe, emite, cadencia, fase del tick}` en
  `docs/model.md` y en código. En desarrollo y tests, un guard verifica que solo escriba lo
  declarado.
- **Pipeline del tick** (orden fijo, justificado en `model.md`):
  1. Entorno: clima del año, shocks, nivel del mar.
  2. Producción y cosecha.
  3. Mercados y comercio: precios, flujos, moneda.
  4. Consumo, demografía y salud.
  5. Migración, asimilación y conversión (flujos entre pops).
  6. Conocimiento: invención, difusión, pérdida.
  7. Sociedad: estamentos, facciones, personajes, sucesión, planes.
  8. Estado: fiscalidad, leyes, administración, régimen.
  9. Diplomacia y decisiones (agenda).
  10. Guerra: sub-pasos estacionales de movimiento, batallas y sitios.
  11. Cultura, idioma y religión (cadencias largas).
  12. Asentamientos e infraestructura.
  13. Derivación: recálculo explícito de vistas derivadas (dueños, áreas de mercado, mapas).
  14. Crónica: significancia, episodios, grabación de deltas.
- **Modificadores trazables:** `{objetivo, stat, op, valor, fuente:{tipo,id}, vence}`. Todo stat
  calculado = base + modificadores, y `explain(stat)` devuelve el árbol de causas que muestra el
  inspector.
- **RNG por contador con streams:** `rand(seed, sistema, entidad, año, k)`. No tiene estado
  global, no depende del orden, y agregar un sistema no altera el azar de los demás.
- **Matemática determinista:** en el motor están prohibidos `Math.random`, `Math.sin/cos/tan/exp/
  log/pow/atan2`, `Date.now` y `performance.now` (lint). Las operaciones `+ − × ÷` y `sqrt` son
  exactas en IEEE-754 y se permiten.
- **Estado 100% serializable y hasheable:** si está en el estado, está en el snapshot y en el
  hash. Formato binario versionado.
- **Versionado:** `ENGINE_VERSION` (semver) + hash del contenido. Un seed reproduce el mundo
  solo dentro de la misma versión.

### 8.4 Historia y rebobinado

- **Keyframes** completos (estado serializado y comprimido con fflate): **cada 100 años en memoria**
  durante la sesión; **en el archivo, cada 1.000 años + el estado final exacto** (D44, ADR-008).
  El mapa a la fecha usa keyframes visuales + deltas; el inspector a la fecha, resúmenes.
- **Deltas visuales anuales** (estacionales para ejércitos): cambios de dueño de provincias,
  niveles de asentamientos, rutas, ejércitos, mayorías culturales y religiosas, resumen de
  precios.
- **Log de eventos** append-only con causas y significancia.
- **Consultas "a la fecha Y"** para el mapa, el inspector y la enciclopedia.
- **Rebobinar es *ver* el pasado:** la cabeza de la simulación no retrocede. Continuar desde un
  punto pasado (ramas "qué hubiera pasado") queda en el roadmap.
- **Formato `.wsim`:**
  - cabecera: magic, versión de formato, versión del motor, seed, parámetros, hash de contenido;
  - keyframes;
  - deltas;
  - eventos;
  - índice de la enciclopedia.

  El mundo físico no se guarda porque se regenera del seed; se puede incluir opcionalmente.

### 8.5 Render del mapa

- Three.js `WebGPURenderer` con materiales TSL (compilan a WebGPU y WebGL2); fallback automático
  a WebGL2.
- **Truco central:** una **textura estática de id de provincia** + una **textura chica de color
  por provincia**. Cambiar de modo de mapa o de año es actualizar ~1.500 colores, no repintar el
  mundo.
- **Capas:**
  - terreno por chunks con LOD;
  - agua por profundidad;
  - ríos por caudal;
  - fronteras suaves (campos de distancia);
  - rellenos;
  - rótulos SDF (troika-three-text) con colocación curva para reinos;
  - marcadores instanciados (ciudades, ejércitos, batallas);
  - modelos 3D de cerca (P12).
- **Zoom semántico:** de lejos atlas (plano, pintado, rótulos grandes); de cerca terreno 3D.
- **Wrap E-O:** se renderiza el borde duplicado; cámara con pan infinito horizontal.
- **Picking:** lookup en el ráster de ids de provincia (CPU), sin pasada extra de GPU.

### 8.6 Aplicación web
- **Vite + React + TS**, router tipado y zustand para el estado de la UI.
- **Sin servidor:** todos los datos vienen del Worker.
- **Gráficos:** uPlot para series (rápido con muchas series), d3-hierarchy y layouts propios para
  los árboles.
- **Listas:** virtualizadas (TanStack Virtual).
- **Búsqueda:** índice en el cliente (MiniSearch).
- **i18n:** librería a decidir en el ADR-005 (P0); todo texto pasa por claves.

---

## 9. Stack

| Capa | Elección | Por qué / alternativas |
|---|---|---|
| Lenguaje | TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) | Rigor desde el día 1 |
| Monorepo | pnpm workspaces + Turborepo | Caché, tareas por paquete afectado |
| Build | Vite | Rápido, workers nativos, sin servidor |
| UI | React 19 | Tu stack; mejor ecosistema para UI de datos |
| Render | Three.js (WebGPURenderer + TSL, fallback WebGL2) | Ecosistema más grande; Babylon.js es la alternativa |
| Texto en 3D | troika-three-text | Texto SDF nítido y curvable |
| Estado de UI | zustand | Simple, sin boilerplate |
| Router | TanStack Router | Rutas tipadas |
| Gráficos | uPlot + d3 (layouts) | Rendimiento + árboles a medida |
| Validación de contenido | zod | Tablas de datos validadas en build |
| Compresión | fflate | Rápida, pura JS |
| Búsqueda | MiniSearch | Índice liviano en el cliente |
| Tests | Vitest + fast-check (propiedades) + Playwright (E2E, determinismo entre navegadores, capturas) | Pirámide completa sin costo |
| Lint/formato | ESLint 9 + typescript-eslint + reglas de determinismo y fronteras + Prettier | Las reglas de oro se hacen cumplir solas |
| CI/CD | GitHub Actions + Cloudflare Pages (🔶 Q1) | Gratis |
| WASM (si hace falta) | Rust + wasm-bindgen | Solo para erosión o pathfinding si el perfilado lo pide |
| LLM (opcional) | @anthropic-ai/sdk en el navegador, BYOK | Costo cero para el proyecto |

---

## 10. Modelo de dominio (catálogo)

El detalle de campos, unidades, dueños e invariantes vive en `docs/model.md` (entregable de P0,
crece en cada fase). Esta es la forma aprobada.

### 10.1 Mundo físico (estático tras el worldgen, salvo el nivel del mar)

| Entidad | Contenido |
|---|---|
| `WorldRaster` | Elevación, temperatura, precipitación, bioma, vegetación, suelo, caudal, placa, id de provincia (por celda) |
| `Province` (estática) | Área km², fracción cultivable, rugosidad, altitud media, costa, río/navegable, suelo, yacimientos, especies silvestres, vecinos con costo |
| `SeaZone` | Costera/oceánica, estrechos, corrientes, vecinos |
| `Deposit` | Recurso, cantidad, accesibilidad (tech necesaria) |
| `WildSpecies` | Tipo (cereal, tubérculo, legumbre, animal grande…), envolvente climática, dificultad de domesticación, rendimiento |

### 10.2 Población y sociedad

| Entidad | Contenido | Dueño |
|---|---|---|
| `Pop` | Provincia, tamaño, cultura, religión (+fervor), estrato, riqueza, alfabetización, descontento, salud | demografía (tamaño), migración/asimilación (shares), economía (riqueza) |
| `Settlement` | Provincia, población urbana, nivel, edificios, fortificación, puerto, nombre, fundación, ruina | asentamientos |
| `Culture` | Valores (6), estilo arquitectónico, idioma, padre, familia, origen | cultura |
| `Language` | Fonología, morfología, léxico, padre, familia, año de separación | lang |

### 10.3 Conocimiento
| Entidad | Contenido |
|---|---|
| `Innovation` (contenido) | Prerrequisitos, materiales, entorno, necesidad, dificultad, efectos (modificadores y desbloqueos) |
| `ProvinceKnowledge` | Bitset de innovaciones conocidas + grado de adopción por innovación clave |

### 10.4 Economía
| Entidad | Contenido |
|---|---|
| `Good` (contenido) | Categoría, valor base, perecibilidad, volumen (costo de transporte), sustitutos |
| `ProductionMethod` (contenido) | Insumos → productos, trabajo por estrato, tecnología requerida |
| `Market` | Provincias miembro, precio por bien, stock, oferta monetaria, nivel de precios |
| `TradeRoute` | Mercados A↔B, tramos (tierra/mar), costo, volumen por bien, peajes, riesgo |
| `Currency` | Emisor, metal, contenido (ley), oferta |

### 10.5 Política
| Entidad | Contenido |
|---|---|
| `Polity` | Título supremo, capital, régimen (estructura), leyes, tesoro, deuda, ejércitos, estabilidad, legitimidad, capacidad administrativa, agenda |
| `Title` | Nivel (reino, gran feudo, feudo menor), provincias, titular (personaje), señor, contrato de vasallaje |
| `Estate` | Tipo (nobleza, clero, mercaderes, campesinado, burguesía, obreros), poder, demandas |
| `Faction` | Miembros, objetivo, fuerza, estado |
| `Law` (contenido) | Sucesión, impuestos, levas, religión, comercio, tenencia de la tierra |

### 10.6 Personajes ("casas, no cortes")
| Entidad | Contenido |
|---|---|
| `House` | Fundador, rama cadete de, prestigio, títulos, idioma del nombre |
| `Character` (completo) | Casa, rasgos (8–10), habilidades, edad, salud, cónyuge, hijos, reclamos, opiniones, rol (gobernante, heredero, general, profeta, inventor) |
| `PersonRecord` (liviano) | Nombre, casa, padres, nacimiento, muerte (solo para árboles; se promueve a completo si se vuelve relevante) |
| `Scheme` | Autor, objetivo, tipo, progreso, estado |

### 10.7 Religión
| Entidad | Contenido |
|---|---|
| `Religion` | Doctrinas, panteón, organización del clero, cabeza de la fe, sitios sagrados, padre (cisma), fundador, año |
| `HolySite` | Provincia, religión, tipo (ciudad santa, templo mayor), prestigio |

### 10.8 Guerra y diplomacia
| Entidad | Contenido |
|---|---|
| `Army` / `Fleet` | Dueño, composición por tipo de unidad, tamaño, moral, suministro, general, posición, orden |
| `War` | Bandos, objetivos, puntaje, cansancio, batallas, tratado |
| `Battle` / `Siege` | Lugar, fecha, participantes, bajas, resultado, nombre |
| `Relation` | Opinión (modificadores con fuente), confianza, agravios, tratados |
| `Treaty` | Tipo (no agresión, alianza, matrimonio, tributo, vasallaje, comercio, paz con términos), vigencia |

### 10.9 Memoria
| Entidad | Contenido |
|---|---|
| `Event` | Tipo, año (estación), actores, lugar, **causas** (enlaces), datos estructurados, significancia |
| `Episode` | Agrupación jerárquica (batalla ⊂ campaña ⊂ guerra ⊂ era regional) |
| `Landmark` | Maravillas, templos mayores, artefactos con historia |

### 10.10 Máquinas de estado
- **Asentamiento:** campamento → aldea → pueblo → ciudad → gran ciudad → metrópoli; cualquiera →
  ruina; ruina → refundación.
- **Polity:** jefatura → estado → (imperio). Salidas: fragmentación, absorción, colapso. Los
  cambios de régimen son transiciones registradas.
- **Personaje:** registro liviano ⇄ completo (promoción y degradación por relevancia) → muerto
  (registro histórico permanente).
- **Religión:** culto local → religión organizada → institucionalizada/de estado; ramas: cisma,
  herejía; salida: extinta.
- **Guerra:** casus belli → declarada → activa (campañas) → negociación → tratado o capitulación o
  statu quo → tregua.
- **Facción:** formándose → activa (exige) → revuelta (guerra civil) → victoriosa o disuelta.
- **Plan de intriga:** preparando → ejecutado (éxito o fracaso) o descubierto.
- **Ejército:** levantado → en marcha → en batalla o sitio → disuelto o destruido.

---

## 11. La red causal y los sistemas

### 11.1 Red causal

```
GEOLOGÍA ─► relieve, minerales, volcanes/sismos
CLIMA ─► temperatura, lluvia ─► BIOMAS, suelos, ESPECIES DOMESTICABLES
   │
   ▼
PROVINCIAS (capacidad, recursos, costo de movimiento)
   │
   ▼
SUBSISTENCIA (forrajeo, pastoreo, agricultura, pesca) ─► CULTURA (valores, idioma, arquitectura)
   │                                                        │
   ▼                                                        ▼
POPS ─► excedente ─► estratos ─► ASENTAMIENTOS ─► CONOCIMIENTO (invención + difusión + pérdida)
   │                   │                                    │
   ▼                   ▼                                    ▼
ECONOMÍA (bienes, mercados, rutas, moneda) ─► riqueza de estratos ─► poder de ESTAMENTOS
   │                                                                     │
   ▼                                                                     ▼
ESTADOS (títulos, casas, régimen, leyes, fisco, administración) ◄────────┘
   │  ▲
   ▼  │
AGENCIA (agenda, diplomacia, intriga) ─► GUERRA (ejércitos, batallas, sitios, tratados)
   │
RELIGIÓN (doctrinas, clero, sitios sagrados) ── legitimidad, cohesión, alianzas, casus belli, economía
   │
SHOCKS (clima, volcanes, epidemias, crisis fiscal) ─► crisis ─► colapso / reforma / revolución ─► renacimiento
   │
EVENTOS con causas ─► MEMORIA (enciclopedia, atlas, árboles, crónica)
```

### 11.2 Cómo se cumple cada pedido original

| Pedido | Mecánica | Fase |
|---|---|---|
| La geografía determina recursos y cultura | Especies domesticables + geología → subsistencia → valores culturales y arquitectura | P3, P4 |
| El relieve dificulta el movimiento y separa | Costos en el grafo de provincias: migración, difusión, rutas, logística, control administrativo; fronteras naturales | P3, P6, P7, P9 |
| Las religiones unen culturas bajo una narrativa común | Fe compartida → opinión, alianzas, legitimidad, menos descontento; misiones por rutas; conversión por conquista | P8 |
| Economías que ganan y pierden con el comercio; inflación | Arbitraje entre mercados; peajes; oferta monetaria (minas, saqueo, envilecimiento) → inflación; deuda y bancarrota | P6, P7 |
| Gobiernos que nacen por circunstancias + azar | El régimen emerge del equilibrio gobernante–estamentos + capacidad administrativa; transiciones con condiciones y tirada | P7 |
| Dinastías hereditarias | Casas, leyes de sucesión, pretendientes, uniones personales | P7 |
| Alianzas por distintos motivos | Matrimonios, enemigo común/hegemón, fe, cultura, comercio, miedo; memoria de traiciones | P7, P9 |
| Guerras y líderes ambiciosos | Agenda sesgada por rasgos; reclamos; generales; ejércitos visibles; tratados | P9 |
| De la prehistoria a la industria | Conocimiento con eras regionales; exploración e industrialización emergentes | P5, P10 |
| Ver en el mapa ciudades, rutas, templos, reinos | Capas y marcadores desde P1; belleza en P12 | P1→P12 |
| Pantalla de resumen | Enciclopedia, atlas, estadísticas, árboles | P1→P11 |

### 11.3 Catálogo de sistemas (contratos completos en `model.md`)

| Sistema | Escribe (dueño) | Cadencia | Fase |
|---|---|---|---|
| `environment` | clima del año, shocks, nivel del mar | anual | P3/P10 |
| `production` | buffers de producción por provincia | anual | P4/P6 |
| `markets` | precios, flujos, stocks, oferta monetaria | anual | P6 |
| `demography` | tamaño de pops, salud | anual | P4 |
| `migration` | movimientos de pops | anual | P4 |
| `assimilation` | shares de cultura y religión en pops | anual | P4/P8 |
| `epidemics` | infecciones, inmunidad | anual (sub-pasos) | P4/P10 |
| `knowledge` | conocimiento por provincia | anual | P5 |
| `settlements` | asentamientos, edificios | anual | P4 |
| `estates` | poder de estamentos, demandas | anual | P7 |
| `characters` | personajes, vida y muerte, LOD | anual | P7 |
| `succession` | herencia de títulos | por evento | P7 |
| `schemes` | planes de intriga | anual | P7 |
| `statecraft` | fisco, leyes, administración, estabilidad, legitimidad | anual | P7 |
| `regime` | estructura de gobierno y transiciones | anual | P7 |
| `agenda` | objetivos y decisiones de polities | anual | P9 |
| `diplomacy` | relaciones, tratados | anual | P9 |
| `military` | ejércitos, batallas, sitios | estacional | P9 |
| `culture` | deriva y escisión | cada 10 años | P4 |
| `language` | cambio fonético y separación | cada 25 años | P4 |
| `faith` | religiones, conversión, cismas | anual / 10 años | P8 |
| `derive` | vistas derivadas | anual | P0+ |
| `chronicle` | significancia, episodios, grabación | anual | P1/P11 |

---

## 12. El planeta (worldgen)

Pipeline determinista en el worker de worldgen. Cada etapa emite un *stage* para la génesis
animada.

1. **Tectónica:** placas continentales y oceánicas con deriva. Bordes convergentes (orogenia,
   fosas, arcos de islas), divergentes (rifts, dorsales) y transformantes; puntos calientes
   (cadenas volcánicas); plataformas. Los presets de tipo de mapa se definen en placas.
2. **Erosión:** hidráulica (stream power o partículas) + térmica; sedimentación → llanuras
   aluviales y deltas. La edad del mundo regula la intensidad.
3. **Clima:**
   - temperatura según latitud, altitud, continentalidad y corrientes;
   - vientos por celdas (alisios, del oeste, polares);
   - advección de humedad con sombra orográfica;
   - ZCIT (zona de convergencia intertropical);
   - estacionalidad.
4. **Biomas:** unas 14 clases tipo Whittaker/Köppen con transiciones:
   - selva tropical, sabana, desierto cálido, estepa, mediterráneo;
   - bosque templado, pradera templada, taiga, tundra, hielo;
   - alpino, humedal, manglar, bosque monzónico.
5. **Hidrología:** relleno de depresiones (priority-flood), acumulación de caudal, orden de
   Strahler, lagos con o sin salida (salinos), deltas y estuarios, navegabilidad.
6. **Suelos y fertilidad:** aluvial, volcánico, loess, laterítico, podzol, chernozem;
   fertilidad y laboreo.
7. **Geología → recursos:**
   - cobre y estaño en cinturones orogénicos;
   - hierro difundido;
   - oro y plata (placeres y vetas);
   - sal (evaporitas, costas);
   - carbón (cuencas antiguas);
   - piedra, arcilla, madera.
8. **Especies domesticables** por región, con envolvente climática. La orientación de los
   continentes importa (difusión a lo largo de latitudes).
9. **Deglaciación** (🔶 Q7): nivel del mar −120 m → 0 entre 12.000 y 5.000 a.C.; los puentes de
   tierra se inundan en años precalculados.
10. **Provincias y mares:** semillas con densidad ∝ habitabilidad, crecimiento por costo mínimo
    (las crestas y los ríos cuestan) → fronteras naturales; zonas marítimas; estrechos; grafo con
    costos.
11. **Parámetros:** tipo de mapa (continentes, pangea, archipiélago, continentes chicos, mar
    interior, fractal), nivel del mar, edad, temperatura, lluvia, tamaño; validación contra
    mundos degenerados.

---

## 13. Experiencia de usuario

### 13.1 Mapa de rutas
| Ruta | Pantalla |
|---|---|
| `/` | Landing: mundo destacado corriendo de fondo, CTA "Crear mundo" y "Explorar galería" |
| `/crear` | Parámetros + seed + vista previa + génesis animada |
| `/mundo/:id` | Vista en vivo |
| `/mundo/:id/resumen` | Panorama final: números clave, top de reinos, figuras, religiones y guerras, mapa final |
| `/mundo/:id/cronica` | Crónica por eras |
| `/mundo/:id/enciclopedia` (+ `/:tipo/:entidad`) | Enciclopedia navegable con búsqueda y modo "a la fecha" |
| `/mundo/:id/atlas` | Atlas histórico: mapa en cualquier año, capas, animación de fronteras |
| `/mundo/:id/estadisticas` | Ledger de gráficos y rankings |
| `/mundo/:id/arboles` | Dinastías, linajes religiosos, familias de idiomas y culturas, difusión tecnológica |
| `/galeria` | Mundos destacados (estáticos) + mundos guardados localmente |
| `/como-funciona` | Explicación técnica (portfolio) |
| `/ajustes` | Idioma, calidad gráfica, clave LLM (BYOK), accesibilidad |

### 13.2 Vista en vivo (regiones)
- **Barra superior:** nombre del mundo, fecha (a.C./d.C.), era regional del foco, menú.
- **Centro:** mapa.
- **Riel izquierdo:** modos de mapa y leyenda.
- **Panel derecho:** inspector con fichas y el desglose del "por qué".
- **Inferior:** controles de tiempo, línea de tiempo con eras y marcadores, teletipo de eventos.
- **Atajos de teclado** para todo lo frecuente.

### 13.3 Modos de mapa (se agregan por fase)
| Modo | Fase |
|---|---|
| Político | P1 |
| Terreno, biomas, relieve | P3 |
| Densidad, cultura, idioma, subsistencia | P4 |
| Era tecnológica, "conoce X" | P5 |
| Precios por bien, flujos comerciales, áreas de mercado, riqueza | P6 |
| Jerarquía de vasallos, régimen, estabilidad, control | P7 |
| Religión (mayoría y diversidad) | P8 |
| Diplomacia, ocupación, frentes | P9 |
| Clima, epidemias | P10 |

---

## 14. Calidad

### 14.1 Definition of Done (toda tarea)
- Tipado estricto sin `any` filtrados.
- Tests donde hay lógica; tests de propiedades donde hay invariantes.
- Determinismo intacto: el golden solo cambia si es intencional, y se justifica en el commit.
- Contratos y `model.md` actualizados si cambió el estado o un sistema.
- Eventos nuevos con causas, significancia y plantilla es/en.
- Cero strings sueltos en la UI (todo i18n).
- Presupuesto de rendimiento respetado (bench).
- UI: estados vacío, cargando y error diseñados; teclado; contraste AA; sin errores de consola.
- Docs actualizados si cambió comportamiento.

### 14.2 Pirámide de tests
| Capa | Herramienta | Qué |
|---|---|---|
| Unitarios | Vitest | Cada sistema contra su contrato; core (RNG, math, serialización) |
| Propiedades | fast-check | Invariantes: conservación de población, precios acotados, sin ids reutilizados, serialización ida y vuelta |
| Determinismo | Vitest + Playwright | Mismo seed → mismo hash; guardar/cargar → misma continuación; Chromium/WebKit/Firefox/Node idénticos |
| Golden | Vitest | Regresión de hash por fase (con streams estables, casi no se recalibra) |
| Salud histórica | `ws health` | N seeds (10 en PR, 30 nocturno/local) → distribuciones vs. Apéndice A + invariantes de diversidad |
| Rendimiento | `ws bench` | ms/año, tiempo de worldgen, memoria; umbral de regresión |
| E2E | Playwright | Flujos: crear → mirar → rebobinar → resumen → compartir |
| Visual | Playwright (capturas) | Pantallas y mapa por hito; comparación contra el DS |

### 14.3 Ritual de QA gate (toda fase)
1. CI verde: typecheck, lint, unitarios, propiedades, determinismo, golden, E2E.
2. Reporte de salud con diferencias contra la fase anterior.
3. Bench dentro del presupuesto.
4. Checklist manual de la fase (en el REPORT), ejecutado juntos en el preview.
5. Auditoría de diseño en las fases con UI (skill `impeccable` + checklist del DS).
6. **Tu OK registrado en `docs/decisions.md`.** Recién ahí cierra la fase y se abre la siguiente.

---

## 15. Contrato de trabajo (✅ D22)

### 15.1 Ciclo de una fase
```
Prompt de fase (sesión nueva) → lectura obligatoria → 📋 BRIEF → 🔶 decisiones → tu aprobación
→ implementación por tareas (con checkpoints 🎨 y decisiones en el medio)
→ 🧪 QA gate → 📝 REPORT → docs + STATUS + prompt de la próxima fase actualizados → tu OK
```

### 15.2 BRIEF (antes de cada fase) — `docs/phases/PNN/BRIEF.md`
Plantilla en `docs/templates/BRIEF.md`. Incluye:
- objetivo;
- qué entra y qué no;
- tareas y subtareas (refinadas desde este plan);
- 🔶 decisiones con opciones, pros/contras y recomendación;
- mocks 🎨 planificados;
- riesgos;
- criterios de salida;
- preguntas para vos;
- impacto en el modelo de dominio.

**No escribo código de la fase hasta que lo apruebes explícitamente.** Si apruebás con ajustes,
los incorporo al BRIEF antes de arrancar.

### 15.3 REPORT (después de cada fase) — `docs/phases/PNN/REPORT.md`
Plantilla en `docs/templates/REPORT.md`. Incluye:
- qué se hizo (por tarea, con casillas);
- qué no y por qué;
- desvíos del BRIEF;
- decisiones tomadas;
- métricas (tests, salud, bench);
- evidencia (capturas, links de preview);
- deuda técnica;
- LEARNINGS nuevos;
- docs actualizados;
- recomendación para la próxima fase.

Al cerrar actualizo **todos** los documentos afectados: `model.md`, este plan si cambió, `STATUS.md`,
`decisions.md`, el prompt de la próxima fase, `CLAUDE.md` si hay reglas nuevas.

### 15.4 Decisiones
- **Cuándo te consulto:**
  - cambios en el modelo de dominio o en contratos;
  - cualquier elección con impacto en UX o diseño;
  - trade-offs de calidad, alcance o rendimiento;
  - desvíos del plan o del BRIEF;
  - acciones difíciles de revertir;
  - cualquier cosa que toque costo.
- **Cómo:** opciones + pros/contras + mi recomendación + qué no recomiendo y por qué.
- **En medio de una fase:** freno solo lo afectado, sigo con lo que no depende de la decisión, y
  te pregunto en el momento (no al final).
- **Registro:** todo queda en `docs/decisions.md` (append-only, fechado, con contexto).
- **Mi rol:** te voy a cuestionar cuando crea que una decisión daña el producto; la última palabra
  es tuya.

### 15.5 Diseño (✅ D25)
- En **P2** te presento **3 direcciones de diseño** distintas, con maquetas reales (vista en
  vivo, ficha de enciclopedia, recorte de atlas) sobre renders reales del mapa. Elegís una (o una
  mezcla) y recién ahí genero el **Design System**.
- **Mock-first:** toda superficie importante nueva (pantalla, panel, árbol, dashboard) se aprueba
  como maqueta 🎨 antes de cablearla.
- **Anti "AI slop":**
  - prohibidos gradientes violetas genéricos, glassmorphism por defecto, emojis como íconos,
    tarjetas SaaS genéricas, la tipografía "de siempre" sin criterio, sombras difusas por todos
    lados y animaciones decorativas sin función;
  - cada elección visual tiene una razón ligada al concepto elegido;
  - lista de verificación en `docs/design-system.md`.

### 15.6 Prompts de fase
- `docs/prompts/PNN-<nombre>.md`: uno por fase, **auto-contenido**. Dice dónde leer, qué hacer y
  en qué orden, con el protocolo completo.
- Se inician en una **sesión nueva** sin explicación adicional. Además, `CLAUDE.md` se carga solo y
  apunta a `docs/STATUS.md`.
- Al cerrar una fase, refresco el prompt de la siguiente con lo aprendido.

### 15.7 LEARNINGS
- **Qué se registra** en `docs/LEARNINGS.md`:
  - todo problema que costó más de 30 min;
  - todo retrabajo;
  - toda corrección tuya;
  - toda fricción de proceso;
  - todo supuesto equivocado.
- **Formato:** contexto → qué pasó → causa raíz → regla a seguir → cómo detectarlo antes.
- **Uso:** se leen al inicio de cada sesión. Los recurrentes se promueven a reglas de `CLAUDE.md`.

### 15.8 Arquitectura primero (✅ D23)
Las fases P0–P10 priorizan modelo, contratos, mecánica, determinismo y salud. Su UI es
**funcional y coherente con el DS**, no pulida. La belleza (3D de calidad, animación, atmósfera)
se concentra en **P12**. Si querés adelantar algo visual, es una decisión 🔶 explícita.

### 15.9 Git
- Rama por fase (`phase/p03-planeta`) con sub-ramas por tarea si hace falta.
- Commits convencionales que referencian la tarea (`feat(worldgen): P3.2 erosión hidráulica`).
- PR por fase con preview gratuito; `main` siempre desplegable.
- **El merge de cierre de fase espera tu revisión.**

### 15.10 Continuidad entre sesiones
Una fase puede llevar varias sesiones. **Toda sesión termina actualizando `docs/STATUS.md`**:
dónde quedó, qué sigue, bloqueos, decisiones pendientes. Una sesión nueva lee `CLAUDE.md` →
`STATUS.md` y retoma sin que tengas que explicar nada.

---

## 16. Fases

> **Cadena:** P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 → P9 → P10 → P11 → P12 → P13.
> Cada fase **reemplaza en el lugar** la versión simple de su sistema creada en P1 y entrega
> su capa de mapa, sus fichas en la enciclopedia, sus gráficos y su chequeo de salud
> (UI funcional con el DS; el pulido es P12).

| Fase | Nombre | Tamaño | Núcleo |
|---|---|---|---|
| P0 | Fundaciones de arquitectura | M | Monorepo, core determinista, `model.md`, spikes de riesgo, CI/CD gratis |
| P1 | Rebanada vertical | L | Todo el recorrido, simple, sobre la arquitectura definitiva |
| P2 | Dirección de diseño y Design System | M–L | 3 direcciones 🎨 → elección → tokens, componentes, cartografía |
| P3 | El planeta físico | L | Worldgen completo + provincias naturales + génesis |
| P4 | Gente y sustento | L | Pops, demografía, domesticación, cultura, idiomas, asentamientos |
| P5 | Conocimiento | M | Grafo de innovaciones, difusión, pérdida, eras regionales |
| P6 | Economía | L | Bienes, producción, mercados, rutas, moneda, inflación |
| P7 | Estado y poder | XL | Formación del estado, casas, vasallaje, estamentos, regímenes, fisco, intriga |
| P8 | Fe | M | Religiones emergentes, doctrinas, clero, sitios sagrados, cismas |
| P9 | Guerra y diplomacia | XL | Ejércitos, logística, batallas, sitios, tratados, IA de agenda |
| P10 | Auge, caída y modernidad | L | Clima dinámico, epidemias, colapsos, exploración, industria |
| P11 | Memoria y relato | L | Enciclopedia completa, atlas, árboles, crónica, LLM BYOK, director |
| P12 | Inmersión visual | XL | Terreno PBR, agua, vegetación, ciudades por era y cultura, vida, atmósfera |
| P13 | Publicación | M | Compartir, galería, landing, "cómo funciona", a11y, rendimiento final |

---

### P0 — Fundaciones de arquitectura · M

**Objetivo:** una casa profesional y vacía: repo, herramientas, CI/CD gratis, las primitivas
deterministas del motor y el **modelo de dominio diseñado antes de codear**. Además, los tres
riesgos técnicos grandes despejados con spikes medidos.

**Prerrequisitos:** plan aprobado; Q1–Q4 respondidas.

#### Tareas

**P0.1 Repo y convenciones**
- [ ] `git init`; repo en GitHub vía `gh` (Q2/Q3); protección de `main` (PR + CI obligatorios)
- [ ] `LICENSE` (Q4); `README.md` con setup ≤ 10 min; `.editorconfig`; `.nvmrc` (Node 22 LTS); `engines`
- [ ] Commits convencionales: commitlint + husky + lint-staged
- [ ] Plantilla de PR con la Definition of Done (§14.1) como checklist
- [ ] `.gitignore` (incluye salidas de corridas, capturas temporales, `.env`)

**P0.2 Monorepo**
- [ ] pnpm workspaces + Turborepo (pipelines `build`, `typecheck`, `lint`, `test`, `bench`; caché)
- [ ] Esqueleto de paquetes (§8.1) con `package.json`, `tsconfig` que extiende la base estricta, `index.ts` y un test vacío
- [ ] `apps/web` con Vite + React + TS y una ruta de placeholder
- [ ] `tools/cli` con un comando `ws --version`
- [ ] Fronteras entre paquetes con dependency-cruiser (o eslint-plugin-boundaries): el motor no importa React, Three.js, DOM ni `apps/`

**P0.3 Lint de determinismo y estilo**
- [ ] ESLint 9 + typescript-eslint + Prettier
- [ ] En los paquetes del motor: prohibir `Math.random`, `Math.sin/cos/tan/asin/acos/atan/atan2/exp/expm1/log/log1p/log2/log10/pow/cbrt/hypot`, `Date.now`, `new Date()`, `performance.now`, `crypto.getRandomValues`
- [ ] Prohibir `for...in` y la iteración sobre objetos con claves dinámicas en el motor (orden no garantizado en todos los casos); usar arrays y Maps con orden de inserción
- [ ] Test de que el lint efectivamente falla ante cada caso prohibido

**P0.4 `core/rng` — RNG por contador**
- [ ] Función de mezcla de 32 bits (estilo SplitMix/xxHash con `Math.imul`) → `hash(seed, stream, entity, year, k)`
- [ ] API: `rng.stream('demography').at(entityId, year)` → `uniform()`, `int(n)`, `chance(p)`, `normal()` (con math propia), `weighted(items)`, `shuffle(array)`
- [ ] Registro de streams con ids estables (constantes, no generados por orden de registro)
- [ ] Tests: vectores fijos de referencia; uniformidad (chi-cuadrado); independencia entre streams; idéntico en Node y navegadores (P0.15)

**P0.5 `core/math` — matemática determinista**
- [ ] `exp`, `log`, `pow`, `sin`, `cos`, `atan2`, `tanh`, `sigmoid` implementadas con polinomios y reducción de rango (solo `+ − × ÷ sqrt`)
- [ ] Utilidades: `clamp`, `lerp`, `smoothstep`, `remap`, interpolaciones
- [ ] Tests: error relativo acotado vs `Math.*`; reproducibilidad bit a bit con vectores fijos

**P0.6 `core/store` — almacenes**
- [ ] Tabla SoA con columnas de arrays tipados que crecen (Float64/Float32/Int32/Uint16/Uint8) + columnas de referencias
- [ ] Asignador de ids monótono (nunca reutiliza); bajas lógicas con compactación controlada
- [ ] Tablas escasas por id (Map con orden de inserción) para entidades escasas
- [ ] Iteración siempre en orden de id
- [ ] Tests de propiedades: alta, baja, iteración, crecimiento

**P0.7 `core/serialize` + hash**
- [ ] Formato binario versionado por tabla (esquema declarativo) + ida y vuelta
- [ ] Hash del estado completo (xxHash32/64 en TS); regla "si está en el estado, está en el hash"
- [ ] Test: serializar → deserializar → mismo hash; cambiar cualquier campo → otro hash

**P0.8 `core/events`**
- [ ] Esquema: `{id, tipo, año, estación?, actores[], lugar?, causas[], datos, significancia}`
- [ ] Registro tipado de tipos de evento (cada uno con clave de plantilla i18n y función de significancia)
- [ ] Bus por tick; los eventos se emiten con causas enlazadas (ids de eventos o referencias a hechos del estado)

**P0.9 `core/modifiers`**
- [ ] Registro de stats (declara su forma de agregación: aditiva, multiplicativa, mín/máx)
- [ ] Modificadores con fuente, magnitud y vencimiento; aplicación ordenada y determinista
- [ ] `explain(entidad, stat)` → árbol de causas (para el inspector)
- [ ] Tests: agregación, vencimiento, explicación correcta

**P0.10 `core/time` + scheduler**
- [ ] Calendario sin año 0 (1 a.C. → 1 d.C.), estaciones, conversión año↔índice de tick
- [ ] Pipeline del tick con fases (§8.3) y cadencias por sistema
- [ ] Declaración de contratos `{lee, escribe, emite, cadencia, fase}` + guard de escritura en modo dev/test
- [ ] Test: un sistema que escribe fuera de su contrato hace fallar el tick en test

**P0.11 `docs/model.md` — modelo de dominio v1** 🔶 (gate de aprobación)
- [ ] Todas las entidades de §10 con campos, tipos, **unidades** y dueño
- [ ] Red causal (§11.1) con cada flecha mapeada a un sistema y un campo
- [ ] Contratos de todos los sistemas de §11.3, incluidos los que llegan en fases futuras
- [ ] Invariantes globales (conservación de población, ids nunca reutilizados, cada provincia con exactamente un dueño o ninguno, etc.)
- [ ] Catálogo de eventos v0 y glosario de unidades
- [ ] Revisión juntos → aprobado en `decisions.md`

**P0.12 ADRs (`docs/adr/`)**
- [ ] ADR-001 Monorepo y herramientas
- [ ] ADR-002 RNG por contador
- [ ] ADR-003 Matemática determinista
- [ ] ADR-004 Almacenes de estado (SoA + tablas escasas)
- [ ] ADR-005 Librería de i18n (i18next vs lingui) 🔶
- [ ] ADR-006 Backend de render (WebGPU primero + fallback WebGL2)
- [ ] ADR-007 Hosting y límites gratuitos verificados (Q1)
- [ ] ADR-008 Formato de historia `.wsim` v0

**P0.13 Spike A — terreno**
- [ ] Heightmap de ruido 2048×1024 → malla por chunks con LOD simple
- [ ] Wrap E-O sin costura visible; cámara con pan infinito horizontal
- [ ] Splat de 3 texturas CC0 de prueba
- [ ] Medición: fps (promedio, p5), memoria GPU, tiempo de carga, en WebGPU y forzando WebGL2
- [ ] Conclusiones en `docs/phases/P00/spikes.md`

**P0.14 Spike B — Worker + deltas + rebobinado**
- [ ] Simulación ficticia de 1.500 provincias × 10 pops durante 14.000 años en el worker
- [ ] Deltas por año como `ArrayBuffer` transferibles; hilo principal a 60 fps pintando un mapa de colores
- [ ] Keyframes + deltas en memoria; rebobinar a cualquier año
- [ ] Medición: ms/año, throughput de mensajes, memoria, tamaño de la historia comprimida

**P0.15 Spike C — determinismo entre navegadores**
- [ ] Playwright corre la simulación del spike B en Chromium, WebKit y Firefox + Node
- [ ] Comparación de hashes por año (no solo el final, para localizar divergencias)
- [ ] Documentar diferencias encontradas y su solución

**P0.16 CI/CD gratis**
- [ ] GitHub Actions: install → typecheck → lint → unitarios → build (por PR); determinismo entre navegadores (por PR o nocturno según duración)
- [ ] Deploy a Cloudflare Pages (Q1): preview por PR, producción en `main`, vía Git integration o `wrangler` CLI
- [ ] Badges; caché de pnpm y Turborepo
- [ ] Verificación: ningún servicio pide tarjeta; todo en plan gratuito (ADR-007)

**P0.17 Bench harness**
- [ ] `ws bench`: ms/año (promedio, p95), tiempo de worldgen, memoria pico; salida JSON + tabla
- [ ] Línea base registrada; regla de regresión en CI con tolerancia (local para mediciones finas)

**P0.18 Documentación de trabajo**
- [ ] `CLAUDE.md` con comandos reales
- [ ] `STATUS.md`, `decisions.md`, `LEARNINGS.md`, plantillas y prompts revisados contra lo construido

**Entregables:**
- repo con esqueleto y CI verde;
- spike de terreno desplegado en el preview gratuito;
- `model.md` aprobado;
- ADRs;
- reporte de spikes con mediciones.

**Criterios de salida:**
- [ ] Clon nuevo → `pnpm i` → `pnpm dev` en ≤ 10 min siguiendo el README (probado por vos)
- [ ] PR → CI verde + link de preview automático
- [ ] Spike A: ≥ 60 fps promedio en M-series con heightmap 2048×1024 + wrap; fallback WebGL2 funcional
- [ ] Spike B: 14.000 años ficticios ≤ 3 min sin bloquear la UI (60 fps sostenidos)
- [ ] Spike C: hash idéntico en Chromium, WebKit, Firefox y Node
- [ ] `model.md` aprobado por vos
- [ ] Costo: USD 0, sin tarjetas cargadas

**🔶 Decisiones:** Q1–Q4, ADR-005, confirmación de ADR-006 tras el spike A, ajuste de los
objetivos de §2 con las mediciones reales.

**Riesgos:**
- Diferencias de WebGPU entre navegadores → fallback y medición en ambos.
- WebKit de Playwright ≠ Safari real → verificación manual en Safari.
- Que el modelo de dominio se sobre-diseñe → se diseña completo pero se implementa por fases.

---

### P1 — Rebanada vertical · L

**Objetivo:** todo el recorrido funcionando —generar → mirar → rebobinar → resumen → compartir—
con versiones **simples** de cada pilar, pero sobre la **arquitectura definitiva**: contratos,
eventos con causas, modificadores, historia, i18n. La UI es funcional y neutra (sin DS todavía).
Cada sistema simple se reemplaza en el lugar en su fase.

**Prerrequisitos:** P0 cerrada.

#### Tareas

**P1.1 Worldgen v1**
- [ ] Placas simples (Voronoi) con elevación por tipo + levantamiento en bordes convergentes + ruido fractal
- [ ] Nivel del mar por percentil (parámetro); erosión térmica simple
- [ ] Temperatura por latitud y altitud; humedad por bandas de latitud + distancia a la costa + sombra orográfica simple
- [ ] Biomas v1 (8–10 clases)
- [ ] Hidrología v1: priority-flood + acumulación de caudal → ríos que terminan en mar o lago
- [ ] Provincias v1: semillas Poisson ponderadas por habitabilidad, crecimiento Dijkstra con costo extra en crestas y ríos; zonas marítimas; grafo con costos; wrap E-O
- [ ] Salida `WorldStatic` serializable y hasheada
- [ ] Tests: determinismo; fracción de tierra dentro de ±5% del parámetro; toda provincia conexa o marcada isla; ríos sin tramos cuesta arriba

**P1.2 Mapa v1**
- [ ] Terreno desde el heightmap con color por bioma y sombreado; wrap
- [ ] Agua con color por profundidad; ríos como líneas de ancho por caudal
- [ ] Textura de ids de provincia + textura de colores → relleno político; fronteras
- [ ] Zoom semántico v0: lejos plano coloreado, cerca relieve
- [ ] Marcadores instanciados: asentamientos por nivel, batallas
- [ ] Picking de provincia → selección

**P1.3 Simulación v1** (cada sistema mínimo pero con contrato)
- [ ] Pops v1: un estrato, cultura y religión placeholder; crecimiento por alimento disponible
- [ ] Subsistencia v1: forrajeo → agricultura destrabada por entorno + 1–2 innovaciones
- [ ] Conocimiento v1: unas 10 innovaciones con prerrequisitos; difusión por adyacencia
- [ ] Asentamientos v1: niveles por población
- [ ] Polities v1: jefaturas que nacen de asentamientos; expansión a provincias vecinas sin dueño; absorción
- [ ] Guerra v1 abstracta: declaración por utilidad simple, resolución estacional por fuerza + RNG, cesión de provincias, paz por cansancio
- [ ] Personajes v1: gobernante con nombre, edad, muerte y sucesión por primogenitura
- [ ] Idioma v1: una fonología simple por cultura para nombrar
- [ ] Eventos con causas y significancia para todo lo anterior

**P1.4 Historia v1**
- [ ] Grabador: keyframes cada 100 años + deltas visuales anuales
- [ ] Consultas "a la fecha" para el mapa y el inspector
- [ ] Guardar y cargar en IndexedDB; exportar e importar `.wsim` v0

**P1.5 Tiempo y director v1**
- [ ] Tick anual; velocidades (pausa, 1×, 2×, 4×, máx.)
- [ ] Ritmo por era (años por segundo según la era dominante)
- [ ] Línea de tiempo con eras y marcadores de eventos significativos; scrub para rebobinar

**P1.6 UI v1 funcional (neutra)**
- [ ] Crear mundo: parámetros + seed + generar (barra de progreso por etapa)
- [ ] Vista en vivo: mapa, controles de tiempo, teletipo, inspector básico (provincia, asentamiento, polity, personaje)
- [ ] Resumen v1: listas de entidades (polities, asentamientos, culturas, personajes, guerras) con ficha genérica + 3 gráficos (población, cantidad de polities, mayor polity)
- [ ] i18n es/en cableado desde el inicio (toggle en la barra)

**P1.7 Compartir v1**
- [ ] URL con seed + parámetros + versión del motor
- [ ] Abrir un link regenera y simula a velocidad máxima con progreso, y luego permite reproducir

**P1.8 Salud v1 (`ws health`)**
- [ ] 10 seeds; métricas: curva de población, cantidad de polities, % de tierra con dueño, extinciones, eventos por tipo
- [ ] Reporte Markdown + HTML con gráficos; comparación contra la ejecución anterior

**P1.9 Rendimiento**
- [ ] Bench del mundo mediano; perfilado; optimización hasta entrar en el presupuesto

**Entregables:** la rebanada desplegada; reporte de salud v1; reporte de bench.

**Criterios de salida:**
- [ ] Mundo mediano generado en ≤ 20 s
- [ ] 12.000 a.C. → 1900 en ≈10 min a velocidad normal y ≤ 3 min a velocidad máxima
- [ ] Rebobinar a cualquier año: el mapa y el inspector muestran ese año
- [ ] Guardar/cargar a mitad de corrida → continuación con hash idéntico
- [ ] Un link compartido reproduce el mismo mundo (hash idéntico)
- [ ] Toda entidad listada en el resumen tiene ficha navegable; 3 gráficos correctos
- [ ] El toggle es/en cambia toda la UI y los textos de eventos
- [ ] Cero errores de consola; CI verde

**🔶 Decisiones:** curva de ritmo por era; qué queda explícitamente fuera de la rebanada.

**Riesgos:** que la rebanada crezca → cada sistema mínimo y con lista de "no hacer"; que la UI
neutra tiente a pulir → prohibido hasta P2.

---

### P2 — Dirección de diseño y Design System · M–L 🎨

**Objetivo:** decidir cómo se **siente** el producto (UI + lenguaje cartográfico) y compilarlo en
un Design System, para que toda pantalla futura se **arme** y no se invente. La rebanada se
re-viste con el DS.

**Prerrequisitos:** P1 cerrada (se diseña sobre renders reales del mapa).

#### Tareas

**P2.1 Investigación y anti-referencias**
- [ ] Moodboard de referencias:
  - cartografía histórica (atlas grabados, cartas náuticas, mapas topográficos suizos, cartografía de National Geographic);
  - Paradox, DF Legends, Civ VI;
  - visualización editorial de datos;
  - interfaces de instrumentos
- [ ] Lista de anti-referencias "AI slop" con ejemplos concretos (§15.5)
- [ ] Inventario de superficies de la UI y sus necesidades (densidad de datos, lectura larga, control en tiempo real)
- [ ] Salida: `docs/design/research.md`

**P2.2 Tres direcciones de diseño** 🎨
Cada dirección incluye:
- [ ] Concepto y narrativa (una frase + párrafo); semillas posibles (se definen en la fase):
  - "Cartógrafo grabado" (tinta, sepia, grabado del siglo XVIII);
  - "Observatorio" (instrumento científico, oscuro, preciso);
  - "Crónica iluminada" (manuscrito, pan de oro, rojo bermellón);
  - "Atlas moderno" (Swiss topo, tipografía suiza, colores planos)
- [ ] Paleta de UI + **paleta política** (N colores distinguibles) + rampas de modos de mapa (secuenciales y divergentes, aptas para daltonismo)
- [ ] Pareja tipográfica (fuentes OFL) para UI, lectura larga y rótulos del mapa
- [ ] Estilo de íconos y símbolos cartográficos
- [ ] Lenguaje del atlas (cómo se ve el mapa de lejos: relieve, fronteras, rótulos, decoración)
- [ ] Principios de movimiento
- [ ] Maquetas estáticas sobre renders reales:
  - vista en vivo a pantalla completa;
  - ficha de enciclopedia;
  - recorte del atlas;
  - panel del inspector con "por qué"
- [ ] Presentación lado a lado con pros/contras y mi recomendación

**P2.3 Elección** 🔶
- [ ] Elegís una dirección (o una mezcla explícita); se registra en `decisions.md`
- [ ] Nombre definitivo del proyecto (Q5) si encaja con la dirección

**P2.4 Tokens**
- [ ] Color: neutros, acentos, semánticos (éxito, alerta, error, info), estados
- [ ] **Generador de paleta política:** colores para N polities con distancia perceptual mínima; asignación por **coloreo del grafo** (vecinos con colores distintos); estable en el tiempo (un reino conserva su color)
- [ ] Rampas de modos de mapa validadas para daltonismo (protanopia, deuteranopia, tritanopia)
- [ ] Tipografía: escala, pesos, interlineados; jerarquía de rótulos del mapa por zoom
- [ ] Espaciado, radios, elevación, z-index, grosores de frontera por zoom
- [ ] Movimiento: duraciones y curvas; `prefers-reduced-motion`
- [ ] Validación programática de contraste AA de todos los pares permitidos (tabla documentada)

**P2.5 Componentes base (`packages/ui`)**
- [ ] Primitivos: Button, IconButton, Toggle, Slider, Select, Tabs, Tooltip, Popover, Dialog, Drawer/Panel, Card, Badge/Chip, Kbd, Toast, Skeleton, EmptyState, ErrorState, Breadcrumb, SearchField
- [ ] Datos: Table, VirtualList, StatBlock, **ModifierBreakdown** (el "por qué"), Legend, Sparkline
- [ ] Dominio:
  - TimeControls, Timeline (bandas de eras + marcadores), EventTickerItem;
  - EntityLink (con tarjeta al pasar el mouse), EntityHeader, MapModeSwitcher, MiniMap;
  - GenealogyNode;
  - **Emblem** (heráldica procedural por polity y casa)
- [ ] Todos los estados: hover, foco visible, activo, deshabilitado, cargando, error

**P2.6 Gráficos**
- [ ] Wrappers sobre uPlot (línea, área apilada, barras) con tokens del DS
- [ ] Reglas de visualización de datos (skill `dataviz`)

**P2.7 Íconos y símbolos**
- [ ] Set base (Lucide/Phosphor) ajustado al estilo
- [ ] Símbolos propios del mapa:
  - asentamientos por nivel;
  - capital, templo, puerto, ruina, maravilla;
  - batalla, sitio, ejército, flota, epidemia

**P2.8 Layout shell**
- [ ] Estructura de la vista en vivo (§13.2) y de las pantallas de resumen; breakpoints de escritorio (1280–2560)
- [ ] Mapa de atajos de teclado

**P2.9 Galería de componentes** 🎨
- [ ] Ladle (o Storybook) con cada componente × estado; 2 composiciones completas
- [ ] Desplegada en el preview gratuito

**P2.10 Documentación**
- [ ] `docs/design-system.md`:
  - tokens y reglas de uso;
  - guía cartográfica;
  - voz y microcopy es/en;
  - reglas de accesibilidad;
  - checklist anti-slop

**P2.11 Re-vestir la rebanada**
- [ ] Todas las pantallas de P1 migradas al DS (paridad funcional); el mapa usa los tokens cartográficos

**Skills:** `impeccable`, `frontend-design`, `design-system-generator`, `dataviz`.

**Entregables:** `docs/design/research.md`; maquetas de las 3 direcciones; elección registrada;
`packages/ui` v1; galería; `docs/design-system.md`; rebanada re-vestida.

**Criterios de salida:**
- [ ] Dirección elegida y registrada
- [ ] Contraste AA del 100% de los pares de texto documentados
- [ ] Paleta política: polities vecinas siempre distinguibles (test sobre 30 mundos)
- [ ] Galería completa, accesible por teclado, sin errores de axe
- [ ] Auditoría `impeccable` aprobada; checklist anti-slop cumplida
- [ ] Rebanada re-vestida sin regresiones (E2E verde)

**Riesgos:** diseñar en el vacío → maquetas sobre el mapa real; sobre-diseñar componentes → solo
lo que necesitan P3–P11.

---

### P3 — El planeta físico · L

**Objetivo:** un planeta creíble por procesos físicos, con provincias de fronteras naturales y
una génesis visible. Es la base de la que depende toda la mecánica (recursos, movimiento,
cultura).

**Prerrequisitos:** P2 cerrada (tokens cartográficos disponibles).

#### Tareas

**P3.1 Tectónica v2**
- [ ] Cantidad y tamaño de placas por tipo de mapa; continentales vs oceánicas con fracción controlada (tierra estable entre seeds)
- [ ] Vectores de deriva; clasificación de bordes (convergente, divergente, transformante)
- [ ] Perfiles de orogenia (ancho y altura por velocidad de convergencia y edad); fosas de subducción; arcos de islas; rifts y dorsales
- [ ] Puntos calientes con cadenas de islas volcánicas
- [ ] Registro de zonas volcánicas y sísmicas (las usa P10)

**P3.2 Erosión**
- [ ] Hidráulica (stream power o partículas) + térmica; sedimentación (llanuras aluviales, deltas)
- [ ] Intensidad según la edad del mundo
- [ ] Medir en TS → si excede el presupuesto: WASM (Rust) o WebGPU compute (ADR)

**P3.3 Clima v2**
- [ ] Temperatura: latitud + gradiente por altitud + continentalidad + corrientes costeras (cálidas/frías por banda y costa)
- [ ] Vientos dominantes por celda (alisios, del oeste, polares)
- [ ] Advección de humedad a lo largo del viento con ascenso orográfico y sombra de lluvia; ZCIT
- [ ] Estacionalidad (amplitud térmica y lluvia por estación)
- [ ] Parámetros: temperatura global, lluvia global

**P3.4 Biomas v2**
- [ ] Unas 14 clases (§12) por umbrales de temperatura y precipitación + estacionalidad + altitud
- [ ] Campo de densidad de vegetación (lo usan el render y la economía de la madera)
- [ ] Transiciones suaves (sin franjas horizontales literales)

**P3.5 Hidrología v2**
- [ ] Priority-flood, acumulación de caudal, orden de Strahler
- [ ] Lagos con nivel de salida; cuencas endorreicas (lagos salinos)
- [ ] Deltas y estuarios; navegabilidad por caudal; llanuras de inundación (fertilidad)

**P3.6 Suelos y fertilidad**
- [ ] Tipos de suelo por material de origen, clima y edad
- [ ] Fertilidad y laboreo (el arado pesado lo destraba en P5–P6)

**P3.7 Geología y recursos**
- [ ] Yacimientos por origen geológico (§12.7) con cantidad y accesibilidad
- [ ] Piedra, arcilla y madera desde terreno y vegetación

**P3.8 Especies domesticables**
- [ ] Catálogo de contenido: unas 20 especies silvestres arquetípicas (cereales tipo trigo/cebada/arroz/maíz/mijo, tubérculos, legumbres, vacunos, ovinos/caprinos, equinos, camélidos, cerdos, aves)
- [ ] Distribución por región según envolvente climática y continente, con azar sembrado; algunos continentes pobres en grandes mamíferos
- [ ] Atributos: dificultad de domesticación, rendimiento, uso (alimento, tracción, fibra, montura)

**P3.9 Deglaciación** (🔶 Q7)
- [ ] Curva del nivel del mar −120 m → 0 (12.000 → 5.000 a.C.)
- [ ] Provincias bajas marcadas con "año de inundación"; casquetes polares que se retraen
- [ ] El grafo de provincias cambia en esos años (evento "el mar cubre X"); los puentes de tierra se cierran

**P3.10 Provincias v2**
- [ ] Densidad de semillas ∝ habitabilidad; tamaños razonables (sin provincias gigantes ni microscópicas)
- [ ] Fronteras por costo mínimo (crestas y ríos caros) → siguen cordilleras y ríos
- [ ] Zonas marítimas costeras y oceánicas; estrechos
- [ ] Estadísticas estáticas por provincia (§10.1)
- [ ] Nombres geográficos placeholder (se reemplazan con idiomas en P4)

**P3.11 Parámetros y presets**
- [ ] Tipos de mapa (continentes, pangea, archipiélago, continentes chicos, mar interior, fractal) definidos en placas
- [ ] Validación anti-degenerados (fracción de tierra mín/máx, al menos N provincias habitables)

**P3.12 Génesis animada**
- [ ] El worldgen emite *stages* (placas → montañas → erosión → ríos → biomas → provincias)
- [ ] La UI los anima durante la generación (vista previa en `/crear`)

**P3.13 Render v2 (funcional, con tokens del DS)**
- [ ] Color por bioma con transiciones; sombreado de relieve
- [ ] Agua por batimetría; ríos por caudal; lagos
- [ ] Modo atlas con tokens cartográficos; rótulos de mares, cordilleras y regiones
- [ ] Modos de mapa: terreno, biomas, relieve

**P3.14 Salud geográfica**
- [ ] Suite sobre 30 seeds:
  - desiertos concentrados en ~20–35°; banda ecuatorial más húmeda;
  - ningún río cuesta arriba; todo río termina en mar o lago;
  - ≥ 70% de las cordilleras en bordes convergentes;
  - fracción de tierra dentro del parámetro;
  - distribución de tamaños de provincia;
  - conectividad
- [ ] Checklist visual contra referencias (sin franjas, sin gusanos, sin serrucho)

**Entregables:** worldgen completo; génesis; render v2; reporte de salud geográfica.

**Criterios de salida:**
- [ ] Todas las métricas de P3.14 en verde en ≥ 90% de los seeds
- [ ] Generación ≤ 20 s (mundo mediano)
- [ ] Revisión visual aprobada por vos (capturas de 6 seeds variados)
- [ ] Determinismo y golden actualizados

**Riesgos:** la erosión es cara → medir temprano y escapar a WASM; el clima "de manual" queda
artificial → validar contra mapas reales de precipitación.

---

### P4 — Gente y sustento · L

**Objetivo:** la base humana. Poblaciones mixtas (pops), demografía calibrada, modos de
subsistencia que nacen de la geografía, domesticación con varios focos neolíticos, culturas e
idiomas emergentes y asentamientos.

**Prerrequisitos:** P3 cerrada.

#### Tareas

**P4.1 Pops v2**
- [ ] Esquema completo (§10.2) en SoA
- [ ] Reglas de fusión y partición (pops similares se fusionan; tope por provincia) para acotar la cantidad
- [ ] Invariante: conservación de población salvo nacimientos y muertes (test de propiedades)

**P4.2 Demografía**
- [ ] Natalidad y mortalidad anuales por nutrición, carga de enfermedad, penalidad urbana (las ciudades como "sumidero" demográfico), guerra
- [ ] La capacidad emerge del alimento (sin K constante)
- [ ] Calibración: crecimiento de largo plazo ~0,04–0,1%/año con fluctuaciones

**P4.3 Modos de subsistencia**
- [ ] Forrajeo, pesca, pastoreo, horticultura, agricultura intensiva (arado, riego)
- [ ] Cada modo: uso de la tierra, trabajo, rendimiento por bioma y especies, movilidad (nómada/sedentario)
- [ ] Transiciones por especies disponibles + presión demográfica + conocimiento

**P4.4 Domesticación**
- [ ] Proceso de siglos por especie y región (silvestre → cultivada → domesticada)
- [ ] Difusión de domesticados por contacto, filtrada por envolvente climática
- [ ] Focos neolíticos independientes emergentes

**P4.5 Migración**
- [ ] Empuje (hambre, guerra, descontento) y atracción (tierra, ciudades)
- [ ] Costos por terreno; bandas nómadas; colonización de tierra vacía
- [ ] Pastores trashumantes (simplificado)

**P4.6 Estratos v1**
- [ ] Forrajeros, pastores, campesinos, artesanos, mercaderes, clero, élite guerrera
- [ ] La estratificación emerge con excedente y asentamientos; la servidumbre y la esclavitud como instituciones llegan en P7 (S3)

**P4.7 Cultura v2**
- [ ] Vector de 6 valores (marcial, mercantil, jerárquico↔igualitario, piadoso, xenófilo, marinero) derivado de subsistencia, entorno e historia
- [ ] Estilo arquitectónico (para P12) e idioma asignados
- [ ] Deriva y escisión por aislamiento y distancia cultural; mezcla por contacto y prestigio; familias y árbol de herencia

**P4.8 Idiomas (`packages/lang`)**
- [ ] Generador de fonología: inventario, estructura silábica, fonotáctica
- [ ] Morfología liviana: patrones de nombres personales, topónimos, títulos; sufijos por tipo
- [ ] Léxico de raíces para conceptos (río, montaña, ciudad, rey, dios, agua, sol…)
- [ ] Cambio fonético sistemático al separarse → idiomas hijos con parentesco reconocible
- [ ] Servicio de nombres (personas, lugares, polities, deidades, dinastías) + romanización
- [ ] Exónimos es/en ("Reino de X" / "Kingdom of X")
- [ ] Tests: determinismo; nombres pronunciables (reglas de fonotáctica); parentesco medible entre idiomas hijos

**P4.9 Asentamientos v2**
- [ ] Niveles por población urbana; fundación en sitios favorables (ríos, costas, cruces)
- [ ] Crecimiento, decadencia, ruinas y refundación; nombres desde el idioma local

**P4.10 Salud v1**
- [ ] Carga de enfermedad por densidad, clima tropical y animales domesticados (reservorio zoonótico)
- [ ] Epidemias básicas (SIR por provincia, contagio por adyacencia); la dinámica completa va en P10

**P4.11 UI funcional**
- [ ] Modos de mapa: densidad, cultura, familia lingüística, subsistencia
- [ ] Fichas: cultura (valores, idioma, árbol), idioma (muestras, familia), asentamiento (historia, población)
- [ ] Gráficos: población por región, urbanización, participación de cada subsistencia

**P4.12 Calibración**
- [ ] Población mundial vs. Apéndice A (escalada por superficie habitable)
- [ ] Distribución del inicio del neolítico; urbanización; tamaño de las mayores ciudades
- [ ] Suite de salud actualizada

**Criterios de salida:**
- [ ] Población dentro de bandas en ≥ 80% de 30 seeds
- [ ] 2–6 focos neolíticos independientes en el seed típico; continentes pobres en especies se atrasan
- [ ] Familias de idiomas coherentes con la geografía (vecinos emparentados, islas divergentes)
- [ ] Provincias mixtas (cultura y religión) observables; asimilación gradual
- [ ] Bench dentro del presupuesto con pops completos

**Riesgos:** explosión de cantidad de pops → fusión y topes; idiomas impronunciables → reglas de
fonotáctica + revisión tuya de muestras.

---

### P5 — Conocimiento · M

**Objetivo:** la tecnología como **grafo de innovaciones** que se inventan por necesidad y
condiciones, se difunden por contacto, dependen de materiales y entorno, y **se pierden**. Eras
regionales, no un reloj global.

**Prerrequisitos:** P4 cerrada.

#### Tareas

**P5.1 Grafo de innovaciones (contenido)**
- [ ] Unas 150 innovaciones en dominios:
  - subsistencia;
  - materiales y metalurgia;
  - construcción;
  - transporte;
  - navegación;
  - escritura y administración;
  - militar;
  - pensamiento e instituciones;
  - energía e industria
- [ ] Cada una con prerrequisitos, materiales (p. ej. bronce = cobre + estaño, propio o comerciado), entorno (navegación requiere costa), disparadores de necesidad, dificultad y efectos (modificadores y desbloqueos: edificios, métodos de producción, unidades, leyes, regímenes)
- [ ] Validación: grafo acíclico, sin huérfanos, todo efecto referencia algo que existe

**P5.2 Portadores del conocimiento** 🔶 (modelo)
- [ ] Recomendación: bitset de innovaciones conocidas por provincia + grado de adopción para las innovaciones de práctica
- [ ] Alternativa: conocimiento por comunidad (cultura × polity). Se decide en el BRIEF

**P5.3 Invención**
- [ ] Probabilidad anual ∝ especialistas, urbanización, alfabetización, instituciones, presión de necesidad, innovaciones relacionadas conocidas; ÷ dificultad
- [ ] Inventor como personaje cuando la innovación es mayor (evento con causas)

**P5.4 Difusión**
- [ ] Por adyacencia, flujos comerciales (volumen), conquista, migración, misiones
- [ ] Filtrada por prerrequisitos, acceso a materiales, apertura cultural y compatibilidad ambiental

**P5.5 Pérdida**
- [ ] Al colapsar los estratos especialistas, despoblarse o caer las instituciones
- [ ] **Efecto Tasmania:** poblaciones chicas y aisladas pierden técnicas complejas

**P5.6 Eras regionales**
- [ ] Neolítico, Calcolítico, Bronce, Hierro, Clásica, Medieval, Moderna temprana, Industrial: determinadas por el conjunto de innovaciones de cada región o polity
- [ ] Alimentan rótulos, estilos visuales (P12) y la crónica

**P5.7 Efectos cableados**
- [ ] Los efectos de las innovaciones entran por modificadores y desbloqueos en los sistemas existentes (y declaran hooks para los futuros)

**P5.8 UI funcional**
- [ ] Vista de grafo tecnológico con difusión en el tiempo
- [ ] Modos de mapa: era, "conoce X"
- [ ] Ficha de innovación: primer inventor, dónde y cuándo, mapa de difusión
- [ ] Gráfico de innovaciones por región

**P5.9 Calibración**
- [ ] Ventanas de fechas para escritura, bronce, hierro, moneda, papel, imprenta, pólvora, navegación oceánica y vapor (Apéndice A), con varianza
- [ ] Cantidad de invenciones independientes de hitos mayores

**Criterios de salida:**
- [ ] Hitos dentro de ventanas en ≥ 80% de los seeds; desigualdad regional visible
- [ ] Pérdida medible tras colapsos y en aislamiento
- [ ] Todo efecto de innovación es visible en el "por qué" del inspector

**Riesgos:** sobrecarga de contenido → se escribe por dominios, con prioridad a lo que tiene
efecto; calibración de fechas inestable → la suite de salud guía los ajustes.

---

### P6 — Economía · L

**Objetivo:** una economía real: bienes que se producen y consumen, mercados con precios,
rutas que transportan bienes y dejan ganancias, y moneda cuya oferta genera inflación.
Ganadores y perdedores del comercio.

**Prerrequisitos:** P5 cerrada.

#### Tareas

**P6.1 Bienes (contenido)**
- [ ] Unos 25 bienes en categorías:
  - alimento;
  - materias primas;
  - materiales;
  - lujo;
  - manufacturas;
  - militar;
  - metal monetario
- [ ] Atributos: valor base, perecibilidad, volumen (costo de transporte), sustitutos

**P6.2 Métodos de producción (contenido)**
- [ ] Por uso de la tierra y edificio: insumos → productos, trabajo por estrato, tecnología requerida
- [ ] Cadenas clave:
  - agricultura: roza y quema → arado ligero → arado pesado → rotación;
  - metalurgia: cobre → bronce → hierro de forja → alto horno → coque;
  - textiles: telar manual → rueca → mecanizado;
  - construcción;
  - astilleros

**P6.3 Producción**
- [ ] Recursos de la provincia × trabajo de los pops × método × infraestructura × clima del año
- [ ] Buffers de producción por provincia (los escribe solo `production`)

**P6.4 Demanda**
- [ ] Necesidades por estrato en niveles (subsistencia, básicas, confort, lujo) con sustitución
- [ ] Demanda del Estado (equipamiento, construcción, corte) como hook para P7 y P9

**P6.5 Mercados**
- [ ] Áreas de mercado: clusters de provincias bien conectadas (alrededor de nodos; se recalculan cuando cambia la conectividad)
- [ ] Formación de precios: ajuste iterativo con inercia según la razón oferta/demanda; acotado
- [ ] Stocks (graneros); hambruna cuando el precio del alimento supera la capacidad de compra

**P6.6 Rutas y comercio**
- [ ] Grafo de rutas entre mercados (tierra y mar) con costo por terreno, infraestructura y tecnología
- [ ] Flujos por arbitraje: diferencia de precio − transporte − peajes − riesgo (guerra, piratería)
- [ ] Ganancia para el estrato mercader; peajes para los estados (hook para P7)
- [ ] Rutas famosas con nombre propio ("Ruta de X") cuando superan un umbral de volumen y antigüedad

**P6.7 Moneda**
- [ ] Antes de acuñar: economía de bienes (grano, ganado, conchas); economías de templo
- [ ] Acuñación (innovación) → cecas por polity; contenido metálico (ley); oferta monetaria por mercado
- [ ] Nivel de precios ≈ cantidad de dinero vs. producción (MV≈PQ simplificado) → **inflación**
- [ ] Flujos de metal entre mercados por balanza comercial (drenaje de plata)
- [ ] Minas nuevas → oferta → inflación que se propaga por las rutas (efecto Potosí)
- [ ] El envilecimiento como mecanismo; la *decisión* de envilecer es de P7

**P6.8 Crisis económicas**
- [ ] Hambrunas por precio, disrupción de rutas por guerra, shocks monetarios
- [ ] Eventos con causas enlazadas

**P6.9 Ciudades y comercio**
- [ ] El crecimiento urbano responde a la centralidad de mercado y al ingreso comercial
- [ ] Hubs en cruces geográficos (estrechos, desembocaduras, oasis)

**P6.10 UI funcional**
- [ ] Modos de mapa: precio del bien X, flujos comerciales (líneas por volumen), áreas de mercado, riqueza
- [ ] Rutas visibles con marcadores animados simples (la versión bonita es P12)
- [ ] Fichas: bien (historia de precios, productores), mercado, ruta
- [ ] Gráficos: precios e inflación, volumen comercial

**P6.11 Calibración y rendimiento**
- [ ] Los precios responden a la escasez; episodios de inflación tras shocks monetarios; sin hiperinflación degenerada sin causa
- [ ] Hubs en cruces geográficos; distribución de riqueza plausible
- [ ] Costo del solver de mercados dentro del presupuesto

**Criterios de salida:**
- [ ] Sequía regional → suba de precio del grano medible + flujos de importación
- [ ] Nueva mina de plata → inflación medible en los mercados conectados
- [ ] Guerra que corta una ruta → caída de ingreso del hub afectado
- [ ] Bench dentro del presupuesto

**Riesgos:** inestabilidad numérica de los precios → inercia, cotas, tests de propiedades;
complejidad estilo Victoria 3 → máximo 25 bienes y cadenas cortas.

---

### P7 — Estado y poder · XL

**Objetivo:** cómo nacen los estados, quién manda y cómo cambia el poder.
- Casas y personajes con nivel de detalle.
- Vasallaje, estamentos y regímenes que emergen del equilibrio de poder y transicionan por
  eventos.
- Fisco, administración, legitimidad, facciones, intriga y matrimonios.

**Prerrequisitos:** P6 cerrada.

#### Tareas

**P7.1 Formación del estado**
- [ ] De jefatura a estado según:
  - excedente;
  - densidad;
  - **circunscripción ambiental** (valles rodeados de desierto o montaña: teoría de Carneiro);
  - conflicto;
  - gestión del riego
- [ ] Evento de formación con causas

**P7.2 Títulos y territorio**
- [ ] Jerarquía reino → gran feudo → feudo menor; creación y destrucción de títulos; capitales
- [ ] Reclamos (de facto + reclamos históricos, sin de jure complejo)

**P7.3 Casas y personajes (LOD)**
- [ ] Casas: fundador, ramas cadetes, prestigio, títulos
- [ ] Personajes completos:
  - rasgos (ambición, marcialidad, diplomacia, administración, erudición, piedad, crueldad, honor);
  - habilidades, edad, salud, fertilidad
- [ ] Registros livianos para el resto de la familia; reglas de promoción y degradación
- [ ] Ciclo de vida: nacimiento, matrimonio, muerte (edad, enfermedad, batalla, asesinato)
- [ ] Nombres desde el idioma de la casa
- [ ] Presupuesto: ≤ 3.000 personajes completos vivos en el mundo mediano

**P7.4 Sucesión**
- [ ] Leyes:
  - primogenitura;
  - partible;
  - electiva;
  - tanistría;
  - designación imperial;
  - elección republicana
- [ ] Crisis sucesorias, pretendientes, regencias (herederos menores)

**P7.5 Vasallaje**
- [ ] Contratos: impuesto, levas, autonomía
- [ ] Opinión con modificadores con fuente; relación de poder
- [ ] Vasallos leales o conspiradores; uniones personales; estados tributarios

**P7.6 Estamentos**
- [ ] Nobleza, clero, mercaderes, campesinado (y burguesía/obreros desde P10)
- [ ] Poder = tamaño + riqueza (P6) + organización de sus pops + privilegios institucionales
- [ ] Demandas (leyes, privilegios) y satisfacción

**P7.7 Régimen institucional**
- [ ] Estructura del régimen:
  - fuente de autoridad (tribal, divina, hereditaria, electiva, burocrática);
  - distribución del poder (gobernante vs estamentos);
  - tenencia de la tierra (clanes, feudos hereditarios, gobernadores designados, familias patricias)
- [ ] La **etiqueta se deriva de la estructura** (jefatura tribal, monarquía feudal, imperio burocrático, ciudad-estado oligárquica, república mercantil, teocracia, monarquía absoluta, monarquía constitucional…), nunca al revés

**P7.8 Transiciones de régimen**
- [ ] Tipos:
  - reforma centralizadora (escritura + caminos + tesoro);
  - usurpación;
  - revolución (poder de estamentos vs gobernante);
  - imposición por conquista;
  - toma religiosa (hook P8);
  - colapso
- [ ] Condiciones + tirada sembrada; cada transición registra causas

**P7.9 Administración y control**
- [ ] Capacidad administrativa (burócratas, escritura, caminos, comunicaciones) vs. demanda (provincias × distancia efectiva a la capital)
- [ ] Control por provincia → recaudación, descontento; la sobreextensión emerge sola

**P7.10 Fisco**
- [ ] Impuestos (tierra, capitación, peajes de P6, tributo); arrendamiento de impuestos vs burocracia (eficiencia)
- [ ] Gastos: corte, ejército (hook P9), edificios, administración
- [ ] Deuda con casas mercantiles y bancos (tras la banca); tasas (hook doctrina de usura P8); **bancarrota** y consecuencias
- [ ] **Decisión de envilecer la moneda** bajo déficit → inflación (P6)

**P7.11 Legitimidad y estabilidad**
- [ ] Modificadores con fuente; efecto sobre revueltas, facciones y sucesión

**P7.12 Facciones y guerras civiles**
- [ ] Formación por agravios y poder; ultimátum; guerra civil (polity rebelde temporal); resoluciones

**P7.13 Planes de intriga**
- [ ] Tipos: usurpar, asesinar, fabricar reclamo, alianza matrimonial
- [ ] Progreso en años; descubrimiento y consecuencias

**P7.14 Matrimonios**
- [ ] IA de matrimonios entre casas (alianza, reclamos, prestigio)
- [ ] Herencia cruzada → uniones personales

**P7.15 Servidumbre y esclavitud (S3)**
- [ ] Como instituciones y estratos (leyes, origen por conquista o deuda, abolición posible), con tratamiento sobrio

**P7.16 UI funcional** 🎨 (árbol genealógico y ficha de reino)
- [ ] Modos de mapa: jerarquía de vasallos, régimen, estabilidad, control
- [ ] Fichas:
  - reino: línea de tiempo de régimen, gobernantes, leyes, presupuesto;
  - casa: árbol genealógico;
  - personaje: biografía generada
- [ ] Inspector con "por qué" de estabilidad, legitimidad y opinión de vasallos

**P7.17 Calibración y rendimiento**
- [ ] Diversidad de regímenes; transiciones con causas
- [ ] Duración de dinastías; frecuencia de guerras civiles; fragmentación no degenerada
- [ ] Presupuesto de personajes respetado

**Criterios de salida:**
- [ ] ≥ 3 regímenes distintos coexistiendo en 1500 d.C. en ≥ 80% de los seeds
- [ ] El 100% de las transiciones de régimen tiene cadena causal visible en la ficha
- [ ] Dinastías de ≥ 5 generaciones observables
- [ ] Una secesión cualquiera es explicable desde el inspector sin leer código

**Riesgos:**
- La fase más grande → BRIEF con sub-hitos (P7a formación+títulos+casas, P7b estamentos+régimen+fisco, P7c facciones+intriga+matrimonios) y checkpoints con vos.
- Explosión de personajes → nivel de detalle.

---

### P8 — Fe · M

**Objetivo:** religiones que nacen del entorno y de la historia, con doctrinas que cambian el
comportamiento de otros sistemas. Unen y dividen culturas, se difunden por rutas y conquistas, y
se fracturan.

**Prerrequisitos:** P7 cerrada.

#### Tareas

**P8.1 Modelo de religión v2**
- [ ] Doctrinas (pool de contenido, cada una con efecto mecánico), panteón, organización del clero, cabeza de la fe, sitios sagrados, linaje

**P8.2 Origen**
- [ ] Religiones populares por cultura derivadas del entorno:
  - dioses del cielo en pastores;
  - fertilidad y tierra en agricultores;
  - mar en marinos;
  - sol en zonas áridas;
  - ancestros en todas
- [ ] Politeísmos organizados cuando hay ciudades, templos y sacerdocio

**P8.3 Profetas y nuevas fes**
- [ ] Fundaciones en épocas de crisis o cambio social (urbanización, imperios, desigualdad): una "era axial" emergente
- [ ] Profeta como personaje; doctrina derivada del contexto (reacción a la fe existente)

**P8.4 Difusión y conversión**
- [ ] Misiones por rutas; conversión por conquista y política estatal; sincretismo
- [ ] La conversión como flujo en los pops (con fervor)

**P8.5 Instituciones religiosas**
- [ ] Clero como estamento (P7); economías de templo (tierra y riqueza)
- [ ] Relación con el Estado (iglesia de estado, teocracia, separación)

**P8.6 Sitios sagrados y peregrinación**
- [ ] Ciudades santas y templos mayores
- [ ] La peregrinación genera flujos (comercio, prestigio)
- [ ] El control de un sitio afecta la legitimidad y da casus belli (hook P9)

**P8.7 Cismas, herejías y reformas**
- [ ] Disparadores: deriva doctrinal por distancia, riqueza del clero, divisiones políticas
- [ ] Linaje registrado

**P8.8 Efectos cruzados**
- [ ] Unidad (opinión y alianzas por fe compartida)
- [ ] Legitimidad (derecho divino)
- [ ] Economía (usura → tasas; prohibiciones alimentarias → demanda)
- [ ] Guerra (guerra santa, pacifismo)

**P8.9 UI funcional**
- [ ] Modo de mapa religión (mayoría y diversidad)
- [ ] Ficha de religión: doctrinas, linaje, sitios sagrados, expansión animada
- [ ] Árbol de linajes; panteón

**P8.10 Calibración**
- [ ] Pocas fes grandes y muchas locales
- [ ] El mapa religioso no calca el político
- [ ] Existen linajes de cismas

**Criterios de salida:**
- [ ] Cada doctrina tiene al menos un efecto observable en el "por qué" de otro sistema
- [ ] En ≥ 80% de los seeds hay ≥ 1 fe trans-estatal y ≥ 1 cisma con linaje

**Riesgos:** religiones que homogeneizan todo → fricción de conversión y resistencia
institucional; doctrinas cosméticas → regla "sin efecto, no entra".

---

### P9 — Guerra y diplomacia · XL

**Objetivo:** guerras con causas, objetivos, ejércitos que marchan con logística, batallas y
sitios con nombre, y tratados con términos. Diplomacia con memoria. IA que persigue agendas de
varios años sin favorecer la belicosidad.

**Prerrequisitos:** P8 cerrada.

#### Tareas

**P9.1 Composición militar por era (contenido)**
- [ ] Tipos de unidad con stats, equipamiento (bienes de P6) y mantenimiento:
  - levas, partidas guerreras, carros;
  - infantería pesada, infantería profesional;
  - caballería, arqueros a caballo, caballeros;
  - piqueros, mosqueteros, artillería, infantería de línea

**P9.2 Reclutamiento**
- [ ] Mano de obra desde los pops (por estrato); levas de vasallos según contrato (P7); ejércitos profesionales pagados (P7)
- [ ] **Costo económico de movilizar** (trabajo que sale de la producción)

**P9.3 Movimiento y logística**
- [ ] Sub-pasos estacionales; A* sobre el grafo de provincias
- [ ] Suministro (capacidad de forrajeo por provincia y estación; líneas)
- [ ] Desgaste (desierto, invierno, montaña, enfermedad)
- [ ] Transporte naval

**P9.4 Batallas**
- [ ] Enfrentamiento al encontrarse ejércitos
- [ ] Resolución tipo Lanchester con terreno, general, moral, composición (ventajas cruzadas) y azar acotado
- [ ] Bajas; persecución; generales muertos o capturados
- [ ] Nombre por lugar ("Batalla de X")

**P9.5 Sitios**
- [ ] Fortificaciones por nivel; duración; asalto vs hambre
- [ ] Saqueo: pérdida de población, conocimiento y riqueza → eventos

**P9.6 Flotas**
- [ ] Galeras, cocas, carracas, navíos de línea
- [ ] Batallas navales simplificadas; bloqueos; piratería que afecta rutas (P6)

**P9.7 Guerras**
- [ ] Entidad guerra: bandos, objetivos (reclamo, sometimiento, guerra santa, independencia, sucesión, control comercial, saqueo)
- [ ] Puntaje de guerra (batallas, ocupación, bloqueos, objetivos), cansancio, llamado a aliados

**P9.8 Paz y tratados**
- [ ] Negociación; términos (cesiones, tributo, vasallaje, reparaciones, liberación, tregua de N años)
- [ ] Cumplimiento; romper tratados cuesta reputación

**P9.9 Diplomacia**
- [ ] Relaciones con memoria (opinión con fuentes, confianza, agravios que decaen)
- [ ] Tratados: no agresión, alianzas, comercio, matrimonio (P7), tributo
- [ ] Coaliciones contra el hegemón; reputación por expansión agresiva

**P9.10 IA de agenda**
- [ ] Objetivos estratégicos de varios años con prioridades según rasgos del gobernante, estamentos y situación:
  - expandirse (selección de objetivo por valor, factibilidad y reclamos);
  - asegurar rutas;
  - defenderse;
  - recuperar un sitio sagrado;
  - consolidar;
  - reformar
- [ ] Asignación de presupuesto (ejército vs edificios vs corte)
- [ ] Planificación de guerra: elegir objetivo, aliarse primero, preparar ejército
- [ ] **Principio:** la guerra tiene costo real y no está favorecida; las potencias mercantiles y defensivas deben poder prevalecer

**P9.11 Nómadas de la estepa**
- [ ] Confederaciones pastoriles que emergen de caballo + pastoreo + estepa
- [ ] Saqueos sobre estados sedentarios (patrón histórico)

**P9.12 UI funcional**
- [ ] Marcadores de ejércitos y flotas en movimiento; batallas y sitios; frentes
- [ ] Modos de mapa: ocupación, alianzas
- [ ] Fichas: guerra (causas, bandos, línea de tiempo con mapa, tratado), batalla, general

**P9.13 Calibración y rendimiento**
- [ ] Sin hegemón universal en 30 seeds; perfiles de potencias longevas diversos
- [ ] Frecuencia de guerras por era y bajas plausibles
- [ ] Presupuesto de ejércitos simultáneos

**Criterios de salida:**
- [ ] 0 hegemones universales en 30 seeds; ≥ 1 potencia longeva no conquistadora en ≥ 70% de los seeds
- [ ] Toda guerra tiene causa, objetivo y desenlace legibles en su ficha
- [ ] Logística visible: ejércitos que pierden fuerza cruzando un desierto o en invierno
- [ ] Bench dentro del presupuesto con guerras activas

**Riesgos:**
- El sub-paso estacional es caro → solo donde hay guerra activa.
- La IA de agenda es compleja → sub-hitos (P9a ejércitos+batallas, P9b guerras+tratados, P9c diplomacia+agenda) y checkpoints.

---

### P10 — Auge, caída y modernidad · L

**Objetivo:** las dinámicas sistémicas que hacen que la historia "respire" (shocks, epidemias,
colapsos y renacimientos) y el cierre del arco: exploración oceánica, contacto entre continentes
e industrialización temprana.

**Prerrequisitos:** P9 cerrada.

#### Tareas

**P10.1 Clima dinámico**
- [ ] Ciclos de décadas y siglos (óptimos y pequeñas edades de hielo)
- [ ] Inviernos volcánicos por erupciones en zonas volcánicas reales del worldgen (P3.1)
- [ ] Sequías e inundaciones regionales

**P10.2 Epidemias v2**
- [ ] Agentes generados (transmisibilidad, letalidad, inmunidad, reservorio de origen)
- [ ] Contagio por rutas comerciales, ejércitos y peregrinos; estacionalidad
- [ ] Memoria inmunitaria por población
- [ ] **"Suelo virgen":** catástrofes cuando se conectan continentes aislados
- [ ] Nombres de plagas

**P10.3 Cascadas de colapso**
- [ ] Detección sistémica: crisis fiscal + envilecimiento + revueltas + shock + invasión → colapso
- [ ] Efectos: fragmentación, despoblación, pérdida de conocimiento, disrupción comercial
- [ ] Métricas de edad oscura; recuperación y renacimiento

**P10.4 Medio ambiente**
- [ ] Agotamiento de suelos; deforestación por demanda de madera; salinización por riego; recuperación

**P10.5 Navegación oceánica y exploración**
- [ ] Rutas de mar abierto destrabadas por tecnología
- [ ] Agenda de exploración (buscar bienes, rodear bloqueos); eventos de primer contacto

**P10.6 Colonización**
- [ ] Asentamientos de ultramar; administración colonial; extracción (plata → inflación P6); migración
- [ ] Impacto en poblaciones locales (epidemias, conquista) con tratamiento sobrio

**P10.7 Industrialización temprana**
- [ ] Condiciones: carbón + hierro + capital + conocimiento + costo del trabajo + instituciones
- [ ] Métodos de producción fabriles; vapor
- [ ] **Ferrocarril:** revoluciona el costo de movimiento; se ve en el mapa
- [ ] **Telégrafo:** salto de capacidad administrativa
- [ ] Inicio de la transición demográfica; urbanización acelerada
- [ ] Estratos obreros y burguesía → presión política (revoluciones, constitucionalismo; P7)

**P10.8 Fin de la corrida (S1)**
- [ ] Condición de fin por año (configurable); snapshot final para el resumen; estadísticas de epílogo

**P10.9 UI funcional**
- [ ] Modos de mapa: clima, epidemias
- [ ] Fichas: epidemia, colapso (**vista de cadena causal**), viajes de exploración, red ferroviaria

**P10.10 Calibración**
- [ ] ≥ 1 ciclo auge-caída por mundo; contacto intercontinental en mundos con continentes separados
- [ ] Ubicación plausible de la industria; salto poblacional post-industrial

**Criterios de salida:**
- [ ] Todo colapso tiene una cadena causal de ≥ 3 eslabones visible
- [ ] Una epidemia de "suelo virgen" ocurre en ≥ 60% de los seeds con primer contacto
- [ ] La industrialización aparece solo donde se dan sus condiciones (test sobre 30 seeds)

**Riesgos:** colapsos demasiado frecuentes o raros → calibración contra la suite; modernidad
superficial → priorizar ferrocarril y telégrafo (efectos sistémicos) sobre la cantidad de
tecnologías.

---

### P11 — Memoria y relato · L

**Objetivo:** que la historia del mundo se pueda **recorrer y contar**. Enciclopedia completa,
atlas histórico, árboles, estadísticas, crónica procedural (+ LLM BYOK opcional) y modo
director. La base existe desde P1 y cada fase agregó fichas; acá se completa y se integra.

**Prerrequisitos:** P10 cerrada.

#### Tareas

**P11.1 Significancia v2 y episodios**
- [ ] Modelo de significancia: impacto en población, territorio, riqueza, vidas, longevidad, novedad
- [ ] Agrupación jerárquica: batalla ⊂ campaña ⊂ guerra ⊂ era regional
- [ ] Segmentación y nombre de eras regionales ("Era de los Tres Reinos de X")

**P11.2 Enciclopedia completa** 🎨
- [ ] Plantillas por tipo de entidad:
  - párrafo de resumen generado;
  - infobox, línea de tiempo;
  - entidades relacionadas;
  - recorte de mapa, gráficos
- [ ] Búsqueda en el cliente (MiniSearch); ranking por era (top-N)
- [ ] Modo "a la fecha Y": cada ficha muestra el estado en ese año
- [ ] Enlaces cruzados validados (sin huérfanos ni enlaces rotos)

**P11.3 Atlas histórico** 🎨
- [ ] Mapa en cualquier año con todas las capas; animación de fronteras; comparar dos años
- [ ] Exportar imagen

**P11.4 Árboles** 🎨
- [ ] Dinastías (genealogía con matrimonios)
- [ ] Linajes religiosos; familias de idiomas (cladograma); linaje cultural
- [ ] Difusión tecnológica (grafo con fechas y lugares)

**P11.5 Estadísticas (ledger)** 🎨
- [ ] Gráficos mundiales y por entidad; rankings; comparaciones; reglas `dataviz`

**P11.6 Crónica procedural**
- [ ] Narrativa por eras en es/en con gramáticas sobre hechos rankeados
- [ ] Variación de tono por cultura; sin relleno (cada frase cita hechos)

**P11.7 LLM BYOK opcional** (🔶 Q8)
- [ ] Ajustes: pegar la clave (se guarda solo en el navegador) con advertencia clara; apagado por defecto
- [ ] Prompt con el top-N de hechos por era; streaming; caché por mundo en IndexedDB
- [ ] Estimación de costo antes de ejecutar; fallback procedural siempre
- [ ] Nada sale del navegador salvo los hechos hacia la API de Anthropic

**P11.8 Modo director (funcional)**
- [ ] La cámara sigue el evento más significativo; pausa automática ante eventos mayores (configurable)

**P11.9 Pantalla de resumen final** 🎨
- [ ] Panorama: números clave, top de reinos, figuras, religiones y guerras, mapa final, accesos a todo lo demás

**P11.10 QA**
- [ ] Rendimiento: índice para ~100k eventos; navegación fluida
- [ ] Accesibilidad de lectura larga; sin enlaces rotos

**Criterios de salida:**
- [ ] Toda entidad del mundo tiene ficha, aparece en la búsqueda y enlaza sus relaciones
- [ ] El atlas muestra cualquier año en ≤ 500 ms
- [ ] La crónica procedural cubre todas las eras con hechos concretos (revisión tuya de 3 mundos)
- [ ] LLM BYOK funciona con tu clave y degrada bien sin ella

**Riesgos:** volumen de datos en el cliente → índices perezosos y virtualización; crónica
repetitiva → gramáticas con variación + ranking estricto.

---

### P12 — Inmersión visual · XL

**Objetivo:** el "frontend lindo" (D23). El mapa pasa de funcional a **inmersivo**: terreno de
calidad, agua, vegetación, ciudades que cambian por era y cultura, paisaje humano, vida y
atmósfera, coherentes con la dirección de diseño de P2.

**Prerrequisitos:** P11 cerrada.

#### Tareas

**P12.1 Dirección de arte 3D** 🎨
- [ ] Style frames (3–4 escenas) coherentes con la dirección de P2: iluminación, gradación de color, niveles de detalle
- [ ] Shortlist de assets CC0 + manifiesto de licencias

**P12.2 Terreno de calidad**
- [ ] LOD por CDLOD o clipmaps
- [ ] Splatting PBR con unos 8 materiales CC0; triplanar en acantilados
- [ ] Variación macro y micro; normales y AO desde el heightmap; mapas de detalle de erosión

**P12.3 Agua**
- [ ] Océano: color por profundidad, olas por normales, espuma costera, fresnel
- [ ] Ríos como mallas con flujo; lagos; hielo

**P12.4 Vegetación**
- [ ] Bosques instanciados por bioma (impostores a distancia) según el campo de vegetación
- [ ] **Deforestación y campos de cultivo dinámicos**

**P12.5 Asentamientos procedurales**
- [ ] Kits de edificios por **era × estilo arquitectónico cultural** (CC0, con variantes y recoloreo)
- [ ] Generador de trazado: aldea orgánica → villa amurallada → ciudad en grilla
- [ ] Tamaño ∝ población; templos, palacios, maravillas, puertos, murallas, ruinas

**P12.6 Paisaje humano**
- [ ] Parcelas de cultivo (patrones por cultura y era)
- [ ] Caminos por uso de rutas; puentes; minas; canales; ferrocarriles

**P12.7 Vida**
- [ ] Caravanas y barcos por era
- [ ] Ejércitos con estandartes y marcha
- [ ] Humo, incendios en sitios, tinte de epidemia, efectos de batalla sutiles

**P12.8 Atmósfera**
- [ ] Cielo, niebla de distancia, sombras de nubes, luz consistente; tinte estacional opcional

**P12.9 Atlas de alta calidad**
- [ ] Sombreado pintado, rótulos curvos con la tipografía del DS
- [ ] Nombres de reinos en arco
- [ ] Elementos decorativos según la dirección (rosa de los vientos, cartela)

**P12.10 Transiciones**
- [ ] Fundido del zoom semántico; señales visuales de cambio de era

**P12.11 Movimiento de UI**
- [ ] Animaciones con los tokens del DS; `prefers-reduced-motion`

**P12.12 Rendimiento visual**
- [ ] Presupuestos de GPU; ajuste de LOD
- [ ] Presets de calidad (alta, media, baja) con detección automática; monitor de fps en modo dev

**Criterios de salida:**
- [ ] ≥ 60 fps promedio en calidad alta y ≥ 45 fps en p5 (M-series); calidad baja usable en GPUs integradas viejas
- [ ] Revisión visual tuya contra los style frames aprobada
- [ ] Manifiesto de licencias completo (100% CC0/OFL/MIT/ISC)
- [ ] Las ciudades se distinguen por era y cultura a simple vista (test ciego con 6 capturas)

**Riesgos:** inconsistencia entre packs CC0 → dirección de arte + recoloreo + preferencia por
procedural; caída de rendimiento → presets y LOD agresivo.

---

### P13 — Publicación · M

**Objetivo:** salir al mundo: links y galería, landing y página técnica para el portfolio,
onboarding, accesibilidad, rendimiento final y compatibilidad.

**Prerrequisitos:** P12 cerrada.

#### Tareas

**P13.1 Compartir v2**
- [ ] URL con seed + parámetros + versión; importar `.wsim` arrastrando el archivo
- [ ] Galería de mundos destacados (Q12): `.wsim` estáticos en el deploy (≤ 25 MiB cada uno)
- [ ] Imagen OG por mundo destacado

**P13.2 Versionado del motor**
- [ ] Estrategia para links de versiones viejas: builds anteriores desplegadas en rutas versionadas, o aviso + "re-simular con la versión actual" (🔶)

**P13.3 Landing** 🎨
- [ ] Mundo destacado corriendo de fondo; propuesta en una frase; CTAs

**P13.4 "Cómo funciona"** 🎨 (Q14)
- [ ] Explicación técnica con diagramas: arquitectura, worldgen, simulación, determinismo, calibración

**P13.5 Onboarding**
- [ ] Primer uso guiado; tooltips; glosario

**P13.6 i18n completo**
- [ ] Auditoría de strings; formatos de fechas a.C./d.C. y BC/AD; números y unidades

**P13.7 Accesibilidad**
- [ ] Teclado completo; contraste; lector de pantalla en paneles y enciclopedia
- [ ] Movimiento reducido; modos de mapa aptos para daltonismo

**P13.8 Rendimiento final**
- [ ] Presupuestos de bundle; code splitting; streaming de assets (KTX2); caché
- [ ] Lighthouse en landing y resumen

**P13.9 Compatibilidad**
- [ ] Matriz Chrome, Edge, Safari, Firefox (incluido el fallback WebGL2)

**P13.10 Observabilidad opcional** (Q9, Q10)
- [ ] Cloudflare Web Analytics y/o Sentry gratis, sin cookies

**P13.11 Legal y licencias**
- [ ] Página de créditos y licencias (assets, fuentes)
- [ ] Nota de privacidad (sin tracking o sin cookies)
- [ ] Advertencia BYOK

**P13.12 Lanzamiento**
- [ ] Checklist de lanzamiento; capturas y video de presentación
- [ ] Verificación final de costo cero

**Criterios de salida:**
- [ ] Lighthouse ≥ 90 performance y ≥ 95 accesibilidad en landing y resumen
- [ ] Matriz de navegadores verde
- [ ] Un visitante sin contexto entiende y disfruta un mundo destacado en < 1 min (prueba con 2 personas)
- [ ] Costo fijo: USD 0 verificado

---

## 17. Registro de riesgos

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | Alcance enorme; el proyecto no termina | A | A | Rebanada vertical; fases con gate; sub-hitos en P7/P9; "sin efecto, no entra" |
| R2 | Rendimiento del motor en TS | M | A | Orientado a datos; scheduler multi-frecuencia; nivel de detalle de personajes; bench en CI; escape a WASM |
| R3 | Simulación degenerada o incalibrable | M | A | Pocos sistemas profundos; modificadores trazables; suite de salud multi-seed; curvas de referencia |
| R4 | Determinismo roto entre navegadores | M | A | Math propia; RNG por contador; test de hash por año en 3 navegadores |
| R5 | Acoplamiento entre sistemas (el error del proyecto anterior) | M | A | Regla de escritor único; contratos verificados; buffers de flujo explícitos |
| R6 | Calidad visual insuficiente con CC0 | M | M | Dirección de arte; procedural; recoloreo; style frames aprobados |
| R7 | WebGPU inestable en algún navegador | M | M | Fallback WebGL2 y matriz de compatibilidad |
| R8 | Archivos de historia grandes | M | M | Deltas, keyframes espaciados, compresión; presupuesto de 20 MB |
| R9 | Límites gratuitos cambian | B | M | Plan B por servicio (§7); verificación en P0 y P13 |
| R10 | Contenido (innovaciones, bienes, doctrinas) consume demasiado | M | M | Contenido como datos con validación; prioridad a lo que tiene efecto |
| R11 | Recalibraciones constantes del golden | B | M | Streams de RNG estables; la salud estadística es la calibración, el golden solo regresión |
| R12 | Continuidad entre sesiones de Claude | M | M | `CLAUDE.md`, `STATUS.md` con handoff obligatorio, prompts de fase, LEARNINGS |
| R13 | UI incoherente al crecer | M | M | DS en P2; mock-first; auditoría por fase |
| R14 | El usuario no participa a tiempo de una decisión | B | M | Freno solo lo afectado y sigo con el resto; decisiones agrupadas en el BRIEF |
| R15 | Temas sensibles mal tratados | B | A | S3: tratamiento sistémico y sobrio; revisión tuya de textos de eventos sensibles |

---

## 18. Roadmap futuro (se construye cuando se cumple su condición)

| Ítem | Condición |
|---|---|
| Ramas "qué hubiera pasado" (continuar desde un año pasado) | v1 publicada y estable |
| Modo dios (provocar eventos) | Demanda de usuarios después del lanzamiento |
| Jugar una nación | Decisión explícita de convertir el producto en juego |
| Mobile | Métricas de visitas mobile significativas |
| Globo esférico | v1 estable + interés en mejora de realismo |
| Audio ambiental CC0 | P12 terminada y pedido explícito |
| Mods / packs de contenido | Contenido estable en formato de datos + interés de la comunidad |
| Eras posteriores a 1900 | v1 estable; nuevo plan propio |
| Galería en la nube con cuentas | Demanda real de compartir; solo con tier gratuito (D24) |
| Editor manual de mapas | Pedido de usuarios |

---

## Apéndice A — Curvas de referencia (calibración)

Se escalan por la **superficie habitable** del mundo relativa a la Tierra. Las bandas son
amplias a propósito: "forma real con variación" (D12).

**Población mundial** (estimaciones de órdenes de magnitud):

| Año | Tierra (aprox.) | Banda aceptable (escalada) |
|---|---|---|
| 10.000 a.C. | ~4 M | 1–10 M |
| 5.000 a.C. | ~5–20 M | 3–30 M |
| 3.000 a.C. | ~15–45 M | 8–60 M |
| 1.000 a.C. | ~50 M | 25–100 M |
| 1 d.C. | ~170–300 M | 100–400 M |
| 1000 d.C. | ~250–320 M | 150–450 M |
| 1500 d.C. | ~425–500 M | 250–700 M |
| 1800 d.C. | ~900 M–1.000 M | 500 M–1.400 M |
| 1900 d.C. | ~1.600 M | 900 M–2.200 M |

**Urbanización:** <1% (3000 a.C.) → ~4–5% (1 d.C.) → ~5–7% (1500) → ~7% (1800) → ~15% (1900).

**Mayor ciudad:**

| Año | Tamaño | Referencia |
|---|---|---|
| 3000 a.C. | ~40k | Uruk |
| 600 a.C. | ~200k | Babilonia |
| 1 d.C. | ~1 M | Roma |
| 1000 d.C. | ~1 M | Bagdad / Kaifeng |
| 1800 d.C. | ~1 M | Londres / Pekín |
| 1900 d.C. | ~6,5 M | Londres |

**Hitos (primer caso mundial; ventanas tolerantes):**

| Hito | Tierra | Ventana aceptable |
|---|---|---|
| Domesticación de cereales | ~9500 a.C. | 11.000–6.000 a.C. |
| Primeras ciudades | ~4000 a.C. | 5500–2500 a.C. |
| Escritura | ~3200 a.C. | 4500–1500 a.C. |
| Bronce | ~3300 a.C. | 4500–2000 a.C. |
| Hierro | ~1200 a.C. | 2000 a.C.–200 d.C. |
| Moneda acuñada | ~600 a.C. | 1500 a.C.–500 d.C. |
| Imprenta (tipos móviles) | ~1040 / ~1450 | 500–1700 d.C. |
| Pólvora | ~900 d.C. | 300–1500 d.C. |
| Navegación oceánica | ~1400 d.C. | 900–1700 d.C. |
| Máquina de vapor | ~1712 d.C. | 1500–1880 d.C. |
| Ferrocarril | ~1825 d.C. | 1650–1900 d.C. o nunca |

**Invariantes de salud** (todas las fases desde la que corresponda):
- sin hegemón universal;
- rotación de potencias;
- ≥ 1 ciclo auge-caída;
- mapa religioso ≠ político;
- focos neolíticos múltiples;
- desigualdad regional de tecnología;
- ningún seed sin estados al año 1 d.C. (salvo mundos extremos marcados).

---

## Apéndice B — Glosario

| Término | Significado |
|---|---|
| **Provincia** | Unidad territorial de la simulación (~1.500 por mundo), con fronteras naturales |
| **Pop** | Bloque de población homogéneo: tamaño × cultura × religión × estrato, dentro de una provincia |
| **Estrato** | Posición económica de un pop (forrajeros, campesinos, artesanos, mercaderes, clero, élite…) |
| **Estamento** | Grupo de interés político que agrega estratos (nobleza, clero, mercaderes, campesinado…) |
| **Régimen** | Estructura de gobierno (autoridad, distribución del poder, tenencia de la tierra); su etiqueta se deriva |
| **Polity** | Entidad política (jefatura, reino, imperio, república…) |
| **Casa** | Linaje dinástico; unidad de la política interna |
| **LOD de personajes** | Nivel de detalle: completo para quien importa, registro liviano para el resto |
| **Modificador** | Efecto con fuente y vencimiento sobre un stat; base del "por qué" |
| **Contrato** | Declaración de qué lee, escribe y emite un sistema |
| **Escritor único** | Regla: cada campo del estado tiene un solo sistema que lo escribe |
| **Stream de RNG** | Secuencia aleatoria independiente por sistema, derivada de un contador |
| **Keyframe / delta** | Estado completo cada 100 años / cambios anuales; permiten rebobinar |
| **Significancia** | Puntaje de importancia de un evento; decide qué se muestra y se cuenta |
| **Salud histórica** | Suite estadística multi-seed contra curvas e invariantes |
| **BYOK** | "Bring your own key": el usuario usa su propia clave de API |

---

## Apéndice C — Mapa de documentos

```
CLAUDE.md                     puerta de entrada (se carga sola en cada sesión)
docs/
├─ DEVELOPMENT_PLAN.md        este plan
├─ STATUS.md                  dónde estamos, qué sigue, handoff de la última sesión
├─ decisions.md               log append-only de decisiones (D#) y aprobaciones de fase
├─ LEARNINGS.md               errores y fricciones a no repetir
├─ model.md                   modelo de dominio, red causal, contratos, invariantes (desde P0)
├─ design-system.md           DS: tokens, reglas, cartografía, voz, anti-slop (desde P2)
├─ adr/ADR-NNN-*.md           decisiones de arquitectura
├─ design/                    investigación y maquetas de diseño
├─ templates/                 BRIEF.md · REPORT.md · ADR.md
├─ prompts/PNN-*.md           prompt auto-contenido por fase
└─ phases/PNN/                BRIEF.md · REPORT.md · spikes/notas de la fase
```

---

*Próximo paso: revisá este plan y cuestioná lo que quieras. Cuando lo marques como v1.0,
respondemos Q1–Q4 y arranca P0 con su BRIEF.*

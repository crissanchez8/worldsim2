# LEARNINGS

> Errores, fricciones y supuestos equivocados que no se repiten. Se leen **al inicio de cada
> sesión**. Los recurrentes se promueven a reglas en `CLAUDE.md`.

## Cuándo registrar
- Un problema que costó más de ~30 min o requirió retrabajo.
- Una corrección o queja de Cristian (aunque sea chica).
- Una fricción del flujo de trabajo (algo que hubo que pedir dos veces, un paso olvidado).
- Un supuesto que resultó falso.
- Una herramienta o técnica que falló de forma no obvia.

## Formato
```
### L-NNN · Título corto
- **Fecha / fase:** AAAA-MM-DD · PNN
- **Origen:** Cristian | observación propia
- **Contexto:** qué estaba haciendo
- **Qué pasó:** el síntoma
- **Causa raíz:** por qué pasó de verdad
- **Regla:** qué hago distinto a partir de ahora (imperativo, verificable)
- **Cómo detectarlo antes:** señal temprana o chequeo
- **Promovido a CLAUDE.md:** sí/no
```

---

## Registro

### L-001 · Las opciones sin pros/contras no le sirven a Cristian
- **Fecha / fase:** 2026-10-14 · pre-P0
- **Origen:** Cristian
- **Contexto:** entrevista inicial; le ofrecí elegir referencias y plataforma con descripciones de una línea.
- **Qué pasó:** no pudo decidir y tuvo que pedir el detalle de pros/contras, recomendación y qué no hacer.
- **Causa raíz:** asumí que conocía los trade-offs de motores de juego y referencias de diseño.
- **Regla:** toda decisión técnica o de diseño se presenta con tabla de opciones + pros/contras + recomendación explícita + "qué no recomiendo y por qué", **desde la primera vez**. Si ninguna opción encaja, proponer un híbrido.
- **Cómo detectarlo antes:** si una opción requiere conocimiento especializado para elegirla, necesita comparación.
- **Promovido a CLAUDE.md:** sí (contrato, punto 3).

### L-002 · Nivel de detalle del plan por debajo de lo esperado
- **Fecha / fase:** 2026-10-14 · pre-P0
- **Origen:** Cristian
- **Contexto:** primer plan (v0.1) con fases de una línea y criterios generales.
- **Qué pasó:** pidió un plan con subtareas por entregable, decisiones, criterios de salida y gates, y compartió un plan de referencia de otro proyecto.
- **Causa raíz:** no pregunté qué formato y profundidad esperaba para un entregable de planificación.
- **Regla:** para entregables de planificación o documentación, usar por defecto el formato detallado (tareas numeradas `PN.M` con subtareas, 🔶 decisiones con recomendación, criterios de salida verificables, riesgos). Si hay un documento de referencia del usuario, seguir su nivel de detalle.
- **Cómo detectarlo antes:** si un ítem del plan no se puede verificar como hecho/no hecho, le falta detalle.
- **Promovido a CLAUDE.md:** no (cubierto por las plantillas).

### L-003 · El nombre que usa el usuario no siempre es la ruta real
- **Fecha / fase:** 2026-10-14 · pre-P0
- **Origen:** observación propia
- **Contexto:** Cristian llamó "world-history-sim" al proyecto anterior; la carpeta era `human-history-simulator`.
- **Qué pasó:** lo resolví listando el Escritorio, pero pude haber asumido mal.
- **Regla:** verificar en el sistema de archivos los nombres y rutas que menciona el usuario antes de actuar; si hay ambigüedad, preguntar.
- **Cómo detectarlo antes:** el nombre mencionado no aparece literal en el filesystem.
- **Promovido a CLAUDE.md:** no.

### L-004 · Un test de lint que deriva sus casos de la config que prueba no prueba nada
- **Fecha / fase:** 2026-10-15 · P0
- **Origen:** observación propia (prueba de mutación)
- **Contexto:** P0.3, test de que el lint de determinismo falla con cada API prohibida.
- **Qué pasó:** los casos se generaban desde `MATH_ALLOWED` / `FORBIDDEN_GLOBALS`; al agregar `sin` a la allowlist o borrar `process`, el test seguía verde.
- **Causa raíz:** el oráculo del test era el mismo código bajo prueba (autorreferencia).
- **Regla:** los tests de reglas de seguridad/determinismo usan **listas canónicas propias** (independientes de la config) + una aserción de igualdad exacta sobre la allowlist; y se valida cada test nuevo de este tipo con **una mutación manual** (aflojar la regla → el test debe fallar).
- **Recurrencia (P0.9):** el test "orden de alta no importa" de los modificadores tampoco detectaba la mutación: el rango del stat acotaba los resultados y los topes aleatorios aplanaban las diferencias. Ampliación de la regla: el caso de prueba tiene que hacer **observable** la propiedad (sin acotar, sin operaciones que la oculten, permutaciones reales).
- **Cómo detectarlo antes:** si el test importa la lista que define qué está prohibido y solo itera sobre ella, sospechar.
- **Promovido a CLAUDE.md:** no (si se repite, sí).

### L-005 · "latest" de npm no siempre es compatible con el resto del stack
- **Fecha / fase:** 2026-10-15 · P0
- **Origen:** observación propia
- **Contexto:** P0.2, fijando versiones del monorepo.
- **Qué pasó:** TypeScript `latest` es 7.0 (compilador nativo), pero typescript-eslint 8.x declara `typescript <6.1`.
- **Causa raíz:** asumir que las últimas versiones de cada herramienta son compatibles entre sí.
- **Regla:** antes de fijar versiones, revisar `peerDependencies` de las herramientas que se enchufan entre sí (`npm view <pkg> peerDependencies`); fijar con `catalog:` y anotar el motivo en `pnpm-workspace.yaml` cuando se queda atrás de latest.
- **Cómo detectarlo antes:** cambio de versión mayor reciente en una herramienta "base" (TS, ESLint, Vite).
- **Promovido a CLAUDE.md:** no.

### L-006 · Verificar la UI en el navegador aunque sea un placeholder
- **Fecha / fase:** 2026-10-15 · P0
- **Origen:** observación propia
- **Contexto:** P0.2, toggle es/en de la página placeholder.
- **Qué pasó:** typecheck, lint y tests verdes, pero la página quedaba en blanco: loop infinito (`changeLanguage` dentro de un `useEffect` que dependía de `t`, que cambia en cada `languageChanged`).
- **Causa raíz:** dos fuentes de verdad para el idioma (estado de React + i18next) sincronizadas con un efecto.
- **Regla:** (1) toda UI se abre en el navegador y se revisa la consola antes de commitear; (2) el idioma activo vive solo en i18next: la UI lo lee de `i18n.resolvedLanguage` y lo cambia con `changeLanguage` en el handler, nunca en un efecto.
- **Cómo detectarlo antes:** un `useEffect` que llama a algo que emite eventos que a su vez cambian sus dependencias.
- **Promovido a CLAUDE.md:** no.

### L-007 · Buffers que crecen: probar por encima de la capacidad inicial
- **Fecha / fase:** 2026-10-15 · P0
- **Origen:** observación propia (bench de P0.7)
- **Contexto:** `ByteWriter` del serializador, con capacidad inicial de 1 KiB.
- **Qué pasó:** `this.view.setFloat64(this.reserve(8), v)` escribía en la vista VIEJA cuando `reserve` agrandaba el buffer (JS evalúa `this.view` antes que los argumentos). Los tests pasaban porque ningún estado de prueba superaba 1 KiB; lo encontró el bench con 615 KiB.
- **Causa raíz:** orden de evaluación + tests que nunca ejercitaban el crecimiento.
- **Regla:** (1) en estructuras que se reasignan, obtener el offset/recurso en una sentencia y usar el campo después; (2) todo test de una estructura con capacidad inicial incluye un caso que la supera varias veces.
- **Cómo detectarlo antes:** un método que reemplaza un campo y se llama como argumento de otro método de ese mismo campo.
- **Promovido a CLAUDE.md:** no.

### L-008 · Un reemplazo por script que no encuentra el texto falla en silencio
- **Fecha / fase:** 2026-10-15 · P0
- **Origen:** observación propia (profiling de P0.7)
- **Contexto:** apliqué el camino rápido de serialización con `str.replace` en Python.
- **Qué pasó:** Prettier ya había partido la llamada en varias líneas; el reemplazo no matcheó y el camino rápido nunca existió. El test "rápido = lento" pasaba porque ambos usaban el lento.
- **Causa raíz:** `str.replace` devuelve el texto sin cambios si no hay match; no verifiqué que se aplicara.
- **Regla:** para editar código existente usar la herramienta Edit (falla si no encuentra el texto); si uso scripts, `assert old in s` antes de cada reemplazo. Todo test que compara dos caminos se valida con una mutación en cada camino.
- **Cómo detectarlo antes:** un cambio de rendimiento que no cambia las mediciones.
- **Promovido a CLAUDE.md:** no.

### L-009 · Medir rendimiento contra el dev server invalida corridas
- **Fecha / fase:** 2026-10-15 · P0
- **Origen:** observación propia (spike A, P0.13)
- **Contexto:** recorridos de 60 s del spike de terreno contra `vite dev`.
- **Qué pasó:** edité código mientras corría la medición; el HMR de Vite recargó la página en
  medio de dos corridas y tuve que tirarlas.
- **Causa raíz:** el dev server reacciona a cualquier cambio en disco; además sirve código sin
  minificar, que no es lo que se despliega.
- **Regla:** las mediciones de rendimiento corren contra el **build** (`vite build` + `vite
  preview`), nunca contra `vite dev`; no se reconstruye el build durante una corrida.
- **Cómo detectarlo antes:** una URL de medición con el puerto del dev server.
- **Promovido a CLAUDE.md:** no.

### L-010 · "60 fps" en headless o con el timer de WebGL no prueba que la GPU dé abasto
- **Fecha / fase:** 2026-10-15 · P0
- **Origen:** observación propia (spike A, P0.13)
- **Contexto:** medición del terreno sin ventana visible (el navegador integrado oculto no corre
  `requestAnimationFrame`), con Chrome headless por CDP.
- **Qué pasó:** en WebGL2 a dpr 2 el contador daba 60 fps, pero el timer de GPU
  (`EXT_disjoint_timer_query` vía ANGLE/Metal) marcaba 20,6 ms en p95. Las dos cifras no podían
  ser ciertas a la vez.
- **Causa raíz:**
  - headless tiene un reloj de cuadros virtual de 60 Hz;
  - los timers de GPU (WebGL sobre ANGLE/Metal y también los timestamps de WebGPU) sobrestiman:
    el estrés muestra que ×4 escenas entran en un cuadro de 16,7 ms aunque el timer sume 34 ms.
    La hipótesis más probable es que miden latencia de pase (esperas y solapamiento), no
    ocupación de la GPU.
- **Regla:**
  - toda medición de fps lleva un **control cruzado de la cola de GPU**: fences en WebGL2,
    `queue.onSubmittedWorkDone()` en WebGPU. Si los cuadros en vuelo no pasan de 1–2, la GPU da
    abasto;
  - el **margen** se mide por estrés (dibujar la escena N veces por cuadro hasta que caen los
    fps), no con timers de GPU;
  - los fps de headless no se reportan sin esos dos controles.
- **Cómo detectarlo antes:** tiempo de GPU p95 mayor que el período del cuadro con 0 tirones.

### L-011 · Un resumen con grep puede esconder la falla
- **Fecha / fase:** 2026-10-15 · P0
- **Origen:** observación propia
- **Contexto:** filtré la salida de `pnpm check` con `grep` buscando "Tasks", "error" y "violations".
- **Qué pasó:** `prettier --check` falló primero y cortó la cadena; ninguna línea matcheó y el resumen vacío parecía un éxito.
- **Causa raíz:** el filtro solo buscaba señales de éxito y algunas de falla, no el código de salida.
- **Regla:** al filtrar salidas de comandos encadenados, incluir siempre `ELIFECYCLE`/`exit code` y, ante un resumen vacío o incompleto, mirar la cola completa (`tail`) antes de concluir.
- **Cómo detectarlo antes:** el resumen no muestra las tres etapas esperadas (typecheck, lint, test).
- **Promovido a CLAUDE.md:** no.

### L-012 · WebKit de Playwright 1.64.1 no arranca en macOS 26.0
- **Fecha / fase:** 2026-10-16 · P0
- **Origen:** observación propia (spikes B y C)
- **Contexto:** medir el spike B y correr el spike C en los tres motores con Playwright.
- **Qué pasó:** `webkit.launch()` + `newPage()` termina en *segmentation fault* (headless y con ventana, dentro y fuera del sandbox) con el build `webkit-mac-26-arm64` v2370 en macOS 26.0 (25A354).
- **Causa raíz:** incompatibilidad del build de WebKit de Playwright con esta versión de macOS (no es del proyecto: falla un `setContent` mínimo).
- **Regla:** WebKit se prueba en el CI sobre Linux; Safari real lo verifica Cristian a mano. Los scripts de medición toleran que un navegador no arranque y lo reportan.
- **Cómo detectarlo antes:** probar un arranque mínimo de cada navegador apenas se instala Playwright.
- **Promovido a CLAUDE.md:** no.

### L-013 · Una cadena con `;` sigue aunque el chequeo falle
- **Fecha / fase:** 2026-10-16 · P0
- **Origen:** observación propia (recurrencia de L-011)
- **Contexto:** `pnpm check ...; git add … && git commit … ; git push`.
- **Qué pasó:** los tests de dos spikes fallaron (Vitest levantaba el spec de Playwright; un timeout con la máquina cargada) y igual se commiteó y se subió.
- **Causa raíz:** separar con `;` el chequeo del commit; el grep del resumen no frena nada.
- **Regla:** chequeo y commit se encadenan con `&&` (o se verifica `exit=$?` antes de commitear); nunca `;` entre un chequeo y una acción que publica.
- **Cómo detectarlo antes:** un `;` después de `pnpm check` en el mismo comando que un `git push`.
- **Promovido a CLAUDE.md:** sí (regla de "verificar antes de publicar"; ver Convenciones).

### L-014 · Lo que funciona en mi checkout puede no existir en un clon limpio
- **Fecha / fase:** 2026-10-16 · P0
- **Origen:** observación propia (CI)
- **Contexto:** el build del spike C escribe `public/expected.json`, que está en `.gitignore`.
- **Qué pasó:** en mi máquina `public/` existía; en el CI (clon limpio) no, y el build falló en dos jobs.
- **Causa raíz:** una carpeta cuyo único contenido está ignorado no viaja con git.
- **Regla:** los generadores crean sus carpetas (`mkdirSync(..., { recursive: true })`); ante un cambio de build, probar en un clon nuevo (`git clone . /tmp/x && pnpm i --frozen-lockfile && pnpm build`).
- **Cómo detectarlo antes:** un archivo generado en una carpeta que no tiene ningún archivo versionado.
- **Promovido a CLAUDE.md:** no.

### L-015 · `expect(fn).not.toThrow(Clase)` pasa si se lanza OTRO error
- **Fecha / fase:** 2026-10-16 · P1
- **Origen:** observación propia (P1.0, test de propiedades del ledger)
- **Contexto:** el test de propiedades verificaba cada tick con `expect(() => sim.step()).not.toThrow(InvariantError)`.
- **Qué pasó:** revisándolo, sospeché que un `LedgerError` (u otro) no haría fallar el test; lo confirmé con una prueba mínima en Vitest 5: `not.toThrow(A)` pasa cuando se lanza un `TypeError`.
- **Causa raíz:** la forma negada con clase solo afirma "no se lanzó un A", no "no se lanzó nada".
- **Regla:** para afirmar que algo no falla, usar `.not.toThrow()` sin argumentos; la forma con clase o mensaje se usa solo en positivo (`.toThrow(Clase)`).
- **Cómo detectarlo antes:** cualquier `.not.toThrow(` con argumento.
- **Promovido a CLAUDE.md:** no.

### L-016 · `Stream.sub(n)` reemplaza el sub-stream, no lo anida
- **Fecha / fase:** 2026-10-16 · P1
- **Origen:** observación propia (P1.1, semillas de provincias y de zonas marítimas)
- **Contexto:** `placeSeeds` recibía un stream y hacía `stream.sub(1)` adentro; las zonas marítimas le pasaban `…stream(worldgenProvinces).sub(2)` para tener azar propio.
- **Qué pasó:** revisando `core/rng` vi que `sub` crea un stream con ESE sub-id, descartando el anterior: `sub(2).sub(1)` es `sub(1)`. Provincias y mares habrían usado la misma secuencia (semillas correlacionadas, sin error visible).
- **Causa raíz:** asumí semántica de anidado ("sub-stream de un sub-stream") por el nombre.
- **Regla:** el sub-stream lo elige quien llama, con constantes nombradas por módulo (`SUB_…`); una función que recibe un `Stream` lo usa con `at(entidad, k)` y nunca vuelve a llamar a `sub`.
- **Cómo detectarlo antes:** un `.sub(` aplicado sobre un `Stream` que vino por parámetro.
- **Promovido a CLAUDE.md:** no.

### L-017 · Los tests que generan mundos fallan por timeout solo bajo `pnpm check`
- **Fecha / fase:** 2026-10-16 · P1
- **Origen:** observación propia (P1.3)
- **Contexto:** `pnpm check` salió con 1 sin error visible en el log filtrado; repetido, pasó. Después falló de nuevo con "Hook timed out in 10000ms" en el `beforeAll` de la rebanada.
- **Qué pasó:** solos, los tests de worldgen y de la simulación entran en los timeouts por defecto de Vitest (5 s por test, 10 s por hook); con Turborepo corriendo todos los paquetes en paralelo, no.
- **Causa raíz:** timeouts por defecto en tests que hacen trabajo pesado de verdad (generar un mundo, simular miles de años), sensibles a la carga de la máquina.
- **Regla:** todo archivo de tests que genera mundos o simula corridas largas fija `vi.setConfig({ testTimeout, hookTimeout })` explícitos y holgados; un "fallo sin error" en `pnpm check` se busca con `grep -E "FAIL|timed out"` en el log completo (L-011), no se reintenta a ciegas.
- **Cómo detectarlo antes:** un test que tarda más de ~1 s solo.
- **Promovido a CLAUDE.md:** no.

---

## Herencia del proyecto anterior (`human-history-simulator`)

Lecciones de diseño del primer intento (TS, grilla hex, 34 sistemas, 147 commits en una semana).
Rigen desde P0.

### Errores que no se repiten
| # | Error | Regla |
|---|---|---|
| H-01 | Unidad de simulación = un grupo por tile (sin mezcla de cultura/religión; conversión binaria; ciudades con doble conteo) | Provincias con pops mixtos; asimilación y conversión como flujos |
| H-02 | Multiplicadores encadenados (`fuerza = pop·tech·terreno·…·defensa`) y ~10 cachés transitorias acopladas al orden del tick | Escritor único, contratos, buffers de flujo, modificadores con fuente |
| H-03 | Tecnología como un escalar sin techo (2.675) con hitos por umbral | Grafo de innovaciones con prerrequisitos, materiales, entorno y pérdida |
| H-04 | Economía de fachada (sin bienes, precios ni moneda) | Bienes, mercados, rutas y moneda reales (P6) |
| H-05 | Gobierno como etiqueta recalculada cada turno | Régimen como estructura persistente con transiciones por eventos (P7) |
| H-06 | Decisiones solo de guerra/paz; alianzas por tirada | IA de agenda con objetivos y diplomacia con memoria (P9) |
| H-07 | Guerra como dados de frontera (48k "conquistas" por corrida) | Ejércitos, batallas, sitios, objetivos y tratados (P9) |
| H-08 | 97k eventos sin jerarquía; 20k "colapsos" | Significancia al emitir; episodios jerárquicos; umbrales de emisión |
| H-09 | Cultura de 2 escalares; pueblos asignados por grilla cuadrada | Cultura emergente del entorno; idiomas con familias |
| H-10 | Estado fuera del snapshot y del hash (relaciones, guerras, tesoro…) | Estado 100% serializable y hasheado |
| H-11 | Números sin unidades (879M habitantes en 399 grupos) | Unidades físicas y calibración contra curvas reales |
| H-12 | 9 versiones apiladas con campos opcionales; 24 recalibraciones del golden | Modelo de dominio diseñado en P0; RNG por streams; la salud estadística calibra, el golden solo detecta regresiones |
| H-13 | Mapa con biomas en franjas, ríos que no forman cuencas, cordilleras de una línea, serrucho hex, canvas 2D | Worldgen físico (P3) y render GPU (P1/P12) |
| H-14 | El frontend quedaba atrás del motor (una fase entera para "mostrar lo nuevo") | Cada fase entrega su capa de mapa, sus fichas y sus gráficos |

### Ideas que sí se llevan (conceptos)
- Determinismo con seed; motor headless.
- "El motor decide qué pasa, el LLM cómo se cuenta", con fallback offline y anclado en hechos.
- Ranking de relevancia por categoría y era.
- La guerra no favorecida: casus belli, reputación, agotamiento, coaliciones contra el hegemón.
- Conocimiento que se pierde; ciclo auge → colapso → edad oscura → renacimiento.
- Ciudades que sobreviven a sus estados y dejan ruinas.
- Deslealtad de conquistados por etnia y fe; conversión por conquista; sitios sagrados como agravio; cismas con linaje.
- Pueblo ≠ cultura; clima en períodos; reloj con prehistoria larga.
- Dirección del worldgen físico (placas, orografía, Hadley, caudal, lapse rate).
- Tests de salud histórica multi-seed.

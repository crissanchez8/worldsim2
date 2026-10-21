# BRIEF — P02 · Dirección de diseño y Design System

| | |
|---|---|
| **Fecha** | 2026-10-19 |
| **Estado** | ✅ Aprobado el 2026-10-21 (tal cual; decisiones D58–D67; sesión paralela para la paleta política) |
| **Tamaño** | M–L |
| **Fase anterior** | P1 cerrada el 2026-10-19 ([REPORT](../P01/REPORT.md); OK registrado en `decisions.md`; PR #2 mergeado a `main` en 653bcbb) |

> No se escribe código de esta fase hasta que Cristian apruebe este BRIEF.

## 1. Objetivo
Al terminar P2, worldSim2 tiene una **identidad visual elegida por Cristian** y un **Design System**
que la hace cumplir:
- tokens, componentes y reglas en `packages/ui` y `docs/design-system.md`;
- una paleta política que nunca pinta igual a dos vecinos y conserva el color de cada reino;
- una galería navegable en el preview.

Toda pantalla de P3–P11 se **arma** con piezas del DS, no se inventa. La rebanada de P1 queda
re-vestida con el DS, con la misma estructura (D57) y sin regresiones.

## 2. Contexto
- **Estado real del código (`main`, 653bcbb):**
  - **UI neutra** en `apps/web/src`, con la estructura aprobada en D57:
    - `screens/`: CreateScreen, WorldLayout, LiveHud, SummaryScreen, EntityScreen;
    - `entity/`: EntityCard, que es inspector y ficha a la vez, con `WhyPanel` y `Facts`;
    - `live/`: TimeBar, TimelineView, Ticker y SharedBanner;
    - `summary/`: Chart con uPlot y EntityTable virtualizada;
    - `ui/`: SharePanel y LanguageToggle;
  - **estilos:** un solo `base.css` de 431 líneas, con variables neutras (`--bg`, `--fg`, `--line`…)
    y modo oscuro por `prefers-color-scheme`;
  - **mapa:** colores provisorios en `map/config.ts` (`PALETTE`). El relleno político sale de
    `colorFromSeed(id de polity)` en `map/colors.ts`, así que dos vecinos pueden quedar casi
    iguales (se ve en las capturas de P1). El estado ya tiene `Polity.colorSeed` (u32, escrito por
    statecraft) y el grafo de provincias distingue aristas de tierra y estrechos
    (`graph.kind`);
  - **`packages/ui` está vacío.** dependency-cruiser ya le prohíbe importar el motor
    (`ui-no-engine`), y el lint de texto de UI ya cubre `packages/ui/src/**/*.tsx`;
  - **E2E de la web** (`apps/web/e2e/live.e2e.ts`, Chromium y Firefox): encuentra los controles
    por rol y nombre accesible en español ("Guardar", "Cargar", "Compartir", "Calcular el porqué",
    el radio "1×", el `slider` de la línea de tiempo, el `complementary` "Inspector", el `dialog`
    "Compartir este mundo"…);
  - **sitio:** `scripts/assemble-site.mjs` publica solo cualquier `tools/<x>/dist` en
    `/tools/<x>/` del preview. Una galería o unas maquetas como workspace de `tools/` salen en el
    link del PR sin configurar nada más;
  - **los nombres procedurales son ASCII** (`packages/lang`, P1) y la UI usa Latin-1 (á, ñ, ¿).
    Alcanza con el subconjunto latino de las fuentes; latin-ext se carga a pedido por si P4 suma
    diacríticos.
- **Desvío de la rebanada respecto de D57:** el wireframe aprobado de la ficha tiene dos columnas
  (datos | eventos), pero la implementada quedó en una. Re-vestirla vuelve al wireframe aprobado,
  así que no es un cambio de estructura (pregunta 4).
- **Rendimiento medido en P1.9** (punto de partida, no se empeora sin medir):
  - "Crear" carga 298 kB de JS (96 kB gzip) y el mundo se carga a pedido;
  - corrida a máx.: 20 s en Chrome y 42 s en Firefox, sin tareas largas.
- **Decisiones vigentes que condicionan la fase:**
  - D5 mapa híbrido (3D de cerca, atlas de lejos) · D7 assets CC0 + procedural · D20 es/en ·
    D23 arquitectura antes que pulido (la belleza del mapa es P12) · D24 costo cero · D25 tres
    direcciones → elección → DS;
  - D36 navegadores: las 2 últimas versiones mayores de escritorio, con WebGL2 como piso;
  - D48–D50 tiempo e historia (el mapa a la fecha sale de los deltas visuales) · D57 estructura
    de pantallas aprobada.
- **LEARNINGS que aplican:**
  - L-004: los tests de reglas (AA, distinguibilidad de la paleta) usan casos canónicos propios y
    se validan con una mutación;
  - L-005: revisar `peerDependencies` antes de fijar versiones (React 19.3, TS 6.0, Vite 8);
  - L-006: toda UI se abre en el navegador y se mira la consola;
  - L-009, L-010 y L-019: se mide contra el build y con el Chrome instalado; el panel oculto del
    navegador integrado no sirve para tiempos ni para capturas del mapa;
  - L-014: los archivos generados (tokens CSS) no pueden depender de carpetas ignoradas; se prueba
    en un clon limpio;
  - L-022: un componente y su lógica no se llaman igual salvo por las mayúsculas;
  - L-024: re-vestir no puede meter `t` ni `i18n` en las dependencias de un efecto caro.

## 3. Alcance
### Entra
- Investigación, moodboard y anti-referencias (`docs/design/research.md`).
- **Tres direcciones de diseño** con maquetas sobre renders reales del mapa, presentadas lado a
  lado en el preview.
- Tu elección (o una mezcla explícita) y el **nombre** (Q5) si encaja.
- **Tokens:**
  - color, con validación AA programática;
  - **paleta política** con coloreo de grafo y estabilidad temporal, probada en 30 mundos;
  - rampas de modos de mapa aptas para daltonismo;
  - tipografía con jerarquía de rótulos, espaciado, elevación, fronteras y movimiento.
- **`packages/ui` v1:**
  - primitivos, componentes de datos y de dominio que usan la rebanada y las fases siguientes
    (D02-g);
  - gráficos sobre uPlot;
  - íconos y símbolos de mapa.
- Layout shell de la vista en vivo y del resumen, y mapa de atajos.
- **Galería** desplegada en el preview, con axe en el CI.
- `docs/design-system.md`.
- **Rebanada re-vestida:** todas las pantallas de P1 y el mapa con los tokens cartográficos.

### No entra (explícito)
- **Cambiar la estructura de pantallas o las rutas de D57.** Si aparece una mejora, se pregunta
  con maqueta.
- **Rótulos en el mapa** (nombres de reinos, mares, regiones): P3.13 y P12. En P2 se define su
  tipografía y jerarquía (tokens) y se muestran solo en las maquetas.
- **Relieve pintado, hachures, texturas de papel, ciudades 3D y atmósfera:** P12. Las maquetas los
  pueden insinuar, marcados como aproximación y con la fase en la que llegarían.
- **Landing, galería de mundos, `/ajustes` y "cómo funciona":** P13.
- **Componentes sin uso cercano:** GenealogyNode, MiniMap y SearchField quedan especificados en el
  DS y se construyen en la fase que los usa (D02-g).
- **Comparación automática de capturas** (regresión visual por píxeles): es frágil entre máquinas
  y GPUs. En P2 las capturas son evidencia; se reevalúa en P12.
- **Renombrar el repo, el proyecto de Cloudflare Pages o el subdominio:** según D02-h, va a P13.
- **Cambios al motor:** ninguno (§6).

## 4. Tareas
Refinadas desde DEVELOPMENT_PLAN §16 · P2 con el estado real del código. Δ = cambio respecto del
plan.

### Orden de ejecución propuesto
```
Bloque 1 · dirección:  P2.1 → P2.2 → 🎨 checkpoint 1 → P2.3 (tu elección)
Bloque 2 · sistema:    P2.4 → P2.5 + P2.6 + P2.7 (con la galería P2.9 creciendo a la par)
                       → P2.8 → 🎨 checkpoint 2
Bloque 3 · rebanada:   P2.11 → 🎨 checkpoint 3 → P2.10 (cierra los docs) → QA → P2.12
En paralelo (opcional): el algoritmo de coloreo de P2.4 no depende de la dirección (pregunta 3)
```

**P2.1 Investigación y anti-referencias**
- [ ] **Moodboard** de referencias, analizadas (qué tomar y qué no de cada una):
  - cartografía histórica: atlas grabados de los siglos XVIII y XIX, cartas náuticas, la
    cartografía suiza (Imhof, swisstopo) y la de National Geographic;
  - juegos: Paradox (EU, CK, Victoria), DF Legends, Civ VI, Humankind;
  - visualización editorial de datos (FT, NYT, The Economist, Our World in Data);
  - interfaces de instrumentos científicos.
- [ ] **Δ derechos:** el repo es público, así que el moodboard **enlaza** las referencias y solo
  embebe imágenes de dominio público o CC0 (mapas antiguos de bibliotecas públicas). Las capturas
  de juegos no se suben al repo.
- [ ] **Anti-referencias "AI slop"** con ejemplos concretos (§15.5): gradientes violetas,
  glassmorphism por defecto, emojis como íconos, tarjetas SaaS, tipografía de siempre sin razón
  (Inter, Space Grotesk…), sombras difusas por todos lados, animación decorativa, "pergamino" de
  disfraz y "dashboard sci-fi" neón.
- [ ] **Inventario de superficies** de la UI, de P1 y de las que agrega el plan hasta P11, con su
  necesidad dominante:
  - densidad de datos (inspector, tablas);
  - lectura larga (ficha, crónica);
  - control en tiempo real (tiempo, modos de mapa);
  - lectura del mapa a distancia (atlas).
- [ ] Salida: `docs/design/research.md`.

**P2.2 Tres direcciones de diseño** 🎨 (conceptos candidatos en D02-a)

Cada dirección incluye:
- [ ] **Concepto:** una frase, un párrafo y qué contesta a "¿qué es worldSim2?".
- [ ] **Color:**
  - paleta de UI;
  - **paleta política** de K colores, mutuamente distinguibles también bajo protanopia,
    deuteranopia y tritanopia simuladas;
  - rampas secuenciales y divergentes de los modos de mapa.
- [ ] **Tipografía:** fuentes OFL para UI, lectura larga, números (cifras tabulares) y rótulos del
  mapa, con muestra en es/en.
- [ ] **Íconos y símbolos:** estilo de íconos y símbolos cartográficos (asentamiento por nivel,
  capital, batalla).
- [ ] **Lenguaje del atlas:** relieve, fronteras, relleno, rótulos y decoración, con **qué es
  barato y qué es caro** en el mapa y en qué fase llegaría cada cosa (P2, P3.13 o P12).
- [ ] **Movimiento:** principios, duraciones y curvas.
- [ ] **Emblema:** cómo se ve el emblema procedural de una polity en esa dirección (escudo,
  insignia o bandera).
- [ ] **Maquetas** sobre renders reales, con datos reales de una corrida (nombres, eventos, porqué):
  - vista en vivo a pantalla completa;
  - ficha de enciclopedia;
  - recorte del atlas;
  - inspector con el "por qué".
- [ ] **Δ renders reales por dirección:** un parámetro de desarrollo `?look=<dirección>` en el
  mapa (`apps/web/src/map`) cambia colores, paleta política, fronteras y opacidades, y las capturas
  salen con `measure-map.mjs --shot` sobre el build. Lo que el shader todavía no hace (hachures,
  bandas de frontera, rótulos) se superpone en la maqueta, marcado como aproximación.
- [ ] **Δ dónde se ven:** las maquetas son HTML con las fuentes reales, en un workspace
  `tools/design`. Se publican en el preview del PR (`/tools/design/`) y quedan como PNG en
  `docs/phases/P02/img/`.
- [ ] **Antes de mostrártelas:** crítica anti-slop de cada una con `impeccable`.
- [ ] **Presentación lado a lado** con pros y contras, mi recomendación y qué no recomiendo.

**P2.3 Elección** 🔶
- [ ] Elegís una dirección o una mezcla explícita (qué se toma de cada una); se registra en
  `decisions.md`.
- [ ] **Nombre (Q5):** 5–8 candidatos que encajen con la dirección, con la disponibilidad
  verificada (repo en GitHub, subdominio `*.pages.dev`, búsqueda de marcas obvias). Elegís uno, o
  seguimos con `worldSim2`. Cómo y cuándo se aplica: D02-h.

**P2.4 Tokens** (`packages/ui/src/tokens/`, fuente única en TS; D02-d)
- [ ] **Color:**
  - neutros, acentos y semánticos (éxito, alerta, error, info);
  - estados (hover, foco, activo, deshabilitado, seleccionado);
  - colores del mapa: agua por profundidad, tierra, ríos, fronteras, selección y marcadores.
- [ ] **Paleta política** (D02-f):
  - K colores del DS con matriz de conflictos: dos colores "chocan" si su ΔE2000 queda bajo el
    umbral en la visión normal o en alguna de las 3 simuladas;
  - asignación por **coloreo del grafo de polities vecinas**: cada polity recibe al nacer un slot
    que no choca con sus vecinos, con `colorSeed` como preferencia;
  - si una expansión crea un choque, cambia de color la polity más chica: el reino grande
    conserva el suyo;
  - pura y determinista. Se calcula del registro de dueños por año, así que da lo mismo en vivo,
    al rebobinar, con un archivo o con un link;
  - **test sobre 30 mundos** medianos (con `ws health`): 0 pares de vecinos con colores en
    choque en ningún año, y se reportan los cambios de color por polity.
- [ ] **Rampas de modos de mapa:**
  - 2 secuenciales, 1 divergente y 1 categórica (para los biomas, que hoy son provisorios);
  - test de luminosidad monótona y de distinguibilidad bajo las 3 simulaciones.
- [ ] **Tipografía:**
  - escala, pesos, interlineados y cifras tabulares;
  - jerarquía de rótulos del mapa por zoom (reino, provincia, ciudad, mar, cordillera), como
    tokens para P3.13.
- [ ] **Espacio y forma:** espaciado, radios, elevación, z-index y grosor de fronteras por zoom
  (política y provincia).
- [ ] **Movimiento:** duraciones y curvas, con `prefers-reduced-motion`.
- [ ] **Validación AA programática:**
  - tabla de todos los pares de texto permitidos (≥ 4,5:1; ≥ 3:1 para texto grande) y no-texto
    (bordes de controles, foco y marcadores, ≥ 3:1);
  - el test se valida con una mutación (L-004);
  - la tabla va documentada en el DS.
- [ ] **Δ generación:** `tokens.css` (custom properties) se genera desde los tokens en TS y se
  versiona. Un test verifica que el archivo versionado coincide con lo generado, y el mapa lee los
  mismos tokens como números.
- [ ] **Δ guardia:** un test que falla si aparece un color literal en el CSS o el TS de `apps/web`
  fuera de los tokens.

**P2.5 Componentes base (`packages/ui`)**
Solo lo que usa la rebanada o una fase cercana del plan (D02-g); cada componente con sus estados
(hover, foco visible, activo, deshabilitado, cargando, error).
- [ ] **Primitivos:** Button, IconButton, ToggleGroup y RadioGroup (velocidades, modos), Slider,
  Select, Tabs, Tooltip, Popover, Dialog, Panel (inspector), Badge, Kbd, Toast ("Guardado hasta…"),
  Skeleton, EmptyState, ErrorState, Breadcrumb, Field (rótulo, ayuda y error) y Progress.
- [ ] **Datos:** Table (ordenable, sobre la lista virtualizada actual), StatBlock y Facts (el patrón
  de `entity/Facts.tsx`, sin separadores en el JSX), **ModifierBreakdown** (el porqué: base +
  innovaciones + modificadores, con su fuente), Legend y Sparkline.
- [ ] **Dominio:**
  - TimeControls y Timeline (bandas de eras, marcadores, cabeza y franja simulada por delante);
  - EventTickerItem;
  - EntityLink, con tarjeta al pasar el mouse que lee del registro de entidades;
  - EntityHeader;
  - MapModeSwitcher;
  - **Emblem v1** para polities: heráldica procedural determinista por `colorSeed`, con la forma
    de la dirección elegida. Las casas lo usan en P7.
- [ ] **Solo especificados** en el DS (anatomía, tokens, estados; sin código): GenealogyNode (P7,
  P11), MiniMap (P11) y SearchField (P11).
- [ ] **Arquitectura:**
  - `packages/ui` recibe datos derivados por props y no importa el motor;
  - textos solo por props o claves i18n, nunca sueltos;
  - los primitivos accesibles se arman sobre la librería de D02-c.
- [ ] **Δ peso:** se mide lo que suma cada pieza a "Crear" (presupuesto en §8).

**P2.6 Gráficos**
- [ ] Wrappers sobre uPlot (línea, área apilada y barras) con los tokens del DS.
- [ ] Reglas de visualización con la skill `dataviz` (títulos que dicen algo, etiquetas directas,
  ejes con unidad, tooltips, sin chartjunk).
- [ ] Los 3 gráficos del resumen migrados.

**P2.7 Íconos y símbolos**
- [ ] **Set base:** los íconos que se usan, copiados como SVG a `packages/ui/icons`, sin
  dependencia en runtime. Salen de un set libre (Lucide ISC, Phosphor MIT o Tabler MIT, según la
  dirección), se ajustan al estilo y se acredita la licencia.
- [ ] **Símbolos propios del mapa:**
  - asentamiento por nivel, capital, templo, puerto, ruina y maravilla;
  - batalla, sitio, ejército, flota y epidemia.

  Se diseñan todos y se usan en la leyenda, el inspector y el teletipo. En el mapa entran los de
  asentamiento y batalla (P2.11); los demás, en la fase de su sistema.

**P2.8 Layout shell**
- [ ] Vista en vivo (§13.2) y páginas del resumen y la ficha, con la estructura de D57, en
  escritorio de 1280 a 2560 px.
- [ ] Paneles que se pliegan sin tapar el mapa.
- [ ] **Mapa de atajos:**
  - los de P1 (espacio, ←/→, 1–4, Esc);
  - `?` abre la ayuda de atajos;
  - atajos para los modos de mapa.

  Nada choca con los atajos de los lectores de pantalla.

**P2.9 Galería de componentes** 🎨 (D02-e)
- [ ] Cada componente × cada estado, más 2 composiciones completas (inspector con porqué y barra
  de tiempo).
- [ ] Navegable por teclado.
- [ ] **Δ axe en el CI:** Playwright + `@axe-core/playwright` recorre cada historia en Chromium,
  con 0 violaciones.
- [ ] Desplegada en el preview (`/tools/gallery/`).

**P2.10 Documentación**
- [ ] `docs/design-system.md`:
  - concepto y principios;
  - tokens y reglas de uso;
  - **guía cartográfica:** paleta política, rampas, fronteras, símbolos y jerarquía de rótulos;
  - **voz y microcopy es/en** (tono, tuteo o voseo en la UI, fechas y unidades);
  - reglas de accesibilidad, con la tabla AA;
  - **checklist anti-slop**;
  - cómo agregar un componente.
- [ ] Al cerrar, `docs/design/research.md` queda enlazado desde el DS.

**P2.11 Re-vestir la rebanada**
- [ ] Todas las pantallas de P1 migradas a `packages/ui`, con paridad funcional. `base.css`
  desaparece o queda reducido a los tokens y al reset.
- [ ] **Mapa:**
  - colores de los tokens (agua, tierra, ríos, fronteras y selección);
  - paleta política con coloreo de grafo en lugar de `colorFromSeed`;
  - grosores de frontera por zoom;
  - asentamientos y batallas con los símbolos del DS (sprites instanciados), si su costo medido
    entra en el presupuesto. Si no, en P3.13.
- [ ] **Microcopy** revisado con la guía de voz. Si cambia un nombre accesible, se cambia el E2E
  en el mismo commit.
- [ ] La ficha vuelve a las dos columnas del wireframe aprobado (pregunta 4).
- [ ] **Δ axe en el E2E de la web:** crear, vivo, resumen y ficha sin violaciones serias ni
  críticas (el canvas del mapa queda excluido).
- [ ] **Mediciones:** `measure-live.mjs chrome` antes y después; el bench del motor no cambia.

**P2.12 Cierre (Δ explícita)**
- [ ] QA gate con evidencia, auditoría `impeccable` y checklist anti-slop marcada.
- [ ] REPORT, `docs/design-system.md`, `model.md` (semántica de `colorSeed`), plan si cambió,
  `CLAUDE.md` (comandos de la galería y las maquetas), STATUS y prompt de P3 refrescado.
- [ ] Tu OK de cierre.

### Sub-hitos y checkpoints con Cristian
| Checkpoint | Qué se muestra | Cuándo |
|---|---|---|
| 🎨 1 · Direcciones | Las 3 direcciones en el preview (`/tools/design/`), con las 4 maquetas por dirección sobre renders reales, la hoja de especificación (paletas con simulación de daltonismo, tipografía, íconos, movimiento, emblema) y la comparación con mi recomendación. **Elegís** la dirección y el nombre | Después de P2.2 |
| 🎨 2 · DS base | Galería con tokens, componentes y la tabla AA; la paleta política sobre 3 mundos reales a distintas fechas, con el reporte de los 30 mundos; maqueta de alta fidelidad de la vista en vivo armada con el DS. Aprobás antes de re-vestir | Después de P2.8 |
| 🎨 3 · Rebanada re-vestida | Recorrido en el preview (crear → vivo → porqué → resumen → ficha → compartir → en) en Chrome, Firefox y Safari | Después de P2.11 |
| 4 · Cierre | QA gate con evidencia, auditoría, REPORT y OK de cierre | Final |

## 5. Decisiones 🔶

### 🔶 D02-a · Qué tres direcciones se desarrollan
El plan propone cuatro semillas. Propongo desarrollar tres que contestan distinto a **"¿qué es
worldSim2?"**: un documento antiguo, un experimento observado o una obra de referencia. Difieren en
concepto, tipografía y lenguaje cartográfico, no solo en color. Las fuentes nombradas son
candidatas (todas OFL); la elección fina es parte de P2.2.

| | A · **Grabado** (atlas grabado, 1750–1820) | B · **Observatorio** (instrumento científico) | C · **Atlas suizo** (cartografía moderna + editorial) |
|---|---|---|---|
| Postura | La historia como **documento**: el mundo se lee como un atlas antiguo que se va completando | La historia como **experimento observado**: el mundo es una placa bajo un instrumento de precisión | La historia como **obra de referencia**: un atlas escolar y un anuario editorial |
| Tono y color | Papel marfil liso (sin textura de disfraz) y tinta ferrogálica; el color político va **iluminado a mano**: banda de acuarela a lo largo de la frontera y lavado tenue adentro | Grafito mate (no negro puro), escalas en blanco hueso y **un solo color de señal** (bermellón o ámbar) para lo vivo; relleno político plano, desaturado | Blanco cálido y gris tinta; relleno político plano en tonos apagados de atlas; acentos editoriales |
| Tipografía | Serif de transición con versalitas reales (Libre Caslon, EB Garamond); cifras elzevirianas en el texto y tabulares en las tablas | Grotesca condensada técnica + mono con cifras tabulares (IBM Plex Sans Condensed + Plex Mono, o Recursive) | Grotesca neo para la UI (Schibsted Grotesk, Public Sans) + serif editorial para la lectura larga (Newsreader, Source Serif 4) |
| Mapa de lejos | Hachures, fronteras punteadas con banda iluminada, rótulos en versalitas espaciadas y aguas en cursiva | Curvas de nivel y tintes hipsométricos, retícula graduada, fronteras finas y nítidas | Relieve sombreado tipo Imhof, tintes hipsométricos apagados, fronteras con halo blanco, rótulos jerárquicos |
| UI | Filetes dobles, cartelas mínimas, márgenes generosos | Paneles como módulos de instrumento, lecturas numéricas grandes, unidades siempre visibles | Grilla estricta, filetes, blanco generoso, gráficos con títulos que concluyen |
| Movimiento | Lento: "la tinta se asienta" (fundidos y revelados) | Preciso y corto: la aguja se asienta, los números ruedan | Mínimo y funcional |
| Emblema | Escudo heráldico | Insignia geométrica (sigilo) | Bandera rectangular |
| Riesgo de slop | Disfraz de "pergamino pirata"; serif cansadora en datos densos | "Dashboard sci-fi" neón; glassmorphism | SaaS limpio genérico, sin personalidad |
| Costo en el mapa | Alto: banda de frontera (campo de distancia) en P3.13 y hachures en P12 | Medio: curvas de nivel en P3.13; el resto son uniformes | Bajo: halos y relieve sombreado parcial ya en P2 |

**Recomendación:** desarrollar A, B y C. Todavía no recomiendo una: la recomendación va en el
checkpoint 1, con las maquetas a la vista.

**No recomiendo:** "Crónica iluminada" (manuscrito, pan de oro, bermellón):
- ata un mundo de 14.000 años a la estética medieval;
- lleva ornamento pesado y anda mal con datos densos.

Su mejor idea, la rúbrica en bermellón para marcar causas y eventos, se puede tomar en una mezcla.

**Bloquea:** P2.2.

### 🔶 D02-b · Un tema o claro + oscuro
| Opción | Pros | Contras |
|---|---|---|
| **A · Un solo tema, el de la dirección elegida (recomendada)** | El mapa y la UI se diseñan juntos, con una sola paleta política y un solo juego de rampas que validar. Los tokens semánticos dejan la puerta abierta a un segundo tema | Quien prefiere el modo oscuro (o el claro, si gana B) no lo tiene. Se pierde el modo oscuro automático de hoy, que es neutro y sin diseño |
| B · Claro y oscuro desde P2 | Respeta `prefers-color-scheme` | Duplica la validación AA, la paleta política, las rampas y las maquetas. El atlas de lejos cambia de carácter en cada tema y una de las dos versiones queda forzada |
| C · Seguir `prefers-color-scheme` con una variante automática | Barato a primera vista | Una variante generada por fórmula es justo el resultado sin criterio que busca evitar el DS |

**Recomendación:** A. El segundo tema va al roadmap, con su condición: que lo pidan usuarios
reales.

**No recomiendo:** C. Es slop por construcción.

**Bloquea:** P2.4.

### 🔶 D02-c · Base de los primitivos accesibles
El criterio de salida pide teclado y 0 violaciones de axe. Dialog, Popover, Tooltip, Tabs, Select
y Slider tienen patrones de foco y teclado difíciles de hacer bien a mano.

| Opción | Pros | Contras |
|---|---|---|
| **A · Base UI (`@base-ui/react`, MIT; recomendada)** | Sin estilos: el DS pone todo el aspecto. Lo hace parte del equipo original de Radix con el de MUI; v1 estable y activa (1.8.0 tiene más de 2 semanas). Importa por componente y trae **PreviewCard**, justo la tarjeta al pasar el mouse que pide EntityLink. Expone el estado en atributos `data-*` (encaja con CSS Modules) | Más joven que Radix y React Aria. Suma Floating UI, con su peso (se mide en P2.5) |
| B · React Aria Components (Adobe, Apache-2.0) | La accesibilidad y la internacionalización más completas del ecosistema | Más pesada (trae su propio i18n y formateo, que ya tenemos en `@ws/i18n`). No tiene tarjeta al pasar el mouse por diseño. API de render props más verbosa |
| C · Radix Primitives (MIT) | Muy probada | Un paquete por primitivo. Parte de su equipo original se fue a Base UI |
| D · Solo HTML nativo (`<dialog>`, `popover`, `<input type=range>`) + hooks propios | Cero dependencias | Tooltip, tarjeta al pasar el mouse, pestañas con foco errante y select accesible quedan por nuestra cuenta: mucho trabajo y riesgo de fallar en axe y en lectores de pantalla |

**Recomendación:** A, con una compuerta: en P2.5 se mide lo que suma a "Crear". Si se pasa del
presupuesto de §8, se revisa la decisión.

**No recomiendo:** D. Reinventa justo la parte difícil, y la accesibilidad es criterio de salida.

**Bloquea:** P2.5.

### 🔶 D02-d · Cómo viven los tokens y los estilos
| Opción | Pros | Contras |
|---|---|---|
| **A · Tokens en TS → `tokens.css` generado + CSS Modules (recomendada)** | Sin dependencias: Vite ya soporta CSS Modules. Una sola fuente: el CSS lee las custom properties y el mapa lee los mismos tokens como números. Los tests de AA y de la paleta corren sobre los valores tipados | Hay que escribir el generador (chico) y una prueba de que el `tokens.css` versionado está al día |
| B · vanilla-extract | Estilos tipados en TS, sin costo en runtime | Dependencia y plugin de Vite nuevos (compatibilidad con Vite 8 a verificar). Curva de aprendizaje para vos |
| C · Tailwind v4 | Rápido para prototipar | El DS termina repartido en cadenas de clases; empuja al look genérico; dependencia y build nuevos |
| D · CSS-in-JS en runtime (emotion, styled-components) | Familiar | Costo en runtime en un hilo que ya dibuja el mapa; ecosistema en retirada con React 19 |

**Recomendación:** A.

**No recomiendo:** D, por el costo en el hilo principal.

**Bloquea:** P2.4.

### 🔶 D02-e · Herramienta de la galería
Datos al 2026-10-19 (`npm view`):
- **Ladle 5.1.1:** trae su propio Vite 6 (el repo usa Vite 8) y no publica una versión desde el
  2025-11-04;
- **Storybook 10.6.2:** soporta Vite 8 y está activo.

| Opción | Pros | Contras |
|---|---|---|
| **A · Galería propia en `tools/gallery` (recomendada)** | Mismo Vite 8, mismo React y mismos tokens que la app. Las historias son módulos `*.stories.tsx` que se descubren con `import.meta.glob`. Sale sola en el preview (`/tools/gallery/`). axe corre con Playwright, igual que el E2E. Sin dependencias pesadas | Hay que construir la cáscara (navegación, matriz de estados, teclado): ≈1 día. Sin controles interactivos ni documentación automática |
| B · Storybook 10 | Ecosistema completo: addon de a11y, controles, docs, tests de interacción | Cientos de MB de dependencias y una versión mayor por año que mantener. Otro sistema de build adentro del repo |
| C · Ladle 5 (lo que nombra el plan) | Liviano, con axe integrado | Trae Vite 6 (dos Vite en el repo) y lleva casi un año sin publicar: riesgo de quedar huérfana |

**Recomendación:** A. La galería es una herramienta de desarrollo chica, y el criterio de axe lo
cumple Playwright, que ya está en el repo.

**No recomiendo:** C, por el Vite 6 y el mantenimiento.

**Bloquea:** P2.9.

### 🔶 D02-f · Dónde y cómo se calcula el color político
Contexto:
- el plan pide que los vecinos se distingan y que un reino conserve su color;
- hoy el color sale de un hash del id, y nada evita que dos vecinos queden casi iguales.

| Opción | Pros | Contras |
|---|---|---|
| **A · Vista derivada en el hilo principal (recomendada)** | Función pura de los dueños por año que ya llegan del Worker. Con un archivo cargado se recalcula en milisegundos. No toca el motor, el hash, el golden ni el `.wsim`. La misma función la usan `ws health` (30 mundos) y, en P11, el atlas histórico | Se recalcula al cargar un archivo. Para sostener los colores al rebobinar, guarda en memoria los cambios de slot por año |
| B · En el grabador de la historia (Worker, `.wsim`) | El color viaja dentro del archivo | Cambia el formato `.wsim`, y la paleta (un tema de presentación) queda adentro de un paquete del motor |
| C · En el estado de la simulación (`Polity.colorSlot` escrito por statecraft) | "Es dato del mundo" | Mezcla presentación con simulación: cambiar la paleta movería el golden y el hash por año. Va contra el escritor único con responsabilidad clara |

**Recomendación:** A, con estas reglas:
- K colores mutuamente distinguibles (K entre 12 y 16, se fija en P2.4) y matriz de choques que
  incluye las 3 simulaciones de daltonismo;
- slot preferido = `colorSeed mod K`; si choca con un vecino al nacer, el primer slot libre en
  orden fijo;
- ante un choque nuevo por expansión, cambia la polity con menos provincias, con empate por id;
- vecinos = aristas de tierra (los estrechos cruzan agua y no se tocan en el mapa);
- determinista entre navegadores (aritmética entera).

**No recomiendo:** C.

**Bloquea:** P2.4 y P2.11.

### 🔶 D02-g · Alcance de componentes y del mapa en P2
| Opción | Pros | Contras |
|---|---|---|
| **A · Construir lo que usan la rebanada y las fases cercanas; especificar el resto (recomendada)** | Construir: primitivos, datos, dominio y Emblem v1 de §4. Especificar sin código: GenealogyNode (P7, P11), MiniMap (P11) y SearchField (P11). **Mapa:** tokens de color, paleta política, fronteras por zoom y símbolos de asentamiento y batalla; los rótulos van en P3.13 y el relieve pintado en P12. Nada se construye sin datos reales con qué probarlo | Esos tres componentes se construyen más adelante, contra el DS ya escrito |
| B · Todo lo que lista el plan para P2.5 | El catálogo completo de una vez | Componentes sin datos reales: se diseñan a ciegas y se rehacen cuando llega su fase (riesgo nombrado en el plan) |
| C · Mínimo: solo lo que usa la rebanada hoy | Fase más corta | P3 y P4 ya necesitan Select, Legend con rampas y Toast. El DS quedaría corto en la primera fase que lo usa |

**Recomendación:** A.

**No recomiendo:** B, por el riesgo de sobre-diseño que nombra el plan.

**Bloquea:** P2.5, P2.7 y P2.11.

### 🔶 D02-h · Cuándo se aplica el nombre (Q5)
| Opción | Pros | Contras |
|---|---|---|
| **A · Marca visible en P2; infraestructura en P13 (recomendada)** | En P2 cambian el título, la marca en la UI, el nombre en las claves i18n y el README. En P13 se renombran el repo (GitHub redirige el nombre viejo), el proyecto de Cloudflare Pages (no se renombra: se crea otro, con su subdominio) y los secretos del CI, todo en una sola sesión | Durante P3–P12 el repo y la URL se siguen llamando `worldsim2` |
| B · Todo en P2 | Coherente desde ya | Rompe los links de preview de PRs abiertos y la base del bench del runner; hay que volver a configurar Cloudflare a mitad del proyecto, por algo que nadie ve todavía |
| C · Diferir todo el nombre a P13 | Cero trabajo ahora | El nombre se decide mejor junto con la identidad visual, como pide el plan |

**Recomendación:** A. Si ningún candidato te convence, seguimos con `worldSim2` sin costo.

**No recomiendo:** B.

**Bloquea:** P2.3 (aplicación) y P13.

## 6. Impacto en el modelo de dominio
- **Motor:** ninguno. Sin entidades, campos, contratos ni eventos nuevos.
- **`Polity.colorSeed`** conserva su tipo y su dueño (statecraft). Cambia solo su semántica
  documentada: "semilla del slot preferido de la paleta política (P2, D02-f)". Se actualiza
  `model.md`.
- **Golden, hash por año y `ENGINE_VERSION`:** sin cambios. El `.wsim` tampoco cambia (si se
  aprueba D02-f A).
- **`ws health`:** suma el chequeo de la paleta política (choques entre vecinos y cambios de color
  por polity). Es herramienta, no motor.

## 7. Riesgos
| Riesgo | Mitigación |
|---|---|
| Tres direcciones que son variaciones de color de una misma idea | D02-a fija diferencias de concepto, tipografía y cartografía; crítica con `impeccable` antes del checkpoint 1 |
| Maquetas que prometen un mapa que no se puede hacer | Renders reales con `?look=`; lo que falta va marcado como aproximación, con su fase y su costo |
| Diseñar en el vacío | Datos reales de una corrida (nombres, eventos, porqué) en las maquetas y en la galería |
| AI slop | Anti-referencias en P2.1, checklist en el DS y auditoría al cerrar |
| Sobre-diseñar componentes | D02-g: solo lo que tiene datos reales para probarse |
| Las fuentes y los íconos engordan "Crear" | Presupuesto en §8; subconjunto latino; solo la fuente de UI precargada; íconos como SVG sueltos, sin librería |
| Que el coloreo de grafo no alcance en regiones muy densas | K ajustable (12–16); recoloreo de la más chica; los 30 mundos lo dicen antes del checkpoint 2; la frontera es un segundo canal visual |
| Incompatibilidades de versiones (React 19.3, TS 6.0, Vite 8) | Revisar `peerDependencies` antes de fijar (L-005); versiones con ≥ 2 semanas publicadas |
| Re-vestir rompe el E2E o regenera el mundo al cambiar de idioma | Nombres accesibles conservados (o test cambiado en el mismo commit); L-024; E2E por cada pantalla migrada |
| Derechos de las referencias en un repo público | El moodboard enlaza; solo embebe dominio público o CC0 |
| El panel oculto del navegador integrado frena todo (L-019) | Capturas y tiempos con `measure-map.mjs` y `measure-live.mjs` sobre el Chrome instalado |

## 8. Criterios de salida (QA gate)
- [ ] Dirección elegida y registrada en `decisions.md`; nombre (Q5) decidido o diferido de forma
  explícita
- [ ] Contraste AA del 100% de los pares documentados (texto ≥ 4,5:1, texto grande y no-texto
  ≥ 3:1), con test programático en el CI validado con una mutación
- [ ] Rampas de modos de mapa con luminosidad monótona y distinguibles bajo las 3 simulaciones de
  daltonismo (test)
- [ ] Paleta política: 0 pares de polities vecinas con colores en choque, en ningún año de 30
  mundos medianos. Se reporta el % de polities que nunca cambian de color (objetivo propuesto:
  ≥ 90%)
- [ ] Galería completa (cada componente × cada estado), navegable por teclado, con 0 violaciones de
  axe en el CI
- [ ] Δ App: 0 violaciones serias o críticas de axe en crear, vivo, resumen y ficha
- [ ] Auditoría `impeccable` aprobada y checklist anti-slop cumplida (marcada en el REPORT)
- [ ] Rebanada re-vestida sin regresiones: E2E verde en Chromium y Firefox, cero errores de
  consola, es/en completos
- [ ] Δ Rendimiento:
  - "Crear" ≤ 340 kB de JS (hoy 298) y ≤ 120 kB de fuentes en la primera carga;
  - `measure-live` sin tareas largas nuevas y la corrida a máx. sin empeorar más de 10%;
  - bench del motor sin cambios
- [ ] Δ `packages/ui` sin imports del motor (dependency-cruiser) y sin colores literales en
  `apps/web` fuera de los tokens (test)
- [ ] CI verde · salud sin regresiones · bench dentro del presupuesto
- [ ] REPORT escrito, docs actualizados (`design-system.md`, `research.md`, `model.md`,
  `CLAUDE.md`), prompt de P3 refrescado

## 9. Preguntas para Cristian
1. **D02-a a D02-h:** ¿aprobás mis recomendaciones o cambiás alguna? En D02-a podés cambiar una
   dirección por otra (por ejemplo, "Crónica iluminada" en lugar de alguna de las tres).
2. **Dependencias nuevas** (npm, versiones exactas en el catálogo, con ≥ 2 semanas publicadas):
   - **runtime:** `@base-ui/react` (si D02-c A); 2–3 paquetes `@fontsource` / `@fontsource-variable`
     con las fuentes OFL de la dirección elegida (se auto-hospedan con el build, sin CDN);
   - **desarrollo:** `culori` (ΔE2000 y simulación de daltonismo para tokens y tests) y
     `@axe-core/playwright` (accesibilidad en la galería y el E2E);
   - **íconos:** SVG copiados de Lucide, Phosphor o Tabler, con la licencia acreditada; no son una
     dependencia.

   ¿Ok la descarga como parte de aprobar el BRIEF?
3. **Sesión en paralelo:** el algoritmo de coloreo (P2.4, D02-f), su chequeo en `ws health` y el
   reemplazo de `colorFromSeed` no dependen de la dirección: trabajan con slots, y los colores
   llegan después. Puede ir en una sesión aparte mientras acá hago P2.1 y P2.2. Toca
   `packages/ui` (módulo puro nuevo), `tools/cli` y `apps/web/src/map/colors.ts`; las maquetas
   tocan `map/config.ts` y los materiales, así que hay un roce chico en `map/`. ¿Paralelo o todo
   en esta línea?
4. **Ficha:** ¿ok volver a las dos columnas del wireframe aprobado (datos | eventos)? La
   implementación de P1 quedó en una.
5. **Tu gusto, antes de las maquetas (opcional, pero ayuda mucho):** ¿hay juegos, mapas, sitios o
   apps cuya estética te guste o que odies? Entran al moodboard de P2.1.
6. **Lo que vas a tener que hacer vos** (te lo pido con instrucciones exactas cuando lleguemos):
   - checkpoint 1: mirar las 3 direcciones en el preview, elegir y elegir nombre;
   - checkpoint 2: aprobar la galería y la paleta política;
   - checkpoint 3: recorrer la rebanada re-vestida en Chrome, Firefox y Safari;
   - el OK de cierre.

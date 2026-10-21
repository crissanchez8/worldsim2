# Investigación de diseño (P2.1)

> Insumo de las tres direcciones (P2.2, D58) y del Design System. El repo es público: las
> referencias se **enlazan** y se analizan con palabras; no se suben capturas de juegos ni de
> obras con derechos (BRIEF §4, P2.1).

## 1. Qué tiene que resolver el diseño
La rebanada (P1) ya fija la estructura (D57); P2 decide el aspecto. Cuatro tensiones guían todo:

1. **Mapa contra paneles.** El mapa es el protagonista (PRODUCT.md), pero el inspector, la línea de
   tiempo y el teletipo son densos. En la vista en vivo el mapa tiene que quedar con al menos dos
   tercios del área visible y los paneles se pliegan.
2. **Densidad contra lectura.** El inspector y las tablas piden cifras compactas y alineadas; la
   ficha y la crónica (P11) piden lectura larga y cómoda.
3. **Tiempo real contra consulta.** Los controles de tiempo se usan mientras el mapa cambia (no
   pueden saltar ni moverse); la enciclopedia se recorre en calma.
4. **14.000 años con una sola voz.** El mundo pasa de bandas de forrajeros a ferrocarriles: la
   interfaz no puede pertenecer a una época de la historia simulada.

## 2. Inventario de superficies
Las de P1 existen; las demás las agrega el plan (§13, §16). "Necesidad" es la dominante.

| Superficie | Fase | Necesidad dominante | Notas para el DS |
|---|---|---|---|
| Crear mundo (parámetros, guardados) | P1 → P3 | Formulario corto | P3 suma parámetros (edad, clima, mar) y la génesis animada |
| Barra superior (fecha, era, acciones) | P1 | Lectura de un vistazo | La fecha es el dato más mirado de la app |
| Riel de modos de mapa + leyenda | P1 → P10 | Control y lectura del mapa | De 1 modo (P1) a ~20 (P3–P10): necesita agrupar y rampas en la leyenda |
| Mapa: atlas de lejos, relieve de cerca | P1 → P12 | Lectura a distancia | Paleta política, fronteras, símbolos, rótulos (P3.13), relieve pintado (P12) |
| Inspector (ficha compacta) | P1 | Densidad de datos | Seis tipos hoy; P4–P10 suman religión, casa, mercado, batalla, idioma, epidemia |
| "¿Por qué?" (desglose) | P1 | Densidad + explicabilidad | Base, términos aditivos y multiplicativos, fuente de cada uno |
| Controles de tiempo + línea de tiempo | P1 | Control en tiempo real | Bandas de eras, marcadores ≥ 0,8, cabeza, franja simulada por delante |
| Teletipo de eventos | P1 | Lectura rápida, en movimiento | Fecha + frase + causa; clic centra el mapa |
| Resumen (números clave, gráficos, listas) | P1 → P11 | Densidad | 3 gráficos hoy; P11 suma rankings y estadísticas |
| Ficha de enciclopedia (página) | P1 → P11 | Lectura larga + datos | Dos columnas (D67): datos y eventos con causas |
| Compartir, guardar, avisos | P1 | Tarea corta | Diálogo, toast, banner de versión |
| Atlas histórico | P11 | Lectura a distancia + tiempo | Mapa a cualquier año, fronteras animadas, mapas insertos |
| Árboles (dinastías, religiones, idiomas, tecnología) | P7, P11 | Estructura | GenealogyNode especificado en P2, construido en P7/P11 |
| Crónica por eras | P11 | Lectura larga | La pieza más "editorial" del producto |
| Búsqueda de la enciclopedia | P11 | Consulta | SearchField especificado en P2 |
| Landing, galería, cómo funciona, ajustes | P13 | Presentación (registro *brand*) | Fuera de P2; heredan los tokens |

## 3. Moodboard
Cada referencia dice qué se toma y qué no. Las familias alimentan las direcciones A · Grabado,
B · Observatorio y C · Atlas suizo (D58).

### 3.1 Cartografía grabada, siglos XVIII y XIX (→ A)
- **Fuentes:** [David Rumsey Map Collection](https://www.davidrumsey.com/) y la
  [Geography and Map Division de la Library of Congress](https://www.loc.gov/maps/) (atlas de
  Cary, Arrowsmith y Stieler; la carta de Cassini).
- **Tomar:**
  - el **coloreado de contorno**: una banda de acuarela a lo largo de la frontera, más intensa en
    el borde y desvanecida hacia adentro. Distingue territorios con poca tinta y deja leer el
    relieve debajo;
  - la jerarquía de rótulos: versalitas espaciadas para estados, redonda para ciudades, cursiva
    para el agua;
  - el relieve en hachures (P12) y el marco graduado con los grados en el borde;
  - el papel como era cuando salía de la imprenta: blanco y liso, no envejecido.
- **No tomar:** papel amarillento con manchas, rosas de los vientos y monstruos marinos de relleno,
  cartelas barrocas.

### 3.2 Cartas náuticas y presentación ECDIS (→ B)
- **Fuentes:** cartas de [NOAA](https://nauticalcharts.noaa.gov/) y la biblioteca de presentación
  S-52 de la OHI para ECDIS (paletas de día, crepúsculo y noche).
- **Tomar:**
  - bandas de profundidad con pocos tonos;
  - un color de señal (el magenta de las cartas) reservado para lo importante;
  - la disciplina de una paleta nocturna que no encandila;
  - la información sobre la carta sin taparla.
- **No tomar:** la saturación de sondas y símbolos.

### 3.3 Cartografía suiza y relieve sombreado (→ C)
- **Fuentes:** el visor de [swisstopo](https://map.geo.admin.ch/); Eduard Imhof, *Cartographic
  Relief Presentation* (1982); Tom Patterson en [shadedrelief.com](https://shadedrelief.com/) y
  [Natural Earth](https://www.naturalearthdata.com/) (dominio público).
- **Tomar:**
  - sombreado con perspectiva aérea: más contraste en las alturas, más suave en los valles;
  - tintes hipsométricos apagados;
  - halos claros detrás de los rótulos y una jerarquía tipográfica estricta.
- **No tomar:** el nivel de detalle topográfico (curvas cada 20 m): a ~20 km por celda no hay
  datos para eso.

### 3.4 Mapas de referencia de National Geographic (→ A y C)
- **Tomar:**
  - fronteras con cinta de color a ambos lados (la versión moderna del coloreado de contorno);
  - serif para los rasgos físicos y sans para los políticos;
  - la paleta política pastel que deja ver el relieve.
- **No tomar:** el amarillo de marca.

### 3.5 Juegos de estrategia
- **Victoria 3 y Crusader Kings III:**
  - **tomar:** al alejarse, el terreno 3D se vuelve un mapa de papel pintado con nombres de reinos
    curvados sobre su territorio. Es exactamente el zoom semántico de D5, y el nombre curvado es
    lo que más identidad le da a un mapa político (P3.13/P12);
  - **no tomar:** las texturas de pergamino, los marcos dorados y la UI con texto chico y de bajo
    contraste.
- **Europa Universalis IV:**
  - **tomar:** colores planos por país, con fronteras oscuras finas; se lee a cualquier zoom;
  - **no tomar:** el caso de dos vecinos con colores casi iguales. Eso lo resuelve D63.
- **Dwarf Fortress, Legends:**
  - **tomar:** todo nombre es un link, y cada figura y evento tiene su página con causas (ya está
    en la ficha de P1);
  - **no tomar:** las listas de texto sin jerarquía.
- **Civilization VI y Humankind:**
  - **tomar:** las "lentes" que recolorean el mapa sin cambiar de pantalla (los modos de mapa) y
    el terreno legible de lejos;
  - **no tomar:** la UI caricaturesca y los bordes ornamentados.

### 3.6 Visualización editorial de datos (→ C, y reglas para todas)
- **Fuentes:** [FT Visual Vocabulary](https://ft-interactive.github.io/visual-vocabulary/), los
  gráficos de The Economist y del Upshot del NYT, y el grapher de
  [Our World in Data](https://ourworldindata.org/).
- **Tomar:**
  - títulos que dicen la conclusión ("La población se duplica después del hierro") y no el tema;
  - etiquetas directas en las líneas en lugar de leyendas aparte;
  - notas de fuente;
  - en Our World in Data, el **trío mapa + línea de tiempo + tabla del mismo dato**, que es
    exactamente lo que tienen el resumen y el atlas.
- **No tomar:** las infografías decorativas ni los íconos ilustrados.

### 3.7 Instrumentos (→ B)
- **Fuentes:**
  - la retícula de un osciloscopio;
  - las cintas de velocidad y altitud de una cabina de cristal (un análogo directo de la línea de
    tiempo con su cabeza);
  - el reloj de estación suizo de Hans Hilfiker;
  - las calculadoras de Braun (Dieter Rams), con el color como código de función.
- **Tomar:**
  - escalas graduadas;
  - lecturas numéricas con unidad;
  - cifras tabulares;
  - un solo color de señal;
  - jerarquía por tamaño y no por adorno.
- **No tomar:** cromados, falsos LED, brillos neón ni el HUD de película.

### 3.8 Atlas históricos (→ P11, y para todas)
- **Fuentes:** el *Historischer Weltatlas* de Putzger y el *Times Atlas of World History*
  (Barraclough).
- **Tomar:**
  - fronteras anteriores punteadas;
  - flechas de campañas y migraciones con fecha;
  - mapas insertos chicos para el contexto;
  - colores planos con borde más oscuro del mismo tono.

  Es el lenguaje del atlas histórico de P11, y conviene que la paleta política de P2 ya lo
  soporte: cada color necesita una variante oscura para el borde.

## 4. Anti-referencias (AI slop) y cómo se verían acá
Cada punto se vuelve un ítem de la checklist del DS (P2.10).

| Tentación | Cómo aparecería en worldSim2 | Regla |
|---|---|---|
| Gradiente violeta/azul de "producto de IA" | Fondo de la barra superior o del botón "Generar mundo" | Ningún gradiente decorativo; los únicos gradientes son rampas de datos |
| Glassmorphism | Paneles translúcidos con desenfoque sobre el mapa | Paneles opacos o con un velo plano; el desenfoque sobre el mapa cuesta GPU y ensucia la lectura |
| Emojis como íconos | ⚔️ para batallas, 👑 para gobernantes | Íconos SVG de un solo set y símbolos cartográficos propios |
| Tarjetas SaaS en grilla | Números clave del resumen como tarjetas con ícono y sombra | Cifras en una fila tipográfica, sin cajas; las tarjetas no se anidan |
| Métrica heroica | "590.889.922 personas" gigante con gradiente | Las cifras grandes solo donde son el dato principal, y con su unidad |
| Inter o Space Grotesk "porque sí" | Toda la UI en la sans de siempre | Cada fuente se justifica desde el concepto de la dirección |
| Sombras difusas | Cada panel con `0 10px 30px` | Elevación con borde o con un velo plano; sombras chicas y solo para lo flotante (popovers) |
| Eyebrow en mayúsculas sobre cada bloque | "INSPECTOR", "TELETIPO", "LEYENDA" en versalitas espaciadas en todos lados | Un solo sistema de títulos de panel, elegido por la dirección; no se repite por reflejo |
| Numeración 01/02/03 | Secciones de la ficha numeradas | Solo si el orden es información (un recorrido real) |
| Disfraz de época | Pergamino con manchas, sellos de lacre, rosas de los vientos | La época vive en la tipografía y el color, no en texturas falsas |
| Dashboard sci-fi | Negro puro con cian brillante y glow | Si es oscuro, grafito mate con un solo color de señal, sin brillo |
| Fondo crema "cálido" por defecto | `#f5efe0` de fondo general | El fondo se elige por la escena (§5); nada de crema por reflejo |
| Animación decorativa | Paneles que entran rebotando, números que laten | El movimiento comunica estado (cambio de año, selección, carga), 150–250 ms, nunca rebota |
| Borde lateral de color en tarjetas | Eventos del teletipo con una franja de color a la izquierda | Prohibido; el color va en un símbolo o en el texto |

## 5. Escenas de uso (deciden claro u oscuro, D59)
Una frase física por dirección; el tema sale de la escena, no del gusto.

- **A · Grabado:** de día, en un escritorio con luz natural, alguien recorre su mundo como quien
  hojea un atlas recién impreso. Fondo claro de papel blanco (no crema); la época la dan la tinta y
  la tipografía.
- **B · Observatorio:** de noche, frente a un monitor grande con la habitación a oscuras, alguien
  mira correr 14.000 años como quien observa un experimento. Fondo grafito mate, para que el mapa
  sea lo más luminoso de la pantalla.
- **C · Atlas suizo:** en cualquier momento, en una laptop, alguien consulta su mundo como una
  obra de referencia y salta de dato en dato. Fondo blanco neutro, con la máxima legibilidad.

## 6. Requisitos que salen de la investigación
Valen para las tres direcciones:

1. **Cifras tabulares** en toda tabla, lectura y eje; cifras proporcionales solo en la prosa.
2. **Fecha legible a distancia:** el año es el dato más mirado de la vista en vivo y tiene su
   propio estilo tipográfico.
3. **Paleta política con variante de borde:** cada color trae un tono oscuro para la frontera (el
   atlas histórico de P11 lo necesita) y uno claro para el relleno lejano.
4. **El "por qué" con gramática propia:** la base, los términos que suman y los que multiplican, y
   la fuente de cada uno, se distinguen sin depender solo del color.
5. **Lectura larga a 16–18 px y 65–75 caracteres** por línea en la ficha y la crónica.
6. **El mapa sin tapar:** los paneles ocupan como máximo un tercio del ancho y se pliegan.
7. **Rampas para los modos de mapa**, con luminosidad monótona y legibles bajo las tres
   simulaciones de daltonismo; el relleno no compite con las fronteras.
8. **Nada de texto en el mapa sin halo o fondo** que asegure el contraste sobre cualquier relleno.

// Contenido y tokens candidatos de las tres direcciones de P2.2 (D58). Exploración: los de la
// dirección elegida pasan a `packages/ui/src/tokens/` en P2.4 (D61), con sus tests.
import { oklch } from './color';
import type { DirectionId } from './kits';

export interface UiColor {
  readonly token: string;
  readonly hex: string;
  readonly role: string;
}

export interface Direction {
  readonly id: DirectionId;
  readonly concept: string;
  readonly answer: string;
  readonly scene: string;
  readonly strategy: string;
  readonly ui: readonly UiColor[];
  /** Pares de texto que se usan (texto, fondo, uso); el contraste se calcula en la hoja. */
  readonly pairs: readonly (readonly [string, string, string])[];
  /** Paleta política (la misma del render, `apps/web/src/map/looks.ts`). */
  readonly political: readonly string[];
  readonly eras: readonly string[];
  readonly sequential: readonly string[];
  readonly diverging: readonly string[];
  readonly type: readonly { role: string; family: string; sample: string; cls: string }[];
  readonly atlas: readonly { what: string; how: string; phase: 'P2' | 'P3.13' | 'P12' }[];
  readonly motion: readonly string[];
  readonly icons: string;
  readonly pros: readonly string[];
  readonly cons: readonly string[];
}

/** Rampa de n pasos en OKLCH entre dos extremos (L, C, h). */
function ramp(n: number, from: [number, number, number], to: [number, number, number]) {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const lerp = (a: number, b: number) => a + (b - a) * t;
    return oklch(lerp(from[0], to[0]), lerp(from[1], to[1]), lerp(from[2], to[2]));
  });
}

/** Rampa divergente: dos tramos que se encuentran en un centro neutro. */
function diverging(
  n: number,
  left: [number, number, number],
  mid: [number, number, number],
  right: [number, number, number],
) {
  const half = Math.floor(n / 2);
  return [...ramp(half + 1, left, mid).slice(0, half), ...ramp(half + 1, mid, right)];
}

export const DIRECTION_CONTENT: Readonly<Record<DirectionId, Direction>> = {
  grabado: {
    id: 'grabado',
    concept:
      'El mundo se lee como un atlas grabado de 1780, recién salido de la imprenta. Papel blanco, tinta ferrogálica y el color puesto a mano: una banda de acuarela que recorre cada frontera y se desvanece hacia adentro, como en los atlas de Cary o Stieler. La época vive en la tipografía y en el trazo, no en texturas de papel viejo.',
    answer: 'worldSim2 es un documento: una historia que se va escribiendo y grabando.',
    scene:
      'De día, en un escritorio con luz natural, alguien recorre su mundo como quien hojea un atlas recién impreso.',
    strategy:
      'Contenida: neutros de papel y tinta; el color lo ponen los territorios y la rúbrica.',
    ui: [
      { token: 'paper', hex: '#f6f5f1', role: 'Fondo y paneles' },
      { token: 'paper-2', hex: '#ecebe5', role: 'Pozos, filas alternas' },
      { token: 'ink', hex: '#2b2620', role: 'Texto, filetes, contornos' },
      { token: 'ink-2', hex: '#5a5147', role: 'Texto secundario' },
      { token: 'ink-3', hex: '#6f6457', role: 'Rótulos, unidades' },
      { token: 'rubric', hex: '#a8381f', role: 'Fecha actual, selección, causa' },
      { token: 'wash', hex: '#d9e4e8', role: 'Agua' },
    ],
    pairs: [
      ['ink', 'paper', 'Texto'],
      ['ink-2', 'paper', 'Texto secundario'],
      ['ink-3', 'paper', 'Rótulos chicos'],
      ['ink-3', 'paper-2', 'Rótulos en pozo'],
      ['rubric', 'paper', 'Rúbrica, fecha'],
      ['ink', 'wash', 'Texto sobre agua'],
    ],
    political: [
      '#c8506a',
      '#d9a21b',
      '#2f9c8a',
      '#2f5d8c',
      '#d8572a',
      '#6e9a3a',
      '#8a5a9e',
      '#b98a52',
      '#8e3f2c',
      '#d48fb0',
      '#5f7d2a',
      '#5aa3d4',
    ],
    eras: ['#ebe7de', '#e0d8c9', '#d4c8b2', '#c5b597', '#b09b7a'],
    sequential: ramp(7, [0.96, 0.01, 85], [0.32, 0.04, 55]),
    diverging: diverging(7, [0.45, 0.08, 185], [0.96, 0.01, 85], [0.45, 0.12, 15]),
    type: [
      {
        role: 'Títulos de ficha y cartelas',
        family: 'Libre Caslon Display',
        sample: 'Mautu, 2278 a.C.',
        cls: 't-display',
      },
      {
        role: 'UI, datos y lectura (cifras tabulares en tablas)',
        family: 'Libre Caslon Text',
        sample: 'Población 19.040.655 · Provincias 41',
        cls: 't-text',
      },
      {
        role: 'Rótulo de estado (versalitas espaciadas)',
        family: 'Libre Caslon Text, mayúsculas',
        sample: 'MAUTU',
        cls: 't-realm',
      },
      {
        role: 'Rótulo de agua (cursiva)',
        family: 'Libre Caslon Text cursiva',
        sample: 'mar interior',
        cls: 't-water',
      },
    ],
    atlas: [
      {
        what: 'Banda de acuarela en la frontera',
        how: 'Real en el render: muestreo en anillo del color vecino',
        phase: 'P2',
      },
      { what: 'Papel blanco y tinta', how: 'Real: tierra plana con sombra tintada', phase: 'P2' },
      { what: 'Costa a pluma y retícula', how: 'Real: isolíneas en el shader', phase: 'P2' },
      {
        what: 'Fronteras suaves (sin escalones)',
        how: 'Campo de distancia sobre el ráster de ids',
        phase: 'P3.13',
      },
      {
        what: 'Rótulos en versalitas curvadas',
        how: 'Texto SDF con colocación curva',
        phase: 'P3.13',
      },
      { what: 'Relieve en hachures', how: 'Trazos orientados por pendiente', phase: 'P12' },
    ],
    motion: [
      'Lento y de una sola vez: la tinta se asienta. Fundidos de 240 ms, sin desplazamientos.',
      'El cambio de año repinta los territorios con un fundido de 180 ms (sin barridos).',
      'Nada rebota ni late; con reducción de movimiento todo es instantáneo.',
    ],
    icons:
      'Trazo fino de 1,25 px, puntas rectas, como un buril. Set base: Phosphor (Light), ajustado.',
    pros: [
      'La identidad más propia: nadie la confundiría con otro producto.',
      'El coloreado de contorno deja leer el relieve y distingue vecinos con poca tinta.',
      'Encaja con la enciclopedia y la crónica de P11: lectura larga en una serif de libro.',
    ],
    cons: [
      'Una serif en toda la UI cansa en datos densos (inspector, tablas) y en tamaños chicos.',
      'Lo más vistoso (fronteras suaves, hachures, rótulos curvos) recién llega en P3.13 y P12.',
      'Riesgo de disfraz de época si se agrega ornamento; exige disciplina.',
    ],
  },

  observatorio: {
    id: 'observatorio',
    concept:
      'El mundo es una placa bajo un instrumento de precisión. Grafito mate, escalas en blanco hueso y un solo color de señal, bermellón, para lo que está vivo: la fecha actual, la selección, la batalla. Los territorios brillan desaturados sobre la placa, con curvas de nivel y retícula graduada, como una carta ECDIS de noche.',
    answer: 'worldSim2 es un experimento: un mundo que se observa y se mide.',
    scene:
      'De noche, frente a un monitor grande con la habitación a oscuras, alguien mira correr 14.000 años como quien observa un experimento.',
    strategy:
      'Contenida sobre oscuro: neutros grafito, un color de señal; el color de datos es el mapa.',
    ui: [
      { token: 'plate', hex: '#15171a', role: 'Fondo' },
      { token: 'module', hex: '#1c1f23', role: 'Paneles' },
      { token: 'module-2', hex: '#24282d', role: 'Controles, filas' },
      { token: 'line', hex: '#3a3f45', role: 'Filetes, escalas' },
      { token: 'bone', hex: '#e6e2d8', role: 'Texto y lecturas' },
      { token: 'bone-2', hex: '#b8b4aa', role: 'Texto secundario' },
      { token: 'bone-3', hex: '#99958c', role: 'Unidades, rótulos' },
      { token: 'signal', hex: '#eb5e34', role: 'Vivo, selección, batalla' },
    ],
    pairs: [
      ['bone', 'module', 'Texto'],
      ['bone-2', 'module', 'Texto secundario'],
      ['bone-3', 'module', 'Unidades'],
      ['bone-3', 'module-2', 'Unidades en controles'],
      ['signal', 'module', 'Señal'],
      ['bone', 'plate', 'Texto sobre la placa'],
    ],
    political: [
      '#ea988d',
      '#b37646',
      '#ccae63',
      '#818e44',
      '#84c38d',
      '#2f9a86',
      '#58c3d2',
      '#458ebb',
      '#96aff1',
      '#8d79bb',
      '#d49ad1',
      '#b66c86',
    ],
    eras: ['#2a2e33', '#323840', '#3c434b', '#474f58', '#545d68'],
    sequential: ramp(7, [0.24, 0.02, 230], [0.9, 0.11, 195]),
    diverging: diverging(7, [0.72, 0.11, 220], [0.26, 0.01, 240], [0.72, 0.14, 40]),
    type: [
      {
        role: 'UI y rótulos (grotesca condensada técnica)',
        family: 'IBM Plex Sans Condensed',
        sample: 'Mautu · Estado · activo',
        cls: 't-text',
      },
      {
        role: 'Lecturas, fechas y cifras (mono tabular)',
        family: 'IBM Plex Mono',
        sample: '1000 d.C.  19.040.655  566.325 pts',
        cls: 't-mono',
      },
      {
        role: 'Rótulo de estado',
        family: 'IBM Plex Sans Condensed, mayúsculas',
        sample: 'MAUTU',
        cls: 't-realm',
      },
      {
        role: 'Lectura larga (ficha, crónica)',
        family: 'IBM Plex Sans Condensed 17 px',
        sample: 'Mautu nace en la provincia 401 en 2278 a.C.',
        cls: 't-long',
      },
    ],
    atlas: [
      { what: 'Placa de grafito con sombreado', how: 'Real: tierra plana con sombra', phase: 'P2' },
      { what: 'Curvas de nivel cada 500 m', how: 'Real: isolíneas de elevación', phase: 'P2' },
      { what: 'Bandas de profundidad (ECDIS)', how: 'Real: profundidad cuantizada', phase: 'P2' },
      { what: 'Retícula graduada y costa', how: 'Real: isolíneas en el shader', phase: 'P2' },
      {
        what: 'Escala graduada en el marco',
        how: 'Componente de UI sobre el mapa',
        phase: 'P3.13',
      },
      { what: 'Brillo de las ciudades por población', how: 'Sprites con emisión', phase: 'P12' },
    ],
    motion: [
      'Preciso y corto: 140 ms, salida exponencial; la aguja se asienta, no oscila.',
      'Las cifras cambian en su lugar (cifras tabulares: no saltan de ancho).',
      'La cabeza de la línea de tiempo avanza continua; con reducción de movimiento, por saltos.',
    ],
    icons: 'Geométricos de 1,5 px, puntas cortadas, esquinas rectas. Set base: Lucide, ajustado.',
    pros: [
      'El mapa es lo más luminoso de la pantalla: los territorios se leen de un vistazo.',
      'La mono tabular hace del inspector y del porqué un instrumento: todo alinea.',
      'Es la que mejor aguanta horas de corrida y la densidad de datos de P6–P10.',
    ],
    cons: [
      'Oscuro: la lectura larga (crónica, enciclopedia) es menos cómoda que sobre blanco.',
      'El lenguaje de instrumento es el más cercano a la estética de dashboard: hay que cuidar el slop.',
      'Menos "histórica": la época la tiene que contar el mapa, no la interfaz.',
    ],
  },

  suizo: {
    id: 'suizo',
    concept:
      'El mundo es una obra de referencia: un atlas escolar suizo con un anuario editorial al lado. Blanco, gris tinta y relieve sombreado al estilo de Imhof bajo tintes planos y apagados; fronteras en el tono oscuro de cada territorio con un halo blanco. Los gráficos titulan con su conclusión, como en el FT o The Economist.',
    answer: 'worldSim2 es una obra de consulta: un mundo que se recorre dato por dato.',
    scene:
      'En cualquier momento, en una laptop, alguien consulta su mundo como una obra de referencia y salta de dato en dato.',
    strategy: 'Paleta completa para datos, sobre neutros puros; un rojo editorial para lo actual.',
    ui: [
      { token: 'white', hex: '#ffffff', role: 'Fondo y paneles' },
      { token: 'grey-1', hex: '#f3f3f1', role: 'Riel, pozos' },
      { token: 'rule', hex: '#d6d6d1', role: 'Filetes finos' },
      { token: 'ink', hex: '#1f1f1f', role: 'Texto, filete fuerte' },
      { token: 'ink-2', hex: '#4a4a4a', role: 'Texto secundario' },
      { token: 'ink-3', hex: '#686868', role: 'Rótulos, unidades' },
      { token: 'red', hex: '#c4262e', role: 'Actual, selección' },
      { token: 'lake', hex: '#cfe2ee', role: 'Agua' },
    ],
    pairs: [
      ['ink', 'white', 'Texto'],
      ['ink-2', 'white', 'Texto secundario'],
      ['ink-3', 'white', 'Rótulos chicos'],
      ['ink-3', 'grey-1', 'Rótulos en el riel'],
      ['red', 'white', 'Actual'],
      ['ink', 'lake', 'Texto sobre agua'],
    ],
    political: [
      '#ffbebd',
      '#dea280',
      '#f2cf94',
      '#b4b676',
      '#b7e3ad',
      '#77c3a9',
      '#8ee6ea',
      '#76bcdd',
      '#b4d6ff',
      '#b0a8e4',
      '#eec3f7',
      '#db9bb9',
    ],
    eras: ['#eef0f0', '#e2e7e9', '#d4dce0', '#c4d0d6', '#b1c1c9'],
    sequential: ramp(7, [0.97, 0.01, 240], [0.38, 0.11, 250]),
    diverging: diverging(7, [0.42, 0.1, 250], [0.97, 0.005, 90], [0.42, 0.11, 35]),
    type: [
      {
        role: 'UI, datos y rótulos (grotesca editorial)',
        family: 'Schibsted Grotesk',
        sample: 'Mautu · Estado · 41 provincias',
        cls: 't-text',
      },
      {
        role: 'Lectura larga (serif con tamaños ópticos)',
        family: 'Newsreader',
        sample: 'Mautu nace en la provincia 401 en 2278 a.C.',
        cls: 't-long',
      },
      {
        role: 'Rótulo de estado (mayúsculas espaciadas)',
        family: 'Schibsted Grotesk, mayúsculas',
        sample: 'MAUTU',
        cls: 't-realm',
      },
      {
        role: 'Rótulo de agua (serif cursiva)',
        family: 'Newsreader cursiva',
        sample: 'mar interior',
        cls: 't-water',
      },
    ],
    atlas: [
      {
        what: 'Tintes hipsométricos con sombra Imhof',
        how: 'Real: rampa por elevación',
        phase: 'P2',
      },
      {
        what: 'Frontera en el tono del relleno',
        how: 'Real: el color vecino oscurecido',
        phase: 'P2',
      },
      { what: 'Halo blanco en la frontera', how: 'Real: anillo de muestreo', phase: 'P2' },
      {
        what: 'Rótulos jerárquicos con halo',
        how: 'Texto SDF, colocación por área',
        phase: 'P3.13',
      },
      { what: 'Fronteras suaves', how: 'Campo de distancia', phase: 'P3.13' },
      { what: 'Relieve con perspectiva aérea', how: 'Sombreado de varias luces', phase: 'P12' },
    ],
    motion: [
      'Mínimo y funcional: 160 ms, salida exponencial; solo cambios de estado.',
      'Los gráficos no se animan al entrar: el dato aparece listo para leerse.',
      'Con reducción de movimiento todo es instantáneo.',
    ],
    icons: 'Lineales de 1,75 px con puntas redondas, pictogramas de señalética. Set base: Lucide.',
    pros: [
      'La más legible en todas las superficies: datos, lectura larga y mapa.',
      'Es la más barata en el mapa: casi todo lo que muestra ya es real hoy.',
      'Los gráficos editoriales se vuelven el estilo natural del resumen y las estadísticas.',
    ],
    cons: [
      'Es la menos memorable: el riesgo es parecer un producto de datos más.',
      'Los rellenos pastel cuestan en las regiones con muchos estados chicos.',
      'La personalidad depende de detalles finos (tipografía, gráficos, rótulos).',
    ],
  },
};

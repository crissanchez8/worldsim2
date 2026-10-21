// Portada de las maquetas de P2.2: las tres direcciones lado a lado (miniaturas vivas de las
// maquetas), la comparación, la crítica y la recomendación para el checkpoint 🎨 1.
import './styles/hub.css';
import { DIRECTION_CONTENT } from './directions';
import { DIRECTIONS, KITS } from './kits';
import { renderUrl } from './render';

const PAGES = [
  ['vivo', 'Vista en vivo'],
  ['inspector', 'Inspector con porqué'],
  ['ficha', 'Ficha'],
  ['atlas', 'Recorte de atlas'],
] as const;

const thumb = (d: string, p: string, label: string) => `
  <a class="thumb" href="mock.html?d=${d}&p=${p}">
    <span class="viewport"><iframe src="mock.html?d=${d}&p=${p}" title="${label}" loading="lazy" tabindex="-1" aria-hidden="true"></iframe></span>
    <span class="cap">${label}</span>
  </a>`;

const column = (d: (typeof DIRECTIONS)[number]) => {
  const k = KITS[d];
  const c = DIRECTION_CONTENT[d];
  return `
  <section class="dir" aria-labelledby="h-${d}">
    <p class="letter">Dirección ${k.letter}</p>
    <h2 id="h-${d}">${k.name}</h2>
    <p class="tagline">${k.tagline}</p>
    <div class="thumbs">${PAGES.map(([p, l]) => thumb(d, p, l)).join('')}</div>
    <p class="answer">${c.answer}</p>
    <p class="scene">${c.scene}</p>
    <h3>A favor</h3><ul>${c.pros.map((x) => `<li>${x}</li>`).join('')}</ul>
    <h3>En contra</h3><ul>${c.cons.map((x) => `<li>${x}</li>`).join('')}</ul>
    <a class="more" href="mock.html?d=${d}&p=hoja">Hoja completa: color, contraste, daltonismo, tipografía, íconos, símbolos, emblemas, atlas y movimiento</a>
  </section>`;
};

const ROWS: readonly [string, string, string, string][] = [
  [
    'Identidad',
    'La más propia y memorable: coloreado de contorno, Caslon, rúbrica.',
    'Fuerte pero de un género conocido (instrumento, sala de control).',
    'Correcta y sobria; la que menos se recuerda.',
  ],
  [
    'Datos densos (inspector, tablas)',
    'Buena con cifras tabulares, pero la serif a 13 px cansa en tablas largas.',
    'La mejor: mono tabular, todo alinea.',
    'Muy buena: grotesca editorial, grilla clara.',
  ],
  [
    'Lectura larga (ficha, crónica)',
    'La mejor: es una serif de libro.',
    'La más débil: texto claro sobre oscuro, condensada.',
    'Muy buena: Newsreader con tamaños ópticos.',
  ],
  [
    'Mapa a distancia',
    'Se leen el relieve y los vecinos; los rellenos son tenues.',
    'Los territorios brillan: se leen de un vistazo.',
    'Atlas escolar claro; los pastel cuestan con estados chicos.',
  ],
  [
    'Lo que ya es real en el mapa',
    'Banda de contorno, costa a pluma, retícula. Faltan fronteras suaves (P3.13) y hachures (P12).',
    'Curvas de nivel, bandas de profundidad, retícula. Falta la escala en el marco (P3.13).',
    'Hipsometría con sombra, frontera oscura con halo. Faltan rótulos (P3.13).',
  ],
  [
    'Tema',
    'Claro (papel blanco, sin crema).',
    'Oscuro (grafito, sin negro puro).',
    'Claro (blanco neutro).',
  ],
  [
    'Riesgo de slop',
    'Disfraz de época si se agrega ornamento.',
    'Dashboard sci-fi si se agrega brillo o un segundo acento.',
    'SaaS genérico si se pierde el detalle tipográfico.',
  ],
  [
    'Contraste mínimo de texto',
    '4,83:1 (rótulos en pozo)',
    '4,96:1 (unidades en controles)',
    '5,02:1 (rótulos en el riel)',
  ],
];

const hub = document.getElementById('hub');
if (hub) {
  hub.innerHTML = `
  <header class="head">
    <p class="kicker">worldSim2 · P2.2 · checkpoint 🎨 1</p>
    <h1>Tres direcciones de diseño</h1>
    <p class="intro">Las tres maquetan las mismas cuatro superficies con datos reales de una corrida: semilla 1, mundo mediano, año 1000 d.C., con <strong>Mautu</strong> (41 provincias) como protagonista. Los mapas son <strong>renders reales</strong> del motor de P1 con el parámetro de desarrollo <code>?look=</code>; los rótulos y los símbolos van superpuestos (llegan al mapa en P3.13 y P2.11). La estructura de las pantallas es la aprobada en D57: cambia el aspecto, no la estructura.</p>
    <figure class="before">
      <img src="${renderUrl('p1', 'atlas', 'jpg')}" alt="El mapa de P1 en el mismo encuadre: colores por id de polity, vecinos casi iguales" width="1440" height="900">
      <figcaption>Antes (P1): el mismo encuadre con el color por id de polity. Los turquesas vecinos del centro son el problema que resuelve D63.</figcaption>
    </figure>
  </header>
  <div class="dirs">${DIRECTIONS.map(column).join('')}</div>
  <section class="compare" aria-labelledby="h-compare">
    <h2 id="h-compare">Comparación</h2>
    <table>
      <thead><tr><th></th>${DIRECTIONS.map((d) => `<th>${KITS[d].letter} · ${KITS[d].name}</th>`).join('')}</tr></thead>
      <tbody>${ROWS.map((r) => `<tr><th scope="row">${r[0]}</th><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody>
    </table>
  </section>
  <section class="reco" aria-labelledby="h-reco">
    <h2 id="h-reco">Mi recomendación</h2>
    <p><strong>A · Grabado</strong>, con las reglas de gráficos editoriales de C (títulos que concluyen, etiquetas directas), que no dependen de la dirección.</p>
    <ul>
      <li><strong>Por qué:</strong> es la única que nadie confundiría con otro producto, y el proyecto es una pieza pública de portfolio. Su lenguaje cartográfico ya es real: el coloreado de contorno distingue vecinos con poca tinta y deja leer el relieve. Y es la mejor para la enciclopedia y la crónica de P11, que son el final del recorrido.</li>
      <li><strong>Qué hay que vigilar:</strong> la densidad. En el inspector y las tablas, la Caslon pide 13–14 px como mínimo y cifras tabulares siempre. Si en el checkpoint 2 la galería muestra que cansa, el plan B es una grotesca chica solo para tablas (una mezcla explícita, a decidir ahí).</li>
      <li><strong>No recomiendo B como dirección por defecto</strong> para una web pública: es la que mejor luce el mapa de noche, pero el género "sala de control oscura" es el más cercano al slop de dashboards y el más flojo para leer. Si te imaginás a la gente mirándolo de noche durante horas, es la alternativa válida.</li>
      <li><strong>C es la opción segura:</strong> la más legible y la más barata, pero la que menos identidad deja.</li>
    </ul>
    <p class="next">Cuando elijas (una dirección o una mezcla explícita), te propongo 5–8 nombres que encajen con ella, con la disponibilidad verificada (Q5, D65).</p>
  </section>
  <section class="critique" aria-labelledby="h-crit">
    <h2 id="h-crit">Crítica anti-slop (impeccable)</h2>
    <p>El detector determinista no encontró patrones de slop en el código de las maquetas (0 hallazgos). La revisión de diseño la hice yo en secuencia, sin subagentes. Lo que encontré y corregí antes de mostrarte esto:</p>
    <ul>
      <li>Los rótulos de estado quedaban tapados por los símbolos de ciudades, o debajo de los paneles: ahora mandan los rótulos, los símbolos se generalizan y los paneles excluyen su zona.</li>
      <li>Las capitales caían debajo del nombre de su estado: el rótulo sube.</li>
      <li>El texto secundario de B no llegaba a AA en los controles (4,37:1): se aclaró a 4,96:1.</li>
      <li>En C, las cifras tabulares de Schibsted espaciaban "d . C .": usa cifras proporcionales.</li>
      <li>Los ríos chicos saturaban la vista de cerca: cada dirección muestra solo los grandes.</li>
    </ul>
    <p>Lo que queda y no es de diseño:</p>
    <ul>
      <li>Las fronteras tienen escalones de 20 km (el ráster de provincias), en las tres direcciones; los suaviza el campo de distancia de P3.13.</li>
      <li>Los datos son los de la calibración de P1, como "Edad moderna temprana" en el 1000 d.C. o la imprenta en el 644 d.C. Se calibran en P4/P5 (D56).</li>
    </ul>
  </section>`;
}

// Las miniaturas son las maquetas en vivo (1440 × 900) escaladas al ancho de su caja.
const fit = () => {
  for (const v of document.querySelectorAll<HTMLElement>('.thumb .viewport')) {
    v.style.setProperty('--scale', String(v.clientWidth / 1440));
  }
};
new ResizeObserver(fit).observe(document.body);
fit();

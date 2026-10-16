/**
 * Catálogo base (es). Es la fuente de la forma: `en` tiene que tener exactamente las mismas
 * claves (lo verifica el tipo `Catalog` y un test).
 */
export const es = {
  app: {
    name: 'worldSim2',
    tagline: 'Simulador de historia emergente',
  },
  placeholder: {
    title: 'La casa está lista',
    body: 'Fase 0: fundaciones de arquitectura. Todavía no hay mundo que mirar.',
    engineVersion: 'Motor v{{version}}',
  },
  /** Mapa v1 (P1.2): estado de la carga, relleno de prueba y lo que hay bajo el mouse. */
  map: {
    status: {
      starting: 'Preparando el mapa…',
      generating: 'Generando el mundo: {{stage}} ({{index}} de {{total}})',
      ready:
        'Semilla {{seed}} · mundo {{size}} · {{provinces}} provincias · {{backend}} · listo en {{seconds}} s',
      error: 'No se pudo mostrar el mapa: {{message}}',
    },
    stage: {
      plates: 'placas',
      relief: 'relieve',
      erosion: 'erosión',
      climate: 'clima',
      hydrology: 'ríos y lagos',
      biomes: 'biomas',
      provinces: 'provincias',
      seas: 'mares',
      graph: 'caminos',
      hash: 'verificación',
    },
    backend: {
      webgpu: 'WebGPU',
      webgl2: 'WebGL2',
      webgl2Forced: 'WebGL2 (forzado)',
    },
    colors: {
      label: 'Relleno de prueba',
      biome: 'Bioma dominante',
      id: 'Un color por provincia',
      none: 'Sin relleno',
    },
    hover: {
      province: 'Provincia {{id}}',
      area: '{{area}} km²',
      ocean: 'Océano',
      lake: 'Lago',
    },
    selected: 'Seleccionada: provincia {{id}}',
    help: 'Arrastrar para mover · rueda para acercar · Q y E para girar · clic para seleccionar',
  },
  time: {
    yearBC: '{{year}} a.C.',
    yearAD: '{{year}} d.C.',
  },
  language: {
    label: 'Idioma',
    es: 'Español',
    en: 'English',
  },
  /** Plantillas de eventos: `events.<clave del evento>` (las exige un test de @ws/sim). */
  events: {
    territory: {
      changed: '{{province}} pasa de {{from}} a {{to}}',
    },
  },
  /** Nombres de las filas de contenido: `content.<tabla>.<clave>` (los exige un test). */
  content: {
    worldSize: { small: 'Chico', medium: 'Mediano' },
    mapType: { continents: 'Continentes', pangaea: 'Pangea', archipelago: 'Archipiélago' },
    biome: {
      ice: 'Hielo',
      alpine: 'Alpino',
      tundra: 'Tundra',
      taiga: 'Taiga',
      desert: 'Desierto',
      grassland: 'Pradera',
      temperateForest: 'Bosque templado',
      savanna: 'Sabana',
      tropicalForest: 'Selva tropical',
    },
    stratum: { common: 'Común' },
    law: { primogeniture: 'Primogenitura' },
  },
} as const;

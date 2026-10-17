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
      label: 'Relleno',
      political: 'Político',
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
  live: {
    status: {
      starting: 'Preparando la simulación…',
      year: '{{year}} · {{era}}',
      waiting: 'esperando a la simulación',
      ahead: 'simulado hasta {{year}}',
      finished: 'fin de la corrida',
      viewOnly:
        'Historia guardada con la versión {{version}} del motor: se puede mirar, no continuar',
      cost: '{{ms}} ms por año simulado',
      error: 'La simulación falló: {{message}}',
    },
    speed: {
      label: 'Velocidad',
      pause: 'Pausa',
      x1: '1×',
      x2: '2×',
      x4: '4×',
      max: 'Máx.',
    },
    timeline: {
      label: 'Línea de tiempo: hacé clic o arrastrá para ir a otro año',
    },
    saves: {
      save: 'Guardar',
      saving: 'Guardando…',
      saved: 'Guardado hasta {{year}}',
      title: 'Mundos guardados',
      empty: 'Todavía no hay mundos guardados.',
      item: 'Semilla {{seed}} · {{size}} · hasta {{year}}',
      load: 'Cargar',
      remove: 'Borrar',
      loading: 'Cargando el mundo guardado…',
      notFound: 'No se encontró el mundo guardado {{id}}.',
      error: 'No se pudo guardar: {{message}}',
    },
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
    subsistence: {
      shifted: 'En {{province}} la agricultura ya alimenta a la mayoría',
    },
    famine: {
      started: 'Hambruna en {{province}}',
      ended: 'Termina la hambruna en {{province}}',
    },
    innovation: {
      invented: '{{innovation}} surge en {{province}}',
    },
    settlement: {
      founded: 'Se funda {{settlement}} en {{province}}',
      grew: '{{settlement}} crece: ahora es {{level}}',
      declined: '{{settlement}} decae: ahora es {{level}}',
    },
    polity: {
      formed: 'Nace {{polity}} en {{province}}',
      absorbed: '{{polity}} se integra a {{by}}',
      collapsed: '{{polity}} desaparece',
    },
    person: {
      died: 'Muere {{person}} a los {{age}} años',
    },
    ruler: {
      succeeded: '{{person}} gobierna {{polity}}',
    },
    war: {
      declared: '{{attacker}} declara la guerra a {{defender}}',
      ended: 'Termina la guerra entre {{attacker}} y {{defender}}',
    },
    treaty: {
      signed: 'Paz entre {{attacker}} y {{defender}}',
    },
    battle: {
      fought: 'Batalla en {{province}} entre {{attacker}} y {{defender}}',
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
    settlementLevel: {
      village: 'Aldea',
      town: 'Pueblo',
      city: 'Ciudad',
      greatCity: 'Gran ciudad',
      metropolis: 'Metrópoli',
    },
    innovation: {
      agriculture: 'Agricultura',
      pastoralism: 'Pastoreo',
      pottery: 'Cerámica',
      wheel: 'Rueda',
      copper: 'Metalurgia del cobre',
      plough: 'Arado',
      writing: 'Escritura',
      bronze: 'Bronce',
      iron: 'Hierro',
      coinage: 'Moneda acuñada',
      cropRotation: 'Rotación de cultivos',
      oceanNavigation: 'Navegación oceánica',
      printing: 'Imprenta',
      gunpowder: 'Pólvora',
    },
    era: {
      prehistory: 'Prehistoria',
      neolithic: 'Neolítico',
      bronzeAge: 'Edad del bronce',
      ironAge: 'Edad del hierro',
      earlyModern: 'Edad moderna temprana',
    },
    stratum: { common: 'Común' },
    law: { primogeniture: 'Primogenitura' },
  },
} as const;

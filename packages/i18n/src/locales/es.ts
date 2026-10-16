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

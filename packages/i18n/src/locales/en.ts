import type { Catalog } from '../catalog';

export const en: Catalog = {
  app: {
    name: 'worldSim2',
    tagline: 'Emergent history simulator',
  },
  placeholder: {
    title: 'The house is ready',
    body: 'Phase 0: architecture foundations. There is no world to watch yet.',
    engineVersion: 'Engine v{{version}}',
  },
  time: {
    yearBC: '{{year}} BC',
    yearAD: '{{year}} AD',
  },
  language: {
    label: 'Language',
    es: 'Español',
    en: 'English',
  },
  events: {
    territory: {
      changed: '{{province}} passes from {{from}} to {{to}}',
    },
    subsistence: {
      shifted: 'In {{province}} farming now feeds most people',
    },
    famine: {
      started: 'Famine in {{province}}',
      ended: 'The famine in {{province}} ends',
    },
    innovation: {
      invented: '{{innovation}} emerges in {{province}}',
    },
    settlement: {
      founded: '{{settlement}} is founded in {{province}}',
      grew: '{{settlement}} grows into a {{level}}',
      declined: '{{settlement}} declines into a {{level}}',
    },
    polity: {
      formed: '{{polity}} arises in {{province}}',
      absorbed: '{{polity}} joins {{by}}',
      collapsed: '{{polity}} vanishes',
    },
    person: {
      died: '{{person}} dies aged {{age}}',
    },
    ruler: {
      succeeded: '{{person}} rules {{polity}}',
    },
    war: {
      declared: '{{attacker}} declares war on {{defender}}',
      ended: 'The war between {{attacker}} and {{defender}} ends',
    },
    treaty: {
      signed: 'Peace between {{attacker}} and {{defender}}',
    },
    battle: {
      fought: 'Battle in {{province}} between {{attacker}} and {{defender}}',
    },
  },
  content: {
    worldSize: { small: 'Small', medium: 'Medium' },
    mapType: { continents: 'Continents', pangaea: 'Pangaea', archipelago: 'Archipelago' },
    biome: {
      ice: 'Ice',
      alpine: 'Alpine',
      tundra: 'Tundra',
      taiga: 'Taiga',
      desert: 'Desert',
      grassland: 'Grassland',
      temperateForest: 'Temperate forest',
      savanna: 'Savanna',
      tropicalForest: 'Tropical forest',
    },
    settlementLevel: {
      village: 'Village',
      town: 'Town',
      city: 'City',
      greatCity: 'Great city',
      metropolis: 'Metropolis',
    },
    innovation: {
      agriculture: 'Agriculture',
      pastoralism: 'Pastoralism',
      pottery: 'Pottery',
      wheel: 'Wheel',
      copper: 'Copper metallurgy',
      plough: 'Plough',
      writing: 'Writing',
      bronze: 'Bronze',
      iron: 'Iron',
      coinage: 'Coinage',
      cropRotation: 'Crop rotation',
      oceanNavigation: 'Ocean navigation',
      printing: 'Printing press',
      gunpowder: 'Gunpowder',
    },
    era: {
      prehistory: 'Prehistory',
      neolithic: 'Neolithic',
      bronzeAge: 'Bronze Age',
      ironAge: 'Iron Age',
      earlyModern: 'Early modern age',
    },
    stratum: { common: 'Commoners' },
    law: { primogeniture: 'Primogeniture' },
  },
};

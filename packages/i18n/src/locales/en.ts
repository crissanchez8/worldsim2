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

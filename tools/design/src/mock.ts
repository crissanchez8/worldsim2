// Entrada de `mock.html?d=<dirección>&p=<página>`: una maqueta de 1440 × 900 (o la hoja de la
// dirección, más alta). Los colores de la UI salen de `directions.ts` como custom properties, igual
// que hará `tokens.css` en P2.4 (D61).
import './styles/base.css';
import './styles/grabado.css';
import './styles/observatorio.css';
import './styles/suizo.css';
import type { Shot } from './data';
import { DIRECTION_CONTENT } from './directions';
import { DIRECTIONS, type DirectionId, KITS } from './kits';
import {
  atlasPage,
  fichaPage,
  hojaPage,
  inspectorPage,
  type PageId,
  renderUrl,
  vivoPage,
} from './render';

const PAGES: readonly PageId[] = ['hoja', 'vivo', 'inspector', 'ficha', 'atlas'];

const params = new URLSearchParams(window.location.search);
const d = params.get('d') ?? 'grabado';
const p = params.get('p') ?? 'hoja';
const dir: DirectionId = (DIRECTIONS as readonly string[]).includes(d)
  ? (d as DirectionId)
  : 'grabado';
const page: PageId = (PAGES as readonly string[]).includes(p) ? (p as PageId) : 'hoja';
const kit = KITS[dir];

const root = document.documentElement;
root.dataset['dir'] = dir;
root.dataset['page'] = page;
for (const c of DIRECTION_CONTENT[dir].ui) root.style.setProperty(`--${c.token}`, c.hex);
const fonts = document.createElement('link');
fonts.rel = 'stylesheet';
fonts.href = kit.fonts;
document.head.append(fonts);
document.title = `${kit.letter} · ${kit.name} · ${page} · worldSim2 P2.2`;

async function shot(name: string): Promise<Shot> {
  const res = await fetch(renderUrl(dir, name, 'json'));
  return (await res.json()) as Shot;
}

async function main() {
  const frame = document.getElementById('frame');
  if (!frame) return;
  switch (page) {
    case 'hoja':
      frame.innerHTML = hojaPage(kit);
      break;
    case 'vivo':
      frame.innerHTML = vivoPage(kit, await shot('vivo'));
      break;
    case 'inspector':
      frame.innerHTML = inspectorPage(kit, await shot('cerca'));
      break;
    case 'ficha':
      frame.innerHTML = fichaPage(kit, await shot('atlas'));
      break;
    case 'atlas':
      frame.innerHTML = atlasPage(kit, await shot('atlas'));
      break;
  }
  await document.fonts.ready;
  root.dataset['ready'] = '1';
}

void main();

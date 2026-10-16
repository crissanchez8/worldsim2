// Arma el sitio estático que se despliega en Cloudflare Pages (D31, D33):
//   site/                  ← apps/web/dist
//   site/tools/<name>/     ← tools/<name>/dist (páginas de desarrollo, p. ej. determinismo)
//   site/spikes/<name>/    ← spikes/<name>/dist (si existe; se borran al cerrar P1, D52)
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = join(root, 'site');
const webDist = join(root, 'apps/web/dist');

if (!existsSync(webDist)) {
  console.error('Falta apps/web/dist: corré `pnpm build` primero.');
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(webDist, out, { recursive: true });

/** Copia `<folder>/<name>/dist` a `site/<folder>/<name>/` para cada paquete que tenga build. */
function copyDists(folder) {
  const dir = join(root, folder);
  if (!existsSync(dir)) return [];
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(dir, entry.name, 'dist')))
    .map((entry) => entry.name)
    .sort();
  for (const name of names) {
    cpSync(join(dir, name, 'dist'), join(out, folder, name), { recursive: true });
  }
  return names;
}

const tools = copyDists('tools');
const spikes = copyDists('spikes');
const list = (names) => (names.length ? `: ${names.join(', ')}` : '');
console.log(
  `site/ listo · web + ${tools.length} herramienta(s)${list(tools)} + ${spikes.length} spike(s)${list(spikes)}`,
);

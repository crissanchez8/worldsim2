// Arma el sitio estático que se despliega en Cloudflare Pages (D31, D33):
//   site/               ← apps/web/dist
//   site/spikes/<name>/ ← spikes/<name>/dist (si existe)
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

const spikesDir = join(root, 'spikes');
const spikes = readdirSync(spikesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(spikesDir, entry.name, 'dist')))
  .map((entry) => entry.name)
  .sort();

for (const name of spikes) {
  cpSync(join(spikesDir, name, 'dist'), join(out, 'spikes', name), { recursive: true });
}

console.log(
  `site/ listo · web + ${spikes.length} spike(s)${spikes.length ? `: ${spikes.join(', ')}` : ''}`,
);

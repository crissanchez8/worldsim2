import { defineConfig } from 'vite';

// Se sirve y se despliega bajo /spikes/determinism/ (scripts/assemble-site.mjs, D33).
export default defineConfig({
  base: '/spikes/determinism/',
  build: { target: 'es2023', sourcemap: true },
  worker: { format: 'es' },
});

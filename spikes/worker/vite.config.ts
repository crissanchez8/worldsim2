import { defineConfig } from 'vite';

// Se sirve y se despliega bajo /spikes/worker/ (scripts/assemble-site.mjs, D33).
export default defineConfig({
  base: '/spikes/worker/',
  build: { target: 'es2023', sourcemap: true },
  worker: { format: 'es' },
});

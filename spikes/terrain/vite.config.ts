import { defineConfig } from 'vite';

// Se sirve y se despliega bajo /spikes/terrain/ (scripts/assemble-site.mjs, D33).
export default defineConfig({
  base: '/spikes/terrain/',
  build: {
    target: 'es2023',
    sourcemap: true,
    // three/webgpu pesa ~1 MB minificado; es un spike, no hace falta partirlo.
    chunkSizeWarningLimit: 2048,
  },
});

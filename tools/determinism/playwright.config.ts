import { defineConfig, devices } from '@playwright/test';

// La misma página en los tres motores contra el build (`vite preview`, L-009).
// Años por corrida: DETERMINISM_YEARS (por defecto, la corrida completa de la referencia).
export default defineConfig({
  testDir: 'tests',
  timeout: 15 * 60 * 1000,
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4177/tools/determinism/' },
  webServer: {
    command: 'pnpm exec vite preview --port 4177 --strictPort',
    url: 'http://localhost:4177/tools/determinism/',
    reuseExistingServer: !process.env['CI'],
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});

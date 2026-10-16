import { defineConfig, devices } from '@playwright/test';

// Spike C: la misma página en los tres motores contra el build (`vite preview`).
// Años por corrida: DETERMINISM_YEARS (PR: 2.000; nocturno: 14.000).
export default defineConfig({
  testDir: 'tests',
  timeout: 15 * 60 * 1000,
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4176/spikes/determinism/' },
  webServer: {
    command: 'pnpm exec vite preview --port 4176 --strictPort',
    url: 'http://localhost:4176/spikes/determinism/',
    reuseExistingServer: !process.env['CI'],
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});

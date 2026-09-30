import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '../tests/browser', testMatch: 'experiences.spec.mjs', timeout: 60_000, workers: 1,
  outputDir: '../test-results/glimpse-station-fix',
  use: { baseURL: 'http://127.0.0.1:3014', headless: true },
  webServer: { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 3014 --strictPort', url: 'http://127.0.0.1:3014', cwd: process.cwd(), reuseExistingServer: false },
});

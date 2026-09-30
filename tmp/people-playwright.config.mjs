import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '../tests/browser', testMatch: 'people-tower.spec.mjs', timeout: 60_000, workers: 1,
  outputDir: '../test-results/people-tower',
  use: { baseURL: 'http://127.0.0.1:3012', headless: true },
  webServer: { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 3012 --strictPort', url: 'http://127.0.0.1:3012', cwd: process.cwd(), reuseExistingServer: false },
});

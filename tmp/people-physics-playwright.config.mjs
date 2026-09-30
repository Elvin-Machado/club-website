import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '../tests/browser', testMatch: 'people-tower.spec.mjs', timeout: 90_000, workers: 1,
  outputDir: '../output/people-physics-check',
  use: { baseURL: 'http://127.0.0.1:3027', headless: true },
  webServer: { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 3027 --strictPort', url: 'http://127.0.0.1:3027', cwd: process.cwd(), reuseExistingServer: false },
});

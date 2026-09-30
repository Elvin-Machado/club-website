import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', timeout: 60_000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:3010', headless: true },
  webServer: { command: 'npx vite --host 127.0.0.1 --port 3010 --strictPort', url: 'http://127.0.0.1:3010', reuseExistingServer: false },
});

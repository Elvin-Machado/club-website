import config from '../playwright.config.mjs';
import { fileURLToPath } from 'node:url';
export default {
  ...config,
  testDir: '../tests/browser',
  outputDir: './experience-results',
  webServer: { ...config.webServer, cwd: fileURLToPath(new URL('..', import.meta.url)), reuseExistingServer: true },
};

import os from 'node:os';
import path from 'node:path';
import { defineConfig } from '@playwright/test';

// Tests de bout en bout (dossier e2e/) : l'application est construite puis servie
// par `vite preview`, exactement comme en production, et pilotée dans le Google
// Chrome installé (aucun navigateur à télécharger).
//
//   npm run e2e                       toute la suite
//   npm run e2e -- e2e/photo.spec.js  un seul fichier
//   npm run e2e -- --headed           en voyant le navigateur
//   npx playwright show-report        rapport HTML de la dernière exécution (traces des échecs)
//
// Le build va dans un dossier temporaire (jamais dans dist/) ; E2E_DIST_DIR permet d'en choisir un autre.
const PORT = Number(process.env.E2E_PORT) || 4300;
const DIST_DIR = process.env.E2E_DIST_DIR || path.join(os.tmpdir(), 'cv-builder-e2e-dist');
// Lu par les tests (recherche de données personnelles dans le build).
process.env.E2E_DIST_DIR = DIST_DIR;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    viewport: { width: 1366, height: 900 },
    acceptDownloads: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chrome',
      use: { browserName: 'chromium', channel: 'chrome' },
    },
  ],
  webServer: {
    command: `npx vite build --outDir "${DIST_DIR}" --emptyOutDir --logLevel warn && npx vite preview --outDir "${DIST_DIR}" --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});

import { defineConfig, devices } from '@playwright/test';

// Tests de bout en bout du jeu (QA). Ils tournent sur la version de production
// (npm run build puis vite preview), comme sur GitHub Pages.
// Lancer en local : npm run build && npm test
export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173/',
    trace: 'off',
    screenshot: 'only-on-failure',
    launchOptions: {
      // Rendu WebGL logiciel : marche sur les machines de CI sans carte graphique.
      args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'],
    },
  },
  projects: [
    { name: 'ordi', use: { viewport: { width: 1366, height: 768 } }, testMatch: /(jeu-ordi|v1|bot|perf)\.spec\.js/ },
    { name: 'iphone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' }, testMatch: /jeu-mobile\.spec\.js/ },
    { name: 'pixel', use: { ...devices['Pixel 7'] }, testMatch: /jeu-mobile\.spec\.js/ },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

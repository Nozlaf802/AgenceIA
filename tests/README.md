# Tests du jeu

Tests de bout en bout avec [Playwright](https://playwright.dev), lancés par la CI
(`.github/workflows/ci.yml`) sur chaque PR. Une PR dont un test échoue est marquée en rouge.

| Fichier | Ce qui est vérifié |
| --- | --- |
| `jeu-ordi.spec.js` | Écran titre, carte, déplacement clavier (ZQSD, WASD, flèches), diagonale, limites, pause (P, Échap, bouton), perte de focus, redimensionnement, surface visible (#4), mémoire |
| `jeu-mobile.spec.js` | Joystick flottant (déplacement, arrêt, analogique, 2e doigt), bouton pause, rotation, pas de défilement. iPhone 13 et Pixel 7 émulés |
| `bot.spec.js` | Bot de playtest : partie simulée de 4 min à pas fixe, montées de niveau, aucune erreur |
| `perf.spec.js` | Images par seconde relevées (rendu logiciel en CI, plancher bas) |

## En local

```bash
npm ci
npx playwright install chromium   # une seule fois
npm run build
npm test                          # tous les tests
npx playwright test bot           # un seul fichier
MAXSEC=600 npx playwright test bot  # partie complète de 10 min
```

Les tests lisent l'état du jeu via `window.__GAME__` (exposé dans `src/main.js`).
Ils remplacent les scripts `qa/test.cjs`, `qa/bot.cjs` et `qa/perf.cjs` du 13/11.

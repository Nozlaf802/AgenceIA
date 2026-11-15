// Mesure de performance (ancien qa/perf.cjs). Le rendu de la CI est logiciel (pas de carte
// graphique) : les chiffres sont relevés pour suivi, avec un plancher très bas qui ne
// détecte qu'un effondrement (boucle infinie, fuite d'objets, rendu bloqué).
import { test, expect } from '@playwright/test';
import { sleep, startGame, measureFps } from './helpers.js';

test('images par seconde (relevé)', async ({ page }) => {
  await startGame(page, { calm: false });
  await page.evaluate(() => { window.__GAME__.scene.getScene('Game').player.invincible = true; });
  await sleep(800);
  const renderer = await page.evaluate(() => (window.__GAME__.renderer.type === 2 ? 'WEBGL' : 'CANVAS'));
  await page.keyboard.down('d');
  const fps = await measureFps(page, 4000);
  await page.keyboard.up('d');
  test.info().annotations.push({ type: 'fps', description: `${renderer} ${JSON.stringify(fps)}` });
  console.log('fps', renderer, JSON.stringify(fps));
  expect(fps.avgFps).toBeGreaterThan(5);
});

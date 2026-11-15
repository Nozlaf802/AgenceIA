// Parcours ordinateur (ancien qa/test.cjs, partie « desktop »), mis à jour après les correctifs
// des issues #3 (pause), #4 (zoom), #6 (lenteur) : écran titre, carte Tiled, états de jeu.
import { test, expect } from '@playwright/test';
import { sleep, trackErrors, startGame, state } from './helpers.js';

test.describe('Jeu sur ordinateur', () => {
  let errors;
  test.beforeEach(async ({ page }) => { errors = trackErrors(page); });

  test('écran titre puis carte Falaise du Phare sans erreur', async ({ page }) => {
    await page.goto('./');
    await page.waitForFunction(() => window.__GAME__?.scene?.getScene('Title')?.sys?.isActive(), null, { timeout: 20_000 });
    await expect(page).toHaveTitle(/Lumen, le dernier phare/);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__GAME__.scene.getScene('Game')?.player);
    const lvl = await page.evaluate(() => !!window.__GAME__.scene.getScene('Game').level);
    expect(lvl, 'la carte Tiled est chargée').toBe(true);
    await sleep(1500);
    expect(errors).toEqual([]);
  });

  test('déplacement clavier : D, flèche, Z et Q (AZERTY)', async ({ page }) => {
    await startGame(page, { query: '?map=infini' });
    for (const [key, axis, sign] of [['d', 'x', 1], ['ArrowRight', 'x', 1], ['z', 'y', -1], ['q', 'x', -1]]) {
      const a = await state(page);
      await page.keyboard.down(key);
      await sleep(1000);
      const b = await state(page);
      await page.keyboard.up(key);
      await sleep(100);
      const d = (b[axis] - a[axis]) * sign;
      // ~200 px/s : on tolère les à-coups d'une machine de CI lente.
      expect(d, `distance parcourue en 1 s avec ${key}`).toBeGreaterThan(120);
      expect(d).toBeLessThan(300);
    }
  });

  test('vitesse diagonale normalisée', async ({ page }) => {
    await startGame(page, { query: '?map=infini' });
    // Même vitesse en diagonale qu'en ligne droite (pas de bonus √2).
    await page.keyboard.down('d'); await sleep(300);
    const straight = await state(page);
    await page.keyboard.down('s'); await sleep(300);
    const diag = await state(page);
    await page.keyboard.up('d'); await page.keyboard.up('s');
    expect(Math.hypot(diag.vx, diag.vy)).toBeCloseTo(Math.hypot(straight.vx, straight.vy), 0);
    expect(diag.vx).toBeGreaterThan(0);
    expect(diag.vy).toBeGreaterThan(0);
  });

  test('le joueur reste dans les limites de la carte', async ({ page }) => {
    await startGame(page);
    await page.keyboard.down('ArrowLeft'); await page.keyboard.down('ArrowUp');
    await sleep(3000);
    await page.keyboard.up('ArrowLeft'); await page.keyboard.up('ArrowUp');
    const inside = await page.evaluate(() => {
      const g = window.__GAME__.scene.getScene('Game');
      const b = g.physics.world.bounds; const p = g.player;
      return p.x >= b.x && p.y >= b.y && p.x <= b.right && p.y <= b.bottom;
    });
    expect(inside).toBe(true);
  });

  test('pause : P, Échap, bouton Reprendre ; le chrono est figé (#3)', async ({ page }) => {
    await startGame(page);
    await page.keyboard.press('p'); await sleep(200);
    let s = await state(page);
    expect(s.state).toBe('paused');
    const e1 = s.elapsed;
    await sleep(800);
    expect((await state(page)).elapsed).toBe(e1);
    await page.keyboard.press('p'); await sleep(200);
    expect((await state(page)).state).toBe('play');
    await page.keyboard.press('Escape'); await sleep(200);
    expect((await state(page)).state).toBe('paused');
    await page.keyboard.press('Escape'); await sleep(200);
    expect((await state(page)).state).toBe('play');
    // Bouton « Reprendre » de l'écran de pause (centre de l'écran, 50 px plus bas).
    await page.keyboard.press('p'); await sleep(200);
    const vp = page.viewportSize();
    await page.mouse.click(vp.width / 2, vp.height / 2 + 50); await sleep(300);
    expect((await state(page)).state).toBe('play');
  });

  test('perte de focus : pause, et aucune touche coincée à la reprise', async ({ page }) => {
    await startGame(page, { query: '?map=infini' });
    await page.keyboard.down('d'); await sleep(200);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await sleep(200);
    expect((await state(page)).state).toBe('paused');
    // La touche est relâchée hors de la fenêtre : le keyup n'arrive jamais au jeu.
    await page.evaluate(() => window.__GAME__.scene.getScene('Game').togglePause());
    await sleep(300);
    const b = await state(page); await sleep(800); const c = await state(page);
    expect(Math.hypot(c.x - b.x, c.y - b.y), 'déplacement fantôme').toBeLessThan(2);
    await page.keyboard.up('d');
  });

  test('redimensionnement de la fenêtre', async ({ page }) => {
    await startGame(page);
    await page.setViewportSize({ width: 1000, height: 700 }); await sleep(500);
    const s = await state(page);
    expect(s.w).toBe(1000 * s.dpr);
    expect(s.h).toBe(700 * s.dpr);
  });

  test('surface de jeu visible proche de 1280×720 en 1920×1080 (#4)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await startGame(page);
    const v = await page.evaluate(() => {
      const c = window.__GAME__.scene.getScene('Game').cameras.main;
      return { w: c.worldView.width, h: c.worldView.height };
    });
    expect(Math.abs(v.w * v.h - 1280 * 720) / (1280 * 720)).toBeLessThan(0.1);
  });

  test('mémoire stable sur 30 s de jeu', async ({ page }) => {
    await startGame(page, { calm: false });
    await page.evaluate(() => { window.__GAME__.scene.getScene('Game').player.invincible = true; });
    const m0 = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
    await page.keyboard.down('d'); await sleep(15_000); await page.keyboard.up('d');
    await page.keyboard.down('a'); await sleep(15_000); await page.keyboard.up('a');
    await page.evaluate(() => window.gc && window.gc());
    const m1 = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
    test.info().annotations.push({ type: 'mémoire', description: `${(m0 / 1e6).toFixed(1)} Mo → ${(m1 / 1e6).toFixed(1)} Mo` });
    expect(m1 - m0).toBeLessThan(15e6);
    expect(errors).toEqual([]);
  });
});

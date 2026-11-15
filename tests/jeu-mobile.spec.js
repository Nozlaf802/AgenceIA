// Parcours mobile (ancien qa/test.cjs, partie « mobile ») : joystick flottant, pause tactile,
// rotation, pas de défilement de la page. Lancé en iPhone 13 et Pixel 7 émulés.
import { test, expect } from '@playwright/test';
import { sleep, trackErrors, startGame, state } from './helpers.js';

test.describe('Jeu sur mobile', () => {
  let errors, cdp, vp;
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const tap = async (x, y, id = 1) => { await touch('touchStart', [{ x, y, id }]); await touch('touchEnd', []); await sleep(300); };

  test.beforeEach(async ({ page, context }) => {
    errors = trackErrors(page);
    await startGame(page, { query: '?map=infini' });
    cdp = await context.newCDPSession(page);
    vp = page.viewportSize();
  });

  test('aide des contrôles tactile sur l\'écran titre et au premier conseil', async ({ page }) => {
    await page.goto('./');
    await page.waitForFunction(() => window.__GAME__?.scene?.getScene('Title')?.sys?.isActive());
    const texts = await page.evaluate(() => window.__GAME__.scene.getScene('Title').children.list
      .filter((o) => o.type === 'Text').map((o) => o.text).join(' '));
    expect(texts).toMatch(/glisse le doigt/);
    expect(texts).not.toMatch(/ZQSD/);
  });

  test('joystick : déplace, s\'arrête au relâché, analogique', async ({ page }) => {
    const cx = vp.width / 2, cy = vp.height * 0.7;
    let a = await state(page);
    await touch('touchStart', [{ x: cx, y: cy, id: 1 }]);
    for (let i = 1; i <= 10; i++) { await touch('touchMove', [{ x: cx + i * 8, y: cy, id: 1 }]); await sleep(16); }
    await sleep(1000);
    const b = await state(page);
    await touch('touchEnd', []); await sleep(200);
    const c = await state(page);
    expect(b.x - a.x, 'distance en 1 s au joystick').toBeGreaterThan(120);
    expect([c.vx, c.vy], 'arrêt au relâché').toEqual([0, 0]);

    // Demi-course du joystick (30 px sur un rayon de 60) = demi-vitesse.
    await touch('touchStart', [{ x: cx, y: cy, id: 1 }]);
    await touch('touchMove', [{ x: cx + 30, y: cy, id: 1 }]); await sleep(200);
    a = await state(page);
    const speed = await page.evaluate(() => window.__GAME__.scene.getScene('Game').player.speed);
    await touch('touchEnd', []); await sleep(100);
    expect(Math.abs(a.vx - speed / 2)).toBeLessThan(10);
  });

  test('bouton ❚❚ met en pause, toucher Reprendre relance', async ({ page }) => {
    await tap(vp.width - 26, 42);
    expect((await state(page)).state).toBe('paused');
    await tap(vp.width / 2, vp.height / 2 + 50);
    expect((await state(page)).state).toBe('play');
  });

  test('pas de joystick coincé après une pause doigt posé', async ({ page }) => {
    const cx = vp.width / 2, cy = vp.height * 0.7;
    await touch('touchStart', [{ x: cx, y: cy, id: 1 }]);
    for (let i = 1; i <= 8; i++) { await touch('touchMove', [{ x: cx + i * 8, y: cy, id: 1 }]); await sleep(16); }
    await sleep(200);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await sleep(200);
    await touch('touchEnd', []); await sleep(200);
    expect((await state(page)).state).toBe('paused');
    await tap(vp.width / 2, vp.height / 2 + 50, 2);
    const b = await state(page); await sleep(800); const c = await state(page);
    expect(b.state).toBe('play');
    expect(Math.hypot(c.x - b.x, c.y - b.y)).toBeLessThan(2);
  });

  test('un 2e doigt n\'interrompt pas le joystick', async ({ page }) => {
    const cx = vp.width / 2, cy = vp.height * 0.7;
    await touch('touchStart', [{ x: cx, y: cy, id: 1 }]);
    for (let i = 1; i <= 8; i++) { await touch('touchMove', [{ x: cx - i * 8, y: cy, id: 1 }]); await sleep(16); }
    // Un 2e doigt touche le coin de l'écran puis se lève ; le 1er reste posé.
    await touch('touchStart', [{ x: cx - 64, y: cy, id: 1 }, { x: 100, y: 100, id: 3 }]);
    await sleep(100);
    await touch('touchMove', [{ x: cx - 64, y: cy, id: 1 }]);
    await sleep(300);
    const a = await state(page);
    await touch('touchEnd', []); await sleep(200);
    const b = await state(page);
    expect(a.vx).toBeLessThan(-100);
    expect(b.vx).toBe(0);
  });

  test('rotation en paysage, sans défilement ni zoom de la page', async ({ page }) => {
    await page.setViewportSize({ width: vp.height, height: vp.width }); await sleep(600);
    const s = await state(page);
    expect(s.w).toBe(vp.height * s.dpr);
    expect(s.h).toBe(vp.width * s.dpr);
    const scroll = await page.evaluate(() => ({ sx: window.scrollX, sy: window.scrollY }));
    expect(scroll).toEqual({ sx: 0, sy: 0 });
    expect(errors).toEqual([]);
  });
});

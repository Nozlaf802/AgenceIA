// Version 1.0 : plus de « prototype », numéro de version, écran de fin avec score et
// meilleur score local, bouton vers la chaîne, son avec bouton muet, aide des contrôles.
import { test, expect } from '@playwright/test';
import { sleep, trackErrors, startGame } from './helpers.js';

const titleTexts = (page) => page.evaluate(() => window.__GAME__.scene.getScene('Title').children.list
  .filter((o) => o.type === 'Text').map((o) => o.text));

// Termine la partie en cours avec des valeurs connues et renvoie ce qu'affiche l'écran de fin.
const finish = (page, { kills, time, level, victory = false, god = false }) => page.evaluate((r) => {
  const g = window.__GAME__.scene.getScene('Game');
  g.progress.kills = r.kills; g.elapsed = r.time; g.progress.level = r.level; g.god.used = r.god;
  g.endRun(r.victory);
  return window.__GAME__.scene.getScene('UI').lastOver;
}, { kills, time, level, victory, god });

test.describe('Version 1.0', () => {
  let errors;
  test.beforeEach(async ({ page }) => { errors = trackErrors(page); });

  test('titre de l\'onglet et écran titre : v1.0, plus de « prototype »', async ({ page }) => {
    await page.goto('./');
    await page.waitForFunction(() => window.__GAME__?.scene?.getScene('Title')?.sys?.isActive());
    await expect(page).toHaveTitle('Lumen, le dernier phare');
    const texts = await titleTexts(page);
    expect(texts.join(' ')).not.toMatch(/prototype/i);
    expect(texts).toContain('v1.0');
    // Ordinateur : aide clavier.
    expect(texts.join(' ')).toMatch(/ZQSD/);
  });

  test('écran de fin : score, meilleur score enregistré puis conservé', async ({ page }) => {
    await startGame(page);
    let over = await finish(page, { kills: 100, time: 120, level: 5 });
    // 100 + 120 × 2 + 4 × 25 = 440
    expect(over).toMatchObject({ score: 440, best: 440, record: true });
    expect(await page.evaluate(() => localStorage.getItem('lumen-phare.best'))).toBe('440');

    await page.evaluate(() => window.__GAME__.scene.getScene('Game').restart());
    await page.waitForFunction(() => window.__GAME__.scene.getScene('Game')?.state === 'play');
    over = await finish(page, { kills: 10, time: 30, level: 2 });
    expect(over).toMatchObject({ score: 95, best: 440, record: false });

    // Rechargement de la page : le record est toujours là.
    await page.reload();
    await startGame(page);
    over = await finish(page, { kills: 0, time: 10, level: 1, victory: true });
    expect(over).toMatchObject({ score: 520, best: 520, record: true });
    expect(errors).toEqual([]);
  });

  test('une partie en God mode n\'est pas enregistrée', async ({ page }) => {
    await startGame(page);
    const over = await finish(page, { kills: 5000, time: 600, level: 60, victory: true, god: true });
    expect(over.record).toBe(false);
    expect(await page.evaluate(() => localStorage.getItem('lumen-phare.best'))).toBeNull();
  });

  test('sans localStorage (navigation privée) le jeu ne plante pas', async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => { throw new Error('bloqué'); };
      Storage.prototype.setItem = () => { throw new Error('bloqué'); };
    });
    await startGame(page);
    const over = await finish(page, { kills: 10, time: 30, level: 2 });
    expect(over.score).toBe(95);
    await page.keyboard.press('m');
    expect(errors).toEqual([]);
  });

  test('bouton « Voir l\'épisode de ce soir » ouvre la chaîne Les Bots Bossent', async ({ page }) => {
    await startGame(page);
    await finish(page, { kills: 1, time: 5, level: 1 });
    await page.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return {}; }; });
    await page.evaluate(() => window.__GAME__.scene.getScene('UI').overEpisodeBtn.emit('pointerdown'));
    expect(await page.evaluate(() => window.__opened)).toEqual(['https://www.youtube.com/@lesbotsbossent']);
  });

  test('son : ambiance lancée, touche M coupe et le choix est mémorisé', async ({ page }) => {
    await startGame(page);
    const s = await page.evaluate(() => ({ ctx: window.__SFX__.ctx?.state, amb: window.__SFX__.ambienceOn, muted: window.__SFX__.muted }));
    expect(s).toEqual({ ctx: 'running', amb: true, muted: false });
    await page.keyboard.press('m');
    expect(await page.evaluate(() => window.__SFX__.muted)).toBe(true);
    await page.reload();
    await page.waitForFunction(() => window.__SFX__);
    expect(await page.evaluate(() => window.__SFX__.muted)).toBe(true);
    await page.evaluate(() => window.__SFX__.toggleMute());
    expect(await page.evaluate(() => localStorage.getItem('lumen-phare.muted'))).toBe('false');
  });
});

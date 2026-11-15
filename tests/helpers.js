// Outils communs aux tests du jeu. Le jeu s'expose dans window.__GAME__ (voir src/main.js).
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Suit les erreurs de la page (console et exceptions) pour vérifier qu'il n'y en a aucune.
export function trackErrors(page) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  return errors;
}

// Ouvre le jeu, passe l'écran titre et attend la scène de jeu.
// calm : coupe l'apparition des créatures pour des mesures de déplacement stables
// (sinon une montée de niveau peut figer le joueur au milieu d'une mesure).
export async function startGame(page, { query = '', calm = true } = {}) {
  await page.goto('./' + query);
  await page.waitForFunction(() => window.__GAME__?.scene?.getScene('Title')?.sys?.isActive(), null, { timeout: 20_000 });
  await page.evaluate(() => window.__GAME__.scene.getScene('Title').start());
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game')?.player && window.__GAME__.scene.getScene('UI')?.sys?.isActive());
  if (calm) {
    await page.evaluate(() => {
      const g = window.__GAME__.scene.getScene('Game');
      g.spawner.stopped = true;
      g.enemies.getChildren().forEach((e) => e.active && e.kill());
      g.player.invincible = true;
    });
  }
  await sleep(300);
}

export const state = (page) => page.evaluate(() => {
  const game = window.__GAME__;
  const g = game.scene.getScene('Game');
  const p = g.player;
  return {
    x: p.x, y: p.y, vx: p.body.velocity.x, vy: p.body.velocity.y,
    state: g.state, elapsed: g.elapsed, w: game.scale.width, h: game.scale.height,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
  };
});

// Mesure les images par seconde réelles du navigateur pendant ms millisecondes.
export function measureFps(page, ms) {
  return page.evaluate((ms) => new Promise((res) => {
    const t = []; let last = performance.now(); const end = last + ms;
    function f(now) {
      t.push(now - last); last = now;
      if (now < end) requestAnimationFrame(f);
      else {
        t.sort((a, b) => a - b);
        const avg = t.reduce((a, b) => a + b, 0) / t.length;
        res({ avgFps: +(1000 / avg).toFixed(1), low1pctFps: +(1000 / t[Math.floor(t.length * 0.99)]).toFixed(1), frames: t.length });
      }
    }
    requestAnimationFrame(f);
  }), ms);
}

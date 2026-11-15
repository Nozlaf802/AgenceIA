// Bot de playtest (ancien qa/bot.cjs) : simule une partie sans rendu, à pas fixe de 1/60 s,
// en fuyant les créatures et en ramassant les Lueurs. Vérifie que la boucle de jeu tient
// (montées de niveau, créatures, aucune erreur) et relève les métriques d'équilibrage.
// Durée simulée réglable : MAXSEC=600 npx playwright test bot (partie complète).
import { test, expect } from '@playwright/test';
import { trackErrors, startGame } from './helpers.js';

const MAXSEC = +(process.env.MAXSEC || 240);

test('bot de playtest : partie simulée sans erreur', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = trackErrors(page);
  await startGame(page, { calm: false });
  const res = await page.evaluate(async (MAXSEC) => {
    const game = window.__GAME__;
    const g = game.scene.getScene('Game');
    game.loop.sleep();
    const dir = { x: 0, y: 0 };
    let stuckT = 0, lastPos = { x: g.player.x, y: g.player.y }, wander = Math.random() * 6.28;
    g.controls.getDirection = () => dir;
    const picks = [];
    g.events.on('levelup', (cards) => {
      const c = cards[Math.floor(Math.random() * cards.length)];
      picks.push(c.id);
      queueMicrotask(() => g.chooseCard(c));
    });
    let over = null;
    g.events.on('over', (o) => { over = o; });
    let t = performance.now(), steps = 0, stepMs = 0, minHp = 999, maxAlive = 0;
    while (!over && g.elapsed < MAXSEC) {
      if (g.state === 'levelup') { await Promise.resolve(); }
      const p = g.player;
      let rx = 0, ry = 0, near = Infinity;
      g.enemies.getChildren().forEach((e) => {
        if (!e.active) return;
        const dx = p.x - e.x, dy = p.y - e.y, d2 = dx * dx + dy * dy;
        near = Math.min(near, Math.sqrt(d2));
        if (d2 < 350 * 350) { const w = 1 / Math.max(d2, 100); rx += dx * w; ry += dy * w; }
      });
      if (near > 90) {
        let best = null, bd = 500;
        for (const o of g.pickups) {
          if (!o.active) continue;
          const d = Math.hypot(o.x - p.x, o.y - p.y);
          if (d < bd) { bd = d; best = o; }
        }
        if (best) { const d = Math.hypot(best.x - p.x, best.y - p.y) || 1; const rl = Math.hypot(rx, ry) || 1; rx = (best.x - p.x) / d + (rx / rl) * 0.4; ry = (best.y - p.y) / d + (ry / rl) * 0.4; }
      }
      if (g.level) { const b = g.level.bounds; rx += (b.centerX - p.x) * 1e-6; ry += (b.centerY - p.y) * 1e-6; }
      let l = Math.hypot(rx, ry);
      if (l < 1e-6) { wander += (Math.random() - 0.5) * 0.3; rx = Math.cos(wander); ry = Math.sin(wander); l = 1; }
      dir.x = rx / l; dir.y = ry / l;
      if (Math.hypot(p.x - lastPos.x, p.y - lastPos.y) < 0.5) stuckT += 1 / 60; else stuckT = 0;
      if (stuckT > 0.3) { const a = Math.atan2(dir.y, dir.x) + Math.PI / 2; dir.x = Math.cos(a); dir.y = Math.sin(a); }
      lastPos = { x: p.x, y: p.y };
      const s0 = performance.now();
      t += 1000 / 60;
      game.scene.update(t, 1000 / 60);
      stepMs += performance.now() - s0; steps++;
      minHp = Math.min(minHp, p.hp);
      maxAlive = Math.max(maxAlive, g.enemies.countActive(true));
      if (steps % 600 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    return {
      survivedSec: Math.round(g.elapsed), victory: over?.victory ?? null, died: !!over && !over.victory,
      level: g.progress.level, kills: g.progress.kills, minHp: Math.round(minHp), maxAlive,
      stepMsAvg: +(stepMs / steps).toFixed(2), picks: picks.length,
    };
  }, MAXSEC);
  test.info().annotations.push({ type: 'bot', description: JSON.stringify(res) });
  console.log('bot', JSON.stringify(res));
  expect(res.kills, 'des créatures ont été dissipées').toBeGreaterThan(10);
  expect(res.level, 'le joueur a gagné des niveaux').toBeGreaterThan(2);
  expect(res.survivedSec, 'la partie avance').toBeGreaterThan(30);
  expect(errors).toEqual([]);
});

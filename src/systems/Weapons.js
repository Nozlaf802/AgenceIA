import Phaser from 'phaser';
import { WEAPONS } from '../data/upgrades.js';
import { applyVisual } from '../objects/visuals.js';
import { DEPTH } from '../config.js';

// Armes automatiques. Les collisions sont faites à la main (distance),
// c'est simple et rapide pour quelques centaines de créatures.
export class Weapons {
  constructor(scene) {
    this.scene = scene;
    this.owned = {}; // id -> niveau (1..5)
    this.cooldowns = {};
    this.bolts = [];
    this.orbs = [];
    this.orbAngle = 0;
    this.shards = [];
    this.zaps = scene.add.graphics().setDepth(DEPTH.fx).setBlendMode(Phaser.BlendModes.ADD);
    this.zapList = []; // éclairs affichés : { pts, life }
  }

  level(id) {
    return this.owned[id] || 0;
  }

  add(id) {
    this.owned[id] = Math.min(5, this.level(id) + 1);
    if (id === 'orbit') this.syncOrbs();
  }

  stats(id) {
    return WEAPONS[id].levels[this.level(id) - 1];
  }

  update(dt) {
    const s = this.scene;
    const ps = s.stats;
    if (this.level('lantern')) this.updateLantern(dt, ps);
    if (this.level('orbit')) this.updateOrbs(dt, ps);
    if (this.level('frost')) this.updateFrost(dt, ps);
    if (this.level('lightning')) this.updateLightning(dt, ps);
    this.updateBolts(dt, ps);
    this.updateShards(dt);
    this.drawZaps(dt);
  }

  // --- Lanterne : rayon vers les créatures les plus proches dans la lumière.
  updateLantern(dt, ps) {
    const st = this.stats('lantern');
    this.cooldowns.lantern = (this.cooldowns.lantern ?? 0) - dt;
    if (this.cooldowns.lantern > 0) return;
    const p = this.scene.player;
    const range = this.scene.lantern.lightRadius;
    const targets = this.scene.nearestEnemies(p.x, p.y, range, st.count);
    if (!targets.length) return;
    this.cooldowns.lantern = st.cd * Math.max(0.3, ps.cooldownMult);
    targets.forEach((e) => this.fireBolt(p.x, p.y, e, st.dmg * ps.dmgMult, range));
  }

  fireBolt(x, y, target, dmg, range) {
    let b = this.bolts.find((o) => !o.active);
    if (!b) {
      b = this.scene.add.image(x, y, 'bolt').setDepth(DEPTH.fx);
      this.bolts.push(b);
    }
    const a = Math.atan2(target.y - y, target.x - x);
    const speed = 560;
    b.setActive(true).setVisible(true).setPosition(x, y);
    b.vx = Math.cos(a) * speed;
    b.vy = Math.sin(a) * speed;
    b.dmg = dmg;
    b.life = (range + 80) / speed;
  }

  updateBolts(dt) {
    for (const b of this.bolts) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) { b.setActive(false).setVisible(false); continue; }
      const hit = this.scene.firstEnemyAt(b.x, b.y, 5);
      if (hit) {
        this.scene.damageEnemy(hit, b.dmg);
        b.setActive(false).setVisible(false);
      }
    }
  }

  // --- Flamme orbitale
  syncOrbs() {
    const n = this.stats('orbit').count;
    while (this.orbs.length < n) {
      const o = this.scene.add.sprite(0, 0, 'orb').setDepth(DEPTH.fx);
      applyVisual(o, 'orb');
      o.baseScale = o.scaleX;
      this.orbs.push(o);
    }
  }

  updateOrbs(dt, ps) {
    const st = this.stats('orbit');
    const p = this.scene.player;
    const now = this.scene.elapsed;
    this.orbAngle += st.speed * dt;
    this.orbs.forEach((o, i) => {
      const a = this.orbAngle + (i / this.orbs.length) * Math.PI * 2;
      o.setPosition(p.x + Math.cos(a) * st.radius, p.y + Math.sin(a) * st.radius);
      const big = st.radius > 80 ? 1.25 : 1;
      o.setScale(o.baseScale * big).setRotation(a + Math.PI / 2);
      this.scene.forEachEnemyNear(o.x, o.y, 11 * big, (e) => {
        if (now - e.orbHitAt < 0.5) return;
        e.orbHitAt = now;
        this.scene.damageEnemy(e, st.dmg * ps.dmgMult);
      });
    });
  }

  // --- Givre : éclats qui traversent, ralentissent puis gèlent.
  updateFrost(dt, ps) {
    const st = this.stats('frost');
    this.cooldowns.frost = (this.cooldowns.frost ?? 0) - dt;
    if (this.cooldowns.frost > 0) return;
    const p = this.scene.player;
    const range = this.scene.lantern.lightRadius;
    const targets = this.scene.nearestEnemies(p.x, p.y, range, st.count);
    if (!targets.length) return;
    this.cooldowns.frost = st.cd * Math.max(0.3, ps.cooldownMult);
    targets.forEach((e) => {
      this.fireShard(p.x, p.y, Math.atan2(e.y - p.y, e.x - p.x), st, st.dmg * ps.dmgMult, range);
    });
    // S'il y a moins de cibles que d'éclats, les éclats restants partent en éventail.
    if (targets.length < st.count) {
      const e = targets[0];
      for (let i = targets.length; i < st.count; i++) {
        const a = Math.atan2(e.y - p.y, e.x - p.x) + (i % 2 ? 0.3 : -0.3) * Math.ceil(i / 2);
        this.fireShard(p.x, p.y, a, st, st.dmg * ps.dmgMult, range);
      }
    }
  }

  fireShard(x, y, a, st, dmg, range) {
    let b = this.shards.find((o) => !o.active);
    if (!b) {
      b = this.scene.add.sprite(x, y, 'frost').setDepth(DEPTH.fx);
      applyVisual(b, 'frost');
      if (!b.hasArt) b.setTexture('bolt').setTint(0x5ee8ff);
      this.shards.push(b);
    }
    const speed = 460;
    b.setActive(true).setVisible(true).setPosition(x, y).setRotation(a);
    b.vx = Math.cos(a) * speed;
    b.vy = Math.sin(a) * speed;
    b.dmg = dmg;
    b.st = st;
    b.pierce = st.pierce;
    b.hitIds = new Set();
    b.life = (range + 120) / speed;
  }

  updateShards(dt) {
    const s = this.scene;
    for (const b of this.shards) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) { b.setActive(false).setVisible(false); continue; }
      let hit = null;
      s.forEachEnemyNear(b.x, b.y, 7, (e) => { if (!hit && !b.hitIds.has(e)) hit = e; });
      if (!hit) continue;
      b.hitIds.add(hit);
      hit.chillHit(s.elapsed, b.st);
      s.juice.impact(hit.x, hit.y, 'fx-impact_givre', 0.6);
      s.damageEnemy(hit, b.dmg);
      if (--b.pierce < 0) b.setActive(false).setVisible(false);
    }
  }

  // --- Foudre : frappe au hasard parmi les créatures visibles, puis rebondit.
  updateLightning(dt, ps) {
    const st = this.stats('lightning');
    this.cooldowns.lightning = (this.cooldowns.lightning ?? 0) - dt;
    if (this.cooldowns.lightning > 0) return;
    const s = this.scene;
    const view = s.cameras.main.worldView;
    const visible = s.enemies.getChildren().filter((e) => e.active && view.contains(e.x, e.y));
    if (!visible.length) return;
    this.cooldowns.lightning = st.cd * Math.max(0.3, ps.cooldownMult);
    const dmg = st.dmg * ps.dmgMult;
    for (let i = 0; i < st.count && visible.length; i++) {
      const first = Phaser.Utils.Array.RemoveRandomElement(visible);
      const hit = new Set([first]);
      const pts = [{ x: first.x, y: view.y - 20 }, { x: first.x, y: first.y }];
      let cur = first;
      this.strike(cur, dmg);
      for (let b = 0; b < st.bounces; b++) {
        let next = null, best = st.range * st.range;
        s.forEachEnemyNear(cur.x, cur.y, st.range, (e) => {
          if (hit.has(e)) return;
          const d2 = (e.x - cur.x) ** 2 + (e.y - cur.y) ** 2;
          if (d2 < best) { best = d2; next = e; }
        });
        if (!next) break;
        hit.add(next);
        pts.push({ x: next.x, y: next.y });
        const nx = next.x, ny = next.y;
        this.strike(next, dmg * 0.85);
        cur = { x: nx, y: ny };
      }
      this.zapList.push({ pts, life: 0.25 });
    }
    s.cameras.main.shake(60, 0.002);
  }

  strike(e, dmg) {
    this.scene.juice.impact(e.x, e.y, 'fx-impact_foudre', 0.8);
    this.scene.damageEnemy(e, dmg);
  }

  // Éclairs en zigzag (Graphics, redessinés chaque image tant qu'ils vivent).
  drawZaps(dt) {
    const g = this.zaps;
    g.clear();
    if (!this.zapList.length) return;
    for (const z of this.zapList) {
      z.life -= dt;
      if (z.life <= 0) continue;
      const a = Math.min(1, z.life / 0.15);
      for (const [w, color, alpha] of [[6, 0xb98cff, 0.45 * a], [2, 0xf3eaff, a]]) {
        g.lineStyle(w, color, alpha);
        g.beginPath();
        g.moveTo(z.pts[0].x, z.pts[0].y);
        for (let i = 1; i < z.pts.length; i++) {
          const p0 = z.pts[i - 1], p1 = z.pts[i];
          const steps = 4;
          for (let k = 1; k < steps; k++) {
            const t = k / steps;
            const j = (Math.random() - 0.5) * 18;
            g.lineTo(p0.x + (p1.x - p0.x) * t + j, p0.y + (p1.y - p0.y) * t + j);
          }
          g.lineTo(p1.x, p1.y);
        }
        g.strokePath();
      }
    }
    this.zapList = this.zapList.filter((z) => z.life > 0);
  }
}

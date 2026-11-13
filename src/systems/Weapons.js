import { WEAPONS } from '../data/upgrades.js';

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
    this.updateBolts(dt, ps);
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
      b = this.scene.add.image(x, y, 'bolt').setDepth(8);
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
    while (this.orbs.length < n) this.orbs.push(this.scene.add.image(0, 0, 'orb').setDepth(9));
  }

  updateOrbs(dt, ps) {
    const st = this.stats('orbit');
    const p = this.scene.player;
    const now = this.scene.elapsed;
    this.orbAngle += st.speed * dt;
    this.orbs.forEach((o, i) => {
      const a = this.orbAngle + (i / this.orbs.length) * Math.PI * 2;
      o.setPosition(p.x + Math.cos(a) * st.radius, p.y + Math.sin(a) * st.radius);
      o.setScale(st.radius > 80 ? 1.25 : 1);
      this.scene.forEachEnemyNear(o.x, o.y, 11 * o.scale, (e) => {
        if (now - e.orbHitAt < 0.5) return;
        e.orbHitAt = now;
        this.scene.damageEnemy(e, st.dmg * ps.dmgMult);
      });
    });
  }
}

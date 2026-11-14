import Phaser from 'phaser';
import { DEPTH } from '../config.js';
import { BALANCE } from '../data/balance.js';
import { WEAPONS, PASSIVES, MAX_PASSIVES } from '../data/upgrades.js';
import { applyVisual } from '../objects/visuals.js';

// Easter egg : menu « God mode » (taper L-U-M-E-N au clavier, ou toucher 5 fois
// le chrono sur mobile). Rien ne s'active tant que le menu n'a pas été ouvert.
//   1. Pluie d'XP : des Lueurs tombent sur Lumen jusqu'au niveau max (on choisit
//      toujours ses cartes, Lumen reste mortel).
//   2. Pouvoirs à volonté : chaque carte prise autant de fois qu'on veut.
//   3. GOD MODE ultime : Lumen devient le phare.

export const GOD = {
  weaponMax: 10, // niv. 6 à 10 = surcharges (au-delà des 5 niveaux normaux)
  passiveMax: 50,
  rainEvery: 0.06, // une Lueur toutes les X s
  dropsPerLevel: 4,
  beamLength: 560,
  beamHalfAngle: 0.16,
  beamSpin: 1.5, // rad/s
  beamDmg: 80,
  beamTick: 0.12,
};

export class GodMode {
  constructor(scene) {
    this.scene = scene;
    this.used = false;
    this.rain = false;
    this.rainTimer = 0;
    this.drops = [];
    this.ultimate = false;
  }

  // ---------- Menu ----------
  canOpen() {
    return this.scene.state === 'play' || this.scene.state === 'paused';
  }

  open() {
    const s = this.scene;
    if (!this.canOpen()) return false;
    s.state = 'god';
    s.physics.pause();
    s.controls.joystick.reset();
    s.events.emit('god-open');
    return true;
  }

  close() {
    const s = this.scene;
    if (s.state !== 'god') return;
    s.state = 'play';
    s.physics.resume();
    if (s.pendingLevelUps > 0) s.openLevelUp();
  }

  // ---------- Niveau max ----------
  // Cartes encore disponibles en montée de niveau (armes et passifs jusqu'au niv. 5,
  // dans la limite des emplacements). Le niveau max est atteint quand il n'y en a plus.
  upgradesLeft() {
    const s = this.scene;
    let n = 0;
    for (const id of Object.keys(WEAPONS)) n += Math.max(0, 5 - s.weapons.level(id));
    const owned = Object.keys(s.passives).filter((id) => s.passives[id] > 0);
    for (const id of owned) n += Math.max(0, 5 - s.passives[id]);
    const free = Math.max(0, MAX_PASSIVES - owned.length);
    const notOwned = Object.keys(PASSIVES).length - owned.length;
    n += Math.min(free, notOwned) * 5;
    return n;
  }

  levelsNeeded() {
    return this.upgradesLeft() - this.scene.pendingLevelUps;
  }

  // ---------- 1. Pluie d'XP ----------
  startRain() {
    this.used = true;
    if (this.levelsNeeded() <= 0) {
      this.scene.events.emit('toast', 'ui.god.max');
      return;
    }
    this.rain = true;
    this.rainTimer = 0;
    this.scene.events.emit('toast', 'ui.god.rain');
  }

  // Sortie de la pluie (Échap ou croix) : plus de gouttes, et si un choix de
  // carte est ouvert on le ferme et on reprend la partie.
  stopRain() {
    const s = this.scene;
    if (!this.rain) return;
    this.rain = false;
    this.drops.forEach((d) => d.setActive(false).setVisible(false));
    if (s.state === 'levelup') {
      s.pendingLevelUps = 0;
      s.events.emit('god-rain-stop');
      s.state = 'play';
      s.physics.resume();
    }
    s.events.emit('toast', 'ui.god.rainStop');
  }

  spawnDrop() {
    const s = this.scene;
    const p = s.player;
    let d = this.drops.find((o) => !o.active);
    if (!d) {
      d = s.add.sprite(0, 0, 'lueur');
      this.drops.push(d);
    }
    applyVisual(d, 'lueur');
    d.setScale(d.scaleX * 1.3).setDepth(DEPTH.glow).setActive(true).setVisible(true).setAlpha(1);
    d.ox = Phaser.Math.Between(-150, 150);
    d.oy = Phaser.Math.Between(-12, 12);
    d.setPosition(p.x + d.ox * 1.6, p.y - Phaser.Math.Between(320, 420));
    d.vy = Phaser.Math.Between(480, 640);
    d.value = Math.max(1, Math.ceil(s.progress.xpNext / GOD.dropsPerLevel));
  }

  updateRain(dt) {
    const s = this.scene;
    const p = s.player;
    if (this.rain) {
      if (this.levelsNeeded() <= 0) {
        this.rain = false;
        s.events.emit('toast', 'ui.god.max');
      } else {
        this.rainTimer -= dt;
        while (this.rainTimer <= 0) { this.rainTimer += GOD.rainEvery; this.spawnDrop(); }
      }
    }
    for (const d of this.drops) {
      if (!d.active) continue;
      // Chute + léger guidage vers Lumen : elles finissent toutes sur lui.
      const k = Math.min(1, dt * 4);
      d.ox *= 1 - k;
      d.x += (p.x + d.ox - d.x) * k;
      d.y += d.vy * dt;
      d.rotation += dt * 6;
      if (d.y >= p.y + d.oy) {
        d.setActive(false).setVisible(false);
        s.juice.burst(d.x, d.y, 0xffd97a, 6);
        s.lantern.add(BALANCE.light.perLueur * 4);
        // Les gouttes encore en l'air après le niveau max ne donnent plus d'XP.
        if (this.levelsNeeded() > 0) s.gainXp(d.value);
      }
    }
  }

  // ---------- 2. Pouvoirs à volonté ----------
  currentCounts() {
    const s = this.scene;
    const counts = {};
    for (const id of Object.keys(WEAPONS)) counts[id] = s.weapons.level(id);
    for (const id of Object.keys(PASSIVES)) counts[id] = s.passives[id] || 0;
    return counts;
  }

  applyCounts(counts) {
    const s = this.scene;
    const p = s.player;
    this.used = true;
    for (const id of Object.keys(WEAPONS)) s.weapons.setLevel(id, counts[id] || 0);
    // Les passifs se recalculent depuis zéro (on peut aussi en retirer).
    const ratio = p.hp / p.maxHp;
    Object.assign(s.stats, s.baseStats());
    s.passives = {};
    for (const id of Object.keys(PASSIVES)) {
      const n = counts[id] || 0;
      if (n > 0) s.passives[id] = n;
      for (let i = 0; i < n; i++) PASSIVES[id].apply(s.stats, { heal() {} });
    }
    p.hp = Math.max(1, Math.round(p.maxHp * ratio));
  }

  // ---------- 3. GOD MODE ultime : Lumen devient le phare ----------
  activateUltimate() {
    const s = this.scene;
    const p = s.player;
    const cam = s.cameras.main;
    this.used = true;
    this.ultimate = true;
    this.rain = false;
    const counts = {};
    for (const id of Object.keys(WEAPONS)) counts[id] = GOD.weaponMax;
    for (const id of Object.keys(PASSIVES)) counts[id] = 5;
    this.applyCounts(counts);
    p.invincible = true;
    p.hp = p.maxHp;
    s.lantern.light = BALANCE.light.max;
    // La nuit se lève : on voit toute la carte.
    s.tweens.add({ targets: [s.lantern.mask, ...s.lantern.sides], alpha: 0.18, duration: 1400, ease: 'Sine.easeOut' });

    // Onde d'aube : dissipe toutes les créatures à l'écran (les boss encaissent).
    cam.flash(700, 255, 225, 150);
    cam.shake(450, 0.01);
    const view = cam.worldView;
    s.enemies.getChildren().forEach((e) => {
      if (!e.active || !view.contains(e.x, e.y)) return;
      s.damageEnemy(e, e.def.boss ? e.maxHp * 0.15 : e.hp + 1, true);
    });
    const ring = s.add.circle(p.x, p.y, 20).setStrokeStyle(10, 0xffe6a0, 1).setDepth(DEPTH.glow)
      .setBlendMode(Phaser.BlendModes.ADD);
    s.tweens.add({ targets: ring, radius: 900, alpha: 0, duration: 900, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });

    this.beamAngle = 0;
    this.beamTimer = 0;
    this.halo = s.add.graphics().setDepth(DEPTH.glow - 1).setBlendMode(Phaser.BlendModes.ADD);
    this.t = 0;
    s.events.emit('toast', 'ui.god.ultimate');
  }

  updateUltimate(dt) {
    const s = this.scene;
    const p = s.player;
    this.t += dt;
    s.lantern.light = BALANCE.light.max;
    p.hp = p.maxHp;

    // Deux faisceaux opposés tournent autour de Lumen, comme un phare.
    this.beamAngle += GOD.beamSpin * dt;
    const g = this.halo;
    g.clear();
    const L = GOD.beamLength;
    for (const base of [this.beamAngle, this.beamAngle + Math.PI]) {
      for (const [spread, alpha] of [[1, 0.1], [0.6, 0.14], [0.25, 0.3]]) {
        const h = GOD.beamHalfAngle * spread;
        g.fillStyle(0xffe6a0, alpha);
        g.fillTriangle(p.x, p.y,
          p.x + Math.cos(base - h) * L, p.y + Math.sin(base - h) * L,
          p.x + Math.cos(base + h) * L, p.y + Math.sin(base + h) * L);
      }
    }
    // Halo doré qui pulse.
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 5);
    g.fillStyle(0xffd97a, 0.12 + 0.08 * pulse).fillCircle(p.x, p.y, 46 + 8 * pulse);
    g.fillStyle(0xfff4d0, 0.25).fillCircle(p.x, p.y, 24);
    g.lineStyle(3, 0xffe6a0, 0.5 + 0.3 * pulse).strokeCircle(p.x, p.y, 70 + 14 * pulse);

    this.beamTimer -= dt;
    if (this.beamTimer > 0) return;
    this.beamTimer = GOD.beamTick;
    const dmg = GOD.beamDmg * s.stats.dmgMult;
    s.forEachEnemyNear(p.x, p.y, L, (e) => {
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      const hit = [this.beamAngle, this.beamAngle + Math.PI].some((b) =>
        Math.abs(Phaser.Math.Angle.Wrap(a - b)) < GOD.beamHalfAngle + e.radius / Math.max(40, Math.hypot(e.x - p.x, e.y - p.y)));
      if (hit) s.damageEnemy(e, dmg);
    });
  }

  update(dt) {
    this.updateRain(dt);
    if (this.ultimate) this.updateUltimate(dt);
  }
}

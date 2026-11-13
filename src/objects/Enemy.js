import Phaser from 'phaser';
import { applyVisual, flash } from './visuals.js';
import { DEPTH } from '../config.js';

const FLOW = { x: 0, y: 0 };

// Créature de brume, réutilisée via un pool (group.get).
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'E01');
    this.eyes = scene.add.image(x, y, 'eyes').setDepth(DEPTH.eyes).setVisible(false);
    this.zigPhase = 0;
  }

  spawn(id, def, x, y, hpMult, dmgMult) {
    this.enableBody(true, x, y, true, true);
    applyVisual(this, id, def.radius);
    this.anims?.play && this.scene.anims.exists(`${id}-walk`) && this.anims.play(`${id}-walk`, true);
    this.def = def;
    this.typeId = id;
    this.radius = def.radius;
    this.maxHp = def.hp * hpMult;
    this.hp = this.maxHp;
    this.dmg = def.dmg * dmgMult;
    this.speed = def.speed * Phaser.Math.FloatBetween(0.9, 1.1);
    this.zigPhase = Math.random() * Math.PI * 2;
    this.orbHitAt = 0;
    this.slowUntil = 0;
    this.slowFactor = 1;
    this.frozenUntil = 0;
    this.chill = 0;
    this.wasFrozen = false;
    this.wasSlowed = false;
    this.clearTint();
    this.setAlpha(1).setDepth(y);
    const s = def.radius / 14;
    this.eyes.setScale(Math.max(0.6, s));
  }

  // Givre : ralentit, et gèle au bout de `hitsToFreeze` coups.
  chillHit(now, st) {
    if (this.isFrozen(now)) return;
    // Les coups se cumulent tant que la créature est encore ralentie.
    this.chill = now < this.slowUntil ? this.chill + 1 : 1;
    this.slowUntil = now + st.slowDur;
    this.slowFactor = 1 - st.slow;
    if (this.chill >= st.freezeHits) {
      this.chill = 0;
      this.frozenUntil = now + st.freeze * (this.def.freezeMult ?? 1);
    }
  }

  isFrozen(now) {
    return now < this.frozenUntil;
  }

  tick(dt, target, time, level, lightR = Infinity) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const now = this.scene.elapsed;
    if (this.isFrozen(now)) {
      this.setVelocity(0, 0);
      this.anims?.pause();
      if (!this.isTinted || !this.wasFrozen) this.setTint(0x9ff4ff);
      this.wasFrozen = true;
      this.eyes.setVisible(false);
      return d;
    }
    if (this.wasFrozen) {
      this.wasFrozen = false;
      this.anims?.resume();
      this.clearTint();
    }
    const slowed = now < this.slowUntil;
    const speedMult = slowed ? this.slowFactor : 1;
    // Teinte givrée tant que la créature est ralentie (le flash de coup la retire
    // brièvement, on la remet à chaque image).
    if (slowed) {
      if (!this.isTinted) this.setTint(0xc8f6ff);
      this.wasSlowed = true;
    } else if (this.wasSlowed) {
      this.wasSlowed = false;
      this.clearTint();
    }
    // Sur une carte, on suit le champ de flux pour contourner les obstacles.
    const f = level && d > 48 ? level.flowDir(this.x, this.y, FLOW) : null;
    const speed = this.speed * speedMult;
    let vx = (f ? f.x : dx / d) * speed;
    let vy = (f ? f.y : dy / d) * speed;
    if (this.def.zigzag) {
      const w = Math.sin(time * 0.006 + this.zigPhase) * 0.9;
      vx += (-dy / d) * speed * w;
      vy += (dx / d) * speed * w;
    }
    this.setVelocity(vx, vy);
    this.setDepth(this.y);
    this.setFlipX(vx < 0);
    // Les yeux lumineux ne s'affichent que dans le noir (hors de la lumière),
    // pour qu'on repère les créatures qui approchent.
    const dark = !this.hasArt || d > lightR * 0.82;
    this.eyes.setVisible(dark);
    if (dark) {
      const ex = (dx / d) * this.radius * 0.35;
      this.eyes.setPosition(this.x + ex, this.y - this.radius * 0.25);
    }
    return d;
  }

  // Renvoie true si la créature meurt.
  damage(n) {
    this.hp -= n;
    flash(this, 0xffffff, 60);
    return this.hp <= 0;
  }

  kill() {
    this.disableBody(true, true);
    this.eyes.setVisible(false);
  }
}

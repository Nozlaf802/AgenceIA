import Phaser from 'phaser';
import { fitCircle, animate } from './visuals.js';

const FLOW = { x: 0, y: 0 };

// Créature de brume, réutilisée via un pool (group.get).
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'E01');
    this.eyes = scene.add.image(x, y, 'eyes').setDepth(600).setVisible(false);
    this.zigPhase = 0;
  }

  spawn(id, def, x, y, hpMult, dmgMult) {
    this.enableBody(true, x, y, true, true);
    this.setTexture(id);
    fitCircle(this, def.radius);
    animate(this, true);
    this.def = def;
    this.typeId = id;
    this.radius = def.radius;
    this.maxHp = def.hp * hpMult;
    this.hp = this.maxHp;
    this.dmg = def.dmg * dmgMult;
    this.speed = def.speed * Phaser.Math.FloatBetween(0.9, 1.1);
    this.zigPhase = Math.random() * Math.PI * 2;
    this.orbHitAt = 0;
    this.setAlpha(1).setDepth(5);
    const s = def.radius / 14;
    this.eyes.setScale(Math.max(0.6, s)).setVisible(true);
  }

  tick(dt, target, time, level) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    // Sur une carte, on suit le champ de flux pour contourner les obstacles.
    const f = level && d > 48 ? level.flowDir(this.x, this.y, FLOW) : null;
    let vx = (f ? f.x : dx / d) * this.speed;
    let vy = (f ? f.y : dy / d) * this.speed;
    if (this.def.zigzag) {
      const w = Math.sin(time * 0.006 + this.zigPhase) * 0.9;
      vx += (-dy / d) * this.speed * w;
      vy += (dx / d) * this.speed * w;
    }
    this.setVelocity(vx, vy);
    this.setFlipX(vx < 0);
    const ex = (dx / d) * this.radius * 0.35;
    this.eyes.setPosition(this.x + ex, this.y - this.radius * 0.25);
    return d;
  }

  // Renvoie true si la créature meurt.
  damage(n) {
    this.hp -= n;
    this.setAlpha(0.45);
    this.scene.time.delayedCall(70, () => this.active && this.setAlpha(1));
    return this.hp <= 0;
  }

  kill() {
    this.disableBody(true, true);
    this.eyes.setVisible(false);
  }
}

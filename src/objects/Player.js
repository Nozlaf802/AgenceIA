import Phaser from 'phaser';
import { BALANCE } from '../data/balance.js';
import { applyVisual, animate, flash } from './visuals.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, stats) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    applyVisual(this, 'player', BALANCE.player.radius);
    this.setDepth(y);
    this.stats = stats;
    this.radius = BALANCE.player.radius;
    this.hp = this.maxHp;
    this.iframes = 0;
  }

  get maxHp() {
    return BALANCE.player.maxHp + this.stats.maxHpBonus;
  }

  get speed() {
    return BALANCE.player.speed * this.stats.speedMult;
  }

  heal(n) {
    this.hp = Math.min(this.maxHp, this.hp + n);
  }

  // Renvoie true si le coup a porté.
  hurt(n) {
    if (this.iframes > 0 || this.hp <= 0) return false;
    this.hp = Math.max(0, this.hp - n);
    this.iframes = BALANCE.player.iframes;
    flash(this, 0xff5a36, 110);
    return true;
  }

  // dir : vecteur {x, y} de longueur 0..1 (clavier ou joystick).
  move(dir, dt) {
    this.setDepth(this.y);
    this.iframes = Math.max(0, this.iframes - dt);
    const len = Math.hypot(dir.x, dir.y);
    if (len < 0.05) {
      this.setVelocity(0, 0);
      animate(this, false);
      return;
    }
    animate(this, true);
    const k = Math.min(len, 1) / len;
    this.setVelocity(dir.x * k * this.speed, dir.y * k * this.speed);
    if (this.hasArt) { if (Math.abs(dir.x) > 0.1) this.setFlipX(dir.x < 0); }
    else this.setRotation(Math.atan2(dir.y, dir.x));
  }
}

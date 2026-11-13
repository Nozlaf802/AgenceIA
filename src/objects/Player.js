import Phaser from 'phaser';
import { BALANCE } from '../data/balance.js';
import { fitCircle, animate } from './visuals.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, stats) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    fitCircle(this, BALANCE.player.radius);
    this.setDepth(10);
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
    this.setAlpha(0.5);
    this.scene.time.delayedCall(120, () => this.setAlpha(1));
    return true;
  }

  // dir : vecteur {x, y} de longueur 0..1 (clavier ou joystick).
  move(dir, dt) {
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
    if (this.scene.anims.exists('player-walk')) this.setFlipX(dir.x < 0);
    else this.setRotation(Math.atan2(dir.y, dir.x));
  }
}

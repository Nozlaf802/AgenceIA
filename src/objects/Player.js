import Phaser from 'phaser';
import { PLAYER } from '../config.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.body.setCircle(PLAYER.radius, 2, 2);
    this.setDepth(10);

    this.speed = PLAYER.speed;
    this.maxHp = PLAYER.maxHp;
    this.hp = PLAYER.maxHp;
  }

  // dir : vecteur {x, y} de longueur 0..1 (clavier ou joystick).
  move(dir) {
    const len = Math.hypot(dir.x, dir.y);
    if (len < 0.05) {
      this.setVelocity(0, 0);
      return;
    }
    const k = Math.min(len, 1) / len;
    this.setVelocity(dir.x * k * this.speed, dir.y * k * this.speed);
    this.setRotation(Math.atan2(dir.y, dir.x));
  }
}

import Phaser from 'phaser';
import { VirtualJoystick } from './VirtualJoystick.js';

// Regroupe clavier (flèches, WASD, ZQSD) et joystick tactile
// et renvoie une seule direction normalisée.
export class InputController {
  constructor(scene) {
    const kb = scene.input.keyboard;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys({
      up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT,
      w: K.W, z: K.Z, s: K.S, a: K.A, q: K.Q, d: K.D,
    });
    this.joystick = new VirtualJoystick(scene);
    this.dir = new Phaser.Math.Vector2();
  }

  getDirection() {
    const k = this.keys;
    let x = 0;
    let y = 0;
    if (k.left.isDown || k.a.isDown || k.q.isDown) x -= 1;
    if (k.right.isDown || k.d.isDown) x += 1;
    if (k.up.isDown || k.w.isDown || k.z.isDown) y -= 1;
    if (k.down.isDown || k.s.isDown) y += 1;

    if (x !== 0 || y !== 0) {
      this.dir.set(x, y).normalize();
      return this.dir;
    }

    const j = this.joystick.vector;
    this.dir.set(j.x, j.y);
    return this.dir;
  }
}

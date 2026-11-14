import Phaser from 'phaser';
import { COLORS, DEPTH, DPR } from '../config.js';

// Joystick "flottant" : il apparaît là où le doigt touche l'écran.
// Fonctionne aussi à la souris (pratique pour tester sur ordi).
export class VirtualJoystick {
  constructor(scene, { radius = 60 } = {}) {
    this.scene = scene;
    this.radius = radius * DPR; // en pixels du canvas
    this.vector = new Phaser.Math.Vector2(0, 0);
    this.pointerId = null;
    this.origin = new Phaser.Math.Vector2();

    this.base = scene.add.circle(0, 0, radius, COLORS.joystickBase, 0.12)
      .setStrokeStyle(2, COLORS.joystickBase, 0.35)
      .setScrollFactor(0).setDepth(DEPTH.joystick).setVisible(false);
    this.knob = scene.add.circle(0, 0, radius * 0.45, COLORS.joystickKnob, 0.6)
      .setScrollFactor(0).setDepth(DEPTH.joystick + 1).setVisible(false);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
    scene.events.once('shutdown', () => this.destroy());
  }

  // Les objets en scrollFactor 0 sont quand même zoomés autour du centre par la
  // caméra : on compense pour que le joystick apparaisse pile sous le doigt.
  place(obj, x, y) {
    const cam = this.scene.cameras.main;
    const z = cam.zoom;
    const cx = cam.width / 2, cy = cam.height / 2;
    obj.setPosition(cx + (x - cx) / z, cy + (y - cy) / z).setScale(DPR / z);
  }

  onDown(pointer) {
    if (this.pointerId !== null) return;
    this.pointerId = pointer.id;
    this.origin.set(pointer.x, pointer.y);
    this.place(this.base, pointer.x, pointer.y);
    this.place(this.knob, pointer.x, pointer.y);
    this.base.setVisible(true);
    this.knob.setVisible(true);
    this.vector.set(0, 0);
  }

  onMove(pointer) {
    if (pointer.id !== this.pointerId) return;
    const dx = pointer.x - this.origin.x;
    const dy = pointer.y - this.origin.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, this.radius);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clamped;
    const ky = Math.sin(angle) * clamped;
    this.place(this.knob, this.origin.x + kx, this.origin.y + ky);
    this.vector.set(kx / this.radius, ky / this.radius);
  }

  onUp(pointer) {
    if (pointer.id !== this.pointerId) return;
    this.reset();
  }

  // Relâche le joystick (appelé aussi à la pause : le doigt a pu être levé entre-temps).
  reset() {
    this.pointerId = null;
    this.vector.set(0, 0);
    this.base.setVisible(false);
    this.knob.setVisible(false);
  }

  destroy() {
    const i = this.scene.input;
    i.off('pointerdown', this.onDown, this);
    i.off('pointermove', this.onMove, this);
    i.off('pointerup', this.onUp, this);
    i.off('pointerupoutside', this.onUp, this);
  }
}

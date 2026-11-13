import Phaser from 'phaser';
import { LANTERN } from '../config.js';

// Rendu lumière / obscurité.
// Une texture à dégradé radial (transparent au centre, sombre au bord) suit
// le joueur ; quatre rectangles opaques couvrent tout le reste de l'écran.
// Peu coûteux et identique en WebGL comme en Canvas (mobile compris).
const TEX = 'lantern-mask';
const TEX_SIZE = 512;

export class Lantern {
  constructor(scene, target) {
    this.scene = scene;
    this.target = target;
    this.charge = 1; // 0..1
    this.radius = LANTERN.maxRadius;
    this.t = 0;

    if (!scene.textures.exists(TEX)) Lantern.createMaskTexture(scene);

    const depth = 500;
    this.mask = scene.add.image(0, 0, TEX).setDepth(depth);
    this.sides = [0, 1, 2, 3].map(() =>
      scene.add.rectangle(0, 0, 10, 10, LANTERN.darkness, LANTERN.darknessAlpha)
        .setOrigin(0, 0).setDepth(depth));
  }

  static createMaskTexture(scene) {
    const tex = scene.textures.createCanvas(TEX, TEX_SIZE, TEX_SIZE);
    const ctx = tex.getContext();
    const c = TEX_SIZE / 2;
    const col = Phaser.Display.Color.IntegerToColor(LANTERN.darkness);
    const rgba = (a) => `rgba(${col.red},${col.green},${col.blue},${a})`;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, rgba(0));
    g.addColorStop(0.55, rgba(0.05));
    g.addColorStop(0.8, rgba(LANTERN.darknessAlpha * 0.6));
    g.addColorStop(1, rgba(LANTERN.darknessAlpha));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    tex.refresh();
  }

  // Le rayon "utile" (pour brûler les ennemis plus tard).
  get lightRadius() {
    return this.radius * 0.8;
  }

  isInLight(x, y) {
    return Phaser.Math.Distance.Between(x, y, this.target.x, this.target.y) <= this.lightRadius;
  }

  setCharge(v) {
    this.charge = Phaser.Math.Clamp(v, 0, 1);
  }

  update(delta) {
    const dt = delta / 1000;
    this.t += dt;
    if (LANTERN.drainPerSecond) this.setCharge(this.charge - LANTERN.drainPerSecond * dt);

    const base = Phaser.Math.Linear(LANTERN.minRadius, LANTERN.maxRadius, this.charge);
    const flicker = (Math.sin(this.t * 13) + Math.sin(this.t * 7.3)) * 0.5 * LANTERN.flicker;
    this.radius = base + flicker;

    const x = this.target.x;
    const y = this.target.y;
    const size = this.radius * 2;
    this.mask.setPosition(x, y).setDisplaySize(size, size);

    // Rectangles qui couvrent la vue de la caméra autour du cercle.
    const v = this.scene.cameras.main.worldView;
    const pad = 4;
    const L = v.x - pad, T = v.y - pad, R = v.right + pad, B = v.bottom + pad;
    const cl = x - this.radius, ct = y - this.radius, cr = x + this.radius, cb = y + this.radius;
    const [top, bottom, left, right] = this.sides;
    top.setPosition(L, T).setSize(R - L, Math.max(0, ct - T));
    bottom.setPosition(L, cb).setSize(R - L, Math.max(0, B - cb));
    left.setPosition(L, ct).setSize(Math.max(0, cl - L), cb - ct);
    right.setPosition(cr, ct).setSize(Math.max(0, R - cr), cb - ct);
  }
}

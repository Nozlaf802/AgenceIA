import Phaser from 'phaser';
import { COLORS, DEPTH } from '../config.js';
import { BALANCE } from '../data/balance.js';

// Jauge Lumière + rendu lumière / obscurité.
// Une texture à dégradé radial (transparent au centre, sombre au bord) suit
// le joueur ; quatre rectangles opaques couvrent tout le reste de l'écran.
// Peu coûteux et identique en WebGL comme en Canvas (mobile compris).
const TEX = 'lantern-mask';
const TEX_SIZE = 512;
const L = BALANCE.light;

export class Lantern {
  constructor(scene, target) {
    this.scene = scene;
    this.target = target;
    this.light = L.start;
    this.t = 0;
    this.radius = this.baseRadius;

    if (!scene.textures.exists(TEX)) Lantern.createMaskTexture(scene);

    const depth = DEPTH.darkness;
    this.mask = scene.add.image(0, 0, TEX).setDepth(depth);
    this.sides = [0, 1, 2, 3].map(() =>
      scene.add.rectangle(0, 0, 10, 10, COLORS.darkness, COLORS.darknessAlpha)
        .setOrigin(0, 0).setDepth(depth));
  }

  static createMaskTexture(scene) {
    const tex = scene.textures.createCanvas(TEX, TEX_SIZE, TEX_SIZE);
    const ctx = tex.getContext();
    const c = TEX_SIZE / 2;
    const col = Phaser.Display.Color.IntegerToColor(COLORS.darkness);
    const rgba = (a) => `rgba(${col.red},${col.green},${col.blue},${a})`;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, rgba(0));
    g.addColorStop(0.6, rgba(0.04));
    g.addColorStop(0.85, rgba(COLORS.darknessAlpha * 0.6));
    g.addColorStop(1, rgba(COLORS.darknessAlpha));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    tex.refresh();
  }

  get charge() {
    return this.light / L.max;
  }

  get baseRadius() {
    return L.radiusMin + L.radiusPerPoint * this.light;
  }

  // Rayon "utile" : portée de la lanterne et zone où la lumière brûle.
  get lightRadius() {
    return this.baseRadius * 0.85;
  }

  add(n) {
    this.light = Phaser.Math.Clamp(this.light + n, 0, L.max);
  }

  update(dt, drainMult = 1) {
    this.t += dt;
    this.add(-L.drainPerSec * Math.max(0.2, drainMult) * dt);

    const flicker = (Math.sin(this.t * 13) + Math.sin(this.t * 7.3)) * 0.5 * L.flicker;
    this.radius = this.baseRadius + flicker;

    const x = this.target.x;
    const y = this.target.y;
    const size = this.radius * 2;
    this.mask.setPosition(x, y).setDisplaySize(size, size);

    // Rectangles qui couvrent la vue de la caméra autour du cercle.
    const v = this.scene.cameras.main.worldView;
    const pad = 8;
    const l = v.x - pad, tp = v.y - pad, r = v.right + pad, b = v.bottom + pad;
    const cl = x - this.radius, ct = y - this.radius, cr = x + this.radius, cb = y + this.radius;
    const [top, bottom, left, right] = this.sides;
    const place = (rect, x0, y0, w, h) => {
      const show = w > 0 && h > 0;
      rect.setVisible(show);
      if (show) rect.setPosition(x0, y0).setSize(w, h);
    };
    place(top, l, tp, r - l, ct - tp);
    place(bottom, l, cb, r - l, b - cb);
    place(left, l, ct, cl - l, cb - ct);
    place(right, cr, ct, r - cr, cb - ct);
  }
}

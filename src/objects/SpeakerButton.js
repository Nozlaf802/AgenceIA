import { COLORS } from '../config.js';
import { SFX } from '../systems/Sound.js';

// Bouton haut-parleur (son activé / coupé), dessiné en vectoriel pour rester net partout.
export class SpeakerButton {
  constructor(scene, x, y) {
    this.scene = scene;
    this.g = scene.add.graphics();
    this.zone = scene.add.zone(x, y, 44, 44).setInteractive({ useHandCursor: true });
    this.zone.on('pointerdown', (p, lx, ly, ev) => { ev?.stopPropagation?.(); SFX.toggleMute(); });
    this.off = SFX.onChange(() => this.draw());
    // Reconstruit au redimensionnement : on se désabonne quand le dessin est détruit.
    this.g.once('destroy', () => this.off());
    this.setPosition(x, y);
  }

  setPosition(x, y) {
    this.x = x; this.y = y;
    this.zone.setPosition(x, y);
    this.draw();
    return this;
  }

  setDepth(d) { this.g.setDepth(d); this.zone.setDepth(d); return this; }

  draw() {
    const { g, x, y } = this;
    g.clear();
    g.fillStyle(COLORS.text, 0.95);
    g.fillRect(x - 11, y - 4, 6, 8);
    g.fillTriangle(x - 5, y - 4, x + 2, y - 10, x + 2, y + 10);
    g.fillTriangle(x - 5, y - 4, x - 5, y + 4, x + 2, y + 10);
    if (SFX.muted) {
      g.lineStyle(2.5, COLORS.hp, 1);
      g.lineBetween(x + 5, y - 5, x + 13, y + 5);
      g.lineBetween(x + 13, y - 5, x + 5, y + 5);
    } else {
      g.lineStyle(2, COLORS.text, 0.95);
      g.beginPath(); g.arc(x + 3, y, 6, -0.9, 0.9); g.strokePath();
      g.beginPath(); g.arc(x + 3, y, 11, -0.9, 0.9); g.strokePath();
    }
  }
}

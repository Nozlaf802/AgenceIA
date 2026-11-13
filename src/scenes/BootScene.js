import Phaser from 'phaser';
import { COLORS, PLAYER, WORLD } from '../config.js';

// Génère des textures provisoires (formes simples) en attendant
// les vrais visuels de la charte graphique.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Joueur : disque avec contour et un "œil" qui indique la direction.
    const r = PLAYER.radius;
    const size = r * 2 + 4;
    g.clear();
    g.fillStyle(COLORS.player, 1);
    g.fillCircle(size / 2, size / 2, r);
    g.lineStyle(3, COLORS.playerOutline, 1);
    g.strokeCircle(size / 2, size / 2, r);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(size / 2 + r * 0.45, size / 2, r * 0.28);
    g.generateTexture('player', size, size);

    // Sol : damier discret pour bien sentir le déplacement.
    const t = WORLD.tileSize;
    g.clear();
    g.fillStyle(COLORS.groundA, 1);
    g.fillRect(0, 0, t * 2, t * 2);
    g.fillStyle(COLORS.groundB, 1);
    g.fillRect(t, 0, t, t);
    g.fillRect(0, t, t, t);
    g.generateTexture('ground', t * 2, t * 2);

    g.destroy();

    this.scene.start('Game');
  }
}

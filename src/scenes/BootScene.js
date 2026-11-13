import Phaser from 'phaser';
import { COLORS, VIEW } from '../config.js';
import { BALANCE } from '../data/balance.js';
import { ENEMIES } from '../data/enemies.js';
import { ASSETS } from '../data/assets.js';

export const selectedMap = () => {
  const q = new URLSearchParams(location.search).get('map');
  if (q === 'infini') return null;
  return q ?? ASSETS.defaultMap;
};

// Génère des textures provisoires (formes simples) en attendant
// les vrais visuels de la charte graphique.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.setPath('');
    for (const [key, url] of Object.entries(ASSETS.images)) this.load.image(key, url);
    for (const [key, sh] of Object.entries(ASSETS.spritesheets)) {
      this.load.spritesheet(key, sh.url, { frameWidth: sh.frameWidth, frameHeight: sh.frameHeight });
    }
    const mapKey = selectedMap();
    const map = mapKey && ASSETS.maps[mapKey];
    if (map) {
      this.load.tilemapTiledJSON(`map-${mapKey}`, map.url);
      map.tilesets.forEach((ts) => this.load.image(ts.key, ts.url));
    }
    // Un fichier manquant ne bloque pas le jeu : la forme provisoire prend le relais.
    this.load.on('loaderror', (file) => console.warn('Visuel introuvable :', file.src));
  }

  create() {
    // Animations des spritesheets
    for (const [key, sh] of Object.entries(ASSETS.spritesheets)) {
      if (!this.textures.exists(key)) continue;
      for (const [name, a] of Object.entries(sh.anims || {})) {
        this.anims.create({
          key: `${key}-${name}`,
          frames: this.anims.generateFrameNumbers(key, { start: a.start, end: a.end }),
          frameRate: a.frameRate ?? 10,
          repeat: a.repeat ?? -1,
        });
      }
    }

    const g = this.make.graphics({ x: 0, y: 0 }, false);
    // Ne génère une forme provisoire que si le vrai visuel n'est pas chargé.
    const has = (key) => this.textures.exists(key);
    const circleTex = (key, r, fill, stroke) => {
      if (has(key)) return;
      const s = r * 2 + 4;
      g.clear();
      g.fillStyle(fill, 1).fillCircle(s / 2, s / 2, r);
      if (stroke) g.lineStyle(stroke.w, stroke.c, stroke.a ?? 1).strokeCircle(s / 2, s / 2, r);
      g.generateTexture(key, s, s);
    };

    // Joueur
    const r = BALANCE.player.radius;
    const size = r * 2 + 4;
    if (!has('player')) {
      g.clear();
      g.fillStyle(COLORS.player, 1).fillCircle(size / 2, size / 2, r);
      g.lineStyle(3, COLORS.playerOutline, 1).strokeCircle(size / 2, size / 2, r);
      g.fillStyle(0xffffff, 1).fillCircle(size / 2 + r * 0.45, size / 2, r * 0.28);
      g.generateTexture('player', size, size);
    }

    // Créatures de brume : une forme par type, plus deux yeux (séparés,
    // dessinés au-dessus de l'obscurité pour rester lisibles dans le noir).
    for (const [id, e] of Object.entries(ENEMIES)) {
      circleTex(id, e.radius, e.color, { w: 2, c: 0x2a2440, a: 0.8 });
    }
    if (!has('eyes')) {
      g.clear();
      g.fillStyle(COLORS.eyes, 1).fillCircle(4, 4, 3).fillCircle(14, 4, 3);
      g.generateTexture('eyes', 18, 8);
    }

    circleTex('luciole', 5, 0xd8ff8a, { w: 3, c: 0xf4ffd0, a: 0.6 });
    circleTex('bolt', 5, COLORS.bolt, { w: 2, c: 0xffffff });
    circleTex('orb', 9, COLORS.orb, { w: 3, c: 0xffd08a });

    // Lueur (losange)
    if (!has('lueur')) {
      g.clear();
      g.fillStyle(COLORS.lueur, 1).fillPoints(
        [
          { x: 6, y: 0 },
          { x: 12, y: 6 },
          { x: 6, y: 12 },
          { x: 0, y: 6 },
        ],
        true,
      );
      g.generateTexture('lueur', 12, 12);
    }
    // Bidon d'huile
    if (!has('oil')) {
      g.clear();
      g.fillStyle(COLORS.oil, 1).fillRoundedRect(0, 3, 14, 16, 3).fillRect(4, 0, 6, 4);
      g.generateTexture('oil', 14, 19);
    }

    // Sol : damier discret pour bien sentir le déplacement.
    const t = VIEW.tileSize;
    if (!has('ground')) {
      g.clear();
      g.fillStyle(COLORS.groundA, 1).fillRect(0, 0, t * 2, t * 2);
      g.fillStyle(COLORS.groundB, 1).fillRect(t, 0, t, t).fillRect(0, t, t, t);
      g.generateTexture('ground', t * 2, t * 2);
    }

    g.destroy();
    this.scene.start('Title');
  }
}

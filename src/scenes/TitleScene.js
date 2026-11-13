import Phaser from 'phaser';
import { COLORS } from '../config.js';
import { t } from '../data/texts.js';

const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.build();
    this.scale.on('resize', this.build, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.build, this));
    this.input.keyboard.once('keydown-ENTER', () => this.start());
    this.input.keyboard.once('keydown-SPACE', () => this.start());
  }

  build() {
    this.children.removeAll(true);
    const { width: w, height: h } = this.scale;
    // Halo de lanterne derrière le titre
    const halo = this.add.graphics();
    for (let i = 10; i > 0; i--) {
      halo.fillStyle(COLORS.light, 0.025).fillCircle(w / 2, h / 2 - 20, 40 + i * 26);
    }
    this.add.text(w / 2, h / 2 - 90, t('ui.title.name'), {
      fontFamily: FONT, fontSize: w < 500 ? '30px' : '44px', color: '#ffe3a8', fontStyle: 'bold', align: 'center',
      wordWrap: { width: w - 32 },
    }).setOrigin(0.5);
    this.add.text(w / 2, h / 2 - 30, t('ui.title.tagline'), {
      fontFamily: FONT, fontSize: '16px', color: '#aab2d0', align: 'center', wordWrap: { width: w - 32 },
    }).setOrigin(0.5);

    const bg = this.add.rectangle(w / 2, h / 2 + 50, 280, 60, 0x1e2336).setStrokeStyle(2, COLORS.light, 0.9)
      .setInteractive({ useHandCursor: true });
    this.add.text(w / 2, h / 2 + 50, t('ui.title.play'), { fontFamily: FONT, fontSize: '20px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x2b3350));
    bg.on('pointerout', () => bg.setFillStyle(0x1e2336));
    bg.on('pointerup', () => this.start());

    this.add.text(w / 2, h - 30, 'ZQSD / WASD / flèches, ou glisse le doigt · P = pause · prototype', {
      fontFamily: FONT, fontSize: '12px', color: '#6f7799', align: 'center', wordWrap: { width: w - 32 },
    }).setOrigin(0.5);
  }

  start() {
    if (this.starting) return;
    this.starting = true;
    this.scene.start('Game');
  }
}

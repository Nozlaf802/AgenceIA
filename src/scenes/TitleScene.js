import Phaser from 'phaser';
import { COLORS, FONTS, setupHudCamera, viewSize } from '../config.js';
import { ASSETS } from '../data/assets.js';
import { t } from '../data/texts.js';
import { VERSION } from '../data/version.js';
import { deviceKey } from '../input/device.js';
import { SFX } from '../systems/Sound.js';
import { SpeakerButton } from '../objects/SpeakerButton.js';

const FONT = FONTS.title;
const MONO = FONTS.mono;

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    setupHudCamera(this);
    this.build();
    this.scale.on('resize', this.build, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.build, this));
    this.input.keyboard.once('keydown-ENTER', () => this.start());
    this.input.keyboard.once('keydown-SPACE', () => this.start());
    this.input.keyboard.on('keydown-M', () => SFX.toggleMute());
    SFX.startAmbience(); // démarre au premier geste du joueur
  }

  build() {
    this.children.removeAll(true);
    const { width: w, height: h } = viewSize(this);
    // Halo de lanterne derrière le titre
    const halo = this.add.graphics();
    for (let i = 10; i > 0; i--) {
      halo.fillStyle(COLORS.light, 0.025).fillCircle(w / 2, h / 2 - 20, 40 + i * 26);
    }
    if (this.textures.exists('phare')) {
      this.add.image(w / 2, h / 2 - 40, 'phare').setAlpha(0.22).setScale(Math.min(1, h / 520));
    }
    if (this.anims.exists('player-idle')) {
      this.add.sprite(w / 2, h / 2 + 130, 'gardien_idle').play('player-idle').setScale(0.9);
    }
    this.add.text(w / 2, h / 2 - 90, t('ui.title.name'), {
      fontFamily: FONT, fontSize: w < 500 ? '30px' : '44px', color: '#ffd97a', fontStyle: '700', align: 'center',
      wordWrap: { width: w - 32 },
    }).setOrigin(0.5);
    this.add.text(w / 2, h / 2 - 30, t('ui.title.tagline'), {
      fontFamily: FONT, fontSize: '16px', color: '#aab2d0', align: 'center', wordWrap: { width: w - 32 },
    }).setOrigin(0.5);

    const bg = this.add.rectangle(w / 2, h / 2 + 50, 280, 60, 0x10142a).setStrokeStyle(2, COLORS.light, 0.9)
      .setInteractive({ useHandCursor: true });
    this.add.text(w / 2, h / 2 + 50, t('ui.title.play'), { fontFamily: FONT, fontSize: '20px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x1d2547));
    bg.on('pointerout', () => bg.setFillStyle(0x10142a));
    bg.on('pointerup', () => this.start());

    // Aide des contrôles adaptée à l'appareil (tactile ou clavier).
    this.add.text(w / 2, h - 40, t(deviceKey('ui.controls')), {
      fontFamily: FONT, fontSize: '13px', color: '#aab2d0', align: 'center', wordWrap: { width: w - 32 },
    }).setOrigin(0.5, 1);
    this.add.text(w - 12, h - 10, `v${VERSION}`, { fontFamily: MONO, fontSize: '12px', color: '#6f7799' }).setOrigin(1, 1);
    new SpeakerButton(this, w - 30, 30);
  }

  start() {
    if (this.starting) return;
    this.starting = true;
    SFX.unlock();
    SFX.play('click');
    this.scene.start('Game');
  }
}

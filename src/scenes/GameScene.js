import Phaser from 'phaser';
import { COLORS, WORLD } from '../config.js';
import { Player } from '../objects/Player.js';
import { InputController } from '../input/InputController.js';
import { Lantern } from '../objects/Lantern.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const { width, height } = WORLD;

    this.physics.world.setBounds(0, 0, width, height);

    // Sol de l'arène + bordure visible.
    this.add.tileSprite(0, 0, width, height, 'ground').setOrigin(0, 0);
    this.add.rectangle(width / 2, height / 2, width, height)
      .setStrokeStyle(6, COLORS.border, 1);

    this.player = new Player(this, width / 2, height / 2);
    this.controls = new InputController(this);
    this.lantern = new Lantern(this, this.player);

    // Caméra qui suit le joueur en douceur, bloquée aux bords de l'arène.
    const cam = this.cameras.main;
    cam.setBounds(0, 0, width, height);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setRoundPixels(true);

    // Chronomètre de partie (base pour les vagues du Level designer).
    this.elapsed = 0;

    this.scene.launch('UI');

    // Pause automatique quand l'onglet perd le focus.
    this.game.events.on('blur', this.pauseGame, this);
    this.events.once('shutdown', () => this.game.events.off('blur', this.pauseGame, this));
    this.input.keyboard.on('keydown-P', this.togglePause, this);
    this.input.keyboard.on('keydown-ESC', this.togglePause, this);
  }

  update(_time, delta) {
    this.elapsed += delta;
    this.player.move(this.controls.getDirection());
    this.lantern.update(delta);
  }

  pauseGame() {
    if (this.scene.isPaused()) return;
    this.scene.pause();
    this.scene.get('UI').showPause(true);
  }

  togglePause() {
    if (this.scene.isPaused()) {
      this.scene.resume();
      this.scene.get('UI').showPause(false);
    } else {
      this.pauseGame();
    }
  }
}

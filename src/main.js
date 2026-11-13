import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { COLORS } from './config.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: COLORS.background,
  scale: {
    // Le canvas remplit toute la fenêtre (ordi, mobile portrait ou paysage).
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  input: {
    activePointers: 3, // multi-touch
  },
  scene: [BootScene, GameScene, UIScene],
};

const game = new Phaser.Game(config);

// Exposé pour le debug et les tests automatisés (QA).
window.__GAME__ = game;

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { COLORS, DPR } from './config.js';

// Textes nets sur écran haute densité : rendus à la résolution réelle par défaut.
const addText = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function (x, y, text, style) {
  return addText.call(this, x, y, text, { resolution: DPR, ...style });
};

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: COLORS.background,
  scale: {
    // Le canvas remplit toute la fenêtre (ordi, mobile portrait ou paysage),
    // en pixels réels de l'écran (voir DPR dans config.js).
    mode: Phaser.Scale.NONE,
    width: window.innerWidth * DPR,
    height: window.innerHeight * DPR,
    zoom: 1 / DPR,
  },
  // panicMax bas : après le chargement ou un retour d'onglet, Phaser bride le temps
  // pendant 120 images par défaut ; sur un appareil lent ça ralentissait tout le jeu.
  fps: { panicMax: 10 },
  physics: {
    default: 'arcade',
    // fixedStep false : la physique suit le temps réel, le jeu ne ralentit
    // pas quand les images par seconde chutent (issue #6).
    arcade: { debug: false, fixedStep: false },
  },
  input: {
    activePointers: 3, // multi-touch
  },
  scene: [BootScene, TitleScene, GameScene, UIScene],
};

const game = new Phaser.Game(config);

const fit = () => game.scale.resize(window.innerWidth * DPR, window.innerHeight * DPR);
window.addEventListener('resize', fit);
window.visualViewport?.addEventListener('resize', fit);

// Exposé pour le debug et les tests automatisés (QA).
window.__GAME__ = game;

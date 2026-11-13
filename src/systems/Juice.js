import Phaser from 'phaser';

// Effets de « juice » : chiffres de dégâts et éclats de brume à la mort.
export class Juice {
  constructor(scene) {
    this.scene = scene;
    this.texts = [];
    if (!scene.textures.exists('spark')) {
      const g = scene.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1).fillCircle(4, 4, 4);
      g.generateTexture('spark', 8, 8);
      g.destroy();
    }
    this.particles = scene.add.particles(0, 0, 'spark', {
      speed: { min: 40, max: 160 },
      lifespan: { min: 250, max: 500 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 0.9, end: 0 },
      emitting: false,
    }).setDepth(7);
  }

  number(x, y, value, color = '#fff3c4') {
    if (this.texts.filter((tx) => tx.active).length > 40) return; // limite perf
    let tx = this.texts.find((o) => !o.active);
    if (!tx) {
      tx = this.scene.add.text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(700);
      this.texts.push(tx);
    }
    tx.setText(String(Math.round(value))).setColor(color).setPosition(x + Phaser.Math.Between(-6, 6), y)
      .setActive(true).setVisible(true).setAlpha(1);
    this.scene.tweens.add({
      targets: tx, y: y - 28, alpha: 0, duration: 550, ease: 'Cubic.easeOut',
      onComplete: () => tx.setActive(false).setVisible(false),
    });
  }

  burst(x, y, color) {
    this.particles.setParticleTint?.(color);
    this.particles.explode(8, x, y);
  }
}

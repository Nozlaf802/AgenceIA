import Phaser from 'phaser';

// Interface par-dessus le jeu (chrono, PV, pause). Indépendante de la caméra.
export class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.gameScene = this.scene.get('Game');
    const style = { fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#ffffff' };

    this.timerText = this.add.text(0, 16, '00:00', { ...style, fontSize: '22px' }).setOrigin(0.5, 0);
    this.hpText = this.add.text(16, 16, '', style);
    this.lanternBar = this.add.graphics();
    this.fpsText = this.add.text(16, 62, '', { ...style, fontSize: '12px', color: '#8890b0' });
    this.hint = this.add.text(0, 0, 'Flèches / ZQSD / WASD ou glisse le doigt pour bouger', {
      ...style, fontSize: '14px', color: '#aab2d0', align: 'center',
    }).setOrigin(0.5, 1);

    this.pauseOverlay = this.add.container(0, 0).setVisible(false);
    this.pauseBg = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.6).setOrigin(0, 0).setInteractive();
    this.pauseText = this.add.text(0, 0, 'PAUSE\nTouche ou appuie sur P pour reprendre', {
      ...style, fontSize: '24px', align: 'center',
    }).setOrigin(0.5);
    this.pauseOverlay.add([this.pauseBg, this.pauseText]);
    this.pauseBg.on('pointerdown', () => this.gameScene.togglePause());

    // Bouton pause tactile.
    this.pauseBtn = this.add.text(0, 16, '❚❚', { ...style, fontSize: '24px' })
      .setOrigin(1, 0).setInteractive({ useHandCursor: true })
      .on('pointerdown', (p, x, y, e) => { e?.stopPropagation(); this.gameScene.togglePause(); });

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));

    this.time.delayedCall(6000, () => {
      this.tweens.add({ targets: this.hint, alpha: 0, duration: 800 });
    });
  }

  layout() {
    const { width, height } = this.scale;
    this.timerText.setX(width / 2);
    this.hint.setPosition(width / 2, height - 20);
    this.pauseBtn.setX(width - 16);
    this.pauseBg.setSize(width, height);
    this.pauseText.setPosition(width / 2, height / 2);
  }

  showPause(visible) {
    this.pauseOverlay.setVisible(visible);
  }

  update() {
    const s = Math.floor((this.gameScene.elapsed ?? 0) / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    this.timerText.setText(`${mm}:${ss}`);
    const p = this.gameScene.player;
    if (p) this.hpText.setText(`PV ${p.hp}/${p.maxHp}`);
    const l = this.gameScene.lantern;
    if (l) {
      this.lanternBar.clear();
      this.lanternBar.fillStyle(0x000000, 0.5).fillRect(16, 44, 120, 10);
      this.lanternBar.fillStyle(0xffc96b, 1).fillRect(16, 44, 120 * l.charge, 10);
    }
    this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} fps`);
  }
}

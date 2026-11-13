import Phaser from 'phaser';
import { COLORS } from '../config.js';
import { t } from '../data/texts.js';

const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
const fmtTime = (sec) => {
  const s = Math.floor(sec);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// Interface par-dessus le jeu : barres, chrono, messages, choix de cartes, fin.
export class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.game_ = this.scene.get('Game');
    const style = { fontFamily: FONT, fontSize: '16px', color: '#ffffff' };

    this.bars = this.add.graphics();
    this.levelText = this.add.text(0, 0, '', { ...style, fontSize: '13px', color: '#cfe9ff' }).setOrigin(1, 0);
    this.timerText = this.add.text(0, 0, '00:00', { ...style, fontSize: '22px', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.killText = this.add.text(0, 0, '', { ...style, fontSize: '13px', color: '#aab2d0' }).setOrigin(0.5, 0);
    this.hpText = this.add.text(0, 0, '', { ...style, fontSize: '12px' });
    this.lightText = this.add.text(0, 0, '', { ...style, fontSize: '12px', color: '#ffe3a8' });
    this.toastText = this.add.text(0, 0, '', {
      ...style, fontSize: '17px', align: 'center', color: '#ffe9b8',
      backgroundColor: '#00000088', padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setAlpha(0);

    // Debug (?debug à la fin de l'adresse, ou touche F2) : FPS, niveau,
    // étincelles ramassées par minute, pour régler la courbe d'XP.
    this.debug = new URLSearchParams(location.search).has('debug');
    this.debugText = this.add.text(16, 64, '', {
      fontFamily: 'ui-monospace, monospace', fontSize: '11px', color: '#9fb0d8',
      backgroundColor: '#00000099', padding: { x: 6, y: 4 },
    }).setVisible(this.debug);
    this.input.keyboard.on('keydown-F2', () => { this.debug = !this.debug; this.debugText.setVisible(this.debug); });

    this.pauseBtn = this.add.text(0, 0, '❚❚', { ...style, fontSize: '22px' })
      .setOrigin(1, 0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.game_.togglePause());

    // Couches modales (pause, montée de niveau, fin), reconstruites à la demande.
    this.modal = null;

    const ev = this.game_.events;
    const on = (name, fn) => { ev.on(name, fn, this); this.events.once('shutdown', () => ev.off(name, fn, this)); };
    on('toast', this.toast);
    on('levelup', this.showLevelUp);
    on('pause', (v) => (v ? this.showPause() : this.closeModal()));
    on('over', this.showOver);

    this.keyHandler = (e) => this.onKey(e);
    this.input.keyboard.on('keydown', this.keyHandler);

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  layout() {
    const { width } = this.scale;
    this.W = width;
    this.timerText.setPosition(width / 2, 18);
    this.killText.setPosition(width / 2, 44);
    this.levelText.setPosition(width - 12, 10);
    this.pauseBtn.setPosition(width - 14, 30);
    this.hpText.setPosition(16, 24);
    this.lightText.setPosition(16, 46);
    this.toastText.setPosition(width / 2, 110).setWordWrapWidth(Math.min(520, width - 40));
    if (this.modal?.relayout) this.modal.relayout();
  }

  update() {
    const g = this.game_;
    if (!g.player) return;
    const W = this.W;
    const p = g.player;
    const pr = g.progress;
    const b = this.bars;
    b.clear();
    // XP (bande en haut)
    b.fillStyle(0x000000, 0.55).fillRect(0, 0, W, 8);
    b.fillStyle(COLORS.xp, 1).fillRect(0, 0, W * (pr.xp / pr.xpNext), 8);
    // PV et Lumière
    const bw = Math.min(160, W * 0.32);
    b.fillStyle(0x000000, 0.55).fillRect(16, 18, bw, 14).fillRect(16, 40, bw, 14);
    b.fillStyle(COLORS.hp, 1).fillRect(16, 18, bw * (p.hp / p.maxHp), 14);
    b.fillStyle(COLORS.light, 1).fillRect(16, 40, bw * g.lantern.charge, 14);
    this.hpText.setText(`PV ${Math.ceil(p.hp)}/${p.maxHp}`).setPosition(20, 18);
    this.lightText.setText(`Lumière ${Math.ceil(g.lantern.light)}`).setPosition(20, 40).setColor('#2a1a00');
    this.hpText.setColor('#ffffff');

    this.timerText.setText(fmtTime(g.elapsed));
    this.killText.setText(`${pr.kills} créatures dissipées`);
    this.levelText.setText(`Niv. ${pr.level}`);

    if (this.debug) {
      const lpm = g.lueursPerMinute.map((v, i) => `${i}:${v ?? 0}`).join(' ');
      const ground = g.pickups.filter((o) => o.active && o.kind === 'lueur').length;
      this.debugText.setText([
        `${Math.round(this.game.loop.actualFps)} fps · créatures ${g.enemies.countActive(true)} · Lueurs au sol ${ground}`,
        `XP ${pr.xp}/${pr.xpNext} · niv. ${pr.level}`,
        `Lueurs/min ${lpm || '-'}`,
      ]);
    }
  }

  toast(key) {
    this.toastText.setText(t(key)).setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 2800, duration: 600 });
  }

  // ---------- Modales ----------
  closeModal() {
    if (this.modal) this.modal.destroy();
    this.modal = null;
    this.modalKeys = null;
  }

  makeModal(build) {
    this.closeModal();
    const c = this.add.container(0, 0).setDepth(100);
    c.relayout = () => {
      c.removeAll(true);
      const { width, height } = this.scale;
      c.add(this.add.rectangle(0, 0, width, height, 0x05060c, 0.72).setOrigin(0, 0).setInteractive());
      build(c, width, height);
    };
    c.relayout();
    this.modal = c;
    return c;
  }

  button(c, x, y, w, h, label, onClick, sub) {
    const bg = this.add.rectangle(x, y, w, h, 0x1e2336, 1).setStrokeStyle(2, COLORS.light, 0.8)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, sub ? y - h / 2 + 14 : y, label, {
      fontFamily: FONT, fontSize: sub ? '18px' : '20px', color: '#ffffff', fontStyle: 'bold',
      align: 'center', wordWrap: { width: w - 20 },
    }).setOrigin(0.5, sub ? 0 : 0.5);
    const items = [bg, txt];
    if (sub) {
      items.push(this.add.text(x, txt.y + txt.height + 8, sub, {
        fontFamily: FONT, fontSize: '14px', color: '#c9cfe6', align: 'center', wordWrap: { width: w - 24 },
      }).setOrigin(0.5, 0));
    }
    bg.on('pointerover', () => bg.setFillStyle(0x2b3350));
    bg.on('pointerout', () => bg.setFillStyle(0x1e2336));
    bg.on('pointerdown', onClick);
    c.add(items);
    return bg;
  }

  showPause() {
    this.makeModal((c, w, h) => {
      c.add(this.add.text(w / 2, h / 2 - 50, 'PAUSE', { fontFamily: FONT, fontSize: '34px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5));
      c.add(this.add.text(w / 2, h / 2 - 10, t('ui.pause'), { fontFamily: FONT, fontSize: '16px', color: '#ffe3a8' }).setOrigin(0.5));
      this.button(c, w / 2, h / 2 + 50, 220, 52, 'Reprendre', () => this.game_.togglePause());
    });
    this.modalKeys = { Enter: () => this.game_.togglePause(), ' ': () => this.game_.togglePause() };
  }

  showLevelUp(cards) {
    this.cards = cards;
    const pick = (i) => {
      if (!this.cards) return;
      const card = this.cards[i];
      this.cards = null;
      this.modalKeys = null;
      this.closeModal();
      this.game_.chooseCard(card);
    };
    this.makeModal((c, w, h) => {
      const vertical = w < 640;
      const cw = vertical ? Math.min(340, w - 40) : 200;
      const ch = vertical ? 96 : 190;
      const gap = 16;
      const top = vertical ? Math.max(130, h / 2 - (ch * 3 + gap * 2) / 2 + 30) : h / 2 - ch / 2 + 30;
      c.add(this.add.text(w / 2, top - 80, t('ui.levelup.title'), { fontFamily: FONT, fontSize: '28px', color: '#ffd36b', fontStyle: 'bold' }).setOrigin(0.5));
      c.add(this.add.text(w / 2, top - 44, t('ui.levelup.pick'), { fontFamily: FONT, fontSize: '16px', color: '#c9cfe6' }).setOrigin(0.5));
      cards.forEach((card, i) => {
        const x = vertical ? w / 2 : w / 2 + (i - 1) * (cw + gap);
        const y = vertical ? top + ch / 2 + i * (ch + gap) : top + ch / 2;
        const lv = card.level ? (card.level === 1 ? ' · Nouveau' : ` · Niv. ${card.level}`) : '';
        const kind = card.kind === 'weapon' ? '⚔ ' : card.kind === 'passive' ? '✦ ' : '';
        this.button(c, x, y, cw, ch, `${i + 1}. ${kind}${card.name}${lv}`, () => pick(i), card.desc);
      });
    });
    this.modalKeys = { 1: () => pick(0), 2: () => pick(1), 3: () => pick(2) };
  }

  showOver({ victory, time, kills, level }) {
    this.makeModal((c, w, h) => {
      c.add(this.add.text(w / 2, h / 2 - 90, t(victory ? 'ui.win.title' : 'ui.death.title'), {
        fontFamily: FONT, fontSize: '28px', color: victory ? '#ffd36b' : '#ffffff', fontStyle: 'bold', align: 'center',
        wordWrap: { width: w - 40 },
      }).setOrigin(0.5));
      c.add(this.add.text(w / 2, h / 2 - 30, `Survécu ${fmtTime(time)} · Créatures dissipées : ${kills}\nNiveau atteint : ${level}`, {
        fontFamily: FONT, fontSize: '16px', color: '#c9cfe6', align: 'center',
      }).setOrigin(0.5));
      this.button(c, w / 2, h / 2 + 50, 240, 56, t('ui.death.retry'), () => this.game_.restart());
    });
    this.modalKeys = { Enter: () => this.game_.restart(), ' ': () => this.game_.restart() };
  }

  onKey(e) {
    if (!this.modal || !this.modalKeys) return;
    const fn = this.modalKeys[e.key];
    if (fn) fn();
  }

}

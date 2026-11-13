import Phaser from 'phaser';
import { COLORS, FONTS } from '../config.js';
import { ASSETS } from '../data/assets.js';
import { t } from '../data/texts.js';

const FONT = FONTS.title;
const MONO = FONTS.mono;
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
    this.timerText = this.add.text(0, 0, '00:00', { ...style, fontFamily: MONO, fontSize: '22px', fontStyle: '600' }).setOrigin(0.5, 0);
    this.killText = this.add.text(0, 0, '', { ...style, fontFamily: MONO, fontSize: '13px', color: '#aab2d0' }).setOrigin(0.5, 0);
    this.hpText = this.add.text(0, 0, '', { ...style, fontFamily: MONO, fontSize: '12px' });
    this.bossText = this.add.text(0, 0, '', { ...style, fontSize: '14px', fontStyle: '700', color: '#e6d8ff' }).setOrigin(0.5, 1).setVisible(false);
    this.lightText = this.add.text(0, 0, '', { ...style, fontFamily: MONO, fontSize: '12px', color: '#ffe3a8' });
    const icon = (k) => (this.textures.exists(ASSETS.icons[k]) ? this.add.image(0, 0, ASSETS.icons[k]).setDisplaySize(20, 20) : null);
    this.hpIcon = icon('hp');
    this.lightIcon = icon('light');
    this.killIcon = icon('kills');
    this.barX = this.hpIcon ? 40 : 16;

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
    this.killText.setPosition(width / 2 + (this.killIcon ? 10 : 0), 44);
    this.killIcon?.setDisplaySize(16, 16);
    this.levelText.setPosition(width - 12, 10);
    this.pauseBtn.setPosition(width - 14, 30);
    this.hpIcon?.setPosition(26, 25);
    this.lightIcon?.setPosition(26, 47);
    this.toastText.setPosition(width / 2, 124).setWordWrapWidth(Math.min(520, width - 40));
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
    const x0 = this.barX;
    const bw = Math.min(160, W * 0.28);
    b.fillStyle(0x000000, 0.55).fillRect(x0, 18, bw, 14).fillRect(x0, 40, bw, 14);
    b.fillStyle(COLORS.hp, 1).fillRect(x0, 18, bw * Math.min(1, p.hp / p.maxHp), 14);
    b.fillStyle(COLORS.light, 1).fillRect(x0, 40, bw * g.lantern.charge, 14);
    b.lineStyle(1, COLORS.text, 0.25).strokeRect(x0, 18, bw, 14).strokeRect(x0, 40, bw, 14);
    this.hpText.setText(`${Math.ceil(p.hp)}/${p.maxHp}`).setPosition(x0 + 4, 18);
    this.lightText.setText(`${Math.ceil(g.lantern.light)}`).setPosition(x0 + 4, 40).setColor('#2a1a00');
    this.hpText.setColor('#ffffff');

    this.timerText.setText(fmtTime(g.elapsed));
    this.killText.setText(`${pr.kills}`);
    if (this.killIcon) this.killIcon.setPosition(this.W / 2 - this.killText.width / 2 - 2, 52);
    this.levelText.setText(`Niv. ${pr.level}`);

    // Barre de vie du mini-boss / boss, sous le chrono.
    const boss = g.boss?.active ? g.boss : null;
    this.bossText.setVisible(!!boss);
    if (boss) {
      const bw2 = Math.min(360, W - 40), bx = (W - bw2) / 2, by = 86;
      b.fillStyle(0x000000, 0.6).fillRect(bx, by, bw2, 10);
      b.fillStyle(0xb98cff, 1).fillRect(bx, by, bw2 * Math.max(0, boss.hp / boss.maxHp), 10);
      b.lineStyle(1, COLORS.text, 0.35).strokeRect(bx, by, bw2, 10);
      this.bossText.setText(boss.def.name).setPosition(W / 2, by - 2);
    }

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

  button(c, x, y, w, h, label, onClick, sub, iconKey) {
    const bg = this.add.rectangle(x, y, w, h, 0x10142a, 1).setStrokeStyle(2, COLORS.light, 0.8)
      .setInteractive({ useHandCursor: true });
    const items = [bg];
    // Carte basse (mobile) : icône à gauche, texte à droite. Carte haute : icône en bas.
    const hasIcon = iconKey && this.textures.exists(iconKey);
    const side = hasIcon && h < 120;
    const tx = side ? x + 26 : x;
    const tw = side ? w - 90 : w - 20;
    if (hasIcon) {
      items.push(this.add.image(side ? x - w / 2 + 34 : x, side ? y : y + h / 2 - 32, iconKey).setDisplaySize(40, 40));
    }
    const txt = this.add.text(tx, 0, label, {
      fontFamily: FONT, fontSize: sub ? '18px' : '20px', color: '#ffffff', fontStyle: '700',
      align: 'center', wordWrap: { width: tw },
    }).setOrigin(0.5, 0);
    items.push(txt);
    let subTxt = null;
    if (sub) {
      subTxt = this.add.text(tx, 0, sub, {
        fontFamily: FONT, fontSize: '14px', color: '#c9cfe6', align: 'center', wordWrap: { width: tw },
      }).setOrigin(0.5, 0);
      items.push(subTxt);
    }
    // Centre verticalement (carte basse ou bouton) ou aligne en haut (carte haute).
    const total = txt.height + (subTxt ? subTxt.height + 6 : 0);
    const top = !sub || side ? y - total / 2 : y - h / 2 + 14;
    txt.setY(top);
    subTxt?.setY(top + txt.height + 6);
    bg.on('pointerover', () => bg.setFillStyle(0x1d2547));
    bg.on('pointerout', () => bg.setFillStyle(0x10142a));
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
        const ik = ASSETS.icons[card.kind === 'passive' ? 'passive' : card.id];
        this.button(c, x, y, cw, ch, `${i + 1}. ${card.name}${lv}`, () => pick(i), card.desc, ik);
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

import Phaser from 'phaser';
import { COLORS, FONTS, setupHudCamera, viewSize } from '../config.js';
import { ASSETS } from '../data/assets.js';
import { t } from '../data/texts.js';
import { WEAPONS, PASSIVES } from '../data/upgrades.js';
import { GOD } from '../systems/GodMode.js';

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
    setupHudCamera(this);
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

    // Easter egg mobile : 5 touches rapides sur le chrono ouvrent le God mode.
    this.timerTaps = [];
    this.timerText.setInteractive(new Phaser.Geom.Rectangle(-24, -14, this.timerText.width + 48, this.timerText.height + 28), Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', () => {
        const now = this.time.now;
        this.timerTaps = this.timerTaps.filter((x) => now - x < 2500);
        this.timerTaps.push(now);
        if (this.timerTaps.length >= 5) { this.timerTaps = []; this.game_.god.open(); }
      });
    this.secret = '';
    // Croix pour sortir de la pluie d'XP (visible seulement pendant la pluie).
    this.rainBtn = this.add.text(0, 0, '✕ Pluie d\'XP', {
      ...style, fontSize: '13px', color: '#ffe3a8', backgroundColor: '#000000aa', padding: { x: 8, y: 6 },
    }).setOrigin(1, 0).setVisible(false).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.game_.god.stopRain());

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
    on('god-open', this.showGodMenu);
    on('god-rain-stop', () => { this.cards = null; this.closeModal(); });

    this.keyHandler = (e) => this.onKey(e);
    this.input.keyboard.on('keydown', this.keyHandler);

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  layout() {
    const { width } = viewSize(this);
    this.W = width;
    this.timerText.setPosition(width / 2, 18);
    this.killText.setPosition(width / 2 + (this.killIcon ? 10 : 0), 44);
    this.killIcon?.setDisplaySize(16, 16);
    this.levelText.setPosition(width - 12, 10);
    this.pauseBtn.setPosition(width - 14, 30);
    this.rainBtn.setPosition(width - 10, 62);
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
    this.rainBtn.setVisible(!!g.god?.rain);
    const ult = g.god?.ultimate;
    this.levelText.setText(ult ? `✦ GOD · Niv. ${pr.level}` : `Niv. ${pr.level}`).setColor(ult ? '#ffd36b' : '#cfe9ff');

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
      const { width, height } = viewSize(this);
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
      if (this.game_.god?.rain) {
        c.add(this.add.text(w - 12, 62, '✕', { fontFamily: FONT, fontSize: '26px', color: '#ffe3a8' })
          .setOrigin(1, 0).setPadding(10, 6).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.game_.god.stopRain()));
        c.add(this.add.text(w - 54, 72, 'Arrêter la pluie', { fontFamily: FONT, fontSize: '13px', color: '#aab2d0' }).setOrigin(1, 0));
      }
    });
    this.modalKeys = { 1: () => pick(0), 2: () => pick(1), 3: () => pick(2) };
  }

  // ---------- God mode (easter egg) ----------
  closeGod() {
    this.closeModal();
    this.game_.god.close();
  }

  showGodMenu() {
    const god = this.game_.god;
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setAlpha(0);
    const run = (fn) => { this.closeGod(); fn(); };
    const opts = [
      ['1. Pluie d\'XP', 'Des Lueurs tombent sur toi jusqu\'au niveau max. Tu choisis tes flammes, tu restes mortel.', () => run(() => god.startRain())],
      ['2. Pouvoirs à volonté', 'Prends chaque carte autant de fois que tu veux, avec + et −.', () => this.showGodCards()],
      ['3. GOD MODE ultime', 'Invincible, tout au max, la nuit se lève et deux faisceaux de phare balaient la brume.', () => run(() => god.activateUltimate())],
    ];
    this.makeModal((c, w, h) => {
      // Écran bas (mobile en paysage) : les 3 choix côte à côte.
      const row = h < 480 && w >= 600;
      const gap = h < 520 ? 8 : 14;
      const bw = row ? Math.min(240, (w - 32 - 2 * gap) / 3) : Math.min(460, w - 32);
      const bh = row ? Math.min(150, h - 170) : h < 520 ? 74 : 92;
      const top = row ? 92 : Math.max(96, h / 2 - (bh * 3 + gap * 2) / 2 - 10);
      c.add(this.add.text(w / 2, top - 62, t('ui.god.title'), { fontFamily: FONT, fontSize: '30px', color: '#ffd36b', fontStyle: 'bold' }).setOrigin(0.5));
      c.add(this.add.text(w / 2, top - 28, t('ui.god.sub'), { fontFamily: FONT, fontSize: '15px', color: '#c9cfe6', align: 'center', wordWrap: { width: w - 32 } }).setOrigin(0.5));
      opts.forEach(([label, sub, fn], i) => {
        if (row) this.button(c, w / 2 + (i - 1) * (bw + gap), top + bh / 2, bw, bh, label, fn, sub);
        else this.button(c, w / 2, top + bh / 2 + i * (bh + gap), bw, bh, label, fn, sub);
      });
      const by = row ? top + bh + 26 : top + 3 * (bh + gap) + 24;
      const close = this.add.text(w / 2, Math.min(by, h - 24), 'Fermer', { fontFamily: FONT, fontSize: '16px', color: '#8f97b8' })
        .setOrigin(0.5).setPadding(16, 8).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.closeGod());
      c.add(close);
    });
    this.modalKeys = {
      1: opts[0][2], 2: opts[1][2], 3: opts[2][2],
      '&': opts[0][2], 'é': opts[1][2], '"': opts[2][2], // rangée de chiffres AZERTY sans Maj
      Escape: () => this.closeGod(),
    };
  }

  // Liste de toutes les cartes avec un compteur − n + chacune.
  showGodCards() {
    const god = this.game_.god;
    const counts = god.currentCounts();
    const rows = [
      ...Object.entries(WEAPONS).map(([id, w]) => ({ id, name: w.name, max: GOD.weaponMax, icon: ASSETS.icons[id], weapon: true })),
      ...Object.entries(PASSIVES).map(([id, ps]) => ({ id, name: ps.name, desc: ps.desc, max: GOD.passiveMax, icon: ASSETS.icons.passive })),
    ];
    const info = (r) => {
      const n = counts[r.id];
      if (r.weapon) return n === 0 ? 'Pas prise' : n <= 5 ? `Niv. ${n}` : `Niv. 5 + surcharge ×${n - 5}`;
      return n === 0 ? r.desc : `${r.desc} ×${n}`;
    };
    const apply = () => { this.closeGod(); god.applyCounts(counts); this.game_.events.emit('toast', 'ui.god.cards'); };
    const build = (c, w, h) => {
      const cols = w >= 640 ? 2 : 1;
      const perCol = Math.ceil(rows.length / cols);
      const colW = Math.min(cols === 2 ? 380 : 440, (w - 32 - (cols - 1) * 16) / cols);
      c.add(this.add.rectangle(0, 0, w, h, 0x05060c, 0.8).setOrigin(0, 0)); // cache le HUD derrière la liste
      const header = h < 420 ? 70 : 84, footer = 64;
      const rh = Phaser.Math.Clamp(Math.floor((h - header - footer - 16) / perCol), 34, 58);
      const totalW = cols * colW + (cols - 1) * 16;
      const top = Math.max(header, (h - perCol * rh - footer) / 2 + 20);
      c.add(this.add.text(w / 2, top - 46, 'Pouvoirs à volonté', { fontFamily: FONT, fontSize: rh < 44 ? '20px' : '24px', color: '#ffd36b', fontStyle: 'bold' }).setOrigin(0.5));
      c.add(this.add.text(w / 2, top - 18, 'Chaque + ajoute la carte une fois de plus.', { fontFamily: FONT, fontSize: '13px', color: '#c9cfe6' }).setOrigin(0.5));
      rows.forEach((r, i) => {
        const col = Math.floor(i / perCol), k = i % perCol;
        const x0 = (w - totalW) / 2 + col * (colW + 16);
        const y = top + k * rh + rh / 2;
        c.add(this.add.rectangle(x0, y, colW, rh - 4, 0x10142a, 1).setOrigin(0, 0.5).setStrokeStyle(1, COLORS.light, 0.35));
        const hasIcon = r.icon && this.textures.exists(r.icon);
        if (hasIcon) c.add(this.add.image(x0 + 18, y, r.icon).setDisplaySize(22, 22));
        const tx = x0 + (hasIcon ? 36 : 10);
        const textW = colW - (tx - x0) - 128;
        c.add(this.add.text(tx, y - (rh >= 44 ? 9 : 0), r.name, { fontFamily: FONT, fontSize: '14px', color: '#ffffff', fontStyle: '700', fixedWidth: textW }).setOrigin(0, 0.5));
        if (rh >= 44) c.add(this.add.text(tx, y + 10, info(r), { fontFamily: FONT, fontSize: '11px', color: '#aab2d0', fixedWidth: textW }).setOrigin(0, 0.5));
        const nTxt = this.add.text(x0 + colW - 64, y, String(counts[r.id]), { fontFamily: MONO, fontSize: '18px', color: counts[r.id] ? '#ffd36b' : '#6f7799', fontStyle: '600' }).setOrigin(0.5);
        c.add(nTxt);
        const step = (d) => {
          counts[r.id] = Phaser.Math.Clamp(counts[r.id] + d, 0, r.max);
          c.relayout();
        };
        const btn = (bx, label, d) => {
          const b = this.add.rectangle(bx, y, 34, Math.min(34, rh - 8), 0x1d2547, 1).setStrokeStyle(1, COLORS.light, 0.8)
            .setInteractive({ useHandCursor: true }).on('pointerdown', () => step(d));
          c.add(b);
          c.add(this.add.text(bx, y, label, { fontFamily: FONT, fontSize: '20px', color: '#ffffff', fontStyle: '700' }).setOrigin(0.5));
        };
        btn(x0 + colW - 106, '−', -1);
        btn(x0 + colW - 22, '+', +1);
      });
      const fy = Math.min(top + perCol * rh + 34, h - 30);
      this.button(c, w / 2 - 80, fy, 140, 44, 'Valider', apply);
      this.button(c, w / 2 + 80, fy, 140, 44, 'Retour', () => this.showGodMenu());
    };
    this.makeModal(build);
    this.modalKeys = { Enter: apply, Escape: () => this.showGodMenu() };
  }

  showOver({ victory, time, kills, level, god }) {
    this.makeModal((c, w, h) => {
      c.add(this.add.text(w / 2, h / 2 - 90, t(victory ? 'ui.win.title' : 'ui.death.title'), {
        fontFamily: FONT, fontSize: '28px', color: victory ? '#ffd36b' : '#ffffff', fontStyle: 'bold', align: 'center',
        wordWrap: { width: w - 40 },
      }).setOrigin(0.5));
      c.add(this.add.text(w / 2, h / 2 - 30, `Survécu ${fmtTime(time)} · Créatures dissipées : ${kills}\nNiveau atteint : ${level}${god ? ' · ✦ God mode' : ''}`, {
        fontFamily: FONT, fontSize: '16px', color: '#c9cfe6', align: 'center',
      }).setOrigin(0.5));
      this.button(c, w / 2, h / 2 + 50, 240, 56, t('ui.death.retry'), () => this.game_.restart());
    });
    this.modalKeys = { Enter: () => this.game_.restart(), ' ': () => this.game_.restart() };
  }

  onKey(e) {
    // Easter egg clavier : taper L-U-M-E-N (lettres réelles, marche en AZERTY comme en QWERTY).
    if (e.key && e.key.length === 1) {
      this.secret = (this.secret + e.key.toUpperCase()).slice(-5);
      if (this.secret === 'LUMEN') { this.secret = ''; if (this.game_.god.open()) return; }
    }
    if (!this.modal || !this.modalKeys) return;
    const fn = this.modalKeys[e.key];
    if (fn) fn();
  }

}

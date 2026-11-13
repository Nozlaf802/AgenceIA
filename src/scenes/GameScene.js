import Phaser from 'phaser';
import { VIEW, DEPTH } from '../config.js';
import { BALANCE } from '../data/balance.js';
import { WEAPONS, PASSIVES, FALLBACKS, MAX_WEAPONS, MAX_PASSIVES } from '../data/upgrades.js';
import { Player } from '../objects/Player.js';
import { Enemy } from '../objects/Enemy.js';
import { Lantern } from '../objects/Lantern.js';
import { InputController } from '../input/InputController.js';
import { Spawner } from '../systems/Spawner.js';
import { Weapons } from '../systems/Weapons.js';
import { buildMap } from '../systems/MapBuilder.js';
import { selectedMap } from './BootScene.js';
import { Juice } from '../systems/Juice.js';
import { applyVisual } from '../objects/visuals.js';
import { ASSETS } from '../data/assets.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    // 'play' | 'levelup' | 'paused' | 'over'
    this.state = 'play';
    this.elapsed = 0; // secondes de jeu (s'arrête en pause)
    this.stats = {
      dmgMult: 1, speedMult: 1, magnetMult: 1, cooldownMult: 1,
      drainMult: 1, maxHpBonus: 0, regen: 0,
    };
    this.progress = { level: 1, xp: 0, xpNext: BALANCE.xpToNext(1), kills: 0 };
    this.passives = {}; // id -> niveau
    this.pendingLevelUps = 0;
    this.auraTimer = 0;
    this.lueurAcc = 0;
    this.lueursPerMinute = []; // debug : étincelles ramassées par minute
    this.flowTimer = 0;
    this.fireflyTimer = 3;
    this.darkWarned = false;

    // Carte Tiled si elle existe, sinon arène infinie provisoire
    // (un motif de sol qui défile avec la caméra).
    this.level = buildMap(this, selectedMap());
    if (!this.level) {
      this.ground = this.add.tileSprite(0, 0, 4, 4, 'ground').setScrollFactor(0).setDepth(DEPTH.ground);
    }
    const start = this.level?.start ?? { x: 0, y: 0 };

    this.player = new Player(this, start.x, start.y, this.stats);
    this.controls = new InputController(this);
    this.lantern = new Lantern(this, this.player);

    this.enemies = this.physics.add.group({ classType: Enemy, maxSize: 260 });
    this.pickups = []; // Lueurs et bidons d'huile (images simples, réutilisées)

    if (this.level) {
      const b = this.level.bounds;
      this.physics.world.setBounds(b.x, b.y, b.width, b.height);
      this.player.setCollideWorldBounds(true);
      // Marge autour de la carte : le joueur ne passe jamais sous l'interface.
      const m = 150;
      this.cameras.main.setBounds(b.x - m, b.y - m, b.width + 2 * m, b.height + 2 * m);
      this.level.walls.forEach((w) => {
        this.physics.add.collider(this.player, w);
        this.physics.add.collider(this.enemies, w);
      });
    }

    this.juice = new Juice(this);
    this.weapons = new Weapons(this);
    this.weapons.add('lantern'); // arme de départ
    this.spawner = new Spawner(this);

    const cam = this.cameras.main;
    cam.startFollow(this.player, true, 0.12, 0.12);
    this.applyZoom();
    this.scale.on('resize', this.onResize, this);

    this.scene.launch('UI');

    this.game.events.on('blur', this.pauseGame, this);
    this.input.keyboard.on('keydown-P', this.togglePause, this);
    this.input.keyboard.on('keydown-ESC', this.togglePause, this);
    this.events.once('shutdown', () => {
      this.game.events.off('blur', this.pauseGame, this);
      this.scale.off('resize', this.onResize, this);
    });
  }

  applyZoom() {
    const { width, height } = this.scale;
    const z = Math.sqrt((width * height) / (VIEW.refWidth * VIEW.refHeight));
    const zoom = Phaser.Math.Clamp(z, VIEW.minZoom, VIEW.maxZoom);
    this.cameras.main.setZoom(zoom);
    // Le sol (scrollFactor 0) est lui aussi zoomé autour du centre de l'écran :
    // on l'agrandit d'autant pour qu'il couvre toujours tout l'écran.
    this.ground?.setPosition(width / 2, height / 2).setSize(width / zoom + 4, height / zoom + 4);
  }

  onResize() {
    this.applyZoom();
  }

  update(time, delta) {
    if (this.state !== 'play') return;
    const dt = Math.min(delta, 50) / 1000; // évite les sauts après un onglet en arrière-plan
    this.elapsed += dt;
    const p = this.player;
    const cam = this.cameras.main;

    p.move(this.controls.getDirection(), dt);
    this.lantern.update(dt, this.stats.drainMult);

    // Sol infini (tient compte du zoom).
    if (this.ground) {
      this.ground.setTilePosition(cam.worldView.x, cam.worldView.y);
    }

    if (this.lantern.light <= 0) {
      p.hp = Math.max(0, p.hp - BALANCE.light.darkDmgPerSec * dt);
      if (!this.darkWarned) { this.darkWarned = true; this.events.emit('toast', 'ui.warning.dark'); }
    } else if (this.lantern.light > 10) {
      this.darkWarned = false;
    }
    if (this.stats.regen) p.heal(this.stats.regen * dt);

    // Créatures : déplacement + contact.
    const lightR = this.lantern.lightRadius;
    this.enemies.getChildren().forEach((e) => {
      if (!e.active) return;
      const d = e.tick(dt, p, time, this.level, lightR);
      if (d < e.radius + p.radius) {
        if (p.hurt(e.dmg)) {
          cam.shake(90, 0.005);
          this.juice.number(p.x, p.y - 20, e.dmg, '#ff6b6b');
        }
      }
      // Les créatures trop loin derrière sont replacées plus près.
      if (d > 1600) {
        const pt = this.spawner.spawnPoint();
        e.setPosition(pt.x, pt.y);
      }
    });

    // La lumière blesse légèrement les créatures dans l'aura.
    this.auraTimer -= dt;
    if (this.auraTimer <= 0) {
      this.auraTimer = BALANCE.light.auraTick;
      const L = BALANCE.light;
      const dmg = Phaser.Math.Linear(L.auraDmgMin, L.auraDmgMax, this.lantern.charge) * this.stats.dmgMult;
      this.forEachEnemyNear(p.x, p.y, lightR, (e) => this.damageEnemy(e, dmg, true));
    }

    if (this.level) {
      this.flowTimer -= dt;
      if (this.flowTimer <= 0) { this.flowTimer = 0.25; this.level.updateFlow(p.x, p.y); }
      this.fireflyTimer -= dt;
      if (this.fireflyTimer <= 0) {
        this.fireflyTimer = BALANCE.light.fireflyEverySec;
        const alive = this.pickups.filter((o) => o.active && o.kind === 'luciole').length;
        const pt = alive < BALANCE.light.fireflyMax && this.level.pickFirefly(p.x, p.y);
        if (pt) this.dropPickup('luciole', pt.x, pt.y, 1);
      }
    }

    this.weapons.update(dt);
    this.updatePickups(dt);
    this.spawner.update(dt);

    if (p.hp <= 0) this.endRun(false);
    else if (this.elapsed >= BALANCE.run.durationSec) this.endRun(true);
  }

  // ---------- Créatures : requêtes utilisées par les armes ----------
  forEachEnemyNear(x, y, r, fn) {
    this.enemies.getChildren().forEach((e) => {
      if (!e.active) return;
      const rr = r + e.radius;
      const dx = e.x - x, dy = e.y - y;
      if (dx * dx + dy * dy <= rr * rr) fn(e);
    });
  }

  firstEnemyAt(x, y, r) {
    let found = null;
    this.enemies.getChildren().forEach((e) => {
      if (found || !e.active) return;
      const rr = r + e.radius;
      const dx = e.x - x, dy = e.y - y;
      if (dx * dx + dy * dy <= rr * rr) found = e;
    });
    return found;
  }

  nearestEnemies(x, y, range, n) {
    const list = [];
    this.enemies.getChildren().forEach((e) => {
      if (!e.active) return;
      const d2 = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d2 <= range * range) list.push([d2, e]);
    });
    list.sort((a, b) => a[0] - b[0]);
    return list.slice(0, n).map((x) => x[1]);
  }

  damageEnemy(e, dmg, quiet = false) {
    if (!e.active) return;
    const dead = quiet ? (e.hp -= dmg) <= 0 : e.damage(dmg);
    if (!quiet) this.juice.number(e.x, e.y - e.radius, dmg);
    if (!dead) return;
    this.juice.burst(e.x, e.y, e.def.color, e.radius);
    this.progress.kills++;
    this.lueurAcc += e.def.lueurs;
    const n = Math.floor(this.lueurAcc);
    this.lueurAcc -= n;
    if (n > 0) this.dropLueur(e.x, e.y, n);
    if (Math.random() < BALANCE.light.oilChance) this.dropPickup('oil', e.x + 8, e.y, 1);
    e.kill();
  }

  // ---------- Lueurs et huile ----------
  // Les Lueurs ne disparaissent jamais. Au-delà du plafond, la nouvelle valeur
  // s'ajoute à la Lueur la plus éloignée de Lumen, qui grossit.
  dropLueur(x, y, value) {
    const onGround = this.pickups.filter((o) => o.active && o.kind === 'lueur');
    if (onGround.length < BALANCE.maxLueursOnGround) {
      this.dropPickup('lueur', x, y, value);
      return;
    }
    const p = this.player;
    let far = onGround[0], best = -1;
    for (const o of onGround) {
      const d = (o.x - p.x) ** 2 + (o.y - p.y) ** 2;
      if (d > best) { best = d; far = o; }
    }
    far.value += value;
    const base = ASSETS.visuals.lueur && far.hasArt ? ASSETS.visuals.lueur.scale : 1;
    far.setScale(base * Math.min(1 + Math.log2(far.value) * 0.25, 2.5));
  }

  dropPickup(kind, x, y, value) {
    let o = this.pickups.find((it) => !it.active);
    if (!o) {
      o = this.add.sprite(x, y, kind);
      this.pickups.push(o);
    }
    applyVisual(o, kind);
    o.setActive(true).setVisible(true).setPosition(x, y);
    o.kind = kind;
    o.value = value;
    o.attracted = false;
    if (kind === 'lueur') o.setScale(o.scaleX * Math.min(1 + Math.log2(value) * 0.25, 2.5));
    // Les lucioles brillent au-dessus de l'obscurité pour qu'on les repère de loin.
    o.setDepth(kind === 'luciole' ? DEPTH.glow : DEPTH.pickup);
  }

  updatePickups(dt) {
    const p = this.player;
    const magnet = BALANCE.player.magnet * this.stats.magnetMult;
    for (const o of this.pickups) {
      if (!o.active) continue;
      const dx = p.x - o.x, dy = p.y - o.y;
      const d = Math.hypot(dx, dy);
      if (d < magnet) o.attracted = true;
      if (o.attracted) {
        const sp = Math.max(380, p.speed * 1.6);
        o.x += (dx / d) * sp * dt;
        o.y += (dy / d) * sp * dt;
      }
      if (d < p.radius + 6) {
        o.setActive(false).setVisible(false);
        this.collect(o);
      }
    }
  }

  collect(o) {
    if (o.kind === 'luciole') {
      this.lantern.add(BALANCE.light.firefly);
      return;
    }
    if (o.kind === 'oil') {
      this.lantern.add(BALANCE.light.oil);
      this.events.emit('toast', 'ui.pickup.oil');
      return;
    }
    this.lantern.add(BALANCE.light.perLueur * o.value);
    if (!this.seenXpTuto) { this.seenXpTuto = true; this.events.emit('toast', 'ui.tuto.xp'); }
    const pr = this.progress;
    pr.xp += BALANCE.xpPerLueur * o.value;
    const m = Math.floor(this.elapsed / 60);
    this.lueursPerMinute[m] = (this.lueursPerMinute[m] || 0) + o.value;
    while (pr.xp >= pr.xpNext) {
      pr.xp -= pr.xpNext;
      pr.level++;
      pr.xpNext = BALANCE.xpToNext(pr.level);
      this.pendingLevelUps++;
    }
    if (this.pendingLevelUps > 0 && this.state === 'play') this.openLevelUp();
  }

  // ---------- Montée de niveau ----------
  rollCards() {
    const cards = [];
    const nW = Object.keys(this.weapons.owned).length;
    const nP = Object.keys(this.passives).length;
    for (const [id, w] of Object.entries(WEAPONS)) {
      const lv = this.weapons.level(id);
      if (lv >= 5 || (lv === 0 && nW >= MAX_WEAPONS)) continue;
      cards.push({ kind: 'weapon', id, name: w.name, level: lv + 1, desc: w.desc[lv] });
    }
    for (const [id, ps] of Object.entries(PASSIVES)) {
      const lv = this.passives[id] || 0;
      if (lv >= 5 || (lv === 0 && nP >= MAX_PASSIVES)) continue;
      cards.push({ kind: 'passive', id, name: ps.name, level: lv + 1, desc: ps.desc });
    }
    Phaser.Utils.Array.Shuffle(cards);
    const out = cards.slice(0, 3);
    for (const [id, f] of Object.entries(FALLBACKS)) {
      if (out.length >= 3) break;
      out.push({ kind: 'fallback', id, name: f.name, level: 0, desc: f.desc });
    }
    return out;
  }

  openLevelUp() {
    this.pendingLevelUps--;
    this.state = 'levelup';
    this.physics.pause();
    this.controls.joystick.reset();
    this.events.emit('levelup', this.rollCards());
  }

  chooseCard(card) {
    if (card.kind === 'weapon') this.weapons.add(card.id);
    else if (card.kind === 'passive') {
      this.passives[card.id] = (this.passives[card.id] || 0) + 1;
      PASSIVES[card.id].apply(this.stats, this.player);
    } else if (card.id === 'soin') this.player.heal(30);
    else if (card.id === 'recharge') this.lantern.add(40);

    if (this.pendingLevelUps > 0) {
      this.events.emit('levelup', this.rollCards());
      this.pendingLevelUps--;
      return;
    }
    this.state = 'play';
    this.physics.resume();
  }

  // ---------- Pause / fin ----------
  pauseGame() {
    if (this.state !== 'play') return;
    this.state = 'paused';
    this.physics.pause();
    this.controls.joystick.reset();
    this.events.emit('pause', true);
  }

  togglePause() {
    if (this.state === 'paused') {
      this.state = 'play';
      this.physics.resume();
      this.events.emit('pause', false);
    } else {
      this.pauseGame();
    }
  }

  endRun(victory) {
    this.state = 'over';
    this.physics.pause();
    this.player.setVelocity(0, 0);
    this.events.emit('over', {
      victory,
      time: this.elapsed,
      kills: this.progress.kills,
      level: this.progress.level,
    });
  }

  restart() {
    this.scene.stop('UI');
    this.scene.restart();
  }
}

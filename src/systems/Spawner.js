import Phaser from 'phaser';
import { BALANCE } from '../data/balance.js';
import { ENEMIES, FALLBACK_ENEMY } from '../data/enemies.js';

// Fait apparaître les créatures selon le script de vagues (balance.js).
export class Spawner {
  constructor(scene) {
    this.scene = scene;
    this.acc = 0;
    this.fired = new Set();
  }

  get minute() {
    return Math.min(Math.floor(this.scene.elapsed / 60), BALANCE.minutes.length - 1);
  }

  get hpMult() {
    return 1 + BALANCE.difficulty.hpPerMinute * (this.scene.elapsed / 60);
  }

  get dmgMult() {
    return 1 + BALANCE.difficulty.dmgPerMinute * (this.scene.elapsed / 60);
  }

  update(dt) {
    const m = this.minute;
    const row = BALANCE.minutes[m];
    const secInMinute = this.scene.elapsed - m * 60;

    (row.events || []).forEach((ev, i) => {
      const key = `${m}:${i}`;
      if (!this.fired.has(key) && secInMinute >= ev.at) {
        this.fired.add(key);
        this.runEvent(ev);
      }
    });

    const maxAlive = Math.min(row.maxAlive, BALANCE.difficulty.maxAliveCap);
    this.acc += row.spawnPerSec * dt;
    while (this.acc >= 1) {
      this.acc -= 1;
      if (this.scene.enemies.countActive(true) < maxAlive) {
        const p = this.spawnPoint();
        this.spawn(this.pick(row.mix), p.x, p.y);
      }
    }
  }

  pick(mix) {
    let r = Math.random();
    for (const [id, w] of Object.entries(mix)) {
      r -= w;
      if (r <= 0) return id;
    }
    return Object.keys(mix)[0];
  }

  spawn(id, x, y) {
    const realId = ENEMIES[id] ? id : FALLBACK_ENEMY;
    const e = this.scene.enemies.get(x, y);
    if (!e) return null;
    e.spawn(realId, ENEMIES[realId], x, y, this.hpMult, this.dmgMult);
    return e;
  }

  // Sur une carte : un point d'apparition du Level designer, sinon le bord de l'écran.
  spawnPoint() {
    const lv = this.scene.level;
    const pl = this.scene.player;
    const sp = lv?.pickSpawn(this.scene.cameras.main.worldView, pl.x, pl.y);
    if (sp) return { x: sp.x + Phaser.Math.Between(-12, 12), y: sp.y + Phaser.Math.Between(-12, 12) };
    return this.edgePoint();
  }

  // Point juste hors de l'écran, dans une direction au hasard.
  edgePoint(angle = Math.random() * Math.PI * 2, extra = 60) {
    const v = this.scene.cameras.main.worldView;
    const p = this.scene.player;
    const dist = Math.hypot(v.width, v.height) / 2 + extra;
    let x = p.x + Math.cos(angle) * dist;
    let y = p.y + Math.sin(angle) * dist;
    // Carte fermée : on reste dans les limites (juste à l'intérieur du bord).
    const b = this.scene.level?.bounds;
    if (b) {
      x = Phaser.Math.Clamp(x, b.x + 24, b.right - 24);
      y = Phaser.Math.Clamp(y, b.y + 24, b.bottom - 24);
    }
    return { x, y };
  }

  runEvent(ev) {
    const sides = { right: 0, bottom: Math.PI / 2, left: Math.PI, top: -Math.PI / 2 };
    switch (ev.type) {
      case 'text':
        this.scene.events.emit('toast', ev.key);
        break;
      case 'swarm': {
        const base = sides[ev.from] ?? Math.random() * Math.PI * 2;
        const c = this.edgePoint(base, 80);
        for (let i = 0; i < ev.count; i++) {
          const x = c.x + Phaser.Math.Between(-90, 90), y = c.y + Phaser.Math.Between(-90, 90);
          if (!this.scene.level?.isBlockedAt(x, y)) this.spawn(ev.enemy, x, y);
        }
        break;
      }
      case 'ring':
        for (let i = 0; i < ev.count; i++) {
          const p = this.edgePoint((i / ev.count) * Math.PI * 2, 20);
          if (!this.scene.level?.isBlockedAt(p.x, p.y)) this.spawn(ev.enemy, p.x, p.y);
        }
        break;
      default:
        break; // elite, boss, chest… : à venir
    }
  }
}

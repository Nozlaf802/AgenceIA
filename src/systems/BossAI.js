import Phaser from 'phaser';
import { DEPTH } from '../config.js';

// Comportements des mini-boss et du boss. Chaque fonction reçoit la créature
// et renvoie true si elle a fixé la vitesse elle-même (sinon : poursuite normale).
// L'état est rangé dans e.ai, remis à zéro à l'apparition.

// Grand Brumelin : marche vers Lumen, puis toutes les `every` secondes s'arrête,
// trace une traînée grise (télégraphe), et charge en ligne droite.
function charge(e, dt, target, scene) {
  const c = e.def.charge;
  const ai = e.ai;
  ai.t += dt;
  if (ai.phase === 'walk') {
    if (ai.t < c.every) return false;
    ai.phase = 'aim';
    ai.t = 0;
    const a = Math.atan2(target.y - e.y, target.x - e.x);
    ai.dir = { x: Math.cos(a), y: Math.sin(a) };
    scene.hazards.telegraph(e, ai.dir, c.speed * c.dash, e.radius * 1.4, c.aim);
  }
  if (ai.phase === 'aim') {
    e.setVelocity(0, 0);
    // Petit tremblement avant la charge.
    e.x += (Math.random() - 0.5) * 2;
    if (ai.t >= c.aim) { ai.phase = 'dash'; ai.t = 0; }
    return true;
  }
  if (ai.phase === 'dash') {
    e.setVelocity(ai.dir.x * c.speed, ai.dir.y * c.speed);
    e.setFlipX(ai.dir.x < 0);
    if (ai.t >= c.dash) { ai.phase = 'walk'; ai.t = 0; }
    return true;
  }
  return false;
}

// La Tisseuse : garde ses distances, invoque des Filasses et tend des fils
// de brume qui ralentissent Lumen.
function weaver(e, dt, target, scene) {
  const w = e.def.weaver;
  const ai = e.ai;
  ai.summon = (ai.summon ?? 1.5) - dt;
  ai.thread = (ai.thread ?? 3) - dt;
  if (ai.summon <= 0) {
    ai.summon = w.summonEvery;
    if (scene.enemies.countActive(true) < 190) {
      for (let i = 0; i < w.summonCount; i++) {
        const a = (i / w.summonCount) * Math.PI * 2;
        const x = e.x + Math.cos(a) * (e.radius + 20), y = e.y + Math.sin(a) * (e.radius + 20);
        if (!scene.level?.isBlockedAt(x, y)) scene.spawner.spawn(w.summonId, x, y);
      }
      scene.juice.impact(e.x, e.y, 'fx-dissipation', 2);
    }
  }
  if (ai.thread <= 0) {
    ai.thread = w.threadEvery;
    const base = Math.atan2(target.y - e.y, target.x - e.x);
    for (let i = 0; i < w.threads; i++) {
      const a = base + (i - (w.threads - 1) / 2) * 0.35;
      scene.hazards.thread(e.x, e.y, a, 700, w.threadLife, w.threadWarn, w.threadSlow);
    }
  }
  // Déplacement : approche jusqu'à keepDist, puis tourne autour de Lumen.
  const dx = target.x - e.x, dy = target.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  if (d > w.keepDist + 80) return false; // loin : poursuite normale (champ de flux)
  const away = d < w.keepDist - 40 ? -0.7 : 0;
  const vx = (-dy / d) * e.speed + (dx / d) * e.speed * away;
  const vy = (dx / d) * e.speed + (dy / d) * e.speed * away;
  e.setVelocity(vx, vy);
  e.setFlipX(dx < 0);
  return true;
}

export const BOSS_AI = { charge, weaver };

// Dangers au sol : télégraphes de charge (traînée grise) et fils de brume.
export class Hazards {
  constructor(scene) {
    this.scene = scene;
    this.g = scene.add.graphics().setDepth(DEPTH.pickup + 0.5);
    this.lines = [];
  }

  telegraph(e, dir, length, width, life) {
    this.lines.push({ kind: 'tele', e, dir, length, width, life, max: life });
  }

  thread(x, y, a, length, life, warn, slow) {
    this.lines.push({
      kind: 'thread', x1: x, y1: y, x2: x + Math.cos(a) * length, y2: y + Math.sin(a) * length,
      life: life + warn, warn, slow, age: 0,
    });
  }

  clear() {
    this.lines = [];
    this.g.clear();
  }

  // Renvoie le facteur de vitesse de Lumen (1 = normal).
  update(dt) {
    const g = this.g;
    const p = this.scene.player;
    let slow = 1;
    g.clear();
    for (const l of this.lines) {
      l.life -= dt;
      if (l.life <= 0) continue;
      if (l.kind === 'tele') {
        if (!l.e.active) { l.life = 0; continue; }
        const k = 1 - l.life / l.max; // se remplit pendant la visée
        const x2 = l.e.x + l.dir.x * l.length, y2 = l.e.y + l.dir.y * l.length;
        g.lineStyle(l.width * 2, 0x9a9cb8, 0.18).lineBetween(l.e.x, l.e.y, x2, y2);
        g.lineStyle(l.width * 2 * k, 0xc9cbe6, 0.28).lineBetween(l.e.x, l.e.y, x2, y2);
      } else {
        l.age += dt;
        const armed = l.age >= l.warn;
        const fade = Math.min(1, l.life / 0.5);
        const alpha = (armed ? 0.75 : 0.25 + 0.2 * Math.sin(l.age * 30)) * fade;
        g.lineStyle(armed ? 3 : 2, 0xd9c8ff, alpha).lineBetween(l.x1, l.y1, l.x2, l.y2);
        if (armed) g.lineStyle(9, 0xb98cff, 0.15 * fade).lineBetween(l.x1, l.y1, l.x2, l.y2);
        if (armed && distToSegment(p.x, p.y, l) < 14 + p.radius * 0.5) slow = Math.min(slow, 1 - l.slow);
      }
    }
    this.lines = this.lines.filter((l) => l.life > 0);
    return slow;
  }
}

function distToSegment(px, py, l) {
  const vx = l.x2 - l.x1, vy = l.y2 - l.y1;
  const t = Phaser.Math.Clamp(((px - l.x1) * vx + (py - l.y1) * vy) / (vx * vx + vy * vy), 0, 1);
  return Math.hypot(px - (l.x1 + vx * t), py - (l.y1 + vy * t));
}

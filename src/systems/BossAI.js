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

// La Marée : avance lentement, lance des vagues qui balaient l'arène (avec un trou
// pour passer), et invoque des Brumelins en changeant de phase.
function tide(e, dt, target, scene) {
  const T = e.def.tide;
  const ai = e.ai;
  const ratio = e.hp / e.maxHp;
  let phase = 0;
  T.phases.forEach((ph, i) => { if (ratio <= ph.at) phase = i; });
  if (ai.phase === 'walk') { ai.phase = 0; ai.wave = 2.5; }
  if (phase > ai.phase) {
    ai.phase = phase;
    ai.wave = Math.min(ai.wave, 1.5);
    scene.events.emit('toast', `ui.boss.phase${phase + 1}`);
    scene.cameras.main.shake(400, 0.01);
    const n = T.phases[phase].summon;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = target.x + Math.cos(a) * 320, y = target.y + Math.sin(a) * 320;
      const r = scene.arena;
      if (r && !r.contains(x, y)) continue;
      if (!scene.level?.isBlockedAt(x, y)) scene.spawner.spawn(T.summonId, x, y);
    }
  }
  const ph = T.phases[ai.phase];
  e.speed = e.def.speed * ph.speedMult;
  ai.wave -= dt;
  if (ai.wave <= 0) {
    ai.wave = ph.every;
    // Une ou deux vagues : horizontale et/ou verticale, le trou est près de Lumen
    // mais jamais pile dessus, pour qu'il faille bouger.
    const axes = ph.waves > 1 ? ['x', 'y'] : [Math.random() < 0.5 ? 'x' : 'y'];
    axes.forEach((axis) => scene.hazards.wave(axis, target, T.wave));
  }
  return false; // déplacement : poursuite normale
}

export const BOSS_AI = { charge, weaver, tide };

// Dangers au sol : télégraphes de charge (traînée grise) et fils de brume.
export class Hazards {
  constructor(scene) {
    this.scene = scene;
    this.g = scene.add.graphics().setDepth(DEPTH.pickup + 0.5);
    // Les vagues restent visibles dans le noir (au-dessus de l'obscurité).
    this.top = scene.add.graphics().setDepth(DEPTH.glow - 1);
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

  // Vague qui traverse toute la zone (arène, sinon l'écran) le long d'un axe.
  // axis 'x' : front vertical qui se déplace horizontalement.
  wave(axis, target, w) {
    const area = Phaser.Geom.Rectangle.Clone(this.scene.arena || this.scene.cameras.main.worldView);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const span = axis === 'x' ? area.height : area.width;
    const along = axis === 'x' ? target.y - area.y : target.x - area.x;
    // Trou décalé de 150 à 300 px par rapport à Lumen.
    let gap = along + (Math.random() < 0.5 ? -1 : 1) * Phaser.Math.Between(150, 300);
    gap = Phaser.Math.Clamp(gap, w.gap / 2, span - w.gap / 2);
    const start = axis === 'x' ? (dir > 0 ? area.x : area.right) : (dir > 0 ? area.y : area.bottom);
    const end = axis === 'x' ? (dir > 0 ? area.right : area.x) : (dir > 0 ? area.bottom : area.y);
    this.lines.push({
      kind: 'wave', axis, dir, area, pos: start, end, gap, w, warn: w.warn, age: 0,
      life: w.warn + Math.abs(end - start) / w.speed,
    });
  }

  clear() {
    this.lines = [];
    this.g.clear();
    this.top.clear();
  }

  // Renvoie le facteur de vitesse de Lumen (1 = normal).
  update(dt) {
    const g = this.g;
    const p = this.scene.player;
    let slow = 1;
    g.clear();
    this.top.clear();
    for (const l of this.lines) {
      l.life -= dt;
      if (l.life <= 0) continue;
      if (l.kind === 'wave') {
        this.drawWave(this.top, l, p, dt);
      } else if (l.kind === 'tele') {
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

Hazards.prototype.drawWave = function drawWave(g, l, p, dt) {
  const { area, axis, w } = l;
  l.age += dt;
  const g0 = l.gap - w.gap / 2, g1 = l.gap + w.gap / 2;
  // Dessine un segment de front (en coordonnées « le long » de l'axe : a0..a1).
  const band = (pos, a0, a1, thick, color, alpha) => {
    if (a1 <= a0) return;
    g.fillStyle(color, alpha);
    if (axis === 'x') g.fillRect(pos - thick / 2, area.y + a0, thick, a1 - a0);
    else g.fillRect(area.x + a0, pos - thick / 2, a1 - a0, thick);
  };
  const span = axis === 'x' ? area.height : area.width;
  if (l.age < l.warn) {
    // Annonce : le bord de départ clignote, le trou est marqué en clair.
    const blink = 0.25 + 0.25 * Math.sin(l.age * 25);
    band(l.pos, 0, g0, 18, 0x5ee8ff, blink);
    band(l.pos, g1, span, 18, 0x5ee8ff, blink);
    return;
  }
  l.pos += l.dir * w.speed * dt;
  band(l.pos - l.dir * w.width * 0.6, 0, g0, w.width * 1.6, 0x3a3f6b, 0.35);
  band(l.pos - l.dir * w.width * 0.6, g1, span, w.width * 1.6, 0x3a3f6b, 0.35);
  band(l.pos, 0, g0, w.width, 0x9fdcff, 0.55);
  band(l.pos, g1, span, w.width, 0x9fdcff, 0.55);
  band(l.pos + l.dir * w.width * 0.4, 0, g0, 6, 0xe8ecff, 0.9);
  band(l.pos + l.dir * w.width * 0.4, g1, span, 6, 0xe8ecff, 0.9);
  // Touché si Lumen est dans le front et hors du trou.
  const pp = axis === 'x' ? p.x : p.y;
  const pa = axis === 'x' ? p.y - area.y : p.x - area.x;
  if (Math.abs(pp - l.pos) < w.width / 2 + p.radius * 0.5 && (pa < g0 || pa > g1)) {
    if (p.hurt(w.dmg)) {
      this.scene.cameras.main.shake(120, 0.008);
      this.scene.juice.number(p.x, p.y - 20, w.dmg, '#ff6b6b');
    }
  }
};

function distToSegment(px, py, l) {
  const vx = l.x2 - l.x1, vy = l.y2 - l.y1;
  const t = Phaser.Math.Clamp(((px - l.x1) * vx + (py - l.y1) * vy) / (vx * vx + vy * vy), 0, 1);
  return Math.hypot(px - (l.x1 + vx * t), py - (l.y1 + vy * t));
}

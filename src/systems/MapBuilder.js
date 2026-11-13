import Phaser from 'phaser';
import { ASSETS } from '../data/assets.js';
import { DEPTH } from '../config.js';

// Construit une carte Tiled (export JSON, jeu de tuiles intégré).
// Conventions reconnues (voir public/assets/README.md) :
//  - collisions : propriété de tuile « collides » (dans le jeu de tuiles) OU
//    propriété de calque « collides » (tout le calque bloque) ;
//  - calque au-dessus des personnages : propriété « depth » (nombre) ou « above » ;
//  - départ : objet de type « player_start » ou nommé « joueur » ;
//  - points d'apparition : objets de type « spawn » ;
//  - lucioles : rectangles de type « firefly_zone » (propriété « poids »).
const props = (o) => Object.fromEntries((o?.properties || []).map((p) => [p.name, p.value]));
const typeOf = (o) => o.type || o.class || '';

export function buildMap(scene, mapKey) {
  const def = ASSETS.maps[mapKey];
  if (!def || !scene.cache.tilemap.exists(`map-${mapKey}`)) return null;

  const map = scene.make.tilemap({ key: `map-${mapKey}` });
  const tilesets = def.tilesets.map((ts) => map.addTilesetImage(ts.name, ts.key)).filter(Boolean);

  const walls = [];
  const layers = [];
  map.layers.forEach((ld) => {
    if (ld.visible === false) return; // calque caché (repli) : ni affiché ni bloquant
    const p = props(ld);
    const layer = map.createLayer(ld.name, tilesets, 0, 0);
    if (!layer) return;
    layers.push(layer);
    // « depth » ou « above » : au-dessus des personnages (triés par y), sous l'obscurité.
    layer.setDepth(typeof p.depth === 'number' || p.above ? DEPTH.above : DEPTH.ground + 1);
    if (p.collides) layer.setCollisionByExclusion([-1]);
    else layer.setCollisionByProperty({ collides: true });
    walls.push(layer);
  });

  const objects = map.objects.flatMap((ol) => ol.objects);

  // Décors du DA posés en objets image (type « prop », propriété « key » = clé du manifest).
  // Triés par y comme les personnages (propriété « depth »).
  const propImages = [];
  objects.filter((o) => typeOf(o) === 'prop').forEach((o) => {
    const p = props(o);
    if (!p.key || !scene.textures.exists(p.key)) return;
    const img = scene.add.image(o.x, o.y, p.key);
    img.propKey = p.key;
    propImages.push(img);
    img
      .setOrigin(p.originX ?? 0.5, p.originY ?? 1)
      .setAngle(p.angle ?? 0)
      .setScale(p.scale ?? 1)
      .setFlipX(!!p.flipX)
      .setDepth(p.depth ?? o.y);
  });
  const startObj = objects.find((o) => typeOf(o) === 'player_start')
    || objects.find((o) => (o.name || '').toLowerCase() === 'joueur');
  const start = startObj ? { x: startObj.x, y: startObj.y } : { x: map.widthInPixels / 2, y: map.heightInPixels / 2 };

  const spawns = objects.filter((o) => typeOf(o) === 'spawn').map((o) => ({ x: o.x, y: o.y }));
  const fireflyZones = objects.filter((o) => typeOf(o) === 'firefly_zone')
    .map((o) => ({ rect: new Phaser.Geom.Rectangle(o.x, o.y, o.width, o.height), weight: props(o).poids ?? 1 }));

  // Filet de sécurité (#16) : un décor bloquant sans aucune tuile de collision
  // sous lui reçoit des collisions invisibles sur son emprise.
  const solid = new Set(['barque', 'caisse', 'tonneau', 'brasero', 'rocher_grand', 'rocher_petit']);
  const obstacleLayer = layers.find((l) => l.layer.name === 'obstacles') || walls[walls.length - 1];
  const tw = map.tileWidth, th = map.tileHeight;
  propImages.filter((img) => solid.has(img.propKey)).forEach((img) => {
    const b = img.getBounds();
    const pad = Math.min(b.width, b.height) * 0.15;
    const x0 = Math.floor((b.x + pad) / tw), x1 = Math.floor((b.right - pad) / tw);
    const y0 = Math.floor((b.y + pad) / th), y1 = Math.floor((b.bottom - pad) / th);
    const collides = (x, y) => walls.some((l) => l.getTileAt(x, y)?.collides);
    let any = false;
    for (let y = y0; y <= y1 && !any; y++) for (let x = x0; x <= x1; x++) if (collides(x, y)) { any = true; break; }
    if (any || !obstacleLayer) return;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const t = obstacleLayer.putTileAt(53, x, y);
        if (t) { t.setCollision(true, true, true, true); t.setAlpha(0); }
      }
    }
  });

  const level = new Level(map, walls, start, spawns, fireflyZones);
  level.layers = layers;
  level.props = propImages;
  return level;
}

class Level {
  constructor(map, walls, start, spawns, fireflyZones) {
    this.map = map;
    this.walls = walls;
    this.start = start;
    this.spawns = spawns;
    this.fireflyZones = fireflyZones;
    this.bounds = new Phaser.Geom.Rectangle(0, 0, map.widthInPixels, map.heightInPixels);
    this.tw = map.tileWidth;
    this.th = map.tileHeight;
    this.cols = map.width;
    this.rows = map.height;

    // Grille de cases bloquantes (n'importe quel calque).
    const n = this.cols * this.rows;
    this.blocked = new Uint8Array(n);
    walls.forEach((layer) => {
      layer.forEachTile((t) => { if (t.collides) this.blocked[t.y * this.cols + t.x] = 1; });
    });
    this.dist = new Int32Array(n).fill(-1);
    this.queue = new Int32Array(n);
  }

  // Victoire : le phare se rallume (tuile 27 éteinte -> 28 allumée, décor « phare » -> « phare_allume »).
  lightLighthouse(scene) {
    this.layers.forEach((l) => l.replaceByIndex(27, 28));
    this.props.forEach((img) => {
      if (img.propKey === 'phare' && scene.textures.exists('phare_allume')) img.setTexture('phare_allume');
    });
  }

  isBlockedAt(x, y) {
    const cx = Math.floor(x / this.tw), cy = Math.floor(y / this.th);
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return true;
    return this.blocked[cy * this.cols + cx] === 1;
  }

  // Champ de flux : distance (en cases) de chaque case praticable jusqu'à Lumen.
  // Parcours en largeur, recalculé quelques fois par seconde.
  updateFlow(x, y) {
    const { cols, rows, blocked, dist, queue } = this;
    dist.fill(-1);
    const sx = Phaser.Math.Clamp(Math.floor(x / this.tw), 0, cols - 1);
    const sy = Phaser.Math.Clamp(Math.floor(y / this.th), 0, rows - 1);
    let head = 0, tail = 0;
    const s = sy * cols + sx;
    dist[s] = 0;
    queue[tail++] = s;
    while (head < tail) {
      const i = queue[head++];
      const cx = i % cols, cy = (i - cx) / cols;
      const d = dist[i] + 1;
      if (cx > 0) { const j = i - 1; if (dist[j] < 0 && !blocked[j]) { dist[j] = d; queue[tail++] = j; } }
      if (cx < cols - 1) { const j = i + 1; if (dist[j] < 0 && !blocked[j]) { dist[j] = d; queue[tail++] = j; } }
      if (cy > 0) { const j = i - cols; if (dist[j] < 0 && !blocked[j]) { dist[j] = d; queue[tail++] = j; } }
      if (cy < rows - 1) { const j = i + cols; if (dist[j] < 0 && !blocked[j]) { dist[j] = d; queue[tail++] = j; } }
    }
  }

  // Direction à suivre depuis (x, y), ou null pour foncer tout droit.
  flowDir(x, y, out) {
    const { cols, rows, dist } = this;
    const cx = Math.floor(x / this.tw), cy = Math.floor(y / this.th);
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return null;
    const here = dist[cy * cols + cx];
    if (here >= 0 && here <= 1) return null; // tout près : ligne droite
    let best = here < 0 ? Infinity : here, bx = -1, by = -1;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oy) continue;
        const nx = cx + ox, ny = cy + oy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const d = dist[ny * cols + nx];
        if (d < 0 || d >= best) continue;
        // Pas de diagonale qui coupe un coin de mur.
        if (ox && oy && (dist[cy * cols + nx] < 0 || dist[ny * cols + cx] < 0)) continue;
        best = d; bx = nx; by = ny;
      }
    }
    if (bx < 0) return null;
    const tx = (bx + 0.5) * this.tw - x, ty = (by + 0.5) * this.th - y;
    const l = Math.hypot(tx, ty) || 1;
    out.x = tx / l;
    out.y = ty / l;
    return out;
  }

  // Point d'apparition : hors caméra (64 px de marge) et à moins de maxDist de Lumen.
  // La distance max suit la taille de la caméra (issue #11 : grands écrans).
  pickSpawn(view, px, py, maxDist = Math.max(1100, Math.hypot(view.width, view.height) / 2 + 300)) {
    const out = new Phaser.Geom.Rectangle(view.x - 64, view.y - 64, view.width + 128, view.height + 128);
    const off = this.spawns.filter((s) => !out.contains(s.x, s.y));
    if (!off.length) return null;
    const near = off.filter((s) => Phaser.Math.Distance.Between(s.x, s.y, px, py) < maxDist);
    if (near.length) return Phaser.Utils.Array.GetRandom(near);
    return off.reduce((a, b) => (Phaser.Math.Distance.Between(a.x, a.y, px, py) <= Phaser.Math.Distance.Between(b.x, b.y, px, py) ? a : b));
  }

  // Position praticable dans une zone de lucioles, entre minD et maxD de Lumen.
  pickFirefly(px, py, minD = 300, maxD = 600) {
    if (!this.fireflyZones.length) return null;
    const total = this.fireflyZones.reduce((s, z) => s + z.weight, 0);
    for (let attempt = 0; attempt < 30; attempt++) {
      let r = Math.random() * total;
      const zone = this.fireflyZones.find((z) => (r -= z.weight) <= 0) || this.fireflyZones[0];
      const p = zone.rect.getRandomPoint();
      const d = Phaser.Math.Distance.Between(p.x, p.y, px, py);
      if (d >= minD && d <= maxD && !this.isBlockedAt(p.x, p.y)) return p;
    }
    return null;
  }
}

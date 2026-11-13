import Phaser from 'phaser';
import { ASSETS } from '../data/assets.js';

// Construit une carte Tiled (export JSON). Conventions (voir public/assets/README.md) :
//  - calques de tuiles dessinés dans l'ordre de Tiled ;
//  - propriété personnalisée  collides = true  sur un calque → murs (bloquent tout le monde) ;
//  - propriété personnalisée  above = true  → calque dessiné au-dessus des personnages ;
//  - calque d'objets avec un point nommé « joueur » → départ de Lumen.
export function buildMap(scene, mapKey) {
  const def = ASSETS.maps[mapKey];
  if (!def || !scene.cache.tilemap.exists(`map-${mapKey}`)) return null;

  const map = scene.make.tilemap({ key: `map-${mapKey}` });
  const tilesets = def.tilesets
    .map((ts) => map.addTilesetImage(ts.name, ts.key))
    .filter(Boolean);

  const walls = [];
  map.layers.forEach((ld) => {
    const props = Object.fromEntries((ld.properties || []).map((p) => [p.name, p.value]));
    const layer = map.createLayer(ld.name, tilesets, 0, 0);
    if (!layer) return;
    layer.setDepth(props.above ? 20 : -5);
    if (props.collides) {
      layer.setCollisionByExclusion([-1]);
      walls.push(layer);
    }
  });

  let start = { x: map.widthInPixels / 2, y: map.heightInPixels / 2 };
  map.objects.forEach((ol) => {
    const o = ol.objects.find((ob) => (ob.name || '').toLowerCase() === 'joueur');
    if (o) start = { x: o.x, y: o.y };
  });

  const bounds = new Phaser.Geom.Rectangle(0, 0, map.widthInPixels, map.heightInPixels);
  return { map, walls, start, bounds };
}

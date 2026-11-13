import { ASSETS } from '../data/assets.js';

// Cercle de collision centré, quelle que soit la taille du visuel.
export function fitCircle(sprite, radius) {
  const r = ASSETS.spritesheets[sprite.texture.key]?.bodyRadius ?? radius;
  sprite.body.setCircle(r, sprite.width / 2 - r, sprite.height / 2 - r);
}

// Joue « <clé>-walk » ou « <clé>-idle » si ces animations existent.
export function animate(sprite, moving) {
  const key = `${sprite.texture.key}-${moving ? 'walk' : 'idle'}`;
  if (sprite.anims && sprite.scene.anims.exists(key)) sprite.anims.play(key, true);
}

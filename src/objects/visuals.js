import Phaser from 'phaser';
import { ASSETS } from '../data/assets.js';

// Donne à un sprite son visuel (feuille du DA si chargée, sinon forme provisoire)
// et un cercle de collision centré de rayon `radius` (en pixels du monde).
export function applyVisual(sprite, key, radius) {
  const v = ASSETS.visuals[key];
  const art = v && sprite.scene.textures.exists(v.sheet);
  sprite.setTexture(art ? v.sheet : key, 0);
  sprite.setScale(art ? v.scale : 1);
  sprite.visualKey = key;
  sprite.hasArt = art;
  if (sprite.body && radius) {
    const r = radius / sprite.scaleX;
    sprite.body.setCircle(r, sprite.width / 2 - r, sprite.height / 2 - r);
  }
  animate(sprite, false);
}

// Joue « <élément>-walk », « -idle » ou « -loop » si l'animation existe.
export function animate(sprite, moving) {
  if (!sprite.anims || !sprite.visualKey) return;
  const a = sprite.scene.anims;
  const k = sprite.visualKey;
  const key = [moving ? `${k}-walk` : `${k}-idle`, `${k}-loop`, `${k}-walk`].find((n) => a.exists(n));
  if (key) sprite.anims.play(key, true);
}

// Flash de couleur pleine (coup reçu / donné), compatible Phaser 4.
export function flash(sprite, color, ms = 60) {
  sprite.setTint(color);
  if (sprite.setTintMode && Phaser.TintModes) sprite.setTintMode(Phaser.TintModes.FILL);
  sprite.scene.time.delayedCall(ms, () => {
    if (!sprite.active) return;
    sprite.clearTint();
    if (sprite.setTintMode && Phaser.TintModes) sprite.setTintMode(Phaser.TintModes.MULTIPLY);
  });
}

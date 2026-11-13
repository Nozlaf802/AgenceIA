// Réglages globaux du jeu. Les valeurs de gameplay seront ajustées
// d'après le GDD (Game designer) et la charte visuelle (Directeur artistique).
export const WORLD = {
  width: 4000,
  height: 4000,
  tileSize: 64,
};

export const PLAYER = {
  speed: 220, // pixels par seconde
  radius: 18,
  maxHp: 100,
};

export const COLORS = {
  background: 0x14161f,
  groundA: 0x1d2130,
  groundB: 0x222738,
  border: 0x3a4160,
  player: 0x5ad1ff,
  playerOutline: 0xffffff,
  joystickBase: 0xffffff,
  joystickKnob: 0x5ad1ff,
};

// Lanterne de Lumen : le rayon de lumière dépend de la charge (0..1).
export const LANTERN = {
  maxRadius: 260,
  minRadius: 90,
  drainPerSecond: 0, // 0 pour le socle ; réglé plus tard d'après le GDD
  flicker: 4, // amplitude du vacillement en pixels
  darkness: 0x05060c,
  darknessAlpha: 0.93,
  glow: 0xffc96b,
};

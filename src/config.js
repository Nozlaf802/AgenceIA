// Réglages techniques et couleurs provisoires (en attendant la charte visuelle).
// Les valeurs de gameplay sont dans src/data/balance.js.
export const VIEW = {
  // Surface de référence (doc Level design : 1280×720). La caméra zoome pour
  // que chaque écran voie à peu près la même surface de jeu.
  refWidth: 1280,
  refHeight: 720,
  minZoom: 0.6,
  maxZoom: 1.25,
  tileSize: 64,
};

export const COLORS = {
  background: 0x14161f,
  groundA: 0x1d2130,
  groundB: 0x222738,
  player: 0x5ad1ff,
  playerOutline: 0xffffff,
  joystickBase: 0xffffff,
  joystickKnob: 0x5ad1ff,
  darkness: 0x05060c,
  darknessAlpha: 0.93,
  bolt: 0xffe08a,
  orb: 0xff7a3d,
  lueur: 0xffd36b,
  oil: 0x7cf0c5,
  eyes: 0xfff4c2,
  hp: 0xe8505b,
  light: 0xffc96b,
  xp: 0x7fd6ff,
};

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

// Palette « Phare Vectoriel » du Directeur artistique (public/assets/manifest.json).
export const COLORS = {
  background: 0x070912, // nuit
  surface: 0x10142a,
  groundA: 0x10142a,
  groundB: 0x141a33,
  player: 0x5ad1ff,
  playerOutline: 0xffffff,
  joystickBase: 0xe8ecff,
  joystickKnob: 0xffd97a,
  darkness: 0x070912,
  darknessAlpha: 0.94,
  bolt: 0xffd97a,
  orb: 0xff5a36,
  lueur: 0xffd97a,
  oil: 0x5ee8ff,
  eyes: 0xfff1c2,
  hp: 0xff5a36,
  light: 0xffd97a,
  xp: 0x5ee8ff,
  frost: 0x5ee8ff,
  lightning: 0xb98cff,
  text: 0xe8ecff,
};

export const FONTS = {
  title: '"Chakra Petch", system-ui, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, monospace',
};

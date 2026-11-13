// Armes et passifs (5 niveaux chacun). Source : GDD v0.1, section 5.
// 4 armes (Lanterne, Flamme orbitale, Givre, Foudre) et les 6 passifs.

export const MAX_WEAPONS = 4;
export const MAX_PASSIVES = 4;

export const WEAPONS = {
  lantern: {
    name: 'Lanterne',
    desc: ['Tire un rayon vers la créature la plus proche.', '+30 % dégâts', '+1 rayon', '+30 % dégâts, tir plus rapide', '+1 rayon, tir plus rapide'],
    levels: [
      { dmg: 10, cd: 0.8, count: 1 },
      { dmg: 13, cd: 0.75, count: 1 },
      { dmg: 13, cd: 0.7, count: 2 },
      { dmg: 17, cd: 0.62, count: 2 },
      { dmg: 20, cd: 0.52, count: 3 },
    ],
  },
  orbit: {
    name: 'Flamme orbitale',
    desc: ['Une boule de feu tourne autour de toi.', '+1 boule de feu', '+35 % dégâts', '+1 boule de feu', '+35 % dégâts, plus grande et plus rapide'],
    levels: [
      { dmg: 8, count: 1, radius: 70, speed: 3 },
      { dmg: 8, count: 2, radius: 70, speed: 3 },
      { dmg: 11, count: 2, radius: 72, speed: 3.2 },
      { dmg: 11, count: 3, radius: 75, speed: 3.2 },
      { dmg: 15, count: 3, radius: 88, speed: 3.7 },
    ],
  },
  // Givre : éclat qui ralentit. Au bout de `freezeHits` coups, la créature gèle
  // (immobile, ne blesse plus) pendant `freeze` secondes.
  frost: {
    name: 'Givre',
    desc: ['Un éclat de givre ralentit, puis gèle les créatures.', '+1 éclat', 'Traverse 1 créature de plus, gèle en 2 coups', '+1 éclat, +30 % dégâts', 'Gel plus long, tir plus rapide'],
    levels: [
      { dmg: 7, cd: 1.3, count: 1, pierce: 1, slow: 0.45, slowDur: 2, freezeHits: 3, freeze: 1.2 },
      { dmg: 7, cd: 1.3, count: 2, pierce: 1, slow: 0.45, slowDur: 2, freezeHits: 3, freeze: 1.2 },
      { dmg: 7, cd: 1.25, count: 2, pierce: 2, slow: 0.45, slowDur: 2.2, freezeHits: 2, freeze: 1.6 },
      { dmg: 9, cd: 1.2, count: 3, pierce: 2, slow: 0.5, slowDur: 2.2, freezeHits: 2, freeze: 1.6 },
      { dmg: 9, cd: 1.0, count: 3, pierce: 3, slow: 0.5, slowDur: 2.5, freezeHits: 2, freeze: 2 },
    ],
  },
  // Foudre : frappe des créatures au hasard à l'écran, puis rebondit sur les voisines.
  lightning: {
    name: 'Foudre',
    desc: ['La foudre frappe une créature au hasard et rebondit.', '+1 rebond', '+1 éclair', '+35 % dégâts, +1 rebond', '+1 éclair, frappe plus souvent'],
    levels: [
      { dmg: 16, cd: 1.8, count: 1, bounces: 2, range: 150 },
      { dmg: 16, cd: 1.8, count: 1, bounces: 3, range: 150 },
      { dmg: 16, cd: 1.7, count: 2, bounces: 3, range: 160 },
      { dmg: 22, cd: 1.6, count: 2, bounces: 4, range: 170 },
      { dmg: 22, cd: 1.3, count: 3, bounces: 4, range: 180 },
    ],
  },
};

// Chaque niveau applique son effet une fois (cumulatif).
export const PASSIVES = {
  verre: { name: 'Verre poli', desc: '+10 % dégâts de toutes les armes', apply: (s) => { s.dmgMult += 0.1; } },
  bottes: { name: 'Bottes de brume', desc: '+8 % vitesse de déplacement', apply: (s) => { s.speedMult += 0.08; } },
  aimant: { name: 'Aimant à étincelles', desc: '+30 % rayon de ramassage', apply: (s) => { s.magnetMult += 0.3; } },
  coque: { name: 'Coque de phare', desc: '+15 PV max, petite régénération', apply: (s, p) => { s.maxHpBonus += 15; s.regen += 0.3; p.heal(15); } },
  meche: { name: 'Mèche longue', desc: 'La Lumière baisse 12 % moins vite', apply: (s) => { s.drainMult -= 0.12; } },
  huile: { name: 'Huile rapide', desc: '-8 % temps de recharge des armes', apply: (s) => { s.cooldownMult -= 0.08; } },
};

export const FALLBACKS = {
  soin: { name: 'Soin', desc: 'Rend 30 PV' },
  recharge: { name: 'Recharge de Lumière', desc: '+40 Lumière' },
};

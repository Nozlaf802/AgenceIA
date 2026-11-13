// Bestiaire (stats au multiplicateur 1,00). Source : doc « Niveaux & histoire ».
// lueurs = valeur d'XP lâchée. Les fractions s'accumulent : 1,5 donne 1 puis 2, en alternance.
export const ENEMIES = {
  E01: { name: 'Brumelin', hp: 10, dmg: 5, speed: 85, lueurs: 1.5, radius: 14, color: 0x6b5a8e },
  E02: { name: 'Filasse', hp: 6, dmg: 4, speed: 165, lueurs: 1.5, radius: 9, color: 0x8b86ad, zigzag: true },
  E03: { name: 'Bruine', hp: 3, dmg: 2, speed: 150, lueurs: 0.75, radius: 7, color: 0x7d6fa3 },
  E04: { name: 'Chape', hp: 60, dmg: 12, speed: 62, lueurs: 8, radius: 26, color: 0x4a4562 },

  // Mini-boss (doc « Niveaux & histoire », section 3). PV fixes, non multipliés par la minute.
  // ai : comportement spécial (src/systems/BossAI.js). freezeMult : le gel dure moins longtemps.
  MB1: {
    name: 'Grand Brumelin', hp: 400, dmg: 14, speed: 72, lueurs: 30, radius: 44, color: 0x5a4f80,
    boss: true, ai: 'charge', fixedHp: true, freezeMult: 0.25, tint: 0xb9b4ff,
    charge: { every: 5, aim: 0.9, dash: 0.55, speed: 560, length: 300 },
  },
  MB2: {
    name: 'La Tisseuse', hp: 900, dmg: 12, speed: 60, lueurs: 50, radius: 40, color: 0x6e4f8a,
    boss: true, ai: 'weaver', fixedHp: true, freezeMult: 0.25, tint: 0xd9a8ff,
    weaver: { keepDist: 220, summonEvery: 4, summonCount: 6, summonId: 'E02', threadEvery: 6, threads: 3, threadLife: 5, threadWarn: 0.7, threadSlow: 0.45 },
  },
};

export const FALLBACK_ENEMY = 'E01';

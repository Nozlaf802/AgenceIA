// Bestiaire (stats au multiplicateur 1,00). Source : doc « Niveaux & histoire ».
// lueurs = valeur d'XP lâchée (0,5 = une chance sur deux).
export const ENEMIES = {
  E01: { name: 'Brumelin', hp: 10, dmg: 5, speed: 70, lueurs: 1, radius: 14, color: 0x6b5a8e },
  E02: { name: 'Filasse', hp: 6, dmg: 4, speed: 140, lueurs: 1, radius: 9, color: 0x8b86ad, zigzag: true },
  E03: { name: 'Bruine', hp: 3, dmg: 2, speed: 110, lueurs: 0.5, radius: 7, color: 0x7d6fa3 },
  E04: { name: 'Chape', hp: 60, dmg: 12, speed: 45, lueurs: 5, radius: 26, color: 0x4a4562 },
};

export const FALLBACK_ENEMY = 'E01';

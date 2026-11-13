// TOUTES les valeurs d'équilibrage du jeu sont ici, pour ajuster vite
// sans toucher au reste du code. Sources : GDD v0.1 et doc « Niveaux & histoire ».

export const BALANCE = {
  run: {
    durationSec: 600, // 10 minutes
  },

  player: {
    speed: 200, // px/s
    maxHp: 100,
    magnet: 70, // rayon de ramassage des Lueurs (px)
    iframes: 0.45, // invulnérabilité après un coup (s)
    radius: 16,
  },

  // Jauge Lumière 0..100. Rayon visible = radiusMin + radiusPerPoint × Lumière.
  light: {
    max: 100,
    start: 100,
    drainPerSec: 1.3,
    perLueur: 0.15, // Lumière rendue par point de Lueur ramassé
    oil: 40, // Bidon d'huile
    oilChance: 0.01, // probabilité par créature tuée
    radiusMin: 180,
    radiusPerPoint: 2.2,
    darkDmgPerSec: 2, // PV perdus par seconde à 0 Lumière
    auraTick: 0.5, // la lumière blesse les créatures dedans toutes les X s
    auraDmgMin: 1, // dégâts par tick à 0 Lumière
    auraDmgMax: 3, // dégâts par tick à 100 Lumière
    flicker: 4,
    firefly: 10, // Lumière rendue par une luciole au sol
    fireflyEverySec: 10, // une luciole apparaît toutes les X s (si la carte a des zones)
    fireflyMax: 6,
  },

  // XP pour passer au niveau n+1 : ceil(base + linear×(n−1) + quad×(n−1)²)
  // Repères : niv. 2 = 5, niv. 11 = 57, niv. 21 = 171, niv. 28 = 286 (équilibrage v1 du Game designer).
  xpCurve: { base: 5, linear: 3, quad: 0.3 },
  xpToNext(n) {
    const c = this.xpCurve;
    return Math.ceil(c.base + c.linear * (n - 1) + c.quad * (n - 1) ** 2);
  },
  xpPerLueur: 1,
  maxLueursOnGround: 150, // au-delà, les nouvelles fusionnent dans une grosse Lueur

  difficulty: {
    hpPerMinute: 0.22,
    dmgPerMinute: 0.15,
    maxAliveCap: 200, // plafond perf navigateur
  },

  // Script de vagues du chapitre 1 (une ligne par minute).
  // Les créatures pas encore codées sont remplacées par E01.
  minutes: [
    { spawnPerSec: 1.0, maxAlive: 40, mix: { E01: 1 },
      events: [{ at: 1, type: 'text', key: 'ui.tuto.move' }] },
    { spawnPerSec: 1.8, maxAlive: 60, mix: { E01: 0.7, E02: 0.3 },
      events: [{ at: 50, type: 'ring', enemy: 'E01', count: 16 }] }, // anneau à 1:50
    { spawnPerSec: 2.4, maxAlive: 90, mix: { E01: 0.5, E02: 0.3, E03: 0.2 },
      events: [{ at: 20, type: 'swarm', enemy: 'E03', count: 25, from: 'bottom' },
               { at: 20, type: 'swarm', enemy: 'E03', count: 25, from: 'top' },
               { at: 45, type: 'ring', enemy: 'E01', count: 28 }] },
    { spawnPerSec: 2.2, maxAlive: 80, mix: { E01: 0.6, E02: 0.4 },
      events: [{ at: 30, type: 'ring', enemy: 'E02', count: 30 }] },
    { spawnPerSec: 3.5, maxAlive: 130, mix: { E01: 0.4, E02: 0.2, E04: 0.2, E05: 0.2 },
      events: [{ at: 30, type: 'text', key: 'ui.tuto.light' }, { at: 0, type: 'ring', enemy: 'E01', count: 28 }] }, // v1.2 : 36 -> 28 (QA #12)
    { spawnPerSec: 4.5, maxAlive: 170, mix: { E01: 0.3, E03: 0.25, E05: 0.2, E06: 0.25 },
      events: [{ at: 0, type: 'ring', enemy: 'E01', count: 36 }, { at: 30, type: 'ring', enemy: 'E04', count: 10 }] }, // v1.2 : 48 -> 36 (QA #12)
    { spawnPerSec: 3.6, maxAlive: 140, mix: { E01: 0.5, E02: 0.5 },
      events: [{ at: 20, type: 'ring', enemy: 'E02', count: 40 }] },
    { spawnPerSec: 4.5, maxAlive: 180, mix: { E01: 0.25, E04: 0.2, E07: 0.2, E08: 0.35 },
      events: [{ at: 0, type: 'ring', enemy: 'E01', count: 40 }, { at: 40, type: 'ring', enemy: 'E04', count: 10 }] },
    { spawnPerSec: 5.5, maxAlive: 220, mix: { E01: 0.2, E02: 0.2, E03: 0.3, E04: 0.3 },
      events: [
        { at: 0, type: 'swarm', enemy: 'E03', count: 30, from: 'left' },
        { at: 0, type: 'swarm', enemy: 'E03', count: 30, from: 'right' },
        { at: 30, type: 'ring', enemy: 'E01', count: 48 },
      ] },
    // Minute 9 : le boss arrivera ici. En attendant, une dernière vague plus calme.
    { spawnPerSec: 4, maxAlive: 160, mix: { E01: 0.4, E02: 0.3, E04: 0.3 },
      events: [{ at: 0, type: 'text', key: 'ui.warning.final' }, { at: 10, type: 'ring', enemy: 'E04', count: 16 }] },
  ],
};

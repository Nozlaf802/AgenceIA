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
    drainPerSec: 1,
    perLueur: 1, // Lumière rendue par point de Lueur ramassé
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
  // Repères : niv. 2 = 2, niv. 11 = 16, niv. 21 = 36, niv. 28 = 54.
  xpCurve: { base: 2, linear: 1.2, quad: 0.03 },
  xpToNext(n) {
    const c = this.xpCurve;
    return Math.ceil(c.base + c.linear * (n - 1) + c.quad * (n - 1) ** 2);
  },
  xpPerLueur: 1,
  maxLueursOnGround: 150, // au-delà, les nouvelles fusionnent dans une grosse Lueur

  difficulty: {
    hpPerMinute: 0.22,
    dmgPerMinute: 0.09,
    maxAliveCap: 200, // plafond perf navigateur
  },

  // Script de vagues du chapitre 1 (une ligne par minute).
  // Les créatures pas encore codées sont remplacées par E01.
  minutes: [
    { spawnPerSec: 0.8, maxAlive: 30, mix: { E01: 1 },
      events: [{ at: 1, type: 'text', key: 'ui.tuto.move' }] },
    { spawnPerSec: 1.2, maxAlive: 45, mix: { E01: 0.7, E02: 0.3 } },
    { spawnPerSec: 1.7, maxAlive: 65, mix: { E01: 0.5, E02: 0.3, E03: 0.2 },
      events: [{ at: 20, type: 'swarm', enemy: 'E03', count: 25, from: 'bottom' }] },
    { spawnPerSec: 1.4, maxAlive: 55, mix: { E01: 0.6, E02: 0.4 } },
    { spawnPerSec: 2.5, maxAlive: 100, mix: { E01: 0.4, E02: 0.2, E04: 0.2, E05: 0.2 },
      events: [{ at: 30, type: 'text', key: 'ui.tuto.light' }] },
    { spawnPerSec: 3.2, maxAlive: 130, mix: { E01: 0.3, E03: 0.25, E05: 0.2, E06: 0.25 },
      events: [{ at: 0, type: 'ring', enemy: 'E01', count: 40 }] },
    { spawnPerSec: 2.4, maxAlive: 100, mix: { E01: 0.5, E02: 0.5 } },
    { spawnPerSec: 4.2, maxAlive: 180, mix: { E01: 0.25, E04: 0.2, E07: 0.2, E08: 0.35 } },
    { spawnPerSec: 5.5, maxAlive: 240, mix: { E01: 0.2, E02: 0.2, E03: 0.3, E04: 0.3 },
      events: [
        { at: 0, type: 'swarm', enemy: 'E03', count: 25, from: 'left' },
        { at: 0, type: 'swarm', enemy: 'E03', count: 25, from: 'right' },
      ] },
    // Minute 9 : le boss arrivera ici. En attendant, une dernière vague plus calme.
    { spawnPerSec: 2.5, maxAlive: 120, mix: { E01: 0.4, E02: 0.3, E04: 0.3 },
      events: [{ at: 0, type: 'text', key: 'ui.warning.final' }] },
  ],
};

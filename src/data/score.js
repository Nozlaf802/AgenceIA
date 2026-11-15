// Calcul du score de fin de partie. Simple à lire pour le joueur :
// chaque créature, chaque seconde tenue et chaque niveau rapportent des points.
export const SCORE = {
  perKill: 1,
  perSecond: 2,
  perLevel: 25,
  victoryBonus: 500,
};

export function computeScore({ kills, time, level, victory }) {
  return Math.round(
    kills * SCORE.perKill
    + Math.floor(time) * SCORE.perSecond
    + Math.max(0, level - 1) * SCORE.perLevel
    + (victory ? SCORE.victoryBonus : 0),
  );
}

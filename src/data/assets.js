// Visuels du jeu.
//
// Les fichiers du DA sont listés dans public/assets/manifest.json (clé, fichier,
// taille de frame). Ce fichier-ci dit seulement QUEL visuel utiliser pour chaque
// élément du jeu, à quelle échelle, et quelles animations jouer.
// Si un visuel manque, le jeu affiche une forme provisoire générée par code.
import manifest from '../../public/assets/manifest.json';

export { manifest };

export const ASSETS = {
  // Élément du jeu -> feuille du DA + échelle d'affichage.
  visuals: {
    player: { sheet: 'gardien_idle', scale: 0.67 },
    E01: { sheet: 'brumeux', scale: 0.66 }, // Brumelin
    E02: { sheet: 'spectre', scale: 0.5 }, // Filasse (rapide)
    E03: { sheet: 'brumeux', scale: 0.36 }, // Bruine (essaim, petite)
    E04: { sheet: 'rodeur', scale: 0.8 }, // Chape (tank)
    orb: { sheet: 'projectile_feu', scale: 1 },
    lueur: { sheet: 'eclat_lumiere', scale: 0.8 },
  },

  // Animations : « <élément>-idle » au repos, « <élément>-walk » en mouvement,
  // « <élément>-loop » en boucle permanente, « fx-<nom> » pour les effets.
  anims: {
    'player-idle': { sheet: 'gardien_idle', start: 0, end: 3, frameRate: 6 },
    'player-walk': { sheet: 'gardien_marche', start: 0, end: 5, frameRate: 11 },
    'E01-walk': { sheet: 'brumeux', start: 0, end: 3, frameRate: 7 },
    'E02-walk': { sheet: 'spectre', start: 0, end: 3, frameRate: 9 },
    'E03-walk': { sheet: 'brumeux', start: 0, end: 3, frameRate: 10 },
    'E04-walk': { sheet: 'rodeur', start: 0, end: 3, frameRate: 5 },
    'orb-loop': { sheet: 'projectile_feu', start: 0, end: 3, frameRate: 14 },
    'lueur-loop': { sheet: 'eclat_lumiere', start: 0, end: 3, frameRate: 8 },
    'fx-dissipation': { sheet: 'dissipation', start: 0, end: 5, frameRate: 18, repeat: 0 },
    'fx-impact_feu': { sheet: 'impact_feu', start: 0, end: 5, frameRate: 24, repeat: 0 },
  },

  // Icônes de l'interface (clés du manifest).
  icons: {
    hp: 'coeur', light: 'lanterne', kills: 'crane', xp: 'eclat',
    lantern: 'lanterne', orbit: 'flamme_feu', frost: 'flamme_givre', lightning: 'flamme_foudre',
    passive: 'eclat', soin: 'coeur', recharge: 'lanterne',
  },

  // Cartes Tiled (export JSON, jeu de tuiles intégré). Voir public/assets/README.md.
  maps: {
    // Carte du Level designer (source : level-design/falaise-du-phare), tileset du DA.
    falaise: {
      url: 'assets/maps/falaise_du_phare.tmj',
      tilesets: [{ name: 'falaise', key: 'tiles_falaise', url: 'assets/tiles/tileset_falaise.png' }],
    },
    demo: {
      url: 'assets/maps/demo.json',
      tilesets: [{ name: 'demo_tiles', key: 'demo_tiles', url: 'assets/tiles/demo_tiles.png' }],
    },
  },

  // Carte jouée par défaut. null = arène infinie provisoire.
  // Adresse : ?map=demo (petite carte de test) ou ?map=infini (arène infinie).
  defaultMap: 'falaise',
};

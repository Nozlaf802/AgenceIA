// Catalogue des visuels du jeu (fournis par le Directeur artistique).
//
// Tant qu'un visuel n'est pas listé ici, le jeu utilise une forme provisoire
// générée par code avec la même clé. Ajouter un visuel = déposer le fichier
// dans public/assets/ et ajouter une ligne ci-dessous, sans toucher au reste.
//
// Clés utilisées par le jeu :
//   player, E01..E04 (créatures), eyes, bolt, orb, lueur, oil, ground
//
// Animations : pour une spritesheet, on déclare les animations ; le jeu joue
// automatiquement « <clé>-walk » quand l'objet bouge et « <clé>-idle » sinon.

export const ASSETS = {
  images: {
    // ground: 'assets/tiles/ground.png',
  },

  spritesheets: {
    // player: {
    //   url: 'assets/sprites/lumen.png', frameWidth: 48, frameHeight: 48,
    //   anims: {
    //     idle: { start: 0, end: 3, frameRate: 6, repeat: -1 },
    //     walk: { start: 4, end: 11, frameRate: 12, repeat: -1 },
    //   },
    //   bodyRadius: 14, // rayon de collision (px), centré
    // },
  },

  // Cartes Tiled (export JSON). Voir public/assets/README.md.
  maps: {
    demo: {
      url: 'assets/maps/demo.json',
      tilesets: [{ name: 'demo_tiles', key: 'demo_tiles', url: 'assets/tiles/demo_tiles.png' }],
    },
    // Carte du Level designer (source : level-design/falaise-du-phare, regénérée par son script).
    falaise: {
      url: 'assets/maps/falaise_du_phare.tmj',
      tilesets: [{ name: 'falaise', key: 'tiles_falaise', url: 'assets/tiles/tileset_falaise_provisoire.png' }],
    },
  },

  // Carte jouée par défaut. null = arène infinie provisoire.
  // On peut forcer une carte avec l'adresse ?map=demo, ou ?map=infini pour l'arène infinie.
  defaultMap: 'falaise',
};

# Carte « Falaise du Phare » (MVP)

Carte unique du MVP de **Lumen, le dernier phare**. Elle est conçue pour Phaser 3 et l'éditeur Tiled.

![Plan](apercu_falaise_du_phare.png)

## Fichiers

| Fichier | Rôle |
|---|---|
| `falaise_du_phare.tmj` | La carte Tiled (JSON). Le tileset est intégré, parce que Phaser 3 ne lit pas les tilesets externes |
| `tileset_falaise_provisoire.png` | Tileset **provisoire** (couleurs unies, tuiles de 32 px). Le DA le remplace par le sien |
| `apercu_falaise_du_phare.png` | Plan annoté |
| `tools/generer_carte.py` | Générateur (Python + Pillow + numpy). Pour modifier la carte, on édite le script et on le relance. Le résultat est toujours le même |

## Dimensions

- 160 × 100 tuiles de 32 px, soit 5 120 × 3 200 px. Ça fait environ 4 écrans de large et 4,4 de haut pour une fenêtre de 1 280 × 720.
- La carte est **fermée** : la mer l'entoure. Au nord, à l'est et à l'ouest, des falaises bloquent le passage. Au sud, une grève de sable est praticable.
- 87 % de l'île est praticable.

## Zones

| Zone | Rôle en jeu |
|---|---|
| **Esplanade du phare** (centre) | Départ, et arène du boss : un cercle de dalles autour du phare éteint, avec 4 braseros |
| **Ruines du hameau** (nord) | 6 maisons en ruine, chacune avec 2 brèches de 4 tuiles. Ce sont des couloirs où canaliser les hordes |
| **Sentier des falaises** (ouest) | Gros rochers et couloirs de 4 à 6 tuiles. C'est la zone la plus étroite, risquée mais efficace pour les armes de zone |
| **Lande aux menhirs** (est) | Grand espace ouvert avec un cromlech au centre. Idéal pour tourner en rond (kiting) |
| **Grève aux barques** (sud) | Sable, barques échouées et un ponton qui avance dans la mer |

Six chemins de terre relient les zones. Le générateur garantit qu'aucun obstacle ne les coupe.

## Couches

**Couches de tuiles** (dans l'ordre d'affichage) :

1. `sol` : eau, sable, herbe, chemins, dalles, falaise. L'eau et la falaise **bloquent**.
2. `deco` : décor non bloquant (fleurs, cailloux, filets…).
3. `obstacles` : tout ce qui bloque (rochers, murs, menhirs, barques, pins, phare, caisses, braseros).
4. `dessus` : affiché **au-dessus** des personnages (haut du phare, feuillage des pins). Propriété `depth = 100`.

**Couches d'objets :**

| Couche | Type d'objet | Contenu |
|---|---|---|
| `joueur` | `player_start` | Départ de Lumen, juste au sud de l'esplanade |
| `apparitions` | `spawn` | 47 points (36 le long de la côte, 11 à l'intérieur). Propriétés `origine` et `zone` |
| `boss` | `boss_spawn`, `boss_arena` | Point d'apparition de La Marée. Rectangle d'arène de 48 × 30 tuiles (1 536 × 960 px), `fermeture_sec = 530` |
| `lucioles` | `firefly_zone` | 5 rectangles où faire apparaître les lucioles au sol, avec un `poids` (l'esplanade vaut 3) |
| `zones` | `zone` | Les 5 zones nommées (statistiques, ambiance sonore, nom affiché) |
| `lumieres` | `light` | 7 braseros (`rayon_px`, `couleur`, `intensite`) et le phare (`allume_a_sec = -1` : il s'allume à la victoire) |

## Code Phaser minimal

```js
// preload
this.load.tilemapTiledJSON('falaise', 'maps/falaise_du_phare.tmj');
this.load.image('tiles_falaise', 'maps/tileset_falaise_provisoire.png');

// create
const map = this.make.tilemap({ key: 'falaise' });
const ts = map.addTilesetImage('falaise', 'tiles_falaise');   // 'falaise' = nom du tileset dans le .tmj
const sol = map.createLayer('sol', ts);
map.createLayer('deco', ts);
const obstacles = map.createLayer('obstacles', ts);
map.createLayer('dessus', ts).setDepth(100);
sol.setCollisionByProperty({ collides: true });
obstacles.setCollisionByProperty({ collides: true });
this.physics.add.collider(lumen, [sol, obstacles]);
this.physics.add.collider(ennemis, [sol, obstacles]);

const depart = map.findObject('joueur', o => o.type === 'player_start');
const spawns = map.getObjectLayer('apparitions').objects;
this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
```

Je l'ai testé dans Chromium sans écran avec Phaser 3.80.1 : la carte se charge, les 4 couches et les 6 couches d'objets sont présentes, et les collisions sont actives.

## Règles d'utilisation pour le Développeur

- **Choix du point d'apparition** : prendre un point `spawn` **hors de la caméra** (plus de 64 px au-delà du bord) et à moins de 1 100 px de Lumen. S'il n'y en a aucun, prendre le plus proche hors caméra. Les vagues en cercle (`ring`) se placent autour de Lumen. On ignore alors les positions qui tombent sur une tuile bloquante.
- **Déplacement des ennemis** : avec 200 ennemis et des obstacles, une poursuite en ligne droite reste coincée. Je recommande un **champ de flux** (flow field) : un parcours en largeur sur la grille de tuiles depuis la position de Lumen, recalculé 4 fois par seconde (16 000 cases, c'est rapide). Chaque ennemi suit la case voisine la plus proche de Lumen.
- **Taille des ennemis** : tous les points d'apparition sont accessibles à un ennemi de 2 × 2 tuiles (l'Ombre lourde, les mini-boss). C'est vérifié par le script.
- **Arène du boss** : à 8:50, un mur de brume infranchissable se forme sur le contour de `arene_boss`. La caméra peut rester libre, l'arène fait 1,2 écran. Les vagues de La Marée **traversent** les obstacles : le phare ne sert pas d'abri.
- **Lucioles au sol** : toutes les 10 s, tirer une zone `firefly_zone` selon son poids, puis une position praticable dans cette zone, entre 300 et 600 px de Lumen.

## Contrat de tuiles (pour le DA)

Le DA peut redessiner librement l'image du tileset, à une condition : **garder la même grille** (8 colonnes, tuiles de 32 px) et **le même ID pour chaque tuile**. La carte n'a alors rien à changer. Pour ajouter des bordures automatiques (herbe→sable, etc.), on peut ajouter des tuiles à la suite et les placer dans Tiled, ou demander au Level designer de les gérer dans le générateur.

| ID | Nom | Bloque | Couche |
|---|---|---|---|
| 1 | eau_profonde | oui | sol |
| 2 | eau_ecume | oui | sol |
| 3 | sable | | sol |
| 4 | herbe | | sol |
| 5 | herbe_sombre | | sol |
| 6 | chemin_terre | | sol |
| 7 | dalles | | sol |
| 8 | falaise | oui | sol |
| 9 | planches | | sol |
| 10 | fleurs | | deco |
| 11 | cailloux | | deco |
| 12 | filet_algues | | deco |
| 13 | herbe_haute | | deco |
| 14 | flaque | | deco |
| 15 | os_epave | | deco |
| 16 | (réserve) | | deco |
| 17 | rocher_petit | oui | obstacles |
| 18 | rocher_gros | oui | obstacles |
| 19 | mur_ruine | oui | obstacles |
| 20 | menhir | oui | obstacles |
| 21 | barque | oui | obstacles |
| 22 | tronc_pin | oui | obstacles |
| 23 | phare_base | oui | obstacles |
| 24 | caisse | oui | obstacles |
| 25 | brasero | oui | obstacles |
| 26 | feuillage_pin | | dessus |
| 27 | phare_haut | | dessus |
| 28 | (réserve) | | dessus |

Les obstacles de plusieurs tuiles (phare, gros rochers, barques) sont pour l'instant faits de tuiles identiques. Quand le DA aura des sprites dédiés, deux options sont possibles. On peut découper le sprite en tuiles et garder ses ID dans la couche `obstacles`. On peut aussi poser le sprite en objet image et garder les tuiles comme collisions invisibles.

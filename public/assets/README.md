# Assets « Phare Vectoriel » — Lumen, le dernier phare

Tous les visuels sont générés par code (SVG → PNG transparent) avec `tools/art/generate.mjs`.
Les sources SVG sont à côté de chaque PNG. Pour régénérer après une modification :

```bash
NODE_PATH=$(npm root -g) node tools/art/generate.mjs
```

`manifest.json` liste tout (clé, fichier, taille de frame, nombre de frames) et la palette.

## Contenu

| Dossier | Contenu | Format |
|---|---|---|
| `sprites/` | gardien (idle 4 frames, marche 6), brumeux, rôdeur, spectre, boss « La Marée » | spritesheets horizontales |
| `fx/` | projectiles feu / givre / foudre, impacts, dissipation, éclat de lumière (XP) | spritesheets horizontales |
| `tiles/tileset.png` | 16 tuiles 64×64, 8 colonnes, pour Tiled (ordre dans `manifest.tiles.names`) | tileset |
| `props/` | phare (éteint) et phare_allume, rochers, arbre mort, barque, caisse, tonneau, brasero, ruine, lanterne au sol, herbe, ossements | images seules |
| `ui/` | icônes 48×48 : 3 flammes, cœur, lanterne, éclat, crâne | images seules |
| `preview/` | maquette de la « Falaise du Phare » (référence visuelle, pas une carte jouable) | 1280×720 |

Le gardien regarde vers la droite : utiliser `setFlipX(true)` vers la gauche plutôt qu'une rotation.
La lumière de la lanterne n'est qu'un halo léger dans le sprite : l'obscurité reste gérée par le jeu.

## Tileset de la carte « Falaise du Phare »

`tiles/tileset_falaise.png` respecte le contrat du Level designer : **28 tuiles de 32 px, 8 colonnes, mêmes ID** (1 = eau_profonde … 27 = phare_haut). Il remplace directement `tileset_falaise_provisoire.png`, sans retoucher la carte :

```js
this.load.image('tiles_falaise', 'assets/tiles/tileset_falaise.png');
```

Les tuiles sont raccordables, donc les grands obstacles faits de tuiles répétées (phare, gros rochers, barques, murs) restent propres. Pour un meilleur rendu, poser plus tard les décors de `props/` (phare, barque, rochers…) en images par-dessus, en gardant les tuiles d'obstacles comme collisions. **Phare éteint par défaut** : la tuile 27 `phare_haut` et le décor `props/phare.png` sont éteints. Les versions allumées servent à la victoire : tuile 28 `phare_haut_allume` (ancienne réserve) et `props/phare_allume.png`. Pour l'allumer en jeu : `dessus.replaceByIndex(27, 28)` ou changer la texture du décor.

Une version `@2x` existe pour les écrans haute densité. Aperçu de la carte entière : `preview/falaise_du_phare_carte_tileset.png`.

## Chargement Phaser

```js
import manifest from '../public/assets/manifest.json';

preload() {
  for (const s of manifest.spritesheets)
    this.load.spritesheet(s.key, `assets/${s.file}`, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
  this.load.image('tileset', `assets/${manifest.tiles.file}`);
  for (const p of manifest.props) this.load.image(p.key, `assets/${p.file}`);
  for (const i of manifest.icons) this.load.image(i.key, `assets/${i.file}`);
}
```

## Palette

| Rôle | Hex |
|---|---|
| Nuit (fond) | `#070912` |
| Surface UI | `#10142A` |
| Lanterne (accent) | `#FFD97A` |
| Feu | `#FF5A36` |
| Givre | `#5EE8FF` |
| Foudre | `#B98CFF` |
| Brume | `#3A3F6B` |
| Créatures | `#6A70A8` |
| Texte | `#E8ECFF` |

Typos : **Chakra Petch** (titres, HUD) et **IBM Plex Mono** (chiffres, textes), toutes deux sur Google Fonts.

---

# Intégration dans le jeu (Développeur)

Dossier des fichiers fournis par le Directeur artistique et le Level designer.
Après avoir déposé un fichier, on le déclare dans `src/data/assets.js`.
Tant qu'un visuel manque, le jeu affiche une forme provisoire.

## Dossiers

- `sprites/` : personnages et créatures (PNG, spritesheets)
- `tiles/` : jeux de tuiles pour les cartes
- `maps/` : cartes exportées depuis Tiled (JSON)
- `ui/` : icônes, cadres, boutons

## Spritesheets

- PNG avec des images de même taille, alignées en grille.
- Vue du dessus, personnage tourné vers la droite (le jeu le retourne pour la gauche).
- Animations attendues : `idle` (au repos) et `walk` (en mouvement). On indique
  dans `assets.js` les numéros de la première et de la dernière image de chaque animation.
- Clés : `player` (Lumen), `E01` Brumelin, `E02` Filasse, `E03` Bruine, `E04` Chape,
  `eyes`, `bolt`, `orb`, `lueur`, `oil`.

## Cartes Tiled

- Carte orthogonale, tuiles de 32×32 px conseillées, export **JSON** avec le jeu de
  tuiles **intégré** (pas de .tsx séparé).
- Collisions : propriété de tuile `collides` dans le jeu de tuiles (recommandé), ou propriété `collides` sur tout un calque.
- Calque avec la propriété `depth` (nombre) ou `above` (vrai) : dessiné au-dessus des personnages.
- Objet de type `player_start` (ou point nommé `joueur`) : départ de Lumen.
- Objets de type `spawn` : points d'apparition des créatures (le jeu prend ceux hors de l'écran).
- Rectangles de type `firefly_zone` (propriété `poids`) : zones où apparaissent les lucioles.
- Les créatures contournent les obstacles grâce à un champ de flux calculé sur la grille de tuiles.
- Le nom du jeu de tuiles dans Tiled doit être celui indiqué dans `assets.js`.

Exemple fourni : `maps/demo.json` (jouable avec l'adresse `?map=demo`).

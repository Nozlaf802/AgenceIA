# Visuels du jeu

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

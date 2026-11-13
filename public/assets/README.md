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
- Calque avec la propriété personnalisée `collides` (booléen, vrai) : murs et rochers.
- Calque avec la propriété `above` (vrai) : dessiné au-dessus des personnages (cimes, toits).
- Calque d'objets contenant un point nommé `joueur` : départ de Lumen.
- Le nom du jeu de tuiles dans Tiled doit être celui indiqué dans `assets.js`.

Exemple fourni : `maps/demo.json` (jouable avec l'adresse `?map=demo`).

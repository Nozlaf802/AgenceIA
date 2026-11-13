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
| `props/` | phare, rochers, arbre mort, barque, caisse, tonneau, brasero, ruine, lanterne au sol, herbe, ossements | images seules |
| `ui/` | icônes 48×48 : 3 flammes, cœur, lanterne, éclat, crâne | images seules |
| `preview/` | maquette de la « Falaise du Phare » (référence visuelle, pas une carte jouable) | 1280×720 |

Le gardien regarde vers la droite : utiliser `setFlipX(true)` vers la gauche plutôt qu'une rotation.
La lumière de la lanterne n'est qu'un halo léger dans le sprite : l'obscurité reste gérée par le jeu.

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

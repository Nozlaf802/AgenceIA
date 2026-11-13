# Agence IA : Lumen, le dernier phare

Jeu web de survie (roguelite façon survivor.io / Archero) : Lumen, gardien de phare,
repousse les créatures de brume avec le cercle de lumière de sa lanterne.

## Jouer

Une fois GitHub Pages activé, le jeu est en ligne sur
**https://nozlaf802.github.io/agenceia/** (mis à jour à chaque fusion dans `main`).

- Ordinateur : flèches, ZQSD ou WASD pour bouger, P ou Échap pour la pause.
- Mobile : pose le doigt n'importe où et glisse (joystick flottant).

## Développer

```bash
npm install
npm run dev      # serveur local avec rechargement auto
npm run build    # version de production dans dist/
```

## Structure

```
src/
  main.js                configuration Phaser (plein écran, physique arcade)
  config.js              zoom caméra et couleurs provisoires
  data/balance.js        TOUT l'équilibrage : joueur, Lumière, XP, script de vagues
  data/enemies.js        bestiaire (Brumelin, Filasse, Bruine, Chape)
  data/upgrades.js       armes, passifs, cartes de secours
  data/texts.js          textes du jeu
  data/assets.js         catalogue des visuels (spritesheets, cartes Tiled)
  scenes/                Boot (chargement), Title, Game, UI (HUD, cartes, pause, fin)
  objects/               Player, Enemy, Lantern (lumière/obscurité)
  systems/               Spawner (vagues), Weapons, MapBuilder (Tiled), Juice (effets)
  input/                 clavier + joystick tactile réunis en une direction
public/assets/           visuels du DA et cartes du Level designer (voir son README)
```

Carte de démonstration Tiled : ajouter `?map=demo` à l'adresse.

Moteur : [Phaser 4](https://phaser.io) + [Vite](https://vite.dev).

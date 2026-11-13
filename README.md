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
  main.js               configuration Phaser (plein écran, physique arcade)
  config.js             réglages du jeu (monde, joueur, lanterne, couleurs)
  scenes/BootScene.js   textures provisoires générées par code
  scenes/GameScene.js   arène, joueur, caméra, boucle de jeu, pause
  scenes/UIScene.js     interface (chrono, PV, charge de lanterne, pause)
  objects/Player.js     déplacement du joueur
  objects/Lantern.js    rendu lumière/obscurité, rayon selon la charge
  input/                clavier + joystick tactile réunis en une direction
```

Moteur : [Phaser 4](https://phaser.io) + [Vite](https://vite.dev).

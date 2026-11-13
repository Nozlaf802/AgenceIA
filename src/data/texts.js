// Textes du jeu (clés du doc « Niveaux & histoire »).
export const TEXTS = {
  'ui.title.name': 'Lumen, le dernier phare',
  'ui.title.play': 'Allumer la lanterne',
  'ui.title.tagline': 'La brume dévore tout. Sauf la lumière.',
  'ui.tuto.move': 'Ta lanterne brûle la brume. Bouge, elle s\'occupe du reste.',
  'ui.tuto.xp': 'Ramasse les Lueurs pour grandir… et nourrir ta flamme.',
  'ui.tuto.light': 'Ta lumière faiblit ? Ramasse des Lueurs !',
  'ui.levelup.title': 'Ta flamme grandit !',
  'ui.levelup.pick': 'Choisis une flamme',
  'ui.warning.dark': 'Ta lanterne s\'éteint !',
  'ui.warning.final': 'La brume s\'épaissit… tiens bon jusqu\'à l\'aube !',
  'ui.pickup.oil': 'Huile ! +40 Lumière',
  'ui.death.title': 'La brume t\'a englouti.',
  'ui.death.retry': 'Rallumer',
  'ui.win.title': 'L\'aube se lève !',
  'ui.pause': 'La lanterne veille…',
};

export const t = (key) => TEXTS[key] ?? key;

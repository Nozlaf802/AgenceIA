// Sauvegarde locale (meilleur score, son coupé). localStorage peut être absent ou
// lever une erreur (navigation privée, cookies bloqués, aperçu) : on ne plante jamais,
// le jeu marche simplement sans mémoire.
const PREFIX = 'lumen-phare.';

export function load(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

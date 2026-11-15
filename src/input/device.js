// Appareil tactile (téléphone, tablette) ou ordinateur avec clavier :
// sert à afficher l'aide des contrôles adaptée.
export function isTouchDevice() {
  try {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    const fine = window.matchMedia?.('(pointer: fine)').matches;
    return !!coarse || (navigator.maxTouchPoints > 0 && !fine);
  } catch {
    return false;
  }
}

// Variante d'un texte selon l'appareil : « clé.touch » sur tactile, « clé.keys » sinon.
export const deviceKey = (key) => `${key}.${isTouchDevice() ? 'touch' : 'keys'}`;

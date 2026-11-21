// Zoom de l'aperçu à l'écran : « ajusté » à la largeur de sa colonne (sans dépasser la taille
// réelle), ou une taille fixe choisie avec − / +. Préférence d'affichage de ce navigateur, comme la
// largeur des panneaux : hors des CV, elle ne change ni le PDF ni l'impression.

export const ZOOM_KEY = 'cv-builder:preview-zoom';
export const FIT = 'fit';
export const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5];

const MIN_ZOOM = ZOOM_STEPS[0];
const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1];
// Un aperçu ajusté à 74,6 % passe à 75 % avec + : le palier suivant doit se voir.
const TOLERANCE = 0.005;

// Échelle qui fait tenir un document de `width` px dans `available` px, sans l'agrandir.
export function fitScale(available, width) {
  if (!(available > 0) || !(width > 0)) return 1;
  return Math.min(1, Math.floor((available / width) * 1000) / 1000);
}

// Palier suivant (direction 1) ou précédent (-1) à partir de l'échelle affichée ; null au bout.
export function stepZoom(scale, direction) {
  if (direction > 0) return ZOOM_STEPS.find((step) => step > scale + TOLERANCE) ?? null;
  return [...ZOOM_STEPS].reverse().find((step) => step < scale - TOLERANCE) ?? null;
}

export function readZoom(storage) {
  try {
    const raw = storage?.getItem(ZOOM_KEY);
    if (raw == null || raw === FIT) return FIT;
    const zoom = Number(raw);
    return Number.isFinite(zoom) && zoom >= MIN_ZOOM && zoom <= MAX_ZOOM ? zoom : FIT;
  } catch {
    return FIT;
  }
}

// FIT efface la préférence (aperçu ajusté, comme au premier lancement).
export function saveZoom(storage, zoom) {
  try {
    if (zoom === FIT) storage?.removeItem(ZOOM_KEY);
    else storage?.setItem(ZOOM_KEY, String(zoom));
  } catch {
    /* stockage plein ou refusé : le zoom vaut pour cette session seulement */
  }
}

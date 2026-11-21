// Largeur des panneaux qui entourent l'aperçu : l'éditeur (CV ou lettre) à gauche, le panneau
// Apparence à droite. Chacune se règle en glissant la poignée qui le sépare de l'aperçu. Ce sont des
// préférences d'affichage de ce navigateur : enregistrées à part, hors des CV, elles n'entrent ni
// dans les sauvegardes ni dans l'historique.

// min : en dessous, le contenu du panneau se chevauche ; max : au-delà, il n'y gagne plus rien.
export const PANES = {
  editor: { key: 'cv-builder:editor-width', cssVar: '--editor-width', defaultWidth: 460, min: 360, max: Infinity },
  appearance: {
    key: 'cv-builder:appearance-width',
    cssVar: '--appearance-width',
    defaultWidth: 320,
    min: 280,
    max: 640,
  },
};

// Place laissée à l'aperçu, quelle que soit la largeur demandée (même valeur dans styles/app/layout.css).
export const MIN_PREVIEW_WIDTH = 360;
export const KEY_STEP = 24;
export const KEY_STEP_LARGE = 96;

// Largeur maximale d'un panneau qui mesure `width` px à côté d'un aperçu de `previewWidth` px :
// il peut prendre à l'aperçu tout ce qui dépasse la largeur minimale de celui-ci.
export function maxPaneWidth(pane, width, previewWidth) {
  return Math.max(pane.min, Math.min(pane.max, Math.floor(width + previewWidth - MIN_PREVIEW_WIDTH)));
}

export function clampPaneWidth(pane, width, max = pane.max) {
  return Math.round(Math.min(Math.max(width, pane.min), Math.max(pane.min, max)));
}

// Largeur enregistrée, ou null (largeur par défaut) si rien de valable n'est enregistré.
export function readPaneWidth(storage, pane) {
  try {
    const raw = storage?.getItem(pane.key);
    if (raw == null) return null;
    const width = Number(raw);
    return Number.isFinite(width) && width >= pane.min ? Math.round(Math.min(width, pane.max)) : null;
  } catch {
    return null;
  }
}

// null efface la préférence (retour à la largeur par défaut).
export function savePaneWidth(storage, pane, width) {
  try {
    if (width == null) storage?.removeItem(pane.key);
    else storage?.setItem(pane.key, String(Math.round(width)));
  } catch {
    /* stockage plein ou refusé : la largeur vaut pour cette session seulement */
  }
}

// Panneau Apparence ouvert ou fermé : retenu de la même façon (fermé par défaut).
export const APPEARANCE_OPEN_KEY = 'cv-builder:appearance-open';

export function readFlag(storage, key) {
  try {
    return storage?.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function saveFlag(storage, key, value) {
  try {
    storage?.setItem(key, value ? '1' : '0');
  } catch {
    /* préférence de cette session seulement */
  }
}

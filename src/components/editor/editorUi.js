import { createContext, useContext } from 'react';

// État d'interface partagé par les panneaux de l'éditeur : panneaux et cartes
// dépliés (clés « panel:<section> » ou id d'élément), langue du CV.
export const EditorUiContext = createContext({
  lang: 'fr',
  isOpen: () => true,
  setOpen: () => {},
  toggle: () => {},
});

export const useEditorUi = () => useContext(EditorUiContext);

export const panelKey = (sectionId) => `panel:${sectionId}`;

// Bouton de souris (ou doigt) enfoncé, et sur quel élément ? Suivi une seule fois, au premier besoin.
let pointerDown = false;
let pointerTarget = null;
let pointerTracked = false;

function trackPointer() {
  if (pointerTracked || typeof document === 'undefined') return;
  pointerTracked = true;
  document.addEventListener(
    'pointerdown',
    (e) => {
      pointerDown = true;
      pointerTarget = e.target;
    },
    true,
  );
  const release = () => {
    pointerDown = false;
  };
  document.addEventListener('pointerup', release, true);
  document.addEventListener('pointercancel', release, true);
}

export function startPointerTracking() {
  trackPointer();
}

// Élément correspondant à `selector` sur lequel le clic en cours a commencé, sinon null.
export function pressedElement(selector) {
  if (!pointerDown || !(pointerTarget instanceof Element)) return null;
  return pointerTarget.closest(selector);
}

// Boutons qui retirent des champs à étiquettes (« Retirer ce bloc », suppression d'un élément) :
// la valeur de l'attribut est l'id du conteneur retiré. La saisie en cours d'un champ de
// ce conteneur est alors abandonnée au lieu d'être validée au blur.
const DISCARD_DRAFT_ATTR = 'data-discard-draft';

export function isDiscardingDraftOf(element) {
  const button = pressedElement(`[${DISCARD_DRAFT_ATTR}]`);
  const scope = button && document.getElementById(button.getAttribute(DISCARD_DRAFT_ATTR));
  return Boolean(scope && element && scope.contains(element));
}

// Exécute `fn` une fois le clic en cours terminé. Un blur provoqué par un clic
// ne doit pas modifier la mise en page avant le mouseup, sinon le clic tombe à côté.
export function afterPointerRelease(fn) {
  trackPointer();
  if (!pointerDown) {
    fn();
    return;
  }
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    document.removeEventListener('pointerup', run, true);
    document.removeEventListener('pointercancel', run, true);
    setTimeout(fn, 0);
  };
  // pointercancel : geste repris par le navigateur (défilement tactile), sans pointerup.
  document.addEventListener('pointerup', run, true);
  document.addEventListener('pointercancel', run, true);
}

// Place le focus sur un élément qui n'existe qu'après le prochain rendu
// (élément ajouté, déplacé ou supprimé). `fallbackId` sert si la cible est
// absente ou désactivée (bouton « Monter » du premier élément, par exemple).
// Si l'utilisatrice a entre-temps placé le focus ailleurs, on n'y touche pas.
export function focusSoon(id, { caret = null, fallbackId = null } = {}) {
  const origin = document.activeElement;
  let tries = 0;
  const attempt = () => {
    const current = document.activeElement;
    if (current && current !== origin && current !== document.body) return;
    let el = document.getElementById(id);
    if ((!el || el.disabled) && fallbackId) el = document.getElementById(fallbackId);
    if (!el || el.disabled) {
      if (tries++ < 4) requestAnimationFrame(attempt);
      return;
    }
    el.focus();
    if (caret != null && typeof el.setSelectionRange === 'function') {
      const pos = caret === 'end' ? el.value.length : caret;
      try {
        el.setSelectionRange(pos, pos);
      } catch {
        // Certains types de champ (e-mail…) n'acceptent pas de sélection.
      }
    }
  };
  requestAnimationFrame(attempt);
}

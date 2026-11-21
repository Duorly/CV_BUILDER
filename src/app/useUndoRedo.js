// Annuler / rétablir (barre d'outils et Ctrl/Cmd+Z, Ctrl+Y, Cmd+Maj+Z) et Ctrl/Cmd+S.
import { useEffect, useRef } from 'react';

const VIEW_PART_LABELS = { cv: 'du CV', letter: 'de la lettre' };

// L'historique est commun aux vues CV et Lettre : une étape qui ne touche que l'autre
// vue l'affiche, pour que rien ne change sans que l'utilisatrice le voie.
export function useUndoRedo({ store, view, setView, notify, showWelcome, dialog }) {
  const { flush } = store;

  // Retourne la partie modifiée, ou false s'il n'y avait rien à annuler / rétablir.
  const stepInView = (action, verb) => {
    const parts = action();
    if (!parts || view === 'tracker') return parts;
    const target = parts.cv && !parts.letter ? 'cv' : parts.letter && !parts.cv ? 'letter' : null;
    if (target && target !== view) {
      setView(target);
      notify(`Modification ${VIEW_PART_LABELS[target]} ${verb} : la vue « ${target === 'cv' ? 'CV' : 'Lettre'} » est affichée.`);
    }
    return parts;
  };
  const undo = () => stepInView(store.undo, 'annulée');
  const redo = () => stepInView(store.redo, 'rétablie');
  // Versions à jour pour le raccourci clavier et les messages « Annuler » déjà affichés.
  const undoRef = useRef(undo);
  undoRef.current = undo;
  const redoRef = useRef(redo);
  redoRef.current = redo;

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      // Réflexe « Enregistrer » : on écrit tout de suite et on rassure, au lieu
      // d'ouvrir la fenêtre « Enregistrer la page » du navigateur.
      if (key === 's') {
        e.preventDefault();
        if (showWelcome) return;
        if (flush()) {
          notify('Vos CV sont enregistrés automatiquement dans ce navigateur.', { tone: 'success', duration: 3000 });
        } else {
          notify('Enregistrement impossible pour le moment : faites une sauvegarde (Fichier → Tout exporter).', {
            tone: 'error',
          });
        }
        return;
      }
      const isUndo = key === 'z' && !e.shiftKey;
      const isRedo = (key === 'z' && e.shiftKey) || (key === 'y' && e.ctrlKey);
      if (!isUndo && !isRedo) return;
      // Dans une fenêtre (IA, renommage…), on laisse l'annulation native du champ ; de même dans
      // un champ qui ne fait partie ni du CV ni de la lettre (clé API affichée dans la vue Lettre).
      if (showWelcome || view === 'tracker' || dialog) return;
      if (e.target instanceof Element && e.target.closest('.modal-overlay, [role="dialog"], [data-native-undo]')) return;
      // Étiquette en cours de saisie (pas encore dans l'historique) : Ctrl+Z défait la frappe,
      // comme dans tout champ, au lieu de défaire l'étape précédente.
      if (e.target instanceof HTMLInputElement && e.target.classList.contains('editor-tag-input') && e.target.value) {
        return;
      }
      e.preventDefault();
      if (isUndo) undoRef.current();
      else redoRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [flush, notify, showWelcome, view, dialog]);

  return { undo, redo, undoRef };
}

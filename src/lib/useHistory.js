import { useCallback, useRef, useState } from 'react';

// Historique annuler / rétablir, indépendant de l'endroit où vit l'état.
// L'appelant enregistre l'état précédent avant chaque modification (record),
// puis demande l'état à restaurer (undo / redo).
//
// Les modifications rapprochées (frappe au clavier) sont regroupées en une
// seule étape ; passer { checkpoint: true } force une nouvelle étape
// (ajout, suppression, déplacement, import, application de l'IA…).
export function useHistory({ limit = 100, groupMs = 700 } = {}) {
  const ref = useRef({ past: [], future: [], lastTime: 0 });
  const [, setTick] = useState(0);
  const bump = () => setTick((n) => n + 1);

  const record = useCallback(
    (previous, { checkpoint = false } = {}) => {
      const h = ref.current;
      const now = Date.now();
      const grouped = !checkpoint && h.past.length > 0 && now - h.lastTime < groupMs;
      h.lastTime = checkpoint ? 0 : now;
      if (grouped) {
        if (h.future.length) {
          h.future = [];
          bump();
        }
        return;
      }
      h.past.push(previous);
      if (h.past.length > limit) h.past.shift();
      h.future = [];
      bump();
    },
    [groupMs, limit],
  );

  const undo = useCallback((current) => {
    const h = ref.current;
    if (!h.past.length) return undefined;
    const previous = h.past.pop();
    h.future.push(current);
    h.lastTime = 0;
    bump();
    return previous;
  }, []);

  const redo = useCallback((current) => {
    const h = ref.current;
    if (!h.future.length) return undefined;
    const next = h.future.pop();
    h.past.push(current);
    h.lastTime = 0;
    bump();
    return next;
  }, []);

  const clear = useCallback(() => {
    ref.current = { past: [], future: [], lastTime: 0 };
    bump();
  }, []);

  return {
    record,
    undo,
    redo,
    clear,
    canUndo: ref.current.past.length > 0,
    canRedo: ref.current.future.length > 0,
  };
}

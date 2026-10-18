import { useCallback, useEffect, useRef, useState } from 'react';
import { draftCoverLetter, SETTINGS_ERROR_CODES } from '../../lib/ai';

const IDLE = { busy: false, error: '', settingsHelp: null, done: false, previousBody: null };

// Brouillon IA de la lettre d'une version.
// L'état vit au-dessus de l'éditeur de lettre (dans App) : passer à la vue CV ou Candidatures
// pendant la rédaction ne perd ni la demande ni son résultat. La demande est annulée au
// changement de version, pour qu'une réponse n'atterrisse pas dans la lettre d'une autre candidature.
//   getLetter()       : lettre à jour de la version (formules saisies pendant la rédaction)
//   applyPatch(patch) : insère le brouillon dans cette lettre (étape d'annulation distincte)
//   onSettled({ ok, cancelled }) : appelé à la fin d'une demande (réussie ou en erreur), ou quand un
//                       changement de version l'interrompt (cancelled) ; pas après « Annuler »
export function useLetterDraft({ cvId, getLetter, applyPatch, onSettled }) {
  const [state, setState] = useState(IDLE);
  const abortRef = useRef(null);
  const cvIdRef = useRef(cvId);
  cvIdRef.current = cvId;
  const callbacks = useRef({ getLetter, applyPatch, onSettled });
  callbacks.current = { getLetter, applyPatch, onSettled };

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      callbacks.current.onSettled?.({ ok: false, cancelled: true });
    }
    abortRef.current = null;
    setState(IDLE);
  }, [cvId]);

  const run = useCallback(async (params) => {
    const requestCvId = cvIdRef.current;
    const previous = callbacks.current.getLetter()?.body || '';
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ ...IDLE, busy: true });
    try {
      const draft = await draftCoverLetter({ ...params, signal: controller.signal });
      if (controller.signal.aborted || cvIdRef.current !== requestCvId) return;
      const body = typeof draft?.body === 'string' ? draft.body.trim() : '';
      if (!body) {
        throw Object.assign(new Error('L’IA a renvoyé une lettre vide. Réessayez dans un instant.'), {
          code: 'EMPTY_DRAFT',
        });
      }
      const patch = { body };
      // Les formules déjà choisies par l'utilisatrice sont conservées.
      const current = callbacks.current.getLetter() || {};
      for (const key of ['subject', 'salutation', 'closing']) {
        const proposed = typeof draft?.[key] === 'string' ? draft[key].trim() : '';
        if (proposed && !String(current[key] || '').trim()) patch[key] = proposed;
      }
      callbacks.current.applyPatch(patch);
      setState({ ...IDLE, done: true, previousBody: previous.trim() ? previous : null });
      callbacks.current.onSettled?.({ ok: true });
    } catch (err) {
      if (controller.signal.aborted || err?.code === 'ABORTED') return;
      // Seules les erreurs du module IA (avec un code) ont un message rédigé pour l'utilisatrice ;
      // une erreur imprévue (« Cannot read properties… ») garde le message générique.
      const error =
        err?.code === 'NO_KEY'
          ? ''
          : err?.code && err.message
            ? err.message
            : 'Le brouillon n’a pas pu être rédigé. Vérifiez votre connexion internet, puis réessayez.';
      setState({ ...IDLE, error, settingsHelp: SETTINGS_ERROR_CODES.includes(err?.code) ? err.code : null });
      callbacks.current.onSettled?.({ ok: false, code: err?.code });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState((s) => ({ ...s, busy: false }));
  }, []);

  // Mise à jour de l'affichage : message d'erreur, aide aux réglages, bandeau « Brouillon inséré ».
  const patchState = useCallback((patch) => setState((s) => ({ ...s, ...patch })), []);

  return { ...state, run, cancel, patchState };
}

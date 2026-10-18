import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeCoverLetter, normalizeData, normalizeSettings } from '../../lib/schema';
import { loadLibrary, saveLibrary, STORAGE_KEY } from '../../lib/storage';
import { useHistory } from '../../lib/useHistory';
import { CV_META_FIELDS, getCurrentCv, selectCv, updateCvInLibrary, updateCvMeta } from '../../lib/libraryActions';

const SAVE_DELAY_MS = 500;

const deepCopy = (value) =>
  typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Contenu annulable d'une version : le CV, sa lettre et sa fiche (nom, entreprise,
// poste, offre — modifiables depuis la vue Lettre). Pas les réglages d'apparence.
const snapshotOf = (cv) => ({
  data: cv.data,
  coverLetter: cv.coverLetter,
  meta: Object.fromEntries(CV_META_FIELDS.map((key) => [key, cv[key]])),
});

const sameValue = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);

// Partie de la version qu'une étape d'annulation modifie : le CV (vue CV) ou la lettre et
// sa fiche (vue Lettre). Le nom de la version, visible partout, ne compte pour aucune des deux.
export function changedParts(before, after) {
  return {
    cv: !sameValue(before.data, after.data),
    letter:
      !sameValue(before.coverLetter, after.coverLetter) ||
      CV_META_FIELDS.some((key) => key !== 'name' && before.meta[key] !== after.meta[key]),
  };
}

const restoreSnapshot = (library, id, snapshot) =>
  updateCvInLibrary(updateCvMeta(library, id, snapshot.meta), id, {
    data: snapshot.data,
    coverLetter: snapshot.coverLetter,
  });

// État de la bibliothèque + sauvegarde automatique + annuler / rétablir.
// onExternalReload : appelé quand la bibliothèque a été rechargée depuis un autre onglet.
export function useLibraryStore({ onExternalReload } = {}) {
  const onExternalReloadRef = useRef(onExternalReload);
  onExternalReloadRef.current = onExternalReload;
  const [boot] = useState(() => loadLibrary());
  const [library, setLibraryState] = useState(boot.library);
  const libraryRef = useRef(boot.library);
  const history = useHistory();
  const { record, undo: historyUndo, redo: historyRedo, clear: clearHistory } = history;

  // Au premier lancement, rien n'est écrit avant le choix fait sur l'écran d'accueil.
  const [autosave, setAutosave] = useState(boot.status !== 'fresh');
  const [conflict, setConflict] = useState(false);
  const [saveState, setSaveState] = useState({ status: 'idle', savedAt: null, error: null });
  const lastSavedRef = useRef(boot.status === 'fresh' ? null : boot.library);
  const pausedRef = useRef(!autosave || conflict);
  pausedRef.current = !autosave || conflict;
  const autosaveRef = useRef(autosave);
  autosaveRef.current = autosave;

  const commit = useCallback(
    (next, { resetHistory = false } = {}) => {
      const previous = libraryRef.current;
      if (!next || next === previous) return;
      libraryRef.current = next;
      setLibraryState(next);
      if (resetHistory || next.currentId !== previous.currentId) clearHistory();
    },
    [clearHistory],
  );

  // ── Sauvegarde ──────────────────────────────────────────────────────────
  // Retourne true si tout est écrit, false si l'écriture est en pause ou a échoué.
  const flush = useCallback(() => {
    if (pausedRef.current) return false;
    const lib = libraryRef.current;
    if (lib === lastSavedRef.current) return true;
    const result = saveLibrary(lib);
    if (result.ok) {
      lastSavedRef.current = lib;
      setSaveState({ status: 'saved', savedAt: result.savedAt, error: null });
      return true;
    }
    setSaveState((s) => ({ ...s, status: 'error', error: result.error }));
    return false;
  }, []);

  useEffect(() => {
    if (!autosave || conflict || library === lastSavedRef.current) return undefined;
    setSaveState((s) => (s.status === 'error' ? s : { ...s, status: 'pending' }));
    const timer = setTimeout(flush, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [library, autosave, conflict, flush]);

  // Onglet masqué, fermé ou mis en veille (mobile) : on écrit tout de suite.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [flush]);

  // Avertit avant de quitter si la dernière écriture a échoué.
  const unsafe = saveState.status === 'error' || conflict;
  useEffect(() => {
    if (!unsafe) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [unsafe]);

  // Écran d'accueil encore affiché (rien n'a jamais été écrit depuis cet onglet) alors que des
  // CV sont enregistrés, par exemple depuis un autre onglet : cet onglet les reprend tels quels,
  // au lieu d'écrire sa bibliothèque vierge par-dessus. Retourne true s'il les a repris.
  const adoptSavedLibrary = useCallback(() => {
    if (autosaveRef.current) return false;
    const { library: fresh, status } = loadLibrary();
    if (status !== 'loaded') return false;
    lastSavedRef.current = fresh;
    commit(fresh, { resetHistory: true });
    autosaveRef.current = true;
    setAutosave(true);
    setSaveState({ status: 'saved', savedAt: new Date(), error: null });
    return true;
  }, [commit]);

  // Un autre onglet a enregistré. Si cet onglet n'a rien de non enregistré, il reprend
  // simplement la version la plus récente (en gardant le CV affiché) ; sinon, on suspend
  // la sauvegarde pour ne pas écraser le travail de l'autre onglet, et l'utilisatrice choisit.
  // Un onglet resté sur l'écran d'accueil n'a rien à protéger : il reprend la bibliothèque enregistrée.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY || e.newValue === null) return;
      if (!autosaveRef.current) {
        if (adoptSavedLibrary()) onExternalReloadRef.current?.({ fromWelcome: true });
        return;
      }
      const current = libraryRef.current;
      if (!lastSavedRef.current || current !== lastSavedRef.current) {
        setConflict(true);
        return;
      }
      const { library: fresh, status } = loadLibrary();
      if (status !== 'loaded') {
        setConflict(true);
        return;
      }
      // Le CV affiché ici reste affiché : la bibliothèque rechargée sert de référence
      // enregistrée, pour ne pas réécrire tout de suite (et relancer l'autre onglet).
      const next = selectCv(fresh, current.currentId);
      lastSavedRef.current = next;
      commit(next, { resetHistory: true });
      setSaveState({ status: 'saved', savedAt: new Date(), error: null });
      onExternalReloadRef.current?.({ fromWelcome: false });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [commit, adoptSavedLibrary]);

  const enableAutosave = useCallback(() => setAutosave(true), []);

  const resolveConflict = useCallback(
    (choice) => {
      if (choice === 'reload') {
        // Comme le rechargement automatique : la version sur laquelle elle travaillait reste affichée.
        const { library: fresh } = loadLibrary();
        const next = selectCv(fresh, libraryRef.current.currentId);
        lastSavedRef.current = next;
        commit(next, { resetHistory: true });
        setSaveState({ status: 'saved', savedAt: new Date(), error: null });
      } else {
        lastSavedRef.current = null; // force la réécriture de la version de cet onglet
      }
      setConflict(false);
    },
    [commit],
  );

  // ── Modifications de la version courante ──────────────────────────────
  // Retourne la version modifiée (ou undefined si rien n'a changé).
  const changeContent = useCallback(
    (produce, opts) => {
      const lib = libraryRef.current;
      const cv = getCurrentCv(lib);
      const patch = produce(cv);
      if (!patch) return undefined;
      const next = updateCvInLibrary(lib, cv.id, patch);
      if (next === lib) return undefined;
      record(snapshotOf(cv), opts);
      commit(next);
      return getCurrentCv(next);
    },
    [commit, record],
  );

  // recipe(draft) modifie une copie profonde de data ; le résultat est normalisé.
  const update = useCallback(
    (recipe, opts) => {
      changeContent((cv) => {
        const draft = deepCopy(cv.data);
        const returned = recipe(draft);
        // Une recette peut aussi renvoyer un CV complet ; toute autre valeur
        // renvoyée par mégarde (ex. `d => d.list.push(x)`) est ignorée.
        const result = isObj(returned) && isObj(returned.personalInfo) ? returned : draft;
        return { data: normalizeData(result) };
      }, opts);
    },
    [changeContent],
  );

  const setData = useCallback(
    (data, opts) => changeContent(() => ({ data: normalizeData(data) }), opts),
    [changeContent],
  );

  const updateLetter = useCallback(
    (patch, opts) =>
      changeContent((cv) => ({ coverLetter: normalizeCoverLetter({ ...cv.coverLetter, ...patch }) }), opts),
    [changeContent],
  );

  const updateSettings = useCallback(
    (patch) => {
      const lib = libraryRef.current;
      const cv = getCurrentCv(lib);
      commit(updateCvInLibrary(lib, cv.id, { settings: normalizeSettings({ ...cv.settings, ...patch }) }));
    },
    [commit],
  );

  // Champs descriptifs de la version (entreprise, poste, offre, nom) : annulables
  // comme le reste, pour que Ctrl+Z dans ces champs ne défasse pas autre chose.
  const updateCv = useCallback(
    (patch, opts) => {
      const lib = libraryRef.current;
      const cv = getCurrentCv(lib);
      const next = updateCvMeta(lib, cv.id, patch);
      if (next === lib) return;
      record(snapshotOf(cv), opts);
      commit(next);
    },
    [commit, record],
  );

  const setApplications = useCallback(
    (applications) => {
      if (!Array.isArray(applications)) return;
      commit({ ...libraryRef.current, applications });
    },
    [commit],
  );

  // Retournent false s'il n'y a rien à annuler / rétablir, sinon la partie modifiée
  // ({ cv, letter }, voir changedParts) pour que l'interface la montre.
  const undo = useCallback(() => {
    const lib = libraryRef.current;
    const cv = getCurrentCv(lib);
    const current = snapshotOf(cv);
    const previous = historyUndo(current);
    if (!previous) return false;
    commit(restoreSnapshot(lib, cv.id, previous));
    return changedParts(current, previous);
  }, [commit, historyUndo]);

  const redo = useCallback(() => {
    const lib = libraryRef.current;
    const cv = getCurrentCv(lib);
    const current = snapshotOf(cv);
    const next = historyRedo(current);
    if (!next) return false;
    commit(restoreSnapshot(lib, cv.id, next));
    return changedParts(current, next);
  }, [commit, historyRedo]);

  // Bibliothèque à jour, pour une action différée (bouton « Annuler » d'un message).
  const getLibrary = useCallback(() => libraryRef.current, []);

  // Opération quelconque sur la bibliothèque (versions, import…) : fn(lib) → nouvelle lib.
  const transact = useCallback(
    (fn, opts) => {
      const next = fn(libraryRef.current);
      commit(next, opts);
      return next;
    },
    [commit],
  );

  return {
    library,
    cv: getCurrentCv(library),
    bootStatus: boot.status,
    update,
    setData,
    updateLetter,
    updateSettings,
    updateCv,
    setApplications,
    transact,
    getLibrary,
    undo,
    redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    saveState,
    flush,
    autosave,
    enableAutosave,
    adoptSavedLibrary,
    conflict,
    resolveConflict,
  };
}

// Écran d'accueil (premier lancement) : CV vierge, exemple ou import d'une sauvegarde.
import { useRef, useState } from 'react';
import { createCv, createLibrary } from '../lib/storage';
import { normalizeData } from '../lib/schema';
import { EXAMPLE_NAME, exampleResume } from './example';

const SAVED_ELSEWHERE =
  'Des CV ont été enregistrés dans un autre onglet pendant que l’accueil était affiché : ils sont ouverts ici, rien n’a été écrasé.';

export function useWelcome({ store, notify }) {
  const [shown, setShown] = useState(store.bootStatus === 'fresh');
  // Valeur à jour pendant une lecture de fichier (l'accueil a pu se fermer entre-temps).
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const [error, setError] = useState('');

  const close = () => {
    setShown(false);
    setError('');
  };

  // Cet onglet était resté sur l'accueil : il reprend les CV de l'autre onglet au lieu de les écraser.
  const adoptedElsewhere = () => {
    close();
    notify(SAVED_ELSEWHERE, { tone: 'success', duration: 9000 });
  };

  const finish = () => {
    close();
    store.enableAutosave();
  };

  // Des CV ont pu être enregistrés (autre onglet) pendant que l'accueil était affiché :
  // on les ouvre au lieu de les écraser par le choix fait ici. Retourne true si c'est le cas.
  const takeSavedLibrary = () => {
    if (!store.adoptSavedLibrary()) return false;
    adoptedElsewhere();
    return true;
  };

  const startBlank = () => {
    if (!takeSavedLibrary()) finish();
  };

  const startWithExample = () => {
    if (takeSavedLibrary()) return;
    store.transact(() => createLibrary(createCv({ name: EXAMPLE_NAME, data: normalizeData(exampleResume) })), {
      resetHistory: true,
    });
    finish();
  };

  return {
    shown,
    isShown: () => shownRef.current,
    error,
    setError,
    adoptedElsewhere,
    finish,
    takeSavedLibrary,
    startBlank,
    startWithExample,
  };
}

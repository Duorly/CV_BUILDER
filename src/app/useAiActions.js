// Résultats des outils IA (adapter à une offre, traduire) : nouvelle version ou modifications
// appliquées à la version affichée, annulables depuis le message.
import { normalizeData } from '../lib/schema';
import { canTrackApplication, createVersionFromAi, CV_META_FIELDS, getCurrentCv, updateCvInLibrary } from '../lib/libraryActions';

const hasLetterContent = (version) => Object.values(version?.coverLetter || {}).some((v) => String(v || '').trim());

// Contenu annulable identique (CV, lettre, fiche) : rien n'a été saisi entre-temps.
const sameContent = (a, b) =>
  a.data === b.data && a.coverLetter === b.coverLetter && CV_META_FIELDS.every((key) => a[key] === b[key]);

// undoRef : useUndoRedo().undoRef (dernière étape de l'historique de la version affichée).
export function useAiActions({ store, notify, setDialog, openCvView, undoRef }) {
  const { cv, transact } = store;

  const onCreateVersion = (fields) => {
    const { copyLetterFrom, ...versionFields } = fields;
    const tracked = Boolean(fields.addToTracker) && canTrackApplication(fields);
    const displayed = cv;
    let created;
    let letterSource = null;
    transact((lib) => {
      // L'optimiseur peut partir d'une autre version que celle affichée (sa version de base).
      const base =
        lib.cvs.find((c) => c.id === fields.sourceId) || lib.cvs.find((c) => c.id === lib.currentId) || lib.cvs[0];
      // Lettre commencée pour cette offre (dans la version affichée) : reprise si demandé.
      letterSource = copyLetterFrom ? lib.cvs.find((c) => c.id === copyLetterFrom) || null : null;
      const result = createVersionFromAi(lib, base, {
        ...versionFields,
        addToTracker: tracked,
        coverLetter: letterSource?.coverLetter,
      });
      created = result.cv;
      return result.library;
    });
    setDialog(null);
    openCvView();
    const letterNote = letterSource
      ? ` Elle reprend la lettre de motivation de « ${letterSource.name} ».`
      : hasLetterContent(displayed)
        ? ` Sa lettre de motivation est vide : celle que vous aviez écrite est restée dans « ${displayed.name} ».`
        : '';
    notify(
      `Version « ${created.name} » créée${tracked ? ' et ajoutée au suivi des candidatures' : ''}. Votre CV d’origine n’a pas changé.${letterNote}`,
      { tone: 'success', duration: letterNote ? 10000 : 8000 },
    );
  };

  // « Annuler » du message de onApplyToCurrent : ne défait que les modifications de l'IA, sur la
  // version qu'elles ont touchée. Si elle a changé depuis, on le dit au lieu de défaire autre chose.
  const undoAiChanges = (before, applied) => {
    const lib = store.getLibrary();
    const target = lib.cvs.find((c) => c.id === applied.id);
    if (!target) {
      notify(`« ${applied.name} » n’existe plus : il n’y a rien à annuler.`);
      return;
    }
    if (target.data === before.data) {
      notify('Les modifications de l’IA sont déjà annulées.');
      return;
    }
    if (!sameContent(target, applied)) {
      notify(
        lib.currentId === target.id
          ? `« ${target.name} » a été modifié depuis : pour revenir en arrière, utilisez le bouton Annuler de la barre d’outils (Ctrl+Z), étape par étape.`
          : `« ${target.name} » a été modifié depuis les modifications de l’IA : elles ne peuvent plus être annulées d’un coup.`,
        { duration: 9000 },
      );
      return;
    }
    if (lib.currentId === target.id) {
      // Dernière étape de l'historique (Rétablir pourra les réappliquer), sauf si l'historique
      // a été vidé entre-temps (changement de version aller-retour).
      if (!undoRef.current()) store.setData(before.data, { checkpoint: true });
    } else {
      // Version quittée depuis (son historique est vidé) : on lui rend son contenu d'avant.
      transact((l) => updateCvInLibrary(l, target.id, { data: before.data }));
    }
    notify(`Modifications de l’IA annulées dans « ${target.name} ».`, { tone: 'success' });
  };

  const onApplyToCurrent = (newData) => {
    const before = getCurrentCv(store.getLibrary());
    const applied = store.setData(normalizeData(newData), { checkpoint: true });
    setDialog(null);
    if (!applied) return;
    notify(`Modifications appliquées à « ${cv.name} ».`, {
      tone: 'success',
      action: { label: 'Annuler', onClick: () => undoAiChanges(before, applied) },
    });
  };

  return { onCreateVersion, onApplyToCurrent };
}

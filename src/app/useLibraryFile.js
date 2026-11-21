// Import / export des CV (menu Fichier, accueil, bandeaux) et rappel de sauvegarde.
import { useEffect, useRef, useState } from 'react';
import { buildFileBase, downloadJson, downloadText, todayIso } from '../lib/files';
import { createLibrary, defaultStorage, exportCvPayload, exportLibraryPayload, STORAGE_KEY } from '../lib/storage';
import {
  describeLastExport,
  needsBackupReminder,
  readBackupState,
  recordExport,
  REMINDER_DAYS,
  requestPersistentStorage,
  SAFARI_REMINDER_DAYS,
  snoozeReminder,
} from '../lib/backup';
import {
  addCv,
  compareImport,
  describeImportChanges,
  describeLibrary,
  getCurrentCv,
  mergeLibraries,
  replaceLibrary,
  uniqueCvName,
} from '../lib/libraryActions';
import { readImportFile } from './importFile';

// welcome : useWelcome() (un fichier choisi depuis l'accueil remplace la bibliothèque vide).
// browser : currentPrintBrowser() (Safari efface plus vite les données d'un site).
export function useLibraryFile({ store, notify, setDialog, openCvView, welcome, browser }) {
  const { library, cv, transact } = store;
  const fileInputRef = useRef(null);
  const [backup, setBackup] = useState(readBackupState);
  // Données illisibles au démarrage : un CV vierge a été ouvert, le bandeau propose d'importer.
  const [recovered, setRecovered] = useState(store.bootStatus === 'recovered');

  // Dès que les CV sont enregistrés dans ce navigateur, on demande qu'ils ne soient pas
  // effacés pour faire de la place (sans garantie sous Safari : d'où le rappel d'export).
  const { autosave } = store;
  useEffect(() => {
    if (autosave) requestPersistentStorage();
  }, [autosave]);

  const chooseImportFile = () => fileInputRef.current?.click();

  const exportCurrentCv = () => {
    const name = `${buildFileBase({ prefix: 'CV', name: cv.data.personalInfo.name, company: cv.company })}_${todayIso()}.json`;
    downloadJson(exportCvPayload(cv), name);
    notify(`« ${cv.name} » exporté : ${name}`, { tone: 'success' });
  };

  const exportAll = () => {
    const name = `CV_Builder_sauvegarde_${todayIso()}.json`;
    downloadJson(exportLibraryPayload(library), name);
    setBackup(recordExport());
    notify(`Sauvegarde téléchargée : ${name}. Gardez-la en lieu sûr (Documents, cloud…).`, { tone: 'success' });
  };

  const reminderDays = browser.id === 'safari' ? SAFARI_REMINDER_DAYS : REMINDER_DAYS;
  const showBackupReminder = !welcome.shown && needsBackupReminder(library, backup, { days: reminderDays });
  const lastExportLabel = describeLastExport(backup.lastExport);

  const onFileChosen = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = ''; // permet de réimporter le même fichier
    if (!file) return;
    const fromWelcome = welcome.shown;
    try {
      const parsed = await readImportFile(file);
      setRecovered(false);
      // L'accueil a pu se fermer pendant la lecture (CV enregistrés depuis un autre onglet) :
      // le fichier s'ajoute alors à ces CV comme un import ordinaire.
      if (fromWelcome && welcome.isShown() && !welcome.takeSavedLibrary()) {
        const next = parsed.kind === 'library' ? parsed.library : createLibrary(parsed.cv);
        transact(() => next, { resetHistory: true });
        welcome.finish();
        notify(`Import réussi : ${describeLibrary(next)}.`, { tone: 'success' });
      } else if (parsed.kind === 'cv') {
        let added;
        transact((lib) => {
          added = { ...parsed.cv, name: uniqueCvName(lib, parsed.cv.name) };
          return addCv(lib, added);
        });
        openCvView();
        notify(`« ${added.name} » a été ajouté à vos CV et ouvert.`, { tone: 'success' });
      } else {
        setDialog({ type: 'import', imported: parsed.library, fileName: file.name });
      }
    } catch (err) {
      const message = err?.message || 'Ce fichier n’a pas pu être lu.';
      if (fromWelcome) welcome.setError(message);
      else notify(message, { tone: 'error' });
    }
  };

  // « Ajouter / Mettre à jour ma bibliothèque » : sans doublons, et annulable depuis le message.
  const mergeImport = (imported) => {
    setDialog(null);
    const previous = store.getLibrary();
    const merged = mergeLibraries(previous, imported);
    if (merged === previous) {
      notify('Rien à ajouter : tout le contenu de ce fichier est déjà dans votre bibliothèque.', { tone: 'success' });
      return;
    }
    const summary = describeImportChanges(compareImport(previous, imported));
    // La version affichée a pu être remplacée par celle du fichier : son historique ne vaut plus.
    const resetHistory = getCurrentCv(merged) !== getCurrentCv(previous);
    transact(() => merged, { resetHistory });
    notify(`Bibliothèque mise à jour : ${summary}.`, {
      tone: 'success',
      duration: 10000,
      action: {
        label: 'Annuler',
        onClick: () => {
          if (store.getLibrary() !== merged) {
            notify('Vos CV ont été modifiés depuis l’import : il ne peut plus être annulé d’un coup.', { duration: 9000 });
            return;
          }
          transact(() => previous, { resetHistory });
          notify('Import annulé : votre bibliothèque est revenue à son état précédent.', { tone: 'success' });
        },
      },
    });
  };

  const replaceWithImport = (imported) => {
    transact(() => replaceLibrary(imported), { resetHistory: true });
    setDialog(null);
    notify('Bibliothèque remplacée par le contenu du fichier.', { tone: 'success' });
  };

  const downloadCorruptCopy = () => {
    let raw = null;
    try {
      raw = defaultStorage()?.getItem(`${STORAGE_KEY}:corrupt`) ?? null;
    } catch {
      /* stockage indisponible */
    }
    if (!raw) {
      notify('Aucune copie des anciennes données n’a pu être conservée.', { tone: 'error' });
      return;
    }
    downloadText(raw, `CV_Builder_donnees_illisibles_${todayIso()}.json`, 'application/json;charset=utf-8');
  };

  return {
    fileInputRef,
    chooseImportFile,
    onFileChosen,
    exportCurrentCv,
    exportAll,
    mergeImport,
    replaceWithImport,
    downloadCorruptCopy,
    backup,
    snoozeReminder: () => setBackup(snoozeReminder()),
    showBackupReminder,
    lastExportLabel,
    recovered,
    dismissRecovered: () => setRecovered(false),
  };
}

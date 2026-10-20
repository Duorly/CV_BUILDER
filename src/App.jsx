import { useCallback, useEffect, useRef, useState } from 'react';
import './styles/app.css';
import { Eye, PenLine, Save, TriangleAlert, X } from 'lucide-react';
import Editor from './components/editor/Editor';
import ResumeDesign from './components/templates/ResumeDesign';
import ResumeATS from './components/templates/ResumeATS';
import PrintStyles from './components/templates/PrintStyles';
import CoverLetter from './components/letter/CoverLetter';
import CoverLetterEditor from './components/letter/CoverLetterEditor';
import { useLetterDraft } from './components/letter/useLetterDraft';
import ApplicationsTracker from './components/tracker/ApplicationsTracker';
import ATSOptimizer from './components/ai/ATSOptimizer';
import TranslateDialog from './components/ai/TranslateDialog';
import AiSettingsPanel from './components/ai/AiSettingsPanel';
import Toolbar from './components/shell/Toolbar';
import PreviewFrame from './components/shell/PreviewFrame';
import Modal from './components/shell/Modal';
import ConfirmDialog from './components/shell/ConfirmDialog';
import VersionDialog from './components/shell/VersionDialog';
import ImportDialog from './components/shell/ImportDialog';
import DownloadDialog from './components/shell/DownloadDialog';
import WelcomeScreen from './components/shell/WelcomeScreen';
import SafeBoundary from './components/shell/SafeBoundary';
import { ToastStack, useToasts } from './components/shell/Toasts';
import { useLibraryStore } from './components/shell/useLibraryStore';
import { onTabListKeyDown } from './components/shell/tabKeys';
import { downloadResumePdf, renderResumePdf } from './lib/pdfExport';
import { pdfAlteredText } from './components/pdf/pdfCoverage';
import { currentPrintBrowser } from './components/shell/browser';
import { documentFileBase } from './components/shell/fileNames';
import { buildFileBase, downloadJson, downloadText, readFileAsText, sanitizePhoto, todayIso } from './lib/files';
import {
  createCv,
  createLibrary,
  defaultStorage,
  exportCvPayload,
  exportLibraryPayload,
  parseImport,
  STORAGE_KEY,
} from './lib/storage';
import { marginScale, normalizeData } from './lib/schema';
import {
  describeLastExport,
  needsBackupReminder,
  readBackupState,
  recordExport,
  REMINDER_DAYS,
  requestPersistentStorage,
  SAFARI_REMINDER_DAYS,
  snoozeReminder,
} from './lib/backup';
import {
  addApplicationForCv,
  addCv,
  canTrackApplication,
  compareImport,
  createVersionFromAi,
  CV_META_FIELDS,
  derivedCvs,
  describeImportChanges,
  describeLibrary,
  duplicateForApplication,
  getCurrentCv,
  linkedApplications,
  mergeLibraries,
  newBlankCv,
  newCvFromData,
  removeCv,
  replaceContact,
  replaceLibrary,
  selectCv,
  uniqueCvName,
  updateCvInLibrary,
  versionsWithContact,
} from './lib/libraryActions';
import exampleResume from './data/exampleResume.json';

const EXAMPLE_NAME = 'Exemple – Camille Martin';
const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

// Une photo importée (ancienne sauvegarde : photo brute, avec ses métadonnées EXIF)
// est recadrée et réencodée comme une photo choisie dans l'éditeur.
async function withCleanPhoto(cv) {
  const photo = cv.data.personalInfo.photo;
  if (!photo) return cv;
  const cleaned = await sanitizePhoto(photo);
  if (cleaned === photo) return cv;
  return { ...cv, data: { ...cv.data, personalInfo: { ...cv.data.personalInfo, photo: cleaned } } };
}

async function readImportFile(file) {
  if (file.size > MAX_IMPORT_BYTES) throw new Error('Ce fichier est trop volumineux pour être une sauvegarde de CV.');
  const text = await readFileAsText(file);
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`« ${file.name} » n’est pas un fichier JSON lisible. Choisissez une sauvegarde exportée depuis CV Builder.`);
  }
  const parsed = parseImport(json);
  if (parsed.kind === 'cv') return { ...parsed, cv: await withCleanPhoto(parsed.cv) };
  return { ...parsed, library: { ...parsed.library, cvs: await Promise.all(parsed.library.cvs.map(withCleanPhoto)) } };
}

const VIEW_PART_LABELS = { cv: 'du CV', letter: 'de la lettre' };

// Coordonnée corrigée dans une version : libellés du message qui propose de la reporter ailleurs.
const CONTACT_LABELS = {
  name: { old: 'l’ancien nom', updated: 'Nom mis à jour' },
  email: { old: 'l’ancienne adresse e-mail', updated: 'Adresse e-mail mise à jour' },
  phone: { old: 'l’ancien numéro de téléphone', updated: 'Numéro de téléphone mis à jour' },
  location: { old: 'l’ancienne ville', updated: 'Ville mise à jour' },
  photo: { old: 'l’ancienne photo', updated: 'Photo mise à jour' },
};

const hasLetterContent = (version) => Object.values(version?.coverLetter || {}).some((v) => String(v || '').trim());

const SAVED_ELSEWHERE =
  'Des CV ont été enregistrés dans un autre onglet pendant que l’accueil était affiché : ils sont ouverts ici, rien n’a été écrasé.';

// Contenu annulable identique (CV, lettre, fiche) : rien n'a été saisi entre-temps.
const sameContent = (a, b) =>
  a.data === b.data && a.coverLetter === b.coverLetter && CV_META_FIELDS.every((key) => a[key] === b[key]);

export default function App() {
  const { toasts, notify, dismiss } = useToasts();
  const store = useLibraryStore({
    onExternalReload: ({ fromWelcome } = {}) => {
      if (fromWelcome) {
        // Cet onglet était resté sur l'accueil : il reprend les CV de l'autre onglet au lieu de les écraser.
        setShowWelcome(false);
        setWelcomeError('');
        notify(SAVED_ELSEWHERE, { tone: 'success', duration: 9000 });
        return;
      }
      notify('Vos CV ont été mis à jour avec les modifications faites dans un autre onglet.');
    },
  });
  const { library, cv, transact } = store;
  const { settings } = cv;
  const [browser] = useState(currentPrintBrowser);
  const [backup, setBackup] = useState(readBackupState);

  const [view, setView] = useState('cv'); // 'cv' | 'letter' | 'tracker'
  const [mobilePane, setMobilePane] = useState('edit'); // sous 1100 px : un seul panneau à la fois
  const [dialog, setDialog] = useState(null);
  const [printOverride, setPrintOverride] = useState(null); // modèle forcé le temps d'une impression
  const [previewPages, setPreviewPages] = useState(1); // pages de l'aperçu affiché
  const [showWelcome, setShowWelcome] = useState(store.bootStatus === 'fresh');
  const welcomeRef = useRef(showWelcome);
  welcomeRef.current = showWelcome;
  const [welcomeError, setWelcomeError] = useState('');
  const [recovered, setRecovered] = useState(store.bootStatus === 'recovered');
  const fileInputRef = useRef(null);

  const template = printOverride || settings.template;
  const printMode = view === 'letter' ? 'letter' : template;
  const personName = cv.data.personalInfo.name;
  const nameParts = { lang: settings.lang, name: personName, company: cv.company };
  const fileBase = documentFileBase({ ...nameParts, kind: view === 'letter' ? 'letter' : 'ats' });
  const designFileBase = documentFileBase({ ...nameParts, kind: 'design' });
  const printFileBase = printMode === 'design' ? designFileBase : fileBase;

  // Le titre de la page devient le nom proposé par « Enregistrer en PDF » (y compris via Ctrl/Cmd+P).
  // Pendant l'impression, il prend le nom du modèle imprimé : la version design a le sien.
  useEffect(() => {
    document.title = showWelcome ? 'CV Builder' : printOverride ? printFileBase : fileBase;
    if (showWelcome) return undefined;
    const beforePrint = () => {
      document.title = printFileBase;
    };
    const afterPrint = () => {
      document.title = fileBase;
    };
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, [fileBase, printFileBase, printOverride, showWelcome]);

  const closeDialog = useCallback(() => setDialog(null), []);
  const openCvView = () => setView((v) => (v === 'tracker' ? 'cv' : v));
  const viewRef = useRef(view);
  viewRef.current = view;

  // ── Brouillon IA de la lettre ─────────────────────────────────────────
  // Tenu ici, et non dans l'éditeur de lettre : passer à la vue CV ou Candidatures pendant la
  // rédaction ne perd pas la demande (payante), et le brouillon arrive dans la lettre de la version.
  const letterDraft = useLetterDraft({
    cvId: cv.id,
    getLetter: () => getCurrentCv(store.getLibrary()).coverLetter,
    applyPatch: (patch) => store.updateLetter(patch, { checkpoint: true }),
    onSettled: ({ ok, cancelled }) => {
      if (cancelled) {
        notify(
          'Le brouillon de lettre en cours a été annulé : il était demandé pour une autre version de CV. Relancez-le depuis la vue « Lettre » de la version voulue.',
          { duration: 9000 },
        );
        return;
      }
      if (viewRef.current === 'letter') return;
      notify(
        ok
          ? 'Le brouillon de votre lettre est prêt : relisez-le dans la vue « Lettre ».'
          : 'Le brouillon de votre lettre n’a pas pu être rédigé : la vue « Lettre » en donne la raison.',
        {
          tone: ok ? 'success' : 'error',
          duration: 10000,
          action: { label: 'Voir la lettre', onClick: () => setView('letter') },
        },
      );
    },
  });

  // ── Coordonnées communes aux versions ─────────────────────────────────
  // Chaque version est une copie : une coordonnée corrigée ici ne change pas les autres.
  // On le dit, et on propose de reporter la correction dans celles qui ont l'ancienne valeur.
  const onContactCommit = ({ field, before, after }) => {
    const labels = CONTACT_LABELS[field];
    const oldValue = String(before ?? '').trim();
    if (!labels || !oldValue || oldValue === String(after ?? '').trim()) return;
    const lib = store.getLibrary();
    const editedId = getCurrentCv(lib).id;
    const ids = versionsWithContact(lib, editedId, field, before);
    if (!ids.length) return;
    const n = ids.length;
    const shown = field === 'photo' ? '' : ` (${oldValue})`;
    notify(
      `${n > 1 ? `${n} autres versions de vos CV ont` : 'Une autre version de vos CV a'} encore ${labels.old}${shown} : chaque version est une copie indépendante.`,
      {
        duration: 12000,
        action: {
          label: 'Mettre à jour partout',
          onClick: () => {
            const previous = store.getLibrary();
            // Valeur actuelle de la version corrigée (la photo a pu être recadrée depuis le message).
            const edited = previous.cvs.find((c) => c.id === editedId);
            const value = edited ? edited.data.personalInfo[field] : after;
            const next = replaceContact(previous, ids, field, before, value);
            if (next === previous) {
              notify('Rien à mettre à jour : cette coordonnée ou les autres versions ont changé entre-temps.');
              return;
            }
            const previousById = new Map(previous.cvs.map((c) => [c.id, c]));
            const changed = next.cvs.filter((c) => previousById.get(c.id) !== c).map((c) => c.id);
            transact(() => next);
            notify(`${labels.updated} dans ${changed.length > 1 ? `${changed.length} autres versions` : '1 autre version'}.`, {
              tone: 'success',
              action: {
                label: 'Annuler',
                onClick: () => transact((l) => replaceContact(l, changed, field, value, before)),
              },
            });
          },
        },
      },
    );
  };

  // ── Annuler / rétablir ────────────────────────────────────────────────
  // L'historique est commun aux vues CV et Lettre : une étape qui ne touche que l'autre
  // vue l'affiche, pour que rien ne change sans que l'utilisatrice le voie.
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

  // ── Écran d'accueil ───────────────────────────────────────────────────
  const finishWelcome = () => {
    setShowWelcome(false);
    setWelcomeError('');
    store.enableAutosave();
  };

  // Des CV ont pu être enregistrés (autre onglet) pendant que l'accueil était affiché :
  // on les ouvre au lieu de les écraser par le choix fait ici. Retourne true si c'est le cas.
  const takeSavedLibrary = () => {
    if (!store.adoptSavedLibrary()) return false;
    setShowWelcome(false);
    setWelcomeError('');
    notify(SAVED_ELSEWHERE, { tone: 'success', duration: 9000 });
    return true;
  };

  const startBlank = () => {
    if (!takeSavedLibrary()) finishWelcome();
  };

  // Dès que les CV sont enregistrés dans ce navigateur, on demande qu'ils ne soient pas
  // effacés pour faire de la place (sans garantie sous Safari : d'où le rappel d'export).
  const { autosave } = store;
  useEffect(() => {
    if (autosave) requestPersistentStorage();
  }, [autosave]);

  const startWithExample = () => {
    if (takeSavedLibrary()) return;
    transact(() => createLibrary(createCv({ name: EXAMPLE_NAME, data: normalizeData(exampleResume) })), {
      resetHistory: true,
    });
    finishWelcome();
  };

  // ── Import / export ───────────────────────────────────────────────────
  const chooseImportFile = () => fileInputRef.current?.click();

  const exportCurrentCv = () => {
    const name = `${buildFileBase({ prefix: 'CV', name: personName, company: cv.company })}_${todayIso()}.json`;
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
  const showBackupReminder = !showWelcome && needsBackupReminder(library, backup, { days: reminderDays });
  const lastExportLabel = describeLastExport(backup.lastExport);

  const onFileChosen = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = ''; // permet de réimporter le même fichier
    if (!file) return;
    const fromWelcome = showWelcome;
    try {
      const parsed = await readImportFile(file);
      setRecovered(false);
      // L'accueil a pu se fermer pendant la lecture (CV enregistrés depuis un autre onglet) :
      // le fichier s'ajoute alors à ces CV comme un import ordinaire.
      if (fromWelcome && welcomeRef.current && !takeSavedLibrary()) {
        const next = parsed.kind === 'library' ? parsed.library : createLibrary(parsed.cv);
        transact(() => next, { resetHistory: true });
        finishWelcome();
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
      if (fromWelcome) setWelcomeError(message);
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

  // ── Versions ──────────────────────────────────────────────────────────
  const versions = {
    onSelect: (id) => transact((lib) => selectCv(lib, id)),
    onNewBlank: () => {
      let created;
      transact((lib) => {
        created = newBlankCv(lib);
        return addCv(lib, created);
      });
      openCvView();
      notify(`« ${created.name} » créé. Vos autres versions restent dans la liste « Mes CV ».`, { tone: 'success' });
    },
    onNewExample: () => {
      let created;
      transact((lib) => {
        created = newCvFromData(lib, exampleResume, { name: EXAMPLE_NAME });
        return addCv(lib, created);
      });
      openCvView();
      notify(`« ${created.name} » créé à partir de l’exemple.`, { tone: 'success' });
    },
    onDuplicate: () => setDialog({ type: 'version', mode: 'duplicate' }),
    onRename: () => setDialog({ type: 'version', mode: 'rename' }),
    onDelete: () => {
      const linked = linkedApplications(library, cv.id).length;
      setDialog({
        type: 'confirm',
        title: 'Supprimer cette version ?',
        message: (
          <p>
            « {cv.name} » sera effacé de ce navigateur.
            {linked > 0 &&
              ` ${linked} candidature${linked > 1 ? 's' : ''} du suivi ${linked > 1 ? 'restent' : 'reste'} enregistrée${linked > 1 ? 's' : ''}, mais sans lien vers ce CV.`}
          </p>
        ),
        confirmLabel: 'Supprimer',
        danger: true,
        onConfirm: () => deleteCurrentVersion(),
      });
    },
  };

  const deleteCurrentVersion = () => {
    const deleted = cv;
    const relinkIds = new Set(linkedApplications(library, deleted.id).map((a) => a.id));
    // Les versions dérivées sont rattachées à la source de celle supprimée (removeCv) ;
    // « Annuler » leur rend leur lien d'origine.
    const childIds = new Set(derivedCvs(library, deleted.id).map((c) => c.id));
    transact((lib) => removeCv(lib, deleted.id));
    notify(`« ${deleted.name} » a été supprimé.`, {
      action: {
        label: 'Annuler',
        onClick: () =>
          transact((lib) => {
            const restored = addCv(lib, deleted);
            return {
              ...restored,
              cvs: restored.cvs.map((c) => (childIds.has(c.id) ? { ...c, sourceId: deleted.id } : c)),
              applications: lib.applications.map((a) => (relinkIds.has(a.id) ? { ...a, cvId: deleted.id } : a)),
            };
          }),
      },
    });
  };

  const submitVersionDialog = (mode, fields) => {
    setDialog(null);
    if (mode === 'rename') {
      store.updateCv(fields, { checkpoint: true });
      return;
    }
    const { addToTracker, ...versionFields } = fields;
    const tracked = Boolean(addToTracker) && canTrackApplication(versionFields);
    let created;
    transact((lib) => {
      const result = duplicateForApplication(lib, cv.id, versionFields);
      created = result.cv;
      return tracked && created ? addApplicationForCv(result.library, created) : result.library;
    });
    openCvView();
    notify(
      `Version « ${created.name} » créée${tracked ? ' et ajoutée au suivi des candidatures' : ''} : adaptez-la librement, l’original n’a pas changé.`,
      { tone: 'success' },
    );
  };

  // ── IA ────────────────────────────────────────────────────────────────
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

  // « Annuler » du message ci-dessus : ne défait que les modifications de l'IA, sur la version
  // qu'elles ont touchée. Si elle a changé depuis, on le dit au lieu de défaire autre chose.
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

  // ── Téléchargement / impression ───────────────────────────────────────
  const startPrint = (mode) => {
    const title = mode === 'design' ? designFileBase : fileBase;
    setDialog(null);
    setPrintOverride(mode === 'letter' ? null : mode);
    // Deux images : React affiche d'abord le bon modèle, puis le navigateur imprime.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const fallbackEvents = ['pointerdown', 'keydown'];
        let restored = false;
        const restore = () => {
          if (restored) return;
          restored = true;
          window.removeEventListener('afterprint', restore);
          fallbackEvents.forEach((type) => window.removeEventListener(type, restore));
          document.title = fileBase;
          setPrintOverride(null);
        };
        window.addEventListener('afterprint', restore);
        document.title = title;
        window.print();
        // Filet : si le navigateur n'émet pas « afterprint », le modèle choisi
        // revient dès que l'utilisatrice reprend la main sur la page.
        if (!restored) fallbackEvents.forEach((type) => window.addEventListener(type, restore));
      }),
    );
  };

  // Le PDF direct est généré dès l'ouverture de la fenêtre « Télécharger » : elle annonce
  // ainsi son nombre de pages réel, et le téléchargement reprend ce même fichier.
  const preparePdf = (fileName) => renderResumePdf({ data: cv.data, settings: cv.settings, fileName });
  // « Ajuster à 1 page » (modèle ATS) vérifie aussi le PDF direct, dont la mise en page diffère de l'aperçu.
  const pdfPagesAt = (fontScale) =>
    renderResumePdf({ data: cv.data, settings: { ...cv.settings, fontScale } }).then((result) => result.pages);

  const directPdf = async (prepared) => {
    await downloadResumePdf({ prepared });
    notify(`PDF téléchargé : ${prepared.name}`, { tone: 'success' });
  };

  const showDesignPreview = () => {
    setDialog(null);
    setMobilePane('preview');
    store.updateSettings({ template: 'design' });
    notify('Aperçu Design affiché : deux colonnes et vos couleurs, comme le « PDF design via l’impression ». Le modèle se change dans « Apparence ».', {
      duration: 8000,
    });
  };

  const showAtsPreview = () => {
    setDialog(null);
    setMobilePane('preview');
    store.updateSettings({ template: 'ats' });
    notify(
      'Aperçu ATS affiché : même contenu et même présentation une colonne que le PDF recommandé, mais ses sauts de page peuvent différer. Le nombre exact de pages du PDF est indiqué dans « Télécharger ». Le modèle se change dans « Apparence ».',
      { duration: 9000 },
    );
  };

  // ── Rendu ─────────────────────────────────────────────────────────────
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".json,application/json"
      className="visually-hidden"
      tabIndex={-1}
      aria-hidden="true"
      onChange={onFileChosen}
    />
  );

  if (showWelcome) {
    return (
      <div className="app-container">
        <WelcomeScreen
          onStartBlank={startBlank}
          onLoadExample={startWithExample}
          onImport={chooseImportFile}
          importError={welcomeError}
        />
        {fileInput}
        <ToastStack toasts={toasts} onDismiss={dismiss} />
      </div>
    );
  }

  const Resume = template === 'ats' ? ResumeATS : ResumeDesign;

  return (
    <div className="app-container" data-view={view}>
      <Toolbar
        library={library}
        cv={cv}
        view={view}
        onViewChange={setView}
        versions={versions}
        history={{ canUndo: store.canUndo, canRedo: store.canRedo, onUndo: undo, onRedo: redo }}
        updateSettings={store.updateSettings}
        file={{ onImport: chooseImportFile, onExportCv: exportCurrentCv, onExportAll: exportAll, lastExportLabel }}
        ai={{
          onOptimize: () => setDialog({ type: 'ai-optimize' }),
          onTranslate: () => setDialog({ type: 'ai-translate' }),
          onSettings: () => setDialog({ type: 'ai-settings' }),
        }}
        saveState={store.saveState}
        conflict={store.conflict}
        lastExportLabel={lastExportLabel}
        onDownload={() => setDialog({ type: 'download' })}
      />

      {showBackupReminder && (
        <div className="app-banner app-banner-info no-print" role="status">
          <Save size={18} aria-hidden="true" />
          <p>
            {backup.lastExport
              ? `Dernière sauvegarde exportée : ${lastExportLabel}.`
              : 'Vous n’avez encore exporté aucune sauvegarde.'}{' '}
            Vos CV, lettres et candidatures ne sont enregistrés que dans ce navigateur
            {browser.id === 'safari'
              ? ', et Safari efface les données d’un site que vous n’ouvrez pas pendant 7 jours.'
              : ' : un nettoyage du navigateur les effacerait.'}{' '}
            Gardez une copie à jour sur votre ordinateur ou dans votre cloud.
          </p>
          <div className="app-banner-actions">
            <button type="button" className="btn btn-sm btn-primary" onClick={exportAll}>
              Tout exporter
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setBackup(snoozeReminder())}>
              Plus tard
            </button>
          </div>
        </div>
      )}

      {recovered && (
        <div className="app-banner app-banner-warn no-print" role="alert">
          <TriangleAlert size={18} aria-hidden="true" />
          <p>
            Les données enregistrées dans ce navigateur étaient illisibles. Elles ont été mises de côté et un CV vierge
            a été ouvert. Si vous avez une sauvegarde, importez-la.
          </p>
          <div className="app-banner-actions">
            <button type="button" className="btn btn-sm btn-primary" onClick={chooseImportFile}>
              Importer une sauvegarde
            </button>
            <button type="button" className="btn btn-sm" onClick={downloadCorruptCopy}>
              Télécharger les données illisibles
            </button>
            <button type="button" className="icon-btn" onClick={() => setRecovered(false)} aria-label="Fermer ce message">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {store.conflict && (
        <div className="app-banner app-banner-warn no-print" role="alert">
          <TriangleAlert size={18} aria-hidden="true" />
          <p>
            Vos CV ont été modifiés dans un autre onglet. Pour ne rien écraser, l’enregistrement est en pause ici.
          </p>
          <div className="app-banner-actions">
            <button type="button" className="btn btn-sm btn-primary" onClick={() => store.resolveConflict('reload')}>
              Charger la version la plus récente
            </button>
            <button type="button" className="btn btn-sm" onClick={() => store.resolveConflict('keep')}>
              Garder celle de cet onglet
            </button>
          </div>
        </div>
      )}

      {view !== 'tracker' && (
        <div className="pane-switch no-print" role="tablist" aria-label="Panneau affiché" onKeyDown={onTabListKeyDown}>
          <button
            type="button"
            role="tab"
            aria-selected={mobilePane === 'edit'}
            tabIndex={mobilePane === 'edit' ? 0 : -1}
            className={mobilePane === 'edit' ? 'is-active' : ''}
            onClick={() => setMobilePane('edit')}
          >
            <PenLine size={15} aria-hidden="true" /> Éditer
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobilePane === 'preview'}
            tabIndex={mobilePane === 'preview' ? 0 : -1}
            className={mobilePane === 'preview' ? 'is-active' : ''}
            onClick={() => setMobilePane('preview')}
          >
            <Eye size={15} aria-hidden="true" /> Aperçu
          </button>
        </div>
      )}

      <main className="main-layout" data-pane={mobilePane}>
        {view === 'tracker' ? (
          <div className="tracker-pane">
            <SafeBoundary label="Le suivi des candidatures" resetKey={library.applications}>
              <ApplicationsTracker
                applications={library.applications}
                cvs={library.cvs}
                currentCvId={library.currentId}
                onChange={store.setApplications}
                onOpenCv={(cvId) => {
                  transact((lib) => selectCv(lib, cvId));
                  setView('cv');
                }}
              />
            </SafeBoundary>
          </div>
        ) : (
          <>
            <div className="editor-pane no-print">
              {view === 'cv' ? (
                <SafeBoundary label="L’éditeur" resetKey={cv.data}>
                  <Editor
                    data={cv.data}
                    update={store.update}
                    lang={settings.lang}
                    settings={settings}
                    updateSettings={store.updateSettings}
                    onContactCommit={onContactCommit}
                  />
                </SafeBoundary>
              ) : (
                <SafeBoundary label="L’éditeur de lettre" resetKey={cv.coverLetter}>
                  <CoverLetterEditor
                    cv={cv}
                    letter={cv.coverLetter}
                    onChange={store.updateLetter}
                    onCvChange={store.updateCv}
                    draft={letterDraft}
                    baseHint={
                      !cv.sourceId && library.cvs.length > 1
                        ? `« ${cv.name} » est votre version de base. Pour une offre précise, créez d’abord sa version (Mes CV → Dupliquer pour une candidature, ou IA → Adapter à une offre) : la lettre, le poste et l’entreprise seront enregistrés avec elle.`
                        : ''
                    }
                  />
                </SafeBoundary>
              )}
            </div>
            <PreviewFrame
              mode={printMode}
              lang={settings.lang}
              fontScale={settings.fontScale}
              onFontScaleChange={view === 'cv' ? (fontScale) => store.updateSettings({ fontScale }) : undefined}
              onPagesChange={setPreviewPages}
              pdfPagesAt={view === 'cv' && template === 'ats' ? pdfPagesAt : undefined}
              notify={notify}
            >
              {view === 'cv' ? (
                <SafeBoundary label="L’aperçu du CV" resetKey={cv.data}>
                  <Resume data={cv.data} settings={settings} />
                </SafeBoundary>
              ) : (
                <SafeBoundary label="L’aperçu de la lettre" resetKey={cv.coverLetter}>
                  <CoverLetter cv={cv} letter={cv.coverLetter} settings={settings} />
                </SafeBoundary>
              )}
            </PreviewFrame>
          </>
        )}
      </main>

      <PrintStyles mode={printMode} marginScale={marginScale(settings)} />
      {fileInput}

      {dialog?.type === 'download' && (
        <DownloadDialog
          view={view}
          fileBase={fileBase}
          designFileBase={designFileBase}
          nameMissing={!personName.trim()}
          template={settings.template}
          previewPages={view === 'cv' && settings.template === 'ats' ? previewPages : null}
          hasPhoto={Boolean(cv.data.personalInfo.photo) && settings.showPhoto}
          altered={view === 'letter' ? null : pdfAlteredText(cv.data)}
          onPreparePdf={preparePdf}
          onDirectPdf={directPdf}
          onShowAtsPreview={showAtsPreview}
          onShowDesignPreview={showDesignPreview}
          onPrint={startPrint}
          onClose={closeDialog}
        />
      )}
      {dialog?.type === 'version' && (
        <VersionDialog
          mode={dialog.mode}
          cv={cv}
          onClose={closeDialog}
          onSubmit={(fields) => submitVersionDialog(dialog.mode, fields)}
        />
      )}
      {dialog?.type === 'confirm' && <ConfirmDialog {...dialog} onClose={closeDialog} />}
      {dialog?.type === 'import' && (
        <ImportDialog
          fileName={dialog.fileName}
          imported={dialog.imported}
          current={library}
          onClose={closeDialog}
          onExportCurrent={exportAll}
          onMerge={() => mergeImport(dialog.imported)}
          onReplace={() => {
            transact(() => replaceLibrary(dialog.imported), { resetHistory: true });
            setDialog(null);
            notify('Bibliothèque remplacée par le contenu du fichier.', { tone: 'success' });
          }}
        />
      )}
      {dialog?.type === 'ai-optimize' && (
        <ATSOptimizer
          cv={cv}
          versions={library.cvs}
          onClose={closeDialog}
          onCreateVersion={onCreateVersion}
          onApplyToCurrent={onApplyToCurrent}
        />
      )}
      {dialog?.type === 'ai-translate' && (
        <TranslateDialog cv={cv} onClose={closeDialog} onCreateVersion={onCreateVersion} />
      )}
      {dialog?.type === 'ai-settings' && (
        <Modal title="Intelligence artificielle (optionnelle)" onClose={closeDialog} size="lg">
          <AiSettingsPanel />
        </Modal>
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

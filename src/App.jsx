import { useCallback, useRef, useState } from 'react';
import './styles/app.css';
import PrintStyles from './components/templates/PrintStyles';
import { useLetterDraft } from './components/letter/useLetterDraft';
import ApplicationsTracker from './components/tracker/ApplicationsTracker';
import Toolbar from './components/shell/Toolbar';
import WelcomeScreen from './components/shell/WelcomeScreen';
import SafeBoundary from './components/shell/SafeBoundary';
import { ToastStack, useToasts } from './components/shell/Toasts';
import { useLibraryStore } from './components/shell/useLibraryStore';
import { currentPrintBrowser } from './components/shell/browser';
import { documentFileBase } from './components/shell/fileNames';
import { marginScale } from './lib/schema';
import { getCurrentCv, selectCv } from './lib/libraryActions';
import { useWelcome } from './app/useWelcome';
import { useDocumentTitle } from './app/useDocumentTitle';
import { useUndoRedo } from './app/useUndoRedo';
import { useContactSync } from './app/useContactSync';
import { useLibraryFile } from './app/useLibraryFile';
import { useVersionActions } from './app/useVersionActions';
import { useAiActions } from './app/useAiActions';
import { useDownload } from './app/useDownload';
import { useAppearancePane } from './app/useAppearancePane';
import { BackupReminder, ConflictBanner, RecoveredBanner } from './app/AppBanners';
import PaneSwitch from './app/PaneSwitch';
import Workspace from './app/Workspace';
import AppDialogs from './app/AppDialogs';

// Application : état partagé (bibliothèque, vue, fenêtre ouverte) et assemblage des écrans. Les
// actions vivent dans les hooks de src/app/, chacun pour un domaine (fichiers, versions, IA…).
export default function App() {
  const { toasts, notify, dismiss } = useToasts();
  const store = useLibraryStore({
    // Bibliothèque rechargée depuis un autre onglet (appelé après le rendu : welcome est défini).
    onExternalReload: ({ fromWelcome } = {}) => {
      if (fromWelcome) welcome.adoptedElsewhere();
      else notify('Vos CV ont été mis à jour avec les modifications faites dans un autre onglet.');
    },
  });
  const { library, cv, transact } = store;
  const { settings } = cv;
  const welcome = useWelcome({ store, notify });
  const [browser] = useState(currentPrintBrowser);

  const [view, setView] = useState('cv'); // 'cv' | 'letter' | 'tracker'
  const [mobilePane, setMobilePane] = useState('edit'); // sous 1100 px : un seul panneau à la fois
  const [dialog, setDialog] = useState(null);
  const [printOverride, setPrintOverride] = useState(null); // modèle forcé le temps d'une impression
  const [previewPages, setPreviewPages] = useState(1); // pages de l'aperçu affiché
  const appearance = useAppearancePane();

  const template = printOverride || settings.template;
  const printMode = view === 'letter' ? 'letter' : template;
  const nameParts = { lang: settings.lang, name: cv.data.personalInfo.name, company: cv.company };
  const fileBase = documentFileBase({ ...nameParts, kind: view === 'letter' ? 'letter' : 'ats' });
  const designFileBase = documentFileBase({ ...nameParts, kind: 'design' });
  useDocumentTitle({
    showWelcome: welcome.shown,
    printOverride,
    fileBase,
    printFileBase: printMode === 'design' ? designFileBase : fileBase,
  });

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

  const undoRedo = useUndoRedo({ store, view, setView, notify, showWelcome: welcome.shown, dialog });
  const onContactCommit = useContactSync({ store, notify });
  const file = useLibraryFile({ store, notify, setDialog, openCvView, welcome, browser });
  const versionActions = useVersionActions({ store, notify, setDialog, openCvView });
  const ai = useAiActions({ store, notify, setDialog, openCvView, undoRef: undoRedo.undoRef });
  const download = useDownload({ store, notify, setDialog, setMobilePane, setPrintOverride, fileBase, designFileBase });

  // ── Rendu ─────────────────────────────────────────────────────────────
  const fileInput = (
    <input
      ref={file.fileInputRef}
      type="file"
      accept=".json,application/json"
      className="visually-hidden"
      tabIndex={-1}
      aria-hidden="true"
      onChange={file.onFileChosen}
    />
  );

  if (welcome.shown) {
    return (
      <div className="app-container">
        <WelcomeScreen
          onStartBlank={welcome.startBlank}
          onLoadExample={welcome.startWithExample}
          onImport={file.chooseImportFile}
          importError={welcome.error}
        />
        {fileInput}
        <ToastStack toasts={toasts} onDismiss={dismiss} />
      </div>
    );
  }

  return (
    <div className="app-container" data-view={view}>
      <Toolbar
        library={library}
        cv={cv}
        view={view}
        onViewChange={setView}
        versions={versionActions.versions}
        history={{ canUndo: store.canUndo, canRedo: store.canRedo, onUndo: undoRedo.undo, onRedo: undoRedo.redo }}
        appearance={{ open: appearance.open, onToggle: appearance.toggle }}
        file={{
          onImport: file.chooseImportFile,
          onExportCv: file.exportCurrentCv,
          onExportAll: file.exportAll,
          lastExportLabel: file.lastExportLabel,
        }}
        ai={{
          onOptimize: () => setDialog({ type: 'ai-optimize' }),
          onTranslate: () => setDialog({ type: 'ai-translate' }),
          onSettings: () => setDialog({ type: 'ai-settings' }),
        }}
        saveState={store.saveState}
        conflict={store.conflict}
        lastExportLabel={file.lastExportLabel}
        onDownload={() => setDialog({ type: 'download' })}
      />

      <BackupReminder file={file} browser={browser} />
      <RecoveredBanner file={file} />
      <ConflictBanner store={store} />

      {view !== 'tracker' && <PaneSwitch pane={mobilePane} onChange={setMobilePane} />}

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
          <Workspace
            view={view}
            store={store}
            template={template}
            printMode={printMode}
            letterDraft={letterDraft}
            onContactCommit={onContactCommit}
            onPagesChange={setPreviewPages}
            pdfPagesAt={download.pdfPagesAt}
            notify={notify}
            appearance={appearance}
          />
        )}
      </main>

      <PrintStyles mode={printMode} marginScale={marginScale(settings)} />
      {fileInput}

      <AppDialogs
        dialog={dialog}
        onClose={closeDialog}
        view={view}
        store={store}
        names={{ fileBase, designFileBase }}
        previewPages={previewPages}
        download={download}
        file={file}
        versionActions={versionActions}
        ai={ai}
      />

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

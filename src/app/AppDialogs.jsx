// Fenêtres ouvertes depuis la barre d'outils : Télécharger, versions, confirmation, import, IA.
import ATSOptimizer from '../components/ai/ATSOptimizer';
import TranslateDialog from '../components/ai/TranslateDialog';
import AiSettingsPanel from '../components/ai/AiSettingsPanel';
import Modal from '../components/shell/Modal';
import ConfirmDialog from '../components/shell/ConfirmDialog';
import VersionDialog from '../components/shell/VersionDialog';
import ImportDialog from '../components/shell/ImportDialog';
import DownloadDialog from '../components/shell/DownloadDialog';
import { pdfAlteredText } from '../components/pdf/pdfCoverage';
import { designStyleLabel, designStyleLayout } from '../lib/schema';

// dialog : { type, … } ou null. download : useDownload() ; file : useLibraryFile() ;
// versionActions : useVersionActions() ; ai : useAiActions().
// names : { fileBase, designFileBase } ; previewPages : pages de l'aperçu affiché.
export default function AppDialogs({ dialog, onClose, view, store, names, previewPages, download, file, versionActions, ai }) {
  const { library, cv } = store;
  const { settings } = cv;
  if (!dialog) return null;

  switch (dialog.type) {
    case 'download':
      return (
        <DownloadDialog
          view={view}
          fileBase={names.fileBase}
          designFileBase={names.designFileBase}
          nameMissing={!cv.data.personalInfo.name.trim()}
          template={settings.template}
          designLabel={designStyleLabel(settings)}
          designLayout={designStyleLayout(settings)}
          previewPages={view === 'cv' && settings.template === 'ats' ? previewPages : null}
          hasPhoto={Boolean(cv.data.personalInfo.photo) && settings.showPhoto}
          altered={view === 'letter' ? null : pdfAlteredText(cv.data)}
          onPreparePdf={download.preparePdf}
          onDirectPdf={download.directPdf}
          onShowAtsPreview={download.showAtsPreview}
          onShowDesignPreview={download.showDesignPreview}
          onPrint={download.startPrint}
          onClose={onClose}
        />
      );
    case 'version':
      return (
        <VersionDialog
          mode={dialog.mode}
          cv={cv}
          onClose={onClose}
          onSubmit={(fields) => versionActions.submitVersionDialog(dialog.mode, fields)}
        />
      );
    case 'confirm':
      return <ConfirmDialog {...dialog} onClose={onClose} />;
    case 'import':
      return (
        <ImportDialog
          fileName={dialog.fileName}
          imported={dialog.imported}
          current={library}
          onClose={onClose}
          onExportCurrent={file.exportAll}
          onMerge={() => file.mergeImport(dialog.imported)}
          onReplace={() => file.replaceWithImport(dialog.imported)}
        />
      );
    case 'ai-optimize':
      return (
        <ATSOptimizer
          cv={cv}
          versions={library.cvs}
          onClose={onClose}
          onCreateVersion={ai.onCreateVersion}
          onApplyToCurrent={ai.onApplyToCurrent}
        />
      );
    case 'ai-translate':
      return <TranslateDialog cv={cv} onClose={onClose} onCreateVersion={ai.onCreateVersion} />;
    case 'ai-settings':
      return (
        <Modal title="Intelligence artificielle (optionnelle)" onClose={onClose} size="lg">
          <AiSettingsPanel />
        </Modal>
      );
    default:
      return null;
  }
}

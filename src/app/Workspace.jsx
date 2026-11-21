// Espace de travail des vues CV et Lettre : éditeur à gauche, aperçu au centre, panneau Apparence
// à droite (s'il est ouvert), séparés par des poignées de redimensionnement (écrans larges).
import { useRef } from 'react';
import Editor from '../components/editor/Editor';
import { resumeTemplate } from '../components/templates/registry';
import CoverLetter from '../components/letter/CoverLetter';
import CoverLetterEditor from '../components/letter/CoverLetterEditor';
import PreviewFrame from '../components/shell/PreviewFrame';
import PaneResizer, { usePaneWidth } from '../components/shell/PaneResizer';
import { APPEARANCE_PANE_ID, AppearancePane } from '../components/shell/AppearancePane';
import { PANES } from '../components/shell/paneWidth';
import SafeBoundary from '../components/shell/SafeBoundary';

// view : 'cv' | 'letter' ; template : 'design' | 'ats', modèle affiché (celui forcé pendant une impression compris) ;
// printMode : géométrie de page de l'aperçu ; appearance : useAppearancePane().
export default function Workspace({
  view,
  store,
  template,
  printMode,
  letterDraft,
  onContactCommit,
  onPagesChange,
  pdfPagesAt,
  notify,
  appearance,
}) {
  const { library, cv } = store;
  const { settings } = cv;
  // Largeurs réglées avec les poignées, enregistrées dans ce navigateur.
  const editorPaneRef = useRef(null);
  const appearancePaneRef = useRef(null);
  const [editorWidth, setEditorWidth] = usePaneWidth(PANES.editor);
  const [appearanceWidth, setAppearanceWidth] = usePaneWidth(PANES.appearance);
  // Modèle en couleur : celui choisi dans l'Apparence (Design, Classique ou Expert), y compris quand il est
  // imprimé pendant que le modèle ATS est affiché.
  const Resume = resumeTemplate(template, settings.designStyle);

  return (
    <>
      <div
        id="editor-pane"
        ref={editorPaneRef}
        className="editor-pane no-print"
        style={editorWidth ? { '--editor-width': `${editorWidth}px` } : undefined}
      >
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
      <PaneResizer
        paneRef={editorPaneRef}
        paneId="editor-pane"
        pane={PANES.editor}
        side="left"
        label="Largeur du panneau d’édition"
        onResize={setEditorWidth}
        onReset={() => setEditorWidth(null)}
      />
      <PreviewFrame
        mode={printMode}
        lang={settings.lang}
        fontScale={settings.fontScale}
        onFontScaleChange={view === 'cv' ? (fontScale) => store.updateSettings({ fontScale }) : undefined}
        onPagesChange={onPagesChange}
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
      {appearance.open && (
        <>
          <PaneResizer
            paneRef={appearancePaneRef}
            paneId={APPEARANCE_PANE_ID}
            pane={PANES.appearance}
            side="right"
            label="Largeur du panneau Apparence"
            onResize={setAppearanceWidth}
            onReset={() => setAppearanceWidth(null)}
          />
          <AppearancePane
            paneRef={appearancePaneRef}
            width={appearanceWidth}
            view={view}
            settings={settings}
            data={cv.data}
            hasPhoto={Boolean(cv.data.personalInfo.photo)}
            updateSettings={store.updateSettings}
            onClose={appearance.close}
          />
        </>
      )}
    </>
  );
}

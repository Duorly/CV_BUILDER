import {
  ClipboardList,
  Download,
  FileDown,
  FileText,
  FolderOpen,
  KeyRound,
  Languages,
  Mails,
  Redo2,
  Save,
  Sparkles,
  Undo2,
  Upload,
} from 'lucide-react';
import Dropdown, { MenuItem, MenuSeparator } from './Dropdown';
import VersionMenu from './VersionMenu';
import AppearancePanel from './AppearancePanel';
import SaveIndicator from './SaveIndicator';
import { onTabListKeyDown } from './tabKeys';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MOD = isMac ? '⌘' : 'Ctrl+';

// Annuler / Rétablir à la souris : le focus reste dans le champ en cours. Sinon le blur
// validerait une étiquette en cours de saisie, qui deviendrait une étape (et viderait Rétablir).
const keepFocus = (e) => e.preventDefault();

const VIEWS = [
  { id: 'cv', label: 'CV', icon: FileText },
  { id: 'letter', label: 'Lettre', icon: Mails },
  { id: 'tracker', label: 'Candidatures', icon: ClipboardList },
];

export default function Toolbar({
  library,
  cv,
  view,
  onViewChange,
  versions,
  history,
  updateSettings,
  file,
  ai,
  saveState,
  conflict,
  lastExportLabel,
  onDownload,
}) {
  const editing = view !== 'tracker';
  const translateTo = cv.settings.lang === 'en' ? 'français' : 'anglais';

  return (
    <header className="toolbar no-print">
      <div className="tb-group tb-start">
        <span className="tb-brand">
          <FileText size={17} aria-hidden="true" />
          <span className="tb-brand-text">CV Builder</span>
        </span>
        <VersionMenu cvs={library.cvs} currentCv={cv} {...versions} />
      </div>

      <div className="tb-group tb-views" role="tablist" aria-label="Affichage" onKeyDown={onTabListKeyDown}>
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            tabIndex={view === id ? 0 : -1}
            className={`tb-view ${view === id ? 'is-active' : ''}`}
            onClick={() => onViewChange(id)}
          >
            <Icon size={15} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="tb-group tb-actions">
        {editing && (
          <span className="tb-history">
            <button
              type="button"
              className="icon-btn"
              onMouseDown={keepFocus}
              onClick={history.onUndo}
              disabled={!history.canUndo}
              title={`Annuler (${MOD}Z)`}
              aria-label="Annuler"
            >
              <Undo2 size={16} />
            </button>
            <button
              type="button"
              className="icon-btn"
              onMouseDown={keepFocus}
              onClick={history.onRedo}
              disabled={!history.canRedo}
              title={`Rétablir (${isMac ? '⌘⇧Z' : 'Ctrl+Y'})`}
              aria-label="Rétablir"
            >
              <Redo2 size={16} />
            </button>
          </span>
        )}

        {editing && (
          <AppearancePanel
            settings={cv.settings}
            hasPhoto={Boolean(cv.data.personalInfo.photo)}
            updateSettings={updateSettings}
          />
        )}

        <Dropdown label="Fichier" icon={FolderOpen} title="Importer ou exporter vos CV (JSON)">
          <MenuItem icon={Upload} onSelect={file.onImport} hint="Une sauvegarde ou un CV exporté (.json)">
            Importer…
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={FileDown} onSelect={file.onExportCv} hint={`« ${cv.name} » seulement`}>
            Exporter ce CV
          </MenuItem>
          <MenuItem icon={Save} onSelect={file.onExportAll} hint="Toutes les versions et les candidatures">
            Tout exporter (sauvegarde)
          </MenuItem>
          <p className="tb-note">
            Vos CV sont enregistrés automatiquement dans ce navigateur. Gardez aussi une sauvegarde : elle permet de
            changer d’ordinateur ou de navigateur.
            {lastExportLabel && (
              <span className="tb-note-strong"> Dernière sauvegarde exportée : {lastExportLabel}.</span>
            )}
          </p>
        </Dropdown>

        {editing && (
          <Dropdown
            label="IA"
            icon={Sparkles}
            title="Outils d’intelligence artificielle (optionnels)"
            buttonClassName="btn btn-ghost tb-ai"
          >
            <MenuItem icon={Sparkles} onSelect={ai.onOptimize} hint="Crée une version adaptée, sans toucher à l’original">
              Adapter à une offre…
            </MenuItem>
            <MenuItem icon={Languages} onSelect={ai.onTranslate} hint="Crée une version traduite">
              Traduire en {translateTo}…
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={KeyRound} onSelect={ai.onSettings} hint="Votre clé personnelle Claude ou Gemini">
              Clé API et fournisseur…
            </MenuItem>
          </Dropdown>
        )}
      </div>

      <div className="tb-group tb-end">
        <SaveIndicator
          saveState={saveState}
          conflict={conflict}
          onExport={file.onExportAll}
          lastExportLabel={lastExportLabel}
        />
        {editing && (
          <button
            type="button"
            className="btn btn-primary tb-download"
            onClick={onDownload}
            aria-label="Télécharger"
            title={view === 'letter' ? 'Télécharger la lettre en PDF' : 'Télécharger le CV en PDF'}
          >
            <Download size={15} aria-hidden="true" />
            <span className="tb-download-text">Télécharger</span>
            <span className="tb-download-short" aria-hidden="true">
              PDF
            </span>
          </button>
        )}
      </div>
    </header>
  );
}

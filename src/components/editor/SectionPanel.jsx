import { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Award,
  Briefcase,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  HeartHandshake,
  Languages,
  LayoutList,
  Link,
  Pencil,
  Sparkles,
} from 'lucide-react';
import { LABELS, labelsFor } from '../../lib/labels';
import { customSectionKey, sectionColumn } from '../../lib/schema';
import Panel from './Panel';
import { focusSoon } from './editorUi';
import { applySectionTitle, fieldId, sectionContentSummary } from './listUtils';

const SECTION_ICONS = {
  profile: FileText,
  skills: Sparkles,
  experiences: Briefcase,
  education: GraduationCap,
  otherExperiences: HeartHandshake,
  links: Link,
  languages: Languages,
  certifications: Award,
};

const COLUMN_HELP =
  "Emplacement dans le modèle « design ». Le modèle ATS affiche toutes les sections sur une colonne, dans l'ordre de cette liste.";

// Panneau d'une section du CV : renommer, masquer, déplacer, puis son contenu.
export default function SectionPanel({ entry, index, total, data, update, lang, template, onMove, children }) {
  const [renaming, setRenaming] = useState(false);
  const initialTitle = useRef('');
  const isCustom = entry.id.startsWith('custom:');
  const custom = isCustom ? data.customSections.find((c) => customSectionKey(c) === entry.id) : null;
  const base = fieldId('panel', entry.id);
  const hidden = entry.visible === false;

  const defaultTitle = isCustom ? '' : labelsFor(lang).sections[entry.id] || '';
  const value = isCustom ? entry.title || custom?.title || '' : entry.title;
  const shownTitle = value.trim() || defaultTitle || 'Section sans titre';
  const kindLabel = isCustom ? 'Section libre' : LABELS.fr.sections[entry.id];
  const column = sectionColumn(data, entry.id);
  const content = sectionContentSummary(data, entry.id);

  const setTitle = (next) => update((draft) => applySectionTitle(draft, entry.id, next));

  const toggleVisible = () =>
    update((draft) => {
      const section = draft.sections.find((s) => s.id === entry.id);
      if (section) section.visible = section.visible === false;
    }, { checkpoint: true });

  const startRename = () => {
    initialTitle.current = value;
    setRenaming(true);
  };

  const stopRename = (revert = false) => {
    if (revert && value !== initialTitle.current) setTitle(initialTitle.current);
    setRenaming(false);
    focusSoon(`${base}-rename`);
  };

  const Icon = SECTION_ICONS[entry.id] || LayoutList;

  const heading = renaming ? (
    <div className="editor-panel-rename">
      <Icon size={18} className="header-icon" aria-hidden="true" />
      <label htmlFor={`${base}-title`} className="editor-sr-only">
        Titre de la section sur le CV
      </label>
      <input
        id={`${base}-title`}
        type="text"
        className="editor-panel-title-input"
        value={value}
        placeholder={defaultTitle || "Ex. Centres d'intérêt"}
        aria-describedby={`${base}-title-hint`}
        autoFocus
        onFocus={(e) => e.target.select()}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            stopRename();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            stopRename(true);
          }
        }}
        onBlur={() => setRenaming(false)}
      />
      <span id={`${base}-title-hint`} className="editor-sr-only">
        {defaultTitle
          ? `Laissez vide pour garder « ${defaultTitle} ». Entrée pour valider, Échap pour annuler.`
          : 'Entrée pour valider, Échap pour annuler.'}
      </span>
    </div>
  ) : null;

  const meta = (
    <>
      {shownTitle !== kindLabel && <span className="editor-meta-kind">{kindLabel}</span>}
      <span
        className={`editor-column-badge${template === 'ats' ? ' is-inactive' : ''}`}
        title={COLUMN_HELP}
      >
        {column === 'sidebar' ? 'colonne latérale' : 'colonne principale'}
      </span>
      <span className={content.empty ? 'editor-meta-empty' : undefined}>
        {hidden ? 'Masquée sur le CV' : content.text}
      </span>
    </>
  );

  const actions = (
    <>
      <button
        type="button"
        id={`${base}-rename`}
        className="editor-icon-btn"
        aria-label={`Renommer la section « ${shownTitle} »`}
        title="Renommer"
        onClick={renaming ? () => stopRename() : startRename}
        onMouseDown={(e) => renaming && e.preventDefault()}
      >
        <Pencil size={14} aria-hidden="true" />
      </button>
      <button
        type="button"
        id={`${base}-visibility`}
        className={`editor-icon-btn${hidden ? ' is-active' : ''}`}
        aria-label={hidden ? `Afficher « ${shownTitle} » sur le CV` : `Masquer « ${shownTitle} » sur le CV`}
        title={hidden ? 'Afficher sur le CV' : 'Masquer sur le CV'}
        onClick={toggleVisible}
      >
        {hidden ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
      </button>
      <button
        type="button"
        id={`${base}-up`}
        className="editor-icon-btn"
        aria-label={`Monter la section « ${shownTitle} »`}
        title="Monter la section"
        disabled={index === 0}
        onClick={() => onMove(index, index - 1, `${base}-up`, `${base}-down`)}
      >
        <ArrowUp size={14} aria-hidden="true" />
      </button>
      <button
        type="button"
        id={`${base}-down`}
        className="editor-icon-btn"
        aria-label={`Descendre la section « ${shownTitle} »`}
        title="Descendre la section"
        disabled={index === total - 1}
        onClick={() => onMove(index, index + 1, `${base}-down`, `${base}-up`)}
      >
        <ArrowDown size={14} aria-hidden="true" />
      </button>
    </>
  );

  return (
    <Panel
      id={entry.id}
      icon={Icon}
      title={shownTitle}
      meta={meta}
      heading={heading}
      actions={actions}
      muted={hidden}
      className="editor-section-panel"
    >
      {hidden && (
        <p className="editor-hidden-note">
          Cette section est masquée : elle reste enregistrée mais n'apparaît pas sur le CV.
        </p>
      )}
      {children}
    </Panel>
  );
}

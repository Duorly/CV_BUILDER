import { useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { LANGUAGE_LEVELS } from '../../lib/labels';
import { customSectionKey, isBlankItem, newCustomSection } from '../../lib/schema';
import PersonalInfoPanel from './PersonalInfoPanel';
import SectionPanel from './SectionPanel';
import { EditorUiContext, focusSoon, panelKey } from './editorUi';
import { deleteConfirmMessage, fieldId, moveItem, undoShortcut } from './listUtils';
import CertificationsSection from './sections/CertificationsSection';
import CustomSection from './sections/CustomSection';
import EducationSection from './sections/EducationSection';
import ExperienceSection from './sections/ExperienceSection';
import LanguagesSection from './sections/LanguagesSection';
import LinksSection from './sections/LinksSection';
import ProfileSection from './sections/ProfileSection';
import SkillsSection from './sections/SkillsSection';
import { techPicks } from './stackUtils';
import { TECH_CATALOG } from './techCatalog';
import '../../styles/editor.css';

const LEVELS_LIST_ID = 'ed-language-levels';
const ADD_SECTION_ID = 'ed-add-custom-section';

// Formulaire d'édition du CV. Toute modification passe par update(recipe, opts) :
// la recipe mute un brouillon de data ; { checkpoint: true } crée une étape
// d'annulation distincte (ajout, suppression, déplacement).
export default function Editor({ data, update, lang = 'fr', settings, updateSettings, onContactCommit }) {
  const [openKeys, setOpenKeys] = useState(() => new Set([panelKey('personal')]));

  const setOpen = useCallback((key, value) => {
    setOpenKeys((prev) => {
      if (prev.has(key) === value) return prev;
      const next = new Set(prev);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const ui = useMemo(
    () => ({
      lang,
      isOpen: (key) => openKeys.has(key),
      setOpen,
      toggle: (key) => setOpen(key, !openKeys.has(key)),
    }),
    [lang, openKeys, setOpen],
  );

  // Technologies déjà saisies dans le CV, proposées pour la stack technique de chaque expérience.
  const { experiences, otherExperiences, mainSkills } = data;
  const stackPicks = useMemo(
    () => techPicks({ experiences, otherExperiences, mainSkills }, TECH_CATALOG),
    [experiences, otherExperiences, mainSkills],
  );

  const moveSection = (from, to, focusId, fallbackId) => {
    if (to < 0 || to >= data.sections.length) return;
    update((draft) => {
      draft.sections = moveItem(draft.sections, from, to);
    }, { checkpoint: true });
    focusSoon(focusId, { fallbackId });
  };

  // Section libre (liste avec un titre) ou ligne de texte (texte simple, sans titre) : on commence
  // par le titre de la première, par le texte de la seconde.
  const addCustomSection = (layout = 'list') => {
    const custom = newCustomSection(layout);
    const key = customSectionKey(custom);
    update((draft) => {
      draft.customSections.push(structuredClone(custom));
      draft.sections.push({ id: key, title: '', visible: true });
    }, { checkpoint: true });
    setOpen(panelKey(key), true);
    focusSoon(layout === 'text' ? `${fieldId(custom.id, 'items')}-0` : fieldId(custom.id, 'title'));
  };

  const removeCustomSection = (custom, entry) => {
    const title = (entry.title || custom.title).trim() || (custom.layout === 'text' ? 'Ligne de texte' : 'Section libre');
    if (!isBlankItem(custom) && !window.confirm(deleteConfirmMessage(title, undoShortcut()))) return;
    update((draft) => {
      draft.customSections = draft.customSections.filter((c) => c.id !== custom.id);
      draft.sections = draft.sections.filter((s) => s.id !== entry.id);
    }, { checkpoint: true });
    focusSoon(ADD_SECTION_ID);
  };

  const renderSection = (entry) => {
    switch (entry.id) {
      case 'profile':
        return <ProfileSection objective={data.personalInfo.objective} update={update} />;
      case 'skills':
        return <SkillsSection groups={data.mainSkills} update={update} />;
      case 'experiences':
      case 'otherExperiences':
        return (
          <ExperienceSection field={entry.id} items={data[entry.id]} update={update} stackPicks={stackPicks} />
        );
      case 'education':
        return <EducationSection items={data.education} update={update} />;
      case 'links':
        return <LinksSection items={data.socialLinks} update={update} />;
      case 'languages':
        return <LanguagesSection items={data.languages} update={update} levelsListId={LEVELS_LIST_ID} />;
      case 'certifications':
        return <CertificationsSection items={data.certifications} update={update} />;
      default: {
        const custom = data.customSections.find((c) => customSectionKey(c) === entry.id);
        return custom ? (
          <CustomSection
            custom={custom}
            entry={entry}
            update={update}
            onRemove={() => removeCustomSection(custom, entry)}
          />
        ) : null;
      }
    }
  };

  return (
    <EditorUiContext.Provider value={ui}>
      <aside className="editor-sidebar no-print" aria-label="Éditeur du CV">
        <div className="editor-header">
          <h2>Éditeur de CV</h2>
          <p>Vos modifications s'affichent en direct dans l'aperçu.</p>
        </div>

        <PersonalInfoPanel
          personalInfo={data.personalInfo}
          update={update}
          showPhoto={settings?.showPhoto}
          template={settings?.template}
          updateSettings={updateSettings}
          onContactCommit={onContactCommit}
        />

        {data.sections.map((entry, index) => (
          <SectionPanel
            key={entry.id}
            entry={entry}
            index={index}
            total={data.sections.length}
            data={data}
            update={update}
            lang={lang}
            settings={settings}
            onMove={moveSection}
          >
            {renderSection(entry)}
          </SectionPanel>
        ))}

        <div className="editor-add-sections">
          <button type="button" id={ADD_SECTION_ID} className="editor-add-section" onClick={() => addCustomSection()}>
            <Plus size={16} aria-hidden="true" /> Ajouter une section libre
          </button>
          <button type="button" className="editor-add-section" onClick={() => addCustomSection('text')}>
            <Plus size={16} aria-hidden="true" /> Ajouter une ligne de texte
          </button>
        </div>
        <p className="editor-hint editor-add-section-hint">
          Section libre : centres d'intérêt, bénévolat, publications… avec le titre de votre choix. Ligne de texte :
          une phrase seule, sans titre (disponibilité, permis, mobilité…), dans la colonne latérale ou la colonne
          principale.
        </p>

        <datalist id={LEVELS_LIST_ID}>
          {(LANGUAGE_LEVELS[lang] || LANGUAGE_LEVELS.fr).map((level) => (
            <option key={level} value={level} />
          ))}
        </datalist>
      </aside>
    </EditorUiContext.Provider>
  );
}

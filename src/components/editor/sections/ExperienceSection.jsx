import { useState } from 'react';
import { Briefcase, Building2, Calendar, MapPin, Plus, X } from 'lucide-react';
import { newExperience } from '../../../lib/schema';
import BulletListEditor from '../BulletListEditor';
import ItemList from '../ItemList';
import TagInput from '../TagInput';
import TextField from '../TextField';
import { focusSoon } from '../editorUi';
import { fieldId } from '../listUtils';
import { tagSuggestions } from '../stackUtils';
import { TECH_CATALOG } from '../techCatalog';

const CONFIG = {
  experiences: {
    addLabel: 'Ajouter une expérience',
    emptyText:
      "Aucune expérience pour l'instant. Commencez par la plus récente : les suivantes s'ajoutent en dessous.",
    title: 'Ex. Assistante de direction',
    company: 'Ex. Boulangerie Martin',
    location: 'Ex. Lyon',
    bullet: "Ex. Accueil et conseil d'une quarantaine de clients par jour",
  },
  otherExperiences: {
    addLabel: 'Ajouter une autre expérience',
    emptyText:
      'Bénévolat, job étudiant, projet associatif… Tout ce qui montre vos qualités a sa place ici.',
    title: 'Ex. Bénévole',
    company: 'Ex. Banque alimentaire du Rhône',
    location: 'Ex. Villeurbanne',
    bullet: 'Ex. Organisation de la collecte annuelle avec une équipe de 15 bénévoles',
  },
};

const STACK_LABEL = 'Stack technique';

function ExperienceBody({ exp, patch, config, stackPicks }) {
  // Le bloc « Stack technique », ajouté mais encore vide, doit rester affiché pendant la saisie.
  const [stackOpened, setStackOpened] = useState(false);
  const showStack = exp.stack.length > 0 || stackOpened;
  const stackId = fieldId(exp.id, 'stack');
  const addStackId = fieldId(exp.id, 'add', 'stack');

  const addStack = () => {
    setStackOpened(true);
    focusSoon(stackId);
  };

  const removeStack = () => {
    patch({ stack: [] }, { checkpoint: true });
    setStackOpened(false);
    focusSoon(addStackId);
  };

  return (
    <>
      <TextField
        id={fieldId(exp.id, 'title')}
        label="Intitulé du poste"
        icon={Briefcase}
        value={exp.title}
        placeholder={config.title}
        onChange={(title) => patch({ title })}
      />
      <TextField
        id={fieldId(exp.id, 'company')}
        label="Entreprise ou structure"
        icon={Building2}
        value={exp.company}
        placeholder={config.company}
        onChange={(company) => patch({ company })}
      />
      <div className="editor-grid">
        <TextField
          id={fieldId(exp.id, 'location')}
          className="editor-field-narrow"
          label="Lieu"
          icon={MapPin}
          value={exp.location}
          placeholder={config.location}
          onChange={(location) => patch({ location })}
        />
        <TextField
          id={fieldId(exp.id, 'period')}
          className="editor-field-wide"
          label="Période"
          icon={Calendar}
          value={exp.period}
          placeholder="03/2023 – Aujourd'hui"
          onChange={(period) => patch({ period })}
        />
      </div>
      <BulletListEditor
        idBase={fieldId(exp.id, 'details')}
        items={exp.details}
        label="Missions et réalisations"
        placeholder={config.bullet}
        hidden={exp.hiddenDetails}
        onChange={(details, opts, hiddenDetails) =>
          patch(hiddenDetails ? { details, hiddenDetails } : { details }, opts)
        }
      />
      {showStack ? (
        <div id={fieldId(exp.id, 'stack', 'block')} className="editor-block">
          <button
            type="button"
            className="editor-block-remove"
            aria-label={`Retirer ce bloc : ${STACK_LABEL}`}
            data-discard-draft={fieldId(exp.id, 'stack', 'block')}
            onClick={removeStack}
          >
            <X size={12} aria-hidden="true" /> Retirer ce bloc
          </button>
          <TagInput
            id={stackId}
            label={STACK_LABEL}
            tags={exp.stack}
            placeholder="Ex. React, puis Entrée"
            morePlaceholder="Autre technologie…"
            hint="Choisissez une suggestion ou tapez le nom, puis Entrée ou virgule."
            suggest={(query, tags) => tagSuggestions({ picks: stackPicks, catalog: TECH_CATALOG, tags, query })}
            onChange={(stack) => patch({ stack }, { checkpoint: true })}
          />
        </div>
      ) : (
        <div className="editor-block-adds">
          <span className="editor-hint">Bloc facultatif :</span>
          <button type="button" id={addStackId} className="add-btn-tiny" onClick={addStack}>
            <Plus size={12} aria-hidden="true" /> {STACK_LABEL}
          </button>
        </div>
      )}
    </>
  );
}

// Expériences professionnelles ou autres expériences (même formulaire, `field` choisit la liste).
// stackPicks : technologies déjà saisies ailleurs dans le CV, proposées d'un clic.
export default function ExperienceSection({ field, items, update, stackPicks = [] }) {
  const config = CONFIG[field];
  return (
    <ItemList
      field={field}
      items={items}
      update={update}
      create={newExperience}
      kind="experience"
      firstField="title"
      addLabel={config.addLabel}
      emptyText={config.emptyText}
      hiddenNote="Cette expérience est masquée : elle reste enregistrée mais n'apparaît pas sur le CV."
      renderBody={(exp, { patch }) => (
        <ExperienceBody exp={exp} patch={patch} config={config} stackPicks={stackPicks} />
      )}
    />
  );
}

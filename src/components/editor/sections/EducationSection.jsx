import { useState } from 'react';
import { Building2, Calendar, GraduationCap, Link, MapPin, Plus, X } from 'lucide-react';
import { newEducation } from '../../../lib/schema';
import BulletListEditor from '../BulletListEditor';
import ItemList from '../ItemList';
import TagInput from '../TagInput';
import TextField from '../TextField';
import { focusSoon } from '../editorUi';
import { fieldId } from '../listUtils';

// Blocs facultatifs d'une formation, ajoutés à la demande.
const BLOCKS = [
  {
    key: 'objectives',
    label: 'Objectifs',
    addLabel: 'Objectifs',
    placeholder: 'Ex. Encadrer une équipe, puis Entrée',
    morePlaceholder: 'Autre objectif…',
  },
  {
    key: 'tools',
    label: 'Outils et méthodes',
    addLabel: 'Outils',
    placeholder: 'Ex. Excel, puis Entrée',
    morePlaceholder: 'Autre outil…',
  },
];

function EducationBody({ edu, patch }) {
  // Un bloc ajouté mais encore vide doit rester affiché pendant la saisie.
  const [opened, setOpened] = useState({});
  const isShown = (key) => edu[key].length > 0 || opened[key];

  const addBlock = (key) => {
    setOpened((prev) => ({ ...prev, [key]: true }));
    focusSoon(fieldId(edu.id, key));
  };

  const removeBlock = (key) => {
    patch({ [key]: [] }, { checkpoint: true });
    setOpened((prev) => ({ ...prev, [key]: false }));
    focusSoon(fieldId(edu.id, 'add', key));
  };

  const missing = BLOCKS.filter((b) => !isShown(b.key));

  return (
    <>
      <TextField
        id={fieldId(edu.id, 'title')}
        label="Intitulé de la formation"
        icon={GraduationCap}
        value={edu.title}
        placeholder="Ex. BTS Management commercial opérationnel"
        onChange={(title) => patch({ title })}
      />
      <TextField
        id={fieldId(edu.id, 'school')}
        label="Établissement"
        icon={Building2}
        value={edu.school}
        placeholder="Ex. Lycée Jean Moulin"
        onChange={(school) => patch({ school })}
      />
      <div className="editor-grid">
        <TextField
          id={fieldId(edu.id, 'degree')}
          label="Diplôme / niveau"
          value={edu.degree}
          placeholder="Ex. Bac +2"
          onChange={(degree) => patch({ degree })}
        />
        <TextField
          id={fieldId(edu.id, 'location')}
          label="Lieu"
          icon={MapPin}
          value={edu.location}
          placeholder="Ex. Nantes"
          onChange={(location) => patch({ location })}
        />
      </div>
      <TextField
        id={fieldId(edu.id, 'period')}
        label="Période"
        icon={Calendar}
        value={edu.period}
        placeholder="09/2019 – 06/2021"
        onChange={(period) => patch({ period })}
      />
      <BulletListEditor
        idBase={fieldId(edu.id, 'details')}
        items={edu.details}
        label="Points marquants (facultatif)"
        placeholder="Ex. Mention bien, stage de huit semaines en magasin"
        hidden={edu.hiddenDetails}
        onChange={(details, opts, hiddenDetails) => patch(hiddenDetails ? { details, hiddenDetails } : { details }, opts)}
      />
      {BLOCKS.filter((b) => isShown(b.key)).map((block) => (
        <div key={block.key} id={fieldId(edu.id, block.key, 'block')} className="editor-block">
          <button
            type="button"
            className="editor-block-remove"
            aria-label={`Retirer ce bloc : ${block.label}`}
            data-discard-draft={fieldId(edu.id, block.key, 'block')}
            onClick={() => removeBlock(block.key)}
          >
            <X size={12} aria-hidden="true" /> Retirer ce bloc
          </button>
          <TagInput
            id={fieldId(edu.id, block.key)}
            label={block.label}
            tags={edu[block.key]}
            placeholder={block.placeholder}
            morePlaceholder={block.morePlaceholder}
            onChange={(next) => patch({ [block.key]: next }, { checkpoint: true })}
          />
        </div>
      ))}
      {missing.length > 0 && (
        <div className="editor-block-adds">
          <span className="editor-hint">Blocs facultatifs :</span>
          {missing.map((block) => (
            <button
              key={block.key}
              type="button"
              id={fieldId(edu.id, 'add', block.key)}
              className="add-btn-tiny"
              onClick={() => addBlock(block.key)}
            >
              <Plus size={12} aria-hidden="true" /> {block.addLabel}
            </button>
          ))}
        </div>
      )}
      <TextField
        id={fieldId(edu.id, 'link')}
        label="Lien vers le programme (facultatif)"
        icon={Link}
        type="url"
        value={edu.link}
        placeholder="https://…"
        onChange={(link) => patch({ link })}
      />
    </>
  );
}

// Section « Formation ».
export default function EducationSection({ items, update }) {
  return (
    <ItemList
      field="education"
      items={items}
      update={update}
      create={newEducation}
      kind="education"
      firstField="title"
      addLabel="Ajouter une formation"
      emptyText="Aucune formation pour l'instant. Diplômes, titres professionnels, formations continues…"
      hiddenNote="Cette formation est masquée : elle reste enregistrée mais n'apparaît pas sur le CV."
      renderBody={(edu, { patch }) => <EducationBody edu={edu} patch={patch} />}
    />
  );
}

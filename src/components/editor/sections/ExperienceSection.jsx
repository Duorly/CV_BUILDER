import { Briefcase, Building2, Calendar, MapPin } from 'lucide-react';
import { newExperience } from '../../../lib/schema';
import BulletListEditor from '../BulletListEditor';
import ItemList from '../ItemList';
import TextField from '../TextField';
import { fieldId } from '../listUtils';

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

// Expériences professionnelles ou autres expériences (même formulaire, `field` choisit la liste).
export default function ExperienceSection({ field, items, update }) {
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
            onChange={(details, opts) => patch({ details }, opts)}
          />
        </>
      )}
    />
  );
}

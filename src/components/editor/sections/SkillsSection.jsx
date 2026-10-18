import { newSkillGroup } from '../../../lib/schema';
import ItemList from '../ItemList';
import TagInput from '../TagInput';
import TextField from '../TextField';
import { fieldId } from '../listUtils';

// Section « Compétences » : groupes au nom facultatif, compétences en étiquettes.
export default function SkillsSection({ groups, update }) {
  return (
    <ItemList
      field="mainSkills"
      items={groups}
      update={update}
      create={newSkillGroup}
      kind="skills"
      firstField="category"
      addLabel="Ajouter un groupe de compétences"
      emptyText="Aucune compétence pour l'instant. Regroupez-les par thème (accueil, logiciels, qualités…) ou laissez le nom du groupe vide."
      renderBody={(group, { patch }) => (
        <>
          <TextField
            id={fieldId(group.id, 'category')}
            label="Nom du groupe (facultatif)"
            value={group.category}
            placeholder="Ex. Relation client"
            onChange={(category) => patch({ category })}
          />
          <TagInput
            id={fieldId(group.id, 'skills')}
            label="Compétences"
            tags={group.skills}
            placeholder="Ex. Gestion de projet, puis Entrée"
            morePlaceholder="Autre compétence…"
            hint="Entrée ou virgule pour ajouter · cliquez sur une compétence pour la modifier."
            onChange={(skills) => patch({ skills }, { checkpoint: true })}
          />
        </>
      )}
    />
  );
}

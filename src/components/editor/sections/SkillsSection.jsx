import { newSkillGroup } from '../../../lib/schema';
import ItemList from '../ItemList';
import TagInput from '../TagInput';
import TextField from '../TextField';
import { carryHidden, fieldId } from '../listUtils';

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
      hiddenNote="Ce groupe est masqué : ses compétences restent enregistrées mais n'apparaissent pas sur le CV."
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
            hint="Entrée ou virgule pour ajouter · cliquez sur une compétence pour la modifier · l’œil la masque sur le CV."
            hiddenTags={group.hiddenSkills}
            onToggleHidden={(skill) =>
              patch(
                {
                  hiddenSkills: group.hiddenSkills.includes(skill)
                    ? group.hiddenSkills.filter((s) => s !== skill)
                    : [...group.hiddenSkills, skill],
                },
                { checkpoint: true },
              )
            }
            onChange={(skills) =>
              patch({ skills, hiddenSkills: carryHidden(group.skills, skills, group.hiddenSkills) }, { checkpoint: true })
            }
          />
        </>
      )}
    />
  );
}

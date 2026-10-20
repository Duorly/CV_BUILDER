import { newLanguage } from '../../../lib/schema';
import ItemList from '../ItemList';
import TextField from '../TextField';
import { fieldId } from '../listUtils';

// Section « Langues » : niveau proposé dans une liste (datalist), texte libre accepté.
export default function LanguagesSection({ items, update, levelsListId }) {
  return (
    <ItemList
      field="languages"
      items={items}
      update={update}
      create={newLanguage}
      kind="language"
      firstField="name"
      addLabel="Ajouter une langue"
      emptyText="Aucune langue pour l'instant."
      hiddenNote="Cette langue est masquée : elle reste enregistrée mais n'apparaît pas sur le CV."
      renderBody={(language, { patch }) => (
        <div className="editor-grid">
          <TextField
            id={fieldId(language.id, 'name')}
            className="editor-field-narrow"
            label="Langue"
            value={language.name}
            placeholder="Ex. Espagnol"
            onChange={(name) => patch({ name })}
          />
          <TextField
            id={fieldId(language.id, 'level')}
            className="editor-field-wide"
            label="Niveau"
            value={language.level}
            placeholder="Choisir ou écrire"
            list={levelsListId}
            autoComplete="off"
            hint="Liste proposée ou texte libre."
            onChange={(level) => patch({ level })}
          />
        </div>
      )}
    />
  );
}

import { Trash2 } from 'lucide-react';
import BulletListEditor from '../BulletListEditor';
import TextField from '../TextField';
import { applySectionTitle, fieldId } from '../listUtils';

// Section libre : centres d'intérêt, bénévolat, permis… avec une liste d'éléments.
export default function CustomSection({ custom, entry, update, onRemove }) {
  const mutate = (fn, opts) =>
    update((draft) => {
      const target = draft.customSections.find((c) => c.id === custom.id);
      if (target) fn(target);
    }, opts);

  return (
    <>
      <TextField
        id={fieldId(custom.id, 'title')}
        label="Titre de la section"
        value={entry.title || custom.title}
        placeholder="Ex. Centres d'intérêt, Bénévolat, Permis"
        onChange={(title) => update((draft) => applySectionTitle(draft, entry.id, title))}
      />
      <div className="form-group mini">
        <label htmlFor={fieldId(custom.id, 'column')}>Emplacement dans le modèle design</label>
        <select
          id={fieldId(custom.id, 'column')}
          value={custom.column}
          onChange={(e) => {
            const column = e.target.value === 'sidebar' ? 'sidebar' : 'main';
            mutate((target) => {
              target.column = column;
            }, { checkpoint: true });
          }}
        >
          <option value="main">Colonne principale</option>
          <option value="sidebar">Colonne latérale</option>
        </select>
      </div>
      <div className="form-group mini">
        <label htmlFor={fieldId(custom.id, 'layout')}>Présentation des éléments</label>
        <select
          id={fieldId(custom.id, 'layout')}
          value={custom.layout}
          onChange={(e) => {
            const layout = e.target.value === 'inline' ? 'inline' : 'list';
            mutate((target) => {
              target.layout = layout;
            }, { checkpoint: true });
          }}
        >
          <option value="list">Les uns au-dessus des autres</option>
          <option value="inline">Sur une ligne (séparés par « · »)</option>
        </select>
      </div>
      <BulletListEditor
        idBase={fieldId(custom.id, 'items')}
        items={custom.items}
        label="Éléments"
        placeholder="Ex. Course à pied (semi-marathon)"
        addLabel="Ajouter un élément"
        onChange={(items, opts) =>
          mutate((target) => {
            target.items = items;
          }, opts)
        }
      />
      <div className="editor-danger-zone">
        <button type="button" className="add-btn-tiny is-danger" onClick={onRemove}>
          <Trash2 size={12} aria-hidden="true" /> Supprimer cette section
        </button>
      </div>
    </>
  );
}

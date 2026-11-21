import { Trash2 } from 'lucide-react';
import BulletListEditor from '../BulletListEditor';
import TextField from '../TextField';
import { applySectionTitle, fieldId } from '../listUtils';

// Section libre : centres d'intérêt, bénévolat, permis… avec une liste d'éléments. En « texte
// simple » (layout 'text'), c'est une ligne de texte : un paragraphe par ligne, titre facultatif.
const LAYOUTS = [
  { value: 'list', label: 'Les uns au-dessus des autres' },
  { value: 'inline', label: 'Sur une ligne (séparés par « · »)' },
  { value: 'text', label: 'Texte simple, sans puces' },
];

export default function CustomSection({ custom, entry, update, onRemove }) {
  const text = custom.layout === 'text';
  const mutate = (fn, opts) =>
    update((draft) => {
      const target = draft.customSections.find((c) => c.id === custom.id);
      if (target) fn(target);
    }, opts);

  return (
    <>
      <TextField
        id={fieldId(custom.id, 'title')}
        label={text ? 'Titre (facultatif)' : 'Titre de la section'}
        value={entry.title || custom.title}
        placeholder={text ? 'Laissez vide pour une simple ligne de texte' : "Ex. Centres d'intérêt, Bénévolat, Permis"}
        onChange={(title) => update((draft) => applySectionTitle(draft, entry.id, title))}
      />
      <div className="form-group mini">
        <label htmlFor={fieldId(custom.id, 'column')}>Emplacement (modèles Design, Classique et Focus)</label>
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
        <label htmlFor={fieldId(custom.id, 'layout')}>Présentation</label>
        <select
          id={fieldId(custom.id, 'layout')}
          value={custom.layout}
          onChange={(e) => {
            const layout = LAYOUTS.some((o) => o.value === e.target.value) ? e.target.value : 'list';
            mutate((target) => {
              target.layout = layout;
            }, { checkpoint: true });
          }}
        >
          {LAYOUTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <BulletListEditor
        idBase={fieldId(custom.id, 'items')}
        items={custom.items}
        label={text ? 'Texte' : 'Éléments'}
        placeholder={text ? 'Ex. Disponible immédiatement, permis B' : 'Ex. Course à pied (semi-marathon)'}
        addLabel={text ? 'Ajouter une ligne' : 'Ajouter un élément'}
        noun={text ? 'ligne' : 'puce'}
        marker={!text}
        hidden={custom.hiddenItems}
        onChange={(items, opts, hiddenItems) =>
          mutate((target) => {
            target.items = items;
            if (hiddenItems) target.hiddenItems = hiddenItems;
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

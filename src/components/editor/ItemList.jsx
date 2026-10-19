import { Plus } from 'lucide-react';
import { isBlankItem } from '../../lib/schema';
import ItemCard from './ItemCard';
import SortableList from './SortableList';
import { focusSoon, useEditorUi } from './editorUi';
import { deleteConfirmMessage, fieldId, itemSummary, moveItem, undoShortcut } from './listUtils';

// Liste d'éléments d'une section (data[field]) : cartes repliables, ajout en fin
// de liste, réordonnancement et suppression confirmée. `hiddenNote` rend les
// éléments masquables sur le CV (champ `hidden`), avec ce message dans la carte.
export default function ItemList({
  field,
  items,
  update,
  create,
  kind,
  firstField,
  addLabel,
  emptyText,
  hiddenNote,
  renderBody,
}) {
  const ui = useEditorUi();
  const addId = fieldId(field, 'add');

  const mutate = (id, fn, opts) =>
    update((draft) => {
      const target = draft[field].find((x) => x.id === id);
      if (target) fn(target);
    }, opts);

  const add = () => {
    const item = create();
    update((draft) => {
      draft[field].push(structuredClone(item));
    }, { checkpoint: true });
    ui.setOpen(item.id, true);
    focusSoon(fieldId(item.id, firstField));
  };

  const remove = (item, label) => {
    if (!isBlankItem(item) && !window.confirm(deleteConfirmMessage(label, undoShortcut()))) return;
    const index = items.findIndex((x) => x.id === item.id);
    const neighbour = items[index - 1] || items[index + 1];
    update((draft) => {
      draft[field] = draft[field].filter((x) => x.id !== item.id);
    }, { checkpoint: true });
    focusSoon(neighbour ? fieldId(neighbour.id, 'toggle') : addId);
  };

  const toggleHidden = (id) =>
    mutate(id, (target) => {
      target.hidden = !target.hidden;
    }, { checkpoint: true });

  const move = (from, to, focusId, fallbackId) => {
    if (to < 0 || to >= items.length || from === to) return;
    update((draft) => {
      draft[field] = moveItem(draft[field], from, to);
    }, { checkpoint: true });
    if (focusId) focusSoon(focusId, { fallbackId });
  };

  return (
    <div className="editor-list">
      {items.length === 0 ? (
        <p className="editor-empty">{emptyText}</p>
      ) : (
        <SortableList ids={items.map((x) => x.id)} onMove={move} className="editor-cards">
          {items.map((item, index) => {
            const summary = itemSummary(kind, item, index);
            return (
              <ItemCard
                key={item.id}
                id={item.id}
                index={index}
                total={items.length}
                summary={summary}
                open={ui.isOpen(item.id)}
                onToggle={() => ui.toggle(item.id)}
                onMove={move}
                onRemove={() => remove(item, summary.title)}
                hidden={Boolean(hiddenNote && item.hidden)}
                onToggleHidden={hiddenNote ? () => toggleHidden(item.id) : undefined}
                hiddenNote={hiddenNote}
              >
                {renderBody(item, {
                  index,
                  patch: (changes, opts) => mutate(item.id, (target) => Object.assign(target, changes), opts),
                  mutate: (fn, opts) => mutate(item.id, fn, opts),
                })}
              </ItemCard>
            );
          })}
        </SortableList>
      )}
      <button type="button" id={addId} className="add-btn-tiny editor-add-btn" onClick={add}>
        <Plus size={14} aria-hidden="true" /> {addLabel}
      </button>
    </div>
  );
}

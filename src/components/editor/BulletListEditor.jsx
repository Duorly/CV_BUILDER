import { useRef } from 'react';
import { ArrowDown, ArrowUp, Circle, Eye, EyeOff, GripVertical, Plus, X } from 'lucide-react';
import AutoTextarea from './AutoTextarea';
import SortableList, { useSortableRow } from './SortableList';
import { focusSoon } from './editorUi';
import {
  BULLET_WARN,
  insertAt,
  moveItem,
  pasteIntoBullet,
  removeAt,
  replaceAt,
  splitBulletAt,
} from './listUtils';

let keySeq = 0;
const newKey = () => `bullet-${++keySeq}`;

// Clés React stables pour des puces qui ne sont que des chaînes : le focus et
// l'animation de glisser-déposer suivent la bonne puce. Si la liste change
// ailleurs (annuler, IA…), les clés sont simplement régénérées.
function useStableKeys(length) {
  const ref = useRef([]);
  if (ref.current.length !== length) ref.current = Array.from({ length }, newKey);
  return ref;
}

const indexesOf = (flags) => flags.flatMap((flag, i) => (flag ? [i] : []));

// Éditeur de puces : Entrée crée la puce suivante, Retour arrière sur une puce vide
// la supprime, Alt+↑/↓ (ou les flèches, ou la poignée) la déplace.
// Avec `hidden` (indices des puces masquées sur le CV), chaque puce a un bouton œil ;
// les indices suivent les puces déplacées, ajoutées ou supprimées et sont rendus
// en troisième argument de onChange(items, opts, hidden).
export default function BulletListEditor({
  idBase,
  items,
  onChange,
  label,
  placeholder,
  addLabel = 'Ajouter une puce',
  hidden,
}) {
  const keysRef = useStableKeys(items.length);
  const keys = keysRef.current;
  const hideable = Array.isArray(hidden);
  const flags = items.map((_, i) => hideable && hidden.includes(i));
  const inputId = (i) => `${idBase}-${i}`;
  const hintId = `${idBase}-hint`;
  const labelId = `${idBase}-label`;

  const commit = (nextItems, nextKeys, opts, nextFlags = flags) => {
    keysRef.current = nextKeys;
    onChange(nextItems, opts, hideable ? indexesOf(nextFlags) : undefined);
  };

  const toggleHidden = (i) =>
    commit(items, keys, { checkpoint: true }, flags.map((flag, k) => (k === i ? !flag : flag)));

  const setText = (i, value) => {
    // Une puce = un paragraphe : les retours à la ligne (glisser-déposer) deviennent des espaces.
    onChange(replaceAt(items, i, value.replace(/[\r\n]+/g, ' ')));
  };

  const append = () => {
    commit([...items, ''], [...keys, newKey()], { checkpoint: true }, [...flags, false]);
    focusSoon(inputId(items.length));
  };

  const remove = (i) => {
    commit(removeAt(items, i), removeAt(keys, i), { checkpoint: true }, removeAt(flags, i));
    if (items.length > 1) focusSoon(inputId(Math.max(0, i - 1)), { caret: 'end' });
    else focusSoon(`${idBase}-add`);
  };

  const move = (from, to, focusTarget) => {
    if (to < 0 || to >= items.length || from === to) return;
    commit(moveItem(items, from, to), moveItem(keys, from, to), { checkpoint: true }, moveItem(flags, from, to));
    if (focusTarget === 'input') focusSoon(inputId(to));
    else if (focusTarget) {
      const other = focusTarget === 'up' ? 'down' : 'up';
      focusSoon(`${inputId(to)}-${focusTarget}`, { fallbackId: `${inputId(to)}-${other}` });
    }
  };

  const handleKeyDown = (e, i) => {
    if (e.nativeEvent.isComposing) return;
    const el = e.currentTarget;
    if (e.key === 'Enter') {
      e.preventDefault();
      const { items: next, focusIndex } = splitBulletAt(items, i, el.selectionStart, el.selectionEnd);
      commit(next, insertAt(keys, i + 1, newKey()), { checkpoint: true }, insertAt(flags, i + 1, false));
      focusSoon(inputId(focusIndex), { caret: 0 });
    } else if (e.key === 'Backspace' && items[i] === '' && items.length > 1) {
      e.preventDefault();
      commit(removeAt(items, i), removeAt(keys, i), { checkpoint: true }, removeAt(flags, i));
      if (i > 0) focusSoon(inputId(i - 1), { caret: 'end' });
      else focusSoon(inputId(0), { caret: 0 });
    } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      move(i, e.key === 'ArrowUp' ? i - 1 : i + 1, 'input');
    }
  };

  const handlePaste = (e, i) => {
    const el = e.currentTarget;
    const result = pasteIntoBullet(items, i, el.selectionStart, el.selectionEnd, e.clipboardData.getData('text'));
    if (!result) return;
    e.preventDefault();
    const added = Math.max(0, result.items.length - items.length);
    const nextKeys = insertAt(keys, i + 1, ...Array.from({ length: added }, newKey));
    commit(result.items, nextKeys, { checkpoint: true }, insertAt(flags, i + 1, ...Array(added).fill(false)));
    focusSoon(inputId(result.focusIndex), { caret: result.caret });
  };

  return (
    <div className="editor-bullets" role="group" aria-labelledby={labelId}>
      <div className="editor-subheader">
        <span id={labelId} className="editor-sublabel">
          {label}
        </span>
      </div>
      {items.length > 0 && (
        <SortableList ids={keys} onMove={(from, to) => move(from, to)} className="editor-bullet-list">
          {items.map((text, i) => (
            <BulletRow
              key={keys[i]}
              sortId={keys[i]}
              id={inputId(i)}
              index={i}
              total={items.length}
              text={text}
              label={label}
              hintId={hintId}
              placeholder={i === 0 ? placeholder : ''}
              onText={(value) => setText(i, value)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              onPaste={(e) => handlePaste(e, i)}
              onMove={(to, focusTarget) => move(i, to, focusTarget)}
              onRemove={() => remove(i)}
              isHidden={flags[i]}
              onToggleHidden={hideable ? () => toggleHidden(i) : undefined}
            />
          ))}
        </SortableList>
      )}
      <button type="button" id={`${idBase}-add`} className="add-btn-tiny" onClick={append}>
        <Plus size={12} aria-hidden="true" /> {addLabel}
      </button>
      {items.length > 0 && (
        <p id={hintId} className="editor-hint">
          Entrée : nouvelle puce · Retour arrière sur une puce vide : la supprimer
          <span className="editor-hint-keys"> · Alt + ↑/↓ : déplacer</span>.
        </p>
      )}
    </div>
  );
}

function BulletRow({
  sortId,
  id,
  index,
  total,
  text,
  label,
  hintId,
  placeholder,
  onText,
  onKeyDown,
  onPaste,
  onMove,
  onRemove,
  isHidden,
  onToggleHidden,
}) {
  const { rowProps, handleProps, isDragging } = useSortableRow(sortId);
  const length = text.trim().length;
  const tooLong = length > BULLET_WARN;
  const counterId = `${id}-count`;

  return (
    <li
      {...rowProps}
      className={`detail-row premium${isDragging ? ' is-dragging' : ''}${tooLong ? ' is-long' : ''}${isHidden ? ' is-hidden' : ''}`}
    >
      <button
        type="button"
        className="detail-drag-handle"
        {...handleProps}
        aria-roledescription="poignée de déplacement"
        aria-label={`Déplacer la puce ${index + 1}`}
        title="Glisser pour déplacer"
      >
        <GripVertical size={14} aria-hidden="true" />
      </button>
      <span className="detail-bullet" aria-hidden="true">
        <Circle size={6} fill="currentColor" strokeWidth={3} />
      </span>
      <div className="detail-main">
        <label htmlFor={id} className="editor-sr-only">
          {`${label}, puce ${index + 1}`}
        </label>
        <AutoTextarea
          id={id}
          className="detail-input"
          value={text}
          placeholder={placeholder}
          aria-describedby={tooLong ? `${hintId} ${counterId}` : hintId}
          onChange={(e) => onText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
        />
        {isHidden && <span className="editor-bullet-hidden">Masquée : n’apparaît pas sur le CV</span>}
        {tooLong && (
          <span id={counterId} className="editor-bullet-warn">
            {`${length} caractères : un peu long, visez moins de ${BULLET_WARN}.`}
          </span>
        )}
      </div>
      {/* Compteur flottant (affiché au focus) : ne modifie pas la hauteur de la ligne. */}
      <span className="editor-bullet-count" aria-hidden="true">
        {`${length} / ${BULLET_WARN}`}
      </span>
      <div className="detail-actions">
        <div className="detail-move">
          <button
            type="button"
            id={`${id}-up`}
            className="detail-move-btn"
            aria-label={`Monter la puce ${index + 1}`}
            title="Monter (Alt + ↑)"
            disabled={index === 0}
            onClick={() => onMove(index - 1, 'up')}
          >
            <ArrowUp size={12} aria-hidden="true" />
          </button>
          <button
            type="button"
            id={`${id}-down`}
            className="detail-move-btn"
            aria-label={`Descendre la puce ${index + 1}`}
            title="Descendre (Alt + ↓)"
            disabled={index === total - 1}
            onClick={() => onMove(index + 1, 'down')}
          >
            <ArrowDown size={12} aria-hidden="true" />
          </button>
        </div>
        {onToggleHidden && (
          <button
            type="button"
            id={`${id}-visibility`}
            className={`detail-hide-btn${isHidden ? ' is-active' : ''}`}
            aria-label={isHidden ? `Afficher la puce ${index + 1} sur le CV` : `Masquer la puce ${index + 1} sur le CV`}
            title={isHidden ? 'Afficher sur le CV' : 'Masquer sur le CV'}
            onClick={onToggleHidden}
          >
            {isHidden ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
          </button>
        )}
        <button
          type="button"
          id={`${id}-remove`}
          className="remove-btn-icon-tiny"
          aria-label={`Supprimer la puce ${index + 1}`}
          title="Supprimer cette puce"
          onClick={onRemove}
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

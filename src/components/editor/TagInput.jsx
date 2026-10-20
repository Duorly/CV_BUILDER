import { useRef, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { afterPointerRelease, isDiscardingDraftOf, startPointerTracking } from './editorUi';
import { applyTagDraft, hasTagSeparator, removeAt, sameList, splitTagDraft } from './listUtils';

// Clés stables même si une étiquette apparaît deux fois (données importées).
function tagKeys(tags) {
  const seen = new Map();
  return tags.map((tag) => {
    const n = (seen.get(tag) || 0) + 1;
    seen.set(tag, n);
    return `${tag}#${n}`;
  });
}

// Garde le focus dans le champ quand on clique sur une étiquette (pas de blur parasite).
const keepFocus = (e) => e.preventDefault();

// Champ à étiquettes : Entrée, virgule ou point-virgule valide la saisie ; Retour
// arrière sur un champ vide retire la dernière ; un clic sur une étiquette la modifie.
// La saisie en cours vit dans un état local et n'est découpée qu'à la validation,
// pour que les espaces tapés restent (« Gestion de projet »).
// Avec onToggleHidden, chaque étiquette a un bouton œil ; hiddenTags liste celles masquées sur le CV.
export default function TagInput({
  id,
  label,
  tags,
  onChange,
  placeholder,
  morePlaceholder = 'Ajouter…',
  hint,
  hiddenTags = [],
  onToggleHidden,
}) {
  const [draft, setDraft] = useState('');
  const [editIndex, setEditIndex] = useState(null);
  const [notice, setNotice] = useState('');
  const inputRef = useRef(null);
  const hintId = `${id}-hint`;
  const noticeId = `${id}-notice`;

  const applyDraft = (text) => {
    const result = applyTagDraft(tags, text, editIndex);
    setNotice(result.duplicates.length ? `« ${result.duplicates[0]} » figure déjà dans la liste.` : '');
    if (!sameList(result.tags, tags)) onChange(result.tags);
    return result.tags;
  };

  const commit = (text = draft) => {
    if (text.trim() || editIndex != null) applyDraft(text);
    setDraft('');
    setEditIndex(null);
  };

  const removeTag = (index) => {
    onChange(removeAt(tags, index));
    setNotice(`Retiré : « ${tags[index]} ».`);
    setEditIndex(null);
    if (editIndex != null) setDraft('');
    inputRef.current?.focus();
  };

  const startEdit = (index) => {
    const value = tags[index];
    const list = draft.trim() || editIndex != null ? applyDraft(draft) : tags;
    const nextIndex = list.indexOf(value);
    setEditIndex(nextIndex === -1 ? null : nextIndex);
    setDraft(nextIndex === -1 ? '' : value);
    if (nextIndex !== -1) setNotice('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && draft === '') {
      if (editIndex != null) {
        e.preventDefault();
        commit('');
      } else if (tags.length) {
        e.preventDefault();
        removeTag(tags.length - 1);
      }
    } else if (e.key === 'Escape' && editIndex != null) {
      e.preventDefault();
      setEditIndex(null);
      setDraft('');
    }
  };

  // Claviers mobiles : la virgule n'arrive pas toujours dans keydown.
  const handleChange = (e) => {
    const value = e.target.value;
    if (!hasTagSeparator(value)) {
      setDraft(value);
      return;
    }
    const { complete, rest } = splitTagDraft(value);
    if (complete.length) applyDraft(complete.join(','));
    setEditIndex(null);
    setDraft(rest);
  };

  // Validation au blur, différée après le clic qui l'a provoqué (voir afterPointerRelease).
  // Sauf si ce clic retire le champ lui-même : valider après coup ferait réapparaître le bloc retiré.
  const commitRef = useRef(commit);
  commitRef.current = commit;
  const handleBlur = (e) => {
    if (isDiscardingDraftOf(e.currentTarget)) return;
    afterPointerRelease(() => commitRef.current());
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text');
    if (!hasTagSeparator(text)) return;
    e.preventDefault();
    const el = e.currentTarget;
    commit(draft.slice(0, el.selectionStart) + text + draft.slice(el.selectionEnd));
  };

  const keys = tagKeys(tags);

  return (
    <div className="form-group mini editor-tag-field">
      <label htmlFor={id}>{label}</label>
      <div
        className="editor-tags"
        onClick={(e) => {
          if (e.target === e.currentTarget) inputRef.current?.focus();
        }}
      >
        {tags.length > 0 && (
          <ul className="editor-tag-list" aria-label={label}>
            {tags.map((tag, i) => {
              const isHidden = hiddenTags.includes(tag);
              return (
                <li
                  key={keys[i]}
                  className={`editor-tag${i === editIndex ? ' is-editing' : ''}${isHidden ? ' is-hidden' : ''}`}
                >
                  <button
                    type="button"
                    className="editor-tag-text"
                    tabIndex={-1}
                    title="Cliquer pour modifier"
                    onMouseDown={keepFocus}
                    onClick={() => startEdit(i)}
                  >
                    {tag}
                    {isHidden && <span className="editor-sr-only"> (masquée sur le CV)</span>}
                  </button>
                  {onToggleHidden && (
                    <button
                      type="button"
                      className="editor-tag-hide"
                      aria-label={isHidden ? `Afficher « ${tag} » sur le CV` : `Masquer « ${tag} » sur le CV`}
                      title={isHidden ? 'Afficher sur le CV' : 'Masquer sur le CV'}
                      onMouseDown={keepFocus}
                      onClick={() => onToggleHidden(tag)}
                    >
                      {isHidden ? <EyeOff size={11} aria-hidden="true" /> : <Eye size={11} aria-hidden="true" />}
                    </button>
                  )}
                  <button
                    type="button"
                    className="editor-tag-remove"
                    aria-label={`Retirer « ${tag} »`}
                    title="Retirer"
                    onMouseDown={keepFocus}
                    onClick={() => removeTag(i)}
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <input
          ref={inputRef}
          id={id}
          type="text"
          className="editor-tag-input"
          value={draft}
          placeholder={editIndex != null ? 'Modifiez puis Entrée' : tags.length ? morePlaceholder : placeholder}
          aria-describedby={`${hintId} ${noticeId}`}
          enterKeyHint="done"
          autoComplete="off"
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={startPointerTracking}
          onBlur={handleBlur}
        />
      </div>
      <p id={hintId} className="editor-hint">
        {hint || 'Entrée ou virgule pour ajouter · cliquez sur une étiquette pour la modifier.'}
      </p>
      <p id={noticeId} className="editor-tag-notice" role="status">
        {notice}
      </p>
    </div>
  );
}

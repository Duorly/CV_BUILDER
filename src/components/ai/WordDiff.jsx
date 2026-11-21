import { useMemo } from 'react';
import { diffWords } from 'diff';

// Avant / après en entier, mots retirés barrés en rouge dans « Avant »,
// mots ajoutés surlignés en vert dans « Après ».
export default function WordDiff({ before, after, emptyLabel = '(vide)' }) {
  const parts = useMemo(() => diffWords(before || '', after || ''), [before, after]);
  return (
    <div className="ai-diff">
      <div className="ai-diff-side ai-diff-before">
        <span className="ai-diff-label">Avant</span>
        <p>
          {before
            ? parts.map((part, i) =>
                part.added ? null : part.removed ? (
                  <del key={i}>{part.value}</del>
                ) : (
                  <span key={i}>{part.value}</span>
                ),
              )
            : <em className="ai-diff-empty">{emptyLabel}</em>}
        </p>
      </div>
      <div className="ai-diff-side ai-diff-after">
        <span className="ai-diff-label">Après</span>
        <p>
          {parts.map((part, i) =>
            part.removed ? null : part.added ? <ins key={i}>{part.value}</ins> : <span key={i}>{part.value}</span>,
          )}
        </p>
      </div>
    </div>
  );
}

// Variante pour une liste (ordre des catégories, ensemble de puces).
export function ListDiff({ before, after, ordered = false }) {
  const List = ordered ? 'ol' : 'ul';
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  return (
    <div className="ai-diff">
      <div className="ai-diff-side ai-diff-before">
        <span className="ai-diff-label">Avant</span>
        <List className="ai-diff-list">
          {before.map((item, i) => (
            <li key={i}>{afterSet.has(item) ? item : <del>{item}</del>}</li>
          ))}
        </List>
      </div>
      <div className="ai-diff-side ai-diff-after">
        <span className="ai-diff-label">Après</span>
        <List className="ai-diff-list">
          {after.map((item, i) => (
            <li key={i}>{beforeSet.has(item) ? item : <ins>{item}</ins>}</li>
          ))}
        </List>
      </div>
    </div>
  );
}

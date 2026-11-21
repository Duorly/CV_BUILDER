import { useEffect, useRef } from 'react';
import { TriangleAlert } from 'lucide-react';
import WordDiff, { ListDiff } from './WordDiff';

const GROUPS = [
  { id: 'profile', title: 'Profil' },
  { id: 'skills', title: 'Compétences' },
  { id: 'experiences', title: 'Expériences professionnelles' },
  { id: 'otherExperiences', title: 'Autres expériences' },
];

function Checkbox({ checked, indeterminate = false, onChange, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <input ref={ref} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />;
}

function Reason({ text }) {
  if (!text) return null;
  return (
    <p className="ai-reason">
      <span>Pourquoi :</span> {text}
    </p>
  );
}

const SKILL_TAGS = {
  confirmed: { tone: 'warn', text: 'ajoutée sur votre confirmation' },
  synonym: { tone: 'warn', text: 'synonyme repéré par l’IA : à vérifier' },
  cv: { tone: 'ok', text: 'déjà citée dans votre CV' },
};

// Proposition suspecte (chiffre absent du CV, puces en plus, synonyme) : jamais cochée d'avance.
function Warnings({ list }) {
  if (!list?.length) return null;
  return (
    <ul className="ai-change-warnings">
      {list.map((text) => (
        <li key={text}>
          <TriangleAlert size={14} aria-hidden="true" />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

function ChangeBody({ change }) {
  if (change.kind === 'text' || change.kind === 'bullet') return <WordDiff before={change.before} after={change.after} />;
  if (change.kind === 'order') return <ListDiff before={change.before} after={change.after} ordered />;
  if (change.kind === 'details') return <ListDiff before={change.before} after={change.after} />;
  if (change.kind === 'skill') {
    return (
      <p className="ai-skill-line">
        Ajouter <strong>« {change.skill} »</strong>{' '}
        {change.newCategory ? (
          <>
            dans une nouvelle catégorie <strong>« {change.newCategory} »</strong>
          </>
        ) : (
          <>
            dans <strong>« {change.categoryLabel} »</strong>
          </>
        )}
        <span className={`ai-tag ai-tag--${(SKILL_TAGS[change.origin] || SKILL_TAGS.cv).tone}`}>
          {(SKILL_TAGS[change.origin] || SKILL_TAGS.cv).text}
        </span>
      </p>
    );
  }
  return null;
}

function ChangeCard({ change, checked, onToggle }) {
  return (
    <li className={`ai-change${checked ? '' : ' is-off'}`}>
      <label className="ai-change-head">
        <input type="checkbox" checked={checked} onChange={(e) => onToggle(change.id, e.target.checked)} />
        <span className="ai-change-label">{change.label}</span>
      </label>
      <div className="ai-change-body">
        <Warnings list={change.warnings} />
        <ChangeBody change={change} />
        <Reason text={change.reason} />
      </div>
    </li>
  );
}

function ExperienceCard({ items, selection, onToggleMany, onToggle }) {
  const first = items[0];
  const ids = items.map((c) => c.id);
  const count = ids.filter((id) => selection.has(id)).length;
  return (
    <li className={`ai-change ai-change--experience${count ? '' : ' is-off'}`}>
      <label className="ai-change-head">
        <Checkbox
          checked={count === ids.length}
          indeterminate={count > 0 && count < ids.length}
          onChange={(value) => onToggleMany(ids, value)}
          label={`Toutes les modifications de ${first.context}`}
        />
        <span className="ai-change-label">{first.context}</span>
        <span className="ai-change-count">
          {items.length > 1 ? `${count}/${items.length} cochées` : ''}
        </span>
      </label>
      <Reason text={first.reason} />
      <ul className="ai-bullets">
        {items.map((change) => (
          <li key={change.id} className={`ai-bullet${selection.has(change.id) ? '' : ' is-off'}`}>
            <label className="ai-bullet-head">
              <input
                type="checkbox"
                checked={selection.has(change.id)}
                onChange={(e) => onToggle(change.id, e.target.checked)}
              />
              <span>{change.label}</span>
            </label>
            <Warnings list={change.warnings} />
            <ChangeBody change={change} />
          </li>
        ))}
      </ul>
    </li>
  );
}

/** Liste complète des modifications proposées, une case à cocher par modification. */
export default function ChangeReview({ changes, selection, onSelectionChange }) {
  const toggle = (id, value) => {
    const next = new Set(selection);
    if (value) next.add(id);
    else next.delete(id);
    onSelectionChange(next);
  };
  const toggleMany = (ids, value) => {
    const next = new Set(selection);
    for (const id of ids) {
      if (value) next.add(id);
      else next.delete(id);
    }
    onSelectionChange(next);
  };
  const selectedCount = changes.filter((c) => selection.has(c.id)).length;
  const flagged = changes.filter((c) => c.warnings?.length).length;

  return (
    <div className="ai-review">
      <div className="ai-review-toolbar">
        <span className="ai-review-count" aria-live="polite">
          {selectedCount} modification{selectedCount > 1 ? 's' : ''} sélectionnée{selectedCount > 1 ? 's' : ''} sur{' '}
          {changes.length}
        </span>
        <span className="ai-review-bulk">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => onSelectionChange(new Set(changes.map((c) => c.id)))}
            disabled={selectedCount === changes.length}
          >
            Tout cocher
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => onSelectionChange(new Set())}
            disabled={selectedCount === 0}
          >
            Tout décocher
          </button>
        </span>
      </div>

      {flagged > 0 && (
        <p className="callout callout-warn ai-review-flagged">
          <TriangleAlert size={16} aria-hidden="true" />
          <span>
            {flagged === 1
              ? '1 proposition est à vérifier (chiffre absent de votre CV, puce ajoutée ou compétence déduite) : elle n’est pas cochée.'
              : `${flagged} propositions sont à vérifier (chiffre absent de votre CV, puce ajoutée ou compétence déduite) : elles ne sont pas cochées.`}{' '}
            Cochez-les seulement si elles sont exactes : un recruteur peut vous interroger sur chaque chiffre.
          </span>
        </p>
      )}

      {GROUPS.map((group) => {
        const items = changes.filter((c) => c.group === group.id);
        if (!items.length) return null;
        const isExperience = group.id === 'experiences' || group.id === 'otherExperiences';
        const clusters = [];
        if (isExperience) {
          for (const change of items) {
            const last = clusters[clusters.length - 1];
            if (last && last[0].itemId === change.itemId) last.push(change);
            else clusters.push([change]);
          }
        }
        return (
          <section key={group.id} className="ai-review-group" aria-label={group.title}>
            <h3 className="ai-review-group-title">{group.title}</h3>
            <ul className="ai-changes">
              {isExperience
                ? clusters.map((cluster) => (
                    <ExperienceCard
                      key={cluster[0].itemId}
                      items={cluster}
                      selection={selection}
                      onToggle={toggle}
                      onToggleMany={toggleMany}
                    />
                  ))
                : items.map((change) => (
                    <ChangeCard key={change.id} change={change} checked={selection.has(change.id)} onToggle={toggle} />
                  ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

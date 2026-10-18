import { Check, Gauge, Lightbulb, ThumbsUp, X } from 'lucide-react';

const IMPORTANCE = {
  essentielle: 'Essentiel',
  importante: 'Important',
  secondaire: 'Secondaire',
};

const FIT_LABELS = {
  faible: 'faible',
  moyenne: 'moyenne',
  bonne: 'bonne',
  forte: 'forte',
};

/**
 * Résultat de l'analyse : mots-clés présents (vert) et manquants (rouge).
 * Pour chaque manquant, la personne indique si elle possède vraiment la
 * compétence : seuls ceux-là pourront être ajoutés au CV.
 */
export default function KeywordAnalysis({ analysis, confirmations, onChange }) {
  const present = analysis.keywords.filter((k) => k.present);
  const missing = analysis.keywords.filter((k) => !k.present);

  const update = (id, patch) => {
    const current = confirmations[id] || { owned: false, context: '' };
    onChange({ ...confirmations, [id]: { ...current, ...patch } });
  };

  if (!analysis.keywords.length) {
    return (
      <div className="ai-analysis">
        <p className="callout callout-warn">
          L’IA n’a relevé aucun mot-clé dans cette offre. Vérifiez que le texte collé est bien celui de l’annonce
          (missions, profil recherché), puis relancez l’analyse.
        </p>
      </div>
    );
  }

  return (
    <div className="ai-analysis">
      {analysis.fit && (
        <div className={`ai-fit ai-fit--${analysis.fit}`}>
          <Gauge size={18} aria-hidden="true" />
          <div>
            <p className="ai-fit-title">
              Adéquation estimée avec l’offre : <strong>{FIT_LABELS[analysis.fit]}</strong>
            </p>
            {analysis.fitComment && <p className="ai-fit-comment">{analysis.fitComment}</p>}
            <p className="ai-fit-note">Estimation indicative de l’IA, pas une note : chaque recruteur et chaque logiciel de tri est différent.</p>
          </div>
        </div>
      )}

      <section className="ai-block" aria-labelledby="ai-kw-present">
        <h3 className="ai-block-title" id="ai-kw-present">
          <span className="ai-dot ai-dot--ok" aria-hidden="true" />
          Déjà dans votre CV ({present.length})
        </h3>
        {present.length ? (
          <ul className="ai-chips">
            {present.map((k) => (
              <li
                key={k.id}
                className={`ai-chip ai-chip--present${k.importance === 'essentielle' ? ' is-key' : ''}`}
                title={k.evidence ? `Dans votre CV : ${k.evidence}` : undefined}
              >
                <Check size={13} aria-hidden="true" />
                {k.term}
                {k.importance === 'essentielle' && <span className="ai-chip-tag">essentiel</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Aucun mot-clé de l’offre n’a été repéré dans votre CV.</p>
        )}
      </section>

      <section className="ai-block" aria-labelledby="ai-kw-missing">
        <h3 className="ai-block-title" id="ai-kw-missing">
          <span className="ai-dot ai-dot--missing" aria-hidden="true" />
          Absents de votre CV ({missing.length})
        </h3>
        {missing.length ? (
          <>
            <p className="ai-block-hint">
              Cochez uniquement ce que vous possédez vraiment : l’IA pourra alors le mettre en avant. Le reste n’est
              jamais ajouté à vos compétences, et une proposition qui le citerait vous est signalée, sans être cochée.
            </p>
            <ul className="ai-missing">
              {missing.map((k) => {
                const c = confirmations[k.id] || { owned: false, context: '' };
                const checkboxId = `ai-own-${k.id}`;
                return (
                  <li key={k.id} className={`ai-missing-row${c.owned ? ' is-owned' : ''}`}>
                    <div className="ai-missing-head">
                      <span className="ai-missing-term">
                        <X size={13} aria-hidden="true" className="ai-missing-icon" />
                        {k.term}
                      </span>
                      <span className={`ai-importance ai-importance--${k.importance}`}>{IMPORTANCE[k.importance]}</span>
                    </div>
                    <label className="ai-own" htmlFor={checkboxId}>
                      <input
                        id={checkboxId}
                        type="checkbox"
                        checked={c.owned}
                        onChange={(e) => update(k.id, { owned: e.target.checked })}
                      />
                      Je possède cette compétence
                    </label>
                    {c.owned && (
                      <input
                        className="input ai-own-context"
                        type="text"
                        value={c.context}
                        onChange={(e) => update(k.id, { context: e.target.value })}
                        placeholder="Précisez où ou comment (facultatif) : ex. « utilisé chaque semaine lors de mon dernier poste »"
                        aria-label={`Contexte pour ${k.term}`}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="muted">Votre CV couvre déjà tous les mots-clés relevés.</p>
        )}
      </section>

      {(analysis.strengths.length > 0 || analysis.improvements.length > 0) && (
        <div className="ai-columns">
          <section className="ai-block ai-block--soft" aria-labelledby="ai-strengths">
            <h3 className="ai-block-title" id="ai-strengths">
              <ThumbsUp size={15} aria-hidden="true" /> Points forts
            </h3>
            <ul className="plain-list">
              {analysis.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>
          <section className="ai-block ai-block--soft" aria-labelledby="ai-improvements">
            <h3 className="ai-block-title" id="ai-improvements">
              <Lightbulb size={15} aria-hidden="true" /> Points à renforcer
            </h3>
            <ul className="plain-list">
              {analysis.improvements.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

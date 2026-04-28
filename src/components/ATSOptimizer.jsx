import { useState } from 'react';
import { X, Sparkles, AlertCircle, CheckCircle2, ChevronRight, ArrowLeft } from 'lucide-react';

const SYSTEM_PROMPT = `Tu es un expert en optimisation de CV pour les systèmes ATS (Applicant Tracking Systems).
Tu reçois un CV au format JSON et une offre d'emploi. Tu dois optimiser le CV pour maximiser son score ATS pour cette offre spécifique.

Règles strictes :
1. Ne jamais inventer ni falsifier des informations — garde toutes les données factuelles exactes
2. Réécris le champ "objective" (résumé professionnel) pour inclure les mots-clés importants de l'offre
3. Réordonne les tableaux mainSkills et softSkills pour mettre en avant les plus pertinentes en premier
4. Reformule les bullets points d'expérience (champ "details") pour utiliser les mots-clés de l'offre tout en restant fidèle aux faits réels
5. Retourne UNIQUEMENT le JSON optimisé, sans aucune explication ni texte supplémentaire avant ou après
6. Respecte exactement la même structure JSON que l'entrée`;

const PROVIDERS = {
  anthropic: {
    label: 'Claude',
    sub: 'Anthropic',
    placeholder: 'sk-ant-api03-…',
    storageKey: 'anthropic_api_key',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    docsLabel: 'Obtenir une clé Anthropic →',
    logo: '✦',
  },
  gemini: {
    label: 'Gemini',
    sub: 'Google',
    placeholder: 'AIzaSy…',
    storageKey: 'gemini_api_key',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    docsLabel: 'Obtenir une clé Google AI →',
    logo: '✦',
  },
};

async function callAnthropic(apiKey, data, jobOffer) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `CV actuel (JSON) :\n${JSON.stringify(data, null, 2)}\n\nOffre d'emploi :\n${jobOffer}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Quota API dépassé. Veuillez patienter quelques instants ou vérifier le solde/les limites de votre clé Anthropic.");
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Erreur API Anthropic: ${response.status}`);
  }

  const result = await response.json();
  return result.content[0]?.text || '';
}

async function callGemini(apiKey, data, jobOffer) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          parts: [
            {
              text: `CV actuel (JSON) :\n${JSON.stringify(data, null, 2)}\n\nOffre d'emploi :\n${jobOffer}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Quota API dépassé (Trop de requêtes). Veuillez patienter quelques instants ou vérifier les limites/facturation de votre clé Google.");
    }
    const errorData = await response.json().catch(() => ({}));
    const msg =
      errorData.error?.message || `Erreur API Gemini: ${response.status}`;
    throw new Error(msg);
  }

  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function extractJson(raw) {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return fenceMatch ? fenceMatch[1].trim() : raw.trim();
}

export default function ATSOptimizer({ data, setData, onClose }) {
  const [provider, setProvider] = useState('anthropic');
  const [apiKeys, setApiKeys] = useState({
    anthropic: localStorage.getItem('anthropic_api_key') || '',
    gemini: localStorage.getItem('gemini_api_key') || '',
  });
  const [jobOffer, setJobOffer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [step, setStep] = useState('input'); // 'input' | 'preview'

  const currentProvider = PROVIDERS[provider];
  const currentKey = apiKeys[provider];

  const handleApiKeyChange = (e) => {
    const val = e.target.value;
    setApiKeys((prev) => ({ ...prev, [provider]: val }));
    localStorage.setItem(currentProvider.storageKey, val);
  };

  const handleProviderChange = (p) => {
    setProvider(p);
    setError('');
  };

  const handleOptimize = async () => {
    if (!jobOffer.trim()) {
      setError("Veuillez coller le texte de l'offre d'emploi.");
      return;
    }
    if (!currentKey.trim()) {
      setError(`Veuillez entrer votre clé API ${currentProvider.sub}.`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const raw =
        provider === 'anthropic'
          ? await callAnthropic(currentKey, data, jobOffer)
          : await callGemini(currentKey, data, jobOffer);

      const optimizedData = JSON.parse(extractJson(raw));
      setPreview(optimizedData);
      setStep('preview');
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("L'IA a renvoyé une réponse invalide. Réessayez.");
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    setData(preview);
    onClose();
  };

  const computeChanges = () => {
    if (!preview) return [];
    const changes = [];

    if (preview.personalInfo?.objective !== data.personalInfo?.objective) {
      changes.push({
        type: 'Résumé professionnel réécrit',
        before: data.personalInfo?.objective,
        after: preview.personalInfo?.objective,
      });
    }

    const beforeSkillsSet = new Set(data.mainSkills?.flatMap((c) => c.skills) ?? []);
    const afterSkills = preview.mainSkills?.flatMap((c) => c.skills) ?? [];
    const addedSkills = afterSkills.filter((s) => !beforeSkillsSet.has(s));
    if (addedSkills.length > 0) {
      changes.push({ type: 'Nouvelles compétences identifiées', list: addedSkills });
    }

    const reorderedCategories = (preview.mainSkills || [])
      .map((cat, i) => {
        const orig = data.mainSkills?.[i];
        return orig && cat.category !== orig.category ? cat.category : null;
      })
      .filter(Boolean);
    if (reorderedCategories.length > 0) {
      changes.push({ type: 'Catégories de compétences réordonnées', list: reorderedCategories });
    }

    const expChanges = (preview.experiences || [])
      .filter((exp, i) => {
        const orig = data.experiences?.[i];
        return orig && JSON.stringify(exp.details) !== JSON.stringify(orig.details);
      })
      .map((exp) => exp.title || 'Expérience');
    if (expChanges.length > 0) {
      changes.push({ type: 'Expériences reformulées', list: expChanges });
    }

    return changes;
  };

  const changes = step === 'preview' ? computeChanges() : [];

  return (
    <div
      className="ats-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="ats-modal">
        {/* Header */}
        <div className="ats-modal-header">
          <div className="ats-modal-title">
            <Sparkles size={18} className="ats-sparkle-icon" />
            <h2>Optimisation ATS par IA</h2>
          </div>
          <button className="ats-close-btn" onClick={onClose} title="Fermer">
            <X size={18} />
          </button>
        </div>

        {/* Step: input */}
        {step === 'input' && (
          <div className="ats-modal-body">
            <p className="ats-description">
              Collez le texte d'une offre d'emploi. L'IA adaptera votre CV — résumé, compétences et
              expériences — pour maximiser votre score ATS et passer les filtres automatiques.
            </p>

            {/* Provider selector */}
            <div className="ats-form-group">
              <label>Modèle IA</label>
              <div className="ats-provider-tabs">
                {Object.entries(PROVIDERS).map(([key, p]) => (
                  <button
                    key={key}
                    className={`ats-provider-tab ${provider === key ? 'active' : ''} ats-provider-tab--${key}`}
                    onClick={() => handleProviderChange(key)}
                    type="button"
                  >
                    <span className="ats-provider-name">{p.label}</span>
                    <span className="ats-provider-sub">{p.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* API key */}
            <div className="ats-form-group">
              <label htmlFor="ats-api-key">Clé API {currentProvider.sub}</label>
              <input
                id="ats-api-key"
                type="password"
                placeholder={currentProvider.placeholder}
                value={currentKey}
                onChange={handleApiKeyChange}
                className="ats-input"
                autoComplete="off"
              />
              <span className="ats-hint">
                Stockée uniquement dans votre navigateur (localStorage), jamais transmise ailleurs.{' '}
                <a href={currentProvider.docsUrl} target="_blank" rel="noreferrer">
                  {currentProvider.docsLabel}
                </a>
              </span>
            </div>

            {/* Job offer */}
            <div className="ats-form-group">
              <label htmlFor="ats-job-offer">Texte de l'offre d'emploi</label>
              <textarea
                id="ats-job-offer"
                placeholder="Collez ici le texte complet de l'offre (titre du poste, missions, compétences requises, profil recherché…)"
                value={jobOffer}
                onChange={(e) => setJobOffer(e.target.value)}
                className="ats-textarea"
                rows={10}
              />
            </div>

            {error && (
              <div className="ats-error">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <button
              className="ats-submit-btn"
              onClick={handleOptimize}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="ats-spinner" />
                  Analyse en cours…
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  Optimiser mon CV
                </>
              )}
            </button>
          </div>
        )}

        {/* Step: preview */}
        {step === 'preview' && preview && (
          <div className="ats-modal-body">
            <div className="ats-preview-header">
              <CheckCircle2 size={18} className="ats-success-icon" />
              <p>
                <strong>Optimisation terminée.</strong> Voici les modifications apportées à votre CV :
              </p>
            </div>

            <div className="ats-changes-list">
              {changes.length === 0 ? (
                <p className="ats-no-changes">
                  Votre CV est déjà très bien aligné avec cette offre. Aucune modification majeure
                  nécessaire.
                </p>
              ) : (
                changes.map((change, i) => (
                  <div key={i} className="ats-change-item">
                    <div className="ats-change-type">
                      <ChevronRight size={13} />
                      <strong>{change.type}</strong>
                    </div>

                    {change.list && (
                      <ul className="ats-tag-list">
                        {change.list.map((item, j) => (
                          <li key={j} className="ats-tag">
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}

                    {change.before && (
                      <div className="ats-diff">
                        <div className="ats-diff-before">
                          <span className="ats-diff-label">Avant</span>
                          <p>
                            {change.before.slice(0, 200)}
                            {change.before.length > 200 ? '…' : ''}
                          </p>
                        </div>
                        <div className="ats-diff-after">
                          <span className="ats-diff-label">Après</span>
                          <p>
                            {change.after?.slice(0, 200)}
                            {(change.after?.length ?? 0) > 200 ? '…' : ''}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="ats-preview-actions">
              <button className="ats-back-btn" onClick={() => setStep('input')}>
                <ArrowLeft size={14} />
                Retour
              </button>
              <button className="ats-apply-btn" onClick={handleApply}>
                <CheckCircle2 size={15} />
                Appliquer les modifications
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useId, useRef, useState } from 'react';
import { CircleCheck, Eye, EyeOff, KeyRound, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import {
  MODELS,
  PROVIDERS,
  PROVIDER_IDS,
  TIER_LABELS,
  forgetKey,
  getApiKey,
  getModel,
  keyLooksValid,
  keyProviderOf,
  resolveAi,
  saveAiConfig,
  setApiKey,
  testAiKey,
} from '../../lib/ai';
import { useAiConfig } from './useAiConfig';
import '../../styles/ai.css';

const TIER_ORDER = ['quality', 'fast'];

const HOW_TO = {
  anthropic: [
    'Créez un compte sur la console Anthropic (platform.claude.com).',
    'Ajoutez un peu de crédit dans « Billing » : quelques dollars suffisent pour de nombreuses optimisations.',
    'Dans « API keys », cliquez sur « Create key », puis copiez la clé (elle commence par sk-ant-) et collez-la ci-dessus.',
  ],
  gemini: [
    'Ouvrez Google AI Studio (aistudio.google.com) avec votre compte Google.',
    'Cliquez sur « Get API key » puis « Create API key ».',
    'Copiez la clé (elle commence par AQ. ; les clés plus anciennes commencent par AIza) et collez-la ci-dessus. Gemini 3.8 Flash fonctionne avec le quota gratuit.',
  ],
};

/**
 * Réglages IA : fournisseur, modèle, clé API. Utilisable seul ou replié
 * (collapsible) dans une autre fenêtre.
 */
export default function AiSettingsPanel({ collapsible = false, defaultOpen }) {
  const config = useAiConfig();
  const anyKey = PROVIDER_IDS.some((p) => config.hasKey[p]);
  const [open, setOpen] = useState(defaultOpen ?? !anyKey);

  if (collapsible && !open) {
    const active = resolveAi();
    return (
      <div className="ai-settings ai-settings--framed ai-settings--collapsed" data-native-undo>
        <span className="ai-settings-summary">
          <Sparkles size={15} aria-hidden="true" />
          {anyKey ? (
            <span>
              IA : <strong>{active.model.name}</strong> ({TIER_LABELS[active.model.tier]}) ·{' '}
              <span className="ai-settings-ok">
                <CircleCheck size={13} aria-hidden="true" /> clé {PROVIDERS[active.provider].company} enregistrée
              </span>
            </span>
          ) : (
            <span>Aucune clé API enregistrée</span>
          )}
        </span>
        <button type="button" className="btn btn-sm" onClick={() => setOpen(true)} aria-expanded="false">
          {anyKey ? 'Modifier' : 'Configurer'}
        </button>
      </div>
    );
  }

  // data-native-undo : Ctrl/Cmd+Z y annule la frappe (clé API), pas une modification du CV ou de la lettre.
  return (
    <div className={`ai-settings${collapsible ? ' ai-settings--framed' : ''}`} data-native-undo>
      {collapsible && (
        <div className="ai-settings-head">
          <span className="ai-settings-heading">
            <Sparkles size={15} aria-hidden="true" /> Réglages IA
          </span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen(false)} aria-expanded="true">
            Masquer
          </button>
        </div>
      )}
      <SettingsBody config={config} />
    </div>
  );
}

function SettingsBody({ config }) {
  const provider = config.provider;
  const p = PROVIDERS[provider];
  const model = getModel(provider, config.models[provider]);
  const otherWithKey = PROVIDER_IDS.find((id) => id !== provider && config.hasKey[id]);
  const keyId = useId();
  const modelName = useId();
  const [draft, setDraft] = useState(() => getApiKey(provider));
  const [reveal, setReveal] = useState(false);
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  // Message à afficher après un changement de fournisseur fait pour l'utilisatrice.
  const switchNotice = useRef('');

  useEffect(() => {
    setDraft(getApiKey(provider));
    setStatus(switchNotice.current ? { state: 'info', message: switchNotice.current } : { state: 'idle', message: '' });
    switchNotice.current = '';
    setReveal(false);
  }, [provider]);

  // Clé d'un fournisseur rangée sous l'autre : elle va dans le bon champ, et ce fournisseur est choisi.
  const moveKeyTo = (owner, key) => {
    setApiKey(owner, key);
    switchNotice.current = `Clé ${PROVIDERS[owner].company} reconnue : elle est enregistrée pour ${PROVIDERS[owner].label}, qui est maintenant sélectionné.`;
    saveAiConfig({ provider: owner });
  };

  // Clé modifiée ailleurs (autre panneau, autre onglet) : le champ suit, sans effacer
  // le message en cours (« Clé supprimée de ce navigateur. »).
  const storedKey = getApiKey(provider);
  useEffect(() => {
    setDraft((current) => (current.replace(/\s+/g, '') === storedKey ? current : storedKey));
  }, [storedKey]);

  const onKeyChange = (value) => {
    const owner = keyProviderOf(value);
    if (owner && owner !== provider) {
      moveKeyTo(owner, value);
      return;
    }
    setDraft(value);
    setApiKey(provider, value);
    setStatus({ state: 'idle', message: '' });
  };

  // Efface aussi une copie de cette clé collée par erreur dans le champ de l'autre fournisseur.
  const onForget = () => {
    forgetKey(provider);
    for (const id of PROVIDER_IDS) {
      if (id !== provider && keyProviderOf(getApiKey(id)) === provider) forgetKey(id);
    }
    setDraft('');
    setStatus({ state: 'info', message: 'Clé supprimée de ce navigateur.' });
  };

  const onMoveMisplaced = (owner) => {
    const key = draft;
    setApiKey(provider, '');
    moveKeyTo(owner, key);
  };

  const onForgetAll = () => {
    forgetKey();
    setDraft('');
    setStatus({ state: 'info', message: 'Toutes vos clés ont été supprimées de ce navigateur.' });
  };

  const onTest = async () => {
    setStatus({ state: 'testing', message: 'Vérification…' });
    try {
      await testAiKey();
      setStatus({ state: 'ok', message: `Clé valide : ${model.name} est disponible.` });
    } catch (err) {
      setStatus({ state: 'error', message: err?.message || 'La vérification a échoué.' });
    }
  };

  const hasKey = Boolean(draft.trim());
  // Clé enregistrée avant cette vérification, ou modifiée ailleurs : elle n'est jamais envoyée.
  const misplacedOwner = hasKey ? keyProviderOf(draft) : null;
  const misplaced = misplacedOwner && misplacedOwner !== provider ? misplacedOwner : null;
  const suspicious = hasKey && !misplaced && !keyLooksValid(provider, draft);

  return (
    <div className="ai-settings-body">
      <p className="ai-settings-intro">
        Fonction <strong>facultative</strong> et <strong>payante à l’usage</strong> : elle utilise votre propre clé
        API, et le fournisseur choisi facture directement chaque demande sur votre compte. Tout le reste de
        l’application fonctionne sans IA.
      </p>

      <div className="ai-field">
        <span className="field-label" id={`${keyId}-provider`}>
          Fournisseur
        </span>
        <div className="ai-provider-tabs" role="group" aria-labelledby={`${keyId}-provider`}>
          {PROVIDER_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`ai-provider-tab ai-provider-tab--${id}${id === provider ? ' is-active' : ''}`}
              aria-pressed={id === provider}
              onClick={() => saveAiConfig({ provider: id })}
            >
              <span className="ai-provider-name">{PROVIDERS[id].label}</span>
              <span className="ai-provider-sub">
                {PROVIDERS[id].company}
                {config.hasKey[id] && (
                  <span className="ai-provider-key" title="Clé enregistrée">
                    <CircleCheck size={12} aria-label="clé enregistrée" />
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
        {!config.hasKey[provider] && otherWithKey && (
          <p className="field-hint">
            Sans clé {p.company}, c’est votre clé {PROVIDERS[otherWithKey].company} qui sera utilisée.
          </p>
        )}
      </div>

      <fieldset className="ai-field ai-models">
        <legend className="field-label">Modèle</legend>
        {[...MODELS[provider]]
          .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))
          .map((m) => (
            <label key={m.id} className={`ai-model-option${m.id === model.id ? ' is-active' : ''}`}>
              <input
                type="radio"
                name={modelName}
                value={m.id}
                checked={m.id === model.id}
                onChange={() => {
                  saveAiConfig({ models: { [provider]: m.id } });
                  setStatus({ state: 'idle', message: '' });
                }}
              />
              <span className="ai-model-text">
                <span className="ai-model-tier">{TIER_LABELS[m.tier]}</span>
                <span className="ai-model-name">{m.name}</span>
                <span className="ai-model-cost">{m.cost}</span>
              </span>
            </label>
          ))}
      </fieldset>

      <div className="ai-field">
        <label className="field-label" htmlFor={keyId}>
          Clé API {p.company}
        </label>
        <div className="ai-key-row">
          <KeyRound size={15} className="ai-key-icon" aria-hidden="true" />
          <input
            id={keyId}
            className="input ai-key-input"
            type={reveal ? 'text' : 'password'}
            value={draft}
            placeholder={p.keyPlaceholder}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => onKeyChange(e.target.value)}
            onBlur={() => setDraft(getApiKey(provider))}
          />
          <button
            type="button"
            className="icon-btn"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? 'Masquer la clé' : 'Afficher la clé'}
            title={reveal ? 'Masquer la clé' : 'Afficher la clé'}
            disabled={!hasKey}
          >
            {reveal ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {misplaced && (
          <div className="ai-key-warning ai-key-warning--misplaced" role="alert">
            <p>
              Cette clé est une clé {PROVIDERS[misplaced].company} : elle ne fonctionne pas avec {p.label} et ne lui sera
              pas envoyée.
            </p>
            <button type="button" className="btn btn-sm" onClick={() => onMoveMisplaced(misplaced)}>
              L’utiliser avec {PROVIDERS[misplaced].label}
            </button>
          </div>
        )}
        {suspicious && (
          <p className="ai-key-warning" role="alert">
            Cette clé ne ressemble pas à une clé {p.company} : elle commence normalement par{' '}
            {p.keyPrefixes.map((prefix) => `« ${prefix} »`).join(' ou ')}.
          </p>
        )}
        <p className="field-hint">
          Enregistrée uniquement dans ce navigateur.{' '}
          <a href={p.keyUrl} target="_blank" rel="noreferrer">
            Obtenir une clé {p.company}
          </a>
        </p>
        <div className="ai-key-actions">
          <button
            type="button"
            className="btn btn-sm"
            onClick={onTest}
            disabled={!hasKey || Boolean(misplaced) || status.state === 'testing'}
          >
            <ShieldCheck size={14} aria-hidden="true" />
            Tester la clé
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onForget} disabled={!hasKey}>
            <Trash2 size={14} aria-hidden="true" />
            Oublier la clé
          </button>
          {otherWithKey && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={onForgetAll}>
              <Trash2 size={14} aria-hidden="true" />
              Oublier toutes mes clés
            </button>
          )}
          <span className={`ai-key-status ai-key-status--${status.state}`} role="status" aria-live="polite">
            {status.message}
          </span>
        </div>
      </div>

      <details className="ai-howto">
        <summary>Comment obtenir une clé {p.company} ?</summary>
        <ol>
          {HOW_TO[provider].map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </details>

      <div className="ai-privacy">
        <ShieldCheck size={16} aria-hidden="true" />
        <div>
          <p>
            <strong>Ce qui est envoyé :</strong> le contenu de votre CV, sans photo ni coordonnées (nom, e-mail,
            téléphone, ville, liens), et le texte de l’offre sont envoyés à {p.company} pour générer la réponse.
            Rien ne passe par un autre serveur.
          </p>
          {provider === 'gemini' && (
            <p>
              Hors Espace économique européen, Royaume-Uni et Suisse, Google peut réutiliser les contenus envoyés avec
              une clé gratuite pour améliorer ses services.
            </p>
          )}
          <p>
            <strong>Votre clé</strong> reste dans ce navigateur : sur un ordinateur partagé, cliquez sur «{' '}
            {otherWithKey ? 'Oublier toutes mes clés' : 'Oublier la clé'} » après usage. Fixez un plafond de dépense dans la console {p.company} (
            <a href={p.billingUrl} target="_blank" rel="noreferrer">
              {p.billingLabel}
            </a>
            ).
          </p>
        </div>
      </div>
    </div>
  );
}

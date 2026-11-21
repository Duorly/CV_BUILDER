// Fournisseurs d’IA (Claude, Gemini), modèles proposés, clés API et réglages
// enregistrés dans ce navigateur.

// ── Fournisseurs et modèles ───────────────────────────────────────────────

export const PROVIDERS = {
  anthropic: {
    id: 'anthropic',
    label: 'Claude',
    company: 'Anthropic',
    storageKey: 'anthropic_api_key',
    keyPrefixes: ['sk-ant-'],
    keyPlaceholder: 'sk-ant-api03-…',
    keyUrl: 'https://platform.claude.com/settings/keys',
    consoleName: 'la console Anthropic',
    billingUrl: 'https://platform.claude.com/settings/limits',
    billingLabel: 'Limites de dépense Anthropic',
  },
  gemini: {
    id: 'gemini',
    label: 'Gemini',
    company: 'Google',
    storageKey: 'gemini_api_key',
    // Depuis mai 2026, Google AI Studio crée des clés « AQ. » ; les anciennes commencent par « AIza ».
    keyPrefixes: ['AQ.', 'AIza'],
    keyPlaceholder: 'AQ.… ou AIzaSy…',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    consoleName: 'Google AI Studio',
    billingUrl: 'https://console.cloud.google.com/billing',
    billingLabel: 'Facturation Google Cloud',
  },
};

export const PROVIDER_IDS = Object.keys(PROVIDERS);

export const TIER_LABELS = {
  quality: 'Qualité',
  fast: 'Rapide et économique',
};

// Coûts : ordre de grandeur pour une optimisation complète (analyse + propositions).
export const MODELS = {
  anthropic: [
    {
      id: 'claude-opus-5-5',
      name: 'Claude Opus 5.5',
      tier: 'quality',
      cost: 'environ 0,10 à 0,40 $ par optimisation',
      serverFallback: true,
    },
    {
      id: 'claude-haiku-5-5',
      name: 'Claude Haiku 5.5',
      tier: 'fast',
      cost: "moins d’un centime par optimisation",
    },
  ],
  gemini: [
    {
      id: 'gemini-4-argon',
      name: 'Gemini 4 Argon',
      tier: 'quality',
      cost: 'environ 0,10 à 0,30 $ par optimisation, facturation Google obligatoire (pas de quota gratuit)',
      // La limite de sortie inclut la réflexion : Google recommande au moins 32 768 pour ce modèle.
      minOutputTokens: 32768,
    },
    {
      id: 'gemini-3.8-flash',
      name: 'Gemini 3.8 Flash',
      tier: 'fast',
      cost: 'gratuit dans la limite du quota gratuit de Google, sinon quelques centimes',
    },
  ],
};

export const DEFAULT_MODELS = {
  anthropic: 'claude-opus-5-5',
  gemini: 'gemini-3.8-flash',
};


export function getModel(provider, modelId) {
  const list = MODELS[provider] || [];
  return list.find((m) => m.id === modelId) || list.find((m) => m.id === DEFAULT_MODELS[provider]);
}

// ── Configuration (localStorage) ──────────────────────────────────────────

const CONFIG_KEY = 'cv-builder:ai-config';
const CONFIG_EVENT = 'cv-builder:ai-config-change';

function storage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function readItem(key) {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeItem(key, value) {
  const s = storage();
  if (!s) return false;
  try {
    if (value == null || value === '') s.removeItem(key);
    else s.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function emitConfigChange() {
  try {
    globalThis.dispatchEvent?.(new Event(CONFIG_EVENT));
  } catch {
    /* environnement sans événements (tests) */
  }
}

// Prévient les composants quand la clé ou le modèle change (y compris depuis un autre onglet).
export function subscribeAiConfig(listener) {
  if (typeof globalThis.addEventListener !== 'function') return () => {};
  const onStorage = (e) => {
    if (!e || e.key == null || e.key === CONFIG_KEY || PROVIDER_IDS.some((p) => PROVIDERS[p].storageKey === e.key)) {
      listener();
    }
  };
  globalThis.addEventListener(CONFIG_EVENT, listener);
  globalThis.addEventListener('storage', onStorage);
  return () => {
    globalThis.removeEventListener(CONFIG_EVENT, listener);
    globalThis.removeEventListener('storage', onStorage);
  };
}

export function getApiKey(provider) {
  const p = PROVIDERS[provider];
  return p ? String(readItem(p.storageKey) || '').trim() : '';
}

export function setApiKey(provider, key) {
  const p = PROVIDERS[provider];
  if (!p) return false;
  const ok = writeItem(p.storageKey, String(key || '').replace(/\s+/g, ''));
  emitConfigChange();
  return ok;
}

export function forgetKey(provider) {
  const ids = provider ? [provider] : PROVIDER_IDS;
  for (const id of ids) if (PROVIDERS[id]) writeItem(PROVIDERS[id].storageKey, null);
  emitConfigChange();
}

export function hasAiKey(provider) {
  if (provider) return Boolean(getApiKey(provider));
  return PROVIDER_IDS.some((p) => Boolean(getApiKey(p)));
}

// Une clé collée au mauvais endroit est l’erreur la plus fréquente : on la signale avant l’appel.
export function keyLooksValid(provider, key) {
  const k = String(key || '').trim();
  if (!k) return true;
  const prefixes = PROVIDERS[provider]?.keyPrefixes || [];
  return !prefixes.length || prefixes.some((prefix) => k.startsWith(prefix));
}

// Fournisseur dont la clé porte le préfixe connu (« sk-ant- », « AQ. »…), sinon null :
// un format inconnu (futures clés) n’est attribué à personne.
export function keyProviderOf(key) {
  const k = String(key || '').trim();
  if (!k) return null;
  return PROVIDER_IDS.find((id) => PROVIDERS[id].keyPrefixes.some((prefix) => k.startsWith(prefix))) || null;
}

export function loadAiConfig() {
  let raw = {};
  try {
    raw = JSON.parse(readItem(CONFIG_KEY) || '{}') || {};
  } catch {
    raw = {};
  }
  const hasKey = Object.fromEntries(PROVIDER_IDS.map((p) => [p, hasAiKey(p)]));
  const models = Object.fromEntries(PROVIDER_IDS.map((p) => [p, getModel(p, raw.models?.[p]).id]));
  let provider = PROVIDERS[raw.provider] ? raw.provider : null;
  // Sans choix enregistré, on prend le fournisseur dont une clé existe déjà.
  if (!provider) provider = hasKey.gemini && !hasKey.anthropic ? 'gemini' : 'anthropic';
  return { provider, models, hasKey };
}

export function saveAiConfig(patch = {}) {
  const current = loadAiConfig();
  const next = {
    provider: PROVIDERS[patch.provider] ? patch.provider : current.provider,
    models: { ...current.models },
  };
  for (const p of PROVIDER_IDS) {
    if (patch.models?.[p]) next.models[p] = getModel(p, patch.models[p]).id;
  }
  writeItem(CONFIG_KEY, JSON.stringify(next));
  emitConfigChange();
  return loadAiConfig();
}

// Fournisseur réellement utilisé : celui choisi s’il a une clé, sinon l’autre s’il en a une.
export function resolveAi() {
  const config = loadAiConfig();
  let provider = config.provider;
  if (!config.hasKey[provider]) {
    const other = PROVIDER_IDS.find((p) => config.hasKey[p]);
    if (other) provider = other;
  }
  return {
    provider,
    model: getModel(provider, config.models[provider]),
    key: getApiKey(provider),
  };
}

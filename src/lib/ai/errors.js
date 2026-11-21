import { keyProviderOf, PROVIDERS } from './providers';

// Erreurs de l’IA : codes, messages en français et traduction des réponses HTTP.

// ── Erreurs ───────────────────────────────────────────────────────────────

export class AiError extends Error {
  constructor(code, message, { status = 0, detail = '', provider = '', retryable = false, retryAfterMs = null } = {}) {
    super(message);
    this.name = 'AiError';
    this.code = code;
    this.status = status;
    this.detail = detail;
    this.provider = provider;
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }
}

// Codes pour lesquels il faut renvoyer l’utilisatrice vers les réglages IA.
export const SETTINGS_ERROR_CODES = ['NO_KEY', 'INVALID_KEY', 'FORBIDDEN', 'MODEL_NOT_FOUND', 'NO_CREDIT'];

export function noKeyError() {
  return new AiError(
    'NO_KEY',
    "Aucune clé API n’est enregistrée. Ouvrez les réglages IA pour coller votre clé Claude (Anthropic) ou Gemini (Google).",
  );
}

export function errorText(body) {
  if (!body) return '';
  if (typeof body === 'string') return body.slice(0, 500);
  const err = body.error || body;
  return String(err.message || err.status || err.type || '').slice(0, 500);
}

function geminiRetryDelayMs(body) {
  const details = Array.isArray(body?.error?.details) ? body.error.details : [];
  for (const d of details) {
    const m = /^(\d+(?:\.\d+)?)s$/.exec(String(d?.retryDelay || ''));
    if (m) return Math.round(Number(m[1]) * 1000);
  }
  return null;
}

function headerRetryAfterMs(headers) {
  const v = headers?.get?.('retry-after');
  const n = Number(v);
  return v != null && Number.isFinite(n) && n >= 0 ? n * 1000 : null;
}

// Traduit une réponse HTTP en erreur compréhensible, en français.
export function httpError(provider, model, status, body, headers) {
  const p = PROVIDERS[provider] || { company: provider };
  const detail = `${status} ${errorText(body)}`.trim();
  const make = (code, message, extra = {}) => new AiError(code, message, { status, detail, provider, ...extra });
  const text = errorText(body);
  const reason = JSON.stringify(body?.error?.details || '') + ' ' + String(body?.error?.status || '') + ' ' + text;
  const modelName = model?.name || 'choisi';

  const invalidKey = () =>
    make(
      'INVALID_KEY',
      `La clé API ${p.company} est refusée. Vérifiez qu’elle est complète (copiez-la à nouveau depuis ${p.consoleName}) et qu’elle n’a pas été supprimée.`,
    );
  const modelNotFound = () =>
    make(
      'MODEL_NOT_FOUND',
      `Le modèle « ${modelName} » n’est pas disponible pour votre compte ${p.company}. Choisissez l’autre modèle dans les réglages IA.`,
    );
  const overloaded = () =>
    make('OVERLOADED', `Le service ${p.company} est surchargé en ce moment. Réessayez dans quelques minutes.`, {
      retryable: true,
      retryAfterMs: headerRetryAfterMs(headers),
    });
  const server = () =>
    make('SERVER', `Le service ${p.company} a rencontré une erreur temporaire. Réessayez dans un instant.`, {
      retryable: true,
      retryAfterMs: headerRetryAfterMs(headers),
    });
  const tooLarge = () =>
    make(
      'TOO_LARGE',
      "Le CV et l’offre sont trop longs pour être envoyés en une fois. Raccourcissez le texte de l’offre (gardez les missions et le profil recherché).",
    );
  const badRequest = () =>
    make(
      'BAD_REQUEST',
      `${p.company} a refusé la demande. Réessayez ; si le problème continue, choisissez l’autre modèle dans les réglages IA.`,
    );

  if (provider === 'gemini') {
    if (/API_KEY_INVALID|API_KEY_EXPIRED|API key not valid|API key expired/i.test(reason)) return invalidKey();
    if (status === 401) return invalidKey();
    if (status === 403) {
      return make(
        'FORBIDDEN',
        "Cette clé Google n’a pas accès à l’API Gemini (clé restreinte, désactivée ou signalée comme divulguée). Créez une nouvelle clé dans Google AI Studio.",
      );
    }
    if (status === 404) return modelNotFound();
    if (status === 413) return tooLarge();
    if (status === 400 && /FAILED_PRECONDITION|billing|location is not supported|free tier/i.test(reason)) {
      return make(
        'NO_CREDIT',
        "Votre compte Google n’a pas accès à ce modèle Gemini sans facturation (ou pas depuis votre pays). Activez la facturation dans Google AI Studio, ou choisissez Gemini 3.8 Flash.",
      );
    }
    if (status === 429) {
      const delay = geminiRetryDelayMs(body);
      if (/limit:\s*0\b/i.test(reason)) {
        return make(
          'NO_CREDIT',
          "Ce modèle Gemini n’est pas inclus dans l’offre gratuite de Google. Activez la facturation dans Google AI Studio, ou choisissez Gemini 3.8 Flash.",
        );
      }
      const daily = /PerDay|per day/i.test(reason);
      return make(
        'RATE_LIMIT',
        daily
          ? 'Quota Gemini du jour atteint pour cette clé. Réessayez demain, ou activez la facturation dans Google AI Studio.'
          : 'Quota Gemini atteint (trop de demandes en peu de temps). Patientez une minute, puis réessayez.',
        { retryable: !daily, retryAfterMs: delay },
      );
    }
    if (status === 503 || status === 529) return overloaded();
    if (status >= 500) return server();
    return badRequest();
  }

  // Anthropic
  const type = body?.error?.type || '';
  if (status === 401 || type === 'authentication_error') return invalidKey();
  if (status === 402 || type === 'billing_error' || /credit balance|billing/i.test(text)) {
    return make(
      'NO_CREDIT',
      'Crédit insuffisant sur votre compte Anthropic. Ajoutez du crédit dans la console Anthropic (rubrique Billing), puis réessayez.',
    );
  }
  if (status === 403 || type === 'permission_error') {
    return make(
      'FORBIDDEN',
      "Cette clé Anthropic n’a pas accès à ce modèle ou à ce service. Vérifiez les droits de la clé et de votre organisation dans la console Anthropic.",
    );
  }
  if (status === 404 || type === 'not_found_error') return modelNotFound();
  if (status === 413 || type === 'request_too_large') return tooLarge();
  if (status === 429 || type === 'rate_limit_error') {
    return make(
      'RATE_LIMIT',
      'Trop de demandes en peu de temps pour votre compte Anthropic. Patientez une minute, puis réessayez.',
      { retryable: true, retryAfterMs: headerRetryAfterMs(headers) },
    );
  }
  if (status === 529 || status === 503 || type === 'overloaded_error') return overloaded();
  if (status >= 500) return server();
  return badRequest();
}

export function networkError(provider) {
  const p = PROVIDERS[provider] || { company: provider };
  return new AiError(
    'NETWORK',
    `Impossible de joindre ${p.company}. Vérifiez votre connexion internet. Un bloqueur de publicités, un VPN ou le pare-feu d’une entreprise peuvent aussi bloquer la connexion.`,
    { provider },
  );
}

export function abortedError() {
  return new AiError('ABORTED', 'Demande annulée.');
}

export const truncatedError = (provider) =>
  new AiError(
    'TRUNCATED',
    "La réponse de l’IA a été coupée avant la fin. Réessayez ; si cela se reproduit, choisissez l’autre modèle dans les réglages de l’IA (menu IA → Clé API et fournisseur).",
    { provider },
  );

export const refusedError = (provider, detail = '') =>
  new AiError(
    'REFUSED',
    "L’IA a refusé de traiter cette demande. Vérifiez que l’offre ne contient rien d’inhabituel, puis réessayez ou changez de modèle dans les réglages IA.",
    { provider, detail },
  );

export const unreadableError = (provider, detail = '') =>
  new AiError('UNREADABLE', "La réponse de l’IA est illisible. Réessayez.", { provider, detail });

// Une clé d’un autre fournisseur ne quitte jamais le navigateur vers le mauvais serveur.
export function wrongProviderError(provider, key) {
  const owner = keyProviderOf(key);
  if (!owner || owner === provider) return null;
  const o = PROVIDERS[owner];
  return new AiError(
    'INVALID_KEY',
    `La clé enregistrée pour ${PROVIDERS[provider].label} est une clé ${o.company} (${o.label}) : dans les réglages IA, choisissez « ${o.label} » et collez-la dans son champ.`,
    { provider },
  );
}

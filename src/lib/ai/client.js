import { PROVIDERS, resolveAi, TIER_LABELS } from './providers';
import {
  abortedError,
  AiError,
  errorText,
  httpError,
  networkError,
  noKeyError,
  refusedError,
  truncatedError,
  unreadableError,
  wrongProviderError,
} from './errors';

// Appel générique au modèle configuré (Anthropic ou Gemini) : requête, réponse JSON,
// nouvelles tentatives, délai maximal ; et vérification de la clé.

// Effort de réflexion par tâche : la traduction est simple ; l’analyse (tri des mots-clés,
// conseils ciblés) et la lettre demandent du soin, la réécriture du CV le plus.
const TASK_EFFORT = {
  analyze: 'medium',
  rewrite: 'high',
  translate: 'low',
  letter: 'medium',
};

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODELS_URL = 'https://api.anthropic.com/v1/models';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const ANTHROPIC_FALLBACK_BETA = 'server-side-fallback-2026-07-01';

// ── Appel générique ───────────────────────────────────────────────────────

// Points d’injection pour les tests (attente entre deux essais).
export const aiRuntime = {
  sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(abortedError());
      const timer = setTimeout(() => {
        signal?.removeEventListener?.('abort', onAbort);
        resolve();
      }, ms);
      function onAbort() {
        clearTimeout(timer);
        reject(abortedError());
      }
      signal?.addEventListener?.('abort', onAbort, { once: true });
    });
  },
};

const MAX_RETRIES = 3;
const MAX_RETRY_WAIT_MS = 30000;

// Certaines organisations n’ont pas accès à l’en-tête bêta de repli : on s’en passe alors.
let anthropicFallbackDisabled = false;

function anthropicRequest({ model, key, system, user, schema, effort, maxTokens, withFallback }) {
  const headers = {
    'content-type': 'application/json',
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
  const body = {
    model: model.id,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
    output_config: {
      effort,
      format: { type: 'json_schema', schema },
    },
  };
  if (withFallback) {
    headers['anthropic-beta'] = ANTHROPIC_FALLBACK_BETA;
    body.fallbacks = 'default';
  }
  return { url: ANTHROPIC_URL, headers, body };
}

function geminiRequest({ model, key, system, user, schema, effort, maxTokens }) {
  return {
    url: `${GEMINI_BASE_URL}/${encodeURIComponent(model.id)}:generateContent`,
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': key,
    },
    body: {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseJsonSchema: schema,
        maxOutputTokens: Math.max(maxTokens, model.minOutputTokens || 0),
        // Valeurs de l’énumération ThinkingLevel de generateContent : LOW, MEDIUM, HIGH.
        thinkingConfig: { thinkingLevel: effort.toUpperCase() },
      },
    },
  };
}

const GEMINI_BLOCKED = new Set([
  'SAFETY',
  'RECITATION',
  'BLOCKLIST',
  'PROHIBITED_CONTENT',
  'SPII',
  'IMAGE_SAFETY',
  'LANGUAGE',
]);

// Extrait le texte de la réponse en ignorant les blocs de réflexion.
export function readResponseText(provider, json) {
  if (provider === 'gemini') {
    if (json?.promptFeedback?.blockReason) throw refusedError(provider, json.promptFeedback.blockReason);
    const candidate = json?.candidates?.[0];
    if (!candidate) throw unreadableError(provider, 'aucun candidat');
    if (candidate.finishReason === 'MAX_TOKENS') throw truncatedError(provider);
    if (GEMINI_BLOCKED.has(candidate.finishReason)) throw refusedError(provider, candidate.finishReason);
    const parts = Array.isArray(candidate.content?.parts) ? candidate.content.parts : [];
    return parts
      .filter((part) => !part.thought && typeof part.text === 'string')
      .map((part) => part.text)
      .join('');
  }
  if (json?.stop_reason === 'refusal') {
    throw refusedError(provider, json.stop_details?.category || '');
  }
  if (json?.stop_reason === 'max_tokens') throw truncatedError(provider);
  const blocks = Array.isArray(json?.content) ? json.content : [];
  return blocks
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('');
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseJsonText(provider, text) {
  const raw = String(text || '').trim();
  if (!raw) throw unreadableError(provider, 'réponse vide');
  try {
    return JSON.parse(raw);
  } catch {
    // Filet de sécurité : JSON entouré de texte ou d’un bloc ```json.
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        /* illisible */
      }
    }
    throw unreadableError(provider, raw.slice(0, 200));
  }
}

function linkSignals(outer, timeoutMs) {
  const controller = new AbortController();
  const state = { timedOut: false };
  const onAbort = () => controller.abort();
  if (outer?.aborted) controller.abort();
  outer?.addEventListener?.('abort', onAbort, { once: true });
  const timer = timeoutMs
    ? setTimeout(() => {
        state.timedOut = true;
        controller.abort();
      }, timeoutMs)
    : null;
  return {
    signal: controller.signal,
    state,
    release() {
      if (timer) clearTimeout(timer);
      outer?.removeEventListener?.('abort', onAbort);
    },
  };
}

function retryDelay(attempt, error) {
  if (error.retryAfterMs != null) return error.retryAfterMs;
  return 2000 * 2 ** attempt + Math.round(Math.random() * 1000);
}

/**
 * Appelle le modèle configuré et renvoie l’objet JSON conforme au schéma.
 * task : 'analyze' | 'rewrite' | 'translate' | 'letter' (règle l’effort de réflexion).
 */
export async function callLLM({ system, user, schema, task = 'rewrite', maxTokens = 16000, signal, timeoutMs = 300000 }) {
  const { provider, model, key } = resolveAi();
  if (!key) throw noKeyError();
  const misplaced = wrongProviderError(provider, key);
  if (misplaced) throw misplaced;
  const effort = TASK_EFFORT[task] || 'medium';

  for (let attempt = 0; ; attempt += 1) {
    if (signal?.aborted) throw abortedError();
    const withFallback = provider === 'anthropic' && model.serverFallback && !anthropicFallbackDisabled;
    const request =
      provider === 'gemini'
        ? geminiRequest({ model, key, system, user, schema, effort, maxTokens })
        : anthropicRequest({ model, key, system, user, schema, effort, maxTokens, withFallback });

    const linked = linkSignals(signal, timeoutMs);
    let response;
    let bodyText = '';
    try {
      response = await globalThis.fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify(request.body),
        signal: linked.signal,
      });
      bodyText = await response.text();
    } catch {
      if (signal?.aborted) throw abortedError();
      if (linked.state.timedOut) {
        throw new AiError(
          'TIMEOUT',
          `${PROVIDERS[provider].company} n’a pas répondu à temps. Réessayez, ou choisissez le modèle « ${TIER_LABELS.fast} » dans les réglages IA.`,
          { provider },
        );
      }
      throw networkError(provider);
    } finally {
      linked.release();
    }
    const json = safeJson(bodyText);

    if (response.ok) {
      const text = readResponseText(provider, json);
      return { data: parseJsonText(provider, text), provider, model: model.id };
    }

    const error = httpError(provider, model, response.status, json, response.headers);
    if (withFallback && response.status === 400 && /anthropic-beta|fallback/i.test(errorText(json))) {
      anthropicFallbackDisabled = true;
      attempt -= 1;
      continue;
    }
    if (error.retryable && attempt < MAX_RETRIES) {
      const wait = retryDelay(attempt, error);
      if (wait <= MAX_RETRY_WAIT_MS) {
        await aiRuntime.sleep(wait, signal);
        continue;
      }
    }
    throw error;
  }
}

// Vérifie la clé et la disponibilité du modèle sans rien facturer (simple lecture de la fiche du modèle).
export async function testAiKey({ signal } = {}) {
  const { provider, model, key } = resolveAi();
  if (!key) throw noKeyError();
  const misplaced = wrongProviderError(provider, key);
  if (misplaced) throw misplaced;
  const request =
    provider === 'gemini'
      ? {
          url: `${GEMINI_BASE_URL}/${encodeURIComponent(model.id)}`,
          headers: { 'x-goog-api-key': key },
        }
      : {
          url: `${ANTHROPIC_MODELS_URL}/${encodeURIComponent(model.id)}`,
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
        };
  let response;
  let bodyText = '';
  try {
    response = await globalThis.fetch(request.url, { method: 'GET', headers: request.headers, signal });
    bodyText = await response.text();
  } catch {
    if (signal?.aborted) throw abortedError();
    throw networkError(provider);
  }
  if (!response.ok) throw httpError(provider, model, response.status, safeJson(bodyText), response.headers);
  return { provider, model: model.id };
}

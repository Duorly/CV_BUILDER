// Fonctions IA (optionnelles) : optimisation du CV pour une offre, traduction,
// brouillon de lettre. Les appels partent directement du navigateur vers
// Anthropic ou Google avec la clé de l’utilisatrice ; aucun serveur intermédiaire.
// Point d’entrée unique : les modules du dossier ne sont importés que d’ici (et entre eux).

export {
  DEFAULT_MODELS,
  forgetKey,
  getApiKey,
  getModel,
  hasAiKey,
  keyLooksValid,
  keyProviderOf,
  loadAiConfig,
  MODELS,
  PROVIDER_IDS,
  PROVIDERS,
  resolveAi,
  saveAiConfig,
  setApiKey,
  subscribeAiConfig,
  TIER_LABELS,
} from './providers';
export {
  AiError,
  httpError,
  noKeyError,
  SETTINGS_ERROR_CODES,
} from './errors';
export {
  aiRuntime,
  callLLM,
  readResponseText,
  testAiKey,
} from './client';
export {
  identityScrubber,
  stripForAI,
} from './privacy';
export {
  normalizeTerm,
  versionNameFor,
} from './shared';
export {
  allowedSkillsFrom,
  ANALYSIS_SCHEMA,
  analyzeOffer,
  FIT_LEVELS,
  forbiddenTermsFrom,
  IMPORTANCE_LEVELS,
  normalizeAnalysis,
} from './offer';
export {
  applyChanges,
  buildChanges,
  citedInCv,
  newNumbers,
  normalizePatch,
  numbersIn,
  PATCH_SCHEMA,
  proposeChanges,
} from './changes';
export {
  buildTranslationSource,
  mergeTranslation,
  numberChangesIn,
  translateCv,
  TRANSLATION_SCHEMA,
  translationTarget,
} from './translation';
export {
  draftCoverLetter,
  LETTER_SCHEMA,
} from './letter';

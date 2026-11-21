import { createId } from './ids';
import { emptyResume, normalizeCoverLetter, normalizeData, normalizeSettings, defaultSettings } from './schema';

// Bibliothèque de CV : une version de base + une version par candidature,
// plus le suivi des candidatures. Tout reste dans le navigateur (localStorage).

export const STORAGE_KEY = 'cv-builder:library:v2';
export const LIBRARY_VERSION = 2;

export const APPLICATION_STATUSES = [
  { id: 'a_envoyer', label: 'À envoyer' },
  { id: 'envoyee', label: 'Envoyée' },
  { id: 'relancee', label: 'Relancée' },
  { id: 'entretien', label: 'Entretien' },
  { id: 'offre', label: 'Offre reçue' },
  { id: 'refusee', label: 'Refusée' },
  { id: 'abandon', label: 'Abandonnée' },
];

const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const nowIso = () => new Date().toISOString();

export function createCv(fields = {}) {
  const now = nowIso();
  return normalizeCv({
    id: createId('cv'),
    name: 'Mon CV',
    createdAt: now,
    updatedAt: now,
    data: emptyResume(),
    settings: defaultSettings(),
    ...fields,
  });
}

export function normalizeCv(input) {
  const src = isObj(input) ? input : {};
  const now = nowIso();
  return {
    id: str(src.id) || createId('cv'),
    name: str(src.name).trim() || 'Mon CV',
    company: str(src.company),
    jobTitle: str(src.jobTitle),
    jobOffer: str(src.jobOffer),
    offerUrl: str(src.offerUrl),
    sourceId: str(src.sourceId) || null, // version dont celle-ci est dérivée
    createdAt: str(src.createdAt) || now,
    updatedAt: str(src.updatedAt) || now,
    data: normalizeData(src.data),
    settings: normalizeSettings(src.settings),
    coverLetter: normalizeCoverLetter(src.coverLetter),
  };
}

export function normalizeApplication(input) {
  const src = isObj(input) ? input : {};
  const now = nowIso();
  return {
    id: str(src.id) || createId('app'),
    company: str(src.company),
    position: str(src.position),
    offerUrl: str(src.offerUrl),
    date: str(src.date), // AAAA-MM-JJ
    status: APPLICATION_STATUSES.some((s) => s.id === src.status) ? src.status : 'a_envoyer',
    followUpDate: str(src.followUpDate),
    cvId: str(src.cvId) || null,
    notes: str(src.notes),
    createdAt: str(src.createdAt) || now,
    updatedAt: str(src.updatedAt) || now,
  };
}

export function createLibrary(cv = createCv()) {
  return { version: LIBRARY_VERSION, currentId: cv.id, cvs: [cv], applications: [] };
}

export function normalizeLibrary(input) {
  const src = isObj(input) ? input : {};
  const seen = new Set();
  const cvs = (Array.isArray(src.cvs) ? src.cvs : []).map(normalizeCv).map((cv) => {
    if (seen.has(cv.id)) cv = { ...cv, id: createId('cv') };
    seen.add(cv.id);
    return cv;
  });
  if (cvs.length === 0) cvs.push(createCv());
  const currentId = cvs.some((c) => c.id === src.currentId) ? src.currentId : cvs[0].id;
  const applications = (Array.isArray(src.applications) ? src.applications : []).map(normalizeApplication);
  return { version: LIBRARY_VERSION, currentId, cvs, applications };
}

// Copie indépendante d'une version (nouvel id, nouveaux horodatages).
export function duplicateCv(cv, overrides = {}) {
  const copy = JSON.parse(JSON.stringify(cv));
  const now = nowIso();
  return normalizeCv({
    ...copy,
    id: createId('cv'),
    name: `${cv.name} (copie)`,
    sourceId: cv.id,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

// ── Persistance ───────────────────────────────────────────────────────────

// Quand le site n'a pas le droit d'enregistrer de données (réglage du navigateur),
// le simple accès à localStorage lève une SecurityError : on le traite comme absent.
export function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

// Retourne { library, status } où status vaut 'fresh' (rien d'enregistré),
// 'loaded', ou 'recovered' (donnée illisible mise de côté).
export function loadLibrary(storage = defaultStorage()) {
  let raw = null;
  try {
    raw = storage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return { library: createLibrary(), status: 'fresh' };
  }
  if (!raw) return { library: createLibrary(), status: 'fresh' };
  try {
    return { library: normalizeLibrary(JSON.parse(raw)), status: 'loaded' };
  } catch {
    try {
      storage.setItem(`${STORAGE_KEY}:corrupt`, raw);
    } catch {
      /* rien à faire : le stockage est indisponible */
    }
    return { library: createLibrary(), status: 'recovered' };
  }
}

// Retourne { ok: true, savedAt } ou { ok: false, error: 'quota' | 'unavailable' }.
export function saveLibrary(library, storage = defaultStorage()) {
  if (!storage) return { ok: false, error: 'unavailable' };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(library));
    return { ok: true, savedAt: new Date() };
  } catch (err) {
    const quota =
      err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22);
    return { ok: false, error: quota ? 'quota' : 'unavailable' };
  }
}

export function readRawLibrary(storage = defaultStorage()) {
  try {
    return storage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

// ── Import / export JSON ──────────────────────────────────────────────────

export function exportCvPayload(cv) {
  return { app: 'cv-builder', kind: 'cv-version', version: LIBRARY_VERSION, ...cv };
}

export function exportLibraryPayload(library) {
  return { app: 'cv-builder', kind: 'library', ...library };
}

// Accepte : une bibliothèque complète (v2), une version de CV exportée (v2),
// ou l'ancien format v1 (l'objet CV brut avec personalInfo, experiences…).
// Retourne { kind: 'library', library } ou { kind: 'cv', cv } ; lève une Error sinon.
export function parseImport(json) {
  if (!isObj(json)) throw new Error("Ce fichier ne contient pas de CV reconnu.");
  if (Array.isArray(json.cvs)) {
    return { kind: 'library', library: normalizeLibrary(json) };
  }
  if (isObj(json.data) && (isObj(json.data.personalInfo) || Array.isArray(json.data.experiences))) {
    return { kind: 'cv', cv: normalizeCv({ ...json, id: createId('cv') }) };
  }
  if (isObj(json.personalInfo) || Array.isArray(json.experiences)) {
    const name = str(json.personalInfo?.name).trim();
    return {
      kind: 'cv',
      cv: createCv({ name: name ? `CV ${name}` : 'CV importé', data: json }),
    };
  }
  throw new Error("Ce fichier ne contient pas de CV reconnu.");
}

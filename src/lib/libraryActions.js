import { createId } from './ids';
import { emptyCoverLetter, emptyResume, normalizeCoverLetter, normalizeData, normalizeSettings } from './schema';
import { createCv, duplicateCv, normalizeApplication, normalizeLibrary } from './storage';

// Opérations pures sur la bibliothèque : chaque fonction retourne une NOUVELLE
// bibliothèque et ne modifie jamais celle reçue (l'état React reste immuable).

const nowIso = () => new Date().toISOString();

// Champs d'une version modifiables directement (hors contenu du CV et lettre).
export const CV_META_FIELDS = ['name', 'company', 'jobTitle', 'jobOffer', 'offerUrl'];

export function getCurrentCv(library) {
  return library.cvs.find((cv) => cv.id === library.currentId) || library.cvs[0];
}

export function selectCv(library, id) {
  if (!library.cvs.some((cv) => cv.id === id) || library.currentId === id) return library;
  return { ...library, currentId: id };
}

// « CV – Chargée de communication – Decathlon » ; vide si ni poste ni entreprise.
export function suggestVersionName({ jobTitle = '', company = '' } = {}) {
  const parts = [jobTitle, company].map((p) => String(p || '').trim()).filter(Boolean);
  return parts.length ? ['CV', ...parts].join(' – ') : '';
}

// Ajoute « (2) », « (3) »… si le nom est déjà pris par une autre version.
export function uniqueCvName(library, name, exceptId = null) {
  const base = String(name || '').trim() || 'Mon CV';
  const taken = new Set(
    library.cvs.filter((cv) => cv.id !== exceptId).map((cv) => cv.name.trim().toLowerCase()),
  );
  if (!taken.has(base.toLowerCase())) return base;
  let n = 2;
  while (taken.has(`${base} (${n})`.toLowerCase())) n += 1;
  return `${base} (${n})`;
}

export function addCv(library, cv, { select = true } = {}) {
  let entry = cv;
  if (library.cvs.some((c) => c.id === entry.id)) entry = { ...entry, id: createId('cv') };
  return {
    ...library,
    cvs: [...library.cvs, entry],
    currentId: select ? entry.id : library.currentId,
  };
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Égalité de valeur (objets et tableaux comparés en profondeur, sans tenir compte de l'ordre des clés).
export function sameValue(a, b) {
  if (a === b) return true;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((v, i) => sameValue(v, b[i]));
  if (!isPlainObject(a) || !isPlainObject(b)) return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((k) => Object.prototype.hasOwnProperty.call(b, k) && sameValue(a[k], b[k]))
  );
}

// `patch` : objet fusionné dans la version, ou fonction (cv) => nouvelle version.
// Un patch qui ne change aucune valeur laisse la bibliothèque telle quelle : ni updatedAt
// avancé (l'import « garde la plus récente »), ni écriture, ni étape d'annulation vide.
export function updateCvInLibrary(library, id, patch) {
  let changed = false;
  const cvs = library.cvs.map((cv) => {
    if (cv.id !== id) return cv;
    if (typeof patch !== 'function' && Object.keys(patch || {}).every((key) => sameValue(cv[key], patch[key]))) {
      return cv;
    }
    const next = typeof patch === 'function' ? patch(cv) : { ...cv, ...patch };
    if (next === cv) return cv;
    changed = true;
    return { ...next, id: cv.id, updatedAt: nowIso() };
  });
  return changed ? { ...library, cvs } : library;
}

// Seuls les champs descriptifs de la version sont acceptés (pas data / settings).
export function updateCvMeta(library, id, patch = {}) {
  const clean = {};
  for (const key of CV_META_FIELDS) {
    if (patch[key] !== undefined) clean[key] = String(patch[key] ?? '');
  }
  // Le nom saisi est gardé tel quel (espaces compris, pour la frappe en direct) ;
  // il n'est modifié que s'il est vide ou déjà pris par une autre version.
  if ('name' in clean) {
    const unique = uniqueCvName(library, clean.name, id);
    if (unique !== clean.name.trim()) clean.name = unique;
  }
  return updateCvInLibrary(library, id, clean);
}

export function newBlankCv(library, { name = 'Nouveau CV' } = {}) {
  return createCv({ name: uniqueCvName(library, name), data: emptyResume() });
}

export function newCvFromData(library, data, { name = 'CV' } = {}) {
  return createCv({ name: uniqueCvName(library, name), data: normalizeData(data) });
}

export function duplicateCvInLibrary(library, id, overrides = {}) {
  const source = library.cvs.find((cv) => cv.id === id);
  if (!source) return { library, cv: null };
  const name = uniqueCvName(library, overrides.name || `${source.name} (copie)`);
  const cv = duplicateCv(source, { ...overrides, name });
  return { library: addCv(library, cv), cv };
}

// Copie pour une autre candidature (fenêtre « Dupliquer pour une candidature »).
// L'offre et son lien ne suivent que pour la même entreprise et le même poste ;
// la lettre, qui vise un autre destinataire, seulement si copyLetter est vrai.
export function duplicateForApplication(library, id, { copyLetter = false, ...fields } = {}) {
  const source = library.cvs.find((cv) => cv.id === id);
  if (!source) return { library, cv: null };
  const overrides = { ...fields };
  const sameCompany = (fields.company ?? source.company) === source.company;
  const sameJob = (fields.jobTitle ?? source.jobTitle) === source.jobTitle;
  if (!sameCompany || !sameJob) {
    overrides.jobOffer = '';
    overrides.offerUrl = '';
  }
  if (!copyLetter) overrides.coverLetter = emptyCoverLetter();
  return duplicateCvInLibrary(library, id, overrides);
}

// Refuse de supprimer la dernière version : il en faut toujours une.
// Les candidatures liées gardent leurs informations mais ne pointent plus vers rien.
// Les versions dérivées de celle supprimée sont rattachées à sa propre source, pour
// que l'IA reparte toujours de la version de base (voir rootCvId).
export function removeCv(library, id) {
  const index = library.cvs.findIndex((cv) => cv.id === id);
  if (index === -1 || library.cvs.length <= 1) return library;
  const removed = library.cvs[index];
  const cvs = library.cvs
    .filter((cv) => cv.id !== id)
    .map((cv) => (cv.sourceId === id ? { ...cv, sourceId: removed.sourceId ?? null } : cv));
  let currentId = library.currentId;
  if (currentId === id) currentId = cvs[Math.min(index, cvs.length - 1)].id;
  const applications = library.applications.map((app) =>
    app.cvId === id ? { ...app, cvId: null, updatedAt: nowIso() } : app,
  );
  return { ...library, cvs, currentId, applications };
}

export function linkedApplications(library, cvId) {
  return library.applications.filter((app) => app.cvId === cvId);
}

export function derivedCvs(library, cvId) {
  return library.cvs.filter((cv) => cv.sourceId === cvId);
}

const timeOf = (item) => Date.parse(item?.updatedAt || '') || 0;
const isMoreRecent = (a, b) => timeOf(a) > timeOf(b);

// Ce que la fusion d'une bibliothèque importée changerait. Un élément de même id est le
// même élément (sa propre sauvegarde réimportée, ou celle d'un autre ordinateur) :
// `known` compte ceux déjà présents, `newer` ceux que le fichier a en plus récent.
export function compareImport(current, incoming) {
  const imported = normalizeLibrary(incoming);
  const count = (items, local) => {
    const byId = new Map(local.map((item) => [item.id, item]));
    let known = 0;
    let newer = 0;
    for (const item of items) {
      const existing = byId.get(item.id);
      if (!existing) continue;
      known += 1;
      if (isMoreRecent(item, existing)) newer += 1;
    }
    return { added: items.length - known, known, newer };
  };
  return { cvs: count(imported.cvs, current.cvs), applications: count(imported.applications, current.applications) };
}

// Fusionne une bibliothèque importée dans la bibliothèque actuelle, sans doublons : les
// versions et candidatures nouvelles sont ajoutées ; pour celles déjà présentes (même id),
// la plus récente des deux est gardée. Renvoie `current` tel quel si rien ne change.
export function mergeLibraries(current, incoming) {
  const imported = normalizeLibrary(incoming);
  const localCvs = new Map(current.cvs.map((cv) => [cv.id, cv]));
  let cvs = current.cvs;
  let changed = false;
  for (const cv of imported.cvs) {
    const existing = localCvs.get(cv.id);
    if (existing && !isMoreRecent(cv, existing)) continue;
    changed = true;
    const entry = { ...cv, name: uniqueCvName({ cvs }, cv.name, cv.id) };
    cvs = existing ? cvs.map((c) => (c.id === cv.id ? entry : c)) : [...cvs, entry];
  }

  const cvIds = new Set(cvs.map((cv) => cv.id));
  const localApps = new Map(current.applications.map((app) => [app.id, app]));
  let applications = current.applications;
  for (const app of imported.applications) {
    const existing = localApps.get(app.id);
    if (existing && !isMoreRecent(app, existing)) continue;
    changed = true;
    const entry = { ...app, cvId: app.cvId && cvIds.has(app.cvId) ? app.cvId : null };
    applications = existing
      ? applications.map((a) => (a.id === app.id ? entry : a))
      : [...applications, entry];
  }

  return changed ? { ...current, cvs, applications } : current;
}

// « 2 versions de CV ajoutées, 1 version mise à jour et 1 candidature ajoutée » ; vide si rien ne change.
export function describeImportChanges({ cvs, applications }) {
  const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;
  const parts = [];
  if (cvs.added) parts.push(plural(cvs.added, 'version de CV ajoutée', 'versions de CV ajoutées'));
  if (cvs.newer) parts.push(plural(cvs.newer, 'version mise à jour', 'versions mises à jour'));
  if (applications.added) parts.push(plural(applications.added, 'candidature ajoutée', 'candidatures ajoutées'));
  if (applications.newer) parts.push(plural(applications.newer, 'candidature mise à jour', 'candidatures mises à jour'));
  if (parts.length < 2) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} et ${parts.at(-1)}`;
}

export function replaceLibrary(incoming) {
  return normalizeLibrary(incoming);
}

export function describeLibrary(library) {
  const cvs = library.cvs.length;
  const apps = library.applications.length;
  const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;
  const parts = [plural(cvs, 'version de CV', 'versions de CV')];
  if (apps) parts.push(plural(apps, 'candidature', 'candidatures'));
  return parts.join(' et ');
}

// Version de base d'une version : on remonte les sourceId tant que la version
// d'origine existe encore. On s'arrête à un changement de langue, pour qu'une
// traduction reste la base de ses propres adaptations.
export function rootCvId(cvs, id) {
  const byId = new Map(cvs.map((cv) => [cv.id, cv]));
  let current = byId.get(id);
  if (!current) return id;
  const seen = new Set([current.id]);
  while (current.sourceId && !seen.has(current.sourceId)) {
    const parent = byId.get(current.sourceId);
    if (!parent || parent.settings?.lang !== current.settings?.lang) break;
    current = parent;
    seen.add(current.id);
  }
  return current.id;
}

// Version créée par l'IA (adaptation à une offre, traduction) à partir de `baseCv`.
// Les champs absents de `fields` sont hérités de la version de départ. La lettre part vide,
// sauf `fields.coverLetter` (lettre commencée pour cette offre, reprise à la demande).
export function createVersionFromAi(library, baseCv, fields = {}) {
  const overrides = {
    name: uniqueCvName(library, fields.name || suggestVersionName(fields) || `${baseCv.name} (IA)`),
    data: normalizeData(fields.data),
    settings: normalizeSettings({ ...baseCv.settings, ...(fields.settingsPatch || {}) }),
    coverLetter: fields.coverLetter ? normalizeCoverLetter(fields.coverLetter) : emptyCoverLetter(),
  };
  for (const key of ['company', 'jobTitle', 'jobOffer', 'offerUrl']) {
    if (fields[key] !== undefined && fields[key] !== null) overrides[key] = String(fields[key]);
  }
  const cv = duplicateCv(baseCv, overrides);
  let next = addCv(library, cv);
  if (fields.addToTracker) next = addApplicationForCv(next, cv);
  return { library: next, cv };
}

// Comme le formulaire du suivi : une candidature a au moins une entreprise ou un poste.
export function canTrackApplication({ company = '', jobTitle = '' } = {}) {
  return Boolean(String(company || '').trim() || String(jobTitle || '').trim());
}

// Candidature « À envoyer » liée à une version : pas encore de date d'envoi (elle sera
// fixée au passage à « Envoyée », et la relance calculée à partir d'elle).
// Sans entreprise ni poste, rien n'est ajouté (une ligne « candidature sans titre » ne sert à rien).
export function addApplicationForCv(library, cv) {
  if (!canTrackApplication(cv)) return library;
  const application = normalizeApplication({
    company: cv.company,
    position: cv.jobTitle,
    offerUrl: cv.offerUrl,
    date: '',
    status: 'a_envoyer',
    cvId: cv.id,
  });
  return { ...library, applications: [...library.applications, application] };
}

// ── Coordonnées communes aux versions ─────────────────────────────────────
// Chaque version est une copie complète : une coordonnée corrigée dans l'une ne change
// pas les autres. Ces champs peuvent être reportés dans les versions qui ont l'ancienne valeur.
export const SHARED_CONTACT_FIELDS = ['name', 'email', 'phone', 'location', 'photo'];

const contactOf = (cv, field) => String(cv?.data?.personalInfo?.[field] ?? '').trim();

// Autres versions dont la coordonnée vaut encore `value` (espaces de bord ignorés).
export function versionsWithContact(library, exceptId, field, value) {
  if (!SHARED_CONTACT_FIELDS.includes(field)) return [];
  const target = String(value ?? '').trim();
  return library.cvs.filter((cv) => cv.id !== exceptId && contactOf(cv, field) === target).map((cv) => cv.id);
}

// Remplace `from` par `to` dans les versions `ids` qui ont encore `from` (les autres ne bougent pas).
export function replaceContact(library, ids, field, from, to) {
  const expected = String(from ?? '').trim();
  if (!SHARED_CONTACT_FIELDS.includes(field) || expected === String(to ?? '').trim()) return library;
  return ids.reduce(
    (lib, id) =>
      updateCvInLibrary(lib, id, (cv) =>
        contactOf(cv, field) === expected
          ? { ...cv, data: { ...cv.data, personalInfo: { ...cv.data.personalInfo, [field]: to } } }
          : cv,
      ),
    library,
  );
}

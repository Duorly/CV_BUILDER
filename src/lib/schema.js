import { createId } from './ids';

// ── Sections ──────────────────────────────────────────────────────────────
// Ordre par défaut. Le template « design » répartit les sections par colonne
// en conservant cet ordre ; le template ATS les affiche toutes dans cet ordre.
export const BUILTIN_SECTIONS = [
  'profile',
  'skills',
  'experiences',
  'education',
  'otherExperiences',
  'links',
  'languages',
  'certifications',
];

export const SECTION_COLUMNS = {
  profile: 'main',
  experiences: 'main',
  education: 'main',
  otherExperiences: 'main',
  skills: 'sidebar',
  links: 'sidebar',
  languages: 'sidebar',
  certifications: 'sidebar',
};

export const customSectionKey = (custom) => `custom:${custom.id}`;

export function sectionColumn(data, sectionId) {
  if (sectionId.startsWith('custom:')) {
    const custom = data.customSections.find((c) => customSectionKey(c) === sectionId);
    return custom?.column === 'sidebar' ? 'sidebar' : 'main';
  }
  return SECTION_COLUMNS[sectionId] || 'main';
}

// Élément affiché sur le CV : ni vide, ni masqué (expériences, formations, groupes de compétences).
export const isShownItem = (item) => !item.hidden && !isBlankItem(item);

// Sections visibles, dans l'ordre choisi.
export function visibleSections(data) {
  return (data.sections || []).filter((s) => s.visible !== false).map((s) => s.id);
}

// ── Réglages d'affichage ─────────────────────────────────────────────────
// Pas de « police système » : sur macOS, Chrome intègre la police SF (variable) en Type 3
// dans les PDF imprimés, sans aucun espace entre les mots pour les logiciels de recrutement.
// Une ancienne valeur 'system' redevient 'inter' (normalizeSettings).
export const FONT_OPTIONS = [
  { id: 'inter', label: 'Inter (moderne)', css: "'Inter', Helvetica, Arial, sans-serif" },
  { id: 'helvetica', label: 'Helvetica / Arial (classique)', css: 'Helvetica, Arial, sans-serif' },
  { id: 'georgia', label: 'Georgia (serif)', css: "Georgia, 'Times New Roman', serif" },
];

export const FONT_SCALE_MIN = 0.85;
export const FONT_SCALE_MAX = 1.3;

export const defaultSettings = () => ({
  template: 'design', // 'design' | 'ats'
  fontScale: 1,
  primaryColor: '#2563eb',
  sidebarBg: '#f9fafb',
  textColor: '#111827',
  fontFamily: 'inter',
  lang: 'fr', // langue des libellés du CV : 'fr' | 'en'
  showPhoto: true,
  headerAlign: 'left', // 'left' | 'center' : nom, poste et coordonnées
  textAlign: 'left', // 'left' | 'justify' : paragraphes et puces
});

export function fontCss(settings) {
  return (FONT_OPTIONS.find((f) => f.id === settings?.fontFamily) || FONT_OPTIONS[0]).css;
}

// ── Fabriques d'éléments (valeurs vides, jamais de texte factice) ───────
export const newSkillGroup = () => ({ id: createId('skg'), category: '', skills: [], hidden: false });
export const newLink = () => ({ id: createId('lnk'), name: '', url: '', label: '', icon: 'Link' });
export const newLanguage = () => ({ id: createId('lng'), name: '', level: '' });
export const newExperience = () => ({
  id: createId('exp'),
  title: '',
  company: '',
  location: '',
  period: '',
  details: [''],
  hidden: false,
});
export const newEducation = () => ({
  id: createId('edu'),
  title: '',
  school: '',
  degree: '',
  location: '',
  period: '',
  details: [],
  objectives: [],
  tools: [],
  link: '',
  hidden: false, // masquée sur le CV, sans être supprimée
});
export const newCertification = () => ({ id: createId('cert'), name: '', issuer: '', date: '' });
// layout : 'list' (les uns au-dessus des autres) | 'inline' (sur une ligne, séparés par « · »).
export const newCustomSection = () => ({ id: createId('sec'), title: '', column: 'main', layout: 'list', items: [''] });

export const emptyPersonalInfo = () => ({
  name: '',
  title: '',
  email: '',
  phone: '',
  location: '',
  photo: '',
  objective: '',
});

export const defaultSectionsConfig = () =>
  BUILTIN_SECTIONS.map((id) => ({ id, title: '', visible: true }));

export const emptyResume = () => ({
  personalInfo: emptyPersonalInfo(),
  mainSkills: [],
  socialLinks: [],
  languages: [],
  experiences: [],
  education: [],
  certifications: [],
  otherExperiences: [],
  customSections: [],
  sections: defaultSectionsConfig(),
});

export const emptyCoverLetter = () => ({
  recipientName: '',
  recipientCompany: '',
  recipientAddress: '',
  place: '',
  date: '',
  subject: '',
  salutation: '',
  body: '',
  closing: '',
  signature: '',
});

// ── Normalisation ─────────────────────────────────────────────────────────
// Toute donnée externe (import JSON, réponse IA, localStorage) passe par ici :
// le rendu peut alors supposer que chaque clé existe avec le bon type.

const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const strArr = (v) => {
  if (Array.isArray(v)) return v.filter((x) => x != null && typeof x !== 'object').map(str);
  if (typeof v === 'string' && v.trim()) return [v];
  return [];
};
const objArr = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object' && !Array.isArray(x)) : []);
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

function withId(item, prefix, seen) {
  let id = str(item.id);
  if (!id || seen.has(id)) id = createId(prefix);
  seen.add(id);
  return id;
}

export const PHOTO_DATA_URL = /^data:image\/[\w.+-]+;base64,/i;

export function normalizeData(input) {
  const src = isObj(input) ? input : {};
  const pi = isObj(src.personalInfo) ? src.personalInfo : {};
  const seen = new Set();

  const personalInfo = { ...emptyPersonalInfo() };
  for (const key of Object.keys(personalInfo)) personalInfo[key] = str(pi[key]);
  // Seule une image intégrée est acceptée : une adresse externe serait chargée à chaque
  // ouverture (pistage) et imprimée telle quelle.
  if (!PHOTO_DATA_URL.test(personalInfo.photo)) personalInfo.photo = '';

  const mainSkills = objArr(src.mainSkills).map((g) => ({
    id: withId(g, 'skg', seen),
    category: str(g.category),
    skills: strArr(g.skills),
    hidden: g.hidden === true,
  }));

  const socialLinks = objArr(src.socialLinks).map((l) => ({
    id: withId(l, 'lnk', seen),
    name: str(l.name),
    url: str(l.url),
    label: str(l.label),
    icon: str(l.icon) || 'Link',
  }));

  const languages = objArr(src.languages).map((l) => ({
    id: withId(l, 'lng', seen),
    name: str(l.name),
    level: str(l.level),
  }));

  const normExp = (e) => ({
    id: withId(e, 'exp', seen),
    title: str(e.title),
    company: str(e.company),
    location: str(e.location),
    period: str(e.period),
    details: strArr(e.details),
    hidden: e.hidden === true,
  });
  const experiences = objArr(src.experiences).map(normExp);
  const otherExperiences = objArr(src.otherExperiences).map(normExp);

  const education = objArr(src.education).map((e) => ({
    id: withId(e, 'edu', seen),
    title: str(e.title),
    school: str(e.school),
    degree: str(e.degree),
    location: str(e.location),
    period: str(e.period),
    details: strArr(e.details),
    objectives: strArr(e.objectives),
    tools: strArr(e.tools),
    link: str(e.link),
    hidden: e.hidden === true,
  }));

  const certifications = objArr(src.certifications).map((c) => ({
    id: withId(c, 'cert', seen),
    name: str(c.name),
    issuer: str(c.issuer),
    date: str(c.date),
  }));

  const customSections = objArr(src.customSections).map((c) => ({
    id: withId(c, 'sec', seen),
    title: str(c.title),
    column: c.column === 'sidebar' ? 'sidebar' : 'main',
    layout: c.layout === 'inline' ? 'inline' : 'list',
    items: strArr(c.items),
  }));

  // Sections : on garde l'ordre fourni, on retire les inconnues et les doublons,
  // on ajoute à la fin celles qui manquent (nouvelles sections libres incluses).
  const knownIds = new Set([...BUILTIN_SECTIONS, ...customSections.map(customSectionKey)]);
  const sections = [];
  const placed = new Set();
  for (const s of objArr(src.sections)) {
    const id = str(s.id);
    if (!knownIds.has(id) || placed.has(id)) continue;
    placed.add(id);
    sections.push({ id, title: str(s.title), visible: s.visible !== false });
  }
  for (const id of knownIds) {
    if (!placed.has(id)) sections.push({ id, title: '', visible: true });
  }

  return {
    personalInfo,
    mainSkills,
    socialLinks,
    languages,
    experiences,
    education,
    certifications,
    otherExperiences,
    customSections,
    sections,
  };
}

export function normalizeSettings(input) {
  const src = isObj(input) ? input : {};
  const d = defaultSettings();
  const color = (v, fallback) => (typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v) ? v : fallback);
  const scale = Number(src.fontScale);
  return {
    template: src.template === 'ats' ? 'ats' : 'design',
    fontScale: Number.isFinite(scale)
      ? Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, scale))
      : d.fontScale,
    primaryColor: color(src.primaryColor, d.primaryColor),
    sidebarBg: color(src.sidebarBg, d.sidebarBg),
    textColor: color(src.textColor, d.textColor),
    fontFamily: FONT_OPTIONS.some((f) => f.id === src.fontFamily) ? src.fontFamily : d.fontFamily,
    lang: src.lang === 'en' ? 'en' : 'fr',
    showPhoto: src.showPhoto !== false,
    headerAlign: src.headerAlign === 'center' ? 'center' : 'left',
    textAlign: src.textAlign === 'justify' ? 'justify' : 'left',
  };
}

export function normalizeCoverLetter(input) {
  const src = isObj(input) ? input : {};
  const out = emptyCoverLetter();
  for (const key of Object.keys(out)) out[key] = str(src[key]);
  return out;
}

// ── Helpers de rendu ──────────────────────────────────────────────────────
// Retire les chaînes vides : un bloc ne s'affiche que s'il reste du contenu.
export const clean = (arr) => (arr || []).map((s) => str(s).trim()).filter(Boolean);

export const joinNonEmpty = (parts, sep) => parts.map((p) => str(p).trim()).filter(Boolean).join(sep);

// Une expérience / formation / certification est « vide » si aucun champ texte n'est rempli.
export function isBlankItem(item) {
  return Object.entries(item || {}).every(([key, value]) => {
    if (['id', 'icon', 'column', 'layout'].includes(key) || typeof value === 'boolean') return true;
    if (Array.isArray(value)) return clean(value).length === 0;
    return !str(value).trim();
  });
}

import { createId } from './ids';

// ── Sections ──────────────────────────────────────────────────────────────
// Ordre par défaut. Les modèles en deux colonnes (Design, Classique, Focus) répartissent les sections
// par colonne en conservant cet ordre ; les modèles ATS et Expert les affichent toutes dans cet ordre.
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

// Colonnes propres à un modèle en couleur (settings.designStyle) : Focus place la formation dans la
// colonne latérale, pour laisser la page à l'expérience.
export const STYLE_COLUMNS = {
  focus: { education: 'sidebar' },
};

export const customSectionKey = (custom) => `custom:${custom.id}`;

// Colonne d'une section dans les modèles en deux colonnes. designStyle : modèle en couleur affiché.
export function sectionColumn(data, sectionId, designStyle) {
  if (sectionId.startsWith('custom:')) {
    const custom = data.customSections.find((c) => customSectionKey(c) === sectionId);
    return custom?.column === 'sidebar' ? 'sidebar' : 'main';
  }
  return STYLE_COLUMNS[designStyle]?.[sectionId] || SECTION_COLUMNS[sectionId] || 'main';
}

// Modèles affichés sur une seule colonne : l'emplacement des sections ne s'y applique pas.
export const isSingleColumn = (settings) => settings?.template === 'ats' || settings?.designStyle === 'expert';

// Élément affiché sur le CV : ni vide, ni masqué (expériences, formations, compétences, liens…).
export const isShownItem = (item) => !item.hidden && !isBlankItem(item);

// Puces affichées d'une liste : sans celles dont l'indice figure dans `hidden`
// (hiddenDetails d'une expérience ou d'une formation, hiddenItems d'une section libre).
export const shownList = (list, hidden) => (hidden?.length ? list.filter((_, i) => !hidden.includes(i)) : list);

// Compétences affichées d'un groupe : sans celles de hiddenSkills.
export const shownSkills = (group) =>
  group.hiddenSkills?.length ? group.skills.filter((skill) => !group.hiddenSkills.includes(skill)) : group.skills;

// Sections visibles, dans l'ordre choisi.
export function visibleSections(data) {
  return (data.sections || []).filter((s) => s.visible !== false).map((s) => s.id);
}

// ── Réglages d'affichage ─────────────────────────────────────────────────
// Pas de « police système » : sur macOS, Chrome intègre la police SF (variable) en Type 3
// dans les PDF imprimés, sans aucun espace entre les mots pour les logiciels de recrutement.
// Une ancienne valeur 'system' redevient 'inter' (normalizeSettings).
// group : FONT_GROUPS (liste « Police » de l'Apparence). Les polices web sont chargées par src/fonts.js ;
// Helvetica / Arial et Georgia sont celles de l'ordinateur.
// Écartées après essai : Lato, Source Sans 3, EB Garamond et Poppins. Leurs espaces, trop étroites,
// disparaissent à l'extraction du texte du PDF imprimé (« CamilleMartin »), comme avec la police
// système (voir e2e/telechargement.spec.js).
export const FONT_GROUPS = [
  { id: 'sans', label: 'Sans empattement (modernes)' },
  { id: 'serif', label: 'Avec empattement (classiques)' },
];
const SANS_FALLBACK = 'Helvetica, Arial, sans-serif';
const SERIF_FALLBACK = "Georgia, 'Times New Roman', serif";
const sans = (id, family, label) => ({ id, label, group: 'sans', css: `'${family}', ${SANS_FALLBACK}` });
const serif = (id, family, label) => ({ id, label, group: 'serif', css: `'${family}', ${SERIF_FALLBACK}` });
// La première est la police par défaut (fontCss).
export const FONT_OPTIONS = [
  sans('inter', 'Inter', 'Inter (moderne)'),
  sans('opensans', 'Open Sans', 'Open Sans (ronde)'),
  sans('roboto', 'Roboto', 'Roboto (neutre)'),
  sans('montserrat', 'Montserrat', 'Montserrat (géométrique)'),
  sans('raleway', 'Raleway', 'Raleway (raffinée)'),
  sans('nunito', 'Nunito', 'Nunito (douce)'),
  sans('worksans', 'Work Sans', 'Work Sans (épurée)'),
  sans('plexsans', 'IBM Plex Sans', 'IBM Plex Sans (technique)'),
  { id: 'helvetica', label: 'Helvetica / Arial (classique)', group: 'sans', css: SANS_FALLBACK },
  { id: 'georgia', label: 'Georgia (sobre)', group: 'serif', css: SERIF_FALLBACK },
  serif('lora', 'Lora', 'Lora (élégante)'),
  serif('merriweather', 'Merriweather', 'Merriweather (très lisible)'),
  serif('sourceserif', 'Source Serif 4', 'Source Serif 4 (éditoriale)'),
  serif('ptserif', 'PT Serif', 'PT Serif (traditionnelle)'),
  serif('baskerville', 'Libre Baskerville', 'Libre Baskerville (distinguée)'),
  serif('plexserif', 'IBM Plex Serif', 'IBM Plex Serif (contemporaine)'),
];

export const FONT_SCALE_MIN = 0.85;
export const FONT_SCALE_MAX = 1.3;

// Marges de la page et espacement entre sections et éléments : un coefficient appliqué
// aux valeurs « normales » des modèles (CSS --margin-scale / --spacing-scale, PDF direct).
export const MARGIN_OPTIONS = [
  { id: 'narrow', label: 'Étroites', scale: 0.7 },
  { id: 'normal', label: 'Normales', scale: 1 },
  { id: 'wide', label: 'Larges', scale: 1.3 },
];
export const SPACING_OPTIONS = [
  { id: 'compact', label: 'Serré', scale: 0.65 },
  { id: 'normal', label: 'Normal', scale: 1 },
  { id: 'airy', label: 'Aéré', scale: 1.4 },
];
const optionScale = (options, id) => (options.find((o) => o.id === id) || options[1]).scale;
export const marginScale = (settings) => optionScale(MARGIN_OPTIONS, settings?.margins);
export const spacingScale = (settings) => optionScale(SPACING_OPTIONS, settings?.spacing);

export const defaultSettings = () => ({
  template: 'design', // 'design' (modèle en couleur, imprimé par le navigateur) | 'ats'
  designStyle: 'modern', // modèle en couleur : 'modern' (« Design ») | 'classic' (« Classique ») | 'focus' | 'expert' — DESIGN_STYLES
  fontScale: 1,
  primaryColor: '#2563eb',
  sidebarBg: '#f9fafb',
  textColor: '#111827', // texte du corps du CV (colonne principale, modèle ATS, PDF direct)
  sidebarTextColor: '#111827', // texte de la colonne latérale (modèles Design, Classique et Focus)
  fontFamily: 'inter',
  lang: 'fr', // langue des libellés du CV : 'fr' | 'en'
  showPhoto: true,
  headerAlign: 'left', // 'left' | 'center' : nom, poste et coordonnées
  textAlign: 'left', // 'left' | 'justify' : paragraphes et puces
  margins: 'normal', // MARGIN_OPTIONS
  spacing: 'normal', // SPACING_OPTIONS
  headerStyle: 'plain', // modèles ATS, Expert et Focus : 'plain' (filet sous l'en-tête) | 'colored' (bandeau de couleur)
  skillsStyle: 'tags', // modèle Design : compétences en 'tags' (étiquettes encadrées) | 'list' (liste à puces)
});

// ── Modèles en couleur ───────────────────────────────────────────────────
// settings.template === 'design' : CV en couleur, imprimé par le navigateur (« PDF design »).
// Son dessin est celui de settings.designStyle, gardé quand le modèle ATS est affiché : c'est lui
// que donne le « PDF design via l'impression ».
// layout : sa mise en page en quelques mots, pour la fenêtre « Télécharger » (« Deux colonnes et vos couleurs »).
// Focus : deux colonnes sous un en-tête pleine largeur, la formation à gauche (STYLE_COLUMNS) pour
// laisser le corps à l'expérience. Expert : une colonne pleine largeur, dates dans la marge, pour un
// long parcours (souvent deux pages).
export const DESIGN_STYLES = [
  { id: 'modern', label: 'Design', layout: 'deux colonnes' },
  { id: 'classic', label: 'Classique', layout: 'deux colonnes' },
  { id: 'focus', label: 'Focus', layout: 'deux colonnes, la formation à gauche' },
  { id: 'expert', label: 'Expert', layout: 'une colonne pleine largeur, dates dans la marge' },
];
const designStyleOf = (settings) => DESIGN_STYLES.find((s) => s.id === settings?.designStyle) || DESIGN_STYLES[0];
export const designStyleLabel = (settings) => designStyleOf(settings).label;
export const designStyleLayout = (settings) => designStyleOf(settings).layout;

export const COLOR_KEYS = ['primaryColor', 'textColor', 'sidebarBg', 'sidebarTextColor'];

// Couleurs et police par défaut de chaque modèle en couleur. Classique : colonne vert foncé au
// texte blanc, filets et icônes vert vif, en Open Sans. Focus : vert d'eau, colonne teintée. Expert :
// bleu marine, sans colonne (fond et texte de la colonne repris du modèle Design, pour y revenir dans
// ses couleurs).
export const STYLE_DEFAULTS = {
  modern: {
    primaryColor: '#2563eb',
    textColor: '#111827',
    sidebarBg: '#f9fafb',
    sidebarTextColor: '#111827',
    fontFamily: 'inter',
  },
  classic: {
    primaryColor: '#31a454',
    textColor: '#111827',
    sidebarBg: '#1c472d',
    sidebarTextColor: '#ffffff',
    fontFamily: 'opensans',
  },
  focus: {
    primaryColor: '#0f766e',
    textColor: '#111827',
    sidebarBg: '#eef6f5',
    sidebarTextColor: '#111827',
    fontFamily: 'inter',
  },
  expert: {
    primaryColor: '#1e3a5f',
    textColor: '#111827',
    sidebarBg: '#f9fafb',
    sidebarTextColor: '#111827',
    fontFamily: 'inter',
  },
};

const styleDefaults = (style) => STYLE_DEFAULTS[style] || STYLE_DEFAULTS.modern;

// Couleurs par défaut du CV (« Couleurs par défaut » de l'Apparence) : celles de son modèle en couleur.
export const defaultColors = (settings) =>
  Object.fromEntries(COLOR_KEYS.map((key) => [key, styleDefaults(settings?.designStyle)[key]]));

const sameValue = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

// Réglages à appliquer pour afficher le modèle en couleur `designStyle`. Un modèle s'affiche dans
// ses couleurs et sa police : celles encore par défaut de l'ancien modèle deviennent celles du
// nouveau. Des couleurs ou une police choisies sont gardées (les quatre couleurs vont ensemble).
export function designStylePatch(settings, designStyle) {
  const patch = { template: 'design', designStyle };
  if (designStyle === settings.designStyle || !STYLE_DEFAULTS[designStyle]) return patch;
  const from = styleDefaults(settings.designStyle);
  const to = STYLE_DEFAULTS[designStyle];
  if (COLOR_KEYS.every((key) => sameValue(settings[key], from[key]))) {
    for (const key of COLOR_KEYS) patch[key] = to[key];
  }
  if (sameValue(settings.fontFamily, from.fontFamily)) patch.fontFamily = to.fontFamily;
  return patch;
}

// ── Couleurs ──────────────────────────────────────────────────────────────
// #rgb, #rgba, #rrggbb ou #rrggbbaa → [r, g, b] (0–255), transparence ignorée ; null si illisible.
function hexToRgb(color) {
  let hex = String(color || '').replace('#', '');
  if (hex.length === 3 || hex.length === 4) hex = [...hex.slice(0, 3)].map((c) => c + c).join('');
  const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return rgb.some(Number.isNaN) ? null : rgb;
}

const rgbToHex = (rgb) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

function luminance(rgb) {
  const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = rgb.map((c) => linear(c / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Contraste WCAG entre deux couleurs (1 à 21) ; 4,5 et plus : texte courant lisible.
export function contrastRatio(a, b) {
  const [ra, rb] = [hexToRgb(a), hexToRgb(b)];
  if (!ra || !rb) return 21;
  const [la, lb] = [luminance(ra), luminance(rb)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export const MIN_TEXT_CONTRAST = 4.5;
// Éléments graphiques (filets, puces, icônes) : contraste minimal plus faible que pour le texte.
export const MIN_GRAPHIC_CONTRAST = 3;

// Couleur la plus proche de `color` qui atteint le contraste `target` (par défaut `min`) sur `background` :
// la même teinte, assombrie sur un fond clair ou éclaircie sur un fond foncé. Inchangée si elle atteint
// déjà `min`. Ainsi une couleur choisie ne disparaît jamais sur le fond où elle est posée (texte blanc
// sur une colonne claire, couleur principale jaune sur la page blanche…).
export function ensureContrast(color, background, min = MIN_TEXT_CONTRAST, target = min) {
  const rgb = hexToRgb(color);
  const bg = hexToRgb(background);
  if (!rgb || !bg || contrastRatio(color, background) >= min) return color;
  min = Math.max(min, target);
  const bgLum = luminance(bg);
  // Vers le blanc ou le noir : le côté qui peut offrir le plus de contraste avec ce fond.
  const extreme = 1.05 / (bgLum + 0.05) > (bgLum + 0.05) / 0.05 ? [255, 255, 255] : [0, 0, 0];
  for (let step = 1; step <= 50; step += 1) {
    const candidate = rgbToHex(rgb.map((c, i) => c + (extreme[i] - c) * (step / 50)));
    if (contrastRatio(candidate, background) >= min) return candidate;
  }
  return rgbToHex(extreme);
}

// Couleur de texte lisible sur un fond (#rgb ou #rrggbb) : blanc sur un fond foncé, sinon presque noir.
export function readableTextOn(background) {
  const rgb = hexToRgb(background);
  // Contraste avec le blanc ≥ 4,5 (lecture courante) tant que la luminance reste sous 0,18.
  return !rgb || luminance(rgb) < 0.18 ? '#ffffff' : '#111827';
}

// Nuances du texte d'une zone du CV, de la couleur choisie (dark : nom, titres) vers son fond :
// ink (corps du modèle ATS), body (corps et coordonnées), muted (entreprise, dates), light (petites mentions).
// La couleur par défaut garde exactement la palette d'origine.
const DEFAULT_TEXT_TONES = { dark: '#111827', ink: '#1f2937', body: '#374151', muted: '#4b5563', light: '#6b7280' };
const TONE_MIX = { ink: 0.07, body: 0.18, muted: 0.26, light: 0.39 };

export function textTones(color, background = '#ffffff') {
  const text = hexToRgb(color);
  const bg = hexToRgb(background);
  if (!text || String(color).toLowerCase() === DEFAULT_TEXT_TONES.dark) return DEFAULT_TEXT_TONES;
  const dark = rgbToHex(text);
  const tones = { dark };
  for (const [name, mix] of Object.entries(TONE_MIX)) {
    // Plus proche du fond que la couleur choisie, mais jamais au point de devenir illisible.
    let t = bg ? mix : 0;
    let tone = dark;
    for (; t > 0; t = Math.round((t - 0.03) * 100) / 100) {
      tone = rgbToHex(text.map((c, i) => c + (bg[i] - c) * t));
      if (contrastRatio(tone, background) >= MIN_TEXT_CONTRAST) break;
    }
    tones[name] = t > 0 ? tone : dark;
  }
  return tones;
}

export function fontCss(settings) {
  return (FONT_OPTIONS.find((f) => f.id === settings?.fontFamily) || FONT_OPTIONS[0]).css;
}

// ── Fabriques d'éléments (valeurs vides, jamais de texte factice) ───────
export const newSkillGroup = () => ({ id: createId('skg'), category: '', skills: [], hiddenSkills: [], hidden: false });
export const newLink = () => ({ id: createId('lnk'), name: '', url: '', label: '', icon: 'Link', hidden: false });
export const newLanguage = () => ({ id: createId('lng'), name: '', level: '', hidden: false });
export const newExperience = () => ({
  id: createId('exp'),
  title: '',
  company: '',
  location: '',
  period: '',
  details: [''],
  hiddenDetails: [], // indices des puces masquées
  stack: [], // stack technique : langages, frameworks, outils utilisés
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
  hiddenDetails: [],
  objectives: [],
  tools: [],
  link: '',
  hidden: false, // masquée sur le CV, sans être supprimée
});
export const newCertification = () => ({ id: createId('cert'), name: '', issuer: '', date: '', hidden: false });
// layout : CUSTOM_LAYOUTS. Une « ligne de texte » est une section libre en texte simple, souvent sans titre.
// 'list' : les uns au-dessus des autres, avec puces ; 'inline' : sur une ligne, séparés par « · » ;
// 'text' : texte simple, un paragraphe par ligne, sans puce.
export const CUSTOM_LAYOUTS = ['list', 'inline', 'text'];
export const newCustomSection = (layout = 'list') => ({
  id: createId('sec'),
  title: '',
  column: 'main',
  layout: CUSTOM_LAYOUTS.includes(layout) ? layout : 'list',
  items: [''],
  hiddenItems: [], // indices des éléments masqués
});

export const emptyPersonalInfo = () => ({
  name: '',
  title: '',
  subtitle: '', // une ligne sous le titre : contrat recherché, disponibilité, spécialité…
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
// Indices valides de `list`, sans doublon, dans l'ordre.
const indexArr = (v, list) =>
  [...new Set(Array.isArray(v) ? v.filter((i) => Number.isInteger(i) && i >= 0 && i < list.length) : [])].sort(
    (a, b) => a - b,
  );

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

  const mainSkills = objArr(src.mainSkills).map((g) => {
    const skills = strArr(g.skills);
    return {
      id: withId(g, 'skg', seen),
      category: str(g.category),
      skills,
      hiddenSkills: [...new Set(strArr(g.hiddenSkills))].filter((skill) => skills.includes(skill)),
      hidden: g.hidden === true,
    };
  });

  const socialLinks = objArr(src.socialLinks).map((l) => ({
    id: withId(l, 'lnk', seen),
    name: str(l.name),
    url: str(l.url),
    label: str(l.label),
    icon: str(l.icon) || 'Link',
    hidden: l.hidden === true,
  }));

  const languages = objArr(src.languages).map((l) => ({
    id: withId(l, 'lng', seen),
    name: str(l.name),
    level: str(l.level),
    hidden: l.hidden === true,
  }));

  const normExp = (e) => {
    const details = strArr(e.details);
    return {
      id: withId(e, 'exp', seen),
      title: str(e.title),
      company: str(e.company),
      location: str(e.location),
      period: str(e.period),
      details,
      hiddenDetails: indexArr(e.hiddenDetails, details),
      stack: strArr(e.stack),
      hidden: e.hidden === true,
    };
  };
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
    hiddenDetails: indexArr(e.hiddenDetails, strArr(e.details)),
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
    hidden: c.hidden === true,
  }));

  const customSections = objArr(src.customSections).map((c) => ({
    id: withId(c, 'sec', seen),
    title: str(c.title),
    column: c.column === 'sidebar' ? 'sidebar' : 'main',
    layout: CUSTOM_LAYOUTS.includes(c.layout) ? c.layout : 'list',
    items: strArr(c.items),
    hiddenItems: indexArr(c.hiddenItems, strArr(c.items)),
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
    designStyle: DESIGN_STYLES.some((style) => style.id === src.designStyle) ? src.designStyle : 'modern',
    fontScale: Number.isFinite(scale)
      ? Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, scale))
      : d.fontScale,
    primaryColor: color(src.primaryColor, d.primaryColor),
    sidebarBg: color(src.sidebarBg, d.sidebarBg),
    textColor: color(src.textColor, d.textColor),
    // Avant ce réglage, la couleur du texte valait aussi pour la colonne : elle y reste.
    sidebarTextColor: color(src.sidebarTextColor, color(src.textColor, d.sidebarTextColor)),
    fontFamily: FONT_OPTIONS.some((f) => f.id === src.fontFamily) ? src.fontFamily : d.fontFamily,
    lang: src.lang === 'en' ? 'en' : 'fr',
    showPhoto: src.showPhoto !== false,
    headerAlign: src.headerAlign === 'center' ? 'center' : 'left',
    textAlign: src.textAlign === 'justify' ? 'justify' : 'left',
    margins: MARGIN_OPTIONS.some((o) => o.id === src.margins) ? src.margins : d.margins,
    spacing: SPACING_OPTIONS.some((o) => o.id === src.spacing) ? src.spacing : d.spacing,
    headerStyle: src.headerStyle === 'colored' ? 'colored' : 'plain',
    skillsStyle: src.skillsStyle === 'list' ? 'list' : 'tags',
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
    // Réglages d'affichage (colonne, présentation, éléments masqués) : pas du contenu.
    if (['id', 'icon', 'column', 'layout'].includes(key) || key.startsWith('hidden')) return true;
    if (Array.isArray(value)) return clean(value).length === 0;
    return !str(value).trim();
  });
}

import { customSectionKey, isShownItem, shownList, shownSkills, visibleSections } from '../../lib/schema';
import { prettyUrl } from '../../lib/files';
import { alteredFragments, droppedSymbols } from './pdfText';

// Ce que le PDF direct (police Helvetica, jeu Windows-1252) ne peut pas écrire tel quel,
// pour prévenir l'utilisatrice avant le téléchargement au lieu de modifier son CV en silence.
// Léger : n'importe pas le moteur PDF, la fenêtre « Télécharger » l'appelle à chaque ouverture.

const SKIPPED_KEYS = new Set(['id', 'icon', 'column', 'layout', 'photo', 'visible', 'hidden', 'hiddenSkills']);

function collectStrings(value, out, key = '') {
  if (SKIPPED_KEYS.has(key)) return;
  if (typeof value === 'string') {
    out.push(key === 'url' || key === 'link' ? prettyUrl(value) : value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, out));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => collectStrings(v, out, k));
  }
}

// Seul ce qui est affiché compte : éléments, puces et compétences masqués exclus.
const withShownDetails = (item) => ({ ...item, details: shownList(item.details, item.hiddenDetails) });
const SECTION_DATA = {
  skills: (data) => data.mainSkills.filter((group) => !group.hidden).map((group) => ({ ...group, skills: shownSkills(group) })),
  experiences: (data) => data.experiences.filter(isShownItem).map(withShownDetails),
  otherExperiences: (data) => data.otherExperiences.filter(isShownItem).map(withShownDetails),
  education: (data) => data.education.filter(isShownItem).map(withShownDetails),
  links: (data) => data.socialLinks.filter((link) => !link.hidden).map(({ url }) => ({ url })),
  languages: (data) => data.languages.filter((language) => !language.hidden),
  certifications: (data) => data.certifications.filter((cert) => !cert.hidden),
  profile: (data) => data.personalInfo.objective,
};

// Textes rendus par le PDF direct : en-tête et sections visibles (titres personnalisés compris).
export function pdfSourceTexts(data) {
  const out = [];
  const { name, title, email, phone, location } = data.personalInfo;
  out.push(name, title, email, phone, location);
  for (const id of visibleSections(data)) {
    const custom = data.sections.find((s) => s.id === id)?.title;
    if (custom) out.push(custom);
    if (SECTION_DATA[id]) {
      collectStrings(SECTION_DATA[id](data), out);
    } else if (id.startsWith('custom:')) {
      const section = data.customSections.find((c) => customSectionKey(c) === id);
      if (section) collectStrings({ title: section.title, items: shownList(section.items, section.hiddenItems) }, out);
    }
  }
  return out;
}

// Morceaux de texte dont des lettres seraient altérées, sans doublon, dans l'ordre du CV (au plus
// `limit`) ; à part, les emoji et symboles que le PDF direct retire (information, pas un défaut).
export function pdfAlteredText(data, limit = 8) {
  const seen = new Set();
  const symbols = new Set();
  let more = false;
  for (const text of pdfSourceTexts(data)) {
    for (const fragment of alteredFragments(text)) {
      if (seen.size >= limit && !seen.has(fragment)) more = true;
      else seen.add(fragment);
    }
    for (const symbol of droppedSymbols(text)) if (symbols.size < limit) symbols.add(symbol);
  }
  return { fragments: [...seen], more, symbols: [...symbols] };
}

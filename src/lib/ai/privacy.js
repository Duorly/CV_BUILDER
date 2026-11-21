import { clean, normalizeData, shownList, shownSkills } from '../schema';

// Contenu du CV envoyé à l’IA : sans photo ni coordonnées.

// ── Données envoyées : jamais de photo ni de coordonnées ──────────────────

const IDENTITY_TOKENS = { name: '[NOM]', email: '[E-MAIL]', phone: '[TÉLÉPHONE]' };
const IDENTITY_TOKEN_RE = /\[(NOM|E-MAIL|TÉLÉPHONE)\]/g;

// Remplace le nom, l’e-mail et le téléphone s’ils apparaissent dans un texte libre,
// puis les remet en place dans les réponses de l’IA.
export function identityScrubber(personalInfo = {}) {
  const pairs = Object.entries(IDENTITY_TOKENS)
    .map(([field, token]) => [token, String(personalInfo[field] || '').trim()])
    .filter(([, value]) => value.length >= 3);
  return {
    scrub: (text) => pairs.reduce((t, [token, value]) => t.split(value).join(token), String(text ?? '')),
    restore: (text) =>
      pairs
        .reduce((t, [token, value]) => t.split(token).join(value), String(text ?? ''))
        .replace(IDENTITY_TOKEN_RE, '')
        .replace(/[ \t]{2,}/g, ' ')
        .trim(),
  };
}

const blankItem = (item, fields) =>
  fields.every((f) => (Array.isArray(item[f]) ? clean(item[f]).length === 0 : !String(item[f] || '').trim()));

/**
 * Contenu du CV utile à l’IA, sans photo, nom, e-mail, téléphone, ville ni liens.
 * Les id des éléments sont conservés pour cibler les modifications.
 */
export function stripForAI(data) {
  const d = normalizeData(data);
  const { scrub } = identityScrubber(d.personalInfo);
  const s = (v) => scrub(String(v || '').trim());
  const list = (arr) => clean(arr).map(scrub);
  // Ce qui est masqué (éléments, puces, compétences) n'est pas sur le CV : l'IA ne l'analyse pas.
  const shown = (e) => ({ ...e, details: shownList(e.details, e.hiddenDetails) });
  const exp = (e) => ({
    id: e.id,
    title: s(e.title),
    company: s(e.company),
    period: s(e.period),
    details: list(e.details),
    stack: list(e.stack),
  });
  return {
    title: s(d.personalInfo.title),
    subtitle: s(d.personalInfo.subtitle),
    summary: s(d.personalInfo.objective),
    skills: d.mainSkills
      .filter((g) => !g.hidden)
      .map((g) => ({ ...g, skills: shownSkills(g) }))
      .filter((g) => !blankItem(g, ['category', 'skills']))
      .map((g) => ({ id: g.id, category: s(g.category), skills: list(g.skills) })),
    experiences: d.experiences
      .filter((e) => !e.hidden)
      .map(shown)
      .filter((e) => !blankItem(e, ['title', 'company', 'details', 'stack']))
      .map(exp),
    otherExperiences: d.otherExperiences
      .filter((e) => !e.hidden)
      .map(shown)
      .filter((e) => !blankItem(e, ['title', 'company', 'details', 'stack']))
      .map(exp),
    education: d.education
      .filter((e) => !e.hidden)
      .map(shown)
      .filter((e) => !blankItem(e, ['title', 'school', 'degree', 'details']))
      .map((e) => ({
        id: e.id,
        title: s(e.title),
        school: s(e.school),
        degree: s(e.degree),
        period: s(e.period),
        details: list(e.details),
        objectives: list(e.objectives),
        tools: list(e.tools),
      })),
    certifications: d.certifications
      .filter((c) => !c.hidden && !blankItem(c, ['name']))
      .map((c) => ({ id: c.id, name: s(c.name), issuer: s(c.issuer), date: s(c.date) })),
    languages: d.languages
      .filter((l) => !l.hidden && !blankItem(l, ['name']))
      .map((l) => ({ id: l.id, name: s(l.name), level: s(l.level) })),
    customSections: d.customSections
      .map((c) => ({ ...c, items: shownList(c.items, c.hiddenItems) }))
      .filter((c) => !blankItem(c, ['title', 'items']))
      .map((c) => ({ id: c.id, title: s(c.title), items: list(c.items) })),
  };
}

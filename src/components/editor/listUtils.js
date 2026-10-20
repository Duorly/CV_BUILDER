// Fonctions pures de l'éditeur (sans React ni DOM), testées dans __tests__/listUtils.test.js.
import { clean, isBlankItem, joinNonEmpty } from '../../lib/schema';
import { prettyUrl } from '../../lib/files';

// ── Tableaux (toujours une nouvelle copie) ───────────────────────────────

export function moveItem(list, from, to) {
  const arr = [...list];
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const [item] = arr.splice(from, 1);
  arr.splice(to, 0, item);
  return arr;
}

export function insertAt(list, index, ...values) {
  const arr = [...list];
  arr.splice(index, 0, ...values);
  return arr;
}

export const removeAt = (list, index) => list.filter((_, i) => i !== index);

export const replaceAt = (list, index, value) => list.map((v, i) => (i === index ? value : v));

export const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// ── Tags (compétences, objectifs, outils) ────────────────────────────────
// On ne découpe jamais sur les espaces : « Gestion de projet » reste un seul tag.

const TAG_SEPARATORS = /[,;\n\r]+/;

export const hasTagSeparator = (text) => TAG_SEPARATORS.test(String(text || ''));

export function splitTags(text) {
  return String(text || '')
    .split(TAG_SEPARATORS)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

// Saisie contenant un séparateur : ce qui précède le dernier séparateur est validé,
// la fin reste dans le champ (« Accueil, Vente, Cai » → tags Accueil + Vente, reste « Cai »).
export function splitTagDraft(value) {
  const parts = String(value || '').split(TAG_SEPARATORS);
  const rest = parts.pop() || '';
  return { complete: splitTags(parts.join(',')), rest: rest.replace(/^\s+/, '') };
}

const tagKey = (tag) => tag.toLocaleLowerCase('fr').trim();

// Applique la saisie : ajout en fin de liste, ou remplacement du tag en cours de
// modification (editIndex). Les doublons (casse ignorée) sont écartés et signalés.
export function applyTagDraft(tags, draft, editIndex = null) {
  const editing = editIndex != null && editIndex >= 0 && editIndex < tags.length;
  const base = editing ? removeAt(tags, editIndex) : [...tags];
  const seen = new Set(base.map(tagKey));
  const added = [];
  const duplicates = [];
  for (const tag of splitTags(draft)) {
    const key = tagKey(tag);
    if (seen.has(key)) {
      duplicates.push(tag);
    } else {
      seen.add(key);
      added.push(tag);
    }
  }
  const at = editing ? editIndex : base.length;
  return { tags: insertAt(base, at, ...added), added, duplicates };
}

// ── Puces ────────────────────────────────────────────────────────────────

// Retire la puce d'une ligne collée depuis Word ou un ancien CV (« • », « - », « 1. »).
export function stripBulletMarker(line) {
  return String(line || '')
    .replace(/^\s*(?:[•·▪◦●○■□➢►✓✔]\s*|[-–—*+>]\s+|\d{1,2}[.)]\s+)/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function splitPastedLines(text) {
  return String(text || '')
    .split(/\r\n|\r|\n/)
    .map(stripBulletMarker)
    .filter(Boolean);
}

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

// Entrée dans une puce : coupe au curseur, la suite devient la puce suivante.
export function splitBulletAt(items, index, selectionStart, selectionEnd = selectionStart) {
  const text = items[index] ?? '';
  const start = clamp(selectionStart ?? text.length, 0, text.length);
  const end = clamp(selectionEnd ?? start, start, text.length);
  const before = text.slice(0, start).replace(/\s+$/, '');
  const after = text.slice(end).replace(/^\s+/, '');
  const next = [...items];
  next.splice(index, 1, before, after);
  return { items: next, focusIndex: index + 1 };
}

// Collage de plusieurs lignes dans une puce : une puce par ligne.
// Renvoie null si le texte collé tient sur une ligne (collage natif).
export function pasteIntoBullet(items, index, selectionStart, selectionEnd, text) {
  if (!/[\r\n]/.test(String(text || ''))) return null;
  const current = items[index] ?? '';
  const start = clamp(selectionStart ?? current.length, 0, current.length);
  const end = clamp(selectionEnd ?? start, start, current.length);
  const lines = splitPastedLines(text);
  if (!lines.length) return { items: [...items], focusIndex: index, caret: start };
  const head = current.slice(0, start);
  const tail = current.slice(end);
  const inserted = [...lines];
  inserted[0] = head + inserted[0];
  const last = inserted.length - 1;
  const caret = inserted[last].length;
  inserted[last] += tail;
  const next = [...items];
  next.splice(index, 1, ...inserted);
  return { items: next, focusIndex: index + last, caret };
}

// Compétences masquées après une modification de la liste : une compétence renommée
// (seule différence, à la même place) reste masquée ; celles retirées sont oubliées.
export function carryHidden(before, after, hidden) {
  let next = hidden;
  const changed = after.length === before.length ? after.flatMap((skill, i) => (skill !== before[i] ? [i] : [])) : [];
  if (changed.length === 1 && hidden.includes(before[changed[0]])) {
    next = hidden.map((skill) => (skill === before[changed[0]] ? after[changed[0]] : skill));
  }
  return next.filter((skill) => after.includes(skill));
}

// ── Résumés affichés dans les en-têtes de cartes ──────────────────────────

export function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

const FALLBACK_TITLES = {
  experience: 'Expérience',
  education: 'Formation',
  skills: 'Groupe de compétences',
  certification: 'Certification',
  language: 'Langue',
  link: 'Lien',
};

const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

export function itemSummary(kind, item, index) {
  let title = '';
  let subtitle = '';
  switch (kind) {
    case 'experience':
      title = joinNonEmpty([item.title, item.company], ' — ');
      subtitle = joinNonEmpty([item.period, item.location], ' · ');
      break;
    case 'education':
      title = joinNonEmpty([item.title, item.school], ' — ');
      subtitle = joinNonEmpty([item.degree, item.period], ' · ');
      break;
    case 'skills': {
      const skills = clean(item.skills);
      title = (item.category || '').trim() || truncate(skills.slice(0, 3).join(', '), 60);
      subtitle = skills.length ? plural(skills.length, 'compétence') : '';
      break;
    }
    case 'certification':
      title = (item.name || '').trim();
      subtitle = joinNonEmpty([item.issuer, item.date], ' · ');
      break;
    case 'language':
      title = joinNonEmpty([item.name, item.level], ' — ');
      break;
    case 'link':
      title = (item.name || '').trim() || prettyUrl(item.url);
      subtitle = (item.name || '').trim() ? (item.label || '').trim() || prettyUrl(item.url) : '';
      break;
    default:
      break;
  }
  const isFallback = !title;
  return {
    title: isFallback ? `${FALLBACK_TITLES[kind] || 'Élément'} ${index + 1}` : title,
    subtitle,
    isFallback,
  };
}

// Renomme une section sur un brouillon de data. Pour une section libre, le titre
// vit dans customSections (le titre de data.sections est alors vidé pour ne pas le masquer).
export function applySectionTitle(draft, sectionId, title) {
  const section = draft.sections.find((s) => s.id === sectionId);
  if (!section) return;
  if (sectionId.startsWith('custom:')) {
    const custom = draft.customSections.find((c) => `custom:${c.id}` === sectionId);
    if (custom) custom.title = title;
    section.title = '';
  } else {
    section.title = title;
  }
}

// Contenu d'une section, résumé dans l'en-tête de son panneau.
// [champ de data, nom au singulier, accord de « masqué »]
const SECTION_LISTS = {
  experiences: ['experiences', 'expérience', 'masquée'],
  otherExperiences: ['otherExperiences', 'expérience', 'masquée'],
  education: ['education', 'formation', 'masquée'],
  links: ['socialLinks', 'lien', 'masqué'],
  languages: ['languages', 'langue', 'masquée'],
  certifications: ['certifications', 'certification', 'masquée'],
};

export function sectionContentSummary(data, sectionId) {
  let count = 0;
  let hiddenCount = 0;
  let noun = 'élément';
  let hiddenWord = 'masqué';
  if (sectionId === 'profile') {
    count = (data.personalInfo?.objective || '').trim().length;
    noun = 'caractère';
  } else if (sectionId === 'skills') {
    for (const group of data.mainSkills || []) {
      const skills = clean(group.skills);
      count += skills.length;
      hiddenCount += group.hidden
        ? skills.length
        : skills.filter((skill) => (group.hiddenSkills || []).includes(skill)).length;
    }
    noun = 'compétence';
    hiddenWord = 'masquée';
  } else if (sectionId.startsWith('custom:')) {
    const custom = (data.customSections || []).find((c) => `custom:${c.id}` === sectionId);
    const items = (custom?.items || []).map((text, i) => ({ text, i })).filter(({ text }) => text.trim());
    count = items.length;
    hiddenCount = items.filter(({ i }) => (custom.hiddenItems || []).includes(i)).length;
  } else if (SECTION_LISTS[sectionId]) {
    const [field, itemNoun, itemHidden] = SECTION_LISTS[sectionId];
    const items = (data[field] || []).filter((item) => !isBlankItem(item));
    count = items.length;
    hiddenCount = items.filter((item) => item.hidden).length;
    noun = itemNoun;
    hiddenWord = itemHidden;
  }
  if (!count) return { empty: true, text: "Vide : n'apparaît pas sur le CV" };
  const text = plural(count, noun);
  return hiddenCount
    ? { empty: hiddenCount === count, text: `${text} dont ${plural(hiddenCount, hiddenWord)}` }
    : { empty: false, text };
}

// ── Longueur des textes ──────────────────────────────────────────────────

export const SUMMARY_ADVICE = { min: 300, max: 600, warn: 700 };
export const BULLET_WARN = 250;

export function summaryLengthStatus(count) {
  if (!count) return 'empty';
  if (count > SUMMARY_ADVICE.warn) return 'warn';
  if (count > SUMMARY_ADVICE.max) return 'long';
  if (count < SUMMARY_ADVICE.min) return 'short';
  return 'ok';
}

// ── Divers ───────────────────────────────────────────────────────────────

export function undoShortcut(nav = globalThis.navigator) {
  const platform = `${nav?.userAgentData?.platform || ''} ${nav?.platform || ''} ${nav?.userAgent || ''}`;
  return /Mac|iPhone|iPad|iPod/i.test(platform) ? 'Cmd+Z' : 'Ctrl+Z';
}

export function deleteConfirmMessage(label, shortcut = 'Ctrl+Z') {
  return `Supprimer « ${label} » ? Vous pourrez annuler avec ${shortcut}.`;
}

// Identifiant DOM d'un champ de l'éditeur, dérivé de l'id de l'élément.
export function fieldId(...parts) {
  return ['ed', ...parts].join('-').replace(/[^A-Za-z0-9_-]/g, '-');
}

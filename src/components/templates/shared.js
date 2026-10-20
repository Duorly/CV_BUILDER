import {
  clean,
  customSectionKey,
  fontCss,
  isBlankItem,
  isShownItem,
  marginScale,
  normalizeData,
  normalizeSettings,
  shownList,
  shownSkills,
  spacingScale,
  visibleSections,
} from '../../lib/schema';
import { absoluteUrl, prettyUrl, telHref } from '../../lib/files';
import { nbspText } from '../../lib/typography';

// Données prêtes à afficher, communes aux deux templates.
// Règle : rien de vide ne s'affiche (élément vierge, puce vide, rubrique sans contenu),
// ni rien de masqué (élément, puce ou compétence).

export function prepare(data, settings) {
  return { data: normalizeData(data), settings: normalizeSettings(settings) };
}

// Variables CSS posées sur la racine : le template ne dépend pas de son conteneur.
export function themeStyle(settings) {
  return {
    '--font-scale': String(settings.fontScale),
    '--primary-color': settings.primaryColor,
    '--sidebar-bg': settings.sidebarBg,
    '--text-dark': settings.textColor,
    '--resume-font': fontCss(settings),
    // Lue aussi par measurePrintLayout() (marges @page du modèle ATS).
    '--margin-scale': String(marginScale(settings)),
    '--spacing-scale': String(spacingScale(settings)),
  };
}

// Classes de mise en page posées sur la racine : en-tête centré, texte justifié.
export function layoutClasses(settings) {
  return [
    settings.headerAlign === 'center' ? 'is-header-centered' : '',
    settings.textAlign === 'justify' ? 'is-justified' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

// Texte affiché : espaces de bord retirées, espaces insécables à la française (lib/typography).
const tidy = (value) => nbspText(value.trim());
const tidyList = (list) => clean(list).map(nbspText);
const RAW_KEYS = new Set(['id', 'icon', 'column', 'layout', 'link', 'url']);

const trimStrings = (item) =>
  Object.fromEntries(
    Object.entries(item).map(([key, value]) => [
      key,
      typeof value !== 'string' ? value : RAW_KEYS.has(key) ? value.trim() : tidy(value),
    ]),
  );

// « Objectifs : » en français (espace insécable avant les deux-points), « Objectives: » en anglais.
export const colon = (lang) => (lang === 'en' ? ':' : ' :');

export function mailHref(email) {
  return email.includes('@') ? `mailto:${email}` : '';
}

// Partagé avec le PDF direct et la lettre (lib/files.js).
export { telHref };

export function contactInfo(personalInfo) {
  const email = personalInfo.email.trim();
  const phone = personalInfo.phone.trim();
  return {
    email,
    emailHref: mailHref(email),
    phone,
    phoneHref: telHref(phone),
    location: personalInfo.location.trim(),
  };
}

const URL_LIKE = /^(https?:\/\/|www\.)/i;

export function linkView(link) {
  const label = link.label.trim();
  const pretty = prettyUrl(link.url);
  return {
    id: link.id,
    name: link.name.trim(),
    icon: link.icon,
    href: absoluteUrl(link.url),
    pretty,
    text: label ? (URL_LIKE.test(label) ? prettyUrl(label) : label) : pretty,
  };
}

const nonEmpty = (list) => (list.length ? list : null);

// Contenu affichable d'une section, ou null si elle n'a rien à montrer.
// profile → chaîne ; custom:<id> → { title, column, layout, items } ; autres → tableau d'éléments nettoyés.
export function sectionContent(data, sectionId) {
  switch (sectionId) {
    case 'profile':
      return tidy(data.personalInfo.objective) || null;
    case 'skills':
      return nonEmpty(
        data.mainSkills
          .filter((group) => !group.hidden)
          .map((group) => ({ id: group.id, category: group.category.trim(), skills: tidyList(shownSkills(group)) }))
          .filter((group) => group.skills.length),
      );
    case 'experiences':
    case 'otherExperiences':
      return nonEmpty(
        data[sectionId]
          .filter(isShownItem)
          .map((item) => ({ ...trimStrings(item), details: tidyList(shownList(item.details, item.hiddenDetails)) }))
          // Toutes ses puces masquées et rien d'autre : l'élément n'a plus rien à montrer.
          .filter((item) => !isBlankItem(item)),
      );
    case 'education':
      return nonEmpty(
        data.education
          .filter(isShownItem)
          .map((item) => ({
            ...trimStrings(item),
            details: tidyList(shownList(item.details, item.hiddenDetails)),
            objectives: tidyList(item.objectives),
            tools: tidyList(item.tools),
            linkHref: absoluteUrl(item.link),
            linkText: prettyUrl(item.link),
          }))
          .filter((item) => !isBlankItem(item)),
      );
    case 'links':
      return nonEmpty(data.socialLinks.filter((link) => !link.hidden && link.url.trim()).map(linkView));
    case 'languages':
      return nonEmpty(
        data.languages
          .filter((lang) => !lang.hidden)
          .map(trimStrings)
          .filter((lang) => lang.name || lang.level),
      );
    case 'certifications':
      return nonEmpty(data.certifications.filter(isShownItem).map(trimStrings));
    default: {
      const custom = data.customSections.find((c) => customSectionKey(c) === sectionId);
      const items = custom ? tidyList(shownList(custom.items, custom.hiddenItems)) : [];
      return items.length ? { title: custom.title.trim(), column: custom.column, layout: custom.layout, items } : null;
    }
  }
}

// Sections visibles qui ont du contenu, dans l'ordre choisi.
export function renderableSections(data) {
  return visibleSections(data)
    .map((id) => ({ id, content: sectionContent(data, id) }))
    .filter((section) => section.content);
}

// Titre saisi par l'utilisatrice (sans repli sur le libellé par défaut).
export function customTitle(data, sectionId) {
  return data.sections.find((s) => s.id === sectionId)?.title.trim() || '';
}

// « Français : Langue maternelle », « Anglais », « C1 ».
export function languageText(language, lang) {
  if (language.name && language.level) return `${language.name}${colon(lang)} ${language.level}`;
  return language.name || language.level;
}

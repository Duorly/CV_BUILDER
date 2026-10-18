// Libellés par défaut des templates, en français et en anglais.
// Un titre de section saisi par l'utilisatrice (data.sections[i].title) prime toujours.

export const LABELS = {
  fr: {
    sections: {
      profile: 'Profil',
      skills: 'Compétences',
      experiences: 'Expériences professionnelles',
      education: 'Formation',
      otherExperiences: 'Autres expériences',
      certifications: 'Certifications',
      languages: 'Langues',
      links: 'Liens',
    },
    fields: {
      email: 'E-mail',
      phone: 'Téléphone',
      location: 'Localisation',
      period: 'Période',
      place: 'Lieu',
      objectives: 'Objectifs',
      tools: 'Outils et méthodes',
      programLink: 'Programme détaillé',
      photoAlt: 'Photo de',
      externalLink: 'Lien externe',
    },
  },
  en: {
    sections: {
      profile: 'Profile',
      skills: 'Skills',
      experiences: 'Professional Experience',
      education: 'Education',
      otherExperiences: 'Other Experience',
      certifications: 'Certifications',
      languages: 'Languages',
      links: 'Links',
    },
    fields: {
      email: 'Email',
      phone: 'Phone',
      location: 'Location',
      period: 'Dates',
      place: 'Location',
      objectives: 'Objectives',
      tools: 'Tools & methods',
      programLink: 'Programme details',
      photoAlt: 'Photo of',
      externalLink: 'External link',
    },
  },
};

export const LANGUAGE_LEVELS = {
  fr: [
    'Langue maternelle',
    'Bilingue',
    'C2 – Maîtrise',
    'C1 – Autonome',
    'B2 – Avancé',
    'B1 – Intermédiaire',
    'A2 – Élémentaire',
    'A1 – Débutant',
  ],
  en: [
    'Native',
    'Bilingual',
    'C2 – Proficient',
    'C1 – Advanced',
    'B2 – Upper intermediate',
    'B1 – Intermediate',
    'A2 – Elementary',
    'A1 – Beginner',
  ],
};

export function labelsFor(lang) {
  return LABELS[lang] || LABELS.fr;
}

// Titre affiché d'une section : titre personnalisé > titre de la section libre > libellé par défaut.
export function sectionTitle(data, sectionId, lang = 'fr') {
  const entry = data?.sections?.find((s) => s.id === sectionId);
  if (entry?.title?.trim()) return entry.title.trim();
  if (sectionId.startsWith('custom:')) {
    const custom = data?.customSections?.find((c) => `custom:${c.id}` === sectionId);
    return custom?.title?.trim() || '';
  }
  return labelsFor(lang).sections[sectionId] || sectionId;
}

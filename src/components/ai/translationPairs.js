// Liste « original → traduction » pour l'aperçu de la fenêtre de traduction.

const text = (v) => String(v || '').trim();

export function translationPairs(before, after) {
  const sections = [];
  const section = (title) => {
    const entry = { title, items: [] };
    sections.push(entry);
    return entry.items;
  };
  const add = (items, label, a, b) => {
    if (text(a) && text(a) !== text(b)) items.push({ label, before: text(a), after: text(b) });
  };
  const addList = (items, label, a = [], b = []) => {
    a.forEach((value, i) => add(items, label, value, b[i]));
  };
  const byId = (list) => new Map((list || []).map((item) => [item.id, item]));

  const profile = section('Profil');
  add(profile, 'Titre', before.personalInfo.title, after.personalInfo.title);
  add(profile, 'Résumé', before.personalInfo.objective, after.personalInfo.objective);

  // Une ligne par catégorie : « Catégorie : compétence, compétence… ».
  const skills = section('Compétences');
  const skillsAfter = byId(after.mainSkills);
  const skillLine = (g) => [text(g.category), (g.skills || []).map(text).filter(Boolean).join(', ')].filter(Boolean).join(' : ');
  for (const g of before.mainSkills) {
    add(skills, 'Catégorie', skillLine(g), skillLine(skillsAfter.get(g.id) || g));
  }

  for (const [group, title] of [
    ['experiences', 'Expériences professionnelles'],
    ['otherExperiences', 'Autres expériences'],
  ]) {
    const items = section(title);
    const map = byId(after[group]);
    for (const e of before[group]) {
      const t = map.get(e.id) || e;
      const context = e.company || e.title || 'Expérience';
      add(items, `Intitulé (${context})`, e.title, t.title);
      add(items, `Dates (${context})`, e.period, t.period);
      addList(items, `Puce (${context})`, e.details, t.details);
    }
  }

  const education = section('Formation');
  const eduAfter = byId(after.education);
  for (const e of before.education) {
    const t = eduAfter.get(e.id) || e;
    const context = e.school || e.title || 'Formation';
    add(education, `Intitulé (${context})`, e.title, t.title);
    add(education, `Diplôme (${context})`, e.degree, t.degree);
    add(education, `Dates (${context})`, e.period, t.period);
    addList(education, `Détail (${context})`, e.details, t.details);
    addList(education, `Objectif (${context})`, e.objectives, t.objectives);
    addList(education, `Outil (${context})`, e.tools, t.tools);
  }

  const others = section('Langues, certifications et sections');
  const langAfter = byId(after.languages);
  for (const l of before.languages) {
    const t = langAfter.get(l.id) || l;
    add(others, 'Langue', l.name, t.name);
    add(others, 'Niveau', l.level, t.level);
  }
  const certAfter = byId(after.certifications);
  for (const c of before.certifications) add(others, 'Certification', c.name, (certAfter.get(c.id) || c).name);
  const customAfter = byId(after.customSections);
  for (const c of before.customSections) {
    const t = customAfter.get(c.id) || c;
    add(others, 'Titre de section', c.title, t.title);
    addList(others, c.title || 'Section libre', c.items, t.items);
  }
  const sectionsAfter = byId(after.sections);
  for (const s of before.sections) add(others, 'Titre de section', s.title, (sectionsAfter.get(s.id) || s).title);

  return sections.filter((s) => s.items.length);
}

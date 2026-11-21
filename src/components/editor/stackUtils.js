// Suggestions pour la stack technique d'une expérience : ce que la personne a déjà saisi
// ailleurs dans son CV, puis le catalogue de technologies courantes (techCatalog.js).

// Comparaison sans casse ni accents : « postgresql » retrouve « PostgreSQL », « donnees » « Données ».
export const foldTag = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();

// Groupe de compétences techniques : « Outils », « Langages », « Frameworks », « Bases de données »…
const TECH_GROUP = /outil|tool|tech|stack|langage|language|framework|logiciel|software|environnement|plateforme|platform|cloud|devops|donnees|data|base|web|dev/;

// Technologies déjà présentes dans le CV, à proposer d'un clic : stacks des expériences (les plus
// utilisées d'abord), puis compétences d'un groupe technique ou connues du catalogue.
// Les compétences générales (« Organisation », « Relations presse »…) ne sont pas proposées.
export function techPicks(data, catalog = []) {
  const known = new Set(catalog.map(foldTag));
  const stacks = new Map();
  for (const group of ['experiences', 'otherExperiences']) {
    for (const exp of data[group] || []) {
      for (const tag of exp.stack || []) {
        const key = foldTag(tag);
        if (!key) continue;
        const entry = stacks.get(key);
        if (entry) entry.count += 1;
        else stacks.set(key, { text: tag.trim(), count: 1, order: stacks.size });
      }
    }
  }
  const picks = [...stacks.values()].sort((a, b) => b.count - a.count || a.order - b.order).map((e) => e.text);
  const seen = new Set(stacks.keys());
  for (const group of data.mainSkills || []) {
    const technical = TECH_GROUP.test(foldTag(group.category));
    for (const skill of group.skills || []) {
      const key = foldTag(skill);
      if (!key || seen.has(key) || !(technical || known.has(key))) continue;
      seen.add(key);
      picks.push(skill.trim());
    }
  }
  return picks;
}

// Suggestions affichées sous le champ, hors étiquettes déjà présentes :
// - champ vide : les technologies du CV (picks) ;
// - pendant la frappe : celles du CV puis du catalogue qui commencent par le texte saisi,
//   puis celles qui le contiennent (« script » → JavaScript, TypeScript).
export function tagSuggestions({ picks = [], catalog = [], tags = [], query = '', limit = 8 }) {
  const taken = new Set(tags.map(foldTag));
  const pool = [];
  const inPool = new Set();
  [picks, catalog].forEach((list, source) => {
    for (const text of list) {
      const key = foldTag(text);
      if (!key || taken.has(key) || inPool.has(key)) continue;
      inPool.add(key);
      pool.push({ text, key, own: source === 0 });
    }
  });
  const q = foldTag(query);
  if (!q) return pool.filter((s) => s.own).slice(0, limit).map((s) => s.text);
  const starts = pool.filter((s) => s.key.startsWith(q) && s.key !== q);
  const contains = pool.filter((s) => !s.key.startsWith(q) && s.key.includes(q));
  const exact = pool.filter((s) => s.key === q);
  return [...exact, ...starts, ...contains].slice(0, limit).map((s) => s.text);
}

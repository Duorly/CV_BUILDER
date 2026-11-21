import { describe, expect, it } from 'vitest';
import { foldTag, tagSuggestions, techPicks } from '../stackUtils';
import { TECH_CATALOG } from '../techCatalog';

describe('stack technique : suggestions', () => {
  it('foldTag ignore casse, accents et espaces de bord', () => {
    expect(foldTag('  PostgreSQL ')).toBe('postgresql');
    expect(foldTag('Données')).toBe('donnees');
  });

  it('techPicks : stacks des expériences (les plus utilisées d’abord), puis compétences techniques', () => {
    const data = {
      experiences: [
        { stack: ['Vue.js', 'Docker'] },
        { stack: ['docker', 'Python'] },
      ],
      otherExperiences: [{ stack: ['Python', ' '] }],
      mainSkills: [
        { category: 'Outils', skills: ['Notion', 'Docker'] },
        { category: 'Qualités', skills: ['Organisation', 'Google Analytics'] },
      ],
    };
    // Docker et Python : 2 fois ; « Organisation » n'est ni dans un groupe technique ni une technologie connue.
    expect(techPicks(data, TECH_CATALOG)).toEqual(['Docker', 'Python', 'Vue.js', 'Notion', 'Google Analytics']);
  });

  it('champ vide : seulement les technologies du CV, hors étiquettes déjà présentes', () => {
    const picks = ['Docker', 'Python', 'Notion'];
    expect(tagSuggestions({ picks, catalog: TECH_CATALOG, tags: ['python'] })).toEqual(['Docker', 'Notion']);
    expect(tagSuggestions({ picks: [], catalog: TECH_CATALOG, tags: [] })).toEqual([]);
  });

  it('pendant la frappe : correspondance exacte, puis début, puis contenu ; CV avant catalogue', () => {
    const s = tagSuggestions({ picks: ['Reactor'], catalog: TECH_CATALOG, tags: ['Redux'], query: 'rea' });
    expect(s.slice(0, 3)).toEqual(['Reactor', 'React', 'React Native']);
    expect(s).not.toContain('Redux');
    expect(tagSuggestions({ catalog: TECH_CATALOG, query: 'script' })).toEqual(['JavaScript', 'TypeScript']);
    expect(tagSuggestions({ catalog: TECH_CATALOG, query: 'java' })[0]).toBe('Java');
    expect(tagSuggestions({ catalog: TECH_CATALOG, query: 'a', limit: 3 })).toHaveLength(3);
  });

  it('le catalogue n’a pas de doublon', () => {
    const keys = TECH_CATALOG.map(foldTag);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

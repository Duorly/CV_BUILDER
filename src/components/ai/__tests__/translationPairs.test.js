import { describe, expect, it } from 'vitest';
import { translationPairs } from '../translationPairs';
import { normalizeData } from '../../../lib/schema';
import example from '../../../data/exampleResume.json';

describe('translationPairs', () => {
  it('liste les textes traduits par section, une ligne par catégorie de compétences', () => {
    const before = normalizeData(example);
    const after = structuredClone(before);
    after.personalInfo.title = 'Communications Officer';
    after.mainSkills[0].category = 'Communications';
    after.mainSkills[0].skills = after.mainSkills[0].skills.map((s) => `EN ${s}`);
    after.experiences[0].details[0] = 'Annual communication plan.';
    after.experiences[0].company = 'Ignoré'; // non comparé : jamais affiché comme traduction

    const sections = translationPairs(before, after);
    expect(sections.map((s) => s.title)).toEqual(['Profil', 'Compétences', 'Expériences professionnelles']);
    expect(sections[0].items).toEqual([
      { label: 'Titre', before: before.personalInfo.title, after: 'Communications Officer' },
    ]);
    expect(sections[1].items).toHaveLength(1);
    expect(sections[1].items[0].after).toBe(`Communications : ${after.mainSkills[0].skills.join(', ')}`);
    expect(sections[2].items[0].label).toBe(`Puce (${before.experiences[0].company})`);
  });
});

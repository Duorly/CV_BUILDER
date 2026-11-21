import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ChangeReview from '../ChangeReview';
import { allowedSkillsFrom, buildChanges, normalizePatch } from '../../../lib/ai';
import { normalizeData } from '../../../lib/schema';
import example from '../../../data/exampleResume.json';

describe('ChangeReview : propositions à vérifier', () => {
  it('affiche l’avertissement et l’étiquette « synonyme », sans cocher ces propositions d’avance', () => {
    const data = normalizeData(example);
    const exp0 = data.experiences[0];
    const patch = normalizePatch(
      {
        summary: { text: 'Chargée de communication avec 12 ans d’expérience.', reason: '' },
        targetTitle: null,
        skillCategoryOrder: [],
        skillAdditions: [{ skill: 'Adobe InDesign', categoryId: data.mainSkills[2].id, newCategory: '' }],
        experiences: [{ id: exp0.id, details: [...exp0.details, 'Hausse de 40 % des ventes en ligne.'], reason: '' }],
      },
      data.personalInfo,
    );
    const analysis = { keywords: [{ id: 'kw_0', term: 'Adobe InDesign', present: true, evidence: 'Suite Adobe' }] };
    const changes = buildChanges(data, patch, { allowedSkills: allowedSkillsFrom(analysis) });
    expect(changes).toHaveLength(3);
    expect(changes.every((c) => c.warnings?.length)).toBe(true);

    // Sélection initiale d'ATSOptimizer : seulement les propositions sans avertissement.
    const selection = new Set(changes.filter((c) => !c.warnings?.length).map((c) => c.id));
    const html = renderToStaticMarkup(createElement(ChangeReview, { changes, selection, onSelectionChange: () => {} }));
    expect(html).toContain('0 modification sélectionnée sur 3');
    expect(html).toContain('3 propositions sont à vérifier');
    expect(html).toContain('Chiffre absent de votre CV : « 12 »');
    expect(html).toContain('5 puces au lieu de 4');
    expect(html).toContain('synonyme repéré par l’IA : à vérifier');
    expect(html).not.toContain('déjà citée dans votre CV');
  });
});

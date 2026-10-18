import { describe, expect, it } from 'vitest';
import * as lucide from 'lucide-react';
import { normalizeData } from '../../../lib/schema';
import example from '../../../data/exampleResume.json';
import { LINK_ICONS } from '../linkIcons';
import {
  applySectionTitle,
  applyTagDraft,
  deleteConfirmMessage,
  fieldId,
  hasTagSeparator,
  insertAt,
  itemSummary,
  moveItem,
  pasteIntoBullet,
  plural,
  removeAt,
  replaceAt,
  sameList,
  sectionContentSummary,
  splitBulletAt,
  splitPastedLines,
  splitTagDraft,
  splitTags,
  stripBulletMarker,
  summaryLengthStatus,
  undoShortcut,
} from '../listUtils';

describe('opérations sur les tableaux', () => {
  it('moveItem déplace sans muter l’original', () => {
    const src = ['a', 'b', 'c', 'd'];
    expect(moveItem(src, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(src, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(src).toEqual(['a', 'b', 'c', 'd']);
  });

  it('moveItem ignore les index hors limites', () => {
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 1, 2)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });

  it('insertAt, removeAt, replaceAt, sameList', () => {
    expect(insertAt(['a', 'c'], 1, 'b')).toEqual(['a', 'b', 'c']);
    expect(insertAt(['a'], 1, 'b', 'c')).toEqual(['a', 'b', 'c']);
    expect(removeAt(['a', 'b', 'c'], 1)).toEqual(['a', 'c']);
    expect(replaceAt(['a', 'b'], 0, 'z')).toEqual(['z', 'b']);
    expect(sameList(['a'], ['a'])).toBe(true);
    expect(sameList(['a'], ['a', 'b'])).toBe(false);
  });
});

describe('étiquettes', () => {
  it('garde les espaces internes (bug « Gestiondeprojet »)', () => {
    expect(splitTags('Gestion de projet')).toEqual(['Gestion de projet']);
    expect(splitTags('  Gestion   de projet ,')).toEqual(['Gestion de projet']);
  });

  it('découpe un collage sur , ; et retours ligne', () => {
    expect(splitTags('a, b; c\nd\r\ne,,')).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(hasTagSeparator('a; b')).toBe(true);
    expect(hasTagSeparator('Gestion de projet')).toBe(false);
  });

  it('splitTagDraft valide ce qui précède le dernier séparateur', () => {
    expect(splitTagDraft('Accueil, Vente, Cai')).toEqual({ complete: ['Accueil', 'Vente'], rest: 'Cai' });
    expect(splitTagDraft('Gestion de projet,')).toEqual({ complete: ['Gestion de projet'], rest: '' });
    expect(splitTagDraft('a, ')).toEqual({ complete: ['a'], rest: '' });
  });

  it('applyTagDraft ajoute en fin et écarte les doublons (casse ignorée)', () => {
    const r = applyTagDraft(['Excel', 'Canva'], 'excel, Notion');
    expect(r.tags).toEqual(['Excel', 'Canva', 'Notion']);
    expect(r.added).toEqual(['Notion']);
    expect(r.duplicates).toEqual(['excel']);
  });

  it('applyTagDraft remplace le tag modifié à sa place', () => {
    expect(applyTagDraft(['A', 'B', 'C'], 'Bis', 1).tags).toEqual(['A', 'Bis', 'C']);
    expect(applyTagDraft(['A', 'B', 'C'], 'B', 1).tags).toEqual(['A', 'B', 'C']);
    expect(applyTagDraft(['A', 'B', 'C'], 'X, Y', 0).tags).toEqual(['X', 'Y', 'B', 'C']);
    // Vider le tag modifié le supprime.
    expect(applyTagDraft(['A', 'B', 'C'], '', 2).tags).toEqual(['A', 'B']);
    // Un index invalide revient à un ajout simple.
    expect(applyTagDraft(['A'], 'B', 5).tags).toEqual(['A', 'B']);
  });
});

describe('puces', () => {
  it('retire les marqueurs collés depuis Word', () => {
    expect(stripBulletMarker('• Accueil')).toBe('Accueil');
    expect(stripBulletMarker('•Accueil')).toBe('Accueil');
    expect(stripBulletMarker('- Accueil')).toBe('Accueil');
    expect(stripBulletMarker('2. Accueil')).toBe('Accueil');
    expect(stripBulletMarker('3 ans en boutique')).toBe('3 ans en boutique');
    expect(stripBulletMarker('-20 % de pertes')).toBe('-20 % de pertes');
  });

  it('splitPastedLines ignore les lignes vides', () => {
    expect(splitPastedLines('• Un\n\n- Deux\r\n   \n3) Trois')).toEqual(['Un', 'Deux', 'Trois']);
  });

  it('splitBulletAt coupe au curseur (Entrée)', () => {
    expect(splitBulletAt(['Accueil clients', 'x'], 0, 7)).toEqual({
      items: ['Accueil', 'clients', 'x'],
      focusIndex: 1,
    });
    expect(splitBulletAt(['Fin'], 0, 3)).toEqual({ items: ['Fin', ''], focusIndex: 1 });
    expect(splitBulletAt(['abcdef'], 0, 2, 4)).toEqual({ items: ['ab', 'ef'], focusIndex: 1 });
  });

  it('pasteIntoBullet crée une puce par ligne collée', () => {
    expect(pasteIntoBullet(['Début ', 'z'], 0, 6, 6, '• un\n• deux\n• trois')).toEqual({
      items: ['Début un', 'deux', 'trois', 'z'],
      focusIndex: 2,
      caret: 5,
    });
    expect(pasteIntoBullet(['ab'], 0, 1, 1, 'une seule ligne')).toBeNull();
    expect(pasteIntoBullet(['ab'], 0, 1, 1, 'X\nY')).toEqual({ items: ['aX', 'Yb'], focusIndex: 1, caret: 1 });
  });
});

describe('résumés et libellés', () => {
  it('itemSummary résume une expérience et retombe sur « Expérience n »', () => {
    expect(
      itemSummary('experience', { title: 'Vendeuse', company: 'Boulangerie Martin', period: '2023', location: '' }, 0),
    ).toEqual({ title: 'Vendeuse — Boulangerie Martin', subtitle: '2023', isFallback: false });
    expect(itemSummary('experience', { title: '', company: '', period: '', location: '' }, 1)).toEqual({
      title: 'Expérience 2',
      subtitle: '',
      isFallback: true,
    });
  });

  it('itemSummary : compétences, liens, langues', () => {
    expect(itemSummary('skills', { category: '', skills: ['A', 'B'] }, 0).title).toBe('A, B');
    expect(itemSummary('skills', { category: 'Outils', skills: ['A', 'B'] }, 0).subtitle).toBe('2 compétences');
    expect(itemSummary('link', { name: '', url: 'https://www.exemple.fr/', label: '' }, 0).title).toBe('exemple.fr');
    expect(itemSummary('language', { name: 'Anglais', level: 'C1' }, 0).title).toBe('Anglais — C1');
    expect(itemSummary('certification', { name: '', issuer: '', date: '' }, 2).title).toBe('Certification 3');
  });

  it('plural suit la règle française (0 et 1 au singulier)', () => {
    expect(plural(0, 'lien')).toBe('0 lien');
    expect(plural(1, 'lien')).toBe('1 lien');
    expect(plural(2, 'lien')).toBe('2 liens');
  });

  it('summaryLengthStatus : conseil 300–600, alerte au-delà de 700', () => {
    expect(summaryLengthStatus(0)).toBe('empty');
    expect(summaryLengthStatus(120)).toBe('short');
    expect(summaryLengthStatus(450)).toBe('ok');
    expect(summaryLengthStatus(650)).toBe('long');
    expect(summaryLengthStatus(701)).toBe('warn');
  });

  it('message de confirmation et raccourci selon la plateforme', () => {
    expect(deleteConfirmMessage('Vendeuse — Boulangerie Martin')).toBe(
      'Supprimer « Vendeuse — Boulangerie Martin » ? Vous pourrez annuler avec Ctrl+Z.',
    );
    expect(undoShortcut({ platform: 'MacIntel', userAgent: '' })).toBe('Cmd+Z');
    expect(undoShortcut({ platform: 'Win32', userAgent: 'Windows NT' })).toBe('Ctrl+Z');
    expect(undoShortcut({})).toBe('Ctrl+Z');
  });

  it('fieldId produit un id DOM sûr', () => {
    expect(fieldId('panel', 'custom:sec_1')).toBe('ed-panel-custom-sec_1');
    expect(fieldId('exp_ab', 'title')).toBe('ed-exp_ab-title');
  });
});

describe('sections', () => {
  const data = normalizeData(example);

  it('applySectionTitle renomme une section intégrée', () => {
    const draft = structuredClone(data);
    applySectionTitle(draft, 'skills', 'Savoir-faire');
    expect(draft.sections.find((s) => s.id === 'skills').title).toBe('Savoir-faire');
  });

  it('applySectionTitle écrit le titre d’une section libre dans customSections', () => {
    const draft = structuredClone(data);
    const key = 'custom:sec_interets';
    draft.sections.find((s) => s.id === key).title = 'Ancien titre';
    applySectionTitle(draft, key, 'Loisirs');
    expect(draft.customSections[0].title).toBe('Loisirs');
    expect(draft.sections.find((s) => s.id === key).title).toBe('');
  });

  it('sectionContentSummary compte le contenu réel', () => {
    expect(sectionContentSummary(data, 'experiences').text).toBe('3 expériences');
    expect(sectionContentSummary(data, 'skills').text).toBe('16 compétences');
    expect(sectionContentSummary(data, 'custom:sec_interets').text).toBe('3 éléments');
    const empty = normalizeData({ experiences: [{ title: '', details: [''] }] });
    expect(sectionContentSummary(empty, 'experiences').empty).toBe(true);
    expect(sectionContentSummary(empty, 'profile').empty).toBe(true);
  });
});

describe('icônes de liens', () => {
  it('ne propose que des icônes qui existent dans lucide-react', () => {
    for (const { id, Icon } of LINK_ICONS) {
      expect(lucide[id], id).toBeDefined();
      expect(Icon).toBe(lucide[id]);
    }
  });

  it('couvre les icônes du CV d’exemple', () => {
    const ids = new Set(LINK_ICONS.map((i) => i.id));
    for (const link of example.socialLinks) expect(ids.has(link.icon)).toBe(true);
  });
});

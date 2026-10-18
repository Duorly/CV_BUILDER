import { describe, expect, it } from 'vitest';
import {
  buildPrefill,
  cityFromLocation,
  countWords,
  defaultClosing,
  formatDateLine,
  formatLongDate,
  resolveLetter,
  splitParagraphs,
  splitPastedLetter,
  stripSubjectLabel,
  wordCountStatus,
} from '../letterUtils';
import { emptyCoverLetter } from '../../../lib/schema';
import { createCv } from '../../../lib/storage';
import example from '../../../data/exampleResume.json';

describe('dates en toutes lettres', () => {
  it('écrit la date en français, avec « 1er »', () => {
    expect(formatLongDate(new Date(2026, 9, 18), 'fr')).toBe('18 octobre 2026');
    expect(formatLongDate(new Date(2026, 4, 1), 'fr')).toBe('1er mai 2026');
    expect(formatLongDate(new Date(2026, 1, 3), 'fr')).toBe('3 février 2026');
  });

  it('écrit la date en anglais', () => {
    expect(formatLongDate(new Date(2026, 9, 18), 'en')).toBe('18 October 2026');
    expect(formatLongDate(new Date(2026, 4, 1), 'en')).toBe('1 May 2026');
  });
});

describe('ligne lieu et date', () => {
  it('suit la convention française', () => {
    expect(formatDateLine('Lyon', '18 octobre 2026', 'fr')).toBe('Lyon, le 18 octobre 2026');
    expect(formatDateLine('', '18 octobre 2026', 'fr')).toBe('Le 18 octobre 2026');
    expect(formatDateLine('Lyon', '', 'fr')).toBe('Lyon');
    expect(formatDateLine('', '', 'fr')).toBe('');
  });

  it('ne double pas « le » si l’utilisatrice l’a déjà écrit', () => {
    expect(formatDateLine('Lyon', 'le 18 octobre 2026', 'fr')).toBe('Lyon, le 18 octobre 2026');
    expect(formatDateLine('', 'Le 18 octobre 2026', 'fr')).toBe('Le 18 octobre 2026');
  });

  it('suit la convention anglaise', () => {
    expect(formatDateLine('London', '18 October 2026', 'en')).toBe('London, 18 October 2026');
    expect(formatDateLine('', '18 October 2026', 'en')).toBe('18 October 2026');
  });
});

describe('petits utilitaires', () => {
  it('extrait la ville de la localisation', () => {
    expect(cityFromLocation('Lyon, France')).toBe('Lyon');
    expect(cityFromLocation('69003 Lyon')).toBe('Lyon');
    expect(cityFromLocation('Nantes (44)')).toBe('Nantes');
    expect(cityFromLocation('')).toBe('');
  });

  it('retire un libellé « Objet : » saisi à la main', () => {
    expect(stripSubjectLabel('Objet : Candidature')).toBe('Candidature');
    expect(stripSubjectLabel('Subject: Application')).toBe('Application');
    expect(stripSubjectLabel('Candidature spontanée')).toBe('Candidature spontanée');
  });

  it('découpe le corps en paragraphes sur les lignes vides', () => {
    expect(splitParagraphs('Premier.\nsuite\n\n  \nSecond.\r\n\r\nTroisième.\n')).toEqual([
      ['Premier.', 'suite'],
      ['Second.'],
      ['Troisième.'],
    ]);
    expect(splitParagraphs('   ')).toEqual([]);
  });

  it('compte les mots sans la ponctuation isolée', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('Objet : l’expérience – 5 ans !')).toBe(4);
  });

  it('classe la longueur du corps', () => {
    expect(wordCountStatus(0)).toBe('empty');
    expect(wordCountStatus(120)).toBe('short');
    expect(wordCountStatus(300)).toBe('ok');
    expect(wordCountStatus(450)).toBe('long');
  });

  it('reprend la formule d’appel dans la formule de politesse', () => {
    expect(defaultClosing('fr', 'Madame, Monsieur,')).toBe(
      'Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.',
    );
    expect(defaultClosing('fr', 'Madame la Directrice,')).toContain('d’agréer, Madame la Directrice, l’expression');
    expect(defaultClosing('fr', 'Bonjour,')).toContain('d’agréer, Madame, Monsieur, l’expression');
    expect(defaultClosing('en', 'Dear Hiring Manager,')).toBe('Yours sincerely,');
  });
});

const FULL_LETTER = [
  'Madame, Monsieur,',
  '',
  'Votre maison incarne une élégance accessible qui me correspond.',
  '',
  'Depuis cinq ans, j’anime une équipe de vente en boutique.',
  '',
  'Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.',
  '',
  'Inès Laurent',
].join('\n');

describe('lettre complète collée dans le corps', () => {
  it('sépare la formule d’appel, la formule de politesse et la signature', () => {
    expect(splitPastedLetter(FULL_LETTER, { name: 'Inès Laurent' })).toEqual({
      salutation: 'Madame, Monsieur,',
      body: 'Votre maison incarne une élégance accessible qui me correspond.\n\nDepuis cinq ans, j’anime une équipe de vente en boutique.',
      closing: 'Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.',
      signature: 'Inès Laurent',
    });
  });

  it('reconnaît « Cordialement, » suivi du nom, même collés à la dernière phrase', () => {
    const r = splitPastedLetter('Bonjour Madame Dubois,\nJe serais ravie de vous rencontrer.\nCordialement,\nInès Laurent', {
      name: '',
    });
    expect(r).toEqual({
      salutation: 'Bonjour Madame Dubois,',
      body: 'Je serais ravie de vous rencontrer.',
      closing: 'Cordialement,',
      signature: 'Inès Laurent',
    });
  });

  it('laisse intact un corps sans formules', () => {
    const body = 'Votre offre a retenu mon attention.\n\nJe vous prie de trouver ci-joint mon CV.';
    expect(splitPastedLetter(body, { name: 'Inès Laurent' })).toEqual({ salutation: '', body, closing: '', signature: '' });
    // Une phrase qui commence par « Madame » n'est pas une formule d'appel.
    const long = 'Madame Martin, directrice de votre agence de Lyon, m’a conseillé de vous écrire aujourd’hui.\n\nSuite.';
    expect(splitPastedLetter(long).salutation).toBe('');
  });

  it('à l’impression, les formules déjà présentes dans le corps ne sont pas ajoutées une seconde fois', () => {
    const r = resolveLetter({ ...emptyCoverLetter(), body: FULL_LETTER }, { name: 'Inès Laurent' }, 'fr');
    expect(r.salutation).toBe('');
    expect(r.closing).toBe('');
    expect(r.signature).toBe('');
    const printed = [r.salutation, ...r.paragraphs.flat(), r.closing, r.signature].join('\n');
    expect(printed.match(/Madame, Monsieur,/g)).toHaveLength(2); // l'appel et son rappel dans la politesse
    expect(printed.match(/salutations distinguées/g)).toHaveLength(1);
    expect(printed.match(/Inès Laurent/g)).toHaveLength(1);
  });
});

describe('resolveLetter', () => {
  it('lettre vide : aucun contenu imprimé', () => {
    const r = resolveLetter(emptyCoverLetter(), { name: 'Camille Martin' }, 'fr');
    expect(r).toEqual({
      recipient: [],
      dateLine: '',
      subject: '',
      salutation: '',
      paragraphs: [],
      closing: '',
      signature: '',
    });
  });

  it('corps rédigé : formules et signature par défaut', () => {
    const r = resolveLetter({ ...emptyCoverLetter(), body: 'Bonjour' }, { name: 'Camille Martin' }, 'fr');
    expect(r.salutation).toBe('Madame, Monsieur,');
    expect(r.closing).toContain('salutations distinguées');
    expect(r.signature).toBe('Camille Martin');
  });

  it('corps rédigé en anglais : conventions anglaises', () => {
    const r = resolveLetter({ ...emptyCoverLetter(), body: 'Hello' }, { name: 'Camille Martin' }, 'en');
    expect(r.salutation).toBe('Dear Hiring Manager,');
    expect(r.closing).toBe('Yours sincerely,');
  });

  it('adresse du destinataire sans lignes vides', () => {
    const r = resolveLetter(
      { ...emptyCoverLetter(), recipientCompany: 'Decathlon', recipientAddress: '4 bd de Mons\n\n59650 Villeneuve' },
      {},
      'fr',
    );
    expect(r.recipient).toEqual(['Decathlon', '4 bd de Mons', '59650 Villeneuve']);
  });
});

describe('buildPrefill', () => {
  const cv = createCv({ data: example, company: 'Decathlon', jobTitle: 'Chargée de communication' });
  const now = new Date(2026, 9, 18);

  it('propose des valeurs pour tous les champs vides', () => {
    expect(buildPrefill({ cv, letter: emptyCoverLetter(), lang: 'fr', now })).toEqual({
      recipientCompany: 'Decathlon',
      subject: 'Candidature au poste de Chargée de communication',
      place: 'Lyon',
      date: '18 octobre 2026',
      salutation: 'Madame, Monsieur,',
      closing: 'Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.',
      signature: 'Camille Martin',
    });
  });

  it('ne remplace jamais un champ déjà rempli', () => {
    const letter = { ...emptyCoverLetter(), subject: 'Mon objet', salutation: 'Madame,', place: 'Paris' };
    const patch = buildPrefill({ cv, letter, lang: 'fr', now });
    expect(patch.subject).toBeUndefined();
    expect(patch.place).toBeUndefined();
    expect(patch.salutation).toBeUndefined();
    expect(patch.closing).toBe('Je vous prie d’agréer, Madame, l’expression de mes salutations distinguées.');
  });

  it('omet ce qui manque dans le CV', () => {
    const blank = createCv();
    expect(buildPrefill({ cv: blank, letter: emptyCoverLetter(), lang: 'fr', now })).toEqual({
      date: '18 octobre 2026',
      salutation: 'Madame, Monsieur,',
      closing: 'Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.',
    });
  });

  it('propose les formules anglaises pour un CV en anglais', () => {
    const patch = buildPrefill({ cv, letter: emptyCoverLetter(), lang: 'en', now });
    expect(patch.subject).toBe('Application for the position of Chargée de communication');
    expect(patch.date).toBe('18 October 2026');
    expect(patch.salutation).toBe('Dear Hiring Manager,');
    expect(patch.closing).toBe('Yours sincerely,');
  });
});

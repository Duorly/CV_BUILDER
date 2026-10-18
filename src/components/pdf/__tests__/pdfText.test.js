import { describe, expect, it } from 'vitest';
import {
  WORD_BREAK,
  alteredFragments,
  breakLongWords,
  droppedSymbols,
  isAlteredInPdf,
  pdfText,
  pdfTexts,
  wordWidthEm,
} from '../pdfText';
import { pdfAlteredText } from '../pdfCoverage';
import { normalizeData } from '../../../lib/schema';
import example from '../../../data/exampleResume.json';

describe('pdfText', () => {
  it('conserve les accents et la typographie française du jeu WinAnsi', () => {
    const text = 'Œuvre, cœur, «Été» – 2024 — l’équipe… • ™ ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸàâäçéèêëîïôöùûüÿ ß ñ ø';
    expect(pdfText(text)).toBe(text);
  });

  it('rend insécables les espaces qui ne doivent pas finir une ligne', () => {
    expect(pdfText('budget de 80 000 et +40 % ; « Été » : oui !')).toBe(
      'budget de 80\u00A0000 et +40\u00A0%\u00A0; «\u00A0Été\u00A0»\u00A0: oui\u00A0!',
    );
    expect(pdfText('2018 - 2020, 06 12 34 56 78')).toBe('2018 - 2020, 06 12 34 56 78');
  });

  it('écrit « EUR » à la place de « € », mal espacé par Aperçu et poppler', () => {
    expect(pdfText('budget de 80 000 € (2024)')).toBe('budget de 80\u00A0000\u00A0EUR (2024)');
    expect(pdfText('40€/h, €50k, 3\u202F€, 50 k€')).toBe('40\u00A0EUR/h, EUR\u00A050k, 3\u00A0EUR, 50 kEUR');
  });

  it('recompose les accents saisis en forme décomposée (copier-coller macOS)', () => {
    expect(pdfText('Cre\u0301ation')).toBe('Création');
  });

  it('retire les emoji et les pictogrammes sans laisser de double espace', () => {
    expect(pdfText('🚀 Lancement de la marque 👩\u200D💻 réussi ✅')).toBe('Lancement de la marque réussi');
    expect(pdfText('Top 3 ⭐\uFE0F du classement')).toBe('Top 3 du classement');
    expect(pdfText('Suivi du budget ✅. Puis bilan 📊, enfin 🎉 !')).toBe('Suivi du budget. Puis bilan, enfin\u00A0!');
  });

  it('ne colle pas une ponctuation qui fait partie du texte saisi', () => {
    expect(pdfText('C#, .NET et Node.js')).toBe('C#, .NET et Node.js');
  });

  it('remplace les caractères proches par un équivalent affichable', () => {
    expect(pdfText('Java → Kotlin')).toBe('Java -> Kotlin');
    expect(pdfText('anti\u2011gaspillage \u2212 10')).toBe('anti-gaspillage - 10');
    expect(pdfText('▪ Organisation')).toBe('• Organisation');
    expect(pdfText('ﬁnance, ﬂux')).toBe('finance, flux');
    expect(pdfText('Łódź, Gdańsk, Kő')).toBe('Lódz, Gdansk, Ko');
    expect(pdfText('𝗠𝗮𝗿𝗸𝗲𝘁𝗶𝗻𝗴')).toBe('Marketing');
  });

  it('garde les espaces insécables françaises et retire les caractères invisibles', () => {
    expect(pdfText('Prix\u202F: 10\u00A0%')).toBe('Prix\u00A0: 10\u00A0%');
    expect(pdfText('mot\u200Bcollé\u00ADici\uFEFF')).toBe('motcolléici');
  });

  it('retire les caractères de contrôle qui sortiraient en symboles Windows-1252', () => {
    expect(pdfText('a\u0085b\u0092c\u0007d')).toBe('abcd');
  });

  it('normalise les retours à la ligne et les espaces', () => {
    expect(pdfText('  Ligne 1  \r\n\r\n\r\n   Ligne 2\tfin  ')).toBe('Ligne 1\n\nLigne 2 fin');
  });

  it('écarte les écritures que la police ne couvre pas', () => {
    expect(pdfText('Anglais 英語')).toBe('Anglais');
  });

  it('accepte les valeurs absentes ou non textuelles', () => {
    expect(pdfText(undefined)).toBe('');
    expect(pdfText(null)).toBe('');
    expect(pdfText(42)).toBe('42');
  });
});

describe('pdfTexts', () => {
  it('retire les éléments vides ou devenus vides', () => {
    expect(pdfTexts(['  ', '🎯', 'Rédaction', '', ' Vente '])).toEqual(['Rédaction', 'Vente']);
    expect(pdfTexts(undefined)).toEqual([]);
  });

  it('transmet la largeur de ligne à chaque élément', () => {
    expect(pdfTexts(['abcdef', 'ab'], 1.5)).toEqual([['a', 'b', 'c', 'd', 'e', 'f'].join(WORD_BREAK), 'ab']);
  });
});

describe('wordWidthEm', () => {
  it('mesure un mot avec les métriques Helvetica', () => {
    expect(wordWidthEm('ii')).toBeCloseTo(0.444);
    expect(wordWidthEm('MW')).toBeCloseTo(1.777);
    expect(wordWidthEm('été')).toBeCloseTo(wordWidthEm('ete'));
  });
});

describe('breakLongWords', () => {
  const url = 'exemple.fr/une/adresse/vraiment/tres/longue/sans/aucune/espace/pour/voir/si/elle/deborde/de/la/page';

  it('ne touche pas aux mots qui tiennent sur une ligne', () => {
    const text = 'Pilotage du plan de communication annuel (budget de 80\u00A0000\u00A0EUR)';
    expect(breakLongWords(text, 40)).toBe(text);
    expect(pdfText(text, 40)).toBe(text);
    expect(breakLongWords(url, undefined)).toBe(url);
  });

  it('autorise la coupure entre chaque caractère d’un mot plus large que la ligne', () => {
    const out = pdfText(`Portfolio : ${url} (2024)`, 30);
    expect(out.startsWith('Portfolio\u00A0: e')).toBe(true);
    expect(out.endsWith(' (2024)')).toBe(true);
    expect(out.split(WORD_BREAK).join('')).toBe(`Portfolio\u00A0: ${url} (2024)`);
    expect(out.split(WORD_BREAK)).toHaveLength(url.length);
  });

  it('ne coupe jamais juste après un trait d’union, que les extracteurs supprimeraient', () => {
    expect(breakLongWords('ab-cd', 1)).toBe(['a', 'b', '-c', 'd'].join(WORD_BREAK));
  });
});

describe('caractères altérés par le PDF direct', () => {
  it('repère les lettres simplifiées et les écritures non latines, pas la typographie voulue', () => {
    expect(alteredFragments('Ștefania Łukasiewicz')).toEqual(['Ș', 'Ł']);
    expect(alteredFragments('Russe (русский) · Chinois 中文')).toEqual(['русский', '中文']);
    expect(alteredFragments('Škoda Auto Ελλάς')).toEqual(['Ελλάς']);
    expect(alteredFragments('limba română')).toEqual(['ă']);
    // Français, euro, tirets, guillemets, puces, espaces insécables : rien à signaler.
    expect(alteredFragments('Lætitia Cœur — « 80 000 € » ‑ → ▪ ﬁn %')).toEqual([]);
    expect(isAlteredInPdf('é')).toBe(false);
    expect(isAlteredInPdf('ő')).toBe(true);
  });

  it('pdfAlteredText ne regarde que ce que le PDF affiche', () => {
    const data = normalizeData({
      ...example,
      personalInfo: { ...example.personalInfo, name: 'Ștefania Łukasiewicz' },
      languages: [{ name: 'Russe (русский)', level: 'A2' }],
      customSections: [{ id: 'c1', title: 'Hobbies', items: ['日本語'] }],
      sections: [...normalizeData(example).sections, { id: 'custom:c1', visible: false }],
    });
    expect(pdfAlteredText(data)).toEqual({ fragments: ['Ș', 'Ł', 'русский'], more: false, symbols: [] });
    expect(pdfAlteredText(normalizeData(example))).toEqual({ fragments: [], more: false, symbols: [] });
  });

  it('les emoji sont retirés sans être comptés comme des lettres altérées (le PDF direct reste recommandé)', () => {
    expect(alteredFragments('✨ Chargée de communication ✅ 🚀')).toEqual([]);
    expect(droppedSymbols('✨ Chargée de communication ✅ 🚀')).toEqual(['✨', '✅', '🚀']);
    // Séquence ZWJ : un seul pictogramme, pas « 🏃 » puis « ♀ ».
    expect(droppedSymbols('Course à pied 🏃‍♀️')).toEqual(['🏃‍♀️']);
    // Lettres et emoji mêlés : seules les lettres sont signalées.
    expect(alteredFragments('Ștefania ⭐ Łukasiewicz')).toEqual(['Ș', 'Ł']);
    expect(droppedSymbols('Ștefania ⭐ Łukasiewicz © 2024')).toEqual(['⭐']);
    const data = normalizeData({
      ...example,
      personalInfo: { ...example.personalInfo, title: '✨ Chargée de communication' },
      mainSkills: [{ category: 'Savoir-être', skills: ['Prise de parole ⭐'] }],
    });
    expect(pdfAlteredText(data)).toEqual({ fragments: [], more: false, symbols: ['✨', '⭐'] });
  });
});

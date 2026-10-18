import { nbspText } from '../../lib/typography';

// Les polices intégrées au PDF (Helvetica) ne couvrent que le jeu Windows-1252
// (« WinAnsi ») : tout autre caractère sortirait en glyphe vide ou en caractères
// parasites. On le remplace par un équivalent proche, sinon on le retire
// (emoji, pictogrammes, écritures non latines).

const WIN_ANSI_EXTRAS = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');

const REPLACEMENTS = {
  '\t': ' ',
  // Espaces typographiques : insécables conservées comme telles, les autres deviennent des espaces simples.
  '\u202F': '\u00A0',
  '\u2007': '\u00A0',
  '\u2028': '\n',
  '\u2029': '\n',
  // Tirets et guillemets hors jeu WinAnsi.
  '\u2010': '-',
  '\u2011': '-',
  '\u2012': '–',
  '\u2015': '—',
  '\u2212': '-',
  '\u2043': '-',
  '\u201B': '‘',
  '\u201F': '“',
  '\u2032': '’',
  '\u2033': '”',
  '\u02BC': '’',
  // Puces et flèches courantes dans les CV copiés depuis Word ou LinkedIn.
  '\u2023': '•',
  '\u2219': '•',
  '\u25AA': '•',
  '\u25AB': '•',
  '\u25A0': '•',
  '\u25A1': '•',
  '\u25CF': '•',
  '\u25CB': '•',
  '\u25E6': '•',
  '\u25B8': '•',
  '\u25B9': '•',
  '\u25BA': '•',
  '\u25B6': '•',
  '\u27A2': '•',
  '\u27A4': '•',
  '\u2192': '->',
  '\u2190': '<-',
  '\u2194': '<->',
  '\u21D2': '=>',
  '\u21D0': '<=',
  '\u2794': '->',
  '\u279C': '->',
  '\u2264': '<=',
  '\u2265': '>=',
  '\u2260': '!=',
  '\u2248': '~',
  '\u223C': '~',
  // Lettres sans décomposition Unicode.
  '\u0141': 'L',
  '\u0142': 'l',
  '\u0110': 'D',
  '\u0111': 'd',
  '\u0126': 'H',
  '\u0127': 'h',
  '\u0131': 'i',
};

function isWinAnsi(ch) {
  const code = ch.codePointAt(0);
  if (code === 0x0a) return true;
  if (code >= 0x20 && code <= 0x7e) return true;
  // 0xAD (trait d'union conditionnel) est volontairement exclu : il est retiré.
  if (code >= 0xa0 && code <= 0xff) return code !== 0xad;
  return WIN_ANSI_EXTRAS.has(ch);
}

// Marque provisoire d'un caractère retiré, pour nettoyer l'espace qu'il laisse.
const DROPPED = '\u0000';

// « € » est bien dans le jeu WinAnsi, mais Aperçu (macOS) et les visionneuses à base
// de poppler n'ont pas sa largeur dans leurs métriques Helvetica : le caractère suivant
// le chevauche. Le code ISO s'affiche correctement partout : « 80 000 € » → « 80 000 EUR ».
function replaceEuro(text) {
  return text
    .replace(/(\d)[ \u00A0\u202F]?€/g, '$1\u00A0EUR')
    .replace(/€[ \u00A0\u202F]?(?=\d)/g, 'EUR\u00A0')
    .replace(/€/g, 'EUR');
}

// Point de coupure autorisé dans un mot trop long (voir ResumePdfDocument). Le trait
// d'union conditionnel saisi par l'utilisatrice est retiré par pdfText : pas d'ambiguïté.
export const WORD_BREAK = '\u00AD';

// Largeurs Helvetica des caractères ASCII imprimables (métriques AFM, millièmes d'em).
const ASCII_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 222, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722,
  778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 222, 556, 556, 500, 556, 556,
  278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260,
  334, 584,
];

// Largeur d'un mot en em. Lettre accentuée : largeur de sa lettre de base ; autre caractère : 1 em.
export function wordWidthEm(word) {
  let width = 0;
  for (const ch of word) {
    const code = ch.normalize('NFKD').charCodeAt(0);
    width += code >= 32 && code <= 126 ? ASCII_WIDTHS[code - 32] : 1000;
  }
  return width / 1000;
}

// Un mot plus large que la ligne (adresse web collée dans une puce, identifiant…)
// déborderait de la page et sa fin serait perdue, à l'écran comme à l'extraction.
// On l'autorise à se couper entre deux caractères, comme overflow-wrap: anywhere
// dans le template HTML. Les mots qui tiennent sur une ligne ne sont pas touchés.
// Jamais juste après un trait d'union : pdftotext et les logiciels de tri le prendraient
// pour une césure et le supprimeraient (« 2024-communication » → « 2024communication »).
export function breakLongWords(text, maxWordEm) {
  if (!maxWordEm) return text;
  return text.replace(/[^ \n]+/g, (word) =>
    wordWidthEm(word) > maxWordEm ? word.replace(/[^-](?!$)/g, `$&${WORD_BREAK}`) : word,
  );
}

function mapChar(ch) {
  if (isWinAnsi(ch)) return ch;
  if (Object.prototype.hasOwnProperty.call(REPLACEMENTS, ch)) return REPLACEMENTS[ch];
  // Décomposition de compatibilité : « ﬁ » → « fi », « ő » → « o », « 𝗕 » → « B »…
  let fallback = '';
  for (const part of ch.normalize('NFKD')) {
    if (isWinAnsi(part)) fallback += part;
  }
  return fallback || DROPPED;
}

// Caractère que le PDF direct ne peut pas reproduire tel quel : lettre simplifiée
// (« Ș » → « S », « ő » → « o ») ou retirée (cyrillique, grec, chinois, emoji…).
// Les remplacements typographiques voulus (espaces, tirets, guillemets, puces, flèches,
// « € ») et les caractères invisibles ne comptent pas.
export function isAlteredInPdf(ch) {
  if (isWinAnsi(ch)) return false;
  if (/[\p{Cc}\p{Cf}\p{Mn}\p{Z}]/u.test(ch)) return false;
  if (Object.prototype.hasOwnProperty.call(REPLACEMENTS, ch)) return /\p{L}/u.test(ch);
  if (mapChar(ch) === DROPPED) return true;
  return [...ch.normalize('NFKD')].some((part) => !isWinAnsi(part));
}

// Découpage en caractères perçus : « 🏃‍♀️ » (coureuse) est un seul pictogramme, pas « 🏃 » et « ♀ ».
const segmenter =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('fr', { granularity: 'grapheme' })
    : null;
const graphemes = (text) => (segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : [...text]);

const isAlteredCluster = (cluster) => [...cluster].some(isAlteredInPdf);
// Lettre (ou écriture) altérée : c'est elle qui justifie de prévenir. Les emoji et symboles
// retirés (« ✅ », « 🚀 ») n'ont pas de valeur de mot-clé et gênent les logiciels de recrutement :
// les retirer est le bon comportement pour un PDF ATS.
const isLetterCluster = (cluster) => /\p{L}/u.test(cluster);

// Morceaux d'un texte dont des lettres seraient simplifiées ou retirées par le PDF direct :
// « Ștefania Łukasiewicz » → ['Ș', 'Ł'], « Russe (русский) » → ['русский']. Les emoji n'y sont pas.
export function alteredFragments(value) {
  const fragments = [];
  let run = '';
  for (const cluster of graphemes(String(value ?? '').normalize('NFC'))) {
    if (isAlteredCluster(cluster) && isLetterCluster(cluster)) {
      run += cluster;
    } else if (run) {
      fragments.push(run);
      run = '';
    }
  }
  if (run) fragments.push(run);
  return fragments;
}

// Emoji et symboles que le PDF direct retire : « Projet ✅ 🏃‍♀️ » → ['✅', '🏃‍♀️'].
export function droppedSymbols(value) {
  return graphemes(String(value ?? '').normalize('NFC')).filter(
    (cluster) => isAlteredCluster(cluster) && !isLetterCluster(cluster),
  );
}

// Texte prêt pour le PDF : caractères compatibles, espaces simples, sans espaces en bord.
// Les doubles espaces sont réduites aussi parce que le moteur de mise en page les
// traiterait comme des points de césure.
// maxWordEm (facultatif) : largeur de ligne en em au-delà de laquelle un mot peut être coupé.
export function pdfText(value, maxWordEm) {
  const input = replaceEuro(
    String(value ?? '')
      .replace(/\r\n?/g, '\n')
      .normalize('NFC'),
  );
  let out = '';
  for (const ch of input) out += mapChar(ch);
  const text = out
    // « budget ✅. » → « budget. » : l'espace qui précédait l'emoji part avec lui.
    .replace(/ *\u0000+(?=[ \n]*(?:[.,;:!?)\]»…]|$))/g, '')
    .replace(/\u0000+/g, '')
    .replace(/ {2,}/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  // Espaces insécables à la française : pas de « % » ni de « 000 » seul en début de ligne.
  return breakLongWords(nbspText(text), maxWordEm);
}

// Liste nettoyée : éléments vides (ou devenus vides, ex. un emoji seul) retirés.
export function pdfTexts(values, maxWordEm) {
  return (values || []).map((value) => pdfText(value, maxWordEm)).filter(Boolean);
}

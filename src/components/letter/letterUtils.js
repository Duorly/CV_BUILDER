// Conventions de la lettre de motivation (français / anglais) et valeurs proposées.

const MONTHS = {
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

export const LETTER_TEXT = {
  fr: {
    subjectLabel: 'Objet :',
    salutation: 'Madame, Monsieur,',
    subjectFor: (jobTitle) => `Candidature au poste de ${jobTitle}`,
  },
  en: {
    subjectLabel: 'Subject:',
    salutation: 'Dear Hiring Manager,',
    subjectFor: (jobTitle) => `Application for the position of ${jobTitle}`,
  },
};

export const letterLang = (lang) => (lang === 'en' ? 'en' : 'fr');

const text = (v) => (typeof v === 'string' ? v.trim() : '');

// « 18 octobre 2026 », « 1er mai 2026 » ou « 18 October 2026 ».
export function formatLongDate(date = new Date(), lang = 'fr') {
  const day = date.getDate();
  const month = MONTHS[letterLang(lang)][date.getMonth()];
  if (lang === 'en') return `${day} ${month} ${date.getFullYear()}`;
  return `${day === 1 ? '1er' : day} ${month} ${date.getFullYear()}`;
}

// « 69003 Lyon, France » → « Lyon » : la ville seule, pour « Lyon, le … ».
export function cityFromLocation(location) {
  return text(location)
    .split(',')[0]
    .replace(/\(\s*\d+\s*\)/g, '')
    .replace(/\b\d{4,5}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function defaultSalutation(lang) {
  return LETTER_TEXT[letterLang(lang)].salutation;
}

// La formule de politesse française reprend la formule d'appel
// (« Madame, Monsieur, » → « Je vous prie d'agréer, Madame, Monsieur, … »).
export function defaultClosing(lang, salutation = '') {
  if (letterLang(lang) === 'en') return 'Yours sincerely,';
  const called = text(salutation).replace(/[\s,]+$/, '');
  const echo = /^(madame|monsieur|mesdames|messieurs)\b/i.test(called) ? called : 'Madame, Monsieur';
  return `Je vous prie d’agréer, ${echo}, l’expression de mes salutations distinguées.`;
}

// « Lyon, le 18 octobre 2026 » ; sans lieu : « Le 18 octobre 2026 ».
export function formatDateLine(place, date, lang = 'fr') {
  const p = text(place);
  const d = text(date);
  if (letterLang(lang) === 'en') return [p, d].filter(Boolean).join(', ');
  if (!d) return p;
  const withLe = /^le\s/i.test(d) ? d.replace(/^le/i, 'le') : `le ${d}`;
  if (!p) return `L${withLe.slice(1)}`;
  return `${p}, ${withLe}`;
}

// Évite « Objet : Objet : … » quand l'objet saisi contient déjà le libellé.
export function stripSubjectLabel(subject) {
  return text(subject).replace(/^(objet|subject|re)\s*:\s*/i, '');
}

// Paragraphes séparés par une ligne vide ; un simple retour à la ligne est conservé.
export function splitParagraphs(body) {
  return String(body || '')
    .replace(/\r\n?/g, '\n')
    .split(/\n(?:[ \t]*\n)+/)
    .map((p) => p.replace(/^(?:[ \t]*\n)+|\s+$/g, ''))
    .filter((p) => p.trim())
    .map((p) => p.split('\n'));
}

// Les signes isolés (« : », « – ») ne comptent pas comme des mots.
export function countWords(body) {
  return String(body || '')
    .split(/\s+/)
    .filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

export const WORDS_MIN = 250;
export const WORDS_MAX = 400;

export function wordCountStatus(count) {
  if (count === 0) return 'empty';
  if (count < WORDS_MIN) return 'short';
  if (count > WORDS_MAX) return 'long';
  return 'ok';
}

// ── Lettre complète collée dans le corps ─────────────────────────────────
// Une lettre déjà rédigée (Word…) contient sa formule d'appel, sa formule de politesse et
// sa signature : on les repère pour ne pas les imprimer deux fois (valeurs par défaut).

const SALUTATION_START =
  /^(madame|monsieur|mesdames|messieurs|mademoiselle|bonjour|bonsoir|cher|chère|chers|chères|dear|hello|hi|to whom it may concern)\b/i;
const CLOSING_FORMULA =
  /(je vous prie (d[’']agréer|d[’']accepter|de recevoir|de croire)|veuillez (agréer|accepter|recevoir)|recevez,? |l[’']expression de (mes|ma)|mes (sincères |meilleures |respectueuses )?salutations|salutations distinguées|sentiments (les meilleurs|distingués|dévoués)|^(bien |très )?cordialement\b|^bien à vous\b|^sincèrement\b|^yours (sincerely|faithfully|truly)\b|^(kind|best|warm|warmest) regards\b|^regards\b|^sincerely\b|^respectfully\b)/i;

const comparable = (v) =>
  text(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();

const looksLikeSalutation = (line) =>
  line.length <= 70 && SALUTATION_START.test(line) && (/[,:!]$/.test(line) || line.split(/\s+/).length <= 4);
const looksLikeClosing = (paragraph) => CLOSING_FORMULA.test(paragraph.replace(/\s+/g, ' ').trim());
// Ligne courte en fin de lettre, sans ponctuation de phrase : un prénom et un nom.
const looksLikeName = (line) =>
  line.length <= 50 && !/[.!?;:,]$/.test(line) && /^\p{Lu}/u.test(line) && line.split(/\s+/).length <= 5;

// Sépare d'un texte collé la formule d'appel (première ligne), la formule de politesse
// (dernier paragraphe) et la signature (dernière ligne). Retourne { salutation, body, closing,
// signature } ; les parties non trouvées sont vides et le corps garde tout le reste, dans l'ordre.
export function splitPastedLetter(value, { name = '' } = {}) {
  const lines = String(value || '').replace(/\r\n?/g, '\n').split('\n').map((line) => line.replace(/\s+$/, ''));
  const trimEdges = () => {
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  };
  trimEdges();
  const out = { salutation: '', body: '', closing: '', signature: '' };
  if (lines.length < 2) {
    out.body = lines.join('\n');
    return out;
  }

  if (looksLikeSalutation(lines[0].trim())) {
    out.salutation = lines.shift().trim();
    trimEdges();
  }

  // Signature : la dernière ligne, si c'est le nom de la personne ou un nom après une formule de politesse.
  const last = lines[lines.length - 1]?.trim() || '';
  const beforeLast = lines.slice(0, -1).filter((line) => line.trim()).at(-1) || '';
  const isOwnName = comparable(name) && comparable(last) === comparable(name);
  if (lines.length > 1 && last && (isOwnName || (looksLikeName(last) && looksLikeClosing(beforeLast.trim())))) {
    out.signature = lines.pop().trim();
    trimEdges();
  }

  // Formule de politesse : dans le dernier paragraphe, à partir de la ligne qui la commence
  // (« Cordialement, » sous la dernière phrase), jamais tout le texte.
  let start = lines.length;
  while (start > 0 && lines[start - 1].trim()) start -= 1;
  let from = lines.findIndex((line, i) => i >= start && looksLikeClosing(line));
  if (from === -1 && looksLikeClosing(lines.slice(start).join(' '))) from = start;
  if (from > 0) {
    out.closing = lines.slice(from).join('\n').trim();
    lines.splice(from);
    trimEdges();
  }

  out.body = lines.join('\n');
  return out;
}

// Contenu effectivement imprimé : les formules vides prennent la valeur
// conventionnelle dès que la lettre a un corps ; les autres champs vides disparaissent.
// Un corps qui contient déjà sa formule d'appel, sa formule de politesse ou la signature
// (lettre tapée d'un bloc) ne reçoit pas en plus la valeur par défaut correspondante.
export function resolveLetter(letter, personalInfo = {}, lang = 'fr') {
  const l = letter || {};
  const hasBody = Boolean(text(l.body));
  const inBody = hasBody ? splitPastedLetter(l.body, { name: personalInfo.name }) : {};
  const salutation = text(l.salutation) || (hasBody && !inBody.salutation ? defaultSalutation(lang) : '');
  return {
    recipient: [text(l.recipientName), text(l.recipientCompany), ...String(l.recipientAddress || '').split(/\r?\n/)]
      .map((line) => line.trim())
      .filter(Boolean),
    dateLine: formatDateLine(l.place, l.date, lang),
    subject: stripSubjectLabel(l.subject),
    salutation,
    paragraphs: splitParagraphs(l.body),
    closing:
      text(l.closing) ||
      (hasBody && !inBody.closing && !inBody.signature ? defaultClosing(lang, salutation || inBody.salutation) : ''),
    signature: text(l.signature) || (hasBody && !inBody.signature ? text(personalInfo.name) : ''),
  };
}

// Valeurs proposées par « Pré-remplir » : seuls les champs encore vides sont remplis.
export function buildPrefill({ cv, letter, lang = 'fr', now = new Date() }) {
  const pi = cv?.data?.personalInfo || {};
  const current = letter || {};
  const jobTitle = text(cv?.jobTitle);
  const salutation = text(current.salutation) || defaultSalutation(lang);
  const proposals = {
    recipientCompany: text(cv?.company),
    subject: jobTitle ? LETTER_TEXT[letterLang(lang)].subjectFor(jobTitle) : '',
    place: cityFromLocation(pi.location),
    date: formatLongDate(now, lang),
    salutation,
    closing: defaultClosing(lang, salutation),
    signature: text(pi.name),
  };
  const patch = {};
  for (const [key, value] of Object.entries(proposals)) {
    if (value && !text(current[key])) patch[key] = value;
  }
  return patch;
}

import { normalizeData } from '../schema';
import { hasAiKey, resolveAi } from './providers';
import { AiError, noKeyError, unreadableError } from './errors';
import { callLLM } from './client';
import { identityScrubber, stripForAI } from './privacy';
import { DATA_RULE, fence, objectOf, offerContext, str } from './shared';

// Brouillon de lettre de motivation à partir du CV et de l’offre.

// ── Brouillon de lettre de motivation ─────────────────────────────────────

export const LETTER_SCHEMA = objectOf({
  subject: { type: 'string', description: 'Objet de la lettre.' },
  salutation: { type: 'string', description: "Formule d’appel, ex. « Madame, Monsieur, »." },
  body: { type: 'string', description: 'Corps de la lettre, paragraphes séparés par une ligne vide.' },
  closing: { type: 'string', description: 'Formule de politesse finale.' },
});

const LETTER_TONES = {
  formel: 'formel et soigné, avec les formules de politesse classiques',
  chaleureux: 'chaleureux et sincère, tout en restant professionnel',
  dynamique: 'dynamique et direct, avec des phrases courtes et énergiques',
};

const LETTER_LENGTHS = {
  courte: 'court : 120 à 180 mots, deux ou trois paragraphes, utilisable dans un e-mail ou un message LinkedIn',
  standard: 'standard : 250 à 350 mots, trois ou quatre paragraphes',
};

function letterSystem({ tone, length, lang }) {
  const english = lang === 'en';
  return `Vous rédigez le brouillon d’une lettre de motivation à partir d’un CV et d’une offre d’emploi.

${DATA_RULE}

Règles :
- Langue de la lettre : ${english ? 'anglais, avec les usages anglophones (« Dear Hiring Manager, », « Kind regards, »)' : 'français, avec les usages français (« Madame, Monsieur, », formule de politesse complète)'}.
- Ton ${LETTER_TONES[tone] || LETTER_TONES.formel}.
- Format ${LETTER_LENGTHS[length] || LETTER_LENGTHS.standard}.
- Appuyez-vous uniquement sur des faits du CV : aucune compétence, expérience, chiffre, diplôme ou motivation personnelle inventés. Reliez ces faits aux besoins de l’offre et à l’entreprise.
- N’écrivez aucun espace réservé du type [Nom] ou [Date] ; si une information manque, formulez la phrase sans elle.
- body contient seulement le corps : ni formule d’appel, ni formule de politesse, ni signature, ni coordonnées, ni date.
- salutation : formule d’appel adaptée au nom du destinataire s’il est connu.
- closing : formule de politesse finale${english ? '' : " (si elle reprend la formule d’appel, accordez-la avec celle-ci)"}, sans signature.`;
}

export async function draftCoverLetter({
  data,
  jobOffer = '',
  company = '',
  jobTitle = '',
  recipientName = '',
  tone = 'formel',
  length = 'standard',
  lang = 'fr',
  signal,
} = {}) {
  if (!hasAiKey()) throw noKeyError();
  if (!str(jobOffer) && !str(company) && !str(jobTitle)) {
    throw new AiError('MISSING_INPUT', "Indiquez au moins l’entreprise, le poste visé ou le texte de l’offre.");
  }
  const d = normalizeData(data);
  const user = [
    `Destinataire : ${str(recipientName) || 'inconnu'}`,
    offerContext({ jobOffer, company, jobTitle }),
    fence('cv', JSON.stringify(stripForAI(d))),
  ].join('\n\n');
  const { data: raw } = await callLLM({
    system: letterSystem({ tone, length, lang }),
    user,
    schema: LETTER_SCHEMA,
    task: 'letter',
    maxTokens: 12000,
    signal,
  });
  const { restore } = identityScrubber(d.personalInfo);
  const body = restore(String(raw?.body || ''))
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!body) throw unreadableError(resolveAi().provider, 'corps vide');
  return {
    subject: restore(str(raw?.subject)),
    salutation: restore(str(raw?.salutation)),
    body,
    closing: restore(str(raw?.closing)),
  };
}

import { callLLM } from './client';
import { stripForAI } from './privacy';
import { arr, DATA_RULE, fence, normalizeTerm, offerContext, str, strList } from './shared';

// Étape 1 de l’adaptation à une offre : analyse des mots-clés de l’offre face au CV.

// ── Étape 1 : analyse des mots-clés de l’offre ─────────────────────────────

export const IMPORTANCE_LEVELS = ['essentielle', 'importante', 'secondaire'];
export const FIT_LEVELS = ['faible', 'moyenne', 'bonne', 'forte'];

export const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['jobTitle', 'company', 'keywords', 'strengths', 'improvements', 'fit', 'fitComment'],
  properties: {
    jobTitle: { type: 'string', description: "Intitulé du poste tel qu’il figure dans l’offre, ou chaîne vide." },
    company: { type: 'string', description: "Nom de l’entreprise qui recrute, ou chaîne vide." },
    keywords: {
      type: 'array',
      description: "Mots-clés de l’offre, du plus important au moins important.",
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['term', 'importance', 'present', 'evidence'],
        properties: {
          term: { type: 'string', description: "Mot-clé formulé comme dans l’offre (1 à 4 mots, sans verbe)." },
          importance: { type: 'string', enum: IMPORTANCE_LEVELS },
          present: { type: 'boolean', description: 'true seulement si le CV le mentionne explicitement ou par un équivalent incontestable.' },
          evidence: { type: 'string', description: 'Si présent : où il apparaît dans le CV, en quelques mots. Sinon chaîne vide.' },
        },
      },
    },
    strengths: {
      type: 'array',
      description: 'Atouts du CV pour ce poste, chacun appuyé sur un élément nommé du CV.',
      items: { type: 'string' },
    },
    improvements: {
      type: 'array',
      description: 'Conseils ciblés : un endroit précis du CV et ce qu’il faut y changer.',
      items: { type: 'string' },
    },
    fit: { type: 'string', enum: FIT_LEVELS },
    fitComment: { type: 'string' },
  },
};

const ANALYSIS_SYSTEM = `Vous êtes conseiller ou conseillère en recrutement. Une personne vous montre son CV et une offre d’emploi : vous l’aidez à voir ce que le recruteur va chercher et ce que son CV montre déjà. Vos réponses s’affichent telles quelles dans l’application : la liste des mots-clés (présents ou manquants), puis vos points forts et vos points à renforcer. Une étape suivante proposera des réécritures du CV à partir de votre analyse.

${DATA_RULE}

Mots-clés (keywords)
- Retenez ce qu’un recruteur ou un logiciel de tri (ATS) vérifierait vraiment : métier et missions, compétences techniques, outils et logiciels, méthodes, diplômes ou certifications exigés, langues, permis, secteur. Un savoir-être seulement s’il est clairement demandé (répété ou présenté comme indispensable) ; jamais les qualités passe-partout citées en passant (« dynamique », « motivé », « bon relationnel »).
- Ignorez la présentation de l’entreprise, les avantages, le salaire, les horaires et les formules toutes faites de l’annonce.
- 8 à 20 mots-clés, sans doublon : regroupez les variantes d’une même idée (« Excel » et « maîtrise d’Excel » donnent « Excel »). Gardez la formulation de l’offre, en 1 à 4 mots, sans verbe.
- importance : « essentielle » = exigé ou au cœur du poste ; « importante » = demandé ; « secondaire » = un plus.
- present : true seulement si le CV le dit explicitement ou par un équivalent qu’aucun recruteur ne contesterait (« Pack Office » couvre « Word »). Une expérience voisine ne suffit pas ; dans le doute, false. evidence indique où, en quelques mots (« puce de l’expérience Vendeuse »).

Points forts (strengths) : 2 à 4 atouts du CV pour ce poste précis. Chacun s’appuie sur un élément nommé du CV (expérience, résultat, compétence) et le relie à une exigence de l’offre.

Points à renforcer (improvements) : 2 à 4 conseils, le plus utile en premier. Chaque conseil :
- vise un endroit précis du CV, nommé (le titre, le résumé, une puce d’une expérience nommée, un groupe de compétences), et dit ce qu’il faut y changer ;
- s’appuie sur ce que la personne a déjà fait : mettre en avant, reformuler avec les mots de l’offre, préciser l’objet ou le résultat d’une mission. Pour une information que le CV ne donne pas, formulez une question (« Si vous avez déjà…, précisez-le dans… ») ;
- ne répète pas les mots-clés manquants : ils sont déjà listés à côté, avec une case pour que la personne confirme ceux qu’elle possède.
Écartez les conseils qui conviendraient à n’importe quel CV (« ajoutez des chiffres », « adaptez votre CV à l’offre », « soignez la mise en page ») et ceux qui sortent du CV (se former, passer une certification, écrire une lettre).
Exemple de bon conseil : « L’offre insiste sur l’encaissement : votre expérience en boulangerie le mentionne en dernière puce, remontez-la et nommez-le “tenue de caisse”. » Exemple de conseil inutile : « Mettez davantage en valeur vos compétences. »

Adéquation (fit) : « forte » si les exigences essentielles sont toutes couvertes, « bonne » s’il en manque une, « moyenne » s’il en manque plusieurs mais que le métier est proche, « faible » si le parcours est éloigné. fitComment : une ou deux phrases franches et bienveillantes, qui citent le principal écart s’il y en a un.

Tout le texte est en français et vouvoie la personne (« Vous… »). jobTitle et company : repris de l’offre, sinon chaîne vide.`;

export function normalizeAnalysis(raw) {
  const seen = new Set();
  const keywords = [];
  for (const k of arr(raw?.keywords)) {
    const term = str(k?.term).replace(/\s+/g, ' ');
    const key = normalizeTerm(term);
    if (!term || !key || seen.has(key)) continue;
    seen.add(key);
    keywords.push({
      term,
      importance: IMPORTANCE_LEVELS.includes(k.importance) ? k.importance : 'importante',
      present: k.present === true,
      evidence: str(k.evidence),
    });
  }
  keywords.sort((a, b) => IMPORTANCE_LEVELS.indexOf(a.importance) - IMPORTANCE_LEVELS.indexOf(b.importance));
  return {
    jobTitle: str(raw?.jobTitle),
    company: str(raw?.company),
    keywords: keywords.map((k, i) => ({ id: `kw_${i}`, ...k })),
    strengths: strList(raw?.strengths),
    improvements: strList(raw?.improvements),
    fit: FIT_LEVELS.includes(raw?.fit) ? raw.fit : '',
    fitComment: str(raw?.fitComment),
  };
}

export async function analyzeOffer({ data, jobOffer, company, jobTitle, offerUrl, signal }) {
  const user = `${offerContext({ jobOffer, company, jobTitle, offerUrl })}\n\n${fence('cv', JSON.stringify(stripForAI(data)))}`;
  const { data: raw } = await callLLM({
    system: ANALYSIS_SYSTEM,
    user,
    schema: ANALYSIS_SCHEMA,
    task: 'analyze',
    maxTokens: 12000,
    signal,
  });
  return normalizeAnalysis(raw);
}

// Compétences que l’IA a le droit d’ajouter : celles déjà présentes dans le CV
// et celles que la personne a confirmé posséder. Les autres sont refusées.
// confirmations : { [keywordId]: { owned: boolean, context: string } }
// Mots-clés de l’offre que l’utilisatrice n’a pas confirmé posséder : aucune proposition ne doit
// les introduire sans le signaler (voir buildChanges). Y compris ceux que l’IA juge « présents »
// grâce à un synonyme : buildChanges écarte ceux que le CV cite mot pour mot, il ne reste donc que
// les rapprochements (« Adobe InDesign » pour « Suite Adobe »), à faire vérifier.
// Retourne [{ term, evidence }] (evidence : où l’IA a vu le synonyme dans le CV).
export function forbiddenTermsFrom(analysis, confirmations = {}) {
  return (analysis?.keywords || [])
    .filter((k) => !confirmations[k.id]?.owned)
    .map((k) => ({ term: k.term, evidence: k.present ? str(k.evidence) : '' }));
}

export function allowedSkillsFrom(analysis, confirmations = {}) {
  const out = [];
  for (const k of analysis?.keywords || []) {
    if (k.present) out.push({ term: k.term, origin: 'cv', context: k.evidence || '' });
    else if (confirmations[k.id]?.owned) {
      out.push({ term: k.term, origin: 'confirmed', context: str(confirmations[k.id].context) });
    }
  }
  return out;
}

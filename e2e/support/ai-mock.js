// API d'IA simulées : aucune clé réelle, aucun appel facturé. Les réponses suivent les
// schémas JSON que l'application envoie (analyse, propositions, traduction, lettre).

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-expose-headers': '*',
};

export const MOCK = {
  analysis: {
    jobTitle: 'Chargée de marketing digital',
    company: 'Decathlon',
    keywords: [
      { term: 'Réseaux sociaux', importance: 'essentielle', present: true, evidence: 'Compétences : Marketing digital' },
      { term: 'Google Ads', importance: 'essentielle', present: false, evidence: '' },
      { term: 'Tableaux de bord', importance: 'secondaire', present: false, evidence: '' },
    ],
    strengths: ['Vous animez déjà des réseaux sociaux avec des résultats chiffrés.'],
    improvements: ['La publicité payante n’apparaît pas dans votre CV.'],
    fit: 'bonne',
    fitComment: 'Profil proche de l’offre.',
  },
  summary: 'Chargée de marketing digital, j’anime des campagnes multicanales orientées résultats (réécrit pour l’offre).',
  bulletSuffix: ' (adapté à l’offre)',
  translatedSummary: 'Communications officer with five years of experience in agencies and with advertisers.',
  letterBody:
    'Votre offre de chargée de communication a retenu toute mon attention (brouillon simulé).\n\nDepuis cinq ans, je pilote des campagnes multicanales et j’anime des communautés en ligne.\n\nJe serais heureuse d’échanger avec vous sur ce poste.',
};

function cvFrom(text) {
  const match = /<cv>\n([\s\S]*?)\n<\/cv>/.exec(text || '');
  return match ? JSON.parse(match[1]) : null;
}

function translate(value, key) {
  if (Array.isArray(value)) return value.map((v) => translate(v, key));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, translate(v, k)]));
  }
  if (typeof value !== 'string' || !value || key === 'id' || key === 'period') return value;
  if (key === 'summary') return MOCK.translatedSummary;
  return `${value} [EN]`;
}

function respond(schema, prompt) {
  const required = schema?.required || [];
  const cv = cvFrom(prompt);
  if (required.includes('keywords')) return MOCK.analysis;
  if (required.includes('skillAdditions')) {
    const exp = cv.experiences[0];
    return {
      summary: { text: MOCK.summary, reason: 'L’offre insiste sur le marketing digital.' },
      targetTitle: { text: '', reason: '' },
      skillCategoryOrder: [],
      skillAdditions: [{ skill: 'Google Ads', categoryId: cv.skills[0].id, newCategory: '' }],
      experiences: [
        {
          id: exp.id,
          details: exp.details.map((d, i) => (i === 0 ? `${d}${MOCK.bulletSuffix}` : d)),
          reason: 'Reprend le vocabulaire de l’offre.',
        },
      ],
    };
  }
  if (required.includes('sectionTitles')) return translate(cv);
  if (required.includes('body')) {
    return {
      subject: 'Candidature au poste de chargée de communication',
      salutation: 'Madame, Monsieur,',
      body: MOCK.letterBody,
      closing: 'Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.',
    };
  }
  throw new Error(`Schéma inattendu : ${required.join(', ')}`);
}

// Simule Anthropic et Gemini sur `page`. Retourne la liste des requêtes reçues
// ({ provider, method, url, headers, body }) pour vérifier ce qui est envoyé.
// delayMs : temps de réponse simulé des requêtes POST (une rédaction prend plusieurs secondes).
export async function mockAiApis(page, { delayMs = 0 } = {}) {
  const requests = [];
  const handle = (provider) => async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const entry = { provider, method: req.method(), url: req.url(), headers: req.headers(), body: req.postData() || '' };
    requests.push(entry);
    if (delayMs && req.method() === 'POST') await new Promise((resolve) => setTimeout(resolve, delayMs));
    // Une requête annulée par la page pendant le délai simulé n'a plus de réponse à recevoir.
    const json = (payload) =>
      route
        .fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(payload) })
        .catch(() => {});

    if (req.method() === 'GET') {
      // « Tester la clé » : simple lecture de la fiche du modèle.
      const id = decodeURIComponent(new URL(req.url()).pathname.split('/').pop());
      return json(provider === 'anthropic' ? { type: 'model', id, display_name: id } : { name: `models/${id}` });
    }
    const body = JSON.parse(entry.body);
    if (provider === 'anthropic') {
      const payload = respond(body.output_config?.format?.schema, body.messages?.[0]?.content);
      return json({
        id: 'msg_e2e',
        type: 'message',
        role: 'assistant',
        stop_reason: 'end_turn',
        content: [
          { type: 'thinking', thinking: '' },
          { type: 'text', text: JSON.stringify(payload) },
        ],
      });
    }
    const payload = respond(body.generationConfig?.responseJsonSchema, body.contents?.[0]?.parts?.[0]?.text);
    return json({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(payload) }] }, finishReason: 'STOP' }] });
  };
  await page.route('https://api.anthropic.com/**', handle('anthropic'));
  await page.route('https://generativelanguage.googleapis.com/**', handle('gemini'));
  return requests;
}

// Données qui ne doivent jamais partir chez le fournisseur d'IA.
export function personalDataOf(data) {
  const pi = data.personalInfo;
  const links = (data.socialLinks || []).flatMap((l) => [l.url, l.url.replace(/^https?:\/\/(www\.)?/, '')]);
  return [pi.name, pi.email, pi.phone, pi.location, ...links].filter((v) => v && v.trim());
}

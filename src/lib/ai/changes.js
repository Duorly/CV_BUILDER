import { newSkillGroup, normalizeData } from '../schema';
import { labelsFor } from '../labels';
import { callLLM } from './client';
import { identityScrubber, stripForAI } from './privacy';
import { arr, DATA_RULE, fence, filledDetails, normalizeTerm, offerContext, str, stripBullet, strList } from './shared';
import { allowedSkillsFrom } from './offer';

// Étape 2 de l’adaptation à une offre : propositions de modifications, garde-fous,
// liste des changements et application de ceux que l’utilisatrice coche.

// ── Étape 2 : propositions de modifications (patch) ────────────────────────

export const PATCH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'targetTitle', 'skillCategoryOrder', 'skillAdditions', 'experiences'],
  properties: {
    summary: {
      type: 'object',
      additionalProperties: false,
      required: ['text', 'reason'],
      properties: {
        text: { type: 'string', description: 'Nouveau résumé, ou chaîne vide pour ne pas le modifier.' },
        reason: { type: 'string', description: 'Exigence de l’offre servie par ce résumé.' },
      },
    },
    targetTitle: {
      type: 'object',
      additionalProperties: false,
      required: ['text', 'reason'],
      properties: {
        text: { type: 'string', description: 'Nouveau titre du CV, ou chaîne vide pour ne pas le modifier.' },
        reason: { type: 'string' },
      },
    },
    skillCategoryOrder: {
      type: 'array',
      description: 'id des catégories de compétences dans le nouvel ordre, ou tableau vide.',
      items: { type: 'string' },
    },
    skillAdditions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['skill', 'categoryId', 'newCategory'],
        properties: {
          skill: { type: 'string', description: 'Exactement un terme de <competences_autorisees>.' },
          categoryId: { type: 'string', description: "id d’une catégorie existante, ou chaîne vide." },
          newCategory: { type: 'string', description: 'Nom de nouvelle catégorie si categoryId est vide, sinon chaîne vide.' },
        },
      },
    },
    experiences: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'details', 'reason'],
        properties: {
          id: { type: 'string' },
          details: {
            type: 'array',
            description: 'Toutes les puces, même ordre et même nombre ; celles qui ne changent pas recopiées à l’identique.',
            items: { type: 'string' },
          },
          reason: { type: 'string', description: 'Exigence de l’offre servie par ces modifications.' },
        },
      },
    },
  },
};

const REWRITE_SYSTEM = `Vous adaptez le CV d’une personne à une offre d’emploi précise. Le but : qu’un recruteur qui lit le CV en trente secondes, et un logiciel de tri (ATS), y trouvent vite ce que l’offre demande, sans que rien ne devienne faux. La personne relit chaque proposition et coche celles qu’elle garde : proposez peu de modifications, mais des modifications qu’elle aura envie d’accepter.

${DATA_RULE}

Règles absolues (honnêteté)
1. N’ajoutez aucune compétence, aucun outil, chiffre, diplôme, certification, intitulé de poste, responsabilité ou résultat absent du CV ou des compétences confirmées par la personne. Ne modifiez jamais un chiffre existant.
2. Les mots-clés « manquants NON confirmés » de <mots_cles> ne doivent apparaître nulle part, même reformulés ou suggérés.
3. Écrivez dans la langue du CV (un CV en français reste en français, même si l’offre est en anglais). Gardez la personne grammaticale du résumé d’origine.
4. Ne touchez pas aux entreprises, dates, lieux, diplômes, langues et liens : ils ne font pas partie de la réponse.

Ce qui justifie une modification — au moins une de ces raisons :
- reprendre le terme exact de l’offre pour une compétence ou une mission que le CV décrit déjà avec d’autres mots (le CV dit « conseil à la clientèle », l’offre « relation client ») ;
- faire ressortir une mission ou un résultat du CV qui répond à une exigence essentielle de l’offre (le mettre en tête de phrase, nommer son objet, citer le résultat déjà donné ailleurs dans la même expérience) ;
- rendre concrète une formulation vague grâce à des informations déjà présentes dans le CV.
Ne proposez pas : de simples synonymes ou retouches de style, des formules creuses (« dynamique », « force de proposition », « avec rigueur et professionnalisme », « contribuer activement à »), une phrase plus longue sans information nouvelle, plusieurs mots-clés empilés dans une même phrase. Dans le doute, ne changez rien : une réponse avec deux ou trois modifications fortes vaut mieux que dix retouches.

Résumé (summary.text) : chaîne vide s’il sert déjà bien l’offre. Sinon 2 à 4 phrases (300 à 600 caractères) : le métier de la personne et son expérience, tirés du CV, présentés sous l’angle du poste visé ; deux ou trois compétences ou résultats du CV qui répondent aux exigences essentielles ; ce qu’elle recherche. Aucune qualité que le CV ne démontre, aucun cliché.

Titre (targetTitle.text) : l’intitulé de l’offre, ou une forme proche, seulement si le parcours y correspond réellement et que le titre actuel ne convient pas. Sinon chaîne vide.

Compétences :
- skillCategoryOrder : id des catégories dans un nouvel ordre seulement si l’ordre actuel ne met pas en premier ce que l’offre demande ; sinon tableau vide.
- skillAdditions : uniquement des termes de <competences_autorisees>, recopiés à l’identique, absents des compétences actuelles et utiles pour l’offre, avec l’id de la catégorie existante la plus logique (ou newCategory si aucune ne convient).

Expériences (experiences) : traitez d’abord les expériences en rapport avec l’offre, les plus récentes en premier ; laissez de côté celles qui n’apportent rien pour ce poste. Pour chaque expérience modifiée (id pris dans experiences ou otherExperiences), renvoyez TOUTES ses puces, dans le même ordre et en même nombre, et recopiez caractère pour caractère celles qui ne changent pas. Une puce : une idée, qui commence par un verbe d’action ou un nom d’action, d’une longueur proche de l’original, sans symbole de puce.

reason : une phrase courte en français, qui vouvoie la personne et nomme l’exigence de l’offre servie (« L’offre demande la gestion des stocks : votre puce le dit désormais avec ses mots. »). Pas de justification passe-partout (« pour mieux correspondre à l’offre »).`;

// Mots-clés classés selon ce que la personne a confirmé, puis les conseils de l’analyse :
// la réécriture les suit quand le CV le permet, et reste cohérente avec ce que la personne a lu.
function keywordsBlock(analysis, confirmations) {
  const present = [];
  const confirmed = [];
  const missing = [];
  for (const k of analysis?.keywords || []) {
    if (k.present) present.push(`- ${k.term}${k.evidence ? ` (dans le CV : ${k.evidence})` : ''}`);
    else if (confirmations?.[k.id]?.owned) {
      const ctx = str(confirmations[k.id].context);
      confirmed.push(`- ${k.term}${ctx ? ` — précision de la personne : ${ctx}` : ''}`);
    } else missing.push(`- ${k.term}`);
  }
  const section = (title, lines) => `${title}\n${lines.length ? lines.join('\n') : '(aucun)'}`;
  return [
    section('Mots-clés déjà présents dans le CV :', present),
    section('Mots-clés confirmés par la personne (elle possède réellement ces compétences) :', confirmed),
    section('Mots-clés manquants NON confirmés (interdits) :', missing),
    section(
      'Conseils donnés à la personne lors de l’analyse (à suivre seulement s’ils respectent les règles absolues) :',
      strList(analysis?.improvements).map((tip) => `- ${tip}`),
    ),
  ].join('\n\n');
}

export function normalizePatch(raw, personalInfo = {}) {
  const { restore } = identityScrubber(personalInfo);
  const text = (v) => restore(str(v));
  const seen = new Set();
  const experiences = [];
  for (const e of arr(raw?.experiences)) {
    const id = str(e?.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    experiences.push({
      id,
      details: arr(e.details).map((d) => restore(stripBullet(d))).filter(Boolean),
      reason: text(e.reason),
    });
  }
  return {
    summary: { text: text(raw?.summary?.text), reason: text(raw?.summary?.reason) },
    targetTitle: { text: text(raw?.targetTitle?.text), reason: text(raw?.targetTitle?.reason) },
    skillCategoryOrder: strList(raw?.skillCategoryOrder),
    skillAdditions: arr(raw?.skillAdditions)
      .map((s) => ({ skill: str(s?.skill), categoryId: str(s?.categoryId), newCategory: str(s?.newCategory) }))
      .filter((s) => s.skill),
    experiences,
  };
}

export async function proposeChanges({ data, jobOffer, company, jobTitle, offerUrl, analysis, confirmations = {}, signal }) {
  const allowed = allowedSkillsFrom(analysis, confirmations).map((s) => s.term);
  const user = [
    offerContext({ jobOffer, company, jobTitle, offerUrl }),
    fence('cv', JSON.stringify(stripForAI(data))),
    fence('mots_cles', keywordsBlock(analysis, confirmations)),
    fence('competences_autorisees', JSON.stringify(allowed)),
  ].join('\n\n');
  const { data: raw } = await callLLM({
    system: REWRITE_SYSTEM,
    user,
    schema: PATCH_SCHEMA,
    task: 'rewrite',
    maxTokens: 16000,
    signal,
  });
  return normalizePatch(raw, data?.personalInfo);
}

// ── Liste des modifications et application sélective ──────────────────────

function findExperience(data, id) {
  for (const group of ['experiences', 'otherExperiences']) {
    const item = (data[group] || []).find((e) => e.id === id);
    if (item) return { group, item };
  }
  return null;
}

// L’IA remplace souvent les apostrophes droites par des typographiques (ou l’inverse) :
// on reprend le style dominant du CV, pour que l’aperçu ne montre que les vrais changements.
function apostropheFixer(data) {
  const pi = data.personalInfo || {};
  const text = [
    pi.title,
    pi.objective,
    ...['experiences', 'otherExperiences'].flatMap((g) => (data[g] || []).flatMap((e) => e.details || [])),
  ].join(' ');
  const straight = (text.match(/'/g) || []).length;
  const curly = (text.match(/’/g) || []).length;
  if (straight > curly) return (t) => t.replace(/’/g, "'");
  if (curly > straight) return (t) => t.replace(/'/g, '’');
  return (t) => t;
}

// ── Garde-fous sur les propositions ───────────────────────────────────────
// L’IA a pour consigne de ne jamais modifier un chiffre ni inventer une puce : on le
// vérifie. Une proposition suspecte reste affichée, avec un avertissement, mais n’est
// pas cochée d’avance (voir ATSOptimizer).

// Nombres comparables : « 80 000 € » → '80000', « 4,2 % » → '4.2', « +40 % » → '40'.
// Chaque nombre garde aussi son unité (mot ou symbole qui suit) : « 12 boutiques » ≠ « 12 ans ».
const NUMBER_PATTERN = /(\d+(?:[ \u00A0\u202F]\d{3}(?!\d))*(?:[.,]\d+)?)(?:[ \u00A0\u202F]?(%|€|\$|£|[A-Za-zÀ-ÖØ-öø-ÿ]+))?/g;

function numberTokens(text) {
  return [...str(text).matchAll(NUMBER_PATTERN)].map(([, raw, unit = '']) => {
    const value = raw.replace(/[ \u00A0\u202F]/g, '').replace(',', '.');
    const unitKey = unit
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .slice(0, 3);
    return { raw, value, unitKey };
  });
}

export function numbersIn(text) {
  return numberTokens(text).map((t) => t.value);
}

const isYear = (value) => /^(19|20)\d{2}$/.test(value);

// Nombres de `after` (tels qu’écrits) qui ne viennent pas des textes de référence :
// - `same` : textes dont la proposition est la réécriture (le nombre seul suffit) ;
// - `elsewhere` : reste du CV, d’où un nombre peut être repris avec la même unité (ou une année).
export function newNumbers(after, { same = [], elsewhere = [] } = {}) {
  const plain = new Set(same.flatMap(numbersIn));
  const tokens = elsewhere.flatMap(numberTokens);
  const withUnit = new Set(tokens.map((t) => `${t.value}|${t.unitKey}`));
  const years = new Set(tokens.map((t) => t.value).filter(isYear));
  const out = [];
  for (const { raw, value, unitKey } of numberTokens(after)) {
    const known = plain.has(value) || withUnit.has(`${value}|${unitKey}`) || years.has(value);
    if (!known && !out.includes(raw)) out.push(raw);
  }
  return out;
}

const itemTexts = (e) => [e.title, e.company, e.school, e.degree, e.location, e.period, ...(e.details || [])];

// Tout le texte du CV (hors photo et identifiants), pour les vérifications ci-dessus.
function cvTexts(data) {
  const pi = data.personalInfo || {};
  return [
    pi.title,
    pi.subtitle,
    pi.objective,
    pi.location,
    ...(data.mainSkills || []).flatMap((g) => [g.category, ...(g.skills || [])]),
    ...['experiences', 'otherExperiences'].flatMap((g) => (data[g] || []).flatMap((e) => [...itemTexts(e), ...(e.stack || [])])),
    ...(data.education || []).flatMap((e) => [...itemTexts(e), ...(e.objectives || []), ...(e.tools || [])]),
    ...(data.certifications || []).flatMap((c) => [c.name, c.issuer, c.date]),
    ...(data.languages || []).flatMap((l) => [l.name, l.level]),
    ...(data.customSections || []).flatMap((c) => [c.title, ...(c.items || [])]),
  ].map(str);
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Le terme figure-t-il dans le CV (accents, casse et pluriels en « s » / « x » ignorés) ?
export function citedInCv(term, cvNormalized) {
  const t = normalizeTerm(term);
  if (!t) return false;
  const words = t.split(' ').map((w) => (w.length > 3 ? `${escapeRegExp(w.replace(/[sx]$/, ''))}[sx]?` : escapeRegExp(w)));
  return new RegExp(`(^|[^a-z0-9])${words.join(' ')}(?=[^a-z0-9]|$)`).test(cvNormalized);
}

const plural = (n, one, many) => (n > 1 ? many : one);

// forbiddenTerms : chaînes (mots-clés absents) ou { term, evidence } (voir forbiddenTermsFrom).
const forbiddenEntry = (t) => (typeof t === 'string' ? { term: t, evidence: '' } : { term: str(t?.term), evidence: str(t?.evidence) });

// Termes de `forbiddenTerms` qu’un texte proposé introduit alors que le CV ne les cite pas.
function introducedTerms(text, forbiddenTerms, cvNormalized) {
  const normalized = normalizeTerm(text);
  return forbiddenTerms
    .map(forbiddenEntry)
    .filter(({ term }) => term && citedInCv(term, normalized) && !citedInCv(term, cvNormalized));
}

function unconfirmedWarning(entries) {
  if (!entries.length) return null;
  const warnings = [];
  const missing = entries.filter((e) => !e.evidence).map((e) => `« ${e.term} »`);
  if (missing.length) {
    const list = missing.join(', ');
    warnings.push(
      missing.length > 1
        ? `${list} ne figurent pas dans votre CV et vous n’avez pas confirmé les posséder : cochez seulement si c’est exact.`
        : `${list} ne figure pas dans votre CV et vous n’avez pas confirmé le posséder : cochez seulement si c’est exact.`,
    );
  }
  for (const { term, evidence } of entries.filter((e) => e.evidence)) {
    warnings.push(
      `« ${term} » n’apparaît pas tel quel dans votre CV (l’IA l’a rapproché de « ${evidence} ») : cochez seulement si c’est exact.`,
    );
  }
  return warnings.join(' ');
}

function numbersWarning(numbers) {
  if (!numbers.length) return null;
  const list = numbers.map((n) => `« ${n} »`).join(', ');
  return `${plural(numbers.length, 'Chiffre absent', 'Chiffres absents')} de votre CV : ${list}. Vérifiez qu’il${
    numbers.length > 1 ? 's sont exacts' : ' est exact'
  } avant de cocher.`;
}

/**
 * Transforme le patch de l’IA en une liste de modifications affichables et
 * cochables. Tout ce qui sort des champs autorisés est ignoré (ids inconnus,
 * compétences non confirmées, doublons, puces pour une expérience qui n’en a pas).
 * options.allowedSkills : [{ term, origin: 'cv' | 'confirmed' }] (vide = aucun ajout permis)
 * options.forbiddenTerms : mots-clés non confirmés (forbiddenTermsFrom), absents du CV ou rapprochés
 *   d’un synonyme par l’IA : un texte
 *   qui en introduit un est signalé, donc pas coché d’avance.
 */
// Même texte à la casse, la ponctuation et les espaces près : une telle « modification »
// n’apporte rien à la personne, on ne la lui propose pas.
const sameWording = (a, b) => {
  const key = (text) => str(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  return key(a) === key(b);
};

export function buildChanges(data, patch, { allowedSkills = [], forbiddenTerms = [], lang = 'fr' } = {}) {
  const changes = [];
  if (!data || !patch) return changes;
  const pi = data.personalInfo || {};
  const fix = apostropheFixer(data);
  const allTexts = cvTexts(data);
  const cvNormalized = normalizeTerm(allTexts.join(' \n '));
  const unconfirmed = (text) => unconfirmedWarning(introducedTerms(text, forbiddenTerms, cvNormalized));
  // Ajoute à la modification les avertissements qui la concernent (aucun : rien n’est ajouté).
  const flag = (change, ...warnings) => {
    const list = warnings.filter(Boolean);
    return list.length ? { ...change, warnings: list } : change;
  };

  const title = fix(str(patch.targetTitle?.text));
  if (title && !sameWording(title, pi.title)) {
    changes.push(
      flag(
        {
          id: 'title',
          kind: 'text',
          field: 'title',
          group: 'profile',
          label: 'Titre du CV',
          before: str(pi.title),
          after: title,
          reason: str(patch.targetTitle?.reason),
        },
        numbersWarning(newNumbers(title, { same: [pi.title], elsewhere: allTexts })),
        unconfirmed(title),
      ),
    );
  }

  const summary = fix(str(patch.summary?.text));
  if (summary && !sameWording(summary, pi.objective)) {
    // Le résumé peut reprendre un chiffre cité ailleurs dans le CV (« +40 % » d’une puce).
    changes.push(
      flag(
        {
          id: 'summary',
          kind: 'text',
          field: 'objective',
          group: 'profile',
          label: 'Résumé du profil',
          before: str(pi.objective),
          after: summary,
          reason: str(patch.summary?.reason),
        },
        numbersWarning(newNumbers(summary, { same: [pi.objective], elsewhere: allTexts })),
        unconfirmed(summary),
      ),
    );
  }

  const groups = data.mainSkills || [];
  const groupIds = groups.map((g) => g.id);
  const proposed = [];
  for (const id of patch.skillCategoryOrder || []) {
    if (groupIds.includes(id) && !proposed.includes(id)) proposed.push(id);
  }
  if (proposed.length) {
    const order = [...proposed, ...groupIds.filter((id) => !proposed.includes(id))];
    if (order.some((id, i) => id !== groupIds[i])) {
      const nameOf = (id) => str(groups.find((g) => g.id === id)?.category) || 'Sans titre';
      changes.push({
        id: 'skillOrder',
        kind: 'order',
        group: 'skills',
        label: 'Ordre des catégories de compétences',
        before: groupIds.map(nameOf),
        after: order.map(nameOf),
        order,
        reason: '',
      });
    }
  }

  const allowed = new Map(allowedSkills.map((s) => [normalizeTerm(s.term), s]));
  const existing = new Set(groups.flatMap((g) => g.skills || []).map(normalizeTerm));
  const defaultCategory = labelsFor(lang).sections.skills;
  for (const addition of patch.skillAdditions || []) {
    const key = normalizeTerm(addition.skill);
    const source = allowed.get(key);
    if (!key || !source || existing.has(key)) continue;
    existing.add(key);
    let categoryId = groupIds.includes(addition.categoryId) ? addition.categoryId : null;
    let newCategory = null;
    if (!categoryId && str(addition.newCategory)) {
      const match = groups.find((g) => normalizeTerm(g.category) === normalizeTerm(addition.newCategory));
      if (match) categoryId = match.id;
      else newCategory = str(addition.newCategory);
    }
    if (!categoryId && !newCategory) {
      if (groups.length) categoryId = groups[0].id;
      else newCategory = defaultCategory;
    }
    const categoryLabel = categoryId ? str(groups.find((g) => g.id === categoryId)?.category) || 'Sans titre' : newCategory;
    // « Présent » selon l’IA, qui admet les synonymes : on vérifie que le terme est bien écrit dans le CV.
    const synonym = source.origin === 'cv' && !citedInCv(source.term, cvNormalized);
    changes.push(
      flag(
        {
          id: `skill:${key}`,
          kind: 'skill',
          group: 'skills',
          label: 'Compétence ajoutée',
          skill: source.term,
          categoryId,
          newCategory,
          categoryLabel,
          origin: synonym ? 'synonym' : source.origin,
          evidence: str(source.context),
          reason: '',
        },
        synonym &&
          `« ${source.term} » n’apparaît pas tel quel dans votre CV${
            source.context ? ` : l’IA l’a rapproché de « ${str(source.context)} »` : ''
          }. Cochez seulement si vous possédez vraiment cette compétence.`,
      ),
    );
  }

  const byGroup = { experiences: [], otherExperiences: [] };
  for (const proposal of patch.experiences || []) {
    const found = findExperience(data, proposal.id);
    if (!found || !proposal.details?.length) continue;
    const { group, item } = found;
    // Puces masquées : l'IA ne les a pas vues, elles ne font pas partie de la proposition.
    const original = filledDetails(item.details).filter((o) => !item.hiddenDetails?.includes(o.index));
    const proposed = proposal.details.map((d) => fix(str(d))).filter(Boolean);
    // Sans puce d’origine, tout texte proposé serait inventé : on l’ignore.
    if (!original.length || !proposed.length) continue;
    const context = [str(item.title), str(item.company)].filter(Boolean).join(' — ') || 'Expérience sans titre';
    const base = { group, itemId: item.id, context, reason: str(proposal.reason) };
    const order = data[group].findIndex((e) => e.id === item.id);
    // Un chiffre peut passer d’une puce à l’autre de la même expérience, pas apparaître de nulle part.
    // Repris d’un autre texte de l’expérience, il doit garder son unité : « 18 mois » ne
    // justifie pas « 18 événements ». Seule la puce réécrite peut changer l’unité.
    const reference = itemTexts(item).map(str);
    if (proposed.length === original.length) {
      proposed.forEach((after, i) => {
        if (sameWording(after, original[i].text)) return;
        byGroup[group].push({
          order,
          change: flag(
            {
              ...base,
              id: `bullet:${item.id}:${original[i].index}`,
              kind: 'bullet',
              label: `Puce ${i + 1}`,
              index: original[i].index,
              before: original[i].text,
              after,
            },
            numbersWarning(newNumbers(after, { same: [original[i].text], elsewhere: reference })),
            unconfirmed(after),
          ),
        });
      });
    } else {
      const more = proposed.length > original.length;
      byGroup[group].push({
        order,
        change: flag(
          {
            ...base,
            id: `details:${item.id}`,
            kind: 'details',
            label: 'Toutes les puces',
            before: original.map((o) => o.text),
            after: proposed,
          },
          more
            ? `L’IA propose ${proposed.length} puces au lieu de ${original.length} : vérifiez qu’aucune n’a été inventée.`
            : `L’IA propose ${proposed.length} ${plural(proposed.length, 'puce', 'puces')} au lieu de ${original.length} : vérifiez que rien d’important n’a disparu.`,
          numbersWarning(newNumbers(proposed.join(' \n '), { same: reference })),
          unconfirmed(proposed.join(' \n ')),
        ),
      });
    }
  }
  for (const group of ['experiences', 'otherExperiences']) {
    byGroup[group]
      .map((entry, i) => ({ ...entry, i }))
      .sort((a, b) => a.order - b.order || a.i - b.i)
      .forEach((entry) => changes.push(entry.change));
  }
  return changes;
}

/**
 * Applique les modifications cochées sur une copie de data. Seuls le titre,
 * le résumé, l’ordre et le contenu des compétences et les puces d’expérience
 * peuvent changer : entreprises, dates, lieux, diplômes, langues, liens, photo
 * et coordonnées restent ceux d’origine.
 * selection : Set ou tableau d’id de modifications (undefined = toutes).
 */
export function applyChanges(data, patch, selection, options = {}) {
  const base = normalizeData(data);
  const changes = buildChanges(base, patch, options);
  const selected = selection == null ? new Set(changes.map((c) => c.id)) : new Set(selection);
  const next = structuredClone(base);
  const createdGroups = new Map();

  const chosen = changes.filter((c) => selected.has(c.id));
  // L’ordre des catégories d’abord : les nouvelles catégories s’ajoutent ensuite à la fin.
  chosen.sort((a, b) => (a.kind === 'order' ? -1 : 0) - (b.kind === 'order' ? -1 : 0));

  for (const change of chosen) {
    if (change.kind === 'text') {
      next.personalInfo[change.field] = change.after;
    } else if (change.kind === 'order') {
      const byId = new Map(next.mainSkills.map((g) => [g.id, g]));
      next.mainSkills = change.order.map((id) => byId.get(id)).filter(Boolean);
    } else if (change.kind === 'skill') {
      let target = change.categoryId ? next.mainSkills.find((g) => g.id === change.categoryId) : null;
      if (!target && change.newCategory) {
        const key = normalizeTerm(change.newCategory);
        target = createdGroups.get(key);
        if (!target) {
          target = { ...newSkillGroup(), category: change.newCategory };
          createdGroups.set(key, target);
          next.mainSkills.push(target);
        }
      }
      if (target) target.skills = [...(target.skills || []), change.skill];
    } else if (change.kind === 'bullet' || change.kind === 'details') {
      const found = findExperience(next, change.itemId);
      if (!found) continue;
      if (change.kind === 'bullet') found.item.details[change.index] = change.after;
      else {
        // Les puces masquées sont conservées (et restent masquées), après les nouvelles.
        const kept = found.item.hiddenDetails.map((i) => found.item.details[i]).filter((t) => str(t));
        found.item.details = [...change.after, ...kept];
        found.item.hiddenDetails = kept.map((_, k) => change.after.length + k);
      }
    }
  }
  return normalizeData(next);
}

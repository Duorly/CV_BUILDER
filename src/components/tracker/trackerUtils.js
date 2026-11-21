import { APPLICATION_STATUSES } from '../../lib/storage';
import { toCsv } from '../../lib/csv';
import { absoluteUrl } from '../../lib/files';

// Règles du suivi des candidatures. Les dates sont des chaînes AAAA-MM-JJ :
// elles se comparent directement comme des chaînes.

export const FOLLOW_UP_DAYS = 7;
// Statuts où l'on attend une réponse : une relance peut être nécessaire.
export const AWAITING_STATUSES = ['envoyee', 'relancee'];
export const SENT_STATUSES = ['envoyee', 'relancee', 'entretien', 'offre', 'refusee'];
export const INTERVIEW_STATUSES = ['entretien', 'offre'];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const pad = (n) => String(n).padStart(2, '0');

export const isIsoDate = (value) => ISO_DATE.test(String(value || ''));

export function addDaysIso(iso, days) {
  const m = ISO_DATE.exec(String(iso || ''));
  if (!m) return '';
  // Construction en heure locale : pas de décalage d'un jour selon le fuseau.
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function daysBetween(fromIso, toIso) {
  const a = ISO_DATE.exec(String(fromIso || ''));
  const b = ISO_DATE.exec(String(toIso || ''));
  if (!a || !b) return null;
  const utc = (m) => Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Math.round((utc(b) - utc(a)) / 86400000);
}

// « 18/10/2026 » : format attendu par un tableur français.
export function frenchDate(iso) {
  const m = ISO_DATE.exec(String(iso || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

export function statusLabel(statusId) {
  return APPLICATION_STATUSES.find((s) => s.id === statusId)?.label || '';
}

// Relance à faire : date de relance atteinte (aujourd'hui compris) et toujours sans réponse.
export function isFollowUpDue(app, today) {
  return AWAITING_STATUSES.includes(app.status) && isIsoDate(app.followUpDate) && app.followUpDate <= today;
}

// Changement de statut avec les dates proposées automatiquement :
// - « Envoyée » : date d'envoi = aujourd'hui si vide, relance à J+7 si aucune n'est fixée ;
// - « Relancée » : prochaine relance 7 jours plus tard si l'ancienne date est passée,
//   sinon l'alerte « Relance à faire » resterait affichée alors qu'elle vient d'être faite.
export function withStatus(app, status, today) {
  const next = { ...app, status };
  if (status === 'envoyee' && app.status !== 'envoyee') {
    if (!isIsoDate(next.date)) next.date = today;
    if (!isIsoDate(next.followUpDate)) next.followUpDate = addDaysIso(next.date, FOLLOW_UP_DAYS);
  }
  if (status === 'relancee' && app.status !== 'relancee') {
    if (!isIsoDate(next.followUpDate) || next.followUpDate <= today) {
      next.followUpDate = addDaysIso(today, FOLLOW_UP_DAYS);
    }
  }
  return next;
}

// « C'est fait » sur une relance due : statut « Relancée » et prochaine relance à J+7,
// y compris quand la candidature était déjà relancée une première fois.
export function markFollowedUp(app, today) {
  return { ...app, status: 'relancee', followUpDate: addDaysIso(today, FOLLOW_UP_DAYS) };
}

// Changement de la date d'envoi : une relance calculée automatiquement (J+7) suit la nouvelle date.
export function withSendDate(app, date) {
  const next = { ...app, date };
  const wasAutomatic = isIsoDate(app.date) && app.followUpDate === addDaysIso(app.date, FOLLOW_UP_DAYS);
  if (wasAutomatic && isIsoDate(date)) next.followUpDate = addDaysIso(date, FOLLOW_UP_DAYS);
  return next;
}

export function trackerCounts(applications, today) {
  const count = (predicate) => applications.filter(predicate).length;
  return {
    total: applications.length,
    toSend: count((a) => a.status === 'a_envoyer'),
    sent: count((a) => SENT_STATUSES.includes(a.status)),
    interviews: count((a) => INTERVIEW_STATUSES.includes(a.status)),
    followUps: count((a) => isFollowUpDue(a, today)),
  };
}

export const FILTER_FOLLOW_UP = 'relance';

export function filterApplications(applications, filter, today) {
  if (!filter || filter === 'all') return applications;
  if (filter === FILTER_FOLLOW_UP) return applications.filter((a) => isFollowUpDue(a, today));
  return applications.filter((a) => a.status === filter);
}

// Une candidature pas encore envoyée se classe à sa date de création.
const sortDate = (app) => (isIsoDate(app.date) ? app.date : String(app.createdAt || '').slice(0, 10));

export const SORT_OPTIONS = [
  { id: 'recent', label: 'Plus récentes d’abord' },
  { id: 'oldest', label: 'Plus anciennes d’abord' },
  { id: 'followup', label: 'Prochaine relance' },
];

export function sortApplications(applications, mode = 'recent') {
  const byDate = (a, b) =>
    sortDate(a).localeCompare(sortDate(b)) || String(a.createdAt).localeCompare(String(b.createdAt));
  const list = [...applications];
  if (mode === 'oldest') return list.sort(byDate);
  if (mode === 'followup') {
    // Les relances en attente d'abord (la plus proche en tête), puis le reste du plus récent au plus ancien.
    const pending = (a) => AWAITING_STATUSES.includes(a.status) && isIsoDate(a.followUpDate);
    return list.sort((a, b) => {
      if (pending(a) !== pending(b)) return pending(a) ? -1 : 1;
      if (pending(a)) return a.followUpDate.localeCompare(b.followUpDate) || byDate(a, b);
      return byDate(b, a);
    });
  }
  return list.sort((a, b) => byDate(b, a));
}

// Ordre affiché pendant une saisie dans le tableau : les lignes déjà à l'écran
// gardent leur place, une candidature ajoutée entre-temps apparaît en tête et
// une candidature supprimée disparaît.
export function frozenRows(sorted, applications, frozenIds) {
  if (!frozenIds) return sorted;
  const byId = new Map(applications.map((a) => [a.id, a]));
  const frozen = new Set(frozenIds);
  const added = sorted.filter((a) => !frozen.has(a.id));
  return [...added, ...frozenIds.map((id) => byId.get(id)).filter(Boolean)];
}

export function applicationsToCsv(applications, cvs, today) {
  const cvName = (id) => cvs.find((cv) => cv.id === id)?.name || '';
  const header = [
    'Entreprise',
    'Poste',
    'Statut',
    "Date d'envoi",
    'Date de relance',
    'Relance à faire',
    'Version de CV',
    "Lien de l'offre",
    'Notes',
  ];
  const rows = applications.map((a) => [
    a.company,
    a.position,
    statusLabel(a.status),
    frenchDate(a.date),
    frenchDate(a.followUpDate),
    isFollowUpDue(a, today) ? 'Oui' : 'Non',
    cvName(a.cvId),
    absoluteUrl(a.offerUrl),
    a.notes,
  ]);
  return toCsv([header, ...rows]);
}

// Libellé d'une version dans la colonne « Version de CV », souvent tronquée : ce qui distingue
// les versions vient en premier. « CV – Chargée de communication – Decathlon (2) » devient
// « Decathlon · Chargée de communication (2) » ; un nom choisi librement reste tel quel.
export function cvOptionLabel(cv) {
  const name = String(cv?.name || '').trim();
  const match = /^CV\s+[–-]\s+(.+?)(\s\(\d+\))?$/.exec(name);
  if (!match) return name;
  const [, rest, suffix = ''] = match;
  const company = String(cv.company || '').trim();
  const ending = ` – ${company}`;
  if (company && rest.length > ending.length && rest.toLowerCase().endsWith(ending.toLowerCase())) {
    return `${company} · ${rest.slice(0, -ending.length)}${suffix}`;
  }
  return `${rest}${suffix}`;
}

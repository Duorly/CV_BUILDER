import { defaultStorage } from './storage';

// Sauvegardes exportées (« Tout exporter ») : leur date est gardée à part, pour rappeler
// d'en refaire une. Les CV ne vivent que dans ce navigateur : Safari efface les données
// d'un site qui n'a pas été ouvert pendant 7 jours, un nettoyage du navigateur aussi.

export const BACKUP_KEY = 'cv-builder:backup';
export const REMINDER_DAYS = 7;
export const SAFARI_REMINDER_DAYS = 3;
export const SNOOZE_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

const toDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

// { lastExport: Date | null, snoozedUntil: Date | null }
export function readBackupState(storage = defaultStorage()) {
  try {
    const raw = JSON.parse(storage?.getItem(BACKUP_KEY) || '{}') || {};
    return { lastExport: toDate(raw.lastExport), snoozedUntil: toDate(raw.snoozedUntil) };
  } catch {
    return { lastExport: null, snoozedUntil: null };
  }
}

function writeBackupState(state, storage = defaultStorage()) {
  try {
    storage?.setItem(
      BACKUP_KEY,
      JSON.stringify({
        lastExport: state.lastExport ? state.lastExport.toISOString() : null,
        snoozedUntil: state.snoozedUntil ? state.snoozedUntil.toISOString() : null,
      }),
    );
  } catch {
    /* stockage indisponible : le rappel reviendra, rien de grave */
  }
  return state;
}

export function recordExport(now = new Date(), storage = defaultStorage()) {
  return writeBackupState({ lastExport: now, snoozedUntil: null }, storage);
}

export function snoozeReminder(now = new Date(), storage = defaultStorage()) {
  const state = readBackupState(storage);
  return writeBackupState({ ...state, snoozedUntil: new Date(now.getTime() + SNOOZE_DAYS * DAY_MS) }, storage);
}

export function daysBetween(from, to = new Date()) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / DAY_MS));
}

// « jamais », « aujourd'hui », « hier », « il y a 9 jours ».
export function describeLastExport(lastExport, now = new Date()) {
  if (!lastExport) return 'jamais';
  const days = daysBetween(lastExport, now);
  if (days === 0) return 'aujourd’hui';
  if (days === 1) return 'hier';
  return `il y a ${days} jours`;
}

// Faut-il rappeler d'exporter une sauvegarde ? Oui si des modifications ne sont dans
// aucune sauvegarde et que la dernière date de plus de `days` jours (jamais exporté :
// dès que le premier CV a plus d'un jour), sauf si le rappel a été repoussé.
export function needsBackupReminder(library, { lastExport, snoozedUntil }, { now = new Date(), days = REMINDER_DAYS } = {}) {
  if (snoozedUntil && snoozedUntil > now) return false;
  const cvs = library?.cvs || [];
  const updated = [...cvs, ...(library?.applications || [])].map((item) => toDate(item.updatedAt)).filter(Boolean);
  const created = cvs.map((cv) => toDate(cv.createdAt)).filter(Boolean);
  if (!updated.length) return false;
  const lastChange = new Date(Math.max(...updated));
  if (lastExport && lastChange <= lastExport) return false;
  if (lastExport) return daysBetween(lastExport, now) >= days;
  return created.length > 0 && daysBetween(new Date(Math.min(...created)), now) >= 1;
}

// Demande au navigateur de ne pas effacer les données du site quand il manque de place
// (sans garantie : Safari applique quand même sa règle des 7 jours). Ne coûte rien.
export function requestPersistentStorage() {
  try {
    const result = globalThis.navigator?.storage?.persist?.();
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch {
    /* API absente ou refusée : rien à faire */
  }
}

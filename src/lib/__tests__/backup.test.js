import { describe, expect, it } from 'vitest';
import {
  BACKUP_KEY,
  describeLastExport,
  needsBackupReminder,
  readBackupState,
  recordExport,
  snoozeReminder,
} from '../backup';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

const day = (n) => new Date(Date.UTC(2026, 9, n, 10));
const libraryAt = (created, updated) => ({
  cvs: [{ id: 'a', createdAt: created.toISOString(), updatedAt: updated.toISOString() }],
  applications: [],
});

describe('rappel de sauvegarde', () => {
  it('enregistre la date du dernier export et la relit', () => {
    const storage = memoryStorage();
    expect(readBackupState(storage)).toEqual({ lastExport: null, snoozedUntil: null });
    recordExport(day(8), storage);
    expect(readBackupState(storage).lastExport).toEqual(day(8));
    storage.setItem(BACKUP_KEY, '{illisible');
    expect(readBackupState(storage).lastExport).toBeNull();
  });

  it('jamais exporté : rappel dès que le premier CV a plus d’un jour', () => {
    const none = { lastExport: null, snoozedUntil: null };
    expect(needsBackupReminder(libraryAt(day(18), day(18)), none, { now: day(18) })).toBe(false);
    expect(needsBackupReminder(libraryAt(day(16), day(17)), none, { now: day(18) })).toBe(true);
  });

  it('export récent ou rien de nouveau depuis : pas de rappel', () => {
    const exported = { lastExport: day(9), snoozedUntil: null };
    expect(needsBackupReminder(libraryAt(day(1), day(17)), exported, { now: day(18) })).toBe(true);
    expect(needsBackupReminder(libraryAt(day(1), day(8)), exported, { now: day(18) })).toBe(false);
    expect(needsBackupReminder(libraryAt(day(1), day(17)), { lastExport: day(15), snoozedUntil: null }, { now: day(18) })).toBe(false);
    // Safari : seuil plus court.
    expect(needsBackupReminder(libraryAt(day(1), day(17)), { lastExport: day(15), snoozedUntil: null }, { now: day(18), days: 3 })).toBe(true);
  });

  it('« Plus tard » repousse le rappel de quelques jours', () => {
    const storage = memoryStorage();
    const state = snoozeReminder(day(18), storage);
    expect(needsBackupReminder(libraryAt(day(1), day(17)), state, { now: day(19) })).toBe(false);
    expect(needsBackupReminder(libraryAt(day(1), day(17)), state, { now: day(22) })).toBe(true);
  });

  it('décrit la date du dernier export', () => {
    expect(describeLastExport(null)).toBe('jamais');
    expect(describeLastExport(day(18), day(18))).toBe('aujourd’hui');
    expect(describeLastExport(day(17), day(18))).toBe('hier');
    expect(describeLastExport(day(9), day(18))).toBe('il y a 9 jours');
  });
});

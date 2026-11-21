import { describe, expect, it } from 'vitest';
import {
  APPEARANCE_OPEN_KEY,
  clampPaneWidth,
  maxPaneWidth,
  MIN_PREVIEW_WIDTH,
  PANES,
  readFlag,
  readPaneWidth,
  saveFlag,
  savePaneWidth,
} from '../paneWidth';

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
};

const refused = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

const { editor, appearance } = PANES;

describe('largeur des panneaux (éditeur, Apparence)', () => {
  it('un panneau ne prend à l’aperçu que ce qui dépasse sa largeur minimale', () => {
    expect(maxPaneWidth(editor, 460, 800)).toBe(460 + 800 - MIN_PREVIEW_WIDTH);
    // Aperçu déjà au minimum : le panneau ne grandit plus, sans descendre sous son propre minimum.
    expect(maxPaneWidth(editor, 400, MIN_PREVIEW_WIDTH)).toBe(400);
    expect(maxPaneWidth(editor, 300, 200)).toBe(editor.min);
    // L'Apparence a aussi un plafond : au-delà, elle n'y gagne rien.
    expect(maxPaneWidth(appearance, 320, 2000)).toBe(appearance.max);
  });

  it('borne la largeur demandée entre le minimum et le maximum du panneau', () => {
    expect(clampPaneWidth(editor, 100, 900)).toBe(editor.min);
    expect(clampPaneWidth(editor, 1200, 900)).toBe(900);
    expect(clampPaneWidth(editor, 612.4, 900)).toBe(612);
    expect(clampPaneWidth(editor, 2000)).toBe(2000);
    expect(clampPaneWidth(appearance, 2000)).toBe(appearance.max);
    expect(clampPaneWidth(appearance, 100)).toBe(appearance.min);
  });

  it('chaque panneau relit sa largeur enregistrée, et ignore une valeur invalide', () => {
    const storage = memoryStorage({ [editor.key]: '640', [appearance.key]: '9999' });
    expect(readPaneWidth(storage, editor)).toBe(640);
    expect(readPaneWidth(storage, appearance)).toBe(appearance.max);
    expect(readPaneWidth(memoryStorage(), editor)).toBeNull();
    expect(readPaneWidth(memoryStorage({ [editor.key]: 'abc' }), editor)).toBeNull();
    expect(readPaneWidth(memoryStorage({ [editor.key]: '12' }), editor)).toBeNull();
    expect(readPaneWidth(null, editor)).toBeNull();
  });

  it('enregistre la largeur, et l’efface pour revenir à la largeur par défaut', () => {
    const storage = memoryStorage();
    savePaneWidth(storage, editor, 702.6);
    savePaneWidth(storage, appearance, 350);
    expect(storage.data).toEqual({ [editor.key]: '703', [appearance.key]: '350' });
    savePaneWidth(storage, editor, null);
    expect(editor.key in storage.data).toBe(false);
  });

  it('panneau Apparence ouvert ou fermé : fermé par défaut, retenu ensuite', () => {
    const storage = memoryStorage();
    expect(readFlag(storage, APPEARANCE_OPEN_KEY)).toBe(false);
    saveFlag(storage, APPEARANCE_OPEN_KEY, true);
    expect(readFlag(storage, APPEARANCE_OPEN_KEY)).toBe(true);
    saveFlag(storage, APPEARANCE_OPEN_KEY, false);
    expect(readFlag(storage, APPEARANCE_OPEN_KEY)).toBe(false);
  });

  it('stockage refusé par le navigateur : ni erreur, ni préférence', () => {
    expect(readPaneWidth(refused, editor)).toBeNull();
    expect(() => savePaneWidth(refused, editor, 600)).not.toThrow();
    expect(() => savePaneWidth(refused, editor, null)).not.toThrow();
    expect(readFlag(refused, APPEARANCE_OPEN_KEY)).toBe(false);
    expect(() => saveFlag(refused, APPEARANCE_OPEN_KEY, true)).not.toThrow();
  });
});

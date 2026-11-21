import { describe, expect, it } from 'vitest';
import { FIT, fitScale, readZoom, saveZoom, stepZoom, ZOOM_KEY, ZOOM_STEPS } from '../previewZoom';

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

describe('zoom de l’aperçu', () => {
  it('ajusté : le document tient dans la colonne, sans être agrandi', () => {
    expect(fitScale(397, 794)).toBe(0.5);
    expect(fitScale(580, 794)).toBe(0.73);
    expect(fitScale(2000, 794)).toBe(1);
    expect(fitScale(0, 794)).toBe(1);
    expect(fitScale(500, 0)).toBe(1);
  });

  it('− et + passent au palier voisin de l’échelle affichée, jusqu’aux extrêmes', () => {
    expect(stepZoom(0.73, 1)).toBe(0.75);
    expect(stepZoom(0.73, -1)).toBe(0.67);
    expect(stepZoom(1, 1)).toBe(1.1);
    expect(stepZoom(1, -1)).toBe(0.9);
    // 74,8 % se lit « 75 % » : + passe au palier suivant, pas à 75 %.
    expect(stepZoom(0.748, 1)).toBe(0.9);
    expect(stepZoom(ZOOM_STEPS[0], -1)).toBeNull();
    expect(stepZoom(0.3, -1)).toBeNull();
    expect(stepZoom(0.3, 1)).toBe(0.5);
    expect(stepZoom(ZOOM_STEPS[ZOOM_STEPS.length - 1], 1)).toBeNull();
  });

  it('retenu par le navigateur : ajusté par défaut, une valeur invalide est ignorée', () => {
    const storage = memoryStorage();
    expect(readZoom(storage)).toBe(FIT);
    saveZoom(storage, 1.25);
    expect(storage.data[ZOOM_KEY]).toBe('1.25');
    expect(readZoom(storage)).toBe(1.25);
    saveZoom(storage, FIT);
    expect(ZOOM_KEY in storage.data).toBe(false);
    expect(readZoom(memoryStorage({ [ZOOM_KEY]: 'abc' }))).toBe(FIT);
    expect(readZoom(memoryStorage({ [ZOOM_KEY]: '12' }))).toBe(FIT);
    expect(readZoom(null)).toBe(FIT);
  });

  it('stockage refusé : ni erreur, ni préférence', () => {
    expect(readZoom(refused)).toBe(FIT);
    expect(() => saveZoom(refused, 1)).not.toThrow();
    expect(() => saveZoom(refused, FIT)).not.toThrow();
  });
});

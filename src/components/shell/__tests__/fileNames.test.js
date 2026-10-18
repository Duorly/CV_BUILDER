import { describe, expect, it } from 'vitest';
import { documentFileBase } from '../fileNames';

const camille = { name: 'Camille Martin', company: 'Decathlon' };

describe('documentFileBase', () => {
  it('version ATS au nom simple, version design avec un suffixe : deux fichiers distincts', () => {
    expect(documentFileBase({ ...camille, kind: 'ats' })).toBe('CV_Camille_Martin_Decathlon');
    expect(documentFileBase({ ...camille, kind: 'design' })).toBe('CV_Camille_Martin_Decathlon_couleur');
    expect(documentFileBase({ ...camille, kind: 'design', lang: 'en' })).toBe('CV_Camille_Martin_Decathlon_colour');
  });

  it('lettre : « LM » en français, « Cover_Letter » pour une version en anglais', () => {
    expect(documentFileBase({ ...camille, kind: 'letter' })).toBe('LM_Camille_Martin_Decathlon');
    expect(documentFileBase({ ...camille, kind: 'letter', lang: 'en' })).toBe('Cover_Letter_Camille_Martin_Decathlon');
  });

  it('sans nom ni entreprise, le préfixe seul', () => {
    expect(documentFileBase({ kind: 'ats' })).toBe('CV');
    expect(documentFileBase({ kind: 'design' })).toBe('CV_couleur');
    expect(documentFileBase({ kind: 'letter', lang: 'en', name: 'Lætitia Cœur' })).toBe('Cover_Letter_Laetitia_Coeur');
  });
});

import { describe, expect, it } from 'vitest';
import {
  normalizeData,
  normalizeSettings,
  clean,
  isBlankItem,
  emptyResume,
  FONT_OPTIONS,
  marginScale,
  readableTextOn,
  spacingScale,
} from '../schema';
import {
  createLibrary,
  createCv,
  duplicateCv,
  defaultStorage,
  loadLibrary,
  normalizeLibrary,
  parseImport,
  readRawLibrary,
  saveLibrary,
  STORAGE_KEY,
} from '../storage';
import { buildFileBase, prettyUrl, absoluteUrl, sanitizePhoto, slugifyPart, telHref } from '../files';
import { sectionTitle } from '../labels';
import { countPages, PX_PER_MM } from '../pageGeometry';
// CV fictif à l'ancien format (v1) : aucune donnée réelle dans les tests.
import legacy from './fixtures/legacy-v1.json';
import example from '../../data/exampleResume.json';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    map,
  };
}

describe('normalizeData', () => {
  it('complète un objet vide avec toutes les clés', () => {
    const d = normalizeData({});
    expect(d.personalInfo.phone).toBe('');
    expect(d.languages).toEqual([]);
    expect(d.sections.map((s) => s.id)).toContain('experiences');
  });

  it('résiste aux types inattendus (null, chaînes, nombres)', () => {
    const d = normalizeData({
      personalInfo: { phone: null, name: 42 },
      experiences: [{ title: 'Poste', details: 'une seule puce' }, null, 'texte'],
      languages: 'Français',
    });
    expect(d.personalInfo.phone).toBe('');
    expect(d.personalInfo.name).toBe('42');
    expect(d.experiences).toHaveLength(1);
    expect(d.experiences[0].details).toEqual(['une seule puce']);
    expect(d.languages).toEqual([]);
  });

  it('donne un id unique à chaque élément', () => {
    const d = normalizeData({ experiences: [{ id: 'x' }, { id: 'x' }, {}] });
    const ids = d.experiences.map((e) => e.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('conserve l’ordre des sections et ajoute les sections libres manquantes', () => {
    const d = normalizeData({
      customSections: [{ id: 's1', title: 'Bénévolat' }],
      sections: [{ id: 'education' }, { id: 'inconnue' }, { id: 'education' }, { id: 'experiences', visible: false }],
    });
    expect(d.sections[0].id).toBe('education');
    expect(d.sections[1]).toEqual({ id: 'experiences', title: '', visible: false });
    expect(d.sections.filter((s) => s.id === 'education')).toHaveLength(1);
    expect(d.sections.some((s) => s.id === 'custom:s1')).toBe(true);
    expect(d.sections.some((s) => s.id === 'inconnue')).toBe(false);
  });

  it('accepte l’ancien CV (format v1) sans perte', () => {
    const d = normalizeData(legacy);
    expect(d.experiences.length).toBe(legacy.experiences.length);
    expect(d.otherExperiences.length).toBe(legacy.otherExperiences.length);
    expect(d.education[1].details).toEqual([]);
  });

  it('n’accepte comme photo qu’une image intégrée (pas d’adresse externe)', () => {
    const photo = (value) => normalizeData({ personalInfo: { photo: value } }).personalInfo.photo;
    expect(photo('https://tracker.invalid/p.gif?id=alice')).toBe('');
    expect(photo('//tracker.invalid/p.gif')).toBe('');
    expect(photo('javascript:alert(1)')).toBe('');
    expect(photo('data:text/html;base64,PHNjcmlwdD4=')).toBe('');
    expect(photo('data:image/jpeg;base64,AAAA')).toBe('data:image/jpeg;base64,AAAA');
    expect(photo('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });

  it('est idempotent', () => {
    const once = normalizeData(example);
    expect(normalizeData(once)).toEqual(once);
  });
});

describe('normalizeSettings', () => {
  it('ne propose plus la « police système » (Type 3 sous macOS) : une ancienne valeur redevient Inter', () => {
    expect(FONT_OPTIONS.map((f) => f.id)).not.toContain('system');
    expect(normalizeSettings({ fontFamily: 'system' }).fontFamily).toBe('inter');
    // Aucune police proposée ne retombe sur la police système de l'appareil.
    for (const f of FONT_OPTIONS) expect(f.css).not.toMatch(/system-ui|-apple-system/);
  });

  it('borne la taille de police et valide les couleurs', () => {
    const s = normalizeSettings({ fontScale: 0.5, primaryColor: 'red', template: 'ats', lang: 'de' });
    expect(s.fontScale).toBe(0.85);
    expect(s.primaryColor).toBe('#2563eb');
    expect(s.template).toBe('ats');
    expect(s.lang).toBe('fr');
  });

  it('alignements : en-tête et texte à gauche par défaut, valeurs inconnues ignorées', () => {
    expect(normalizeSettings({})).toMatchObject({ headerAlign: 'left', textAlign: 'left' });
    expect(normalizeSettings({ headerAlign: 'center', textAlign: 'justify' })).toMatchObject({
      headerAlign: 'center',
      textAlign: 'justify',
    });
    expect(normalizeSettings({ headerAlign: 'right', textAlign: 'center' })).toMatchObject({
      headerAlign: 'left',
      textAlign: 'left',
    });
  });
});

describe('helpers de rendu', () => {
  it('clean retire les chaînes vides', () => {
    expect(clean(['', '  ', 'a', null])).toEqual(['a']);
  });
  it('isBlankItem détecte un élément vide', () => {
    expect(isBlankItem({ id: 'x', title: '', details: ['', ' '] })).toBe(true);
    expect(isBlankItem({ id: 'x', title: 'Poste', details: [] })).toBe(false);
    // Le drapeau « masquée » n'est pas du contenu.
    expect(isBlankItem({ id: 'x', title: '', details: [], hidden: true })).toBe(true);
  });
  it('formation ou groupe de compétences masqué : seul true est retenu', () => {
    const d = normalizeData({ education: [{ title: 'A', hidden: true }, { title: 'B', hidden: 'oui' }, { title: 'C' }] });
    expect(d.education.map((e) => e.hidden)).toEqual([true, false, false]);
    const s = normalizeData({ mainSkills: [{ skills: ['Excel'], hidden: true }, { skills: ['Word'], hidden: 1 }] });
    expect(s.mainSkills.map((g) => g.hidden)).toEqual([true, false]);
    const e = normalizeData({ experiences: [{ title: 'A', hidden: true }], otherExperiences: [{ title: 'B' }] });
    expect([e.experiences[0].hidden, e.otherExperiences[0].hidden]).toEqual([true, false]);
  });
  it('section libre : présentation en liste par défaut, « inline » sur demande', () => {
    const d = normalizeData({ customSections: [{ id: 'a', layout: 'inline' }, { id: 'b', layout: 'grille' }, { id: 'c' }] });
    expect(d.customSections.map((c) => c.layout)).toEqual(['inline', 'list', 'list']);
    // La présentation n'est pas du contenu : une section vide reste vide.
    expect(isBlankItem({ id: 'a', title: '', column: 'main', layout: 'list', items: [''] })).toBe(true);
  });
  it('sectionTitle : titre personnalisé > libellé par défaut', () => {
    const d = normalizeData({ sections: [{ id: 'skills', title: 'Savoir-faire' }] });
    expect(sectionTitle(d, 'skills', 'fr')).toBe('Savoir-faire');
    expect(sectionTitle(d, 'education', 'en')).toBe('Education');
    const c = normalizeData({ customSections: [{ id: 'i', title: 'Loisirs' }] });
    expect(sectionTitle(c, 'custom:i')).toBe('Loisirs');
  });
});

describe('bibliothèque', () => {
  it('démarre avec un CV vierge quand rien n’est enregistré', () => {
    const { library, status } = loadLibrary(memoryStorage());
    expect(status).toBe('fresh');
    expect(library.cvs).toHaveLength(1);
    expect(library.cvs[0].data).toEqual(normalizeData(emptyResume()));
  });

  it('sauvegarde puis recharge à l’identique', () => {
    const storage = memoryStorage();
    const lib = createLibrary(createCv({ name: 'Base', data: example }));
    expect(saveLibrary(lib, storage).ok).toBe(true);
    const { library, status } = loadLibrary(storage);
    expect(status).toBe('loaded');
    expect(library).toEqual(lib);
  });

  it('met de côté une donnée illisible au lieu de planter', () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, '{pas du json');
    const { status } = loadLibrary(storage);
    expect(status).toBe('recovered');
    expect(storage.getItem(`${STORAGE_KEY}:corrupt`)).toBe('{pas du json');
  });

  it('signale un stockage plein', () => {
    const full = {
      setItem: () => {
        const e = new Error('full');
        e.name = 'QuotaExceededError';
        throw e;
      },
    };
    expect(saveLibrary(createLibrary(), full)).toEqual({ ok: false, error: 'quota' });
  });

  it('fonctionne en mémoire quand le navigateur interdit le stockage du site', () => {
    // Chrome « Ne pas autoriser les sites à enregistrer des données » : lire localStorage lève une SecurityError.
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        const err = new Error("Failed to read the 'localStorage' property from 'Window'");
        err.name = 'SecurityError';
        throw err;
      },
    });
    try {
      expect(defaultStorage()).toBeNull();
      const { library, status } = loadLibrary();
      expect(status).toBe('fresh');
      expect(library.cvs).toHaveLength(1);
      expect(saveLibrary(library)).toEqual({ ok: false, error: 'unavailable' });
      expect(readRawLibrary()).toBeNull();
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
      else delete globalThis.localStorage;
    }
  });

  it('duplique une version sans partager les objets', () => {
    const base = createCv({ name: 'Base', data: example });
    const copy = duplicateCv(base, { name: 'CV – Chargée de com – Decathlon' });
    copy.data.experiences[0].title = 'modifié';
    expect(base.data.experiences[0].title).not.toBe('modifié');
    expect(copy.sourceId).toBe(base.id);
    expect(copy.id).not.toBe(base.id);
  });

  it('corrige un currentId invalide', () => {
    const lib = normalizeLibrary({ currentId: 'nope', cvs: [{ id: 'a' }] });
    expect(lib.currentId).toBe('a');
  });
});

describe('parseImport', () => {
  it('reconnaît l’ancien format v1', () => {
    const r = parseImport(legacy);
    expect(r.kind).toBe('cv');
    expect(r.cv.data.experiences.length).toBe(legacy.experiences.length);
  });
  it('reconnaît une bibliothèque', () => {
    const r = parseImport(createLibrary());
    expect(r.kind).toBe('library');
  });
  it('reconnaît une version exportée', () => {
    const r = parseImport({ kind: 'cv-version', name: 'X', data: example });
    expect(r.kind).toBe('cv');
    expect(r.cv.name).toBe('X');
  });
  it('refuse un fichier sans CV', () => {
    expect(() => parseImport({ foo: 1 })).toThrow();
    expect(() => parseImport([])).toThrow();
  });
});

describe('fichiers', () => {
  it('construit un nom de fichier sans accents', () => {
    expect(buildFileBase({ name: 'Éloïse Le Gall', company: 'L’Oréal' })).toBe('CV_Eloise_Le_Gall_L_Oreal');
    expect(buildFileBase({ prefix: 'LM', name: '' })).toBe('LM');
    expect(slugifyPart('  ')).toBe('');
  });
  it('translittère les lettres que la décomposition Unicode ne simplifie pas', () => {
    expect(buildFileBase({ name: 'Lætitia Dupont', company: 'Fnac' })).toBe('CV_Laetitia_Dupont_Fnac');
    expect(buildFileBase({ name: 'Chloé Cœurdacier' })).toBe('CV_Chloe_Coeurdacier');
    expect(buildFileBase({ name: 'Anne Weiß' })).toBe('CV_Anne_Weiss');
    expect(buildFileBase({ name: 'Paweł Łukasiewicz' })).toBe('CV_Pawel_Lukasiewicz');
    expect(buildFileBase({ name: 'Ștefania Łukasiewicz' })).toBe('CV_Stefania_Lukasiewicz');
    expect(buildFileBase({ name: 'Søren Weiß', company: 'Les Restos du Cœur' })).toBe('CV_Soren_Weiss_Les_Restos_du_Coeur');
    expect(buildFileBase({ prefix: 'LM', name: 'Çağrı Yılmaz' })).toBe('LM_Cagri_Yilmaz');
    expect(slugifyPart('Đặng Thảo')).toBe('Dang_Thao');
  });
  it('affiche et complète les URL', () => {
    expect(prettyUrl('https://www.linkedin.com/in/x/')).toBe('linkedin.com/in/x');
    expect(absoluteUrl('linkedin.com/in/x')).toBe('https://linkedin.com/in/x');
    expect(absoluteUrl('mailto:a@b.c')).toBe('mailto:a@b.c');
  });
  it('une adresse e-mail saisie comme lien devient un lien mailto:', () => {
    expect(absoluteUrl('camille.pro@exemple.fr')).toBe('mailto:camille.pro@exemple.fr');
    expect(absoluteUrl(' camille.pro@exemple.fr ')).toBe('mailto:camille.pro@exemple.fr');
    expect(prettyUrl('mailto:camille.pro@exemple.fr')).toBe('camille.pro@exemple.fr');
    // Une vraie adresse web avec « @ » dans le chemin reste une adresse web.
    expect(absoluteUrl('medium.com/@camille')).toBe('https://medium.com/@camille');
    expect(absoluteUrl('https://x.com/@camille')).toBe('https://x.com/@camille');
  });
  it('photo importée : une image déjà traitée (JPEG sans métadonnées) est gardée telle quelle', async () => {
    const jfif = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0];
    const sos = [0xff, 0xda, 0x00, 0x08, 1, 1, 0, 0, 0x3f, 0];
    const clean = `data:image/jpeg;base64,${Buffer.from([...jfif, ...sos, 0xff, 0xd9]).toString('base64')}`;
    expect(await sanitizePhoto(clean)).toBe(clean);
    expect(await sanitizePhoto('https://tracker.invalid/p.gif')).toBe('');
    expect(await sanitizePhoto('data:image/jpeg;base64,!!!')).toBe('');
  });
  it('lien téléphone sans le « (0) » des numéros internationaux', () => {
    expect(telHref('+33 (0)6 12 34 56 78')).toBe('tel:+33612345678');
    expect(telHref('06 12 34 56 78')).toBe('tel:0612345678');
    expect(telHref('+33 6.12.34.56.78')).toBe('tel:+33612345678');
    expect(telHref('sur demande')).toBe('');
  });
});

describe('géométrie de page', () => {
  it('compte les pages', () => {
    expect(countPages(100, 'design')).toBe(1);
    expect(countPages(297 * PX_PER_MM, 'design')).toBe(1);
    expect(countPages(300 * PX_PER_MM, 'design')).toBe(2);
    expect(countPages(270 * PX_PER_MM, 'ats')).toBe(2);
  });
});

describe('masquage fin et réglages de page', () => {
  it('indices de puces masquées valides, compétences masquées présentes dans le groupe', () => {
    const d = normalizeData({
      experiences: [{ details: ['a', 'b', 'c'], hiddenDetails: [2, 2, 0, 7, -1, 'x', 1.5] }],
      education: [{ details: ['a'], hiddenDetails: [0] }],
      customSections: [{ id: 's', items: ['x', 'y'], hiddenItems: [1] }],
      mainSkills: [{ skills: ['Excel', 'Word'], hiddenSkills: ['Word', 'Word', 'Access'] }],
      socialLinks: [{ url: 'x.fr', hidden: true }],
      languages: [{ name: 'Anglais', hidden: 'oui' }],
      certifications: [{ name: 'Permis B', hidden: true }],
    });
    expect(d.experiences[0].hiddenDetails).toEqual([0, 2]);
    expect(d.education[0].hiddenDetails).toEqual([0]);
    expect(d.customSections[0].hiddenItems).toEqual([1]);
    expect(d.mainSkills[0].hiddenSkills).toEqual(['Word']);
    expect([d.socialLinks[0].hidden, d.languages[0].hidden, d.certifications[0].hidden]).toEqual([true, false, true]);
    expect(normalizeData(d)).toEqual(d);
  });

  it('un élément vide reste vide, même avec des puces masquées', () => {
    expect(isBlankItem({ id: 'x', title: '', details: [''], hiddenDetails: [0], hidden: false })).toBe(true);
    expect(isBlankItem({ id: 'g', category: '', skills: [], hiddenSkills: [] })).toBe(true);
  });

  it('marges et espacement « normaux » par défaut, valeurs inconnues ignorées', () => {
    expect(normalizeSettings({})).toMatchObject({ margins: 'normal', spacing: 'normal' });
    expect(normalizeSettings({ margins: 'narrow', spacing: 'airy' })).toMatchObject({ margins: 'narrow', spacing: 'airy' });
    expect(normalizeSettings({ margins: 'xl', spacing: 0 })).toMatchObject({ margins: 'normal', spacing: 'normal' });
    expect([marginScale({ margins: 'narrow' }), marginScale({}), spacingScale({ spacing: 'compact' })]).toEqual([0.7, 1, 0.65]);
  });
});

describe('en-tête coloré (modèle ATS)', () => {
  it('sobre par défaut, coloré sur demande', () => {
    expect(normalizeSettings({}).headerStyle).toBe('plain');
    expect(normalizeSettings({ headerStyle: 'colored' }).headerStyle).toBe('colored');
    expect(normalizeSettings({ headerStyle: 'rainbow' }).headerStyle).toBe('plain');
  });

  it('texte blanc sur une couleur foncée, foncé sur une couleur claire', () => {
    expect(readableTextOn('#2563eb')).toBe('#ffffff');
    expect(readableTextOn('#111827')).toBe('#ffffff');
    expect(readableTextOn('#fde047')).toBe('#111827');
    expect(readableTextOn('#fff')).toBe('#111827');
    expect(readableTextOn('n’importe quoi')).toBe('#ffffff');
  });
});

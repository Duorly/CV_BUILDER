import { describe, expect, it } from 'vitest';
import {
  addApplicationForCv,
  addCv,
  canTrackApplication,
  compareImport,
  createVersionFromAi,
  describeImportChanges,
  describeLibrary,
  duplicateCvInLibrary,
  duplicateForApplication,
  getCurrentCv,
  mergeLibraries,
  newBlankCv,
  newCvFromData,
  removeCv,
  replaceContact,
  replaceLibrary,
  rootCvId,
  sameValue,
  selectCv,
  suggestVersionName,
  uniqueCvName,
  updateCvInLibrary,
  updateCvMeta,
  versionsWithContact,
} from '../libraryActions';
import { createCv, createLibrary, exportLibraryPayload, normalizeApplication, parseImport } from '../storage';
import { normalizeData, normalizeSettings } from '../schema';
import example from '../../data/exampleResume.json';

function libraryWith(...names) {
  const cvs = names.map((name) => createCv({ name }));
  return { ...createLibrary(cvs[0]), cvs };
}

describe('sélection et lecture', () => {
  it('getCurrentCv retombe sur la première version si currentId est inconnu', () => {
    const lib = libraryWith('Base', 'Autre');
    expect(getCurrentCv({ ...lib, currentId: 'inconnu' }).name).toBe('Base');
  });

  it('selectCv ignore un identifiant inconnu et ne recrée pas l’objet inutilement', () => {
    const lib = libraryWith('Base', 'Autre');
    expect(selectCv(lib, 'inconnu')).toBe(lib);
    expect(selectCv(lib, lib.currentId)).toBe(lib);
    expect(selectCv(lib, lib.cvs[1].id).currentId).toBe(lib.cvs[1].id);
  });
});

describe('noms de versions', () => {
  it('suggestVersionName assemble poste et entreprise', () => {
    expect(suggestVersionName({ jobTitle: 'Chargée de com', company: 'Decathlon' })).toBe(
      'CV – Chargée de com – Decathlon',
    );
    expect(suggestVersionName({ company: ' Decathlon ' })).toBe('CV – Decathlon');
    expect(suggestVersionName({})).toBe('');
  });

  it('uniqueCvName ajoute un suffixe numéroté, sans tenir compte de la casse', () => {
    const lib = libraryWith('Base', 'base (2)');
    expect(uniqueCvName(lib, 'Base')).toBe('Base (3)');
    expect(uniqueCvName(lib, 'Nouveau')).toBe('Nouveau');
    expect(uniqueCvName(lib, '   ')).toBe('Mon CV');
    // La version renommée ne se compte pas elle-même.
    expect(uniqueCvName(lib, 'Base', lib.cvs[0].id)).toBe('Base');
  });
});

describe('ajout, duplication, mise à jour', () => {
  it('addCv ajoute à la fin et sélectionne par défaut', () => {
    const lib = libraryWith('Base');
    const cv = newBlankCv(lib);
    const next = addCv(lib, cv);
    expect(next.cvs).toHaveLength(2);
    expect(next.cvs[1].id).toBe(cv.id);
    expect(next.currentId).toBe(cv.id);
    expect(lib.cvs).toHaveLength(1);
    expect(addCv(lib, cv, { select: false }).currentId).toBe(lib.currentId);
  });

  it('addCv régénère un identifiant déjà présent', () => {
    const lib = libraryWith('Base');
    const next = addCv(lib, { ...lib.cvs[0] });
    expect(new Set(next.cvs.map((c) => c.id)).size).toBe(2);
  });

  it('newCvFromData normalise les données et évite les doublons de nom', () => {
    const lib = libraryWith('Exemple');
    const cv = newCvFromData(lib, example, { name: 'Exemple' });
    expect(cv.name).toBe('Exemple (2)');
    expect(cv.data.personalInfo.name).toBe('Camille Martin');
    expect(cv.data.sections.length).toBeGreaterThan(0);
  });

  it('duplicateCvInLibrary copie en profondeur et garde la trace de la source', () => {
    const base = createCv({ name: 'Base', data: normalizeData(example) });
    const lib = createLibrary(base);
    const { library, cv } = duplicateCvInLibrary(lib, base.id, { company: 'Decathlon' });
    expect(cv.name).toBe('Base (copie)');
    expect(cv.sourceId).toBe(base.id);
    expect(cv.company).toBe('Decathlon');
    expect(library.currentId).toBe(cv.id);
    cv.data.personalInfo.name = 'Modifié';
    expect(base.data.personalInfo.name).toBe('Camille Martin');
  });

  it('duplicateForApplication : nouvelle candidature sans l’offre ni la lettre de l’ancienne', () => {
    const base = createCv({
      name: 'CV – Com – Decathlon',
      company: 'Decathlon',
      jobTitle: 'Com',
      jobOffer: 'Offre Decathlon',
      offerUrl: 'https://decathlon.fr/offre',
      coverLetter: { recipientCompany: 'Decathlon', body: 'Je souhaite rejoindre Decathlon.' },
    });
    const lib = createLibrary(base);
    const { library, cv } = duplicateForApplication(lib, base.id, { name: 'CV – Com – Fnac', company: 'Fnac', jobTitle: 'Com' });
    expect(library.currentId).toBe(cv.id);
    expect(cv).toMatchObject({ name: 'CV – Com – Fnac', company: 'Fnac', jobOffer: '', offerUrl: '', sourceId: base.id });
    expect(cv.coverLetter.body).toBe('');
    expect(cv.coverLetter.recipientCompany).toBe('');
    expect(library.cvs[0].coverLetter.body).toBe('Je souhaite rejoindre Decathlon.');

    const same = duplicateForApplication(lib, base.id, { company: 'Decathlon', jobTitle: 'Com', copyLetter: true }).cv;
    expect(same.jobOffer).toBe('Offre Decathlon');
    expect(same.coverLetter.body).toBe('Je souhaite rejoindre Decathlon.');
    expect(same).not.toHaveProperty('copyLetter');
    expect(duplicateForApplication(lib, 'inconnu', {}).library).toBe(lib);
  });

  it('updateCvInLibrary met à jour updatedAt et seulement la version visée', () => {
    const lib = libraryWith('A', 'B');
    const before = lib.cvs[1];
    const next = updateCvInLibrary(lib, lib.cvs[0].id, { company: 'X' });
    expect(next.cvs[0].company).toBe('X');
    expect(next.cvs[1]).toBe(before);
    expect(updateCvInLibrary(lib, 'inconnu', { company: 'X' })).toBe(lib);
  });

  it('une modification sans effet ne change rien : ni updatedAt, ni nouvel objet', () => {
    const lib = libraryWith('A', 'B');
    const cv = { ...lib.cvs[0], updatedAt: '2026-10-10T08:00:00.000Z' };
    const old = { ...lib, cvs: [cv, lib.cvs[1]] };
    // Mêmes valeurs (réglages renormalisés en un nouvel objet, nom inchangé…) : bibliothèque renvoyée telle quelle.
    expect(updateCvInLibrary(old, cv.id, { settings: normalizeSettings({ ...cv.settings }) })).toBe(old);
    expect(updateCvInLibrary(old, cv.id, { settings: normalizeSettings({ ...cv.settings, template: cv.settings.template }) })).toBe(old);
    expect(updateCvInLibrary(old, cv.id, { data: normalizeData(JSON.parse(JSON.stringify(cv.data))) })).toBe(old);
    expect(updateCvMeta(old, cv.id, { name: cv.name, company: cv.company, jobTitle: cv.jobTitle })).toBe(old);
    // Une vraie modification avance updatedAt.
    const changed = updateCvInLibrary(old, cv.id, { settings: normalizeSettings({ ...cv.settings, template: 'ats' }) });
    expect(changed).not.toBe(old);
    expect(changed.cvs[0].updatedAt).not.toBe('2026-10-10T08:00:00.000Z');
  });

  it('sameValue compare en profondeur, sans tenir compte de l’ordre des clés', () => {
    expect(sameValue({ a: 1, b: [1, { c: 'x' }] }, { b: [1, { c: 'x' }], a: 1 })).toBe(true);
    expect(sameValue({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(sameValue([1, 2], [2, 1])).toBe(false);
    expect(sameValue('', null)).toBe(false);
  });

  it('updateCvMeta refuse les champs non descriptifs et dédoublonne le nom', () => {
    const lib = libraryWith('A', 'B');
    const next = updateCvMeta(lib, lib.cvs[1].id, { name: 'A', data: null, settings: null, jobTitle: 'Poste' });
    expect(next.cvs[1].name).toBe('A (2)');
    expect(next.cvs[1].jobTitle).toBe('Poste');
    expect(next.cvs[1].data).toBe(lib.cvs[1].data);
    expect(updateCvMeta(lib, lib.cvs[0].id, { name: '  ' }).cvs[0].name).toBe('Mon CV');
  });
});

describe('suppression', () => {
  it('refuse de supprimer la dernière version', () => {
    const lib = libraryWith('Seule');
    expect(removeCv(lib, lib.cvs[0].id)).toBe(lib);
  });

  it('sélectionne une voisine si la version courante est supprimée', () => {
    const lib = libraryWith('A', 'B', 'C');
    const atB = selectCv(lib, lib.cvs[1].id);
    const next = removeCv(atB, lib.cvs[1].id);
    expect(next.cvs.map((c) => c.name)).toEqual(['A', 'C']);
    expect(next.currentId).toBe(lib.cvs[2].id);
    const atC = selectCv(lib, lib.cvs[2].id);
    expect(removeCv(atC, lib.cvs[2].id).currentId).toBe(lib.cvs[1].id);
  });

  it('rattache les versions dérivées à la source de la version supprimée', () => {
    const lib = libraryWith('A', 'B', 'C', 'D');
    const [a, b, c, d] = lib.cvs;
    const chained = { ...lib, cvs: [a, { ...b, sourceId: a.id }, { ...c, sourceId: b.id }, { ...d, sourceId: c.id }] };
    const next = removeCv(chained, b.id);
    expect(next.cvs.map((cv) => [cv.name, cv.sourceId])).toEqual([
      ['A', null],
      ['C', a.id],
      ['D', c.id],
    ]);
    // L'IA repart donc toujours de la version de base.
    expect(rootCvId(next.cvs, c.id)).toBe(a.id);
    // Une version de base supprimée : ses dérivées deviennent des versions de base.
    expect(removeCv(chained, a.id).cvs.find((cv) => cv.id === b.id).sourceId).toBeNull();
  });

  it('détache les candidatures liées sans les supprimer', () => {
    const lib = libraryWith('A', 'B');
    const app = normalizeApplication({ company: 'Decathlon', cvId: lib.cvs[1].id });
    const next = removeCv({ ...lib, applications: [app] }, lib.cvs[1].id);
    expect(next.applications).toHaveLength(1);
    expect(next.applications[0].cvId).toBeNull();
    expect(next.applications[0].company).toBe('Decathlon');
  });
});

describe('import : fusion et remplacement', () => {
  it('mergeLibraries ajoute les nouvelles versions, reconnaît celles déjà présentes et suit les liens', () => {
    const current = libraryWith('Base');
    const shared = current.cvs[0];
    const other = createCv({ name: 'Base' });
    const incoming = {
      currentId: other.id,
      cvs: [shared, other],
      applications: [normalizeApplication({ company: 'Fnac', cvId: shared.id })],
    };
    const merged = mergeLibraries(current, incoming);
    expect(merged.cvs).toHaveLength(2);
    expect(merged.currentId).toBe(current.currentId);
    expect(merged.cvs[0]).toBe(shared);
    expect(merged.cvs.map((c) => c.name)).toEqual(['Base', 'Base (2)']);
    expect(merged.applications[0].cvId).toBe(shared.id);
  });

  it('réimporter sa propre sauvegarde ne crée aucun doublon', () => {
    const lib = addApplicationForCv(
      libraryWith('Mon CV', 'CV – Chargée de com – Decathlon'),
      createCv({ name: 'x', company: 'Decathlon' }),
    );
    const backup = parseImport(JSON.parse(JSON.stringify(exportLibraryPayload(lib)))).library;
    expect(compareImport(lib, backup)).toEqual({
      cvs: { added: 0, known: 2, newer: 0 },
      applications: { added: 0, known: 1, newer: 0 },
    });
    // Rien ne change : la même bibliothèque est renvoyée.
    expect(mergeLibraries(lib, backup)).toBe(lib);
  });

  it('même id : la plus récente des deux versions est gardée, sans copie', () => {
    const lib = libraryWith('Mon CV', 'Decathlon');
    const [mine, theirs] = lib.cvs;
    const app = normalizeApplication({ company: 'Fnac', cvId: theirs.id, updatedAt: '2026-10-01T10:00:00.000Z' });
    const local = {
      ...lib,
      cvs: [{ ...mine, updatedAt: '2026-10-10T10:00:00.000Z' }, { ...theirs, updatedAt: '2026-10-10T10:00:00.000Z' }],
      applications: [app],
    };
    const incoming = {
      cvs: [
        // Plus ancienne ici : la version locale reste.
        { ...mine, name: 'Ancien nom', updatedAt: '2026-10-01T10:00:00.000Z' },
        // Modifiée plus tard sur un autre ordinateur : elle remplace la version locale.
        { ...theirs, company: 'Decathlon Lille', updatedAt: '2026-10-12T10:00:00.000Z' },
        createCv({ name: 'Nouvelle' }),
      ],
      applications: [{ ...app, status: 'envoyee', updatedAt: '2026-10-12T10:00:00.000Z' }],
    };
    expect(compareImport(local, incoming)).toEqual({
      cvs: { added: 1, known: 2, newer: 1 },
      applications: { added: 0, known: 1, newer: 1 },
    });
    const merged = mergeLibraries(local, incoming);
    expect(merged.cvs.map((c) => c.name)).toEqual(['Mon CV', 'Decathlon', 'Nouvelle']);
    expect(merged.cvs[1]).toMatchObject({ id: theirs.id, company: 'Decathlon Lille' });
    expect(merged.applications).toHaveLength(1);
    expect(merged.applications[0]).toMatchObject({ id: app.id, status: 'envoyee', cvId: theirs.id });
    expect(describeImportChanges(compareImport(local, incoming))).toBe(
      '1 version de CV ajoutée, 1 version mise à jour et 1 candidature mise à jour',
    );
  });

  it('mergeLibraries accepte un export complet relu par parseImport', () => {
    const source = libraryWith('Base', 'Decathlon');
    const parsed = parseImport(JSON.parse(JSON.stringify(exportLibraryPayload(source))));
    expect(parsed.kind).toBe('library');
    const merged = mergeLibraries(libraryWith('Mon CV'), parsed.library);
    expect(merged.cvs.map((c) => c.name)).toEqual(['Mon CV', 'Base', 'Decathlon']);
  });

  it('replaceLibrary normalise et garantit au moins une version', () => {
    const lib = replaceLibrary({ cvs: [], applications: 'n’importe quoi' });
    expect(lib.cvs).toHaveLength(1);
    expect(lib.applications).toEqual([]);
    expect(lib.currentId).toBe(lib.cvs[0].id);
  });

  it('describeLibrary accorde au pluriel', () => {
    const lib = libraryWith('A', 'B');
    expect(describeLibrary(lib)).toBe('2 versions de CV');
    const withApp = { ...lib, applications: [normalizeApplication({})] };
    expect(describeLibrary(withApp)).toBe('2 versions de CV et 1 candidature');
  });
});

describe('createVersionFromAi', () => {
  const base = createCv({
    name: 'Base',
    company: 'Ancienne',
    data: normalizeData(example),
    coverLetter: { body: 'Ancienne lettre' },
  });

  it('crée une version sélectionnée, avec lettre vide et réglages fusionnés', () => {
    const lib = createLibrary(base);
    const { library, cv } = createVersionFromAi(lib, base, {
      name: 'CV – Chargée de com – Decathlon',
      data: { personalInfo: { name: 'Camille Martin' }, experiences: [{ title: 'Poste' }] },
      company: 'Decathlon',
      jobTitle: 'Chargée de com',
      jobOffer: 'Texte de l’offre',
      settingsPatch: { lang: 'en' },
    });
    expect(library.cvs).toHaveLength(2);
    expect(library.currentId).toBe(cv.id);
    expect(cv.sourceId).toBe(base.id);
    expect(cv.company).toBe('Decathlon');
    expect(cv.jobOffer).toBe('Texte de l’offre');
    expect(cv.settings.lang).toBe('en');
    expect(cv.settings.primaryColor).toBe(base.settings.primaryColor);
    expect(cv.coverLetter.body).toBe('');
    expect(cv.data.experiences[0].details).toEqual([]);
    expect(cv.data.languages).toEqual([]);
    expect(library.applications).toHaveLength(0);
  });

  it('hérite des champs absents (traduction) et nomme la version par défaut', () => {
    const { cv } = createVersionFromAi(createLibrary(base), base, { data: base.data });
    expect(cv.company).toBe('Ancienne');
    expect(cv.name).toBe('Base (IA)');
  });

  it('reprend la lettre demandée (même offre), sinon la lettre part vide', () => {
    const letter = { recipientCompany: 'Sézane', body: 'Votre maison me tient à cœur.' };
    const { cv } = createVersionFromAi(createLibrary(base), base, { data: base.data, company: 'Sézane', coverLetter: letter });
    expect(cv.coverLetter.body).toBe('Votre maison me tient à cœur.');
    expect(cv.coverLetter.recipientCompany).toBe('Sézane');
    expect(cv.coverLetter.subject).toBe('');
    expect(createVersionFromAi(createLibrary(base), base, { data: base.data }).cv.coverLetter.body).toBe('');
  });

  it('ajoute la candidature au suivi si demandé', () => {
    const { library, cv } = createVersionFromAi(createLibrary(base), base, {
      data: base.data,
      company: 'Fnac',
      jobTitle: 'Chargée de com',
      offerUrl: 'https://exemple.fr/offre',
      addToTracker: true,
    });
    expect(library.applications).toHaveLength(1);
    const app = library.applications[0];
    expect(app).toMatchObject({
      company: 'Fnac',
      position: 'Chargée de com',
      offerUrl: 'https://exemple.fr/offre',
      status: 'a_envoyer',
      cvId: cv.id,
    });
    // « À envoyer » : pas encore de date d'envoi (sinon la relance tomberait avant l'envoi).
    expect(app.date).toBe('');
    expect(app.followUpDate).toBe('');
  });
});

describe('addApplicationForCv', () => {
  it('n’ajoute rien sans entreprise ni poste, comme le formulaire du suivi', () => {
    const cv = createCv({ name: 'Copie' });
    const lib = createLibrary(cv);
    expect(addApplicationForCv(lib, cv)).toBe(lib);
    expect(canTrackApplication({ company: '  ', jobTitle: '' })).toBe(false);
    expect(canTrackApplication({ company: '', jobTitle: 'Vendeuse' })).toBe(true);
    // « Créer la version sans IA » sans poste ni entreprise : pas de « candidature sans titre ».
    const created = createVersionFromAi(lib, cv, { data: cv.data, company: '', jobTitle: '', addToTracker: true });
    expect(created.library.applications).toEqual([]);
  });

  it('crée une candidature « À envoyer » liée à la version, sans date d’envoi', () => {
    const cv = { ...createCv({ name: 'CV – Transdev' }), company: 'Transdev', jobTitle: 'Assistante de direction' };
    const lib = addApplicationForCv(createLibrary(cv), cv);
    expect(lib.applications).toHaveLength(1);
    expect(lib.applications[0]).toMatchObject({
      company: 'Transdev',
      position: 'Assistante de direction',
      status: 'a_envoyer',
      date: '',
      cvId: cv.id,
    });
  });
});

describe('coordonnées communes aux versions', () => {
  const withContacts = () => {
    const make = (name, phone, lang = 'fr') =>
      createCv({ name, data: normalizeData({ personalInfo: { name: 'Inès Laurent', phone } }), settings: { lang } });
    const cvs = [make('Mon CV', '07 99 88 77 66'), make('Sézane', '06 11 22 33 44'), make('Kiabi', '06 11 22 33 44 '), make('Autre', '01 02 03 04 05')];
    return { ...createLibrary(cvs[0]), cvs };
  };

  it('versionsWithContact trouve les autres versions qui ont encore l’ancienne valeur', () => {
    const lib = withContacts();
    expect(versionsWithContact(lib, lib.cvs[0].id, 'phone', '06 11 22 33 44')).toEqual([lib.cvs[1].id, lib.cvs[2].id]);
    expect(versionsWithContact(lib, lib.cvs[0].id, 'title', '')).toEqual([]);
  });

  it('replaceContact ne touche qu’aux versions qui ont encore l’ancienne valeur, et s’annule', () => {
    const lib = withContacts();
    const ids = [lib.cvs[1].id, lib.cvs[2].id, lib.cvs[3].id];
    const next = replaceContact(lib, ids, 'phone', '06 11 22 33 44', '07 99 88 77 66');
    expect(next.cvs.map((c) => c.data.personalInfo.phone)).toEqual([
      '07 99 88 77 66',
      '07 99 88 77 66',
      '07 99 88 77 66',
      '01 02 03 04 05',
    ]);
    expect(next.cvs[0]).toBe(lib.cvs[0]);
    expect(next.cvs[3]).toBe(lib.cvs[3]);
    const undone = replaceContact(next, [lib.cvs[1].id, lib.cvs[2].id], 'phone', '07 99 88 77 66', '06 11 22 33 44');
    expect(undone.cvs[1].data.personalInfo.phone).toBe('06 11 22 33 44');
    expect(replaceContact(lib, ids, 'title', 'a', 'b')).toBe(lib);
  });
});

describe('rootCvId', () => {
  const base = createCv({ name: 'Base', data: normalizeData(example) });
  const decathlon = { ...createCv({ name: 'CV – Decathlon' }), sourceId: base.id };
  const decathlonBis = { ...createCv({ name: 'CV – Decathlon (relu)' }), sourceId: decathlon.id };
  const english = { ...createCv({ name: 'CV (EN)', settings: { lang: 'en' } }), sourceId: base.id };
  const englishJob = { ...createCv({ name: 'CV – Amazon (EN)', settings: { lang: 'en' } }), sourceId: english.id };
  const cvs = [base, decathlon, decathlonBis, english, englishJob];

  it('remonte jusqu’à la version de base', () => {
    expect(rootCvId(cvs, decathlonBis.id)).toBe(base.id);
    expect(rootCvId(cvs, decathlon.id)).toBe(base.id);
    expect(rootCvId(cvs, base.id)).toBe(base.id);
  });

  it('s’arrête si la version d’origine a été supprimée', () => {
    expect(rootCvId([decathlon, decathlonBis], decathlonBis.id)).toBe(decathlon.id);
  });

  it('s’arrête à une traduction : elle est la base de ses adaptations', () => {
    expect(rootCvId(cvs, englishJob.id)).toBe(english.id);
    expect(rootCvId(cvs, english.id)).toBe(english.id);
  });

  it('ne boucle pas sur des sourceId circulaires et accepte un id inconnu', () => {
    const a = { ...createCv({ name: 'A' }), id: 'a', sourceId: 'b' };
    const b = { ...createCv({ name: 'B' }), id: 'b', sourceId: 'a' };
    expect(['a', 'b']).toContain(rootCvId([a, b], 'a'));
    expect(rootCvId(cvs, 'inconnu')).toBe('inconnu');
  });
});

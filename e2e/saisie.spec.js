import { test, expect, exampleResume, CvApp, STORAGE_KEY } from './support/fixtures.js';

// b) Saisie d'un CV complet dans l'éditeur, aperçu à jour, puis rechargement (F5) : rien ne se perd.

const CV = {
  name: 'Léa Fontaine',
  title: 'Assistante de direction',
  email: 'lea.fontaine@exemple.fr',
  phone: '06 98 76 54 32',
  location: 'Bordeaux (33)',
  objective:
    'Assistante de direction depuis six ans en PME, j’organise agendas, déplacements et réunions pour une équipe de cinq personnes.',
  skills: ['Gestion de projet', 'Accueil téléphonique', 'Pack Office'],
  experience: {
    title: 'Assistante de direction',
    company: 'Cabinet Morel & Associés',
    location: 'Bordeaux',
    period: '03/2021 – Aujourd’hui',
    bullets: [
      'Gestion des agendas de trois associés et organisation des déplacements',
      'Préparation des comités de direction et rédaction des comptes rendus',
      'Mise en place d’un classement numérique partagé',
    ],
  },
  education: { title: 'BTS Support à l’action managériale', school: 'Lycée Gustave Eiffel', degree: 'Bac +2', period: '2017 – 2019' },
  language: { name: 'Anglais', level: 'B2 – Avancé' },
  link: { name: 'LinkedIn', url: 'https://www.linkedin.com/in/lea-fontaine-exemple', shown: 'linkedin.com/in/lea-fontaine-exemple' },
};

async function fillCv(page, app) {
  await page.locator('#ed-pi-name').fill(CV.name);
  await page.locator('#ed-pi-title').fill(CV.title);
  await page.locator('#ed-pi-email').fill(CV.email);
  await page.locator('#ed-pi-phone').fill(CV.phone);
  await page.locator('#ed-pi-location').fill(CV.location);

  await app.openPanel('profile');
  await page.locator('#ed-profile-objective').fill(CV.objective);

  // Compétences : saisie touche par touche (l'ancien bug supprimait les espaces à chaque frappe).
  const skills = await app.openPanel('skills');
  await skills.getByRole('button', { name: 'Ajouter un groupe de compétences' }).click();
  await skills.getByLabel('Nom du groupe (facultatif)').fill('Organisation');
  const tagInput = skills.locator('input.editor-tag-input');
  await tagInput.pressSequentially(CV.skills[0]);
  await tagInput.press('Enter');
  await tagInput.pressSequentially(`${CV.skills[1]},`);
  // Une compétence tapée sans Entrée est validée quand on passe à autre chose.
  await tagInput.pressSequentially(CV.skills[2]);
  await page.locator('#ed-panel-experiences-toggle').click();
  await expect(skills.locator('.editor-tag-text')).toHaveText(CV.skills);

  // Expérience avec trois puces (Entrée crée la puce suivante).
  const exp = app.panel('experiences');
  await exp.getByRole('button', { name: 'Ajouter une expérience' }).click();
  await exp.getByLabel('Intitulé du poste').fill(CV.experience.title);
  await exp.getByLabel('Entreprise ou structure').fill(CV.experience.company);
  await exp.getByLabel('Lieu', { exact: true }).fill(CV.experience.location);
  await exp.getByLabel('Période', { exact: true }).fill(CV.experience.period);
  const bullets = exp.locator('textarea.detail-input');
  await expect(bullets).toHaveCount(1);
  await bullets.first().fill(CV.experience.bullets[0]);
  for (const [i, text] of CV.experience.bullets.slice(1).entries()) {
    await bullets.nth(i).press('End');
    await bullets.nth(i).press('Enter');
    await expect(bullets).toHaveCount(i + 2);
    await expect(bullets.nth(i + 1)).toBeFocused();
    await page.keyboard.type(text);
  }
  await expect(bullets).toHaveCount(3);

  const edu = await app.openPanel('education');
  await edu.getByRole('button', { name: 'Ajouter une formation' }).click();
  await edu.getByLabel('Intitulé de la formation').fill(CV.education.title);
  await edu.getByLabel('Établissement').fill(CV.education.school);
  await edu.getByLabel('Diplôme / niveau').fill(CV.education.degree);
  await edu.getByLabel('Période', { exact: true }).fill(CV.education.period);

  const lang = await app.openPanel('languages');
  await lang.getByRole('button', { name: 'Ajouter une langue' }).click();
  await lang.getByLabel('Langue', { exact: true }).fill(CV.language.name);
  await lang.getByLabel('Niveau', { exact: true }).fill(CV.language.level);

  const links = await app.openPanel('links');
  await links.getByRole('button', { name: 'Ajouter un lien' }).click();
  await links.getByLabel('Nom du lien').fill(CV.link.name);
  await links.getByLabel('Adresse', { exact: true }).fill(CV.link.url);
}

async function expectPreview(app) {
  const r = app.resume;
  await expect(r.locator('h1')).toHaveText(CV.name);
  await expect(r.locator('.profile-title')).toHaveText(CV.title);
  const contact = r.locator('.contact-info');
  for (const text of [CV.email, CV.phone, CV.location]) await expect(contact).toContainText(text);
  await expect(r.locator('a[href^="mailto:"]')).toHaveAttribute('href', `mailto:${CV.email}`);
  await expect(r.locator('.objective-text')).toHaveText(CV.objective);
  // Une compétence de plusieurs mots reste une seule étiquette, espaces compris.
  await expect(r.locator('.skills-tags .tag')).toHaveText(CV.skills);
  const exp = r.locator('.experience-item');
  await expect(exp).toHaveCount(1);
  await expect(exp.locator('h3')).toHaveText(CV.experience.title);
  await expect(exp.locator('.exp-company')).toHaveText(CV.experience.company);
  await expect(exp).toContainText(CV.experience.period);
  await expect(exp.locator('.exp-details li')).toHaveText(CV.experience.bullets);
  const edu = r.locator('.formation-item');
  await expect(edu.locator('h3')).toHaveText(CV.education.title);
  for (const text of [CV.education.school, CV.education.degree, CV.education.period]) await expect(edu).toContainText(text);
  await expect(r.locator('.lang-list')).toContainText(CV.language.name);
  await expect(r.locator('.lang-list')).toContainText(CV.language.level);
  const link = r.locator('.social-links a');
  await expect(link).toHaveAttribute('href', CV.link.url);
  await expect(link.locator('.link-text')).toHaveText(CV.link.shown);
  // Les sections remplies ont un titre ; les sections vides n'apparaissent pas.
  const headings = await r.locator('h2').allTextContents();
  expect(headings).toEqual(expect.arrayContaining(['Compétences', 'Expériences professionnelles', 'Formation', 'Liens', 'Langues']));
  expect(headings).not.toContain('Certifications');
  expect(headings).not.toContain('Autres expériences');
}

test('un CV saisi dans l’éditeur s’affiche dans l’aperçu et survit au rechargement', async ({ page, app }) => {
  await app.startBlank();
  await fillCv(page, app);
  await expectPreview(app);
  await expect(page).toHaveTitle('CV_Lea_Fontaine');

  // Sauvegarde automatique, puis F5.
  await app.waitForSaved((lib) => lib?.cvs[0].data.socialLinks[0]?.url === CV.link.url);
  await expect(app.toolbar.locator('.save-ind-ok')).toContainText('Enregistré');
  await page.reload();

  await expect(page.getByRole('heading', { name: /Bienvenue/ })).toHaveCount(0);
  await expectPreview(app);
  await expect(page.locator('#ed-pi-name')).toHaveValue(CV.name);
  await expect(page.locator('#ed-pi-location')).toHaveValue(CV.location);
  const skills = await app.openPanel('skills');
  await skills.locator('.editor-card-toggle').click();
  await expect(skills.locator('.editor-tag-text')).toHaveText(CV.skills);
  const exp = await app.openPanel('experiences');
  await exp.locator('.editor-card-toggle').click();
  await expect(exp.locator('textarea.detail-input')).toHaveCount(3);
  await expect(exp.locator('textarea.detail-input').nth(2)).toHaveValue(CV.experience.bullets[2]);
  await expect(page).toHaveTitle('CV_Lea_Fontaine');
});

test('une saisie suivie aussitôt d’un rechargement n’est pas perdue', async ({ page, app }) => {
  await app.startBlank();
  await page.locator('#ed-pi-name').fill('Nora Benali');
  await app.openPanel('profile');
  await page.locator('#ed-profile-objective').fill('Dernière phrase tapée juste avant F5.');
  // Pas d'attente : la sauvegarde différée (500 ms) est écrite en quittant la page.
  await page.reload();
  await expect(page.locator('#ed-pi-name')).toHaveValue('Nora Benali');
  await expect(app.resume.locator('.objective-text')).toHaveText('Dernière phrase tapée juste avant F5.');
});

test('deux onglets : celui qui n’a rien en cours reprend les modifications de l’autre, sans conflit', async ({ page, app, context }) => {
  await app.loadExample();
  await app.waitForSaved((lib) => lib?.cvs[0].data.personalInfo.name === 'Camille Martin');

  // Second onglet (A) ; le premier (B) ne touche à rien.
  const other = await context.newPage();
  await other.goto('/');
  await expect(other.locator('#ed-pi-name')).toHaveValue('Camille Martin');
  await other.locator('#ed-pi-name').fill('Camille A');
  await app.waitForSaved((lib) => lib?.cvs[0].data.personalInfo.name === 'Camille A');

  // B se met à jour en silence : pas de bandeau « modifiés dans un autre onglet », rien à écraser.
  await expect(page.locator('#ed-pi-name')).toHaveValue('Camille A');
  await app.expectToast('Vos CV ont été mis à jour avec les modifications faites dans un autre onglet.');
  await expect(page.getByText('Vos CV ont été modifiés dans un autre onglet')).toHaveCount(0);
  await expect(app.toolbar.locator('.save-ind-ok')).toBeVisible();

  // B modifie à son tour : enregistré normalement, et A le reçoit.
  await page.locator('#ed-pi-title').fill('Titre saisi dans B');
  const lib = await app.waitForSaved((l) => l?.cvs[0].data.personalInfo.title === 'Titre saisi dans B');
  expect(lib.cvs[0].data.personalInfo.name).toBe('Camille A');
  await expect(other.locator('#ed-pi-title')).toHaveValue('Titre saisi dans B');
  await expect(other.getByText('Vos CV ont été modifiés dans un autre onglet')).toHaveCount(0);
  await other.close();
});

test('deux onglets : un onglet resté sur l’accueil reprend les CV enregistrés par l’autre, sans conflit', async ({ page, app, context }) => {
  await app.open();
  await expect(page.getByRole('heading', { name: /Bienvenue/ })).toBeVisible();

  // Second onglet : exemple chargé et modifié, bien enregistré.
  const other = await context.newPage();
  const otherApp = new CvApp(other);
  await otherApp.loadExample();
  await other.locator('#ed-pi-name').fill('Camille (travail onglet 2)');
  await otherApp.waitForSaved((lib) => lib?.cvs[0].data.personalInfo.name === 'Camille (travail onglet 2)');

  // Le premier onglet quitte l'accueil et affiche ces CV : rien à protéger, donc aucun conflit à trancher.
  await expect(page.locator('#ed-pi-name')).toHaveValue('Camille (travail onglet 2)');
  await app.expectToast('ont été enregistrés dans un autre onglet');
  await expect(page.getByText('Vos CV ont été modifiés dans un autre onglet')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Garder celle de cet onglet' })).toHaveCount(0);

  // Il enregistre ensuite normalement, et l'autre onglet le reçoit.
  await page.locator('#ed-pi-title').fill('Titre saisi dans l’onglet 1');
  const lib = await app.waitForSaved((l) => l?.cvs[0].data.personalInfo.title === 'Titre saisi dans l’onglet 1');
  expect(lib.cvs).toHaveLength(1);
  expect(lib.cvs[0].data.personalInfo.name).toBe('Camille (travail onglet 2)');
  await expect(other.locator('#ed-pi-title')).toHaveValue('Titre saisi dans l’onglet 1');
  await other.close();
});

test('accueil : « Commencer de zéro » n’écrase pas des CV enregistrés entre-temps ailleurs', async ({ page, app }) => {
  await app.open();
  await expect(page.getByRole('heading', { name: /Bienvenue/ })).toBeVisible();
  // Enregistrement que cet onglet n'a pas vu passer (aucun événement « storage » dans l'onglet qui écrit).
  const now = new Date().toISOString();
  const saved = {
    version: 2,
    currentId: 'cv_ailleurs',
    cvs: [{ id: 'cv_ailleurs', name: 'CV enregistré ailleurs', createdAt: now, updatedAt: now, data: exampleResume }],
    applications: [],
  };
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: STORAGE_KEY, value: JSON.stringify(saved) });
  await page.getByRole('button', { name: /Commencer de zéro/ }).click();
  await expect(page.locator('#ed-pi-name')).toHaveValue('Camille Martin');
  await expect(app.versionButton.locator('.vm-current-name')).toHaveText('CV enregistré ailleurs');
  await app.expectToast('ont été enregistrés dans un autre onglet');
  await page.waitForTimeout(800);
  const stored = await app.storedLibrary();
  expect(stored.cvs.map((c) => c.name)).toEqual(['CV enregistré ailleurs']);
});

test('conflit entre onglets : « Charger la version la plus récente » garde la version affichée', async ({ page, app }) => {
  const now = new Date().toISOString();
  const version = (id, name) => ({ id, name, createdAt: now, updatedAt: now, data: exampleResume, settings: { lang: 'fr' } });
  const library = { version: 2, currentId: 'cv_1', cvs: [version('cv_1', 'Version 1'), version('cv_2', 'Version 2')], applications: [] };
  await app.open();
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: STORAGE_KEY, value: JSON.stringify(library) });
  await page.reload();
  await app.selectVersion('Version 2');
  await app.waitForSaved((l) => l?.currentId === 'cv_2');

  // Cet onglet a une saisie pas encore enregistrée quand un autre onglet (sur « Version 1 ») enregistre.
  await page.evaluate((key) => {
    const input = document.querySelector('#ed-pi-title');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Titre saisi ici');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const lib = JSON.parse(localStorage.getItem(key));
    lib.currentId = 'cv_1';
    lib.cvs[0].data.personalInfo.title = 'Titre saisi dans l’autre onglet';
    lib.cvs[0].updatedAt = new Date().toISOString();
    const value = JSON.stringify(lib);
    localStorage.setItem(key, value);
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: value }));
  }, STORAGE_KEY);
  await expect(page.getByText('Vos CV ont été modifiés dans un autre onglet')).toBeVisible();

  await page.getByRole('button', { name: 'Charger la version la plus récente' }).click();
  await expect(page.getByText('Vos CV ont été modifiés dans un autre onglet')).toHaveCount(0);
  // Toujours la version sur laquelle elle travaillait, avec les modifications de l'autre onglet.
  await expect(app.versionButton.locator('.vm-current-name')).toHaveText('Version 2');
  await app.selectVersion('Version 1');
  await expect(page.locator('#ed-pi-title')).toHaveValue('Titre saisi dans l’autre onglet');
});

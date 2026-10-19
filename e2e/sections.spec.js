import { test, expect } from './support/fixtures.js';

// e) Sections : renommer, masquer, déplacer, ajouter une section libre ; les deux modèles suivent.

const headings = (locator) => locator.locator('h2').allTextContents();

test('renommer, masquer, déplacer et ajouter une section se reflète dans les deux modèles', async ({ page, app }) => {
  await app.loadExample();
  const main = app.resume.locator('.main-content');
  const sidebar = app.resume.locator('.sidebar');
  expect(await headings(main)).toEqual(['Expériences professionnelles', 'Formation', 'Autres expériences']);

  // Renommer « Expériences professionnelles » (Entrée valide).
  await page.locator('#ed-panel-experiences-rename').click();
  const titleInput = page.locator('#ed-panel-experiences-title');
  await expect(titleInput).toBeFocused();
  await expect(titleInput).toHaveAttribute('placeholder', 'Expériences professionnelles');
  await titleInput.fill('Parcours professionnel');
  await titleInput.press('Enter');
  await expect(page.locator('#ed-panel-experiences .editor-panel-title')).toHaveText('Parcours professionnel');

  // Échap annule un renommage en cours.
  await page.locator('#ed-panel-education-rename').click();
  await page.locator('#ed-panel-education-title').fill('Études');
  await page.locator('#ed-panel-education-title').press('Escape');
  await expect(page.locator('#ed-panel-education .editor-panel-title')).toHaveText('Formation');

  // Masquer « Langues ».
  await page.locator('#ed-panel-languages-visibility').click();
  await expect(page.locator('#ed-panel-languages-visibility')).toHaveAttribute('aria-label', 'Afficher « Langues » sur le CV');
  await expect(sidebar).not.toContainText('Langue maternelle');

  // Déplacer « Formation » au-dessus des expériences.
  await page.locator('#ed-panel-education-up').click();
  await expect(page.locator('#ed-panel-education-up')).toBeFocused();

  // Section libre « Publications », d'abord dans la colonne principale.
  await page.getByRole('button', { name: 'Ajouter une section libre' }).click();
  const custom = page.locator('.editor-section-panel').last();
  const customTitle = custom.getByLabel('Titre de la section', { exact: true });
  await expect(customTitle).toBeFocused();
  await customTitle.fill('Publications');
  await custom.locator('textarea.detail-input').first().fill('Article « Communiquer en local », revue Com’ (2024)');

  expect(await headings(main)).toEqual(['Formation', 'Parcours professionnel', 'Autres expériences', 'Publications']);
  await expect(main).toContainText('Article « Communiquer en local »');
  const sideHeadings = await headings(sidebar);
  expect(sideHeadings).not.toContain('Langues');
  expect(sideHeadings).toEqual(expect.arrayContaining(['Compétences', 'Liens', 'Certifications', "Centres d'intérêt"]));

  // Colonne latérale.
  await custom.getByLabel('Emplacement dans le modèle design').selectOption('sidebar');
  await expect(sidebar.locator('h2', { hasText: 'Publications' })).toBeVisible();
  expect(await headings(main)).toEqual(['Formation', 'Parcours professionnel', 'Autres expériences']);

  // Modèle ATS : une colonne, même ordre, mêmes titres, même section masquée.
  await app.setTemplate('ATS (sobre)');
  const ats = await headings(app.resume);
  expect(ats).toContain('Parcours professionnel');
  expect(ats).not.toContain('Expériences professionnelles');
  expect(ats).not.toContain('Langues');
  expect(ats).toContain('Publications');
  expect(ats.indexOf('Formation')).toBeLessThan(ats.indexOf('Parcours professionnel'));
  expect(ats.indexOf('Publications')).toBe(ats.length - 1);
  await expect(app.resume).toContainText('Article « Communiquer en local »');
  await expect(app.resume).not.toContainText('Langue maternelle');

  // Réafficher « Langues » : elle revient dans le modèle ATS.
  await page.locator('#ed-panel-languages-visibility').click();
  await expect(app.resume.locator('h2', { hasText: 'Langues' })).toBeVisible();

  // Tout est enregistré avec la version.
  const lib = await app.waitForSaved((l) => l?.cvs[0].data.customSections.some((c) => c.title === 'Publications'));
  const order = lib.cvs[0].data.sections.map((s) => s.id);
  expect(order.indexOf('education')).toBeLessThan(order.indexOf('experiences'));
  expect(lib.cvs[0].data.sections.find((s) => s.id === 'experiences').title).toBe('Parcours professionnel');
});

test('une section libre supprimée disparaît des deux modèles', async ({ page, app }) => {
  await app.startBlank();
  await page.getByRole('button', { name: 'Ajouter une section libre' }).click();
  const custom = page.locator('.editor-section-panel').last();
  await custom.getByLabel('Titre de la section', { exact: true }).fill('Bénévolat');
  await custom.locator('textarea.detail-input').first().fill('Collecte annuelle de la banque alimentaire');
  await expect(app.resume.locator('h2', { hasText: 'Bénévolat' })).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await custom.getByRole('button', { name: 'Supprimer cette section' }).click();
  await expect(app.resume.locator('h2')).toHaveCount(0);
  await app.setTemplate('ATS (sobre)');
  await expect(app.resume).not.toContainText('Bénévolat');
});

test('une formation masquée disparaît des deux modèles sans être supprimée', async ({ page, app }) => {
  await app.loadExample();
  const panel = await app.openPanel('education');
  const label = 'Master Communication des organisations — Université Lumière Lyon 2';
  await panel.getByRole('button', { name: `Masquer « ${label} » sur le CV` }).click();
  await expect(panel.getByRole('button', { name: `Afficher « ${label} » sur le CV` })).toBeVisible();
  await expect(panel.locator('.editor-panel-meta')).toContainText('2 formations dont 1 masquée');
  await expect(app.resume).not.toContainText('Master Communication des organisations');
  await expect(app.resume).toContainText('Licence Information-Communication');

  await app.setTemplate('ATS (sobre)');
  await expect(app.resume).not.toContainText('Master Communication des organisations');

  const lib = await app.waitForSaved((l) => l?.cvs[0].data.education.some((e) => e.hidden));
  expect(lib.cvs[0].data.education.map((e) => e.hidden)).toEqual([true, false]);

  await panel.getByRole('button', { name: `Afficher « ${label} » sur le CV` }).click();
  await expect(app.resume).toContainText('Master Communication des organisations');
});

test('une expérience masquée disparaît des deux modèles sans être supprimée', async ({ page, app }) => {
  await app.loadExample();
  const panel = await app.openPanel('experiences');
  const label = 'Chargée de communication — Maison Lumière (réseau de 12 boutiques)';
  await panel.getByRole('button', { name: `Masquer « ${label} » sur le CV` }).click();
  await expect(panel.locator('.editor-panel-meta')).toContainText('3 expériences dont 1 masquée');
  await expect(app.resume).not.toContainText('Maison Lumière');
  await expect(app.resume).toContainText('Agence Hublot');
  await app.setTemplate('ATS (sobre)');
  await expect(app.resume).not.toContainText('Maison Lumière');
  const lib = await app.waitForSaved((l) => l?.cvs[0].data.experiences[0].hidden);
  expect(lib.cvs[0].data.experiences[0].details.length).toBeGreaterThan(0);
});

test('centres d’intérêt sur une ligne ou les uns au-dessus des autres', async ({ page, app }) => {
  await app.loadExample();
  const panel = await app.openPanel('custom:sec_interets');
  const sidebar = app.resume.locator('.sidebar');
  await expect(sidebar.locator('li', { hasText: 'Photographie argentique' })).toBeVisible();
  await panel.getByLabel('Présentation des éléments').selectOption('inline');
  await expect(sidebar).toContainText('Photographie argentique · Course à pied (semi-marathon) · Théâtre amateur');
  await expect(sidebar.locator('li', { hasText: 'Photographie argentique' })).toHaveCount(0);
  await app.setTemplate('ATS (sobre)');
  await expect(app.resume).toContainText('Photographie argentique · Course à pied');
  await app.waitForSaved((l) => l?.cvs[0].data.customSections[0].layout === 'inline');
});

test('un groupe de compétences masqué disparaît des deux modèles sans être supprimé', async ({ page, app }) => {
  await app.loadExample();
  const panel = await app.openPanel('skills');
  await panel.getByRole('button', { name: 'Masquer « Communication » sur le CV' }).click();
  await expect(panel.getByRole('button', { name: 'Afficher « Communication » sur le CV' })).toBeVisible();
  await expect(panel.locator('.editor-panel-meta')).toContainText('dont 4 masquées');
  await expect(app.resume).not.toContainText('Stratégie éditoriale');
  await expect(app.resume).toContainText('Google Analytics');

  await app.setTemplate('ATS (sobre)');
  await expect(app.resume).not.toContainText('Stratégie éditoriale');

  const lib = await app.waitForSaved((l) => l?.cvs[0].data.mainSkills[0].hidden);
  expect(lib.cvs[0].data.mainSkills[0].skills).toContain('Stratégie éditoriale');
});

test('Apparence : en-tête centré et texte justifié dans les deux modèles', async ({ page, app }) => {
  await app.loadExample();
  const align = (selector) => app.resume.locator(selector).first().evaluate((el) => getComputedStyle(el).textAlign);
  expect(await align('h1')).not.toBe('center');
  expect(await align('.exp-details li')).not.toBe('justify');

  await app.toolbarButton('Apparence').click();
  await page.getByRole('radio', { name: 'Centré' }).click();
  await page.getByRole('radio', { name: 'Justifié' }).click();
  await page.keyboard.press('Escape');
  expect(await align('h1')).toBe('center');
  expect(await align('.exp-details li')).toBe('justify');

  await app.setTemplate('ATS (sobre)');
  expect(await align('h1')).toBe('center');
  expect(await align('.ats-detail-list li')).toBe('justify');

  const lib = await app.waitForSaved((l) => l?.cvs[0].settings.textAlign === 'justify');
  expect(lib.cvs[0].settings.headerAlign).toBe('center');
});

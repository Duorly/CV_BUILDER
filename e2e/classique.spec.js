import { test, expect, exampleResume } from './support/fixtures.js';

// Modèle Classique : deuxième modèle en couleur (deux colonnes, imprimé comme le « PDF design »).
// Choisi dans l'Apparence, il s'affiche dans ses couleurs et sa police tant que l'utilisatrice
// n'en a pas choisi d'autres. Impression : e2e/telechargement.spec.js.

test('modèle Classique : colonne foncée, poste en tête de page, liens avec les coordonnées', async ({ page, app }) => {
  await app.loadExample();
  await app.setTemplate('Classique');
  const css = (selector, prop) => app.resume.locator(selector).first().evaluate((el, p) => getComputedStyle(el)[p], prop);

  // Couleurs et police du modèle.
  expect(await app.resume.evaluate((el) => getComputedStyle(el).getPropertyValue('--sidebar-bg').trim())).toBe('#1c472d');
  expect(await css('.sidebar h1', 'color')).toBe('rgb(255, 255, 255)');
  expect(await css(':scope', 'fontFamily')).toMatch(/^"?Open Sans/);
  // Titres de la page : la couleur de la colonne ; filets de la colonne : la couleur principale.
  expect(await css('.cl-main-section > h2', 'color')).toBe('rgb(28, 71, 45)');
  expect(
    await app.resume.locator('.cl-side-section > h2').first().evaluate((el) => getComputedStyle(el, '::after').backgroundColor),
  ).toBe('rgb(49, 164, 84)');

  // Le poste ouvre la colonne principale ; le nom et les coordonnées restent dans la colonne.
  await expect(app.resume.locator('.main-content > :first-child')).toHaveText(exampleResume.personalInfo.title);
  await expect(app.resume.locator('.sidebar')).not.toContainText(exampleResume.personalInfo.title);
  // Les liens suivent les coordonnées, sans titre « Liens ».
  const contact = app.resume.locator('.sidebar .contact-info');
  await expect(contact).toContainText(exampleResume.personalInfo.email);
  await expect(contact.getByRole('link', { name: /^LinkedIn/ })).toHaveAttribute('href', exampleResume.socialLinks[0].url);
  await expect(app.resume.getByRole('heading', { name: 'Liens' })).toHaveCount(0);
  // Mots-clés en texte, dates à droite de l'intitulé.
  const group = exampleResume.mainSkills[0];
  await expect(app.resume.locator('.cl-skill').first()).toHaveText(`${group.category} : ${group.skills.join(', ')}`);
  const row = app.resume.locator('.cl-item-row').first();
  const [titleBox, periodBox] = await Promise.all([row.locator('h3').boundingBox(), row.locator('.cl-period').boundingBox()]);
  expect(periodBox.x).toBeGreaterThan(titleBox.x + titleBox.width);
  expect(Math.abs(periodBox.y - titleBox.y)).toBeLessThan(4);

  const lib = await app.waitForSaved((l) => l?.cvs[0].settings.designStyle === 'classic');
  expect(lib.cvs[0].settings).toMatchObject({
    template: 'design',
    primaryColor: '#31a454',
    sidebarBg: '#1c472d',
    sidebarTextColor: '#ffffff',
    fontFamily: 'opensans',
  });
});

test('modèle Classique : « Couleurs par défaut » remet les siennes ; des couleurs choisies restent en changeant de modèle', async ({ page, app }) => {
  await app.loadExample();
  await app.setTemplate('Classique');
  await app.toolbarButton('Apparence').click();
  const panel = page.getByRole('complementary', { name: 'Apparence' });
  const reset = panel.getByRole('button', { name: 'Couleurs par défaut' });
  // Couleurs du modèle : lisibles telles quelles, rien à ajuster ni à remettre.
  await expect(panel.locator('.ap-note')).toHaveCount(0);
  await expect(reset).toHaveCount(0);
  await expect(panel.getByText('les titres de la page prennent sa couleur')).toBeVisible();

  await panel.getByLabel('Fond de la colonne').fill('#1e3a8a');
  await expect(app.resume.locator('.cl-title')).toHaveCSS('color', 'rgb(30, 58, 138)');
  await reset.click();
  await expect(panel.getByLabel('Fond de la colonne')).toHaveValue('#1c472d');
  await expect(reset).toHaveCount(0);

  // Couleurs restées celles du modèle : Design reprend les siennes, et sa police.
  await panel.getByRole('radio', { name: 'Design', exact: true }).click();
  await expect(app.resume).toHaveClass(/resume-design/);
  await expect(panel.getByLabel('Fond de la colonne')).toHaveValue('#f9fafb');
  await expect(panel.getByLabel('Police', { exact: true })).toHaveValue('inter');

  // Une couleur choisie : les quatre couleurs restent en passant à Classique ; sa police, elle, s'applique.
  await panel.getByLabel('Couleur principale').fill('#be123c');
  await panel.getByRole('radio', { name: 'Classique', exact: true }).click();
  await expect(app.resume).toHaveClass(/resume-classic/);
  await expect(panel.getByLabel('Couleur principale')).toHaveValue('#be123c');
  await expect(panel.getByLabel('Fond de la colonne')).toHaveValue('#f9fafb');
  await expect(panel.getByLabel('Police', { exact: true })).toHaveValue('opensans');
  // Colonne claire : les titres de la page prennent la couleur principale.
  await expect(app.resume.locator('.cl-title')).toHaveCSS('color', 'rgb(190, 18, 60)');

  // Le modèle ATS garde le modèle en couleur choisi : revenir à Classique ne change plus rien.
  await panel.getByRole('radio', { name: 'ATS (sobre)' }).click();
  await panel.getByRole('radio', { name: 'Classique', exact: true }).click();
  await expect(app.resume).toHaveClass(/resume-classic/);
  // Attendre l'état final (et non un enregistrement antérieur où Classique était déjà affiché).
  const lib = await app.waitForSaved((l) => {
    const s = l?.cvs[0].settings;
    return s?.designStyle === 'classic' && s.template === 'design' && s.primaryColor === '#be123c';
  });
  expect(lib.cvs[0].settings).toMatchObject({ primaryColor: '#be123c', sidebarBg: '#f9fafb', fontFamily: 'opensans' });
});

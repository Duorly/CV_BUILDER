import { test, expect, exampleResume } from './support/fixtures.js';

// Modèle Expert : troisième modèle en couleur, pour un long parcours (une colonne pleine largeur,
// dates dans la marge), imprimé comme le « PDF design ». Impression : e2e/telechargement.spec.js.

test('modèle Expert : en-tête pleine largeur avec coordonnées et liens, dates dans la marge', async ({ page, app }) => {
  await app.loadExample();
  await app.setTemplate('Expert');

  // Couleur du modèle (bleu marine) ; pas de colonne latérale.
  expect(await app.resume.evaluate((el) => getComputedStyle(el).getPropertyValue('--primary-color').trim())).toBe('#1e3a5f');
  await expect(app.resume.locator('.ex-section > h2').first()).toHaveCSS('color', 'rgb(30, 58, 95)');
  await expect(app.resume.locator('.sidebar')).toHaveCount(0);

  // En-tête : poste, coordonnées et liens ensemble, sans titre « Liens ».
  const header = app.resume.locator('.ex-header');
  await expect(header).toContainText(exampleResume.personalInfo.title);
  await expect(header).toContainText(exampleResume.personalInfo.email);
  await expect(header.getByRole('link', { name: /^LinkedIn/ })).toHaveAttribute('href', exampleResume.socialLinks[0].url);
  await expect(app.resume.getByRole('heading', { name: 'Liens' })).toHaveCount(0);

  // Dates dans la marge, à gauche de l'intitulé et sur sa ligne ; tous les intitulés alignés.
  const entry = app.resume.locator('.ex-section-experiences .ex-entry').first();
  const [periodBox, titleBox] = await Promise.all([entry.locator('.ex-period').boundingBox(), entry.locator('h3').boundingBox()]);
  expect(periodBox.x + periodBox.width).toBeLessThan(titleBox.x);
  expect(Math.abs(periodBox.y - titleBox.y)).toBeLessThan(4);
  const lefts = await app.resume
    .locator('.ex-section-experiences h3, .ex-section-education h3')
    .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().left)));
  expect(new Set(lefts).size).toBe(1);

  const lib = await app.waitForSaved((l) => l?.cvs[0].settings.designStyle === 'expert');
  expect(lib.cvs[0].settings).toMatchObject({ template: 'design', primaryColor: '#1e3a5f', fontFamily: 'inter' });

  // Apparence : tous les modèles tiennent dans le panneau ; en-tête coloré en option.
  await app.toolbarButton('Apparence').click();
  const panel = page.getByRole('complementary', { name: 'Apparence' });
  const paneBox = await panel.boundingBox();
  for (const name of ['Design', 'Classique', 'Focus', 'Expert', 'ATS (sobre)']) {
    const box = await panel.getByRole('radio', { name, exact: true }).boundingBox();
    expect(box.x + box.width, name).toBeLessThanOrEqual(paneBox.x + paneBox.width);
  }
  await expect(panel.getByText('Le modèle Expert n’a pas de colonne latérale')).toBeVisible();
  await panel.getByRole('radio', { name: 'Coloré' }).click();
  await expect(header).toHaveCSS('background-color', 'rgb(30, 58, 95)');
  await expect(header.locator('h1')).toHaveCSS('color', 'rgb(255, 255, 255)');
});

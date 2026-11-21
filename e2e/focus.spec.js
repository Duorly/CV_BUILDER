import { test, expect, exampleResume } from './support/fixtures.js';

// Modèle Focus : deux colonnes sous un en-tête pleine largeur ; la formation passe dans la colonne
// pour laisser le corps de la page à l'expérience. Impression : e2e/telechargement.spec.js.

test('modèle Focus : la formation dans la colonne, les expériences seules dans le corps de la page', async ({ page, app }) => {
  await app.loadExample();
  await app.setTemplate('Focus');

  // Couleurs du modèle : vert d'eau, colonne teintée.
  const variable = (name) => app.resume.evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name);
  expect(await variable('--primary-color')).toBe('#0f766e');
  expect(await variable('--sidebar-bg')).toBe('#eef6f5');

  // En-tête au-dessus des deux colonnes, sur toute la largeur.
  const header = app.resume.locator('.fo-header');
  await expect(header).toContainText(exampleResume.personalInfo.title);
  await expect(header.getByRole('link', { name: /^LinkedIn/ })).toHaveAttribute('href', exampleResume.socialLinks[0].url);
  const [headerBox, sidebarBox, mainBox] = await Promise.all([
    header.boundingBox(),
    app.resume.locator('.sidebar').boundingBox(),
    app.resume.locator('.main-content').boundingBox(),
  ]);
  expect(headerBox.width).toBeGreaterThan(sidebarBox.width + mainBox.width - 2);
  expect(sidebarBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 1);

  // Formation à gauche ; le corps de la page : profil et expériences.
  const sidebar = app.resume.locator('.sidebar');
  const main = app.resume.locator('.main-content');
  await expect(sidebar.getByRole('heading', { name: 'Formation', exact: true })).toBeVisible();
  await expect(sidebar).toContainText(exampleResume.education[0].title);
  await expect(main.getByRole('heading', { name: 'Formation', exact: true })).toHaveCount(0);
  await expect(main.getByRole('heading', { name: 'Expériences professionnelles' })).toBeVisible();
  await expect(main).toContainText(exampleResume.experiences[0].company);

  // L'éditeur indique la colonne de la formation selon le modèle affiché.
  const badge = app.panel('education').locator('.editor-column-badge');
  await expect(badge).toHaveText('colonne latérale');
  await app.setTemplate('Design');
  await expect(badge).toHaveText('colonne principale');

  const lib = await app.waitForSaved((l) => l?.cvs[0].settings.designStyle === 'modern');
  expect(lib.cvs[0].settings.template).toBe('design');
});

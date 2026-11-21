import { test, expect, exampleResume } from './support/fixtures.js';

// Choix du modèle (Apparence) : chaque modèle est présenté avec la miniature de la première page
// du CV dans ce modèle, à jour de la saisie ; un clic sur la carte l'affiche.

const CARDS = [
  ['Design', 'resume-design'],
  ['Classique', 'resume-classic'],
  ['Focus', 'resume-focus'],
  ['Expert', 'resume-expert'],
  ['ATS (sobre)', 'resume-ats-template'],
];

test('choix du modèle : une miniature du CV dans chaque modèle, à jour, cliquable', async ({ page, app }) => {
  await app.loadExample();
  await app.toolbarButton('Apparence').click();
  const panel = page.getByRole('complementary', { name: 'Apparence' });
  const group = panel.getByRole('radiogroup', { name: 'Modèle affiché' });
  await expect(group.getByRole('radio')).toHaveCount(5);
  const card = (name) => group.locator('.ap-tpl').filter({ has: page.getByRole('radio', { name, exact: true }) });

  // Chaque miniature montre le CV dans son modèle, avec les couleurs qu'il aurait une fois choisi.
  for (const [name, className] of CARDS) {
    const thumb = card(name).locator('.ap-tpl-thumb');
    await expect(thumb.locator(`.${className}`), name).toHaveCount(1);
    await expect(thumb, name).toContainText(exampleResume.personalInfo.name);
    await expect(thumb, name).toHaveAttribute('aria-hidden', 'true');
    await expect(thumb, name).toHaveAttribute('inert', '');
  }
  expect(
    await card('Classique').locator('.resume-classic').evaluate((el) => getComputedStyle(el).getPropertyValue('--sidebar-bg').trim()),
  ).toBe('#1c472d');
  // Les miniatures ne remplacent pas l'aperçu : un seul CV porte l'identifiant du document.
  await expect(page.locator('#resume-root')).toHaveCount(1);
  await expect(page.getByRole('radio', { name: 'Design', exact: true })).toHaveAttribute('aria-checked', 'true');

  // La saisie se voit aussi dans les miniatures.
  await page.locator('#ed-pi-title').fill('Responsable marketing');
  for (const [name] of CARDS) await expect(card(name).locator('.ap-tpl-thumb'), name).toContainText('Responsable marketing');

  // Un clic sur la miniature choisit le modèle.
  const box = await card('Expert').locator('.ap-tpl-thumb').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 3);
  await expect(app.resume).toHaveClass(/resume-expert/);
  await expect(page.getByRole('radio', { name: 'Expert', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(card('Expert')).toHaveClass(/is-active/);
  // Au clavier : chaque modèle est un bouton radio.
  await page.getByRole('radio', { name: 'ATS (sobre)' }).focus();
  await page.keyboard.press('Enter');
  await expect(app.resume).toHaveClass(/resume-ats-template/);
});

test('choix du modèle : un CV encore vide est montré avec le CV d’exemple', async ({ page, app }) => {
  await app.startBlank();
  await app.toolbarButton('Apparence').click();
  const panel = page.getByRole('complementary', { name: 'Apparence' });
  await expect(panel.getByText('Miniatures montrées avec le CV d’exemple')).toBeVisible();
  await expect(panel.locator('.ap-tpl-thumb').first()).toContainText(exampleResume.personalInfo.name);
  // Le CV, lui, reste vide.
  await expect(app.resume).not.toContainText(exampleResume.personalInfo.name);
});

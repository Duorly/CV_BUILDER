import { test, expect } from './support/fixtures.js';

// c) Annuler / rétablir : boutons de la barre d'outils et raccourcis clavier.

// Deux saisies séparées de plus de 700 ms forment deux étapes d'annulation distinctes.
const PAUSE_BETWEEN_STEPS = 800;

test('les boutons Annuler et Rétablir défont et refont les modifications', async ({ page, app }) => {
  await app.startBlank();
  const undo = app.toolbarButton('Annuler');
  const redo = app.toolbarButton('Rétablir');
  const name = page.locator('#ed-pi-name');
  const title = page.locator('#ed-pi-title');
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();

  await name.fill('Camille Essai');
  await page.waitForTimeout(PAUSE_BETWEEN_STEPS);
  await title.fill('Vendeuse conseil');
  await expect(app.resume.locator('.profile-title')).toHaveText('Vendeuse conseil');

  await undo.click();
  await expect(title).toHaveValue('');
  await expect(name).toHaveValue('Camille Essai');
  await expect(app.resume.locator('.profile-title')).toHaveCount(0);
  await expect(redo).toBeEnabled();

  await undo.click();
  await expect(name).toHaveValue('');
  await expect(undo).toBeDisabled();

  await redo.click();
  await redo.click();
  await expect(name).toHaveValue('Camille Essai');
  await expect(title).toHaveValue('Vendeuse conseil');
  await expect(redo).toBeDisabled();
  await expect(app.resume.locator('h1')).toHaveText('Camille Essai');
});

test('Ctrl/Cmd+Z, Ctrl/Cmd+Maj+Z et Ctrl+Y, y compris avec le curseur dans un champ', async ({ page, app }) => {
  await app.startBlank();
  const name = page.locator('#ed-pi-name');
  const title = page.locator('#ed-pi-title');
  await name.fill('Camille Essai');
  await page.waitForTimeout(PAUSE_BETWEEN_STEPS);
  await title.fill('Vendeuse conseil');

  // Le curseur est dans « Titre visé » : le raccourci annule quand même dans le CV.
  await title.focus();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(title).toHaveValue('');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(title).toHaveValue('Vendeuse conseil');

  await title.blur();
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Meta+z');
  await expect(name).toHaveValue('');
  await expect(title).toHaveValue('');
  await page.keyboard.press('Control+y');
  await expect(name).toHaveValue('Camille Essai');
  await page.keyboard.press('Control+Shift+z');
  await expect(title).toHaveValue('Vendeuse conseil');
  await expect(app.resume.locator('.profile-title')).toHaveText('Vendeuse conseil');
});

test('une expérience supprimée revient avec Ctrl/Cmd+Z', async ({ page, app }) => {
  await app.startBlank();
  const exp = await app.openPanel('experiences');
  await exp.getByRole('button', { name: 'Ajouter une expérience' }).click();
  await exp.getByLabel('Intitulé du poste').fill('Hôtesse d’accueil');
  await exp.getByLabel('Entreprise ou structure').fill('Salon du livre');
  await expect(app.resume.locator('.experience-item h3')).toHaveText('Hôtesse d’accueil');

  // La suppression d'un élément rempli demande une confirmation.
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('Supprimer « Hôtesse d’accueil — Salon du livre »');
    await dialog.accept();
  });
  await exp.getByRole('button', { name: 'Supprimer « Hôtesse d’accueil — Salon du livre »' }).click();
  await expect(app.resume.locator('.experience-item')).toHaveCount(0);
  await expect(exp.locator('.editor-card')).toHaveCount(0);

  await page.keyboard.press('ControlOrMeta+z');
  await expect(app.resume.locator('.experience-item h3')).toHaveText('Hôtesse d’accueil');
  await expect(exp.locator('.editor-card')).toHaveCount(1);
  await app.waitForSaved((lib) => lib?.cvs[0].data.experiences.length === 1);

  // Annuler la confirmation garde l'élément.
  page.once('dialog', (dialog) => dialog.dismiss());
  await exp.getByRole('button', { name: /^Supprimer « Hôtesse/ }).click();
  await expect(exp.locator('.editor-card')).toHaveCount(1);
});

test('dans la vue Lettre, Ctrl/Cmd+Z ne défait pas en silence une modification du CV', async ({ page, app }) => {
  await app.loadExample();
  const title = page.locator('#ed-pi-title');
  await title.fill('Titre modifié CV');
  await page.waitForTimeout(PAUSE_BETWEEN_STEPS);

  await app.view('Lettre');
  const subject = page.locator('.letter-editor').getByRole('textbox', { name: 'Objet', exact: true });
  await subject.fill('Candidature');
  await subject.focus();

  // 1er Ctrl+Z : l'objet de la lettre, visible ici.
  await page.keyboard.press('ControlOrMeta+z');
  await expect(subject).toHaveValue('');
  await expect(page.locator('.letter-editor')).toBeVisible();

  // 2e Ctrl+Z : il concerne le CV ; la vue CV s'affiche pour le montrer, avec un message.
  await page.keyboard.press('ControlOrMeta+z');
  await expect(app.toolbar.getByRole('tab', { name: 'CV', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(title).toHaveValue('Chargée de communication et marketing digital');
  await app.expectToast('Modification du CV annulée');

  // Rétablir depuis la vue CV, puis la modification de la lettre : retour à la vue Lettre.
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(title).toHaveValue('Titre modifié CV');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(app.toolbar.getByRole('tab', { name: 'Lettre', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(subject).toHaveValue('Candidature');
  await app.expectToast('Modification de la lettre rétablie');
});

// Une étiquette en cours de saisie vit dans le champ, pas encore dans l'historique du CV.
async function skillDraft(page, app) {
  const skills = await app.openPanel('skills');
  await skills.getByRole('button', { name: 'Ajouter un groupe de compétences' }).click();
  const input = skills.locator('input.editor-tag-input');
  await input.pressSequentially('Excel');
  await input.press('Enter');
  await expect(skills.locator('.editor-tag-text')).toHaveText(['Excel']);
  await page.waitForTimeout(PAUSE_BETWEEN_STEPS);
  await input.pressSequentially('Wor');
  return { input, tags: skills.locator('.editor-tag-text') };
}

test('champ à étiquettes : Ctrl/Cmd+Z efface d’abord la frappe en cours, pas l’étiquette précédente', async ({ page, app }) => {
  await app.startBlank();
  const { input, tags } = await skillDraft(page, app);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(input).toHaveValue('');
  await expect(tags).toHaveText(['Excel']);
  // Champ vide : le raccourci reprend l'historique du CV.
  await page.keyboard.press('ControlOrMeta+z');
  await expect(tags).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(tags).toHaveText(['Excel']);
});

test('bouton Annuler pendant la saisie d’une étiquette : la saisie reste en cours, et Rétablir disponible', async ({ page, app }) => {
  await app.startBlank();
  const { input, tags } = await skillDraft(page, app);
  await app.toolbarButton('Annuler').click();
  await expect(tags).toHaveCount(0);
  // Le clic n'a pas validé « Wor » (qui aurait vidé Rétablir) : le curseur est toujours dans le champ.
  await expect(input).toHaveValue('Wor');
  await expect(input).toBeFocused();
  await expect(app.toolbarButton('Rétablir')).toBeEnabled();
  await app.toolbarButton('Rétablir').click();
  await expect(tags).toHaveText(['Excel']);
  await expect(input).toHaveValue('Wor');
  // En quittant le champ, la saisie est validée comme d'habitude.
  await input.press('Enter');
  await expect(tags).toHaveText(['Excel', 'Wor']);
});

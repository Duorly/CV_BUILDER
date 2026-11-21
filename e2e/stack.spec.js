import { test, expect } from './support/fixtures.js';

// Stack technique d'une expérience : bloc facultatif, technologies choisies parmi des suggestions
// (celles déjà dans le CV, puis un catalogue filtré au fil de la frappe) ou saisies librement,
// affichées sur les deux modèles et gardées après rechargement.

test('choisir la stack technique d’une expérience parmi les suggestions, ou la saisir', async ({ page, app }) => {
  await app.loadExample();
  const exp = await app.openPanel('experiences');
  await exp.locator('.editor-card-toggle').first().click();
  const card = exp.locator('.editor-card').first();

  await card.getByRole('button', { name: 'Stack technique', exact: true }).click();
  const input = card.getByRole('textbox', { name: 'Stack technique', exact: true });
  await expect(input).toBeFocused();

  // Champ vide : les technologies déjà dans le CV (groupe « Outils », technologies connues), pas les qualités.
  const suggestions = card.getByRole('group', { name: 'Suggestions pour Stack technique' });
  await expect(suggestions).toContainText('Déjà dans votre CV');
  await expect(suggestions.getByRole('button', { name: 'Ajouter « Canva »' })).toBeVisible();
  await expect(suggestions.getByRole('button', { name: 'Ajouter « Google Analytics »' })).toBeVisible();
  await expect(suggestions.getByRole('button', { name: 'Ajouter « Organisation »' })).toHaveCount(0);

  // Un clic ajoute la suggestion, qui disparaît de la liste ; le curseur reste dans le champ.
  await suggestions.getByRole('button', { name: 'Ajouter « Canva »' }).click();
  const tags = card.getByRole('list', { name: 'Stack technique' });
  await expect(tags.locator('.editor-tag-text')).toHaveText(['Canva']);
  await expect(suggestions.getByRole('button', { name: 'Ajouter « Canva »' })).toHaveCount(0);
  await expect(input).toBeFocused();

  // Pendant la frappe : le catalogue filtré ; la suggestion remplace le début saisi.
  await input.pressSequentially('rea');
  await expect(suggestions).toContainText('Suggestions');
  await suggestions.getByRole('button', { name: 'Ajouter « React »', exact: true }).click();
  await expect(input).toHaveValue('');

  // Au clavier : Tab mène aux suggestions sans valider « type » tel quel.
  await input.pressSequentially('type');
  await page.keyboard.press('Tab');
  await expect(suggestions.getByRole('button', { name: 'Ajouter « TypeScript »' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(input).toBeFocused();

  // Saisie libre : une technologie absente du catalogue.
  await input.fill('Ktor');
  await input.press('Enter');
  await expect(tags.locator('.editor-tag-text')).toHaveText(['Canva', 'React', 'TypeScript', 'Ktor']);

  // Aperçu : modèle design (étiquettes) puis ATS (une ligne).
  const stack = app.resume.locator('.experience-item').first().locator('.exp-stack');
  await expect(stack.locator('.exp-stack-label')).toHaveText('Stack technique :');
  await expect(stack.locator('.tag')).toHaveText(['Canva', 'React', 'TypeScript', 'Ktor']);
  await app.setTemplate('ATS (sobre)');
  await expect(app.resume.locator('.ats-item').first()).toContainText('Stack technique : Canva, React, TypeScript, Ktor');

  // Une autre expérience propose d'abord ce qui a déjà servi.
  await exp.locator('.editor-card-toggle').nth(1).click();
  const second = exp.locator('.editor-card').nth(1);
  await second.getByRole('button', { name: 'Stack technique', exact: true }).click();
  const secondSuggestions = second.getByRole('group', { name: 'Suggestions pour Stack technique' });
  await expect(secondSuggestions.getByRole('button').first()).toHaveAccessibleName('Ajouter « Canva »');
  await expect(secondSuggestions.getByRole('button', { name: 'Ajouter « Ktor »' })).toBeVisible();

  // Gardée après rechargement.
  await app.waitForSaved((lib) => lib?.cvs[0].data.experiences[0].stack.length === 4);
  await page.reload();
  await expect(app.resume.locator('.ats-item').first()).toContainText('Stack technique : Canva, React, TypeScript, Ktor');

  // « Retirer ce bloc » vide la stack ; Ctrl/Cmd+Z la rétablit.
  const exp2 = await app.openPanel('experiences');
  await exp2.locator('.editor-card-toggle').first().click();
  await exp2.locator('.editor-card').first().getByRole('button', { name: 'Retirer ce bloc : Stack technique' }).click();
  await expect(app.resume).not.toContainText('Stack technique');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(app.resume.locator('.ats-item').first()).toContainText('Stack technique : Canva, React, TypeScript, Ktor');
});

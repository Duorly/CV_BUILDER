import { test, expect } from './support/fixtures.js';

// Poignée entre l'éditeur et l'aperçu (écrans larges) : on élargit ou réduit l'éditeur à la
// souris ou au clavier, la largeur est gardée d'une visite à l'autre, et l'aperçu garde sa place.

const WIDTH_KEY = 'cv-builder:editor-width';
const MIN_EDITOR = 360;
const MIN_PREVIEW = 360;

const widthOf = async (locator) => (await locator.boundingBox()).width;

test('glisser la poignée élargit l’éditeur, la largeur est gardée, double-clic pour revenir', async ({ page, app }) => {
  await app.loadExample();
  const editor = page.locator('.editor-pane');
  const preview = page.locator('.preview-pane');
  const handle = page.getByRole('separator', { name: 'Largeur du panneau d’édition' });
  const zoom = preview.locator('.preview-zoom-value');

  await expect(handle).toBeVisible();
  await expect(handle).toHaveAttribute('aria-valuenow', '460');
  expect(Math.round(await widthOf(editor))).toBe(460);
  // À 1366 px, l'aperçu tient en taille réelle à côté de l'éditeur par défaut.
  await expect(zoom).toHaveText('100 %');

  // Glisser de 200 px vers la droite.
  const box = await handle.boundingBox();
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 100, y, { steps: 5 });
  await page.mouse.move(box.x + box.width / 2 + 200, y, { steps: 5 });
  await page.mouse.up();

  await expect(handle).toHaveAttribute('aria-valuenow', '660');
  expect(Math.round(await widthOf(editor))).toBe(660);
  // L'aperçu, plus étroit, est réduit pour tenir dans sa colonne.
  await expect(zoom).not.toHaveText('100 %');
  expect(await page.evaluate((key) => localStorage.getItem(key), WIDTH_KEY)).toBe('660');
  // Pas de texte sélectionné au passage de la souris.
  expect(await page.evaluate(() => String(getSelection()))).toBe('');

  // Gardée après rechargement, et la même dans la vue Lettre.
  await page.reload();
  await expect(app.resume).toBeVisible();
  expect(Math.round(await widthOf(editor))).toBe(660);
  await app.view('Lettre');
  await expect(page.locator('.letter-editor')).toBeVisible();
  expect(Math.round(await widthOf(editor))).toBe(660);
  await app.view('CV');

  // Double-clic : largeur par défaut, préférence effacée.
  await handle.dblclick();
  await expect(handle).toHaveAttribute('aria-valuenow', '460');
  expect(Math.round(await widthOf(editor))).toBe(460);
  await expect(zoom).toHaveText('100 %');
  expect(await page.evaluate((key) => localStorage.getItem(key), WIDTH_KEY)).toBeNull();
});

test('l’aperçu garde sa place : la poignée ne l’écrase pas, même en glissant hors de la fenêtre', async ({ page, app }) => {
  await app.loadExample();
  const preview = page.locator('.preview-pane');
  const handle = page.getByRole('separator', { name: 'Largeur du panneau d’édition' });

  const box = await handle.boundingBox();
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(1360, y, { steps: 10 });
  await page.mouse.up();
  expect(await widthOf(preview)).toBeGreaterThanOrEqual(MIN_PREVIEW);
  expect(await app.horizontalOverflow()).toBeLessThanOrEqual(0);

  // Fenêtre réduite ensuite : l'éditeur se resserre, l'aperçu reste lisible…
  await page.setViewportSize({ width: 1100, height: 900 });
  expect(await widthOf(preview)).toBeGreaterThanOrEqual(MIN_PREVIEW);
  expect(await app.horizontalOverflow()).toBeLessThanOrEqual(0);
  // … même avec le panneau Apparence ouvert à droite.
  await app.toolbarButton('Apparence').click();
  await expect(page.getByRole('complementary', { name: 'Apparence' })).toBeVisible();
  expect(await widthOf(preview)).toBeGreaterThanOrEqual(MIN_PREVIEW);
  expect(await widthOf(page.locator('.editor-pane'))).toBeGreaterThanOrEqual(360);
  expect(await app.horizontalOverflow()).toBeLessThanOrEqual(0);
  await page.keyboard.press('Escape');

  // Sous 1100 px : onglets Éditer / Aperçu, plus de poignée.
  await page.setViewportSize({ width: 1000, height: 900 });
  await expect(handle).toBeHidden();
  await expect(page.locator('.pane-switch')).toBeVisible();
  expect(await app.horizontalOverflow()).toBeLessThanOrEqual(0);
});

test('au clavier : flèches, Maj + flèches, Début et Fin', async ({ page, app }) => {
  await app.loadExample();
  const editor = page.locator('.editor-pane');
  const handle = page.getByRole('separator', { name: 'Largeur du panneau d’édition' });

  await handle.focus();
  await page.keyboard.press('ArrowRight');
  await expect(handle).toHaveAttribute('aria-valuenow', '484');
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(handle).toHaveAttribute('aria-valuenow', '388');
  await page.keyboard.press('Home');
  await expect(handle).toHaveAttribute('aria-valuenow', String(MIN_EDITOR));
  expect(Math.round(await widthOf(editor))).toBe(MIN_EDITOR);

  await page.keyboard.press('End');
  const max = Number(await handle.getAttribute('aria-valuemax'));
  await expect(handle).toHaveAttribute('aria-valuenow', String(max));
  expect(await widthOf(page.locator('.preview-pane'))).toBeGreaterThanOrEqual(MIN_PREVIEW);
  expect(await page.evaluate((key) => localStorage.getItem(key), 'cv-builder:editor-width')).toBe(String(max));
});

test('panneau Apparence à droite de l’aperçu : ouvert depuis la barre d’outils, redimensionnable, retenu', async ({ page, app }) => {
  await app.loadExample();
  const button = app.toolbarButton('Apparence');
  const pane = page.getByRole('complementary', { name: 'Apparence' });
  const preview = page.locator('.preview-pane');
  await expect(pane).toHaveCount(0);
  await expect(button).toHaveAttribute('aria-expanded', 'false');

  // Ouvert : à droite de l'aperçu, le focus y entre ; les réglages s'appliquent sans le refermer.
  await button.click();
  await expect(pane).toBeVisible();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(pane).toBeFocused();
  const [paneBox, previewBox] = await Promise.all([pane.boundingBox(), preview.boundingBox()]);
  expect(paneBox.x).toBeGreaterThan(previewBox.x + previewBox.width - 1);
  expect(Math.round(paneBox.width)).toBe(320);
  await pane.getByRole('radio', { name: 'ATS (sobre)' }).click();
  await pane.getByRole('radio', { name: 'Centré' }).click();
  await expect(app.resume).toHaveClass(/resume-ats-template/);
  await expect(pane).toBeVisible();

  // Poignée : glisser vers la gauche élargit le panneau ; l'aperçu garde sa largeur minimale.
  const handle = page.getByRole('separator', { name: 'Largeur du panneau Apparence' });
  const box = await handle.boundingBox();
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 80, y, { steps: 5 });
  await page.mouse.up();
  await expect(handle).toHaveAttribute('aria-valuenow', '400');
  await handle.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(handle).toHaveAttribute('aria-valuenow', '424');
  await page.keyboard.press('End');
  expect(Number(await handle.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(640);
  expect((await preview.boundingBox()).width).toBeGreaterThanOrEqual(360);
  await page.keyboard.press('Home');
  await expect(handle).toHaveAttribute('aria-valuenow', '280');
  expect(await app.horizontalOverflow()).toBeLessThanOrEqual(0);

  // Ouvert et largeur retenus après rechargement.
  await page.reload();
  await expect(pane).toBeVisible();
  expect(Math.round((await pane.boundingBox()).width)).toBe(280);

  // Échap le ferme et rend le focus au bouton ; la croix aussi.
  await pane.getByRole('radio', { name: 'Design' }).click();
  await page.keyboard.press('Escape');
  await expect(pane).toHaveCount(0);
  await expect(button).toBeFocused();
  await button.click();
  await pane.getByRole('button', { name: 'Fermer le panneau Apparence' }).click();
  await expect(pane).toHaveCount(0);
  await page.reload();
  await expect(app.resume).toBeVisible();
  await expect(pane).toHaveCount(0);
});

test('écran étroit : le panneau Apparence glisse par-dessus le contenu', async ({ page, app }) => {
  await page.setViewportSize({ width: 800, height: 1000 });
  await app.loadExample();
  await app.toolbarButton('Apparence').click();
  const pane = page.getByRole('complementary', { name: 'Apparence' });
  await expect(pane).toBeVisible();
  await expect(page.getByRole('separator', { name: 'Largeur du panneau Apparence' })).toBeHidden();
  const box = await pane.boundingBox();
  expect(box.x + box.width).toBeLessThanOrEqual(800);
  expect(box.width).toBeLessThanOrEqual(360);
  expect(await app.horizontalOverflow()).toBeLessThanOrEqual(0);
  await pane.getByRole('radio', { name: 'Liste à puces' }).click();
  await page.keyboard.press('Escape');
  await expect(pane).toHaveCount(0);
});

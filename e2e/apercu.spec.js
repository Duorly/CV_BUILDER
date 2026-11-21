import { test, expect } from './support/fixtures.js';

// Zoom de l'aperçu : ajusté à sa colonne par défaut, − / + par paliers, « Taille réelle » et
// « Adapter ». Préférence de ce navigateur : gardée au rechargement, sans effet sur le CV.

const ZOOM_KEY = 'cv-builder:preview-zoom';

test('zoom de l’aperçu : taille réelle, paliers, retour à l’ajustement, gardé au rechargement', async ({ page, app }) => {
  await app.loadExample();
  const preview = page.locator('.preview-pane');
  const zoom = preview.getByRole('group', { name: 'Zoom de l’aperçu' });
  const value = zoom.locator('.preview-zoom-value');
  const percent = async () => Number((await value.textContent()).replace(/\D/g, ''));

  // Éditeur élargi : l'aperçu est réduit pour tenir dans sa colonne.
  await page.getByRole('separator', { name: 'Largeur du panneau d’édition' }).focus();
  await page.keyboard.press('End');
  await expect(value).not.toHaveText('100 %');
  const fit = await percent();
  expect(fit).toBeLessThan(100);
  expect(await preview.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
  await expect(zoom.getByRole('button', { name: 'Adapter' })).toHaveCount(0);

  // Taille réelle : le document dépasse, on le fait défiler ; il part du bord gauche, sans rien cacher.
  await zoom.getByRole('button', { name: 'Taille réelle' }).click();
  await expect(value).toHaveText('100 %');
  expect(await preview.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeGreaterThan(0);
  const paneBox = await preview.boundingBox();
  expect((await app.resume.boundingBox()).x).toBeGreaterThanOrEqual(paneBox.x);
  // La barre de l'aperçu reste en place pendant le défilement horizontal.
  await preview.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
  await expect(zoom.getByRole('button', { name: 'Adapter' })).toBeInViewport();
  expect(await app.horizontalOverflow()).toBeLessThanOrEqual(0);

  // Paliers.
  await zoom.getByRole('button', { name: 'Agrandir l’aperçu' }).click();
  await expect(value).toHaveText('110 %');
  await zoom.getByRole('button', { name: 'Réduire l’aperçu' }).click();
  await zoom.getByRole('button', { name: 'Réduire l’aperçu' }).click();
  await expect(value).toHaveText('90 %');
  expect(await page.evaluate((key) => localStorage.getItem(key), ZOOM_KEY)).toBe('0.9');

  // Gardé au rechargement, et dans la vue Lettre.
  await page.reload();
  await expect(app.resume).toBeVisible();
  await expect(value).toHaveText('90 %');
  await app.view('Lettre');
  await expect(value).toHaveText('90 %');
  await app.view('CV');

  // Adapter : de nouveau ajusté à la colonne, préférence effacée.
  await zoom.getByRole('button', { name: 'Adapter' }).click();
  await expect(value).toHaveText(`${fit} %`);
  expect(await page.evaluate((key) => localStorage.getItem(key), ZOOM_KEY)).toBeNull();

  // Aperçu ajusté déjà plus petit que le plus petit palier (50 %) : « Réduire » est désactivé,
  // « Agrandir » passe à 50 %.
  expect(fit).toBeLessThan(50);
  await expect(zoom.getByRole('button', { name: 'Réduire l’aperçu' })).toBeDisabled();
  await zoom.getByRole('button', { name: 'Agrandir l’aperçu' }).click();
  await expect(value).toHaveText('50 %');
  await expect(zoom.getByRole('button', { name: 'Réduire l’aperçu' })).toBeDisabled();

  // Le zoom ne touche ni le CV ni ses réglages.
  const lib = await app.waitForSaved((l) => Boolean(l));
  expect(lib.cvs[0].settings.fontScale).toBe(1);
});

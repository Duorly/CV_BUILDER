import { test, expect } from './support/fixtures.js';

// d) Photo : ajout d'une image générée, affichage, masquage, puis « Retirer la photo ».

test('une photo ajoutée s’affiche recadrée, puis disparaît complètement une fois retirée', async ({ page, app }) => {
  await app.startBlank();
  await page.locator('#ed-pi-name').fill('Inès Garnier');
  const previewPhotos = page.locator('.preview-pane img');
  await expect(previewPhotos).toHaveCount(0);

  // Ajout par le bouton « Choisir une photo » (sélecteur de fichier du système).
  const chooser = page.waitForEvent('filechooser');
  await expect(page.locator('#ed-photo-pick')).toHaveText('Choisir une photo');
  await page.locator('#ed-photo-pick').click();
  await (await chooser).setFiles(await app.generatedPng({ width: 600, height: 400 }));

  const photo = app.resume.locator('.profile-img img');
  await expect(photo).toBeVisible();
  await expect(photo).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
  await expect(photo).toHaveAttribute('alt', 'Photo de Inès Garnier');
  // Recadrée en carré et réduite (400 × 400), quelle que soit l'image d'origine.
  const size = await photo.evaluate((img) => [img.naturalWidth, img.naturalHeight]);
  expect(size).toEqual([400, 400]);
  await expect(page.locator('.photo-preview-img')).toBeVisible();
  await expect(page.locator('#ed-photo-pick')).toHaveText('Changer la photo');
  const saved = await app.waitForSaved((lib) => lib?.cvs[0].data.personalInfo.photo.startsWith('data:image/jpeg'));
  // ≈ 40 Ko au lieu de plusieurs Mo : la photo tient dans le stockage du navigateur.
  expect(saved.cvs[0].data.personalInfo.photo.length).toBeLessThan(200_000);

  // « Afficher la photo sur le CV » décoché : la photo reste enregistrée mais n'est plus affichée.
  const show = page.getByLabel('Afficher la photo sur le CV');
  await show.uncheck();
  await expect(previewPhotos).toHaveCount(0);
  await show.check();
  await expect(photo).toBeVisible();

  // Le modèle ATS n'affiche jamais de photo.
  await app.setTemplate('ATS (sobre)');
  await expect(previewPhotos).toHaveCount(0);
  await expect(page.getByText('Le modèle ATS n\'affiche jamais de photo')).toBeVisible();
  await app.setTemplate('Design');
  await expect(photo).toBeVisible();

  await page.getByRole('button', { name: 'Retirer la photo' }).click();
  await expect(previewPhotos).toHaveCount(0);
  await expect(app.resume.locator('.profile-img')).toHaveCount(0);
  await expect(page.locator('.photo-preview-img')).toHaveCount(0);
  await expect(page.locator('.photo-placeholder')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retirer la photo' })).toHaveCount(0);
  await app.waitForSaved((lib) => lib?.cvs[0].data.personalInfo.photo === '');

  // Après rechargement, toujours aucune photo (pas de photo de repli).
  await page.reload();
  await expect(app.resume.locator('h1')).toHaveText('Inès Garnier');
  await expect(page.locator('img')).toHaveCount(0);
});

test('un fichier qui n’est pas une image est refusé avec un message clair', async ({ page, app }) => {
  await app.startBlank();
  await page.locator('#ed-photo-input').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('bonjour') });
  await expect(page.locator('.editor-photo [role="alert"]')).toContainText('Ce fichier n\'est pas une image');
  await expect(page.locator('.preview-pane img')).toHaveCount(0);
});

// Couleur du pixel (x, y) d'une image (data URL), lue dans le navigateur.
async function pixelAt(page, src, x, y) {
  return page.evaluate(
    async ({ src: url, x: px, y: py }) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const [r, g, b] = ctx.getImageData(px, py, 1, 1).data;
      return r > 150 && b < 100 ? 'rouge' : b > 150 && r < 100 ? 'bleu' : `autre(${r},${g},${b})`;
    },
    { src, x, y },
  );
}

test('photo en hauteur (téléphone) : le cadrage part du haut pour garder le visage, et se règle au curseur', async ({ page, app }) => {
  await app.startBlank();
  // Photo 900 × 1200 : haut de la tête (rouge) sur les 120 premiers pixels, le reste en bleu.
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(0, 0, 900, 1200);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, 900, 120);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await expect(page.getByText('Choisissez une photo où votre visage est bien visible')).toBeVisible();
  await page
    .locator('#ed-photo-input')
    .setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') });
  const preview = page.locator('.photo-preview-img');
  await expect(preview).toBeVisible();
  // Un carré central commencerait à 150 px (bleu) : celui-ci garde le haut de la tête.
  expect(await pixelAt(page, await preview.getAttribute('src'), 200, 2)).toBe('rouge');

  const slider = page.getByLabel('Cadrage de la photo');
  await expect(slider).toBeVisible();
  await slider.fill('100');
  await expect.poll(async () => pixelAt(page, await preview.getAttribute('src'), 200, 2)).toBe('bleu');
  await slider.fill('0');
  await expect.poll(async () => pixelAt(page, await preview.getAttribute('src'), 200, 2)).toBe('rouge');
  // C'est la photo recadrée qui est enregistrée (l'image d'origine n'est gardée qu'en mémoire).
  const shown = await preview.getAttribute('src');
  await app.waitForSaved((lib) => lib?.cvs[0].data.personalInfo.photo === shown);

  // Photo retirée : plus de curseur.
  await page.getByRole('button', { name: 'Retirer la photo' }).click();
  await expect(slider).toHaveCount(0);
});

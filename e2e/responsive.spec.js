import { test, expect, exampleResume, startsWith } from './support/fixtures.js';

// l) Largeurs d'écran courantes : aucune barre de défilement horizontale, et sous 1100 px
// des onglets « Éditer / Aperçu » remplacent l'affichage côte à côte.

const SCREENS = [
  { width: 1366, height: 768 },
  { width: 1280, height: 800 },
  { width: 800, height: 1000 },
  { width: 390, height: 844 },
];

for (const { width, height } of SCREENS) {
  test(`${width} px : pas de débordement horizontal, panneaux adaptés`, async ({ page, app }) => {
    await page.setViewportSize({ width, height });
    const noOverflow = async (where) => expect(await app.horizontalOverflow(), `débordement horizontal (${where})`).toBeLessThanOrEqual(0);

    await app.open();
    await expect(page.getByRole('heading', { name: /Bienvenue/ })).toBeVisible();
    await noOverflow('accueil');

    await page.getByRole('button', { name: /Charger l’exemple/ }).click();
    const editor = page.locator('.editor-pane');
    const preview = page.locator('.preview-pane');
    const tabs = page.locator('.pane-switch');
    await expect(app.toolbar).toBeVisible();
    await noOverflow('CV');

    if (width < 1100) {
      await expect(tabs).toBeVisible();
      await expect(tabs.getByRole('tab', { name: 'Éditer' })).toHaveAttribute('aria-selected', 'true');
      await expect(editor).toBeVisible();
      await expect(preview).toBeHidden();
      await tabs.getByRole('tab', { name: 'Aperçu' }).click();
      await expect(preview).toBeVisible();
      await expect(editor).toBeHidden();
      await expect(app.resume.locator('h1')).toHaveText('Camille Martin');
      // L'aperçu est réduit pour tenir dans la largeur.
      await expect(preview.locator('.preview-zoom')).toContainText('Aperçu à');
      const box = await app.resume.boundingBox();
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      await noOverflow('aperçu');
      await tabs.getByRole('tab', { name: 'Éditer' }).click();
      await expect(editor).toBeVisible();
    } else {
      await expect(tabs).toBeHidden();
      await expect(editor).toBeVisible();
      await expect(preview).toBeVisible();
      await expect(app.resume.locator('h1')).toHaveText('Camille Martin');
    }

    // Formulaire déplié : les champs restent dans l'écran.
    const exp = await app.openPanel('experiences');
    await exp.locator('.editor-card-toggle').first().click();
    await expect(exp.getByLabel('Période', { exact: true })).toBeVisible();
    await noOverflow('éditeur déplié');

    // Menus de la barre d'outils.
    await app.toolbarButton('Fichier').click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    const menuBox = await menu.boundingBox();
    expect(menuBox.x).toBeGreaterThanOrEqual(0);
    expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');

    // Fenêtre « Télécharger » : le bouton garde un nom accessible même réduit à son icône.
    await app.toolbar.getByRole('button', { name: 'Télécharger', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Télécharger mon CV' });
    await expect(dialog).toBeVisible();
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(width);
    await noOverflow('fenêtre Télécharger');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    await app.view('Lettre');
    await expect(page.locator('.letter-editor')).toBeVisible();
    await noOverflow('lettre');

    await app.view('Candidatures');
    await page.getByRole('button', { name: 'Ajouter ma première candidature' }).click();
    await page.locator('form.tracker-form').getByLabel('Entreprise').fill('Une entreprise au nom particulièrement long pour tester');
    await page.locator('form.tracker-form').getByRole('button', { name: 'Ajouter' }).click();
    await expect(page.locator('.tracker-row')).toHaveCount(1);
    await noOverflow('candidatures');

    // Version au nom long dans la barre d'outils.
    await app.view('CV');
    await app.versionMenu(startsWith('Renommer'));
    const rename = page.getByRole('dialog', { name: 'Renommer la version' });
    await rename.getByLabel('Nom de la version').fill('CV – Chargée de communication et marketing digital – Groupe Decathlon France');
    await rename.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(rename).toHaveCount(0);
    await noOverflow('nom de version long');
  });
}

test('sur téléphone, les menus cités par l’aide gardent un libellé visible', async ({ page, app }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await app.loadExample();
  for (const label of ['Apparence', 'Fichier', 'IA']) {
    await expect(app.toolbar.locator('.tb-actions .tb-label', { hasText: label })).toBeVisible();
  }
  await expect(app.toolbar.locator('.save-ind-ok')).toContainText('Enregistré');
  await expect(app.toolbar.locator('.save-ind-short')).toBeVisible();
  await expect(app.toolbar.locator('.tb-download')).toContainText('PDF');
  await expect(app.toolbar.locator('.tb-download-short')).toBeVisible();
  // Trois lignes au plus : version, vues, puis outils et téléchargement.
  const rows = await app.toolbar.evaluate((tb) => new Set([...tb.querySelectorAll('.tb-group')].map((g) => Math.round(g.getBoundingClientRect().top))).size);
  expect(rows).toBeLessThanOrEqual(3);
  expect(await app.horizontalOverflow()).toBeLessThanOrEqual(0);
});

test.describe('écran tactile', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('les boutons pour déplacer ou supprimer une puce sont assez grands pour un doigt', async ({ page, app }) => {
    await app.loadExample();
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    const exp = await app.openPanel('experiences');
    await exp.locator('.editor-card-toggle').first().click();
    const row = exp.locator('.detail-row').nth(1);
    await expect(row).toBeVisible();
    for (const target of ['.detail-move-btn >> nth=0', '.detail-move-btn >> nth=1', '.remove-btn-icon-tiny', '.detail-drag-handle']) {
      const box = await row.locator(target).boundingBox();
      expect(box.width, target).toBeGreaterThanOrEqual(28);
      expect(box.height, target).toBeGreaterThanOrEqual(30);
    }
    // Les deux flèches ne se chevauchent pas.
    const [up, down] = await Promise.all([0, 1].map((i) => row.locator('.detail-move-btn').nth(i).boundingBox()));
    expect(down.y).toBeGreaterThanOrEqual(up.y + up.height - 0.5);
    // Pas de touche Alt sur un téléphone : l'aide n'en parle pas.
    const hint = exp.locator('.editor-hint', { hasText: 'Entrée : nouvelle puce' }).first();
    await expect(hint).toBeVisible();
    await expect(hint.locator('.editor-hint-keys')).toBeHidden();
    expect(await hint.innerText()).not.toContain('Alt');
    await row.locator('.detail-move-btn').nth(0).tap();
    await expect(exp.locator('textarea.detail-input').first()).toHaveValue(exampleResume.experiences[0].details[1]);
    expect(await app.horizontalOverflow()).toBeLessThanOrEqual(0);
  });
});

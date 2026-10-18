import { test, expect, exampleResume, startsWith, STORAGE_KEY } from './support/fixtures.js';

// f) Versions : dupliquer pour une candidature, renommer, basculer, supprimer.
// Le titre de la page (nom proposé par « Enregistrer en PDF ») suit la version : CV_<Nom>_<Entreprise>.

const BASE = 'Exemple – Camille Martin';
const DUPLICATE = 'CV – Chargée de communication – Decathlon';

test('dupliquer, renommer, basculer et supprimer une version', async ({ page, app }) => {
  await app.loadExample();
  await expect(app.versionButton).toContainText(BASE);
  await expect(page).toHaveTitle('CV_Camille_Martin');

  // Dupliquer pour une candidature : le nom suit le poste et l'entreprise.
  await app.versionMenu(startsWith('Dupliquer pour une candidature'));
  const dialog = page.getByRole('dialog', { name: 'Nouvelle version pour une candidature' });
  await dialog.getByLabel('Entreprise').fill('Decathlon');
  await dialog.getByLabel('Poste visé').fill('Chargée de communication');
  await expect(dialog.getByLabel('Nom de la version')).toHaveValue(DUPLICATE);
  await dialog.getByRole('button', { name: 'Créer la version' }).click();
  await expect(dialog).toHaveCount(0);
  await app.expectToast(`Version « ${DUPLICATE} » créée`);
  await expect(app.versionButton.locator('.vm-current-name')).toHaveText(DUPLICATE);
  await expect(app.versionButton.locator('.vm-current-company')).toHaveText('Decathlon');
  await expect(page).toHaveTitle('CV_Camille_Martin_Decathlon');
  expect(await app.versionNames()).toEqual([BASE, DUPLICATE]);
  // Le nom proposé pour le PDF reprend l'entreprise de la version.
  await app.toolbar.locator('.tb-download').click();
  const download = page.getByRole('dialog', { name: 'Télécharger mon CV' });
  await expect(download.locator('.dl-option-file code')).toHaveText([
    'CV_Camille_Martin_Decathlon.pdf',
    'CV_Camille_Martin_Decathlon.pdf',
    'CV_Camille_Martin_Decathlon_couleur.pdf',
  ]);
  await download.getByRole('button', { name: 'Fermer' }).first().click();
  await expect(download).toHaveCount(0);

  // La copie s'adapte sans toucher à l'original.
  await page.locator('#ed-pi-title').fill('Responsable communication');
  await expect(app.resume.locator('.profile-title')).toHaveText('Responsable communication');

  // Renommer.
  await app.versionMenu(startsWith('Renommer'));
  const rename = page.getByRole('dialog', { name: 'Renommer la version' });
  await expect(rename.getByLabel('Entreprise')).toHaveValue('Decathlon');
  await rename.getByLabel('Nom de la version').fill('Candidature Decathlon');
  await rename.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(app.versionButton.locator('.vm-current-name')).toHaveText('Candidature Decathlon');
  await expect(page).toHaveTitle('CV_Camille_Martin_Decathlon');

  // Basculer vers l'original : contenu et titre d'origine.
  await app.selectVersion(BASE);
  await expect(page).toHaveTitle('CV_Camille_Martin');
  await expect(page.locator('#ed-pi-title')).toHaveValue('Chargée de communication et marketing digital');
  await expect(app.resume.locator('.profile-title')).toHaveText('Chargée de communication et marketing digital');
  await app.selectVersion('Candidature Decathlon');
  await expect(app.resume.locator('.profile-title')).toHaveText('Responsable communication');

  // Supprimer la version affichée (avec confirmation).
  await app.versionMenu(startsWith('Supprimer cette version'));
  const confirm = page.getByRole('dialog', { name: 'Supprimer cette version ?' });
  await expect(confirm).toContainText('« Candidature Decathlon » sera effacé de ce navigateur.');
  await confirm.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await app.expectToast('« Candidature Decathlon » a été supprimé.');
  await expect(app.versionButton.locator('.vm-current-name')).toHaveText(BASE);
  await expect(page).toHaveTitle('CV_Camille_Martin');
  expect(await app.versionNames()).toEqual([BASE]);

  // La dernière version ne peut pas être supprimée.
  await app.versionButton.click();
  await expect(page.getByRole('menuitem', { name: startsWith('Supprimer cette version') })).toBeDisabled();
  await page.keyboard.press('Escape');

  const lib = await app.waitForSaved((l) => l?.cvs.length === 1);
  expect(lib.cvs[0].name).toBe(BASE);
  expect(lib.cvs[0].data.personalInfo.title).toBe('Chargée de communication et marketing digital');
});

test('une suppression peut être annulée depuis le message', async ({ page, app }) => {
  await app.loadExample();
  await app.versionMenu(startsWith('Nouveau CV vierge'));
  await expect(app.versionButton.locator('.vm-current-name')).toHaveText('Nouveau CV');
  await expect(page).toHaveTitle('CV');
  await expect(app.resume.locator('h1')).toHaveCount(0);

  await app.versionMenu(startsWith('Supprimer cette version'));
  await page.getByRole('dialog', { name: 'Supprimer cette version ?' }).getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(app.versionButton.locator('.vm-current-name')).toHaveText(BASE);
  await app.toasts.getByRole('button', { name: 'Annuler' }).click();
  await expect(app.versionButton.locator('.vm-current-name')).toHaveText('Nouveau CV');
  expect(await app.versionNames()).toEqual([BASE, 'Nouveau CV']);
});

test('« Dupliquer pour une candidature » ajoute la candidature au suivi, liée à la nouvelle version', async ({ page, app }) => {
  await app.loadExample();
  await app.versionMenu(startsWith('Dupliquer pour une candidature'));
  const dialog = page.getByRole('dialog', { name: 'Nouvelle version pour une candidature' });
  await dialog.getByLabel('Entreprise').fill('Transdev');
  await dialog.getByLabel('Poste visé').fill('Assistante de direction');
  await expect(dialog.getByLabel('Ajouter au suivi des candidatures')).toBeChecked();
  await dialog.getByRole('button', { name: 'Créer la version' }).click();
  await app.expectToast('créée et ajoutée au suivi des candidatures');

  await app.view('Candidatures');
  const row = page.locator('.tracker-row');
  await expect(row).toHaveCount(1);
  await expect(row.getByLabel('Entreprise', { exact: true })).toHaveValue('Transdev');
  await expect(row.locator('.tracker-input-position')).toHaveValue('Assistante de direction');
  await expect(row.locator('select.tracker-status')).toHaveValue('a_envoyer');
  await expect(row.locator('select.tracker-select option:checked')).toHaveText('Transdev · Assistante de direction');
  const lib = await app.waitForSaved((l) => l?.applications.length === 1);
  expect(lib.applications[0]).toMatchObject({ cvId: lib.cvs[1].id, date: '' });

  // Nouvelle candidature depuis le suivi : la version affichée (qui vise Transdev) est proposée d'office.
  await page.getByRole('button', { name: /Ajouter une candidature/ }).click();
  const form = page.locator('form.tracker-form');
  await expect(form.getByLabel('Entreprise')).toHaveValue('Transdev');
  await expect(form.getByLabel('Version de CV utilisée')).toHaveValue(lib.cvs[1].id);
});

test('supprimer une version intermédiaire rattache ses dérivées à la version de base ; « Annuler » rétablit le lien', async ({ page, app }) => {
  await app.loadExample();
  const duplicate = async (company) => {
    await app.versionMenu(startsWith('Dupliquer pour une candidature'));
    const dialog = page.getByRole('dialog', { name: 'Nouvelle version pour une candidature' });
    await dialog.getByLabel('Entreprise').fill(company);
    await dialog.getByLabel('Poste visé').fill('Vendeuse');
    await dialog.getByLabel('Ajouter au suivi des candidatures').uncheck();
    await dialog.getByRole('button', { name: 'Créer la version' }).click();
    await expect(app.versionButton.locator('.vm-current-name')).toHaveText(`CV – Vendeuse – ${company}`);
  };
  await duplicate('Fnac');
  await duplicate('Darty');
  let lib = await app.waitForSaved((l) => l?.cvs.length === 3);
  const [base, fnac, darty] = lib.cvs;
  expect([fnac.sourceId, darty.sourceId]).toEqual([base.id, fnac.id]);

  const deleteFnac = async () => {
    await app.selectVersion('CV – Vendeuse – Fnac');
    await app.versionMenu(startsWith('Supprimer cette version'));
    await page.getByRole('dialog', { name: 'Supprimer cette version ?' }).getByRole('button', { name: 'Supprimer', exact: true }).click();
    return app.waitForSaved((l) => l?.cvs.length === 2);
  };
  lib = await deleteFnac();
  expect(lib.cvs.find((c) => c.id === darty.id).sourceId).toBe(base.id);

  // « Annuler » la suppression : la version revient, et sa dérivée retrouve son lien d'origine.
  await app.toasts.getByRole('button', { name: 'Annuler' }).click();
  lib = await app.waitForSaved((l) => l?.cvs.length === 3);
  expect(lib.cvs.find((c) => c.id === darty.id).sourceId).toBe(fnac.id);

  // Supprimée pour de bon : l'IA repart de la version de base, pas d'une version déjà adaptée.
  await deleteFnac();
  await expect(app.versionButton.locator('.vm-current-name')).toHaveText('CV – Vendeuse – Darty');
  await app.menu('IA', startsWith('Adapter à une offre'));
  const modal = page.locator('.ai-modal');
  await expect(modal.getByLabel('À partir de :').locator('option:checked')).toHaveText(`${BASE} (version de base)`);
});

test('une action sans effet ne crée ni étape d’annulation ni modification (date inchangée)', async ({ page, app }) => {
  await app.loadExample();
  const { updatedAt } = (await app.waitForSaved((l) => l?.cvs.length === 1)).cvs[0];
  const undoButton = app.toolbar.getByRole('button', { name: 'Annuler', exact: true });
  await expect(undoButton).toBeDisabled();

  // « Renommer » puis « Enregistrer » sans rien changer.
  await app.versionMenu(startsWith('Renommer'));
  const dialog = page.getByRole('dialog', { name: 'Renommer la version' });
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toHaveCount(0);
  // Modèle et langue déjà choisis : un clic dessus ne change rien.
  await app.setTemplate('Design');
  await app.toolbarButton('Apparence').click();
  await page.getByRole('radio', { name: 'Français', exact: true }).click();
  await page.keyboard.press('Escape');

  await page.waitForTimeout(900);
  await expect(undoButton).toBeDisabled();
  expect((await app.storedLibrary()).cvs[0].updatedAt).toBe(updatedAt);
});

test('importer la sauvegarde plus récente d’un autre ordinateur, après un clic sans effet', async ({ page, app }) => {
  // Bibliothèque modifiée le 10/10 ici ; le fichier, fait ailleurs le 15/10, a un autre titre.
  const cv = {
    id: 'cv_partage',
    name: 'Mon CV',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-10T08:00:00.000Z',
    data: { ...exampleResume, personalInfo: { ...exampleResume.personalInfo, title: 'Ancien titre' } },
    settings: { lang: 'fr', template: 'design' },
  };
  const local = { version: 2, currentId: cv.id, cvs: [cv], applications: [] };
  const file = {
    ...local,
    cvs: [{ ...cv, updatedAt: '2026-10-15T08:00:00.000Z', data: { ...cv.data, personalInfo: { ...cv.data.personalInfo, title: 'Nouveau titre' } } }],
  };
  await app.open();
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: STORAGE_KEY, value: JSON.stringify(local) });
  await page.reload();
  await expect(app.resume.locator('h1')).toHaveText('Camille Martin');

  // Clic sur le modèle déjà affiché : ce n'est pas une modification.
  await app.setTemplate('Design');
  await page.waitForTimeout(900);
  expect((await app.storedLibrary()).cvs[0].updatedAt).toBe('2026-10-10T08:00:00.000Z');

  await app.importFile({ name: 'sauvegarde-autre-ordinateur.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
  const importDialog = page.getByRole('dialog', { name: 'Importer une sauvegarde' });
  await expect(importDialog).toBeVisible();
  await expect(importDialog).not.toContainText('contient déjà tout ce fichier');
  await importDialog.getByRole('button', { name: 'Mettre à jour ma bibliothèque' }).click();
  await app.expectToast('1 version mise à jour');
  await expect(page.locator('#ed-pi-title')).toHaveValue('Nouveau titre');
});

test('dupliquer ou créer une version sans entreprise ni poste : aucune candidature vide dans le suivi', async ({ page, app }) => {
  await app.loadExample();
  await app.versionMenu(startsWith('Dupliquer pour une candidature'));
  const dialog = page.getByRole('dialog', { name: 'Nouvelle version pour une candidature' });
  const track = dialog.getByLabel('Ajouter au suivi des candidatures');
  await expect(track).toBeDisabled();
  await expect(track).not.toBeChecked();
  await expect(dialog).toContainText('Indiquez l’entreprise ou le poste visé');
  // L'entreprise suffit pour pouvoir l'ajouter, comme dans le formulaire du suivi.
  await dialog.getByLabel('Entreprise').fill('Fnac');
  await expect(track).toBeChecked();
  await dialog.getByLabel('Entreprise').fill('');
  await dialog.getByRole('button', { name: 'Créer la version' }).click();
  await expect(dialog).toHaveCount(0);
  await app.expectToast('créée : adaptez-la librement');
  await expect(app.toasts).not.toContainText('ajoutée au suivi');

  // Même chose avec « Créer la version sans IA », poste et entreprise vides.
  await app.menu('IA', startsWith('Adapter à une offre'));
  const modal = page.locator('.ai-modal');
  await expect(modal.getByLabel('Ajouter au suivi des candidatures')).toBeDisabled();
  await modal.getByRole('button', { name: 'Créer la version sans IA' }).click();
  await expect(modal).toHaveCount(0);

  await app.view('Candidatures');
  await expect(page.locator('.tracker-row')).toHaveCount(0);
  const lib = await app.waitForSaved((l) => l?.cvs.length === 3);
  expect(lib.applications).toEqual([]);
});

test('coordonnée corrigée dans une version : la reporter dans les autres en un clic, et l’annuler', async ({ page, app }) => {
  await app.loadExample();
  await app.versionMenu(startsWith('Dupliquer pour une candidature'));
  const dialog = page.getByRole('dialog', { name: 'Nouvelle version pour une candidature' });
  await dialog.getByLabel('Entreprise').fill('Sézane');
  await dialog.getByRole('button', { name: 'Créer la version' }).click();
  await app.selectVersion(BASE);

  const oldPhone = exampleResume.personalInfo.phone;
  const phone = page.locator('#ed-pi-phone');
  await phone.fill('07 99 88 77 66');
  await phone.blur();
  const notice = app.toasts.locator('.toast', { hasText: 'encore l’ancien numéro de téléphone' });
  await expect(notice).toContainText(`Une autre version de vos CV a encore l’ancien numéro de téléphone (${oldPhone})`);
  await notice.getByRole('button', { name: 'Mettre à jour partout' }).click();
  const done = app.toasts.locator('.toast', { hasText: 'Numéro de téléphone mis à jour dans 1 autre version.' });
  await expect(done).toBeVisible();
  await app.waitForSaved((l) => l?.cvs.every((c) => c.data.personalInfo.phone === '07 99 88 77 66'));

  // « Annuler » rend son ancien numéro à l'autre version, sans toucher à celle corrigée.
  await done.getByRole('button', { name: 'Annuler' }).click();
  const lib = await app.waitForSaved((l) => l?.cvs[1].data.personalInfo.phone === oldPhone);
  expect(lib.cvs[0].data.personalInfo.phone).toBe('07 99 88 77 66');

  // Le titre visé, propre à chaque candidature, n'est jamais proposé.
  await page.locator('#ed-pi-title').fill('Responsable communication');
  await page.locator('#ed-pi-title').blur();
  await page.waitForTimeout(300);
  await expect(app.toasts.locator('.toast', { hasText: 'Mettre à jour partout' })).toHaveCount(0);
});

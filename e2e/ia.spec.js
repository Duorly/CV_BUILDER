import { test, expect, exampleResume, startsWith } from './support/fixtures.js';
import { MOCK, mockAiApis, personalDataOf } from './support/ai-mock.js';
import { hasPoppler, pdfLines } from './support/pdf.js';

// i) IA avec des API simulées (Anthropic et Gemini) : clé factice, adaptation à une offre
// (analyse → propositions → nouvelle version + suivi), traduction en anglais.
// Rien de personnel (photo, nom, coordonnées, liens) ne doit partir chez le fournisseur.

const FAKE_ANTHROPIC_KEY = 'sk-ant-api03-cle-factice-e2e';
const FAKE_GEMINI_KEY = 'AIzaSyCleFacticeE2E';
const OFFER =
  'Decathlon recrute une chargée de marketing digital (H/F) pour animer ses réseaux sociaux, piloter des campagnes Google Ads ' +
  'et suivre les performances dans des tableaux de bord. Vous travaillerez avec les équipes produit et magasin. ' +
  'Profil : 3 à 5 ans d’expérience en communication, aisance rédactionnelle, goût du sport.';
const VERSION_NAME = 'CV – Chargée de marketing digital – Decathlon';
// Les apostrophes du texte de l'IA reprennent le style du CV (droites dans l'exemple).
const straight = (text) => text.replaceAll('’', "'");

async function openAiSettings(page, app) {
  await app.menu('IA', startsWith('Clé API et fournisseur'));
  const dialog = page.getByRole('dialog', { name: 'Intelligence artificielle (optionnelle)' });
  await expect(dialog).toBeVisible();
  return dialog;
}

function expectNoPersonalData(requests, data) {
  const posts = requests.filter((r) => r.method === 'POST');
  expect(posts.length).toBeGreaterThan(0);
  for (const { url, body } of posts) {
    expect(body, `photo envoyée à ${url}`).not.toMatch(/data:image|base64/);
    for (const value of personalDataOf(data)) expect(body, `« ${value} » envoyé à ${url}`).not.toContain(value);
  }
}

test('adapter le CV à une offre crée une version « CV – Poste – Entreprise » et une candidature', async ({ page, app }) => {
  const requests = await mockAiApis(page);
  await app.loadExample();
  // Une photo, pour vérifier qu'elle n'est jamais envoyée.
  await page.locator('#ed-photo-input').setInputFiles(await app.generatedPng());
  await expect(app.resume.locator('.profile-img img')).toBeVisible();

  // Configuration d'une clé factice, vérifiée par « Tester la clé ».
  const settings = await openAiSettings(page, app);
  await settings.getByLabel('Clé API Anthropic').fill(FAKE_ANTHROPIC_KEY);
  await settings.getByRole('button', { name: 'Tester la clé' }).click();
  await expect(settings.locator('.ai-key-status')).toHaveText('Clé valide : Claude Opus 5.5 est disponible.');
  await settings.getByRole('button', { name: 'Fermer' }).click();
  await expect(settings).toHaveCount(0);

  await app.menu('IA', startsWith('Adapter à une offre'));
  const modal = page.locator('.ai-modal');
  await expect(modal.getByRole('heading', { name: 'Adapter mon CV à une offre' })).toBeVisible();
  await expect(modal.locator('.ai-settings--collapsed')).toContainText('clé Anthropic enregistrée');
  await modal.getByLabel('Intitulé du poste').fill('Chargée de marketing digital');
  await modal.getByLabel('Entreprise', { exact: true }).fill('Decathlon');
  await modal.getByLabel('Texte de l’offre').fill(OFFER);
  await modal.getByRole('button', { name: 'Analyser l’offre' }).click();

  // Analyse : mots-clés présents et manquants ; on confirme posséder « Google Ads ».
  const analysis = modal.locator('.ai-analysis');
  await expect(analysis).toBeVisible();
  await expect(analysis.locator('.ai-chip--present')).toContainText(['Réseaux sociaux']);
  const googleAds = analysis.locator('.ai-missing-row', { hasText: 'Google Ads' });
  await googleAds.getByLabel('Je possède cette compétence').check();
  await modal.getByRole('button', { name: 'Proposer des modifications' }).click();

  // Propositions, cochées par défaut.
  const review = modal.locator('.ai-review');
  await expect(review).toBeVisible();
  await expect(review).toContainText('Google Ads');
  await expect(review.locator('.ai-change')).not.toHaveCount(0);
  await expect(modal.getByLabel('Nom de la nouvelle version')).toHaveValue(VERSION_NAME);
  await expect(modal.getByLabel('Ajouter au suivi des candidatures')).toBeChecked();
  await modal.getByRole('button', { name: `Créer la version « ${VERSION_NAME} »` }).click();
  await expect(modal).toHaveCount(0);

  await app.expectToast(`Version « ${VERSION_NAME} » créée et ajoutée au suivi des candidatures`);
  await expect(app.versionButton.locator('.vm-current-name')).toHaveText(VERSION_NAME);
  await expect(page).toHaveTitle('CV_Camille_Martin_Decathlon');
  await expect(app.resume.locator('.objective-text')).toHaveText(straight(MOCK.summary));
  await expect(app.resume.locator('.experience-item').first()).toContainText(straight(MOCK.bulletSuffix.trim()));
  await expect(app.resume.locator('.skills-tags').first()).toContainText('Google Ads');

  // La version d'origine n'a pas bougé.
  await app.selectVersion('Exemple – Camille Martin');
  await expect(app.resume.locator('.objective-text')).toHaveText(exampleResume.personalInfo.objective);
  await expect(app.resume).not.toContainText('Google Ads');

  // La candidature est dans le suivi, liée à la nouvelle version.
  await app.view('Candidatures');
  const row = page.locator('.tracker-row');
  await expect(row).toHaveCount(1);
  await expect(row.getByLabel('Entreprise', { exact: true })).toHaveValue('Decathlon');
  await expect(row.locator('.tracker-input-position')).toHaveValue('Chargée de marketing digital');
  await expect(row.locator('select.tracker-status')).toHaveValue('a_envoyer');
  // L'entreprise d'abord : la colonne, étroite, distingue ainsi les versions.
  await expect(row.locator('select.tracker-select option:checked')).toHaveText('Decathlon · Chargée de marketing digital');

  // Requêtes : clé dans l'en-tête, ni photo ni coordonnées dans le contenu.
  const posts = requests.filter((r) => r.method === 'POST');
  expect(posts.map((r) => r.url)).toEqual(['https://api.anthropic.com/v1/messages', 'https://api.anthropic.com/v1/messages']);
  for (const r of requests) expect(r.headers['x-api-key']).toBe(FAKE_ANTHROPIC_KEY);
  expect(posts[0].body).toContain('Decathlon recrute');
  expect(posts[0].body).toContain('Réseaux sociaux');
  expectNoPersonalData(requests, exampleResume);

  const lib = await app.waitForSaved((l) => l?.applications.length === 1);
  const created = lib.cvs.find((c) => c.name === VERSION_NAME);
  expect(created).toMatchObject({ company: 'Decathlon', jobTitle: 'Chargée de marketing digital', sourceId: lib.cvs[0].id });
  expect(created.jobOffer).toBe(OFFER);
  // « À envoyer » : pas encore de date d'envoi (elle sera fixée au passage à « Envoyée »).
  expect(lib.applications[0]).toMatchObject({ company: 'Decathlon', cvId: created.id, status: 'a_envoyer', date: '', followUpDate: '' });
});

test('sans clé d’IA, « Adapter à une offre » crée quand même la version dédiée, avec l’offre et la candidature', async ({ page, app }) => {
  await app.loadExample();
  await app.menu('IA', startsWith('Adapter à une offre'));
  const modal = page.locator('.ai-modal');
  await expect(modal.getByRole('button', { name: 'Analyser l’offre' })).toBeDisabled();
  await modal.getByLabel('Intitulé du poste').fill('Chargée de marketing digital');
  await modal.getByLabel('Entreprise', { exact: true }).fill('Decathlon');
  await modal.getByLabel('Lien de l’offre (facultatif)').fill('https://www.exemple.fr/offre-decathlon');
  await modal.getByLabel('Texte de l’offre').fill(OFFER);
  await expect(modal.locator('.ai-nokey-alt')).toContainText('Pas de clé ?');
  await expect(modal.locator('.ai-nokey-alt').getByLabel('Ajouter au suivi des candidatures')).toBeChecked();
  await modal.getByRole('button', { name: 'Créer la version sans IA' }).click();
  await expect(modal).toHaveCount(0);

  await app.expectToast(`Version « ${VERSION_NAME} » créée et ajoutée au suivi des candidatures`);
  await expect(app.versionButton.locator('.vm-current-name')).toHaveText(VERSION_NAME);
  // Contenu repris tel quel : c'est à elle de l'adapter.
  await expect(app.resume.locator('.objective-text')).toHaveText(exampleResume.personalInfo.objective);
  const lib = await app.waitForSaved((l) => l?.applications.length === 1);
  const created = lib.cvs.find((c) => c.name === VERSION_NAME);
  expect(created).toMatchObject({
    company: 'Decathlon',
    jobTitle: 'Chargée de marketing digital',
    jobOffer: OFFER,
    offerUrl: 'https://www.exemple.fr/offre-decathlon',
    sourceId: lib.cvs[0].id,
  });
  expect(lib.applications[0]).toMatchObject({ cvId: created.id, status: 'a_envoyer', offerUrl: 'https://www.exemple.fr/offre-decathlon' });
});

test('traduire le CV (Gemini) crée une version anglaise avec les libellés anglais', async ({ page, app }) => {
  const requests = await mockAiApis(page);
  await app.loadExample();

  const settings = await openAiSettings(page, app);
  await settings.getByRole('button', { name: /^Gemini/ }).click();
  await expect(settings.getByRole('button', { name: /^Gemini/ })).toHaveAttribute('aria-pressed', 'true');
  await settings.getByLabel('Clé API Google').fill(FAKE_GEMINI_KEY);
  await settings.getByRole('button', { name: 'Fermer' }).click();

  await app.menu('IA', startsWith('Traduire en anglais'));
  const modal = page.locator('.ai-modal');
  await expect(modal.getByRole('heading', { name: 'Traduire mon CV en anglais' })).toBeVisible();
  await modal.getByRole('button', { name: /^Traduire en anglais/ }).click();
  await expect(modal.locator('.ai-translation')).toBeVisible();
  await expect(modal.locator('.ai-translation')).toContainText(MOCK.translatedSummary);
  // « 5 ans » et « 40 % » ne se retrouvent pas dans le résumé traduit : à vérifier avant de créer la version.
  const numbers = modal.locator('.callout-warn', { hasText: 'Chiffres à vérifier' });
  await expect(numbers).toContainText('Résumé du profil : « 5 », « 40 » → aucun chiffre');
  await expect(numbers).not.toContainText(exampleResume.experiences[0].title);
  const name = 'Exemple – Camille Martin (EN)';
  await modal.getByRole('button', { name: `Créer la version « ${name} »` }).click();
  await expect(modal).toHaveCount(0);

  await expect(app.versionButton.locator('.vm-current-name')).toHaveText(name);
  await expect(app.resume).toHaveAttribute('lang', 'en');
  const headings = await app.resume.locator('h2').allTextContents();
  expect(headings).toEqual(expect.arrayContaining(['Skills', 'Professional Experience', 'Education', 'Languages', 'Links']));
  for (const french of ['Compétences', 'Expériences professionnelles', 'Formation', 'Langues']) expect(headings).not.toContain(french);
  await expect(app.resume.locator('.objective-text')).toHaveText(MOCK.translatedSummary);
  await expect(app.resume.locator('.experience-item h3').first()).toHaveText(`${exampleResume.experiences[0].title} [EN]`);
  // Les noms d'entreprises et les dates ne sont pas traduits.
  await expect(app.resume.locator('.experience-item .exp-company').first()).toHaveText(exampleResume.experiences[0].company);
  await expect(app.resume.locator('.experience-item').first()).toContainText(exampleResume.experiences[0].period);

  // Modèle ATS : libellés anglais aussi.
  await app.setTemplate('ATS (sobre)');
  const atsHeadings = await app.resume.locator('h2').allTextContents();
  expect(atsHeadings).toEqual(expect.arrayContaining(['Profile', 'Professional Experience', 'Education']));

  // PDF direct de la version anglaise : nom de fichier et titres en anglais.
  if (hasPoppler()) {
    await app.toolbar.locator('.tb-download').click();
    const dialog = page.getByRole('dialog', { name: 'Télécharger mon CV' });
    const pdf = await app.download(() => dialog.getByRole('button', { name: /PDF ATS — téléchargement direct/ }).click());
    expect(pdf.name).toBe('CV_Camille_Martin.pdf');
    const text = pdfLines(pdf.file).join(' ');
    for (const heading of ['PROFILE', 'PROFESSIONAL EXPERIENCE', 'EDUCATION', 'LANGUAGES']) expect(text).toContain(heading);
    expect(text).not.toContain('EXPÉRIENCES PROFESSIONNELLES');
    expect(text).toContain(MOCK.translatedSummary);
  }

  const posts = requests.filter((r) => r.method === 'POST');
  expect(posts).toHaveLength(1);
  expect(posts[0].url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
  expect(posts[0].url).not.toContain('key=');
  expect(posts[0].headers['x-goog-api-key']).toBe(FAKE_GEMINI_KEY);
  expectNoPersonalData(requests, exampleResume);

  const lib = await app.waitForSaved((l) => l?.cvs.length === 2);
  const en = lib.cvs.find((c) => c.name === name);
  expect(en.settings.lang).toBe('en');
  expect(en.sourceId).toBe(lib.cvs[0].id);
  expect(lib.applications).toEqual([]);
});

// Adapte la version affichée à l'offre (API simulées) avec « Appliquer au CV actuel ».
async function applyToCurrent(page, app) {
  await app.menu('IA', startsWith('Adapter à une offre'));
  const modal = page.locator('.ai-modal');
  await modal.getByLabel('Texte de l’offre').fill(OFFER);
  await modal.getByRole('button', { name: 'Analyser l’offre' }).click();
  await modal.getByRole('button', { name: 'Proposer des modifications' }).click();
  await expect(modal.locator('.ai-review')).toBeVisible();
  await modal.getByRole('button', { name: 'Appliquer au CV actuel' }).click();
  await expect(modal).toHaveCount(0);
}

const undoAiButton = (app) =>
  app.toasts.locator('.toast', { hasText: 'Modifications appliquées' }).getByRole('button', { name: 'Annuler' });

test('« Appliquer au CV actuel » modifie la version affichée, et Ctrl/Cmd+Z l’annule', async ({ page, app }) => {
  await mockAiApis(page);
  await page.addInitScript((key) => localStorage.setItem('anthropic_api_key', key), FAKE_ANTHROPIC_KEY);
  await app.loadExample();
  await applyToCurrent(page, app);

  const objective = app.resume.locator('.objective-text');
  await expect(objective).toHaveText(straight(MOCK.summary));
  await app.expectToast('Modifications appliquées à « Exemple – Camille Martin »');
  expect(await app.versionNames()).toEqual(['Exemple – Camille Martin']);

  await page.keyboard.press('ControlOrMeta+z');
  await expect(objective).toHaveText(exampleResume.personalInfo.objective);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(objective).toHaveText(straight(MOCK.summary));
});

test('« Annuler » du message défait les modifications de l’IA, et seulement elles', async ({ page, app }) => {
  await mockAiApis(page);
  await page.addInitScript((key) => localStorage.setItem('anthropic_api_key', key), FAKE_ANTHROPIC_KEY);
  await app.loadExample();
  const objective = app.resume.locator('.objective-text');
  const name = page.locator('#ed-pi-name');

  // Rien n'a bougé depuis : le CV revient à son texte d'avant, et Rétablir peut les remettre.
  await applyToCurrent(page, app);
  await expect(objective).toHaveText(straight(MOCK.summary));
  await undoAiButton(app).click();
  await expect(objective).toHaveText(exampleResume.personalInfo.objective);
  await app.expectToast('Modifications de l’IA annulées dans « Exemple – Camille Martin »');
  await app.toolbarButton('Rétablir').click();
  await expect(objective).toHaveText(straight(MOCK.summary));
  await app.toolbarButton('Annuler').click();
  await expect(objective).toHaveText(exampleResume.personalInfo.objective);

  // Une saisie faite depuis n'est pas défaite à la place : le message l'explique.
  await applyToCurrent(page, app);
  await name.fill('Camille Martin X');
  await undoAiButton(app).click();
  await app.expectToast('« Exemple – Camille Martin » a été modifié depuis');
  await expect(name).toHaveValue('Camille Martin X');
  await expect(objective).toHaveText(straight(MOCK.summary));
});

test('« Annuler » du message après un changement de version annule l’IA sur la bonne version', async ({ page, app }) => {
  await mockAiApis(page);
  await page.addInitScript((key) => localStorage.setItem('anthropic_api_key', key), FAKE_ANTHROPIC_KEY);
  await app.loadExample();
  await app.versionMenu(startsWith('Nouveau CV vierge'));
  await app.selectVersion('Exemple – Camille Martin');

  await applyToCurrent(page, app);
  await expect(app.resume.locator('.objective-text')).toHaveText(straight(MOCK.summary));
  // Autre version, saisie dans celle-ci, puis « Annuler » dans le message de l'IA.
  await app.selectVersion('Nouveau CV');
  await page.locator('#ed-pi-name').fill('Zoé Essai');
  await undoAiButton(app).click();
  await app.expectToast('Modifications de l’IA annulées dans « Exemple – Camille Martin »');
  // La saisie de l'autre version reste ; la version modifiée par l'IA retrouve son texte.
  await expect(page.locator('#ed-pi-name')).toHaveValue('Zoé Essai');
  await app.selectVersion('Exemple – Camille Martin');
  await expect(app.resume.locator('.objective-text')).toHaveText(exampleResume.personalInfo.objective);
  // Enregistré : l'exemple retrouve son texte, la saisie de l'autre version est gardée.
  await app.waitForSaved(
    (l) =>
      l?.cvs.length === 2 &&
      l.cvs[0].data.personalInfo.objective === exampleResume.personalInfo.objective &&
      l.cvs[1].data.personalInfo.name === 'Zoé Essai',
  );
});

test('une clé Google collée dans le champ Claude est rangée pour Gemini, jamais envoyée à Anthropic', async ({ page, app }) => {
  const requests = await mockAiApis(page);
  await app.startBlank();
  const stored = () => page.evaluate(() => [localStorage.getItem('anthropic_api_key'), localStorage.getItem('gemini_api_key')]);
  const settings = await openAiSettings(page, app);
  // Sans choix enregistré, l'onglet Claude est actif.
  await expect(settings.getByRole('button', { name: /^Claude/ })).toHaveAttribute('aria-pressed', 'true');
  await settings.getByLabel('Clé API Anthropic').fill('AQ.Ab8RN6-cle-factice-e2e');
  await expect(settings.getByRole('button', { name: /^Gemini/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(settings.locator('.ai-key-status')).toHaveText(
    'Clé Google reconnue : elle est enregistrée pour Gemini, qui est maintenant sélectionné.',
  );
  await expect(settings.getByLabel('Clé API Google')).toHaveValue('AQ.Ab8RN6-cle-factice-e2e');
  expect(await stored()).toEqual([null, 'AQ.Ab8RN6-cle-factice-e2e']);

  await settings.getByRole('button', { name: 'Tester la clé' }).click();
  await expect(settings.locator('.ai-key-status')).toHaveText('Clé valide : Gemini 3.8 Flash est disponible.');
  expect(requests.map((r) => new URL(r.url).hostname)).toEqual(['generativelanguage.googleapis.com']);

  // Ordinateur partagé : « Oublier la clé » ne laisse rien derrière elle.
  await settings.getByRole('button', { name: 'Oublier la clé' }).click();
  expect(await stored()).toEqual([null, null]);
});

test('une clé Google déjà enregistrée pour Claude est signalée, pas testée, et se range pour Gemini', async ({ page, app }) => {
  const requests = await mockAiApis(page);
  await page.addInitScript(() => localStorage.setItem('anthropic_api_key', 'AQ.Ab8RN6-cle-factice-e2e'));
  await app.startBlank();
  const settings = await openAiSettings(page, app);
  await expect(settings.locator('.ai-key-warning')).toContainText(
    'Cette clé est une clé Google : elle ne fonctionne pas avec Claude et ne lui sera pas envoyée.',
  );
  await expect(settings.getByRole('button', { name: 'Tester la clé' })).toBeDisabled();
  await settings.getByRole('button', { name: 'L’utiliser avec Gemini' }).click();
  await expect(settings.getByRole('button', { name: /^Gemini/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(settings.locator('.ai-key-warning')).toHaveCount(0);
  expect(await page.evaluate(() => [localStorage.getItem('anthropic_api_key'), localStorage.getItem('gemini_api_key')])).toEqual([
    null,
    'AQ.Ab8RN6-cle-factice-e2e',
  ]);
  expect(requests).toEqual([]);
});

test('une clé refusée par le fournisseur affiche un message en français, sans rien casser', async ({ page, app, consoleGuard }) => {
  consoleGuard.allow(/status of 401/);
  await page.route('https://api.anthropic.com/**', (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } })
      : route.fulfill({
          status: 401,
          headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
          body: JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }),
        }),
  );
  await page.addInitScript((key) => localStorage.setItem('anthropic_api_key', key), FAKE_ANTHROPIC_KEY);
  await app.loadExample();
  await app.menu('IA', startsWith('Adapter à une offre'));
  const modal = page.locator('.ai-modal');
  await modal.getByLabel('Texte de l’offre').fill(OFFER);
  await modal.getByRole('button', { name: 'Analyser l’offre' }).click();
  await expect(modal.locator('.ai-error')).toContainText('La clé API Anthropic est refusée.');
  await expect(modal.getByRole('button', { name: 'Ouvrir les réglages IA' })).toBeVisible();

  // Fermer demande confirmation (l'offre saisie serait perdue), puis le CV est intact.
  await page.keyboard.press('Escape');
  await modal.getByRole('button', { name: 'Fermer sans enregistrer' }).click();
  await expect(modal).toHaveCount(0);
  await expect(app.resume.locator('.objective-text')).toHaveText(exampleResume.personalInfo.objective);
  expect(await app.versionNames()).toEqual(['Exemple – Camille Martin']);
});

const SEZANE_OFFER =
  'Sézane recrute une responsable adjointe de magasin (H/F) pour sa boutique de Lyon : animation de l’équipe de vente, ' +
  'suivi des indicateurs commerciaux, merchandising et relation client haut de gamme.';
const KIABI_OFFER =
  'Kiabi recrute une responsable adjointe de magasin (H/F) : management d’une équipe de 12 conseillers, gestion des stocks, ' +
  'plannings et animation commerciale du magasin.';

test('« Adapter à une offre » depuis une version déjà adaptée : formulaire vide, l’offre précédente en un clic', async ({ page, app }) => {
  await app.loadExample();
  const modal = page.locator('.ai-modal');
  await app.menu('IA', startsWith('Adapter à une offre'));
  await modal.getByLabel('Intitulé du poste').fill('Responsable adjointe de magasin');
  await modal.getByLabel('Entreprise', { exact: true }).fill('Sézane');
  await modal.getByLabel('Lien de l’offre (facultatif)').fill('https://www.exemple.fr/offre-sezane');
  await modal.getByLabel('Texte de l’offre').fill(SEZANE_OFFER);
  await modal.getByRole('button', { name: 'Créer la version sans IA' }).click();
  await expect(app.versionButton.locator('.vm-current-name')).toHaveText('CV – Responsable adjointe de magasin – Sézane');

  // Offre suivante, depuis la version Sézane affichée : rien de Sézane n'est repris.
  await app.menu('IA', startsWith('Adapter à une offre'));
  await expect(modal.getByLabel('Intitulé du poste')).toHaveValue('');
  await expect(modal.getByLabel('Entreprise', { exact: true })).toHaveValue('');
  await expect(modal.getByLabel('Lien de l’offre (facultatif)')).toHaveValue('');
  await expect(modal.getByLabel('Texte de l’offre')).toHaveValue('');
  // Pour réadapter à la même offre, un clic la reprend.
  await modal.getByRole('button', { name: 'Reprendre son offre' }).click();
  await expect(modal.getByLabel('Entreprise', { exact: true })).toHaveValue('Sézane');
  await expect(modal.getByLabel('Texte de l’offre')).toHaveValue(SEZANE_OFFER);
  await expect(modal.getByRole('button', { name: 'Reprendre son offre' })).toHaveCount(0);

  // Nouvelle offre saisie : la version et la candidature portent la bonne entreprise.
  await modal.getByLabel('Intitulé du poste').fill('Responsable adjointe de magasin');
  await modal.getByLabel('Entreprise', { exact: true }).fill('Kiabi');
  await modal.getByLabel('Lien de l’offre (facultatif)').fill('');
  await modal.getByLabel('Texte de l’offre').fill(KIABI_OFFER);
  await modal.getByRole('button', { name: 'Créer la version sans IA' }).click();
  await expect(app.versionButton.locator('.vm-current-name')).toHaveText('CV – Responsable adjointe de magasin – Kiabi');
  await expect(page).toHaveTitle('CV_Camille_Martin_Kiabi');
  const lib = await app.waitForSaved((l) => l?.applications.length === 2);
  expect(lib.applications.map((a) => a.company)).toEqual(['Sézane', 'Kiabi']);
  expect(lib.applications[1].offerUrl).toBe('');
});

test('lettre commencée dans la version de base : la version créée pour cette offre la reprend', async ({ page, app }) => {
  await app.loadExample();
  await app.view('Lettre');
  const editor = page.locator('.letter-editor');
  await editor.getByRole('textbox', { name: 'Intitulé du poste', exact: true }).fill('Responsable adjointe de magasin');
  await editor.getByRole('textbox', { name: 'Entreprise', exact: true }).fill('Sézane');
  const body = editor.getByRole('textbox', { name: 'Corps de la lettre', exact: true });
  await body.fill('Votre maison incarne une élégance accessible qui me correspond.');

  // L'offre saisie dans la vue Lettre n'a pas encore sa version : elle est reprise, avec la lettre.
  await app.menu('IA', startsWith('Adapter à une offre'));
  const modal = page.locator('.ai-modal');
  await expect(modal.getByLabel('Entreprise', { exact: true })).toHaveValue('Sézane');
  const copy = modal.getByLabel('Reprendre la lettre de motivation de « Exemple – Camille Martin »');
  await expect(copy).toBeChecked();
  await modal.getByRole('button', { name: 'Créer la version sans IA' }).click();
  await app.expectToast('Elle reprend la lettre de motivation de « Exemple – Camille Martin »');
  await expect(app.versionButton.locator('.vm-current-name')).toHaveText('CV – Responsable adjointe de magasin – Sézane');
  await expect(body).toHaveValue('Votre maison incarne une élégance accessible qui me correspond.');
  await expect(app.letter).toContainText('élégance accessible');

  // Sur la version de base, un rappel : chaque offre a sa version, avec sa lettre.
  await app.selectVersion('Exemple – Camille Martin');
  await expect(editor.locator('.letter-base-hint')).toContainText('est votre version de base');

  // Sans reprise (case décochée) : le message dit où la lettre est restée.
  await app.menu('IA', startsWith('Adapter à une offre'));
  await modal.getByLabel('Intitulé du poste').fill('Vendeuse');
  await modal.getByLabel('Entreprise', { exact: true }).fill('Kiabi');
  await expect(copy).not.toBeChecked();
  await modal.getByRole('button', { name: 'Créer la version sans IA' }).click();
  await app.expectToast('celle que vous aviez écrite est restée dans « Exemple – Camille Martin »');
  await expect(body).toHaveValue('');
});

test('l’analyse lit une autre entreprise que celle saisie : la fenêtre le signale et la corrige en un clic', async ({ page, app }) => {
  await mockAiApis(page);
  await page.addInitScript((key) => localStorage.setItem('anthropic_api_key', key), FAKE_ANTHROPIC_KEY);
  await app.loadExample();
  await app.menu('IA', startsWith('Adapter à une offre'));
  const modal = page.locator('.ai-modal');
  await modal.getByLabel('Intitulé du poste').fill('Chargée de marketing digital');
  // Entreprise de la candidature précédente, restée dans le champ ; l'offre est celle de Decathlon.
  await modal.getByLabel('Entreprise', { exact: true }).fill('Sézane');
  await modal.getByLabel('Texte de l’offre').fill(OFFER);
  await modal.getByRole('button', { name: 'Analyser l’offre' }).click();
  const note = modal.locator('.ai-company-note');
  await expect(note).toContainText('L’offre semble concerner « Decathlon », alors que l’entreprise indiquée est « Sézane »');
  await note.getByRole('button', { name: 'Mettre « Decathlon »' }).click();
  await expect(note).toHaveCount(0);
  await modal.getByRole('button', { name: 'Proposer des modifications' }).click();
  await expect(modal.getByLabel('Nom de la nouvelle version')).toHaveValue(VERSION_NAME);
});

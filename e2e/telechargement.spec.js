import { test, expect, exampleResume } from './support/fixtures.js';
import { hasPoppler, pdfFonts, pdfInfo, pdfLines, pdfPagesText, pdfRawText, pdfUrls, POPPLER_MISSING } from './support/pdf.js';

// h) Téléchargement : PDF ATS direct, impression ATS et design (window.print simulé, PDF
// produit par Chrome avec les styles d'impression), texte extractible et pages cohérentes.

test.skip(() => !hasPoppler(), POPPLER_MISSING);

// Texte de l'interface qui ne doit jamais se retrouver dans un document imprimé.
const UI_TEXT = ['Télécharger', 'Éditeur de CV', 'Enregistré', 'Apparence', 'Ajuster à 1 page', 'Aperçu à'];

async function openDownload(page, app) {
  await app.toolbar.locator('.tb-download').click();
  const dialog = page.getByRole('dialog', { name: 'Télécharger mon CV' });
  await expect(dialog).toBeVisible();
  return dialog;
}

const pagesLabel = (n) => `${n} page${n > 1 ? 's' : ''}`;

// Imprime via la fenêtre « Télécharger » et vérifie le PDF obtenu.
async function printAndCheck(page, app, { option, templateClass, file, title }) {
  await app.interceptPrint();
  const dialog = await openDownload(page, app);
  await dialog.getByRole('button', { name: option }).click();
  await app.waitForPrintCall();
  await expect(dialog).toHaveCount(0);
  // Le titre de la page est le nom que l'impression propose pour le PDF.
  if (title) await expect(page).toHaveTitle(title);
  // Pendant l'impression, l'aperçu affiche le modèle choisi, et le compteur ses pages.
  await expect(app.resume).toHaveClass(templateClass);
  await page.waitForTimeout(300);
  const announced = await app.pageBadge.textContent();
  // Chrome émet « afterprint » à la fin de page.pdf(), comme après la vraie fenêtre d'impression.
  const pdf = await app.printToPdf(file);

  const info = pdfInfo(pdf);
  expect(info.pageSize).toContain('(A4)');
  // Le compteur affiché annonce le nombre de pages réellement imprimées.
  expect(announced).toBe(pagesLabel(info.pages));
  const pages = pdfPagesText(pdf);
  pages.forEach((text, i) => expect(text.length, `page ${i + 1} vide`).toBeGreaterThan(20));
  const all = pages.join(' ');
  for (const text of UI_TEXT) expect(all).not.toContain(text);
  await app.finishPrint();
  return { pdf, info, lines: pdfLines(pdf), all };
}

test('PDF ATS en téléchargement direct : fichier nommé, texte extractible, nom en premier', async ({ page, app }) => {
  await app.loadExample();
  const dialog = await openDownload(page, app);
  // Chaque option annonce son fichier : la version design ne porte pas le nom de la version ATS.
  const fileOf = (option) => dialog.getByRole('button', { name: option }).locator('.dl-option-file code');
  await expect(fileOf(/PDF ATS — téléchargement direct/)).toHaveText('CV_Camille_Martin.pdf');
  await expect(fileOf(/PDF ATS via l’impression/)).toHaveText('CV_Camille_Martin.pdf');
  await expect(fileOf(/PDF design via l’impression/)).toHaveText('CV_Camille_Martin_couleur.pdf');
  const download = await app.download(() => dialog.getByRole('button', { name: /PDF ATS — téléchargement direct/ }).click());
  expect(download.name).toBe('CV_Camille_Martin.pdf');
  await expect(dialog).toHaveCount(0);
  await app.expectToast('PDF téléchargé : CV_Camille_Martin.pdf');

  const info = pdfInfo(download.file);
  expect(info.pages).toBeGreaterThanOrEqual(1);
  expect(info.title).toBe('CV_Camille_Martin');
  expect(info.author).toBe('Camille Martin');
  const lines = pdfLines(download.file);
  expect(lines[0]).toBe('Camille Martin');
  const text = lines.join(' ');
  for (const expected of [
    exampleResume.personalInfo.title,
    exampleResume.personalInfo.email,
    exampleResume.experiences[0].title,
    exampleResume.education[0].title,
    exampleResume.mainSkills[0].skills[0],
  ]) {
    expect(text).toContain(expected);
  }
  // Une colonne : le profil vient avant les expériences, elles-mêmes avant la formation.
  expect(text.indexOf('PROFIL')).toBeLessThan(text.indexOf('EXPÉRIENCES PROFESSIONNELLES'));
  expect(text.indexOf('EXPÉRIENCES PROFESSIONNELLES')).toBeLessThan(text.indexOf('FORMATION'));
  pdfPagesText(download.file).forEach((t, i) => expect(t.length, `page ${i + 1} vide`).toBeGreaterThan(20));
});

test('impression ATS : PDF texte, une colonne, autant de pages que le compteur', async ({ page, app }) => {
  await app.loadExample();
  await expect(app.resume).toHaveClass(/resume-design/);
  const { lines, all } = await printAndCheck(page, app, {
    option: /PDF ATS via l’impression/,
    templateClass: /resume-ats-template/,
    file: 'impression-ats.pdf',
    title: 'CV_Camille_Martin',
  });
  expect(lines[0]).toBe('Camille Martin');
  expect(all).toContain(exampleResume.experiences[0].details[0].slice(0, 40));
  // Après l'impression, l'aperçu revient au modèle choisi par l'utilisatrice.
  await expect(app.resume).toHaveClass(/resume-design/);
});

test('impression design : deux colonnes, texte extractible, pas de page blanche', async ({ page, app }) => {
  await app.loadExample();
  const { all, lines } = await printAndCheck(page, app, {
    option: /PDF design via l’impression/,
    templateClass: /resume-design/,
    file: 'impression-design.pdf',
    // Nom distinct de la version ATS : pas de « Remplacer ? » ni de « (1) » dans Téléchargements.
    title: 'CV_Camille_Martin_couleur',
  });
  await expect(page).toHaveTitle('CV_Camille_Martin');
  for (const expected of ['Camille Martin', exampleResume.experiences[0].company]) expect(all).toContain(expected);
  // Les titres de section sont en capitales à l'impression (text-transform).
  expect(all).toContain("CENTRES D'INTÉRÊT");
  // Une URL trop longue pour la sidebar ne se coupe pas juste après un trait d'union : l'extraction
  // le prendrait pour une césure et le retirerait (« camille-martinexemple »).
  expect(all).toContain('linkedin.com/in/');
  expect(all).toContain('camille-martin-exemple');
  expect(all).not.toContain('camille-martinexemple');
  expect(lines.filter((line) => /[a-z]-$/.test(line))).toEqual([]);
});

test('un CV long sur plusieurs pages : compteur et PDF concordent, sans page blanche', async ({ page, app }) => {
  // CV d'exemple avec quatre fois plus d'expériences, importé depuis l'écran d'accueil.
  const long = structuredClone(exampleResume);
  long.experiences = Array.from({ length: 4 }, (_, i) =>
    long.experiences.map((e) => ({ ...e, title: `${e.title} ${i + 1}` })),
  ).flat();
  await app.open();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Importer un fichier JSON/ }).click();
  await (await chooser).setFiles({ name: 'cv-long.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(long)) });
  await expect(app.resume.locator('h1')).toHaveText('Camille Martin');

  const design = await printAndCheck(page, app, {
    option: /PDF design via l’impression/,
    templateClass: /resume-design/,
    file: 'long-design.pdf',
  });
  expect(design.info.pages).toBeGreaterThanOrEqual(2);
  const ats = await printAndCheck(page, app, {
    option: /PDF ATS via l’impression/,
    templateClass: /resume-ats-template/,
    file: 'long-ats.pdf',
  });
  expect(ats.info.pages).toBeGreaterThanOrEqual(2);
  for (const n of [1, 2, 3, 4]) expect(ats.all).toContain(`${exampleResume.experiences[0].title} ${n}`);
  // « Ajuster à 1 page » est proposé quand le CV dépasse une page.
  await expect(page.getByRole('button', { name: 'Ajuster à 1 page' })).toBeVisible();
});

test('PDF direct : la fenêtre annonce ses pages réelles et propose de voir sa mise en page', async ({ page, app }) => {
  await app.loadExample();
  // Modèle Design : l'aperçu tient sur une page, la version ATS en une colonne non.
  await expect(app.pageBadge).toHaveText('1 page');
  const dialog = await openDownload(page, app);
  const announced = dialog.locator('.dl-option-pages');
  await expect(announced).toHaveText(/^Ce PDF fait \d+ pages?\.$/);
  await expect(dialog.getByRole('button', { name: /PDF ATS — téléchargement direct/ })).toContainText('sans photo');
  const download = await app.download(() => dialog.getByRole('button', { name: /PDF ATS — téléchargement direct/ }).click());
  const { pages } = pdfInfo(download.file);
  expect(pages).toBeGreaterThan(1);

  const again = await openDownload(page, app);
  await expect(again.locator('.dl-option-pages')).toHaveText(`Ce PDF fait ${pagesLabel(pages)}.`);
  await again.getByRole('button', { name: 'Voir l’aperçu ATS' }).click();
  await expect(again).toHaveCount(0);
  await expect(app.resume).toHaveClass(/resume-ats-template/);
  // L'aperçu est une mise en page HTML proche du PDF, pas le PDF lui-même : le message ne promet pas plus.
  await app.expectToast('ses sauts de page peuvent différer');
  await expect(app.pageBadge).toHaveText(pagesLabel(pages));
  // L'aperçu ATS est maintenant celui affiché : plus de remarque « pas la mise en page affichée ».
  const third = await openDownload(page, app);
  await expect(third.locator('.dl-option-note', { hasText: 'Ce n’est pas la mise en page affichée' })).toHaveCount(0);
  // C'est maintenant le PDF design qui n'est pas affiché : la fenêtre ne promet plus « comme dans l'aperçu ».
  const design = third.getByRole('button', { name: /PDF design via l’impression/ });
  await expect(design).toContainText('et non l’aperçu affiché (modèle ATS)');
  await expect(design).not.toContainText('comme dans l’aperçu');
  await third.getByRole('button', { name: 'Voir l’aperçu Design' }).click();
  await expect(third).toHaveCount(0);
  await expect(app.resume).toHaveClass(/resume-design/);
  const fourth = await openDownload(page, app);
  await expect(fourth.getByRole('button', { name: /PDF design via l’impression/ })).toContainText('comme dans l’aperçu');
  await expect(fourth.getByRole('button', { name: 'Voir l’aperçu Design' })).toHaveCount(0);
});

test('« Ajuster à 1 page » (modèle ATS) : le PDF direct recommandé tient aussi sur une page', async ({ page, app }) => {
  // Exemple sans « Autres expériences » mais avec 12 puces de plus : 2 pages en ATS, 1 page vers 85 %.
  const cv = structuredClone(exampleResume);
  cv.otherExperiences = [];
  cv.customSections = [];
  cv.certifications = [];
  const extra = Array.from({ length: 12 }, (_, i) => `Puce supplémentaire numéro ${i + 1} : suivi des actions et compte rendu.`);
  cv.experiences[0].details.push(...extra.slice(0, 6));
  cv.experiences[1].details.push(...extra.slice(6));
  await app.open();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Importer un fichier JSON/ }).click();
  await (await chooser).setFiles({ name: 'cv-k12.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(cv)) });
  await expect(app.resume.locator('h1')).toHaveText('Camille Martin');
  await app.setTemplate('ATS (sobre)');
  await expect(app.pageBadge).toHaveText('2 pages');

  await page.getByRole('button', { name: 'Ajuster à 1 page' }).click();
  await app.expectToast('Le CV tient sur 1 page');
  await expect(app.pageBadge).toHaveText('1 page');

  const dialog = await openDownload(page, app);
  await expect(dialog.locator('.dl-option-pages')).toHaveText('Ce PDF fait 1 page.');
  await expect(dialog.getByRole('button', { name: /PDF ATS — téléchargement direct/ })).toContainText('Recommandé');
  const download = await app.download(() => dialog.getByRole('button', { name: /PDF ATS — téléchargement direct/ }).click());
  expect(pdfInfo(download.file).pages).toBe(1);
});

test('emoji dans le CV : le PDF direct reste recommandé, et la fenêtre dit qu’il les retire', async ({ page, app }) => {
  await app.loadExample();
  await page.locator('#ed-pi-title').fill('✨ Chargée de communication 🚀');
  const dialog = await openDownload(page, app);
  await expect(dialog.getByRole('button', { name: /PDF ATS — téléchargement direct/ })).toContainText(
    'Recommandé pour les sites carrières',
  );
  await expect(dialog.getByRole('button', { name: /PDF ATS via l’impression/ })).not.toContainText('Recommandé');
  await expect(dialog.locator('.callout', { hasText: 'Le PDF direct ne peut pas écrire certains caractères' })).toHaveCount(0);
  await expect(dialog.locator('.callout', { hasText: 'Les emoji et symboles de votre CV' })).toContainText('✨ 🚀');
  const download = await app.download(() => dialog.getByRole('button', { name: /PDF ATS — téléchargement direct/ }).click());
  const text = pdfLines(download.file).join(' ');
  expect(text).toContain('Chargée de communication');
  expect(text).not.toMatch(/[✨🚀]/u);
  expect(pdfFonts(download.file).filter((f) => f.type === 'Type 3')).toEqual([]);
});

test('PDF direct : liens téléphone sans « (0) » et e-mail en mailto:, nom de fichier translittéré', async ({ page, app }) => {
  await app.loadExample();
  await page.locator('#ed-pi-name').fill('Lætitia Cœur');
  await page.locator('#ed-pi-phone').fill('+33 (0)6 12 34 56 78');
  const links = await app.openPanel('links');
  await links.getByRole('button', { name: 'Ajouter un lien' }).click();
  await links.getByLabel('Nom du lien').last().fill('E-mail pro');
  await links.getByLabel('Adresse', { exact: true }).last().fill('laetitia.pro@exemple.fr');
  await expect(page).toHaveTitle('CV_Laetitia_Coeur');
  await expect(app.resume.locator('a[href="mailto:laetitia.pro@exemple.fr"]')).toHaveCount(1);

  const dialog = await openDownload(page, app);
  const download = await app.download(() => dialog.getByRole('button', { name: /PDF ATS — téléchargement direct/ }).click());
  expect(download.name).toBe('CV_Laetitia_Coeur.pdf');
  const urls = pdfUrls(download.file);
  expect(urls).toContain('tel:+33612345678');
  expect(urls).toContain('mailto:laetitia.pro@exemple.fr');
  expect(urls.some((u) => u.startsWith('https://laetitia.pro@'))).toBe(false);
});

test('caractères hors du PDF direct : la fenêtre prévient et recommande l’impression, qui les garde', async ({ page, app }) => {
  await app.loadExample();
  await page.locator('#ed-pi-name').fill('Ștefania Łukasiewicz');
  const langs = await app.openPanel('languages');
  await langs.getByRole('button', { name: 'Ajouter une langue' }).click();
  await langs.getByLabel('Langue', { exact: true }).last().fill('Russe (русский)');

  const dialog = await openDownload(page, app);
  const warning = dialog.locator('.callout', { hasText: 'Le PDF direct ne peut pas écrire certains caractères' });
  await expect(warning).toContainText('« Ș », « Ł », « русский »');
  await expect(dialog.getByRole('button', { name: /PDF ATS via l’impression/ })).toContainText('Recommandé pour votre CV');
  await expect(dialog.getByRole('button', { name: /PDF ATS — téléchargement direct/ })).not.toContainText('Recommandé');

  await app.interceptPrint();
  await dialog.getByRole('button', { name: /PDF ATS via l’impression/ }).click();
  await app.waitForPrintCall();
  await expect(app.resume).toHaveClass(/resume-ats-template/);
  const pdf = await app.printToPdf('caracteres.pdf');
  const text = pdfLines(pdf).join(' ');
  expect(text).toContain('Ștefania Łukasiewicz');
  expect(text).toContain('русский');
  await app.finishPrint();
});

test('chaque police proposée donne un PDF imprimé lisible : pas de Type 3, des espaces entre les mots', async ({ page, app }) => {
  await app.loadExample();
  await app.toolbarButton('Apparence').click();
  const fontSelect = page.getByLabel('Police', { exact: true });
  const fonts = await fontSelect.locator('option').evaluateAll((options) => options.map((o) => [o.value, o.textContent]));
  await page.keyboard.press('Escape');
  expect(fonts.map(([, label]) => label)).not.toContain('Police système');

  for (const [value, label] of fonts) {
    await app.toolbarButton('Apparence').click();
    await page.getByLabel('Police', { exact: true }).selectOption(value);
    await page.keyboard.press('Escape');
    for (const template of ['Design', 'ATS (sobre)']) {
      await app.setTemplate(template);
      const pdf = await app.printToPdf(`police-${value}-${template === 'Design' ? 'design' : 'ats'}.pdf`);
      const type3 = pdfFonts(pdf).filter((f) => f.type === 'Type 3');
      expect(type3, `${label}, ${template}`).toEqual([]);
      expect(pdfRawText(pdf), `${label}, ${template}`).toContain('Camille Martin');
    }
  }
});

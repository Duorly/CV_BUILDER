import { test, expect } from './support/fixtures.js';

// e) Sections : renommer, masquer, déplacer, ajouter une section libre ; les deux modèles suivent.

const headings = (locator) => locator.locator('h2').allTextContents();

test('renommer, masquer, déplacer et ajouter une section se reflète dans les deux modèles', async ({ page, app }) => {
  await app.loadExample();
  const main = app.resume.locator('.main-content');
  const sidebar = app.resume.locator('.sidebar');
  expect(await headings(main)).toEqual(['Expériences professionnelles', 'Formation', 'Autres expériences']);

  // Renommer « Expériences professionnelles » (Entrée valide).
  await page.locator('#ed-panel-experiences-rename').click();
  const titleInput = page.locator('#ed-panel-experiences-title');
  await expect(titleInput).toBeFocused();
  await expect(titleInput).toHaveAttribute('placeholder', 'Expériences professionnelles');
  await titleInput.fill('Parcours professionnel');
  await titleInput.press('Enter');
  await expect(page.locator('#ed-panel-experiences .editor-panel-title')).toHaveText('Parcours professionnel');

  // Échap annule un renommage en cours.
  await page.locator('#ed-panel-education-rename').click();
  await page.locator('#ed-panel-education-title').fill('Études');
  await page.locator('#ed-panel-education-title').press('Escape');
  await expect(page.locator('#ed-panel-education .editor-panel-title')).toHaveText('Formation');

  // Masquer « Langues ».
  await page.locator('#ed-panel-languages-visibility').click();
  await expect(page.locator('#ed-panel-languages-visibility')).toHaveAttribute('aria-label', 'Afficher « Langues » sur le CV');
  await expect(sidebar).not.toContainText('Langue maternelle');

  // Déplacer « Formation » au-dessus des expériences.
  await page.locator('#ed-panel-education-up').click();
  await expect(page.locator('#ed-panel-education-up')).toBeFocused();

  // Section libre « Publications », d'abord dans la colonne principale.
  await page.getByRole('button', { name: 'Ajouter une section libre' }).click();
  const custom = page.locator('.editor-section-panel').last();
  const customTitle = custom.getByLabel('Titre de la section', { exact: true });
  await expect(customTitle).toBeFocused();
  await customTitle.fill('Publications');
  await custom.locator('textarea.detail-input').first().fill('Article « Communiquer en local », revue Com’ (2024)');

  expect(await headings(main)).toEqual(['Formation', 'Parcours professionnel', 'Autres expériences', 'Publications']);
  await expect(main).toContainText('Article « Communiquer en local »');
  const sideHeadings = await headings(sidebar);
  expect(sideHeadings).not.toContain('Langues');
  expect(sideHeadings).toEqual(expect.arrayContaining(['Compétences', 'Liens', 'Certifications', "Centres d'intérêt"]));

  // Colonne latérale.
  await custom.getByLabel('Emplacement (modèles Design, Classique et Focus)').selectOption('sidebar');
  await expect(sidebar.locator('h2', { hasText: 'Publications' })).toBeVisible();
  expect(await headings(main)).toEqual(['Formation', 'Parcours professionnel', 'Autres expériences']);

  // Modèle ATS : une colonne, même ordre, mêmes titres, même section masquée.
  await app.setTemplate('ATS (sobre)');
  const ats = await headings(app.resume);
  expect(ats).toContain('Parcours professionnel');
  expect(ats).not.toContain('Expériences professionnelles');
  expect(ats).not.toContain('Langues');
  expect(ats).toContain('Publications');
  expect(ats.indexOf('Formation')).toBeLessThan(ats.indexOf('Parcours professionnel'));
  expect(ats.indexOf('Publications')).toBe(ats.length - 1);
  await expect(app.resume).toContainText('Article « Communiquer en local »');
  await expect(app.resume).not.toContainText('Langue maternelle');

  // Réafficher « Langues » : elle revient dans le modèle ATS.
  await page.locator('#ed-panel-languages-visibility').click();
  await expect(app.resume.locator('h2', { hasText: 'Langues' })).toBeVisible();

  // Tout est enregistré avec la version.
  const lib = await app.waitForSaved((l) => l?.cvs[0].data.customSections.some((c) => c.title === 'Publications'));
  const order = lib.cvs[0].data.sections.map((s) => s.id);
  expect(order.indexOf('education')).toBeLessThan(order.indexOf('experiences'));
  expect(lib.cvs[0].data.sections.find((s) => s.id === 'experiences').title).toBe('Parcours professionnel');
});

test('une section libre supprimée disparaît des deux modèles', async ({ page, app }) => {
  await app.startBlank();
  await page.getByRole('button', { name: 'Ajouter une section libre' }).click();
  const custom = page.locator('.editor-section-panel').last();
  await custom.getByLabel('Titre de la section', { exact: true }).fill('Bénévolat');
  await custom.locator('textarea.detail-input').first().fill('Collecte annuelle de la banque alimentaire');
  await expect(app.resume.locator('h2', { hasText: 'Bénévolat' })).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await custom.getByRole('button', { name: 'Supprimer cette section' }).click();
  await expect(app.resume.locator('h2')).toHaveCount(0);
  await app.setTemplate('ATS (sobre)');
  await expect(app.resume).not.toContainText('Bénévolat');
});

test('une formation masquée disparaît des deux modèles sans être supprimée', async ({ page, app }) => {
  await app.loadExample();
  const panel = await app.openPanel('education');
  const label = 'Master Communication des organisations — Université Lumière Lyon 2';
  await panel.getByRole('button', { name: `Masquer « ${label} » sur le CV` }).click();
  await expect(panel.getByRole('button', { name: `Afficher « ${label} » sur le CV` })).toBeVisible();
  await expect(panel.locator('.editor-panel-meta')).toContainText('2 formations dont 1 masquée');
  await expect(app.resume).not.toContainText('Master Communication des organisations');
  await expect(app.resume).toContainText('Licence Information-Communication');

  await app.setTemplate('ATS (sobre)');
  await expect(app.resume).not.toContainText('Master Communication des organisations');

  const lib = await app.waitForSaved((l) => l?.cvs[0].data.education.some((e) => e.hidden));
  expect(lib.cvs[0].data.education.map((e) => e.hidden)).toEqual([true, false]);

  await panel.getByRole('button', { name: `Afficher « ${label} » sur le CV` }).click();
  await expect(app.resume).toContainText('Master Communication des organisations');
});

test('une expérience masquée disparaît des deux modèles sans être supprimée', async ({ page, app }) => {
  await app.loadExample();
  const panel = await app.openPanel('experiences');
  const label = 'Chargée de communication — Maison Lumière (réseau de 12 boutiques)';
  await panel.getByRole('button', { name: `Masquer « ${label} » sur le CV` }).click();
  await expect(panel.locator('.editor-panel-meta')).toContainText('3 expériences dont 1 masquée');
  await expect(app.resume).not.toContainText('Maison Lumière');
  await expect(app.resume).toContainText('Agence Hublot');
  await app.setTemplate('ATS (sobre)');
  await expect(app.resume).not.toContainText('Maison Lumière');
  const lib = await app.waitForSaved((l) => l?.cvs[0].data.experiences[0].hidden);
  expect(lib.cvs[0].data.experiences[0].details.length).toBeGreaterThan(0);
});

test('centres d’intérêt sur une ligne ou les uns au-dessus des autres', async ({ page, app }) => {
  await app.loadExample();
  const panel = await app.openPanel('custom:sec_interets');
  const sidebar = app.resume.locator('.sidebar');
  await expect(sidebar.locator('li', { hasText: 'Photographie argentique' })).toBeVisible();
  await panel.getByLabel('Présentation', { exact: true }).selectOption('inline');
  await expect(sidebar).toContainText('Photographie argentique · Course à pied (semi-marathon) · Théâtre amateur');
  await expect(sidebar.locator('li', { hasText: 'Photographie argentique' })).toHaveCount(0);
  await app.setTemplate('ATS (sobre)');
  await expect(app.resume).toContainText('Photographie argentique · Course à pied');
  await app.waitForSaved((l) => l?.cvs[0].data.customSections[0].layout === 'inline');
});

test('ligne de texte : sans titre, dans la colonne principale ou la colonne latérale, sur tous les modèles', async ({ page, app }) => {
  await app.loadExample();
  const text = 'Disponible immédiatement, mobile en Île-de-France';
  await page.getByRole('button', { name: 'Ajouter une ligne de texte' }).click();
  const panel = page.locator('.editor-section-panel').last();
  const line = panel.getByRole('textbox', { name: 'Texte, ligne 1' });
  await expect(line).toBeFocused();
  await line.fill(text);

  // Colonne principale par défaut, sans titre de section ; l'éditeur la nomme par son début.
  const main = app.resume.locator('.main-content');
  const sidebar = app.resume.locator('.sidebar');
  await expect(main.locator('p.main-text')).toHaveText(text);
  await expect(app.resume.locator('section', { hasText: text }).locator('h2')).toHaveCount(0);
  await expect(panel).toContainText('Ligne de texte');
  await expect(panel.getByRole('button', { name: /^Masquer « Disponible immédiatement, mobile/ })).toBeVisible();
  await expect(panel.getByLabel('Titre (facultatif)')).toHaveValue('');

  // Dans la colonne latérale, sur les modèles Design et Classique.
  await panel.getByLabel('Emplacement (modèles Design, Classique et Focus)').selectOption('sidebar');
  await expect(sidebar.locator('p.side-text')).toHaveText(text);
  await expect(main).not.toContainText(text);
  await app.setTemplate('Classique');
  await expect(app.resume.locator('.sidebar .cl-side-text')).toHaveText(text);
  // Le modèle ATS l'affiche dans l'ordre des sections, sans puce.
  await app.setTemplate('ATS (sobre)');
  await expect(app.resume.locator('p.ats-line', { hasText: text })).toBeVisible();
  await expect(app.resume.locator('li', { hasText: text })).toHaveCount(0);

  const lib = await app.waitForSaved((l) => l?.cvs[0].data.customSections.some((c) => c.layout === 'text' && c.column === 'sidebar'));
  expect(lib.cvs[0].data.customSections.find((c) => c.layout === 'text')).toMatchObject({ title: '', items: [text] });
});

test('un groupe de compétences masqué disparaît des deux modèles sans être supprimé', async ({ page, app }) => {
  await app.loadExample();
  const panel = await app.openPanel('skills');
  await panel.getByRole('button', { name: 'Masquer « Communication » sur le CV' }).click();
  await expect(panel.getByRole('button', { name: 'Afficher « Communication » sur le CV' })).toBeVisible();
  await expect(panel.locator('.editor-panel-meta')).toContainText('dont 4 masquées');
  await expect(app.resume).not.toContainText('Stratégie éditoriale');
  await expect(app.resume).toContainText('Google Analytics');

  await app.setTemplate('ATS (sobre)');
  await expect(app.resume).not.toContainText('Stratégie éditoriale');

  const lib = await app.waitForSaved((l) => l?.cvs[0].data.mainSkills[0].hidden);
  expect(lib.cvs[0].data.mainSkills[0].skills).toContain('Stratégie éditoriale');
});

test('Apparence : en-tête centré et texte justifié dans les deux modèles', async ({ page, app }) => {
  await app.loadExample();
  const align = (selector) => app.resume.locator(selector).first().evaluate((el) => getComputedStyle(el).textAlign);
  expect(await align('h1')).not.toBe('center');
  expect(await align('.exp-details li')).not.toBe('justify');

  await app.toolbarButton('Apparence').click();
  await page.getByRole('radio', { name: 'Centré' }).click();
  await page.getByRole('radio', { name: 'Justifié' }).click();
  await page.keyboard.press('Escape');
  expect(await align('h1')).toBe('center');
  expect(await align('.exp-details li')).toBe('justify');

  await app.setTemplate('ATS (sobre)');
  expect(await align('h1')).toBe('center');
  expect(await align('.ats-detail-list li')).toBe('justify');

  const lib = await app.waitForSaved((l) => l?.cvs[0].settings.textAlign === 'justify');
  expect(lib.cvs[0].settings.headerAlign).toBe('center');
});

test('masquer une puce, une compétence et un lien sans les supprimer', async ({ page, app }) => {
  await app.loadExample();

  const exp = await app.openPanel('experiences');
  await exp.locator('.editor-card-toggle').first().click();
  await exp.getByRole('button', { name: 'Masquer la puce 2 sur le CV' }).click();
  await expect(exp.getByRole('button', { name: 'Afficher la puce 2 sur le CV' })).toBeVisible();
  await expect(app.resume).not.toContainText('Animation des réseaux sociaux');
  await expect(app.resume).toContainText('Organisation de 6 événements');

  // La puce masquée suit son texte quand on déplace la première vers le bas.
  await exp.getByRole('button', { name: 'Descendre la puce 1' }).click();
  await expect(exp.getByRole('button', { name: 'Afficher la puce 1 sur le CV' })).toBeVisible();
  await expect(app.resume).not.toContainText('Animation des réseaux sociaux');

  const skills = await app.openPanel('skills');
  await skills.locator('.editor-card-toggle').first().click();
  await skills.getByRole('button', { name: 'Masquer « Relations presse » sur le CV' }).click();
  await expect(app.resume).not.toContainText('Relations presse');
  await expect(skills.locator('.editor-panel-meta')).toContainText('dont 1 masquée');

  const links = await app.openPanel('links');
  await links.getByRole('button', { name: /^Masquer « Portfolio/ }).click();
  await expect(app.resume).not.toContainText('camille-martin.exemple.fr');

  await app.setTemplate('ATS (sobre)');
  await expect(app.resume).not.toContainText('Animation des réseaux sociaux');
  await expect(app.resume).not.toContainText('Relations presse');
  await expect(app.resume).not.toContainText('camille-martin.exemple.fr');

  const lib = await app.waitForSaved((l) => l?.cvs[0].data.socialLinks[1]?.hidden);
  const saved = lib.cvs[0].data;
  expect(saved.experiences[0].hiddenDetails).toEqual([0]);
  expect(saved.experiences[0].details[0]).toContain('Animation des réseaux sociaux');
  expect(saved.mainSkills[0].hiddenSkills).toEqual(['Relations presse']);
});

test('Apparence : marges et espacement dans les deux modèles', async ({ page, app }) => {
  await app.loadExample();
  const px = (selector, prop) =>
    app.resume.locator(selector).first().evaluate((el, p) => parseFloat(getComputedStyle(el)[p]), prop);
  const sidebarPad = await px('.sidebar', 'paddingLeft');
  const sectionGap = await px('.main-section', 'marginBottom');

  await app.toolbarButton('Apparence').click();
  await page.getByRole('radio', { name: 'Étroites' }).click();
  await page.getByRole('radio', { name: 'Aéré' }).click();
  await page.keyboard.press('Escape');
  expect(await px('.sidebar', 'paddingLeft')).toBeCloseTo(sidebarPad * 0.7, 0);
  expect(await px('.main-section', 'marginBottom')).toBeCloseTo(sectionGap * 1.4, 0);

  await app.setTemplate('ATS (sobre)');
  expect(await px(':scope', 'paddingTop')).toBeCloseTo(14 * 0.7 * (96 / 25.4), 0);
  const printRules = await page.evaluate(() =>
    [...document.querySelectorAll('style[media="print"]')].map((style) => style.textContent),
  );
  expect(printRules).toContain('@page { size: A4; margin: 9.8mm 0; }');

  const lib = await app.waitForSaved((l) => l?.cvs[0].settings.margins === 'narrow');
  expect(lib.cvs[0].settings.spacing).toBe('airy');
});

test('modèle ATS : en-tête coloré en option, titres de section sans filet', async ({ page, app }) => {
  await app.loadExample();
  await app.setTemplate('ATS (sobre)');
  const css = (selector, prop) =>
    app.resume.locator(selector).first().evaluate((el, p) => getComputedStyle(el)[p], prop);
  expect(await css('.ats-section > h2', 'borderBottomStyle')).toBe('none');
  expect(await css('.ats-header', 'borderBottomStyle')).toBe('solid');

  await app.toolbarButton('Apparence').click();
  await page.getByRole('radio', { name: 'Coloré' }).click();
  await page.keyboard.press('Escape');
  expect(await css('.ats-header', 'backgroundColor')).toBe('rgb(37, 99, 235)');
  expect(await css('.ats-header h1', 'color')).toBe('rgb(255, 255, 255)');
  expect(await css('.ats-header', 'borderBottomStyle')).toBe('none');
  // Le bandeau va d'un bord à l'autre de la page.
  const [header, page_] = await Promise.all([
    app.resume.locator('.ats-header').boundingBox(),
    app.resume.boundingBox(),
  ]);
  expect(Math.abs(header.width - page_.width)).toBeLessThan(2);
  await app.waitForSaved((l) => l?.cvs[0].settings.headerStyle === 'colored');
});

test('Apparence : couleur du texte de la colonne et du corps, chacune sur sa zone', async ({ page, app }) => {
  await app.loadExample();
  const color = (selector) => app.resume.locator(selector).first().evaluate((el) => getComputedStyle(el).color);
  const DEFAULT_DARK = 'rgb(17, 24, 39)';
  expect(await color('.sidebar h1')).toBe(DEFAULT_DARK);
  expect(await color('.main-content .exp-header h3')).toBe(DEFAULT_DARK);

  await app.toolbarButton('Apparence').click();
  const panel = page.getByRole('complementary', { name: 'Apparence' });
  await panel.getByLabel('Texte de la colonne').fill('#ffffff');
  await panel.getByLabel('Texte du corps').fill('#7c2d12');
  await page.keyboard.press('Escape');

  // Colonne : nom et langues en blanc… ici sur le fond clair d'origine, donc assombris pour rester lisibles.
  expect(await contrastWith(app, '.sidebar h1', '.sidebar')).toBeGreaterThanOrEqual(4.5);
  // Corps : intitulés en brun, missions dans une nuance plus douce du même brun.
  expect(await color('.main-content .exp-header h3')).toBe('rgb(124, 45, 18)');
  expect(await color('.main-content .exp-details')).not.toBe('rgb(55, 65, 81)');

  // Colonne bleu nuit : le texte blanc y est tel quel.
  await app.toolbarButton('Apparence').click();
  await panel.getByLabel('Fond de la colonne').fill('#1e3a8a');
  await page.keyboard.press('Escape');
  expect(await color('.sidebar h1')).toBe('rgb(255, 255, 255)');
  expect(await color('.sidebar .lang-list li')).toBe('rgb(255, 255, 255)');
  for (const selector of ['.sidebar .contact-info', '.sidebar .sidebar-sub-title', '.sidebar .cert-info span']) {
    expect(await contrastWith(app, selector, '.sidebar'), selector).toBeGreaterThanOrEqual(4.5);
  }
  // La couleur principale (bleu) se confondrait avec ce fond : poste et compétences sont éclaircis.
  for (const selector of ['.profile-title', '.skills-tags .tag']) {
    expect(await color(selector)).not.toBe('rgb(37, 99, 235)');
    expect(await contrastWith(app, selector, '.sidebar'), selector).toBeGreaterThanOrEqual(4.5);
  }
  // … et l'Apparence le dit, avec la teinte utilisée.
  await app.toolbarButton('Apparence').click();
  const note = panel.locator('.ap-note');
  await expect(note).toContainText('couleur principale (colonne)');
  await expect(note).not.toContainText('texte de la colonne');

  // Couleur principale jaune : illisible en texte sur la page blanche, elle y est assombrie ;
  // le bandeau coloré du modèle ATS garde la couleur choisie.
  await panel.getByLabel('Couleur principale').fill('#fbbf24');
  await expect(note).toContainText('couleur principale (corps)');
  await page.keyboard.press('Escape');
  await app.setTemplate('ATS (sobre)');
  expect(await color('.ats-header h1')).toBe('rgb(124, 45, 18)');
  expect(await color('.ats-item-header h3')).toBe('rgb(124, 45, 18)');
  expect(await contrastWith(app, '.ats-title', ':scope')).toBeGreaterThanOrEqual(4.5);
  expect(await contrastWith(app, '.ats-section > h2', ':scope')).toBeGreaterThanOrEqual(4.5);
  await app.toolbarButton('Apparence').click();
  await page.getByRole('radio', { name: 'Coloré' }).click();
  await page.keyboard.press('Escape');
  expect(
    await app.resume.locator('.ats-header').evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe('rgb(251, 191, 36)');

  const lib = await app.waitForSaved((l) => l?.cvs[0].settings.primaryColor === '#fbbf24');
  expect(lib.cvs[0].settings).toMatchObject({ sidebarBg: '#1e3a8a', sidebarTextColor: '#ffffff', textColor: '#7c2d12' });
});

// Contraste WCAG entre la couleur du texte de `selector` et le fond de `backgroundSelector` (dans le CV).
async function contrastWith(app, selector, backgroundSelector) {
  return app.resume.evaluate(
    (root, [sel, bgSel]) => {
      const rgb = (value) => value.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
      const lum = ([r, g, b]) => {
        const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
        return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      };
      const text = lum(rgb(getComputedStyle(root.querySelector(sel)).color));
      const bgEl = bgSel === ':scope' ? root : root.querySelector(bgSel);
      // Colonne du modèle Design : son fond est peint par le dégradé de la racine (--sidebar-bg).
      const bgValue = bgSel === '.sidebar' ? getComputedStyle(root).getPropertyValue('--sidebar-bg').trim() : getComputedStyle(bgEl).backgroundColor;
      const hex = bgValue.startsWith('#') ? [1, 3, 5].map((i) => parseInt(bgValue.slice(i, i + 2), 16)) : rgb(bgValue);
      const bg = lum(hex);
      return (Math.max(text, bg) + 0.05) / (Math.min(text, bg) + 0.05);
    },
    [selector, backgroundSelector],
  );
}

test('Apparence : compétences en étiquettes ou en liste à puces (modèle Design)', async ({ page, app }) => {
  await app.loadExample();
  const skills = app.resume.locator('.sidebar-section').filter({ has: page.getByRole('heading', { name: 'Compétences' }) });
  await expect(skills.locator('.skills-tags .tag').first()).toHaveText('Stratégie éditoriale');
  const height = async () => (await skills.boundingBox()).height;
  const tagsHeight = await height();

  await app.toolbarButton('Apparence').click();
  await page.getByRole('radio', { name: 'Liste à puces' }).click();
  await page.keyboard.press('Escape');
  await expect(skills.locator('.skills-tags')).toHaveCount(0);
  await expect(skills.locator('.skills-list li').first()).toHaveText('Stratégie éditoriale');
  await expect(skills.locator('.skills-list li')).toHaveCount(16);
  // Plus compacte que les étiquettes.
  expect(await height()).toBeLessThan(tagsHeight);
  // Chaque compétence est précédée d'un point de la couleur principale.
  const dot = await skills
    .locator('.skills-list li')
    .first()
    .evaluate((el) => getComputedStyle(el, '::before').backgroundColor);
  expect(dot).toBe('rgb(37, 99, 235)');

  const lib = await app.waitForSaved((l) => l?.cvs[0].settings.skillsStyle === 'list');
  expect(lib.cvs[0].settings.template).toBe('design');

  // Retour aux étiquettes.
  await app.toolbarButton('Apparence').click();
  await page.getByRole('radio', { name: 'Étiquettes' }).click();
  await page.keyboard.press('Escape');
  await expect(skills.locator('.skills-tags .tag')).toHaveCount(16);
});

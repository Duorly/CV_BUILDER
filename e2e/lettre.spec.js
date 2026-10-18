import { test, expect, exampleResume } from './support/fixtures.js';
import { MOCK, mockAiApis, personalDataOf } from './support/ai-mock.js';
import { hasPoppler, pdfInfo, pdfPagesText, POPPLER_MISSING } from './support/pdf.js';

// j) Lettre de motivation : pré-remplissage, saisie, brouillon IA simulé, impression sur une page.

const BODY =
  'Votre enseigne place le sport au cœur de sa communication, et c’est exactement ce qui me motive.\n\n' +
  'Depuis trois ans, je pilote le plan de communication d’un réseau de boutiques.\n\n' +
  'Je serais ravie de vous présenter mes idées lors d’un entretien.';

test('pré-remplir, rédiger, demander un brouillon IA puis imprimer la lettre sur une page', async ({ page, app }) => {
  test.skip(!hasPoppler(), POPPLER_MISSING);
  const requests = await mockAiApis(page);
  await page.addInitScript(() => localStorage.setItem('anthropic_api_key', 'sk-ant-api03-cle-factice-e2e'));
  await app.loadExample();
  await app.view('Lettre');
  await expect(app.letter).toBeVisible();
  await expect(page).toHaveTitle('LM_Camille_Martin');
  const editor = page.locator('.letter-editor');

  // Poste visé : enregistré avec la version, il sert au titre du fichier.
  await editor.getByRole('textbox', { name: 'Intitulé du poste', exact: true }).fill('Chargée de communication');
  await editor.getByRole('textbox', { name: 'Entreprise', exact: true }).fill('Decathlon');
  await expect(page).toHaveTitle('LM_Camille_Martin_Decathlon');

  // Pré-remplir : seuls les champs vides sont complétés.
  await editor.getByRole('button', { name: 'Pré-remplir' }).click();
  await expect(editor.locator('.letter-notice')).toContainText('champs pré-remplis');
  await expect(editor.getByRole('textbox', { name: 'Entreprise ou service', exact: true })).toHaveValue('Decathlon');
  await expect(editor.getByRole('textbox', { name: 'Objet', exact: true })).toHaveValue('Candidature au poste de Chargée de communication');
  await expect(editor.getByRole('textbox', { name: 'Lieu', exact: true })).toHaveValue('Lyon');
  await expect(editor.getByRole('textbox', { name: 'Date', exact: true })).not.toHaveValue('');
  await expect(editor.getByRole('textbox', { name: 'Formule d’appel', exact: true })).toHaveValue('Madame, Monsieur,');
  await expect(editor.getByRole('textbox', { name: 'Signature', exact: true })).toHaveValue('Camille Martin');
  await editor.getByRole('button', { name: 'Pré-remplir' }).click();
  await expect(editor.locator('.letter-notice')).toHaveText('Tout est déjà rempli : rien n’a été modifié.');

  // Saisie du corps : un paragraphe par bloc séparé d'une ligne vide.
  await editor.getByRole('textbox', { name: 'Nom du destinataire', exact: true }).fill('Mme Claire Dubois');
  await editor.getByRole('textbox', { name: 'Corps de la lettre', exact: true }).fill(BODY);
  await expect(app.letter).toContainText('Mme Claire Dubois');
  await expect(app.letter).toContainText('Lyon, le ');
  await expect(app.letter).toContainText('Candidature au poste de Chargée de communication');
  for (const paragraph of BODY.split('\n\n')) await expect(app.letter).toContainText(paragraph);

  // Brouillon IA : il remplace le texte après confirmation, et l'ancien texte peut être rétabli.
  await editor.getByRole('button', { name: 'Rédiger un brouillon' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Remplacer votre texte ?' });
  await confirm.getByRole('button', { name: 'Remplacer par le brouillon' }).click();
  await expect(editor.getByRole('textbox', { name: 'Corps de la lettre', exact: true })).toHaveValue(MOCK.letterBody);
  await expect(editor.getByText('Brouillon inséré dans la lettre.')).toBeVisible();
  await expect(app.letter).toContainText('brouillon simulé');
  await editor.getByRole('button', { name: 'Rétablir mon texte précédent' }).click();
  await expect(editor.getByRole('textbox', { name: 'Corps de la lettre', exact: true })).toHaveValue(BODY);
  await expect(app.letter).not.toContainText('brouillon simulé');

  const post = requests.find((r) => r.method === 'POST');
  expect(post.body).toContain('Chargée de communication');
  for (const value of personalDataOf(exampleResume)) expect(post.body).not.toContain(value);

  // Impression : une page A4, texte extractible, sans l'interface.
  await expect(app.pageBadge).toHaveText('1 page');
  await app.interceptPrint();
  await app.toolbar.locator('.tb-download').click();
  const dialog = page.getByRole('dialog', { name: 'Télécharger la lettre' });
  await expect(dialog).toContainText('LM_Camille_Martin_Decathlon.pdf');
  await dialog.getByRole('button', { name: /Lettre en PDF, via l’impression/ }).click();
  await app.waitForPrintCall();
  const pdf = await app.printToPdf('lettre.pdf');
  await app.finishPrint();

  expect(pdfInfo(pdf).pages).toBe(1);
  const [text] = pdfPagesText(pdf);
  for (const expected of ['Camille Martin', 'Mme Claire Dubois', 'Decathlon', 'Madame, Monsieur,', 'Je serais ravie']) {
    expect(text).toContain(expected);
  }
  for (const ui of ['Lettre de motivation', 'Pré-remplir', 'Télécharger', 'Brouillon IA']) expect(text).not.toContain(ui);

  // La lettre est enregistrée avec la version.
  const lib = await app.waitForSaved((l) => l?.cvs[0].coverLetter.body === BODY);
  expect(lib.cvs[0].coverLetter.recipientName).toBe('Mme Claire Dubois');
  expect(lib.cvs[0].company).toBe('Decathlon');
});

test('brouillon IA : passer à la vue CV pendant la rédaction ne perd pas la demande', async ({ page, app }) => {
  // L'IA met quelques secondes à répondre : le temps de jeter un œil au CV.
  const requests = await mockAiApis(page, { delayMs: 4000 });
  await page.addInitScript(() => localStorage.setItem('anthropic_api_key', 'sk-ant-api03-cle-factice-e2e'));
  await app.loadExample();
  await app.view('Lettre');
  const editor = page.locator('.letter-editor');
  await editor.getByRole('textbox', { name: 'Entreprise', exact: true }).fill('Decathlon');
  await editor.getByRole('button', { name: 'Rédiger un brouillon' }).click();
  await expect(editor.getByRole('button', { name: /Rédaction en cours/ })).toBeVisible();

  // Aller-retour par la vue CV : la rédaction continue.
  await app.view('CV');
  await expect(app.resume).toBeVisible();
  await app.view('Lettre');
  await expect(editor.getByRole('button', { name: /Rédaction en cours/ })).toBeVisible();

  // La réponse arrive pendant que la vue CV est affichée : un message le dit, et mène à la lettre.
  await app.view('CV');
  await app.expectToast('Le brouillon de votre lettre est prêt');
  await app.toasts.getByRole('button', { name: 'Voir la lettre' }).click();
  await expect(editor.getByRole('textbox', { name: 'Corps de la lettre', exact: true })).toHaveValue(MOCK.letterBody);
  await expect(editor.getByText('Brouillon inséré dans la lettre.')).toBeVisible();
  await expect(app.letter).toContainText('brouillon simulé');
  await app.waitForSaved((l) => l?.cvs[0].coverLetter.body === MOCK.letterBody);
  // Une seule demande, jamais interrompue.
  expect(requests.filter((r) => r.method === 'POST')).toHaveLength(1);
});

test('Ctrl/Cmd+Z dans le champ de la clé API (vue Lettre) annule la frappe, pas la lettre', async ({ page, app }) => {
  await app.loadExample();
  await app.view('Lettre');
  const editor = page.locator('.letter-editor');
  await editor.getByRole('textbox', { name: 'Intitulé du poste', exact: true }).fill('Chargée de communication');
  const body = editor.getByRole('textbox', { name: 'Corps de la lettre', exact: true });
  await body.fill('Madame, je vous écris pour ce poste.');
  await app.waitForSaved((l) => l?.cvs[0].coverLetter.body === 'Madame, je vous écris pour ce poste.');

  // Sans clé, « Rédiger un brouillon » affiche le réglage de la clé dans la page (hors fenêtre).
  await editor.getByRole('button', { name: 'Rédiger un brouillon' }).click();
  await page.getByRole('alertdialog', { name: 'Remplacer votre texte ?' }).getByRole('button', { name: 'Remplacer par le brouillon' }).click();
  const panel = editor.locator('.letter-key-panel');
  await expect(panel).toBeVisible();
  const key = panel.getByLabel('Clé API Anthropic');
  await key.click();
  await key.pressSequentially('sk-mauvaise-cle');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(key).not.toHaveValue('sk-mauvaise-cle');
  await page.waitForTimeout(800);
  await expect(body).toHaveValue('Madame, je vous écris pour ce poste.');
  expect((await app.storedLibrary()).cvs[0].coverLetter.body).toBe('Madame, je vous écris pour ce poste.');
});

test('une lettre complète collée dans le corps : formules et signature vont dans leurs champs, sans doublon', async ({ page, app }) => {
  await app.loadExample();
  await app.view('Lettre');
  const editor = page.locator('.letter-editor');
  const body = editor.getByRole('textbox', { name: 'Corps de la lettre', exact: true });
  const paragraphs = BODY.split('\n\n');
  const pasted = [
    'Madame, Monsieur,',
    '',
    ...paragraphs.flatMap((p) => [p, '']),
    'Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.',
    '',
    'Camille Martin',
  ].join('\n');
  // Collage depuis Word ou un e-mail (presse-papiers simulé).
  await body.evaluate((el, text) => {
    el.focus();
    const data = new DataTransfer();
    data.setData('text/plain', text);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  }, pasted);

  await expect(body).toHaveValue(BODY);
  await expect(editor.getByRole('textbox', { name: 'Formule d’appel', exact: true })).toHaveValue('Madame, Monsieur,');
  await expect(editor.getByRole('textbox', { name: 'Formule de politesse', exact: true })).toHaveValue(
    'Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.',
  );
  await expect(editor.getByRole('textbox', { name: 'Signature', exact: true })).toHaveValue('Camille Martin');
  await expect(editor.locator('.letter-paste-notice')).toContainText('placées dans leurs champs');
  // Sur la lettre, chaque formule n'apparaît qu'une fois.
  await expect(app.letter.locator('.letter-salutation')).toHaveText('Madame, Monsieur,');
  await expect(app.letter.locator('.letter-body')).not.toContainText('Madame, Monsieur,');
  await expect(app.letter.locator('.letter-body')).not.toContainText('salutations distinguées');
  await expect(app.letter.locator('.letter-signature')).toHaveText('Camille Martin');
  expect((await app.letter.innerText()).match(/salutations distinguées/g)).toHaveLength(1);
  // Une seule étape : « Annuler » rend la lettre telle qu'elle était avant le collage.
  await app.toolbar.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(body).toHaveValue('');
  await expect(editor.getByRole('textbox', { name: 'Signature', exact: true })).toHaveValue('');
});

// Lettre d'une page et demie : sans précaution, la formule de politesse et la signature
// (insécables) partaient seules sur la page 2.
const PARAGRAPHS = [
  'Votre offre de chargée de communication a retenu toute mon attention. Forte de cinq ans d’expérience en agence et chez l’annonceur, je souhaite mettre mes compétences au service de vos équipes.',
  'Chez Maison Lumière, j’ai piloté le plan de communication annuel (budget de 80 000 €) et fait progresser de 40 % l’audience Instagram de l’enseigne. J’ai également organisé six événements par an en boutique.',
  'Au sein de l’Agence Hublot, j’ai géré un portefeuille de huit clients et conçu des campagnes e-mailing dont le taux d’ouverture moyen atteignait 32 %.',
  'Je serais ravie de vous exposer plus en détail mes motivations lors d’un entretien.',
];

test('lettre sur deux pages : la signature ne part jamais seule sur la page 2', async ({ page, app }) => {
  test.skip(!hasPoppler(), POPPLER_MISSING);
  const now = new Date().toISOString();
  const library = {
    version: 2,
    currentId: 'cv_lettre',
    cvs: [
      {
        id: 'cv_lettre',
        name: 'Lettre longue',
        company: 'Decathlon',
        createdAt: now,
        updatedAt: now,
        data: exampleResume,
        settings: { lang: 'fr' },
        coverLetter: {
          recipientName: 'Mme Claire Dupont',
          recipientCompany: 'Decathlon',
          recipientAddress: '4 boulevard de Mons\n59650 Villeneuve-d’Ascq',
          place: 'Lyon',
          date: '18 octobre 2026',
          subject: 'Candidature au poste de Chargée de communication',
          salutation: 'Madame,',
          body: [...PARAGRAPHS, ...PARAGRAPHS, ...PARAGRAPHS].join('\n\n'),
          closing: '',
          signature: '',
        },
      },
    ],
    applications: [],
  };
  await app.open();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Importer un fichier JSON/ }).click();
  await (await chooser).setFiles({ name: 'lettre-longue.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(library)) });
  await expect(app.resume.locator('h1')).toHaveText('Camille Martin');
  await app.view('Lettre');
  await expect(app.letter).toContainText('Madame,');
  await page.evaluate(() => document.fonts.ready);

  const pdf = await app.printToPdf('lettre-longue.pdf');
  const pages = pdfPagesText(pdf);
  expect(pages).toHaveLength(2);
  // La page 2 commence par (au moins) la fin du dernier paragraphe, avant la formule de politesse.
  const last = pages[1];
  expect(last).toContain('Camille Martin');
  const signoff = last.indexOf('Je vous prie');
  expect(signoff).toBeGreaterThan(0);
  expect(last.slice(0, signoff)).toMatch(/entretien\.\s*$/);
});

test('lettre d’une version en anglais : le fichier s’appelle « Cover_Letter_… », pas « LM_… »', async ({ page, app }) => {
  await app.loadExample();
  await app.toolbarButton('Apparence').click();
  await page.getByRole('radio', { name: 'English' }).click();
  await page.keyboard.press('Escape');
  await app.view('Lettre');
  await page.locator('.letter-editor').getByRole('textbox', { name: 'Entreprise', exact: true }).fill('Decathlon');
  await expect(app.letter).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('Cover_Letter_Camille_Martin_Decathlon');
  await app.toolbar.locator('.tb-download').click();
  const dialog = page.getByRole('dialog', { name: 'Télécharger la lettre' });
  await expect(dialog.locator('.dl-option-file code')).toHaveText('Cover_Letter_Camille_Martin_Decathlon.pdf');
  await dialog.getByRole('button', { name: 'Fermer' }).first().click();
  // Le CV de cette version garde son nom habituel.
  await app.view('CV');
  await expect(page).toHaveTitle('CV_Camille_Martin_Decathlon');
});

test.describe('sur iPhone', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
  });

  test('la fenêtre « Télécharger la lettre » donne les étapes d’iOS (Partager → Enregistrer dans Fichiers)', async ({ page, app }) => {
    await app.loadExample();
    await app.view('Lettre');
    await app.toolbar.locator('.tb-download').click();
    const dialog = page.getByRole('dialog', { name: 'Télécharger la lettre' });
    await expect(dialog).toContainText('Sur iPhone et iPad, la lettre s’enregistre depuis la fenêtre d’impression.');
    await expect(dialog.locator('.dl-help')).toContainText('Enregistrer dans Fichiers');
    await expect(dialog.locator('.dl-help')).toContainText('Partager');
    // Les réglages d'un ordinateur, absents d'iOS, ne sont plus cités.
    await expect(dialog.locator('.dl-help')).not.toContainText('Enregistrer au format PDF');
    await expect(dialog.locator('.dl-help')).not.toContainText('En-têtes et pieds de page');
  });
});

test.describe('sur Android', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('la fenêtre « Télécharger » donne les étapes d’Android, sans les réglages de Chrome pour ordinateur', async ({ page, app }) => {
    await app.loadExample();
    for (const [view, title] of [
      ['Lettre', 'Télécharger la lettre'],
      ['CV', 'Télécharger mon CV'],
    ]) {
      await app.view(view);
      await app.toolbar.locator('.tb-download').click();
      const dialog = page.getByRole('dialog', { name: title });
      const help = dialog.locator('.dl-help');
      await expect(help).toContainText('Pour enregistrer le PDF sur Android');
      await expect(help).toContainText('Enregistrer au format PDF');
      await expect(help).toContainText('touchez le bouton PDF');
      for (const desktopOnly of ['Marges', 'Plus de paramètres', 'En-têtes et pieds de page']) {
        await expect(help).not.toContainText(desktopOnly);
      }
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    }
  });
});

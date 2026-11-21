import { test, expect } from './support/fixtures.js';

// k) Suivi des candidatures : ajout, statut « Envoyée » → relance proposée à J+7, export CSV.

const frenchDate = (iso) => iso.split('-').reverse().join('/');

test('ajouter une candidature, la passer à « Envoyée » puis exporter le suivi en CSV', async ({ page, app }) => {
  await app.startBlank();
  await app.view('Candidatures');
  const tracker = page.locator('.tracker');
  await expect(tracker.getByRole('heading', { name: 'Aucune candidature pour l’instant' })).toBeVisible();
  await expect(tracker.getByRole('button', { name: 'Exporter (CSV)' })).toBeDisabled();
  // Pas de document à imprimer ni à télécharger dans cette vue.
  await expect(page.locator('.print-area')).toHaveCount(0);
  await expect(app.toolbar.locator('.tb-download')).toHaveCount(0);

  await tracker.getByRole('button', { name: 'Ajouter ma première candidature' }).click();
  const form = tracker.locator('form.tracker-form');
  await expect(form.getByLabel('Entreprise')).toBeFocused();
  await form.getByLabel('Entreprise').fill('Fnac');
  await form.getByLabel('Poste', { exact: true }).fill('Vendeuse conseil');
  await form.getByLabel('Lien de l’offre').fill('https://www.exemple.fr/offres/vendeuse-conseil');
  await form.getByLabel('Version de CV utilisée').selectOption({ label: 'Mon CV' });
  await form.getByRole('button', { name: 'Ajouter' }).click();
  await expect(form).toHaveCount(0);

  const row = tracker.locator('.tracker-row');
  await expect(row).toHaveCount(1);
  const label = 'Fnac – Vendeuse conseil';
  await expect(row.getByLabel('Entreprise', { exact: true })).toHaveValue('Fnac');
  const status = row.getByLabel(`Statut : ${label}`);
  await expect(status).toHaveValue('a_envoyer');
  await expect(row.getByLabel(`Date d’envoi : ${label}`)).toHaveValue('');

  // « Envoyée » : date d'envoi = aujourd'hui, relance proposée 7 jours plus tard.
  const today = await app.todayIso();
  const followUp = await app.todayIso(7);
  await status.selectOption({ label: 'Envoyée' });
  await expect(row.getByLabel(`Date d’envoi : ${label}`)).toHaveValue(today);
  await expect(row.getByLabel(`Date de relance : ${label}`)).toHaveValue(followUp);
  await expect(row.locator('.tracker-hint')).toHaveText('dans 7 jours');
  await expect(tracker.locator('.tracker-stat', { hasText: 'Envoyées' }).locator('.tracker-stat-value')).toHaveText('1');
  await expect(tracker.locator('.tracker-stat', { hasText: 'Relances à faire' }).locator('.tracker-stat-value')).toHaveText('0');

  // Export CSV (séparateur « ; », dates à la française, BOM pour Excel).
  const csv = await app.download(() => tracker.getByRole('button', { name: 'Exporter (CSV)' }).click());
  expect(csv.name).toBe(`Candidatures_${today}.csv`);
  const content = csv.text();
  expect(content.charCodeAt(0)).toBe(0xfeff);
  const lines = content.replace(/^﻿/, '').trim().split(/\r?\n/);
  expect(lines).toHaveLength(2);
  expect(lines[0].split(';').length).toBeGreaterThan(4);
  for (const value of ['Fnac', 'Vendeuse conseil', 'Envoyée', frenchDate(today), frenchDate(followUp), 'Mon CV', 'https://www.exemple.fr/offres/vendeuse-conseil']) {
    expect(lines[1]).toContain(value);
  }

  // Tout est conservé après rechargement.
  await app.waitForSaved((lib) => lib?.applications[0]?.status === 'envoyee');
  await page.reload();
  await app.view('Candidatures');
  await expect(row.getByLabel(`Statut : ${label}`)).toHaveValue('envoyee');
  await expect(row.getByLabel(`Date de relance : ${label}`)).toHaveValue(followUp);

  // « Ouvrir » ramène sur la version de CV utilisée.
  await row.getByRole('button', { name: 'Ouvrir' }).click();
  await expect(app.resume).toBeVisible();
  await expect(app.versionButton.locator('.vm-current-name')).toHaveText('Mon CV');
});

test('une relance arrivée à échéance est signalée et « C’est fait » la reprogramme', async ({ page, app }) => {
  await app.startBlank();
  await app.view('Candidatures');
  const tracker = page.locator('.tracker');
  await tracker.getByRole('button', { name: 'Ajouter ma première candidature' }).click();
  const form = tracker.locator('form.tracker-form');
  await form.getByLabel('Entreprise').fill('Boulangerie Martin');
  await form.getByLabel('Statut').selectOption({ label: 'Envoyée' });
  await form.getByLabel('Date d’envoi').fill(await app.todayIso(-8));
  await form.getByRole('button', { name: 'Ajouter' }).click();

  const row = tracker.locator('.tracker-row');
  await expect(row.locator('.tracker-due')).toHaveText('Relance à faire');
  await expect(tracker.locator('.tracker-stat', { hasText: 'Relances à faire' }).locator('.tracker-stat-value')).toHaveText('1');
  await row.getByRole('button', { name: 'C’est fait' }).click();
  await expect(row.getByLabel('Statut : Boulangerie Martin')).toHaveValue('relancee');
  await expect(row.getByLabel('Date de relance : Boulangerie Martin')).toHaveValue(await app.todayIso(7));
  await expect(row.locator('.tracker-due')).toHaveCount(0);
});

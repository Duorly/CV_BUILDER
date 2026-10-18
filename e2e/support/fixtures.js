import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as base, expect } from '@playwright/test';

export { expect };

export const STORAGE_KEY = 'cv-builder:library:v2';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const EXAMPLES_DIR = path.join(ROOT, 'examples');
// CV fictif livré avec l'application (« Charger l'exemple »).
export const exampleResume = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/exampleResume.json'), 'utf8'));

// Hôtes que l'application a le droit de contacter en dehors d'elle-même : les API d'IA,
// et seulement quand l'utilisatrice s'en sert (les tests les simulent avec page.route).
const AI_HOSTS = ['api.anthropic.com', 'generativelanguage.googleapis.com'];

// Chaque test reçoit un contexte de navigateur neuf (localStorage vide). En plus, il échoue
// si la page écrit une erreur dans la console, lève une exception ou contacte un autre serveur.
// Un test qui provoque volontairement une erreur (réponse 401 simulée…) la déclare avec consoleGuard.allow(/…/).
export const test = base.extend({
  consoleGuard: async ({}, use) => {
    const allowed = [];
    await use({ allow: (pattern) => allowed.push(pattern), allowed });
  },
  page: async ({ page, baseURL, consoleGuard }, use) => {
    const problems = [];
    const origin = new URL(baseURL).origin;
    page.on('console', (msg) => {
      if (msg.type() === 'error') problems.push(`console.error : ${msg.text()}`);
    });
    page.on('pageerror', (err) => problems.push(`exception : ${err.message}`));
    page.on('request', (req) => {
      const url = req.url();
      if (/^(data|blob|about):/.test(url) || url.startsWith(origin)) return;
      if (AI_HOSTS.includes(new URL(url).hostname)) return;
      problems.push(`requête vers un autre serveur : ${url}`);
    });
    await use(page);
    const unexpected = problems.filter((p) => !consoleGuard.allowed.some((pattern) => pattern.test(p)));
    expect(unexpected, 'erreurs console, exceptions ou requêtes externes').toEqual([]);
  },
  app: async ({ page }, use) => {
    await use(new CvApp(page));
  },
});

// Identifiant DOM d'un panneau de l'éditeur (même règle que fieldId() dans editor/listUtils.js).
export const panelDomId = (sectionId) => `ed-panel-${sectionId}`.replace(/[^A-Za-z0-9_-]/g, '-');

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const startsWith = (text) => new RegExp(`^${escapeRegExp(text)}`);

// Pilote de l'application, au plus près de ce que fait l'utilisatrice.
export class CvApp {
  constructor(page) {
    this.page = page;
    this.toolbar = page.locator('header.toolbar');
    this.resume = page.locator('#resume-root');
    this.letter = page.locator('#letter-root');
    this.pageBadge = page.locator('.preview-toolbar .badge');
    this.toasts = page.locator('.toast-stack');
    this.versionButton = page.locator('.vm-trigger');
  }

  async open() {
    await this.page.goto('/');
  }

  async startBlank() {
    await this.open();
    await this.page.getByRole('button', { name: /Commencer de zéro/ }).click();
    await expect(this.resume).toBeVisible();
  }

  async loadExample() {
    await this.open();
    await this.page.getByRole('button', { name: /Charger l’exemple/ }).click();
    await expect(this.resume.locator('h1')).toHaveText('Camille Martin');
  }

  // Bibliothèque telle qu'enregistrée dans le navigateur (null avant le premier enregistrement).
  async storedLibrary() {
    return this.page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), STORAGE_KEY);
  }

  // Attend que la sauvegarde automatique ait écrit un état qui vérifie `predicate`.
  async waitForSaved(predicate, message = 'sauvegarde automatique') {
    await expect.poll(async () => Boolean(predicate(await this.storedLibrary())), { message }).toBe(true);
    return this.storedLibrary();
  }

  // « Navigateur neuf » : efface les données une fois la sauvegarde automatique terminée
  // (sinon l'écriture faite en quittant la page les recréerait), puis recharge.
  async clearStorageAndReload() {
    await expect(this.toolbar.locator('.save-ind-ok')).toBeVisible();
    await this.page.evaluate(() => localStorage.clear());
    await this.page.reload();
    await expect(this.page.getByRole('heading', { name: /Bienvenue/ })).toBeVisible();
  }

  // ── Éditeur ──────────────────────────────────────────────────────────
  panel(sectionId) {
    return this.page.locator(`#${panelDomId(sectionId)}`);
  }

  async openPanel(sectionId) {
    const toggle = this.page.locator(`#${panelDomId(sectionId)}-toggle`);
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    return this.panel(sectionId);
  }

  // ── Barre d'outils ───────────────────────────────────────────────────
  // Sous 720 px, le libellé des menus est masqué (icône seule) : on cherche aussi le texte du bouton.
  toolbarButton(name) {
    return this.toolbar
      .getByRole('button', { name, exact: true })
      .or(this.toolbar.locator('button', { hasText: new RegExp(`^${escapeRegExp(name)}$`) }));
  }

  async menu(buttonName, itemName) {
    await this.toolbarButton(buttonName).click();
    await this.page.getByRole('menuitem', { name: itemName }).click();
  }

  async versionMenu(itemName) {
    await this.versionButton.click();
    await this.page.getByRole('menuitem', { name: itemName }).click();
  }

  async selectVersion(name) {
    await this.versionButton.click();
    await this.page.locator('.vm-list').getByText(name, { exact: true }).click();
    await expect(this.versionButton.locator('.vm-current-name')).toHaveText(name);
  }

  async versionNames() {
    await this.versionButton.click();
    const names = await this.page.locator('.vm-list .tb-item-label').allTextContents();
    await this.page.keyboard.press('Escape');
    return names;
  }

  async setTemplate(label) {
    await this.toolbarButton('Apparence').click();
    await this.page.getByRole('radio', { name: label, exact: true }).click();
    await this.page.keyboard.press('Escape');
    await expect(this.resume).toHaveClass(label === 'Design' ? /resume-design/ : /resume-ats-template/);
  }

  async view(name) {
    await this.toolbar.getByRole('tab', { name, exact: true }).click();
  }

  // ── Fichiers ─────────────────────────────────────────────────────────
  // `files` : chemin d'un fichier ou { name, mimeType, buffer }.
  async importFile(files) {
    const chooser = this.page.waitForEvent('filechooser');
    await this.menu('Fichier', startsWith('Importer…'));
    await (await chooser).setFiles(files);
  }

  async download(trigger) {
    const [download] = await Promise.all([this.page.waitForEvent('download'), trigger()]);
    const name = download.suggestedFilename();
    const file = test.info().outputPath(name);
    await download.saveAs(file);
    return { name, file, text: () => fs.readFileSync(file, 'utf8') };
  }

  // ── Impression ───────────────────────────────────────────────────────
  // window.print() ouvrirait la fenêtre du système : on note l'appel, et l'état de la page
  // à ce moment-là (modèle forcé, styles d'impression) est imprimé avec page.pdf().
  async interceptPrint() {
    await this.page.evaluate(() => {
      window.__printCalls = 0;
      window.print = () => {
        window.__printCalls += 1;
      };
    });
  }

  async waitForPrintCall() {
    await expect.poll(() => this.page.evaluate(() => window.__printCalls), { message: 'window.print() appelé' }).toBe(1);
  }

  async printToPdf(name) {
    const file = test.info().outputPath(name);
    await this.page.emulateMedia({ media: 'print' });
    await this.page.pdf({ path: file, preferCSSPageSize: true, printBackground: true });
    await this.page.emulateMedia({ media: 'screen' });
    return file;
  }

  async finishPrint() {
    await this.page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  }

  // ── Divers ───────────────────────────────────────────────────────────
  async expectToast(text) {
    await expect(this.toasts.locator('.toast', { hasText: text })).toBeVisible();
  }

  async horizontalOverflow() {
    return this.page.evaluate(() => {
      const doc = document.documentElement;
      return Math.max(doc.scrollWidth, document.body.scrollWidth) - doc.clientWidth;
    });
  }

  async todayIso(offsetDays = 0) {
    return this.page.evaluate((offset) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }, offsetDays);
  }

  // Image PNG non carrée dessinée dans le navigateur (dégradé + disque).
  async generatedPng({ width = 600, height = 400 } = {}) {
    const base64 = await this.page.evaluate(
      ({ width: w, height: h }) => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, w, h);
        gradient.addColorStop(0, '#f97316');
        gradient.addColorStop(1, '#2563eb');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, h / 4, 0, Math.PI * 2);
        ctx.fill();
        return canvas.toDataURL('image/png').split(',')[1];
      },
      { width, height },
    );
    return { name: 'photo-test.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') };
  }
}

// Marqueurs de l'ancien CV du développeur (examples/cv-nebel.json, s'il est présent sur la
// machine) : aucun ne doit apparaître dans l'application livrée ni dans un CV vierge.
// Ils sont tous déduits du fichier : rien de personnel n'est écrit dans les tests.
export const DEVELOPER_CV_FILE = path.join(EXAMPLES_DIR, 'cv-nebel.json');

export function developerMarkers() {
  if (!fs.existsSync(DEVELOPER_CV_FILE)) return [];
  const legacy = JSON.parse(fs.readFileSync(DEVELOPER_CV_FILE, 'utf8'));
  const pi = legacy.personalInfo;
  const words = pi.name.split(/\s+/).filter((w) => w.length >= 5);
  const urls = legacy.socialLinks.map((l) => l.url.replace(/^https?:\/\//, '').replace(/\/+$/, ''));
  // Identifiants des profils (github.com/<identifiant>…) et employeurs écrits en capitales
  // (sigles, marques : assez distinctifs pour ne pas se confondre avec un mot de l'interface).
  const handles = urls.flatMap((u) => u.split('/').slice(1)).filter((part) => part.length >= 5);
  const companies = [...(legacy.experiences || []), ...(legacy.otherExperiences || [])]
    .map((e) => String(e.company || '').replace(/\s+/g, ''))
    .filter((c) => c.length >= 6 && /^[A-Z0-9]+$/.test(c));
  return [...new Set([pi.name, ...words, pi.email, pi.phone, pi.phone.replace(/\s+/g, ''), ...urls, ...handles, ...companies])];
}

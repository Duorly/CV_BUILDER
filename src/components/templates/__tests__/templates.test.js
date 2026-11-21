import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ResumeDesign from '../ResumeDesign';
import ResumeClassic from '../ResumeClassic';
import ResumeExpert from '../ResumeExpert';
import ResumeFocus from '../ResumeFocus';
import ResumeATS from '../ResumeATS';
import PrintStyles from '../PrintStyles';
import { linkIcon, LINK_ICONS } from '../icons';
import { displayColors, linkView, sectionContent, telHref } from '../shared';
import { contrastRatio, defaultSettings, newCustomSection, normalizeData, STYLE_DEFAULTS } from '../../../lib/schema';
import {
  BODY_TEXT_PT,
  BODY_TEXT_PX,
  bodyTextPt,
  measurePages,
  printPageRule,
} from '../../../lib/pageGeometry';
import example from '../../../data/exampleResume.json';
import legacy from '../../../lib/__tests__/fixtures/legacy-v1.json';
import { readPrivateCv } from '../../../../e2e/support/private-cv.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../..');

const render = (Component, data, settings = {}) =>
  renderToStaticMarkup(createElement(Component, { data, settings: { ...defaultSettings(), ...settings } }));

const TEMPLATES = [
  ['design', ResumeDesign],
  ['classique', ResumeClassic],
  ['focus', ResumeFocus],
  ['expert', ResumeExpert],
  ['ats', ResumeATS],
];

// Données « sales » : éléments vides, espaces, blocs vidés, lien sans URL.
function messyData() {
  const d = normalizeData(example);
  d.experiences.push({ id: 'blank', title: ' ', company: '', location: '', period: '', details: ['', '  '] });
  d.experiences[0].details.push('', '   ');
  d.experiences[1].location = '';
  d.education[0].objectives = ['', ' '];
  d.education[0].tools = ['Canva', ''];
  d.education[0].link = 'www.univ-lyon2.fr/master-com';
  d.socialLinks.push({ id: 'nourl', name: 'Vide', url: '  ', label: 'Mon lien', icon: 'Globe' });
  d.socialLinks[0].label = 'Mon LinkedIn';
  d.socialLinks[1].icon = 'Linkedin';
  d.languages.push({ id: 'l0', name: '', level: '' });
  d.mainSkills.push({ id: 'g0', category: 'Catégorie vide', skills: ['', ' '] });
  d.certifications.push({ id: 'c0', name: '', issuer: '', date: '' });
  d.customSections.push(
    { ...newCustomSection(), id: 'benevolat', title: 'Bénévolat', column: 'main', items: ['Trésorière', ''] },
    { ...newCustomSection(), id: 'videe', title: 'Section vide', items: ['', ' '] },
  );
  d.sections = [
    { id: 'education', title: '', visible: true },
    { id: 'profile', title: 'À propos', visible: true },
    { id: 'experiences', title: 'Parcours', visible: true },
    { id: 'otherExperiences', title: '', visible: false },
    ...d.sections.filter((s) => !['education', 'profile', 'experiences', 'otherExperiences'].includes(s.id)),
  ];
  d.personalInfo.phone = '+33 (0)6 12-34.56.78';
  return normalizeData(d);
}

// CV d'exemple suivi d'une ligne de texte (section libre en texte simple, sans titre).
function withTextLine(items, column = 'main') {
  const d = normalizeData(example);
  d.customSections.push({ ...newCustomSection('text'), id: 'dispo', column, items });
  d.sections.push({ id: 'custom:dispo', title: '', visible: true });
  return normalizeData(d);
}

function expectNothingEmpty(html) {
  expect(html).not.toMatch(/<(h1|h2|h3|p|li|strong|span|a)( [^>]*)?>\s*<\/\1>/);
  expect(html).not.toMatch(/<(ul|section|article|header)( [^>]*)?>\s*<\/\1>/);
  expect(html).not.toMatch(/undefined|null|NaN|\[object Object\]/);
}

// Texte affiché d'un fragment HTML (balises retirées).
const textOf = (html) => html.replace(/<[^>]+>/g, '');

function indexesOf(html, words) {
  return words.map((w) => html.indexOf(w));
}

describe('templates : rendu sans plantage et sans rubrique vide', () => {
  for (const [name, Template] of TEMPLATES) {
    it(`${name} : CV vide → aucune rubrique`, () => {
      const html = render(Template, normalizeData({}));
      expect(html).toContain('id="resume-root"');
      expect(html).not.toMatch(/<(h1|h2|section|header|article|li|img)\b/);
      expectNothingEmpty(html);
    });

    it(`${name} : données non normalisées ou partielles → pas de crash`, () => {
      expect(() => render(Template, { personalInfo: { name: 'Léa' }, experiences: [null, { title: 'Poste' }] })).not.toThrow();
      expect(() => render(Template, undefined, undefined)).not.toThrow();
    });

    it(`${name} : CV d’exemple complet`, () => {
      const html = render(Template, normalizeData(example));
      expect(html).toContain('Camille Martin');
      expect(html).toContain('Maison Lumière');
      expect(html).not.toContain('<img');
      expectNothingEmpty(html);
    });

    it(`${name} : éléments vides, puces vides et sections masquées ignorés`, () => {
      const html = render(Template, messyData());
      expectNothingEmpty(html);
      expect(html).not.toContain('Catégorie vide');
      expect(html).not.toContain('Section vide');
      expect(html).not.toContain('Mon lien');
      expect(html).not.toContain('Objectifs');
      expect(html).toContain('Outils et méthodes');
      expect(html).not.toMatch(/Autres expériences/i);
      expect(html).toContain('Bénévolat');
      expect(html).toContain('href="tel:+33612345678"');
      expect(html).toContain('href="https://www.univ-lyon2.fr/master-com"');
    });

    it(`${name} : une formation masquée n’apparaît pas, les autres restent`, () => {
      const data = normalizeData(example);
      data.education[0].hidden = true;
      const html = render(Template, data);
      expect(html).not.toContain('Master Communication des organisations');
      expect(textOf(html)).toContain('Licence Information-Communication');
      data.education[1].hidden = true;
      expect(render(Template, data)).not.toMatch(/>(Formation|Éducation)</);
    });

    it(`${name} : une expérience masquée n’apparaît pas, les autres restent`, () => {
      const data = normalizeData(example);
      data.experiences[0].hidden = true;
      data.otherExperiences[0].hidden = true;
      const html = render(Template, data);
      expect(html).not.toContain('Maison Lumière');
      expect(html).toContain('Agence Hublot');
      expect(html).not.toContain('Les Restos du Cœur');
      expect(html).not.toMatch(/Autres expériences/i);
    });

    it(`${name} : section libre sur une ligne ou les uns au-dessus des autres`, () => {
      const data = normalizeData(example);
      const list = render(Template, data);
      expect(list).toMatch(/<li>Photographie argentique<\/li>/);
      data.customSections[0].layout = 'inline';
      const inline = render(Template, data);
      expect(inline).toContain('Photographie argentique · Course à pied (semi-marathon) · Théâtre amateur');
      expect(inline).not.toMatch(/<li>Photographie argentique<\/li>/);
    });

    it(`${name} : ligne de texte, un paragraphe par ligne, sans titre ni puce`, () => {
      const data = withTextLine(['Disponible immédiatement', 'Véhiculée']);
      const html = render(Template, data);
      expect(html).toMatch(/<p class="[^"]+">Disponible immédiatement<\/p><p class="[^"]+">Véhiculée<\/p>/);
      expect(html).not.toMatch(/<li>(Disponible|Véhiculée)/);
      expect(html).not.toContain('Disponible immédiatement · Véhiculée');
      const start = html.lastIndexOf('<section', html.indexOf('Disponible immédiatement'));
      expect(html.slice(start, html.indexOf('Disponible immédiatement'))).not.toContain('<h2');
      expectNothingEmpty(html);
      // Avec un titre, il s'affiche comme celui d'une section.
      data.customSections.at(-1).title = 'Disponibilité';
      expect(render(Template, data)).toMatch(/<h2>Disponibilité<\/h2><p class="[^"]+">Disponible immédiatement<\/p>/);
    });

    it(`${name} : miniature (choix du modèle) sans identifiant ni indicateur de saut de page`, () => {
      const page = render(Template, normalizeData(example));
      expect(page).toContain('id="resume-root"');
      expect(page).toContain('page-break-overlay');
      const thumbnail = renderToStaticMarkup(
        createElement(Template, { data: normalizeData(example), settings: defaultSettings(), thumbnail: true }),
      );
      expect(thumbnail).not.toContain('id=');
      expect(thumbnail).not.toContain('page-break-overlay');
      expect(thumbnail).toContain('Camille Martin');
    });

    it(`${name} : sous-titre facultatif, juste sous le titre`, () => {
      const data = normalizeData(example);
      expect(render(Template, data)).not.toContain('subtitle');
      data.personalInfo.subtitle = '  CDI, disponible en septembre ';
      const html = render(Template, data);
      expect(html).toMatch(new RegExp(`>${data.personalInfo.title}</p><p class="[a-z-]*subtitle">CDI, disponible en septembre</p>`));
      // Sans titre, le sous-titre s'affiche seul.
      data.personalInfo.title = '';
      expect(render(Template, data)).toContain('subtitle">CDI, disponible en septembre</p>');
    });

    it(`${name} : un groupe de compétences masqué n’apparaît pas, les autres restent`, () => {
      const data = normalizeData(example);
      data.mainSkills[0].hidden = true;
      const html = render(Template, data);
      expect(html).not.toContain('Stratégie éditoriale');
      expect(html).toContain('Google Analytics');
      for (const group of data.mainSkills) group.hidden = true;
      expect(render(Template, data)).not.toContain('>Compétences<');
    });

    it(`${name} : en-tête centré et texte justifié en option`, () => {
      const data = normalizeData(example);
      const plain = render(Template, data);
      expect(plain).not.toContain('is-header-centered');
      expect(plain).not.toContain('is-justified');
      const html = render(Template, data, { headerAlign: 'center', textAlign: 'justify' });
      expect(html).toMatch(/class="resume-container [^"]* is-header-centered is-justified"/);
    });

    it(`${name} : CV au format v1 (ancien CV)`, () => {
      const html = render(Template, normalizeData(legacy));
      expect(html).toContain('Titre RNCP de niveau 7');
      expect(html).toContain('href="mailto:');
      expectNothingEmpty(html);
    });
  }
});

describe('template design', () => {
  it('affiche la photo seulement si elle existe et que showPhoto est vrai', () => {
    const data = normalizeData({ ...example, personalInfo: { ...example.personalInfo, photo: 'data:image/jpeg;base64,AAAA' } });
    expect(render(ResumeDesign, data)).toContain('<img src="data:image/jpeg;base64,AAAA" alt="Photo de Camille Martin"');
    expect(render(ResumeDesign, data, { showPhoto: false })).not.toContain('<img');
  });

  it('pose ses variables CSS depuis les réglages', () => {
    const html = render(ResumeDesign, normalizeData(example), {
      fontScale: 1.15,
      primaryColor: '#be123c',
      sidebarBg: '#fff7ed',
      textColor: '#1f2937',
      fontFamily: 'georgia',
    });
    expect(html).toContain('--font-scale:1.15');
    expect(html).toContain('--primary-color:#be123c');
    expect(html).toContain('--sidebar-bg:#fff7ed');
    expect(html).toContain('--text-dark:#1f2937');
    expect(html).toContain("--resume-font:Georgia, &#x27;Times New Roman&#x27;, serif");
  });

  it('couleur du texte du corps et de la colonne : chacune ses nuances, sur son propre fond', () => {
    const html = render(ResumeDesign, normalizeData(example), {
      sidebarBg: '#1e3a8a',
      sidebarTextColor: '#ffffff',
      textColor: '#7c2d12',
    });
    const tones = (prefix) =>
      Object.fromEntries([...html.matchAll(new RegExp(`--${prefix}(\\w+):(#[0-9a-f]{6})`, 'g'))].map((m) => [m[1], m[2]]));
    const side = tones('sidebar-text-');
    const main = tones('text-');
    expect(side.dark).toBe('#ffffff');
    expect(main.dark).toBe('#7c2d12');
    expect(Object.keys(side)).toEqual(['dark', 'ink', 'body', 'muted', 'light']);
    expect(Object.keys(main)).toEqual(['dark', 'ink', 'body', 'muted', 'light']);
    expect(side.body).not.toBe(main.body);
    // Couleurs par défaut : la palette d'origine, pour le corps comme pour la colonne.
    const plain = render(ResumeDesign, normalizeData(example));
    expect(plain).toContain('--text-body:#374151');
    expect(plain).toContain('--sidebar-text-body:#374151');
    expect(plain).toContain('--accent:#2563eb;--accent-text:#2563eb;--sidebar-accent:#2563eb;--sidebar-accent-text:#2563eb');
  });

  it('couleurs superposées : chacune ajustée pour rester lisible sur son fond, la couleur choisie gardée ailleurs', () => {
    const settings = { ...defaultSettings(), primaryColor: '#fbbf24', sidebarBg: '#1e3a8a', sidebarTextColor: '#111827' };
    const shown = displayColors(settings);
    // Jaune : lisible tel quel sur la colonne bleu nuit, assombri sur la page blanche.
    expect(shown.sidebarAccentText).toBe('#fbbf24');
    expect(shown.accentText).not.toBe('#fbbf24');
    // Texte foncé sur la colonne bleu nuit : éclairci.
    expect(shown.sidebarText).not.toBe('#111827');
    expect(shown.text).toBe('#111827');
    const html = render(ResumeDesign, normalizeData(example), settings);
    expect(html).toContain('--primary-color:#fbbf24');
    expect(html).toContain(`--accent-text:${shown.accentText}`);
    expect(html).toContain(`--sidebar-text-dark:${shown.sidebarText}`);
  });

  it('répartit les sections par colonne en gardant l’ordre de data.sections', () => {
    const data = normalizeData(example);
    data.sections = [
      { id: 'education', title: '', visible: true },
      { id: 'languages', title: '', visible: true },
      { id: 'experiences', title: '', visible: true },
      { id: 'skills', title: '', visible: true },
      ...data.sections.filter((s) => !['education', 'languages', 'experiences', 'skills'].includes(s.id)),
    ];
    const html = render(ResumeDesign, data);
    const [sidebar, main] = html.split('class="main-content"');
    const side = indexesOf(sidebar, ['>Langues<', '>Compétences<', '>Liens<']);
    expect(side.every((v, i) => v > 0 && (i === 0 || v > side[i - 1]))).toBe(true);
    const mainIdx = indexesOf(main, ['>Formation<', '>Expériences professionnelles<', '>Autres expériences<']);
    expect(mainIdx.every((v, i) => v > 0 && (i === 0 || v > mainIdx[i - 1]))).toBe(true);
    expect(sidebar).toContain("Centres d&#x27;intérêt");
  });

  it('le profil n’a pas de titre, sauf titre personnalisé', () => {
    const data = normalizeData(example);
    expect(render(ResumeDesign, data)).not.toMatch(/<h2>Profil<\/h2>/);
    data.sections.find((s) => s.id === 'profile').title = 'En bref';
    expect(render(ResumeDesign, data)).toContain('<h2>En bref</h2>');
  });

  it('liens : libellé ou URL lisible, href absolu, icône de repli', () => {
    const html = render(ResumeDesign, messyData());
    expect(html).toContain('href="https://www.linkedin.com/in/camille-martin-exemple"');
    expect(html).toContain('>Mon LinkedIn<');
    expect(textOf(html)).toContain('camille-martin.exemple.fr');
    expect(linkIcon('Linkedin')).toBe(LINK_ICONS.Link);
    expect(linkIcon('Globe')).toBe(LINK_ICONS.Globe);
  });

  it('une icône au nom d’une propriété d’Object (JSON importé) retombe sur Link sans planter', () => {
    for (const name of ['constructor', '__proto__', 'hasOwnProperty', 'toString']) {
      expect(linkIcon(name), name).toBe(LINK_ICONS.Link);
      const data = normalizeData({ ...example, socialLinks: [{ name: 'Site', url: 'exemple.fr', icon: name }] });
      expect(() => render(ResumeDesign, data), name).not.toThrow();
      expect(render(ResumeDesign, data)).not.toContain('[object');
    }
  });

  it('montants et pourcentages insécables : « 80 000 € » et « 4,2 % » ne se coupent pas', () => {
    for (const [, Template] of TEMPLATES) {
      const html = render(Template, normalizeData(example));
      expect(html).toContain('budget de 80\u00A0000\u00A0€');
      expect(html).toContain('4,2\u00A0%');
      expect(html).not.toContain('80 000 €');
    }
    // Les données enregistrées ne changent pas.
    expect(normalizeData(example).experiences[0].details[0]).toContain('80 000 €');
  });

  it('une adresse e-mail saisie comme lien ouvre la messagerie', () => {
    const data = normalizeData({
      ...example,
      socialLinks: [{ name: 'E-mail', url: 'camille.pro@exemple.fr', label: '', icon: 'Mail' }],
    });
    for (const [, Template] of TEMPLATES) {
      const html = render(Template, data);
      expect(html).toContain('href="mailto:camille.pro@exemple.fr"');
      expect(html).not.toContain('https://camille.pro@');
    }
  });

  it('e-mail cliquable, coupure préférée après « @ » dans la sidebar', () => {
    const html = render(ResumeDesign, normalizeData(example));
    expect(html).toContain(
      '<a href="mailto:camille.martin@exemple.fr"><span class="break-seg">camille.martin@</span><wbr/><span class="break-seg">exemple.fr</span></a>',
    );
  });

  it('URL de la sidebar : coupure après « / » ou avant un trait d’union, jamais juste après', () => {
    const url = 'https://www.linkedin.com/in/marie-claire-dupont-4b5a2b1a3/';
    const data = normalizeData({ ...example, socialLinks: [{ name: 'LinkedIn', url, label: '', icon: 'Link' }] });
    const html = render(ResumeDesign, data);
    const link = html.slice(html.indexOf('<span class="link-text">'), html.indexOf('</a>', html.indexOf('link-text')));
    expect(textOf(link)).toBe('linkedin.com/in/marie-claire-dupont-4b5a2b1a3');
    // Points de coupure (<wbr>) : après chaque « / » et avant chaque « - ».
    const pieces = link
      .replace(/<span class="link-text">|<\/span>$/g, '')
      .split('<wbr/>')
      .map(textOf);
    expect(pieces).toEqual(['linkedin.com/', 'in/', 'marie', '-claire', '-dupont', '-4b5a2b1a3']);
    expect(pieces.slice(0, -1).some((p) => p.endsWith('-'))).toBe(false);
    // Chaque morceau est d'un seul tenant (inline-block) : la colonne ne le coupe pas après son tiret.
    const css = fs.readFileSync(path.join(repo, 'src/styles/resume.css'), 'utf8');
    expect(css).toMatch(/\.resume-design \.break-chunk \{[^}]*display: inline-block/);
    // Un libellé saisi (avec espaces) reste un texte ordinaire.
    const labeled = normalizeData({ ...example, socialLinks: [{ name: 'Site', url, label: 'Mon portfolio - photos', icon: 'Link' }] });
    expect(render(ResumeDesign, labeled)).toContain('<span class="link-text">Mon portfolio - photos</span>');
  });

  it('libellés en anglais, y compris les textes pour lecteurs d’écran', () => {
    const data = normalizeData(messyData());
    data.sections.find((s) => s.id === 'profile').title = '';
    data.sections.find((s) => s.id === 'experiences').title = '';
    const html = render(ResumeDesign, data, { lang: 'en' });
    expect(html).toContain('>Professional Experience<');
    expect(html).toContain('>Skills<');
    expect(html).toContain('Tools &amp; methods:');
    expect(html).toContain('Programme details');
    expect(html).toContain('Email:');
    expect(html).toContain('lang="en"');
    expect(html).not.toMatch(/Expériences professionnelles|Compétences|Programme détaillé|Téléphone/);
  });
});

describe('template ATS', () => {
  it('ligne de contact : liens cliquables et URL lisibles, sans icônes', () => {
    const html = render(ResumeATS, messyData());
    expect(html).toContain('<a href="mailto:camille.martin@exemple.fr">camille.martin@exemple.fr</a>');
    expect(html).toContain('<a href="tel:+33612345678">+33 (0)6 12-34.56.78</a>');
    expect(html).toContain(
      '<a href="https://www.linkedin.com/in/camille-martin-exemple" target="_blank" rel="noreferrer">linkedin.com/in/camille-martin-exemple</a>',
    );
    expect(html).not.toContain('<svg');
  });

  it('suit l’ordre complet de data.sections (liens dans l’en-tête)', () => {
    const html = render(ResumeATS, messyData());
    const idx = indexesOf(html, ['Camille Martin', '>Formation<', '>À propos<', '>Parcours<', '>Compétences<', '>Langues<']);
    expect(idx.every((v, i) => v >= 0 && (i === 0 || v > idx[i - 1]))).toBe(true);
    expect(html).not.toContain('>Liens<');
  });

  it('masquer la section « Liens » retire aussi les liens de l’en-tête', () => {
    const data = normalizeData(example);
    data.sections.find((s) => s.id === 'links').visible = false;
    expect(render(ResumeATS, data)).not.toContain('linkedin.com');
  });

  it('en-tête d’élément : intitulé puis « Entreprise · Lieu · Période », sans séparateur orphelin', () => {
    const html = render(ResumeATS, messyData());
    expect(html).toContain('<h3>Chargée de communication</h3><p class="ats-item-meta">Maison Lumière (réseau de 12 boutiques) · Lyon · <span class="ats-period">03/2023 - Aujourd&#x27;hui</span></p>');
    expect(html).toContain('<p class="ats-item-meta">Agence Hublot · <span class="ats-period">09/2020 - 02/2023</span></p>');
    expect(html).not.toMatch(/ats-item-meta">\s*·|·\s*(<\/span>)?<\/p>|\|/);
  });

  it('compétences « Catégorie : a, b », langues sur une ligne, profil titré', () => {
    const html = render(ResumeATS, normalizeData(example));
    expect(html).toContain('<strong>Communication :</strong> Stratégie éditoriale, Relations presse');
    expect(html).toContain('Français : Langue maternelle · Anglais : C1 – Autonome');
    expect(html).toContain('<h2>Profil</h2>');
    const en = render(ResumeATS, normalizeData(example), { lang: 'en' });
    expect(en).toContain('<h2>Profile</h2>');
    expect(en).toContain('<strong>Communication:</strong>');
  });

  it('un poste sans intitulé prend le nom de l’entreprise comme titre', () => {
    const data = normalizeData({ experiences: [{ company: 'Decathlon', period: '2024' }] });
    expect(render(ResumeATS, data)).toContain('<h3>Decathlon</h3><p class="ats-item-meta"><span class="ats-period">2024</span></p>');
  });
});

describe('helpers', () => {
  it('telHref retire espaces et ponctuation', () => {
    expect(telHref('06 12 34 56 78')).toBe('tel:0612345678');
    expect(telHref('+33 (0)6 12 34 56 78')).toBe('tel:+33612345678');
    expect(telHref('sur demande')).toBe('');
  });

  it('linkView : texte = libellé ou URL nettoyée', () => {
    expect(linkView({ id: 'a', name: '', url: 'linkedin.com/in/x/', label: '', icon: 'Link' })).toMatchObject({
      href: 'https://linkedin.com/in/x/',
      text: 'linkedin.com/in/x',
    });
    expect(linkView({ id: 'a', name: '', url: 'https://x.fr', label: 'https://www.x.fr/', icon: 'Link' }).text).toBe('x.fr');
  });

  it('sectionContent renvoie null pour une section sans contenu', () => {
    const d = normalizeData({ mainSkills: [{ category: 'A', skills: [' '] }], education: [{ objectives: [''] }] });
    expect(sectionContent(d, 'skills')).toBeNull();
    expect(sectionContent(d, 'education')).toBeNull();
    expect(sectionContent(d, 'profile')).toBeNull();
  });
});

describe('géométrie et impression', () => {
  it('corps de texte à 10 pt par défaut, en accord exact avec le CSS', () => {
    expect(bodyTextPt(1, 'design')).toBe(10);
    expect(bodyTextPt(1, 'ats')).toBe(10);
    expect(bodyTextPt(0.85)).toBe(8.5);
    expect(BODY_TEXT_PX.design).toBeCloseTo(13.333, 3);
    const css = (file, selector) => {
      const text = fs.readFileSync(path.join(repo, 'src/styles', file), 'utf8');
      const block = text.slice(text.indexOf(`${selector} {`));
      return /font-size:\s*calc\(([\d.]+)pt \* var\(--font-scale\)\)/.exec(block.slice(0, block.indexOf('}')))?.[1];
    };
    expect(Number(css('resume.css', '.resume-design .exp-details'))).toBe(BODY_TEXT_PT.design);
    // Classique : même géométrie d'impression et même corps de texte que Design (mode « design »).
    expect(Number(css('resume-classic.css', '.resume-classic .cl-bullets'))).toBe(BODY_TEXT_PT.design);
    expect(Number(css('resume-ats.css', '.resume-ats-template .ats-detail-list'))).toBe(BODY_TEXT_PT.ats);
  });

  it('règles @page par mode', () => {
    expect(printPageRule('design')).toBe('@page { size: A4; margin: 0; }');
    expect(printPageRule('ats')).toBe('@page { size: A4; margin: 14mm 0; }');
    expect(printPageRule('letter')).toBe('@page { size: A4; margin: 20mm 0; }');
    expect(renderToStaticMarkup(createElement(PrintStyles, { mode: 'letter' }))).toBe(
      '<style media="print">@page { size: A4; margin: 20mm 0; }</style>',
    );
  });

  it('measurePages sans DOM retombe sur une estimation', () => {
    expect(measurePages(null, 'design')).toBe(1);
  });

  // Les valeurs interdites viennent d'un CV réel déposé dans examples/ (e2e/support/private-cv.js),
  // lu seulement s'il est présent sur la machine : aucun test n'en dépend.
  const developerCv = readPrivateCv(repo);
  it.skipIf(!developerCv)('aucune donnée du développeur dans les fichiers du lot', () => {
    const pi = developerCv.personalInfo;
    const digits = pi.phone.replace(/\D/g, '');
    const forbidden = [
      ...pi.name.split(/\s+/).filter((part) => part.length >= 4),
      pi.email,
      pi.email.split('@')[0],
      pi.phone,
      digits.slice(-8),
      ...developerCv.socialLinks.map((link) => link.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '')),
      'photo-cv',
    ].map((value) => value.toLowerCase());
    const dir = path.join(repo, 'src/components/templates');
    const files = [
      ...fs.readdirSync(dir).filter((f) => /\.(jsx?|css)$/.test(f)).map((f) => path.join(dir, f)),
      ...['src/lib/pageGeometry.js', 'src/styles/resume.css', 'src/styles/resume-ats.css', 'src/styles/print.css'].map((f) =>
        path.join(repo, f),
      ),
    ];
    expect(files.length).toBeGreaterThan(8);
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8').toLowerCase();
      const compact = text.replace(/[\s.-]/g, '');
      for (const value of forbidden) {
        expect(text.includes(value) || compact.includes(value.replace(/[\s.-]/g, '')), `${value} dans ${file}`).toBe(false);
      }
    }
  });

  it('un mot trop long se coupe au lieu de déborder de sa colonne', () => {
    const text = fs.readFileSync(path.join(repo, 'src/styles/resume.css'), 'utf8');
    const root = text.slice(text.indexOf('.resume-container {'));
    expect(root.slice(0, root.indexOf('}'))).toMatch(/overflow-wrap:\s*anywhere/);
  });
});

describe('masquage fin et mise en page', () => {
  // Une puce, une compétence, un élément de section libre, un lien, une langue et une certification masqués.
  function partlyHidden() {
    const d = normalizeData(example);
    d.experiences[0].hiddenDetails = [1];
    d.mainSkills[0].hiddenSkills = ['Relations presse'];
    d.customSections[0].hiddenItems = [0];
    d.socialLinks[1].hidden = true;
    d.languages[2].hidden = true;
    d.certifications[1].hidden = true;
    return d;
  }

  for (const [name, Template] of TEMPLATES) {
    it(`${name} : n’affiche ni puce, ni compétence, ni élément masqués`, () => {
      const html = render(Template, partlyHidden());
      expect(html).not.toContain('Animation des réseaux sociaux');
      expect(html).toContain('Organisation de 6 événements');
      expect(html).not.toContain('Relations presse');
      expect(html).toContain('Stratégie éditoriale');
      expect(html).not.toContain('Photographie argentique');
      expect(html).toContain('Théâtre amateur');
      expect(html).not.toContain('camille-martin.exemple.fr');
      expect(html).toContain('linkedin.com/in/camille-martin-exemple');
      expect(html).not.toContain('Espagnol');
      expect(html).not.toContain('Permis B');
      expect(html).toContain('Google Analytics 4');
      expectNothingEmpty(html);
    });

    it(`${name} : une expérience dont toutes les puces sont masquées garde son en-tête`, () => {
      const d = normalizeData(example);
      d.experiences[0].hiddenDetails = [0, 1, 2, 3];
      const html = render(Template, d);
      expect(html).toContain('Chargée de communication');
      expect(html).not.toContain('Définition et pilotage');
      expectNothingEmpty(html);
    });

    it(`${name} : marges et espacement posés en variables CSS`, () => {
      const html = render(Template, normalizeData(example), { margins: 'narrow', spacing: 'airy' });
      expect(html).toContain('--margin-scale:0.7');
      expect(html).toContain('--spacing-scale:1.4');
      expect(render(Template, normalizeData(example))).toContain('--margin-scale:1;--spacing-scale:1');
    });
  }

  it('marges @page du modèle ATS selon le réglage ; « design » et la lettre n’en dépendent pas', () => {
    expect(printPageRule('ats', 0.7)).toBe('@page { size: A4; margin: 9.8mm 0; }');
    expect(printPageRule('ats', 1.3)).toBe('@page { size: A4; margin: 18.2mm 0; }');
    expect(printPageRule('design', 0.7)).toBe('@page { size: A4; margin: 0; }');
    expect(printPageRule('letter', 1.3)).toBe('@page { size: A4; margin: 20mm 0; }');
    expect(renderToStaticMarkup(createElement(PrintStyles, { mode: 'ats', marginScale: 0.7 }))).toBe(
      '<style media="print">@page { size: A4; margin: 9.8mm 0; }</style>',
    );
  });

  it('les paddings et écarts des modèles suivent les réglages', () => {
    const read = (file) => fs.readFileSync(path.join(repo, 'src/styles', file), 'utf8');
    expect(read('resume-ats.css')).toMatch(/padding: calc\(14mm \* var\(--m\)\) calc\(16mm \* var\(--m\)\)/);
    expect(read('resume.css')).toMatch(/padding: calc\(10mm \* var\(--m\)\) calc\(6mm \* var\(--m\)\)/);
    expect(read('resume.css')).toMatch(/margin-bottom: calc\(5mm \* var\(--s\)\)/);
  });
});

describe('modèle ATS : en-tête et titres de section', () => {
  it('en-tête coloré en option, texte lisible sur la couleur principale', () => {
    const plain = render(ResumeATS, normalizeData(example));
    expect(plain).not.toContain('is-header-colored');
    const colored = render(ResumeATS, normalizeData(example), { headerStyle: 'colored', primaryColor: '#fde047' });
    expect(colored).toMatch(/class="resume-container resume-ats-template is-header-colored"/);
    expect(colored).toContain('--header-text:#111827');
  });

  it('seul l’en-tête garde un filet : les titres de section n’en ont plus', () => {
    const css = fs.readFileSync(path.join(repo, 'src/styles/resume-ats.css'), 'utf8');
    const block = (selector) => {
      const start = css.indexOf(`${selector} {`);
      return css.slice(start, css.indexOf('}', start));
    };
    expect(block('.resume-ats-template .ats-section > h2')).not.toMatch(/border/);
    expect(block('.resume-ats-template .ats-header')).toMatch(/border-bottom: 1\.5px solid/);
  });
});

describe('stack technique d’une expérience', () => {
  const withStack = () => {
    const d = normalizeData(example);
    d.experiences[0].stack = ['React', ' Node.js ', '', 'PostgreSQL'];
    return d;
  };

  it('modèle design : libellé puis étiquettes, sans étiquette vide', () => {
    const html = render(ResumeDesign, withStack());
    expect(html).toContain(
      '<div class="exp-stack"><p class="exp-stack-label">Stack technique\u00a0:</p><ul class="tag-cloud small-tags"><li class="tag">React</li><li class="tag">Node.js</li><li class="tag">PostgreSQL</li></ul></div>',
    );
    expect(html.match(/class="exp-stack"/g)).toHaveLength(1);
    expect(render(ResumeDesign, withStack(), { lang: 'en' })).toContain('Tech stack:');
  });

  it('modèle ATS : une ligne « Stack technique : a, b, c » sous les missions', () => {
    const html = render(ResumeATS, withStack());
    expect(html).toContain('</ul><p class="ats-line"><strong>Stack technique\u00a0:</strong> React, Node.js, PostgreSQL</p></article>');
    expect(render(ResumeATS, withStack(), { lang: 'en' })).toContain('<strong>Tech stack:</strong> React');
  });

  it('rien sans stack, ni pour une expérience masquée', () => {
    expect(render(ResumeDesign, normalizeData(example))).not.toContain('exp-stack');
    const d = withStack();
    d.experiences[0].hidden = true;
    expect(render(ResumeATS, d)).not.toContain('Stack technique');
  });

  it('une expérience avec seulement une stack n’est pas vide', () => {
    const d = normalizeData({ experiences: [{ stack: ['Docker'] }] });
    expect(sectionContent(d, 'experiences')).toHaveLength(1);
    expect(render(ResumeATS, d)).toContain('<strong>Stack technique\u00a0:</strong> Docker');
  });
});

describe('présentation des compétences (modèle Design)', () => {
  it('étiquettes par défaut, liste à puces au choix, même contenu et même ordre', () => {
    const data = normalizeData(example);
    const tags = render(ResumeDesign, data);
    expect(tags).toContain('<ul class="tag-cloud skills-tags"><li class="tag">Stratégie éditoriale</li>');
    expect(tags).not.toContain('skills-list');
    const list = render(ResumeDesign, data, { skillsStyle: 'list' });
    expect(list).toContain('<h3 class="sidebar-sub-title">Communication</h3><ul class="skills-list"><li>Stratégie éditoriale</li><li>Relations presse</li>');
    expect(list).not.toContain('skills-tags');
    const skillsOf = (html) => [...html.matchAll(/<li(?: class="tag")?>([^<]*)<\/li>/g)].map((m) => m[1]);
    const inSkills = (html) => skillsOf(html.slice(html.indexOf('sidebar-sub-title'), html.indexOf('<h2>Liens</h2>')));
    expect(inSkills(list)).toEqual(inSkills(tags));
    // Le modèle ATS garde ses lignes « Catégorie : a, b, c ».
    expect(render(ResumeATS, data, { skillsStyle: 'list' })).toContain('<strong>Communication\u00a0:</strong> Stratégie éditoriale');
  });

  it('le même choix vaut pour la stack technique et les objectifs et outils des formations', () => {
    const data = normalizeData(example);
    data.experiences[0].stack = ['React', 'Node.js'];
    data.education[0].objectives = ['Gestion de projet'];
    data.education[0].tools = ['Figma', 'Notion'];
    const tags = render(ResumeDesign, data);
    expect(tags).toContain('<ul class="tag-cloud small-tags"><li class="tag">React</li><li class="tag">Node.js</li></ul>');
    expect(tags).toContain('<ul class="tag-cloud"><li class="tag">Gestion de projet</li></ul>');
    expect(tags).toContain('<ul class="tag-cloud small-tags"><li class="tag">Figma</li><li class="tag">Notion</li></ul>');
    const list = render(ResumeDesign, data, { skillsStyle: 'list' });
    expect(list).toContain('<ul class="skills-list small-list"><li>React</li><li>Node.js</li></ul>');
    expect(list).toContain('<ul class="skills-list"><li>Gestion de projet</li></ul>');
    expect(list).toContain('<ul class="skills-list small-list"><li>Figma</li><li>Notion</li></ul>');
    expect(list).not.toContain('class="tag"');
  });
});

describe('modèle Classique', () => {
  const classic = (data, settings = {}) => render(ResumeClassic, data, { designStyle: 'classic', ...STYLE_DEFAULTS.classic, ...settings });

  it('colonne : photo, nom, puis coordonnées et liens ensemble, sans titre « Liens »', () => {
    const data = normalizeData({ ...example, personalInfo: { ...example.personalInfo, photo: 'data:image/jpeg;base64,AAAA' } });
    const html = classic(data);
    const [sidebar, main] = html.split('class="main-content"');
    expect(sidebar).toContain('<img src="data:image/jpeg;base64,AAAA" alt="Photo de Camille Martin"');
    expect(sidebar).toContain('<h1>Camille Martin</h1>');
    const contact = sidebar.slice(sidebar.indexOf('class="contact-info"'), sidebar.indexOf('</header>'));
    // Téléphone, e-mail, ville, puis chaque lien visible.
    expect(indexesOf(contact, ['tel:', 'mailto:', 'Lyon', 'linkedin.com'])).toEqual(
      [...indexesOf(contact, ['tel:', 'mailto:', 'Lyon', 'linkedin.com'])].sort((a, b) => a - b),
    );
    expect(contact).toContain('href="https://www.linkedin.com/in/camille-martin-exemple"');
    expect(html).not.toContain('>Liens<');
    expect(classic(data, { showPhoto: false })).not.toContain('<img');
    // Le poste ouvre la colonne principale, pas la colonne latérale.
    expect(sidebar).not.toContain(example.personalInfo.title);
    expect(main).toMatch(new RegExp(`^[^>]*><p class="cl-title">${example.personalInfo.title}</p>`));
  });

  it('section « Liens » masquée : les liens disparaissent des coordonnées', () => {
    const data = normalizeData(example);
    data.sections.find((s) => s.id === 'links').visible = false;
    const html = classic(data);
    expect(html).not.toContain('linkedin.com');
    expect(html).toContain('mailto:');
  });

  it('mots-clés en texte : « Catégorie : a, b, c » et « Stack technique : … »', () => {
    const data = normalizeData(example);
    data.experiences[0].stack = ['React', 'Node.js'];
    const html = classic(data);
    expect(html).toContain('<p class="cl-skill"><strong class="cl-label">Communication\u00a0:</strong> Stratégie éditoriale, Relations presse');
    expect(html).toContain('<p class="cl-line"><strong class="cl-label">Stack technique\u00a0:</strong> React, Node.js</p>');
    expect(html).not.toMatch(/class="tag/);
    // Le réglage « Étiquettes / Liste à puces » ne concerne que le modèle Design.
    expect(classic(data, { skillsStyle: 'list' })).toBe(html);
  });

  it('expérience : intitulé et dates sur une ligne, puis l’entreprise et le lieu', () => {
    const data = normalizeData(example);
    const exp = Object.assign(data.experiences[0], {
      title: 'Chargée de communication',
      company: 'Maison Lumière',
      location: 'Lyon',
      period: '03/2023 - 06/2024',
    });
    const html = classic(data);
    expect(html).toContain(
      `<div class="cl-item-row"><h3>${exp.title}</h3><p class="cl-period"><span class="resume-sr-only">Période\u00a0: </span>${exp.period}</p></div>`,
    );
    expect(html).toContain(`<p class="cl-org">${exp.company}<span class="cl-org-extra"> · ${exp.location}</span></p>`);
    // Titre du profil affiché (« Profil »), comme sur le modèle ATS.
    expect(html).toContain('<section class="cl-section cl-main-section"><h2>Profil</h2><p class="cl-profile">');
  });

  it('langues sur deux colonnes, deux-points gardé pour le texte extrait', () => {
    const html = classic(normalizeData(example));
    const lang = example.languages[0];
    expect(html).toContain(
      `<li><span class="cl-lang-name">${lang.name}<span class="resume-sr-only">\u00a0:</span></span> <span class="cl-lang-level">${lang.level}</span></li>`,
    );
  });

  it('titres de la page : couleur de la colonne si elle est foncée, sinon couleur principale', () => {
    const style = (settings) => /style="([^"]*)"/.exec(classic(normalizeData(example), settings))[1];
    expect(style({})).toContain('--page-title:#1c472d');
    const light = displayColors({ ...defaultSettings(), designStyle: 'classic' });
    expect(light.pageTitle).toBe(light.accentText);
    expect(style({ ...STYLE_DEFAULTS.modern })).toContain(`--page-title:${light.accentText}`);
    // Les couleurs du modèle restent lisibles sur leur fond, sans ajustement.
    const shown = displayColors({ ...defaultSettings(), ...STYLE_DEFAULTS.classic });
    expect(shown.sidebarText).toBe('#ffffff');
    expect(shown.sidebarAccent).toBe(STYLE_DEFAULTS.classic.primaryColor);
    expect(contrastRatio(shown.pageTitle, '#ffffff')).toBeGreaterThanOrEqual(7);
  });
});

describe('ligne de texte (Design, Classique et Focus)', () => {
  it('dans la colonne principale ou la colonne latérale, au choix', () => {
    for (const Template of [ResumeDesign, ResumeClassic, ResumeFocus]) {
      const [sidebar, main] = render(Template, withTextLine(['Disponible immédiatement'])).split('class="main-content"');
      expect(main, Template.name).toContain('Disponible immédiatement');
      expect(sidebar, Template.name).not.toContain('Disponible immédiatement');
      const [side] = render(Template, withTextLine(['Disponible immédiatement'], 'sidebar')).split('class="main-content"');
      expect(side, Template.name).toContain('Disponible immédiatement');
    }
  });

  it('justifiée avec le reste du texte de la colonne principale', () => {
    const read = (file) => fs.readFileSync(path.join(repo, 'src/styles', file), 'utf8');
    expect(read('resume.css')).toMatch(/\.is-justified :is\([^)]*\.main-text\)/);
    expect(read('resume-classic.css')).toMatch(/\.is-justified :is\([^)]*\.cl-main-text\)/);
  });
});

describe('modèle Expert', () => {
  const expert = (data, settings = {}) => render(ResumeExpert, data, { designStyle: 'expert', ...STYLE_DEFAULTS.expert, ...settings });

  it('en-tête pleine largeur : photo, nom, poste, sous-titre, puis coordonnées et liens, sans titre « Liens »', () => {
    const data = normalizeData({
      ...example,
      personalInfo: { ...example.personalInfo, subtitle: 'CDI', photo: 'data:image/jpeg;base64,AAAA' },
    });
    const html = expert(data);
    const header = html.slice(html.indexOf('<header class="ex-header">'), html.indexOf('</header>'));
    expect(header).toContain('<img src="data:image/jpeg;base64,AAAA" alt="Photo de Camille Martin"');
    expect(header).toContain(
      `<h1>Camille Martin</h1><p class="ex-title">${example.personalInfo.title}</p><p class="ex-subtitle">CDI</p><ul class="ex-contact">`,
    );
    expect(indexesOf(header, ['mailto:', 'tel:', 'Lyon', 'linkedin.com'])).toEqual(
      [...indexesOf(header, ['mailto:', 'tel:', 'Lyon', 'linkedin.com'])].sort((a, b) => a - b),
    );
    expect(html).not.toContain('>Liens<');
    expect(html).not.toContain('class="sidebar"');
    expect(expert(data, { showPhoto: false })).not.toContain('<img');
  });

  it('expérience : la période et le lieu dans la marge, l’intitulé et l’entreprise à droite', () => {
    const data = normalizeData(example);
    Object.assign(data.experiences[0], { title: 'Directrice commerciale', company: 'Maison Lumière', location: 'Lyon', period: '03/2023 - Aujourd’hui' });
    const html = expert(data);
    // Le tiret reste collé au mot qui suit : une coupure de ligne passe avant lui, jamais après.
    expect(html).toContain(
      '<article class="ex-entry"><div class="ex-when"><p class="ex-period"><span class="resume-sr-only">Période\u00a0: </span>03/2023 <span class="ex-nobreak">- Aujourd’hui</span></p><p class="ex-place">Lyon</p></div><div class="ex-what"><div class="ex-head"><h3>Directrice commerciale</h3><p class="ex-org">Maison Lumière</p></div><ul class="ex-bullets">',
    );
    // Sans date ni lieu, pas de marge vide dans le texte.
    Object.assign(data.experiences[0], { location: '', period: '' });
    expect(expert(data)).toContain('<article class="ex-entry"><div class="ex-what"><div class="ex-head"><h3>Directrice commerciale</h3>');
  });

  it('une seule colonne : les sections suivent l’ordre de la liste, quel que soit leur emplacement', () => {
    const data = messyData();
    data.customSections.find((c) => c.id === 'benevolat').column = 'sidebar';
    const html = expert(data);
    const order = ['Formation', 'À propos', 'Parcours', 'Compétences', 'Bénévolat'].map((w) => html.indexOf(`<h2>${w}</h2>`));
    expect(order.every((i) => i > -1)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('compétences clés : un bloc par catégorie, deux-points gardé pour le texte extrait', () => {
    const html = expert(normalizeData(example));
    const group = example.mainSkills[0];
    expect(html).toContain(
      `<div class="ex-skill-group"><p class="ex-skill-category">${group.category}<span class="resume-sr-only">\u00a0:</span></p><p class="ex-skill-list">${group.skills.join(', ')}</p></div>`,
    );
    // Le réglage « Étiquettes / Liste à puces » ne concerne que le modèle Design.
    expect(expert(normalizeData(example), { skillsStyle: 'list' })).toBe(html);
  });

  it('certifications datées dans la marge, langues côte à côte', () => {
    const html = expert(normalizeData(example));
    const cert = example.certifications[0];
    expect(html).toContain(
      `<article class="ex-entry is-compact"><div class="ex-when"><p class="ex-period"><span class="resume-sr-only">Période\u00a0: </span>${cert.date}</p></div><div class="ex-what"><p class="ex-cert"><strong>${cert.name}</strong><span class="ex-org-extra"> · ${cert.issuer}</span></p></div></article>`,
    );
    const lang = example.languages[0];
    expect(html).toContain(`<ul class="ex-langs"><li><strong>${lang.name}\u00a0:</strong> ${lang.level}</li>`);
  });

  it('en-tête coloré en option, couleurs par défaut lisibles sans ajustement', () => {
    expect(expert(normalizeData(example), { headerStyle: 'colored' })).toMatch(/class="resume-container resume-expert is-header-colored"/);
    const shown = displayColors({ ...defaultSettings(), ...STYLE_DEFAULTS.expert });
    expect(shown.accentText).toBe(STYLE_DEFAULTS.expert.primaryColor);
    expect(contrastRatio(STYLE_DEFAULTS.expert.primaryColor, '#ffffff')).toBeGreaterThanOrEqual(7);
  });
});

describe('modèle Focus', () => {
  const focus = (data, settings = {}) => render(ResumeFocus, data, { designStyle: 'focus', ...STYLE_DEFAULTS.focus, ...settings });
  const columns = (html) => {
    const [, rest] = html.split('<aside class="sidebar">');
    return rest.split('class="main-content"');
  };

  it('la formation passe dans la colonne ; le corps de la page garde le profil et les expériences', () => {
    const [sidebar, main] = columns(focus(normalizeData(example)));
    for (const text of ['<h2>Formation</h2>', '<h2>Compétences</h2>', '<h2>Langues</h2>', '<h2>Certifications</h2>']) {
      expect(sidebar).toContain(text);
      expect(main).not.toContain(text);
    }
    expect(sidebar).toContain(example.education[0].school);
    expect(main).toContain('<h2>Profil</h2>');
    expect(main).toContain('<h2>Expériences professionnelles</h2>');
    expect(main).toContain(example.experiences[0].company);
    expect(sidebar).not.toContain(example.experiences[0].company);
    // Dans les autres modèles en deux colonnes, la formation reste dans le corps de la page.
    expect(render(ResumeDesign, normalizeData(example)).split('class="main-content"')[1]).toContain('Formation');
  });

  it('en-tête pleine largeur : nom, poste, sous-titre, coordonnées et liens, au-dessus des colonnes', () => {
    const data = normalizeData({ ...example, personalInfo: { ...example.personalInfo, subtitle: 'CDI' } });
    const html = focus(data);
    const header = html.slice(html.indexOf('<header class="fo-header">'), html.indexOf('</header>'));
    expect(header).toContain(
      `<h1>Camille Martin</h1><p class="fo-title">${example.personalInfo.title}</p><p class="fo-subtitle">CDI</p><ul class="fo-contact">`,
    );
    expect(header).toContain('href="https://www.linkedin.com/in/camille-martin-exemple"');
    expect(html.indexOf('</header>')).toBeLessThan(html.indexOf('<div class="fo-columns">'));
    expect(html).not.toContain('>Liens<');
  });

  it('formation compacte : diplôme, établissement, précisions, puis les dates', () => {
    const data = normalizeData(example);
    const edu = Object.assign(data.education[0], { title: 'Master Communication', school: 'Université Lyon 2', degree: 'Bac +5', location: 'Lyon', period: '2018 - 2020' });
    expect(focus(data)).toContain(
      `<article class="fo-edu"><h3>${edu.title}</h3><p class="fo-edu-school">${edu.school}</p><p class="fo-edu-meta">Bac +5 · Lyon</p><p class="fo-edu-period"><span class="resume-sr-only">Période\u00a0: </span>2018 - 2020</p>`,
    );
  });

  it('expérience : intitulé et dates sur une ligne, puis l’entreprise et le lieu', () => {
    const data = normalizeData(example);
    const exp = Object.assign(data.experiences[0], { title: 'Directrice commerciale', company: 'Maison Lumière', location: 'Lyon', period: '03/2023 - Aujourd’hui' });
    expect(focus(data)).toContain(
      `<div class="fo-item-row"><h3>${exp.title}</h3><p class="fo-period"><span class="resume-sr-only">Période\u00a0: </span>${exp.period}</p></div><p class="fo-org">${exp.company}<span class="fo-org-extra"> · Lyon</span></p>`,
    );
  });

  it('colonne étroite : les mots composés restent d’un seul tenant (tiret gardé au texte extrait)', () => {
    const data = normalizeData(example);
    data.education[1].title = 'Licence Information-Communication';
    const html = focus(data);
    expect(html).toContain('<h3>Licence <span class="keep-word">Information-Communication</span></h3>');
    expect(html).toContain('<span class="keep-word">E-mailing,</span>');
    // Sans trait d'union, le texte est inchangé.
    expect(html).toContain(`<p class="fo-edu-school">${example.education[1].school}</p>`);
  });

  it('couleurs par défaut lisibles sur la colonne teintée, sans ajustement', () => {
    const shown = displayColors({ ...defaultSettings(), ...STYLE_DEFAULTS.focus });
    expect(shown.accentText).toBe(STYLE_DEFAULTS.focus.primaryColor);
    expect(shown.sidebarAccentText).toBe(STYLE_DEFAULTS.focus.primaryColor);
    expect(shown.sidebarText).toBe(STYLE_DEFAULTS.focus.sidebarTextColor);
    expect(focus(normalizeData(example), { headerStyle: 'colored' })).toMatch(/class="resume-container resume-focus is-header-colored"/);
  });
});

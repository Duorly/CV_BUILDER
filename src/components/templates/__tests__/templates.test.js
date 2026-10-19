import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ResumeDesign from '../ResumeDesign';
import ResumeATS from '../ResumeATS';
import PrintStyles from '../PrintStyles';
import { linkIcon, LINK_ICONS } from '../icons';
import { linkView, sectionContent, telHref } from '../shared';
import { defaultSettings, newCustomSection, normalizeData } from '../../../lib/schema';
import {
  BODY_TEXT_PT,
  BODY_TEXT_PX,
  bodyTextPt,
  measurePages,
  printPageRule,
} from '../../../lib/pageGeometry';
import example from '../../../data/exampleResume.json';
import legacy from '../../../lib/__tests__/fixtures/legacy-v1.json';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../..');

const render = (Component, data, settings = {}) =>
  renderToStaticMarkup(createElement(Component, { data, settings: { ...defaultSettings(), ...settings } }));

const TEMPLATES = [
  ['design', ResumeDesign],
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
      expect(html).toContain('Licence Information-Communication');
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

  // Les valeurs interdites viennent de l'ancien CV du développeur (examples/cv-nebel.json),
  // lu seulement s'il est présent sur la machine : aucun test n'en dépend.
  const developerCvFile = path.join(repo, 'examples/cv-nebel.json');
  it.skipIf(!fs.existsSync(developerCvFile))('aucune donnée du développeur dans les fichiers du lot', () => {
    const developerCv = JSON.parse(fs.readFileSync(developerCvFile, 'utf8'));
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

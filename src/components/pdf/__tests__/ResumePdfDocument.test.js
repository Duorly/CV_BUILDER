import { describe, expect, it } from 'vitest';
import { inflateSync } from 'node:zlib';
import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import ResumePdfDocument from '../ResumePdfDocument';
import { normalizeData, normalizeSettings } from '../../../lib/schema';
import example from '../../../data/exampleResume.json';

// Rendu réel (moteur react-pdf) : structure du fichier, métadonnées et liens.
// Le contenu texte est contrôlé à part avec pdftotext (voir le compte rendu du lot pdf).
async function render(data, settings = {}, title = 'CV_Test') {
  const element = createElement(ResumePdfDocument, {
    data: normalizeData(data),
    settings: normalizeSettings(settings),
    title,
  });
  return (await renderToBuffer(element)).toString('latin1');
}

const pageCount = (pdf) => (pdf.match(/\/Type \/Page\b/g) || []).length;

// Texte de chaque ligne dessinée : un opérateur TJ par ligne, dans les flux de contenu décompressés.
function drawnLines(pdf) {
  const buffer = Buffer.from(pdf, 'latin1');
  const lines = [];
  for (const match of pdf.matchAll(/stream\r?\n/g)) {
    const start = match.index + match[0].length;
    let content;
    try {
      content = inflateSync(buffer.subarray(start, pdf.indexOf('endstream', start))).toString('latin1');
    } catch {
      continue;
    }
    for (const [, array] of content.matchAll(/\[([^\]]*)\] TJ/g)) {
      const hex = [...array.matchAll(/<([0-9a-f]*)>/g)].map((m) => m[1]).join('');
      lines.push(Buffer.from(hex, 'hex').toString('latin1'));
    }
  }
  return lines;
}

describe('ResumePdfDocument', () => {
  it('produit un PDF A4 avec métadonnées, langue et liens cliquables', async () => {
    const pdf = await render(example, { lang: 'fr' }, 'CV_Camille_Martin');
    expect(pdf.startsWith('%PDF-')).toBe(true);
    expect(pdf).toMatch(/\/MediaBox \[0 0 595\.28\d* 841\.89\d*\]/);
    // Titre, auteur et créateur sont des objets indirects : « 28 0 obj (CV_Camille_Martin) endobj ».
    expect(pdf).toMatch(/\/Title \d+ 0 R/);
    expect(pdf).toContain('(CV_Camille_Martin)');
    expect(pdf).toContain('(Camille Martin)');
    expect(pdf).toContain('(CV Builder)');
    expect(pdf).toContain('/Lang (fr)');
    expect(pdf).toContain('/URI (mailto:camille.martin@exemple.fr)');
    expect(pdf).toContain('/URI (tel:0612345678)');
    expect(pdf).toContain('/URI (https://www.linkedin.com/in/camille-martin-exemple)');
    expect(pageCount(pdf)).toBeGreaterThanOrEqual(1);
  });

  it('liens de contact : « (0) » retiré du téléphone, adresse e-mail nue en mailto:', async () => {
    const data = {
      ...example,
      personalInfo: { ...example.personalInfo, phone: '+33 (0)6 12 34 56 78' },
      socialLinks: [{ name: 'E-mail', url: 'camille.pro@exemple.fr', label: '', icon: 'Mail' }],
    };
    const pdf = await render(data);
    expect(pdf).toContain('/URI (tel:+33612345678)');
    expect(pdf).toContain('/URI (mailto:camille.pro@exemple.fr)');
    expect(pdf).not.toContain('https://camille.pro@');
  });

  it('rend un CV vierge sans erreur, sur une seule page', async () => {
    const pdf = await render({}, { lang: 'en' });
    expect(pdf).toContain('/Lang (en)');
    expect(pageCount(pdf)).toBe(1);
  });

  it('masque les liens quand la section « Liens » est cachée', async () => {
    const pdf = await render({ ...example, sections: [{ id: 'links', visible: false }] });
    expect(pdf).not.toContain('linkedin.com');
    expect(pdf).toContain('/URI (mailto:camille.martin@exemple.fr)');
  });

  it('omet les formations masquées', async () => {
    const data = structuredClone(example);
    data.education[0].hidden = true;
    const text = drawnLines(await render(data)).join('\n');
    expect(text).not.toContain('Master Communication');
    expect(text).toContain('Licence Information-Communication');
  });

  it('omet les groupes de compétences masqués', async () => {
    const data = structuredClone(example);
    data.mainSkills[0].hidden = true;
    const text = drawnLines(await render(data)).join('\n');
    expect(text).not.toContain('Stratégie éditoriale');
    expect(text).toContain('Google Analytics');
  });

  it('omet les expériences masquées', async () => {
    const data = structuredClone(example);
    data.experiences[0].hidden = true;
    const text = drawnLines(await render(data)).join('\n');
    expect(text).not.toContain('Maison Lumi');
    expect(text).toContain('Agence Hublot');
  });

  it('section libre « sur une ligne » : éléments séparés par « · »', async () => {
    const data = structuredClone(example);
    data.customSections[0].layout = 'inline';
    const lines = drawnLines(await render(data));
    expect(lines.some((line) => line.includes('Photographie argentique · Course'))).toBe(true);
  });

  it('accepte l’en-tête centré et le texte justifié', async () => {
    const pdf = await render(example, { headerAlign: 'center', textAlign: 'justify' });
    expect(pageCount(pdf)).toBeGreaterThanOrEqual(1);
    expect(drawnLines(pdf).join('\n')).toContain('Camille Martin');
  });

  it('coupe sans tiret un mot plus large que la ligne au lieu de le faire déborder', async () => {
    const data = structuredClone(example);
    const word = 'A'.repeat(150);
    data.experiences[0].details = [`Mot sans espace : ${word} fin.`];
    const lines = drawnLines(await render(data));
    const pieces = lines.filter((line) => line.includes('AAAA'));
    expect(pieces.length).toBeGreaterThanOrEqual(2);
    expect(pieces.join('').match(/A+/g).join('')).toBe(word);
    expect(pieces.some((line) => /A-$/.test(line.trim()))).toBe(false);
  });

  it('répartit un long CV sur plusieurs pages et résiste aux caractères exotiques', async () => {
    const long = structuredClone(example);
    long.experiences = Array.from({ length: 12 }, (_, i) => ({
      ...example.experiences[i % example.experiences.length],
      details: [...example.experiences[0].details, '🚀 Projet → livré ✅', '', '   '],
    }));
    long.personalInfo.name = 'Zoë Łukasz 王';
    const pdf = await render(long);
    expect(pageCount(pdf)).toBeGreaterThanOrEqual(3);
  });
});

describe('ResumePdfDocument : masquage fin et marges', () => {
  it('omet puces, compétences, liens, langues et certifications masqués', async () => {
    const data = structuredClone(example);
    data.experiences[0].hiddenDetails = [1];
    data.mainSkills[0].hiddenSkills = ['Relations presse'];
    data.socialLinks[1].hidden = true;
    data.languages[2].hidden = true;
    data.certifications[1].hidden = true;
    data.customSections[0].hiddenItems = [0];
    const pdf = await render(data);
    const text = drawnLines(pdf).join('\n');
    expect(text).not.toContain('Animation des r');
    expect(text).toContain('Organisation de 6');
    expect(text).not.toContain('Relations presse');
    expect(text).not.toContain('Espagnol');
    expect(text).not.toContain('Permis B');
    expect(text).not.toContain('Photographie argentique');
    expect(pdf).not.toContain('camille-martin.exemple.fr');
    expect(pdf).toContain('linkedin.com/in/camille-martin-exemple');
  });

  it('des marges étroites et un espacement serré font tenir plus de contenu par page', async () => {
    const long = structuredClone(example);
    long.experiences = Array.from({ length: 8 }, (_, i) => ({ ...example.experiences[i % example.experiences.length] }));
    const normal = pageCount(await render(long));
    const compact = pageCount(await render(long, { margins: 'narrow', spacing: 'compact' }));
    const airy = pageCount(await render(long, { margins: 'wide', spacing: 'airy' }));
    expect(compact).toBeLessThanOrEqual(normal);
    expect(airy).toBeGreaterThanOrEqual(normal);
    expect(airy).toBeGreaterThan(compact);
  });
});

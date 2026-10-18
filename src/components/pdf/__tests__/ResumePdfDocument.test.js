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

import { execFileSync } from 'node:child_process';

// Lecture des PDF avec poppler (pdftotext, pdfinfo) : ce que verra un logiciel de recrutement.

let available = null;
export function hasPoppler() {
  if (available === null) {
    try {
      execFileSync('pdfinfo', ['-v'], { stdio: 'ignore' });
      available = true;
    } catch {
      available = false;
    }
  }
  return available;
}

export const POPPLER_MISSING = 'poppler introuvable (pdftotext, pdfinfo) : installez-le, par ex. « brew install poppler » ou « apt install poppler-utils ».';

export function pdfInfo(file) {
  const out = execFileSync('pdfinfo', [file], { encoding: 'utf8' });
  const field = (name) => out.match(new RegExp(`^${name}:\\s*(.*)$`, 'm'))?.[1].trim() ?? '';
  return { pages: Number(field('Pages')), title: field('Title'), author: field('Author'), pageSize: field('Page size') };
}

export function pdfText(file, { first, last } = {}) {
  const args = [];
  if (first) args.push('-f', String(first));
  if (last) args.push('-l', String(last));
  return execFileSync('pdftotext', [...args, '-enc', 'UTF-8', file, '-'], { encoding: 'utf8' });
}

// Lignes non vides, espaces normalisées (pdftotext rend les espaces insécables en espaces).
export function pdfLines(file) {
  return pdfText(file)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

// Texte de chaque page : une page blanche donne une chaîne vide.
export function pdfPagesText(file) {
  const { pages } = pdfInfo(file);
  return Array.from({ length: pages }, (_, i) => pdfText(file, { first: i + 1, last: i + 1 }).replace(/\s+/g, ' ').trim());
}

// Liens cliquables du PDF (annotations), dans l'ordre.
export function pdfUrls(file) {
  return execFileSync('pdfinfo', ['-url', file], { encoding: 'utf8' })
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(/\s+/)[2])
    .filter(Boolean);
}

// Polices du PDF : [{ name, type }] (« Type 3 » = glyphes dessinés, texte mal extrait).
export function pdfFonts(file) {
  return execFileSync('pdffonts', [file], { encoding: 'utf8' })
    .split('\n')
    .slice(2)
    .filter((line) => line.trim())
    .map((line) => ({ name: line.slice(0, 36).trim(), type: line.slice(37, 55).trim() }));
}

// Texte brut, dans l'ordre du flux (sans reconstruction des espaces par la géométrie).
export function pdfRawText(file) {
  return execFileSync('pdftotext', ['-raw', '-enc', 'UTF-8', file, '-'], { encoding: 'utf8' });
}

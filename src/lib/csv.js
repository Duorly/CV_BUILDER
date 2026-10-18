// Export CSV lisible par Excel en français : séparateur « ; » (la virgule y est
// le séparateur décimal) et BOM UTF-8, sans lequel Excel affiche mal les accents.

export const CSV_SEPARATOR = ';';
export const CSV_MIME = 'text/csv;charset=utf-8';
const BOM = '﻿';

// Une cellule commençant par = + - @ serait exécutée comme formule par Excel
// (« - relancer » afficherait #NOM?) : on la préfixe d'une apostrophe.
const FORMULA_START = /^[=+\-@\t\r]/;

export function escapeCsvCell(value, separator = CSV_SEPARATOR) {
  let cell = value == null ? '' : String(value);
  if (FORMULA_START.test(cell)) cell = `'${cell}`;
  if (cell.includes('"') || cell.includes(separator) || /[\r\n]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

// rows : tableau de lignes (la première est généralement l'en-tête).
export function toCsv(rows, { separator = CSV_SEPARATOR, bom = true } = {}) {
  const lines = rows.map((row) => row.map((cell) => escapeCsvCell(cell, separator)).join(separator));
  return `${bom ? BOM : ''}${lines.join('\r\n')}\r\n`;
}

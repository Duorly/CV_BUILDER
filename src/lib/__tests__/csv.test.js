import { describe, expect, it } from 'vitest';
import { CSV_SEPARATOR, escapeCsvCell, toCsv } from '../csv';

describe('escapeCsvCell', () => {
  it('laisse intactes les valeurs simples', () => {
    expect(escapeCsvCell('Decathlon')).toBe('Decathlon');
    expect(escapeCsvCell('Chargée de communication, junior')).toBe('Chargée de communication, junior');
  });

  it('transforme null et undefined en cellule vide', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
    expect(escapeCsvCell(42)).toBe('42');
  });

  it('entoure de guillemets une valeur contenant le séparateur', () => {
    expect(CSV_SEPARATOR).toBe(';');
    expect(escapeCsvCell('Lyon; Paris')).toBe('"Lyon; Paris"');
  });

  it('double les guillemets', () => {
    expect(escapeCsvCell('Poste "senior"')).toBe('"Poste ""senior"""');
  });

  it('protège les retours à la ligne', () => {
    expect(escapeCsvCell('ligne 1\nligne 2')).toBe('"ligne 1\nligne 2"');
    expect(escapeCsvCell('ligne 1\r\nligne 2')).toBe('"ligne 1\r\nligne 2"');
  });

  it('neutralise les débuts de formule Excel', () => {
    expect(escapeCsvCell('=SOMME(A1:A2)')).toBe("'=SOMME(A1:A2)");
    expect(escapeCsvCell('- relancer lundi')).toBe("'- relancer lundi");
    expect(escapeCsvCell('+33 6 12 34 56 78')).toBe("'+33 6 12 34 56 78");
    expect(escapeCsvCell('@contact')).toBe("'@contact");
  });

  it('accepte un autre séparateur', () => {
    expect(escapeCsvCell('a,b', ',')).toBe('"a,b"');
    expect(escapeCsvCell('a;b', ',')).toBe('a;b');
  });
});

describe('toCsv', () => {
  it('commence par le BOM UTF-8 et termine chaque ligne par CRLF', () => {
    const csv = toCsv([
      ['Entreprise', 'Poste'],
      ['Société Générale', 'Chargée de com'],
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toBe('﻿Entreprise;Poste\r\nSociété Générale;Chargée de com\r\n');
  });

  it('peut omettre le BOM', () => {
    expect(toCsv([['a', 'b']], { bom: false })).toBe('a;b\r\n');
  });

  it('garde une cellule multiligne dans une seule ligne logique', () => {
    const csv = toCsv([['Notes'], ['Appel RH\n"très positif"; à relancer']], { bom: false });
    expect(csv).toBe('Notes\r\n"Appel RH\n""très positif""; à relancer"\r\n');
  });

  it('conserve les cellules vides', () => {
    expect(toCsv([['a', '', null, 'd']], { bom: false })).toBe('a;;;d\r\n');
  });
});

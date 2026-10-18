import { describe, expect, it } from 'vitest';
import { normalizeApplication } from '../../../lib/storage';
import {
  addDaysIso,
  applicationsToCsv,
  cvOptionLabel,
  daysBetween,
  filterApplications,
  FILTER_FOLLOW_UP,
  frenchDate,
  frozenRows,
  isFollowUpDue,
  markFollowedUp,
  sortApplications,
  trackerCounts,
  withSendDate,
  withStatus,
} from '../trackerUtils';

const TODAY = '2026-10-18';
const app = (fields) => normalizeApplication({ createdAt: '2026-10-01T10:00:00.000Z', ...fields });

describe('addDaysIso', () => {
  it('ajoute des jours en passant les fins de mois et d’année', () => {
    expect(addDaysIso('2026-10-18', 7)).toBe('2026-10-25');
    expect(addDaysIso('2026-10-28', 7)).toBe('2026-11-04');
    expect(addDaysIso('2026-12-29', 7)).toBe('2027-01-05');
    expect(addDaysIso('2028-02-25', 7)).toBe('2028-03-03');
  });

  it('ne se décale pas au changement d’heure', () => {
    expect(addDaysIso('2026-10-24', 7)).toBe('2026-10-31');
    expect(addDaysIso('2026-03-27', 7)).toBe('2026-04-03');
  });

  it('retourne une chaîne vide pour une date invalide', () => {
    expect(addDaysIso('', 7)).toBe('');
    expect(addDaysIso('18/10/2026', 7)).toBe('');
  });
});

describe('daysBetween et frenchDate', () => {
  it('compte les jours entre deux dates', () => {
    expect(daysBetween('2026-10-18', '2026-10-25')).toBe(7);
    expect(daysBetween('2026-10-25', '2026-10-18')).toBe(-7);
    expect(daysBetween('', '2026-10-18')).toBeNull();
  });

  it('formate une date à la française', () => {
    expect(frenchDate('2026-10-05')).toBe('05/10/2026');
    expect(frenchDate('')).toBe('');
  });
});

describe('withStatus : relance proposée à J+7', () => {
  it('passe à « Envoyée » : date d’envoi = aujourd’hui et relance à J+7', () => {
    const next = withStatus(app({ status: 'a_envoyer' }), 'envoyee', TODAY);
    expect(next.status).toBe('envoyee');
    expect(next.date).toBe(TODAY);
    expect(next.followUpDate).toBe('2026-10-25');
  });

  it('calcule la relance depuis la date d’envoi déjà saisie', () => {
    const next = withStatus(app({ status: 'a_envoyer', date: '2026-10-02' }), 'envoyee', TODAY);
    expect(next.date).toBe('2026-10-02');
    expect(next.followUpDate).toBe('2026-10-09');
    expect(isFollowUpDue(next, TODAY)).toBe(true);
  });

  it('ne remplace pas une date de relance déjà fixée', () => {
    const next = withStatus(app({ status: 'a_envoyer', followUpDate: '2026-11-02' }), 'envoyee', TODAY);
    expect(next.followUpDate).toBe('2026-11-02');
  });

  it('« Relancée » repousse une relance passée de 7 jours', () => {
    const sent = app({ status: 'envoyee', date: '2026-10-01', followUpDate: '2026-10-08' });
    expect(isFollowUpDue(sent, TODAY)).toBe(true);
    const next = withStatus(sent, 'relancee', TODAY);
    expect(next.followUpDate).toBe('2026-10-25');
    expect(isFollowUpDue(next, TODAY)).toBe(false);
  });

  it('« Relancée » garde une relance encore à venir', () => {
    const sent = app({ status: 'envoyee', date: '2026-10-15', followUpDate: '2026-10-22' });
    expect(withStatus(sent, 'relancee', TODAY).followUpDate).toBe('2026-10-22');
  });

  it('les autres statuts ne touchent pas aux dates', () => {
    const sent = app({ status: 'envoyee', date: '2026-10-01', followUpDate: '2026-10-08' });
    const next = withStatus(sent, 'entretien', TODAY);
    expect(next.date).toBe('2026-10-01');
    expect(next.followUpDate).toBe('2026-10-08');
  });
});

describe('markFollowedUp', () => {
  it('programme la relance suivante à J+7, même après une première relance', () => {
    const relanced = app({ status: 'relancee', date: '2026-09-20', followUpDate: '2026-10-04' });
    expect(isFollowUpDue(relanced, TODAY)).toBe(true);
    const next = markFollowedUp(relanced, TODAY);
    expect(next.status).toBe('relancee');
    expect(next.followUpDate).toBe('2026-10-25');
    expect(isFollowUpDue(next, TODAY)).toBe(false);
  });
});

describe('withSendDate', () => {
  it('décale une relance calculée automatiquement', () => {
    const sent = app({ status: 'envoyee', date: '2026-10-10', followUpDate: '2026-10-17' });
    expect(withSendDate(sent, '2026-10-12').followUpDate).toBe('2026-10-19');
  });

  it('garde une relance choisie à la main', () => {
    const sent = app({ status: 'envoyee', date: '2026-10-10', followUpDate: '2026-10-30' });
    expect(withSendDate(sent, '2026-10-12').followUpDate).toBe('2026-10-30');
  });
});

describe('isFollowUpDue : retard de relance', () => {
  it('signale une relance due aujourd’hui ou passée', () => {
    expect(isFollowUpDue(app({ status: 'envoyee', followUpDate: TODAY }), TODAY)).toBe(true);
    expect(isFollowUpDue(app({ status: 'relancee', followUpDate: '2026-10-01' }), TODAY)).toBe(true);
  });

  it('ignore une relance à venir ou sans date', () => {
    expect(isFollowUpDue(app({ status: 'envoyee', followUpDate: '2026-10-19' }), TODAY)).toBe(false);
    expect(isFollowUpDue(app({ status: 'envoyee', followUpDate: '' }), TODAY)).toBe(false);
  });

  it('ignore les candidatures qui ont reçu une réponse', () => {
    for (const status of ['a_envoyer', 'entretien', 'offre', 'refusee', 'abandon']) {
      expect(isFollowUpDue(app({ status, followUpDate: '2026-10-01' }), TODAY)).toBe(false);
    }
  });
});

describe('compteurs, filtre et tri', () => {
  const list = [
    app({ id: 'a', status: 'a_envoyer', createdAt: '2026-10-17T09:00:00.000Z' }),
    app({ id: 'b', status: 'envoyee', date: '2026-10-02', followUpDate: '2026-10-09' }),
    app({ id: 'c', status: 'relancee', date: '2026-10-10', followUpDate: '2026-10-24' }),
    app({ id: 'd', status: 'entretien', date: '2026-09-20' }),
    app({ id: 'e', status: 'offre', date: '2026-09-01' }),
    app({ id: 'f', status: 'refusee', date: '2026-09-15' }),
  ];

  it('compte envoyées, entretiens et relances à faire', () => {
    expect(trackerCounts(list, TODAY)).toEqual({ total: 6, toSend: 1, sent: 5, interviews: 2, followUps: 1 });
  });

  it('filtre par statut ou par relance à faire', () => {
    expect(filterApplications(list, 'all', TODAY)).toHaveLength(6);
    expect(filterApplications(list, 'envoyee', TODAY).map((a) => a.id)).toEqual(['b']);
    expect(filterApplications(list, FILTER_FOLLOW_UP, TODAY).map((a) => a.id)).toEqual(['b']);
  });

  it('trie par date d’envoi, les candidatures non envoyées à leur date de création', () => {
    expect(sortApplications(list, 'recent').map((a) => a.id)).toEqual(['a', 'c', 'b', 'd', 'f', 'e']);
    expect(sortApplications(list, 'oldest').map((a) => a.id)).toEqual(['e', 'f', 'd', 'b', 'c', 'a']);
  });

  it('trie par prochaine relance', () => {
    expect(sortApplications(list, 'followup').map((a) => a.id)).toEqual(['b', 'c', 'a', 'd', 'f', 'e']);
  });

  it('ne modifie pas le tableau reçu', () => {
    const ids = list.map((a) => a.id);
    sortApplications(list, 'oldest');
    expect(list.map((a) => a.id)).toEqual(ids);
  });
});

describe('applicationsToCsv', () => {
  it('produit un CSV pour Excel avec libellés, dates françaises et version de CV', () => {
    const cvs = [{ id: 'cv_1', name: 'CV – Chargée de com – Decathlon' }];
    const csv = applicationsToCsv(
      [
        app({
          company: 'Decathlon',
          position: 'Chargée de communication',
          status: 'envoyee',
          date: '2026-10-02',
          followUpDate: '2026-10-09',
          cvId: 'cv_1',
          offerUrl: 'emploi.exemple.fr/offre/42',
          notes: 'Contact : Mme Dubois\n"très bon feeling"',
        }),
      ],
      cvs,
      TODAY,
    );
    const lines = csv.replace(/^﻿/, '').split('\r\n');
    expect(csv.startsWith('﻿')).toBe(true);
    expect(lines[0]).toBe(
      "Entreprise;Poste;Statut;Date d'envoi;Date de relance;Relance à faire;Version de CV;Lien de l'offre;Notes",
    );
    expect(lines[1]).toBe(
      'Decathlon;Chargée de communication;Envoyée;02/10/2026;09/10/2026;Oui;CV – Chargée de com – Decathlon;' +
        'https://emploi.exemple.fr/offre/42;"Contact : Mme Dubois\n""très bon feeling"""',
    );
  });
});

describe('frozenRows', () => {
  const a = app({ id: 'a', company: 'A' });
  const b = app({ id: 'b', company: 'B' });
  const c = app({ id: 'c', company: 'C' });

  it('sans saisie en cours, suit le tri', () => {
    expect(frozenRows([b, a], [a, b], null)).toEqual([b, a]);
  });

  it('garde l’ordre figé et les données à jour', () => {
    const edited = { ...a, company: 'A modifiée' };
    expect(frozenRows([b, edited], [edited, b], ['a', 'b']).map((x) => x.company)).toEqual(['A modifiée', 'B']);
  });

  it('affiche en tête une candidature ajoutée pendant la saisie et retire une supprimée', () => {
    expect(frozenRows([c, a], [c, a], ['a', 'b']).map((x) => x.id)).toEqual(['c', 'a']);
  });
});

describe('cvOptionLabel', () => {
  it('« CV – Poste – Entreprise » : l’entreprise d’abord, pour distinguer les versions même tronquées', () => {
    const cv = (name, company = 'Decathlon', jobTitle = 'Chargée de communication') => ({ name, company, jobTitle });
    expect(cvOptionLabel(cv('CV – Chargée de communication – Decathlon'))).toBe('Decathlon · Chargée de communication');
    expect(cvOptionLabel(cv('CV – Chargée de communication – Airbus', 'Airbus'))).toBe('Airbus · Chargée de communication');
    expect(cvOptionLabel(cv('CV – Chargée de communication – Decathlon (2)'))).toBe(
      'Decathlon · Chargée de communication (2)',
    );
    // Entreprise seule, ou entreprise changée depuis : le préfixe « CV – » disparaît seulement.
    expect(cvOptionLabel(cv('CV – Decathlon'))).toBe('Decathlon');
    expect(cvOptionLabel(cv('CV – Vendeuse – Fnac', 'Darty'))).toBe('Vendeuse – Fnac');
  });

  it('un nom choisi librement reste tel quel', () => {
    for (const name of ['Mon CV', 'Exemple – Camille Martin', 'CV court pour les salons', 'Exemple – Camille Martin (EN)']) {
      expect(cvOptionLabel({ name, company: 'Decathlon', jobTitle: '' })).toBe(name);
    }
  });
});


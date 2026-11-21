// Coordonnées communes aux versions. Chaque version est une copie : une coordonnée corrigée ici ne
// change pas les autres. On le dit, et on propose de reporter la correction dans celles qui ont
// l'ancienne valeur.
import { getCurrentCv, replaceContact, versionsWithContact } from '../lib/libraryActions';

// Coordonnée corrigée dans une version : libellés du message qui propose de la reporter ailleurs.
const CONTACT_LABELS = {
  name: { old: 'l’ancien nom', updated: 'Nom mis à jour' },
  email: { old: 'l’ancienne adresse e-mail', updated: 'Adresse e-mail mise à jour' },
  phone: { old: 'l’ancien numéro de téléphone', updated: 'Numéro de téléphone mis à jour' },
  location: { old: 'l’ancienne ville', updated: 'Ville mise à jour' },
  photo: { old: 'l’ancienne photo', updated: 'Photo mise à jour' },
};

// Retourne onContactCommit({ field, before, after }), appelé par l'éditeur quand une coordonnée
// est validée.
export function useContactSync({ store, notify }) {
  const { transact } = store;
  return ({ field, before, after }) => {
    const labels = CONTACT_LABELS[field];
    const oldValue = String(before ?? '').trim();
    if (!labels || !oldValue || oldValue === String(after ?? '').trim()) return;
    const lib = store.getLibrary();
    const editedId = getCurrentCv(lib).id;
    const ids = versionsWithContact(lib, editedId, field, before);
    if (!ids.length) return;
    const n = ids.length;
    const shown = field === 'photo' ? '' : ` (${oldValue})`;
    notify(
      `${n > 1 ? `${n} autres versions de vos CV ont` : 'Une autre version de vos CV a'} encore ${labels.old}${shown} : chaque version est une copie indépendante.`,
      {
        duration: 12000,
        action: {
          label: 'Mettre à jour partout',
          onClick: () => {
            const previous = store.getLibrary();
            // Valeur actuelle de la version corrigée (la photo a pu être recadrée depuis le message).
            const edited = previous.cvs.find((c) => c.id === editedId);
            const value = edited ? edited.data.personalInfo[field] : after;
            const next = replaceContact(previous, ids, field, before, value);
            if (next === previous) {
              notify('Rien à mettre à jour : cette coordonnée ou les autres versions ont changé entre-temps.');
              return;
            }
            const previousById = new Map(previous.cvs.map((c) => [c.id, c]));
            const changed = next.cvs.filter((c) => previousById.get(c.id) !== c).map((c) => c.id);
            transact(() => next);
            notify(`${labels.updated} dans ${changed.length > 1 ? `${changed.length} autres versions` : '1 autre version'}.`, {
              tone: 'success',
              action: {
                label: 'Annuler',
                onClick: () => transact((l) => replaceContact(l, changed, field, value, before)),
              },
            });
          },
        },
      },
    );
  };
}

// Versions de CV (menu « Mes CV ») : créer, dupliquer pour une candidature, renommer, supprimer.
import {
  addApplicationForCv,
  addCv,
  canTrackApplication,
  derivedCvs,
  duplicateForApplication,
  linkedApplications,
  newBlankCv,
  newCvFromData,
  removeCv,
  selectCv,
} from '../lib/libraryActions';
import { EXAMPLE_NAME, exampleResume } from './example';

export function useVersionActions({ store, notify, setDialog, openCvView }) {
  const { library, cv, transact } = store;

  const deleteCurrentVersion = () => {
    const deleted = cv;
    const relinkIds = new Set(linkedApplications(library, deleted.id).map((a) => a.id));
    // Les versions dérivées sont rattachées à la source de celle supprimée (removeCv) ;
    // « Annuler » leur rend leur lien d'origine.
    const childIds = new Set(derivedCvs(library, deleted.id).map((c) => c.id));
    transact((lib) => removeCv(lib, deleted.id));
    notify(`« ${deleted.name} » a été supprimé.`, {
      action: {
        label: 'Annuler',
        onClick: () =>
          transact((lib) => {
            const restored = addCv(lib, deleted);
            return {
              ...restored,
              cvs: restored.cvs.map((c) => (childIds.has(c.id) ? { ...c, sourceId: deleted.id } : c)),
              applications: lib.applications.map((a) => (relinkIds.has(a.id) ? { ...a, cvId: deleted.id } : a)),
            };
          }),
      },
    });
  };

  // Actions du menu « Mes CV » (VersionMenu).
  const versions = {
    onSelect: (id) => transact((lib) => selectCv(lib, id)),
    onNewBlank: () => {
      let created;
      transact((lib) => {
        created = newBlankCv(lib);
        return addCv(lib, created);
      });
      openCvView();
      notify(`« ${created.name} » créé. Vos autres versions restent dans la liste « Mes CV ».`, { tone: 'success' });
    },
    onNewExample: () => {
      let created;
      transact((lib) => {
        created = newCvFromData(lib, exampleResume, { name: EXAMPLE_NAME });
        return addCv(lib, created);
      });
      openCvView();
      notify(`« ${created.name} » créé à partir de l’exemple.`, { tone: 'success' });
    },
    onDuplicate: () => setDialog({ type: 'version', mode: 'duplicate' }),
    onRename: () => setDialog({ type: 'version', mode: 'rename' }),
    onDelete: () => {
      const linked = linkedApplications(library, cv.id).length;
      setDialog({
        type: 'confirm',
        title: 'Supprimer cette version ?',
        message: (
          <p>
            « {cv.name} » sera effacé de ce navigateur.
            {linked > 0 &&
              ` ${linked} candidature${linked > 1 ? 's' : ''} du suivi ${linked > 1 ? 'restent' : 'reste'} enregistrée${linked > 1 ? 's' : ''}, mais sans lien vers ce CV.`}
          </p>
        ),
        confirmLabel: 'Supprimer',
        danger: true,
        onConfirm: () => deleteCurrentVersion(),
      });
    },
  };

  // Fenêtre « Dupliquer pour une candidature » ou « Renommer ».
  const submitVersionDialog = (mode, fields) => {
    setDialog(null);
    if (mode === 'rename') {
      store.updateCv(fields, { checkpoint: true });
      return;
    }
    const { addToTracker, ...versionFields } = fields;
    const tracked = Boolean(addToTracker) && canTrackApplication(versionFields);
    let created;
    transact((lib) => {
      const result = duplicateForApplication(lib, cv.id, versionFields);
      created = result.cv;
      return tracked && created ? addApplicationForCv(result.library, created) : result.library;
    });
    openCvView();
    notify(
      `Version « ${created.name} » créée${tracked ? ' et ajoutée au suivi des candidatures' : ''} : adaptez-la librement, l’original n’a pas changé.`,
      { tone: 'success' },
    );
  };

  return { versions, submitVersionDialog };
}

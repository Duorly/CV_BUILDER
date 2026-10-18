import { useMemo, useState } from 'react';
import { Info, TriangleAlert } from 'lucide-react';
import Modal from './Modal';
import { compareImport, describeLibrary } from '../../lib/libraryActions';

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

// « 3 versions de CV et 2 candidatures »
function describeKnown({ cvs, applications }) {
  return [
    cvs.known && plural(cvs.known, 'version de CV', 'versions de CV'),
    applications.known && plural(applications.known, 'candidature', 'candidatures'),
  ]
    .filter(Boolean)
    .join(' et ');
}

function describeNewer(known, newer) {
  if (newer > 1) return `${newer} d’entre elles sont plus récentes dans le fichier : elles remplaceront les vôtres.`;
  if (known === 1) return 'Celle du fichier est plus récente : elle remplacera la vôtre.';
  return 'L’une d’elles est plus récente dans le fichier : elle remplacera la vôtre.';
}

// Import d'une sauvegarde complète : ajouter à la bibliothèque, ou tout remplacer (après confirmation).
// Une sauvegarde déjà importée (ou faite dans ce navigateur) n'est pas ajoutée en double.
export default function ImportDialog({ fileName, imported, current, onMerge, onReplace, onExportCurrent, onClose }) {
  const [confirmReplace, setConfirmReplace] = useState(false);
  const stats = useMemo(() => compareImport(current, imported), [current, imported]);
  const known = stats.cvs.known + stats.applications.known;
  const newer = stats.cvs.newer + stats.applications.newer;
  const nothingNew = known > 0 && !stats.cvs.added && !stats.applications.added && !newer;

  // Une clé par étape : la fenêtre est remontée et le focus passe sur ses boutons.
  if (confirmReplace) {
    return (
      <Modal
        key="confirm"
        title="Tout remplacer ?"
        onClose={onClose}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setConfirmReplace(false)} data-autofocus>
              Retour
            </button>
            <button type="button" className="btn btn-danger" onClick={onReplace}>
              Remplacer définitivement
            </button>
          </>
        }
      >
        <div className="callout callout-danger">
          <TriangleAlert size={18} aria-hidden="true" />
          <p>
            Le contenu actuel de ce navigateur ({describeLibrary(current)}) sera effacé et remplacé par celui du
            fichier. Cette action ne peut pas être annulée.
          </p>
        </div>
        <button type="button" className="btn btn-sm" onClick={onExportCurrent}>
          Exporter d’abord ma bibliothèque actuelle
        </button>
      </Modal>
    );
  }

  return (
    <Modal
      key="choice"
      title="Importer une sauvegarde"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="btn btn-danger" onClick={() => setConfirmReplace(true)}>
            Tout remplacer…
          </button>
          <button type="button" className="btn btn-primary" onClick={onMerge} data-autofocus>
            {known ? 'Mettre à jour ma bibliothèque' : 'Ajouter à ma bibliothèque'}
          </button>
        </>
      }
    >
      <p>
        Le fichier <strong>{fileName}</strong> contient {describeLibrary(imported)}.
      </p>
      {known > 0 && (
        <div className="callout" role="note">
          <Info size={16} aria-hidden="true" />
          <p>
            {nothingNew ? (
              <>
                <strong>Votre bibliothèque contient déjà tout ce fichier</strong> : rien ne sera ajouté ni modifié.
              </>
            ) : (
              <>
                <strong>
                  {describeKnown(stats)} de ce fichier {known > 1 ? 'sont' : 'est'} déjà dans ce navigateur
                </strong>{' '}
                (une sauvegarde déjà importée, ou faite ici) :{' '}
                {known > 1 ? 'elles ne seront pas ajoutées en double.' : 'elle ne sera pas ajoutée en double.'}
                {newer > 0 && ` ${describeNewer(known, newer)}`}
              </>
            )}
          </p>
        </div>
      )}
      <ul className="plain-list">
        <li>
          {known ? (
            <>
              <strong>Mettre à jour ma bibliothèque</strong> : vos CV actuels sont conservés ; ce qui manque s’ajoute,
              et pour un élément présent des deux côtés, la version la plus récente est gardée.
            </>
          ) : (
            <>
              <strong>Ajouter à ma bibliothèque</strong> : vos CV actuels sont conservés, ceux du fichier s’ajoutent à
              la liste.
            </>
          )}
        </li>
        <li>
          <strong>Tout remplacer</strong> : la bibliothèque devient exactement celle du fichier (utile pour reprendre
          une sauvegarde sur un nouvel ordinateur).
        </li>
      </ul>
    </Modal>
  );
}

import { useId, useState } from 'react';
import Modal from './Modal';
import { canTrackApplication, suggestVersionName } from '../../lib/libraryActions';

const hasLetter = (cv) => Object.values(cv.coverLetter || {}).some((v) => String(v || '').trim());

// mode 'duplicate' : nouvelle version pour une candidature (nom proposé « CV – Poste – Entreprise »).
// mode 'rename'    : nom, entreprise et poste de la version courante.
// onSubmit({ name, company, jobTitle, copyLetter?, addToTracker? })
export default function VersionDialog({ mode, cv, onSubmit, onClose }) {
  const duplicate = mode === 'duplicate';
  const [company, setCompany] = useState(duplicate ? '' : cv.company);
  const [jobTitle, setJobTitle] = useState(duplicate ? '' : cv.jobTitle);
  const [name, setName] = useState(duplicate ? `${cv.name} (copie)` : cv.name);
  // Tant que le nom n'a pas été modifié à la main, il suit le poste et l'entreprise.
  const [nameTouched, setNameTouched] = useState(!duplicate);
  // La lettre de la version d'origine vise une autre candidature (destinataire,
  // objet…) : on ne la reprend que sur demande.
  const offerLetterCopy = duplicate && hasLetter(cv);
  const [copyLetter, setCopyLetter] = useState(false);
  // Comme avec l'IA : une version créée pour une candidature apparaît dans le suivi.
  const [addToTracker, setAddToTracker] = useState(true);
  const ids = { company: useId(), job: useId(), name: useId(), letter: useId(), tracker: useId() };

  const syncName = (next) => {
    if (nameTouched) return;
    setName(suggestVersionName(next) || `${cv.name} (copie)`);
  };

  // Comme le formulaire du suivi : pas de candidature sans entreprise ni poste.
  const trackable = canTrackApplication({ company, jobTitle });

  const submit = (e) => {
    e.preventDefault();
    const fields = { name: name.trim(), company: company.trim(), jobTitle: jobTitle.trim() };
    if (!duplicate) {
      onSubmit(fields);
      return;
    }
    onSubmit({ ...fields, copyLetter: offerLetterCopy && copyLetter, addToTracker: addToTracker && trackable });
  };

  return (
    <Modal
      title={duplicate ? 'Nouvelle version pour une candidature' : 'Renommer la version'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" form="version-dialog-form" className="btn btn-primary">
            {duplicate ? 'Créer la version' : 'Enregistrer'}
          </button>
        </>
      }
    >
      <form id="version-dialog-form" onSubmit={submit} className="stack">
        {duplicate && (
          <p className="muted">
            Une copie de « {cv.name} » est créée : vous pouvez l’adapter à l’offre sans modifier l’original.
          </p>
        )}
        <div className="field">
          <label className="field-label" htmlFor={ids.company}>
            Entreprise
          </label>
          <input
            id={ids.company}
            className="input"
            value={company}
            data-autofocus={duplicate || undefined}
            placeholder="Ex. Decathlon"
            onChange={(e) => {
              setCompany(e.target.value);
              syncName({ company: e.target.value, jobTitle });
            }}
          />
          <span className="field-hint">Sert aussi au nom des fichiers : CV_Prénom_Nom_Entreprise.pdf</span>
        </div>
        <div className="field">
          <label className="field-label" htmlFor={ids.job}>
            Poste visé
          </label>
          <input
            id={ids.job}
            className="input"
            value={jobTitle}
            placeholder="Ex. Chargée de communication"
            onChange={(e) => {
              setJobTitle(e.target.value);
              syncName({ company, jobTitle: e.target.value });
            }}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor={ids.name}>
            Nom de la version
          </label>
          <input
            id={ids.name}
            className="input"
            value={name}
            required
            data-autofocus={duplicate ? undefined : true}
            onChange={(e) => {
              setName(e.target.value);
              setNameTouched(true);
            }}
          />
          <span className="field-hint">Visible seulement par vous, dans la liste « Mes CV ».</span>
        </div>
        {duplicate && (
          <div className="check-field">
            <input
              id={ids.tracker}
              type="checkbox"
              checked={addToTracker && trackable}
              disabled={!trackable}
              aria-describedby={`${ids.tracker}-hint`}
              onChange={(e) => setAddToTracker(e.target.checked)}
            />
            <span className="check-field-text">
              <label htmlFor={ids.tracker}>Ajouter au suivi des candidatures</label>
              <span id={`${ids.tracker}-hint`} className="field-hint">
                {trackable
                  ? 'La candidature est créée « À envoyer », liée à cette version : vous la retrouverez dans l’onglet Candidatures.'
                  : 'Indiquez l’entreprise ou le poste visé pour l’ajouter au suivi des candidatures.'}
              </span>
            </span>
          </div>
        )}
        {offerLetterCopy && (
          <div className="check-field">
            <input
              id={ids.letter}
              type="checkbox"
              checked={copyLetter}
              aria-describedby={`${ids.letter}-hint`}
              onChange={(e) => setCopyLetter(e.target.checked)}
            />
            <span className="check-field-text">
              <label htmlFor={ids.letter}>Reprendre la lettre de motivation de « {cv.name} »</label>
              <span id={`${ids.letter}-hint`} className="field-hint">
                Sinon, la nouvelle version commence avec une lettre vide. Si vous la reprenez, vérifiez le destinataire,
                l’objet et le nom de l’entreprise.
              </span>
            </span>
          </div>
        )}
      </form>
    </Modal>
  );
}

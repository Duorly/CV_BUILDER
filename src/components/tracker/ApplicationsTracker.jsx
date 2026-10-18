import { useId, useRef, useState } from 'react';
import {
  BellRing,
  Check,
  ClipboardList,
  Download,
  ExternalLink,
  FolderOpen,
  Plus,
  Trash2,
} from 'lucide-react';
import { APPLICATION_STATUSES, normalizeApplication } from '../../lib/storage';
import { absoluteUrl, downloadText, todayIso } from '../../lib/files';
import { CSV_MIME } from '../../lib/csv';
import { joinNonEmpty } from '../../lib/schema';
import AutoGrowTextarea from '../letter/AutoGrowTextarea';
import ConfirmModal from '../letter/ConfirmModal';
import {
  applicationsToCsv,
  AWAITING_STATUSES,
  cvOptionLabel,
  daysBetween,
  FILTER_FOLLOW_UP,
  FOLLOW_UP_DAYS,
  filterApplications,
  frozenRows,
  isFollowUpDue,
  isIsoDate,
  markFollowedUp,
  SORT_OPTIONS,
  sortApplications,
  trackerCounts,
  withSendDate,
  withStatus,
} from './trackerUtils';
import '../../styles/tracker.css';

const appLabel = (app) => joinNonEmpty([app.company, app.position], ' – ') || 'candidature sans titre';
const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;
// Un champ date n'accepte que AAAA-MM-JJ (une date importée « 18/10/2026 » ferait un avertissement).
const dateValue = (value) => (isIsoDate(value) ? value : '');

// Champ d'une ligne qui passe à la ligne au lieu de couper un intitulé long.
function WrappingInput({ value, onChange, ...props }) {
  return (
    <AutoGrowTextarea
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\s*\n+\s*/g, ' '))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.preventDefault();
      }}
      {...props}
    />
  );
}

function StatusSelect({ value, onChange, className = '', ...props }) {
  return (
    <select
      className={`tracker-status tracker-status--${value} ${className}`.trim()}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    >
      {APPLICATION_STATUSES.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

function CvOptions({ cvs, selectedId }) {
  const missing = selectedId && !cvs.some((cv) => cv.id === selectedId);
  return (
    <>
      <option value="">Aucune</option>
      {missing && (
        <option value={selectedId} disabled>
          Version supprimée
        </option>
      )}
      {cvs.map((cv) => (
        <option key={cv.id} value={cv.id}>
          {cvOptionLabel(cv)}
        </option>
      ))}
    </>
  );
}

function Stats({ counts, filter, onFilter }) {
  const tiles = [
    { id: 'sent', label: 'Envoyées', value: counts.sent },
    { id: 'interviews', label: 'Entretiens obtenus', value: counts.interviews },
    { id: 'followUps', label: 'Relances à faire', value: counts.followUps, filter: FILTER_FOLLOW_UP },
    { id: 'toSend', label: 'À envoyer', value: counts.toSend, filter: 'a_envoyer' },
  ];
  return (
    <ul className="tracker-stats" aria-label="Résumé">
      {tiles.map((tile) => {
        const content = (
          <>
            <span className="tracker-stat-value">{tile.value}</span>
            <span className="tracker-stat-label">{tile.label}</span>
          </>
        );
        const warn = tile.id === 'followUps' && tile.value > 0;
        return (
          <li key={tile.id} className={`tracker-stat ${warn ? 'tracker-stat--warn' : ''}`.trim()}>
            {tile.filter && tile.value > 0 ? (
              <button
                type="button"
                className="tracker-stat-button"
                aria-pressed={filter === tile.filter}
                onClick={() => onFilter(filter === tile.filter ? 'all' : tile.filter)}
                title={filter === tile.filter ? 'Tout afficher' : `Afficher seulement : ${tile.label.toLowerCase()}`}
              >
                {content}
              </button>
            ) : (
              <div className="tracker-stat-button">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// defaultCv : version affichée ; si elle vise déjà une entreprise, le formulaire part d'elle.
function ApplicationForm({ cvs, defaultCv, onSubmit, onCancel }) {
  const uid = useId();
  const id = (name) => `${uid}-${name}`;
  const [fields, setFields] = useState(() => {
    const preset = defaultCv?.company?.trim() ? defaultCv : null;
    return {
      company: preset?.company || '',
      position: preset?.jobTitle || '',
      offerUrl: preset?.offerUrl || '',
      cvId: preset?.id || '',
      status: 'a_envoyer',
      date: '',
      notes: '',
    };
  });
  const [error, setError] = useState('');
  const set = (key) => (e) => setFields((f) => ({ ...f, [key]: e.target.value }));

  // Choisir une version de CV adaptée reprend son entreprise, son poste et son offre.
  const pickCv = (e) => {
    const cvId = e.target.value;
    const cv = cvs.find((c) => c.id === cvId);
    setFields((f) => ({
      ...f,
      cvId,
      company: f.company || cv?.company || '',
      position: f.position || cv?.jobTitle || '',
      offerUrl: f.offerUrl || cv?.offerUrl || '',
    }));
  };

  const submit = (e) => {
    e.preventDefault();
    const company = fields.company.trim();
    const position = fields.position.trim();
    if (!company && !position) {
      setError('Indiquez au moins l’entreprise ou le poste.');
      return;
    }
    onSubmit({ ...fields, company, position, offerUrl: fields.offerUrl.trim() });
  };

  return (
    <form
      className="tracker-form"
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
      }}
      aria-labelledby={id('title')}
      noValidate
    >
      <h3 className="tracker-form-title" id={id('title')}>
        Nouvelle candidature
      </h3>
      <div className="tracker-form-grid">
        <div className="field">
          <label className="field-label" htmlFor={id('company')}>
            Entreprise
          </label>
          <input
            id={id('company')}
            className="input"
            value={fields.company}
            onChange={set('company')}
            placeholder="ex. Decathlon"
            autoFocus
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor={id('position')}>
            Poste
          </label>
          <input
            id={id('position')}
            className="input"
            value={fields.position}
            onChange={set('position')}
            placeholder="ex. Chargée de communication"
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor={id('cv')}>
            Version de CV utilisée
          </label>
          <select id={id('cv')} className="select" value={fields.cvId} onChange={pickCv}>
            <CvOptions cvs={cvs} selectedId={fields.cvId} />
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor={id('offerUrl')}>
            Lien de l’offre
          </label>
          <input
            id={id('offerUrl')}
            className="input"
            type="url"
            inputMode="url"
            value={fields.offerUrl}
            onChange={set('offerUrl')}
            placeholder="ex. https://www.exemple.fr/offre/12345"
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor={id('status')}>
            Statut
          </label>
          <StatusSelect
            id={id('status')}
            className="select"
            value={fields.status}
            onChange={(status) => setFields((f) => ({ ...f, status }))}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor={id('date')}>
            Date d’envoi
          </label>
          <input id={id('date')} className="input" type="date" value={fields.date} onChange={set('date')} />
          <p className="field-hint">
            Statut «&nbsp;Envoyée&nbsp;» : relance proposée {FOLLOW_UP_DAYS} jours après l’envoi.
          </p>
        </div>
        <div className="field tracker-form-wide">
          <label className="field-label" htmlFor={id('notes')}>
            Notes
          </label>
          <AutoGrowTextarea
            id={id('notes')}
            className="textarea"
            rows={2}
            value={fields.notes}
            onChange={set('notes')}
            placeholder="ex. Contact : Mme Dubois (RH), envoyé via le site carrières"
          />
        </div>
      </div>
      {error && (
        <p className="tracker-form-error" role="alert">
          {error}
        </p>
      )}
      <div className="tracker-form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="btn btn-primary">
          <Plus size={15} aria-hidden="true" /> Ajouter
        </button>
      </div>
    </form>
  );
}

function FollowUpCell({ app, today, onUpdate }) {
  const dateRef = useRef(null);
  const due = isFollowUpDue(app, today);
  const awaiting = AWAITING_STATUSES.includes(app.status) && isIsoDate(app.followUpDate);
  const inDays = awaiting && !due ? daysBetween(today, app.followUpDate) : null;
  return (
    <div className="tracker-followup">
      <input
        ref={dateRef}
        type="date"
        className="tracker-input"
        value={dateValue(app.followUpDate)}
        onChange={(e) => onUpdate((a) => ({ ...a, followUpDate: e.target.value }))}
        aria-label={`Date de relance : ${appLabel(app)}`}
      />
      {due && (
        <div className="tracker-due-row">
          <span className="badge badge-warn tracker-due">
            <BellRing size={12} aria-hidden="true" /> Relance à faire
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm tracker-done"
            onClick={() => {
              onUpdate((a) => markFollowedUp(a, today));
              // Le bouton disparaît : le focus passe sur la nouvelle date de relance
              // au lieu de retomber en haut de la page.
              dateRef.current?.focus();
            }}
            title={`Marquer comme relancée et programmer la prochaine relance dans ${FOLLOW_UP_DAYS} jours`}
          >
            <Check size={13} aria-hidden="true" /> C’est fait
          </button>
        </div>
      )}
      {inDays != null && (
        <span className="tracker-hint">{inDays === 1 ? 'demain' : `dans ${inDays} jours`}</span>
      )}
    </div>
  );
}

function ApplicationRow({ app, cvs, today, onUpdate, onDelete, onOpenCv }) {
  const due = isFollowUpDue(app, today);
  const cv = cvs.find((c) => c.id === app.cvId);
  const label = appLabel(app);
  const set = (key) => (e) => onUpdate((a) => ({ ...a, [key]: e.target.value }));

  return (
    <tr className={`tracker-row ${due ? 'tracker-row--due' : ''}`.trim()}>
      <td className="tracker-cell-main" data-label="Entreprise, poste et offre">
        <div className="tracker-main-stack">
          <WrappingInput
            className="tracker-input tracker-input-company"
            value={app.company}
            onChange={(value) => onUpdate((a) => ({ ...a, company: value }))}
            placeholder="Entreprise"
            aria-label="Entreprise"
          />
          <WrappingInput
            className="tracker-input tracker-input-position"
            value={app.position}
            onChange={(value) => onUpdate((a) => ({ ...a, position: value }))}
            placeholder="Poste"
            aria-label={`Poste : ${label}`}
          />
          <div className="tracker-offer">
            <input
              className="tracker-input tracker-input-offer"
              type="url"
              inputMode="url"
              value={app.offerUrl}
              onChange={set('offerUrl')}
              placeholder="Lien de l’offre"
              aria-label={`Lien de l’offre : ${label}`}
            />
            {String(app.offerUrl || '').trim() && (
              <a
                className="icon-btn tracker-offer-link"
                href={absoluteUrl(app.offerUrl)}
                target="_blank"
                rel="noopener noreferrer"
                title="Voir l’offre dans un nouvel onglet"
                aria-label={`Voir l’offre : ${label} (nouvel onglet)`}
              >
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </td>
      <td data-label="Statut">
        <StatusSelect
          value={app.status}
          onChange={(status) => onUpdate((a) => withStatus(a, status, today))}
          aria-label={`Statut : ${label}`}
        />
      </td>
      <td data-label="Envoyée le">
        <input
          type="date"
          className="tracker-input"
          value={dateValue(app.date)}
          onChange={(e) => onUpdate((a) => withSendDate(a, e.target.value))}
          aria-label={`Date d’envoi : ${label}`}
        />
      </td>
      <td data-label="Relance">
        <FollowUpCell app={app} today={today} onUpdate={onUpdate} />
      </td>
      <td data-label="Version de CV">
        <div className="tracker-cv">
          <select
            className="tracker-input tracker-select"
            value={app.cvId || ''}
            onChange={(e) => onUpdate((a) => ({ ...a, cvId: e.target.value || null }))}
            aria-label={`Version de CV utilisée : ${label}`}
            title={cv?.name}
          >
            <CvOptions cvs={cvs} selectedId={app.cvId} />
          </select>
          <button
            type="button"
            className="btn btn-sm tracker-open-cv"
            disabled={!cv}
            onClick={() => cv && onOpenCv?.(cv.id)}
            title={cv ? `Ouvrir «\u00a0${cv.name}\u00a0»` : 'Choisissez d’abord une version de CV'}
          >
            <FolderOpen size={13} aria-hidden="true" /> Ouvrir
          </button>
        </div>
      </td>
      <td data-label="Notes">
        <AutoGrowTextarea
          className="tracker-input tracker-notes"
          rows={1}
          value={app.notes}
          onChange={set('notes')}
          placeholder="Notes"
          aria-label={`Notes : ${label}`}
        />
      </td>
      <td className="tracker-cell-actions">
        <button
          type="button"
          className="icon-btn tracker-delete"
          onClick={() => onDelete(app)}
          aria-label={`Supprimer la candidature ${label}`}
          title="Supprimer"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="empty-state tracker-empty">
      <ClipboardList size={36} className="tracker-empty-icon" aria-hidden="true" />
      <h3>Aucune candidature pour l’instant</h3>
      <p>
        Notez ici chaque offre à laquelle vous postulez : entreprise, poste, version du CV envoyée, date d’envoi et
        statut. Tout reste enregistré dans ce navigateur.
      </p>
      <ul>
        <li>
          Passez le statut à «&nbsp;Envoyée&nbsp;» : une date de relance est proposée {FOLLOW_UP_DAYS} jours plus
          tard.
        </li>
        <li>L’alerte «&nbsp;Relance à faire&nbsp;» vous signale les entreprises à relancer.</li>
        <li>Exportez le tableau en CSV pour l’ouvrir dans Excel ou LibreOffice.</li>
      </ul>
      <button type="button" className="btn btn-primary" onClick={onAdd}>
        <Plus size={15} aria-hidden="true" /> Ajouter ma première candidature
      </button>
    </div>
  );
}

export default function ApplicationsTracker({ applications = [], cvs = [], currentCvId = null, onChange, onOpenCv }) {
  const uid = useId();
  const today = todayIso();
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  // Pendant la saisie dans le tableau, l'ordre des lignes est figé : changer une date
  // ou un statut ne doit pas déplacer (ni masquer) la ligne sous le curseur.
  const [frozenIds, setFrozenIds] = useState(null);
  const titleRef = useRef(null);

  const counts = trackerCounts(applications, today);
  const sorted = sortApplications(filterApplications(applications, filter, today), sort);
  const rows = frozenRows(sorted, applications, frozenIds);

  const changeFilter = (value) => {
    setFrozenIds(null);
    setFilter(value);
  };

  const changeSort = (value) => {
    setFrozenIds(null);
    setSort(value);
  };

  const updateApp = (id, transform) => {
    const now = new Date().toISOString();
    onChange(applications.map((a) => (a.id === id ? { ...transform(a), updatedAt: now } : a)));
  };

  const addApp = (fields) => {
    const draft = normalizeApplication({ ...fields, status: 'a_envoyer' });
    onChange([withStatus(draft, fields.status, today), ...applications]);
    setAdding(false);
    changeFilter('all');
  };

  const deleteApp = (app) => {
    onChange(applications.filter((a) => a.id !== app.id));
  };

  const exportCsv = () => {
    downloadText(
      applicationsToCsv(sortApplications(applications, sort), cvs, today),
      `Candidatures_${today}.csv`,
      CSV_MIME,
    );
  };

  const filterOptions = [
    { id: 'all', label: 'Toutes les candidatures' },
    { id: FILTER_FOLLOW_UP, label: 'Relances à faire' },
    ...APPLICATION_STATUSES,
  ];

  return (
    <section className="tracker no-print" aria-labelledby={`${uid}-title`}>
      <header className="tracker-header">
        <div>
          <h2 className="tracker-title" id={`${uid}-title`} ref={titleRef} tabIndex={-1}>
            <ClipboardList size={22} aria-hidden="true" /> Suivi des candidatures
          </h2>
          <p className="tracker-intro">
            {applications.length > 0
              ? `${plural(applications.length, 'candidature', 'candidatures')}. Modifiez directement dans le tableau : tout est enregistré automatiquement.`
              : 'Gardez la trace de vos envois et n’oubliez plus aucune relance.'}
          </p>
        </div>
        <div className="tracker-header-actions">
          <button type="button" className="btn" onClick={exportCsv} disabled={applications.length === 0}>
            <Download size={15} aria-hidden="true" /> Exporter (CSV)
          </button>
          {applications.length > 0 && (
            <button type="button" className="btn btn-primary" onClick={() => setAdding(true)} disabled={adding}>
              <Plus size={15} aria-hidden="true" /> Ajouter une candidature
            </button>
          )}
        </div>
      </header>

      {applications.length > 0 && <Stats counts={counts} filter={filter} onFilter={changeFilter} />}

      {adding && (
        <ApplicationForm
          cvs={cvs}
          defaultCv={cvs.find((c) => c.id === currentCvId)}
          onSubmit={addApp}
          onCancel={() => setAdding(false)}
        />
      )}

      {applications.length === 0 && !adding && <EmptyState onAdd={() => setAdding(true)} />}

      {applications.length > 0 && (
        <>
          <div className="tracker-toolbar">
            <label className="tracker-toolbar-field">
              <span>Afficher</span>
              <select className="select" value={filter} onChange={(e) => changeFilter(e.target.value)}>
                {filterOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="tracker-toolbar-field">
              <span>Trier par</span>
              <select className="select" value={sort} onChange={(e) => changeSort(e.target.value)}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {filter !== 'all' && (
              <span className="tracker-toolbar-count" role="status">
                {plural(sorted.length, 'résultat', 'résultats')}
              </span>
            )}
          </div>

          {rows.length === 0 ? (
            <p className="tracker-no-result">
              Aucune candidature ne correspond à ce filtre.{' '}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => changeFilter('all')}>
                Tout afficher
              </button>
            </p>
          ) : (
            <div className="tracker-table-wrap">
              <table className="tracker-table">
                <caption className="tracker-sr-only">Candidatures</caption>
                <colgroup>
                  <col className="tracker-col-main" />
                  <col className="tracker-col-status" />
                  <col className="tracker-col-date" />
                  <col className="tracker-col-followup" />
                  <col className="tracker-col-cv" />
                  <col className="tracker-col-notes" />
                  <col className="tracker-col-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Entreprise, poste et offre</th>
                    <th scope="col">Statut</th>
                    <th scope="col">Envoyée le</th>
                    <th scope="col">Relance</th>
                    <th scope="col">Version de CV</th>
                    <th scope="col">Notes</th>
                    <th scope="col">
                      <span className="tracker-sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody
                  onFocus={() => {
                    if (!frozenIds) setFrozenIds(rows.map((a) => a.id));
                  }}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) setFrozenIds(null);
                  }}
                >
                  {rows.map((app) => (
                    <ApplicationRow
                      key={app.id}
                      app={app}
                      cvs={cvs}
                      today={today}
                      onUpdate={(transform) => updateApp(app.id, transform)}
                      onDelete={setPendingDelete}
                      onOpenCv={onOpenCv}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {pendingDelete && (
        <ConfirmModal
          title={'Supprimer cette candidature\u00a0?'}
          confirmLabel="Supprimer"
          danger
          onConfirm={() => deleteApp(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
          fallbackFocusRef={titleRef}
        >
          <p>
            «&nbsp;{appLabel(pendingDelete)}&nbsp;» sera retirée du suivi. Cette action est définitive. La version de CV
            associée, elle, est conservée.
          </p>
        </ConfirmModal>
      )}
    </section>
  );
}

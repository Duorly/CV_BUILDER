import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  CalendarDays,
  ChevronDown,
  CircleAlert,
  Info,
  LoaderCircle,
  Mails,
  PenTool,
  Sparkles,
  Undo2,
  User,
  WandSparkles,
  X,
} from 'lucide-react';
import { normalizeCoverLetter } from '../../lib/schema';
import AiSettingsPanel from '../ai/AiSettingsPanel';
import AutoGrowTextarea from './AutoGrowTextarea';
import ConfirmModal from './ConfirmModal';
import { useLetterDraft } from './useLetterDraft';
import {
  buildPrefill,
  splitPastedLetter,
  cityFromLocation,
  countWords,
  defaultClosing,
  defaultSalutation,
  formatLongDate,
  LETTER_TEXT,
  letterLang,
  wordCountStatus,
  WORDS_MAX,
  WORDS_MIN,
} from './letterUtils';
import '../../styles/letter.css';

const TONES = [
  { id: 'formel', label: 'Formel' },
  { id: 'chaleureux', label: 'Chaleureux' },
  { id: 'dynamique', label: 'Dynamique' },
];

const LENGTHS = [
  { id: 'courte', label: 'Courte (e-mail, LinkedIn)' },
  { id: 'standard', label: 'Standard (une page)' },
];

const prefilledLabel = (n) => (n > 1 ? `${n} champs pré-remplis` : '1 champ pré-rempli');

function Field({ label, hint, children, htmlFor }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

function ChoiceGroup({ legend, name, options, value, onChange, disabled }) {
  return (
    <fieldset className="letter-choice" disabled={disabled}>
      <legend className="field-label">{legend}</legend>
      <div className="letter-segmented">
        {options.map((o) => (
          <label key={o.id}>
            <input
              type="radio"
              name={name}
              value={o.id}
              checked={value === o.id}
              onChange={() => onChange(o.id)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function WordCount({ body }) {
  const count = countWords(body);
  const status = wordCountStatus(count);
  const words = count > 1 ? `${count} mots` : `${count} mot`;
  const advice = {
    empty: `conseillé : ${WORDS_MIN} à ${WORDS_MAX} mots`,
    short: `un peu court (conseillé : ${WORDS_MIN} à ${WORDS_MAX})`,
    ok: 'longueur idéale',
    long: `un peu long : visez ${WORDS_MAX} mots maximum`,
  }[status];
  return (
    <p className={`letter-word-count letter-word-count--${status}`}>
      <strong>{words}</strong> · {advice}
    </p>
  );
}

// draft (facultatif) : brouillon IA tenu par le parent (useLetterDraft), pour qu'une demande
// en cours survive au passage à une autre vue ; sans lui, l'éditeur gère le sien.
export default function CoverLetterEditor({ cv, letter, onChange, onCvChange, draft: parentDraft, baseHint }) {
  const uid = useId();
  const id = (name) => `${uid}-${name}`;
  const l = useMemo(() => normalizeCoverLetter(letter), [letter]);
  const lang = letterLang(cv?.settings?.lang);
  const pi = cv?.data?.personalInfo || {};
  const jobTitle = cv?.jobTitle || '';
  const company = cv?.company || '';
  const jobOffer = cv?.jobOffer || '';

  // Lettre à jour au retour de l'IA : l'objet ou une formule a pu être saisi entre-temps.
  const letterRef = useRef(l);
  letterRef.current = l;
  const ownDraft = useLetterDraft({
    cvId: cv?.id,
    getLetter: () => letterRef.current,
    applyPatch: (patch) => onChange(patch, { checkpoint: true }),
  });
  const draft = parentDraft || ownDraft;
  const { busy, error: aiError, settingsHelp, done: draftDone, previousBody } = draft;

  const [prefillNotice, setPrefillNotice] = useState('');
  // Ouvert si la lettre est vide, ou si un brouillon demandé avant de quitter la vue est en cours ou prêt.
  const [aiOpen, setAiOpen] = useState(() => !l.body.trim() || busy || draftDone || Boolean(aiError));
  const [tone, setTone] = useState('formel');
  const [length, setLength] = useState('standard');
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [pasteNotice, setPasteNotice] = useState('');

  useEffect(() => {
    setConfirmOverwrite(false);
    setPasteNotice('');
  }, [cv?.id]);

  useEffect(() => {
    if (!prefillNotice) return undefined;
    const timer = setTimeout(() => setPrefillNotice(''), 6000);
    return () => clearTimeout(timer);
  }, [prefillNotice]);

  const set = (key) => (e) => onChange({ [key]: e.target.value });
  const setCv = (key) => (e) => onCvChange({ [key]: e.target.value });
  // Modification d'un clic (pré-remplissage, brouillon IA…) : une étape distincte de Ctrl+Z.
  const applyStep = (patch) => onChange(patch, { checkpoint: true });

  const handlePrefill = () => {
    const patch = buildPrefill({ cv, letter: l, lang });
    const count = Object.keys(patch).length;
    if (count === 0) {
      setPrefillNotice('Tout est déjà rempli : rien n’a été modifié.');
      return;
    }
    applyStep(patch);
    setPrefillNotice(`${prefilledLabel(count)} : relisez et adaptez si besoin.`);
  };

  const runDraft = () => {
    setConfirmOverwrite(false);
    draft.run({
      data: cv.data,
      jobOffer,
      company,
      jobTitle,
      recipientName: l.recipientName,
      tone,
      length,
      lang,
    });
  };

  const cancelDraft = () => draft.cancel();

  const handleDraft = () => {
    if (busy) return;
    if (!jobTitle.trim() && !company.trim() && !jobOffer.trim()) {
      draft.patchState({
        error:
          'Indiquez au moins le poste visé ou l’entreprise (ci-dessus), ou collez le texte de l’offre : l’IA s’en sert pour adapter la lettre.',
      });
      return;
    }
    if (l.body.trim()) {
      setConfirmOverwrite(true);
      return;
    }
    runDraft();
  };

  // Lettre complète collée (depuis Word…) dans un corps vide : la formule d'appel, la formule
  // de politesse et la signature vont dans leurs champs, sinon elles seraient imprimées deux fois.
  const handleBodyPaste = (e) => {
    const el = e.currentTarget;
    const replacesAll = !el.value.trim() || (el.selectionStart === 0 && el.selectionEnd === el.value.length);
    if (!replacesAll || busy) return;
    const pasted = e.clipboardData?.getData('text/plain') || '';
    const parts = splitPastedLetter(pasted, { name: pi.name });
    const moved = [
      parts.salutation && 'la formule d’appel',
      parts.closing && 'la formule de politesse',
      parts.signature && 'la signature',
    ].filter(Boolean);
    if (!moved.length || !parts.body.trim()) return;
    e.preventDefault();
    const patch = { body: parts.body };
    for (const key of ['salutation', 'closing', 'signature']) if (parts[key]) patch[key] = parts[key];
    applyStep(patch);
    const list = moved.length > 1 ? `${moved.slice(0, -1).join(', ')} et ${moved.at(-1)}` : moved[0];
    setPasteNotice(
      `Lettre collée : ${list} ${moved.length > 1 ? 'ont été placées' : 'a été placée'} dans ${
        moved.length > 1 ? 'leurs champs' : 'son champ'
      }, pour ne pas apparaître deux fois. Vérifiez-les ci-dessus et ci-dessous.`,
    );
  };

  const restorePrevious = () => {
    if (previousBody == null) return;
    applyStep({ body: previousBody });
    draft.patchState({ previousBody: null, done: false });
  };

  const today = formatLongDate(new Date(), lang);
  const salutationDefault = defaultSalutation(lang);
  const closingDefault = defaultClosing(lang, l.salutation || salutationDefault);
  const city = cityFromLocation(pi.location);

  return (
    <aside className="letter-editor no-print" aria-label="Édition de la lettre de motivation">
      <div className="letter-editor-header">
        <div>
          <h2 className="letter-editor-title">
            <Mails size={20} aria-hidden="true" /> Lettre de motivation
          </h2>
          <p className="letter-editor-intro">
            Même style que votre CV. Un champ laissé vide n’apparaît pas sur la lettre ; les formules d’appel et
            de politesse ont une valeur par défaut.
          </p>
        </div>
        <div className="letter-prefill">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handlePrefill}
            title="Remplit les champs encore vides avec des valeurs proposées, que vous pourrez modifier"
          >
            <WandSparkles size={14} aria-hidden="true" /> Pré-remplir
          </button>
          <p className="letter-notice" role="status">
            {prefillNotice}
          </p>
        </div>
      </div>

      <section className="letter-section" aria-labelledby={id('job')}>
        <h3 className="letter-section-title" id={id('job')}>
          <Briefcase size={14} aria-hidden="true" /> Poste visé
        </h3>
        <div className="letter-grid-2">
          <Field label="Intitulé du poste" htmlFor={id('jobTitle')}>
            <input
              id={id('jobTitle')}
              className="input"
              value={jobTitle}
              onChange={setCv('jobTitle')}
              placeholder="ex. Chargée de communication"
            />
          </Field>
          <Field label="Entreprise" htmlFor={id('company')}>
            <input
              id={id('company')}
              className="input"
              value={company}
              onChange={setCv('company')}
              placeholder="ex. Decathlon"
            />
          </Field>
        </div>
        {baseHint && (
          <p className="field-hint letter-base-hint">
            <Info size={13} aria-hidden="true" /> {baseHint}
          </p>
        )}
      </section>

      <details className="letter-ai" open={aiOpen} onToggle={(e) => setAiOpen(e.currentTarget.open)}>
        <summary>
          <Sparkles size={18} className="letter-ai-summary-icon" aria-hidden="true" />
          <span className="letter-ai-summary-text">
            <strong>Brouillon IA (facultatif)</strong>
            <span>Un premier jet rédigé à partir de votre CV et de l’offre, à relire et personnaliser.</span>
          </span>
          <ChevronDown size={16} className="letter-ai-chevron" aria-hidden="true" />
        </summary>
        <div className="letter-ai-content">
          <Field
            label="Texte de l’offre"
            htmlFor={id('jobOffer')}
            hint="Copiez-collez l’annonce complète : missions, profil recherché, mots-clés."
          >
            <textarea
              id={id('jobOffer')}
              className="textarea"
              rows={5}
              value={jobOffer}
              onChange={setCv('jobOffer')}
              placeholder="Collez ici le texte de l’offre d’emploi…"
            />
          </Field>
          <Field label="Lien de l’offre (facultatif)" htmlFor={id('offerUrl')}>
            <input
              id={id('offerUrl')}
              className="input"
              type="url"
              inputMode="url"
              value={cv?.offerUrl || ''}
              onChange={setCv('offerUrl')}
              placeholder="ex. https://www.exemple.fr/offre/12345"
            />
          </Field>
          <ChoiceGroup
            legend="Ton"
            name={id('tone')}
            options={TONES}
            value={tone}
            onChange={setTone}
            disabled={busy}
          />
          <ChoiceGroup
            legend="Longueur"
            name={id('length')}
            options={LENGTHS}
            value={length}
            onChange={setLength}
            disabled={busy}
          />

          <div className="letter-ai-actions">
            <button type="button" className="btn btn-primary" onClick={handleDraft} disabled={busy}>
              {busy ? (
                <>
                  <LoaderCircle size={15} className="letter-spin" aria-hidden="true" /> Rédaction en cours…
                </>
              ) : (
                <>
                  <Sparkles size={15} aria-hidden="true" /> Rédiger un brouillon
                </>
              )}
            </button>
            {busy && (
              <button type="button" className="btn btn-ghost" onClick={cancelDraft}>
                Annuler
              </button>
            )}
          </div>
          <p className="letter-ai-privacy">
            Votre CV (sans photo ni coordonnées) et l’offre sont envoyés au fournisseur d’IA que vous avez
            configuré. Relisez toujours le brouillon : l’IA peut se tromper ou manquer de nuance.
          </p>

          {aiError && (
            <p className="letter-alert letter-alert--error" role="alert">
              <CircleAlert size={16} aria-hidden="true" />
              <span>{aiError}</span>
            </p>
          )}

          {settingsHelp && (
            <div className="letter-key-panel" role="region" aria-label="Configuration de l’IA">
              <div className="letter-key-panel-head">
                <p>
                  {settingsHelp === 'NO_KEY'
                    ? 'Pour utiliser le brouillon IA, enregistrez d’abord une clé API ci-dessous, puis cliquez à nouveau sur «\u00a0Rédiger un brouillon\u00a0». L’IA reste facultative : vous pouvez aussi écrire votre lettre directement.'
                    : 'Vérifiez vos réglages IA ci-dessous, puis cliquez à nouveau sur «\u00a0Rédiger un brouillon\u00a0».'}
                </p>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => draft.patchState({ settingsHelp: null })}
                  aria-label="Fermer la configuration de l’IA"
                >
                  <X size={16} />
                </button>
              </div>
              <AiSettingsPanel />
            </div>
          )}

          {draftDone && (
            <div className="letter-alert letter-alert--success" role="status">
              <Info size={16} aria-hidden="true" />
              <div className="letter-alert-body">
                <p>
                  Brouillon inséré dans la lettre. Relisez-le, vérifiez chaque fait et ajoutez une touche
                  personnelle.
                </p>
                <div className="letter-alert-actions">
                  {previousBody != null && (
                    <button type="button" className="btn btn-sm" onClick={restorePrevious}>
                      <Undo2 size={14} aria-hidden="true" /> Rétablir mon texte précédent
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => draft.patchState({ done: false })}>
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </details>

      <section className="letter-section" aria-labelledby={id('recipient')}>
        <h3 className="letter-section-title" id={id('recipient')}>
          <User size={14} aria-hidden="true" /> Destinataire
        </h3>
        <Field
          label="Nom du destinataire"
          htmlFor={id('recipientName')}
          hint="Si l’annonce le précise, adressez-vous à la bonne personne."
        >
          <input
            id={id('recipientName')}
            className="input"
            value={l.recipientName}
            onChange={set('recipientName')}
            placeholder="ex. Mme Claire Dubois, responsable du recrutement"
          />
        </Field>
        <Field label="Entreprise ou service" htmlFor={id('recipientCompany')}>
          <input
            id={id('recipientCompany')}
            className="input"
            value={l.recipientCompany}
            onChange={set('recipientCompany')}
            placeholder={company ? company : 'ex. Decathlon'}
          />
        </Field>
        <Field label="Adresse" htmlFor={id('recipientAddress')}>
          <textarea
            id={id('recipientAddress')}
            className="textarea"
            rows={2}
            value={l.recipientAddress}
            onChange={set('recipientAddress')}
            placeholder={'ex. 4 boulevard de Mons\n59650 Villeneuve-d’Ascq'}
          />
        </Field>
      </section>

      <section className="letter-section" aria-labelledby={id('dateSubject')}>
        <h3 className="letter-section-title" id={id('dateSubject')}>
          <CalendarDays size={14} aria-hidden="true" /> Lieu, date et objet
        </h3>
        <div className="letter-grid-2">
          <Field label="Lieu" htmlFor={id('place')}>
            <input
              id={id('place')}
              className="input"
              value={l.place}
              onChange={set('place')}
              placeholder={city ? `ex. ${city}` : 'ex. Lyon'}
            />
          </Field>
          <Field label="Date" htmlFor={id('date')}>
            <div className="letter-input-row">
              <input
                id={id('date')}
                className="input"
                value={l.date}
                onChange={set('date')}
                placeholder={`ex. ${today}`}
              />
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => applyStep({ date: today })}
                title={`Inscrire la date du jour : ${today}`}
              >
                Aujourd’hui
              </button>
            </div>
          </Field>
        </div>
        <Field label="Objet" htmlFor={id('subject')}>
          <input
            id={id('subject')}
            className="input"
            value={l.subject}
            onChange={set('subject')}
            placeholder={
              jobTitle.trim()
                ? LETTER_TEXT[lang].subjectFor(jobTitle.trim())
                : 'ex. Candidature au poste de chargée de communication'
            }
          />
        </Field>
      </section>

      <section className="letter-section" aria-labelledby={id('content')}>
        <h3 className="letter-section-title" id={id('content')}>
          <PenTool size={14} aria-hidden="true" /> Lettre
        </h3>
        <Field
          label="Formule d’appel"
          htmlFor={id('salutation')}
          hint={`Laissée vide : «\u00a0${salutationDefault}\u00a0»`}
        >
          <input
            id={id('salutation')}
            className="input"
            value={l.salutation}
            onChange={set('salutation')}
            placeholder={salutationDefault}
          />
        </Field>
        <div className="field">
          <label className="field-label" htmlFor={id('body')}>
            Corps de la lettre
          </label>
          <p className="field-hint">
            Laissez une ligne vide entre deux paragraphes. Trois ou quatre paragraphes : vous, votre intérêt pour
            l’entreprise, ce que vous apporterez, la proposition d’un échange. Sans la formule d’appel, la formule
            de politesse ni la signature : elles ont leurs propres champs (si vous collez une lettre complète,
            elles y sont placées automatiquement).
          </p>
          <AutoGrowTextarea
            id={id('body')}
            className="textarea letter-body-input"
            rows={12}
            value={l.body}
            onChange={set('body')}
            onPaste={handleBodyPaste}
            readOnly={busy}
            aria-busy={busy}
            aria-describedby={id('wordCount')}
            placeholder="Rédigez ici votre lettre…"
          />
          <div id={id('wordCount')}>
            <WordCount body={l.body} />
          </div>
          {pasteNotice && (
            <p className="letter-alert letter-alert--info letter-paste-notice" role="status">
              <Info size={16} aria-hidden="true" />
              <span>{pasteNotice}</span>
            </p>
          )}
        </div>
        <Field
          label="Formule de politesse"
          htmlFor={id('closing')}
          hint="Laissée vide : la formule classique proposée ci-dessus."
        >
          <textarea
            id={id('closing')}
            className="textarea"
            rows={2}
            value={l.closing}
            onChange={set('closing')}
            placeholder={closingDefault}
          />
        </Field>
        <Field label="Signature" htmlFor={id('signature')} hint="Laissée vide : votre nom.">
          <input
            id={id('signature')}
            className="input"
            value={l.signature}
            onChange={set('signature')}
            placeholder={pi.name?.trim() || 'Votre prénom et votre nom'}
          />
        </Field>
      </section>

      {confirmOverwrite && (
        <ConfirmModal
          title={'Remplacer votre texte ?'}
          confirmLabel="Remplacer par le brouillon"
          onConfirm={runDraft}
          onCancel={() => setConfirmOverwrite(false)}
        >
          <p>
            Votre lettre contient déjà du texte. Le brouillon IA va le remplacer. Vous pourrez rétablir votre texte
            actuel juste après, avec le bouton «&nbsp;Rétablir mon texte précédent&nbsp;».
          </p>
        </ConfirmModal>
      )}
    </aside>
  );
}

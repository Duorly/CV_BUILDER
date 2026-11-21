import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CopyPlus, Info, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react';
import {
  allowedSkillsFrom,
  forbiddenTermsFrom,
  analyzeOffer,
  applyChanges,
  buildChanges,
  proposeChanges,
  stripForAI,
  versionNameFor,
} from '../../lib/ai';
import { canTrackApplication, rootCvId } from '../../lib/libraryActions';
import AiModal from './AiModal';
import ChangeReview from './ChangeReview';
import KeywordAnalysis from './KeywordAnalysis';
import { AiErrorBox, AiLoading, StepAiSettings } from './AiFeedback';
import { useAiConfig } from './useAiConfig';
import { useAiTask } from './useAiTask';
import '../../styles/ai.css';

const STEPS = [
  { id: 'offer', label: 'Offre' },
  { id: 'analysis', label: 'Analyse' },
  { id: 'review', label: 'Propositions' },
];

const SHORT_OFFER = 200;
const LONG_OFFER = 25000;

function Stepper({ step, reachable, onSelect, disabled }) {
  const current = STEPS.findIndex((s) => s.id === step);
  return (
    <ol className="ai-stepper">
      {STEPS.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        const canGo = !disabled && s.id !== step && reachable[s.id];
        return (
          <li key={s.id} className={`ai-step ai-step--${state}`}>
            <button
              type="button"
              className="ai-step-btn"
              onClick={() => onSelect(s.id)}
              disabled={!canGo}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <span className="ai-step-num">{state === 'done' ? <Check size={12} aria-hidden="true" /> : i + 1}</span>
              {s.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function isCvEmpty(data) {
  const s = stripForAI(data);
  return !s.summary && !s.experiences.length && !s.otherExperiences.length && !s.skills.length && !s.education.length;
}

const EMPTY_OFFER = { jobTitle: '', company: '', offerUrl: '', jobOffer: '' };
const offerOf = (version) => ({
  jobTitle: version.jobTitle || '',
  company: version.company || '',
  offerUrl: version.offerUrl || '',
  jobOffer: version.jobOffer || '',
});
const comparable = (v) =>
  String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();
const hasOffer = (version) => Object.values(offerOf(version)).some((v) => v.trim());
// Même offre : même entreprise et même poste (ou, à défaut, même texte d'annonce).
function sameOffer(a, b) {
  if (comparable(a.company) || comparable(a.jobTitle)) {
    return comparable(a.company) === comparable(b.company) && comparable(a.jobTitle) === comparable(b.jobTitle);
  }
  return Boolean(comparable(a.jobOffer)) && comparable(a.jobOffer) === comparable(b.jobOffer);
}
const hasLetter = (version) => Object.values(version.coverLetter || {}).some((v) => String(v || '').trim());
// « Decathlon » et « Decathlon France » désignent la même entreprise ; « Sézane » et « Kiabi », non.
function otherCompany(detected, typed) {
  const a = comparable(detected);
  const b = comparable(typed);
  return Boolean(a && b) && !a.includes(b) && !b.includes(a);
}

function versionLabel(version, { isRoot, isCurrent }) {
  const tags = [isRoot && 'version de base', isCurrent && 'affichée'].filter(Boolean);
  return tags.length ? `${version.name} (${tags.join(', ')})` : version.name;
}

/**
 * Adapter le CV à une offre, en trois étapes : l'offre, l'analyse des
 * mots-clés (la personne confirme ce qu'elle possède), puis les
 * modifications proposées, à cocher une par une.
 * Par défaut, on part de la version de base de la version affichée, et non
 * d'une version déjà adaptée à une autre offre.
 */
export default function ATSOptimizer({ cv, versions, onClose, onCreateVersion, onApplyToCurrent }) {
  const list = useMemo(() => {
    const all = Array.isArray(versions) ? versions : [];
    return all.some((v) => v.id === cv.id) ? all : [cv, ...all];
  }, [versions, cv]);
  const [rootId] = useState(() => rootCvId(list, cv.id));
  const [sourceId, setSourceId] = useState(rootId);
  const source = list.find((v) => v.id === sourceId) || cv;
  const fromCurrent = source.id === cv.id;
  const data = source.data;
  const lang = source.settings?.lang === 'en' ? 'en' : 'fr';
  const config = useAiConfig();
  const hasKey = Object.values(config.hasKey).some(Boolean);
  const task = useAiTask();

  const [step, setStep] = useState('offer');
  // Une nouvelle offre part d'un formulaire vide. L'offre de la version affichée n'est reprise que
  // si c'est une version de base dont l'offre n'a pas encore sa propre version (offre saisie depuis
  // la vue Lettre, par exemple) : sinon la candidature suivante partirait avec la mauvaise entreprise.
  const displayedOffer = useMemo(() => offerOf(cv), [cv]);
  const [initialOffer] = useState(() =>
    !cv.sourceId && !list.some((v) => v.id !== cv.id && sameOffer(v, cv)) ? offerOf(cv) : EMPTY_OFFER,
  );
  const [offer, setOffer] = useState(initialOffer);
  // Pour adapter à nouveau à la même offre : un clic la reprend.
  const canReuseDisplayed =
    initialOffer === EMPTY_OFFER &&
    hasOffer(cv) &&
    Object.keys(displayedOffer).some((k) => offer[k].trim() !== displayedOffer[k].trim());
  const [analysis, setAnalysis] = useState(null); // + key : version de départ et offre analysées
  const [confirmations, setConfirmations] = useState({});
  const [proposal, setProposal] = useState(null); // { patch, allowedSkills, forbiddenTerms, key }
  const [selection, setSelection] = useState(() => new Set());
  const [addToTracker, setAddToTracker] = useState(true);
  // Lettre déjà commencée dans la version affichée : reprise d'office pour la même entreprise.
  const letterFrom = hasLetter(cv) ? cv : null;
  const [copyLetterChoice, setCopyLetterChoice] = useState(null);
  const [customName, setCustomName] = useState(null);
  const [settingsRequest, setSettingsRequest] = useState(0);

  const offerText = offer.jobOffer.trim();
  // L'analyse dépend de l'offre ET du CV de départ.
  const analysisKey = JSON.stringify([source.id, offerText]);
  const analysisReady = Boolean(analysis) && analysis.key === analysisKey;
  const confirmKey = JSON.stringify([analysis?.key, confirmations]);
  const changes = useMemo(
    () =>
      proposal
        ? buildChanges(data, proposal.patch, {
            allowedSkills: proposal.allowedSkills,
            forbiddenTerms: proposal.forbiddenTerms,
            lang,
          })
        : [],
    [data, proposal, lang],
  );
  const defaultName = versionNameFor({ jobTitle: offer.jobTitle, company: offer.company, fallback: source.name });
  const versionName = (customName ?? defaultName).trim() || defaultName;
  const selectedCount = changes.filter((c) => selection.has(c.id)).length;
  const emptyCv = useMemo(() => isCvEmpty(data), [data]);
  // L'offre reprise de la version n'a pas besoin de confirmation : seul ce qui serait perdu compte.
  const dirty = Boolean(analysis) || Object.keys(offer).some((k) => offer[k].trim() !== initialOffer[k].trim());

  const setField = (field) => (e) => setOffer((o) => ({ ...o, [field]: e.target.value }));
  const trackable = canTrackApplication(offer);
  const letterCompany = letterFrom ? letterFrom.company || letterFrom.coverLetter?.recipientCompany || '' : '';
  const sameCompanyAsLetter =
    Boolean(comparable(offer.company)) && comparable(offer.company) === comparable(letterCompany);
  const copyLetter = Boolean(letterFrom) && (copyLetterChoice ?? sameCompanyAsLetter);
  // L'analyse a lu une autre entreprise que celle saisie (offre précédente restée dans le champ…).
  const detectedCompany = analysisReady && otherCompany(analysis.company, offer.company) ? analysis.company : '';

  const runAnalysis = async () => {
    const result = await task.run('Analyse de l’offre et de votre CV…', (signal) =>
      analyzeOffer({ data, ...offer, signal }),
    );
    if (!result) return;
    setAnalysis({ ...result, key: analysisKey });
    setConfirmations({});
    setProposal(null);
    setOffer((o) => ({
      ...o,
      jobTitle: o.jobTitle.trim() ? o.jobTitle : result.jobTitle,
      company: o.company.trim() ? o.company : result.company,
    }));
    setStep('analysis');
  };

  const runProposal = async () => {
    const result = await task.run('Rédaction des propositions…', (signal) =>
      proposeChanges({ data, ...offer, analysis, confirmations, signal }),
    );
    if (!result) return;
    const allowedSkills = allowedSkillsFrom(analysis, confirmations);
    const forbiddenTerms = forbiddenTermsFrom(analysis, confirmations);
    const list = buildChanges(data, result, { allowedSkills, forbiddenTerms, lang });
    setProposal({ patch: result, allowedSkills, forbiddenTerms, key: confirmKey });
    // Les propositions à vérifier (chiffre modifié, puce ajoutée, synonyme, mot-clé non
    // confirmé) ne sont pas cochées d'avance.
    setSelection(new Set(list.filter((c) => !c.warnings?.length).map((c) => c.id)));
    setStep('review');
  };

  const goToAnalysis = () => {
    if (analysisReady) setStep('analysis');
    else runAnalysis();
  };

  const goToReview = () => {
    if (proposal && proposal.key === confirmKey) setStep('review');
    else runProposal();
  };

  const result = () =>
    applyChanges(data, proposal.patch, selection, {
      allowedSkills: proposal.allowedSkills,
      forbiddenTerms: proposal.forbiddenTerms,
      lang,
    });

  const createVersion = () => {
    onCreateVersion({
      sourceId: source.id,
      name: versionName,
      data: proposal ? result() : data,
      company: offer.company.trim(),
      jobTitle: offer.jobTitle.trim(),
      jobOffer: offerText,
      offerUrl: offer.offerUrl.trim(),
      addToTracker: addToTracker && trackable,
      copyLetterFrom: copyLetter ? letterFrom.id : undefined,
    });
    onClose();
  };

  // Options de la version créée : suivi des candidatures, reprise de la lettre commencée.
  const createOptions = (
    <>
      <label className="ai-check">
        <input
          type="checkbox"
          checked={addToTracker && trackable}
          disabled={!trackable}
          onChange={(e) => setAddToTracker(e.target.checked)}
        />
        Ajouter au suivi des candidatures
      </label>
      {!trackable && <span className="field-hint">Indiquez l’entreprise ou le poste pour l’ajouter au suivi.</span>}
      {letterFrom && (
        <label className="ai-check">
          <input type="checkbox" checked={copyLetter} onChange={(e) => setCopyLetterChoice(e.target.checked)} />
          Reprendre la lettre de motivation de « {letterFrom.name} »
        </label>
      )}
    </>
  );

  const companyNote = detectedCompany ? (
    <div className="callout callout-warn ai-company-note">
      <TriangleAlert size={16} aria-hidden="true" />
      <p>
        L’offre semble concerner « {detectedCompany} », alors que l’entreprise indiquée est « {offer.company.trim()} ».{' '}
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setOffer((o) => ({ ...o, company: detectedCompany }))}
        >
          Mettre « {detectedCompany} »
        </button>
      </p>
    </div>
  ) : null;

  const applyToCurrent = () => {
    onApplyToCurrent(result());
    onClose();
  };

  const reachable = {
    offer: true,
    analysis: analysisReady,
    review: Boolean(proposal) && analysisReady && proposal.key === confirmKey,
  };

  let body;
  let footer;
  if (task.loading) {
    body = <AiLoading label={task.label} elapsed={task.elapsed} />;
    footer = (
      <button type="button" className="btn" onClick={task.cancel}>
        Annuler la demande
      </button>
    );
  } else if (step === 'offer') {
    body = (
      <div className="ai-step-body">
        {list.length > 1 ? (
          <label className="field">
            <span className="field-label">À partir de :</span>
            <select className="select" value={source.id} onChange={(e) => setSourceId(e.target.value)}>
              {list.map((v) => (
                <option key={v.id} value={v.id}>
                  {versionLabel(v, { isRoot: v.id === rootId && rootId !== cv.id, isCurrent: v.id === cv.id })}
                </option>
              ))}
            </select>
            <span className="field-hint">
              {fromCurrent
                ? 'Cette version ne change pas tant que vous ne choisissez pas « Appliquer au CV actuel ».'
                : `L’adaptation part de « ${source.name} » et crée une nouvelle version : aucune version existante ne change.`}
              {rootId !== cv.id &&
                source.id === rootId &&
                ' Partir de la version de base évite de reprendre les ajustements faits pour une autre offre.'}
            </span>
          </label>
        ) : (
          <p className="ai-source">
            <Info size={15} aria-hidden="true" />
            <span>
              À partir de : <strong>« {cv.name} »</strong>. Cette version ne change pas tant que vous ne choisissez pas
              « Appliquer au CV actuel ».
            </span>
          </p>
        )}
        {emptyCv && (
          <p className="callout callout-warn">
            <TriangleAlert size={16} aria-hidden="true" />
            Votre CV est presque vide : complétez-le d’abord, l’IA ne travaille qu’à partir de ce qu’il contient.
          </p>
        )}
        {canReuseDisplayed && (
          <p className="ai-reuse-offer">
            <Info size={15} aria-hidden="true" />
            <span>
              Pour une nouvelle offre, les champs sont vides. Même offre que « {cv.name} »
              {cv.company.trim() ? ` (${cv.company.trim()})` : ''} ?{' '}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOffer(displayedOffer)}>
                Reprendre son offre
              </button>
            </span>
          </p>
        )}
        <div className="ai-grid">
          <label className="field">
            <span className="field-label">Intitulé du poste</span>
            <input className="input" value={offer.jobTitle} onChange={setField('jobTitle')} placeholder="ex. : Chargée de communication" />
          </label>
          <label className="field">
            <span className="field-label">Entreprise</span>
            <input className="input" value={offer.company} onChange={setField('company')} placeholder="ex. : Decathlon" />
          </label>
        </div>
        <label className="field">
          <span className="field-label">Lien de l’offre (facultatif)</span>
          <input
            className="input"
            type="url"
            inputMode="url"
            value={offer.offerUrl}
            onChange={setField('offerUrl')}
            placeholder="https://…"
          />
          <span className="field-hint">Gardé pour le suivi des candidatures ; l’IA ne consulte pas ce lien.</span>
        </label>
        <label className="field">
          <span className="field-label">Texte de l’offre</span>
          <textarea
            className="textarea ai-offer-text"
            value={offer.jobOffer}
            onChange={setField('jobOffer')}
            rows={10}
            data-autofocus
            placeholder="Collez ici le texte complet de l’annonce : missions, profil recherché, compétences demandées…"
          />
          <span className="field-hint">
            Sur la page de l’annonce, sélectionnez tout le texte (Ctrl+A ou ⌘+A), copiez-le, puis collez-le ici.
            {offerText.length > 0 && ` ${offerText.length.toLocaleString('fr-FR')} caractères.`}
          </span>
        </label>
        {offerText.length > 0 && offerText.length < SHORT_OFFER && (
          <p className="ai-inline-warn">L’offre semble courte : l’analyse sera plus précise avec le texte complet.</p>
        )}
        {offerText.length > LONG_OFFER && (
          <p className="ai-inline-warn">
            Offre très longue : si possible, retirez la présentation générale de l’entreprise et les mentions légales.
          </p>
        )}
        {!hasKey && (
          <div className="ai-nokey-alt">
            <p>
              <strong>Pas de clé ?</strong> Choisissez « Créer la version sans IA » : la version dédiée à cette offre
              est créée avec le poste, l’entreprise, le texte de l’offre et son lien, et vous l’adaptez vous-même.
            </p>
            {createOptions}
          </div>
        )}
        <StepAiSettings hasKey={hasKey} openRequest={settingsRequest} />
        <AiErrorBox
          key={task.error?.code}
          error={task.error}
          onRetry={offerText && hasKey ? runAnalysis : undefined}
          onOpenSettings={() => setSettingsRequest((n) => n + 1)}
        />
      </div>
    );
    footer = (requestClose) => (
      <>
        <button type="button" className="btn" onClick={requestClose}>
          Annuler
        </button>
        {!hasKey && (
          <button type="button" className="btn" onClick={createVersion}>
            <CopyPlus size={15} aria-hidden="true" />
            Créer la version sans IA
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={goToAnalysis} disabled={!offerText || !hasKey}>
          {analysisReady ? 'Voir l’analyse' : 'Analyser l’offre'}
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      </>
    );
  } else if (step === 'analysis' && analysis) {
    body = (
      <div className="ai-step-body">
        {companyNote}
        <KeywordAnalysis analysis={analysis} confirmations={confirmations} onChange={setConfirmations} />
        <AiErrorBox key={task.error?.code} error={task.error} onRetry={runProposal} />
      </div>
    );
    footer = (
      <>
        <button type="button" className="btn btn-ghost ai-footer-left" onClick={() => setStep('offer')}>
          <ArrowLeft size={15} aria-hidden="true" />
          Retour
        </button>
        <button type="button" className="btn" onClick={runAnalysis}>
          <RefreshCw size={14} aria-hidden="true" />
          Relancer l’analyse
        </button>
        <button type="button" className="btn btn-primary" onClick={goToReview}>
          {proposal && proposal.key === confirmKey ? 'Voir les propositions' : 'Proposer des modifications'}
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      </>
    );
  } else if (step === 'review' && proposal) {
    body = (
      <div className="ai-step-body">
        {changes.length ? (
          <ChangeReview changes={changes} selection={selection} onSelectionChange={setSelection} />
        ) : (
          <div className="empty-state">
            <Check size={22} aria-hidden="true" />
            <p>
              L’IA ne propose aucune modification : votre CV couvre déjà bien cette offre. Vous pouvez tout de même
              créer une version dédiée à cette candidature.
            </p>
          </div>
        )}
        {companyNote}
        <div className="ai-create">
          <label className="field">
            <span className="field-label">Nom de la nouvelle version</span>
            <input className="input" value={customName ?? defaultName} onChange={(e) => setCustomName(e.target.value)} />
          </label>
          {createOptions}
        </div>
      </div>
    );
    footer = (
      <>
        <button type="button" className="btn btn-ghost ai-footer-left" onClick={() => setStep('analysis')}>
          <ArrowLeft size={15} aria-hidden="true" />
          Retour
        </button>
        {fromCurrent && (
          <button
            type="button"
            className="btn"
            onClick={applyToCurrent}
            disabled={!selectedCount}
            title="Modifie la version affichée ; annulable avec Ctrl+Z"
          >
            Appliquer au CV actuel
          </button>
        )}
        <button type="button" className="btn btn-primary ai-create-btn" onClick={createVersion}>
          <CopyPlus size={15} aria-hidden="true" />
          <span className="ai-create-label">Créer la version « {versionName} »</span>
        </button>
      </>
    );
  }

  return (
    <AiModal
      title="Adapter mon CV à une offre"
      icon={Sparkles}
      busy={task.loading}
      confirmMessage={dirty ? 'L’offre saisie, l’analyse et les propositions seront perdues.' : ''}
      onClose={onClose}
      footer={footer}
    >
      <Stepper step={step} reachable={reachable} onSelect={setStep} disabled={task.loading} />
      {body}
    </AiModal>
  );
}

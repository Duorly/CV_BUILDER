import { useMemo, useState } from 'react';
import { ArrowRight, Check, CopyPlus, Info, Languages, TriangleAlert } from 'lucide-react';
import { translateCv, translationTarget } from '../../lib/ai';
import AiModal from './AiModal';
import { AiErrorBox, AiLoading, StepAiSettings } from './AiFeedback';
import { translationPairs } from './translationPairs';
import { useAiConfig } from './useAiConfig';
import { useAiTask } from './useAiTask';
import '../../styles/ai.css';

const LANGS = {
  fr: { name: 'français', code: 'FR' },
  en: { name: 'anglais', code: 'EN' },
};

function versionName(cvName, to) {
  const base = String(cvName || 'Mon CV').replace(/\s*\((FR|EN)\)\s*$/i, '').trim() || 'Mon CV';
  return `${base} (${LANGS[to].code})`;
}

/**
 * Crée une version traduite du CV (anglais, ou français si le CV est déjà en
 * anglais). La version affichée n'est pas modifiée.
 */
export default function TranslateDialog({ cv, onClose, onCreateVersion }) {
  const from = cv.settings?.lang === 'en' ? 'en' : 'fr';
  const to = translationTarget(cv.settings);
  const config = useAiConfig();
  const hasKey = Object.values(config.hasKey).some(Boolean);
  const task = useAiTask();
  const [result, setResult] = useState(null); // { data, untranslated, numberChanges }
  const [settingsRequest, setSettingsRequest] = useState(0);
  const name = versionName(cv.name, to);

  const pairs = useMemo(() => (result ? translationPairs(cv.data, result.data) : []), [cv.data, result]);
  const count = pairs.reduce((n, s) => n + s.items.length, 0);

  const run = async () => {
    const translated = await task.run(`Traduction en ${LANGS[to].name}…`, (signal) =>
      translateCv({ data: cv.data, from, to, signal }),
    );
    if (translated) setResult(translated);
  };

  const create = () => {
    onCreateVersion({
      name,
      data: result.data,
      company: cv.company,
      jobTitle: cv.jobTitle,
      jobOffer: cv.jobOffer,
      offerUrl: cv.offerUrl,
      settingsPatch: { lang: to },
      addToTracker: false,
    });
    onClose();
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
  } else if (!result) {
    body = (
      <div className="ai-step-body">
        <p className="ai-source">
          <Info size={15} aria-hidden="true" />
          <span>
            Une nouvelle version <strong>« {name} »</strong> sera créée à partir de « {cv.name} », qui ne change pas.
          </span>
        </p>
        <div className="ai-translate-scope">
          <div>
            <p className="ai-scope-title">Traduit en {LANGS[to].name}</p>
            <p>
              Titre, résumé, intitulés de postes et de diplômes, puces, compétences, langues et niveaux, titres de
              sections. Les libellés du modèle (« Expériences », « Téléphone »…) passent aussi en {LANGS[to].name}.
            </p>
          </div>
          <div>
            <p className="ai-scope-title">Conservé tel quel</p>
            <p>
              Noms d’entreprises et d’écoles, lieux, liens, photo et coordonnées. Dans les dates, seuls les mots (mois,
              « Aujourd’hui ») sont traduits.
            </p>
          </div>
        </div>
        <StepAiSettings hasKey={hasKey} openRequest={settingsRequest} />
        <AiErrorBox
          key={task.error?.code}
          error={task.error}
          onRetry={hasKey ? run : undefined}
          onOpenSettings={() => setSettingsRequest((n) => n + 1)}
        />
      </div>
    );
    footer = (requestClose) => (
      <>
        <button type="button" className="btn" onClick={requestClose}>
          Annuler
        </button>
        <button type="button" className="btn btn-primary" onClick={run} disabled={!hasKey} data-autofocus>
          <Languages size={15} aria-hidden="true" />
          Traduire en {LANGS[to].name}
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      </>
    );
  } else {
    body = (
      <div className="ai-step-body">
        <p className="ai-success">
          <Check size={16} aria-hidden="true" />
          Traduction prête : {count} élément{count > 1 ? 's' : ''} traduit{count > 1 ? 's' : ''}. Relisez-la, puis créez
          la version ; vous pourrez encore tout modifier dans l’éditeur.
        </p>
        {result.numberChanges?.length > 0 && (
          <div className="callout callout-warn" role="note">
            <TriangleAlert size={16} aria-hidden="true" />
            <div>
              <p>
                <strong>Chiffres à vérifier :</strong> ils ne sont pas les mêmes que dans votre CV. Une traduction
                peut les écrire en lettres (« 5 ans » → « five years ») ; sinon, corrigez-les dans l’éditeur après
                avoir créé la version.
              </p>
              <ul className="plain-list">
                {result.numberChanges.map(({ label, before, after }) => (
                  <li key={label}>
                    {label} : {before.length ? before.map((n) => `« ${n} »`).join(', ') : 'aucun chiffre'} →{' '}
                    {after.length ? after.map((n) => `« ${n} »`).join(', ') : 'aucun chiffre'}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {result.untranslated.length > 0 && (
          <div className="callout callout-warn">
            <TriangleAlert size={16} aria-hidden="true" />
            <div>
              <p>Ces éléments sont restés dans la langue d’origine, à traduire vous-même :</p>
              <ul className="plain-list">
                {result.untranslated.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <div className="ai-translation">
          {pairs.map((s) => (
            <section key={s.title} className="ai-translation-section" aria-label={s.title}>
              <h3 className="ai-review-group-title">{s.title}</h3>
              <ul>
                {s.items.map((item, i) => (
                  <li key={i} className="ai-translation-item">
                    <span className="ai-translation-label">{item.label}</span>
                    <span className="ai-translation-before" lang={from}>
                      {item.before}
                    </span>
                    <span className="ai-translation-after" lang={to}>
                      {item.after}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    );
    footer = (requestClose) => (
      <>
        <button type="button" className="btn" onClick={requestClose}>
          Annuler
        </button>
        <button type="button" className="btn btn-primary ai-create-btn" onClick={create} data-autofocus>
          <CopyPlus size={15} aria-hidden="true" />
          <span className="ai-create-label">Créer la version « {name} »</span>
        </button>
      </>
    );
  }

  return (
    <AiModal
      title={`Traduire mon CV en ${LANGS[to].name}`}
      icon={Languages}
      busy={task.loading}
      confirmMessage={result ? 'La traduction n’a pas encore été enregistrée et sera perdue.' : ''}
      onClose={onClose}
      footer={footer}
    >
      {body}
    </AiModal>
  );
}

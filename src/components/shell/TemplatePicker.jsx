import { memo, useDeferredValue, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { DESIGN_STYLES, designStylePatch, normalizeData } from '../../lib/schema';
import { PAGE_WIDTH_MM, PX_PER_MM } from '../../lib/pageGeometry';
import { renderableSections } from '../templates/shared';
import { resumeTemplate } from '../templates/registry';
import SafeBoundary from './SafeBoundary';
import example from '../../data/exampleResume.json';

// Choix du modèle (panneau Apparence) : une carte par modèle, avec la miniature de la première page
// du CV dans ce modèle, telle qu'elle s'afficherait en le choisissant (couleurs et police du modèle
// comprises, voir designStylePatch). Un CV encore vide est montré avec le CV d'exemple.

const PAGE_WIDTH_PX = PAGE_WIDTH_MM * PX_PER_MM;

const TAGLINES = {
  modern: 'Deux colonnes',
  classic: 'Colonne contrastée',
  focus: 'Formation à gauche',
  expert: 'Long parcours',
  ats: 'Sites carrières',
};

export const TEMPLATE_CHOICES = [
  ...DESIGN_STYLES.map((style) => ({ value: style.id, label: style.label })),
  { value: 'ats', label: 'ATS (sobre)' },
];

// Réglages appliqués en choisissant `value` (mêmes règles que le clic).
export const settingsForChoice = (settings, value) =>
  value === 'ats' ? { ...settings, template: 'ats' } : { ...settings, ...designStylePatch(settings, value) };

let exampleData = null;
const sampleData = () => (exampleData ??= normalizeData(example));

// Page A4 réduite à la largeur de la carte : seule la première page est visible.
const Thumbnail = memo(function Thumbnail({ data, settings, label }) {
  const frameRef = useRef(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    // Ni lien ni bouton de la miniature ne doit recevoir le focus (attribut posé ici : React 18 ne
    // connaît pas encore `inert`).
    frame.setAttribute('inert', '');
    const update = () => setScale(frame.clientWidth / PAGE_WIDTH_PX);
    update();
    if (typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);
  const Template = resumeTemplate(settings.template, settings.designStyle);
  return (
    <div ref={frameRef} className="ap-tpl-thumb" aria-hidden="true">
      {scale > 0 && (
        <div className="ap-tpl-page" style={{ transform: `scale(${scale})` }}>
          <SafeBoundary label={`La miniature du modèle ${label}`} resetKey={data}>
            <Template data={data} settings={settings} thumbnail />
          </SafeBoundary>
        </div>
      )}
    </div>
  );
});

function TemplateCard({ choice, active, data, settings, onSelect }) {
  const descId = useId();
  return (
    <div className={active ? 'ap-tpl is-active' : 'ap-tpl'}>
      <Thumbnail data={data} settings={settings} label={choice.label} />
      {/* Toute la carte est cliquable : le bouton s'étend sur elle (::before). */}
      <button
        type="button"
        role="radio"
        aria-checked={active}
        aria-label={choice.label}
        aria-describedby={descId}
        className="ap-tpl-btn"
        onClick={() => onSelect(choice.value)}
      >
        <span className="ap-tpl-name">
          {active && <Check size={13} strokeWidth={3} aria-hidden="true" />}
          {choice.label}
        </span>
        <span id={descId} className="ap-tpl-desc">
          {TAGLINES[choice.value]}
        </span>
      </button>
    </div>
  );
}

export default function TemplatePicker({ label, data, settings, onSelect }) {
  // Les miniatures suivent la saisie et les réglages (couleur glissée…) sans les ralentir : elles se
  // mettent à jour juste après l'aperçu.
  const deferredData = useDeferredValue(data);
  const deferredSettings = useDeferredValue(settings);
  const own = useMemo(() => normalizeData(deferredData), [deferredData]);
  const usesSample = renderableSections(own).length === 0;
  const shown = usesSample ? sampleData() : own;
  const current = settings.template === 'ats' ? 'ats' : settings.designStyle;
  const choices = useMemo(
    () => TEMPLATE_CHOICES.map((choice) => ({ choice, settings: settingsForChoice(deferredSettings, choice.value) })),
    [deferredSettings],
  );

  return (
    <>
      <div className="ap-templates" role="radiogroup" aria-label={label}>
        {choices.map(({ choice, settings: choiceSettings }) => (
          <TemplateCard
            key={choice.value}
            choice={choice}
            active={choice.value === current}
            data={shown}
            settings={choiceSettings}
            onSelect={onSelect}
          />
        ))}
      </div>
      {usesSample && <span className="field-hint">Miniatures montrées avec le CV d’exemple, en attendant le vôtre.</span>}
    </>
  );
}

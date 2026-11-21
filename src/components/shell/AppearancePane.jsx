import { Fragment, useId } from 'react';
import { Info, Palette, TriangleAlert, X } from 'lucide-react';
import {
  defaultColors,
  designStylePatch,
  FONT_GROUPS,
  FONT_OPTIONS,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  MARGIN_OPTIONS,
  SPACING_OPTIONS,
} from '../../lib/schema';
import { bodyTextPt } from '../../lib/pageGeometry';
import { displayColors } from '../templates/shared';
import { formatNumber } from './format';
import TemplatePicker from './TemplatePicker';

const MIN_READABLE_PT = 9.5;

// Fond et texte de la colonne : colonne latérale des modèles Design, Classique et Focus (les modèles
// ATS et Expert n'en ont pas).
const CV_COLORS = [
  { key: 'primaryColor', label: 'Couleur principale' },
  { key: 'textColor', label: 'Texte du corps' },
  { key: 'sidebarBg', label: 'Fond de la colonne' },
  { key: 'sidebarTextColor', label: 'Texte de la colonne' },
];

// Ce que colorent les couleurs, selon le modèle affiché (template 'ats', sinon settings.designStyle).
const COLOR_HINTS = {
  ats: 'Le modèle ATS n’a qu’une colonne : seul le texte du corps s’y applique.',
  modern: 'Corps : colonne principale. Colonne : nom, coordonnées, compétences, langues…',
  classic:
    'Corps : colonne principale. Colonne : nom, coordonnées, compétences, langues… Si la colonne est foncée, les titres de la page prennent sa couleur ; la couleur principale dessine ses filets et ses icônes.',
  focus:
    'Corps : en-tête, profil et expériences. Colonne : formation, compétences, langues… La couleur principale dessine les filets, les titres et les puces.',
  expert:
    'Couleur principale : en-tête, titres, entreprises et puces. Le modèle Expert n’a pas de colonne latérale : son fond et son texte ne s’y appliquent pas.',
};

// La lettre n'a pas de colonne : seules la couleur principale et celle du texte s'y voient.
const LETTER_COLORS = [
  { key: 'primaryColor', label: 'Couleur principale' },
  { key: 'textColor', label: 'Texte' },
];

function Segmented({ label, value, options, onChange }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`seg-btn ${value === o.value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Couleurs ajustées sur le document pour rester lisibles sur leur fond (displayColors, même règle
// pour la lettre) : on montre lesquelles et la teinte réellement utilisée, pour que la différence
// avec le nuancier s'explique.
// textLabel : nom de la couleur du texte dans la liste (« texte du corps » pour le CV, « texte » pour la lettre).
// design : CV en deux colonnes (modèles Design, Classique et Focus).
function adjustedColors(settings, design, textLabel) {
  const shown = displayColors(settings);
  // Classique : la couleur principale ne dessine dans la colonne que des filets et des icônes
  // (contraste d'un élément graphique), et ne colore les titres de la page que si la colonne est claire.
  const classic = design && settings.designStyle === 'classic';
  const pagePrimary = !classic || shown.pageTitle === shown.accentText ? shown.accentText : null;
  const columnPrimary = classic ? shown.sidebarAccent : shown.sidebarAccentText;
  return [
    shown.text !== settings.textColor && { label: textLabel, color: shown.text },
    design && shown.sidebarText !== settings.sidebarTextColor && { label: 'texte de la colonne', color: shown.sidebarText },
    pagePrimary &&
      pagePrimary !== settings.primaryColor && {
        label: design ? 'couleur principale (corps)' : 'couleur principale',
        color: pagePrimary,
      },
    design && columnPrimary !== settings.primaryColor && { label: 'couleur principale (colonne)', color: columnPrimary },
  ].filter(Boolean);
}

// Polices par famille (FONT_GROUPS) : sans empattement, puis avec empattement.
function FontField({ settings, updateSettings, hint }) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        Police
      </label>
      <select
        id={id}
        className="select"
        value={settings.fontFamily}
        aria-describedby={hint ? hintId : undefined}
        onChange={(e) => updateSettings({ fontFamily: e.target.value })}
      >
        {FONT_GROUPS.map((group) => (
          <optgroup key={group.id} label={group.label}>
            {FONT_OPTIONS.filter((f) => f.group === group.id).map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {hint && (
        <span id={hintId} className="field-hint">
          {hint}
        </span>
      )}
    </div>
  );
}

// colors : couleurs proposées (CV_COLORS ou LETTER_COLORS) ; « Couleurs par défaut » ne remet que
// celles-là, pour ne rien changer d'invisible dans la vue affichée, et celles du modèle en couleur
// du CV (Design, Classique ou Expert).
function ColorsField({ colors, settings, updateSettings, design, hint, documentLabel }) {
  const defaults = defaultColors(settings);
  const changed = colors.some(({ key }) => settings[key] !== defaults[key]);
  const textLabel = colors.find(({ key }) => key === 'textColor').label.toLowerCase();
  const adjusted = adjustedColors(settings, design, textLabel);
  return (
    <div className="field">
      <span className="field-label">Couleurs</span>
      <div className="ap-colors">
        {colors.map(({ key, label }) => (
          <label key={key} className="ap-color">
            <input type="color" value={settings[key]} onChange={(e) => updateSettings({ [key]: e.target.value })} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <span className="field-hint">{hint}</span>
      {adjusted.length > 0 && (
        <p className="ap-note">
          <Info size={13} aria-hidden="true" />
          <span>
            Ajusté sur {documentLabel} pour rester lisible sur son fond :{' '}
            {adjusted.map(({ label, color }, i) => (
              <Fragment key={label}>
                <span className="ap-adjusted">
                  <span className="ap-swatch" style={{ background: color }} aria-hidden="true" />
                  {label}
                </span>
                {i < adjusted.length - 1 ? ', ' : '.'}
              </Fragment>
            ))}
          </span>
        </p>
      )}
      {changed && (
        <button
          type="button"
          className="btn btn-ghost btn-sm ap-reset"
          onClick={() => updateSettings(Object.fromEntries(colors.map(({ key }) => [key, defaults[key]])))}
        >
          Couleurs par défaut
        </button>
      )}
    </div>
  );
}

function LanguageField({ settings, updateSettings, label, hint }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <Segmented
        label={label}
        value={settings.lang}
        options={[
          { value: 'fr', label: 'Français' },
          { value: 'en', label: 'English' },
        ]}
        onChange={(lang) => updateSettings({ lang })}
      />
      <span className="field-hint">{hint}</span>
    </div>
  );
}

// Vue Lettre : la lettre reprend la police, les couleurs et la langue de sa version de CV. Les
// autres réglages ne la concernent pas : ils sont masqués, pour ne rien changer d'invisible.
function LetterSettings({ settings, updateSettings }) {
  return (
    <>
      <p className="ap-scope">
        <Info size={14} aria-hidden="true" />
        <span>
          La lettre reprend la police, les couleurs et la langue de ce CV : les changer ici les change aussi sur le CV.
          Les autres réglages (modèle, taille, marges…) ne concernent que le CV.
        </span>
      </p>
      <FontField settings={settings} updateSettings={updateSettings} />
      <ColorsField
        colors={LETTER_COLORS}
        settings={settings}
        updateSettings={updateSettings}
        design={false}
        documentLabel="la lettre"
        hint="Couleur principale : votre titre, le trait sous vos coordonnées et « Objet : »."
      />
      <LanguageField
        settings={settings}
        updateSettings={updateSettings}
        label="Langue de la lettre"
        hint="Change la date, « Objet : » et la formule d’appel de la lettre, ainsi que les titres du CV."
      />
    </>
  );
}

// Réglages d'apparence de la version courante (enregistrés avec elle).
function CvSettings({ settings, data, hasPhoto, updateSettings }) {
  const ids = { size: useId(), photo: useId() };
  const pt = bodyTextPt(settings.fontScale, settings.template);
  const tooSmall = pt < MIN_READABLE_PT;
  const design = settings.template === 'design';
  // CV en deux colonnes (Design, Classique, Focus) : la colonne a ses couleurs.
  const twoColumns = design && settings.designStyle !== 'expert';

  return (
    <>
      <div className="field">
        <span className="field-label">Modèle affiché</span>
        {/* Design, Classique et Expert : trois dessins du modèle en couleur (template 'design', designStyle).
            Chaque carte montre la première page de votre CV dans ce modèle. */}
        <TemplatePicker
          label="Modèle affiché"
          data={data}
          settings={settings}
          onSelect={(value) =>
            updateSettings(value === 'ats' ? { template: 'ats' } : designStylePatch(settings, value))
          }
        />
        <span className="field-hint">
          Design, Classique et Focus : deux colonnes et vos couleurs, pour un envoi par e-mail ; Focus met la
          formation dans la colonne pour laisser la page à l’expérience. Expert : une colonne pleine largeur et les
          dates dans la marge, pour un long parcours. ATS : une colonne sobre, lue sans erreur par les sites
          carrières. Au téléchargement, vous choisirez la version.
        </span>
      </div>

      <FontField
        settings={settings}
        updateSettings={updateSettings}
        hint="Gardée dans le PDF imprimé. Le PDF ATS en téléchargement direct utilise toujours Helvetica, lue par tous les logiciels."
      />

      <div className="field">
        <label className="field-label ap-size-label" htmlFor={ids.size}>
          <span>Taille du texte</span>
          <span className="ap-size-value">
            {Math.round(settings.fontScale * 100)} % · ≈ {formatNumber(pt)} pt
          </span>
        </label>
        <input
          id={ids.size}
          type="range"
          className="ap-range"
          min={FONT_SCALE_MIN}
          max={FONT_SCALE_MAX}
          step={0.01}
          value={settings.fontScale}
          onChange={(e) => updateSettings({ fontScale: Number(e.target.value) })}
        />
        {tooSmall ? (
          <span className="ap-warning">
            <TriangleAlert size={13} aria-hidden="true" /> Texte petit (moins de {formatNumber(MIN_READABLE_PT)} pt) :
            moins lisible. Raccourcir le contenu est souvent préférable.
          </span>
        ) : (
          <span className="field-hint">10 à 11 pt pour le corps du texte, c’est l’idéal.</span>
        )}
      </div>

      <div className="field">
        <span className="field-label">Marges de la page</span>
        <Segmented
          label="Marges de la page"
          value={settings.margins}
          options={MARGIN_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          onChange={(margins) => updateSettings({ margins })}
        />
      </div>

      <div className="field">
        <span className="field-label">Espacement entre les blocs</span>
        <Segmented
          label="Espacement entre les blocs"
          value={settings.spacing}
          options={SPACING_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          onChange={(spacing) => updateSettings({ spacing })}
        />
        <span className="field-hint">
          Marges étroites et espacement serré font gagner de la place pour tenir sur une page sans réduire le texte.
        </span>
      </div>

      <ColorsField
        colors={CV_COLORS}
        settings={settings}
        updateSettings={updateSettings}
        design={twoColumns}
        documentLabel="le CV"
        hint={COLOR_HINTS[design ? settings.designStyle : 'ats'] ?? COLOR_HINTS.modern}
      />

      <div className="field">
        <span className="field-label">Compétences et mots-clés (modèle Design)</span>
        <Segmented
          label="Présentation des compétences et mots-clés du modèle Design"
          value={settings.skillsStyle}
          options={[
            { value: 'tags', label: 'Étiquettes' },
            { value: 'list', label: 'Liste à puces' },
          ]}
          onChange={(skillsStyle) => updateSettings({ skillsStyle })}
        />
        <span className="field-hint">
          Étiquettes : chaque élément encadré. Liste à puces : à la suite, plus sobre et plus compacte. S’applique aux
          compétences, à la stack technique des expériences et aux objectifs et outils des formations.
        </span>
      </div>

      <div className="field">
        <span className="field-label">En-tête (nom, poste et coordonnées)</span>
        <Segmented
          label="Alignement de l’en-tête"
          value={settings.headerAlign}
          options={[
            { value: 'left', label: 'À gauche' },
            { value: 'center', label: 'Centré' },
          ]}
          onChange={(headerAlign) => updateSettings({ headerAlign })}
        />
      </div>

      <div className="field">
        <span className="field-label">Fond de l’en-tête (modèles ATS, Expert et Focus)</span>
        <Segmented
          label="Fond de l’en-tête des modèles ATS, Expert et Focus"
          value={settings.headerStyle}
          options={[
            { value: 'plain', label: 'Sobre' },
            { value: 'colored', label: 'Coloré' },
          ]}
          onChange={(headerStyle) => updateSettings({ headerStyle })}
        />
        <span className="field-hint">
          Coloré : un bandeau de la couleur principale. Le texte reste lisible par les logiciels de tri.
        </span>
      </div>

      <div className="field">
        <span className="field-label">Texte du CV</span>
        <Segmented
          label="Alignement du texte du CV"
          value={settings.textAlign}
          options={[
            { value: 'left', label: 'Aligné à gauche' },
            { value: 'justify', label: 'Justifié' },
          ]}
          onChange={(textAlign) => updateSettings({ textAlign })}
        />
        <span className="field-hint">Justifié : le profil et les puces s’alignent sur les deux bords.</span>
      </div>

      <div className="field ap-check">
        <input
          id={ids.photo}
          type="checkbox"
          checked={settings.showPhoto}
          onChange={(e) => updateSettings({ showPhoto: e.target.checked })}
        />
        <label htmlFor={ids.photo}>
          Afficher la photo
          <span className="field-hint">
            {hasPhoto ? 'Décochez pour un CV sans photo, sans la supprimer.' : 'Ajoutez une photo dans l’éditeur (Informations personnelles).'}
          </span>
        </label>
      </div>

      <LanguageField
        settings={settings}
        updateSettings={updateSettings}
        label="Langue des titres du CV"
        hint="Change les titres des sections (« Expériences » devient « Experience »). Pour traduire le contenu, utilisez IA → Traduire."
      />
    </>
  );
}

export const APPEARANCE_PANE_ID = 'appearance-pane';
export const APPEARANCE_BUTTON_ID = 'tb-appearance';

// Panneau Apparence, à droite de l'aperçu (écrans larges) : il reste ouvert pendant que l'on
// édite, et sa largeur se règle avec la poignée qui le sépare de l'aperçu. Sur un écran étroit, il
// glisse par-dessus le contenu. Échap ou la croix le ferment (le focus revient au bouton Apparence).
// view : 'cv' ou 'letter' (dans la vue Lettre, seuls les réglages qui la concernent).
// data : contenu du CV, pour les miniatures du choix du modèle.
export function AppearancePane({ paneRef, width, view, settings, data, hasPhoto, updateSettings, onClose }) {
  const titleId = `${APPEARANCE_PANE_ID}-title`;
  return (
    <aside
      ref={paneRef}
      id={APPEARANCE_PANE_ID}
      className="appearance-pane no-print"
      aria-labelledby={titleId}
      tabIndex={-1}
      style={width ? { '--appearance-width': `${width}px` } : undefined}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || e.defaultPrevented) return;
        e.preventDefault();
        onClose();
      }}
    >
      <div className="ap-pane-header">
        <h2 id={titleId} className="ap-pane-title">
          <Palette size={16} aria-hidden="true" /> Apparence
          {view === 'letter' && <span className="ap-pane-scope">· Lettre</span>}
        </h2>
        <button type="button" className="icon-btn" aria-label="Fermer le panneau Apparence" title="Fermer (Échap)" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <div className="ap-pane-body">
        {view === 'letter' ? (
          <LetterSettings settings={settings} updateSettings={updateSettings} />
        ) : (
          <CvSettings settings={settings} data={data} hasPhoto={hasPhoto} updateSettings={updateSettings} />
        )}
      </div>
    </aside>
  );
}

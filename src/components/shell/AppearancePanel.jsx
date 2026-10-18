import { useId } from 'react';
import { Palette, TriangleAlert } from 'lucide-react';
import Dropdown from './Dropdown';
import { defaultSettings, FONT_OPTIONS, FONT_SCALE_MAX, FONT_SCALE_MIN } from '../../lib/schema';
import { bodyTextPt } from '../../lib/pageGeometry';
import { formatNumber } from './format';

const MIN_READABLE_PT = 9.5;

const COLORS = [
  { key: 'primaryColor', label: 'Couleur principale' },
  { key: 'sidebarBg', label: 'Fond de la colonne' },
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

// Réglages d'apparence de la version courante (enregistrés avec elle).
export default function AppearancePanel({ settings, hasPhoto, updateSettings }) {
  const ids = { font: useId(), size: useId(), photo: useId() };
  const pt = bodyTextPt(settings.fontScale, settings.template);
  const tooSmall = pt < MIN_READABLE_PT;
  const defaults = defaultSettings();
  const colorsChanged = COLORS.some(({ key }) => settings[key] !== defaults[key]);

  return (
    <Dropdown
      label="Apparence"
      icon={Palette}
      title="Modèle, police, taille et couleurs"
      role="dialog"
      panelClassName="ap-panel"
    >
      <div className="field">
        <span className="field-label">Modèle affiché</span>
        <Segmented
          label="Modèle affiché"
          value={settings.template}
          options={[
            { value: 'design', label: 'Design' },
            { value: 'ats', label: 'ATS (sobre)' },
          ]}
          onChange={(template) => updateSettings({ template })}
        />
        <span className="field-hint">
          Design : deux colonnes et couleurs, pour un envoi par e-mail. ATS : une colonne sobre, lue sans erreur par
          les sites carrières. Au téléchargement, vous choisirez la version.
        </span>
      </div>

      <div className="field">
        <label className="field-label" htmlFor={ids.font}>
          Police
        </label>
        <select
          id={ids.font}
          className="select"
          value={settings.fontFamily}
          onChange={(e) => updateSettings({ fontFamily: e.target.value })}
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

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
        <span className="field-label">Couleurs (modèle Design)</span>
        <div className="ap-colors">
          {COLORS.map(({ key, label }) => (
            <label key={key} className="ap-color">
              <input type="color" value={settings[key]} onChange={(e) => updateSettings({ [key]: e.target.value })} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        {colorsChanged && (
          <button
            type="button"
            className="btn btn-ghost btn-sm ap-reset"
            onClick={() =>
              updateSettings(Object.fromEntries(COLORS.map(({ key }) => [key, defaults[key]])))
            }
          >
            Couleurs par défaut
          </button>
        )}
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

      <div className="field">
        <span className="field-label">Langue des titres du CV</span>
        <Segmented
          label="Langue des titres du CV"
          value={settings.lang}
          options={[
            { value: 'fr', label: 'Français' },
            { value: 'en', label: 'English' },
          ]}
          onChange={(lang) => updateSettings({ lang })}
        />
        <span className="field-hint">
          Change les titres des sections (« Expériences » devient « Experience »). Pour traduire le contenu, utilisez
          IA → Traduire.
        </span>
      </div>
    </Dropdown>
  );
}

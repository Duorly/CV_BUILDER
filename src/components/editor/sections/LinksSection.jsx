import { Globe, Type } from 'lucide-react';
import { prettyUrl } from '../../../lib/files';
import { newLink } from '../../../lib/schema';
import ItemList from '../ItemList';
import TextField from '../TextField';
import { LINK_ICONS } from '../linkIcons';
import { fieldId } from '../listUtils';

function IconPicker({ link, onPick }) {
  return (
    <fieldset className="editor-icon-picker">
      <legend>Icône</legend>
      <div className="editor-icon-options">
        {LINK_ICONS.map(({ id, label, Icon }) => {
          const inputId = fieldId(link.id, 'icon', id);
          const selected = link.icon === id;
          return (
            <label
              key={id}
              htmlFor={inputId}
              className={`editor-icon-option${selected ? ' is-selected' : ''}`}
              title={label}
            >
              <input
                id={inputId}
                type="radio"
                className="editor-sr-only"
                name={fieldId(link.id, 'icon')}
                value={id}
                checked={selected}
                onChange={() => onPick(id)}
              />
              <Icon size={16} aria-hidden="true" />
              <span className="editor-sr-only">{label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// Section « Liens » : LinkedIn, portfolio, site…
export default function LinksSection({ items, update }) {
  return (
    <ItemList
      field="socialLinks"
      items={items}
      update={update}
      create={newLink}
      kind="link"
      firstField="name"
      addLabel="Ajouter un lien"
      emptyText="LinkedIn, portfolio, site personnel… (facultatif)."
      hiddenNote="Ce lien est masqué : il reste enregistré mais n'apparaît pas sur le CV."
      renderBody={(link, { patch }) => {
        const shown = prettyUrl(link.url);
        const hasSpace = /\s/.test(link.url.trim());
        return (
          <>
            <TextField
              id={fieldId(link.id, 'name')}
              label="Nom du lien"
              value={link.name}
              placeholder="Ex. LinkedIn"
              onChange={(name) => patch({ name })}
            />
            <TextField
              id={fieldId(link.id, 'url')}
              label="Adresse"
              icon={Globe}
              type="url"
              inputMode="url"
              autoComplete="url"
              value={link.url}
              placeholder="Ex. https://www.linkedin.com/in/votre-nom"
              hint={hasSpace ? "Une adresse web ne contient pas d'espace : vérifiez-la." : undefined}
              onChange={(url) => patch({ url })}
            />
            <TextField
              id={fieldId(link.id, 'label')}
              label="Texte affiché (facultatif)"
              icon={Type}
              value={link.label}
              placeholder={shown || 'Ex. linkedin.com/in/votre-nom'}
              hint="Laissé vide, le CV affiche l'adresse sans « https:// »."
              onChange={(label) => patch({ label })}
            />
            <IconPicker link={link} onPick={(icon) => patch({ icon }, { checkpoint: true })} />
          </>
        );
      }}
    />
  );
}

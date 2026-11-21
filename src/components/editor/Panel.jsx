import { ChevronRight } from 'lucide-react';
import { panelKey, useEditorUi } from './editorUi';
import { fieldId } from './listUtils';

// Panneau repliable (motif « accordéon » : un bouton dans un titre).
// `heading` remplace le bouton-titre (champ de renommage), `actions` s'affiche à droite.
export default function Panel({ id, icon: Icon, title, meta, actions, heading, muted, className = '', children }) {
  const ui = useEditorUi();
  const key = panelKey(id);
  const open = ui.isOpen(key);
  const base = fieldId('panel', id);

  return (
    <section
      id={base}
      className={`editor-section editor-panel${open ? ' is-open' : ''}${muted ? ' is-muted' : ''} ${className}`.trim()}
    >
      <div className="editor-panel-header">
        {heading || (
          <h3 className="editor-panel-heading">
            <button
              type="button"
              id={`${base}-toggle`}
              className="editor-panel-toggle"
              aria-expanded={open}
              aria-controls={`${base}-body`}
              onClick={() => ui.toggle(key)}
            >
              <ChevronRight size={16} className="editor-chevron" aria-hidden="true" />
              {Icon && <Icon size={18} className="header-icon" aria-hidden="true" />}
              <span className="editor-panel-titles">
                <span className="editor-panel-title">{title}</span>
                {meta && <span className="editor-panel-meta">{meta}</span>}
              </span>
            </button>
          </h3>
        )}
        {actions && <div className="editor-panel-actions">{actions}</div>}
      </div>
      <div id={`${base}-body`} className="editor-panel-body" hidden={!open}>
        {open && children}
      </div>
    </section>
  );
}

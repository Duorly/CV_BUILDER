import { ArrowDown, ArrowUp, ChevronRight, GripVertical, Trash2 } from 'lucide-react';
import { useSortableRow } from './SortableList';
import { fieldId } from './listUtils';

// Carte repliable d'un élément de liste (expérience, formation, langue…).
// L'en-tête résume le contenu ; poignée de glisser-déposer, ↑/↓ et suppression.
export default function ItemCard({
  id,
  index,
  total,
  summary,
  open,
  onToggle,
  onMove,
  onRemove,
  children,
}) {
  const { rowProps, handleProps, isDragging } = useSortableRow(id);
  const { title, subtitle, isFallback } = summary;
  const base = fieldId(id);

  return (
    <li
      {...rowProps}
      className={`editor-item-box elegant editor-card${open ? ' is-open' : ''}${isDragging ? ' is-dragging' : ''}`}
    >
      <div className="editor-card-header">
        <button
          type="button"
          className="editor-drag-handle"
          {...handleProps}
          aria-roledescription="poignée de déplacement"
          aria-label={`Déplacer « ${title} »`}
          title="Glisser pour déplacer"
        >
          <GripVertical size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          id={`${base}-toggle`}
          className="editor-card-toggle"
          aria-expanded={open}
          aria-controls={`${base}-body`}
          onClick={onToggle}
        >
          <ChevronRight size={15} className="editor-chevron" aria-hidden="true" />
          <span className="editor-card-titles">
            <span className={`editor-card-title${isFallback ? ' is-fallback' : ''}`}>{title}</span>
            {subtitle && <span className="editor-card-subtitle">{subtitle}</span>}
          </span>
        </button>
        <div className="editor-card-actions">
          <button
            type="button"
            id={`${base}-up`}
            className="editor-icon-btn"
            aria-label={`Monter « ${title} »`}
            title="Monter"
            disabled={index === 0}
            onClick={() => onMove(index, index - 1, `${base}-up`, `${base}-down`)}
          >
            <ArrowUp size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            id={`${base}-down`}
            className="editor-icon-btn"
            aria-label={`Descendre « ${title} »`}
            title="Descendre"
            disabled={index === total - 1}
            onClick={() => onMove(index, index + 1, `${base}-down`, `${base}-up`)}
          >
            <ArrowDown size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="editor-icon-btn is-danger"
            aria-label={`Supprimer « ${title} »`}
            title="Supprimer"
            data-discard-draft={`${base}-body`}
            onClick={onRemove}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div id={`${base}-body`} className="editor-card-body" hidden={!open}>
        {open && children}
      </div>
    </li>
  );
}

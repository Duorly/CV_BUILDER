import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Confirmation avant une action destructive (écraser la lettre, supprimer une candidature).
// Échap ou clic à côté annulent ; le focus revient ensuite sur le bouton d'origine,
// ou sur `fallbackFocusRef` quand ce bouton a disparu (ligne supprimée).
// Rendue dans <body> : un panneau parent qui défile ou se transforme ne la rogne pas.
export default function ConfirmModal({
  title,
  children,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
  fallbackFocusRef,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const bodyId = useId();
  const pressedOnOverlay = useRef(false);
  const fallbackRef = useRef(fallbackFocusRef);
  fallbackRef.current = fallbackFocusRef;

  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.querySelector('[data-autofocus]')?.focus();
    return () => {
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) previous.focus();
      else fallbackRef.current?.current?.focus();
    };
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
      return;
    }
    if (e.key !== 'Tab') return;
    const buttons = [...dialogRef.current.querySelectorAll('button:not([disabled])')];
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      className="modal-overlay no-print"
      onMouseDown={(e) => {
        pressedOnOverlay.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (pressedOnOverlay.current && e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onKeyDown={handleKeyDown}
      >
        <div className="modal-header">
          <h2 className="modal-title" id={titleId}>
            {title}
          </h2>
          <button type="button" className="icon-btn" onClick={onCancel} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body" id={bodyId}>
          {children}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onCancel} data-autofocus>
            Annuler
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => {
              onCancel();
              onConfirm();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

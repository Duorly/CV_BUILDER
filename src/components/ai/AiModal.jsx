import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Fenêtre des outils IA. Pendant une demande (busy), ni Échap, ni clic à côté,
 * ni la croix ne ferment. Si confirmMessage est fourni, la fermeture demande
 * d'abord une confirmation (offre saisie, traduction non enregistrée…).
 * footer peut être une fonction qui reçoit requestClose (bouton « Annuler »).
 */
export default function AiModal({ title, icon: Icon, busy = false, confirmMessage = '', onClose, footer, children }) {
  const dialogRef = useRef(null);
  const pressedOnOverlay = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement;
    const node = dialogRef.current;
    const target = node?.querySelector('[data-autofocus]') || node?.querySelector(FOCUSABLE) || node;
    target?.focus();
    return () => {
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) previous.focus();
    };
  }, []);

  useEffect(() => {
    if (confirming) dialogRef.current?.querySelector('[data-confirm-default]')?.focus();
  }, [confirming]);

  // Quand le contenu change (fin de chargement, confirmation refermée), le focus
  // peut retomber sur la page : on le ramène dans la fenêtre.
  useEffect(() => {
    const node = dialogRef.current;
    if (!busy && !confirming && node && !node.contains(document.activeElement)) node.focus();
  }, [busy, confirming]);

  const requestClose = () => {
    if (busy) return;
    if (confirmMessage) setConfirming(true);
    else onClose();
  };

  // Écouteur sur le document : il fonctionne même si le focus a quitté la fenêtre.
  const keyHandler = useRef(null);
  keyHandler.current = (e) => {
    const node = dialogRef.current;
    if (!node) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (confirming) setConfirming(false);
      else requestClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (!node.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  useEffect(() => {
    const onKey = (e) => keyHandler.current(e);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      className="modal-overlay ai-overlay no-print"
      onMouseDown={(e) => {
        pressedOnOverlay.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (pressedOnOverlay.current && e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        ref={dialogRef}
        className="modal modal-lg ai-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={busy || undefined}
        tabIndex={-1}
      >
        <div className="modal-header ai-modal-header">
          <h2 className="modal-title ai-modal-title" id={titleId}>
            {Icon && <Icon size={18} className="ai-title-icon" aria-hidden="true" />}
            {title}
          </h2>
          <button
            type="button"
            className="icon-btn"
            onClick={requestClose}
            disabled={busy}
            aria-label="Fermer"
            title={busy ? 'Patientez ou annulez la demande en cours' : 'Fermer'}
          >
            <X size={16} />
          </button>
        </div>
        <div className="modal-body ai-modal-body">{children}</div>
        {footer && (
          <div className="modal-footer ai-modal-footer">{typeof footer === 'function' ? footer(requestClose) : footer}</div>
        )}

        {confirming && (
          <div className="ai-confirm" role="alertdialog" aria-labelledby={`${titleId}-confirm`}>
            <div className="ai-confirm-card">
              <p id={`${titleId}-confirm`} className="ai-confirm-title">
                Fermer la fenêtre ?
              </p>
              <p className="ai-confirm-text">{confirmMessage}</p>
              <div className="ai-confirm-actions">
                <button type="button" className="btn" onClick={() => setConfirming(false)} data-confirm-default>
                  Continuer
                </button>
                <button type="button" className="btn btn-danger" onClick={onClose}>
                  Fermer sans enregistrer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

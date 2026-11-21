import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Fenêtre modale accessible : Échap ferme, la tabulation reste dans la fenêtre,
// le focus revient sur le bouton d'origine à la fermeture.
// `dismissible={false}` pendant un traitement : ni Échap ni clic à côté ne ferment.
export default function Modal({ title, onClose, children, footer, size, dismissible = true, className = '' }) {
  const dialogRef = useRef(null);
  const pressedOnOverlay = useRef(false);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const dismissibleRef = useRef(dismissible);
  dismissibleRef.current = dismissible;

  useEffect(() => {
    const previous = document.activeElement;
    const node = dialogRef.current;
    const target = node?.querySelector('[data-autofocus]') || node?.querySelector(FOCUSABLE) || node;
    target?.focus();

    // Écoute sur le document : le focus peut avoir quitté la fenêtre (bouton désactivé pendant un traitement).
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (dismissibleRef.current) onCloseRef.current?.();
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
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) previous.focus();
    };
  }, []);

  return (
    <div
      className="modal-overlay no-print"
      onMouseDown={(e) => {
        pressedOnOverlay.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (dismissible && pressedOnOverlay.current && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        className={`modal ${size === 'lg' ? 'modal-lg' : ''} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h2 className="modal-title" id={titleId}>
            {title}
          </h2>
          {dismissible && (
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Fermer">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="modal-body shell-modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

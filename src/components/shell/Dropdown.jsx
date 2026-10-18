import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const DropdownContext = createContext({ close: () => {} });

// Bouton + panneau déroulant (menu ou petit formulaire).
// Se ferme au clic à côté, avec Échap, ou quand un MenuItem est choisi.
export default function Dropdown({
  label,
  icon: Icon,
  title,
  buttonClassName = 'btn btn-ghost',
  panelClassName = '',
  role = 'menu',
  hideLabelOnSmall = true,
  children,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  // Garde le panneau dans l'écran quand la barre d'outils passe à la ligne.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    panel.style.transform = '';
    const rect = panel.getBoundingClientRect();
    const margin = 8;
    let shift = 0;
    if (rect.right > window.innerWidth - margin) shift = window.innerWidth - margin - rect.right;
    if (rect.left + shift < margin) shift = margin - rect.left;
    if (shift) panel.style.transform = `translateX(${Math.round(shift)}px)`;
    if (role === 'menu') panel.querySelector('[role^="menuitem"]:not([disabled])')?.focus();
  }, [open, role]);

  const onPanelKeyDown = (e) => {
    if (role !== 'menu' || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
    e.preventDefault();
    const items = [...panelRef.current.querySelectorAll('[role^="menuitem"]:not([disabled])')];
    const index = items.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? index + 1 : index - 1;
    items[(next + items.length) % items.length]?.focus();
  };

  return (
    <div className="tb-dropdown" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`${buttonClassName} ${open ? 'is-open' : ''}`.trim()}
        aria-haspopup={role === 'menu' ? 'menu' : 'dialog'}
        aria-expanded={open}
        title={title}
        onClick={() => setOpen((o) => !o)}
      >
        {Icon && <Icon size={15} aria-hidden="true" />}
        {label && <span className={hideLabelOnSmall ? 'tb-label' : undefined}>{label}</span>}
        <ChevronDown size={13} className="tb-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={panelRef}
          className={`tb-panel ${panelClassName}`.trim()}
          role={role}
          aria-label={typeof label === 'string' ? label : title}
          onKeyDown={onPanelKeyDown}
        >
          <DropdownContext.Provider value={{ close }}>
            {typeof children === 'function' ? children({ close }) : children}
          </DropdownContext.Provider>
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon: Icon, children, hint, onSelect, danger, disabled, checked, title }) {
  const { close } = useContext(DropdownContext);
  const isRadio = checked !== undefined;
  return (
    <button
      type="button"
      role={isRadio ? 'menuitemradio' : 'menuitem'}
      aria-checked={isRadio ? checked : undefined}
      className={`tb-item ${danger ? 'tb-item-danger' : ''} ${checked ? 'is-checked' : ''}`.trim()}
      disabled={disabled}
      title={title}
      onClick={() => {
        close();
        onSelect?.();
      }}
    >
      {Icon && <Icon size={15} className="tb-item-icon" aria-hidden="true" />}
      <span className="tb-item-text">
        <span className="tb-item-label">{children}</span>
        {hint && <span className="tb-item-hint">{hint}</span>}
      </span>
    </button>
  );
}

export function MenuSeparator() {
  return <div className="tb-separator" role="separator" />;
}

export function MenuHeading({ children }) {
  return <div className="tb-heading">{children}</div>;
}

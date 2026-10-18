import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };

// notify('Texte', { tone: 'success' | 'error' | 'info', action: { label, onClick }, duration })
export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const notify = useCallback(
    (message, { tone = 'info', action = null, duration } = {}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const ms = duration ?? (tone === 'error' ? 9000 : action ? 7000 : 4500);
      // Trois messages au plus : les plus anciens laissent la place.
      setToasts((list) => [...list.slice(-2), { id, message, tone, action }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), ms),
      );
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  return { toasts, notify, dismiss };
}

export function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack no-print" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.tone] || Info;
        return (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <Icon size={16} className="toast-icon" aria-hidden="true" />
            <span className="toast-message">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  t.action.onClick();
                  onDismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" className="toast-close" onClick={() => onDismiss(t.id)} aria-label="Fermer le message">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

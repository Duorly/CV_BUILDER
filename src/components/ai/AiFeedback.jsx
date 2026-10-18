import { useEffect, useRef, useState } from 'react';
import { CircleAlert, LoaderCircle, RotateCcw, Settings2 } from 'lucide-react';
import { SETTINGS_ERROR_CODES } from '../../lib/ai';
import AiSettingsPanel from './AiSettingsPanel';

// Message d'erreur d'une demande IA, avec accès direct aux réglages quand
// le problème vient de la clé, du modèle ou du crédit. Si l'étape affiche
// déjà un panneau de réglages, onOpenSettings le déplie au lieu d'en ajouter un second.
export function AiErrorBox({ error, onRetry, onOpenSettings }) {
  const needsSettings = SETTINGS_ERROR_CODES.includes(error?.code);
  const [showSettings, setShowSettings] = useState(error?.code === 'NO_KEY' && !onOpenSettings);
  const ref = useRef(null);
  // L'erreur s'affiche en bas de la fenêtre : on la fait défiler jusqu'à elle.
  useEffect(() => {
    if (error) ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [error]);
  if (!error) return null;
  const toggleSettings = onOpenSettings || (() => setShowSettings((v) => !v));
  return (
    <div className="ai-error" role="alert" ref={ref}>
      <div className="ai-error-main">
        <CircleAlert size={16} aria-hidden="true" />
        <div className="ai-error-text">
          <p>{error.message || 'La demande a échoué. Réessayez.'}</p>
          {error.detail && (
            <details className="ai-error-detail">
              <summary>Détail technique</summary>
              <code>{error.detail}</code>
            </details>
          )}
        </div>
      </div>
      {(needsSettings || onRetry) && (
        <div className="ai-error-actions">
          {needsSettings && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={toggleSettings}
              aria-expanded={onOpenSettings ? undefined : showSettings}
            >
              <Settings2 size={14} aria-hidden="true" />
              {showSettings ? 'Masquer les réglages IA' : 'Ouvrir les réglages IA'}
            </button>
          )}
          {onRetry && (
            <button type="button" className="btn btn-sm" onClick={onRetry}>
              <RotateCcw size={14} aria-hidden="true" />
              Réessayer
            </button>
          )}
        </div>
      )}
      {needsSettings && showSettings && (
        <div className="ai-error-settings">
          <AiSettingsPanel />
        </div>
      )}
    </div>
  );
}

// Réglages repliables d'une étape : dépliés sans clé, ou à chaque nouvelle
// demande d'ouverture (openRequest incrémenté depuis le message d'erreur).
export function StepAiSettings({ hasKey, openRequest = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (openRequest) ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [openRequest]);
  return (
    <div ref={ref}>
      <AiSettingsPanel key={openRequest} collapsible defaultOpen={!hasKey || openRequest > 0} />
    </div>
  );
}

export function AiLoading({ label, elapsed, hint }) {
  return (
    <div className="ai-loading" role="status" aria-live="polite">
      <LoaderCircle size={28} className="ai-loading-icon" aria-hidden="true" />
      <p className="ai-loading-label">{label}</p>
      <p className="ai-loading-time">{elapsed > 0 ? `${elapsed} s` : ' '}</p>
      <p className="ai-loading-hint">
        {hint || 'Selon le modèle choisi, cela prend de 10 secondes à 3 minutes. Vous pouvez annuler à tout moment.'}
      </p>
    </div>
  );
}

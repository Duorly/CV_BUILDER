import { CloudAlert, CloudCheck, CloudOff, LoaderCircle } from 'lucide-react';
import { formatTime } from './format';

const HELP =
  'Vos CV sont enregistrés automatiquement dans ce navigateur, sur cet appareil uniquement. Pour une copie de secours : Fichier → Tout exporter.';

export default function SaveIndicator({ saveState, conflict, onExport, lastExportLabel }) {
  const backupNote = lastExportLabel ? ` Dernière sauvegarde exportée : ${lastExportLabel}.` : '';
  if (conflict) {
    return (
      <span className="save-ind save-ind-warn" title="Enregistrement en pause : vos CV ont été modifiés dans un autre onglet.">
        <CloudOff size={15} aria-hidden="true" />
        <span className="save-ind-text">Enregistrement en pause</span>
      </span>
    );
  }
  if (saveState.status === 'error') {
    const message =
      saveState.error === 'quota'
        ? 'Stockage plein : exportez une sauvegarde'
        : 'Enregistrement impossible : exportez une sauvegarde';
    return (
      <span role="alert" className="save-ind-alert">
        <button
          type="button"
          className="save-ind save-ind-error"
          onClick={onExport}
          title="Cliquez pour télécharger une sauvegarde de tous vos CV"
        >
          <CloudAlert size={15} aria-hidden="true" />
          <span className="save-ind-text">{message}</span>
        </button>
      </span>
    );
  }
  if (saveState.status === 'pending') {
    return (
      <span className="save-ind" title={`Enregistrement… ${HELP}${backupNote}`}>
        <LoaderCircle size={15} className="spin" aria-hidden="true" />
        <span className="save-ind-text">Enregistrement…</span>
      </span>
    );
  }
  const label = saveState.savedAt ? `Enregistré à ${formatTime(saveState.savedAt)}` : 'Enregistré dans ce navigateur';
  // Sur un écran étroit, le texte est masqué visuellement : l'info-bulle le reprend.
  return (
    <span className="save-ind save-ind-ok" title={`${label}. ${HELP}${backupNote}`}>
      <CloudCheck size={15} aria-hidden="true" />
      <span className="save-ind-text">{label}</span>
      <span className="save-ind-short" aria-hidden="true">
        Enregistré
      </span>
    </span>
  );
}

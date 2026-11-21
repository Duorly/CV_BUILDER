// Bandeaux sous la barre d'outils : rappel de sauvegarde, données illisibles au démarrage,
// modifications faites dans un autre onglet.
import { Save, TriangleAlert, X } from 'lucide-react';

// file : useLibraryFile() ; browser : currentPrintBrowser().
export function BackupReminder({ file, browser }) {
  if (!file.showBackupReminder) return null;
  return (
    <div className="app-banner app-banner-info no-print" role="status">
      <Save size={18} aria-hidden="true" />
      <p>
        {file.backup.lastExport
          ? `Dernière sauvegarde exportée : ${file.lastExportLabel}.`
          : 'Vous n’avez encore exporté aucune sauvegarde.'}{' '}
        Vos CV, lettres et candidatures ne sont enregistrés que dans ce navigateur
        {browser.id === 'safari'
          ? ', et Safari efface les données d’un site que vous n’ouvrez pas pendant 7 jours.'
          : ' : un nettoyage du navigateur les effacerait.'}{' '}
        Gardez une copie à jour sur votre ordinateur ou dans votre cloud.
      </p>
      <div className="app-banner-actions">
        <button type="button" className="btn btn-sm btn-primary" onClick={file.exportAll}>
          Tout exporter
        </button>
        <button type="button" className="btn btn-sm" onClick={file.snoozeReminder}>
          Plus tard
        </button>
      </div>
    </div>
  );
}

export function RecoveredBanner({ file }) {
  if (!file.recovered) return null;
  return (
    <div className="app-banner app-banner-warn no-print" role="alert">
      <TriangleAlert size={18} aria-hidden="true" />
      <p>
        Les données enregistrées dans ce navigateur étaient illisibles. Elles ont été mises de côté et un CV vierge a
        été ouvert. Si vous avez une sauvegarde, importez-la.
      </p>
      <div className="app-banner-actions">
        <button type="button" className="btn btn-sm btn-primary" onClick={file.chooseImportFile}>
          Importer une sauvegarde
        </button>
        <button type="button" className="btn btn-sm" onClick={file.downloadCorruptCopy}>
          Télécharger les données illisibles
        </button>
        <button type="button" className="icon-btn" onClick={file.dismissRecovered} aria-label="Fermer ce message">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export function ConflictBanner({ store }) {
  if (!store.conflict) return null;
  return (
    <div className="app-banner app-banner-warn no-print" role="alert">
      <TriangleAlert size={18} aria-hidden="true" />
      <p>Vos CV ont été modifiés dans un autre onglet. Pour ne rien écraser, l’enregistrement est en pause ici.</p>
      <div className="app-banner-actions">
        <button type="button" className="btn btn-sm btn-primary" onClick={() => store.resolveConflict('reload')}>
          Charger la version la plus récente
        </button>
        <button type="button" className="btn btn-sm" onClick={() => store.resolveConflict('keep')}>
          Garder celle de cet onglet
        </button>
      </div>
    </div>
  );
}

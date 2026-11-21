import { useState } from 'react';
import { BookOpen, CircleAlert, FilePlus2, FileText, ShieldCheck, TriangleAlert, Upload } from 'lucide-react';
import { currentPrintBrowser } from './browser';

// Premier lancement : rien n'est encore enregistré dans ce navigateur.
export default function WelcomeScreen({ onStartBlank, onLoadExample, onImport, importError }) {
  const [browser] = useState(currentPrintBrowser);
  return (
    <div className="welcome no-print">
      <div className="welcome-card">
        <div className="welcome-brand">
          <FileText size={18} aria-hidden="true" />
          CV Builder
        </div>
        <h1>Bienvenue ! Par quoi commençons-nous ?</h1>
        <p className="welcome-lead">
          Rédigez votre CV une fois, puis créez une version adaptée à chaque candidature, avec sa lettre de
          motivation.
        </p>

        <div className="welcome-choices">
          <button type="button" className="welcome-choice" onClick={onStartBlank}>
            <FilePlus2 size={22} aria-hidden="true" />
            <strong>Commencer de zéro</strong>
            <span>Un CV vierge, à remplir section par section.</span>
          </button>
          <button type="button" className="welcome-choice" onClick={onLoadExample}>
            <BookOpen size={22} aria-hidden="true" />
            <strong>Charger l’exemple</strong>
            <span>Le CV fictif de Camille Martin, pour voir le rendu et le modifier.</span>
          </button>
          <button type="button" className="welcome-choice" onClick={onImport}>
            <Upload size={22} aria-hidden="true" />
            <strong>Importer un fichier JSON</strong>
            <span>Une sauvegarde faite avec CV Builder, sur cet ordinateur ou un autre.</span>
          </button>
        </div>

        {importError && (
          <div className="callout callout-danger" role="alert">
            <CircleAlert size={16} aria-hidden="true" />
            <p>{importError}</p>
          </div>
        )}

        <p className="welcome-note">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>
            Vos CV restent dans ce navigateur, sur cet appareil : ils sont enregistrés automatiquement, sans compte et
            sans envoi sur internet (sauf si vous utilisez l’IA). Utilisez toujours le même navigateur et exportez une
            sauvegarde de temps en temps (menu Fichier → Tout exporter).
          </span>
        </p>

        {browser.id === 'safari' && (
          <div className="callout callout-warn welcome-safari">
            <TriangleAlert size={16} aria-hidden="true" />
            <p>
              <strong>Sous Safari{browser.ios ? ' (iPhone, iPad)' : ''}, exportez une sauvegarde après chaque séance.</strong>{' '}
              Safari efface les données d’un site que vous n’ouvrez pas pendant 7 jours : vos CV, lettres et
              candidatures disparaîtraient. Gardez le fichier de sauvegarde sur votre appareil ou dans votre cloud ;
              il se réimporte ici en un clic.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

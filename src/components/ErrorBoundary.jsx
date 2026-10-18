import { Component } from 'react';
import { readRawLibrary, STORAGE_KEY } from '../lib/storage';
import { downloadText, todayIso } from '../lib/files';

// Dernier filet de sécurité : au lieu d'un écran blanc, on propose de
// récupérer les données enregistrées puis de repartir proprement.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('CV Builder a rencontré une erreur :', error, info);
  }

  handleDownload = () => {
    const raw = readRawLibrary();
    if (!raw) {
      alert('Aucune donnée enregistrée dans ce navigateur.');
      return;
    }
    downloadText(raw, `CV_sauvegarde_${todayIso()}.json`, 'application/json;charset=utf-8');
  };

  handleReset = () => {
    if (!window.confirm('Mettre de côté les données actuelles et repartir d’un CV vierge ? Pensez à télécharger la sauvegarde avant.')) return;
    try {
      const raw = readRawLibrary();
      if (raw) localStorage.setItem(`${STORAGE_KEY}:backup-${Date.now()}`, raw);
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* stockage indisponible : le rechargement suffira */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash-screen" role="alert">
        <div className="crash-card">
          <h1>Oups, quelque chose s’est mal passé.</h1>
          <p>
            Vos données sont enregistrées dans ce navigateur. Téléchargez une sauvegarde, puis rechargez la
            page. Si l’erreur revient, repartez d’un CV vierge et réimportez la sauvegarde.
          </p>
          <div className="crash-actions">
            <button type="button" onClick={this.handleDownload}>Télécharger mes données (JSON)</button>
            <button type="button" onClick={() => window.location.reload()}>Recharger la page</button>
            <button type="button" className="crash-danger" onClick={this.handleReset}>Repartir d’un CV vierge</button>
          </div>
          <details>
            <summary>Détail technique</summary>
            <pre>{String(this.state.error?.stack || this.state.error)}</pre>
          </details>
        </div>
      </div>
    );
  }
}

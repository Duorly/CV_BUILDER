import { Component } from 'react';
import { TriangleAlert } from 'lucide-react';

// Filet de sécurité local : si l'aperçu ou un panneau plante, le reste de
// l'application reste utilisable (on peut annuler la dernière modification).
// Un changement de `resetKey` (nouvelles données) relance l'affichage.
export default class SafeBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, key: props.resetKey };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.key) return { error: null, key: props.resetKey };
    return null;
  }

  componentDidCatch(error, info) {
    console.error(`Erreur dans « ${this.props.label || 'un panneau'} » :`, error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="safe-boundary no-print" role="alert">
        <TriangleAlert size={20} aria-hidden="true" />
        <div>
          <strong>{this.props.label ? `${this.props.label} n’a pas pu s’afficher.` : 'Ce panneau n’a pas pu s’afficher.'}</strong>
          <p>
            Vos données ne sont pas perdues. Annulez la dernière modification (Ctrl + Z) ou réessayez.
          </p>
          <button type="button" className="btn btn-sm" onClick={() => this.setState({ error: null })}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }
}

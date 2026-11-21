import { printPageRule } from '../../lib/pageGeometry';
import '../../styles/print.css';

// Règle @page du document affiché (« design », « ats » ou « letter »), selon le réglage Marges.
// Rendue après les feuilles de style de l'app, elle remplace la règle par défaut de print.css.
export default function PrintStyles({ mode = 'design', marginScale = 1 }) {
  return <style media="print">{printPageRule(mode, marginScale)}</style>;
}

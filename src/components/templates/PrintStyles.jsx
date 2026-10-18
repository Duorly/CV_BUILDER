import { printPageRule } from '../../lib/pageGeometry';
import '../../styles/print.css';

// Règle @page du document affiché (« design », « ats » ou « letter »).
// Rendue après les feuilles de style de l'app, elle remplace la règle par défaut de print.css.
export default function PrintStyles({ mode = 'design' }) {
  return <style media="print">{printPageRule(mode)}</style>;
}

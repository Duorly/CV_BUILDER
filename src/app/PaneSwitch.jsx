import { Eye, PenLine } from 'lucide-react';
import { onTabListKeyDown } from '../components/shell/tabKeys';

// Sous 1100 px, un seul panneau à la fois : onglets « Éditer » / « Aperçu » (masqués au-delà, styles/app/layout.css).
export default function PaneSwitch({ pane, onChange }) {
  const tab = (id, Icon, label) => (
    <button
      type="button"
      role="tab"
      aria-selected={pane === id}
      tabIndex={pane === id ? 0 : -1}
      className={pane === id ? 'is-active' : ''}
      onClick={() => onChange(id)}
    >
      <Icon size={15} aria-hidden="true" /> {label}
    </button>
  );
  return (
    <div className="pane-switch no-print" role="tablist" aria-label="Panneau affiché" onKeyDown={onTabListKeyDown}>
      {tab('edit', PenLine, 'Éditer')}
      {tab('preview', Eye, 'Aperçu')}
    </div>
  );
}

import { BookOpen, Copy, FilePlus2, FileUser, Pencil, Trash2 } from 'lucide-react';
import Dropdown, { MenuHeading, MenuItem, MenuSeparator } from './Dropdown';
import { formatUpdatedAt } from './format';

function versionHint(cv) {
  const about = [cv.jobTitle, cv.company].filter(Boolean).join(' · ');
  const when = `modifié ${formatUpdatedAt(cv.updatedAt)}`;
  return about ? `${about} — ${when}` : when;
}

// Sélecteur de versions : une version de base + une version par candidature.
export default function VersionMenu({ cvs, currentCv, onSelect, onNewBlank, onNewExample, onDuplicate, onRename, onDelete }) {
  const label = (
    <>
      <span className="vm-current-name">{currentCv.name}</span>
      {currentCv.company && <span className="vm-current-company">{currentCv.company}</span>}
    </>
  );
  return (
    <Dropdown
      label={label}
      icon={FileUser}
      title="Changer de version du CV, en créer une nouvelle"
      buttonClassName="btn vm-trigger"
      panelClassName="vm-panel"
      hideLabelOnSmall={false}
    >
      <MenuHeading>Mes CV ({cvs.length})</MenuHeading>
      <div className="vm-list">
        {cvs.map((cv) => (
          <MenuItem
            key={cv.id}
            checked={cv.id === currentCv.id}
            hint={versionHint(cv)}
            onSelect={() => onSelect(cv.id)}
          >
            {cv.name}
          </MenuItem>
        ))}
      </div>
      <MenuSeparator />
      <MenuItem icon={Copy} onSelect={onDuplicate} hint="Pour adapter ce CV à une offre sans toucher à l’original">
        Dupliquer pour une candidature…
      </MenuItem>
      <MenuItem icon={FilePlus2} onSelect={onNewBlank}>
        Nouveau CV vierge
      </MenuItem>
      <MenuItem icon={BookOpen} onSelect={onNewExample}>
        Nouveau CV depuis l’exemple
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={Pencil} onSelect={onRename}>
        Renommer, entreprise et poste…
      </MenuItem>
      <MenuItem
        icon={Trash2}
        danger
        onSelect={onDelete}
        disabled={cvs.length <= 1}
        hint={cvs.length <= 1 ? 'Impossible : c’est votre seul CV' : undefined}
      >
        Supprimer cette version…
      </MenuItem>
    </Dropdown>
  );
}

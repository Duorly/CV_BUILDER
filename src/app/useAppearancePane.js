import { APPEARANCE_BUTTON_ID, APPEARANCE_PANE_ID } from '../components/shell/AppearancePane';
import { useAppearanceOpen } from '../components/shell/PaneResizer';
import { focusSoon } from '../components/editor/editorUi';

// Panneau Apparence ouvert ou fermé (retenu par ce navigateur), depuis le bouton de la barre d'outils.
export function useAppearancePane() {
  const [open, setOpen] = useAppearanceOpen();
  const toggle = () => {
    setOpen(!open);
    // Ouvert depuis le bouton : le focus y entre (Échap le referme) ; fermé : il revient au bouton.
    focusSoon(open ? APPEARANCE_BUTTON_ID : APPEARANCE_PANE_ID);
  };
  const close = () => {
    setOpen(false);
    focusSoon(APPEARANCE_BUTTON_ID);
  };
  return { open, toggle, close };
}

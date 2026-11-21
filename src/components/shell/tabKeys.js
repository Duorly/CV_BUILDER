// Navigation au clavier dans une liste d'onglets (role="tablist") :
// flèches gauche / droite, Début et Fin activent l'onglet voisin.
export function onTabListKeyDown(e) {
  const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (!keys.includes(e.key)) return;
  const tabs = [...e.currentTarget.querySelectorAll('[role="tab"]')];
  const index = tabs.indexOf(document.activeElement);
  if (index === -1) return;
  e.preventDefault();
  let next = index + (e.key === 'ArrowRight' ? 1 : -1);
  if (e.key === 'Home') next = 0;
  if (e.key === 'End') next = tabs.length - 1;
  const target = tabs[(next + tabs.length) % tabs.length];
  target.focus();
  target.click();
}

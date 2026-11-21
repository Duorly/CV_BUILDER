import { useCallback, useEffect, useState } from 'react';
import { defaultStorage } from '../../lib/storage';
import {
  APPEARANCE_OPEN_KEY,
  clampPaneWidth,
  KEY_STEP,
  KEY_STEP_LARGE,
  maxPaneWidth,
  readFlag,
  readPaneWidth,
  saveFlag,
  savePaneWidth,
} from './paneWidth';

const RESIZING_CLASS = 'is-resizing-panes';

// Largeur choisie pour un panneau de PANES (null : largeur par défaut), enregistrée dans ce navigateur.
export function usePaneWidth(pane) {
  const [width, setWidth] = useState(() => readPaneWidth(defaultStorage(), pane));
  const changeWidth = useCallback(
    (next) => {
      setWidth(next);
      savePaneWidth(defaultStorage(), pane, next);
    },
    [pane],
  );
  return [width, changeWidth];
}

// Panneau Apparence ouvert ou fermé, retenu par ce navigateur.
export function useAppearanceOpen() {
  const [open, setOpen] = useState(() => readFlag(defaultStorage(), APPEARANCE_OPEN_KEY));
  const changeOpen = useCallback((next) => {
    setOpen(next);
    saveFlag(defaultStorage(), APPEARANCE_OPEN_KEY, next);
  }, []);
  return [open, changeOpen];
}

// Largeur affichée du panneau et largeur maximale : ce que l'aperçu peut céder sans passer
// sous sa largeur minimale.
function measure(paneEl, pane) {
  const preview = paneEl.parentElement?.querySelector(':scope > .preview-pane');
  const now = Math.round(paneEl.getBoundingClientRect().width);
  const max = maxPaneWidth(pane, now, preview ? preview.getBoundingClientRect().width : 0);
  return { now, max };
}

// Poignée entre un panneau et l'aperçu (écrans larges) : glisser pour régler la largeur du panneau,
// flèches gauche / droite au clavier (Maj : par grands pas), Début / Fin pour les extrêmes,
// double-clic pour revenir à la largeur par défaut.
// side : 'left' si le panneau est à gauche de la poignée (éditeur), 'right' s'il est à droite (Apparence).
// Pendant le glissement, la largeur est posée directement sur le panneau (sans rendu React de
// toute l'application) ; elle n'est enregistrée qu'au relâchement, par onResize(largeur).
export default function PaneResizer({ paneRef, paneId, pane, side = 'left', label, onResize, onReset }) {
  const [metrics, setMetrics] = useState({ now: pane.defaultWidth, max: pane.defaultWidth });
  const [dragging, setDragging] = useState(false);
  const direction = side === 'left' ? 1 : -1;

  useEffect(() => {
    const paneEl = paneRef.current;
    if (!paneEl?.parentElement) return undefined;
    const update = () =>
      setMetrics((m) => {
        const next = measure(paneEl, pane);
        return next.now === m.now && next.max === m.max ? m : next;
      });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(paneEl);
    observer.observe(paneEl.parentElement);
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove(RESIZING_CLASS);
    };
  }, [paneRef, pane]);

  const onPointerDown = (e) => {
    const paneEl = paneRef.current;
    if (e.button !== 0 || !paneEl) return;
    e.preventDefault(); // ni sélection de texte, ni glisser-déposer natif
    const handle = e.currentTarget;
    const startX = e.clientX;
    const { now: start, max } = measure(paneEl, pane);
    let width = start;
    let moved = false;

    const onMove = (ev) => {
      const next = clampPaneWidth(pane, start + direction * (ev.clientX - startX), max);
      if (next === width) return;
      width = next;
      moved = true;
      paneEl.style.setProperty(pane.cssVar, `${width}px`);
    };
    const onEnd = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('lostpointercapture', onEnd);
      document.documentElement.classList.remove(RESIZING_CLASS);
      setDragging(false);
      if (moved) onResize(width);
    };

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('lostpointercapture', onEnd);
    handle.setPointerCapture(e.pointerId);
    document.documentElement.classList.add(RESIZING_CLASS);
    setDragging(true);
  };

  // Les flèches déplacent la poignée : vers la gauche, l'éditeur rétrécit et le panneau de droite s'élargit.
  const onKeyDown = (e) => {
    const paneEl = paneRef.current;
    if (!paneEl || e.altKey || e.ctrlKey || e.metaKey) return;
    const { now, max } = measure(paneEl, pane);
    const step = (e.shiftKey ? KEY_STEP_LARGE : KEY_STEP) * direction;
    const targets = {
      ArrowLeft: now - step,
      ArrowRight: now + step,
      Home: pane.min,
      End: max,
    };
    if (!(e.key in targets)) return;
    e.preventDefault();
    onResize(clampPaneWidth(pane, targets[e.key], max));
  };

  const now = Math.min(Math.max(metrics.now, pane.min), metrics.max);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-controls={paneId}
      aria-valuemin={pane.min}
      aria-valuemax={metrics.max}
      aria-valuenow={now}
      aria-valuetext={`${now} pixels`}
      tabIndex={0}
      title="Glisser pour élargir ou réduire ce panneau (double-clic : largeur par défaut)"
      className={`pane-resizer no-print${dragging ? ' is-dragging' : ''}`}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={onReset}
    />
  );
}

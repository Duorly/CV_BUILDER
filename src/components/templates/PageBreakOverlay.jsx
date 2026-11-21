import { useEffect, useRef, useState } from 'react';
import { measurePrintLayout } from '../../lib/pageGeometry';

// Indicateur de saut de page (écran uniquement) : un trait à l'endroit exact où
// Chrome commencera chaque nouvelle page, calculé par measurePrintLayout().
// Dans le template design, chaque colonne a son propre trait (elles se coupent
// indépendamment).

const MEASURE_DELAY_MS = 150;

function sameMarkers(a, b) {
  return (
    a.length === b.length &&
    a.every(
      (m, i) =>
        m.page === b[i].page &&
        m.column === b[i].column &&
        m.edge === b[i].edge &&
        Math.abs(m.top - b[i].top) < 0.5 &&
        Math.abs(m.left - b[i].left) < 0.5 &&
        Math.abs(m.width - b[i].width) < 0.5,
    )
  );
}

export default function PageBreakOverlay({ targetRef, mode, columns = [], revision }) {
  const [markers, setMarkers] = useState([]);
  const scheduleRef = useRef(() => {});
  const columnsKey = columns.join('|');

  useEffect(() => {
    const target = targetRef.current;
    if (!target || typeof window === 'undefined') return undefined;
    let timer = 0;
    let frame = 0;

    const measure = () => {
      // Pendant l'impression la page n'a plus la géométrie de l'écran.
      if (window.matchMedia?.('print').matches) return;
      const { breaks } = measurePrintLayout(target, mode, {
        columns: columnsKey ? columnsKey.split('|') : [],
      });
      const next = breaks.map((b) => ({ ...b, edge: b.left + b.width >= target.offsetWidth - 1 }));
      setMarkers((prev) => (sameMarkers(prev, next) ? prev : next));
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(measure);
      }, MEASURE_DELAY_MS);
    };

    scheduleRef.current = schedule;
    schedule();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    observer?.observe(target);
    const fonts = document.fonts;
    fonts?.addEventListener?.('loadingdone', schedule);
    window.addEventListener('afterprint', schedule);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      observer?.disconnect();
      fonts?.removeEventListener?.('loadingdone', schedule);
      window.removeEventListener('afterprint', schedule);
      scheduleRef.current = () => {};
    };
  }, [targetRef, mode, columnsKey]);

  // Le contenu a changé (saisie, réglages) : les sauts de page ont pu bouger
  // même si la hauteur totale est identique.
  useEffect(() => {
    scheduleRef.current();
  }, [revision]);

  return (
    <div className="page-break-overlay" aria-hidden="true">
      {markers.map((m) => (
        <div
          key={`${m.column}-${m.page}`}
          className={m.edge ? 'page-break-marker is-edge' : 'page-break-marker'}
          style={{ top: `${m.top}px`, left: `${m.left}px`, width: `${m.width}px` }}
        >
          <span className="page-break-label">Page {m.page}</span>
        </div>
      ))}
    </div>
  );
}

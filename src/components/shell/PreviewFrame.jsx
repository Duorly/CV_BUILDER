import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Shrink, TriangleAlert, ZoomIn, ZoomOut } from 'lucide-react';
import { bodyTextPt, measurePages } from '../../lib/pageGeometry';
import { FONT_SCALE_MIN } from '../../lib/schema';
import { defaultStorage } from '../../lib/storage';
import { formatNumber } from './format';
import { FIT, fitScale, readZoom, saveZoom, stepZoom } from './previewZoom';

const MIN_READABLE_PT = 9.5;

// Zoom de l'aperçu (FIT ou une échelle fixe), retenu par ce navigateur.
function usePreviewZoom() {
  const [zoom, setZoom] = useState(() => readZoom(defaultStorage()));
  const changeZoom = useCallback((next) => {
    setZoom(next);
    saveZoom(defaultStorage(), next);
  }, []);
  return [zoom, changeZoom];
}

// Aperçu du document actif : ajusté à la place disponible ou zoomé (écran seulement),
// avec le nombre de pages imprimées et « Ajuster à 1 page ».
// `mode` = mode d'impression ('design' | 'ats' | 'letter'), qui fixe la géométrie de page.
// onPagesChange(pages) : nombre de pages de l'aperçu, à chaque changement.
// pdfPagesAt(fontScale) (modèle ATS) : nombre de pages du PDF ATS direct à cette taille. Ce PDF,
// recommandé pour les sites carrières, a sa propre mise en page : « Ajuster à 1 page » le vérifie aussi.
export default function PreviewFrame({
  mode,
  lang,
  fontScale,
  onFontScaleChange,
  onPagesChange,
  pdfPagesAt,
  notify,
  children,
}) {
  const paneRef = useRef(null);
  const areaRef = useRef(null);
  // fit : échelle qui fait tenir le document dans la colonne (au plus 1).
  const [geom, setGeom] = useState({ fit: 1, width: 0, height: 0 });
  const [zoom, setZoom] = usePreviewZoom();
  const [pages, setPages] = useState(1);
  const [fitting, setFitting] = useState(false);

  useEffect(() => {
    onPagesChange?.(pages);
  }, [pages, onPagesChange]);

  const countPagesNow = useCallback(() => {
    const doc = areaRef.current?.firstElementChild;
    return doc ? measurePages(doc, mode) : 1;
  }, [mode]);

  // recount: false quand seule la place disponible a changé (poignée de l'éditeur, fenêtre) :
  // le document garde sa taille, donc son nombre de pages, coûteux à recompter à chaque image.
  const measure = useCallback(({ recount = true } = {}) => {
    const pane = paneRef.current;
    const area = areaRef.current;
    if (!pane || !area) return;
    // offsetWidth / offsetHeight ignorent la transformation : tailles réelles du document.
    const width = area.offsetWidth;
    const height = area.offsetHeight;
    const style = getComputedStyle(pane);
    const available = pane.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    if (width > 0 && available > 0) {
      const fit = fitScale(available, width);
      setGeom((g) => (g.fit === fit && g.width === width && g.height === height ? g : { fit, width, height }));
      if (recount) setPages(countPagesNow());
    }
  }, [countPagesNow]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const observer = new ResizeObserver((entries) =>
      measure({ recount: entries.some((entry) => entry.target === areaRef.current) }),
    );
    observer.observe(paneRef.current);
    observer.observe(areaRef.current);
    document.fonts?.ready.then(() => measure()).catch(() => {});
    return () => observer.disconnect();
  }, [measure]);

  // Le document garde une hauteur minimale d'une page à l'écran : du contenu peut
  // s'ajouter sans changer sa taille (donc sans ResizeObserver). On recompte
  // les pages un court instant après chaque modification.
  useEffect(() => {
    const timer = setTimeout(() => measure(), 150);
    return () => clearTimeout(timer);
  });

  const canFit = mode !== 'letter' && typeof onFontScaleChange === 'function';

  // Plus grande taille (en %, entre min et fits) à laquelle le PDF ATS direct tient sur une page ;
  // null s'il dépasse même au minimum, ou si le PDF n'a pas pu être généré (on garde alors l'aperçu).
  const pdfFit = async (min, fits) => {
    try {
      if ((await pdfPagesAt(fits / 100)) <= 1) return fits;
      if ((await pdfPagesAt(min / 100)) > 1) return null;
      let lo = min;
      let hi = fits;
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        if ((await pdfPagesAt(mid / 100)) <= 1) lo = mid;
        else hi = mid;
      }
      return lo;
    } catch {
      return fits;
    }
  };

  const fitOnePage = async () => {
    if (fitting) return;
    const original = fontScale;
    const pagesAt = (scale) => {
      flushSync(() => onFontScaleChange(scale));
      return countPagesNow();
    };
    const min = Math.round(FONT_SCALE_MIN * 100);
    if (pagesAt(min / 100) > 1) {
      flushSync(() => onFontScaleChange(original));
      notify?.(
        'Même avec le plus petit texte, le CV dépasse une page : essayez des marges étroites et un espacement serré (Apparence), masquez ou raccourcissez le contenu (puces les moins parlantes, expériences anciennes…).',
        { tone: 'error' },
      );
      return;
    }
    // Recherche de la plus grande taille qui tient sur une page.
    let fits = min;
    let tooBig = Math.round(original * 100);
    while (tooBig - fits > 1) {
      const mid = Math.floor((fits + tooBig) / 2);
      if (pagesAt(mid / 100) <= 1) fits = mid;
      else tooBig = mid;
    }
    flushSync(() => onFontScaleChange(fits / 100));
    measure();
    let pdfTooLong = false;
    if (mode === 'ats' && typeof pdfPagesAt === 'function') {
      setFitting(true);
      const pdfFits = await pdfFit(min, fits);
      setFitting(false);
      if (pdfFits === null) pdfTooLong = true;
      else if (pdfFits < fits) {
        fits = pdfFits;
        flushSync(() => onFontScaleChange(fits / 100));
        measure();
      }
    }
    if (pdfTooLong) {
      notify?.(
        `L’aperçu tient sur 1 page (texte à ${fits} %), mais pas le PDF ATS en téléchargement direct, dont la mise en page diffère : dans « Télécharger », choisissez « PDF ATS via l’impression », ou raccourcissez un peu le contenu.`,
        { tone: 'info', duration: 10000, action: { label: 'Annuler', onClick: () => onFontScaleChange(original) } },
      );
      return;
    }
    const pt = bodyTextPt(fits / 100, mode);
    const small = pt < MIN_READABLE_PT;
    notify?.(
      `Le CV tient sur 1 page : texte réduit à ${fits} % (≈ ${formatNumber(pt)} pt).${
        small ? ' C’est petit : raccourcir un peu le contenu serait plus lisible.' : ''
      }`,
      { tone: small ? 'info' : 'success', action: { label: 'Annuler', onClick: () => onFontScaleChange(original) } },
    );
  };

  const { fit, width, height } = geom;
  const scale = zoom === FIT ? fit : zoom;
  const zoomOut = stepZoom(scale, -1);
  const zoomIn = stepZoom(scale, 1);
  // Les marges compensent la mise à l'échelle (le transform ne change pas la place occupée) :
  // négatives en réduction, positives en agrandissement, pour que le défilement suive.
  const scaleStyle =
    scale !== 1
      ? {
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          marginRight: -width * (1 - scale),
          marginBottom: -height * (1 - scale),
        }
      : undefined;

  const tooLong = mode === 'letter' ? pages > 1 : pages > 2;
  const warning = tooLong
    ? mode === 'letter'
      ? 'Une lettre tient idéalement sur une page.'
      : 'Au-delà de 2 pages, un CV est rarement lu en entier.'
    : '';

  return (
    <div className="preview-pane" ref={paneRef}>
      <div className="preview-toolbar no-print">
        <span className={`badge ${tooLong ? 'badge-warn' : ''}`} title="Nombre de pages une fois imprimé ou en PDF">
          {pages} page{pages > 1 ? 's' : ''}
        </span>
        {warning && (
          <span className="preview-warning">
            <TriangleAlert size={14} aria-hidden="true" />
            {warning}
          </span>
        )}
        {canFit && (pages > 1 || fitting) && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={fitOnePage}
            disabled={fitting}
            aria-busy={fitting || undefined}
            title="Réduit la taille du texte jusqu’à tenir sur une page"
          >
            <Shrink size={14} aria-hidden="true" />
            {fitting ? 'Vérification du PDF…' : 'Ajuster à 1 page'}
          </button>
        )}
        <div className="preview-zoom" role="group" aria-label="Zoom de l’aperçu">
          <button
            type="button"
            className="icon-btn"
            aria-label="Réduire l’aperçu"
            title="Réduire l’aperçu"
            disabled={!zoomOut}
            onClick={() => setZoom(zoomOut)}
          >
            <ZoomOut size={15} />
          </button>
          <span
            className="preview-zoom-value"
            aria-live="polite"
            title="Taille de l’aperçu à l’écran : le PDF et l’impression ne changent pas."
          >
            {Math.round(scale * 100)} %
          </span>
          <button
            type="button"
            className="icon-btn"
            aria-label="Agrandir l’aperçu"
            title="Agrandir l’aperçu"
            disabled={!zoomIn}
            onClick={() => setZoom(zoomIn)}
          >
            <ZoomIn size={15} />
          </button>
          {zoom !== FIT ? (
            <button
              type="button"
              className="btn btn-sm"
              title="Ajuste l’aperçu à la largeur de sa colonne"
              onClick={() => setZoom(FIT)}
            >
              Adapter
            </button>
          ) : (
            fit < 1 && (
              <button
                type="button"
                className="btn btn-sm"
                title="Affiche le document à sa taille réelle (faites défiler pour voir le reste)"
                onClick={() => setZoom(1)}
              >
                Taille réelle
              </button>
            )
          )}
        </div>
      </div>
      <div className="preview-scale" style={scaleStyle}>
        <div className="print-area" ref={areaRef} lang={lang}>
          {children}
        </div>
      </div>
    </div>
  );
}

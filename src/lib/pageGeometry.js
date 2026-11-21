// Géométrie de page partagée entre l'aperçu (indicateur de saut de page,
// compteur de pages) et l'impression (PrintStyles + print.css).

export const PX_PER_MM = 96 / 25.4;
export const PAGE_WIDTH_MM = 210;
export const PAGE_HEIGHT_MM = 297;

// Marges @page appliquées à l'impression, par mode (marges latérales : 0).
// « design » n'a pas de marge de page pour que le fond de la sidebar touche les
// bords : l'espace en haut et en bas de chaque page est un padding des colonnes,
// répété à chaque page (box-decoration-break: clone, cf. src/styles/resume.css).
export const PRINT_MARGINS_MM = {
  design: { top: 0, bottom: 0 },
  ats: { top: 14, bottom: 14 },
  letter: { top: 20, bottom: 20 },
};

// `marginScale` : réglage « Marges » du CV (schema.js, MARGIN_OPTIONS). Seules les marges
// @page du modèle ATS en dépendent ; dans « design », ce sont les paddings des colonnes.
const roundMm = (mm) => Math.round(mm * 10) / 10;

export function printMargins(mode = 'design', marginScale = 1) {
  const base = PRINT_MARGINS_MM[mode] || PRINT_MARGINS_MM.design;
  if (mode !== 'ats' || marginScale === 1) return base;
  return { top: roundMm(base.top * marginScale), bottom: roundMm(base.bottom * marginScale) };
}

// Règle CSS @page d'un mode (rendue par <PrintStyles />).
export function printPageRule(mode = 'design', marginScale = 1) {
  const { top, bottom } = printMargins(mode, marginScale);
  const margin = top === bottom ? (top ? `${top}mm 0` : '0') : `${top}mm 0 ${bottom}mm`;
  return `@page { size: A4; margin: ${margin}; }`;
}

// Hauteur de contenu utile par page imprimée.
export function usablePageHeightMm(mode = 'design', marginScale = 1) {
  const m = printMargins(mode, marginScale);
  return PAGE_HEIGHT_MM - m.top - m.bottom;
}

// Réglage « Marges » posé sur la racine du document (themeStyle, --margin-scale).
function marginScaleOf(element) {
  const value = Number(element.style?.getPropertyValue('--margin-scale'));
  return Number.isFinite(value) && value > 0 ? value : 1;
}

// Estimation sans DOM, à partir de la hauteur NON transformée du contenu.
// Ignore les éléments repoussés à la page suivante : préférez measurePages().
// `verticalPaddingPx` = padding vertical du conteneur à l'écran qui n'existe pas à l'impression.
export function countPages(contentHeightPx, mode = 'design', verticalPaddingPx = 0) {
  const heightMm = Math.max(0, contentHeightPx - verticalPaddingPx) / PX_PER_MM;
  return Math.max(1, Math.ceil((heightMm - 0.5) / usablePageHeightMm(mode)));
}

// Taille du corps de texte (puces) à fontScale = 1 : 10 pt dans les deux templates.
// Doit rester identique au CSS : `.exp-details` (resume.css) et `.ats-detail-list`
// (resume-ats.css) ont `font-size: calc(10pt * var(--font-scale))`.
export const BODY_TEXT_PT = { design: 10, ats: 10 };
export const BODY_TEXT_PX = {
  design: (BODY_TEXT_PT.design * 96) / 72,
  ats: (BODY_TEXT_PT.ats * 96) / 72,
};

export function bodyTextPt(fontScale, template = 'design') {
  const base = BODY_TEXT_PT[template] || BODY_TEXT_PT.design;
  const scale = Number(fontScale);
  return Math.round(base * (Number.isFinite(scale) && scale > 0 ? scale : 1) * 10) / 10;
}

// ── Simulation de l'impression ───────────────────────────────────────────
// Un clone du document est mis en page dans un conteneur multicolonne caché dont
// chaque colonne a la taille de la zone imprimable d'une page. Chrome fragmente
// les colonnes avec le même moteur que l'impression (break-inside / break-after,
// padding répété par box-decoration-break…) : nombre de colonnes = nombre de pages.

// Éléments propres à l'écran (.no-print : masqués par print.css, ex. l'aide
// « lettre vide ») ou à l'impression (fond fixe de la sidebar) : retirés du clone.
const MEASURE_SKIP = '.page-break-overlay, .print-sidebar-bg, .no-print';
export const MEASURE_HOST_CLASS = 'page-measure-host';

function canSimulate(element) {
  return Boolean(
    element &&
      element.isConnected &&
      typeof window !== 'undefined' &&
      element.ownerDocument?.body &&
      typeof element.getClientRects === 'function',
  );
}

function withPrintSimulation(element, mode, read) {
  const doc = element.ownerDocument;
  const scale = marginScaleOf(element);
  const margins = printMargins(mode, scale);
  const host = doc.createElement('div');
  host.className = MEASURE_HOST_CLASS;
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: 0',
    'z-index: -1',
    'visibility: hidden',
    'pointer-events: none',
    'overflow: hidden',
    'margin: 0',
    'padding: 0',
    'border: 0',
    `width: ${PAGE_WIDTH_MM}mm`,
    // À l'impression, Chrome arrondit la hauteur utile de la page au px supérieur
    // (297 mm = 1122,52 px → 1123 px) : même arrondi ici, sinon un élément qui
    // tient de justesse serait annoncé sur la page suivante.
    `height: ${Math.ceil(usablePageHeightMm(mode, scale) * PX_PER_MM)}px`,
    `column-width: ${PAGE_WIDTH_MM}mm`,
    'column-gap: 0',
    'column-fill: auto',
  ].join(';');

  const clone = element.cloneNode(true);
  clone.removeAttribute('id');
  clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  clone.querySelectorAll(MEASURE_SKIP).forEach((node) => node.remove());
  // Ce qui diffère entre l'écran et l'impression (cf. print.css) : la hauteur
  // minimale d'une page et, quand la page a des marges @page, le padding vertical
  // qui les représente à l'écran.
  clone.style.minHeight = '0';
  clone.style.margin = '0';
  if (margins.top || margins.bottom) {
    clone.style.paddingTop = '0';
    clone.style.paddingBottom = '0';
  }

  host.appendChild(clone);
  doc.body.appendChild(host);
  try {
    const hostRect = host.getBoundingClientRect();
    return read({ clone, hostLeft: hostRect.left, pageWidthPx: hostRect.width });
  } finally {
    host.remove();
  }
}

// Éléments « feuilles » d'une colonne, dans l'ordre du flux (même parcours sur
// l'original et sur le clone, ce qui permet de les apparier par index).
function leafElements(root) {
  const leaves = [];
  const walk = (node) => {
    for (const child of node.children) {
      if (child.matches(MEASURE_SKIP)) continue;
      if (child.children.length === 0 || child.tagName.toLowerCase() === 'svg') leaves.push(child);
      else walk(child);
    }
  };
  walk(root);
  return leaves;
}

// Position à l'écran (px non transformés, relatifs à la racine) du début de
// chaque page 2, 3… pour une colonne de texte.
function columnBreaks({ liveColumn, cloneColumn, hostLeft, pageWidthPx, rootRect, scale }) {
  const liveLeaves = leafElements(liveColumn);
  const cloneLeaves = leafElements(cloneColumn);
  if (liveLeaves.length !== cloneLeaves.length) return [];

  const colRect = liveColumn.getBoundingClientRect();
  const left = (colRect.left - rootRect.left) / scale;
  const width = colRect.width / scale;
  const breaks = [];
  let page = 0;
  let prevBottom = null;

  cloneLeaves.forEach((leaf, i) => {
    const rects = Array.from(leaf.getClientRects()).filter((r) => r.width > 1 || r.height > 1);
    if (!rects.length) return;
    const pages = rects.map((r) => Math.max(0, Math.floor((r.left - hostLeft + 1) / pageWidthPx)));
    const lastPage = Math.max(...pages);
    const liveRect = liveLeaves[i].getBoundingClientRect();
    const top = (liveRect.top - rootRect.top) / scale;

    for (let k = page + 1; k <= lastPage; k += 1) {
      // Hauteur de cet élément déjà imprimée sur les pages précédentes (élément coupé).
      const before = rects.reduce((sum, r, j) => (pages[j] < k ? sum + r.height : sum), 0);
      let y = top + before;
      if (!before && prevBottom !== null && prevBottom <= top) y = (prevBottom + top) / 2;
      breaks.push({ page: k + 1, top: Math.round(y * 10) / 10, left, width });
    }
    page = Math.max(page, lastPage);
    prevBottom = (liveRect.bottom - rootRect.top) / scale;
  });
  return breaks;
}

// Mise en page imprimée d'un document (#resume-root, #letter-root…).
// `columns` : sélecteurs des colonnes qui se fragmentent indépendamment
// (ex. ['.sidebar', '.main-content']) ; par défaut, la racine elle-même.
// → { pages, breaks: [{ page, top, left, width }] } (positions en px non transformés).
export function measurePrintLayout(element, mode = 'design', { columns = [], withBreaks = true } = {}) {
  if (!canSimulate(element)) {
    return { pages: countPages(element?.offsetHeight || 0, mode), breaks: [] };
  }
  return withPrintSimulation(element, mode, ({ clone, hostLeft, pageWidthPx }) => {
    const pages = Math.max(1, clone.getClientRects().length);
    if (!withBreaks || pages < 2 || !element.offsetWidth) return { pages, breaks: [] };

    const rootRect = element.getBoundingClientRect();
    const scale = rootRect.width / element.offsetWidth || 1;
    const selectors = columns.length ? columns : [null];
    const breaks = selectors.flatMap((selector) => {
      const liveColumn = selector ? element.querySelector(selector) : element;
      const cloneColumn = selector ? clone.querySelector(selector) : clone;
      if (!liveColumn || !cloneColumn) return [];
      return columnBreaks({ liveColumn, cloneColumn, hostLeft, pageWidthPx, rootRect, scale }).map((b) => ({
        ...b,
        column: selector || 'root',
      }));
    });
    return { pages, breaks };
  });
}

// Nombre de pages qu'imprimera Chrome pour cet élément.
export function measurePages(element, mode = 'design') {
  return measurePrintLayout(element, mode, { withBreaks: false }).pages;
}

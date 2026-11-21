// Fenêtre « Télécharger » : PDF ATS direct, impression (PDF design, PDF ATS, lettre) et retours
// vers l'aperçu du modèle voulu.
import { downloadResumePdf, renderResumePdf } from '../lib/pdfExport';
import { designStyleLabel, designStyleLayout } from '../lib/schema';

// setPrintOverride : modèle forcé le temps d'une impression (null ensuite).
// fileBase / designFileBase : noms proposés pour le document affiché et pour la version design.
export function useDownload({ store, notify, setDialog, setMobilePane, setPrintOverride, fileBase, designFileBase }) {
  const { cv } = store;

  const startPrint = (mode) => {
    const title = mode === 'design' ? designFileBase : fileBase;
    setDialog(null);
    setPrintOverride(mode === 'letter' ? null : mode);
    const print = () => {
      const fallbackEvents = ['pointerdown', 'keydown'];
      let restored = false;
      const restore = () => {
        if (restored) return;
        restored = true;
        window.removeEventListener('afterprint', restore);
        fallbackEvents.forEach((type) => window.removeEventListener(type, restore));
        document.title = fileBase;
        setPrintOverride(null);
      };
      window.addEventListener('afterprint', restore);
      document.title = title;
      window.print();
      // Filet : si le navigateur n'émet pas « afterprint », le modèle choisi
      // revient dès que l'utilisatrice reprend la main sur la page.
      if (!restored) fallbackEvents.forEach((type) => window.addEventListener(type, restore));
    };
    // Polices affichées chargées d'abord : une police choisie à l'instant serait sinon remplacée par
    // celle de secours dans le PDF. Au plus 3 s d'attente.
    const afterFonts = (callback) =>
      Promise.race([document.fonts?.ready, new Promise((resolve) => setTimeout(resolve, 3000))])
        .catch(() => {})
        .then(callback);
    // Deux images : React affiche d'abord le bon modèle, puis le navigateur imprime.
    requestAnimationFrame(() => requestAnimationFrame(() => afterFonts(print)));
  };

  // Le PDF direct est généré dès l'ouverture de la fenêtre « Télécharger » : elle annonce
  // ainsi son nombre de pages réel, et le téléchargement reprend ce même fichier.
  const preparePdf = (fileName) => renderResumePdf({ data: cv.data, settings: cv.settings, fileName });
  // « Ajuster à 1 page » (modèle ATS) vérifie aussi le PDF direct, dont la mise en page diffère de l'aperçu.
  const pdfPagesAt = (fontScale) =>
    renderResumePdf({ data: cv.data, settings: { ...cv.settings, fontScale } }).then((result) => result.pages);

  const directPdf = async (prepared) => {
    await downloadResumePdf({ prepared });
    notify(`PDF téléchargé : ${prepared.name}`, { tone: 'success' });
  };

  const showDesignPreview = () => {
    setDialog(null);
    setMobilePane('preview');
    store.updateSettings({ template: 'design' });
    notify(
      `Aperçu ${designStyleLabel(cv.settings)} affiché : ${designStyleLayout(cv.settings)} et vos couleurs, comme le « PDF design via l’impression ». Le modèle se change dans « Apparence ».`,
      { duration: 8000 },
    );
  };

  const showAtsPreview = () => {
    setDialog(null);
    setMobilePane('preview');
    store.updateSettings({ template: 'ats' });
    notify(
      'Aperçu ATS affiché : même contenu et même présentation une colonne que le PDF recommandé, mais ses sauts de page peuvent différer. Le nombre exact de pages du PDF est indiqué dans « Télécharger ». Le modèle se change dans « Apparence ».',
      { duration: 9000 },
    );
  };

  return { startPrint, preparePdf, pdfPagesAt, directPdf, showDesignPreview, showAtsPreview };
}

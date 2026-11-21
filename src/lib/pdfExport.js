import { createElement } from 'react';
import { normalizeData, normalizeSettings } from './schema';
import { downloadBlob } from './files';

// « CV_Camille_Martin » ou « CV_Camille_Martin.pdf » → « CV_Camille_Martin.pdf ».
export function pdfFileName(fileName) {
  const base = String(fileName || '')
    .trim()
    .replace(/\.pdf$/i, '')
    .replace(/[\\/:*?"<>|]+/g, '_');
  return `${base || 'CV'}.pdf`;
}

// Le moteur PDF pèse plusieurs centaines de Ko : il n'est chargé qu'au premier téléchargement.
function loadPdfModules() {
  return Promise.all([import('@react-pdf/renderer'), import('../components/pdf/ResumePdfDocument')]);
}

// Nombre de pages d'un PDF produit par react-pdf (objets « /Type /Page », hors « /Pages »).
export async function countPdfPages(blob) {
  try {
    const text = new TextDecoder('latin1').decode(await blob.arrayBuffer());
    return (text.match(/\/Type\s*\/Page\b/g) || []).length;
  } catch {
    return 0;
  }
}

// Génère la version ATS du CV en PDF texte (sélectionnable, liens cliquables), sans la
// télécharger : la fenêtre « Télécharger » annonce ainsi le nombre de pages réel.
// Retourne { blob, name, pages }.
export async function renderResumePdf({ data, settings, fileName } = {}) {
  const name = pdfFileName(fileName);

  let renderer;
  let documentModule;
  try {
    [renderer, documentModule] = await loadPdfModules();
  } catch (error) {
    throw new Error(
      "Le module de création du PDF n'a pas pu être chargé (connexion interrompue ou application mise à jour). Rechargez la page puis réessayez.",
      { cause: error },
    );
  }

  let blob;
  try {
    const element = createElement(documentModule.default, {
      data: normalizeData(data),
      settings: normalizeSettings(settings),
      title: name.slice(0, -'.pdf'.length),
    });
    blob = await renderer.pdf(element).toBlob();
  } catch (error) {
    console.error('Création du PDF impossible', error);
    throw new Error(
      'La création du PDF a échoué. En attendant, vous pouvez utiliser « Imprimer » puis choisir « Enregistrer au format PDF ».',
      { cause: error },
    );
  }

  return { blob, name, pages: await countPdfPages(blob) };
}

// Génère la version ATS du CV (ou reprend celle déjà générée) et la télécharge.
export async function downloadResumePdf({ prepared, ...options } = {}) {
  const { blob, name } = prepared || (await renderResumePdf(options));
  downloadBlob(blob, name);
}

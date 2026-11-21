// Lecture d'un fichier choisi dans « Fichier → Importer » ou sur l'écran d'accueil : sauvegarde
// complète ou CV exporté (.json), vérifié et normalisé avant d'entrer dans la bibliothèque.
import { readFileAsText, sanitizePhoto } from '../lib/files';
import { parseImport } from '../lib/storage';

const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

// Une photo importée (ancienne sauvegarde : photo brute, avec ses métadonnées EXIF)
// est recadrée et réencodée comme une photo choisie dans l'éditeur.
async function withCleanPhoto(cv) {
  const photo = cv.data.personalInfo.photo;
  if (!photo) return cv;
  const cleaned = await sanitizePhoto(photo);
  if (cleaned === photo) return cv;
  return { ...cv, data: { ...cv.data, personalInfo: { ...cv.data.personalInfo, photo: cleaned } } };
}

// { kind: 'cv', cv } ou { kind: 'library', library } ; lève une erreur au message lisible sinon.
export async function readImportFile(file) {
  if (file.size > MAX_IMPORT_BYTES) throw new Error('Ce fichier est trop volumineux pour être une sauvegarde de CV.');
  const text = await readFileAsText(file);
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`« ${file.name} » n’est pas un fichier JSON lisible. Choisissez une sauvegarde exportée depuis CV Builder.`);
  }
  const parsed = parseImport(json);
  if (parsed.kind === 'cv') return { ...parsed, cv: await withCleanPhoto(parsed.cv) };
  return { ...parsed, library: { ...parsed.library, cvs: await Promise.all(parsed.library.cvs.map(withCleanPhoto)) } };
}

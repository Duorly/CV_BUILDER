// Noms de fichiers, téléchargements et traitement de la photo.

// Lettres que la décomposition Unicode ne ramène pas à l'ASCII (« Lætitia », « Cœur », « Weiß »…).
const TRANSLITERATIONS = {
  æ: 'ae',
  Æ: 'AE',
  œ: 'oe',
  Œ: 'OE',
  ø: 'o',
  Ø: 'O',
  ß: 'ss',
  ẞ: 'SS',
  ł: 'l',
  Ł: 'L',
  đ: 'd',
  Đ: 'D',
  ð: 'd',
  Ð: 'D',
  ħ: 'h',
  Ħ: 'H',
  ı: 'i',
  ŀ: 'l',
  Ŀ: 'L',
  ŧ: 't',
  Ŧ: 'T',
  þ: 'th',
  Þ: 'TH',
};
const TRANSLITERABLE = new RegExp(`[${Object.keys(TRANSLITERATIONS).join('')}]`, 'g');

export function slugifyPart(value) {
  return String(value || '')
    .replace(TRANSLITERABLE, (ch) => TRANSLITERATIONS[ch])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// « CV_Camille_Martin_Decathlon » — sert de nom de fichier ET de document.title
// (le titre de la page devient le nom proposé par « Enregistrer en PDF »).
export function buildFileBase({ prefix = 'CV', name = '', company = '' } = {}) {
  return [prefix, slugifyPart(name), slugifyPart(company)].filter(Boolean).join('_');
}

export function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJson(obj, filename) {
  downloadBlob(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' }), filename);
}

export function downloadText(text, filename, mime = 'text/plain;charset=utf-8') {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Lecture du fichier impossible'));
    reader.readAsText(file, 'UTF-8');
  });
}

export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, release: () => URL.revokeObjectURL(url) });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Ce fichier n'est pas une image lisible"));
    };
    img.src = url;
  });
}

// Position par défaut du carré dans une photo plus haute que large (0 = en haut, 0,5 = au
// centre) : sur une photo de téléphone en buste, le visage est dans le haut de l'image, et un
// carré central couperait le haut de la tête. 0,25 garde aussi le menton d'un portrait serré.
export const PORTRAIT_FOCUS = 0.25;

// Position par défaut du carré le long du grand côté de l'image (centrée si elle est plus large que haute).
export const defaultCropFocus = (width, height) => (height > width ? PORTRAIT_FOCUS : 0.5);

// Découpe un carré dans une image déjà chargée, le réduit et le réencode en JPEG.
// focus : position du carré le long du grand côté (0 = haut ou gauche, 1 = bas ou droite).
export function cropSquare(img, { size = 400, quality = 0.85, focus } = {}) {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const side = Math.min(w, h);
  const f = Math.min(1, Math.max(0, Number.isFinite(focus) ? focus : defaultCropFocus(w, h)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(size, side);
  canvas.height = canvas.width;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Seul le grand côté dépasse du carré : c'est le long de lui que `focus` déplace la découpe.
  ctx.drawImage(img, (w - side) * f, (h - side) * f, side, side, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

// Recadre en carré (vers le haut pour une photo en hauteur), réduit et réencode en JPEG :
// ~40 Ko au lieu de plusieurs Mo, et les métadonnées EXIF (GPS…) disparaissent.
export async function compressImage(file, options = {}) {
  const { img, release } = await loadImage(file);
  try {
    return cropSquare(img, options);
  } finally {
    release();
  }
}

const CLEAN_JPEG_MAX_BYTES = 150 * 1024;

function base64ToBytes(base64) {
  const binary = atob(base64.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// JPEG déjà produit par compressImage : petit, sans segment de métadonnées (EXIF, XMP,
// commentaire) avant les données de l'image. Le réencoder le dégraderait à chaque import.
function isCleanJpeg(mime, bytes) {
  if (mime !== 'image/jpeg' || bytes.length > CLEAN_JPEG_MAX_BYTES) return false;
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return false;
    const marker = bytes[i + 1];
    if (marker === 0xda) return true; // début des données de l'image
    if ((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe) return false;
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  return false;
}

// Photo venue d'un fichier importé (ancienne sauvegarde : photo brute du téléphone, avec
// sa position GPS) : elle passe par le même traitement qu'une photo choisie dans l'éditeur.
// Retourne la photo nettoyée, ou '' si ce n'est pas une image lisible.
export async function sanitizePhoto(photo) {
  const value = String(photo || '');
  const match = /^data:(image\/[\w.+-]+);base64,/i.exec(value);
  if (!match) return '';
  try {
    const mime = match[1].toLowerCase();
    const bytes = base64ToBytes(value.slice(match[0].length));
    if (isCleanJpeg(mime, bytes)) return value;
    return await compressImage(new Blob([bytes], { type: mime }));
  } catch {
    return '';
  }
}

export function prettyUrl(url) {
  return String(url || '')
    .trim()
    .replace(/^(https?:\/\/|mailto:)/i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '');
}

const BARE_EMAIL = /^[^\s/@:]+@[^\s/@]+\.[^\s/@]+$/;

// Ajoute https:// si l'utilisatrice a tapé « linkedin.com/in/… », et mailto: pour une
// adresse e-mail nue (sinon « camille@exemple.fr » ouvrirait le site exemple.fr).
export function absoluteUrl(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
  if (BARE_EMAIL.test(u)) return `mailto:${u}`;
  return `https://${u}`;
}

// « +33 (0)6 12 34 56 78 » → tel:+33612345678 (le « (0) » ne se compose pas depuis l'étranger).
export function telHref(phone) {
  const digits = String(phone || '')
    .replace(/\(0\)/g, '')
    .replace(/[^\d+]/g, '');
  return /\d/.test(digits) ? `tel:${digits}` : '';
}

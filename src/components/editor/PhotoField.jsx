import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, LoaderCircle, Trash2 } from 'lucide-react';
import { cropSquare, defaultCropFocus, loadImage } from '../../lib/files';
import { focusSoon } from './editorUi';

const MAX_FILE_BYTES = 30 * 1024 * 1024;

function photoError(file) {
  if (file.type && !file.type.startsWith('image/')) {
    return "Ce fichier n'est pas une image. Choisissez une photo au format JPG, PNG ou WEBP.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'Cette image est trop lourde (plus de 30 Mo). Choisissez une photo plus légère.';
  }
  return '';
}

// Image plus haute que large (ou l'inverse) d'au moins 5 % : le cadrage peut être déplacé.
const canMoveCrop = (w, h) => Math.abs(w - h) / Math.max(w, h) > 0.05;

// Photo du CV : recadrée en carré et allégée à l'import (les métadonnées disparaissent).
// Juste après le choix, un curseur permet de déplacer le cadrage (l'image d'origine n'est
// gardée qu'en mémoire, le temps de la session : seule la photo recadrée est enregistrée).
// onContactCommit({ field: 'photo', before, after }) : la photo a changé (voir App).
export default function PhotoField({ photo, showPhoto, template, update, updateSettings, onContactCommit }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sourceRef = useRef(null); // { img, release } de la dernière photo choisie
  const lastCropRef = useRef('');
  const frameRef = useRef(0);
  const [crop, setCrop] = useState(null); // { focus, landscape } tant que le recadrage est possible

  const forgetSource = () => {
    cancelAnimationFrame(frameRef.current);
    sourceRef.current?.release();
    sourceRef.current = null;
    lastCropRef.current = '';
    setCrop(null);
  };

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      sourceRef.current?.release();
    },
    [],
  );

  // Photo remplacée autrement (annuler, autre version, import) : le curseur ne la concerne plus.
  useEffect(() => {
    if (sourceRef.current && photo !== lastCropRef.current) forgetSource();
  }, [photo]);

  const pickFile = () => inputRef.current?.click();

  const handleFile = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    setError('');
    const invalid = photoError(file);
    if (invalid) {
      setError(invalid);
      input.value = '';
      return;
    }
    setBusy(true);
    let loaded = null;
    try {
      loaded = await loadImage(file);
      const { img } = loaded;
      const focus = defaultCropFocus(img.naturalWidth, img.naturalHeight);
      const dataUrl = cropSquare(img, { focus });
      const before = photo;
      forgetSource();
      lastCropRef.current = dataUrl;
      update((draft) => {
        draft.personalInfo.photo = dataUrl;
      }, { checkpoint: true });
      if (showPhoto === false) updateSettings({ showPhoto: true });
      if (canMoveCrop(img.naturalWidth, img.naturalHeight)) {
        sourceRef.current = loaded;
        loaded = null;
        setCrop({ focus, landscape: img.naturalWidth > img.naturalHeight });
      }
      onContactCommit?.({ field: 'photo', before, after: dataUrl });
    } catch {
      setError(
        "Impossible de lire cette image (certains formats, comme le HEIC des iPhone, ne sont pas pris en charge). " +
          'Enregistrez-la en JPG ou PNG, puis réessayez.',
      );
    } finally {
      loaded?.release();
      setBusy(false);
      // Permet de choisir à nouveau le même fichier.
      input.value = '';
    }
  };

  // Le curseur redécoupe la photo d'origine (une image par rafraîchissement d'écran au plus).
  const moveCrop = (e) => {
    const focus = Number(e.target.value) / 100;
    setCrop((c) => (c ? { ...c, focus } : c));
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const source = sourceRef.current;
      if (!source) return;
      const dataUrl = cropSquare(source.img, { focus });
      lastCropRef.current = dataUrl;
      update((draft) => {
        draft.personalInfo.photo = dataUrl;
      });
    });
  };

  const removePhoto = () => {
    const before = photo;
    forgetSource();
    update((draft) => {
      draft.personalInfo.photo = '';
    }, { checkpoint: true });
    setError('');
    focusSoon('ed-photo-pick');
    onContactCommit?.({ field: 'photo', before, after: '' });
  };

  return (
    <div className="editor-photo">
      <div className="photo-upload-container">
        {/* Raccourci souris : le bouton texte ci-dessous fait la même chose au clavier. */}
        <button
          type="button"
          className="photo-preview-wrapper"
          onClick={pickFile}
          disabled={busy}
          tabIndex={-1}
          aria-hidden="true"
          title={photo ? 'Changer la photo' : 'Ajouter une photo'}
        >
          {photo ? (
            <img src={photo} alt="" className="photo-preview-img" />
          ) : (
            <span className="photo-placeholder">
              <Camera size={24} aria-hidden="true" />
            </span>
          )}
          <span className="photo-upload-overlay" aria-hidden="true">
            <ImagePlus size={16} />
            <span>{photo ? 'Changer' : 'Ajouter'}</span>
          </span>
        </button>
        <div className="photo-upload-info">
          <span className="editor-photo-title">Photo (facultative)</span>
          <p>
            Recadrée en carré et allégée automatiquement. Choisissez une photo où votre visage est bien visible :
            vous pourrez ensuite ajuster le cadrage.
          </p>
          <div className="editor-photo-actions">
            <button type="button" id="ed-photo-pick" className="add-btn-tiny" onClick={pickFile} disabled={busy}>
              {busy ? (
                <LoaderCircle size={12} className="editor-spin" aria-hidden="true" />
              ) : (
                <ImagePlus size={12} aria-hidden="true" />
              )}
              {busy ? 'Préparation…' : photo ? 'Changer la photo' : 'Choisir une photo'}
            </button>
            {photo && (
              <button type="button" id="ed-photo-remove" className="add-btn-tiny is-danger" onClick={removePhoto}>
                <Trash2 size={12} aria-hidden="true" /> Retirer la photo
              </button>
            )}
          </div>
        </div>
        <input
          ref={inputRef}
          id="ed-photo-input"
          type="file"
          accept="image/*"
          className="editor-sr-only"
          tabIndex={-1}
          aria-label="Choisir une photo"
          onChange={handleFile}
        />
      </div>
      {photo && crop && (
        <div className="editor-photo-crop">
          <label htmlFor="ed-photo-focus">Cadrage de la photo</label>
          <div className="editor-photo-crop-row">
            <span aria-hidden="true">{crop.landscape ? 'Gauche' : 'Haut'}</span>
            <input
              id="ed-photo-focus"
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.round(crop.focus * 100)}
              aria-describedby="ed-photo-focus-hint"
              aria-valuetext={`${Math.round(crop.focus * 100)} % ${crop.landscape ? 'vers la droite' : 'vers le bas'}`}
              onChange={moveCrop}
            />
            <span aria-hidden="true">{crop.landscape ? 'Droite' : 'Bas'}</span>
          </div>
          <p id="ed-photo-focus-hint" className="editor-hint">
            Déplacez le curseur jusqu’à ce que votre visage soit bien centré dans le cercle.
          </p>
        </div>
      )}
      {photo && (
        <label className="editor-check" htmlFor="ed-photo-visible">
          <input
            id="ed-photo-visible"
            type="checkbox"
            checked={showPhoto !== false}
            onChange={(e) => updateSettings({ showPhoto: e.target.checked })}
          />
          <span>Afficher la photo sur le CV</span>
        </label>
      )}
      {photo && template === 'ats' && (
        <p className="editor-hint">
          Le modèle ATS n'affiche jamais de photo : elle n'apparaît qu'avec le modèle design.
        </p>
      )}
      {error && (
        <p className="editor-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

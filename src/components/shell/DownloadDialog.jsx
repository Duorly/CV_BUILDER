import { useEffect, useRef, useState } from 'react';
import { CircleAlert, Eye, FileDown, Info, LoaderCircle, Palette, Printer, TriangleAlert } from 'lucide-react';
import Modal from './Modal';
import { currentPrintBrowser } from './browser';

function Option({ icon: Icon, title, badge, fileName, children, onClick, disabled, busy, autoFocus }) {
  return (
    <button
      type="button"
      className="dl-option"
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy || undefined}
      data-autofocus={autoFocus || undefined}
    >
      <span className="dl-option-icon" aria-hidden="true">
        {busy ? <LoaderCircle size={20} className="spin" /> : <Icon size={20} />}
      </span>
      <span className="dl-option-text">
        <span className="dl-option-title">
          {title}
          {badge && <span className="badge badge-ok">{badge}</span>}
        </span>
        <span className="dl-option-desc">{children}</span>
        {fileName && (
          <span className="dl-option-file">
            Fichier : <code>{fileName}</code>
          </span>
        )}
      </span>
    </button>
  );
}

const pagesLabel = (n) => `${n} page${n > 1 ? 's' : ''}`;

// Fenêtre « Télécharger » : PDF texte direct (ATS) ou impression du navigateur.
// Le PDF direct est préparé dès l'ouverture (onPreparePdf) : la fenêtre annonce son
// nombre de pages réel, puisque sa mise en page n'est pas celle de l'aperçu.
// previewPages : pages de l'aperçu ATS affiché (modèle ATS seulement), pour signaler un PDF direct plus long.
export default function DownloadDialog({
  view,
  fileBase,
  designFileBase = fileBase,
  nameMissing,
  template = 'design',
  previewPages = null,
  hasPhoto = false,
  altered = null,
  onPreparePdf,
  onDirectPdf,
  onShowAtsPreview,
  onShowDesignPreview,
  onPrint,
  onClose,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [prepared, setPrepared] = useState(null); // { blob, name, pages }
  const preparing = useRef(null);
  const [browser] = useState(currentPrintBrowser);
  // Chaque option a son nom de fichier : la version design ne remplace pas la version ATS.
  const fileName = `${fileBase}.pdf`;
  const designFileName = `${designFileBase}.pdf`;
  const isLetter = view === 'letter';

  useEffect(() => {
    if (isLetter || !onPreparePdf) return undefined;
    let alive = true;
    const promise = onPreparePdf(fileName);
    preparing.current = promise;
    // Un échec est signalé au clic sur l'option (nouvel essai), pas à l'ouverture.
    promise.then(
      (result) => alive && setPrepared(result),
      () => {},
    );
    return () => {
      alive = false;
    };
    // Une seule fois : la fenêtre est modale, le CV ne change pas tant qu'elle est ouverte.
  }, []);

  const direct = async () => {
    setBusy(true);
    setError('');
    try {
      let result = prepared || (await preparing.current?.catch(() => null));
      if (!result) result = await onPreparePdf(fileName);
      await onDirectPdf(result);
      onClose();
    } catch (err) {
      console.error(err);
      const message = String(err?.message || 'Le PDF n’a pas pu être créé').trim();
      setError(/[.!?…]$/.test(message) ? message : `${message}.`);
      setBusy(false);
    }
  };

  const otherEngine = browser.id !== 'chromium';
  const backgroundsLabel = otherEngine ? 'Imprimer les arrière-plans' : 'Graphiques d’arrière-plan';
  const lost = altered?.fragments?.length ? altered : null;
  const symbols = altered?.symbols?.length ? altered.symbols : null;
  const pages = prepared?.pages || 0;
  // Aperçu ATS (et son impression) sur moins de pages que le PDF direct, par exemple après
  // « Ajuster à 1 page » : c'est l'impression, fidèle à l'aperçu, qui est recommandée.
  const longerThanPreview = template === 'ats' && previewPages > 0 && pages > previewPages;
  const preferPrint = Boolean(lost) || longerThanPreview;

  return (
    <Modal
      title={isLetter ? 'Télécharger la lettre' : 'Télécharger mon CV'}
      onClose={onClose}
      dismissible={!busy}
      size="lg"
      footer={
        <button type="button" className="btn" onClick={onClose} disabled={busy}>
          Fermer
        </button>
      }
    >
      {nameMissing && (
        <div className="callout callout-warn">
          <CircleAlert size={16} aria-hidden="true" />
          <p>Votre nom n’est pas encore renseigné : il n’apparaîtra ni sur le document ni dans le nom du fichier.</p>
        </div>
      )}

      <div className="dl-options">
        {isLetter ? (
          <Option
            icon={Printer}
            title="Lettre en PDF, via l’impression"
            fileName={fileName}
            onClick={() => onPrint('letter')}
            autoFocus
          >
            Votre navigateur crée un PDF texte au format A4, prêt à joindre à votre candidature.
          </Option>
        ) : (
          <>
            <div className="dl-option-group">
              <Option
                icon={FileDown}
                title="PDF ATS — téléchargement direct"
                badge={preferPrint ? null : 'Recommandé pour les sites carrières'}
                fileName={fileName}
                onClick={direct}
                disabled={busy}
                busy={busy}
                autoFocus={!preferPrint}
              >
                {busy
                  ? 'Préparation du PDF… (quelques secondes la première fois)'
                  : 'Une colonne sobre, sans photo ni couleurs de fond, texte lisible par les logiciels de recrutement, liens cliquables. Le fichier est téléchargé directement.'}
                <span className={`dl-option-pages${pages > 1 ? ' is-warn' : ''}`} aria-live="polite">
                  {pages ? `Ce PDF fait ${pagesLabel(pages)}.` : 'Calcul du nombre de pages…'}
                </span>
              </Option>
              {longerThanPreview && (
                <p className="dl-option-note dl-option-note--warn">
                  <span>
                    Ce PDF a sa propre mise en page : il fait {pagesLabel(pages)}, contre {pagesLabel(previewPages)} dans
                    l’aperçu ATS. « PDF ATS via l’impression » reprend exactement l’aperçu.
                  </span>
                </p>
              )}
              {template !== 'ats' && (
                <p className="dl-option-note">
                  <span>
                    Ce n’est pas la mise en page affichée à l’écran (modèle Design) : une seule colonne
                    {hasPhoto ? ', sans votre photo' : ''}, d’où un nombre de pages parfois différent.
                  </span>
                  {onShowAtsPreview && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={onShowAtsPreview} disabled={busy}>
                      <Eye size={14} aria-hidden="true" />
                      Voir l’aperçu ATS
                    </button>
                  )}
                </p>
              )}
            </div>
            <Option
              icon={Printer}
              title="PDF ATS via l’impression"
              badge={preferPrint ? 'Recommandé pour votre CV' : null}
              fileName={fileName}
              onClick={() => onPrint('ats')}
              disabled={busy}
              autoFocus={preferPrint}
            >
              Même version une colonne, mise en page par votre navigateur
              {lost
                ? ', qui garde tous les caractères de votre CV.'
                : longerThanPreview
                  ? `, exactement comme l’aperçu ATS (${pagesLabel(previewPages)}).`
                  : '. Utile si le téléchargement direct ne fonctionne pas.'}
            </Option>
            <div className="dl-option-group">
              <Option
                icon={Palette}
                title="PDF design via l’impression"
                badge="Pour un envoi par e-mail"
                fileName={designFileName}
                onClick={() => onPrint('design')}
                disabled={busy}
              >
                {template === 'ats'
                  ? 'Deux colonnes et vos couleurs : c’est le modèle Design, et non l’aperçu affiché (modèle ATS). À envoyer directement à un recruteur.'
                  : 'Deux colonnes et vos couleurs, comme dans l’aperçu. À envoyer directement à un recruteur.'}
              </Option>
              {template === 'ats' && onShowDesignPreview && (
                <p className="dl-option-note">
                  <span>Vérifiez sa mise en page avant de l’envoyer : elle n’est pas affichée en ce moment.</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={onShowDesignPreview} disabled={busy}>
                    <Eye size={14} aria-hidden="true" />
                    Voir l’aperçu Design
                  </button>
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {lost && (
        <div className="callout callout-warn" role="note">
          <TriangleAlert size={16} aria-hidden="true" />
          <p>
            <strong>Le PDF direct ne peut pas écrire certains caractères de votre CV :</strong>{' '}
            {lost.fragments.map((f) => `« ${f} »`).join(', ')}
            {lost.more ? '…' : ''}. Ils y seraient simplifiés (« Ș » devient « S ») ou retirés. Choisissez plutôt{' '}
            <strong>PDF ATS via l’impression</strong> : même version une colonne, avec tous vos caractères.
          </p>
        </div>
      )}

      {symbols && !isLetter && (
        <div className="callout" role="note">
          <Info size={16} aria-hidden="true" />
          <p>
            Les emoji et symboles de votre CV ({symbols.join(' ')}) ne sont pas repris dans le{' '}
            <strong>PDF ATS — téléchargement direct</strong> : ils gênent les logiciels de recrutement et n’y
            apportent aucun mot-clé.{lost ? '' : ' Le reste du texte est intact.'}
          </p>
        </div>
      )}

      {otherEngine && (!isLetter || browser.ios) && (
        <div className="callout callout-warn">
          <TriangleAlert size={16} aria-hidden="true" />
          <p>
            {browser.ios ? (
              isLetter ? (
                <>
                  <strong>Sur iPhone et iPad, la lettre s’enregistre depuis la fenêtre d’impression.</strong> Suivez les
                  étapes ci-dessous : il n’y a ni imprimante ni marges à choisir.
                </>
              ) : (
                <>
                  <strong>Sur iPhone et iPad, tous les navigateurs impriment comme Safari.</strong> Pour la version
                  design, préférez un ordinateur avec Chrome ou Edge : Safari ne répète pas la marge du haut sur les
                  pages 2 et suivantes.
                </>
              )
            ) : (
              <>
                <strong>Vous utilisez {browser.name}.</strong> Pour la version design via l’impression, Chrome ou
                Edge donnent le meilleur résultat
                {browser.id === 'safari'
                  ? ' : Safari ne répète pas la marge du haut sur les pages 2 et suivantes.'
                  : ' : la mise en page et le compteur de pages sont réglés sur leur moteur d’impression.'}
              </>
            )}
            {!isLetter && (
              <>
                {' '}
                Le <strong>PDF ATS — téléchargement direct</strong>, lui, fonctionne dans tous les navigateurs.
              </>
            )}
          </p>
        </div>
      )}

      {error && (
        <div className="callout callout-danger" role="alert">
          <CircleAlert size={16} aria-hidden="true" />
          <p>
            {error} Vous pouvez aussi choisir « PDF ATS via l’impression » : le résultat est équivalent.
          </p>
        </div>
      )}

      <div className="dl-help">
        {browser.ios ? (
          <>
            <strong>Pour enregistrer le PDF sur iPhone ou iPad</strong>, après avoir touché l’option {isLetter ? 'ci-dessus' : 'choisie'} :
            <ol>
              <li>
                dans la fenêtre d’impression, touchez l’icône <strong>Partager</strong> (le carré avec une flèche vers
                le haut) ;
              </li>
              <li>
                choisissez <strong>Enregistrer dans Fichiers</strong>, puis un dossier (par exemple « Sur mon
                iPhone ») ;
              </li>
              <li>joignez ensuite ce fichier à votre candidature depuis l’app Fichiers ou votre messagerie.</li>
            </ol>
          </>
        ) : browser.android ? (
          <>
            <strong>Pour enregistrer le PDF sur Android</strong>, après avoir touché l’option {isLetter ? 'ci-dessus' : 'choisie'} :
            <ol>
              <li>
                en haut de la fenêtre d’impression, choisissez l’imprimante <strong>Enregistrer au format PDF</strong>{' '}
                (et non une imprimante) ;
              </li>
              <li>
                touchez le bouton <strong>PDF</strong> (rond, avec une flèche vers le bas) ;
              </li>
              <li>choisissez un dossier (par exemple « Téléchargements »), puis touchez <strong>Enregistrer</strong>.</li>
            </ol>
          </>
        ) : (
          <>
            <strong>Si vous passez par l’impression</strong>, dans la fenêtre qui s’ouvre :
            <ol>
              <li>
                Destination : <strong>Enregistrer au format PDF</strong> (et non une imprimante) ;
              </li>
              <li>
                Marges : <strong>Par défaut</strong> ;
              </li>
              <li>
                décochez <strong>En-têtes et pieds de page</strong>
                {otherEngine ? '' : ' (dans « Plus de paramètres »)'}, sinon l’adresse de la page et la date
                s’impriment dans les marges{isLetter ? '.' : ' ;'}
              </li>
              {!isLetter && (
                <li>
                  pour la version design, cochez <strong>{backgroundsLabel}</strong>
                  {otherEngine ? '' : ' (dans « Plus de paramètres »)'} pour garder les couleurs.
                </li>
              )}
            </ol>
          </>
        )}
      </div>
    </Modal>
  );
}

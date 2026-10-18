import { Fragment, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { fontCss, normalizeCoverLetter } from '../../lib/schema';
import { telHref } from '../../lib/files';
import { nbspText } from '../../lib/typography';
import { PX_PER_MM, usablePageHeightMm } from '../../lib/pageGeometry';
import { LETTER_TEXT, letterLang, resolveLetter } from './letterUtils';
import '../../styles/letter.css';

// Padding vertical de la page à l'écran (letter.css) : il tient lieu des marges
// @page à l'impression, donc la page 1 imprimée finit à SCREEN_PADDING + hauteur utile.
const SCREEN_PADDING_MM = 20;

// Repères écran « fin de la page N » quand la lettre déborde d'une page.
// offsetHeight ignore la mise à l'échelle de l'aperçu ; le ResizeObserver suit
// chaque changement de hauteur (saisie, police chargée, réglages).
function usePageBreaks(ref) {
  const [breaks, setBreaks] = useState([]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const padding = SCREEN_PADDING_MM * PX_PER_MM;
      const usable = usablePageHeightMm('letter') * PX_PER_MM;
      const content = el.offsetHeight - 2 * padding;
      const pages = Math.max(1, Math.ceil((content - 2) / usable));
      const next = Array.from({ length: pages - 1 }, (_, i) => padding + (i + 1) * usable);
      setBreaks((prev) => (prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return breaks;
}

function Lines({ lines }) {
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line}
    </Fragment>
  ));
}

export default function CoverLetter({ cv, letter, settings }) {
  const s = settings || cv?.settings || {};
  const lang = letterLang(s.lang);
  const t = LETTER_TEXT[lang];
  const pi = cv?.data?.personalInfo || {};
  const l = useMemo(() => resolveLetter(normalizeCoverLetter(letter), pi, lang), [letter, pi, lang]);

  const sender = {
    name: (pi.name || '').trim(),
    title: (pi.title || '').trim(),
    email: (pi.email || '').trim(),
    phone: (pi.phone || '').trim(),
    location: (pi.location || '').trim(),
  };
  const hasSender = Object.values(sender).some(Boolean);
  const hasContact = Boolean(sender.email || sender.phone || sender.location);

  const rootRef = useRef(null);
  const breaks = usePageBreaks(rootRef);

  const style = {
    '--primary-color': s.primaryColor || '#2563eb',
    '--text-dark': s.textColor || '#111827',
    '--resume-font': fontCss(s),
  };

  return (
    <div className="letter-container" id="letter-root" lang={lang} style={style} ref={rootRef}>
      {(hasSender || l.recipient.length > 0) && (
        <div className="letter-head">
          {hasSender && (
            <header className="letter-sender">
              {sender.name && <p className="letter-sender-name">{sender.name}</p>}
              {sender.title && <p className="letter-sender-title">{sender.title}</p>}
              {hasContact && (
                <ul className="letter-sender-contact">
                  {sender.email && (
                    <li>
                      <Mail size={11} aria-hidden="true" focusable="false" />
                      <a href={`mailto:${sender.email}`}>{sender.email}</a>
                    </li>
                  )}
                  {sender.phone && (
                    <li>
                      <Phone size={11} aria-hidden="true" focusable="false" />
                      {telHref(sender.phone) ? <a href={telHref(sender.phone)}>{sender.phone}</a> : <span>{sender.phone}</span>}
                    </li>
                  )}
                  {sender.location && (
                    <li>
                      <MapPin size={11} aria-hidden="true" focusable="false" />
                      <span>{sender.location}</span>
                    </li>
                  )}
                </ul>
              )}
            </header>
          )}

          {l.recipient.length > 0 && (
            <address className="letter-recipient">
              {l.recipient.map((line, i) => (
                <span key={i} className={i === 0 ? 'letter-recipient-first' : undefined}>
                  {line}
                </span>
              ))}
            </address>
          )}
        </div>
      )}

      {l.dateLine && <p className="letter-dateline">{l.dateLine}</p>}

      {l.subject && (
        <p className="letter-subject">
          <span className="letter-subject-label">{t.subjectLabel}</span> {l.subject}
        </p>
      )}

      {l.salutation && <p className="letter-salutation">{l.salutation}</p>}

      {l.paragraphs.length > 0 ? (
        <div className="letter-body">
          {l.paragraphs.map((lines, i) => (
            <p key={i}>
              <Lines lines={lines.map(nbspText)} />
            </p>
          ))}
        </div>
      ) : (
        <p className="letter-empty-hint no-print" lang="fr">
          Le texte de votre lettre apparaîtra ici. Rédigez-le dans le panneau de gauche, ou demandez un brouillon à
          l’IA.
        </p>
      )}

      {(l.closing || l.signature) && (
        <div className="letter-signoff">
          {l.closing && <p className="letter-closing">{l.closing}</p>}
          {l.signature && <p className="letter-signature">{l.signature}</p>}
        </div>
      )}

      {breaks.map((top, i) => (
        <div key={i} className="letter-page-break no-print" style={{ top }} aria-hidden="true" lang="fr">
          <span>
            Fin de la page {i + 1} : une lettre de motivation tient idéalement sur une page
          </span>
        </div>
      ))}
    </div>
  );
}

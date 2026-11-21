import { Fragment } from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { linkIcon } from './icons';

// Éléments communs aux modèles en couleur (Design, Classique, Expert et Focus).

// Libellé lu par les lecteurs d'écran et les extracteurs de texte, invisible sur le CV
// (« E-mail : » devant l'adresse, quand une icône en tient lieu).
export function SrLabel({ children }) {
  return <span className="resume-sr-only">{children} </span>;
}

// URL ou adresse e-mail trop longue pour la colonne : coupure après « / » ou « @ », sinon
// AVANT un trait d'union, jamais juste après. Un tiret en fin de ligne serait pris pour une
// césure et retiré par les extracteurs de texte des logiciels de recrutement
// (« camille-martin- / exemple » → « camille-martinexemple ») ; en début de ligne, il reste.
// Chaque morceau est d'un seul tenant tant qu'il tient dans la colonne (CSS .break-seg / .break-chunk).
export function BreakableText({ text }) {
  if (!text || /\s/.test(text)) return text;
  return text.split(/(?<=[\/@])/).map((segment, i) => {
    const chunks = segment.split(/(?=-)/);
    return (
      <Fragment key={i}>
        {i > 0 && <wbr />}
        <span className="break-seg">
          {chunks.length === 1
            ? segment
            : chunks.map((chunk, j) => (
                <Fragment key={j}>
                  {j > 0 && <wbr />}
                  <span className="break-chunk">{chunk}</span>
                </Fragment>
              ))}
        </span>
      </Fragment>
    );
  });
}

// Mots composés (« Information-Communication », « E-mailing ») d'un seul tenant, pour les colonnes
// étroites : coupé juste après son trait d'union, un mot serait recollé sans lui par les extracteurs
// de texte (« InformationCommunication »). Le texte autour se coupe normalement.
export function KeepCompounds({ text }) {
  if (!text || !text.includes('-')) return text;
  return text.split(/(\S*[^\s-]-+[^\s-]\S*)/).map((part, i) =>
    i % 2 ? (
      <span key={i} className="keep-word">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

// Coordonnées puis liens, une icône devant chacun (éléments <li> d'une liste à poser par le modèle) :
// e-mail, téléphone, ville, puis chaque lien visible. Modèles Expert et Focus (en-tête pleine largeur).
// contact : contactInfo() ; links : contenu de la section « Liens » ; colonText : colon(lang).
export function ContactItems({ contact, links = [], labels, colonText }) {
  return (
    <>
      {contact.email && (
        <li>
          <Mail className="icon" aria-hidden="true" focusable="false" />
          <SrLabel>
            {labels.fields.email}
            {colonText}
          </SrLabel>
          {contact.emailHref ? (
            <a href={contact.emailHref}>
              <BreakableText text={contact.email} />
            </a>
          ) : (
            contact.email
          )}
        </li>
      )}
      {contact.phone && (
        <li>
          <Phone className="icon" aria-hidden="true" focusable="false" />
          <SrLabel>
            {labels.fields.phone}
            {colonText}
          </SrLabel>
          {contact.phoneHref ? <a href={contact.phoneHref}>{contact.phone}</a> : contact.phone}
        </li>
      )}
      {contact.location && (
        <li>
          <MapPin className="icon" aria-hidden="true" focusable="false" />
          <SrLabel>
            {labels.fields.location}
            {colonText}
          </SrLabel>
          {contact.location}
        </li>
      )}
      {links.map((link) => {
        const Icon = linkIcon(link.icon);
        return (
          <li key={link.id}>
            <Icon className="icon" aria-hidden="true" focusable="false" />
            <a href={link.href} target="_blank" rel="noreferrer">
              <SrLabel>
                {link.name || labels.fields.externalLink}
                {colonText}
              </SrLabel>
              <BreakableText text={link.text} />
            </a>
          </li>
        );
      })}
    </>
  );
}

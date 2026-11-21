import { useMemo, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { joinNonEmpty } from '../../lib/schema';
import { labelsFor, sectionTitle } from '../../lib/labels';
import PageBreakOverlay from './PageBreakOverlay';
import { ContactItems, SrLabel } from './parts';
import { colon, contactInfo, languageText, layoutClasses, prepare, renderableSections, themeStyle } from './shared';
import '../../styles/resume.css';
import '../../styles/resume-expert.css';

// Modèle « Expert » (settings.designStyle === 'expert'), pensé pour un long parcours :
// - une seule colonne pleine largeur : les sections suivent l'ordre de la liste, comme le modèle ATS
//   (le réglage « Emplacement » ne s'y applique pas) ;
// - en-tête sur toute la largeur : nom, poste, sous-titre, puis coordonnées et liens sur une ligne ;
// - dates (et lieu) dans la marge de gauche : la chronologie se lit d'un coup d'œil, même sur deux pages ;
// - compétences clés sur plusieurs colonnes, langues côte à côte.
// Imprimé comme le modèle Design (mode « design ») : la marge du haut et du bas de chaque page est
// un padding répété à chaque page (resume-expert.css).

// Libellé en gras, puis le texte : « Stack technique : Java, Angular ».
function Labeled({ label, lang, children }) {
  return (
    <p className="ex-line">
      <strong className="ex-label">
        {label}
        {colon(lang)}
      </strong>{' '}
      {children}
    </p>
  );
}

function Bullets({ items }) {
  return (
    <ul className="ex-bullets">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

// Période dans la marge étroite : « 03/2023 - Aujourd'hui » passe à la ligne AVANT le tiret, qui
// reste collé au mot suivant (.ex-nobreak). En fin de ligne, il serait pris pour une césure et retiré
// par les extracteurs de texte (« 03/2023 Aujourd'hui »). Une espace insécable n'y suffit pas : le
// navigateur peut couper juste après un trait d'union.
function MarginPeriod({ period }) {
  const parts = /^(.*\S)\s+([-–—])\s+(\S+)(.*)$/.exec(period);
  if (!parts) return period;
  const [, start, dash, word, rest] = parts;
  return (
    <>
      {start} <span className="ex-nobreak">{`${dash} ${word}`}</span>
      {rest}
    </>
  );
}

// Élément daté : période et lieu dans la marge, le reste à droite. Sans date ni lieu, la marge
// reste vide et le texte garde son alignement.
function Dated({ period, place, labels, lang, compact = false, children }) {
  return (
    <article className={compact ? 'ex-entry is-compact' : 'ex-entry'}>
      {(period || place) && (
        <div className="ex-when">
          {period && (
            <p className="ex-period">
              <SrLabel>
                {labels.fields.period}
                {colon(lang)}
              </SrLabel>
              <MarginPeriod period={period} />
            </p>
          )}
          {place && <p className="ex-place">{place}</p>}
        </div>
      )}
      <div className="ex-what">{children}</div>
    </article>
  );
}

// Intitulé, puis l'organisme (entreprise, école) et ses précisions.
function Heading({ title, org, extra }) {
  if (!title && !org && !extra) return null;
  return (
    <div className="ex-head">
      {title && <h3>{title}</h3>}
      {(org || extra) && (
        <p className="ex-org">
          {org}
          {extra && <span className="ex-org-extra">{org ? ` · ${extra}` : extra}</span>}
        </p>
      )}
    </div>
  );
}

function SectionBody({ id, content, labels, lang }) {
  switch (id) {
    case 'profile':
      return <p className="ex-profile">{content}</p>;
    case 'skills':
      // Compétences clés : un bloc par catégorie, sur deux ou trois colonnes selon leur nombre.
      return (
        <div className="ex-skills">
          {content.map((group) => (
            <div key={group.id} className="ex-skill-group">
              {group.category && (
                <p className="ex-skill-category">
                  {group.category}
                  <span className="resume-sr-only">{colon(lang)}</span>
                </p>
              )}
              <p className="ex-skill-list">{group.skills.join(', ')}</p>
            </div>
          ))}
        </div>
      );
    case 'experiences':
    case 'otherExperiences':
      return content.map((exp) => (
        <Dated key={exp.id} period={exp.period} place={exp.location} labels={labels} lang={lang}>
          <Heading title={exp.title} org={exp.company} />
          {exp.details.length > 0 && <Bullets items={exp.details} />}
          {exp.stack.length > 0 && (
            <Labeled label={labels.fields.stack} lang={lang}>
              {exp.stack.join(', ')}
            </Labeled>
          )}
        </Dated>
      ));
    case 'education':
      return content.map((edu) => (
        <Dated key={edu.id} period={edu.period} place={edu.location} labels={labels} lang={lang}>
          <Heading title={edu.title} org={edu.school} extra={edu.degree} />
          {edu.details.length > 0 && <Bullets items={edu.details} />}
          {edu.objectives.length > 0 && (
            <Labeled label={labels.fields.objectives} lang={lang}>
              {edu.objectives.join(', ')}
            </Labeled>
          )}
          {edu.tools.length > 0 && (
            <Labeled label={labels.fields.tools} lang={lang}>
              {edu.tools.join(', ')}
            </Labeled>
          )}
          {edu.linkHref && (
            <p className="ex-line ex-program">
              <a href={edu.linkHref} target="_blank" rel="noreferrer">
                {labels.fields.programLink}
                <ExternalLink className="icon-inline" aria-hidden="true" focusable="false" />
                <SrLabel>({labels.fields.externalLink})</SrLabel>
              </a>
            </p>
          )}
        </Dated>
      ));
    case 'certifications':
      return content.map((cert) => (
        <Dated key={cert.id} period={cert.date} labels={labels} lang={lang} compact>
          <p className="ex-cert">
            {cert.name && <strong>{cert.name}</strong>}
            {cert.issuer && <span className="ex-org-extra">{cert.name ? ` · ${cert.issuer}` : cert.issuer}</span>}
          </p>
        </Dated>
      ));
    case 'languages':
      return (
        <ul className="ex-langs">
          {content.map((language) => (
            <li key={language.id}>
              {language.name && language.level ? (
                <>
                  <strong>
                    {language.name}
                    {colon(lang)}
                  </strong>{' '}
                  {language.level}
                </>
              ) : (
                languageText(language, lang)
              )}
            </li>
          ))}
        </ul>
      );
    default:
      // Section libre : liste à puces, « sur une ligne », ou texte simple (un paragraphe par ligne).
      if (content.layout === 'inline') return <p className="ex-inline">{content.items.join(' · ')}</p>;
      if (content.layout === 'text') {
        return content.items.map((item, i) => (
          <p key={i} className="ex-text">
            {item}
          </p>
        ));
      }
      return <Bullets items={content.items} />;
  }
}

// thumbnail : miniature (choix du modèle dans l'Apparence), sans id ni indicateur de saut de page.
export default function ResumeExpert({ data, settings, thumbnail = false }) {
  const rootRef = useRef(null);
  const prepared = useMemo(() => prepare(data, settings), [data, settings]);
  const { data: d, settings: s } = prepared;
  const lang = s.lang;
  const labels = labelsFor(lang);
  const pi = d.personalInfo;
  const contact = contactInfo(pi);
  const name = pi.name.trim();
  const title = pi.title.trim();
  const subtitle = pi.subtitle.trim();
  const photo = s.showPhoto ? pi.photo.trim() : '';

  // Les liens (section « Liens » visible) suivent les coordonnées, sans titre à eux.
  const all = renderableSections(d);
  const links = all.find((section) => section.id === 'links')?.content || [];
  const sections = all.filter((section) => section.id !== 'links');
  const hasContact = contact.email || contact.phone || contact.location || links.length > 0;
  const hasIdentity = name || title || subtitle || hasContact;

  return (
    <div
      ref={rootRef}
      className={joinNonEmpty(['resume-container resume-expert', layoutClasses(s)], ' ')}
      id={thumbnail ? undefined : 'resume-root'}
      lang={lang}
      style={themeStyle(s)}
    >
      {!thumbnail && <PageBreakOverlay targetRef={rootRef} mode="design" revision={prepared} />}

      {(photo || hasIdentity) && (
        <header className="ex-header">
          {photo && (
            <div className="ex-photo">
              <img src={photo} alt={name ? `${labels.fields.photoAlt} ${name}` : ''} />
            </div>
          )}
          {hasIdentity && (
            <div className="ex-identity">
              {name && <h1>{name}</h1>}
              {title && <p className="ex-title">{title}</p>}
              {subtitle && <p className="ex-subtitle">{subtitle}</p>}
              {hasContact && (
                <ul className="ex-contact">
                  <ContactItems contact={contact} links={links} labels={labels} colonText={colon(lang)} />
                </ul>
              )}
            </div>
          )}
        </header>
      )}

      {sections.map(({ id, content }) => {
        const heading = sectionTitle(d, id, lang);
        return (
          <section key={id} className={`ex-section ex-section-${id.startsWith('custom:') ? 'custom' : id}`}>
            {heading && <h2>{heading}</h2>}
            <SectionBody id={id} content={content} labels={labels} lang={lang} />
          </section>
        );
      })}
    </div>
  );
}

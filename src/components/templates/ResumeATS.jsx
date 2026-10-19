import { Fragment, useMemo, useRef } from 'react';
import { joinNonEmpty } from '../../lib/schema';
import { labelsFor, sectionTitle } from '../../lib/labels';
import PageBreakOverlay from './PageBreakOverlay';
import { colon, contactInfo, languageText, layoutClasses, prepare, renderableSections, themeStyle } from './shared';
import '../../styles/resume.css';
import '../../styles/resume-ats.css';

// Template ATS : une seule colonne, sans icônes, lue dans l'ordre par les robots
// des portails de recrutement. Les liens sont dans la ligne de contact, cliquables
// et lisibles (URL nettoyée), pour rester exploitables sur papier.

const SEP = ' · ';

// Chaque coordonnée reste d'un seul tenant : une URL coupée sur un trait d'union
// serait recollée sans lui par les extracteurs de texte.
function ContactLine({ parts }) {
  return (
    <p className="ats-contact-line">
      {parts.map((part, i) => (
        <Fragment key={part.key}>
          {i > 0 && SEP}
          <span className="ats-contact-item">{part.node}</span>
        </Fragment>
      ))}
    </p>
  );
}

// La période reste sur une ligne : « 01/2022 - 05/2024 » coupé en fin de ligne
// perdrait son tiret à l'extraction du texte.
function ItemHeader({ heading, parts, period }) {
  const meta = joinNonEmpty(parts, SEP);
  const when = period.trim();
  if (!heading && !meta && !when) return null;
  return (
    <div className="ats-item-header">
      {heading && <h3>{heading}</h3>}
      {(meta || when) && (
        <p className="ats-item-meta">
          {meta && when ? meta + SEP : meta}
          {when && <span className="ats-period">{when}</span>}
        </p>
      )}
    </div>
  );
}

function Labeled({ label, lang, children }) {
  return (
    <p className="ats-line">
      {label && (
        <strong>
          {label}
          {colon(lang)}
        </strong>
      )}
      {label && ' '}
      {children}
    </p>
  );
}

function SectionBody({ id, content, labels, lang }) {
  switch (id) {
    case 'profile':
      return <p className="ats-objective">{content}</p>;
    case 'skills':
      return content.map((group) => (
        <Labeled key={group.id} label={group.category} lang={lang}>
          {group.skills.join(', ')}
        </Labeled>
      ));
    case 'experiences':
    case 'otherExperiences':
      return content.map((exp) => (
        <article key={exp.id} className="ats-item">
          <ItemHeader
            heading={exp.title || exp.company}
            parts={[exp.title ? exp.company : '', exp.location]}
            period={exp.period}
          />
          {exp.details.length > 0 && (
            <ul className="ats-detail-list">
              {exp.details.map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </ul>
          )}
        </article>
      ));
    case 'education':
      return content.map((edu) => (
        <article key={edu.id} className="ats-item">
          <ItemHeader
            heading={edu.title || edu.school}
            parts={[edu.title ? edu.school : '', edu.degree, edu.location]}
            period={edu.period}
          />
          {edu.details.length > 0 && (
            <ul className="ats-detail-list">
              {edu.details.map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </ul>
          )}
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
            <Labeled label={labels.fields.programLink} lang={lang}>
              <a href={edu.linkHref} target="_blank" rel="noreferrer">
                {edu.linkText}
              </a>
            </Labeled>
          )}
        </article>
      ));
    case 'languages':
      return <p className="ats-line">{content.map((language) => languageText(language, lang)).join(SEP)}</p>;
    case 'certifications':
      return (
        <ul className="ats-plain-list">
          {content.map((cert) => (
            <li key={cert.id}>{joinNonEmpty([cert.name, cert.issuer, cert.date], SEP)}</li>
          ))}
        </ul>
      );
    default:
      if (content.layout === 'inline') return <p className="ats-line">{content.items.join(SEP)}</p>;
      return (
        <ul className="ats-detail-list">
          {content.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
  }
}

export default function ResumeATS({ data, settings }) {
  const rootRef = useRef(null);
  const prepared = useMemo(() => prepare(data, settings), [data, settings]);
  const { data: d, settings: s } = prepared;
  const lang = s.lang;
  const labels = labelsFor(lang);
  const pi = d.personalInfo;
  const contact = contactInfo(pi);
  const name = pi.name.trim();
  const title = pi.title.trim();

  // Les liens sont rendus dans la ligne de contact (si la section « Liens » est visible).
  const sections = renderableSections(d);
  const links = sections.find((section) => section.id === 'links')?.content || [];
  const contactParts = [
    contact.email && {
      key: 'email',
      node: contact.emailHref ? <a href={contact.emailHref}>{contact.email}</a> : contact.email,
    },
    contact.phone && {
      key: 'phone',
      node: contact.phoneHref ? <a href={contact.phoneHref}>{contact.phone}</a> : contact.phone,
    },
    contact.location && { key: 'location', node: contact.location },
    ...links.map((link) => ({
      key: link.id,
      node: (
        <a href={link.href} target="_blank" rel="noreferrer">
          {link.pretty}
        </a>
      ),
    })),
  ].filter(Boolean);

  return (
    <div
      ref={rootRef}
      className={joinNonEmpty(['resume-container resume-ats-template', layoutClasses(s)], ' ')}
      id="resume-root"
      lang={lang}
      style={themeStyle(s)}
    >
      <PageBreakOverlay targetRef={rootRef} mode="ats" revision={prepared} />

      {(name || title || contactParts.length > 0) && (
        <header className="ats-header">
          {name && <h1>{name}</h1>}
          {title && <p className="ats-title">{title}</p>}
          {contactParts.length > 0 && <ContactLine parts={contactParts} />}
        </header>
      )}

      {sections
        .filter((section) => section.id !== 'links')
        .map(({ id, content }) => {
          const heading = sectionTitle(d, id, lang);
          return (
            <section key={id} className="ats-section">
              {heading && <h2>{heading}</h2>}
              <SectionBody id={id} content={content} labels={labels} lang={lang} />
            </section>
          );
        })}
    </div>
  );
}

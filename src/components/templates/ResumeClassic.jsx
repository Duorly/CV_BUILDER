import { useMemo, useRef } from 'react';
import { ExternalLink, Mail, MapPin, Phone } from 'lucide-react';
import { joinNonEmpty, sectionColumn } from '../../lib/schema';
import { labelsFor, sectionTitle } from '../../lib/labels';
import PageBreakOverlay from './PageBreakOverlay';
import { linkIcon } from './icons';
import { BreakableText, KeepCompounds, SrLabel } from './parts';
import { colon, contactInfo, languageText, layoutClasses, prepare, renderableSections, themeStyle } from './shared';
import '../../styles/resume.css';
import '../../styles/resume-classic.css';

// Modèle « Classique » (settings.designStyle === 'classic') : colonne pleine hauteur à gauche, avec
// photo, nom, coordonnées et liens, puis ses sections, titrées d'un filet qui file jusqu'au bord ;
// colonne principale ouverte par le poste visé (et son sous-titre). Mots-clés en texte (« Catégorie : a, b, c »), dates
// alignées à droite. Mêmes colonnes et même impression que le modèle Design (mode « design »).

const COLUMNS = ['.sidebar', '.main-content'];

// « Stack technique : Java, Angular » : libellé en gras, mots-clés à la suite.
function Labeled({ label, lang, className = 'cl-line', children }) {
  return (
    <p className={className}>
      {label && (
        <strong className="cl-label">
          {label}
          {colon(lang)}
        </strong>
      )}
      {label && ' '}
      {children}
    </p>
  );
}

function Bullets({ items }) {
  return (
    <ul className="cl-bullets">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

// Intitulé et dates sur une ligne, puis l'organisme (entreprise, école) de la couleur des titres,
// suivi des précisions (lieu, diplôme). La période reste d'un seul tenant : coupée en fin de
// ligne, elle perdrait son tiret à l'extraction du texte.
function ItemHeader({ title, org, extra, period, labels, lang }) {
  const details = joinNonEmpty(extra, ' · ');
  if (!title && !org && !details && !period) return null;
  return (
    <div className="cl-item-header">
      {(title || period) && (
        <div className="cl-item-row">
          {title && <h3>{title}</h3>}
          {period && (
            <p className="cl-period">
              <SrLabel>
                {labels.fields.period}
                {colon(lang)}
              </SrLabel>
              {period}
            </p>
          )}
        </div>
      )}
      {(org || details) && (
        <p className="cl-org">
          {org}
          {details && <span className="cl-org-extra">{org ? ` · ${details}` : details}</span>}
        </p>
      )}
    </div>
  );
}

function ExperienceList({ items, labels, lang }) {
  return items.map((exp) => (
    <article key={exp.id} className="cl-item">
      <ItemHeader
        title={exp.title}
        org={exp.company}
        extra={[exp.location]}
        period={exp.period}
        labels={labels}
        lang={lang}
      />
      {exp.details.length > 0 && <Bullets items={exp.details} />}
      {exp.stack.length > 0 && (
        <Labeled label={labels.fields.stack} lang={lang}>
          {exp.stack.join(', ')}
        </Labeled>
      )}
    </article>
  ));
}

function EducationList({ items, labels, lang }) {
  return items.map((edu) => (
    <article key={edu.id} className="cl-item cl-edu">
      <ItemHeader
        title={edu.title}
        org={edu.school}
        extra={[edu.degree, edu.location]}
        period={edu.period}
        labels={labels}
        lang={lang}
      />
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
        <p className="cl-line cl-program">
          <a href={edu.linkHref} target="_blank" rel="noreferrer">
            {labels.fields.programLink}
            <ExternalLink className="icon-inline" aria-hidden="true" focusable="false" />
            <SrLabel>({labels.fields.externalLink})</SrLabel>
          </a>
        </p>
      )}
    </article>
  ));
}

function SectionBody({ id, content, column, labels, lang }) {
  switch (id) {
    case 'profile':
      return <p className="cl-profile">{content}</p>;
    case 'skills':
      return content.map((group) => (
        <Labeled key={group.id} label={group.category} lang={lang} className="cl-skill">
          <KeepCompounds text={group.skills.join(', ')} />
        </Labeled>
      ));
    case 'experiences':
    case 'otherExperiences':
      return <ExperienceList items={content} labels={labels} lang={lang} />;
    case 'education':
      return <EducationList items={content} labels={labels} lang={lang} />;
    case 'languages':
      // Langue et niveau sur deux colonnes ; le deux-points, invisible, garde « Anglais : B2 » au texte extrait.
      return (
        <ul className="cl-langs">
          {content.map((language) => (
            <li key={language.id}>
              {language.name && language.level ? (
                <>
                  <span className="cl-lang-name">
                    {language.name}
                    <span className="resume-sr-only">{colon(lang)}</span>
                  </span>{' '}
                  <span className="cl-lang-level">{language.level}</span>
                </>
              ) : (
                <span>{languageText(language, lang)}</span>
              )}
            </li>
          ))}
        </ul>
      );
    case 'certifications':
      return (
        <ul className="cl-certs">
          {content.map((cert) => {
            const meta = joinNonEmpty([cert.issuer, cert.date], ' · ');
            return (
              <li key={cert.id}>
                {cert.name && <strong>{cert.name}</strong>}
                {cert.name && meta && ' '}
                {meta && <span className="cl-cert-meta">{meta}</span>}
              </li>
            );
          })}
        </ul>
      );
    default:
      // Section libre : liste (carrés dans la colonne, tirets dans la page), « sur une ligne », ou
      // texte simple (un paragraphe par ligne, sans puce).
      if (content.layout === 'inline') {
        return <p className={column === 'sidebar' ? 'cl-side-inline' : 'cl-main-inline'}>{content.items.join(' · ')}</p>;
      }
      if (content.layout === 'text') {
        return content.items.map((item, i) => (
          <p key={i} className={column === 'sidebar' ? 'cl-side-text' : 'cl-main-text'}>
            {item}
          </p>
        ));
      }
      return column === 'sidebar' ? (
        <ul className="cl-side-list">
          {content.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      ) : (
        <Bullets items={content.items} />
      );
  }
}

// thumbnail : miniature (choix du modèle dans l'Apparence), sans id ni indicateur de saut de page.
export default function ResumeClassic({ data, settings, thumbnail = false }) {
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
  const sections = all
    .filter((section) => section.id !== 'links')
    .map((section) => ({ ...section, column: sectionColumn(d, section.id) }));
  const hasContact = contact.email || contact.phone || contact.location || links.length > 0;

  const renderSection = ({ id, content, column }) => {
    const heading = sectionTitle(d, id, lang);
    return (
      <section key={id} className={column === 'sidebar' ? 'cl-section cl-side-section' : 'cl-section cl-main-section'}>
        {heading && <h2>{heading}</h2>}
        <SectionBody id={id} content={content} column={column} labels={labels} lang={lang} />
      </section>
    );
  };

  return (
    <div
      ref={rootRef}
      className={joinNonEmpty(['resume-container resume-classic', layoutClasses(s)], ' ')}
      id={thumbnail ? undefined : 'resume-root'}
      lang={lang}
      style={themeStyle(s)}
    >
      <div className="print-sidebar-bg" aria-hidden="true" />
      {!thumbnail && <PageBreakOverlay targetRef={rootRef} mode="design" columns={COLUMNS} revision={prepared} />}

      <aside className="sidebar">
        {(photo || name || hasContact) && (
          <header className="profile-section">
            {photo && (
              <div className="profile-img">
                <img src={photo} alt={name ? `${labels.fields.photoAlt} ${name}` : ''} />
              </div>
            )}
            {name && <h1>{name}</h1>}
            {hasContact && (
              <ul className="contact-info">
                {contact.phone && (
                  <li>
                    <Phone className="icon" aria-hidden="true" focusable="false" />
                    <SrLabel>
                      {labels.fields.phone}
                      {colon(lang)}
                    </SrLabel>
                    {contact.phoneHref ? <a href={contact.phoneHref}>{contact.phone}</a> : contact.phone}
                  </li>
                )}
                {contact.email && (
                  <li>
                    <Mail className="icon" aria-hidden="true" focusable="false" />
                    <SrLabel>
                      {labels.fields.email}
                      {colon(lang)}
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
                {contact.location && (
                  <li>
                    <MapPin className="icon" aria-hidden="true" focusable="false" />
                    <SrLabel>
                      {labels.fields.location}
                      {colon(lang)}
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
                          {colon(lang)}
                        </SrLabel>
                        <span className="link-text">
                          <BreakableText text={link.text} />
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </header>
        )}
        {sections.filter((section) => section.column === 'sidebar').map(renderSection)}
      </aside>

      <div className="main-content">
        {title && <p className="cl-title">{title}</p>}
        {subtitle && <p className="cl-subtitle">{subtitle}</p>}
        {sections.filter((section) => section.column === 'main').map(renderSection)}
      </div>
    </div>
  );
}

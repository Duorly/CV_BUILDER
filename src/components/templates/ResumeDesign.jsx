import { Fragment, useMemo, useRef } from 'react';
import { Award, Calendar, ExternalLink, Globe, Mail, MapPin, Phone } from 'lucide-react';
import { joinNonEmpty, sectionColumn } from '../../lib/schema';
import { labelsFor, sectionTitle } from '../../lib/labels';
import PageBreakOverlay from './PageBreakOverlay';
import { linkIcon } from './icons';
import { colon, contactInfo, customTitle, languageText, layoutClasses, prepare, renderableSections, themeStyle } from './shared';
import '../../styles/resume.css';

// Template « design » : sidebar colorée (32 %) + colonne principale.
// Les sections suivent l'ordre de data.sections, réparties par colonne.

const COLUMNS = ['.sidebar', '.main-content'];

function SrLabel({ children }) {
  return <span className="resume-sr-only">{children} </span>;
}

// URL ou adresse e-mail trop longue pour la sidebar : coupure après « / » ou « @ », sinon
// AVANT un trait d'union, jamais juste après. Un tiret en fin de ligne serait pris pour une
// césure et retiré par les extracteurs de texte des logiciels de recrutement
// (« camille-martin- / exemple » → « camille-martinexemple ») ; en début de ligne, il reste.
// Chaque morceau est d'un seul tenant tant qu'il tient dans la colonne.
function BreakableText({ text }) {
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

function TagList({ items, className }) {
  return (
    <ul className={className ? `tag-cloud ${className}` : 'tag-cloud'}>
      {items.map((item, i) => (
        <li key={i} className="tag">
          {item}
        </li>
      ))}
    </ul>
  );
}

function Bullets({ items, className = 'exp-details' }) {
  return (
    <ul className={className}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function ItemHeader({ title, strong, extra, location, period, labels, lang }) {
  const hasMeta = strong || extra || location || period;
  if (!title && !hasMeta) return null;
  return (
    <div className="exp-header">
      {title && <h3>{title}</h3>}
      {hasMeta && (
        <div className="exp-meta">
          {strong && <span className="exp-company">{strong}</span>}
          {extra && <span>{extra}</span>}
          {location && (
            <span className="meta-item">
              <MapPin className="icon-inline" aria-hidden="true" focusable="false" />
              <SrLabel>
                {labels.fields.place}
                {colon(lang)}
              </SrLabel>
              {location}
            </span>
          )}
          {period && (
            <span className="meta-item">
              <Calendar className="icon-inline" aria-hidden="true" focusable="false" />
              <SrLabel>
                {labels.fields.period}
                {colon(lang)}
              </SrLabel>
              {period}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ExperienceList({ items, labels, lang }) {
  return items.map((exp) => (
    <article key={exp.id} className="experience-item">
      <ItemHeader
        title={exp.title}
        strong={exp.company}
        location={exp.location}
        period={exp.period}
        labels={labels}
        lang={lang}
      />
      {exp.details.length > 0 && <Bullets items={exp.details} />}
    </article>
  ));
}

function EducationList({ items, labels, lang }) {
  return items.map((edu) => (
    <article key={edu.id} className="formation-item">
      <ItemHeader
        title={edu.title}
        strong={edu.school}
        extra={edu.degree}
        location={edu.location}
        period={edu.period}
        labels={labels}
        lang={lang}
      />
      {edu.details.length > 0 && <Bullets items={edu.details} />}
      {edu.objectives.length > 0 && (
        <div className="formation-block">
          <p className="formation-label">
            {labels.fields.objectives}
            {colon(lang)}
          </p>
          <TagList items={edu.objectives} />
        </div>
      )}
      {edu.tools.length > 0 && (
        <div className="formation-block">
          <p className="formation-label">
            {labels.fields.tools}
            {colon(lang)}
          </p>
          <TagList items={edu.tools} className="small-tags" />
        </div>
      )}
      {edu.linkHref && (
        <p className="program-link">
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
      return <p className="objective-text">{content}</p>;
    case 'skills':
      return content.map((group) => (
        <div key={group.id} className="skills-category-group">
          {group.category && <h3 className="sidebar-sub-title">{group.category}</h3>}
          <TagList items={group.skills} className="skills-tags" />
        </div>
      ));
    case 'experiences':
    case 'otherExperiences':
      return <ExperienceList items={content} labels={labels} lang={lang} />;
    case 'education':
      return <EducationList items={content} labels={labels} lang={lang} />;
    case 'links':
      return (
        <ul className="social-links">
          {content.map((link) => {
            const Icon = linkIcon(link.icon);
            return (
              <li key={link.id}>
                <a href={link.href} target="_blank" rel="noreferrer">
                  <Icon className="icon" aria-hidden="true" focusable="false" />
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
      );
    case 'languages':
      return (
        <ul className="lang-list">
          {content.map((language) => (
            <li key={language.id}>
              <Globe className="icon" aria-hidden="true" focusable="false" />
              <span>
                {language.name && language.level ? (
                  <>
                    <strong>{language.name}</strong>
                    {colon(lang)} {language.level}
                  </>
                ) : (
                  languageText(language, lang)
                )}
              </span>
            </li>
          ))}
        </ul>
      );
    case 'certifications':
      return (
        <ul className="cert-list">
          {content.map((cert) => {
            const meta = joinNonEmpty([cert.issuer, cert.date], ' • ');
            return (
              <li key={cert.id} className="cert-item">
                <Award className="icon" aria-hidden="true" focusable="false" />
                <div className="cert-info">
                  {cert.name && <strong>{cert.name}</strong>}
                  {meta && <span>{meta}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      );
    default:
      // Section libre « sur une ligne » : éléments séparés par « · ».
      if (content.layout === 'inline') {
        return <p className={column === 'sidebar' ? 'side-inline' : 'main-inline'}>{content.items.join(' · ')}</p>;
      }
      return <Bullets items={content.items} className={column === 'sidebar' ? 'side-list' : 'exp-details'} />;
  }
}

export default function ResumeDesign({ data, settings }) {
  const rootRef = useRef(null);
  const prepared = useMemo(() => prepare(data, settings), [data, settings]);
  const { data: d, settings: s } = prepared;
  const lang = s.lang;
  const labels = labelsFor(lang);
  const pi = d.personalInfo;
  const contact = contactInfo(pi);
  const name = pi.name.trim();
  const title = pi.title.trim();
  const photo = s.showPhoto ? pi.photo.trim() : '';
  const hasContact = contact.email || contact.phone || contact.location;

  const sections = renderableSections(d).map((section) => ({
    ...section,
    column: sectionColumn(d, section.id),
  }));

  const renderSection = ({ id, content, column }) => {
    const heading = id === 'profile' ? customTitle(d, id) : sectionTitle(d, id, lang);
    const className = [
      column === 'sidebar' ? 'sidebar-section' : 'main-section',
      id === 'profile' ? 'objective-section' : '',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <section key={id} className={className}>
        {heading && <h2>{heading}</h2>}
        <SectionBody id={id} content={content} column={column} labels={labels} lang={lang} />
      </section>
    );
  };

  return (
    <div
      ref={rootRef}
      className={joinNonEmpty(['resume-container resume-design', layoutClasses(s)], ' ')}
      id="resume-root"
      lang={lang}
      style={themeStyle(s)}
    >
      <div className="print-sidebar-bg" aria-hidden="true" />
      <PageBreakOverlay targetRef={rootRef} mode="design" columns={COLUMNS} revision={prepared} />

      <aside className="sidebar">
        {(photo || name || title || hasContact) && (
          <header className="profile-section">
            {photo && (
              <div className="profile-img">
                <img src={photo} alt={name ? `${labels.fields.photoAlt} ${name}` : ''} />
              </div>
            )}
            {name && <h1>{name}</h1>}
            {title && <p className="profile-title">{title}</p>}
            {hasContact && (
              <ul className="contact-info">
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
              </ul>
            )}
          </header>
        )}
        {sections.filter((section) => section.column === 'sidebar').map(renderSection)}
      </aside>

      <div className="main-content">
        {sections.filter((section) => section.column === 'main').map(renderSection)}
      </div>
    </div>
  );
}

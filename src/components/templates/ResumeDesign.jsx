import { useMemo, useRef } from 'react';
import { Award, Calendar, ExternalLink, Globe, Mail, MapPin, Phone } from 'lucide-react';
import { joinNonEmpty, sectionColumn } from '../../lib/schema';
import { labelsFor, sectionTitle } from '../../lib/labels';
import PageBreakOverlay from './PageBreakOverlay';
import { linkIcon } from './icons';
import { BreakableText, SrLabel } from './parts';
import { colon, contactInfo, customTitle, languageText, layoutClasses, prepare, renderableSections, themeStyle } from './shared';
import '../../styles/resume.css';

// Template « design » : sidebar colorée (32 %) + colonne principale.
// Les sections suivent l'ordre de data.sections, réparties par colonne.

const COLUMNS = ['.sidebar', '.main-content'];

// Mots-clés (compétences, stack technique, objectifs et outils d'une formation) : en étiquettes
// encadrées, ou en « liste à puces », à la suite sur la ligne, chacun précédé d'un point de couleur
// (réglage Apparence, settings.skillsStyle). small : variante plus petite, sous une expérience ou
// une formation.
function Keywords({ items, listStyle, small = false, tagsClass = '' }) {
  if (listStyle === 'list') {
    return (
      <ul className={small ? 'skills-list small-list' : 'skills-list'}>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <ul className={joinNonEmpty(['tag-cloud', tagsClass, small ? 'small-tags' : ''], ' ')}>
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

function ExperienceList({ items, labels, lang, listStyle }) {
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
      {exp.stack.length > 0 && (
        <div className="exp-stack">
          <p className="exp-stack-label">
            {labels.fields.stack}
            {colon(lang)}
          </p>
          <Keywords items={exp.stack} listStyle={listStyle} small />
        </div>
      )}
    </article>
  ));
}

function EducationList({ items, labels, lang, listStyle }) {
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
          <Keywords items={edu.objectives} listStyle={listStyle} />
        </div>
      )}
      {edu.tools.length > 0 && (
        <div className="formation-block">
          <p className="formation-label">
            {labels.fields.tools}
            {colon(lang)}
          </p>
          <Keywords items={edu.tools} listStyle={listStyle} small />
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

function SectionBody({ id, content, column, labels, lang, skillsStyle }) {
  switch (id) {
    case 'profile':
      return <p className="objective-text">{content}</p>;
    case 'skills':
      return content.map((group) => (
        <div key={group.id} className="skills-category-group">
          {group.category && <h3 className="sidebar-sub-title">{group.category}</h3>}
          <Keywords items={group.skills} listStyle={skillsStyle} tagsClass="skills-tags" />
        </div>
      ));
    case 'experiences':
    case 'otherExperiences':
      return <ExperienceList items={content} labels={labels} lang={lang} listStyle={skillsStyle} />;
    case 'education':
      return <EducationList items={content} labels={labels} lang={lang} listStyle={skillsStyle} />;
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
      // Texte simple : un paragraphe par ligne, sans puce.
      if (content.layout === 'text') {
        return content.items.map((item, i) => (
          <p key={i} className={column === 'sidebar' ? 'side-text' : 'main-text'}>
            {item}
          </p>
        ));
      }
      return <Bullets items={content.items} className={column === 'sidebar' ? 'side-list' : 'exp-details'} />;
  }
}

// thumbnail : miniature (choix du modèle dans l'Apparence), sans id ni indicateur de saut de page.
export default function ResumeDesign({ data, settings, thumbnail = false }) {
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
        <SectionBody
          id={id}
          content={content}
          column={column}
          labels={labels}
          lang={lang}
          skillsStyle={s.skillsStyle}
        />
      </section>
    );
  };

  return (
    <div
      ref={rootRef}
      className={joinNonEmpty(['resume-container resume-design', layoutClasses(s)], ' ')}
      id={thumbnail ? undefined : 'resume-root'}
      lang={lang}
      style={themeStyle(s)}
    >
      <div className="print-sidebar-bg" aria-hidden="true" />
      {!thumbnail && <PageBreakOverlay targetRef={rootRef} mode="design" columns={COLUMNS} revision={prepared} />}

      <aside className="sidebar">
        {(photo || name || title || subtitle || hasContact) && (
          <header className="profile-section">
            {photo && (
              <div className="profile-img">
                <img src={photo} alt={name ? `${labels.fields.photoAlt} ${name}` : ''} />
              </div>
            )}
            {name && <h1>{name}</h1>}
            {title && <p className="profile-title">{title}</p>}
            {subtitle && <p className="profile-subtitle">{subtitle}</p>}
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

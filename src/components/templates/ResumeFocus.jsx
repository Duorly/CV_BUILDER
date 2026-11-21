import { useMemo, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { joinNonEmpty, sectionColumn } from '../../lib/schema';
import { labelsFor, sectionTitle } from '../../lib/labels';
import PageBreakOverlay from './PageBreakOverlay';
import { ContactItems, KeepCompounds, SrLabel } from './parts';
import { colon, contactInfo, languageText, layoutClasses, prepare, renderableSections, themeStyle } from './shared';
import '../../styles/resume.css';
import '../../styles/resume-focus.css';

// Modèle « Focus » (settings.designStyle === 'focus') : l'expérience au premier plan.
// - en-tête sur toute la largeur : photo, nom, poste, sous-titre, coordonnées et liens ;
// - dessous, deux colonnes : à gauche, la formation (en version compacte), les compétences, les
//   langues, les certifications ; le corps de la page reste au profil et aux expériences ;
// - la formation passe dans la colonne (STYLE_COLUMNS, lib/schema.js) ; les sections libres suivent
//   leur « Emplacement », comme sur les modèles Design et Classique.
// Imprimé comme le modèle Design (mode « design ») : colonnes au padding répété à chaque page, fond
// de colonne fixe (.print-sidebar-bg) que l'en-tête, opaque, recouvre en haut de la première page.

const COLUMNS = ['.sidebar', '.main-content'];

function Labeled({ label, lang, className = 'fo-line', children }) {
  return (
    <p className={className}>
      <strong className="fo-label">
        {label}
        {colon(lang)}
      </strong>{' '}
      {children}
    </p>
  );
}

function Bullets({ items, className = 'fo-bullets' }) {
  return (
    <ul className={className}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function Period({ period, labels, lang, className }) {
  return (
    <p className={className}>
      <SrLabel>
        {labels.fields.period}
        {colon(lang)}
      </SrLabel>
      {period}
    </p>
  );
}

// Corps de la page : intitulé et dates sur une ligne, puis l'entreprise et le lieu.
function ExperienceList({ items, labels, lang }) {
  return items.map((exp) => (
    <article key={exp.id} className="fo-item">
      {(exp.title || exp.period) && (
        <div className="fo-item-row">
          {exp.title && <h3>{exp.title}</h3>}
          {exp.period && <Period period={exp.period} labels={labels} lang={lang} className="fo-period" />}
        </div>
      )}
      {(exp.company || exp.location) && (
        <p className="fo-org">
          {exp.company}
          {exp.location && <span className="fo-org-extra">{exp.company ? ` · ${exp.location}` : exp.location}</span>}
        </p>
      )}
      {exp.details.length > 0 && <Bullets items={exp.details} />}
      {exp.stack.length > 0 && (
        <Labeled label={labels.fields.stack} lang={lang}>
          {exp.stack.join(', ')}
        </Labeled>
      )}
    </article>
  ));
}

// Formation, version compacte pour la colonne : diplôme, établissement, précisions, puis les dates.
// Colonne étroite : les mots composés restent d'un seul tenant (KeepCompounds).
function EducationList({ items, labels, lang }) {
  return items.map((edu) => {
    const meta = joinNonEmpty([edu.degree, edu.location], ' · ');
    return (
      <article key={edu.id} className="fo-edu">
        {edu.title && (
          <h3>
            <KeepCompounds text={edu.title} />
          </h3>
        )}
        {edu.school && (
          <p className="fo-edu-school">
            <KeepCompounds text={edu.school} />
          </p>
        )}
        {meta && (
          <p className="fo-edu-meta">
            <KeepCompounds text={meta} />
          </p>
        )}
        {edu.period && <Period period={edu.period} labels={labels} lang={lang} className="fo-edu-period" />}
        {edu.details.length > 0 && <Bullets items={edu.details} className="fo-edu-details" />}
        {edu.objectives.length > 0 && (
          <Labeled label={labels.fields.objectives} lang={lang} className="fo-edu-line">
            {edu.objectives.join(', ')}
          </Labeled>
        )}
        {edu.tools.length > 0 && (
          <Labeled label={labels.fields.tools} lang={lang} className="fo-edu-line">
            {edu.tools.join(', ')}
          </Labeled>
        )}
        {edu.linkHref && (
          <p className="fo-edu-line fo-program">
            <a href={edu.linkHref} target="_blank" rel="noreferrer">
              {labels.fields.programLink}
              <ExternalLink className="icon-inline" aria-hidden="true" focusable="false" />
              <SrLabel>({labels.fields.externalLink})</SrLabel>
            </a>
          </p>
        )}
      </article>
    );
  });
}

function SectionBody({ id, content, column, labels, lang }) {
  const side = column === 'sidebar';
  switch (id) {
    case 'profile':
      return <p className={side ? 'fo-side-text' : 'fo-profile'}>{content}</p>;
    case 'skills':
      return content.map((group) => (
        <div key={group.id} className="fo-skill">
          {group.category && (
            <p className="fo-skill-category">
              {group.category}
              <span className="resume-sr-only">{colon(lang)}</span>
            </p>
          )}
          <p className="fo-skill-list">
            <KeepCompounds text={group.skills.join(', ')} />
          </p>
        </div>
      ));
    case 'experiences':
    case 'otherExperiences':
      return <ExperienceList items={content} labels={labels} lang={lang} />;
    case 'education':
      return <EducationList items={content} labels={labels} lang={lang} />;
    case 'languages':
      // Langue à gauche, niveau à droite ; le deux-points, invisible, garde « Anglais : C1 » au texte extrait.
      return (
        <ul className="fo-langs">
          {content.map((language) => (
            <li key={language.id}>
              {language.name && language.level ? (
                <>
                  <span className="fo-lang-name">
                    {language.name}
                    <span className="resume-sr-only">{colon(lang)}</span>
                  </span>{' '}
                  <span className="fo-lang-level">{language.level}</span>
                </>
              ) : (
                <span className="fo-lang-name">{languageText(language, lang)}</span>
              )}
            </li>
          ))}
        </ul>
      );
    case 'certifications':
      return (
        <ul className="fo-certs">
          {content.map((cert) => {
            const meta = joinNonEmpty([cert.issuer, cert.date], ' · ');
            return (
              <li key={cert.id}>
                {cert.name && <strong>{cert.name}</strong>}
                {cert.name && meta && ' '}
                {meta && <span className="fo-cert-meta">{meta}</span>}
              </li>
            );
          })}
        </ul>
      );
    default:
      // Section libre : liste, « sur une ligne », ou texte simple (un paragraphe par ligne).
      if (content.layout === 'inline') {
        return <p className={side ? 'fo-side-inline' : 'fo-main-inline'}>{content.items.join(' · ')}</p>;
      }
      if (content.layout === 'text') {
        return content.items.map((item, i) => (
          <p key={i} className={side ? 'fo-side-text' : 'fo-main-text'}>
            {item}
          </p>
        ));
      }
      return <Bullets items={content.items} className={side ? 'fo-side-list' : 'fo-bullets'} />;
  }
}

// thumbnail : miniature (choix du modèle dans l'Apparence), sans id ni indicateur de saut de page.
export default function ResumeFocus({ data, settings, thumbnail = false }) {
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

  // Les liens (section « Liens » visible) suivent les coordonnées, dans l'en-tête.
  const all = renderableSections(d);
  const links = all.find((section) => section.id === 'links')?.content || [];
  const sections = all
    .filter((section) => section.id !== 'links')
    .map((section) => ({ ...section, column: sectionColumn(d, section.id, 'focus') }));
  const hasContact = contact.email || contact.phone || contact.location || links.length > 0;
  const hasIdentity = name || title || subtitle || hasContact;

  const renderSection = ({ id, content, column }) => {
    const heading = sectionTitle(d, id, lang);
    return (
      <section key={id} className={column === 'sidebar' ? 'fo-side-section' : 'fo-main-section'}>
        {heading && <h2>{heading}</h2>}
        <SectionBody id={id} content={content} column={column} labels={labels} lang={lang} />
      </section>
    );
  };

  return (
    <div
      ref={rootRef}
      className={joinNonEmpty(['resume-container resume-focus', layoutClasses(s)], ' ')}
      id={thumbnail ? undefined : 'resume-root'}
      lang={lang}
      style={themeStyle(s)}
    >
      <div className="print-sidebar-bg" aria-hidden="true" />
      {!thumbnail && <PageBreakOverlay targetRef={rootRef} mode="design" columns={COLUMNS} revision={prepared} />}

      {(photo || hasIdentity) && (
        <header className="fo-header">
          {photo && (
            <div className="fo-photo">
              <img src={photo} alt={name ? `${labels.fields.photoAlt} ${name}` : ''} />
            </div>
          )}
          {hasIdentity && (
            <div className="fo-identity">
              {name && <h1>{name}</h1>}
              {title && <p className="fo-title">{title}</p>}
              {subtitle && <p className="fo-subtitle">{subtitle}</p>}
              {hasContact && (
                <ul className="fo-contact">
                  <ContactItems contact={contact} links={links} labels={labels} colonText={colon(lang)} />
                </ul>
              )}
            </div>
          )}
        </header>
      )}

      <div className="fo-columns">
        <aside className="sidebar">{sections.filter((section) => section.column === 'sidebar').map(renderSection)}</aside>
        <div className="main-content">{sections.filter((section) => section.column === 'main').map(renderSection)}</div>
      </div>
    </div>
  );
}

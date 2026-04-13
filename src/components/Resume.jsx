import photo from '../images/photo-cv.jpg';
import * as Icons from 'lucide-react';

const Resume = ({ data }) => {
    if (!data) return null;
    const { personalInfo, mainSkills, socialLinks, languages, experiences, education } = data;

    // Helper to render Lucide icons dynamically with optional accessibility label
    const Icon = ({ name, size = 12, className = "icon", label }) => {
        const LucideIcon = Icons[name];
        if (!LucideIcon) return null;
        return (
            <>
                {label && <span className="sr-only">{label}:</span>}
                <LucideIcon size={size} className={className} aria-hidden="true" />
            </>
        );
    };

    return (
        <div className="resume-container" id="resume-root">
            {/* Visual page-break indicator — screen only, hidden on print */}
            <div className="page-break-overlay" aria-hidden="true" />
            <aside className="sidebar">
                <div className="profile-section">
                    <div className="profile-img">
                        <img src={personalInfo.photo || photo} alt={`Photo de profil de ${personalInfo.name}`} />
                    </div>
                    <h1>{personalInfo.name}</h1>
                    <div className="contact-info">
                        <p><Icon name="Mail" label="Email" /> <a href={`mailto:${personalInfo.email}`}>{personalInfo.email}</a></p>
                        <p><Icon name="Phone" label="Téléphone" /> <a href={`tel:${personalInfo.phone.replace(/\s/g, '')}`}>{personalInfo.phone}</a></p>
                        {personalInfo.location && (
                            <p><Icon name="MapPin" label="Localisation" /> {personalInfo.location}</p>
                        )}
                    </div>
                </div>

                <section className="sidebar-section">
                    <h2>Compétences Techniques</h2>
                    {mainSkills.map((group, index) => (
                        <div key={index} className="skills-category-group">
                            <h3 className="sidebar-sub-title">{group.category}</h3>
                            <div className="tag-cloud">
                                {group.skills.map((skill, sIdx) => (
                                    <span key={sIdx} className="tag">{skill}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>

                <section className="sidebar-section">
                    <h2>Soft Skills</h2>
                    <ul className="soft-skills-list">
                        {data.softSkills && data.softSkills.map((skill, index) => (
                            <li key={index}>
                                <Icon name="CheckCircle2" size={14} className="icon-inline" label="Point fort" /> {skill}
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="sidebar-section">
                    <h2>Liens externes</h2>
                    <ul className="social-links">
                        {socialLinks.map((link, index) => (
                            <li key={index}>
                                <a href={link.url} target="_blank" rel="noreferrer">
                                    <Icon name={link.icon || "Link"} label={link.name} /> {link.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="sidebar-section">
                    <h2>Langues</h2>
                    <ul className="lang-list">
                        {languages.map((lang, index) => (
                            <li key={index}>
                                <Icon name="Globe" label="Langage" /> <strong>{lang.name}:</strong> {lang.level}
                            </li>
                        ))}
                    </ul>
                </section>

                {data.certifications && data.certifications.length > 0 && (
                    <section className="sidebar-section">
                        <h2>Certifications</h2>
                        <ul className="social-links">
                            {data.certifications.map((cert, index) => (
                                <li key={index} className="cert-item">
                                    <Icon name="Award" size={14} className="icon-inline" label="Certification" />
                                    <div className="cert-info">
                                        <strong>{cert.name}</strong>
                                        <span>{cert.issuer} • {cert.date}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </aside>

            <main className="main-content">
                <section className="main-section">
                    <h2>Objectif professionnel</h2>
                    <p>{personalInfo.objective}</p>
                </section>

                <section className="main-section" aria-label="Expériences professionnelles">
                    <h2>Expériences professionnelles</h2>
                    {experiences.map((exp, index) => (
                        <article key={index} className="experience-item">
                            <div className="exp-header">
                                <h3>{exp.title}</h3>
                                <div className="exp-meta">
                                    <span><strong>{exp.company}</strong></span>
                                    <span className="meta-item">
                                        <Icon name="MapPin" className="icon-inline" label="Lieu" /> {exp.location}
                                    </span>
                                    <span className="meta-item">
                                        <Icon name="Calendar" className="icon-inline" label="Période" /> {exp.period}
                                    </span>
                                </div>
                            </div>
                            <ul className="exp-details">
                                {exp.details.map((detail, idx) => (
                                    <li key={idx}>{detail}</li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </section>

                <section className="main-section" aria-label="Formations">
                    <h2>Formations</h2>
                    {education.map((edu, index) => (
                        <article key={index} className="formation-item">
                            <div className="exp-header">
                                <h3>{edu.title}</h3>
                                <div className="exp-meta">
                                    <span><strong>{edu.school}</strong></span>
                                    {edu.degree && <span>{edu.degree}</span>}
                                    <span className="meta-item">
                                        <Icon name="Calendar" className="icon-inline" label="Date" /> {edu.period}
                                    </span>
                                </div>
                            </div>
                            {edu.objectives && (
                                <div className="formation-objectives">
                                    <p><strong>Objectifs :</strong></p>
                                    <div className="tag-cloud objectives-tags">
                                        {edu.objectives.map((obj, idx) => (
                                            <span key={idx} className="tag">{obj}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {edu.tools && (
                                <div className="formation-tools">
                                    <p><strong>Outils et méthodes :</strong></p>
                                    <div className="tag-cloud small-tags">
                                        {edu.tools.map((tool, idx) => (
                                            <span key={idx} className="tag">{tool}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {edu.link && (
                                <div className="program-link">
                                    <a href={edu.link} target="_blank" rel="noreferrer">
                                        Programme détaillé <Icon name="ExternalLink" className="icon-inline" label="Lien externe" />
                                    </a>
                                </div>
                            )}
                        </article>
                    ))}
                </section>
            </main>
        </div>
    );
};

export default Resume;


import photo from '../images/photo-cv.jpg';
import * as Icons from 'lucide-react';

const Resume = ({ data }) => {
    if (!data) return null;
    const { personalInfo, mainSkills, socialLinks, languages, experiences, education } = data;

    // Helper to render Lucide icons dynamically
    const Icon = ({ name, size = 12, className = "icon" }) => {
        const LucideIcon = Icons[name];
        if (!LucideIcon) return null;
        return <LucideIcon size={size} className={className} />;
    };

    return (
        <div className="resume-container">
            {/* Visual page-break indicator — screen only, hidden on print */}
            <div className="page-break-overlay" aria-hidden="true" />
            <aside className="sidebar">
                <div className="profile-section">
                    <div className="profile-img">
                        <img src={photo} alt={personalInfo.name} />
                    </div>
                    <h1>{personalInfo.name}</h1>
                    <div className="contact-info">
                        <p><Icon name="Mail" /> <a href={`mailto:${personalInfo.email}`}>{personalInfo.email}</a></p>
                        <p><Icon name="Phone" /> <a href={`tel:${personalInfo.phone.replace(/\s/g, '')}`}>{personalInfo.phone}</a></p>
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
                                <Icon name="CheckCircle2" size={14} className="icon-inline" /> {skill}
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
                                    <Icon name={link.icon} /> {link.label}
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
                                <Icon name="Globe" /> <strong>{lang.name}:</strong> {lang.level}
                            </li>
                        ))}
                    </ul>
                </section>
            </aside>

            <main className="main-content">
                <section className="main-section">
                    <h2>Objectif professionnel</h2>
                    <p>{personalInfo.objective}</p>
                </section>

                <section className="main-section">
                    <h2>Expériences professionnelles</h2>
                    {experiences.map((exp, index) => (
                        <div key={index} className="experience-item">
                            <div className="exp-header">
                                <h3>{exp.title}</h3>
                                <div className="exp-meta">
                                    <span><strong>{exp.company}</strong></span>
                                    <span className="meta-item"><Icon name="MapPin" className="icon-inline" /> {exp.location}</span>
                                    <span className="meta-item"><Icon name="Calendar" className="icon-inline" /> {exp.period}</span>
                                </div>
                            </div>
                            <ul className="exp-details">
                                {exp.details.map((detail, idx) => (
                                    <li key={idx}>{detail}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </section>

                <section className="main-section">
                    <h2>Formations</h2>
                    {education.map((edu, index) => (
                        <div key={index} className="formation-item">
                            <div className="exp-header">
                                <h3>{edu.title}</h3>
                                <div className="exp-meta">
                                    <span><strong>{edu.school}</strong></span>
                                    <span>{edu.degree}</span>
                                    <span className="meta-item"><Icon name="Calendar" className="icon-inline" /> {edu.period}</span>
                                </div>
                            </div>
                            {edu.objectives && (
                                <div className="formation-objectives">
                                    <p><strong>Les objectifs de la formation :</strong></p>
                                    <div className="tag-cloud objectives-tags">
                                        {edu.objectives.map((obj, idx) => (
                                            <span key={idx} className="tag">{obj}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {edu.tools && (
                                <div className="formation-tools">
                                    <p><strong>Les outils et les méthodologies :</strong></p>
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
                                        Télécharger le programme <Icon name="ExternalLink" className="icon-inline" />
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                </section>
            </main>
        </div>
    );
};

export default Resume;


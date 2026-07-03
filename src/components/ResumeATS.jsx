const ResumeATS = ({ data }) => {
    if (!data) return null;
    const { personalInfo, mainSkills, socialLinks, languages, experiences, education, otherExperiences, certifications } = data;

    const contactParts = [
        personalInfo.email,
        personalInfo.phone,
        personalInfo.location,
        ...socialLinks.filter(link => link.url).map(link => link.label),
    ].filter(Boolean);

    return (
        <div className="resume-container resume-ats-template" id="resume-root">
            {/* Visual page-break indicator — screen only, hidden on print */}
            <div className="page-break-overlay" aria-hidden="true" />

            <header className="ats-header">
                <h1>{personalInfo.name}</h1>
                {personalInfo.title && <p className="ats-title">{personalInfo.title}</p>}
                <p className="ats-contact-line">{contactParts.join(' • ')}</p>
            </header>

            {personalInfo.objective && (
                <section className="ats-section">
                    <h2>Profil</h2>
                    <p className="ats-objective">{personalInfo.objective}</p>
                </section>
            )}

            {mainSkills && mainSkills.length > 0 && (
                <section className="ats-section">
                    <h2>Compétences techniques</h2>
                    {mainSkills.map((group, index) => (
                        <p key={index} className="ats-skill-line">
                            <strong>{group.category} : </strong>{group.skills.join(', ')}
                        </p>
                    ))}
                </section>
            )}

            <section className="ats-section">
                <h2>Expériences professionnelles</h2>
                {experiences.map((exp, index) => (
                    <article key={index} className="ats-item">
                        <div className="ats-item-header">
                            <h3>{exp.title} — {exp.company}</h3>
                            <span className="ats-item-meta">{exp.location} | {exp.period}</span>
                        </div>
                        <ul className="ats-detail-list">
                            {exp.details.map((detail, idx) => (
                                <li key={idx}>{detail}</li>
                            ))}
                        </ul>
                    </article>
                ))}
            </section>

            <section className="ats-section">
                <h2>Formations</h2>
                {education.map((edu, index) => (
                    <article key={index} className="ats-item">
                        <div className="ats-item-header">
                            <h3>{edu.title} — {edu.school}</h3>
                            <span className="ats-item-meta">{edu.degree ? `${edu.degree} | ` : ''}{edu.period}</span>
                        </div>
                        {edu.objectives && edu.objectives.length > 0 && (
                            <p><strong>Objectifs : </strong>{edu.objectives.join(', ')}</p>
                        )}
                        {edu.tools && edu.tools.length > 0 && (
                            <p><strong>Outils et méthodes : </strong>{edu.tools.join(', ')}</p>
                        )}
                    </article>
                ))}
            </section>

            {otherExperiences && otherExperiences.length > 0 && (
                <section className="ats-section">
                    <h2>Autres expériences</h2>
                    {otherExperiences.map((exp, index) => (
                        <article key={index} className="ats-item">
                            <div className="ats-item-header">
                                <h3>{exp.title} — {exp.company}</h3>
                                <span className="ats-item-meta">{exp.location} | {exp.period}</span>
                            </div>
                            {exp.details && exp.details.length > 0 && (
                                <ul className="ats-detail-list">
                                    {exp.details.map((detail, idx) => (
                                        <li key={idx}>{detail}</li>
                                    ))}
                                </ul>
                            )}
                        </article>
                    ))}
                </section>
            )}

            {certifications && certifications.length > 0 && (
                <section className="ats-section">
                    <h2>Certifications</h2>
                    <ul className="ats-plain-list">
                        {certifications.map((cert, index) => (
                            <li key={index}>{cert.name} — {cert.issuer} ({cert.date})</li>
                        ))}
                    </ul>
                </section>
            )}

            <section className="ats-section">
                <h2>Langues</h2>
                <p className="ats-skill-line">{languages.map(lang => `${lang.name} : ${lang.level}`).join(' • ')}</p>
            </section>
        </div>
    );
};

export default ResumeATS;

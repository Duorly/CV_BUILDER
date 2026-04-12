import { User, Briefcase, GraduationCap, Languages, Award, Plus, Trash2, X, MapPin, Calendar, Building, GripVertical, Circle } from 'lucide-react';

const Editor = ({ data, setData }) => {
    const handlePersonalInfoChange = (e) => {
        const { name, value } = e.target;
        setData({
            ...data,
            personalInfo: {
                ...data.personalInfo,
                [name]: value
            }
        });
    };

    const handleSkillsChange = (e) => {
        const skills = e.target.value.split(',').map(s => s.trim());
        setData({
            ...data,
            mainSkills: skills
        });
    };

    const updateExperience = (index, field, value) => {
        const newExperiences = [...data.experiences];
        newExperiences[index] = { ...newExperiences[index], [field]: value };
        setData({ ...data, experiences: newExperiences });
    };

    const updateExperienceDetail = (expIndex, detailIndex, value) => {
        const newExperiences = [...data.experiences];
        const newDetails = [...newExperiences[expIndex].details];
        newDetails[detailIndex] = value;
        newExperiences[expIndex].details = newDetails;
        setData({ ...data, experiences: newExperiences });
    };

    const addExperience = () => {
        const newExperiences = [
            {
                title: "Nouveau poste",
                company: "Entreprise",
                location: "Ville",
                period: "Période",
                details: ["Nouveau détail"]
            },
            ...data.experiences
        ];
        setData({ ...data, experiences: newExperiences });
    };

    const removeExperience = (index) => {
        const newExperiences = data.experiences.filter((_, i) => i !== index);
        setData({ ...data, experiences: newExperiences });
    };

    const addDetail = (expIndex) => {
        const newExperiences = [...data.experiences];
        newExperiences[expIndex].details.push("Nouveau détail");
        setData({ ...data, experiences: newExperiences });
    };

    const removeDetail = (expIndex, detailIndex) => {
        const newExperiences = [...data.experiences];
        newExperiences[expIndex].details = newExperiences[expIndex].details.filter((_, i) => i !== detailIndex);
        setData({ ...data, experiences: newExperiences });
    };

    return (
        <aside className="editor-sidebar no-print">
            <div className="editor-header">
                <h2>Éditeur de CV</h2>
                <p>Modifiez vos infos en temps réel</p>
            </div>

            <div className="editor-section">
                <div className="section-header-icon">
                    <User size={18} className="header-icon" />
                    <h3>Informations personnelles</h3>
                </div>
                <div className="form-group floating">
                    <label>Nom complet</label>
                    <input 
                        type="text" 
                        name="name" 
                        value={data.personalInfo.name} 
                        onChange={handlePersonalInfoChange} 
                    />
                </div>

                <div className="form-group">
                    <label>Email</label>
                    <input 
                        type="email" 
                        name="email" 
                        value={data.personalInfo.email} 
                        onChange={handlePersonalInfoChange} 
                    />
                </div>
                <div className="form-group">
                    <label>Téléphone</label>
                    <input 
                        type="text" 
                        name="phone" 
                        value={data.personalInfo.phone} 
                        onChange={handlePersonalInfoChange} 
                    />
                </div>
                <div className="form-group">
                    <label>Objectif professionnel</label>
                    <textarea 
                        name="objective" 
                        rows="4"
                        value={data.personalInfo.objective} 
                        onChange={handlePersonalInfoChange} 
                    />
                </div>
            </div>

            <div className="editor-section">
                <div className="section-header-icon">
                    <Award size={18} className="header-icon" />
                    <h3>Compétences</h3>
                </div>
                <div className="form-group">
                    <p className="field-hint">Séparez par des virgules</p>
                    <textarea 
                        rows="3"
                        value={data.mainSkills.join(', ')} 
                        onChange={handleSkillsChange} 
                    />
                </div>
            </div>

            <div className="editor-section">
                <div className="section-header-flex section-header-icon">
                    <div className="title-with-icon">
                        <Briefcase size={18} className="header-icon" />
                        <h3>Expériences</h3>
                    </div>
                    <button className="add-btn-round" onClick={addExperience} title="Ajouter une expérience">
                        <Plus size={16} />
                    </button>
                </div>
                {data.experiences.map((exp, index) => (
                    <div key={index} className="editor-item-box elegant">
                        <div className="item-controls-top">
                            <span className="item-label">PROJET {index + 1}</span>
                            <button className="remove-btn-icon" onClick={() => removeExperience(index)} title="Supprimer l'expérience">
                                <Trash2 size={14} />
                            </button>
                        </div>

                        <div className="form-group mini">
                            <label>Poste</label>
                            <div className="icon-input-group">
                                <Briefcase size={14} className="input-icon" />
                                <input 
                                    type="text" 
                                    placeholder="Ex: Lead Développeur"
                                    value={exp.title} 
                                    onChange={(e) => updateExperience(index, 'title', e.target.value)} 
                                />
                            </div>
                        </div>

                        <div className="editor-grid">
                            <div className="form-group mini">
                                <label>Entreprise</label>
                                <div className="icon-input-group">
                                    <Building size={14} className="input-icon" />
                                    <input 
                                        type="text" 
                                        placeholder="Nom"
                                        value={exp.company} 
                                        onChange={(e) => updateExperience(index, 'company', e.target.value)} 
                                    />
                                </div>
                            </div>
                            <div className="form-group mini">
                                <label>Lieu</label>
                                <div className="icon-input-group">
                                    <MapPin size={14} className="input-icon" />
                                    <input 
                                        type="text" 
                                        placeholder="Ville"
                                        value={exp.location} 
                                        onChange={(e) => updateExperience(index, 'location', e.target.value)} 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-group mini">
                            <label>Période</label>
                            <div className="icon-input-group">
                                <Calendar size={14} className="input-icon" />
                                <input 
                                    type="text" 
                                    placeholder="Ex: 2021 - 2023"
                                    value={exp.period} 
                                    onChange={(e) => updateExperience(index, 'period', e.target.value)} 
                                />
                            </div>
                        </div>
                        
                        <div className="details-editor">
                            <div className="section-header-flex mini-header">
                                <label>Bullet points</label>
                                <button className="add-btn-tiny" onClick={() => addDetail(index)}>
                                    <Plus size={10} /> Point
                                </button>
                            </div>
                            {exp.details.map((detail, dIdx) => (
                                <div key={dIdx} className="detail-row premium">
                                    <div className="detail-drag-handle">
                                        <GripVertical size={14} />
                                    </div>
                                    <div className="detail-bullet">
                                        <Circle size={6} fill="currentColor" strokeWidth={3} />
                                    </div>
                                    <textarea 
                                        className="detail-input"
                                        rows="1"
                                        value={detail}
                                        onChange={(e) => updateExperienceDetail(index, dIdx, e.target.value)}
                                        onInput={(e) => {
                                            e.target.style.height = 'auto';
                                            e.target.style.height = e.target.scrollHeight + 'px';
                                        }}
                                        ref={(el) => {
                                            if (el) {
                                                el.style.height = 'auto';
                                                el.style.height = el.scrollHeight + 'px';
                                            }
                                        }}
                                    />
                                    <button className="remove-btn-icon-tiny" onClick={() => removeDetail(index, dIdx)} title="Supprimer ce point">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                    </div>
                ))}
            </div>
        </aside>
    );
};

export default Editor;

import { User, Briefcase, GraduationCap, Languages, Award, Heart, Plus, Trash2, X, MapPin, Calendar, Building, GripVertical, Circle } from 'lucide-react';

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

    const handleSkillsChange = (categoryIndex, value) => {
        const newMainSkills = [...data.mainSkills];
        newMainSkills[categoryIndex].skills = value.split(',').map(s => s.trim());
        setData({ ...data, mainSkills: newMainSkills });
    };

    const handleCategoryNameChange = (categoryIndex, value) => {
        const newMainSkills = [...data.mainSkills];
        newMainSkills[categoryIndex].category = value;
        setData({ ...data, mainSkills: newMainSkills });
    };

    const addSkillCategory = () => {
        const newMainSkills = [...data.mainSkills, { category: "Nouvelle catégorie", skills: ["Compétence"] }];
        setData({ ...data, mainSkills: newMainSkills });
    };

    const removeSkillCategory = (index) => {
        const newMainSkills = data.mainSkills.filter((_, i) => i !== index);
        setData({ ...data, mainSkills: newMainSkills });
    };

    const handleSoftSkillsChange = (e) => {
        const skillsArray = e.target.value.split(',').map(skill => skill.trim());
        setData({ ...data, softSkills: skillsArray });
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

    const updateEducation = (index, field, value) => {
        const newEducation = [...data.education];
        newEducation[index] = { ...newEducation[index], [field]: value };
        setData({ ...data, education: newEducation });
    };

    const updateEducationList = (eduIndex, listField, itemIndex, value) => {
        const newEducation = [...data.education];
        const newList = [...newEducation[eduIndex][listField]];
        newList[itemIndex] = value;
        newEducation[eduIndex][listField] = newList;
        setData({ ...data, education: newEducation });
    };

    const addEducation = () => {
        const newEducation = [
            {
                title: "Nouveau diplôme",
                school: "École / Université",
                degree: "Niveau d'études",
                period: "Période",
                objectives: ["Nouvel objectif"],
                tools: ["Outil"],
                details: []
            },
            ...data.education
        ];
        setData({ ...data, education: newEducation });
    };

    const removeEducation = (index) => {
        const newEducation = data.education.filter((_, i) => i !== index);
        setData({ ...data, education: newEducation });
    };

    const addEducationListItem = (eduIndex, listField) => {
        const newEducation = [...data.education];
        if (!newEducation[eduIndex][listField]) newEducation[eduIndex][listField] = [];
        newEducation[eduIndex][listField].push(listField === 'tools' ? "Nouveau" : "Nouvel élément");
        setData({ ...data, education: newEducation });
    };

    const removeEducationListItem = (eduIndex, listField, itemIndex) => {
        const newEducation = [...data.education];
        newEducation[eduIndex][listField] = newEducation[eduIndex][listField].filter((_, i) => i !== itemIndex);
        setData({ ...data, education: newEducation });
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

                <div className="editor-grid">
                    <div className="form-group mini">
                        <label>Email</label>
                        <input 
                            type="email" 
                            name="email" 
                            value={data.personalInfo.email} 
                            onChange={handlePersonalInfoChange} 
                        />
                    </div>
                    <div className="form-group mini">
                        <label>Téléphone</label>
                        <input 
                            type="text" 
                            name="phone" 
                            value={data.personalInfo.phone} 
                            onChange={handlePersonalInfoChange} 
                        />
                    </div>
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
                <div className="section-header-flex section-header-icon">
                    <div className="title-with-icon">
                        <Award size={18} className="header-icon" />
                        <h3>Compétences Techniques</h3>
                    </div>
                    <button className="add-btn-round" onClick={addSkillCategory} title="Ajouter une catégorie">
                        <Plus size={16} />
                    </button>
                </div>

                {data.mainSkills.map((categoryGroup, index) => (
                    <div key={index} className="editor-item-box elegant mini-box">
                        <div className="item-controls-top">
                             <input 
                                type="text" 
                                className="item-label-input"
                                value={categoryGroup.category} 
                                onChange={(e) => handleCategoryNameChange(index, e.target.value)} 
                            />
                            <button className="remove-btn-icon" onClick={() => removeSkillCategory(index)}>
                                <Trash2 size={12} />
                            </button>
                        </div>
                        <div className="form-group no-margin">
                             <p className="field-hint">Séparez par des virgules</p>
                             <textarea 
                                rows="2"
                                value={categoryGroup.skills.join(', ')} 
                                onChange={(e) => handleSkillsChange(index, e.target.value)} 
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="editor-section">
                <div className="section-header-icon">
                    <Heart size={18} className="header-icon" />
                    <h3>Soft Skills</h3>
                </div>
                <div className="form-group">
                    <p className="field-hint">Séparez par des virgules</p>
                    <textarea 
                        rows="3"
                        value={data.softSkills ? data.softSkills.join(', ') : ''} 
                        onChange={handleSoftSkillsChange} 
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

            <div className="editor-section">
                <div className="section-header-flex section-header-icon">
                    <div className="title-with-icon">
                        <GraduationCap size={18} className="header-icon" />
                        <h3>Formations</h3>
                    </div>
                    <button className="add-btn-round" onClick={addEducation} title="Ajouter une formation">
                        <Plus size={16} />
                    </button>
                </div>
                {data.education.map((edu, index) => (
                    <div key={index} className="editor-item-box elegant">
                        <div className="item-controls-top">
                            <span className="item-label">DIPLÔME {index + 1}</span>
                            <button className="remove-btn-icon" onClick={() => removeEducation(index)} title="Supprimer la formation">
                                <Trash2 size={14} />
                            </button>
                        </div>

                        <div className="editor-grid">
                            <div className="form-group mini">
                                <label>Diplôme / Spécialité</label>
                                <div className="icon-input-group">
                                    <GraduationCap size={14} className="input-icon" />
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Architecte Logiciel"
                                        value={edu.title} 
                                        onChange={(e) => updateEducation(index, 'title', e.target.value)} 
                                    />
                                </div>
                            </div>
                            <div className="form-group mini">
                                <label>École / Université</label>
                                <div className="icon-input-group">
                                    <Building size={14} className="input-icon" />
                                    <input 
                                        type="text" 
                                        placeholder="Nom"
                                        value={edu.school} 
                                        onChange={(e) => updateEducation(index, 'school', e.target.value)} 
                                    />
                                </div>
                            </div>
                            <div className="form-group mini">
                                <label>Période</label>
                                <div className="icon-input-group">
                                    <Calendar size={14} className="input-icon" />
                                    <input 
                                        type="text" 
                                        placeholder="Ex: 2023"
                                        value={edu.period} 
                                        onChange={(e) => updateEducation(index, 'period', e.target.value)} 
                                    />
                                </div>
                            </div>
                        </div>

                        {edu.objectives && (
                            <div className="details-editor">
                                <div className="section-header-flex mini-header">
                                    <label>Objectifs de formation</label>
                                    <button className="add-btn-tiny" onClick={() => addEducationListItem(index, 'objectives')}>
                                        <Plus size={10} /> Objectif
                                    </button>
                                </div>
                                {edu.objectives.map((obj, oIdx) => (
                                    <div key={oIdx} className="detail-row premium">
                                        <div className="detail-drag-handle"><GripVertical size={14} /></div>
                                        <div className="detail-bullet"><Circle size={6} fill="currentColor" strokeWidth={3} /></div>
                                        <textarea 
                                            className="detail-input"
                                            rows="1"
                                            value={obj}
                                            onChange={(e) => updateEducationList(index, 'objectives', oIdx, e.target.value)}
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
                                        <button className="remove-btn-icon-tiny" onClick={() => removeEducationListItem(index, 'objectives', oIdx)}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {edu.tools && (
                            <div className="details-editor">
                                <div className="section-header-flex mini-header">
                                    <label>Outils & Méthodes</label>
                                </div>
                                <div className="tag-input-area" style={{ marginTop: '10px' }}>
                                    <p className="field-hint">Séparez par des virgules</p>
                                    <textarea 
                                        rows="2"
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #f3f4f6', fontSize: '0.8rem' }}
                                        value={edu.tools.join(', ')}
                                        onChange={(e) => {
                                            const tools = e.target.value.split(',').map(t => t.trim());
                                            updateEducation(index, 'tools', tools);
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </aside>
    );
};

export default Editor;

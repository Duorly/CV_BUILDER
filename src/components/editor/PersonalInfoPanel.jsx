import { useRef } from 'react';
import { Briefcase, Mail, MapPin, Phone, User } from 'lucide-react';
import Panel from './Panel';
import PhotoField from './PhotoField';
import TextField from './TextField';

// Coordonnées et photo. Le résumé du profil est édité dans la section « Profil ».
// onContactCommit({ field, before, after }) : une coordonnée a été modifiée (à la sortie du
// champ), pour proposer de reporter la correction dans les autres versions (voir App).
export default function PersonalInfoPanel({
  personalInfo,
  update,
  showPhoto,
  template,
  updateSettings,
  onContactCommit,
}) {
  const setField = (key) => (value) =>
    update((draft) => {
      draft.personalInfo[key] = value;
    });
  const valuesAtFocus = useRef({});
  const commitOnBlur = (key) =>
    onContactCommit
      ? {
          onFocus: () => {
            valuesAtFocus.current[key] = personalInfo[key];
          },
          onBlur: (e) => {
            const before = valuesAtFocus.current[key];
            delete valuesAtFocus.current[key];
            if (before !== undefined && before.trim() !== e.target.value.trim()) {
              onContactCommit({ field: key, before, after: e.target.value });
            }
          },
        }
      : {};

  const emailLooksWrong = personalInfo.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalInfo.email.trim());

  return (
    <Panel id="personal" icon={User} title="Informations personnelles">
      <TextField
        id="ed-pi-name"
        label="Prénom et nom"
        value={personalInfo.name}
        placeholder="Ex. Léa Dubois"
        autoComplete="name"
        onChange={setField('name')}
        {...commitOnBlur('name')}
      />
      <TextField
        id="ed-pi-title"
        label="Titre visé"
        icon={Briefcase}
        value={personalInfo.title}
        placeholder="Ex. Assistante de direction"
        hint="Le poste que vous recherchez, affiché sous votre nom."
        autoComplete="organization-title"
        onChange={setField('title')}
      />
      <div className="editor-grid">
        <TextField
          id="ed-pi-email"
          className="editor-field-wide"
          type="email"
          label="E-mail"
          icon={Mail}
          value={personalInfo.email}
          placeholder="Ex. lea.dubois@exemple.fr"
          autoComplete="email"
          hint={emailLooksWrong ? "Vérifiez l'adresse : elle semble incomplète." : undefined}
          onChange={setField('email')}
          {...commitOnBlur('email')}
        />
        <TextField
          id="ed-pi-phone"
          className="editor-field-narrow"
          type="tel"
          label="Téléphone"
          icon={Phone}
          value={personalInfo.phone}
          placeholder="Ex. 06 12 34 56 78"
          autoComplete="tel"
          onChange={setField('phone')}
          {...commitOnBlur('phone')}
        />
      </div>
      <TextField
        id="ed-pi-location"
        label="Ville / région"
        icon={MapPin}
        value={personalInfo.location}
        placeholder="Ex. Bordeaux (33)"
        autoComplete="address-level2"
        onChange={setField('location')}
        {...commitOnBlur('location')}
      />
      <PhotoField
        photo={personalInfo.photo}
        showPhoto={showPhoto}
        template={template}
        update={update}
        updateSettings={updateSettings}
        onContactCommit={onContactCommit}
      />
    </Panel>
  );
}

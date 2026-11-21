import { describe, expect, it } from 'vitest';
import { settingsForChoice, TEMPLATE_CHOICES } from '../TemplatePicker';
import { defaultSettings, STYLE_DEFAULTS } from '../../../lib/schema';
import { resumeTemplate } from '../../templates/registry';
import ResumeATS from '../../templates/ResumeATS';
import ResumeClassic from '../../templates/ResumeClassic';
import ResumeDesign from '../../templates/ResumeDesign';
import ResumeExpert from '../../templates/ResumeExpert';
import ResumeFocus from '../../templates/ResumeFocus';

describe('choix du modèle', () => {
  it('cinq modèles, dans l’ordre de l’Apparence', () => {
    expect(TEMPLATE_CHOICES.map((c) => c.label)).toEqual(['Design', 'Classique', 'Focus', 'Expert', 'ATS (sobre)']);
  });

  it('miniature : les réglages qu’aurait le CV une fois le modèle choisi', () => {
    const settings = defaultSettings();
    expect(settingsForChoice(settings, 'classic')).toMatchObject({ template: 'design', designStyle: 'classic', ...STYLE_DEFAULTS.classic });
    expect(settingsForChoice(settings, 'ats')).toMatchObject({ template: 'ats', designStyle: 'modern' });
    // Des couleurs choisies restent, comme au clic.
    const custom = { ...settings, primaryColor: '#be123c' };
    expect(settingsForChoice(custom, 'expert')).toMatchObject({ designStyle: 'expert', primaryColor: '#be123c' });
  });

  it('chaque choix a son composant', () => {
    expect(TEMPLATE_CHOICES.map(({ value }) => {
      const s = settingsForChoice(defaultSettings(), value);
      return resumeTemplate(s.template, s.designStyle);
    })).toEqual([ResumeDesign, ResumeClassic, ResumeFocus, ResumeExpert, ResumeATS]);
    expect(resumeTemplate('design', 'inconnu')).toBe(ResumeDesign);
  });
});

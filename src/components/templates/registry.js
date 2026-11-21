import ResumeDesign from './ResumeDesign';
import ResumeClassic from './ResumeClassic';
import ResumeExpert from './ResumeExpert';
import ResumeFocus from './ResumeFocus';
import ResumeATS from './ResumeATS';

// Modèles en couleur, par settings.designStyle (DESIGN_STYLES, lib/schema.js).
const COLOR_TEMPLATES = { modern: ResumeDesign, classic: ResumeClassic, focus: ResumeFocus, expert: ResumeExpert };

// Composant du modèle à afficher : le modèle ATS, ou le modèle en couleur choisi.
export function resumeTemplate(template, designStyle) {
  return template === 'ats' ? ResumeATS : (COLOR_TEMPLATES[designStyle] ?? ResumeDesign);
}

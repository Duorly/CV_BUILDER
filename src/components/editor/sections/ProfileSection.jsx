import AutoTextarea from '../AutoTextarea';
import { SUMMARY_ADVICE, plural, summaryLengthStatus } from '../listUtils';

const ID = 'ed-profile-objective';

function counterText(count, status) {
  const advice = `conseillé : ${SUMMARY_ADVICE.min} à ${SUMMARY_ADVICE.max}`;
  if (status === 'empty') return `Conseil : ${SUMMARY_ADVICE.min} à ${SUMMARY_ADVICE.max} caractères.`;
  if (status === 'ok') return `${plural(count, 'caractère')} · bonne longueur`;
  if (status === 'warn') {
    return `${plural(count, 'caractère')} : c'est long pour un résumé, visez ${SUMMARY_ADVICE.min} à ${SUMMARY_ADVICE.max}.`;
  }
  return `${plural(count, 'caractère')} · ${advice}`;
}

// Section « Profil » : le résumé en tête du CV (personalInfo.objective).
export default function ProfileSection({ objective, update }) {
  const count = objective.trim().length;
  const status = summaryLengthStatus(count);

  return (
    <div className="form-group">
      <label htmlFor={ID}>Résumé du profil</label>
      <p id={`${ID}-tip`} className="editor-hint">
        En 3 ou 4 phrases : votre métier, vos points forts et le poste que vous recherchez.
      </p>
      <AutoTextarea
        id={ID}
        className="editor-textarea"
        minRows={4}
        value={objective}
        placeholder="Ex. Assistante de direction depuis six ans en PME, j'organise agendas, déplacements et réunions pour une équipe de direction de cinq personnes…"
        aria-describedby={`${ID}-tip ${ID}-count`}
        onChange={(e) => {
          const { value } = e.target;
          update((draft) => {
            draft.personalInfo.objective = value;
          });
        }}
      />
      <p id={`${ID}-count`} className={`editor-counter is-${status}`}>
        {counterText(count, status)}
      </p>
    </div>
  );
}

import { buildFileBase } from '../../lib/files';

// Nom des fichiers téléchargés, et titre de la page (que l'impression propose comme nom).
// La version design porte un suffixe : elle ne doit ni écraser la version ATS, au nom
// simple et recommandée pour les sites carrières, ni se confondre avec elle.
// Le nom suit la langue du document : il est lu par le recruteur.
const LETTER_PREFIX = { fr: 'LM', en: 'Cover_Letter' };
const DESIGN_SUFFIX = { fr: 'couleur', en: 'colour' };

// kind : 'ats' (PDF direct ou impression ATS), 'design' ou 'letter'.
export function documentFileBase({ kind = 'ats', lang = 'fr', name = '', company = '' } = {}) {
  const l = lang === 'en' ? 'en' : 'fr';
  if (kind === 'letter') return buildFileBase({ prefix: LETTER_PREFIX[l], name, company });
  const base = buildFileBase({ prefix: 'CV', name, company });
  return kind === 'design' ? `${base}_${DESIGN_SUFFIX[l]}` : base;
}

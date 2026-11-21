import fs from 'node:fs';
import path from 'node:path';

// CV réel facultatif, pour vérifier qu'aucune donnée personnelle ne fuit dans l'application livrée.
// Déposez dans examples/ (dossier ignoré par git, jamais publié) un fichier JSON : une sauvegarde
// CV Builder (« Tout exporter »), une version exportée ou l'ancien format (le CV brut). Le premier
// fichier .json du dossier est lu. Sans lui, les tests qui s'en servent sont ignorés.
// Partagé par les tests unitaires (Vitest) et de bout en bout (Playwright) : pas de dépendance.
export function readPrivateCv(root) {
  const dir = path.join(root, 'examples');
  if (!fs.existsSync(dir)) return null;
  const name = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()[0];
  if (!name) return null;
  const json = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
  const data = json?.cvs?.[0]?.data ?? json?.data ?? json;
  if (!data?.personalInfo) return null;
  const pi = data.personalInfo;
  const text = (value) => String(value ?? '');
  return {
    file: path.join(dir, name),
    personalInfo: { name: text(pi.name), email: text(pi.email), phone: text(pi.phone) },
    socialLinks: (data.socialLinks || []).map((link) => ({ url: text(link?.url) })).filter((link) => link.url),
    companies: [...(data.experiences || []), ...(data.otherExperiences || [])].map((e) => text(e?.company)),
  };
}

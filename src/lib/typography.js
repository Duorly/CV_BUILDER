// Espaces insécables à la française, partagés par les templates, la lettre et le PDF
// direct : un montant (« 80 000 € »), un pourcentage (« 4,2 % ») ou une ponctuation
// haute ne se retrouvent jamais seuls en début de ligne. Appliqué à l'affichage
// seulement : les données enregistrées gardent les espaces saisies.
const NBSP = ' ';

export function nbspText(text) {
  return String(text ?? '')
    .replace(/(\d) (?=\d{3}(?!\d))/g, `$1${NBSP}`)
    .replace(/ (?=[%€:;!?»])/g, NBSP)
    .replace(/« /g, `«${NBSP}`);
}

// Petits formats de date et de nombre pour l'interface (français).

export function formatTime(date) {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// « aujourd'hui à 14:32 », « hier à 09:10 », « le 12 oct. 2026 »
export function formatUpdatedAt(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(today) - startOfDay(date)) / 86400000);
  if (days === 0) return `aujourd’hui à ${formatTime(date)}`;
  if (days === 1) return `hier à ${formatTime(date)}`;
  return `le ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function formatNumber(value, digits = 1) {
  return Number(value).toLocaleString('fr-FR', { maximumFractionDigits: digits });
}

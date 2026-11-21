// Moteur d'impression du navigateur. Le modèle design et le compteur de pages sont
// réglés sur celui de Chrome / Edge ; Safari et Firefox impriment moins fidèlement.
// Sur iPhone et iPad, tous les navigateurs utilisent le moteur de Safari.
// `android` : la fenêtre d'impression est celle du système (imprimante « Enregistrer au
// format PDF », bouton PDF), sans marges ni en-têtes à régler : l'aide est différente.
export function detectPrintBrowser(userAgent, maxTouchPoints = 0) {
  const ua = String(userAgent || '');
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
  if (ios) return { id: 'safari', name: 'Safari', ios: true, android: false };
  const android = /Android/.test(ua);
  if (/Firefox\//.test(ua)) return { id: 'firefox', name: 'Firefox', ios: false, android };
  if (/Safari\//.test(ua) && !/Chrome\/|Chromium\/|Edg\/|OPR\//.test(ua)) {
    return { id: 'safari', name: 'Safari', ios: false, android };
  }
  return { id: 'chromium', name: '', ios: false, android };
}

export function currentPrintBrowser() {
  if (typeof navigator === 'undefined') return detectPrintBrowser('');
  return detectPrintBrowser(navigator.userAgent, navigator.maxTouchPoints || 0);
}

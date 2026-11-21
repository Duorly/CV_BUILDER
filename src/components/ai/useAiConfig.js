import { useMemo, useSyncExternalStore } from 'react';
import { loadAiConfig, subscribeAiConfig } from '../../lib/ai';

// Instantané sérialisé : useSyncExternalStore exige une valeur stable entre deux lectures.
const snapshot = () => JSON.stringify(loadAiConfig());

// Réglages IA courants (fournisseur, modèle par fournisseur, présence des clés),
// mis à jour dès qu'une clé ou un modèle change, y compris dans un autre onglet.
export function useAiConfig() {
  const snap = useSyncExternalStore(subscribeAiConfig, snapshot, snapshot);
  return useMemo(() => JSON.parse(snap), [snap]);
}

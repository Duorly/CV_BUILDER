import { useCallback, useEffect, useRef, useState } from 'react';

// Une demande à l'IA à la fois : chargement, erreur, durée écoulée et annulation.
export function useAiTask() {
  const [state, setState] = useState({ loading: false, label: '', error: null });
  const [elapsed, setElapsed] = useState(0);
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (!state.loading) return undefined;
    const start = Date.now();
    setElapsed(0);
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [state.loading]);

  // fn(signal) → Promise ; renvoie le résultat, ou undefined en cas d'erreur ou d'annulation.
  const run = useCallback(async (label, fn) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ loading: true, label, error: null });
    try {
      const result = await fn(controller.signal);
      if (controller.signal.aborted) return undefined;
      setState({ loading: false, label: '', error: null });
      return result;
    } catch (error) {
      if (controller.signal.aborted || error?.code === 'ABORTED') {
        if (controllerRef.current === controller) setState({ loading: false, label: '', error: null });
        return undefined;
      }
      setState({ loading: false, label: '', error });
      return undefined;
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState({ loading: false, label: '', error: null });
  }, []);

  const clearError = useCallback(() => setState((s) => ({ ...s, error: null })), []);

  return { ...state, elapsed, run, cancel, clearError };
}

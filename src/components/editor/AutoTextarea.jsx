import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useEditorUi } from './editorUi';

// Zone de texte qui grandit avec son contenu (pas de barre de défilement interne).
const AutoTextarea = forwardRef(function AutoTextarea({ value, minRows = 1, ...rest }, ref) {
  const { lang } = useEditorUi();
  const innerRef = useRef(null);
  const widthRef = useRef(0);

  const setRefs = useCallback(
    (el) => {
      innerRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  const resize = useCallback(() => {
    const el = innerRef.current;
    // Éditeur masqué (onglet « Aperçu » sur mobile) : rien à mesurer, la hauteur tomberait à 0.
    // L'observateur ci-dessous relance la mesure quand la zone réapparaît.
    if (!el || !el.offsetWidth) return;
    el.style.height = 'auto';
    const borders = el.offsetHeight - el.clientHeight;
    el.style.height = `${el.scrollHeight + borders}px`;
  }, []);

  useLayoutEffect(resize, [value, resize]);

  // Le retour à la ligne change quand la largeur du panneau change (ou quand il réapparaît).
  useEffect(() => {
    const el = innerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      if (width === widthRef.current) return;
      widthRef.current = width;
      if (width) resize();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [resize]);

  return <textarea ref={setRefs} rows={minRows} value={value} lang={lang} {...rest} />;
});

export default AutoTextarea;

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

// Zone de texte qui grandit avec son contenu (corps de la lettre, notes du suivi).
export default function AutoGrowTextarea({ value, className = 'textarea', ...props }) {
  const ref = useRef(null);

  const resize = useCallback(() => {
    const el = ref.current;
    // Masquée (onglet « Aperçu » sur téléphone) : rien à mesurer, on recalcule à l'affichage.
    if (!el || !el.offsetWidth) return;
    // Repasser par « auto » raccourcit la page un instant : sans ces positions
    // mémorisées, le panneau qui défile sauterait pendant la frappe.
    const scrolled = [];
    for (let node = el.parentElement; node; node = node.parentElement) {
      if (node.scrollTop) scrolled.push([node, node.scrollTop]);
    }
    el.style.height = 'auto';
    // scrollHeight exclut les bordures : on les rajoute (box-sizing: border-box).
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
    for (const [node, top] of scrolled) node.scrollTop = top;
  }, []);

  useLayoutEffect(resize, [value, resize]);

  // Une autre largeur (fenêtre, panneau réaffiché, tableau passé en cartes)
  // replie le texte autrement : on recalcule la hauteur.
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', resize);
      return () => window.removeEventListener('resize', resize);
    }
    let width = el.offsetWidth;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      if (el.offsetWidth === width) return;
      width = el.offsetWidth;
      // Hors du rappel : redimensionner l'élément observé pendant celui-ci
      // déclencherait l'erreur « ResizeObserver loop ».
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(resize);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [resize]);

  return <textarea ref={ref} value={value} className={className} {...props} />;
}

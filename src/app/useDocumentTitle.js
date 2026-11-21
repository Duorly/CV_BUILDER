import { useEffect } from 'react';

// Le titre de la page devient le nom proposé par « Enregistrer en PDF » (y compris via Ctrl/Cmd+P).
// Pendant l'impression, il prend le nom du modèle imprimé : la version design a le sien.
export function useDocumentTitle({ showWelcome, printOverride, fileBase, printFileBase }) {
  useEffect(() => {
    document.title = showWelcome ? 'CV Builder' : printOverride ? printFileBase : fileBase;
    if (showWelcome) return undefined;
    const beforePrint = () => {
      document.title = printFileBase;
    };
    const afterPrint = () => {
      document.title = fileBase;
    };
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, [fileBase, printFileBase, printOverride, showWelcome]);
}

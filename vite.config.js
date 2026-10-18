import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En-têtes de sécurité du site publié. Les mêmes valeurs sont écrites dans netlify.toml et
// vercel.json (un test vérifie qu'elles concordent), et servies par `vite preview` : les tests
// de bout en bout tournent donc sous la même politique que la production.
// CSP : l'application ne contacte que les API d'IA ; le module wasm de @react-pdf/renderer
// est chargé depuis une URL data:, d'où 'wasm-unsafe-eval' et « connect-src data: ».
export const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' data: https://api.anthropic.com https://generativelanguage.googleapis.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export default defineConfig({
  plugins: [react()],
  build: {
    // @react-pdf/renderer (≈ 1,2 Mo) forme un fichier à part, chargé seulement au clic sur « PDF direct ».
    chunkSizeWarningLimit: 1500,
  },
  // Pas sur le serveur de développement : son rechargement à chaud injecte des scripts en ligne.
  preview: {
    headers: SECURITY_HEADERS,
  },
  test: {
    // Tests unitaires de la logique pure (src/**/__tests__), sans navigateur.
    include: ['src/**/*.test.{js,jsx}'],
    environment: 'node',
  },
});

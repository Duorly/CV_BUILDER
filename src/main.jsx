import React from 'react';
import ReactDOM from 'react-dom/client';
// Inter est livrée avec l'app, en fichiers statiques par graisse : Chrome l'intègre
// alors en TrueType dans les PDF imprimés. La police variable de Google Fonts y
// devenait du Type 3, que certains logiciels de recrutement lisent mal.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
// Styles de base en premier : les composants peuvent ensuite les surcharger.
import './index.css';
import './styles/app.css';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

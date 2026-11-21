import React from 'react';
import ReactDOM from 'react-dom/client';
// Polices livrées avec l'app (fichiers statiques par graisse, voir fonts.js).
import './fonts.js';
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

import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import { startAppearance } from './stores/appearanceStore';
import App from './App';

startAppearance();
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

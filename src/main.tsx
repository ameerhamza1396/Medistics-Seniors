import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { HelmetProvider } from 'react-helmet-async'; // Import HelmetProvider

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider> {/* Wrap your App with HelmetProvider */}
      <App />
    </HelmetProvider>
  </React.StrictMode>
);

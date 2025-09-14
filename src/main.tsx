import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { HelmetProvider } from 'react-helmet-async'; // Import HelmetProvider

// Render the React app
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider> {/* Wrap your App with HelmetProvider */}
      <App />
    </HelmetProvider>
  </React.StrictMode>
);

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => console.log('Service Worker registered:', registration))
      .catch(error => console.log('Service Worker registration failed:', error));
  });
}

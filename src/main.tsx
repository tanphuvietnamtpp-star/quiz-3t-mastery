import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for PWA installation support with active fresh-update logic
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registered successfully:', reg.scope);
        
        // Auto-check for service worker updates periodically or on reload
        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('New content available! Auto-updating page view safely...');
                  // Clear clients cache list and refresh current document context
                  caches.keys().then((names) => {
                    for (let name of names) caches.delete(name);
                  }).then(() => {
                    window.location.reload();
                  });
                }
              }
            });
          }
        });
      })
      .catch((err) => console.warn('Service Worker registration failed:', err));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

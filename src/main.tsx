import './styles/global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';
import { setupServiceWorkerRegistration } from './sw-registration';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  setupServiceWorkerRegistration();
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element with id "root" was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// client/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Suppress non-critical ResizeObserver loop warnings that trigger Create React App's fullscreen dev overlay
const ignoreErrors = [
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications'
];

window.addEventListener('error', (e) => {
  if (e && ignoreErrors.some(msg => e.message && e.message.includes(msg))) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

window.addEventListener('unhandledrejection', (e) => {
  if (e && ignoreErrors.some(msg => e.reason && e.reason.message && e.reason.message.includes(msg))) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

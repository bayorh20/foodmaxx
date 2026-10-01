import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { initSpeedSDK } from './services/speedOptimizer.js'

// Initialize Lenis Smooth Scroll SDK ONLY for desktop mouse wheel
// Touch devices use 100% native hardware-composited 120Hz scrolling for instant responsiveness
if (typeof window !== 'undefined') {
  const isTouchScreen = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  if (!isTouchScreen) {
    const lenis = new Lenis({
      duration: 0.9,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    window.lenis = lenis;
  }
}

// Initialize Speed SDK for Core Web Vitals, 120 FPS rendering, and zero touch delay
initSpeedSDK();

// FoodMaxx PWA Service Worker Registration (safe — never blocks React paint)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.location.protocol.startsWith('http')) {

  const registerSW = () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((reg) => {
      // Check for updates silently in background
      reg.update().catch(() => {});

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          // Only reload if there was already an active controller (i.e. a real update, not first install)
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Activate the new worker then reload once — only on actual update
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    }).catch(() => {});

    // Reload on controller change — but ONLY if page has been alive > 3 seconds
    // (guards against first-install activation triggering an instant reload)
    const swReadyAt = Date.now();
    let isReloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!isReloading && (Date.now() - swReadyAt) > 3000) {
        isReloading = true;
        window.location.reload();
      }
    });
  };

  // Register after load so we never delay the first paint
  if (document.readyState === 'complete') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}

import ErrorBoundary from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

if (typeof window !== 'undefined') {
  window.__FOODMAXX_MOUNTED__ = true;
}


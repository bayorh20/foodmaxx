import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { initSpeedSDK } from './services/speedOptimizer.js'
import { Capacitor } from '@capacitor/core';
import { initSentry } from './services/sentryService.js';
import { initAnalytics } from './services/analyticsService.js';

// Initialize Sentry crash reporting & performance monitoring
initSentry();

// Initialize Google Analytics 4 / Firebase Analytics
initAnalytics();

// Initialize Speed SDK for Core Web Vitals, 120 FPS rendering, and zero touch delay
initSpeedSDK();

// ============================================================
// FOODMAXX INSTANT LIVE OVER-THE-AIR (OTA) AUTO-UPDATE ENGINE
// Automatically updates the installed APK without requiring re-download!
// ============================================================
const isNative = typeof window !== 'undefined' && Boolean(Capacitor.isNativePlatform());
if (typeof window !== 'undefined' && !isNative && 'serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  const hadInitialController = Boolean(navigator.serviceWorker.controller);
  let isReloading = false;

  const performAutoUpdate = (reg) => {
    if (!reg) return;
    reg.update().catch(() => {});
  };

  const registerSW = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });

      // 1. Silent update check on cold start
      performAutoUpdate(reg);

      // 2. Auto-check on resume / visibility change (when returning from another app or phone unlock)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          performAutoUpdate(reg);
        }
      });
      window.addEventListener('focus', () => performAutoUpdate(reg));
      window.addEventListener('online', () => performAutoUpdate(reg));

      // 3. Heartbeat polling: check for new deployments every 45 seconds while app is active
      setInterval(() => performAutoUpdate(reg), 45000);

      // 4. Handle pending/waiting worker
      if (reg.waiting && hadInitialController) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // 5. When a new service worker is detected
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && hadInitialController) {
            console.log('[FoodMaxx OTA] New update downloaded! Applying immediately...');
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    } catch (e) {
      console.warn('[FoodMaxx OTA] Registration notice:', e);
    }
  };

  // 6. When the new service worker activates, auto-reload to display updated UI
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadInitialController && !isReloading) {
      isReloading = true;
      console.log('[FoodMaxx OTA] Controller changed. Refreshing to new version...');
      setTimeout(() => {
        window.location.reload();
      }, 200);
    }
  });

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


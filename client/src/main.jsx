import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { initSpeedSDK } from './services/speedOptimizer.js'

// Initialize Lenis Smooth Scroll SDK for ultra-smooth 60-120 FPS inertial scrolling
if (typeof window !== 'undefined') {
  const lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.2
  });
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  window.lenis = lenis;
}

// Initialize Speed SDK for Core Web Vitals, 120 FPS rendering, and zero touch delay
initSpeedSDK();

// FoodMaxx PWA Service Worker Registration
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Periodic update checks
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('FoodMaxx PWA has a new update ready.');
            }
          });
        }
      });
    }).catch((err) => {
      console.log('Service Worker setup notice:', err.message);
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

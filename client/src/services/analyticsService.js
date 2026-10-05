import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported, logEvent as firebaseLogEvent } from 'firebase/analytics';

const firebaseConfig = {
  projectId: 'foodmaxxapp',
  appId: '1:1089997088415:web:926dc33ca57ee61efba4aa',
  storageBucket: 'foodmaxxapp.firebasestorage.app',
  apiKey: 'AIzaSyAF6AcT8cCNQO81_1rknzUR1LYCLWE0zGM',
  authDomain: 'foodmaxxapp.firebaseapp.com',
  messagingSenderId: '1089997088415',
  measurementId: 'G-FOODMAXXAPP'
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let analyticsInstance = null;

export async function initAnalytics() {
  if (typeof window === 'undefined') return null;
  try {
    const supported = await isSupported();
    if (supported && !analyticsInstance) {
      analyticsInstance = getAnalytics(app);
    }
  } catch (err) {
    console.warn('[FoodMaxx Analytics] Notice initializing GA4:', err);
  }
  return analyticsInstance;
}

export async function logAnalyticsEvent(eventName, eventParams = {}) {
  try {
    const analytics = analyticsInstance || await initAnalytics();
    if (analytics) {
      firebaseLogEvent(analytics, eventName, {
        app_name: 'FoodMaxx',
        platform: typeof window !== 'undefined' && window.Capacitor?.isNativePlatform() ? 'android_apk' : 'web',
        ...eventParams
      });
    }
  } catch (e) {
    // Silent fail in development / offline
  }
}

export default {
  initAnalytics,
  logAnalyticsEvent
};

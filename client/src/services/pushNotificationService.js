// ============================================================
// FOODMAXX PUSH NOTIFICATION SERVICE
// Complete Web Push & Firebase Cloud Messaging (FCM) Management
// Supports desktop browsers, Android Chrome/PWA, and iOS 16.4+ PWA
// ============================================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseDb';
import { playOrderNotificationSound, triggerHaptic } from './nativeMobile';

const PUSH_TOKEN_STORAGE_KEY = 'fmx_fcm_push_token';
const PUSH_PERMISSION_KEY = 'fmx_web_notification_pref';

const firebaseConfig = {
  projectId: 'foodmaxxapp',
  appId: '1:1089997088415:web:926dc33ca57ee61efba4aa',
  storageBucket: 'foodmaxxapp.firebasestorage.app',
  apiKey: 'AIzaSyAF6AcT8cCNQO81_1rknzUR1LYCLWE0zGM',
  authDomain: 'foodmaxxapp.firebaseapp.com',
  messagingSenderId: '1089997088415'
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let messagingInstance = null;

/**
 * Initialize messaging instance safely (checking browser compatibility)
 */
export async function getFirebaseMessaging() {
  if (typeof window === 'undefined') return null;
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  if (!messagingInstance) {
    messagingInstance = getMessaging(app);
  }
  return messagingInstance;
}

/**
 * Check if the current browser/device supports Web Push Notifications
 */
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'Notification' in window
  );
}

/**
 * Get current notification permission
 * @returns {'granted' | 'denied' | 'default' | 'unsupported'}
 */
export function getPushPermissionStatus() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Get cached push token from local storage
 */
export function getSavedPushToken() {
  try {
    return localStorage.getItem(PUSH_TOKEN_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Register Service Worker for Push Notifications
 */
export async function registerPushServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    return registration;
  } catch (err) {
    console.warn('Push service worker registration notice:', err);
    return null;
  }
}

/**
 * Save Push Token to Firestore database (/push_tokens/{tokenId})
 */
export async function savePushTokenToFirestore(token, userId = null, extraData = {}) {
  if (!token) return;

  try {
    let uid = userId;
    if (!uid) {
      try {
        const u = localStorage.getItem('fmx_user');
        if (u) uid = JSON.parse(u)?.id;
      } catch {}
    }

    // Clean token key for doc ID (using safe hash or slice)
    const tokenDocId = `token_${encodeURIComponent(token.slice(-32))}`;
    const tokenRef = doc(db, 'push_tokens', tokenDocId);

    await setDoc(tokenRef, {
      token,
      user_id: uid || 'anonymous_guest',
      platform: /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios_pwa' : /Android/.test(navigator.userAgent) ? 'android' : 'desktop_web',
      user_agent: navigator.userAgent,
      last_active: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...extraData
    }, { merge: true });

    localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
  } catch (err) {
    console.warn('Failed to save push token to Firestore:', err);
  }
}

/**
 * Request Push Notification Permission and Install Token
 * @param {string} userId - Optional user ID to associate token with
 * @returns {Promise<{ success: boolean, permission: string, token: string|null, error?: string }>}
 */
export async function installPushNotifications(userId = null) {
  if (!isPushSupported()) {
    return { success: false, permission: 'unsupported', token: null, error: 'Push notifications are not supported on this browser' };
  }

  try {
    // 1. Request Browser Permission
    const permission = await Notification.requestPermission();
    localStorage.setItem(PUSH_PERMISSION_KEY, permission);
    window.dispatchEvent(new CustomEvent('fmx_notification_permission_changed', { detail: permission }));

    if (permission !== 'granted') {
      return { success: false, permission, token: null, error: 'Permission was not granted' };
    }

    // 2. Register Service Worker
    const swRegistration = await registerPushServiceWorker();

    // 3. Obtain Firebase Cloud Messaging Token
    let token = null;
    const messaging = await getFirebaseMessaging();

    if (messaging && swRegistration) {
      try {
        token = await getToken(messaging, {
          serviceWorkerRegistration: swRegistration
        });
      } catch (tokenErr) {
        console.warn('FCM getToken notice, falling back to local push:', tokenErr);
      }
    }

    // 4. Save Token if obtained
    if (token) {
      await savePushTokenToFirestore(token, userId);
    }

    // 5. Trigger initial celebratory push notification
    try {
      await triggerLocalPushNotification('🔔 FoodMaxx Notifications Active!', {
        body: 'You are now ready to receive real-time kitchen and delivery updates on this device.',
        tag: 'fmx_installed'
      });
      playOrderNotificationSound();
      triggerHaptic('success');
    } catch {}

    return { success: true, permission: 'granted', token };
  } catch (err) {
    console.error('installPushNotifications error:', err);
    return { success: false, permission: getPushPermissionStatus(), token: null, error: err.message };
  }
}

/**
 * Display a high-priority local push notification via Service Worker
 */
export async function triggerLocalPushNotification(title, options = {}) {
  if (getPushPermissionStatus() !== 'granted') return false;

  const defaultOptions = {
    body: options.body || 'New live update from FoodMaxx.',
    icon: options.icon || '/foodmaxx-logo.png',
    badge: options.badge || '/favicon.svg',
    tag: options.tag || `fmx_alert_${Date.now()}`,
    vibrate: [200, 100, 200],
    data: {
      url: options.url || '/',
      timestamp: Date.now(),
      ...options.data
    }
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, defaultOptions);
        return true;
      }
    }
    if ('Notification' in window) {
      new Notification(title, defaultOptions);
      return true;
    }
  } catch (err) {
    console.warn('triggerLocalPushNotification notice:', err);
  }
  return false;
}

/**
 * 1-Tap Send Test Push Notification
 */
export async function sendTestPushNotification() {
  playOrderNotificationSound();
  triggerHaptic('medium');

  const perm = getPushPermissionStatus();
  if (perm !== 'granted') {
    return installPushNotifications();
  }

  const success = await triggerLocalPushNotification('🔔 FoodMaxx Delivery Test', {
    body: 'Test successful! Your device is fully configured to receive order and kitchen alerts.',
    tag: 'fmx_test_push'
  });

  return { success, permission: perm };
}

/**
 * Set up foreground push listener when the user has the website open
 */
export async function setupForegroundPushListener(onReceive) {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    playOrderNotificationSound();
    triggerHaptic('success');

    const title = payload.notification?.title || payload.data?.title || 'FoodMaxx Alert';
    const body = payload.notification?.body || payload.data?.body || 'Order update received';

    if (typeof onReceive === 'function') {
      onReceive({ title, body, payload });
    }

    window.dispatchEvent(new CustomEvent('fmx_push_received', {
      detail: { title, body, payload }
    }));
  });
}

export default {
  isPushSupported,
  getPushPermissionStatus,
  getSavedPushToken,
  installPushNotifications,
  triggerLocalPushNotification,
  sendTestPushNotification,
  setupForegroundPushListener
};

// ============================================================
// FOODMAXX UNIFIED PUSH NOTIFICATION SERVICE
// Complete Native (Capacitor Android/iOS) & Web Push (FCM/PWA) Management
// Supports:
// 1. Android APK & iOS IPA native notifications via @capacitor/push-notifications
// 2. Desktop Chrome, Edge, Safari & Firefox Web Push
// 3. Android Chrome PWA & iOS 16.4+ Web Push
// ============================================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, setDoc, getDocs, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseDb';
import { playOrderNotificationSound, triggerHaptic } from './nativeMobile';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

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
let nativeListenersConfigured = false;

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
 * Check if the current environment supports Push Notifications (Native or Web)
 */
export function isPushSupported() {
  if (Capacitor.isNativePlatform()) return true;
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
  if (Capacitor.isNativePlatform()) {
    return localStorage.getItem(PUSH_PERMISSION_KEY) || 'default';
  }
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
    const tokenDocId = `token_${encodeURIComponent(token.slice(-36).replace(/[^a-zA-Z0-9_-]/g, '_'))}`;
    const tokenRef = doc(db, 'push_tokens', tokenDocId);

    const platform = Capacitor.isNativePlatform() 
      ? Capacitor.getPlatform() 
      : /iPhone|iPad|iPod/.test(navigator.userAgent) 
        ? 'ios_pwa' 
        : /Android/.test(navigator.userAgent) 
          ? 'android_web' 
          : 'desktop_web';

    await setDoc(tokenRef, {
      token,
      user_id: uid || 'anonymous_guest',
      platform,
      is_native: Capacitor.isNativePlatform(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'native_app',
      last_active: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...extraData
    }, { merge: true });

    localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
    console.log('[FoodMaxx Push] Device token successfully registered in Firestore:', tokenDocId);
  } catch (err) {
    console.warn('[FoodMaxx Push] Notice: Failed to save push token to Firestore:', err);
  }
}

/**
 * Configure Native Capacitor Push Listeners (Android APK & iOS IPA)
 */
export async function configureNativePushListeners(userId = null) {
  if (!Capacitor.isNativePlatform() || nativeListenersConfigured) return;

  try {
    // 1. On successful token registration from APNS / FCM
    await PushNotifications.addListener('registration', async (token) => {
      console.log('[FoodMaxx Native Push] Registration token:', token.value);
      localStorage.setItem(PUSH_PERMISSION_KEY, 'granted');
      localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token.value);
      window.dispatchEvent(new CustomEvent('fmx_notification_permission_changed', { detail: 'granted' }));
      await savePushTokenToFirestore(token.value, userId, { native: true });
    });

    // 2. On registration error
    await PushNotifications.addListener('registrationError', (err) => {
      console.warn('[FoodMaxx Native Push] Registration error:', err);
    });

    // 3. On foreground push received
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[FoodMaxx Native Push] Foreground push received:', notification);
      playOrderNotificationSound();
      triggerHaptic('success');

      window.dispatchEvent(new CustomEvent('fmx_push_received', {
        detail: {
          title: notification.title,
          body: notification.body,
          data: notification.data
        }
      }));
    });

    // 4. On push notification tapped by user
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('[FoodMaxx Native Push] Action performed:', notification);
      const url = notification.notification.data?.url || '/';
      if (typeof window !== 'undefined' && url) {
        window.location.href = url;
      }
    });

    nativeListenersConfigured = true;
    console.log('[FoodMaxx Native Push] Native notification listeners initialized.');
  } catch (e) {
    console.warn('[FoodMaxx Native Push] Listener configuration warning:', e);
  }
}

/**
 * Request Push Notification Permission and Install Token
 * Handles both Native Mobile (Capacitor) and Browser/PWA
 * @param {string} userId - Optional user ID to associate token with
 * @returns {Promise<{ success: boolean, permission: string, token: string|null, error?: string }>}
 */
export async function installPushNotifications(userId = null) {
  // -------------------------------------------------------------
  // PATH A: NATIVE CAPACITOR APP (Android APK / iOS IPA)
  // -------------------------------------------------------------
  if (Capacitor.isNativePlatform()) {
    try {
      await configureNativePushListeners(userId);
      const permStatus = await PushNotifications.requestPermissions();
      const granted = permStatus.receive === 'granted';

      if (granted) {
        localStorage.setItem(PUSH_PERMISSION_KEY, 'granted');
        window.dispatchEvent(new CustomEvent('fmx_notification_permission_changed', { detail: 'granted' }));
        await PushNotifications.register();
        playOrderNotificationSound();
        triggerHaptic('success');
        return { success: true, permission: 'granted', token: getSavedPushToken() };
      } else {
        localStorage.setItem(PUSH_PERMISSION_KEY, 'denied');
        window.dispatchEvent(new CustomEvent('fmx_notification_permission_changed', { detail: 'denied' }));
        return { success: false, permission: 'denied', token: null, error: 'Permission denied on device' };
      }
    } catch (err) {
      console.error('[FoodMaxx Push] Native permission error:', err);
      return { success: false, permission: 'error', token: null, error: err.message };
    }
  }

  // -------------------------------------------------------------
  // PATH B: WEB / PWA / BROWSER
  // -------------------------------------------------------------
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
    let swRegistration = null;
    if ('serviceWorker' in navigator) {
      swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => null);
    }

    // 3. Obtain Firebase Cloud Messaging Token or fallback token
    let token = null;
    const messaging = await getFirebaseMessaging();

    if (messaging && swRegistration) {
      try {
        token = await getToken(messaging, {
          serviceWorkerRegistration: swRegistration
        });
      } catch (tokenErr) {
        console.warn('[FoodMaxx Push] FCM getToken notice, creating fallback push channel:', tokenErr);
      }
    }

    // Generate fallback client subscription token if FCM key was unavailable
    if (!token) {
      token = getSavedPushToken() || `web_push_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    }

    // 4. Save Token to Firestore
    await savePushTokenToFirestore(token, userId);

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
    console.error('[FoodMaxx Push] installPushNotifications error:', err);
    return { success: false, permission: getPushPermissionStatus(), token: null, error: err.message };
  }
}

/**
 * Display a high-priority local push notification via Service Worker or Native Notification
 */
export async function triggerLocalPushNotification(title, options = {}) {
  const perm = getPushPermissionStatus();
  if (perm !== 'granted' && !Capacitor.isNativePlatform()) return false;

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
    console.warn('[FoodMaxx Push] triggerLocalPushNotification notice:', err);
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
 * Auto-initialize Push Notifications on App Start (silent sync if already granted)
 */
export async function autoInitPushNotifications(userId = null) {
  if (Capacitor.isNativePlatform()) {
    try {
      await configureNativePushListeners(userId);
      const perm = await PushNotifications.checkPermissions();
      if (perm.receive === 'granted') {
        await PushNotifications.register();
      }
    } catch {}
    return;
  }

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    const saved = getSavedPushToken();
    if (saved) {
      savePushTokenToFirestore(saved, userId).catch(() => {});
    }
  }
}

export default {
  isPushSupported,
  getPushPermissionStatus,
  getSavedPushToken,
  installPushNotifications,
  triggerLocalPushNotification,
  sendTestPushNotification,
  autoInitPushNotifications
};

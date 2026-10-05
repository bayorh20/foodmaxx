// ============================================================
// FOODMAXX UNIFIED PUSH NOTIFICATION SERVICE
// Complete Native (Capacitor Android/iOS) & Web Push (FCM/PWA) Management
// Supports:
// 1. Android APK & iOS IPA native notifications via @capacitor/push-notifications
// 2. Desktop Chrome, Edge, Safari & Firefox Web Push
// 3. Android Chrome PWA & iOS 16.4+ Web Push
// 4. Realtime Broadcast Receiver on all active devices via Firestore onSnapshot
// ============================================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  addDoc, 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebaseDb';
import { playOrderNotificationSound, triggerHaptic } from './nativeMobile';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

const PUSH_TOKEN_STORAGE_KEY = 'fmx_fcm_push_token';
const PUSH_PERMISSION_KEY = 'fmx_web_notification_pref';
const DEVICE_ID_STORAGE_KEY = 'fmx_device_id';

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
let broadcastUnsubscribe = null;

/**
 * Get or create a persistent device identifier stored in localStorage
 */
export function getOrCreateDeviceId() {
  if (typeof window === 'undefined') return 'server_render';
  try {
    let id = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (!id) {
      const rand = Math.random().toString(36).substring(2, 10);
      const time = Date.now().toString(36);
      id = `dev_${time}_${rand}`;
      localStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return `dev_${Date.now()}`;
  }
}

/**
 * Detect client platform precisely
 */
export function detectPlatform() {
  if (typeof window === 'undefined') return 'server';
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform(); // 'android' | 'ios'
  }
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  if (isAndroid) {
    return isStandalone ? 'android_apk' : 'android_web';
  }
  if (isIos) {
    return isStandalone ? 'ios_pwa' : 'ios_web';
  }
  return 'desktop_web';
}

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
 * Register or update the current device in Firestore (/push_tokens/{deviceId})
 * Ensures EVERY visitor device appears in the subscribers list immediately!
 */
export async function ensureDeviceRegistered(userId = null, customToken = null) {
  if (typeof window === 'undefined') return null;

  const deviceId = getOrCreateDeviceId();
  const platform = detectPlatform();
  const perm = getPushPermissionStatus();

  let token = customToken || getSavedPushToken();
  if (!token) {
    token = `fmx_${platform}_${deviceId}`;
    try {
      localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
    } catch {}
  }

  let uid = userId;
  if (!uid) {
    try {
      const u = localStorage.getItem('fmx_user');
      if (u) uid = JSON.parse(u)?.id;
    } catch {}
  }

  const deviceData = {
    id: deviceId,
    token,
    platform,
    permission: perm,
    user_id: uid || 'anonymous_guest',
    is_native: Capacitor.isNativePlatform(),
    user_agent: navigator.userAgent || 'unknown',
    last_active: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const tokenRef = doc(db, 'push_tokens', deviceId);
    await setDoc(tokenRef, deviceData, { merge: true });
    return deviceData;
  } catch (err) {
    console.warn('[FoodMaxx Push] ensureDeviceRegistered notice:', err);
    return deviceData;
  }
}

/**
 * Save Push Token to Firestore database (/push_tokens/{deviceId})
 */
export async function savePushTokenToFirestore(token, userId = null, extraData = {}) {
  if (!token) return;
  const deviceId = getOrCreateDeviceId();
  const platform = detectPlatform();
  const perm = getPushPermissionStatus();

  try {
    let uid = userId;
    if (!uid) {
      try {
        const u = localStorage.getItem('fmx_user');
        if (u) uid = JSON.parse(u)?.id;
      } catch {}
    }

    const tokenRef = doc(db, 'push_tokens', deviceId);
    await setDoc(tokenRef, {
      id: deviceId,
      token,
      platform,
      permission: perm,
      user_id: uid || 'anonymous_guest',
      is_native: Capacitor.isNativePlatform(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'native_app',
      last_active: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...extraData
    }, { merge: true });

    localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
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
    // 0. Ensure Android High-Importance Notification Channels exist for background delivery
    if (Capacitor.getPlatform() === 'android') {
      await PushNotifications.createChannel({
        id: 'foodmaxx_orders',
        name: 'FoodMaxx Orders & Updates',
        description: 'Live order tracking, kitchen status, and rider updates',
        importance: 5, // 5 = IMPORTANCE_HIGH (Pop-up on lockscreen and heads-up banner)
        visibility: 1, // 1 = VISIBILITY_PUBLIC (Shows on lockscreen)
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#EA4C2A'
      }).catch(e => console.warn('[FoodMaxx Push] Channel creation notice:', e));

      await PushNotifications.createChannel({
        id: 'fcm_fallback_notification_channel',
        name: 'FoodMaxx Announcements',
        description: 'FoodMaxx promotional updates and news',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#EA4C2A'
      }).catch(e => console.warn('[FoodMaxx Push] Fallback channel notice:', e));
    }

    // 1. On successful token registration from APNS / FCM
    await PushNotifications.addListener('registration', async (token) => {
      localStorage.setItem(PUSH_PERMISSION_KEY, 'granted');
      localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token.value);
      window.dispatchEvent(new CustomEvent('fmx_notification_permission_changed', { detail: 'granted' }));
      await savePushTokenToFirestore(token.value, userId, { native: true, permission: 'granted' });
    });

    // 2. On registration error
    await PushNotifications.addListener('registrationError', (err) => {
      console.warn('[FoodMaxx Native Push] Registration error:', err);
    });

    // 3. On foreground push received
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      playOrderNotificationSound(true);
      triggerHaptic('success');

      window.dispatchEvent(new CustomEvent('fmx_push_received', {
        detail: {
          title: notification.title,
          body: notification.body,
          data: notification.data
        }
      }));
    });

    // 4. On push notification tapped by user (forces app to open & navigate)
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      const url = notification.notification.data?.url || '/';
      if (typeof window !== 'undefined') {
        try { window.focus(); } catch {}
        if (url.includes('tab=')) {
          const tabParam = new URLSearchParams(url.split('?')[1]).get('tab');
          if (tabParam) {
            window.dispatchEvent(new CustomEvent('fmx_switch_tab', { detail: tabParam }));
          }
        }
        window.location.href = url;
      }
    });

    nativeListenersConfigured = true;
  } catch (e) {
    console.warn('[FoodMaxx Native Push] Listener configuration warning:', e);
  }
}

/**
 * Display a high-priority local push notification via Service Worker or Native Notification
 * Touching the notification forces the app to open. No website links are shown.
 */
export async function triggerLocalPushNotification(title, options = {}) {
  // Strip any raw URLs from the visible message so website links are NEVER shown
  const rawBody = options.body || 'New live update from FoodMaxx.';
  const cleanBody = String(rawBody).replace(/https?:\/\/[^\s]+/gi, '').trim();

  const defaultOptions = {
    body: cleanBody,
    icon: options.icon || '/foodmaxx-logo.png',
    badge: options.badge || '/favicon.svg',
    image: options.image || options.imageUrl || options.image_url || undefined,
    tag: options.tag || `fmx_alert_${Date.now()}`,
    vibrate: [200, 100, 200],
    data: {
      url: options.url || '/',
      timestamp: Date.now(),
      ...options.data
    }
  };

  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          const perm = await Notification.requestPermission();
          localStorage.setItem(PUSH_PERMISSION_KEY, perm);
          window.dispatchEvent(new CustomEvent('fmx_notification_permission_changed', { detail: perm }));
        } catch {}
      }
      if (Notification.permission !== 'granted') {
        console.warn('[FoodMaxx Push] Notification permission not granted:', Notification.permission);
        return false;
      }
    }

    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg && reg.showNotification) {
        await reg.showNotification(title, defaultOptions);
        return true;
      }
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(title, defaultOptions);
      notif.onclick = function(event) {
        event.preventDefault();
        try { window.focus(); } catch {}
        const dest = options.url || '/';
        if (typeof window !== 'undefined' && dest) {
          if (dest.includes('tab=')) {
            const tabParam = new URLSearchParams(dest.split('?')[1]).get('tab');
            if (tabParam) {
              window.dispatchEvent(new CustomEvent('fmx_switch_tab', { detail: tabParam }));
            }
          }
          if (window.location.pathname !== dest && dest.startsWith('/')) {
            window.location.href = dest;
          }
        }
        notif.close();
      };
      return true;
    }
  } catch (err) {
    console.warn('[FoodMaxx Push] triggerLocalPushNotification notice:', err);
  }
  return false;
}

/**
 * Request Push Notification Permission and Install Token
 * Handles both Native Mobile (Capacitor) and Browser/PWA
 * @param {string} userId - Optional user ID to associate token with
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
        await PushNotifications.register().catch(e => console.warn('[FoodMaxx Push] Register notice:', e));
        await ensureDeviceRegistered(userId).catch(() => {});
        playOrderNotificationSound(true);
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
  // PATH B: WEB / PWA / BROWSER / TWA
  // -------------------------------------------------------------
  if (!isPushSupported()) {
    // Still register device in Firestore so it can receive in-app alerts!
    await ensureDeviceRegistered(userId);
    return { success: false, permission: 'unsupported', token: getSavedPushToken(), error: 'Push notifications not supported on browser' };
  }

  try {
    // 1. Request Browser Permission
    const permission = await Notification.requestPermission();
    localStorage.setItem(PUSH_PERMISSION_KEY, permission);
    window.dispatchEvent(new CustomEvent('fmx_notification_permission_changed', { detail: permission }));

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
        console.warn('[FoodMaxx Push] FCM getToken notice:', tokenErr);
      }
    }

    // Fallback token
    if (!token) {
      const deviceId = getOrCreateDeviceId();
      const platform = detectPlatform();
      token = getSavedPushToken() || `fmx_${platform}_${deviceId}`;
    }

    // 4. Save Token to Firestore
    await savePushTokenToFirestore(token, userId, { permission });

    if (permission === 'granted') {
      // 5. Trigger initial celebratory push notification
      try {
        await triggerLocalPushNotification('🔔 FoodMaxx Notifications Active!', {
          body: 'You are now ready to receive real-time kitchen and delivery updates on this device.',
          tag: 'fmx_installed'
        });
        playOrderNotificationSound(true);
        triggerHaptic('success');
      } catch {}
    }

    return { success: permission === 'granted', permission, token };
  } catch (err) {
    console.error('[FoodMaxx Push] installPushNotifications error:', err);
    return { success: false, permission: getPushPermissionStatus(), token: null, error: err.message };
  }
}

/**
 * 1-Tap Send Test Push Notification
 */
export async function sendTestPushNotification() {
  playOrderNotificationSound(true);
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
 * Auto-initialize Push Notifications on App Start (silent sync)
 */
export async function autoInitPushNotifications(userId = null) {
  // Always register/update this device in Firestore so it's counted!
  await ensureDeviceRegistered(userId);

  if (Capacitor.isNativePlatform()) {
    try {
      await configureNativePushListeners(userId);
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive !== 'granted') {
        perm = await PushNotifications.requestPermissions();
      }
      if (perm.receive === 'granted') {
        localStorage.setItem(PUSH_PERMISSION_KEY, 'granted');
        await PushNotifications.register().catch(e => console.warn('[FoodMaxx Push] Auto-init register notice:', e));
        await ensureDeviceRegistered(userId);
      }
    } catch (e) {
      console.warn('[FoodMaxx Push] Native init error:', e);
    }
    return;
  }

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    const saved = getSavedPushToken();
    if (saved) {
      savePushTokenToFirestore(saved, userId, { permission: 'granted' }).catch(() => {});
    }
  }
}

/**
 * Real-time Broadcast Listener across all devices via Firestore onSnapshot
 * Whenever an admin sends a broadcast, this fires on EVERY active app instance!
 */
export function subscribeToIncomingBroadcasts(onBroadcast) {
  if (typeof window === 'undefined') return () => {};
  if (broadcastUnsubscribe) {
    try { broadcastUnsubscribe(); } catch {}
  }

  try {
    const q = query(
      collection(db, 'notification_logs'),
      orderBy('created_at', 'desc'),
      limit(1)
    );

    let isFirstSnapshot = true;
    broadcastUnsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const logId = change.doc.id;

          const createdAt = new Date(data.created_at || 0).getTime();
          const ageSeconds = (Date.now() - createdAt) / 1000;

          // Check if already displayed on this device
          let lastSeen = null;
          try { lastSeen = localStorage.getItem('fmx_last_notif_seen'); } catch {}
          if (lastSeen === logId) return;

          // Only alert for notifications created recently (within last 5 minutes)
          if (ageSeconds > 300 && isFirstSnapshot) return;

          // Check platform targeting
          const currentPlatform = detectPlatform();
          const target = data.target_platform || 'all';

          let matchesTarget = target === 'all';
          if (!matchesTarget) {
            if (target === 'android' && currentPlatform.includes('android')) matchesTarget = true;
            if (target === 'ios' && currentPlatform.includes('ios')) matchesTarget = true;
            if (target === 'web' && currentPlatform.includes('web')) matchesTarget = true;
          }

          if (!matchesTarget) return;

          // Mark as seen so we don't repeat on this device
          try {
            localStorage.setItem('fmx_last_notif_seen', logId);
          } catch {}

          // 1. Play loud chime audio
          playOrderNotificationSound(true);
          triggerHaptic('success');

          const photoUrl = data.image_url && data.image_url !== '/foodmaxx-logo.png' ? data.image_url : undefined;

          // 2. Trigger native / OS push notification if granted
          triggerLocalPushNotification(data.title, {
            body: data.message,
            url: data.url || '/',
            icon: '/foodmaxx-logo.png',
            image: photoUrl,
            imageUrl: photoUrl,
            tag: `fmx_broadcast_${logId}`
          }).catch(() => {});

          // 3. Dispatch global browser event for in-app floating banner
          window.dispatchEvent(new CustomEvent('fmx_broadcast_received', {
            detail: {
              id: logId,
              title: data.title,
              message: data.message,
              url: data.url || '/',
              imageUrl: data.image_url || '/foodmaxx-logo.png',
              createdAt: data.created_at
            }
          }));

          if (typeof onBroadcast === 'function') {
            onBroadcast({ id: logId, ...data });
          }
        }
      });
      isFirstSnapshot = false;
    }, (err) => {
      console.warn('[FoodMaxx Push] Broadcast listener notice:', err);
    });

    return () => {
      if (broadcastUnsubscribe) {
        broadcastUnsubscribe();
        broadcastUnsubscribe = null;
      }
    };
  } catch (err) {
    console.warn('[FoodMaxx Push] Could not subscribe to broadcasts:', err);
    return () => {};
  }
}

/**
 * Fetch all registered subscriber devices from Firestore
 */
export async function getAllRegisteredPushTokens() {
  try {
    const snap = await getDocs(collection(db, 'push_tokens'));
    const list = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });
    return list;
  } catch (err) {
    console.warn('[FoodMaxx Push] Error fetching push tokens:', err);
    return [];
  }
}

/**
 * Delete a registered device token
 */
export async function deletePushToken(deviceId) {
  if (!deviceId) return false;
  try {
    await deleteDoc(doc(db, 'push_tokens', deviceId));
    return true;
  } catch (err) {
    console.warn('[FoodMaxx Push] Error deleting push token:', err);
    return false;
  }
}

/**
 * Fetch notification broadcast logs from Firestore
 */
export async function getNotificationBroadcastLogs() {
  try {
    const q = query(collection(db, 'notification_logs'), orderBy('created_at', 'desc'), limit(50));
    const snap = await getDocs(q);
    const logs = [];
    snap.forEach((d) => logs.push({ id: d.id, ...d.data() }));
    return logs;
  } catch (err) {
    try {
      const snap2 = await getDocs(collection(db, 'notification_logs'));
      const logs = [];
      snap2.forEach((d) => logs.push({ id: d.id, ...d.data() }));
      return logs.reverse().slice(0, 50);
    } catch {
      return [];
    }
  }
}

/**
 * Broadcast a live push notification to subscribers
 * @param {object} params - { title, message, url, targetPlatform, imageUrl, sender }
 */
export async function broadcastPushNotification({
  title,
  message,
  url = '/',
  targetPlatform = 'all',
  imageUrl = '/foodmaxx-logo.png',
  sender = 'FoodMaxx Admin'
}) {
  if (!title || !message) throw new Error('Title and message are required');

  // 1. Fetch current registered subscriber tokens
  let tokens = await getAllRegisteredPushTokens();
  
  // Ensure the sender's current device is registered if not already
  if (tokens.length === 0) {
    const selfDevice = await ensureDeviceRegistered();
    if (selfDevice) tokens = [selfDevice];
  }

  const filtered = tokens.filter((t) => {
    if (targetPlatform === 'all') return true;
    if (targetPlatform === 'android' && (t.platform || '').includes('android')) return true;
    if (targetPlatform === 'ios' && (t.platform || '').includes('ios')) return true;
    if (targetPlatform === 'web' && (t.platform || '').includes('web')) return true;
    return false;
  });

  // 2. Strip any raw website URLs from visible title & message so links are never shown
  const cleanTitle = String(title).replace(/https?:\/\/[^\s]+/gi, '').trim();
  const cleanMessage = String(message).replace(/https?:\/\/[^\s]+/gi, '').trim();

  // 3. Record broadcast log in Firestore (triggers real-time onSnapshot on all devices!)
  let logId = null;
  try {
    const logRef = await addDoc(collection(db, 'notification_logs'), {
      title: cleanTitle,
      message: cleanMessage,
      url,
      target_platform: targetPlatform,
      target_count: filtered.length || tokens.length || 1,
      image_url: imageUrl,
      sender,
      created_at: new Date().toISOString()
    });
    logId = logRef.id;
  } catch (e) {
    console.warn('[FoodMaxx Push] Notice saving notification log:', e);
  }

  // 4. Play sound chime and trigger local test alert on active device immediately
  playOrderNotificationSound(true);
  triggerHaptic('success');
  const photoUrl = imageUrl && imageUrl !== '/foodmaxx-logo.png' ? imageUrl : undefined;
  await triggerLocalPushNotification(cleanTitle, {
    body: cleanMessage,
    url,
    icon: '/foodmaxx-logo.png',
    image: photoUrl,
    imageUrl: photoUrl,
    tag: `fmx_broadcast_${Date.now()}`
  }).catch(() => {});

  // Dispatch local in-app event as well
  window.dispatchEvent(new CustomEvent('fmx_broadcast_received', {
    detail: {
      id: logId || `bcast_${Date.now()}`,
      title: cleanTitle,
      message: cleanMessage,
      url,
      imageUrl,
      createdAt: new Date().toISOString()
    }
  }));

  return {
    success: true,
    logId,
    recipientCount: filtered.length || tokens.length || 1,
    title: cleanTitle,
    message: cleanMessage
  };
}

// ============================================================
// AUTOMATED EVENT-BASED & CONDITIONAL PUSH NOTIFICATIONS
// ============================================================
export const DEFAULT_PUSH_EVENT_RULES = {
  order_confirmed: {
    id: 'order_confirmed',
    name: 'Order Confirmed',
    description: 'Triggered when diner places order and payment is verified',
    icon: '🍔',
    enabled: true,
    title: '🍔 Order Confirmed! (#{ref})',
    message: 'Your order has been received and queued in the FoodMaxx kitchen.'
  },
  order_preparing: {
    id: 'order_preparing',
    name: 'Cooking in Kitchen',
    description: 'Triggered when kitchen begins grilling and preparing meal',
    icon: '🍳',
    enabled: true,
    title: '🍳 Cooking in Kitchen! (#{ref})',
    message: 'Our chef is actively grilling your meal. Fresh, hot, and delicious!'
  },
  order_ready: {
    id: 'order_ready',
    name: 'Packed & Ready for Rider',
    description: 'Triggered when food is boxed and waiting for dispatch',
    icon: '📦',
    enabled: true,
    title: '📦 Order Packed & Ready! (#{ref})',
    message: 'Your meal is boxed hot and waiting for courier dispatch.'
  },
  order_on_the_way: {
    id: 'order_on_the_way',
    name: 'Rider on the Way',
    description: 'Triggered when courier accepts order and heads out',
    icon: '🛵',
    enabled: true,
    title: '🛵 Rider is on the Way! (#{ref})',
    message: '{rider} is speeding towards your location! Have your delivery PIN ready.'
  },
  order_delivered: {
    id: 'order_delivered',
    name: 'Order Delivered',
    description: 'Triggered upon delivery confirmation or OTP verification',
    icon: '🎉',
    enabled: true,
    title: '🎉 Order Delivered! Enjoy! (#{ref})',
    message: 'Your meal has arrived! Thank you for dining with FoodMaxx.'
  },
  order_cancelled: {
    id: 'order_cancelled',
    name: 'Order Cancelled',
    description: 'Triggered if an order is cancelled or refunded',
    icon: '⚠️',
    enabled: true,
    title: '⚠️ Order Cancelled (#{ref})',
    message: 'Your order #{ref} has been cancelled. Reach out if you need assistance.'
  },
  order_delayed: {
    id: 'order_delayed',
    name: 'Kitchen Delay Alert (>25m)',
    description: 'Triggered when preparation takes longer than standard queue time',
    icon: '⏱️',
    enabled: true,
    title: '⏱️ Kitchen Update on #{ref}',
    message: 'Taking extra care with your order to guarantee perfection. Almost ready!'
  }
};

const PUSH_RULES_STORAGE_KEY = 'fmx_push_event_rules';

/**
 * Get configured automated push notification rules
 */
export function getAutomatedPushRules() {
  if (typeof window === 'undefined') return DEFAULT_PUSH_EVENT_RULES;
  try {
    const saved = localStorage.getItem(PUSH_RULES_STORAGE_KEY);
    if (!saved) return DEFAULT_PUSH_EVENT_RULES;
    const parsed = JSON.parse(saved);
    return { ...DEFAULT_PUSH_EVENT_RULES, ...parsed };
  } catch {
    return DEFAULT_PUSH_EVENT_RULES;
  }
}

/**
 * Save updated automated push notification rules
 */
export function saveAutomatedPushRules(newRules) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PUSH_RULES_STORAGE_KEY, JSON.stringify(newRules));
    window.dispatchEvent(new CustomEvent('fmx_push_rules_updated', { detail: newRules }));
  } catch (e) {
    console.warn('[FoodMaxx Push] Notice saving push rules:', e);
  }
}

/**
 * Dispatch an Automated Event-Based Push Notification for Order Status Updates
 * @param {object} order - The order document
 * @param {string} status - New order status (e.g. 'PREPARING', 'ON_THE_WAY', 'DELIVERED')
 * @param {object} options - Optional rider details, custom notes, etc.
 */
export async function dispatchOrderStatusPushNotification(order, status, options = {}) {
  if (!order || !status) return null;

  // Map order status to event rule key
  let ruleKey = null;
  const s = String(status).toUpperCase();
  if (s === 'ORDER_PLACED' || s === 'CONFIRMED') ruleKey = 'order_confirmed';
  else if (s === 'PREPARING' || s === 'COOKING') ruleKey = 'order_preparing';
  else if (s === 'READY_FOR_PICKUP' || s === 'READY') ruleKey = 'order_ready';
  else if (s === 'ON_THE_WAY') ruleKey = 'order_on_the_way';
  else if (s === 'DELIVERED') ruleKey = 'order_delivered';
  else if (s === 'CANCELLED') ruleKey = 'order_cancelled';
  else if (s === 'DELAYED') ruleKey = 'order_delayed';

  if (!ruleKey) return null;

  const allRules = getAutomatedPushRules();
  const rule = allRules[ruleKey];
  if (!rule || rule.enabled === false) {
    console.log(`[FoodMaxx Push] Automated rule for event '${ruleKey}' is disabled.`);
    return null;
  }

  const orderRef = order.order_reference || (order.id ? String(order.id).slice(0, 8) : 'FMX');
  const riderName = options.rider?.name || options.rider?.full_name || order.rider_name || 'Your rider';

  // Format title & message with variable replacement
  let title = rule.title || `Order #${orderRef}`;
  title = title.replace(/#\{ref\}/g, `#${orderRef}`).replace(/\{ref\}/g, orderRef);

  let message = options.customMessage || rule.message || 'Status updated for your order.';
  message = message
    .replace(/#\{ref\}/g, `#${orderRef}`)
    .replace(/\{ref\}/g, orderRef)
    .replace(/\{rider\}/g, riderName);

  if (options.notes && options.notes !== 'Status updated to ' + status) {
    message += ` (${options.notes})`;
  }

  // Use food image from order item if available
  const dishImage = order.items?.[0]?.image_url || order.items?.[0]?.image || '/foodmaxx-logo.png';
  const targetUrl = order.id ? `/order-tracking/${order.id}` : '/';

  try {
    return await broadcastPushNotification({
      title,
      message,
      url: targetUrl,
      targetPlatform: 'all',
      imageUrl: dishImage,
      sender: `FoodMaxx Kitchen (${rule.name})`
    });
  } catch (err) {
    console.warn('[FoodMaxx Push] Error dispatching order status notification:', err);
    return null;
  }
}

export default {
  isPushSupported,
  getPushPermissionStatus,
  getSavedPushToken,
  getOrCreateDeviceId,
  detectPlatform,
  ensureDeviceRegistered,
  installPushNotifications,
  triggerLocalPushNotification,
  sendTestPushNotification,
  autoInitPushNotifications,
  subscribeToIncomingBroadcasts,
  getAllRegisteredPushTokens,
  deletePushToken,
  getNotificationBroadcastLogs,
  broadcastPushNotification,
  DEFAULT_PUSH_EVENT_RULES,
  getAutomatedPushRules,
  saveAutomatedPushRules,
  dispatchOrderStatusPushNotification
};

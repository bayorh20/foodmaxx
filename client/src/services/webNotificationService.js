// ============================================================
// FOODMAXX WEB-BASED NOTIFICATION SYSTEM
// Handles browser push notifications, service worker notifications,
// permission management, and in-app notification center history.
// ============================================================

import { playOrderNotificationSound } from './nativeMobile';

const IN_APP_NOTIFICATIONS_KEY = 'fmx_inapp_notifications';
const PERMISSION_KEY = 'fmx_web_notification_pref';

/**
 * Check if the browser supports standard Web Notifications
 */
export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current notification permission state
 * @returns {'granted' | 'denied' | 'default' | 'unsupported'}
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Check if notifications are blocked in browser settings
 */
export function isPermissionBlocked() {
  return getNotificationPermission() === 'denied';
}

/**
 * Actively sync browser site permission changes (Chrome, Edge, Firefox)
 */
if (typeof window !== 'undefined' && 'navigator' in window && navigator.permissions?.query) {
  try {
    navigator.permissions.query({ name: 'notifications' }).then((status) => {
      if (status) {
        status.onchange = () => {
          const current = Notification.permission;
          localStorage.setItem(PERMISSION_KEY, current);
          window.dispatchEvent(new CustomEvent('fmx_notification_permission_changed', { detail: current }));
        };
      }
    }).catch(() => {});
  } catch {}
}

/**
 * Re-check and sync notification permission
 */
export async function syncNotificationPermission() {
  const current = getNotificationPermission();
  if (typeof window !== 'undefined') {
    localStorage.setItem(PERMISSION_KEY, current);
    window.dispatchEvent(new CustomEvent('fmx_notification_permission_changed', { detail: current }));
  }
  return current;
}

/**
 * Tab title flasher for backgrounded tabs (bypasses browser OS push block)
 */
let titleFlasherInterval = null;
let originalDocumentTitle = typeof document !== 'undefined' ? document.title : 'FoodMaxx';

export function flashTabTitle(alertText, durationMs = 12000) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!document.hidden) return; // Only flash if the user is looking at another tab

  clearInterval(titleFlasherInterval);
  originalDocumentTitle = document.title.replace(/^[🔔🔴\(\)\d\s]+/, '') || 'FoodMaxx - Fast Delivery Ibadan';
  
  let toggle = false;
  titleFlasherInterval = setInterval(() => {
    document.title = toggle ? `🔔 ${alertText}` : originalDocumentTitle;
    toggle = !toggle;
  }, 900);

  const cleanup = () => {
    clearInterval(titleFlasherInterval);
    document.title = originalDocumentTitle;
    window.removeEventListener('focus', cleanup);
    document.removeEventListener('visibilitychange', handleVisibility);
  };

  const handleVisibility = () => {
    if (!document.hidden) cleanup();
  };

  window.addEventListener('focus', cleanup);
  document.addEventListener('visibilitychange', handleVisibility);

  setTimeout(cleanup, durationMs);
}

/**
 * Request notification permission from the user
 * @returns {Promise<'granted' | 'denied' | 'default' | 'unsupported'>}
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  
  try {
    const permission = await Notification.requestPermission();
    localStorage.setItem(PERMISSION_KEY, permission);
    window.dispatchEvent(new CustomEvent('fmx_notification_permission_changed', { detail: permission }));
    
    // If granted, immediately send a test welcome notification so the user confirms it works
    if (permission === 'granted') {
      try {
        await dispatchWebNotification('🔔 FoodMaxx Notifications Active!', {
          body: 'You will receive live tracking alerts when your food is cooking and on the way.',
          tag: 'fmx_welcome_notif'
        });
      } catch {}
    }

    return permission;
  } catch (err) {
    console.warn('Notification permission request error:', err);
    return Notification.permission;
  }
}

/**
 * Send a web notification with full fallback support for PWA & mobile browsers
 * @param {string} title 
 * @param {object} options 
 * @returns {Promise<boolean>}
 */
export async function dispatchWebNotification(title, options = {}) {
  const perm = getNotificationPermission();
  if (perm !== 'granted') return false;

  const defaultOptions = {
    body: options.body || 'New order status update from FoodMaxx.',
    icon: options.icon || '/foodmaxx-logo.png',
    badge: options.badge || '/favicon.svg',
    tag: options.tag || `fmx_order_${Date.now()}`,
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: options.url || '/',
      timestamp: Date.now(),
      orderId: options.orderId || null,
      ...options.data
    }
  };

  let dispatched = false;

  // 1. Try Service Worker registration with 500ms safety race (ensures zero hanging)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 500))
      ]).catch(async () => {
        return (navigator.serviceWorker.getRegistration ? await navigator.serviceWorker.getRegistration() : null);
      });

      if (reg && reg.showNotification) {
        await reg.showNotification(title, defaultOptions);
        dispatched = true;
      }
    } catch (swErr) {
      console.warn('ServiceWorker showNotification failed, attempting direct Notification:', swErr);
    }
  }

  // 2. Fallback to standard window.Notification constructor if service worker was not ready
  if (!dispatched && typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const notif = new Notification(title, defaultOptions);
      if (options.url) {
        notif.onclick = () => {
          window.focus();
          if (options.url && options.url !== window.location.pathname) {
            window.location.href = options.url;
          }
          notif.close();
        };
      }
      dispatched = true;
    } catch (directErr) {
      console.warn('Direct Web Notification failed:', directErr);
    }
  }

  return dispatched;
}

/**
 * Dispatch an order status change notification (sound + web notification + in-app store)
 * @param {object} order
 * @param {string} newStatus
 * @param {object} statusDetails
 */
export async function notifyOrderStatusChange(order, newStatus, statusDetails = {}) {
  if (!order) return;

  const title = statusDetails.title || `Order #${order.order_reference || order.id?.slice(0, 8)} Updated`;
  const body = statusDetails.desc || `Status is now ${newStatus.replace(/_/g, ' ')}. Tap to view live tracking.`;
  const targetUrl = `/?track=${order.order_reference || order.id}`;

  // 1. Play auditory alert tone (works 100% in-browser without OS push permission)
  playOrderNotificationSound();

  // 2. Flash tab title if user is in background tab (never blocked by browser notification settings)
  flashTabTitle(`${title}: ${body.slice(0, 40)}...`);

  // 3. Dispatch system web push notification (for backgrounded OS popups when allowed)
  dispatchWebNotification(title, {
    body,
    url: targetUrl,
    tag: `fmx_order_${order.id}`,
    orderId: order.id,
    data: { orderId: order.id, orderRef: order.order_reference }
  });

  // 4. Save to In-App Notification Center
  addInAppNotification({
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    orderId: order.id,
    orderRef: order.order_reference,
    title,
    message: body,
    status: newStatus,
    icon: statusDetails.icon || '🛍️',
    url: targetUrl,
    created_at: new Date().toISOString(),
    read: false
  });

  // 5. Dispatch in-app visual alert event for active window toast
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fmx_order_status_alert', {
      detail: {
        order,
        status: newStatus,
        title,
        body,
        targetUrl
      }
    }));
  }
}

// ============================================================
// IN-APP NOTIFICATION CENTER STORE (SCOPED PER USER)
// ============================================================

function getNotificationKey(userId) {
  let uid = userId;
  if (!uid && typeof window !== 'undefined') {
    try {
      const s = localStorage.getItem('fmx_user');
      if (s) uid = JSON.parse(s)?.id;
    } catch {}
  }
  return uid ? `fmx_inapp_notifications_${uid}` : IN_APP_NOTIFICATIONS_KEY;
}

export function getStoredInAppNotifications(userId = null) {
  try {
    const key = getNotificationKey(userId);
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : [];
  } catch (e) {
    return [];
  }
}

export function addInAppNotification(notification, userId = null) {
  try {
    const key = getNotificationKey(userId);
    const current = getStoredInAppNotifications(userId);
    // Prevent duplicate entries for same order & status within 5 seconds
    const isDuplicate = current.some(n => 
      n.orderId === notification.orderId && 
      n.status === notification.status && 
      (Date.now() - new Date(n.created_at).getTime() < 5000)
    );
    if (isDuplicate) return;

    const updated = [notification, ...current].slice(0, 50); // Keep last 50
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('fmx_inapp_notifications_updated', { detail: updated }));
  } catch (e) {
    console.warn('Failed to save in-app notification:', e);
  }
}

export function markInAppNotificationAsRead(id, userId = null) {
  try {
    const key = getNotificationKey(userId);
    const current = getStoredInAppNotifications(userId);
    const updated = current.map(n => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('fmx_inapp_notifications_updated', { detail: updated }));
  } catch (e) {}
}

export function markAllInAppNotificationsAsRead(userId = null) {
  try {
    const key = getNotificationKey(userId);
    const current = getStoredInAppNotifications(userId);
    const updated = current.map(n => ({ ...n, read: true }));
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('fmx_inapp_notifications_updated', { detail: updated }));
  } catch (e) {}
}

export function clearAllInAppNotifications(userId = null) {
  try {
    const key = getNotificationKey(userId);
    localStorage.removeItem(key);
    localStorage.removeItem(IN_APP_NOTIFICATIONS_KEY);
    window.dispatchEvent(new CustomEvent('fmx_inapp_notifications_updated', { detail: [] }));
  } catch (e) {}
}

export function getUnreadInAppNotificationsCount(userId = null) {
  const current = getStoredInAppNotifications(userId);
  return current.filter(n => !n.read).length;
}

import * as Sentry from '@sentry/react';

export function initSentry() {
  if (typeof window === 'undefined') return;

  try {
    Sentry.init({
      dsn: 'https://placeholder_foodmaxx@o450000.ingest.sentry.io/4500000', // Safe local initialization
      enabled: process.env.NODE_ENV === 'production',
      tracesSampleRate: 0.2,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      integrations: [],
      beforeSend(event) {
        // Sanitize sensitive user info
        if (event.user) {
          delete event.user.ip_address;
        }
        return event;
      }
    });
  } catch (err) {
    console.warn('[FoodMaxx Sentry] Notice initializing Sentry:', err);
  }
}

export function captureException(error, context = {}) {
  try {
    Sentry.captureException(error, { extra: context });
  } catch {}
}

export function captureMessage(message, level = 'info') {
  try {
    Sentry.captureMessage(message, level);
  } catch {}
}

export default {
  initSentry,
  captureException,
  captureMessage
};

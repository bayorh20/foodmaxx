/**
 * FoodMaxx Native Mobile Experience Utilities
 * Haptic feedback, Web Audio synthesizer, PWA install prompt, Web Share
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

// -------------------------------------------------------------
// 1. HAPTIC FEEDBACK (@capacitor/haptics + Vibration API fallback)
// -------------------------------------------------------------
export async function triggerHaptic(type = 'selection') {
  if (typeof window === 'undefined') return;

  try {
    if (Capacitor.isNativePlatform()) {
      switch (type) {
        case 'selection':
          await Haptics.selectionStart();
          await Haptics.selectionChanged();
          return;
        case 'light':
          await Haptics.impact({ style: ImpactStyle.Light });
          return;
        case 'medium':
          await Haptics.impact({ style: ImpactStyle.Medium });
          return;
        case 'heavy':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          return;
        case 'success':
          await Haptics.notification({ type: NotificationType.Success });
          return;
        case 'warning':
          await Haptics.notification({ type: NotificationType.Warning });
          return;
        case 'error':
          await Haptics.notification({ type: NotificationType.Error });
          return;
        default:
          await Haptics.impact({ style: ImpactStyle.Light });
          return;
      }
    }
  } catch {}

  // Web Browser Vibration Fallback
  if (navigator.vibrate) {
    try {
      switch (type) {
        case 'selection':
        case 'light':
          navigator.vibrate(12);
          break;
        case 'medium':
          navigator.vibrate(25);
          break;
        case 'heavy':
          navigator.vibrate(40);
          break;
        case 'success':
          navigator.vibrate([15, 40, 25]);
          break;
        case 'warning':
        case 'error':
          navigator.vibrate([35, 50, 35]);
          break;
        default:
          navigator.vibrate(15);
      }
    } catch {}
  }
}

// -------------------------------------------------------------
// 2. NATIVE WEB AUDIO FEEDBACK (Zero audio file downloads)
// -------------------------------------------------------------
let audioCtx = null;
function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playNativeSound(type = 'tap') {
  if (typeof window === 'undefined') return;
  const enabled = localStorage.getItem('fmx_sound_effects') !== 'false';
  if (!enabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'tap') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.start(now);
      osc.stop(now + 0.03);
    } else if (type === 'pop' || type === 'cart') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.07);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'success' || type === 'chime') {
      // 2-tone melodic harmonic chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5
      gain2.gain.setValueAtTime(0.08, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.32);
    } else if (type === 'favorite') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch (e) {}
}

import { playActiveNotificationTone, playToneById, NOTIFICATION_TONES } from './soundEffects.js';

/**
 * High-priority POS / Kitchen / Customer order notification chime
 * Uses the user's customized loud notification tone from the Sound Effects Studio
 */
export function playOrderNotificationSound(force = false) {
  playActiveNotificationTone(force);
}

export { playToneById, NOTIFICATION_TONES };

// -------------------------------------------------------------
// 3. NATIVE WEB SHARE API
// -------------------------------------------------------------
export async function shareNative({ title, text, url }) {
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareData = {
    title: title || 'FoodMaxx Kitchen & Grills',
    text: text || 'Hot Nigerian chow delivered in minutes!',
    url: shareUrl
  };

  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
      triggerHaptic('success');
      return { shared: true };
    } catch (e) {
      if (e.name === 'AbortError') return { shared: false, cancelled: true };
    }
  }

  // Fallback: Copy link
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(shareUrl);
    triggerHaptic('light');
    return { shared: true, copied: true };
  }

  return { shared: false };
}

// -------------------------------------------------------------
// 4. STANDALONE & PWA INSTALL DETECTION
// -------------------------------------------------------------
export function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function isIosDevice() {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { app } from './firebaseDb.js';

// Initialize and export Firebase Auth instance attached to app
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Sign In with Official Google OAuth flow
 * Includes automatic popup blocker handling and mobile redirect fallback
 */
export async function loginWithGoogle() {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return { success: true, user: cred.user, credential: cred };
  } catch (err) {
    console.error('Google Sign-In Popup Error:', err);

    // Keep Google Sign-In completely inside the app; do not navigate browser out of app
    if (
      err?.code === 'auth/popup-blocked' ||
      err?.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      const customErr = new Error('Sign-in popup was blocked by your browser. Please allow popups or continue with your Phone Number & Password.');
      customErr.code = err.code;
      throw customErr;
    }

    // Provider not enabled in Firebase Console
    if (err?.code === 'auth/operation-not-allowed') {
      const errorMsg = 'Google Sign-In is not enabled yet in your Firebase project. Please enable Google in Firebase Console -> Authentication -> Sign-in method -> Google.';
      console.warn(errorMsg);
      const customErr = new Error(errorMsg);
      customErr.code = 'auth/operation-not-allowed';
      throw customErr;
    }

    // Handle unauthorized domain gracefully
    if (err?.code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
      const errorMsg = `Google sign-in is not authorized for "${currentHost}". Please add this domain to Firebase Console -> Authentication -> Settings -> Authorized domains.`;
      console.warn(errorMsg);
      const customErr = new Error(errorMsg);
      customErr.code = 'auth/unauthorized-domain';
      throw customErr;
    }

    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
      const customErr = new Error('Sign-in popup was closed before completion. Please try again.');
      customErr.code = err.code;
      throw customErr;
    }

    throw err;
  }
}

/**
 * Check if the user is returning from a Google Sign-In redirect
 */
export async function checkRedirectResult() {
  try {
    const res = await getRedirectResult(auth);
    if (res?.user) {
      return { success: true, user: res.user };
    }
    return null;
  } catch (err) {
    console.error('Google Redirect Result Error:', err);
    return null;
  }
}

/**
 * Standard Email & Password Sign In
 */
export async function loginWithEmail(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return { success: true, user: cred.user };
  } catch (err) {
    console.error('Email Sign-In Error:', err);
    throw err;
  }
}

/**
 * Standard Account Creation with Email & Password
 */
export async function registerWithEmail(email, password, displayName = '') {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName });
    }
    // Optionally trigger email verification in background
    try {
      if (cred.user && !cred.user.emailVerified) {
        await sendEmailVerification(cred.user);
      }
    } catch {}
    return { success: true, user: cred.user };
  } catch (err) {
    console.error('Registration Error:', err);
    throw err;
  }
}

/**
 * Password Reset Email Dispatch
 */
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { success: true };
  } catch (err) {
    console.error('Password Reset Error:', err);
    throw err;
  }
}

/**
 * Sign out current authenticated session
 */
export async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (err) {
    console.error('Logout Error:', err);
    throw err;
  }
}

/**
 * Listen to real-time auth state changes
 */
export function onAuthChanged(callback) {
  return onAuthStateChanged(auth, callback);
}

export default {
  auth,
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  resetPassword,
  logoutUser,
  onAuthChanged
};

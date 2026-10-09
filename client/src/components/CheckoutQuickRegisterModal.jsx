import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Lock, ShieldCheck, RefreshCw, ArrowRight } from 'lucide-react';
import { triggerHaptic } from '../services/nativeMobile';
import { api } from '../services/api';

/**
 * CHECKOUT AUTH REQUIRED MODAL
 * 
 * Replaces silent registration at checkout.
 * Prompts guests to explicitly authenticate before placing their order:
 * "Sign in or create an account to continue."
 * 
 * Provides:
 * - Continue with Google
 * - Sign In
 * - Create Account
 * Preserves cart items seamlessly!
 */
export default function CheckoutQuickRegisterModal({
  open,
  onClose,
  onOpenAuth,
  onSuccess,
  isDark = false
}) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setGoogleLoading(true);
    triggerHaptic('medium');
    try {
      const res = await api.loginWithGoogle();
      if (res?.success && res.user) {
        triggerHaptic('success');
        if (onSuccess) onSuccess(res.user);
        onClose();
      } else if (res?.pendingRedirect) {
        // Redirect initiated
      } else {
        setErrorMsg('Google Sign-In could not be completed.');
      }
    } catch (err) {
      if (err?.code === 'auth/operation-not-allowed') {
        setErrorMsg('Google Sign-In is not enabled yet in Firebase Console (Authentication > Sign-in method > Google). Please enable it in the console, or sign in using your Phone & Password.');
      } else if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setErrorMsg('Sign-in was cancelled.');
      } else {
        setErrorMsg(err?.message || 'Google authentication failed.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 450 }}
        className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col relative max-h-[92vh] ${
          isDark ? 'bg-[#12151D] text-white border-white/10' : 'bg-white text-slate-900 border-slate-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#EA4C2A]/10 text-[#EA4C2A] flex items-center justify-center font-bold">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg tracking-tight">Checkout Authentication</h3>
              <p className="text-xs text-slate-400">Sign in or create an account to continue</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-orange-50 dark:bg-white/5 border border-orange-100 dark:border-white/10 text-center space-y-1">
            <p className="font-extrabold text-sm text-slate-800 dark:text-white">
              Sign in or create an account to continue.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your cart items and delivery choices have been saved!
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-600 dark:text-red-400 text-xs font-bold text-center">
              {errorMsg}
            </div>
          )}

          {/* 1. Continue with Google */}
          <button
            type="button"
            disabled={googleLoading}
            onClick={handleGoogleSignIn}
            className={`w-full py-3.5 px-4 rounded-2xl border font-bold text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.99] cursor-pointer shadow-xs disabled:opacity-50 ${
              isDark
                ? 'bg-white/5 border-white/15 text-white hover:bg-white/10'
                : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
            }`}
          >
            {googleLoading ? (
              <>
                <RefreshCw size={16} className="animate-spin text-[#EA4C2A]" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-1">
            <div className={`flex-1 h-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">or</span>
            <div className={`flex-1 h-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
          </div>

          {/* 2. Sign In Button */}
          <button
            type="button"
            onClick={() => {
              if (onOpenAuth) onOpenAuth('login');
              onClose();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#EA4C2A] hover:bg-[#D43D1D] active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-[#EA4C2A]/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span>Sign In</span>
            <ArrowRight size={16} />
          </button>

          {/* 3. Create Account Button */}
          <button
            type="button"
            onClick={() => {
              if (onOpenAuth) onOpenAuth('register');
              onClose();
            }}
            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm border flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer ${
              isDark
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
            }`}
          >
            <span>Create Account</span>
          </button>

          <div className="pt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span>Strict privacy · Secure customer account isolation</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

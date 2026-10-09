import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Mail, Lock, User, Phone, Eye, EyeOff, Check, AlertCircle,
  Sparkles, RefreshCw, ArrowRight, ShieldCheck, Heart, KeyRound,
  CheckCircle2, HelpCircle, MessageSquare, Compass
} from 'lucide-react';
import { triggerHaptic, playNativeSound } from '../services/nativeMobile';
import { api } from '../services/api';
import {
  getHappyAvatar,
  getRandomHappyAvatar
} from '../utils/avatarUtils';
import { generateAIAvatar } from '../services/aiAvatarService';

/**
 * Standard Explicit Authentication Modal
 * 
 * Hierarchy:
 * Welcome back (or Create your account)
 * [ Continue with Google ]
 * or
 * [ Phone Number / Email ]
 * [ Password ] (with show/hide)
 * [ Sign In ]
 * Forgot Password?
 * Don't have an account? Create Account
 * [ Continue as Guest ]
 */
export default function AuthModal({
  open,
  onClose,
  initialMode = 'login', // 'login' | 'register'
  onSuccess,
  onGuest,
  isDark = false
}) {
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Sign In state
  const [loginPhone, setLoginPhone] = useState(''); // 11-digit phone number only
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState(''); // 11-digit phone number only
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regGender, setRegGender] = useState('auto');
  const [regAvatarUrl, setRegAvatarUrl] = useState(() => getRandomHappyAvatar('female').url);

  // Sync mode with prop if opened with specific initialMode
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setErrorMsg('');
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [open, initialMode]);

  // Helper to handle strictly numeric 11-digit phone inputs
  const handlePhoneChange = (setter) => (e) => {
    const raw = e.target.value;
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 11);
    setter(digitsOnly);
  };

  // Simplified password validation: minimum 4 characters
  const passwordValidation = useMemo(() => {
    const min4 = regPassword.length >= 4;
    const matchesConfirm = !regConfirmPassword || regPassword === regConfirmPassword;
    const isValid = min4 && (regConfirmPassword ? regPassword === regConfirmPassword : true);
    return { min4, matchesConfirm, isValid };
  }, [regPassword, regConfirmPassword]);

  // Simple password strength indicator
  const passwordStrength = useMemo(() => {
    if (!regPassword) return { score: 0, label: 'Enter password', color: 'bg-slate-200' };
    if (regPassword.length < 4) return { score: 1, label: 'Too short', color: 'bg-red-500' };
    if (regPassword.length < 6) return { score: 2, label: 'Simple & Good', color: 'bg-emerald-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-600' };
  }, [regPassword]);

  // Check CapsLock on keydown/keyup
  const handleKeyDown = (e) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  // 1. Google OAuth flow
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setGoogleLoading(true);
    triggerHaptic('medium');
    try {
      const res = await api.loginWithGoogle();
      if (res?.success && res.user) {
        triggerHaptic('success');
        playNativeSound('success');
        if (onSuccess) onSuccess(res.user);
        onClose();
      } else if (res?.pendingRedirect) {
        // Redirect flow started, no error
      } else {
        setErrorMsg('Google Sign-In could not be completed.');
      }
    } catch (err) {
      console.error('Google Sign-In error:', err);
      if (err?.code === 'auth/operation-not-allowed') {
        setErrorMsg('Google Sign-In is not enabled yet in Firebase Console (Authentication > Sign-in method > Google). Please enable it in the console, or sign in using your Phone & Password.');
      } else if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setErrorMsg('Sign-in was cancelled. Please try again or sign in with your Phone number.');
      } else if (err?.code === 'auth/popup-blocked') {
        setErrorMsg('Browser popup was blocked. Please allow popups or use phone & password sign in.');
      } else if (err?.code === 'auth/unauthorized-domain') {
        setErrorMsg('This web domain is not yet authorized in Firebase Console -> Auth -> Authorized domains. Please sign in with your Phone & Password.');
      } else if (err?.code === 'auth/network-request-failed') {
        setErrorMsg('Network error connecting to Google. Please check your internet connection.');
      } else {
        setErrorMsg(err?.message || 'Google authentication failed. You can sign in with your Phone number.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // 2. Handle Standard Sign In
  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const cleanPhoneDigits = loginPhone.replace(/\D/g, '');
    if (!cleanPhoneDigits) {
      setErrorMsg('Please enter your 11-digit phone number.');
      return;
    }
    if (cleanPhoneDigits.length !== 11) {
      setErrorMsg(`Phone number must be exactly 11 digits (currently ${cleanPhoneDigits.length} digits).`);
      return;
    }
    if (!loginPassword) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);
    triggerHaptic('selection');
    try {
      const res = await api.login(cleanPhoneDigits, loginPassword);
      if (res?.success) {
        triggerHaptic('success');
        playNativeSound('success');
        if (onSuccess) onSuccess(res.user);
        onClose();
      } else {
        setErrorMsg(res?.message || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Standard Registration
  const handleRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const cleanName = regName.trim();
    const cleanPhoneDigits = regPhone.replace(/\D/g, '');
    const cleanEmail = regEmail?.trim() || `${cleanPhoneDigits || Date.now()}@foodmaxx.ng`;

    if (!cleanName || cleanName.length < 2) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!cleanPhoneDigits) {
      setErrorMsg('Please enter your phone number.');
      return;
    }
    if (cleanPhoneDigits.length !== 11) {
      setErrorMsg(`Phone number must be exactly 11 digits (currently ${cleanPhoneDigits.length} digits).`);
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      setErrorMsg('Password must be at least 4 characters.');
      return;
    }
    if (regConfirmPassword && regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (!termsAccepted) {
      setErrorMsg('Please accept the Terms of Service & Privacy Policy.');
      return;
    }

    setLoading(true);
    triggerHaptic('selection');
    try {
      const avatar = regAvatarUrl || getHappyAvatar(cleanName, regGender);
      const res = await api.register({
        full_name: cleanName,
        email: cleanEmail,
        phone: cleanPhoneDigits,
        password: regPassword,
        avatar_url: avatar,
        gender: regGender,
        role: 'customer'
      });

      if (res?.success) {
        triggerHaptic('success');
        playNativeSound('success');
        if (onSuccess) onSuccess(res.user);
        onClose();
      } else {
        setErrorMsg(res?.message || 'Registration could not be completed.');
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Shuffle foodie avatar
  const handleShuffleAvatar = () => {
    triggerHaptic('selection');
    const randomSeed = `${regName || 'FoodMaxx'}_shuffle_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    const randomPick = generateAIAvatar(randomSeed, '3d_pixar');
    setRegAvatarUrl(randomPick);
  };

  // Send password reset
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setErrorMsg('Please enter a valid email for reset.');
      return;
    }
    try {
      await api.resetPassword(forgotEmail);
      setForgotSent(true);
      triggerHaptic('success');
    } catch (err) {
      setErrorMsg(err?.message || 'Could not send reset email.');
    }
  };

  // Handle Continue as Guest
  const handleContinueAsGuest = () => {
    triggerHaptic('selection');
    try {
      localStorage.setItem('fmx_onboarded', 'true');
    } catch {}
    if (onGuest) onGuest();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md max-h-[95vh] sm:max-h-[90vh] rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl flex flex-col border ${
          isDark ? 'bg-[#12141A] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Mobile Drag Bar */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20" />
        </div>

        {/* Brand Header Banner */}
        <div className="relative px-6 pt-5 pb-4 bg-gradient-to-r from-[#EA4C2A] via-[#E8431F] to-[#D43B1B] text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
                🍗
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase opacity-85 block leading-none">
                  FOODMAXX IBADAN
                </span>
                <h3 className="text-base font-black tracking-tight leading-tight mt-0.5">
                  {mode === 'login' ? 'Welcome back' : 'Create Account'}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-black/20 rounded-2xl mt-4">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setMode('login');
                setErrorMsg('');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-[#EA4C2A] shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <KeyRound size={13} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setMode('register');
                setErrorMsg('');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-[#EA4C2A] shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Sparkles size={13} />
              <span>Create Account</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className={`flex-1 overflow-y-auto px-6 py-5 space-y-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. GOOGLE SIGN-IN BUTTON */}
          <button
            type="button"
            disabled={googleLoading || loading}
            onClick={handleGoogleSignIn}
            className={`w-full py-3.5 px-4 rounded-2xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.99] cursor-pointer shadow-xs disabled:opacity-50 ${
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
                {/* Official Google 'G' icon */}
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

          {/* DIVIDER */}
          <div className="flex items-center gap-3 my-2 select-none">
            <div className={`flex-1 h-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">or</span>
            <div className={`flex-1 h-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
          </div>

          {/* ========================================================= */}
          {/* FORM 1: SIGN IN                                           */}
          {/* ========================================================= */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4" onKeyDown={handleKeyDown}>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Phone Number
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">
                    {loginPhone.length}/11 digits
                  </span>
                </div>
                <div className="relative flex">
                  <div className={`flex items-center gap-1.5 px-3 py-3 border border-r-0 rounded-l-2xl text-xs font-black shrink-0 ${
                    isDark ? 'bg-white/10 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    <span className="text-base leading-none">🇳🇬</span>
                    <span>+234</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoFocus
                    required
                    maxLength={11}
                    placeholder="08012345678"
                    value={loginPhone}
                    onChange={handlePhoneChange(setLoginPhone)}
                    className={`w-full px-3.5 py-3 border rounded-r-2xl text-xs sm:text-sm font-bold tracking-wider outline-none focus:border-[#EA4C2A] transition-colors ${
                      isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotOpen(true);
                      setForgotEmail('');
                      setForgotSent(false);
                    }}
                    className="text-[11px] font-bold text-[#EA4C2A] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className={`w-full pl-10 pr-10 py-3 border rounded-2xl text-xs sm:text-sm font-bold outline-none focus:border-[#EA4C2A] transition-colors ${
                      isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {capsLockActive && (
                  <p className="text-[11px] text-amber-500 font-bold mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> Caps Lock is ON
                  </p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded-md accent-[#EA4C2A] cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Keep me signed in
                  </span>
                </label>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-[0.99] disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-xl shadow-[#EA4C2A]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Switch to Register */}
              <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg('');
                  }}
                  className="font-black text-[#EA4C2A] hover:underline cursor-pointer"
                >
                  Create Account
                </button>
              </p>
            </form>
          )}

          {/* ========================================================= */}
          {/* FORM 2: SIGN UP / REGISTER                                */}
          {/* ========================================================= */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4" onKeyDown={handleKeyDown}>
              {/* Full Name */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Full Name
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bukola Adebayo"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-2xl text-xs sm:text-sm font-bold outline-none focus:border-[#EA4C2A] transition-colors ${
                      isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Phone (Nigerian Prefix) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Phone Number
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">
                    {regPhone.length}/11 digits
                  </span>
                </div>
                <div className="relative flex">
                  <div className={`flex items-center gap-1.5 px-3 py-3 border border-r-0 rounded-l-2xl text-xs font-black shrink-0 ${
                    isDark ? 'bg-white/10 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    <span className="text-base leading-none">🇳🇬</span>
                    <span>+234</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    maxLength={11}
                    placeholder="08012345678"
                    value={regPhone}
                    onChange={handlePhoneChange(setRegPhone)}
                    className={`w-full px-3.5 py-3 border rounded-r-2xl text-xs sm:text-sm font-bold tracking-wider outline-none focus:border-[#EA4C2A] transition-colors ${
                      isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter password (min. 4 characters)"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className={`w-full pl-10 pr-10 py-3 border rounded-2xl text-xs sm:text-sm font-bold outline-none focus:border-[#EA4C2A] transition-colors ${
                      isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Simple Password Helper */}
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className={regPassword.length >= 4 ? 'text-emerald-500' : 'text-slate-300'} />
                    <span className={regPassword.length >= 4 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}>
                      {regPassword.length >= 4 ? 'Password ready' : 'Min. 4 characters'}
                    </span>
                  </div>
                  {regPassword && (
                    <span className="font-semibold text-slate-500 dark:text-slate-400">
                      {passwordStrength.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter your password"
                    value={regConfirmPassword}
                    onChange={e => setRegConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-10 py-3 border rounded-2xl text-xs sm:text-sm font-bold outline-none focus:border-[#EA4C2A] transition-colors ${
                      isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Terms & Privacy Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={termsAccepted}
                    onChange={e => setTermsAccepted(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded-md accent-[#EA4C2A] cursor-pointer shrink-0"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                    I agree to FoodMaxx's Terms of Service and Privacy Policy.
                  </span>
                </label>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading || !regPassword || regPassword.length < 4 || !termsAccepted}
                className="w-full py-4 bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-[0.99] disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-xl shadow-[#EA4C2A]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Switch to Sign In */}
              <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                  }}
                  className="font-black text-[#EA4C2A] hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            </form>
          )}

          {/* GUEST MODE OPTION */}
          <div className="pt-2 border-t border-slate-100 dark:border-white/10 text-center">
            <button
              type="button"
              onClick={handleContinueAsGuest}
              className={`w-full py-3 px-4 rounded-2xl text-xs font-black transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                isDark
                  ? 'bg-white/5 hover:bg-white/10 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Compass size={14} />
              <span>Continue as Guest</span>
            </button>
          </div>

          {/* Security guarantee footer */}
          <div className="pt-1 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span>256-bit Encrypted · Secure Authentication</span>
          </div>
        </div>

        {/* FORGOT PASSWORD SUB-MODAL */}
        {forgotOpen && (
          <div className="absolute inset-0 bg-white dark:bg-[#12141A] z-20 flex flex-col p-6 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
              <h4 className="font-black text-sm text-slate-900 dark:text-white">
                Reset Password
              </h4>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 py-6 flex flex-col justify-center space-y-4">
              {forgotSent ? (
                <div className="text-center space-y-3 py-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
                    ✓
                  </div>
                  <h5 className="font-black text-base text-slate-900 dark:text-white">
                    Reset Link Dispatched!
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                    We've sent password reset instructions to <strong>{forgotEmail}</strong>. Please check your inbox or spam folder.
                  </p>
                  <button
                    onClick={() => setForgotOpen(false)}
                    className="px-6 py-2.5 bg-[#EA4C2A] text-white rounded-xl text-xs font-black cursor-pointer shadow-md"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enter your registered email address and we'll send you password reset instructions.
                  </p>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. yourname@gmail.com"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm font-bold outline-none focus:border-[#EA4C2A]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-[#EA4C2A] text-white font-black text-xs sm:text-sm rounded-2xl cursor-pointer shadow-md"
                  >
                    Send Reset Instructions
                  </button>

                  <div className="pt-2 text-center">
                    <a
                      href="https://wa.me/2348166004281?text=Hello%20FoodMaxx%2C%20I%20need%20assistance%20resetting%20my%20account%20password."
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#25D366] font-bold hover:underline"
                    >
                      <MessageSquare size={13} />
                      <span>Need help? Chat with WhatsApp Support</span>
                    </a>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function LoginModal({ open, onClose, onSwitchRegister, onSuccess, onGuest }) {
  return (
    <AuthModal
      open={open}
      onClose={onClose}
      initialMode="login"
      onSuccess={onSuccess || onClose}
      onGuest={onGuest}
    />
  );
}

export function RegisterModal({ open, onClose, onSwitchLogin, onSuccess, onGuest }) {
  return (
    <AuthModal
      open={open}
      onClose={onClose}
      initialMode="register"
      onSuccess={onSuccess || onClose}
      onGuest={onGuest}
    />
  );
}

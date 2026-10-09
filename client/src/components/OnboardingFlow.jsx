import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  ChevronLeft, 
  MapPin, 
  Sparkles,
  RefreshCw,
  Navigation,
  AlertCircle,
  Bell,
  Compass,
  Lock,
  Mail,
  Eye,
  EyeOff
} from 'lucide-react';
import { getRealCurrentPosition } from '../services/realLocation';
import { requestNotificationPermission } from '../services/webNotificationService';
import { triggerHaptic, playNativeSound } from '../services/nativeMobile';
import { api } from '../services/api';

/**
 * Standard Explicit Onboarding & Welcome Flow
 * 
 * Users explicitly choose:
 * - Continue with Google
 * - Sign In
 * - Create Account
 * - Continue as Guest
 * 
 * Never silently registers when entering name or address.
 */
export default function OnboardingFlow({ 
  onComplete, 
  onSuccess,
  onGuest 
}) {
  // Steps:
  // 1: Welcome & Auth Choices (Google, Sign In, Register, Guest)
  // 2: Explicit Auth Form (if choosing Sign In or Create Account)
  // 3: Optional Delivery Location
  // 4: Notifications
  const [step, setStep] = useState(1);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [address, setAddress] = useState(() => {
    try {
      return localStorage.getItem('fmx_last_delivery_address') || '';
    } catch {
      return '';
    }
  });

  const [detectingGps, setDetectingGps] = useState(false);

  // 1. Google OAuth
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
        setStep(3); // Proceed to location setup
      } else if (res?.pendingRedirect) {
        // Redirect initiated
      } else {
        setErrorMsg('Google Sign-In could not be completed.');
      }
    } catch (err) {
      if (err?.code === 'auth/operation-not-allowed') {
        setErrorMsg('Google Sign-In is not enabled yet in Firebase Console (Authentication > Sign-in method > Google). Please enable it in the console, or sign in using your Phone & Password.');
      } else if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setErrorMsg('Sign-in was cancelled. Please try again.');
      } else if (err?.code === 'auth/popup-blocked') {
        setErrorMsg('Browser popup was blocked. Please allow popups or use phone & password sign in.');
      } else if (err?.code === 'auth/unauthorized-domain') {
        setErrorMsg('This domain is not authorized in Firebase Console -> Auth -> Authorized domains. Please create an account with your phone number.');
      } else {
        setErrorMsg(err?.message || 'Google authentication failed. Please use Phone & Password.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // 2. Email / Phone Authentication
  const handleAuthSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (authMode === 'login') {
      const cleanPhone = phone.replace(/\D/g, '');
      if (!cleanPhone) {
        setErrorMsg('Please enter your 11-digit phone number.');
        return;
      }
      if (cleanPhone.length !== 11) {
        setErrorMsg(`Phone number must be exactly 11 digits (currently ${cleanPhone.length} digits).`);
        return;
      }
      if (!password) {
        setErrorMsg('Please enter your password.');
        return;
      }
      setLoading(true);
      triggerHaptic('selection');
      try {
        const res = await api.login(cleanPhone, password);
        if (res?.success) {
          triggerHaptic('success');
          if (onSuccess) onSuccess(res.user);
          setStep(3);
        } else {
          setErrorMsg(res?.message || 'Invalid credentials.');
        }
      } catch (err) {
        setErrorMsg(err?.message || 'Sign in failed.');
      } finally {
        setLoading(false);
      }
    } else {
      // Register
      if (!fullName.trim() || fullName.trim().length < 2) {
        setErrorMsg('Please enter your full name.');
        return;
      }
      const cleanPhone = phone.replace(/\D/g, '');
      if (!cleanPhone) {
        setErrorMsg('Please enter your phone number.');
        return;
      }
      if (cleanPhone.length !== 11) {
        setErrorMsg(`Phone number must be exactly 11 digits (currently ${cleanPhone.length} digits).`);
        return;
      }
      if (!password || password.length < 4) {
        setErrorMsg('Password must be at least 4 characters.');
        return;
      }
      setLoading(true);
      triggerHaptic('selection');
      try {
        const safeEmail = email.trim() || `${cleanPhone || Date.now()}@foodmaxx.ng`;
        const res = await api.register({
          full_name: fullName.trim(),
          email: safeEmail,
          phone: cleanPhone,
          password: password,
          role: 'customer'
        });
        if (res?.success) {
          triggerHaptic('success');
          if (onSuccess) onSuccess(res.user);
          setStep(3);
        } else {
          setErrorMsg(res?.message || 'Registration failed.');
        }
      } catch (err) {
        setErrorMsg(err?.message || 'Registration failed.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Real GPS detection
  const handleDetectGps = async () => {
    setDetectingGps(true);
    setErrorMsg('');
    try {
      const loc = await getRealCurrentPosition();
      if (loc?.address) {
        setAddress(loc.address);
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Could not detect GPS location.');
    } finally {
      setDetectingGps(false);
    }
  };

  // Handle continue as guest
  const handleContinueAsGuest = () => {
    triggerHaptic('selection');
    try {
      localStorage.setItem('fmx_onboarded', 'true');
    } catch {}
    if (onGuest) onGuest();
    else if (onComplete) onComplete();
  };

  return (
    <div className="relative w-full h-full min-h-[100dvh] bg-[#F8FAFC] text-slate-900 flex flex-col justify-between overflow-x-hidden font-sans select-none">
      
      {/* Top Bar */}
      <div className="pt-6 px-6 flex items-center justify-between z-10 max-w-md mx-auto w-full">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => {
              setErrorMsg('');
              setStep(prev => prev - 1);
            }}
            className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 active:scale-95 flex items-center justify-center text-slate-700 border border-slate-200 shadow-xs transition-all cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
        ) : (
          <div className="w-10 h-10" />
        )}

        {/* Minimal Progress Indicator */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-7 bg-[#EA4C2A]'
                  : s < step
                  ? 'w-2.5 bg-[#EA4C2A]/70'
                  : 'w-2 bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Guest Skip button */}
        <button
          type="button"
          onClick={handleContinueAsGuest}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer px-2 py-1"
        >
          Skip
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center px-6 py-4 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          
          {/* SCREEN 1: WELCOME & EXPLICIT AUTH OPTIONS */}
          {step === 1 && (
            <motion.div
              key="step-welcome"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="flex flex-col items-center text-center space-y-5"
            >
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-white flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&auto=format&fit=crop&q=80"
                  alt="FoodMaxx Meal"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-2 py-1.5 px-3 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EA4C2A] animate-pulse" />
                  <span className="text-xs font-extrabold tracking-wide text-slate-900">Sizzling & Hot in Ibadan</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                  Welcome to FoodMaxx
                </h1>
                <p className="text-sm text-slate-600 font-medium max-w-xs mx-auto">
                  Get your favourite meals, delivered fresh and fast.
                </p>
              </div>

              {errorMsg && (
                <div className="w-full p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              {/* Explicit Auth Buttons */}
              <div className="w-full space-y-2.5 pt-2">
                {/* 1. Continue with Google */}
                <button
                  type="button"
                  disabled={googleLoading}
                  onClick={handleGoogleSignIn}
                  className="w-full py-3.5 px-4 rounded-2xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-extrabold text-sm shadow-xs flex items-center justify-center gap-3 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {googleLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin text-[#EA4C2A]" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>

                {/* 2. Sign In */}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setStep(2);
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#EA4C2A] hover:bg-[#D43D1D] active:scale-[0.98] text-white font-black text-sm shadow-lg shadow-[#EA4C2A]/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </button>

                {/* 3. Create Account */}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setStep(2);
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-extrabold text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Create Account</span>
                </button>

                {/* 4. Continue as Guest */}
                <button
                  type="button"
                  onClick={handleContinueAsGuest}
                  className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Compass size={14} />
                  <span>Continue as Guest</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 2: STANDARD SIGN IN OR CREATE ACCOUNT */}
          {step === 2 && (
            <motion.div
              key="step-auth"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {authMode === 'login' ? 'Sign In to FoodMaxx' : 'Create Your Account'}
                </h2>
                <p className="text-xs text-slate-600">
                  {authMode === 'login' ? 'Enter your credentials to continue' : 'Join FoodMaxx for delicious meals & discounts'}
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-700">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Babatunde Adeleke"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-2xl bg-white border border-slate-300 text-sm font-semibold outline-none focus:border-[#EA4C2A]"
                    />
                  </div>
                )}

                {/* Login Phone (11 digits, numbers only, +234 & Nigeria Flag) */}
                {authMode === 'login' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Phone Number
                      </label>
                      <span className="text-[11px] font-bold text-slate-400">
                        {phone.replace(/\D/g, '').length}/11 digits
                      </span>
                    </div>
                    <div className="relative flex">
                      <div className="flex items-center gap-1.5 px-3 py-3 border border-r-0 rounded-l-2xl text-xs font-black bg-slate-100 border-slate-300 text-slate-700 shrink-0">
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
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        className="w-full px-3.5 py-3 border rounded-r-2xl text-sm font-bold tracking-wider outline-none focus:border-[#EA4C2A] bg-white border-slate-300 text-slate-900"
                      />
                    </div>
                  </div>
                )}

                {/* Register Phone (11 digits, numbers only, +234 & Nigeria Flag) */}
                {authMode === 'register' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Phone Number
                      </label>
                      <span className="text-[11px] font-bold text-slate-400">
                        {phone.replace(/\D/g, '').length}/11 digits
                      </span>
                    </div>
                    <div className="relative flex">
                      <div className="flex items-center gap-1.5 px-3 py-3 border border-r-0 rounded-l-2xl text-xs font-black bg-slate-100 border-slate-300 text-slate-700 shrink-0">
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
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        className="w-full px-3.5 py-3 border rounded-r-2xl text-sm font-bold tracking-wider outline-none focus:border-[#EA4C2A] bg-white border-slate-300 text-slate-900"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder={authMode === 'login' ? 'Enter password' : 'Enter password (min. 4 characters)'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-3 rounded-2xl bg-white border border-slate-300 text-sm font-semibold outline-none focus:border-[#EA4C2A]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-[#EA4C2A] hover:bg-[#D43D1D] active:scale-[0.98] text-white font-black text-sm shadow-lg shadow-[#EA4C2A]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>{authMode === 'login' ? 'Sign In' : 'Create Account'}</span>
                  )}
                </button>
              </form>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                  }}
                  className="text-xs font-bold text-[#EA4C2A] hover:underline cursor-pointer"
                >
                  {authMode === 'login' ? "Don't have an account? Create Account" : 'Already have an account? Sign In'}
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 3: DELIVERY LOCATION */}
          {step === 3 && (
            <motion.div
              key="step-location"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Where should we deliver?
                </h2>
                <p className="text-xs text-slate-600">
                  Add your delivery address in Ibadan so we can serve you better.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Delivery Address
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectGps}
                    disabled={detectingGps}
                    className="text-xs font-bold text-[#EA4C2A] flex items-center gap-1 cursor-pointer"
                  >
                    {detectingGps ? <RefreshCw size={12} className="animate-spin" /> : <Navigation size={12} />}
                    <span>Use GPS</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  placeholder="Enter street, landmark or area in Ibadan"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-white border border-slate-300 text-sm font-semibold outline-none focus:border-[#EA4C2A] resize-none"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {['Bodija', 'UI Agbowo', 'Agodi GRA', 'Samonda', 'Ring Road'].map(area => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setAddress(prev => prev ? `${prev}, ${area}` : area)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 cursor-pointer"
                  >
                    + {area}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  try {
                    if (address) localStorage.setItem('fmx_last_delivery_address', address);
                  } catch {}
                  setStep(4);
                }}
                className="w-full py-4 rounded-2xl bg-[#EA4C2A] hover:bg-[#D43D1D] active:scale-[0.98] text-white font-black text-sm shadow-lg shadow-[#EA4C2A]/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>
            </motion.div>
          )}

          {/* SCREEN 4: NOTIFICATIONS */}
          {step === 4 && (
            <motion.div
              key="step-notifications"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="flex flex-col items-center text-center space-y-5"
            >
              <div className="w-20 h-20 rounded-3xl bg-[#EA4C2A]/10 text-[#EA4C2A] flex items-center justify-center shadow-lg border border-[#EA4C2A]/20">
                <Bell size={36} className="animate-bounce" />
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Stay Updated on Your Food
                </h2>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  Turn on notifications for live updates as our chef prepares and rider delivers.
                </p>
              </div>

              <div className="w-full space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await requestNotificationPermission();
                    } catch {}
                    if (onComplete) onComplete();
                  }}
                  className="w-full py-4 rounded-2xl bg-[#EA4C2A] hover:bg-[#D43D1D] active:scale-[0.98] text-white font-black text-sm shadow-lg shadow-[#EA4C2A]/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Bell size={18} />
                  <span>Enable Notifications</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onComplete) onComplete();
                  }}
                  className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Skip for Now
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <div className="pb-6 text-center text-xs text-slate-400 font-semibold">
        FoodMaxx Fresh Delivery · Ibadan
      </div>
    </div>
  );
}

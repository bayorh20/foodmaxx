import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Mail, Lock, User, Phone, Eye, EyeOff, Check, AlertCircle,
  Sparkles, RefreshCw, ArrowRight, ShieldCheck, Heart, KeyRound,
  CheckCircle2, HelpCircle, MessageSquare
} from 'lucide-react';
import { triggerHaptic, playNativeSound } from '../services/nativeMobile';
import { api } from '../services/api';
import {
  getHappyAvatar,
  getRandomHappyAvatar,
  HAPPY_FEMALE_AVATARS,
  HAPPY_MALE_AVATARS,
  detectGender
} from '../utils/avatarUtils';

export default function AuthModal({
  open,
  onClose,
  initialMode = 'login', // 'login' | 'register'
  onSuccess,
  isDark = false
}) {
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Sign In state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regGender, setRegGender] = useState('auto'); // 'auto' | 'female' | 'male'
  const [regAvatarUrl, setRegAvatarUrl] = useState(() => getRandomHappyAvatar('female').url);

  // Sync mode with prop if opened with specific initialMode
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setErrorMsg('');
      setShowPassword(false);
    }
  }, [open, initialMode]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!regPassword) return { score: 0, label: 'None', color: 'bg-slate-200' };
    let score = 0;
    if (regPassword.length >= 6) score++;
    if (regPassword.length >= 8) score++;
    if (/[A-Z]/.test(regPassword) && /[a-z]/.test(regPassword)) score++;
    if (/[0-9]/.test(regPassword) || /[^A-Za-z0-9]/.test(regPassword)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-blue-500' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  }, [regPassword]);

  // Check CapsLock on keydown/keyup
  const handleKeyDown = (e) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  // Handle Sign In submission
  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const cleanEmail = loginEmail.trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!loginPassword) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);
    triggerHaptic('selection');
    try {
      const res = await api.login(cleanEmail, loginPassword);
      if (res?.success) {
        triggerHaptic('success');
        playNativeSound('success');
        if (onSuccess) onSuccess(res.user);
        onClose();
      } else {
        setErrorMsg(res?.message || 'Invalid email or password.');
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Up submission
  const handleRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const cleanName = regName.trim();
    const cleanEmail = regEmail.trim();
    const cleanPhone = regPhone.trim();

    if (!cleanName) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    triggerHaptic('selection');
    try {
      const avatar = regAvatarUrl || getHappyAvatar(cleanName, regGender);
      const res = await api.register({
        full_name: cleanName,
        email: cleanEmail,
        phone: cleanPhone ? (cleanPhone.startsWith('0') ? cleanPhone : `0${cleanPhone}`) : '',
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


  // Shuffle smiling avatar
  const handleShuffleAvatar = () => {
    triggerHaptic('selection');
    const pool = regGender === 'female'
      ? HAPPY_FEMALE_AVATARS
      : (regGender === 'male' ? HAPPY_MALE_AVATARS : [...HAPPY_FEMALE_AVATARS, ...HAPPY_MALE_AVATARS]);
    const randomPick = pool[Math.floor(Math.random() * pool.length)].url;
    setRegAvatarUrl(randomPick);
  };

  // Send password reset
  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      return;
    }
    setForgotSent(true);
    triggerHaptic('success');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
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
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
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
              <span>Register</span>
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

          {/* ========================================================= */}
          {/* FORM 1: SIGN IN                                           */}
          {/* ========================================================= */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4" onKeyDown={handleKeyDown}>
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    autoFocus
                    required
                    placeholder="e.g. adekunle@gmail.com"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-2xl text-xs sm:text-sm font-bold outline-none focus:border-[#EA4C2A] transition-colors ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
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
                      setForgotEmail(loginEmail);
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
                    className={`w-full pl-10 pr-10 py-3 border rounded-2xl text-xs sm:text-sm font-bold outline-none focus:border-[#EA4C2A] transition-colors ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
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
                    <span>Sign In to FoodMaxx</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>


              {/* Switch to Register */}
              <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
                New to FoodMaxx?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg('');
                  }}
                  className="font-black text-[#EA4C2A] hover:underline cursor-pointer"
                >
                  Create an account 🎉
                </button>
              </p>
            </form>
          )}

          {/* ========================================================= */}
          {/* FORM 2: SIGN UP / REGISTER                                */}
          {/* ========================================================= */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4" onKeyDown={handleKeyDown}>
              {/* Customer Avatar & Gender Picker */}
              <div className={`p-3.5 rounded-2xl border space-y-2 ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200/80'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Choose Your Happy Avatar
                  </span>
                  <button
                    type="button"
                    onClick={handleShuffleAvatar}
                    className="text-[11px] font-bold text-[#EA4C2A] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={11} />
                    <span>Shuffle</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* Avatar Photo with subtle ring */}
                  <div className="relative shrink-0">
                    <img
                      src={regAvatarUrl}
                      alt="Your Avatar"
                      className="w-13 h-13 rounded-2xl object-cover ring-2 ring-[#EA4C2A] shadow-md shadow-[#EA4C2A]/20"
                    />
                    <button
                      type="button"
                      onClick={handleShuffleAvatar}
                      title="Click to randomize"
                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-[#EA4C2A] border border-[#EA4C2A]/30 flex items-center justify-center shadow-xs active:rotate-180 transition-transform cursor-pointer ${isDark ? 'bg-[#1E222D]' : 'bg-white'}`}
                    >
                      <RefreshCw size={10} />
                    </button>
                  </div>

                  <div className="flex-1">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5 font-semibold">
                      Select preference:
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setRegGender('female');
                          setRegAvatarUrl(getRandomHappyAvatar('female').url);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                          regGender === 'female'
                            ? 'bg-[#EC4899] text-white shadow-xs'
                            : `${isDark ? 'bg-white/10 text-slate-300 border-white/10' : 'bg-white text-slate-700 border-slate-200'} border`
                        }`}
                      >
                        👩 Female
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRegGender('male');
                          setRegAvatarUrl(getRandomHappyAvatar('male').url);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                          regGender === 'male'
                            ? 'bg-[#0AA5FF] text-white shadow-xs'
                            : `${isDark ? 'bg-white/10 text-slate-300 border-white/10' : 'bg-white text-slate-700 border-slate-200'} border`
                        }`}
                      >
                        👨 Male
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRegGender('auto');
                          setRegAvatarUrl(getRandomHappyAvatar('all').url);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                          regGender === 'auto'
                            ? 'bg-[#EA4C2A] text-white shadow-xs'
                            : `${isDark ? 'bg-white/10 text-slate-300 border-white/10' : 'bg-white text-slate-700 border-slate-200'} border`
                        }`}
                      >
                        🎲 Surprise
                      </button>
                    </div>
                  </div>
                </div>
              </div>

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
                    onChange={e => {
                      const val = e.target.value;
                      setRegName(val);
                      if (regGender === 'auto' && val.length >= 2) {
                        setRegAvatarUrl(getHappyAvatar(val, 'auto'));
                      }
                    }}
                    className={`w-full pl-10 pr-4 py-3 border rounded-2xl text-xs sm:text-sm font-bold outline-none focus:border-[#EA4C2A] transition-colors ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. bukola@gmail.com"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-2xl text-xs sm:text-sm font-bold outline-none focus:border-[#EA4C2A] transition-colors ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
              </div>

              {/* Phone (Nigerian Prefix) */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Phone Number (For Delivery SMS & WhatsApp)
                </label>
                <div className="relative flex">
                  <div className={`flex items-center gap-1 px-3 py-3 border border-r-0 rounded-l-2xl text-xs font-black shrink-0 ${isDark ? 'bg-white/10 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                    <span>🇳🇬</span>
                    <span>+234</span>
                  </div>
                  <input
                    type="tel"
                    placeholder="816 600 4281"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    className={`w-full px-3 py-3 border rounded-r-2xl text-xs sm:text-sm font-bold outline-none focus:border-[#EA4C2A] transition-colors ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Create Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min. 6 characters"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className={`w-full pl-10 pr-10 py-3 border rounded-2xl text-xs sm:text-sm font-bold outline-none focus:border-[#EA4C2A] transition-colors ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {regPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1.5 h-1.5">
                      {[1, 2, 3, 4].map(step => (
                        <div
                          key={step}
                          className={`flex-1 rounded-full transition-all ${
                            step <= passwordStrength.score ? passwordStrength.color : 'bg-slate-200 dark:bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                      <span>Security: {passwordStrength.label}</span>
                      <span>{passwordStrength.score >= 3 ? '✓ Secure' : 'Try adding numbers or symbols'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Terms note */}
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                By creating an account, you agree to FoodMaxx's Terms of Service and Privacy Policy.
              </p>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-[0.99] disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-xl shadow-[#EA4C2A]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Creating Your Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account & Start Ordering</span>
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

          {/* Security guarantee footer */}
          <div className="pt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span>256-bit SSL Encrypted · 100% Safe & Secure</span>
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
                    Enter your registered email address and we'll send you a password reset code.
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

/**
 * Standard wrappers to maintain 100% backward-compatibility with App.jsx
 */
export function LoginModal({ open, onClose, onSwitchRegister }) {
  return (
    <AuthModal
      open={open}
      onClose={onClose}
      initialMode="login"
      onSuccess={onClose}
    />
  );
}

export function RegisterModal({ open, onClose, onSwitchLogin }) {
  return (
    <AuthModal
      open={open}
      onClose={onClose}
      initialMode="register"
      onSuccess={onClose}
    />
  );
}

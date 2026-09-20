import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  MapPin, 
  Bell, 
  User, 
  Phone, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Compass,
  UtensilsCrossed,
  Bike,
  Wallet
} from 'lucide-react';

const ONBOARDING_SLIDES = [
  {
    badge: 'CHEF CRAFTED',
    title: 'Gourmet Chow, Sizzling Hot',
    description: 'Juicy handcrafted burgers, smoky charcoal suya, authentic party Jollof, and signature pasta bowls made fresh to order.',
    icon: UtensilsCrossed,
    image: '/foodmaxx-logo.png',
    accentColor: '#EA4C2A',
    bgGradient: 'from-orange-500/15 via-red-500/5 to-transparent'
  },
  {
    badge: 'REAL-TIME DISPATCH',
    title: 'Track Your Courier Live',
    description: 'Watch your dedicated FoodMaxx rider zoom across the city on a live interactive map with accurate ETA and secure PIN handover.',
    icon: Bike,
    image: '/delivery-rider.png',
    accentColor: '#FF6B4A',
    bgGradient: 'from-amber-500/15 via-orange-500/5 to-transparent'
  },
  {
    badge: 'EFFORTLESS CHECKOUT',
    title: 'Instant 1-Tap Wallet',
    description: 'Enjoy seamless payments with your FoodMaxx digital wallet, fast direct bank transfer, or card. Zero delays, zero friction.',
    icon: Wallet,
    image: '/nav-cart.png',
    accentColor: '#10B981',
    bgGradient: 'from-emerald-500/15 via-teal-500/5 to-transparent'
  }
];

export default function OnboardingFlow({ 
  onComplete, 
  onRegister, 
  onGuest 
}) {
  // Stages: 'carousel' -> 'permissions' -> 'register'
  const [stage, setStage] = useState('carousel');
  const [slideIdx, setSlideIdx] = useState(0);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Permission states
  const [locationGranted, setLocationGranted] = useState(false);
  const [notifsGranted, setNotifsGranted] = useState(false);
  const [isRequestingPerms, setIsRequestingPerms] = useState(false);

  // Carousel navigation
  const nextSlide = () => {
    if (slideIdx < ONBOARDING_SLIDES.length - 1) {
      setSlideIdx(slideIdx + 1);
    } else {
      setStage('permissions');
    }
  };

  const skipToPermissions = () => {
    setStage('permissions');
  };

  // Request native permissions
  const handleRequestPermissions = async () => {
    setIsRequestingPerms(true);
    
    // 1. Request location
    try {
      if ('geolocation' in navigator) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setLocationGranted(true);
              try {
                localStorage.setItem('fmx_user_lat', String(pos.coords.latitude));
                localStorage.setItem('fmx_user_lng', String(pos.coords.longitude));
              } catch {}
              resolve(true);
            },
            () => resolve(false),
            { timeout: 4000, enableHighAccuracy: true }
          );
        });
      }
    } catch (e) {}

    // 2. Request notifications
    try {
      if ('Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') setNotifsGranted(true);
      }
    } catch (e) {}

    setIsRequestingPerms(false);
    // Advance to Silent Registration
    setStage('register');
  };

  // Handle silent registration
  const handleSilentRegister = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setErrorMsg('Please enter your full name');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMsg('Please enter a valid phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      if (typeof onRegister === 'function') {
        await onRegister({
          full_name: cleanName,
          phone: cleanPhone.startsWith('0') ? cleanPhone : `0${cleanPhone}`
        });
      }
      try { localStorage.setItem('fmx_onboarded', 'true'); } catch {}
      if (typeof onComplete === 'function') onComplete();
    } catch (err) {
      setErrorMsg(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Guest flow
  const handleBrowseGuest = () => {
    try { localStorage.setItem('fmx_onboarded', 'true'); } catch {}
    if (typeof onGuest === 'function') onGuest();
    else if (typeof onComplete === 'function') onComplete();
  };

  return (
    <div className="fixed inset-0 z-[180] flex flex-col justify-between bg-[#0F1015] text-white select-none overflow-hidden">
      {/* Dynamic ambient backdrop */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-[400px] bg-gradient-to-b from-[#EA4C2A]/15 via-[#EA4C2A]/5 to-transparent blur-3xl pointer-events-none" />

      {/* STAGE 1: ONBOARDING CAROUSEL */}
      {stage === 'carousel' && (
        <div className="relative flex-1 flex flex-col justify-between p-6 max-w-md mx-auto w-full">
          {/* Top Bar: Brand Pill + Skip Button */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <img src="/foodmaxx-logo.png" alt="FoodMaxx" className="w-7 h-7 rounded-xl object-cover shadow-sm shadow-[#EA4C2A]/30" />
              <span className="font-extrabold text-sm tracking-tight text-white">Food<span className="text-[#EA4C2A]">Maxx</span></span>
            </div>
            <button
              onClick={skipToPermissions}
              className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-full bg-white/5 border border-white/10 active:scale-95 transition-all cursor-pointer"
            >
              Skip
            </button>
          </div>

          {/* Slide Content with AnimatePresence */}
          <div className="my-auto py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={slideIdx}
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -40, scale: 0.95 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center text-center"
              >
                {/* Hero Illustration Card */}
                <div className="relative w-44 h-44 sm:w-48 sm:h-48 mb-8 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-radial from-[#EA4C2A]/20 to-transparent blur-xl" />
                  <div className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-3xl bg-gradient-to-tr from-[#181B24] to-[#222736] border border-white/10 shadow-2xl flex items-center justify-center p-5">
                    <img 
                      src={ONBOARDING_SLIDES[slideIdx].image} 
                      alt="FoodMaxx Preview" 
                      className="w-full h-full object-contain drop-shadow-xl"
                    />
                  </div>
                  {/* Floating badge */}
                  <div className="absolute -bottom-2 px-3 py-1 rounded-full bg-[#EA4C2A] text-white text-[10px] font-black tracking-wider uppercase shadow-lg shadow-[#EA4C2A]/35 border border-white/20">
                    {ONBOARDING_SLIDES[slideIdx].badge}
                  </div>
                </div>

                {/* Typography */}
                <h2 className="text-2xl sm:text-[26px] font-black tracking-tight text-white leading-tight max-w-[320px]">
                  {ONBOARDING_SLIDES[slideIdx].title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-2.5 leading-relaxed max-w-[310px]">
                  {ONBOARDING_SLIDES[slideIdx].description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Bar: Dot Indicators + Next Button */}
          <div className="flex items-center justify-between pb-6 pt-2">
            {/* Dots */}
            <div className="flex items-center gap-1.5">
              {ONBOARDING_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlideIdx(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    slideIdx === i 
                      ? 'w-7 bg-[#EA4C2A] shadow-xs shadow-[#EA4C2A]/50' 
                      : 'w-2 bg-white/20 hover:bg-white/40'
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>

            {/* Next / Start Button */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={nextSlide}
              className="px-6 py-3 rounded-2xl bg-[#EA4C2A] hover:bg-[#D43D1D] text-white font-bold text-sm shadow-lg shadow-[#EA4C2A]/30 flex items-center gap-2 cursor-pointer transition-all"
            >
              <span>{slideIdx === ONBOARDING_SLIDES.length - 1 ? 'Get Started' : 'Next'}</span>
              <ArrowRight size={16} />
            </motion.button>
          </div>
        </div>
      )}

      {/* STAGE 2: PERMISSION PRIMER */}
      {stage === 'permissions' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="relative flex-1 flex flex-col justify-between p-6 max-w-md mx-auto w-full"
        >
          {/* Top Header */}
          <div className="pt-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#EA4C2A]/15 border border-[#EA4C2A]/30 flex items-center justify-center mx-auto mb-3 text-[#EA4C2A]">
              <ShieldCheck size={26} />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Enable Quick Permissions</h2>
            <p className="text-xs text-slate-400 mt-1.5 max-w-[280px] mx-auto">
              FoodMaxx needs two simple permissions to guarantee rapid cooking and hot doorstep delivery.
            </p>
          </div>

          {/* Cards */}
          <div className="space-y-3.5 my-auto py-4">
            {/* Location Card */}
            <div className="p-4 rounded-2xl bg-[#161822] border border-white/10 flex items-start gap-3.5 shadow-lg shadow-black/20">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                <MapPin size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white">Doorstep Location</h4>
                  {locationGranted && <CheckCircle2 size={16} className="text-emerald-400" />}
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Pinpoint your delivery address automatically, show nearby kitchen specials, and estimate precise delivery times.
                </p>
              </div>
            </div>

            {/* Notification Card */}
            <div className="p-4 rounded-2xl bg-[#161822] border border-white/10 flex items-start gap-3.5 shadow-lg shadow-black/20">
              <div className="w-10 h-10 rounded-xl bg-[#EA4C2A]/15 border border-[#EA4C2A]/30 flex items-center justify-center text-[#EA4C2A] shrink-0 mt-0.5">
                <Bell size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white">Live Cooking & Arrival Alerts</h4>
                  {notifsGranted && <CheckCircle2 size={16} className="text-emerald-400" />}
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Get notified the instant your meal starts grilling and when your courier pulls up outside with your PIN.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-col gap-2.5 pb-6">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleRequestPermissions}
              disabled={isRequestingPerms}
              className="w-full py-3.5 rounded-2xl bg-[#EA4C2A] hover:bg-[#D43D1D] text-white font-bold text-sm shadow-xl shadow-[#EA4C2A]/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-75"
            >
              {isRequestingPerms ? (
                <span>Configuring permissions...</span>
              ) : (
                <>
                  <span>Allow & Continue</span>
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>
            <button
              onClick={() => setStage('register')}
              className="text-xs font-semibold text-slate-400 hover:text-white py-2 text-center transition-colors cursor-pointer"
            >
              Maybe Later
            </button>
          </div>
        </motion.div>
      )}

      {/* STAGE 3: SILENT REGISTRATION (JUST NAME & PHONE NUMBER) */}
      {stage === 'register' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="relative flex-1 flex flex-col justify-between p-6 max-w-md mx-auto w-full"
        >
          {/* Header */}
          <div className="pt-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#EA4C2A] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#EA4C2A]/30 text-white">
              <Sparkles size={24} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Start Ordering Chow!
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 max-w-[280px] mx-auto">
              No passwords or long forms. Just your name and phone number to start ordering.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSilentRegister} className="my-auto py-4 space-y-3.5">
            {/* Welcome Perk Banner */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/5 border border-emerald-500/30 flex items-center gap-2.5">
              <span className="text-lg">🎁</span>
              <div className="text-xs">
                <span className="font-extrabold text-emerald-400">₦1,000 Welcome Wallet Perk</span>
                <p className="text-[11px] text-slate-300">Added to your FoodMaxx wallet on registration!</p>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold text-center">
                {errorMsg}
              </div>
            )}

            {/* Full Name Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                Your Full Name
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adura Akintunde"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#161822] border border-white/10 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-[#EA4C2A] focus:ring-1 focus:ring-[#EA4C2A] transition-all"
                />
              </div>
            </div>

            {/* Phone Number Input with +234 Flag */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                Phone Number
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center gap-1.5 text-xs font-bold text-slate-300 pr-2 border-r border-white/15">
                  <span className="text-sm">🇳🇬</span>
                  <span>+234</span>
                </div>
                <input
                  type="tel"
                  required
                  placeholder="801 234 5678"
                  value={phone}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^\d]/g, '');
                    setPhone(clean);
                  }}
                  className="w-full pl-24 pr-4 py-3.5 rounded-2xl bg-[#161822] border border-white/10 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-[#EA4C2A] focus:ring-1 focus:ring-[#EA4C2A] transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3.5 rounded-2xl bg-[#EA4C2A] hover:bg-[#D43D1D] text-white font-black text-sm shadow-xl shadow-[#EA4C2A]/35 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-75"
            >
              {isSubmitting ? (
                <span>Registering & Preparing Table...</span>
              ) : (
                <>
                  <span>Start Eating</span>
                  <ArrowRight size={17} />
                </>
              )}
            </motion.button>
          </form>

          {/* Guest Browsing Option */}
          <div className="pt-2 pb-6 text-center">
            <button
              onClick={handleBrowseGuest}
              className="text-xs font-semibold text-slate-400 hover:text-white py-2 flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
            >
              <Compass size={14} />
              <span>Browse Menu as Guest</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

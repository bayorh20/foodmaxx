import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  ChevronLeft, 
  User, 
  Phone, 
  MapPin, 
  Check, 
  Sparkles,
  Utensils,
  RefreshCw,
  Navigation,
  AlertCircle
} from 'lucide-react';
import { getRealCurrentPosition } from '../services/realLocation';

export default function OnboardingFlow({ 
  onComplete, 
  onRegister, 
  onGuest 
}) {
  // 3-Step Flow: 1 (Welcome) -> 2 (Details) -> 3 (Delivery Location)
  const [step, setStep] = useState(1);

  // Form state pre-filled from existing storage if available
  const [fullName, setFullName] = useState(() => {
    try {
      return localStorage.getItem('fmx_last_name') || '';
    } catch {
      return '';
    }
  });

  const [phone, setPhone] = useState(() => {
    try {
      return localStorage.getItem('fmx_last_phone') || '';
    } catch {
      return '';
    }
  });

  const [address, setAddress] = useState(() => {
    try {
      return localStorage.getItem('fmx_last_delivery_address') || '';
    } catch {
      return '';
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto clean phone number for Nigerian local/international format
  const handlePhoneChange = (val) => {
    const numeric = val.replace(/[^\d+]/g, '');
    setPhone(numeric.slice(0, 14));
    if (errorMsg) setErrorMsg('');
  };

  // Real GPS location detection for Step 3
  const handleDetectGps = async () => {
    setDetectingGps(true);
    setErrorMsg('');
    try {
      const loc = await getRealCurrentPosition();
      if (loc?.address) {
        setAddress(loc.address);
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Could not detect GPS location. Please enter manually.');
    } finally {
      setDetectingGps(false);
    }
  };

  // Validate Step 2 (Customer Details)
  const handleProceedToLocation = (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const trimmedName = fullName.trim();
    const cleanPhone = phone.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMsg('Please enter your full name');
      return;
    }

    const digitsOnly = cleanPhone.replace(/\D/g, '');
    if (!cleanPhone || digitsOnly.length < 10) {
      setErrorMsg('Please enter a valid phone number (e.g. 080XXXXXXXX)');
      return;
    }

    try {
      localStorage.setItem('fmx_last_name', trimmedName);
      localStorage.setItem('fmx_last_phone', cleanPhone);
    } catch {}

    setStep(3);
  };

  // Finalize Step 3 (Delivery Location) & Enter App
  const handleCompleteOnboarding = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const trimmedAddress = address.trim();
    if (!trimmedAddress || trimmedAddress.length < 3) {
      setErrorMsg('Please enter your delivery street address or landmark');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanName = fullName.trim();
      const cleanPhone = phone.trim();

      // Persist across app so user never has to re-type
      try {
        localStorage.setItem('fmx_last_name', cleanName);
        localStorage.setItem('fmx_last_phone', cleanPhone);
        localStorage.setItem('fmx_last_delivery_address', trimmedAddress);
        localStorage.setItem('fmx_onboarded', 'true');
        localStorage.setItem('fmx_splash_seen', 'true');
        sessionStorage.setItem('fmx_splash_seen', 'true');
      } catch {}

      // Trigger registration/profile update
      if (typeof onRegister === 'function') {
        await onRegister({
          full_name: cleanName,
          phone: cleanPhone,
          address: trimmedAddress
        });
      }

      // Transition immediately to Home screen
      if (typeof onComplete === 'function') {
        onComplete();
      }
    } catch (err) {
      if (typeof onComplete === 'function') {
        onComplete();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[100dvh] bg-[#F8FAFC] text-slate-900 flex flex-col justify-between overflow-x-hidden font-sans select-none">
      
      {/* Top Bar: Progress Indicator & Optional Back Button */}
      <div className="pt-6 px-6 flex items-center justify-between z-10 max-w-md mx-auto w-full">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => {
              setErrorMsg('');
              setStep(prev => prev - 1);
            }}
            className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 active:scale-95 flex items-center justify-center text-slate-700 border border-slate-200 shadow-xs transition-all cursor-pointer"
            aria-label="Go Back"
          >
            <ChevronLeft size={20} />
          </button>
        ) : (
          <div className="w-10 h-10" />
        )}

        {/* Minimal Progress Pills */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
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

        {/* Skip button for Step 1 only */}
        {step === 1 ? (
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem('fmx_onboarded', 'true');
              } catch {}
              if (typeof onComplete === 'function') onComplete();
            }}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer px-2 py-1"
          >
            Skip
          </button>
        ) : (
          <div className="w-10 h-10" />
        )}
      </div>

      {/* Main Content Carousel/Steps */}
      <div className="flex-1 flex flex-col justify-center px-6 py-4 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          
          {/* ======================================================== */}
          {/* SCREEN 1: WELCOME SCREEN                                 */}
          {/* ======================================================== */}
          {step === 1 && (
            <motion.div
              key="step-welcome"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="flex flex-col items-center text-center space-y-6"
            >
              {/* Appetizing Food Visual matching FoodMaxx branding */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden shadow-xl border border-slate-200/90 bg-white flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&auto=format&fit=crop&q=80"
                  alt="FoodMaxx Fresh Gourmet Meal"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                
                {/* Floating Brand Badge */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EA4C2A] animate-pulse" />
                  <span className="text-xs font-extrabold tracking-wide text-slate-900">Sizzling & Hot in Ibadan</span>
                </div>
              </div>

              {/* Copy */}
              <div className="space-y-2 pt-2">
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                  FoodMaxx
                </h1>
                <p className="text-base sm:text-lg text-slate-600 font-medium max-w-xs mx-auto leading-relaxed">
                  Get your favourite meals, delivered fresh and fast.
                </p>
              </div>

              {/* Action Button */}
              <div className="w-full pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full py-4 px-6 rounded-2xl bg-[#EA4C2A] hover:bg-[#D43D1D] active:scale-[0.98] text-white font-black text-base shadow-lg shadow-[#EA4C2A]/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <span>Get Started</span>
                  <ArrowRight size={18} className="stroke-[2.5]" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* SCREEN 2: CUSTOMER DETAILS                               */}
          {/* ======================================================== */}
          {step === 2 && (
            <motion.div
              key="step-details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="space-y-1.5">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Let’s get you started
                </h2>
                <p className="text-sm sm:text-base text-slate-600 font-medium">
                  Tell us a few details so we can serve you better.
                </p>
              </div>

              {/* Form Fields */}
              <form onSubmit={handleProceedToLocation} className="space-y-4 pt-1">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Your Name
                  </label>
                  <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-slate-300 shadow-2xs focus-within:border-[#EA4C2A] focus-within:ring-2 focus-within:ring-[#EA4C2A]/20 transition-all">
                    <User size={18} className="text-[#EA4C2A] shrink-0" />
                    <input
                      type="text"
                      required
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      className="w-full text-sm sm:text-base font-semibold text-slate-900 placeholder:text-slate-400 bg-transparent outline-none"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Phone Number
                  </label>
                  <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-slate-300 shadow-2xs focus-within:border-[#EA4C2A] focus-within:ring-2 focus-within:ring-[#EA4C2A]/20 transition-all">
                    <Phone size={18} className="text-[#EA4C2A] shrink-0" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      required
                      placeholder="080XXXXXXXX"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full text-sm sm:text-base font-semibold font-mono text-slate-900 placeholder:text-slate-400 bg-transparent outline-none"
                    />
                    {phone.replace(/\D/g, '').length >= 11 && (
                      <Check size={16} className="text-emerald-600 shrink-0 stroke-[3]" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    We use your phone number to update you on your food dispatch.
                  </p>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-600 flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Continue Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-4 px-6 rounded-2xl bg-[#EA4C2A] hover:bg-[#D43D1D] active:scale-[0.98] text-white font-black text-base shadow-lg shadow-[#EA4C2A]/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Continue</span>
                    <ArrowRight size={18} className="stroke-[2.5]" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* SCREEN 3: DELIVERY LOCATION                              */}
          {/* ======================================================== */}
          {step === 3 && (
            <motion.div
              key="step-location"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="space-y-1.5">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Where should we deliver your meals
                </h2>
                <p className="text-sm sm:text-base text-slate-600 font-medium">
                  Add your delivery address so we know where to bring your food.
                </p>
              </div>

              {/* Form Field */}
              <form onSubmit={handleCompleteOnboarding} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Delivery Address
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectGps}
                      disabled={detectingGps}
                      className="text-xs font-bold text-[#EA4C2A] hover:text-[#D43D1D] flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200/80 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {detectingGps ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>Detecting GPS...</span>
                        </>
                      ) : (
                        <>
                          <Navigation size={12} />
                          <span>Use Current Location</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-slate-300 shadow-2xs focus-within:border-[#EA4C2A] focus-within:ring-2 focus-within:ring-[#EA4C2A]/20 transition-all">
                    <MapPin size={20} className="text-[#EA4C2A] shrink-0 mt-0.5" />
                    <textarea
                      rows={3}
                      required
                      placeholder="Enter street address, building or landmark in Ibadan"
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      className="w-full text-sm sm:text-base font-semibold text-slate-900 placeholder:text-slate-400 bg-transparent outline-none resize-none leading-relaxed"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Popular Ibadan Areas Quick Chips */}
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Quick Area Selection:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Bodija, Ibadan',
                      'UI Campus, Agbowo',
                      'Agodi GRA, Ibadan',
                      'Samonda, Ibadan',
                      'Ring Road / Challenge'
                    ].map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => {
                          setAddress(prev => prev ? `${prev}, ${area}` : area);
                          if (errorMsg) setErrorMsg('');
                        }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-300 shadow-2xs transition-all cursor-pointer"
                      >
                        + {area}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-600 flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Save & Continue Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 rounded-2xl bg-[#EA4C2A] hover:bg-[#D43D1D] active:scale-[0.98] text-white font-black text-base shadow-lg shadow-[#EA4C2A]/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving Details...
                      </span>
                    ) : (
                      <>
                        <span>Save & Continue</span>
                        <ArrowRight size={18} className="stroke-[2.5]" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Subtle Footer */}
      <div className="pb-6 text-center text-xs text-slate-400 font-semibold tracking-wide">
        FoodMaxx Fresh Delivery · Ibadan
      </div>

    </div>
  );
}

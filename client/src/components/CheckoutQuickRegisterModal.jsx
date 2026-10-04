import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, User, RefreshCw, ArrowRight, Gift } from 'lucide-react';
import { getRandomNigerianGenzAvatar } from '../services/aiAvatarService';

/**
 * CHECKOUT QUICK REGISTER POPUP MODAL
 * 
 * Minimal 2-field registration popup displayed in the checkout flow
 * when a user is not yet registered. Clean, simple, and fast onboarding.
 */
export default function CheckoutQuickRegisterModal({
  open,
  onClose,
  onSubmit,
  initialName = '',
  initialPhone = '',
  isDark = false
}) {
  const [name, setName] = useState(initialName || '');
  const [phone, setPhone] = useState(initialPhone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync initial values from props/localStorage when modal opens
  useEffect(() => {
    if (open) {
      try {
        const lastName = initialName || localStorage.getItem('fmx_last_name') || '';
        const lastPhone = initialPhone || localStorage.getItem('fmx_last_phone') || '';
        if (lastName) setName(lastName);
        if (lastPhone) setPhone(lastPhone);
      } catch {}
    }
  }, [open, initialName, initialPhone]);

  // Form submission
  const handleSubmit = async (e) => {
    e?.preventDefault();
    setErrorMsg('');

    const cleanName = name.trim();
    const cleanPhone = phone.replace(/\D/g, '');

    if (!cleanName || cleanName.length < 2) {
      setErrorMsg('Please enter your full name (at least 2 letters)');
      return;
    }

    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 11-digit phone number (e.g. 08012345678)');
      return;
    }

    setIsSubmitting(true);
    try {
      if (typeof onSubmit === 'function') {
        const autoAvatar = getRandomNigerianGenzAvatar();
        await onSubmit({
          full_name: cleanName,
          phone: cleanPhone.startsWith('234') ? '0' + cleanPhone.slice(3) : cleanPhone,
          avatar_url: autoAvatar,
          style: 'nigerian_genz'
        });
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
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
        {/* Top Header with FoodMaxx branding */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#EA4C2A] to-amber-500 text-white flex items-center justify-center shadow-md shadow-[#EA4C2A]/20">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">Quick Registration</h3>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-500/10 text-[#EA4C2A]">
                  1-Step
                </span>
              </div>
              <p className="text-xs text-slate-400">Enter your details to finalize your order in seconds</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer transition-colors"
            title="Continue as Guest"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">

          {/* Form Inputs: Only Name and Phone Number */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Input 1: Full Name */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Full Name <span className="text-[#EA4C2A]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="e.g. Babatunde Adeleke"
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs sm:text-sm font-bold border outline-none transition-all ${
                    isDark
                      ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-[#EA4C2A] focus:bg-white/[0.07]'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#EA4C2A] focus:bg-white focus:ring-2 focus:ring-[#EA4C2A]/20'
                  }`}
                />
              </div>
            </div>

            {/* Input 2: Phone Number */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Phone Number <span className="text-[#EA4C2A]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center gap-1 pointer-events-none text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-white/10 pr-2 my-2">
                  <span className="text-sm">🇳🇬</span>
                  <span className="text-xs font-bold">+234</span>
                </div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setPhone(raw);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="0801 234 5678"
                  className={`w-full pl-22 pr-4 py-3 rounded-2xl text-xs sm:text-sm font-bold border outline-none transition-all tracking-wide ${
                    isDark
                      ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-[#EA4C2A] focus:bg-white/[0.07]'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#EA4C2A] focus:bg-white focus:ring-2 focus:ring-[#EA4C2A]/20'
                  }`}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Used for instant SMS order receipts & rider dispatch alerts
              </p>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">
                {errorMsg}
              </div>
            )}

            {/* Welcome Perks Pill */}
            <div className={`p-2.5 rounded-xl flex items-center gap-2 text-[11px] font-semibold ${
              isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-100/70 text-slate-600'
            }`}>
              <Gift size={14} className="text-[#EA4C2A] shrink-0" />
              <span>Includes ₦1,000 welcome discount + AI foodie avatar profile</span>
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#EA4C2A] hover:bg-[#d83f1d] active:scale-[0.98] text-white font-extrabold text-sm shadow-lg shadow-[#EA4C2A]/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <span>Continue to Checkout</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Dismiss as Guest Link */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold cursor-pointer underline transition-colors"
            >
              Continue without saving profile
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

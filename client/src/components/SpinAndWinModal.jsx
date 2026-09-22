import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { X, ChevronLeft, Sparkles, ArrowRight, Copy, Check } from 'lucide-react';
import { playNativeSound, triggerHaptic } from '../services/nativeMobile';

// Web Audio API Ticker Sound Generator (No external audio file needed)
function playWheelTickSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(980, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.025);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.025);
  } catch (e) {}
}

function playWinFanfareSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + idx * 0.09;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  } catch (e) {}
}

// 6 REWARD ITEMS WITH CLEAN ICONS
export const WHEEL_SECTORS = [
  {
    id: 'free_meal',
    label: 'Free Meal',
    type: 'meal',
    code: 'FREEMEAL',
    accent: '#EA4C2A',
    badge: '100% OFF',
    description: 'Free complete meal voucher on your next order!',
    emoji: '🎁',
    icon: (
      <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#EA4C2A] to-[#FF6B6B] flex items-center justify-center text-3xl sm:text-4xl shadow-lg shadow-red-500/25 text-white">
        🎁
      </div>
    )
  },
  {
    id: '20_off',
    label: '20% Off',
    type: 'discount',
    code: 'WIN20',
    accent: '#F97316',
    badge: 'SAVE 20%',
    description: '20% discount on your entire checkout order!',
    emoji: '🏷️',
    icon: (
      <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#F97316] to-[#FBBF24] flex items-center justify-center text-2xl sm:text-3xl shadow-lg shadow-orange-500/25 text-white font-black">
        20%
      </div>
    )
  },
  {
    id: 'free_fries',
    label: 'Free Crispy Fries',
    type: 'fries',
    code: 'FREEFRIES',
    accent: '#EAB308',
    badge: 'FREE SNACK',
    description: 'Crispy golden fries added free to your meal!',
    emoji: '🍟',
    icon: (
      <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#EAB308] to-[#FDE047] flex items-center justify-center text-3xl sm:text-4xl shadow-lg shadow-yellow-500/25 text-white">
        🍟
      </div>
    )
  },
  {
    id: 'better_luck',
    label: 'Better Luck Next Time',
    type: 'try_again',
    code: null,
    accent: '#64748B',
    badge: 'TRY AGAIN',
    description: 'Come back tomorrow for another daily reward spin!',
    emoji: '😌',
    icon: (
      <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#64748B] to-[#94A3B8] flex items-center justify-center text-3xl sm:text-4xl shadow-lg shadow-slate-500/20 text-white">
        😌
      </div>
    )
  },
  {
    id: 'free_drink',
    label: 'Free Cold Drink',
    type: 'drink',
    code: 'FREEDRINK',
    accent: '#3B82F6',
    badge: 'FREE DRINK',
    description: 'Chilled refreshing drink included with your order!',
    emoji: '🥤',
    icon: (
      <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#60A5FA] flex items-center justify-center text-3xl sm:text-4xl shadow-lg shadow-blue-500/25 text-white">
        🥤
      </div>
    )
  },
  {
    id: '10_off',
    label: '10% Off',
    type: 'discount',
    code: 'WIN10',
    accent: '#EA4C2A',
    badge: 'SAVE 10%',
    description: '10% discount applied to your checkout cart!',
    emoji: '🎟️',
    icon: (
      <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#EA4C2A] to-[#FB923C] flex items-center justify-center text-2xl sm:text-3xl shadow-lg shadow-red-500/25 text-white font-black">
        10%
      </div>
    )
  }
];

export default function SpinAndWinModal({ open, onClose, onRewardClaimed, isDark }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonPrize, setWonPrize] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [spinsLeft, setSpinsLeft] = useState(1);
  const timerRef = useRef(null);

  // Check daily spin status from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const lastSpin = localStorage.getItem('fmx_last_spin_date');
      if (lastSpin === today) {
        setSpinsLeft(0);
      } else {
        setSpinsLeft(1);
      }
    } catch (e) {
      setSpinsLeft(1);
    }
  }, [open]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!open) return null;

  const handleSpin = () => {
    if (isSpinning) return;

    triggerHaptic('medium');
    setIsSpinning(true);
    setWonPrize(null);
    setCopiedCode(false);

    // Pick target winning prize index
    const rand = Math.random() * 100;
    let target = 1; // default 20% Off
    if (rand < 15) target = 0;       // Free Meal
    else if (rand < 38) target = 1;  // 20% Off
    else if (rand < 58) target = 2;  // Free Fries
    else if (rand < 70) target = 3;  // Better Luck Next Time
    else if (rand < 88) target = 4;  // Free Drink
    else target = 5;                 // 10% Off

    let currentIdx = activeIndex;
    let step = 0;
    // Total steps to create a satisfying ~3.2s slot animation
    const totalSteps = 24 + ((target - currentIdx + WHEEL_SECTORS.length) % WHEEL_SECTORS.length);

    const tick = () => {
      step++;
      currentIdx = (currentIdx + 1) % WHEEL_SECTORS.length;
      setActiveIndex(currentIdx);
      playWheelTickSound();
      triggerHaptic('light');

      if (step >= totalSteps && currentIdx === target) {
        // Landed on winning prize!
        setIsSpinning(false);
        const prize = WHEEL_SECTORS[target];
        setWonPrize(prize);

        // Record daily spin
        try {
          const today = new Date().toISOString().slice(0, 10);
          localStorage.setItem('fmx_last_spin_date', today);
          setSpinsLeft(0);
        } catch (e) {}

        if (prize.type !== 'try_again') {
          playWinFanfareSound();
          triggerHaptic('success');
          confetti({
            particleCount: 75,
            spread: 75,
            origin: { y: 0.55 },
            colors: ['#EA4C2A', '#FBBF24', '#10B981', '#FF6B6B']
          });
        } else {
          playNativeSound('info');
        }
        return;
      }

      // Physics deceleration easing
      const progress = step / totalSteps;
      let nextDelay = 55;
      if (progress > 0.60) nextDelay = 90;
      if (progress > 0.78) nextDelay = 150;
      if (progress > 0.88) nextDelay = 240;
      if (progress > 0.94) nextDelay = 380;

      timerRef.current = setTimeout(tick, nextDelay);
    };

    timerRef.current = setTimeout(tick, 55);
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    try {
      if (navigator.clipboard) navigator.clipboard.writeText(code);
    } catch (e) {}
    setCopiedCode(true);
    triggerHaptic('selection');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleClaim = () => {
    if (wonPrize && onRewardClaimed) {
      onRewardClaimed(wonPrize);
    }
    onClose();
  };

  const resetSpinForTesting = () => {
    try {
      localStorage.removeItem('fmx_last_spin_date');
      setSpinsLeft(1);
      setWonPrize(null);
    } catch (e) {}
  };

  const currentItem = isSpinning ? WHEEL_SECTORS[activeIndex] : (wonPrize || null);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border ${
          isDark ? 'bg-[#15171F] border-white/10 text-white' : 'bg-white border-slate-100 text-slate-900'
        } relative flex flex-col items-center select-none my-auto`}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="w-full pt-4 pb-2 px-4 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer border ${
              isDark
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
            }`}
            aria-label="Back"
          >
            <ChevronLeft size={19} />
          </button>

          <div className="flex flex-col items-center">
            <span className="text-xs font-black tracking-wider text-slate-900 dark:text-white flex items-center gap-0.5 font-sans">
              FOOD<span className="text-[#EA4C2A]">MAXX</span>
            </span>
            <span className="text-[9px] text-slate-400 font-semibold tracking-tight">
              Daily Lucky Perks
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer border ${
              isDark
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
            }`}
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        {/* Main Content Body */}
        <div className="w-full px-5 pb-5 pt-1 flex flex-col items-center text-center">
          
          {/* Title */}
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Spin & <span className="text-[#EA4C2A]">Win</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {isSpinning 
                ? 'Shuffling perks in real time...' 
                : wonPrize 
                ? 'Congratulations on your reward!' 
                : 'Tap below to reveal today’s surprise food reward'}
            </p>
          </div>

          {/* THE CLEAN ANIMATED REWARD POD */}
          <div className="relative my-2 flex items-center justify-center">
            {/* Ambient Radial Glow */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-[#EA4C2A]/25 via-amber-500/20 to-orange-400/25 blur-2xl rounded-full pointer-events-none" />

            {/* Pod Surface */}
            <div className={`relative w-36 h-36 sm:w-40 sm:h-40 rounded-3xl border flex flex-col items-center justify-center shadow-xl backdrop-blur-md transition-colors duration-300 ${
              isDark 
                ? 'bg-[#1C1F2B] border-white/15 shadow-red-500/10' 
                : 'bg-gradient-to-b from-white to-slate-50/80 border-slate-200/80 shadow-slate-200/60'
            }`}>
              
              {/* Dynamic Icon State Animation */}
              <AnimatePresence mode="wait">
                {isSpinning && currentItem ? (
                  <motion.div
                    key={`spin-${currentItem.id}`}
                    initial={{ scale: 0.7, opacity: 0.4, y: 8, rotate: -6 }}
                    animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
                    exit={{ scale: 0.7, opacity: 0.4, y: -8, rotate: 6 }}
                    transition={{ duration: 0.09, ease: 'easeOut' }}
                    className="flex flex-col items-center justify-center"
                  >
                    {currentItem.icon}
                  </motion.div>
                ) : wonPrize ? (
                  <motion.div
                    key={`won-${wonPrize.id}`}
                    initial={{ scale: 0.4, rotate: -15 }}
                    animate={{ scale: [0.4, 1.2, 1], rotate: [0, 8, 0] }}
                    transition={{ type: 'spring', damping: 15, stiffness: 280 }}
                    className="flex flex-col items-center justify-center"
                  >
                    {wonPrize.icon}
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    animate={{ y: [-3, 3, -3], scale: [1, 1.03, 1] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative flex flex-col items-center justify-center cursor-pointer"
                    onClick={handleSpin}
                  >
                    <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#EA4C2A] via-[#FF5E3A] to-[#FF8A65] text-white flex items-center justify-center text-4xl shadow-xl shadow-red-500/30">
                      🎁
                    </div>
                    <Sparkles className="absolute -top-1 -right-1 text-amber-400 animate-pulse drop-shadow-xs" size={18} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Pod Status Label */}
          <div className="mt-3 min-h-[46px] flex flex-col items-center justify-center">
            {isSpinning && currentItem ? (
              <motion.div
                key={currentItem.id}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-[#EA4C2A] animate-ping" />
                <span className="font-black text-sm sm:text-base text-[#EA4C2A] tracking-tight">
                  {currentItem.label}
                </span>
              </motion.div>
            ) : wonPrize ? (
              <div className="space-y-0.5">
                <span className="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                  {wonPrize.type === 'try_again' ? 'Better Luck Next Time!' : wonPrize.label}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {wonPrize.description}
                </p>
              </div>
            ) : (
              <div>
                <span className="font-black text-sm text-slate-900 dark:text-white">
                  Mystery Reward Inside
                </span>
                <p className="text-[11px] text-slate-400 font-medium">
                  {spinsLeft > 0 ? '1 free unlock available today' : 'Daily spin used for today'}
                </p>
              </div>
            )}
          </div>

          {/* RESULT / ACTION SECTION */}
          <div className="w-full mt-2">
            <AnimatePresence mode="wait">
              {wonPrize ? (
                <motion.div
                  key="won-action"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full space-y-2"
                >
                  {wonPrize.code && (
                    <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
                      <span className="font-mono font-black text-xs text-[#EA4C2A]">
                        {wonPrize.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(wonPrize.code)}
                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 text-[10px] font-bold border border-slate-200 dark:border-white/10 flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                      >
                        {copiedCode ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                        <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleClaim}
                    className="w-full py-3 rounded-2xl bg-[#EA4C2A] hover:bg-[#D42222] active:scale-98 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-500/25 transition-all cursor-pointer"
                  >
                    <span>{wonPrize.code ? 'Claim & Apply to Cart' : 'Continue Shopping'}</span>
                    <ArrowRight size={15} />
                  </button>
                </motion.div>
              ) : (
                <motion.div key="spin-action" className="w-full space-y-2">
                  <button
                    type="button"
                    onClick={handleSpin}
                    disabled={isSpinning || spinsLeft <= 0}
                    className={`w-full py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                      isSpinning
                        ? 'bg-slate-300 dark:bg-white/10 text-slate-500 cursor-not-allowed'
                        : spinsLeft <= 0
                        ? 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed'
                        : 'bg-[#EA4C2A] hover:bg-[#D42222] active:scale-98 text-white shadow-red-500/25'
                    }`}
                  >
                    <Sparkles size={15} className={isSpinning ? 'animate-spin' : ''} />
                    <span>{isSpinning ? 'Revealing...' : 'Spin & Reveal Reward'}</span>
                  </button>

                  {spinsLeft <= 0 && (
                    <button
                      type="button"
                      onClick={resetSpinForTesting}
                      className="text-[11px] text-[#EA4C2A] font-bold hover:underline cursor-pointer pt-1"
                    >
                      Spin Again (Test Mode)
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CLEAN REWARD CHIPS STRIP (VISIBLE AT A GLANCE) */}
          <div className="w-full mt-4 pt-3 border-t border-slate-100 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                Unlockable Daily Perks
              </span>
              <span className="text-[10px] font-bold text-emerald-500">
                100% Free
              </span>
            </div>
            
            <div className="flex items-center justify-between gap-1 overflow-x-auto py-0.5 no-scrollbar">
              {WHEEL_SECTORS.filter(s => s.type !== 'try_again').map(sector => (
                <div
                  key={sector.id}
                  className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl border text-center shrink-0 transition-all ${
                    isSpinning && currentItem?.id === sector.id
                      ? 'border-[#EA4C2A] bg-orange-500/10 scale-105'
                      : wonPrize?.id === sector.id
                      ? 'border-emerald-500 bg-emerald-500/10 scale-105'
                      : isDark
                      ? 'bg-white/5 border-white/8'
                      : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <span className="text-base leading-none mb-1">{sector.emoji}</span>
                  <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 leading-tight">
                    {sector.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}

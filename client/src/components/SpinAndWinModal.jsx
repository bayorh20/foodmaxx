import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { X, ChevronLeft, Gift, Tag, Sparkles, Check, ArrowRight, RotateCw, Copy, Flame } from 'lucide-react';
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

// 6 SECTORS MATCHING EXACT USER MOCKUP
export const WHEEL_SECTORS = [
  {
    id: 'free_meal',
    label: 'Free Meal',
    type: 'meal',
    code: 'FREEMEAL',
    bg: '#FFE7E7',
    isPink: true,
    accent: '#EA4C2A',
    icon: (
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#EA4C2A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="8" width="18" height="12" rx="2" fill="#EA4C2A" fillOpacity="0.15" />
        <path d="M12 8v12" />
        <path d="M3 13h18" />
        <path d="M12 8C10.5 5 7 5 7 7s3 1 5 1z" fill="#EA4C2A" />
        <path d="M12 8C13.5 5 17 5 17 7s-3 1-5 1z" fill="#EA4C2A" />
      </svg>
    ),
    description: '100% Off Next Meal voucher'
  },
  {
    id: '20_off',
    label: '20% Off',
    type: 'discount',
    code: 'WIN20',
    bg: '#FFFFFF',
    isPink: false,
    accent: '#EA4C2A',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="#EA4C2A" stroke="#EA4C2A" strokeWidth="1.5">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <circle cx="7" cy="7" r="2" fill="#FFFFFF" />
      </svg>
    ),
    description: '20% discount on your entire order'
  },
  {
    id: 'free_fries',
    label: 'Free Fries',
    type: 'fries',
    code: 'FREEFRIES',
    bg: '#FFE7E7',
    isPink: true,
    accent: '#EA4C2A',
    icon: (
      <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
        {/* French Fries Box */}
        <path d="M7 11L9 28H23L25 11H7Z" fill="#EA4C2A" />
        <path d="M9 11C9 11 13 14 16 14C19 14 23 11 23 11V28H9V11Z" fill="#C5371A" opacity="0.35" />
        {/* Fries Sticks */}
        <rect x="10" y="4" width="2.8" height="9" rx="1.2" fill="#FBBF24" />
        <rect x="14" y="2" width="2.8" height="11" rx="1.2" fill="#F59E0B" />
        <rect x="18" y="3" width="2.8" height="10" rx="1.2" fill="#FBBF24" />
        <rect x="8" y="6" width="2.5" height="7" rx="1" fill="#F59E0B" transform="rotate(-10 8 6)" />
        <rect x="22" y="6" width="2.5" height="7" rx="1" fill="#FBBF24" transform="rotate(10 22 6)" />
      </svg>
    ),
    description: 'Crispy golden fries added free'
  },
  {
    id: 'better_luck',
    label: 'Better Luck Next Time',
    type: 'try_again',
    code: null,
    bg: '#FFFFFF',
    isPink: false,
    accent: '#F59E0B',
    icon: (
      <svg width="34" height="34" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" fill="#FBBF24" />
        {/* Eyes smiling curved */}
        <path d="M10 13C10 13 11.5 11 13 13" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
        <path d="M19 13C19 13 20.5 11 22 13" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
        {/* Gentle smile */}
        <path d="M11 19C13 22 19 22 21 19" stroke="#78350F" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
    description: 'Come back tomorrow for another lucky spin!'
  },
  {
    id: 'free_drink',
    label: 'Free Drink',
    type: 'drink',
    code: 'FREEDRINK',
    bg: '#FFE7E7',
    isPink: true,
    accent: '#EA4C2A',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        {/* Drink cup */}
        <path d="M9 10L11 28H21L23 10H9Z" fill="#EA4C2A" />
        <rect x="8" y="8" width="16" height="3" rx="1.5" fill="#C5371A" />
        {/* Straw */}
        <path d="M17 3L15 9" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
    description: 'Chilled refreshing drink with your meal'
  },
  {
    id: '10_off',
    label: '10% Off',
    type: 'discount',
    code: 'WIN10',
    bg: '#FFFFFF',
    isPink: false,
    accent: '#EA4C2A',
    icon: (
      <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
        {/* Ticket coupon */}
        <rect x="4" y="8" width="24" height="16" rx="3" fill="#EA4C2A" />
        <circle cx="4" cy="16" r="3.5" fill="#FFFFFF" />
        <circle cx="28" cy="16" r="3.5" fill="#FFFFFF" />
        {/* Percent symbol inside */}
        <text x="16" y="19" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
          %
        </text>
      </svg>
    ),
    description: '10% discount on your order'
  }
];

export default function SpinAndWinModal({ open, onClose, onRewardClaimed, isDark }) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonPrize, setWonPrize] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [spinsLeft, setSpinsLeft] = useState(1);
  const audioIntervalRef = useRef(null);

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

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, []);

  if (!open) return null;

  const handleSpin = () => {
    if (isSpinning) return;

    triggerHaptic('medium');
    setIsSpinning(true);
    setWonPrize(null);
    setCopiedCode(false);

    // Pick winning sector with fun weighting (higher chance for discounts & food items!)
    // Sector indices: 0: Free Meal (12%), 1: 20% Off (20%), 2: Free Fries (20%), 3: Better Luck (16%), 4: Free Drink (20%), 5: 10% Off (12%)
    const rand = Math.random() * 100;
    let targetIndex = 1; // default 20% Off
    if (rand < 12) targetIndex = 0;        // Free Meal
    else if (rand < 32) targetIndex = 1;   // 20% Off
    else if (rand < 52) targetIndex = 2;   // Free Fries
    else if (rand < 68) targetIndex = 3;   // Better Luck Next Time
    else if (rand < 88) targetIndex = 4;   // Free Drink
    else targetIndex = 5;                  // 10% Off

    // Math for wheel rotation:
    // 6 sectors => 60 deg each.
    // Sector 0 center is at 0 deg (top pointer at 12 o'clock).
    // Sector i center is at i * 60 deg.
    // To bring sector i to the top pointer (0 deg), wheel must rotate by (360 - i * 60) mod 360.
    const sectorAngle = (360 - (targetIndex * 60)) % 360;
    
    // Add 5 to 7 full 360 deg spins for dramatic suspense
    const fullSpins = 360 * 6;
    const currentBase = Math.floor(rotation / 360) * 360;
    const targetRotation = currentBase + fullSpins + sectorAngle;

    setRotation(targetRotation);

    // Realistic ticking sound while wheel spins
    let tickCount = 0;
    const tickInterval = 75;
    audioIntervalRef.current = setInterval(() => {
      playWheelTickSound();
      tickCount++;
      if (tickCount > 42) {
        clearInterval(audioIntervalRef.current);
      }
    }, tickInterval);

    // Wait for wheel animation (4.5s)
    setTimeout(() => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      setIsSpinning(false);
      const prize = WHEEL_SECTORS[targetIndex];
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
          particleCount: 80,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#EA4C2A', '#FBBF24', '#10B981', '#FF6B6B']
        });
      } else {
        playNativeSound('info');
      }
    }, 4500);
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

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`w-full max-w-sm sm:max-w-md rounded-[36px] overflow-hidden shadow-2xl border ${
          isDark ? 'bg-[#15171C] border-white/10 text-white' : 'bg-white border-slate-100 text-slate-900'
        } relative max-h-[94vh] flex flex-col items-center select-none`}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="w-full pt-4 px-5 flex items-center justify-between shrink-0 relative z-10">
          <button
            type="button"
            onClick={onClose}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer border ${
              isDark
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
            }`}
            aria-label="Back"
          >
            <ChevronLeft size={22} />
          </button>

          <div className="flex flex-col items-center">
            <span className="text-[13px] font-black tracking-wider text-slate-900 dark:text-white flex items-center gap-0.5 font-sans">
              FOOD<span className="text-[#EA4C2A]">MAXX</span>
            </span>
            <span className="text-[9px] text-slate-400 font-medium -mt-0.5 tracking-tight">
              Good Food Brings You Closer
            </span>
          </div>

          {/* Close X */}
          <button
            type="button"
            onClick={onClose}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer border ${
              isDark
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="w-full px-5 pb-5 pt-2 flex flex-col items-center overflow-y-auto">
          {/* Main Title Matching Mockup */}
          <div className="text-center mt-2 mb-4">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none text-slate-900 dark:text-white">
              Spin & <span className="text-[#EA4C2A]">Win</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1.5 max-w-xs mx-auto">
              Try your luck and win exciting rewards!
            </p>
          </div>

          {/* THE WHEEL CONTAINER */}
          <div className="relative my-2 flex items-center justify-center">
            {/* Outer Decorative Radiating Tick Marks */}
            <div className="absolute inset-0 -m-5 pointer-events-none">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
                <span
                  key={i}
                  className="absolute left-1/2 top-1/2 w-1.5 h-3.5 bg-[#FF8A8A]/50 rounded-full -translate-x-1/2"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-165px)`
                  }}
                />
              ))}
            </div>

            {/* Inverted Top Pointer Arrow (At 12 o'clock) */}
            <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-30 pointer-events-none drop-shadow-md">
              <div
                className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[26px] border-t-[#EA4C2A]"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))'
                }}
              />
              <div className="absolute top-[3px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[17px] border-t-white" />
            </div>

            {/* ROTATING WHEEL */}
            <div
              className="relative w-[300px] h-[300px] sm:w-[320px] sm:h-[320px] rounded-full overflow-hidden shadow-2xl border-[6px] border-white dark:border-[#1E222B]"
              style={{
                boxShadow: '0 20px 40px -15px rgba(234, 76, 42, 0.25), 0 0 0 1px rgba(0,0,0,0.06)'
              }}
            >
              <div
                className="w-full h-full rounded-full transition-transform"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transitionDuration: isSpinning ? '4.5s' : '0s',
                  transitionTimingFunction: 'cubic-bezier(0.15, 0.95, 0.25, 1.0)'
                }}
              >
                {/* SVG 6-SECTOR PIE WHEEL */}
                <svg viewBox="0 0 320 320" className="w-full h-full">
                  <defs>
                    <filter id="sectorShadow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.08" />
                    </filter>
                  </defs>

                  {/* 6 Pie Slices (60 deg each, centered around radius 160) */}
                  {WHEEL_SECTORS.map((sector, index) => {
                    const startAngle = index * 60 - 30; // so index 0 is centered at 0 deg (top)
                    const endAngle = startAngle + 60;
                    const r = 160;
                    const cx = 160;
                    const cy = 160;

                    const startRad = (startAngle - 90) * (Math.PI / 180);
                    const endRad = (endAngle - 90) * (Math.PI / 180);

                    const x1 = cx + r * Math.cos(startRad);
                    const y1 = cy + r * Math.sin(startRad);
                    const x2 = cx + r * Math.cos(endRad);
                    const y2 = cy + r * Math.sin(endRad);

                    const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;

                    return (
                      <path
                        key={sector.id}
                        d={pathData}
                        fill={sector.bg}
                        stroke="#FEE2E2"
                        strokeWidth="1.5"
                      />
                    );
                  })}
                </svg>

                {/* ICONS & LABELS LAYER ON EACH SECTOR */}
                {WHEEL_SECTORS.map((sector, index) => {
                  const angle = index * 60;
                  return (
                    <div
                      key={sector.id}
                      className="absolute inset-0 flex flex-col items-center justify-start pt-6 pointer-events-none select-none"
                      style={{
                        transform: `rotate(${angle}deg)`
                      }}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="transform scale-90 mb-1 drop-shadow-xs">
                          {sector.icon}
                        </div>
                        <span
                          className="text-[11px] sm:text-xs font-bold leading-tight max-w-[70px] px-1"
                          style={{
                            color: '#1E293B'
                          }}
                        >
                          {sector.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CENTER SPIN BUTTON HUB */}
            <button
              type="button"
              onClick={handleSpin}
              disabled={isSpinning || spinsLeft <= 0}
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-20 h-20 sm:w-[86px] sm:h-[86px] rounded-full flex items-center justify-center font-black text-sm tracking-wider uppercase transition-transform cursor-pointer ${
                isSpinning
                  ? 'scale-95 opacity-90'
                  : 'hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl'
              }`}
              style={{
                background: 'radial-gradient(circle, #EA4C2A 0%, #D43D1D 100%)',
                boxShadow: '0 8px 24px rgba(234, 76, 42, 0.45), inset 0 2px 4px rgba(255,255,255,0.4)',
                border: '5px solid #FFFFFF'
              }}
            >
              <div className="w-full h-full rounded-full flex items-center justify-center border-2 border-white/40">
                <span className="text-white text-base tracking-widest font-black drop-shadow-xs">
                  {isSpinning ? '...' : 'SPIN'}
                </span>
              </div>
            </button>
          </div>

          {/* SPIN STATUS UNDER WHEEL */}
          <div className="mt-3 text-center">
            {spinsLeft > 0 ? (
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>1 spin available today</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-400">
                <span>Spins used for today</span>
                <button
                  type="button"
                  onClick={resetSpinForTesting}
                  className="text-[10px] text-[#EA4C2A] underline font-bold cursor-pointer"
                >
                  Spin Again (Test Mode)
                </button>
              </div>
            )}
          </div>

          {/* PRIZE WON POPUP BANNER */}
          <AnimatePresence>
            {wonPrize && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`w-full mt-4 p-4 rounded-3xl border text-center relative overflow-hidden ${
                  wonPrize.type === 'try_again'
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-emerald-500/10 border-emerald-500/30'
                }`}
              >
                <div className="text-2xl mb-1">
                  {wonPrize.type === 'try_again' ? '😌' : '🎉'}
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {wonPrize.type === 'try_again' ? 'Better Luck Next Time!' : `You Won ${wonPrize.label}!`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {wonPrize.description}
                </p>

                {wonPrize.code && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(wonPrize.code)}
                      className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/15 font-mono font-bold text-xs text-[#EA4C2A] flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>Code: {wonPrize.code}</span>
                      <Copy size={12} className={copiedCode ? 'text-emerald-500' : 'text-slate-400'} />
                    </button>
                    <span className="text-[11px] font-semibold text-emerald-600">
                      {copiedCode ? 'Copied!' : 'Tap to copy'}
                    </span>
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleClaim}
                    className="flex-1 py-2.5 rounded-xl bg-[#EA4C2A] hover:bg-[#D43D1D] text-white font-bold text-xs shadow-md shadow-[#EA4C2A]/25 cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>{wonPrize.code ? 'Claim & Apply to Cart' : 'Continue Shopping'}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* BOTTOM BANNER MATCHING MOCKUP */}
          {!wonPrize && (
            <div className={`w-full mt-4 p-3.5 rounded-2xl border flex items-center gap-3.5 text-left ${
              isDark ? 'bg-white/5 border-white/8' : 'bg-[#FFF2F2] border-[#FFE2E2]'
            }`}>
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#EA4C2A] to-[#FF6B6B] text-white flex items-center justify-center text-xl shrink-0 shadow-sm">
                🎁
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                  Win food rewards
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Enjoy discounts, free meals and more!
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

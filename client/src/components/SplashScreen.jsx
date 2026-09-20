import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function SplashScreen({ onFinish, isQuick = false }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof onFinish === 'function') onFinish();
    }, isQuick ? 750 : 1800);
    return () => clearTimeout(timer);
  }, [onFinish, isQuick]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-between bg-[#0F1015] text-white select-none px-6 py-12 overflow-hidden"
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full bg-radial from-[#EA4C2A]/25 via-[#EA4C2A]/5 to-transparent blur-3xl pointer-events-none" />

      {/* Decorative top pill */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-slate-400"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>Gourmet Kitchens Active</span>
      </motion.div>

      {/* Centered Brand Emblem & Pulse */}
      <div className="relative flex flex-col items-center justify-center text-center my-auto">
        {/* Animated outer radiating pulse rings */}
        <motion.div
          animate={{ scale: [1, 1.45, 1], opacity: [0.35, 0, 0.35] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-3xl border-2 border-[#EA4C2A]/40 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.1, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
          className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#EA4C2A]/15 pointer-events-none"
        />

        {/* Logo Card */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0, rotate: -6 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 260 }}
          className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden shadow-2xl shadow-[#EA4C2A]/35 border-2 border-[#EA4C2A]/40 bg-gradient-to-tr from-[#161822] to-[#1F2433] p-1.5 flex items-center justify-center z-10"
        >
          <img
            src="/foodmaxx-logo.png"
            alt="FoodMaxx"
            className="w-full h-full object-cover rounded-2xl"
          />
        </motion.div>

        {/* Brand Name with Gradient */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.55 }}
          className="mt-6"
        >
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center justify-center gap-1">
            <span>Food</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EA4C2A] to-orange-400">Maxx</span>
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-400 mt-1.5 tracking-wide">
            Fastest Chow in Town • Sizzling Hot
          </p>
        </motion.div>
      </div>

      {/* Bottom Loading Progress Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="w-full max-w-[200px] flex flex-col items-center gap-2"
      >
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: isQuick ? 0.7 : 1.7, ease: 'easeInOut' }}
            className="h-full bg-gradient-to-r from-[#EA4C2A] to-orange-400 rounded-full shadow-[0_0_12px_rgba(234,76,42,0.8)]"
          />
        </div>
        <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">
          Preparing your table...
        </span>
      </motion.div>
    </motion.div>
  );
}

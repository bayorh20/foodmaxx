import React from 'react';
import { motion } from 'framer-motion';

export default function ThemeSelectionScreen({ onSelectTheme }) {
  const handleSelect = (theme) => {
    if (typeof onSelectTheme === 'function') {
      onSelectTheme(theme);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.35, ease: 'easeInOut' } }}
      className="fixed inset-0 z-[220] flex flex-col items-center justify-between bg-[#F8F9FA] text-slate-900 select-none px-6 py-12 overflow-y-auto"
    >
      {/* Top spacing / ambient background element */}
      <div className="w-full flex-1 flex flex-col items-center justify-center max-w-sm mx-auto my-auto py-6">
        
        {/* BRAND ICON (Red Squircle with FoodMaxx Takeout Box) */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.1 }}
          className="w-32 h-32 sm:w-36 sm:h-36 rounded-[2.2rem] bg-gradient-to-b from-[#EF2320] via-[#E51D24] to-[#C91310] shadow-2xl shadow-red-500/30 flex items-center justify-center p-4 relative group"
        >
          {/* Subtle inner reflection ring */}
          <div className="absolute inset-0 rounded-[2.2rem] ring-1 ring-white/25 pointer-events-none" />
          
          {/* Authentic Vector FoodMaxx Box with Logo */}
          <svg viewBox="0 0 120 120" className="w-20 h-20 fill-none" xmlns="http://www.w3.org/2000/svg">
            {/* Box Handle / Trapezoid Roof */}
            <path
              d="M 24 44 L 38 18 L 82 18 L 96 44 Z"
              fill="white"
            />
            {/* Cutout handle pill */}
            <rect x="46" y="25" width="28" height="6.5" rx="3.25" fill="#E51D24" />
            {/* Main Box Body */}
            <rect x="18" y="44" width="84" height="64" rx="8" fill="white" />
            {/* Text FOOD */}
            <text
              x="60"
              y="72"
              textAnchor="middle"
              fill="#E51D24"
              fontSize="16.5"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              letterSpacing="0.8"
            >
              FOOD
            </text>
            {/* Text MAXX */}
            <text
              x="60"
              y="94"
              textAnchor="middle"
              fill="#E51D24"
              fontSize="16.5"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              letterSpacing="0.8"
            >
              MAXX
            </text>
          </svg>
        </motion.div>

        {/* HEADINGS */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="text-center mt-7 mb-7"
        >
          <div className="text-[#E51D24] font-extrabold text-sm sm:text-base tracking-[0.18em] uppercase">
            WELCOME TO
          </div>
          <h1 className="text-[#E51D24] font-black text-3xl sm:text-4xl tracking-tight mt-0.5 mb-5">
            FOODMAXX
          </h1>

          <div className="text-slate-800 text-lg sm:text-xl font-normal leading-snug">
            Choose your<br />
            <span className="font-medium">Preferred Theme:</span>
          </div>
        </motion.div>

        {/* THEME SELECTION CARDS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="flex items-center justify-center gap-4 sm:gap-6 w-full max-w-[320px]"
        >
          {/* LIGHT MODE CARD */}
          <button
            type="button"
            onClick={() => handleSelect('light')}
            className="flex-1 aspect-[4/5] bg-white rounded-3xl p-4 sm:p-5 shadow-xl shadow-slate-200/80 border border-slate-100 flex flex-col items-center justify-center gap-3 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-2xl cursor-pointer group"
          >
            {/* Red Light Bulb Vector */}
            <div className="w-14 h-14 flex items-center justify-center transition-transform group-hover:scale-110">
              <svg
                viewBox="0 0 64 64"
                className="w-12 h-12 text-[#E51D24] fill-none stroke-current"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* 5 Outer Radiant Rays */}
                <line x1="32" y1="5" x2="32" y2="10" />
                <line x1="13" y1="13" x2="17" y2="17" />
                <line x1="51" y1="13" x2="47" y2="17" />
                <line x1="5" y1="32" x2="10" y2="32" />
                <line x1="59" y1="32" x2="54" y2="32" />
                
                {/* Bulb Outline */}
                <path d="M 21 34 C 17 28 19 18 32 18 C 45 18 47 28 43 34 C 40 38 39 41 39 45 L 25 45 C 25 41 24 38 21 34 Z" />
                
                {/* Filament Loop */}
                <path d="M 28 32 C 29 25 35 25 36 32" strokeWidth="2.5" />
                
                {/* Base Screw Rings */}
                <line x1="27" y1="49" x2="37" y2="49" strokeWidth="2.8" />
                <line x1="28.5" y1="53" x2="35.5" y2="53" strokeWidth="2.8" />
                
                {/* Bottom Contact Tip */}
                <path d="M 30 56.5 C 30 58.5 34 58.5 34 56.5" strokeWidth="2.8" fill="#E51D24" />
              </svg>
            </div>
            
            <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
              Light Mode
            </span>
          </button>

          {/* DARK MODE CARD */}
          <button
            type="button"
            onClick={() => handleSelect('dark')}
            className="flex-1 aspect-[4/5] bg-white rounded-3xl p-4 sm:p-5 shadow-xl shadow-slate-200/80 border border-slate-100 flex flex-col items-center justify-center gap-3 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-2xl cursor-pointer group"
          >
            {/* Red Half Sun / Contrast Vector */}
            <div className="w-14 h-14 flex items-center justify-center transition-transform group-hover:scale-110">
              <svg
                viewBox="0 0 64 64"
                className="w-12 h-12 text-[#E51D24] fill-none stroke-current"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* 8 Radial Sun Rays */}
                <line x1="32" y1="6" x2="32" y2="11" />
                <line x1="32" y1="53" x2="32" y2="58" />
                <line x1="6" y1="32" x2="11" y2="32" />
                <line x1="53" y1="32" x2="58" y2="32" />
                <line x1="13.5" y1="13.5" x2="17.5" y2="17.5" />
                <line x1="46.5" y1="46.5" x2="50.5" y2="50.5" />
                <line x1="13.5" y1="50.5" x2="17.5" y2="46.5" />
                <line x1="46.5" y1="17.5" x2="50.5" y2="13.5" />
                
                {/* Center Circle Ring */}
                <circle cx="32" cy="32" r="14" strokeWidth="3" />
                
                {/* Right Half Filled Solid Red */}
                <path d="M 32 18 A 14 14 0 0 1 32 46 Z" fill="#E51D24" stroke="none" />
              </svg>
            </div>
            
            <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
              Dark Mode
            </span>
          </button>
        </motion.div>

      </div>
    </motion.div>
  );
}

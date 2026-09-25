import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function SplashScreen({ onFinish, isQuick = false }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof onFinish === 'function') onFinish();
    }, isQuick ? 750 : 1850);
    return () => clearTimeout(timer);
  }, [onFinish, isQuick]);

  // Smooth ease-out curve per specifications
  const easeOutCurve = [0.16, 1, 0.3, 1];

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-between select-none overflow-hidden bg-[#E51A24]"
      style={{ willChange: 'opacity' }}
    >
      {/* 
        Exact Wavy Checkerboard Texture
        Essentially static with an extremely subtle ambient movement [1, 1.02]
      */}
      <motion.div
        animate={{ scale: [1, 1.018, 1] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 pointer-events-none w-full h-full overflow-hidden"
        style={{ willChange: 'transform' }}
      >
        <svg
          className="w-full h-full object-cover"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 400 800"
        >
          <defs>
            {/* Wavy checkerboard mesh path definitions */}
            <pattern id="fmxWavyGrid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path
                d="M 0,0 Q 25,12 50,0 Q 75,-12 100,0 L 100,50 Q 75,38 50,50 Q 25,62 0,50 Z"
                fill="#BA000A"
                opacity="0.32"
              />
              <path
                d="M 0,50 Q 25,62 50,50 Q 75,38 100,50 L 100,100 Q 75,88 50,100 Q 25,112 0,100 Z"
                fill="#BA000A"
                opacity="0.16"
              />
            </pattern>
          </defs>

          <rect width="400" height="800" fill="#E51A24" />
          <rect width="400" height="800" fill="url(#fmxWavyGrid)" />

          {/* Large gentle organic sine wave overlay for the authentic warp perspective */}
          <path
            d="M -50,150 Q 150,220 450,160 L 450,340 Q 200,420 -50,330 Z"
            fill="#BA000A"
            opacity="0.18"
          />
          <path
            d="M -50,480 Q 200,560 450,490 L 450,680 Q 180,740 -50,660 Z"
            fill="#BA000A"
            opacity="0.16"
          />
        </svg>
      </motion.div>

      {/* Top Balancing Spacer */}
      <div className="w-full h-12 sm:h-16" />

      {/* 
        Center: FoodMaxx Logo
        Fades in while scaling from 92% to 100%
      */}
      <div className="relative flex flex-col items-center justify-center my-auto z-10 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.15,
            duration: 0.65,
            ease: easeOutCurve
          }}
          className="w-40 h-40 sm:w-48 sm:h-48 md:w-52 md:h-52 drop-shadow-[0_12px_28px_rgba(0,0,0,0.35)] flex items-center justify-center"
          style={{ willChange: 'transform, opacity' }}
        >
          <img
            src="/foodmaxx-logo.png"
            alt="FoodMaxx"
            className="w-full h-full object-contain"
          />
        </motion.div>
      </div>

      {/* 
        Bottom Section:
        1. "WELCOME TO" fades in and moves upward 12px
        2. "FOODMAXX" fades in slightly after with subtle scale
        3. "Let’s Pamper Your Taste Bud!" fades in last
      */}
      <div className="relative z-10 pb-16 sm:pb-20 text-center flex flex-col items-center px-4 w-full">
        {/* "WELCOME TO" */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.40,
            duration: 0.50,
            ease: easeOutCurve
          }}
          className="text-white font-black text-xs sm:text-sm tracking-[0.22em] uppercase leading-none mb-1.5"
          style={{ willChange: 'transform, opacity' }}
        >
          WELCOME TO
        </motion.p>

        {/* "FOODMAXX" */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            delay: 0.60,
            duration: 0.50,
            ease: easeOutCurve
          }}
          className="text-white font-black text-4xl sm:text-5xl md:text-6xl tracking-tight leading-none mb-2"
          style={{ willChange: 'transform, opacity' }}
        >
          FOODMAXX
        </motion.h1>

        {/* "Let’s Pamper Your Taste Bud!" */}
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.85,
            duration: 0.50,
            ease: easeOutCurve
          }}
          className="text-[#FFDE00] font-black text-sm sm:text-base md:text-lg tracking-wide drop-shadow-sm"
          style={{ willChange: 'transform, opacity' }}
        >
          Let's Pamper Your Taste Bud!
        </motion.p>
      </div>
    </motion.div>
  );
}

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function SplashScreen({ onFinish, isQuick = false }) {
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof onFinishRef.current === 'function') onFinishRef.current();
    }, isQuick ? 350 : 700);
    return () => clearTimeout(timer);
  }, [isQuick]);

  const easeOutCurve = [0.16, 1, 0.3, 1];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="fixed inset-0 z-[999] flex items-center justify-center select-none overflow-hidden bg-[#E51A24]"
      style={{ willChange: 'opacity' }}
    >
      {/* 
        Exact User-Uploaded Splash Design
        Maintains 100% of original typography, colors, background texture, and proportions.
      */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.65,
          ease: easeOutCurve
        }}
        className="relative w-full h-full max-w-md max-h-screen flex items-center justify-center overflow-hidden"
        style={{ willChange: 'transform, opacity' }}
      >
        <img
          src="/splash-design.jpg"
          alt="FoodMaxx Splash Screen"
          className="w-full h-full object-cover object-center"
          loading="eager"
          decoding="sync"
        />
      </motion.div>
    </motion.div>
  );
}

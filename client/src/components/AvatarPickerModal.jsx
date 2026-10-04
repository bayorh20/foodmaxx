import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Check, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../services/nativeMobile';
import { NIGERIAN_GENZ_LOOKS } from '../services/aiAvatarService';

/**
 * TRUE VIEWPORT-LEVEL AVATAR PICKER BOTTOM SHEET
 * 
 * - Rendered directly via React Portal to document.body
 * - Uses position: fixed with bottom: 0, left: 0, right: 0
 * - High z-index (z-[99999] overlay, z-[100000] sheet) so it renders ABOVE the bottom nav
 * - Completely covers the bottom navigation bar
 * - Safe-area padding at bottom for Android & iOS devices
 * - Sheet height 70-85vh with smooth scrolling inside the avatar grid
 * - Dimmed background overlay
 * - Background body scroll prevented while open
 * - Sticky/visible close button at top-right
 */
export default function AvatarPickerModal({ 
  open, 
  onClose, 
  currentAvatar, 
  onSelectAvatar, 
  userName = 'FoodMaxx Member',
  isDark = false 
}) {
  const [selectedUrl, setSelectedUrl] = useState(currentAvatar || NIGERIAN_GENZ_LOOKS[0].url);
  const [genderFilter, setGenderFilter] = useState('all'); // 'all' | 'female' | 'male'

  // Sync selected URL with current user avatar on open
  useEffect(() => {
    if (open) {
      if (currentAvatar) {
        setSelectedUrl(currentAvatar);
      } else {
        setSelectedUrl(NIGERIAN_GENZ_LOOKS[0].url);
      }
    }
  }, [open, currentAvatar]);

  // Prevent background page from scrolling while sheet is open
  useEffect(() => {
    if (open && typeof document !== 'undefined') {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [open]);

  // Filtered list of looks based on gender filter
  const visibleLooks = useMemo(() => {
    if (genderFilter === 'female') {
      return NIGERIAN_GENZ_LOOKS.filter(l => l.gender === 'female');
    }
    if (genderFilter === 'male') {
      return NIGERIAN_GENZ_LOOKS.filter(l => l.gender === 'male');
    }
    return NIGERIAN_GENZ_LOOKS;
  }, [genderFilter]);

  // Find info of currently selected avatar
  const activeLook = useMemo(() => {
    return NIGERIAN_GENZ_LOOKS.find(l => l.url === selectedUrl);
  }, [selectedUrl]);

  if (!open) return null;

  // Confirm selection
  const handleConfirm = () => {
    triggerHaptic('success');
    if (selectedUrl && typeof onSelectAvatar === 'function') {
      onSelectAvatar(selectedUrl);
    }
    onClose();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 overflow-hidden"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className={`fixed bottom-0 left-0 right-0 sm:static w-full max-w-lg rounded-t-[32px] sm:rounded-t-[32px] sm:rounded-b-[24px] border-t sm:border shadow-[0_-12px_45px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col h-[82vh] max-h-[85vh] min-h-[70vh] z-[100000] pb-[max(1.25rem,env(safe-area-inset-bottom,1.25rem))] ${
          isDark ? 'bg-[#13161F] text-white border-white/10' : 'bg-white text-slate-900 border-slate-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pull grab bar */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Header with visible close button at top-right */}
        <div className="p-4 sm:p-4.5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#EA4C2A] flex items-center justify-center font-bold">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Choose Your Avatar</h3>
              <p className="text-xs text-slate-400">Choose your favorite character style.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close avatar sheet"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer transition-colors"
          >
            <X size={19} />
          </button>
        </div>

        {/* Live Preview Card */}
        <div className={`p-3 sm:p-4 flex flex-col items-center justify-center border-b shrink-0 ${
          isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'
        }`}>
          {/* Avatar frame */}
          <div className="relative">
            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full overflow-hidden bg-white dark:bg-[#1E222D] border-3 border-[#EA4C2A] shadow-xl flex items-center justify-center p-1">
              <img
                src={selectedUrl}
                alt="Selected Avatar"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#13161F]" />
          </div>
        </div>

        {/* Gender Filter Pills */}
        <div className="p-3 border-b border-slate-100 dark:border-white/10 flex items-center gap-2 shrink-0">
          {[
            { id: 'all', label: `All (${NIGERIAN_GENZ_LOOKS.length})` },
            { id: 'female', label: `Babes 💅 (${NIGERIAN_GENZ_LOOKS.filter(l => l.gender === 'female').length})` },
            { id: 'male', label: `Guys 🧢 (${NIGERIAN_GENZ_LOOKS.filter(l => l.gender === 'male').length})` }
          ].map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setGenderFilter(g.id);
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                genderFilter === g.id
                  ? 'bg-[#EA4C2A] text-white shadow-xs'
                  : isDark
                  ? 'bg-white/5 text-slate-300 hover:bg-white/10'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* 43 Looks Grid - Completely accessible with vertical scrolling */}
        <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 pb-6">
            {visibleLooks.map((look) => {
              const isSelected = selectedUrl === look.url;
              return (
                <button
                  key={look.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setSelectedUrl(look.url);
                  }}
                  className={`relative rounded-2xl p-1 border-2 transition-all cursor-pointer flex items-center justify-center aspect-square ${
                    isSelected
                      ? 'border-[#EA4C2A] ring-2 ring-[#EA4C2A]/20 shadow-md scale-105'
                      : isDark
                      ? 'border-white/10 hover:border-white/20 bg-white/5'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  }`}
                >
                  <div className="w-full h-full rounded-xl overflow-hidden bg-white dark:bg-[#1E222D]">
                    <img
                      src={look.url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#EA4C2A] text-white flex items-center justify-center shadow-xs">
                      <Check size={11} strokeWidth={3.5} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-white/10 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 py-3 rounded-2xl font-bold text-xs transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 rounded-2xl bg-[#EA4C2A] hover:bg-[#d83f1d] active:scale-[0.98] text-white font-black text-xs sm:text-sm shadow-md shadow-[#EA4C2A]/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Check size={16} strokeWidth={2.5} />
            <span>Save Avatar</span>
          </button>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

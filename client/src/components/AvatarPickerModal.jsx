import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Dices, Camera, Sparkles, Upload, RefreshCw } from 'lucide-react';
import { 
  HAPPY_FEMALE_AVATARS, 
  HAPPY_MALE_AVATARS, 
  get3DCartoonAvatar 
} from '../utils/avatarUtils';

// Fun gourmet foodie badge presets
const FOODIE_BADGES = [
  { id: 'fb_chef', name: 'Executive Chef', icon: '👨‍🍳', bg: 'from-amber-400 to-orange-500' },
  { id: 'fb_jollof', name: 'Jollof Connoisseur', icon: '🥘', bg: 'from-red-500 to-amber-600' },
  { id: 'fb_burger', name: 'Burger Royalty', icon: '🍔', bg: 'from-orange-400 to-red-500' },
  { id: 'fb_suya', name: 'Suya Master', icon: '🥩', bg: 'from-rose-500 to-red-700' },
  { id: 'fb_chicken', name: 'Crispy Poultry Pro', icon: '🍗', bg: 'from-amber-500 to-yellow-600' },
  { id: 'fb_pizza', name: 'Pizza Artisan', icon: '🍕', bg: 'from-orange-500 to-amber-500' },
  { id: 'fb_soup', name: 'Pepper Soup Chief', icon: '🍲', bg: 'from-emerald-500 to-teal-600' },
  { id: 'fb_drinks', name: 'Chilled Sips Expert', icon: '🥤', bg: 'from-sky-400 to-blue-500' },
  { id: 'fb_vip', name: 'VIP Chow Connoisseur', icon: '👑', bg: 'from-yellow-400 to-amber-500' },
  { id: 'fb_sparkle', name: 'FoodMaxx Star', icon: '✨', bg: 'from-purple-500 to-pink-500' },
];

/**
 * Convert a Foodie Badge into a clean lightweight SVG Data URL
 */
function foodieBadgeToDataUrl(badge) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#EA4C2A" />
        <stop offset="100%" stop-color="#FF7A00" />
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="48" fill="url(#g)" />
    <text x="50%" y="54%" font-size="78" text-anchor="middle" dominant-baseline="middle">${badge.icon}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function AvatarPickerModal({ 
  open, 
  onClose, 
  currentAvatar, 
  onSelectAvatar, 
  userName = 'FoodMaxx Member',
  isDark 
}) {
  const [activeTab, setActiveTab] = useState('3d'); // '3d' | 'foodie' | 'upload'
  const [selectedUrl, setSelectedUrl] = useState(currentAvatar || '');
  const [isCompressing, setIsCompressing] = useState(false);
  const [randomCount, setRandomCount] = useState(0);
  const fileInputRef = useRef(null);

  if (!open) return null;

  // Handle Photo File Upload with Canvas Compression to <40KB
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 400; // 400x400 is ideal for crisp mobile avatars
          let { width, height } = img;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to lightweight JPEG data URL
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setSelectedUrl(compressedDataUrl);
          setIsCompressing(false);
        };
        img.src = uploadEvent.target.result;
      };
      reader.readAsDataURL(file);
    } catch {
      setIsCompressing(false);
    }
  };

  // Roll Random 3D Look
  const handleRollRandom = () => {
    const seed = `fmx_random_${Date.now()}_${Math.floor(Math.random() * 99999)}`;
    const newAvatar = get3DCartoonAvatar(seed, 'auto');
    setSelectedUrl(newAvatar);
    setRandomCount(prev => prev + 1);
  };

  // Save selected avatar
  const handleConfirm = () => {
    if (selectedUrl && typeof onSelectAvatar === 'function') {
      onSelectAvatar(selectedUrl);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`w-full max-w-md rounded-t-[32px] sm:rounded-[32px] border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isDark ? 'bg-[#151821] text-white border-white/10' : 'bg-white text-slate-900 border-slate-200'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EA4C2A]/10 text-[#EA4C2A] flex items-center justify-center font-bold">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Avatar Studio</h3>
              <p className="text-xs text-slate-400">Choose your FoodMaxx persona</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Preview Hero Card */}
        <div className={`p-4 sm:p-5 flex flex-col items-center justify-center border-b ${
          isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50/80 border-slate-100'
        }`}>
          <div className="relative group">
            {/* Glowing Aura Ring */}
            <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-tr from-[#EA4C2A] via-amber-500 to-[#EA4C2A] opacity-40 blur-sm group-hover:opacity-75 transition-opacity" />
            
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-[24px] overflow-hidden bg-white dark:bg-[#1E222D] border-2 border-white dark:border-white/20 shadow-xl flex items-center justify-center">
              {selectedUrl ? (
                <img
                  src={selectedUrl}
                  alt={userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-3xl">👤</div>
              )}
            </div>

            {/* Active Presence Dot */}
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-[#151821] shadow-xs" />
          </div>

          <div className="mt-3 text-center">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              {userName}
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-[#EA4C2A] inline-block mt-0.5">
              Live Preview
            </span>
          </div>

          {/* 1-Tap Quick Roll Button */}
          <button
            type="button"
            onClick={handleRollRandom}
            className="mt-3 px-3.5 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-[#EA4C2A] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border border-orange-500/20"
          >
            <Dices size={14} className={randomCount > 0 ? 'animate-spin' : ''} />
            <span>Roll Random Look 🎲</span>
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex border-b border-slate-100 dark:border-white/10 px-4 pt-2">
          {[
            { id: '3d', label: '3D Characters' },
            { id: 'foodie', label: 'Foodie Badges' },
            { id: 'upload', label: 'Upload Photo' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#EA4C2A] text-[#EA4C2A]'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto overscroll-contain max-h-72">
          {/* TAB 1: 3D CHARACTERS */}
          {activeTab === '3d' && (
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Featured 3D Characters
                </span>
                <div className="grid grid-cols-4 gap-3 mt-2">
                  {[...HAPPY_FEMALE_AVATARS, ...HAPPY_MALE_AVATARS].slice(0, 12).map((av) => {
                    const isSelected = selectedUrl === av.url;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setSelectedUrl(av.url)}
                        className={`relative rounded-2xl p-1.5 border-2 transition-all cursor-pointer aspect-square flex flex-col items-center justify-center ${
                          isSelected
                            ? 'border-[#EA4C2A] bg-orange-500/10 shadow-md scale-105'
                            : 'border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50 dark:bg-white/5'
                        }`}
                      >
                        <img
                          src={av.url}
                          alt={av.name}
                          className="w-full h-full rounded-xl object-cover"
                        />
                        {isSelected && (
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#EA4C2A] text-white flex items-center justify-center shadow-xs">
                            <Check size={11} strokeWidth={3.5} />
                          </div>
                        )}
                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-1 truncate max-w-full">
                          {av.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOURMET FOODIE BADGES */}
          {activeTab === 'foodie' && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Gourmet Food Enthusiast Badges
              </span>
              <div className="grid grid-cols-2 gap-2.5 mt-2">
                {FOODIE_BADGES.map((b) => {
                  const badgeUrl = foodieBadgeToDataUrl(b);
                  const isSelected = selectedUrl === badgeUrl;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedUrl(badgeUrl)}
                      className={`p-2.5 rounded-2xl border-2 flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#EA4C2A] bg-orange-500/10 shadow-md'
                          : 'border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50 dark:bg-white/5'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#EA4C2A]/15 flex items-center justify-center text-xl shrink-0">
                        {b.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {b.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">Foodie Badge</div>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-[#EA4C2A] text-white flex items-center justify-center shrink-0">
                          <Check size={10} strokeWidth={3.5} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: UPLOAD PHOTO */}
          {activeTab === 'upload' && (
            <div className="space-y-4 py-2 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                  isDark
                    ? 'border-white/15 hover:border-[#EA4C2A] bg-white/[0.02]'
                    : 'border-slate-300 hover:border-[#EA4C2A] bg-slate-50/50'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-[#EA4C2A]/10 text-[#EA4C2A] flex items-center justify-center">
                  {isCompressing ? (
                    <RefreshCw size={24} className="animate-spin" />
                  ) : (
                    <Upload size={24} />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isCompressing ? 'Compressing photo...' : 'Choose or Take Photo'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Supports JPG, PNG · Auto-optimized for instant loading
                  </p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-[#EA4C2A] hover:bg-[#d83f1d] text-white font-bold text-xs shadow-xs"
                >
                  Browse Device
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-white/10 flex items-center gap-3">
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
}

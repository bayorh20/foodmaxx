import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Check, 
  X, 
  Layers, 
  Play, 
  Smartphone, 
  Zap, 
  Eye, 
  Compass, 
  RotateCw,
  Film,
  Sliders
} from 'lucide-react';

export const TRANSITION_STYLES = [
  {
    id: 'ios-parallax',
    name: 'iOS Parallax Stack',
    tag: 'Apple iOS',
    category: 'Native',
    description: 'Physical card sheets gliding over each other with natural depth and scale.',
    icon: Smartphone,
    color: 'from-blue-500/20 to-indigo-500/10 text-blue-400'
  },
  {
    id: 'circular-reveal',
    name: 'Radial Iris Shockwave',
    tag: 'Futuristic',
    category: 'Dynamic',
    description: 'Expanding circular reveal with glowing orange perimeter wavefront.',
    icon: Sparkles,
    color: 'from-orange-500/20 to-red-500/10 text-orange-400'
  },
  {
    id: 'zoom-bloom',
    name: 'Zoom & Bloom',
    tag: 'CashApp Style',
    category: 'Modern',
    description: 'Spring bloom forward from center with crisp focus deceleration.',
    icon: Zap,
    color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400'
  },
  {
    id: 'fade-scale',
    name: 'Gentle Fade & Scale',
    tag: 'Subtle',
    category: 'Minimal',
    description: 'Silky micro-scale (0.95 to 1.0) with soft opacity blend.',
    icon: Eye,
    color: 'from-purple-500/20 to-pink-500/10 text-purple-400'
  },
  {
    id: 'sheet-lift',
    name: 'Curved Sheet Lift',
    tag: 'UberEats Style',
    category: 'Native',
    description: 'Rises smoothly from the bottom with rounded corner morphing.',
    icon: Layers,
    color: 'from-amber-500/20 to-yellow-500/10 text-amber-400'
  },
  {
    id: 'horizontal-slide',
    name: 'Fluid Horizontal Push',
    tag: 'Classic',
    category: 'Native',
    description: 'Direction-aware lateral slide with natural physical inertia.',
    icon: Sliders,
    color: 'from-cyan-500/20 to-blue-500/10 text-cyan-400'
  },
  {
    id: 'vertical-elevator',
    name: 'Vertical Elevator',
    tag: 'Elevator',
    category: 'Dynamic',
    description: 'Clean vertical motion gliding up and down between tabs.',
    icon: Layers,
    color: 'from-rose-500/20 to-red-500/10 text-rose-400'
  },
  {
    id: '3d-flip',
    name: '3D Perspective Flip',
    tag: '3D Immersion',
    category: 'Playful',
    description: 'Tilted card rotation on the Y-axis like turning 3D book leaves.',
    icon: RotateCw,
    color: 'from-indigo-500/20 to-violet-500/10 text-indigo-400'
  },
  {
    id: 'bouncy-pop',
    name: 'Bouncy Card Pop',
    tag: 'Spring Elastic',
    category: 'Playful',
    description: 'Playful spring overshoot with tactile rebound dynamics.',
    icon: Sparkles,
    color: 'from-pink-500/20 to-rose-500/10 text-pink-400'
  },
  {
    id: 'blur-dissolve',
    name: 'Cinematic Glass Blur',
    tag: 'Cinematic',
    category: 'Modern',
    description: 'Glassmorphism blur dissolves from 12px blur into razor-sharp focus.',
    icon: Film,
    color: 'from-sky-500/20 to-indigo-500/10 text-sky-400'
  },
  {
    id: 'diagonal-sweep',
    name: 'Diagonal Sweep',
    tag: 'Angle Glide',
    category: 'Dynamic',
    description: 'Dynamic angled slide from top-right to bottom-left.',
    icon: Compass,
    color: 'from-teal-500/20 to-emerald-500/10 text-teal-400'
  },
  {
    id: 'cyber-pulse',
    name: 'Cyber Halo Pulse',
    tag: 'Neon Sci-Fi',
    category: 'Dynamic',
    description: 'High-tech rapid snap with warm FoodMaxx orange rim glow.',
    icon: Zap,
    color: 'from-red-500/25 to-orange-500/15 text-[#EA4C2A]'
  },
  {
    id: 'flip-x',
    name: '3D Horizontal Axis Flip',
    tag: '3D Deck',
    category: 'Playful',
    description: 'Flips forward like a deck of playing cards on the X-axis.',
    icon: RotateCw,
    color: 'from-amber-500/20 to-orange-500/10 text-amber-400'
  },
  {
    id: 'elastic-squish',
    name: 'Elastic Squish & Stretch',
    tag: 'Squish',
    category: 'Playful',
    description: 'Organic spring squash-and-stretch with cartoon physics.',
    icon: Sparkles,
    color: 'from-lime-500/20 to-emerald-500/10 text-lime-400'
  },
  {
    id: 'radial-swirl',
    name: 'Radial Whirlpool',
    tag: 'Swirl Bloom',
    category: 'Playful',
    description: 'Subtle 6-degree rotational bloom as screen settles into place.',
    icon: RotateCw,
    color: 'from-fuchsia-500/20 to-purple-500/10 text-fuchsia-400'
  },
  {
    id: 'curtain-drop',
    name: 'Theatrical Curtain Drop',
    tag: 'Stage Drop',
    category: 'Dynamic',
    description: 'Graceful top curtain roll-down with soft deceleration.',
    icon: Layers,
    color: 'from-yellow-500/20 to-amber-500/10 text-yellow-400'
  },
  {
    id: 'mirror-depth',
    name: 'Mirror Depth Tunnel',
    tag: 'Tunnel Parallax',
    category: 'Cinematic',
    description: 'Deep perspective zoom-out with parallax depth illusion.',
    icon: Film,
    color: 'from-blue-500/20 to-cyan-500/10 text-blue-400'
  },
  {
    id: 'camera-aperture',
    name: 'Camera Shutter Aperture',
    tag: 'Iris Shutter',
    category: 'Dynamic',
    description: 'Mechanical shutter aperture snap revealing content cleanly.',
    icon: Eye,
    color: 'from-red-500/20 to-pink-500/10 text-red-400'
  },
  {
    id: 'zen-minimal',
    name: 'Zen Minimal (Fast 0.16s)',
    tag: 'Ultra-Fast',
    category: 'Minimal',
    description: 'Instantaneous clean micro-fade for zero distraction and pure speed.',
    icon: Zap,
    color: 'from-slate-500/20 to-gray-500/10 text-slate-300'
  },
  {
    id: 'arcade-snap',
    name: 'Arcade Retro Snap',
    tag: 'Retro 8-Bit',
    category: 'Playful',
    description: 'Punchy geometric two-step snap with game-style precision.',
    icon: Sparkles,
    color: 'from-orange-500/20 to-amber-500/10 text-amber-400'
  }
];

// Motion Variants Generator for all 20 Transitions
export function getTransitionVariants(styleId, direction = 1) {
  switch (styleId) {
    case 'ios-parallax':
      return {
        initial: { x: direction > 0 ? 56 : -56, scale: 0.97, opacity: 0 },
        animate: { x: 0, scale: 1, opacity: 1, transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] } },
        exit: { x: direction > 0 ? -40 : 40, scale: 0.97, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }
      };

    case 'circular-reveal':
      return {
        initial: { clipPath: 'circle(0% at 50% 40%)', scale: 0.94, opacity: 0 },
        animate: { clipPath: 'circle(150% at 50% 40%)', scale: 1, opacity: 1, transition: { duration: 0.46, ease: [0.16, 1, 0.3, 1] } },
        exit: { clipPath: 'circle(0% at 50% 40%)', scale: 0.96, opacity: 0, transition: { duration: 0.22, ease: 'easeIn' } }
      };

    case 'zoom-bloom':
      return {
        initial: { scale: 0.88, opacity: 0, filter: 'blur(6px)' },
        animate: { scale: 1, opacity: 1, filter: 'blur(0px)', transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
        exit: { scale: 1.06, opacity: 0, filter: 'blur(4px)', transition: { duration: 0.2, ease: 'easeIn' } }
      };

    case 'fade-scale':
      return {
        initial: { scale: 0.95, opacity: 0 },
        animate: { scale: 1, opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } },
        exit: { scale: 0.97, opacity: 0, transition: { duration: 0.18, ease: 'easeIn' } }
      };

    case 'sheet-lift':
      return {
        initial: { y: 60, opacity: 0, borderRadius: '28px' },
        animate: { y: 0, opacity: 1, borderRadius: '0px', transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } },
        exit: { y: -30, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }
      };

    case 'horizontal-slide':
      return {
        initial: { x: direction > 0 ? '100%' : '-100%', opacity: 0.8 },
        animate: { x: 0, opacity: 1, transition: { duration: 0.3, ease: [0.25, 1, 0.5, 1] } },
        exit: { x: direction > 0 ? '-40%' : '40%', opacity: 0, transition: { duration: 0.22, ease: 'easeIn' } }
      };

    case 'vertical-elevator':
      return {
        initial: { y: direction > 0 ? 70 : -70, opacity: 0 },
        animate: { y: 0, opacity: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
        exit: { y: direction > 0 ? -50 : 50, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }
      };

    case '3d-flip':
      return {
        initial: { rotateY: direction > 0 ? 18 : -18, scale: 0.92, opacity: 0, transformPerspective: 1000 },
        animate: { rotateY: 0, scale: 1, opacity: 1, transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] } },
        exit: { rotateY: direction > 0 ? -18 : 18, scale: 0.94, opacity: 0, transition: { duration: 0.22, ease: 'easeIn' } }
      };

    case 'bouncy-pop':
      return {
        initial: { scale: 0.82, opacity: 0 },
        animate: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 420, damping: 18 } },
        exit: { scale: 0.92, opacity: 0, transition: { duration: 0.16 } }
      };

    case 'blur-dissolve':
      return {
        initial: { filter: 'blur(14px)', opacity: 0, scale: 0.96 },
        animate: { filter: 'blur(0px)', opacity: 1, scale: 1, transition: { duration: 0.34, ease: 'easeOut' } },
        exit: { filter: 'blur(10px)', opacity: 0, scale: 1.02, transition: { duration: 0.2, ease: 'easeIn' } }
      };

    case 'diagonal-sweep':
      return {
        initial: { x: direction > 0 ? 50 : -50, y: -40, opacity: 0, scale: 0.95 },
        animate: { x: 0, y: 0, opacity: 1, scale: 1, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
        exit: { x: direction > 0 ? -40 : 40, y: 30, opacity: 0, transition: { duration: 0.2 } }
      };

    case 'cyber-pulse':
      return {
        initial: { scale: 0.92, opacity: 0, filter: 'brightness(1.4)' },
        animate: { scale: 1, opacity: 1, filter: 'brightness(1)', transition: { duration: 0.26, ease: 'easeOut' } },
        exit: { scale: 0.96, opacity: 0, filter: 'brightness(0.7)', transition: { duration: 0.18 } }
      };

    case 'flip-x':
      return {
        initial: { rotateX: 18, opacity: 0, scale: 0.94, transformPerspective: 1000 },
        animate: { rotateX: 0, opacity: 1, scale: 1, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
        exit: { rotateX: -14, opacity: 0, scale: 0.96, transition: { duration: 0.2 } }
      };

    case 'elastic-squish':
      return {
        initial: { scaleX: 1.12, scaleY: 0.88, opacity: 0 },
        animate: { scaleX: 1, scaleY: 1, opacity: 1, transition: { type: 'spring', stiffness: 450, damping: 14 } },
        exit: { scaleX: 0.92, scaleY: 1.08, opacity: 0, transition: { duration: 0.16 } }
      };

    case 'radial-swirl':
      return {
        initial: { rotate: direction > 0 ? -7 : 7, scale: 0.92, opacity: 0 },
        animate: { rotate: 0, scale: 1, opacity: 1, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
        exit: { rotate: direction > 0 ? 5 : -5, scale: 0.95, opacity: 0, transition: { duration: 0.2 } }
      };

    case 'curtain-drop':
      return {
        initial: { y: -70, opacity: 0, scale: 0.97 },
        animate: { y: 0, opacity: 1, scale: 1, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
        exit: { y: 40, opacity: 0, transition: { duration: 0.2 } }
      };

    case 'mirror-depth':
      return {
        initial: { scale: 1.15, opacity: 0, filter: 'blur(6px)' },
        animate: { scale: 1, opacity: 1, filter: 'blur(0px)', transition: { duration: 0.34, ease: [0.16, 1, 0.3, 1] } },
        exit: { scale: 0.88, opacity: 0, filter: 'blur(6px)', transition: { duration: 0.2 } }
      };

    case 'camera-aperture':
      return {
        initial: { clipPath: 'circle(10% at 50% 50%)', opacity: 0 },
        animate: { clipPath: 'circle(120% at 50% 50%)', opacity: 1, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } },
        exit: { clipPath: 'circle(15% at 50% 50%)', opacity: 0, transition: { duration: 0.22 } }
      };

    case 'zen-minimal':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.16, ease: 'linear' } },
        exit: { opacity: 0, transition: { duration: 0.12, ease: 'linear' } }
      };

    case 'arcade-snap':
      return {
        initial: { scale: 0.85, y: 15, opacity: 0 },
        animate: { scale: 1, y: 0, opacity: 1, transition: { duration: 0.22, ease: [0, 0, 0.2, 1] } },
        exit: { scale: 0.92, y: -10, opacity: 0, transition: { duration: 0.15 } }
      };

    default:
      return {
        initial: { x: 40, opacity: 0 },
        animate: { x: 0, opacity: 1, transition: { duration: 0.28 } },
        exit: { x: -30, opacity: 0, transition: { duration: 0.18 } }
      };
  }
}

export default function TransitionStudioModal({
  open,
  onClose,
  currentStyle = 'ios-parallax',
  onSelectStyle,
  isDark
}) {
  const [selected, setSelected] = useState(currentStyle);
  const [previewTab, setPreviewTab] = useState('home');
  const [activeCategory, setActiveCategory] = useState('All');

  if (!open) return null;

  const categories = ['All', 'Native', 'Modern', 'Dynamic', 'Playful', 'Minimal', 'Cinematic'];

  const filteredStyles = activeCategory === 'All' 
    ? TRANSITION_STYLES 
    : TRANSITION_STYLES.filter(s => s.category === activeCategory);

  const handleApply = (styleId) => {
    setSelected(styleId);
    if (typeof onSelectStyle === 'function') {
      onSelectStyle(styleId);
    }
  };

  const currentTransitionObj = TRANSITION_STYLES.find(s => s.id === selected) || TRANSITION_STYLES[0];

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className={`w-full max-w-lg rounded-3xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${
          isDark 
            ? 'bg-[#14161F] border-white/10 text-white' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#EA4C2A]/15 border border-[#EA4C2A]/30 flex items-center justify-center text-[#EA4C2A]">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Screen Transition Studio</h3>
              <p className="text-[11px] text-slate-400">20 Handcrafted motion styles for FoodMaxx</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Interactive Live Preview Sandbox */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-[#10121A] border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Live Interactive Sandbox • {currentTransitionObj.name}
            </span>
            <span className="text-[10px] font-mono text-[#EA4C2A] bg-[#EA4C2A]/10 px-2 py-0.5 rounded-full font-bold">
              Tap Tabs to Preview ↘
            </span>
          </div>

          {/* Mini Sandbox Container */}
          <div className="relative h-28 rounded-2xl bg-white dark:bg-[#181B26] border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col justify-between p-3 shadow-inner">
            {/* Animated Tab View */}
            <AnimatePresence mode="wait">
              <motion.div
                key={previewTab}
                {...getTransitionVariants(selected, previewTab === 'home' ? -1 : 1)}
                className="flex items-center justify-between gap-3 h-full"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${currentTransitionObj.color} flex items-center justify-center text-lg shadow-sm shrink-0`}>
                    {previewTab === 'home' ? '🍔' : previewTab === 'orders' ? '🛵' : '👤'}
                  </div>
                  <div>
                    <h5 className="font-black text-xs leading-tight">
                      {previewTab === 'home' ? 'Gourmet Kitchen' : previewTab === 'orders' ? 'Live Courier Tracking' : 'Chow Wallet & Profile'}
                    </h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {previewTab === 'home' ? 'Fast delivery • Fresh chow' : previewTab === 'orders' ? 'ETA: 18 mins • PIN 8421' : '₦12,500 balance'}
                    </p>
                  </div>
                </div>

                <span className="text-[9.5px] font-bold px-2 py-1 rounded-lg bg-[#EA4C2A] text-white shrink-0 shadow-xs">
                  Active
                </span>
              </motion.div>
            </AnimatePresence>

            {/* Sandbox Bottom Controls */}
            <div className="flex items-center justify-center gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
              {[
                { id: 'home', label: 'Home' },
                { id: 'orders', label: 'Orders' },
                { id: 'profile', label: 'Profile' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setPreviewTab(t.id)}
                  className={`px-3 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                    previewTab === t.id
                      ? 'bg-[#EA4C2A] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-100 dark:border-white/5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition-colors cursor-pointer ${
                activeCategory === cat
                  ? 'bg-[#EA4C2A] text-white'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 20 Transition Options List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-100 dark:divide-white/5">
          {filteredStyles.map((item, idx) => {
            const isCurrent = selected === item.id;
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                onClick={() => handleApply(item.id)}
                className={`pt-2.5 first:pt-0 rounded-2xl p-3 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  isCurrent 
                    ? (isDark ? 'bg-[#1F2332] border border-[#EA4C2A]/50 shadow-sm' : 'bg-orange-50/80 border border-orange-200')
                    : (isDark ? 'hover:bg-white/5 border border-transparent' : 'hover:bg-slate-50 border border-transparent')
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-tr ${item.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-slate-400 font-bold">#{String(idx + 1).padStart(2, '0')}</span>
                      <h4 className={`font-bold text-xs truncate ${isCurrent ? 'text-[#EA4C2A] dark:text-[#FF7752]' : ''}`}>
                        {item.name}
                      </h4>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 dark:bg-white/5 text-slate-400 shrink-0">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-normal">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {isCurrent ? (
                    <div className="w-6 h-6 rounded-full bg-[#EA4C2A] text-white flex items-center justify-center shadow-xs">
                      <Check size={13} strokeWidth={3.5} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApply(item.id);
                      }}
                      className="text-[11px] font-bold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      Use
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-[#10121A] flex items-center justify-between">
          <div className="text-xs">
            <span className="text-slate-400">Selected: </span>
            <span className="font-bold text-slate-900 dark:text-white">{currentTransitionObj.name}</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#EA4C2A] hover:bg-[#d93f1d] text-white font-bold text-xs shadow-md shadow-[#EA4C2A]/25 active:scale-95 transition-all cursor-pointer"
          >
            Apply & Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}

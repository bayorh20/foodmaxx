import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, Sparkles, Volume2, RotateCcw } from 'lucide-react';
import {
  NOTIFICATION_TONES,
  getSelectedToneId,
  setSelectedToneId,
  getToneVolumeMultiplier,
  setToneVolumeMultiplier,
  playToneById
} from '../services/soundEffects';

export default function NotificationToneModal({ isOpen, onClose, isDark, onToast }) {
  const [activeToneId, setActiveToneId] = useState(() => getSelectedToneId());
  const [playingToneId, setPlayingToneId] = useState(null);
  const [volume, setVolume] = useState(() => getToneVolumeMultiplier());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');

  useEffect(() => {
    if (isOpen) {
      setActiveToneId(getSelectedToneId());
      setVolume(getToneVolumeMultiplier());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = ['All', 'Kitchen & POS', 'Sirens & Horns', 'Bells & Chimes', 'Digital & Tech', 'Melodic & Musical'];

  const filteredTones = NOTIFICATION_TONES.filter(t => {
    const matchesCat = selectedCat === 'All' || t.category === selectedCat;
    const matchesSearch = !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleSelectTone = (tone) => {
    setActiveToneId(tone.id);
    setSelectedToneId(tone.id);
    playToneById(tone.id, volume);
    setPlayingToneId(tone.id);
    setTimeout(() => setPlayingToneId(null), 1200);
    if (onToast) onToast(`"${tone.name}" is now your active notification tone! 🎶`, 'success');
  };

  const handlePreviewTone = (tone, e) => {
    if (e) e.stopPropagation();
    playToneById(tone.id, volume);
    setPlayingToneId(tone.id);
    setTimeout(() => setPlayingToneId(null), 1200);
  };

  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    setToneVolumeMultiplier(newVol);
  };

  const activeToneObj = NOTIFICATION_TONES.find(t => t.id === activeToneId) || NOTIFICATION_TONES[0];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-[#14161C] border border-slate-850 shadow-2xl overflow-hidden text-white"
      >
        {/* Header Strip */}
        <div className="p-4 sm:p-5 border-b border-slate-850 flex items-center justify-between gap-3 shrink-0 bg-slate-900/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#EA4C2A]/15 border border-[#EA4C2A]/30 flex items-center justify-center text-xl shrink-0">
              🔊
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white truncate">Loud Notification Tones Studio</h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {NOTIFICATION_TONES.length} Tones
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">Select & audition extra-loud alerts synthesized for noisy kitchens & couriers</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Top Controls: Active Tone Pill & Volume Booster */}
        <div className="p-4 bg-[#181A22] border-b border-slate-850 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Currently Active Tone Display */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-slate-400 font-semibold">Active Tone:</span>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-750 text-xs font-bold text-emerald-400">
                <span>{activeToneObj?.emoji}</span>
                <span>{activeToneObj?.name}</span>
              </div>
            </div>

            {/* Volume Boost Slider */}
            <div className="flex items-center gap-2.5">
              <Volume2 size={16} className="text-[#EA4C2A] shrink-0" />
              <span className="text-xs text-slate-400 font-semibold shrink-0">Volume Boost:</span>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-24 sm:w-28 accent-[#EA4C2A] cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-white min-w-[36px]">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>

          {/* Search & Category Tabs */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tones (e.g. siren, bell, register, whistle)..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#EA4C2A]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCat(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCat === cat
                      ? 'bg-[#EA4C2A] text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable Tone Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredTones.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No notification tones match "{searchQuery}"
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredTones.map((tone) => {
                const isActive = activeToneId === tone.id;
                const isPlaying = playingToneId === tone.id;

                return (
                  <div
                    key={tone.id}
                    onClick={() => handleSelectTone(tone)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-[#1C202B] border-emerald-500/50 shadow-md shadow-emerald-950/40'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 transition-transform ${
                        isPlaying ? 'scale-120 animate-bounce' : ''
                      } ${isActive ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-slate-950'}`}>
                        {tone.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-xs text-white truncate">{tone.name}</h4>
                          {isActive && (
                            <span className="text-[9.5px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-md border border-emerald-500/20">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[10.5px] text-slate-400 line-clamp-1 mt-0.5">{tone.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Audition / Preview Button */}
                      <button
                        type="button"
                        onClick={(e) => handlePreviewTone(tone, e)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          isPlaying
                            ? 'bg-[#EA4C2A] text-white scale-105'
                            : 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700'
                        }`}
                        title="Listen to this tone"
                      >
                        <span>{isPlaying ? '🔊' : '▶️'}</span>
                        <span className="text-[11px]">{isPlaying ? 'Playing' : 'Listen'}</span>
                      </button>

                      {/* Select / Active Badge Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTone(tone);
                        }}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          isActive
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : 'bg-slate-950 hover:bg-slate-800 text-slate-500 hover:text-slate-300 border border-slate-800'
                        }`}
                        title={isActive ? 'Active Tone' : 'Set as Active Tone'}
                      >
                        <Check size={14} className={isActive ? 'stroke-[3]' : 'stroke-[1.5]'} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-slate-850 bg-slate-900/70 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              playToneById(activeToneId, volume);
              if (onToast) onToast(`Simulated Order Alert: "${activeToneObj?.name}" 🔔`, 'info');
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700"
          >
            <Sparkles size={13} className="text-amber-400" />
            <span>Test Order Alert Chime</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#EA4C2A] hover:bg-[#D43D1D] text-white text-xs font-bold shadow-md shadow-[#EA4C2A]/25 cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}

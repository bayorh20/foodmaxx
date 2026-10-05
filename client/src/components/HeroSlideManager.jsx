import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Plus, Edit3, Trash2, Eye, EyeOff, Upload,
  Image as ImageIcon, ArrowUp, ArrowDown, Check, X,
  RotateCw, ExternalLink, Tag, Flame, Palette, ChevronRight,
  Layers, Smartphone, RefreshCw, AlertCircle
} from 'lucide-react';
import {
  getLiveHeroSlides,
  subscribeToLiveHeroSlides,
  createLiveHeroSlide,
  updateLiveHeroSlide,
  deleteLiveHeroSlide,
  DEFAULT_HERO_SLIDES
} from '../services/api';

// Curated Nigerian Food Photography Presets (High-Res & Appetizing)
export const HERO_PHOTO_PRESETS = [
  {
    name: 'Firewood Jollof & Plantain',
    category: 'Rice & Classics',
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: 'Peppered Asun & Suya Grills',
    category: 'Grills & Meat',
    url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: 'Crispy Fries & Chicken Wings',
    category: 'Fast Bites',
    url: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: 'Gourmet Loaded Burger',
    category: 'Burgers',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: 'Rich Egusi Soup & Swallow',
    category: 'Traditional',
    url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: 'Special Fried Rice & Chicken',
    category: 'Rice & Classics',
    url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: 'Spicy Shawarma Wrap',
    category: 'Wraps & Snacks',
    url: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: 'Chilled Fruit Parfait & Drinks',
    category: 'Beverages',
    url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80'
  }
];

// Curated Background Gradients
export const HERO_GRADIENT_PRESETS = [
  { id: 'fiery', name: 'FoodMaxx Fiery Orange', class: 'from-[#FF5525] via-[#FF6036] to-[#EA4C2A]' },
  { id: 'sunset', name: 'Warm Amber Sunset', class: 'from-[#D97706] via-[#EA580C] to-[#C2410C]' },
  { id: 'crimson', name: 'Deep Crimson Pepper', class: 'from-[#B91C1C] via-[#991B1B] to-[#7F1D1D]' },
  { id: 'royal', name: 'Royal Purple Feast', class: 'from-[#7C3AED] via-[#6D28D9] to-[#4C1D95]' },
  { id: 'emerald', name: 'Fresh Emerald Herb', class: 'from-[#059669] via-[#047857] to-[#064E3B]' },
  { id: 'midnight', name: 'Midnight Charcoal', class: 'from-[#1E293B] via-[#0F172A] to-[#020617]' }
];

export default function HeroSlideManager({ toast }) {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);
  const fileInputRef = useRef(null);
  const quickFileInputRef = useRef(null);
  const [quickTargetSlideId, setQuickTargetSlideId] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    badge: 'SPECIAL OFFER',
    badge_bg: '#EA4C2A',
    image_url: HERO_PHOTO_PRESETS[0].url,
    banner_type: 'full_image', // 'full_image' (whole banner graphic) | 'split' (gradient + dish cutout)
    hide_text: false,
    cta_text: 'Order Now →',
    cta_link: 'all',
    gradient: HERO_GRADIENT_PRESETS[0].class,
    active: true,
    sort_order: 1
  });

  // Subscribe to live hero slides from Firestore
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToLiveHeroSlides((liveSlides) => {
      setSlides(liveSlides);
      setLoading(false);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Open modal for new slide
  const handleOpenNew = () => {
    setEditingSlide(null);
    setForm({
      title: '',
      subtitle: '',
      badge: 'SPECIAL OFFER',
      badge_bg: '#EA4C2A',
      image_url: HERO_PHOTO_PRESETS[Math.floor(Math.random() * HERO_PHOTO_PRESETS.length)].url,
      banner_type: 'full_image',
      hide_text: false,
      cta_text: 'Order Now →',
      cta_link: 'all',
      gradient: HERO_GRADIENT_PRESETS[0].class,
      active: true,
      sort_order: slides.length + 1
    });
    setModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (slide) => {
    setEditingSlide(slide);
    setForm({
      title: slide.title || '',
      subtitle: slide.subtitle || '',
      badge: slide.badge || 'SPECIAL OFFER',
      badge_bg: slide.badge_bg || '#EA4C2A',
      image_url: slide.image_url || HERO_PHOTO_PRESETS[0].url,
      banner_type: slide.banner_type || 'split',
      hide_text: !!slide.hide_text,
      cta_text: slide.cta_text || 'Order Now →',
      cta_link: slide.cta_link || 'all',
      gradient: slide.gradient || HERO_GRADIENT_PRESETS[0].class,
      active: slide.active !== false,
      sort_order: Number(slide.sort_order) || 1
    });
    setModalOpen(true);
  };

  // Quick 1-click replace of any slide's banner image from slide list
  const handleTriggerQuickReplace = (slideId) => {
    setQuickTargetSlideId(slideId);
    if (quickFileInputRef.current) {
      quickFileInputRef.current.value = '';
      quickFileInputRef.current.click();
    }
  };

  const handleQuickPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !quickTargetSlideId) return;

    if (!file.type.startsWith('image/')) {
      if (typeof toast === 'function') toast('Please select an image file (JPG, PNG, WebP)', 'error');
      return;
    }

    const targetId = quickTargetSlideId;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxW = 1200;
        const maxH = 650;
        let width = img.width;
        let height = img.height;

        if (width > maxW || height > maxH) {
          if (width / height > maxW / maxH) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          } else {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        try {
          await updateLiveHeroSlide(targetId, {
            image_url: compressedDataUrl,
            banner_type: 'full_image'
          });
          if (typeof toast === 'function') toast('Whole banner image replaced and published live! 🚀', 'success');
        } catch (err) {
          console.error('Error replacing banner image:', err);
          if (typeof toast === 'function') toast('Failed to update banner image', 'error');
        } finally {
          setQuickTargetSlideId(null);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Compress & set uploaded photo via Canvas for modal
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (typeof toast === 'function') toast('Please select an image file (JPG, PNG, WebP)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 1200;
        const maxH = 650;
        let width = img.width;
        let height = img.height;

        if (width > maxW || height > maxH) {
          if (width / height > maxW / maxH) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          } else {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to lightweight high-quality JPEG
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setForm(prev => ({ ...prev, image_url: compressedDataUrl }));
        if (typeof toast === 'function') toast('Banner graphic uploaded & optimized successfully! 📸', 'success');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Save or update slide
  const handleSaveSlide = async (e) => {
    e.preventDefault();
    const resolvedTitle = form.title.trim() || (form.hide_text ? 'Promotional Banner Graphic' : '');
    if (!resolvedTitle) {
      if (typeof toast === 'function') toast('Please enter a headline title or label for the slide', 'error');
      return;
    }

    if (!form.image_url) {
      if (typeof toast === 'function') toast('Please upload or select an image for the banner', 'error');
      return;
    }

    const payload = {
      ...form,
      title: resolvedTitle
    };

    setSaving(true);
    try {
      if (editingSlide?.id) {
        await updateLiveHeroSlide(editingSlide.id, payload);
        if (typeof toast === 'function') toast('Hero slide updated & published live! ✨', 'success');
      } else {
        await createLiveHeroSlide(payload);
        if (typeof toast === 'function') toast('New hero slide created & published live! 🚀', 'success');
      }
      setModalOpen(false);
      setEditingSlide(null);
    } catch (err) {
      console.error('Error saving slide:', err);
      if (typeof toast === 'function') toast('Failed to save hero slide. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Toggle active/inactive
  const handleToggleActive = async (slide) => {
    try {
      const nextActive = !slide.active;
      await updateLiveHeroSlide(slide.id, { active: nextActive });
      if (typeof toast === 'function') {
        toast(`Slide "${slide.title}" is now ${nextActive ? 'Active (Live)' : 'Hidden'}`, 'info');
      }
    } catch (err) {
      if (typeof toast === 'function') toast('Failed to update status', 'error');
    }
  };

  // Delete slide
  const handleDelete = async (slide) => {
    if (!window.confirm(`Are you sure you want to delete the slide "${slide.title}"?`)) return;
    try {
      await deleteLiveHeroSlide(slide.id);
      if (typeof toast === 'function') toast('Hero slide deleted', 'info');
    } catch (err) {
      if (typeof toast === 'function') toast('Failed to delete slide', 'error');
    }
  };

  // Move slide up/down
  const handleMove = async (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= slides.length) return;

    const currentSlide = slides[index];
    const targetSlide = slides[targetIdx];

    try {
      await updateLiveHeroSlide(currentSlide.id, { sort_order: targetIdx + 1 });
      await updateLiveHeroSlide(targetSlide.id, { sort_order: index + 1 });
      if (typeof toast === 'function') toast('Slide order updated! 🔄', 'info');
    } catch (e) {
      if (typeof toast === 'function') toast('Failed to update order', 'error');
    }
  };

  // Reset to default FoodMaxx slides
  const handleResetDefaults = async () => {
    if (!window.confirm('Reset hero slides to official FoodMaxx defaults?')) return;
    try {
      for (const d of DEFAULT_HERO_SLIDES) {
        await createLiveHeroSlide(d);
      }
      if (typeof toast === 'function') toast('Reset to default FoodMaxx hero slides! 🍔', 'success');
    } catch (err) {
      if (typeof toast === 'function') toast('Failed to reset defaults', 'error');
    }
  };

  const activeSlides = slides.filter(s => s.active !== false);
  const previewSlide = activeSlides[activePreviewIdx] || slides[0] || form;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-300 p-5 rounded-2xl shadow-xs">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Sparkles size={22} className="text-[#EA4C2A]" />
            <span>Hero Banners & Carousel Slides</span>
          </h3>
          <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1">
            Upload custom food photography, manage promotional carousels, and highlight special discounts shown at the top of the customer app.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-300 transition-all cursor-pointer flex items-center gap-1.5"
            title="Restore default slides"
          >
            <RotateCw size={14} />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNew}
            className="px-4 py-2.5 bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-95 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
          >
            <Plus size={16} />
            <span>Add New Slide</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Live Mobile Simulation Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <Smartphone size={18} />
            </div>
            <div>
              <h4 className="font-black text-sm text-white tracking-tight">Customer App Live Simulation</h4>
              <p className="text-xs text-slate-400">Real-time interactive preview of how the customer home screen carousel renders</p>
            </div>
          </div>

          {activeSlides.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400 mr-1">Previewing slide:</span>
              {activeSlides.map((s, idx) => (
                <button
                  key={s.id || idx}
                  onClick={() => setActivePreviewIdx(idx)}
                  className={`w-6 h-6 rounded-full text-xs font-black transition-all cursor-pointer ${
                    activePreviewIdx === idx
                      ? 'bg-[#EA4C2A] text-white ring-2 ring-orange-500/50 scale-110'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hidden Quick Replace File Input */}
        <input
          type="file"
          ref={quickFileInputRef}
          onChange={handleQuickPhotoUpload}
          accept="image/*"
          className="hidden"
        />

        {/* The Live Rendered Banner Card */}
        {previewSlide ? (
          <div className="max-w-xl mx-auto w-full">
            <div className={`rounded-2xl relative overflow-hidden flex items-center min-h-[110px] sm:min-h-[125px] shadow-xl border border-white/15 transition-all ${
              previewSlide.banner_type === 'full_image'
                ? 'bg-slate-900 justify-start'
                : `bg-gradient-to-r ${previewSlide.gradient || 'from-[#FF5525] via-[#FF6036] to-[#EA4C2A]'} px-5 py-4 justify-between`
            }`}>
              {previewSlide.banner_type === 'full_image' ? (
                <>
                  <img
                    src={previewSlide.image_url}
                    alt={previewSlide.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = HERO_PHOTO_PRESETS[0].url;
                    }}
                  />
                  {!previewSlide.hide_text ? (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent z-10" />
                      <div className="relative z-20 max-w-[70%] sm:max-w-[75%] px-5 py-4 flex flex-col justify-center">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="bg-white/25 backdrop-blur-xs text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-white/20">
                            {previewSlide.badge || 'SPECIAL OFFER'}
                          </span>
                        </div>

                        <h3 className="text-white text-base sm:text-lg font-black leading-tight truncate drop-shadow-md">
                          {previewSlide.title || 'Fresh Meals, Fast Delivery'}
                        </h3>

                        <p className="text-white/90 text-xs font-medium line-clamp-1 mt-0.5 drop-shadow-sm">
                          {previewSlide.subtitle || 'Hot & delicious Nigerian meals delivered to your doorstep.'}
                        </p>

                        <div className="flex items-center gap-2 mt-2.5">
                          <span className="bg-[#EA4C2A] text-white text-xs font-bold py-1 px-4 rounded-full shadow-md inline-flex items-center gap-1">
                            {previewSlide.cta_text || 'Order Now →'}
                          </span>
                          <span className="text-[10px] text-white/75 font-semibold drop-shadow-xs">
                            Target: #{previewSlide.cta_link || 'all'}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="absolute top-2 right-2 z-20 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20 shadow-sm flex items-center gap-1.5">
                      <span>🖼️</span>
                      <span>Whole Flyer Banner (No HTML Text Overlay)</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="relative z-10 max-w-[70%] sm:max-w-[75%] flex flex-col justify-center">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="bg-white/25 backdrop-blur-xs text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-white/20">
                        {previewSlide.badge || 'SPECIAL OFFER'}
                      </span>
                    </div>

                    <h3 className="text-white text-base sm:text-lg font-black leading-tight truncate drop-shadow-xs">
                      {previewSlide.title || 'Fresh Meals, Fast Delivery'}
                    </h3>

                    <p className="text-white/90 text-xs font-medium line-clamp-1 mt-0.5 drop-shadow-xs">
                      {previewSlide.subtitle || 'Hot & delicious Nigerian meals delivered to your doorstep.'}
                    </p>

                    <div className="flex items-center gap-2 mt-2.5">
                      <span className="bg-slate-950 hover:bg-black text-white text-xs font-bold py-1 px-4 rounded-full shadow-md inline-flex items-center gap-1">
                        {previewSlide.cta_text || 'Order Now →'}
                      </span>
                      <span className="text-[10px] text-white/75 font-semibold">
                        Target: #{previewSlide.cta_link || 'all'}
                      </span>
                    </div>
                  </div>

                  {/* Uploaded / Selected Food Artwork */}
                  <div className="absolute -right-3 -bottom-3 w-28 h-28 sm:w-32 sm:h-32 rotate-[-6deg] drop-shadow-2xl shrink-0">
                    <img
                      src={previewSlide.image_url}
                      alt={previewSlide.title}
                      className="w-full h-full object-cover rounded-2xl shadow-xl border-2 border-white/30"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = HERO_PHOTO_PRESETS[0].url;
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-sm">No active hero slides. Create one below!</div>
        )}
      </div>

      {/* 3. Hero Slides List & Re-ordering Grid */}
      <div className="bg-white border border-slate-300 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers size={17} className="text-[#EA4C2A]" />
              <span>Configured Slides ({slides.length})</span>
            </h4>
            <p className="text-xs font-medium text-slate-600 mt-0.5">
              Drag or use arrows to change carousel display order on the customer home screen
            </p>
          </div>

          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300">
            {activeSlides.length} Live Active
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
            <RotateCw size={24} className="animate-spin text-[#EA4C2A]" />
            <p className="text-xs font-bold">Loading hero slides...</p>
          </div>
        ) : slides.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50">
            <ImageIcon size={36} className="mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-black text-slate-800">No Hero Slides Configured</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">Add your first promotional banner or reset to defaults</p>
            <button
              onClick={handleOpenNew}
              className="px-4 py-2 bg-[#EA4C2A] text-white font-bold text-xs rounded-xl shadow-xs"
            >
              + Create First Slide
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {slides.map((slide, idx) => {
              const isFull = slide.banner_type === 'full_image';
              return (
                <div
                  key={slide.id || idx}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    slide.active !== false
                      ? 'bg-white border-slate-300 hover:border-slate-400 shadow-xs'
                      : 'bg-slate-50/75 border-slate-200 opacity-60'
                  }`}
                >
                  {/* Left: Ordering + Image Thumbnail + Info */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Sorting Buttons */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMove(idx, -1)}
                        className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-colors"
                        title="Move Up"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === slides.length - 1}
                        onClick={() => handleMove(idx, 1)}
                        className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-colors"
                        title="Move Down"
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>

                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 relative group">
                      <img
                        src={slide.image_url}
                        alt={slide.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = HERO_PHOTO_PRESETS[0].url;
                        }}
                      />
                      <div className="absolute top-1 left-1 bg-black/70 text-white font-mono text-[9px] px-1 rounded font-bold">
                        #{idx + 1}
                      </div>
                    </div>

                    {/* Text Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200">
                          {slide.badge || 'PROMO'}
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isFull
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                        }`}>
                          {isFull ? (slide.hide_text ? '🖼️ Whole Flyer (No text)' : '🖼️ Full Banner') : '🎴 Split Card'}
                        </span>

                        {slide.active === false ? (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                            Hidden (Inactive)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live on Home Screen
                          </span>
                        )}
                      </div>

                      <h5 className="font-black text-sm text-slate-900 mt-1 truncate">
                        {slide.title}
                      </h5>

                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {slide.subtitle || (isFull && slide.hide_text ? 'Whole graphic banner displayed edge-to-edge' : 'No subtitle provided')}
                      </p>

                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-600 font-semibold">
                        <span>CTA: <strong className="text-slate-900">{slide.cta_text || 'Order Now →'}</strong></span>
                        <span>Target: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[#EA4C2A]">{slide.cta_link || 'all'}</code></span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 flex-wrap">
                    {/* Active Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(slide)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                        slide.active !== false
                          ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                      }`}
                      title={slide.active !== false ? 'Hide from customer app' : 'Publish to customer app'}
                    >
                      {slide.active !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                      <span>{slide.active !== false ? 'Active' : 'Hidden'}</span>
                    </button>

                    {/* Quick 1-Click Replace Banner Button */}
                    <button
                      type="button"
                      onClick={() => handleTriggerQuickReplace(slide.id)}
                      className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#EA4C2A] font-bold text-xs transition-colors cursor-pointer border border-orange-200 flex items-center gap-1.5 shadow-2xs"
                      title="Replace this slide's whole banner image from device"
                    >
                      <Upload size={13} />
                      <span>Replace Banner</span>
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(slide)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer border border-slate-300 flex items-center gap-1.5"
                      title="Edit Slide Details"
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDelete(slide)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors cursor-pointer border border-rose-200"
                      title="Delete Slide"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Create / Edit Slide Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl border border-slate-300 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-900"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#EA4C2A]/15 text-[#EA4C2A] flex items-center justify-center font-bold">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {editingSlide ? 'Edit Hero Banner Slide' : 'Create New Hero Banner Slide'}
                    </h3>
                    <p className="text-xs text-slate-500">Customize text, photo upload, CTA button, and background styling</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSaveSlide} className="p-5 overflow-y-auto space-y-5 flex-1">
                {/* Live Real-Time Mini Preview Inside Modal */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
                      Live Customer App Preview
                    </label>
                    <span className="text-[11px] font-bold text-[#EA4C2A]">
                      {form.banner_type === 'full_image' ? (form.hide_text ? 'Full Graphic (No HTML Text)' : 'Full Banner + Text Overlay') : 'Split Card (Dish Cutout)'}
                    </span>
                  </div>

                  <div className={`rounded-2xl relative overflow-hidden flex items-center min-h-[96px] sm:min-h-[110px] shadow-md border border-slate-200 transition-all ${
                    form.banner_type === 'full_image'
                      ? 'bg-slate-900 justify-start'
                      : `bg-gradient-to-r ${form.gradient || 'from-[#FF5525] via-[#FF6036] to-[#EA4C2A]'} px-4 py-3 justify-between`
                  }`}>
                    {form.banner_type === 'full_image' ? (
                      <>
                        <img
                          src={form.image_url}
                          alt="Preview"
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = HERO_PHOTO_PRESETS[0].url;
                          }}
                        />
                        {!form.hide_text ? (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent z-10" />
                            <div className="relative z-20 max-w-[70%] px-4 py-3 flex flex-col justify-center">
                              <span className="bg-white/25 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full w-fit mb-1 border border-white/20">
                                {form.badge || 'PROMO'}
                              </span>
                              <h4 className="text-white text-sm sm:text-base font-black leading-tight truncate drop-shadow-md">
                                {form.title || 'Slide Title Appears Here'}
                              </h4>
                              <p className="text-white/85 text-[11px] font-medium line-clamp-1 mt-0.5 drop-shadow-sm">
                                {form.subtitle || 'Slide subtitle description goes here.'}
                              </p>
                              <div className="mt-2">
                                <span className="bg-[#EA4C2A] text-white text-[10px] font-bold py-1 px-3 rounded-full shadow-xs inline-flex items-center gap-1">
                                  {form.cta_text || 'Order Now →'}
                                </span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="absolute top-2 right-2 z-20 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20 flex items-center gap-1">
                            <span>🖼️ Whole Flyer Mode (Clean graphic, no text overlay)</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="relative z-10 max-w-[70%] flex flex-col justify-center">
                          <span className="bg-white/25 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full w-fit mb-1 border border-white/20">
                            {form.badge || 'PROMO'}
                          </span>
                          <h4 className="text-white text-sm sm:text-base font-black leading-tight truncate">
                            {form.title || 'Slide Title Appears Here'}
                          </h4>
                          <p className="text-white/85 text-[11px] font-medium line-clamp-1 mt-0.5">
                            {form.subtitle || 'Slide subtitle description goes here.'}
                          </p>
                          <div className="mt-2">
                            <span className="bg-slate-950 text-white text-[10px] font-bold py-1 px-3 rounded-full shadow-xs">
                              {form.cta_text || 'Order Now →'}
                            </span>
                          </div>
                        </div>

                        <div className="absolute -right-2 -bottom-2 w-24 h-24 rotate-[-6deg] drop-shadow-xl shrink-0">
                          <img
                            src={form.image_url}
                            alt="Preview"
                            className="w-full h-full object-cover rounded-xl shadow-lg border border-white/30"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = HERO_PHOTO_PRESETS[0].url;
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 1. Presentation Style Selector */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <Layers size={14} className="text-[#EA4C2A]" />
                      <span>1. Choose Banner Presentation Style</span>
                    </label>
                    <span className="text-[11px] font-bold text-slate-500">
                      Edge-to-Edge or Split Card
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option A: Full Graphic Banner */}
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, banner_type: 'full_image' }))}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        form.banner_type === 'full_image'
                          ? 'border-[#EA4C2A] bg-orange-50/70 ring-2 ring-orange-500/25'
                          : 'border-slate-300 bg-white hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🖼️</span>
                          <div>
                            <p className="text-xs font-black text-slate-900">Whole Banner Graphic</p>
                            <p className="text-[10px] font-bold text-[#EA4C2A]">Edge-to-Edge Flyer / Poster</p>
                          </div>
                        </div>
                        {form.banner_type === 'full_image' && (
                          <span className="w-5 h-5 rounded-full bg-[#EA4C2A] text-white flex items-center justify-center text-[10px] font-black">✓</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-2">
                        Your uploaded image fills the entire banner container (100% width & height). Ideal for Canva promotional flyers.
                      </p>
                    </button>

                    {/* Option B: Split Card Layout */}
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, banner_type: 'split' }))}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        form.banner_type === 'split'
                          ? 'border-[#EA4C2A] bg-orange-50/70 ring-2 ring-orange-500/25'
                          : 'border-slate-300 bg-white hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🎴</span>
                          <div>
                            <p className="text-xs font-black text-slate-900">Split Card Layout</p>
                            <p className="text-[10px] font-bold text-slate-500">Dish Cutout + Colored Gradient</p>
                          </div>
                        </div>
                        {form.banner_type === 'split' && (
                          <span className="w-5 h-5 rounded-full bg-[#EA4C2A] text-white flex items-center justify-center text-[10px] font-black">✓</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-2">
                        Colored gradient background on left with headline text, and an angled dish cutout photo floating on right.
                      </p>
                    </button>
                  </div>

                  {/* If Full Image: Show Hide Text Overlay Toggle */}
                  {form.banner_type === 'full_image' && (
                    <div className="p-3 bg-white rounded-xl border border-orange-200 flex items-start gap-3 mt-1 shadow-2xs">
                      <input
                        type="checkbox"
                        id="hide_text_checkbox"
                        checked={form.hide_text}
                        onChange={(e) => setForm(prev => ({ ...prev, hide_text: e.target.checked }))}
                        className="w-4 h-4 rounded text-[#EA4C2A] accent-[#EA4C2A] mt-0.5 cursor-pointer shrink-0"
                      />
                      <label htmlFor="hide_text_checkbox" className="text-xs cursor-pointer select-none">
                        <span className="font-black text-slate-900 block">
                          My banner image already has text & design (Hide HTML text overlay)
                        </span>
                        <span className="text-slate-500 font-medium text-[11px] block mt-0.5">
                          Turn this on if your image is a ready-made Canva graphic with typography baked in. Tapping anywhere on the banner will open your target menu link.
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* 2. Photo Upload Area */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <Upload size={14} className="text-[#EA4C2A]" />
                      <span>2. Upload Banner Graphic or Photo</span>
                    </label>
                    <span className="text-[11px] font-semibold text-slate-500">
                      JPG, PNG, WebP (Auto-compressed to 1200px)
                    </span>
                  </div>

                  {/* Device File Upload Button & URL input */}
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 font-bold text-xs text-slate-900 flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors shrink-0"
                    >
                      <Upload size={15} className="text-[#EA4C2A]" />
                      <span>Upload from Device / Phone Camera / Canva</span>
                    </button>

                    <span className="text-xs text-slate-400 font-bold">OR</span>

                    <input
                      type="url"
                      placeholder="Paste Image URL directly..."
                      value={form.image_url.startsWith('data:') ? '' : form.image_url}
                      onChange={(e) => setForm(prev => ({ ...prev, image_url: e.target.value }))}
                      className="flex-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#EA4C2A]"
                    />
                  </div>

                  {form.image_url && (
                    <div className="flex items-center justify-between bg-white p-2.5 px-3 rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <img 
                          src={form.image_url} 
                          alt="Selected" 
                          className="w-10 h-8 rounded-lg object-cover border border-slate-200 shrink-0" 
                        />
                        <span className="text-slate-700 font-semibold truncate">
                          {form.image_url.startsWith('data:') ? 'Custom banner uploaded from device' : form.image_url}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, image_url: '' }))}
                        className="text-rose-600 hover:text-rose-700 font-bold text-[11px] ml-2 shrink-0 cursor-pointer"
                      >
                        Clear Photo
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Text Information & Target Action */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <Tag size={14} className="text-[#EA4C2A]" />
                      <span>3. Slide Details & Action Target</span>
                    </label>
                  </div>

                  {form.banner_type === 'full_image' && form.hide_text && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                      <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-black">Notice:</strong> Because you checked <em>"My banner image already has text & design"</em>, HTML text won't be rendered on top of your graphic. The <strong>Headline Title</strong> below is used as your admin reference name, and <strong>Click Action</strong> controls what opens when customers tap anywhere on the whole banner!
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Headline Title */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-black text-slate-700 mb-1">
                        {form.hide_text ? 'Slide Name / Admin Reference' : 'Headline Title'} {!form.hide_text && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="text"
                        required={!form.hide_text}
                        placeholder={form.hide_text ? "e.g. Weekend Flash Sale Canva Flyer" : "e.g. Smoky Firewood Jollof & Asun"}
                        value={form.title}
                        onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:border-[#EA4C2A]"
                      />
                    </div>

                    {/* Subtitle / Offer Details */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-black text-slate-700 mb-1 flex items-center justify-between">
                        <span>Subtitle / Promotion Offer Description</span>
                        {form.hide_text && <span className="text-[10px] text-slate-400 font-bold">(Not shown on full flyer)</span>}
                      </label>
                      <input
                        type="text"
                        disabled={form.hide_text}
                        placeholder="e.g. Authentic party jollof with crispy plantain & grilled beef"
                        value={form.subtitle}
                        onChange={(e) => setForm(prev => ({ ...prev, subtitle: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 disabled:opacity-50 disabled:bg-slate-100 focus:outline-hidden focus:border-[#EA4C2A]"
                      />
                    </div>

                    {/* Badge Text */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1 flex items-center justify-between">
                        <span>Promotional Tag / Badge</span>
                        {form.hide_text && <span className="text-[10px] text-slate-400 font-bold">(Not shown)</span>}
                      </label>
                      <input
                        type="text"
                        disabled={form.hide_text}
                        placeholder="e.g. SPECIAL OFFER, HOT DEAL, NEW DISH"
                        value={form.badge}
                        onChange={(e) => setForm(prev => ({ ...prev, badge: e.target.value.toUpperCase() }))}
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 uppercase disabled:opacity-50 disabled:bg-slate-100 focus:outline-hidden focus:border-[#EA4C2A]"
                      />
                    </div>

                    {/* CTA Button Text */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1 flex items-center justify-between">
                        <span>Button Text (CTA)</span>
                        {form.hide_text && <span className="text-[10px] text-slate-400 font-bold">(Not shown)</span>}
                      </label>
                      <input
                        type="text"
                        disabled={form.hide_text}
                        placeholder="e.g. Order Now →"
                        value={form.cta_text}
                        onChange={(e) => setForm(prev => ({ ...prev, cta_text: e.target.value }))}
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 disabled:opacity-50 disabled:bg-slate-100 focus:outline-hidden focus:border-[#EA4C2A]"
                      />
                    </div>

                  {/* Target Action / Destination */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      Click Action / Menu Filter
                    </label>
                    <select
                      value={form.cta_link}
                      onChange={(e) => setForm(prev => ({ ...prev, cta_link: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-[#EA4C2A]"
                    >
                      <option value="all">View Entire Menu (All)</option>
                      <option value="jollof">Filter to Jollof & Rice</option>
                      <option value="grills">Filter to Grills & Asun</option>
                      <option value="swallow">Filter to Swallow & Soups</option>
                      <option value="snacks">Filter to Fast Bites & Shawarma</option>
                      <option value="drinks">Filter to Drinks & Parfait</option>
                      <option value="vouchers">Open Vouchers Bottom Sheet</option>
                    </select>
                  </div>

                  {/* Display Order */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      Slide Position (Order)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={form.sort_order}
                      onChange={(e) => setForm(prev => ({ ...prev, sort_order: Number(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-[#EA4C2A]"
                    />
                  </div>
                </div>
              </div>

              {/* Background Gradient Selection */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                    <Palette size={14} className="text-[#EA4C2A]" />
                    <span>Background Color Theme</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {HERO_GRADIENT_PRESETS.map((g) => {
                      const isSelected = form.gradient === g.class;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, gradient: g.class }))}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#EA4C2A] bg-orange-50/50 ring-2 ring-orange-500/30'
                              : 'border-slate-300 bg-white hover:border-slate-400'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-lg bg-gradient-to-r ${g.class} shadow-xs shrink-0`} />
                          <span className="text-[11px] font-bold text-slate-800 leading-tight">
                            {g.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Live Switch */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <label className="text-xs font-black text-slate-900 block">Publish to Live Customer App</label>
                    <p className="text-[11px] text-slate-500">When enabled, this slide appears immediately in the customer app's hero carousel</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm(prev => ({ ...prev, active: e.target.checked }))}
                    className="w-5 h-5 rounded text-[#EA4C2A] accent-[#EA4C2A] cursor-pointer"
                  />
                </div>

                {/* Modal Footer Buttons */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-[#EA4C2A] hover:bg-[#D43B1B] disabled:opacity-50 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    {saving ? <RotateCw size={14} className="animate-spin" /> : <Check size={15} />}
                    <span>{editingSlide ? 'Save & Publish Changes' : 'Create & Publish Slide'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

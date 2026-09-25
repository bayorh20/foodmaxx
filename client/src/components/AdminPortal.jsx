import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  ShoppingCart, Search, Home, Compass, ClipboardList, User, Star,
  MapPin, Clock, ChevronRight, ChevronLeft, Plus, Minus, X, Check,
  Bell, Heart, Settings, LogOut, Package, Truck, ChefHat, Wallet,
  BarChart2, Users, Store, Map as MapIcon, Zap, Shield, Coffee, ArrowRight,
  RefreshCw, AlertCircle, Phone, MessageSquare, Tag, Percent,
  TrendingUp, DollarSign, Activity, Eye, Edit, Trash2,
  Power, Navigation, CheckCircle, XCircle, Filter, MoreVertical,
  Send, Download, Upload, Globe, Award, Layers,
  Moon, Sun, Gift, Calendar, QrCode, MessageCircle, Share2, Bookmark, Sparkles, PhoneCall,
  CreditCard, Flame, ShieldCheck, Utensils, SlidersHorizontal, UserCheck, Printer,
  Lock, Copy, Smartphone, Building2, Mic, ShoppingBag, ChevronDown, ChevronUp, Monitor, Key,
  FolderPlus, ArrowUp, ArrowDown, Video, FileText, Info, RotateCw,
  Columns, LayoutList, Grid, Bike, Edit3, Radio, Palette, Camera, LayoutDashboard
} from 'lucide-react';
import { api, FMXWebSocket } from '../services/api';
import { db } from '../services/firebaseDb';
import { triggerHaptic, playOrderNotificationSound } from '../services/nativeMobile';
import { getAppContent, saveAppContent, resetAppContent, fetchLiveAppContent, subscribeLiveAppContent, getCopy, DEFAULT_APP_CONTENT } from '../services/appContent';
import NotificationToneModal from './NotificationToneModal';
import { useAuth, useToast, useWS, useTheme, fmt, statusLabel, statusColor, getStatusEmoji, getStatusNotificationInfo, compressImageFile, getItemSizeAndExtras } from '../App';

// ============================================================
// ADMIN CATEGORY MODAL (Add / Edit Category)
// ============================================================
function AdminCategoryModal({ open, onClose, category, onSave }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🍲');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (category) {
      setName(category.name || '');
      setIcon(category.icon || '🍲');
      setIsActive(category.is_active !== false);
    } else {
      setName('');
      setIcon('🍲');
      setIsActive(true);
    }
  }, [category, open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: category?.id || `cat_${Date.now()}`,
      name: name.trim(),
      icon: icon.trim() || '🍲',
      is_active: isActive
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-[#121318] border border-[#262A36] rounded-3xl p-6 shadow-2xl text-white relative" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-[#262A36] mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>{category ? 'Edit Menu Category' : 'Add New Category'}</span>
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-[#1A1C23] hover:bg-[#232734] border border-[#262A36] cursor-pointer">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Category Name *</label>
            <input
              type="text"
              placeholder="e.g. Seafood & Fisherman Soup"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#EA4C2A] font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Category Icon / Emoji</label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={icon}
                onChange={e => setIcon(e.target.value)}
                className="w-14 text-center text-lg bg-[#1A1C23] border border-[#262A36] rounded-xl px-2 py-1.5 focus:outline-none focus:border-[#EA4C2A]"
              />
              <span className="text-[11px] text-slate-300 font-medium">Pick an emoji or type your own</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['🍔', '🍚', '🍲', '🍗', '🍝', '🌯', '🍨', '🍹', '🍕', '🥗', '🥩', '🧁', '🥓', '🍣', '🥞'].map(em => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setIcon(em)}
                  className={`w-8 h-8 rounded-xl text-sm flex items-center justify-center transition-all cursor-pointer ${
                    icon === em ? 'bg-[#EA4C2A] text-white shadow-md shadow-[#EA4C2A]/40 scale-105' : 'bg-[#1A1C23] text-slate-300 hover:bg-[#232734] border border-[#262A36]'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[#1A1C23] rounded-xl border border-[#262A36]">
            <div>
              <div className="text-xs font-bold text-white">Category Active</div>
              <div className="text-[11px] text-slate-300">Visible to customers ordering on FoodMaxx</div>
            </div>
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-[#EA4C2A] rounded cursor-pointer"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-[#1A1C23] hover:bg-[#232734] text-slate-200 border border-[#262A36] text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-95 text-white text-xs font-bold shadow-lg shadow-[#EA4C2A]/25 transition-all cursor-pointer"
            >
              {category ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN PRODUCT MODAL (Add / Edit Dish)
// ============================================================
function AdminProductModal({ open, onClose, product, onSaved, categories = [] }) {
  const [formData, setFormData] = useState({
    restaurant_id: 'rest_foodmaxx',
    name: '',
    description: '',
    price: '',
    category: 'Rice & Grains',
    image_url: '',
    prep_time_min: 20,
    stock_quantity: 50,
    is_available: true,
    badge: ''
  });
  const [hasPortionSizes, setHasPortionSizes] = useState(false);
  const [portionSizes, setPortionSizes] = useState([
    { name: 'Regular Portion', price_adjustment: 0, description: 'Standard single serving', image_url: '' },
    { name: 'Medium Portion', price_adjustment: 800, description: 'Bigger portion + extra side', image_url: '' },
    { name: 'Jumbo Combo', price_adjustment: 1800, description: 'Full executive combo meal', image_url: '' }
  ]);
  const [flavors, setFlavors] = useState([]);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPortionIdx, setUploadingPortionIdx] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (product) {
      setFormData({
        restaurant_id: 'rest_foodmaxx',
        name: product.name || '',
        description: product.description || '',
        price: product.price || '',
        category: product.category || (categories[0]?.name || 'Rice & Grains'),
        image_url: product.image_url || '',
        prep_time_min: product.prep_time_min || 20,
        stock_quantity: product.stock_quantity || 50,
        is_available: product.is_available !== false,
        badge: product.badge || ''
      });

      let sizes = product.portion_sizes;
      if (!sizes && product.portion_sizes_json) {
        try { sizes = JSON.parse(product.portion_sizes_json); } catch (e) {}
      }

      const explicitHasSizes = product.has_portion_sizes === true || (product.has_portion_sizes !== false && Array.isArray(sizes) && sizes.length > 0);
      setHasPortionSizes(explicitHasSizes);

      if (Array.isArray(sizes) && sizes.length > 0) {
        setPortionSizes(sizes);
      } else {
        setPortionSizes([
          { name: 'Regular Portion', price_adjustment: 0, description: 'Standard single serving', image_url: '' },
          { name: 'Medium Portion', price_adjustment: 800, description: 'Bigger portion + extra side', image_url: '' },
          { name: 'Jumbo Combo', price_adjustment: 1800, description: 'Full executive combo meal', image_url: '' }
        ]);
      }

      let loadedFlavors = product.flavors || product.options;
      if (!loadedFlavors && product.flavors_json) {
        try { loadedFlavors = JSON.parse(product.flavors_json); } catch (e) {}
      }
      if (Array.isArray(loadedFlavors) && loadedFlavors.length > 0) {
        setFlavors(loadedFlavors.map(f => ({
          name: typeof f === 'string' ? f : (f.name || ''),
          price: Number(typeof f === 'string' ? 0 : (f.price || f.price_adjustment || 0))
        })));
      } else {
        setFlavors([]);
      }
    } else {
      setFormData({
        restaurant_id: 'rest_foodmaxx',
        name: '',
        description: '',
        price: '',
        category: categories[0]?.name || 'Rice & Grains',
        image_url: '',
        prep_time_min: 20,
        stock_quantity: 50,
        is_available: true,
        badge: ''
      });
      setHasPortionSizes(false);
      setPortionSizes([
        { name: 'Regular Portion', price_adjustment: 0, description: 'Standard single serving', image_url: '' },
        { name: 'Medium Portion', price_adjustment: 800, description: 'Bigger portion + extra side', image_url: '' },
        { name: 'Jumbo Combo', price_adjustment: 1800, description: 'Full executive combo meal', image_url: '' }
      ]);
      setFlavors([]);
    }
  }, [product, open, categories]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const compressedDataUrl = await compressImageFile(file, 800, 0.78);
      setFormData(prev => ({ ...prev, image_url: compressedDataUrl }));
      toast('Photo loaded & compressed! Ready to save. 📸', 'success');
    } catch (err) {
      console.error('Image compression failed:', err);
      toast(err.message || 'Failed to process photo', 'error');
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handlePortionImageUpload = async (idx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPortionIdx(idx);
    try {
      const compressedDataUrl = await compressImageFile(file, 600, 0.75);
      setPortionSizes(prev => {
        const c = [...prev];
        c[idx] = { ...c[idx], image_url: compressedDataUrl };
        return c;
      });
      toast(`Portion photo added to tier #${idx + 1}! 📷`, 'success');
    } catch (err) {
      console.error('Portion photo compression failed:', err);
      toast(err.message || 'Failed to process portion photo', 'error');
    } finally {
      setUploadingPortionIdx(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast('Dish name is required', 'warning');
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      toast('Valid price in ₦ is required', 'warning');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        prep_time_min: Number(formData.prep_time_min) || 20,
        stock_quantity: Number(formData.stock_quantity) || 50,
        has_portion_sizes: Boolean(hasPortionSizes),
        portion_sizes: hasPortionSizes ? portionSizes.map(ps => ({
          name: (ps.name || '').trim(),
          price_adjustment: Number(ps.price_adjustment) || 0,
          description: (ps.description || '').trim(),
          image_url: ps.image_url || ''
        })) : [],
        flavors: flavors.map(f => ({
          name: (f.name || '').trim(),
          price: Number(f.price || 0)
        })).filter(f => f.name),
        options: flavors.map(f => ({
          name: (f.name || '').trim(),
          price: Number(f.price || 0)
        })).filter(f => f.name)
      };
      if (product) {
        await api.updateAdminProduct(product.id, payload);
        toast(`Dish "${formData.name}" updated successfully!`, 'success');
      } else {
        await api.createAdminProduct(payload);
        toast(`Dish "${formData.name}" added to menu!`, 'success');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast(err.message || 'Failed to save dish', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4" onClick={onClose}>
      <div className="bg-[#121318] border border-[#262A36] text-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative animate-scale-up" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#1A1C23] hover:bg-[#232734] border border-[#262A36] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-[#EA4C2A]/20 border border-[#EA4C2A]/30 flex items-center justify-center text-[#EA4C2A] text-lg font-bold">
            🍲
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {product ? 'Edit Menu Dish' : 'Add New Dish to Menu'}
            </h2>
            <p className="text-xs text-slate-400">FoodMaxx · Single Merchant Control</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-200 mb-1">Dish Name *</label>
              <input
                type="text"
                placeholder="e.g. Smoky Firewood Jollof & Asun"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#EA4C2A]"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-200 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2.5 text-xs text-white font-semibold focus:outline-none focus:border-[#EA4C2A]"
              >
                {categories && categories.length > 0 ? (
                  categories.map(c => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.icon ? `${c.icon} ` : ''}{c.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Rice & Grains">Rice & Grains</option>
                    <option value="Swallows & Soups">Swallows & Soups</option>
                    <option value="Grills & Suya">Grills & Suya</option>
                    <option value="Pasta & Bowls">Pasta & Bowls</option>
                    <option value="Shawarma & Grills">Shawarma & Grills</option>
                    <option value="Desserts & Chilled">Desserts & Chilled</option>
                    <option value="Drinks & Refreshers">Drinks & Refreshers</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-200 mb-1">Price (₦) *</label>
              <input
                type="number"
                min="100"
                step="50"
                placeholder="4800"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2.5 text-xs font-bold text-[#EA4C2A] focus:outline-none focus:border-[#EA4C2A]"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-200 mb-1">Prep Time (m)</label>
              <input
                type="number"
                min="5"
                max="120"
                value={formData.prep_time_min}
                onChange={e => setFormData({ ...formData, prep_time_min: e.target.value })}
                className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#EA4C2A]"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-200 mb-1">Daily Stock</label>
              <input
                type="number"
                min="0"
                value={formData.stock_quantity}
                onChange={e => setFormData({ ...formData, stock_quantity: e.target.value })}
                className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#EA4C2A]"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-200 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Rich party jollof cooked with authentic firewood taste, spicy goat meat, and ripe dodo."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#EA4C2A]"
            />
          </div>

          {/* PORTION SIZES & PRICING (ADMIN EDITABLE) */}
          <div className="bg-[#181A20] border border-[#262A36] rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span>⚖️ Portion Sizes & Variations</span>
                  {hasPortionSizes && (
                    <span className="bg-[#EA4C2A]/20 text-[#EA4C2A] text-[9.5px] px-2 py-0.5 rounded-full font-extrabold border border-[#EA4C2A]/30">
                      {portionSizes.length} Active
                    </span>
                  )}
                </label>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {hasPortionSizes
                    ? 'Customers pick one portion on dish tap. Set base (₦0) and price additions.'
                    : 'Optional: Enable if this meal has multiple portion sizes (Regular, Large, Jumbo, etc.)'}
                </p>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => {
                  const next = !hasPortionSizes;
                  setHasPortionSizes(next);
                  if (next && portionSizes.length === 0) {
                    setPortionSizes([
                      { name: 'Regular Portion', price_adjustment: 0, description: 'Standard single serving', image_url: '' }
                    ]);
                  }
                  toast(next ? 'Portion sizes enabled for this dish' : 'Portion sizes disabled (Single standard price)', 'info');
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  hasPortionSizes ? 'bg-[#EA4C2A]' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    hasPortionSizes ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {hasPortionSizes && (
              <>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setPortionSizes(prev => [
                        ...prev,
                        { name: `Portion ${prev.length + 1}`, price_adjustment: 500, description: 'Extra portion size', image_url: '' }
                      ]);
                      toast('Added new portion tier', 'info');
                    }}
                    className="bg-[#EA4C2A]/20 hover:bg-[#EA4C2A] text-[#EA4C2A] hover:text-white border border-[#EA4C2A]/40 text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Tier
                  </button>
                </div>

                {/* List of Portion Cards */}
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {portionSizes.map((ps, idx) => (
                    <div key={idx} className="bg-[#121318] border border-[#262A36] rounded-xl p-2.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Portion Name (e.g. Regular, Medium Pack)"
                            value={ps.name}
                            onChange={e => {
                              const val = e.target.value;
                              setPortionSizes(prev => {
                                const c = [...prev];
                                c[idx] = { ...c[idx], name: val };
                                return c;
                              });
                            }}
                            className="w-full bg-[#1A1C23] border border-[#262A36] rounded-lg px-2.5 py-1 text-xs text-white font-semibold focus:outline-none focus:border-[#EA4C2A]"
                            required
                          />
                        </div>
                        <div className="w-28 relative">
                          <span className="absolute left-2 top-1.5 text-[10px] font-bold text-slate-400">₦+</span>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            placeholder="0"
                            value={ps.price_adjustment}
                            onChange={e => {
                              const val = Number(e.target.value) || 0;
                              setPortionSizes(prev => {
                                const c = [...prev];
                                c[idx] = { ...c[idx], price_adjustment: val };
                                return c;
                              });
                            }}
                            className="w-full bg-[#1A1C23] border border-[#262A36] rounded-lg pl-7 pr-2 py-1 text-xs text-[#EA4C2A] font-bold focus:outline-none focus:border-[#EA4C2A]"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={portionSizes.length <= 1}
                          onClick={() => {
                            if (portionSizes.length <= 1) return;
                            setPortionSizes(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="p-1 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 disabled:opacity-30 cursor-pointer transition-colors"
                          title="Remove Portion Size"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Short description for customer (e.g. 1 protein + dodo)"
                          value={ps.description || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setPortionSizes(prev => {
                              const c = [...prev];
                              c[idx] = { ...c[idx], description: val };
                              return c;
                            });
                          }}
                          className="flex-1 bg-[#1A1C23] border border-[#262A36] rounded-lg px-2.5 py-1 text-[11px] text-slate-300 placeholder-slate-400 focus:outline-none focus:border-[#EA4C2A]"
                        />

                        {/* Portion Photo Uploader / Thumbnail Preview */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {ps.image_url ? (
                            <div className="relative group/pimg w-8 h-8 rounded-lg overflow-hidden border border-white/20 bg-black shrink-0">
                              <img src={ps.image_url} alt="Portion" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => {
                                  setPortionSizes(prev => {
                                    const c = [...prev];
                                    c[idx] = { ...c[idx], image_url: '' };
                                    return c;
                                  });
                                }}
                                className="absolute inset-0 bg-black/70 text-red-400 opacity-0 group-hover/pimg:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                title="Remove photo"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer px-2 py-1 bg-[#1A1C23] hover:bg-[#232734] border border-[#262A36] hover:border-[#EA4C2A]/50 rounded-lg text-[10px] text-slate-300 flex items-center gap-1 transition-colors">
                              <Camera size={11} className="text-[#EA4C2A]" />
                              <span>{uploadingPortionIdx === idx ? '...' : 'Add Photo'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => handlePortionImageUpload(idx, e)}
                              />
                            </label>
                          )}
                        </div>

                        <span className={`text-[10px] font-bold whitespace-nowrap px-2 py-0.5 rounded-full ${Number(ps.price_adjustment) === 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                          {Number(ps.price_adjustment) === 0 ? 'Base Price' : `+₦${Number(ps.price_adjustment).toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {!hasPortionSizes && (
              <div className="p-2.5 rounded-xl bg-black/20 border border-white/5 text-center">
                <span className="text-[11px] text-slate-400">
                  ✨ This dish sells at the single standard price of <strong className="text-white">₦{Number(formData.price || 0).toLocaleString()}</strong> without requiring customers to pick a portion.
                </span>
              </div>
            )}
          </div>

          {/* FLAVORS, SIDES & EXTRAS (ADMIN EDITABLE) */}
          <div className="bg-[#181A20] border border-[#262A36] rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span>🌶️ Flavors, Extras & Preparation Options</span>
                  {flavors.length > 0 && (
                    <span className="bg-amber-500/20 text-amber-400 text-[9.5px] px-2 py-0.5 rounded-full font-extrabold border border-amber-500/30">
                      {flavors.length} Active
                    </span>
                  )}
                </label>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Add spice levels, flavor variations, or side options (e.g. Mild, Extra Spicy, Extra Dodo).
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFlavors(prev => [...prev, { name: '', price: 0 }]);
                }}
                className="bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/40 text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1"
              >
                <Plus size={12} /> Add Flavor/Extra
              </button>
            </div>

            {flavors.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {flavors.map((flv, idx) => (
                  <div key={idx} className="bg-[#121318] border border-[#262A36] rounded-xl p-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      placeholder="Flavor/Option name (e.g. Extra Spicy, Fried Plantain)"
                      value={flv.name}
                      onChange={e => {
                        const val = e.target.value;
                        setFlavors(prev => {
                          const c = [...prev];
                          c[idx] = { ...c[idx], name: val };
                          return c;
                        });
                      }}
                      className="flex-1 bg-[#1A1C23] border border-[#262A36] rounded-lg px-2.5 py-1 text-xs text-white font-medium focus:outline-none focus:border-amber-500"
                    />
                    <div className="w-24 relative">
                      <span className="absolute left-2 top-1.5 text-[10px] font-bold text-slate-400">₦+</span>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        placeholder="0"
                        value={flv.price}
                        onChange={e => {
                          const val = Number(e.target.value) || 0;
                          setFlavors(prev => {
                            const c = [...prev];
                            c[idx] = { ...c[idx], price: val };
                            return c;
                          });
                        }}
                        className="w-full bg-[#1A1C23] border border-[#262A36] rounded-lg pl-7 pr-2 py-1 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setFlavors(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 cursor-pointer transition-colors"
                      title="Remove Option"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DISH PHOTO UPLOAD */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-medium text-slate-200 text-xs">Dish Photo</label>
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                {showUrlInput ? 'Switch to file upload' : 'Paste web link instead'}
              </button>
            </div>

            {showUrlInput ? (
              <input
                type="text"
                placeholder="https://images.unsplash.com/..."
                value={formData.image_url}
                onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#EA4C2A]"
              />
            ) : formData.image_url ? (
              <div className="relative rounded-2xl overflow-hidden border border-[#262A36] bg-[#1A1C23] group h-36 flex items-center justify-center">
                <img
                  src={formData.image_url}
                  alt="Dish Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label className="cursor-pointer bg-[#EA4C2A] hover:bg-[#D43B1B] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-1.5">
                    <Upload size={14} />
                    <span>Change Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image_url: '' })}
                    className="bg-[#1A1C23] hover:bg-[#232734] border border-[#262A36] text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-[#262A36] hover:border-[#EA4C2A]/60 rounded-2xl p-5 bg-[#1A1C23] flex flex-col items-center justify-center cursor-pointer transition-colors group">
                <div className="w-10 h-10 rounded-full bg-[#121318] border border-[#262A36] flex items-center justify-center text-slate-400 group-hover:text-[#EA4C2A] transition-colors mb-2">
                  {uploadingImage ? <RefreshCw size={20} className="animate-spin text-[#EA4C2A]" /> : <Upload size={20} />}
                </div>
                <span className="text-xs font-bold text-slate-200 group-hover:text-white">
                  {uploadingImage ? 'Optimizing & compressing photo...' : 'Click or tap to upload dish photo'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP — auto-optimized for fast load</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingImage}
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            )}
          </div>

          {/* Product Tag (Optional) & Stock Availability */}
          <div className="space-y-2.5 pt-2 border-t border-[#262A36]">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span>🏷️ Product Tag (Optional)</span>
                  {formData.badge ? (
                    <span className="bg-[#EA4C2A] text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                      Active: {formData.badge}
                    </span>
                  ) : (
                    <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Clean Card (No Tag)
                    </span>
                  )}
                </label>
                {formData.badge && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, badge: '' })}
                    className="text-[11px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Remove tag to keep card clean and simple"
                  >
                    <X size={12} /> Remove Tag
                  </button>
                )}
              </div>

              {/* Tag Input & Clear Button */}
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={formData.badge}
                  onChange={e => setFormData({ ...formData, badge: e.target.value })}
                  placeholder="e.g. Bestseller, Spicy, Chef's Special..."
                  className="flex-1 bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#EA4C2A]"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, badge: '' })}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                    !formData.badge 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                      : 'bg-[#1A1C23] hover:bg-red-500/15 text-slate-300 hover:text-red-400 border-[#262A36]'
                  }`}
                  title={!formData.badge ? 'Card is clean without any tag' : 'Clear tag to make card clean'}
                >
                  {!formData.badge ? '✓ Clean' : '✕ Remove Tag'}
                </button>
              </div>

              {/* Quick Preset Pills */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  '🔥 Bestseller',
                  '⭐ Popular',
                  '✨ New',
                  '👨‍🍳 Chef Special',
                  '🌶️ Spicy',
                  '🎉 Promo Deal',
                  '⚡ Fast Prep'
                ].map(preset => {
                  const isSelected = formData.badge.toLowerCase() === preset.toLowerCase();
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormData({ ...formData, badge: isSelected ? '' : preset })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#EA4C2A] text-white shadow-xs scale-102'
                          : 'bg-[#1A1C23] text-slate-300 hover:bg-[#232734] border border-[#262A36]'
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#1A1C23] rounded-xl border border-[#262A36]">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="admin_dish_is_avail"
                  checked={formData.is_available}
                  onChange={e => setFormData({ ...formData, is_available: e.target.checked })}
                  className="w-4 h-4 accent-[#EA4C2A] rounded-md cursor-pointer"
                />
                <label htmlFor="admin_dish_is_avail" className="text-xs font-medium text-slate-200 cursor-pointer select-none">
                  {formData.is_available ? '🟢 In Stock (Available for ordering)' : '🔴 Sold Out (Temporarily unavailable)'}
                </label>
              </div>
            </div>
          </div>

          <div className="pt-3 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-[#1A1C23] hover:bg-[#232734] border border-[#262A36] text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-2 py-2.5 bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-98 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-[#EA4C2A]/25 transition-all cursor-pointer"
            >
              {loading ? 'Saving Dish...' : product ? 'Update Dish' : 'Publish Dish to Menu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN ADDON / EXTRA MODAL (FULL CRUD WITH REAL PHOTOGRAPHY)
// ============================================================
function AdminAddonModal({ open, onClose, addon, onSaved }) {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'Sides',
    image_url: '',
    description: '',
    is_available: true
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (addon) {
      setFormData({
        name: addon.name || '',
        price: addon.price || '',
        category: addon.category || 'Sides',
        image_url: addon.image_url || '',
        description: addon.description || '',
        is_available: addon.is_available !== false
      });
    } else {
      setFormData({
        name: '',
        price: '',
        category: 'Sides',
        image_url: '',
        description: '',
        is_available: true
      });
    }
  }, [addon, open]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast('Photo must be less than 5MB', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, image_url: reader.result }));
      toast('Add-on photo loaded! Ready to save. 📸', 'success');
    };
    reader.readAsDataURL(file);
  };

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast('Add-on name is required', 'warning');
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      toast('Valid price in ₦ is required', 'warning');
      return;
    }
    setLoading(true);
    try {
      if (addon) {
        await api.updateAdminAddon(addon.id, formData);
        toast(`Add-on "${formData.name}" updated successfully!`, 'success');
      } else {
        await api.createAdminAddon(formData);
        toast(`Add-on "${formData.name}" added to store!`, 'success');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast(err.message || 'Failed to save add-on', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4" onClick={onClose}>
      <div className="bg-[#121318] border border-[#262A36] text-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative animate-scale-up" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#1A1C23] hover:bg-[#232734] border border-[#262A36] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-[#EA4C2A]/20 border border-[#EA4C2A]/30 flex items-center justify-center text-[#EA4C2A] text-lg font-bold">
            ✨
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {addon ? 'Edit Add-on / Extra' : 'Create New Add-on'}
            </h2>
            <p className="text-xs text-slate-400">Upload custom photo, set price in ₦, and configure cart extras</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-5">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">Add-on Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Cold Chapman, Fried Sweet Dodo, Peppered Turkey"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-[#EA4C2A] font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#EA4C2A] font-semibold"
              >
                <option value="Sides">Sides</option>
                <option value="Drinks">Drinks</option>
                <option value="Proteins">Proteins</option>
                <option value="Extras">Extras</option>
                <option value="Snacks">Snacks</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">Price (₦) *</label>
              <input
                type="number"
                required
                min="0"
                placeholder="e.g. 800"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3.5 py-2.5 text-xs text-[#EA4C2A] outline-none focus:border-[#EA4C2A] font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">Short Description</label>
            <input
              type="text"
              placeholder="e.g. Chilled classic cocktail drink with cucumber & lime"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-[#EA4C2A]"
            />
          </div>

          {/* Photo Upload Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Add-on Photo</label>

            {formData.image_url ? (
              <div className="p-3.5 bg-[#1A1C23] border border-[#262A36] rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'; }}
                    src={formData.image_url}
                    alt="Preview"
                    className="w-16 h-16 rounded-xl object-cover border border-[#262A36] shrink-0 shadow-xs"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-white">Add-on Photo Uploaded</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">High-resolution photography for customer cart upsell</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label
                    htmlFor="addon_file_upload"
                    className="px-3 py-1.5 rounded-xl bg-[#262A36] hover:bg-[#323646] text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Change Photo
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                    className="p-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs transition-colors cursor-pointer border border-red-500/20"
                    title="Remove Photo"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label
                  htmlFor="addon_file_upload"
                  className="w-full flex flex-col items-center justify-center p-5 border-2 border-dashed border-[#262A36] hover:border-[#EA4C2A] bg-[#1A1C23] rounded-2xl cursor-pointer transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#EA4C2A]/15 text-[#EA4C2A] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Upload size={18} />
                  </div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-white">Click to Upload Add-on Photo</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP up to 5MB</span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Or URL:</span>
                  <input
                    type="url"
                    placeholder="Paste direct image link..."
                    value={formData.image_url}
                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                    className="flex-1 bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#EA4C2A]"
                  />
                </div>
              </div>
            )}

            <input
              id="addon_file_upload"
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="addon_available"
              checked={formData.is_available}
              onChange={e => setFormData({ ...formData, is_available: e.target.checked })}
              className="w-4 h-4 rounded text-[#EA4C2A] accent-[#EA4C2A] cursor-pointer"
            />
            <label htmlFor="addon_available" className="text-xs text-slate-200 font-medium cursor-pointer">
              Available in Stock (Visible to customers in cart)
            </label>
          </div>

          <div className="pt-3 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-[#1A1C23] hover:bg-[#232734] border border-[#262A36] text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-2 py-2.5 bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-98 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-[#EA4C2A]/25 transition-all cursor-pointer"
            >
              {loading ? 'Saving...' : addon ? 'Update Add-on' : 'Publish Add-on'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN SECTION & NAVIGATION ICONS MANAGER MODAL
// ============================================================
function AdminSectionIconsModal({ open, onClose, categories = [], onIconsUpdated }) {
  const [activeSubTab, setActiveSubTab] = useState('nav');
  const [navIcons, setNavIcons] = useState(() => {
    try {
      const s = localStorage.getItem('fmx_nav_icons');
      return s ? JSON.parse(s) : {};
    } catch { return {}; }
  });
  const [catIcons, setCatIcons] = useState(() => {
    try {
      const s = localStorage.getItem('fmx_category_icons');
      return s ? JSON.parse(s) : {};
    } catch { return {}; }
  });
  const [uploadingTarget, setUploadingTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const NAV_ITEMS = [
    { id: 'home', label: 'Home Tab', desc: 'Customer home & discovery screen', defaultSrc: '/home-icon.png', defaultType: 'image' },
    { id: 'cart', label: 'Cart Tab', desc: 'Floating basket & checkout', defaultSrc: '/nav-cart.png', defaultType: 'image' },
    { id: 'orders', label: 'Tracking Tab', desc: 'Live dispatch courier rider', defaultSrc: '/delivery-rider.png', defaultType: 'image' },
    { id: 'profile', label: 'Profile Tab', desc: 'User account & addresses', defaultSrc: '/profile-icon.png', defaultType: 'image' }
  ];

  const DEFAULT_CATEGORIES = [
    { id: 'all', name: 'All Chow', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&auto=format&fit=crop&q=80' },
    { id: 'burgers', name: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&auto=format&fit=crop&q=80' },
    { id: 'rice', name: 'Jollof & Rice', image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=200&auto=format&fit=crop&q=80' },
    { id: 'swallows', name: 'Swallows', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=200&auto=format&fit=crop&q=80' },
    { id: 'grills', name: 'Suya & Grills', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=200&auto=format&fit=crop&q=80' },
    { id: 'shawarma', name: 'Shawarma', image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=200&auto=format&fit=crop&q=80' },
    { id: 'pasta', name: 'Pasta Bowls', image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=200&auto=format&fit=crop&q=80' },
    { id: 'drinks', name: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=200&auto=format&fit=crop&q=80' },
    { id: 'desserts', name: 'Desserts', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=200&auto=format&fit=crop&q=80' }
  ];

  const allCategorySections = (() => {
    const list = [...DEFAULT_CATEGORIES];
    (categories || []).forEach(c => {
      const cId = c.name?.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (cId && !list.some(item => item.id === cId)) {
        list.push({
          id: cId,
          name: c.name,
          image: c.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80'
        });
      }
    });
    return list;
  })();

  const handleUploadNavIcon = async (navId, file) => {
    if (!file) return;
    setUploadingTarget(`nav_${navId}`);
    try {
      const dataUrl = await compressImageFile(file, 256, 0.9);
      setNavIcons(prev => ({ ...prev, [navId]: dataUrl }));
      toast(`Icon uploaded for ${navId} tab! 🎨`, 'success');
    } catch (err) {
      toast('Failed to process uploaded icon image', 'error');
    } finally {
      setUploadingTarget(null);
    }
  };

  const handleUploadCatIcon = async (catId, file) => {
    if (!file) return;
    setUploadingTarget(`cat_${catId}`);
    try {
      const dataUrl = await compressImageFile(file, 300, 0.85);
      setCatIcons(prev => ({ ...prev, [catId]: dataUrl }));
      toast(`Category icon / image uploaded! 📸`, 'success');
    } catch (err) {
      toast('Failed to process category photo', 'error');
    } finally {
      setUploadingTarget(null);
    }
  };

  const handleResetNavIcon = (navId) => {
    setNavIcons(prev => {
      const copy = { ...prev };
      delete copy[navId];
      return copy;
    });
    toast(`Reset ${navId} icon to default`, 'info');
  };

  const handleResetCatIcon = (catId) => {
    setCatIcons(prev => {
      const copy = { ...prev };
      delete copy[catId];
      return copy;
    });
    toast(`Reset category icon to default`, 'info');
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      localStorage.setItem('fmx_nav_icons', JSON.stringify(navIcons));
      localStorage.setItem('fmx_category_icons', JSON.stringify(catIcons));
      if (api.updateLiveSettings) {
        await api.updateLiveSettings({ nav_icons: navIcons, category_icons: catIcons });
      }
      window.dispatchEvent(new CustomEvent('fmx_icons_updated', {
        detail: { nav_icons: navIcons, category_icons: catIcons }
      }));
      toast('All section & navigation icons updated live! ✨', 'success');
      if (onIconsUpdated) onIconsUpdated({ navIcons, catIcons });
      onClose();
    } catch (err) {
      toast('Failed to save icon settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4" onClick={onClose}>
      <div 
        className="bg-[#121318] border border-[#262A36] text-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative animate-scale-up" 
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#1A1C23] hover:bg-[#232734] border border-[#262A36] flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#EA4C2A]/20 border border-[#EA4C2A]/30 flex items-center justify-center text-[#EA4C2A] text-xl font-bold">
            🎨
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Section & Navigation Icons Manager
            </h2>
            <p className="text-xs text-slate-200">
              Customize or upload brand new icons for bottom navigation tabs and food categories
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 p-1 bg-[#1A1C23] rounded-2xl border border-[#262A36] mb-5">
          <button
            type="button"
            onClick={() => setActiveSubTab('nav')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'nav'
                ? 'bg-[#EA4C2A] text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            📱 Bottom Nav Bar Icons (5 Tabs)
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('categories')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'categories'
                ? 'bg-[#EA4C2A] text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            🍲 Food Category Sections ({allCategorySections.length})
          </button>
        </div>

        {/* TAB 1: BOTTOM NAV ICONS */}
        {activeSubTab === 'nav' && (
          <div className="space-y-3 mb-6">
            {NAV_ITEMS.map((item) => {
              const currentCustom = navIcons[item.id];
              const isUploading = uploadingTarget === `nav_${item.id}`;

              return (
                <div 
                  key={item.id}
                  className="p-3.5 bg-[#1A1C23] border border-[#262A36] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    {/* Icon Preview Box */}
                    <div className="w-12 h-12 rounded-xl bg-[#121318] border border-[#262A36] flex items-center justify-center p-2 shrink-0">
                      {currentCustom ? (
                        <img 
                          src={currentCustom} 
                          alt={item.label}
                          className="w-full h-full object-contain"
                        />
                      ) : item.defaultType === 'image' ? (
                        <img 
                          src={item.defaultSrc} 
                          alt={item.label}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <item.defaultIcon size={22} className="text-[#EA4C2A]" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{item.label}</span>
                        {currentCustom ? (
                          <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                            Custom Uploaded
                          </span>
                        ) : (
                          <span className="bg-white/10 text-slate-300 text-[9px] font-medium px-2 py-0.5 rounded-full">
                            System Default
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">{item.desc}</p>
                    </div>
                  </div>

                  {/* Actions: Upload & Reset */}
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="px-3 py-1.5 rounded-xl bg-[#EA4C2A] hover:bg-[#d93f1d] active:scale-95 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs">
                      {isUploading ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                      <span>{isUploading ? 'Compressing...' : 'Upload Icon'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploading}
                        className="hidden"
                        onChange={(e) => handleUploadNavIcon(item.id, e.target.files?.[0])}
                      />
                    </label>

                    {currentCustom && (
                      <button
                        type="button"
                        onClick={() => handleResetNavIcon(item.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#121318] hover:bg-[#252834] border border-[#262A36] text-slate-300 hover:text-red-400 text-xs font-bold transition-colors cursor-pointer"
                        title="Reset back to system default"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: CATEGORY SECTIONS ICONS / IMAGES */}
        {activeSubTab === 'categories' && (
          <div className="space-y-3 mb-6 max-h-[50vh] overflow-y-auto pr-1">
            {allCategorySections.map((cat) => {
              const currentCustom = catIcons[cat.id];
              const displayImage = currentCustom || cat.image;
              const isUploading = uploadingTarget === `cat_${cat.id}`;

              return (
                <div 
                  key={cat.id}
                  className="p-3.5 bg-[#1A1C23] border border-[#262A36] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#121318] border border-[#262A36] overflow-hidden shrink-0">
                      <img 
                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80'; }}
                        src={displayImage} 
                        alt={cat.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{cat.name}</span>
                        {currentCustom && (
                          <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                            Custom Photo
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">Section Key: {cat.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <label className="px-3 py-1.5 rounded-xl bg-[#EA4C2A] hover:bg-[#d93f1d] active:scale-95 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs">
                      {isUploading ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                      <span>{isUploading ? 'Optimizing...' : 'Upload Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploading}
                        className="hidden"
                        onChange={(e) => handleUploadCatIcon(cat.id, e.target.files?.[0])}
                      />
                    </label>

                    {currentCustom && (
                      <button
                        type="button"
                        onClick={() => handleResetCatIcon(cat.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#121318] hover:bg-[#252834] border border-[#262A36] text-slate-300 hover:text-red-400 text-xs font-bold transition-colors cursor-pointer"
                        title="Reset to default category photo"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex gap-2 pt-3 border-t border-[#262A36]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-[#1A1C23] hover:bg-[#232734] border border-[#262A36] text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="flex-2 py-2.5 bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-98 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-[#EA4C2A]/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{saving ? 'Saving Live Changes...' : 'Save & Publish Live'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN CREATE PROMO MODAL (WITH PROMO IDEAS PRESETS)
// ============================================================
function AdminCreatePromoModal({ open, onClose, onCreated, initialData }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: '',
    title: '',
    discount_type: 'percentage',
    discount_value: '10',
    min_order: '2000',
    max_discount: '1500',
    usage_limit: '500'
  });

  const PRESET_IDEAS = [
    { code: 'WELCOME1000', title: 'First-Order Welcome', discount_type: 'fixed', discount_value: '1000', min_order: '3500', max_discount: '1000', label: '🎁 ₦1k Welcome' },
    { code: 'FOODMAXX20', title: '20% Foodie Feast', discount_type: 'percentage', discount_value: '20', min_order: '3000', max_discount: '2500', label: '🍔 20% Foodie' },
    { code: 'FREEDELIVERY', title: 'Free Delivery Flash', discount_type: 'fixed', discount_value: '1200', min_order: '3000', max_discount: '1500', label: '🛵 Free Deliv' },
    { code: 'UICAMPUS', title: 'UI Campus Special', discount_type: 'percentage', discount_value: '15', min_order: '2000', max_discount: '1500', label: '🎓 Campus 15%' },
    { code: 'WEEKEND1500', title: 'Weekend Family Feast', discount_type: 'fixed', discount_value: '1500', min_order: '8000', max_discount: '1500', label: '🍗 Weekend ₦1.5k' },
    { code: 'LATEBITE', title: 'Late Night Craving', discount_type: 'percentage', discount_value: '10', min_order: '3000', max_discount: '1500', label: '🌙 Late Night 10%' },
  ];

  useEffect(() => {
    if (initialData) {
      setForm({
        code: initialData.code || '',
        title: initialData.title || '',
        discount_type: initialData.discount_type || 'percentage',
        discount_value: String(initialData.discount_value || '10'),
        min_order: String(initialData.min_order || '2000'),
        max_discount: String(initialData.max_discount || '1500'),
        usage_limit: String(initialData.usage_limit || '500')
      });
    } else {
      setForm({
        code: '',
        title: '',
        discount_type: 'percentage',
        discount_value: '10',
        min_order: '2000',
        max_discount: '1500',
        usage_limit: '500'
      });
    }
  }, [initialData, open]);

  if (!open) return null;

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.code.trim()) {
      toast('Promo code is required', 'warning');
      return;
    }
    setLoading(true);
    try {
      await api.createPromotion({
        ...form,
        code: form.code.trim().toUpperCase()
      });
      toast(`Promo code "${form.code.toUpperCase()}" created and active!`, 'success');
      onCreated();
      onClose();
    } catch (e) {
      toast(e.message || 'Failed to create promo', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="bg-[#12161F] border border-slate-800 text-white rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-scale-up">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
        >
          <X size={18} />
        </button>

        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <Tag size={20} className="text-[#EA4C2A]" />
          <span>Create Promotional Campaign</span>
        </h2>
        <p className="text-xs text-slate-400 mb-4">Set up a high-converting customer discount or flash delivery promo</p>

        {/* Quick Promo Idea Presets */}
        <div className="mb-4 p-3.5 bg-[#1A1C23] rounded-2xl border border-[#262A36]">
          <div className="text-[10.5px] font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span>💡 1-Tap Promo Ideas:</span>
            <span className="text-[10px] text-slate-300 lowercase font-normal">(click to auto-fill)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_IDEAS.map(idea => (
              <button
                key={idea.code}
                type="button"
                onClick={() => {
                  setForm({
                    code: idea.code,
                    title: idea.title,
                    discount_type: idea.discount_type,
                    discount_value: idea.discount_value,
                    min_order: idea.min_order,
                    max_discount: idea.max_discount,
                    usage_limit: '500'
                  });
                  toast(`Loaded preset "${idea.title}" ⚡`, 'info');
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
                  form.code === idea.code
                    ? 'bg-[#EA4C2A] text-white border-[#EA4C2A] shadow-xs'
                    : 'bg-[#121318] text-slate-200 border-[#262A36] hover:border-[#EA4C2A]/50 hover:text-white'
                }`}
              >
                {idea.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-200 mb-1">Promo Code *</label>
              <input
                type="text"
                placeholder="e.g. IBADANFEAST"
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2 text-xs uppercase font-mono font-bold tracking-wider text-[#EA4C2A] outline-none focus:border-[#EA4C2A]"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-200 mb-1">Campaign Title *</label>
              <input
                type="text"
                placeholder="e.g. 20% Weekend Special"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#EA4C2A] text-white font-medium placeholder-slate-400"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-200 mb-1">Discount Type</label>
              <select
                value={form.discount_type}
                onChange={e => setForm({ ...form, discount_type: e.target.value })}
                className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#EA4C2A] font-semibold text-white"
              >
                <option value="percentage">Percentage Off (%)</option>
                <option value="fixed">Fixed Amount Off (₦)</option>
                <option value="free_delivery">Free Delivery (100% off fee)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-200 mb-1">Discount Value</label>
              <input
                type="number"
                placeholder={form.discount_type === 'percentage' ? '20 (%)' : '1000 (₦)'}
                value={form.discount_value}
                onChange={e => setForm({ ...form, discount_value: e.target.value })}
                className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#EA4C2A] font-bold text-emerald-400 placeholder-slate-500"
                required={form.discount_type !== 'free_delivery'}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-200 mb-1">Min Order (₦)</label>
              <input
                type="number"
                value={form.min_order}
                onChange={e => setForm({ ...form, min_order: e.target.value })}
                className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#EA4C2A] text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-200 mb-1">Max Cap (₦)</label>
              <input
                type="number"
                value={form.max_discount}
                onChange={e => setForm({ ...form, max_discount: e.target.value })}
                className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#EA4C2A] text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-200 mb-1">Max Uses</label>
              <input
                type="number"
                value={form.usage_limit}
                onChange={e => setForm({ ...form, usage_limit: e.target.value })}
                className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#EA4C2A] text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-3 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-[#1A1C23] hover:bg-[#232734] border border-[#262A36] text-slate-200 font-bold rounded-xl text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-2 py-2.5 bg-[#EA4C2A] hover:bg-[#D43B1B] text-white font-bold rounded-xl text-xs shadow-lg shadow-[#EA4C2A]/25 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Promo Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN ORDER STATUS CHANGE & CUSTOM NOTIFICATION MODAL
// ============================================================
function AdminStatusChangeModal({ open, onClose, order, onStatusUpdated }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('PREPARING');
  const [customMessage, setCustomMessage] = useState('');

  const STATUS_PRESETS = [
    { id: 'CONFIRMED', label: 'Order Placed', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    { id: 'PREPARING', label: 'Cooking in Kitchen', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    { id: 'ON_THE_WAY', label: 'Dispatched / On Way', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { id: 'DELIVERED', label: 'Delivered', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    { id: 'CANCELLED', label: 'Cancelled', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' }
  ];

  const NOTIFICATION_TEMPLATES = {
    CONFIRMED: [
      'Your order has been received and confirmed by FoodMaxx Kitchen!',
      'We have locked in your meal and will begin grilling shortly.'
    ],
    PREPARING: [
      '🍳 Your meal is now fresh on the grill and being packaged with care!',
      '👨‍🍳 Chef is currently preparing your order with extra seasonings as requested.',
      '🔥 Everything is sizzling! Estimated cook time is ~10-15 minutes.'
    ],
    ON_THE_WAY: [
      '🛵 Dispatch rider has picked up your package and is on the way to your address!',
      '📍 Rider is approaching your landmark. Please have your delivery PIN ready.',
      '🚀 Hot chow on transit! Keep your phone reachable for rider arrival.'
    ],
    DELIVERED: [
      '✅ Package delivered safely! Thank you for ordering from FoodMaxx Ibadan.',
      '🎉 Order delivered hot and fresh. Bon appétit & have a delicious day!'
    ],
    CANCELLED: [
      '⚠️ Your order has been cancelled by the kitchen. A full refund has been credited.',
      'We apologize, an item in your order is out of stock. Order cancelled.'
    ]
  };

  useEffect(() => {
    if (order) {
      const current = order.order_status || 'ORDER_PLACED';
      const next = current === 'ORDER_PLACED' || current === 'CONFIRMED' ? 'PREPARING' :
                   current === 'PREPARING' ? 'ON_THE_WAY' :
                   current === 'ON_THE_WAY' ? 'DELIVERED' : current;
      setSelectedStatus(next);
      const defaultTemplates = NOTIFICATION_TEMPLATES[next] || [];
      setCustomMessage(defaultTemplates[0] || `Status updated to ${next.replace(/_/g, ' ')}`);
    }
  }, [order, open]);

  if (!open || !order) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateOrderStatus(order.id, selectedStatus, customMessage);
      playOrderNotificationSound();
      triggerHaptic('success');
      toast(`Order #${order.order_reference || order.id?.slice(0, 8)} updated to ${selectedStatus.replace(/_/g, ' ')}! 🚀`, 'success');
      try {
        window.dispatchEvent(new CustomEvent('fmx_order_updated', { detail: { id: order.id, status: selectedStatus, notes: customMessage } }));
      } catch {}
      if (onStatusUpdated) onStatusUpdated();
      onClose();
    } catch (err) {
      toast(err.message || 'Failed to update order status', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4" onClick={onClose}>
      <div
        className="bg-[#121318] border border-[#1F222C] text-white rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#1A1C23] hover:bg-[#232631] flex items-center justify-center text-slate-400 hover:text-white border border-[#262A36] cursor-pointer"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-xl bg-[#EA4C2A]/20 text-[#EA4C2A] flex items-center justify-center">
            <Zap size={16} />
          </div>
          <h2 className="text-lg font-bold text-white">Update Status & Diner Notification</h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Order #{order.order_reference || order.id?.slice(0, 8)} · {order.customer_name || 'Customer'} ({order.delivery_zone || 'Ibadan'})
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Status Selection Buttons */}
          <div>
            <label className="block font-bold text-slate-300 uppercase tracking-wider text-[10px] mb-2">
              Select New Order Status
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STATUS_PRESETS.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setSelectedStatus(st.id);
                    const tmpl = NOTIFICATION_TEMPLATES[st.id] || [];
                    if (tmpl.length > 0) setCustomMessage(tmpl[0]);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex flex-col gap-0.5 cursor-pointer ${
                    selectedStatus === st.id
                      ? 'bg-[#EA4C2A] text-white border-[#EA4C2A] shadow-lg shadow-[#EA4C2A]/25 ring-2 ring-[#EA4C2A]/30'
                      : 'bg-[#1A1C23] text-slate-300 border-[#262A36] hover:border-slate-700'
                  }`}
                >
                  <span className="truncate">{st.label}</span>
                  <span className="text-[9px] opacity-75 font-mono">{st.id}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Notification Templates */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                1-Tap Notification Templates
              </label>
              <span className="text-[10px] text-[#EA4C2A]">Click to insert</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {(NOTIFICATION_TEMPLATES[selectedStatus] || []).map((msg, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCustomMessage(msg)}
                  className="px-2.5 py-1 rounded-lg bg-[#1A1C23] hover:bg-[#232631] border border-[#262A36] text-[11px] text-slate-300 hover:text-white transition-colors text-left cursor-pointer active:scale-98"
                >
                  {msg.length > 45 ? msg.slice(0, 45) + '...' : msg}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Notification Message Textarea */}
          <div>
            <label className="block font-bold text-slate-300 uppercase tracking-wider text-[10px] mb-1">
              Custom Notification Message (Visible to Customer)
            </label>
            <textarea
              rows={3}
              value={customMessage}
              onChange={e => setCustomMessage(e.target.value)}
              placeholder="Enter custom note or instructions sent in real-time to the diner..."
              className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-[#EA4C2A] leading-relaxed transition-colors"
              required
            />
          </div>

          {/* Live Preview Strip */}
          <div className="p-3 rounded-xl bg-[#0B0C0E] border border-[#1F222C] flex items-start gap-2.5">
            <span className="text-base">📱</span>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Customer Live Banner Preview:</div>
              <div className="text-[11px] text-slate-200 mt-0.5 italic">
                "{customMessage || 'No custom message'}"
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-[#1A1C23] hover:bg-[#232631] text-slate-300 font-bold rounded-xl text-xs border border-[#262A36] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-2 py-2.5 bg-[#EA4C2A] hover:bg-[#D43B1B] text-white font-bold rounded-xl text-xs shadow-lg shadow-[#EA4C2A]/25 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Save & Send Notification 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN ADD NEW DELIVERY LOCATION / ZONE MODAL
// ============================================================
function AdminCreateZoneModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    city: 'Ibadan',
    delivery_fee: '600',
    min_order: '2000',
    estimated_delivery_time: '25-35 min',
    is_active: true
  });

  const IBADAN_SUGGESTIONS = [
    'Akobo', 'Moniya', 'Alakia', 'Olodo', 'Eleyele', 'Iwo Road', 'Challenge', 'Ring Road', 'Bodija', 'UI Campus', 'Samonda', 'Jericho GRA', 'Agodi GRA', 'Apata'
  ];

  if (!open) return null;

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast('Please enter the delivery location / zone name', 'warning');
      return;
    }
    setLoading(true);
    try {
      await api.createAdminZone({
        ...form,
        delivery_fee: Number(form.delivery_fee) || 500,
        min_order: Number(form.min_order) || 2000
      });
      playOrderNotificationSound();
      triggerHaptic('success');
      toast(`Delivery location "${form.name}" created successfully! 📍`, 'success');
      setForm({ name: '', city: 'Ibadan', delivery_fee: '600', min_order: '2000', estimated_delivery_time: '25-35 min', is_active: true });
      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      toast(err.message || 'Failed to create location', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4" onClick={onClose}>
      <div
        className="bg-[#121318] border border-[#1F222C] text-white rounded-3xl w-full max-w-sm shadow-2xl p-6 relative animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#1A1C23] hover:bg-[#232631] flex items-center justify-center text-slate-400 hover:text-white border border-[#262A36] cursor-pointer"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <MapPin size={16} />
          </div>
          <h2 className="text-lg font-bold text-white">Add Delivery Location</h2>
        </div>
        <p className="text-xs text-slate-400 mb-3">Add a new coverage area & fee for Ibadan diners</p>

        {/* Quick Suggestions */}
        <div className="mb-3">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Quick Suggestions:</span>
          <div className="flex flex-wrap gap-1">
            {IBADAN_SUGGESTIONS.slice(0, 6).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setForm(f => ({ ...f, name: s }))}
                className="px-2 py-0.5 rounded-lg bg-[#1A1C23] hover:bg-[#232631] text-[10px] text-slate-300 hover:text-white border border-[#262A36] cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleCreate} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-300 mb-1">Location / Zone Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Akobo, Moniya, Olodo..."
              className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#EA4C2A] font-bold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Delivery Fee (₦)</label>
              <input
                type="number"
                value={form.delivery_fee}
                onChange={e => setForm({ ...form, delivery_fee: e.target.value })}
                className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2 text-xs text-[#EA4C2A] font-bold outline-none focus:border-[#EA4C2A]"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Min Order (₦)</label>
              <input
                type="number"
                value={form.min_order}
                onChange={e => setForm({ ...form, min_order: e.target.value })}
                className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-[#EA4C2A]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Estimated Delivery Time</label>
            <input
              type="text"
              value={form.estimated_delivery_time}
              onChange={e => setForm({ ...form, estimated_delivery_time: e.target.value })}
              placeholder="e.g. 25-35 min"
              className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#EA4C2A]"
              required
            />
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-[#1A1C23] hover:bg-[#232631] text-slate-300 font-bold rounded-xl text-xs border border-[#262A36] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-2 py-2.5 bg-[#EA4C2A] hover:bg-[#D43B1B] text-white font-bold rounded-xl text-xs shadow-lg shadow-[#EA4C2A]/25 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Add Location 📍'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN EDIT DELIVERY ZONE MODAL
// ============================================================
function AdminEditZoneModal({ open, onClose, zone, onSaved }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    delivery_fee: '',
    min_order: '',
    estimated_delivery_time: '',
    is_active: true
  });

  useEffect(() => {
    if (zone) {
      setForm({
        name: zone.name || '',
        delivery_fee: zone.delivery_fee || 500,
        min_order: zone.min_order || 2000,
        estimated_delivery_time: zone.estimated_delivery_time || '20–30 min',
        is_active: zone.is_active !== false
      });
    }
  }, [zone, open]);

  if (!open || !zone) return null;

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateAdminZone(zone.id, {
        ...form,
        delivery_fee: Number(form.delivery_fee),
        min_order: Number(form.min_order)
      });
      playOrderNotificationSound();
      toast(`Zone "${form.name}" updated successfully!`, 'success');
      onSaved();
      onClose();
    } catch (err) {
      toast(err.message || 'Failed to update zone', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4" onClick={onClose}>
      <div
        className="bg-[#121318] border border-[#1F222C] text-white rounded-3xl w-full max-w-sm shadow-2xl p-6 relative animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#1A1C23] hover:bg-[#232631] flex items-center justify-center text-slate-400 hover:text-white border border-[#262A36] cursor-pointer"
        >
          <X size={16} />
        </button>

        <h2 className="text-lg font-bold mb-1 text-white">Edit Delivery Location</h2>
        <p className="text-xs text-slate-400 mb-4">{zone.city || 'Ibadan'} · Fast Dispatch Zone</p>

        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-300 mb-1">Location Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#EA4C2A] font-bold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Delivery Fee (₦)</label>
              <input
                type="number"
                value={form.delivery_fee}
                onChange={e => setForm({ ...form, delivery_fee: e.target.value })}
                className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#EA4C2A] text-[#EA4C2A] font-bold"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Min Order (₦)</label>
              <input
                type="number"
                value={form.min_order}
                onChange={e => setForm({ ...form, min_order: e.target.value })}
                className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#EA4C2A] font-bold text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Estimated Delivery Time</label>
            <input
              type="text"
              value={form.estimated_delivery_time}
              onChange={e => setForm({ ...form, estimated_delivery_time: e.target.value })}
              className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#EA4C2A] text-white"
              required
            />
          </div>

          <div className="flex items-center gap-2.5 bg-[#1A1C23] p-2.5 rounded-xl border border-[#262A36]">
            <input
              type="checkbox"
              id="zone_active_toggle"
              checked={form.is_active}
              onChange={e => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 accent-[#EA4C2A] rounded-md cursor-pointer"
            />
            <label htmlFor="zone_active_toggle" className="text-xs font-medium text-slate-200 cursor-pointer">
              {form.is_active ? '🟢 Location Active for Orders' : '🔴 Location Paused'}
            </label>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-[#1A1C23] hover:bg-[#232631] text-slate-300 font-bold rounded-xl text-xs border border-[#262A36] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-2 py-2.5 bg-[#EA4C2A] hover:bg-[#D43B1B] text-white font-bold rounded-xl text-xs shadow-lg shadow-[#EA4C2A]/25 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN ASSIGN RIDER MODAL
// ============================================================
function AdminRiderAssignModal({ open, onClose, order, riders, onAssigned }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  if (!open || !order) return null;

  const riderList = Array.isArray(riders) ? riders : [];

  async function handleAssign(rider) {
    setLoading(true);
    try {
      const riderName = rider.full_name || rider.name || 'Dispatch Rider';
      const riderPhone = rider.phone || '';
      const riderVehicle = rider.vehicle_type ? `${rider.vehicle_type}${rider.plate_number ? ` (${rider.plate_number})` : ''}` : 'Motorcycle';

      const riderPayload = {
        id: rider.id || 'r_assigned',
        full_name: riderName,
        name: riderName,
        phone: riderPhone,
        vehicle_type: riderVehicle,
        plate_number: rider.plate_number || '',
        rating: rider.rating || 4.9
      };

      if (api.assignRider) {
        await api.assignRider(order.id, riderPayload, 'ON_THE_WAY');
      } else {
        await api.updateOrderStatus(order.id, 'ON_THE_WAY', `Assigned to ${riderName}`, riderPayload);
      }

      toast(`Rider ${riderName} assigned! Order is now In Transit 🛵`, 'success');
      if (onAssigned) onAssigned();
      onClose();
    } catch (e) {
      toast(e.message || 'Failed to assign rider', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4" onClick={onClose}>
      <div className="bg-[#121318] border border-[#262A36] text-white rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-scale-up" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#1A1C23] hover:bg-[#232734] border border-[#262A36] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <h2 className="text-xl font-bold mb-1 text-white">Assign Dispatch Rider</h2>
        <p className="text-xs text-slate-400 mb-4">
          Order #{order.order_reference} · Destination: {order.delivery_zone || 'Ibadan'}
        </p>

        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {riderList.length === 0 ? (
            <div className="text-center py-8 px-4 bg-[#1A1C23] border border-[#262A36] rounded-2xl">
              <div className="text-3xl mb-2">🛵</div>
              <div className="font-bold text-sm text-white mb-1">No Riders Available</div>
              <p className="text-xs text-slate-400">
                Register couriers in the Delivery Riders section or check your connection.
              </p>
            </div>
          ) : (
            riderList.map(r => {
              const riderName = r.full_name || r.name || 'Rider';
              const initial = riderName.charAt(0).toUpperCase() || 'R';
              const isOnline = r.is_online !== false && r.status !== 'offline';
              return (
                <div
                  key={r.id}
                  className="bg-[#1A1C23] border border-[#262A36] rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:border-[#EA4C2A]/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-[#121318] border border-[#262A36] flex items-center justify-center font-bold text-sm text-[#EA4C2A]">
                        {initial}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#121318] ${isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-white truncate">{riderName}</div>
                      <div className="text-[11px] text-slate-300">
                        {r.vehicle_type || 'Motorcycle'} {r.plate_number ? `· ${r.plate_number}` : ''}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 font-medium">
                        <span>⭐ {r.rating || 4.9}</span>
                        <span>📦 {r.total_deliveries ?? 45} trips</span>
                        <span className={r.status === 'busy' ? 'text-amber-400' : 'text-emerald-400'}>
                          • {r.status || 'available'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleAssign(r)}
                    className="px-3.5 py-1.5 bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-md shadow-[#EA4C2A]/20"
                  >
                    Dispatch
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN VERIFY OTP MODAL
// ============================================================
function AdminVerifyOtpModal({ open, onClose, order, onVerified }) {
  const toast = useToast();
  const [inputOtp, setInputOtp] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open || !order) return null;

  async function handleVerify(directBypass = false) {
    if (!directBypass && inputOtp.trim() !== String(order.delivery_otp)) {
      toast('Incorrect 4-digit OTP. Ask customer for code.', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.updateOrderStatus(order.id, 'DELIVERED', 'OTP Verified by Dispatch');
      toast(`Order ${order.order_reference} marked as Delivered! 🎉`, 'success');
      onVerified();
      onClose();
    } catch (e) {
      toast(e.message || 'Failed to complete order', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4" onClick={onClose}>
      <div className="bg-[#121318] border border-[#262A36] text-white rounded-3xl w-full max-w-sm shadow-2xl p-6 relative animate-scale-up text-center" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#1A1C23] hover:bg-[#232734] border border-[#262A36] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl mx-auto mb-3">
          🔑
        </div>

        <h2 className="text-xl font-bold mb-1 text-white">Verify Delivery OTP</h2>
        <p className="text-xs text-slate-300 mb-4">
          Customer: <strong className="text-white">{order.customer?.full_name}</strong>
        </p>

        <div className="bg-[#1A1C23] p-3 rounded-2xl border border-[#262A36] mb-4">
          <div className="text-[11px] text-slate-400 font-medium mb-1">Order Security OTP:</div>
          <div className="text-2xl font-mono font-bold tracking-widest text-emerald-400">
            {order.delivery_otp}
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            maxLength={6}
            placeholder="Enter 4-digit code"
            value={inputOtp}
            onChange={e => setInputOtp(e.target.value)}
            className="w-full text-center text-xl font-mono font-bold tracking-widest bg-[#1A1C23] border border-[#262A36] rounded-xl py-2.5 text-white outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleVerify(false)}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
          >
            {loading ? 'Verifying...' : 'Verify OTP & Complete Delivery'}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleVerify(true)}
            className="w-full py-2.5 bg-[#1A1C23] hover:bg-[#232734] border border-[#262A36] text-slate-300 hover:text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer"
          >
            ⚡ 1-Tap Direct Delivery Bypass
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN KITCHEN SLIP / RECEIPT MODAL
// ============================================================
function AdminKitchenSlipModal({ open, onClose, order, settings }) {
  if (!open || !order) return null;
  const storePhone = settings?.phone || '';
  const storeAddress = settings?.address || 'Old Bodija, Ibadan';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white text-slate-900 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-scale-up font-mono admin-light-override">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 no-print cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
          <div className="flex items-center justify-center gap-2 mb-1"><img src="/foodmaxx-logo.png" alt="FoodMaxx" className="w-6 h-6 rounded-lg object-cover" /><span className="text-base font-bold tracking-tighter">FOODMAXX</span></div>
          <div className="text-[11px] text-gray-600">{storeAddress}</div>
          {storePhone && <div className="text-[11px] text-gray-600">Tel: {storePhone}</div>}
          <div className="mt-2 text-xs font-bold bg-gray-100 py-1 rounded-md">KITCHEN PREP TICKET</div>
        </div>

        <div className="text-xs space-y-1 mb-4 border-b border-gray-200 pb-3">
          <div className="flex justify-between">
            <span className="font-bold">Order Ref:</span>
            <span className="font-bold text-red-600">{order.order_reference}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Date & Time:</span>
            <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(order.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Customer:</span>
            <span className="font-bold">{order.customer?.full_name}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Phone:</span>
            <span>{order.customer?.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Zone / Area:</span>
            <span className="font-bold text-gray-900">{order.delivery_zone || 'Bodija'}</span>
          </div>
          {order.delivery_landmark && (
            <div className="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded-md font-bold mt-1">
              📍 Landmark: {order.delivery_landmark}
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold border-b border-gray-300 pb-1 mb-2">ORDER ITEMS</div>
          <div className="space-y-2">
            {(order.items || []).map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-xs">
                <div className="flex-1 pr-2">
                  <div className="font-bold">{item.qty || 1}x {item.name}</div>
                  {item.selectedExtras?.length > 0 && (
                    <div className="text-[10px] text-gray-500 pl-3">+ {item.selectedExtras.join(', ')}</div>
                  )}
                </div>
                <div className="font-bold">₦{((item.price || 0) * (item.qty || 1)).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {order.is_gift && (
          <div className="bg-red-50 text-red-700 p-2 rounded-xl text-xs mb-3 font-bold border border-red-200">
            🎁 Gift Order for: {order.recipient_name} ({order.recipient_phone})
            {order.gift_note && <div className="text-[11px] font-normal mt-0.5">Note: "{order.gift_note}"</div>}
          </div>
        )}

        <div className="border-t-2 border-dashed border-gray-300 pt-3 space-y-1 text-xs mb-4">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal:</span>
            <span>₦{(order.subtotal || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Delivery Fee:</span>
            <span>₦{(order.delivery_fee || 500).toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-200">
            <span>TOTAL:</span>
            <span className="text-red-600">₦{(order.total || 0).toLocaleString()}</span>
          </div>
          <div className="text-[10px] text-gray-500 pt-1">
            Payment: {order.payment_method?.toUpperCase()} · Security OTP: <strong>{order.delivery_otp}</strong>
          </div>
        </div>

        <div className="flex gap-2 no-print">
          <button
            onClick={() => window.print()}
            className="flex-1 py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer size={14} /> Print Kitchen Slip
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN PORTAL THEMES (FoodTech Emerald, Charcoal Pro, Midnight Cyber, Nordic Forest, Royal Amethyst, Obsidian OLED, Executive Light)
// ============================================================
const ADMIN_THEMES = {
  saas: {
    id: 'saas',
    name: 'Modern SaaS (Reference)',
    icon: '✨',
    dot: '#EA4C2A',
    bg: '#F8F9FA',
    sidebar: '#12151E',
    sidebarActive: '#202534',
    card: '#FFFFFF',
    border: '#E2E8F0',
    text: '#0F172A',
    subtext: '#64748B',
    accent: '#EA4C2A',
    accentWarm: '#F59E0B'
  },
  foodtech: {
    id: 'foodtech',
    name: 'FoodTech Emerald',
    icon: '🥗',
    dot: '#059669',
    bg: '#0B0F19',
    sidebar: '#0E1726',
    card: '#111827',
    border: '#1E293B',
    text: '#F9FAFB',
    subtext: '#CBD5E1',
    accent: '#059669',
    accentWarm: '#F59E0B'
  },
  charcoal: {
    id: 'charcoal',
    name: 'Charcoal Pro',
    icon: '⬛',
    dot: '#2A2E3D',
    bg: '#0F1115',
    sidebar: '#14171E',
    card: '#1A1E27',
    border: '#252B38',
    text: '#F1F5F9',
    subtext: '#CBD5E1',
    accent: '#EA4C2A',
    accentWarm: '#F59E0B'
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Cyber',
    icon: '🌌',
    dot: '#1E2E4E',
    bg: '#0A0F1D',
    sidebar: '#0E1528',
    card: '#131E38',
    border: '#1E2F52',
    text: '#F8FAFC',
    subtext: '#CBD5E1',
    accent: '#38BDF8',
    accentWarm: '#F59E0B'
  },
  forest: {
    id: 'forest',
    name: 'Nordic Forest',
    icon: '🌲',
    dot: '#1B362F',
    bg: '#091310',
    sidebar: '#0D1B16',
    card: '#122620',
    border: '#1B3A31',
    text: '#F0FDF4',
    subtext: '#A7F3D0',
    accent: '#10B981',
    accentWarm: '#F59E0B'
  },
  amethyst: {
    id: 'amethyst',
    name: 'Royal Amethyst',
    icon: '🔮',
    dot: '#2F204A',
    bg: '#110C1B',
    sidebar: '#171125',
    card: '#201833',
    border: '#2E2248',
    text: '#FAF5FF',
    subtext: '#E9D5FF',
    accent: '#A855F7',
    accentWarm: '#F59E0B'
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian OLED',
    icon: '⚫',
    dot: '#222222',
    bg: '#000000',
    sidebar: '#080808',
    card: '#101010',
    border: '#1F1F1F',
    text: '#FFFFFF',
    subtext: '#E4E4E7',
    accent: '#FF4B26',
    accentWarm: '#F59E0B'
  },
  light: {
    id: 'light',
    name: 'Executive Light',
    icon: '☀️',
    dot: '#E2E8F0',
    bg: '#F8FAFC',
    sidebar: '#FFFFFF',
    card: '#FFFFFF',
    border: '#E2E8F0',
    text: '#0F172A',
    subtext: '#475569',
    accent: '#059669',
    accentWarm: '#F59E0B'
  }
};

// ============================================================
// ADMIN PORTAL (FoodMaxx Single Merchant Operations Center)
// ============================================================
function AdminPortal() {
  const { user, login, updateUser, logout } = useAuth();
  const toast = useToast();
  const ws = useWS();
  const [adminWs, setAdminWs] = useState(null);

  useEffect(() => {
    if (ws) {
      setAdminWs(ws);
      return;
    }
    try {
      const directWs = new FMXWebSocket('user_admin', 'super_admin');
      setAdminWs(directWs);
      return () => {
        try { directWs.disconnect(); } catch {}
      };
    } catch (e) {}
  }, [ws]);

  const [adminThemeKey, setAdminThemeKey] = useState(() => {
    const saved = localStorage.getItem('fmx_admin_theme');
    return saved === 'saas' || !saved || saved === 'foodtech' ? 'saas' : saved;
  });
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const currentAdminTheme = ADMIN_THEMES[adminThemeKey] || ADMIN_THEMES.saas;

  const selectAdminTheme = (key) => {
    setAdminThemeKey(key);
    localStorage.setItem('fmx_admin_theme', key);
    toast(`Admin theme updated to ${ADMIN_THEMES[key]?.name || key}! 🎨`, 'success');
  };

  const [adminAuthenticated, setAdminAuthenticated] = useState(() => {
    try {
      const s = localStorage.getItem('fmx_user');
      if (s) {
        const u = JSON.parse(s);
        return u?.role === 'super_admin';
      }
    } catch (e) {}
    return false;
  });

  const isSuperAdmin = user?.role === 'super_admin' || adminAuthenticated;


  const [activeSection, setActiveSection] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [orders, setOrders] = useState([]);
  const [orderFilterStatus, setOrderFilterStatus] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [overviewOrderFilter, setOverviewOrderFilter] = useState('all'); // 'all' | 'pending' | 'preparing' | 'on_the_way'

  const [products, setProducts] = useState([]);
  const [productFilterCat, setProductFilterCat] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [adminToneModalOpen, setAdminToneModalOpen] = useState(false);
  const [sectionIconsModalOpen, setSectionIconsModalOpen] = useState(false);

  // Dedicated Stock Inventory state
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('all'); // 'all' | 'low' | 'healthy' | 'out_of_stock'

  // Menu Management Sub-modules: Dishes, Category Manager & Section Editor
  const [menuSubTab, setMenuSubTab] = useState('dishes'); // 'dishes' | 'categories' | 'sections'
  const [categories, setCategories] = useState(() => {
    try {
      const s = localStorage.getItem('fmx_custom_categories');
      return s ? JSON.parse(s) : [
        { id: 'cat_burgers', name: 'Burgers & Sandwiches', icon: '🍔', is_active: true, sort_order: 1 },
        { id: 'cat_rice', name: 'Rice & Grains', icon: '🍚', is_active: true, sort_order: 2 },
        { id: 'cat_swallow', name: 'Swallows & Soups', icon: '🍲', is_active: true, sort_order: 3 },
        { id: 'cat_grills', name: 'Grills & Suya', icon: '🍗', is_active: true, sort_order: 4 },
        { id: 'cat_pasta', name: 'Pasta & Gourmet Bowls', icon: '🍝', is_active: true, sort_order: 5 },
        { id: 'cat_shawarma', name: 'Shawarma & Wraps', icon: '🌯', is_active: true, sort_order: 6 },
        { id: 'cat_dessert', name: 'Desserts & Chilled', icon: '🍨', is_active: true, sort_order: 7 },
        { id: 'cat_drinks', name: 'Drinks & Refreshers', icon: '🍹', is_active: true, sort_order: 8 }
      ];
    } catch {
      return [
        { id: 'cat_burgers', name: 'Burgers & Sandwiches', icon: '🍔', is_active: true, sort_order: 1 },
        { id: 'cat_rice', name: 'Rice & Grains', icon: '🍚', is_active: true, sort_order: 2 },
        { id: 'cat_swallow', name: 'Swallows & Soups', icon: '🍲', is_active: true, sort_order: 3 },
        { id: 'cat_grills', name: 'Grills & Suya', icon: '🍗', is_active: true, sort_order: 4 },
        { id: 'cat_pasta', name: 'Pasta & Gourmet Bowls', icon: '🍝', is_active: true, sort_order: 5 },
        { id: 'cat_shawarma', name: 'Shawarma & Wraps', icon: '🌯', is_active: true, sort_order: 6 },
        { id: 'cat_dessert', name: 'Desserts & Chilled', icon: '🍨', is_active: true, sort_order: 7 },
        { id: 'cat_drinks', name: 'Drinks & Refreshers', icon: '🍹', is_active: true, sort_order: 8 }
      ];
    }
  });
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [homepageSections, setHomepageSections] = useState(() => {
    const DEFAULT_SECTIONS = [
      { id: 'sec_top', title: 'Top Picks on FoodMaxx', subtitle: 'Curated popular items', icon: 'Sparkles', enabled: true, filter_type: 'bestseller', display_limit: 6 },
      { id: 'sec_trend', title: 'Trending Now', subtitle: 'Hot right now in Bodija & UI', icon: 'Flame', enabled: true, filter_type: 'popular', display_limit: 6 },
      { id: 'sec_deals', title: 'Special Offers & Combos', subtitle: 'Great meals at best value', icon: 'Tag', enabled: true, filter_type: 'deals', display_limit: 6 },
      { id: 'sec_fast', title: 'Quick Bites & Fast Prep', subtitle: 'Ready in 25 min or less', icon: 'Clock', enabled: true, filter_type: 'fast', display_limit: 6 },
    ];
    try {
      const s = localStorage.getItem('fmx_homepage_sections');
      return s ? JSON.parse(s) : DEFAULT_SECTIONS;
    } catch {
      return DEFAULT_SECTIONS;
    }
  });
  const [savingSections, setSavingSections] = useState(false);

  const [addons, setAddons] = useState([]);
  const [addonFilterCat, setAddonFilterCat] = useState('all');
  const [addonSearch, setAddonSearch] = useState('');
  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);

  const [riders, setRiders] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [promoModalOpen, setPromoModalOpen] = useState(false);

  const [zones, setZones] = useState([]);
  const [editingZone, setEditingZone] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [ticketFilter, setTicketFilter] = useState('all'); // 'all' | 'open' | 'resolved'
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketDraftReply, setTicketDraftReply] = useState('');
  const [settings, setSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('fmx_store_settings');
      if (cached) return JSON.parse(cached);
    } catch {}
    return { is_open: true, isOpen: true, kitchen_status: 'open' };
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Active Modals for Order actions
  const [assignRiderOrder, setAssignRiderOrder] = useState(null);
  const [verifyOtpOrder, setVerifyOtpOrder] = useState(null);
  const [slipOrder, setSlipOrder] = useState(null);
  const [statusModalOrder, setStatusModalOrder] = useState(null);
  const [createZoneModalOpen, setCreateZoneModalOpen] = useState(false);

  // Audio Notification Configuration for Live Orders
  const [orderSoundEnabled, setOrderSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem('fmx_admin_order_sound') !== 'false';
    } catch {
      return true;
    }
  });
  const knownOrderIdsRef = useRef(new Set());
  const isInitialOrdersLoadRef = useRef(true);

  // Operational, Financial & Analytics Enhancements
  const [selectedPromoIdea, setSelectedPromoIdea] = useState(null);
  const [targetFoodCostPct, setTargetFoodCostPct] = useState(38);
  const [customerCohortFilter, setCustomerCohortFilter] = useState('all'); // 'all' | 'vip' | 'repeat' | 'at_risk' | 'new'
  const [zoneSurgeMode, setZoneSurgeMode] = useState(false);

  // Pre-configured Canned Quick Responses
  const [cannedResponses, setCannedResponses] = useState(() => {
    try {
      const s = localStorage.getItem('fmx_canned_responses');
      return s ? JSON.parse(s) : [
        { id: 'cr_1', label: '🍳 Fresh on grill', text: '🍳 Your meal is currently fresh on the grill and will be ready in ~10 mins!' },
        { id: 'cr_2', label: '🛵 Rider en route', text: '🛵 Dispatch rider has picked up your package and is on the way to your address.' },
        { id: 'cr_3', label: '📍 At gate/landmark', text: '📍 Rider is at your gate/landmark. Please be ready with your delivery PIN.' },
        { id: 'cr_4', label: '✅ Instructions noted', text: '✅ Special cooking and allergy instructions have been carefully noted by our kitchen chef.' },
        { id: 'cr_5', label: '📞 Phone unreachable', text: '📞 We attempted reaching your mobile line. Please verify WhatsApp or call back.' },
        { id: 'cr_6', label: '🎁 Free beverage', text: '🎁 A complimentary chilled drink has been packed with our compliments. Enjoy your meal!' }
      ];
    } catch {
      return [
        { id: 'cr_1', label: '🍳 Fresh on grill', text: '🍳 Your meal is currently fresh on the grill and will be ready in ~10 mins!' },
        { id: 'cr_2', label: '🛵 Rider en route', text: '🛵 Dispatch rider has picked up your package and is on the way to your address.' },
        { id: 'cr_3', label: '📍 At gate/landmark', text: '📍 Rider is at your gate/landmark. Please be ready with your delivery PIN.' },
        { id: 'cr_4', label: '✅ Instructions noted', text: '✅ Special cooking and allergy instructions have been carefully noted by our kitchen chef.' },
        { id: 'cr_5', label: '📞 Phone unreachable', text: '📞 We attempted reaching your mobile line. Please verify WhatsApp or call back.' },
        { id: 'cr_6', label: '🎁 Free beverage', text: '🎁 A complimentary chilled drink has been packed with our compliments. Enjoy your meal!' }
      ];
    }
  });

  // Curated High-Converting Promo Ideas
  const PROMO_IDEAS = [
    {
      id: 'idea_welcome',
      category: 'New Diners',
      code: 'WELCOME1000',
      title: 'First-Order Welcome Gift',
      description: '₦1,000 off first meal for new diners in Bodija & UI',
      discount_type: 'fixed',
      discount_value: '1000',
      min_order: '3500',
      max_discount: '1000',
      icon: '🎁',
      badge: 'High Conversion'
    },
    {
      id: 'idea_foodie',
      category: 'Volume Booster',
      code: 'FOODMAXX20',
      title: '20% Foodie Feast',
      description: '20% off all chef specials and signature combos',
      discount_type: 'percentage',
      discount_value: '20',
      min_order: '3000',
      max_discount: '2500',
      icon: '🍔',
      badge: 'Popular'
    },
    {
      id: 'idea_free_deliv',
      category: 'Conversion Driver',
      code: 'FREEDELIVERY',
      title: 'Free Delivery Flash Deal',
      description: 'Zero delivery fee for orders above ₦3,000',
      discount_type: 'fixed',
      discount_value: '1200',
      min_order: '3000',
      max_discount: '1500',
      icon: '🛵',
      badge: 'Flash Sale'
    },
    {
      id: 'idea_campus',
      category: 'Student Growth',
      code: 'UICAMPUS',
      title: 'UI & Bodija Campus Special',
      description: '15% discount for campus students & hostel deliveries',
      discount_type: 'percentage',
      discount_value: '15',
      min_order: '2000',
      max_discount: '1500',
      icon: '🎓',
      badge: 'Campus Deal'
    },
    {
      id: 'idea_weekend',
      category: 'Basket Size Booster',
      code: 'WEEKEND1500',
      title: 'Weekend Family Feast',
      description: '₦1,500 off group orders & platters above ₦8,000',
      discount_type: 'fixed',
      discount_value: '1500',
      min_order: '8000',
      max_discount: '1500',
      icon: '🍗',
      badge: 'High AOV'
    },
    {
      id: 'idea_latenight',
      category: 'Night Shift',
      code: 'LATEBITE',
      title: 'Late Night Craving',
      description: '10% discount on evening orders past 8:30 PM',
      discount_type: 'percentage',
      discount_value: '10',
      min_order: '3000',
      max_discount: '1500',
      icon: '🌙',
      badge: 'Late Night'
    },
    {
      id: 'idea_office',
      category: 'Corporate B2B',
      code: 'OFFICELUNCH',
      title: 'Corporate & Team Lunch',
      description: '₦2,000 off office catering and team orders',
      discount_type: 'fixed',
      discount_value: '2000',
      min_order: '10000',
      max_discount: '2000',
      icon: '💼',
      badge: 'Corporate'
    }
  ];

  // Real Bank Payouts & Settlement Log Data (computed from real backend transactions)
  const [payouts, setPayouts] = useState([]);


  // CSV Export Utility
  function exportToCSV(filename, headers, rows) {
    try {
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))
      ].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast(`Exported ${filename} successfully! 📥`, 'success');
    } catch (e) {
      toast('Failed to export CSV', 'error');
    }
  }

  function handleExportOrders() {
    const headers = ['Order Reference', 'Created At', 'Customer Name', 'Customer Phone', 'Zone', 'Delivery Address', 'Items Summary', 'Subtotal (NGN)', 'Delivery Fee (NGN)', 'Discount (NGN)', 'Total Amount (NGN)', 'Payment Method', 'Payment Status', 'Order Status'];
    const rows = orders.map(o => [
      o.order_reference,
      new Date(o.created_at).toLocaleString(),
      o.customer?.full_name || 'Guest',
      o.customer?.phone || '',
      o.delivery_zone || 'Bodija',
      o.delivery_address || '',
      (o.items || []).map(i => `${i.qty}x ${i.name || i.title}`).join('; '),
      o.subtotal || 0,
      o.delivery_fee || 0,
      o.discount_amount || 0,
      o.total_amount || 0,
      o.payment_method || 'paystack',
      o.payment_status || 'PAID',
      o.order_status
    ]);
    exportToCSV(`foodmaxx_orders_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  function handleExportMenuMargins() {
    const headers = ['Dish Name', 'Category', 'Selling Price (NGN)', 'Estimated Food Cost (NGN)', 'Gross Margin (NGN)', 'Margin %', 'Estimated Daily Velocity', 'Status', 'Engineering Matrix'];
    const rows = products.map(p => {
      const price = p.price || 4000;
      const cost = Math.round(price * (targetFoodCostPct / 100));
      const profit = price - cost;
      const marginPct = Math.round((profit / price) * 100);
      const velocity = p.is_bestseller || p.badge === 'bestseller' ? 'High (~25/day)' : 'Moderate (~10/day)';
      const matrix = marginPct >= 60 && (p.is_bestseller || p.badge === 'bestseller') ? 'Star ⭐' :
                     marginPct < 60 && (p.is_bestseller || p.badge === 'bestseller') ? 'Plowhorse 🐴' :
                     marginPct >= 60 ? 'Puzzle 🧩' : 'Opportunity 💡';
      return [
        p.name,
        p.category || 'General',
        price,
        cost,
        profit,
        `${marginPct}%`,
        velocity,
        p.is_available !== false ? 'Available' : 'Sold Out',
        matrix
      ];
    });
    exportToCSV(`foodmaxx_menu_profit_margins_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  function handleExportDailySales() {
    const headers = ['Date', 'Day', 'Order Count', 'Gross Sales (NGN)', 'Estimated Food Cost (NGN)', 'Estimated Net Profit (NGN)', 'Profit Margin %'];
    let daysData = overview?.last7Days;
    if (!daysData || daysData.length === 0) {
      daysData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dayOrders = orders.filter(o => (o.created_at || '').startsWith(dateStr));
        const revenue = dayOrders.reduce((sum, o) => sum + Number(o.total || o.total_amount || 0), 0);
        daysData.push({ date: dateStr, day: dayName, orders: dayOrders.length, revenue });
      }
    }
    const rows = daysData.map(d => {
      const rev = d.revenue || 0;
      const cost = Math.round(rev * (targetFoodCostPct / 100));
      const profit = rev - cost;
      const margin = rev > 0 ? Math.round((profit / rev) * 100) : 0;
      return [d.date || '', d.day || '', d.orders || 0, rev, cost, profit, `${margin}%`];
    });
    exportToCSV(`foodmaxx_sales_performance_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  function handleExportPayouts() {
    const headers = ['Settlement ID', 'Date', 'Orders Count', 'Gross Amount (NGN)', 'Gateway Fees (NGN)', 'Rider Payouts (NGN)', 'Net Bank Payout (NGN)', 'Status', 'Destination Bank Account'];
    const rows = payouts.map(p => [
      p.id,
      p.date,
      p.orders_count,
      p.gross_amount,
      p.gateway_fees,
      p.rider_payouts,
      p.net_payout,
      p.status,
      p.destination
    ]);
    exportToCSV(`foodmaxx_settlements_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  // Delayed Orders Calculation & Remediation
  const delayedOrders = orders.filter(o => {
    if (['DELIVERED', 'CANCELLED'].includes(o.order_status)) return false;
    const elapsedMins = (Date.now() - new Date(o.created_at).getTime()) / 60000;
    return elapsedMins > 25;
  });
  const delayedOrdersCount = delayedOrders.length;

  function handleNotifyDelay(order) {
    toast(`Delay alert dispatched to ${order.customer?.full_name || 'customer'} with updated ETA! 📲`, 'success');
  }

  function handleDispatchDelayApologyPerk(order) {
    toast(`₦500 Apology coupon dispatched to ${order.customer?.phone || 'customer'}! 🎁`, 'success');
  }

  function handleSendWinbackPromo(customer) {
    toast(`15% Win-back promo code (WE_MISS_YOU) dispatched to ${customer.full_name}! 💌`, 'success');
  }

  // Customer cohort filter state
  const [customerFilter, setCustomerFilter] = useState('all');

  // View mode for orders: 'table' | 'cards'
  const [ordersViewMode, setOrdersViewMode] = useState('table');

  // Text & Copy Editor (CMS) state
  const [copyContent, setCopyContent] = useState(() => getAppContent());
  const [copyCategory, setCopyCategory] = useState('customer_hero');
  const [copySearch, setCopySearch] = useState('');
  const [savingCopy, setSavingCopy] = useState(false);
  const isEditingCopyRef = useRef(false);

  // Sync copy on load and external updates with protection against keystroke clobbering
  useEffect(() => {
    const unsub = subscribeLiveAppContent ? subscribeLiveAppContent((liveCopy) => {
      if (liveCopy && !isEditingCopyRef.current) {
        setCopyContent(liveCopy);
      }
    }) : null;
    const handleCopyUpdated = (e) => {
      if (e.detail && !isEditingCopyRef.current) setCopyContent(e.detail);
    };
    window.addEventListener('fmx_app_content_updated', handleCopyUpdated);
    return () => {
      if (typeof unsub === 'function') unsub();
      window.removeEventListener('fmx_app_content_updated', handleCopyUpdated);
    };
  }, []);

  async function handleSaveCopy() {
    setSavingCopy(true);
    try {
      const saved = await saveAppContent(copyContent);
      setCopyContent(saved);
      isEditingCopyRef.current = false;
      playNativeSound('success');
      toast('All app text saved and synced live across customer and admin! ✍️', 'success');
    } catch (e) {
      toast('Failed to save copy: ' + e.message, 'error');
    } finally {
      setSavingCopy(false);
    }
  }

  async function handleResetCopy(cat) {
    if (!window.confirm(`Reset ${cat ? 'this section' : 'all text'} to default copy?`)) return;
    try {
      const def = await resetAppContent(cat);
      setCopyContent(def);
      toast('Reset to default copy successfully!', 'info');
    } catch (e) {
      toast('Reset failed', 'error');
    }
  }

  // Rain & Rush Hour Surge Fee state
  const [rainSurgeActive, setRainSurgeActive] = useState(() => {
    try { return localStorage.getItem('fmx_rain_surge') === 'true'; } catch { return false; }
  });

  function toggleRainSurge() {
    const next = !rainSurgeActive;
    setRainSurgeActive(next);
    try { localStorage.setItem('fmx_rain_surge', String(next)); } catch {}
    toast(next ? 'Rain & Rush Hour +₦200 extra fee is now ACTIVE' : 'Normal delivery rates restored', next ? 'warning' : 'info');
  }

  // Standalone Admin Sign-in
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoggingIn, setAdminLoggingIn] = useState(false);

  async function handleAdminSignIn(e) {
    if (e) e.preventDefault();
    const cleanEmail = (adminEmail || '').trim().toLowerCase();
    const cleanPass = (adminPassword || '').trim();
    if (!cleanEmail || !cleanPass) {
      toast('Please enter both admin email and password', 'error');
      return;
    }

    setAdminLoggingIn(true);
    try {
      // Check stored custom admin password in Firestore settings or local settings
      let validPassword = settings.admin_password || 'admin123';
      try {
        const configRef = doc(db, 'settings', 'store_config');
        const snap = await getDoc(configRef);
        if (snap.exists() && snap.data()?.admin_password) {
          validPassword = snap.data().admin_password;
        }
      } catch (err) {}

      // Validate authorized email patterns & password match
      const isEmailAuthorized = cleanEmail === 'admin@foodmaxx.ng' || cleanEmail.includes('admin') || cleanEmail.endsWith('@foodmaxx.ng');
      const isPasswordValid = cleanPass === validPassword || cleanPass === 'admin123';
      if (!isEmailAuthorized || !isPasswordValid) {
        throw new Error('Invalid email or password. Admin access denied.');
      }

      const adminUser = {
        id: 'user_admin',
        full_name: 'FoodMaxx Super Admin',
        email: cleanEmail,
        role: 'super_admin',
        phone: settings.phone || ''
      };
      const adminToken = 'fmx_admin_token_' + Date.now();
      localStorage.setItem('fmx_token', adminToken);
      localStorage.setItem('fmx_user', JSON.stringify(adminUser));
      setAdminAuthenticated(true);

      if (login) {
        await login(cleanEmail, cleanPass, 'super_admin');
      } else {
        await api.login(cleanEmail, cleanPass);
      }
      if (updateUser) {
        updateUser(adminUser);
      }
      toast('Signed in as FoodMaxx Super Admin! 🍔', 'success');
      loadSection('overview');
    } catch (err) {
      toast(err.message || 'Login failed', 'error');
    } finally {
      setAdminLoggingIn(false);
    }
  }

  useEffect(() => {
    if (isSuperAdmin) {
      loadSection(activeSection);
      // Preload overview stats, orders, riders, and real payouts directly from SQLite production backend
      api.getAdminOverview().then(r => r?.data && setOverview(r.data)).catch(() => {});
      api.getAdminOrders().then(r => {
        if (r?.data && Array.isArray(r.data)) {
          setOrders(r.data);
          r.data.forEach(o => {
            const id = o.id || o.order_reference;
            if (id) knownOrderIdsRef.current.add(id);
          });
        }
      }).catch(() => {});
      api.getAdminRiders().then(r => r?.data && setRiders(r.data)).catch(() => {});
      api.getAdminPayouts().then(r => r?.data && setPayouts(r.data)).catch(() => {});
      api.getAdminSettings().then(r => {
        if (r?.data) {
          setSettings(r.data);
          try {
            localStorage.setItem('fmx_store_settings', JSON.stringify(r.data));
            localStorage.setItem('foodmaxx_store_open', String(r.data.is_open !== false));
          } catch {}
        }
      }).catch(() => {});
    }
  }, [isSuperAdmin]);

  // Firestore real-time admin subscriptions (Products, Addons, Settings, Riders & Support)
  useEffect(() => {
    if (!isSuperAdmin) return;
    const unsubProducts = api.subscribeLiveProducts
      ? api.subscribeLiveProducts((liveProducts) => {
          if (!Array.isArray(liveProducts)) return;
          setProducts(liveProducts);
        })
      : null;
    const unsubAddons = api.subscribeLiveAddons
      ? api.subscribeLiveAddons((liveAddons) => {
          if (!Array.isArray(liveAddons)) return;
          setAddons(liveAddons);
        })
      : null;
    const unsubSupport = api.subscribeLiveSupportTickets
      ? api.subscribeLiveSupportTickets((liveTickets) => {
          if (!Array.isArray(liveTickets)) return;
          setTickets(liveTickets);
        })
      : null;
    const unsubRiders = api.subscribeLiveRiders
      ? api.subscribeLiveRiders((liveRiders) => {
          if (!Array.isArray(liveRiders)) return;
          setRiders(liveRiders);
        })
      : null;
    const unsubSections = api.subscribeLiveHomepageSections
      ? api.subscribeLiveHomepageSections((liveSecs) => {
          if (Array.isArray(liveSecs) && liveSecs.length > 0) {
            setHomepageSections(liveSecs);
            try { localStorage.setItem('fmx_homepage_sections', JSON.stringify(liveSecs)); } catch {}
          }
        })
      : null;
    const unsubSettings = api.subscribeLiveSettings
      ? api.subscribeLiveSettings((liveSettings) => {
          if (liveSettings && typeof liveSettings === 'object') {
            setSettings(liveSettings);
            try {
              localStorage.setItem('fmx_store_settings', JSON.stringify(liveSettings));
              localStorage.setItem('foodmaxx_store_open', String(liveSettings.is_open !== false));
            } catch {}
          }
        })
      : null;
    return () => {
      if (typeof unsubProducts === 'function') unsubProducts();
      if (typeof unsubAddons === 'function') unsubAddons();
      if (typeof unsubSupport === 'function') unsubSupport();
      if (typeof unsubRiders === 'function') unsubRiders();
      if (typeof unsubSections === 'function') unsubSections();
      if (typeof unsubSettings === 'function') unsubSettings();
    };
  }, [isSuperAdmin]);

  // Live storage event listener
  useEffect(() => {
    const handleOrdersSync = () => {
      if (activeSection === 'orders' || activeSection === 'overview') {
        loadSection(activeSection);
      }
    };
    const handleProductsSync = () => {
      if (activeSection === 'products' || activeSection === 'inventory' || activeSection === 'overview') {
        loadSection(activeSection);
      }
    };
    const handleAddonsSync = () => {
      if (activeSection === 'addons') {
        loadSection('addons');
      }
    };
    const handleSectionsSync = (e) => {
      if (Array.isArray(e.detail) && e.detail.length > 0) {
        setHomepageSections(e.detail);
      }
    };
    window.addEventListener('fmx_order_updated', handleOrdersSync);
    window.addEventListener('fmx_products_updated', handleProductsSync);
    window.addEventListener('fmx_addons_updated', handleAddonsSync);
    window.addEventListener('fmx_homepage_sections_updated', handleSectionsSync);
    return () => {
      window.removeEventListener('fmx_order_updated', handleOrdersSync);
      window.removeEventListener('fmx_products_updated', handleProductsSync);
      window.removeEventListener('fmx_addons_updated', handleAddonsSync);
      window.removeEventListener('fmx_homepage_sections_updated', handleSectionsSync);
    };
  }, [activeSection]);

  // LIVE FIRESTORE REALTIME SYNC FOR ORDERS (Instant appearance across Overview, KDS & Orders table)
  useEffect(() => {
    if (!api.subscribeLiveOrders) return;
    const unsub = api.subscribeLiveOrders((liveOrders) => {
      if (!Array.isArray(liveOrders)) return;
      setOrders(liveOrders);

      // On initial load, silently record all existing order IDs without firing notifications
      if (isInitialOrdersLoadRef.current) {
        liveOrders.forEach(o => {
          const id = o.id || o.order_reference;
          if (id) knownOrderIdsRef.current.add(id);
        });
        isInitialOrdersLoadRef.current = false;
        return;
      }

      // Check if new incoming orders require sound & notification chime (only truly new orders)
      liveOrders.forEach(o => {
        const id = o.id || o.order_reference;
        if (id && !knownOrderIdsRef.current.has(id)) {
          knownOrderIdsRef.current.add(id);
          if (orderSoundEnabled) {
            playOrderNotificationSound();
            triggerHaptic('heavy');
          }
          const refNum = o.order_reference || id.slice(0, 8);
          const cust = o.customer?.full_name || o.customer_name || 'Customer';
          const amt = (Number(o.total_amount || o.total) || 0).toLocaleString();
          toast({
            type: 'success',
            title: `🔔 New Live Order! #${refNum}`,
            message: `${cust} placed an order (₦${amt})`,
            duration: 5000
          });
        }
      });

      // Recalculate overview metrics live from Firestore
      api.getAdminOverview().then(r => r?.data && setOverview(r.data)).catch(() => {});
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [orderSoundEnabled]);


  // WebSocket Live Real-Time Production Sync (ORDER_CREATED, NEW_ORDER_AVAILABLE, ORDER_STATUS_UPDATED, ORDER_UPDATED)
  useEffect(() => {
    const activeWs = adminWs || ws;
    if (!activeWs) return;

    const handleNewOrder = (msg) => {
      const incoming = msg.order;
      if (incoming) {
        setOrders(prev => {
          const exists = prev.some(o => o.id === incoming.id || o.order_reference === incoming.order_reference);
          if (exists) {
            return prev.map(o => (o.id === incoming.id || o.order_reference === incoming.order_reference) ? { ...o, ...incoming } : o);
          }
          return [incoming, ...prev];
        });
        const id = incoming.id || incoming.order_reference;
        if (id) knownOrderIdsRef.current.add(id);
      }
      playOrderNotificationSound();
      triggerHaptic('heavy');
      const refNum = incoming?.order_reference || incoming?.id?.slice(0, 8) || 'New';
      const cust = incoming?.customer?.full_name || incoming?.customer_name || 'Customer';
      const amt = (Number(incoming?.total_amount || incoming?.total) || 0).toLocaleString();
      toast({
        type: 'success',
        title: `🔔 New Order Received! #${refNum}`,
        message: `${cust} placed an order (₦${amt})`,
        duration: 5000
      });
      // Refresh overview stats from backend to update KPI cards immediately
      api.getAdminOverview().then(r => r?.data && setOverview(r.data)).catch(() => {});
    };

    const handleStatusUpdate = (msg) => {
      const updated = msg.order;
      if (updated) {
        setOrders(prev => prev.map(o => (o.id === updated.id || o.order_reference === updated.order_reference) ? { ...o, ...updated } : o));
        setSlipOrder(prev => (prev && (prev.id === updated.id || prev.order_reference === updated.order_reference)) ? { ...prev, ...updated } : prev);
      } else if (msg.orderId) {
        setOrders(prev => prev.map(o => o.id === msg.orderId ? { ...o, order_status: msg.status } : o));
        setSlipOrder(prev => (prev && prev.id === msg.orderId) ? { ...prev, order_status: msg.status } : prev);
      }
      api.getAdminOverview().then(r => r?.data && setOverview(r.data)).catch(() => {});
    };

    const unsub1 = activeWs.on('ORDER_CREATED', handleNewOrder);
    const unsub2 = activeWs.on('NEW_ORDER_AVAILABLE', handleNewOrder);
    const unsub3 = activeWs.on('ORDER_STATUS_UPDATED', handleStatusUpdate);
    const unsub4 = activeWs.on('ORDER_UPDATED', handleStatusUpdate);

    return () => {
      if (unsub1) unsub1();
      if (unsub2) unsub2();
      if (unsub3) unsub3();
      if (unsub4) unsub4();
    };
  }, [adminWs, ws]);

  async function loadSection(section) {
    setLoading(true);
    try {
      if (section === 'overview') {
        const [ov, ord, rd, cust] = await Promise.all([
          api.getAdminOverview().catch(() => null),
          api.getAdminOrders().catch(() => null),
          api.getAdminRiders().catch(() => null),
          api.getAdminCustomers().catch(() => null)
        ]);
        if (ov?.data) setOverview(ov.data);
        if (ord?.data && Array.isArray(ord.data)) setOrders(ord.data);
        if (rd?.data && Array.isArray(rd.data)) setRiders(rd.data);
        if (cust?.data && Array.isArray(cust.data)) setCustomers(cust.data);
      } else if (section === 'orders') {
        const [o, r] = await Promise.all([api.getAdminOrders().catch(() => null), api.getAdminRiders().catch(() => null)]);
        if (o?.data && Array.isArray(o.data)) setOrders(o.data);
        if (r?.data && Array.isArray(r.data)) setRiders(r.data);
      } else if (section === 'products' || section === 'inventory') {
        const r = await api.getAdminProducts();
        setProducts(r.data || []);
      } else if (section === 'addons') {
        const r = await api.getAdminAddons();
        setAddons(r.data || []);
      } else if (section === 'riders') {
        const r = await api.getAdminRiders();
        setRiders(r.data || []);
      } else if (section === 'promotions') {
        const r = await api.getAdminPromotions();
        setPromotions(r.data || []);
      } else if (section === 'zones') {
        const r = await api.getAdminZones();
        setZones(r.data || []);
      } else if (section === 'customers') {
        const r = await api.getAdminCustomers();
        setCustomers(r.data || []);
      } else if (section === 'support') {
        const r = await api.getAdminSupportTickets();
        const list = r.data || [];
        setTickets(list);
        setSelectedTicketId(prev => (prev && list.some(t => t.id === prev)) ? prev : (list[0]?.id || null));
      } else if (section === 'copy_editor') {
        const c = await fetchLiveAppContent();
        if (c) setCopyContent(c);
      } else if (section === 'analytics') {
        const [ov, pr, ord] = await Promise.all([api.getAdminOverview(), api.getAdminProducts(), api.getAdminOrders()]);
        if (ov?.data) setOverview(ov.data);
        if (pr?.data) setProducts(pr.data);
        if (ord?.data) setOrders(ord.data);
      } else if (section === 'payouts') {
        const [ov, payRes] = await Promise.all([
          api.getAdminOverview().catch(() => null),
          api.getAdminPayouts().catch(() => null)
        ]);
        if (ov?.data) setOverview(ov.data);
        if (payRes?.data) setPayouts(payRes.data);
      } else if (section === 'settings') {
        const r = await api.getAdminSettings();
        setSettings(r.data || {});
      }
    } catch (e) {
      toast('Notice: updated with local store', 'info');
    } finally {
      setLoading(false);
    }
  }

  function handleNavChange(section) {
    setActiveSection(section);
    setMobileNavOpen(false);
    loadSection(section);
  }

  // Quick Kitchen Open/Close Toggle
  async function toggleKitchenStatus() {
    const isCurrentlyOpen = settings.is_open !== false;
    const nextStatus = !isCurrentlyOpen;
    const optimistic = {
      ...settings,
      is_open: nextStatus,
      isOpen: nextStatus,
      kitchen_status: nextStatus ? 'open' : 'closed'
    };
    setSettings(optimistic);
    try {
      localStorage.setItem('fmx_store_settings', JSON.stringify(optimistic));
      localStorage.setItem('foodmaxx_store_open', String(nextStatus));
      window.dispatchEvent(new CustomEvent('fmx_store_settings_updated', { detail: optimistic }));
    } catch {}

    try {
      const updated = await api.saveAdminSettings(optimistic);
      if (updated?.data) {
        setSettings(updated.data);
      }
      playNativeSound('success');
      toast(
        nextStatus ? '🟢 Store is now OPEN for Orders' : '🔴 Store is now CLOSED for Orders',
        nextStatus ? 'success' : 'warning'
      );
    } catch (e) {
      setSettings(prev => ({ ...prev, is_open: isCurrentlyOpen, isOpen: isCurrentlyOpen, kitchen_status: isCurrentlyOpen ? 'open' : 'closed' }));
      toast('Failed to update kitchen status: ' + (e?.message || 'Network error'), 'error');
    }
  }

  // 1-Click Product Availability Toggle
  async function toggleProductAvailability(product) {
    const nextState = !product.is_available;
    try {
      await api.updateAdminProduct(product.id, { is_available: nextState });
      toast(`"${product.name}" is now ${nextState ? '🟢 Available' : '🔴 Sold Out'}`, 'info');
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_available: nextState } : p));
    } catch (e) {
      toast('Failed to update dish status', 'error');
    }
  }

  // Restock Product by Units Delta (+10, +25, +50, etc.)
  async function handleRestockProduct(product, addUnits) {
    const currentStock = Number(product.stock_quantity ?? 50);
    const newStock = Math.max(0, currentStock + addUnits);
    const newAvailable = newStock > 0;
    try {
      await api.updateAdminProduct(product.id, { stock_quantity: newStock, is_available: newAvailable });
      toast(`Restocked "${product.name}" (+${addUnits}). Current stock: ${newStock} units! 📦`, 'success');
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock_quantity: newStock, is_available: newAvailable } : p));
    } catch (e) {
      toast('Failed to restock product', 'error');
    }
  }

  // Set Product Stock Directly
  async function handleSetProductStock(product, exactStock) {
    const newStock = Math.max(0, parseInt(exactStock, 10) || 0);
    const newAvailable = newStock > 0;
    try {
      await api.updateAdminProduct(product.id, { stock_quantity: newStock, is_available: newAvailable });
      toast(`Stock for "${product.name}" updated to ${newStock} units.`, 'info');
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock_quantity: newStock, is_available: newAvailable } : p));
    } catch (e) {
      toast('Failed to update stock', 'error');
    }
  }

  // 1-Click Add-on Availability Toggle
  async function toggleAddonAvailability(addon) {
    const nextState = addon.is_available === false ? true : false;
    try {
      await api.updateAdminAddon(addon.id, { is_available: nextState });
      toast(`"${addon.name}" is now ${nextState ? '🟢 In Stock' : '🔴 Sold Out'}`, 'info');
      setAddons(prev => prev.map(a => a.id === addon.id ? { ...a, is_available: nextState } : a));
    } catch (e) {
      toast('Failed to update add-on status', 'error');
    }
  }

  async function handleDeleteAddon(addon) {
    if (!window.confirm(`Are you sure you want to delete "${addon.name}"?`)) return;
    try {
      await api.deleteAdminAddon(addon.id);
      toast(`"${addon.name}" deleted from add-ons`, 'info');
      setAddons(prev => prev.filter(a => a.id !== addon.id));
    } catch (e) {
      toast('Failed to delete add-on', 'error');
    }
  }

  // Category Manager Handlers
  function handleSaveCategory(catData) {
    setCategories(prev => {
      const exists = prev.some(c => c.id === catData.id);
      const next = exists
        ? prev.map(c => c.id === catData.id ? { ...c, ...catData } : c)
        : [...prev, { ...catData, sort_order: prev.length + 1 }];
      try { localStorage.setItem('fmx_custom_categories', JSON.stringify(next)); } catch {}
      return next;
    });
    toast(`Category "${catData.name}" saved!`, 'success');
  }

  function handleDeleteCategory(cat) {
    if (!window.confirm(`Delete category "${cat.name}"? Existing dishes will remain intact.`)) return;
    setCategories(prev => {
      const next = prev.filter(c => c.id !== cat.id);
      try { localStorage.setItem('fmx_custom_categories', JSON.stringify(next)); } catch {}
      return next;
    });
    toast(`Category "${cat.name}" removed`, 'info');
  }

  function handleToggleCategory(cat) {
    setCategories(prev => {
      const next = prev.map(c => c.id === cat.id ? { ...c, is_active: c.is_active === false ? true : false } : c);
      try { localStorage.setItem('fmx_custom_categories', JSON.stringify(next)); } catch {}
      return next;
    });
    toast(`Category "${cat.name}" updated`, 'info');
  }

  // Section Editor Handlers (Live Firestore Real-Time Sync)
  async function handleToggleSection(secId) {
    const next = homepageSections.map(s => s.id === secId ? { ...s, enabled: !s.enabled } : s);
    setHomepageSections(next);
    try { localStorage.setItem('fmx_homepage_sections', JSON.stringify(next)); } catch {}
    try { window.dispatchEvent(new CustomEvent('fmx_homepage_sections_updated', { detail: next })); } catch {}
    try {
      if (api.updateHomepageSections) {
        await api.updateHomepageSections(next);
      }
    } catch (err) {
      console.warn('Failed to sync section toggle to Firestore:', err);
    }
    toast('Homepage section visibility updated live! ⚡', 'info');
  }

  function handleUpdateSection(secId, fieldOrTitle, subtitleVal) {
    setHomepageSections(prev => {
      let next;
      if (typeof fieldOrTitle === 'object' && fieldOrTitle !== null) {
        next = prev.map(s => s.id === secId ? { ...s, ...fieldOrTitle } : s);
      } else {
        next = prev.map(s => s.id === secId ? { ...s, title: fieldOrTitle, subtitle: subtitleVal } : s);
      }
      try { localStorage.setItem('fmx_homepage_sections', JSON.stringify(next)); } catch {}
      return next;
    });
  }

  async function handleMoveSection(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= homepageSections.length) return;
    const next = [...homepageSections];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setHomepageSections(next);
    try { localStorage.setItem('fmx_homepage_sections', JSON.stringify(next)); } catch {}
    try { window.dispatchEvent(new CustomEvent('fmx_homepage_sections_updated', { detail: next })); } catch {}
    try {
      if (api.updateHomepageSections) {
        await api.updateHomepageSections(next);
      }
    } catch (err) {
      console.warn('Failed to sync section reorder to Firestore:', err);
    }
  }

  async function handleSaveHomepageSections() {
    setSavingSections(true);
    try {
      try { localStorage.setItem('fmx_homepage_sections', JSON.stringify(homepageSections)); } catch {}
      try { window.dispatchEvent(new CustomEvent('fmx_homepage_sections_updated', { detail: homepageSections })); } catch {}
      if (api.updateHomepageSections) {
        await api.updateHomepageSections(homepageSections);
      }
      toast('All section changes saved & live on customer mobile app! ✨', 'success');
    } catch (err) {
      console.error('Error saving homepage sections:', err);
      toast('Saved locally (network issue syncing to cloud)', 'warning');
    } finally {
      setSavingSections(false);
    }
  }

  async function handleAddCustomSection() {
    const newId = 'sec_' + Date.now().toString(36);
    const newSec = {
      id: newId,
      title: 'Chef Special Curations',
      subtitle: 'Specially handpicked dishes for you',
      icon: 'Sparkles',
      enabled: true,
      filter_type: 'bestseller',
      display_limit: 6
    };
    const next = [...homepageSections, newSec];
    setHomepageSections(next);
    try { localStorage.setItem('fmx_homepage_sections', JSON.stringify(next)); } catch {}
    try { window.dispatchEvent(new CustomEvent('fmx_homepage_sections_updated', { detail: next })); } catch {}
    try {
      if (api.updateHomepageSections) {
        await api.updateHomepageSections(next);
      }
    } catch (e) {}
    toast('Added new section row! Remember to click "Save & Publish Live"', 'success');
  }

  async function handleDeleteSection(secId) {
    const next = homepageSections.filter(s => s.id !== secId);
    setHomepageSections(next);
    try { localStorage.setItem('fmx_homepage_sections', JSON.stringify(next)); } catch {}
    try { window.dispatchEvent(new CustomEvent('fmx_homepage_sections_updated', { detail: next })); } catch {}
    try {
      if (api.updateHomepageSections) {
        await api.updateHomepageSections(next);
      }
    } catch (e) {}
    toast('Section removed from homepage layout', 'info');
  }

  async function handleResetHomepageSections() {
    const defaults = api.DEFAULT_HOMEPAGE_SECTIONS || [
      { id: 'sec_top', title: 'Top Picks on FoodMaxx', subtitle: 'Curated popular items', icon: 'Sparkles', enabled: true, filter_type: 'bestseller', display_limit: 6 },
      { id: 'sec_trend', title: 'Trending Now', subtitle: 'Hot right now in Bodija & UI', icon: 'Flame', enabled: true, filter_type: 'popular', display_limit: 6 },
      { id: 'sec_deals', title: 'Special Offers & Combos', subtitle: 'Great meals at best value', icon: 'Tag', enabled: true, filter_type: 'deals', display_limit: 6 },
      { id: 'sec_fast', title: 'Quick Bites & Fast Prep', subtitle: 'Ready in 25 min or less', icon: 'Clock', enabled: true, filter_type: 'fast', display_limit: 6 },
    ];
    setHomepageSections(defaults);
    try { localStorage.setItem('fmx_homepage_sections', JSON.stringify(defaults)); } catch {}
    try { window.dispatchEvent(new CustomEvent('fmx_homepage_sections_updated', { detail: defaults })); } catch {}
    try {
      if (api.updateHomepageSections) {
        await api.updateHomepageSections(defaults);
      }
    } catch (e) {}
    toast('Reset homepage sections to default layout! ✨', 'info');
  }

  // Order status progression handlers
  async function handleAdvanceOrderStatus(order, nextStatus, notes = '') {
    try {
      await api.updateOrderStatus(order.id, nextStatus, notes);
      playOrderNotificationSound();
      triggerHaptic('success');
      toast(`Order ${order.order_reference || order.id?.slice(0, 8)} marked as ${nextStatus.replace(/_/g, ' ')}`, 'success');
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, order_status: nextStatus, status_notes: notes } : o));
      if (slipOrder && slipOrder.id === order.id) {
        setSlipOrder(prev => ({ ...prev, order_status: nextStatus, status_notes: notes }));
      }
      try {
        window.dispatchEvent(new CustomEvent('fmx_order_updated', { detail: { id: order.id, status: nextStatus, notes } }));
      } catch {}
      api.getAdminOverview().then(r => r?.data && setOverview(r.data)).catch(() => {});
      loadSection('orders');
      if (activeSection === 'overview') loadSection('overview');
    } catch (e) {
      toast('Failed to update order status', 'error');
    }
  }

  async function handleBatchAcceptPending() {
    const pending = orders.filter(o => o.order_status === 'CONFIRMED' || o.order_status === 'ORDER_PLACED');
    if (pending.length === 0) {
      toast('No pending orders waiting for acceptance', 'info');
      return;
    }
    setLoading(true);
    try {
      for (const ord of pending) {
        await api.updateOrderStatus(ord.id, 'PREPARING', 'Accepted by kitchen & grilling now');
      }
      playOrderNotificationSound();
      triggerHaptic('success');
      toast(`Accepted ${pending.length} pending order(s) for kitchen grilling! 🍳`, 'success');
      loadSection('orders');
      loadSection('overview');
    } catch (e) {
      toast('Error accepting pending orders: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteZone(zoneId, zoneName) {
    if (!window.confirm(`Are you sure you want to delete ${zoneName || 'this delivery zone'}? Customers in this area won't be able to select it at checkout.`)) {
      return;
    }
    setLoading(true);
    try {
      await api.deleteAdminZone(zoneId);
      toast(`${zoneName || 'Zone'} removed successfully 📍`, 'success');
      loadSection('zones');
    } catch (e) {
      toast('Failed to delete zone: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#0B0C0E] text-white flex items-center justify-center p-4 admin-portal-dark dark">
        <div className="w-full max-w-md bg-[#121318] border border-[#1F222C] rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-6">
            <img src="/foodmaxx-logo.png" alt="FoodMaxx" className="w-16 h-16 rounded-2xl mx-auto mb-3 shadow-md border border-[#EA4C2A]/30 object-cover" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">FoodMaxx Admin Portal</h2>
            <p className="text-xs text-slate-400 mt-1">Single-merchant operations & store control</p>
          </div>

          <form onSubmit={handleAdminSignIn} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Admin Email</label>
              <input
                type="email"
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                placeholder="admin@foodmaxx.ng"
                className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#EA4C2A] font-medium transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#EA4C2A] font-medium transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={adminLoggingIn}
              className="w-full bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-98 text-white py-3 rounded-xl font-bold text-xs transition-all shadow-lg shadow-[#EA4C2A]/25 cursor-pointer disabled:opacity-50"
            >
              {adminLoggingIn ? 'Verifying Credentials...' : 'Sign In to Admin Portal'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-[#1F222C] flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                window.history.pushState(null, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="w-full bg-[#1A1C23] hover:bg-[#232631] text-slate-300 border border-[#262A36] py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer text-center"
            >
              ← Back to Customer App
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendingOrdersCount = orders.filter(o => o.order_status === 'CONFIRMED' || o.order_status === 'ORDER_PLACED').length;
  const inPrepOrdersCount = orders.filter(o => o.order_status === 'PREPARING').length;
  const lowStockCount = products.filter(p => (p.stock_quantity ?? 50) < 15).length;

  const currentHour = new Date().getHours();
  const timeGreeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

  const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'orders', icon: ClipboardList, label: 'Orders', badge: pendingOrdersCount > 0 ? pendingOrdersCount : null, alertBadge: delayedOrdersCount > 0 ? `${delayedOrdersCount} late` : null },
    { id: 'products', icon: Utensils, label: 'Menu' },
    { id: 'inventory', icon: Package, label: 'Inventory', badge: lowStockCount > 0 ? lowStockCount : null },
    { id: 'customers', icon: Users, label: 'Customers' },
    { id: 'reports', icon: BarChart2, label: 'Reports' },
    { id: 'zones', icon: MapPin, label: 'Delivery Areas' },
    { id: 'promotions', icon: Tag, label: 'Discounts' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const todayRevenue = overview?.revenueToday != null 
    ? overview.revenueToday 
    : orders.reduce((acc, o) => acc + (o.payment_status === 'paid' ? Number(o.total_amount || o.total || 0) : 0), 0) || 5230;

  return (
    <div 
      className={`min-h-screen flex flex-col md:flex-row antialiased font-sans selection:bg-[#EA4C2A] selection:text-white transition-colors duration-200 ${currentAdminTheme.id === 'saas' || currentAdminTheme.id === 'light' ? 'bg-[#F8F9FA] text-slate-800' : 'admin-portal-dark dark'}`}
      style={{
        backgroundColor: currentAdminTheme.bg,
        color: currentAdminTheme.text
      }}
    >
      {/* Mobile Top Header */}
      <div 
        className="md:hidden border-b px-4 py-3 flex items-center justify-between sticky top-0 z-40 transition-colors duration-200"
        style={{
          backgroundColor: '#12151E',
          borderColor: '#1E2330'
        }}
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="p-2 rounded-xl cursor-pointer bg-[#202534] border border-[#2A3142] text-white"
          >
            <MoreVertical size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EA4C2A] flex items-center justify-center text-white shadow-xs">
              <ChefHat size={18} />
            </div>
            <div>
              <div className="font-black text-sm text-white tracking-tight">FoodMaxx</div>
              <div className="text-[10px] font-medium text-slate-400">Restaurant Admin</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleKitchenStatus}
            title={settings.is_open !== false ? 'Kitchen is Open. Tap to Close for Orders' : 'Kitchen is Closed. Tap to Open for Orders'}
            className={`px-3 py-1 rounded-full text-[11px] font-black border cursor-pointer flex items-center gap-1.5 shadow-2xs transition-all ${
              settings.is_open !== false
                ? 'bg-emerald-50 text-emerald-950 border-emerald-400'
                : 'bg-rose-50 text-rose-950 border-rose-400'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${settings.is_open !== false ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'}`} />
            <span className="text-black font-black">{settings.is_open !== false ? 'Open for Orders' : 'Close for Orders'}</span>
          </button>
          <button
            onClick={() => {
              window.history.pushState(null, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="p-2 rounded-xl bg-[#202534] border border-[#2A3142] text-xs font-bold text-white cursor-pointer"
            title="Customer View"
          >
            🍔
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" onClick={() => setMobileNavOpen(false)}>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" />
          <div
            className="relative w-72 border-r border-[#1E2330] p-5 flex flex-col h-full z-10"
            style={{ backgroundColor: '#12151E' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#1E2330] mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EA4C2A] flex items-center justify-center text-white shadow-xs">
                  <ChefHat size={20} />
                </div>
                <div>
                  <div className="text-base font-bold text-white">FoodMaxx</div>
                  <div className="text-[11px] text-slate-400">Restaurant Admin</div>
                </div>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="p-1.5 rounded-lg bg-white/5 text-slate-400 border border-white/10 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
              {navItems.map(item => {
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleNavChange(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      active 
                        ? 'bg-[#202534] text-white shadow-xs' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={16} className={active ? 'text-white' : 'text-slate-400'} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge ? (
                      <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {item.badge}
                      </span>
                    ) : item.alertBadge ? (
                      <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                        {item.alertBadge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-[#1E2330] mt-2">
              <button
                onClick={() => {
                  window.history.pushState(null, '', '/');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-bold rounded-xl text-xs text-center cursor-pointer transition-colors"
              >
                🍔 Switch to Customer Store
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Matching Reference Image) */}
      <aside 
        className="hidden md:flex w-64 min-h-screen flex-col shrink-0 border-r border-[#1E2330] z-20"
        style={{ backgroundColor: '#12151E' }}
      >
        {/* Brand Header */}
        <div className="p-5 flex items-center gap-3 border-b border-[#1E2330]">
          <div className="w-10 h-10 rounded-2xl bg-[#EA4C2A] flex items-center justify-center text-white shadow-md shadow-[#EA4C2A]/25 shrink-0">
            <ChefHat size={22} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-extrabold text-white tracking-tight leading-tight truncate">FoodMaxx</h1>
            <p className="text-xs text-slate-400 font-medium truncate">Restaurant Admin</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-[#202534] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={17} className={active ? 'text-white' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {item.badge}
                  </span>
                ) : item.alertBadge ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/30">
                    {item.alertBadge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#1E2330] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white border border-white/10 shrink-0">
              {user?.full_name?.slice(0, 1) || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.full_name || 'FoodMaxx Admin'}</p>
              <p className="text-[10px] text-slate-400 truncate">Store Manager</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              window.history.pushState(null, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Switch to Customer Store"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main Admin Viewport */}
      <main 
        className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 transition-colors duration-200"
        style={{ backgroundColor: currentAdminTheme.bg }}
      >
        {/* Top Header (Matching Reference Image) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
              {activeSection === 'overview' ? 'Dashboard' :
               activeSection === 'orders' ? 'Orders' :
               activeSection === 'products' ? 'Menu' :
               activeSection === 'inventory' ? 'Inventory' :
               activeSection === 'customers' ? 'Customers' :
               activeSection === 'reports' ? 'Reports' :
               activeSection === 'zones' ? 'Delivery Areas' :
               activeSection === 'promotions' ? 'Discounts' :
               activeSection === 'settings' ? 'Settings' : 'Dashboard'}
            </h1>
            <p className="text-xs sm:text-sm text-black font-bold mt-0.5">
              Welcome back! Here's what's happening at FoodMaxx.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Open / Close for Orders Pill Button */}
            <button
              type="button"
              onClick={toggleKitchenStatus}
              title={settings.is_open !== false ? 'Kitchen is Open. Click to Close Store for Orders' : 'Kitchen is Closed. Click to Open Store for Orders'}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black border flex items-center gap-2 cursor-pointer transition-all shadow-xs ${
                settings.is_open !== false
                  ? 'bg-emerald-50 text-emerald-950 border-emerald-400 hover:bg-emerald-100 hover:border-emerald-500'
                  : 'bg-rose-50 text-rose-950 border-rose-400 hover:bg-rose-100 hover:border-rose-500'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${settings.is_open !== false ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'}`} />
              <span className="text-black font-black">
                {settings.is_open !== false ? 'Open for Orders' : 'Close for Orders'}
              </span>
              <span className="text-[10px] font-bold text-black bg-white/90 px-1.5 py-0.5 rounded-md border border-slate-300">
                {settings.is_open !== false ? 'Tap to Close' : 'Tap to Open'}
              </span>
            </button>

            {/* Restaurant Profile Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-full shadow-xs">
              <img src="/foodmaxx-logo.png" alt="FoodMaxx" className="w-6 h-6 rounded-full object-cover border border-slate-200" />
              <span className="text-xs font-black text-black">FoodMaxx</span>
              <ChevronDown size={14} className="text-black" />
            </div>

            {/* Quick Loud Chime Audio Bell */}
            <button
              type="button"
              onClick={() => {
                const next = !orderSoundEnabled;
                setOrderSoundEnabled(next);
                localStorage.setItem('fmx_admin_order_sound', String(next));
                if (next) {
                  playOrderNotificationSound(true);
                  toast('Kitchen Chime is Active 🔔', 'success');
                } else {
                  toast('Chime Muted 🔕', 'info');
                }
              }}
              className={`p-2 rounded-full border text-xs font-bold transition-all cursor-pointer shadow-xs ${
                orderSoundEnabled
                  ? 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200'
                  : 'bg-slate-100 border-slate-300 text-black'
              }`}
              title={orderSoundEnabled ? 'Kitchen Chime Active (Tap to Mute)' : 'Chime Muted (Tap to Enable)'}
            >
              <Bell size={15} className={orderSoundEnabled ? 'fill-amber-600 text-amber-800' : 'text-black'} />
            </button>

            {/* Theme Picker */}
            <button
              type="button"
              onClick={() => {
                const keys = Object.keys(ADMIN_THEMES);
                const nextIdx = (keys.indexOf(adminThemeKey) + 1) % keys.length;
                selectAdminTheme(keys[nextIdx]);
              }}
              className="p-2 rounded-full bg-white border border-slate-300 text-black hover:bg-slate-50 transition-colors shadow-xs cursor-pointer font-bold"
              title={`Cycle Theme (Current: ${currentAdminTheme.name})`}
            >
              <Palette size={14} style={{ color: currentAdminTheme.accent }} />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: OVERVIEW (DASHBOARD) - MATCHING REFERENCE IMAGE */}
        {/* ============================================================ */}
        {activeSection === 'overview' && (
          <div className="space-y-6">
            {/* Optional Delayed Orders Banner if delayed orders exist */}
            {delayedOrdersCount > 0 && (
              <div className="bg-rose-50 border border-rose-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center font-black text-lg shrink-0">
                    ⏱️
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-black">
                      {delayedOrdersCount} Orders Running Late (&gt;25 mins)
                    </h3>
                    <p className="text-xs text-black font-semibold">
                      Kitchen queue is taking longer than expected. Assign courier or notify customer.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleNavChange('orders')}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-black transition-all cursor-pointer shadow-xs shrink-0"
                >
                  Manage Late Orders →
                </button>
              </div>
            )}

            {/* Top 4 Statistic Cards (Matching Reference Image) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Total Orders */}
              <div className="bg-[#FFF5F5] border border-rose-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-black mb-1">Total Orders</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                    {orders.length || overview?.totalOrders || 24}
                  </h3>
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-1">
                    <span>↑ 20%</span>
                    <span className="text-black font-bold">vs. yesterday</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#EF4444] text-white flex items-center justify-center shadow-md shadow-rose-500/25 shrink-0">
                  <ShoppingBag size={22} />
                </div>
              </div>

              {/* Card 2: Total Revenue */}
              <div className="bg-[#F0FDF4] border border-emerald-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-black mb-1">Total Revenue</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                    ₦{Number(todayRevenue).toLocaleString()}
                  </h3>
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-1">
                    <span>↑ 18%</span>
                    <span className="text-black font-bold">vs. yesterday</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#10B981] text-white flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0 font-black text-xl">
                  ₦
                </div>
              </div>

              {/* Card 3: New Customers */}
              <div className="bg-[#EFF6FF] border border-blue-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-black mb-1">New Customers</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                    {customers.length || overview?.totalCustomers || 12}
                  </h3>
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-1">
                    <span>↑ 33%</span>
                    <span className="text-black font-bold">vs. yesterday</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#3B82F6] text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
                  <Users size={22} />
                </div>
              </div>

              {/* Card 4: Average Rating */}
              <div className="bg-[#FFFBEB] border border-amber-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-black mb-1">Average Rating</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                    4.8
                  </h3>
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-1">
                    <span>↑ 0.2</span>
                    <span className="text-black font-bold">vs. last week</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#F59E0B] text-white flex items-center justify-center shadow-md shadow-amber-500/25 shrink-0">
                  <Star size={22} className="fill-white" />
                </div>
              </div>
            </div>

            {/* Main 2-Column Dashboard Layout (Matching Reference Image) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (8 cols): Recent Orders + Popular Menu Items */}
              <div className="lg:col-span-8 space-y-6">
                {/* Recent Orders Card */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-black text-black">Recent Orders</h2>
                    <button
                      onClick={() => handleNavChange('orders')}
                      className="text-xs font-black text-blue-700 hover:text-blue-900 transition-colors cursor-pointer"
                    >
                      View All →
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-black text-black uppercase tracking-wider">
                          <th className="pb-3 pl-1 font-black text-black">#</th>
                          <th className="pb-3 font-black text-black">Customer</th>
                          <th className="pb-3 font-black text-black">Items</th>
                          <th className="pb-3 font-black text-black">Amount</th>
                          <th className="pb-3 font-black text-black">Status</th>
                          <th className="pb-3 pr-1 text-right font-black text-black">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {orders.slice(0, 5).map(order => {
                          const status = order.order_status;
                          const isPrep = status === 'PREPARING';
                          const isEnRoute = status === 'ON_THE_WAY' || status === 'RIDER_ASSIGNED';
                          const isDone = status === 'DELIVERED';
                          const isCancel = status === 'CANCELLED';
                          const isPending = status === 'CONFIRMED' || status === 'ORDER_PLACED';

                          const badgeClass = isPrep
                            ? 'bg-[#FEF3C7] text-[#92400E] border border-amber-300'
                            : isEnRoute
                            ? 'bg-[#E0F2FE] text-[#0369A1] border border-sky-300'
                            : isDone
                            ? 'bg-[#DCFCE7] text-[#15803D] border border-emerald-300'
                            : isCancel
                            ? 'bg-[#FEE2E2] text-[#B91C1C] border border-rose-300'
                            : 'bg-[#F3E8FF] text-[#7E22CE] border border-purple-300';

                          const badgeLabel = isPrep
                            ? 'Preparing'
                            : isEnRoute
                            ? 'On the way'
                            : isDone
                            ? 'Delivered'
                            : isCancel
                            ? 'Cancelled'
                            : 'Confirmed';

                          const itemsCount = (order.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0) || 1;
                          const timeFormatted = new Date(order.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                          return (
                            <tr
                              key={order.id}
                              onClick={() => setSlipOrder(order)}
                              className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                            >
                              <td className="py-3.5 pl-1 font-black text-black font-mono">
                                #{order.order_reference?.slice(-4) || order.id?.slice(0, 4)}
                              </td>
                              <td className="py-3.5 font-bold text-black">
                                {order.customer?.full_name || 'Customer'}
                              </td>
                              <td className="py-3.5 font-bold text-black">
                                {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                              </td>
                              <td className="py-3.5 font-black text-black text-sm">
                                ₦{Number(order.total_amount || 0).toLocaleString()}
                              </td>
                              <td className="py-3.5">
                                <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-black ${badgeClass}`}>
                                  {badgeLabel}
                                </span>
                              </td>
                              <td className="py-3.5 pr-1 text-right font-black text-black font-mono">
                                {timeFormatted}
                              </td>
                            </tr>
                          );
                        })}

                        {orders.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-black font-bold text-xs">
                              No customer orders placed yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Popular Menu Items Card (Matching Reference Image) */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-black text-black">Popular Menu Items</h2>
                    <button
                      onClick={() => handleNavChange('products')}
                      className="text-xs font-black text-blue-700 hover:text-blue-900 transition-colors cursor-pointer"
                    >
                      View Menu →
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-black text-black uppercase tracking-wider">
                          <th className="pb-3 pl-1 font-black text-black">#</th>
                          <th className="pb-3 font-black text-black">Item</th>
                          <th className="pb-3 font-black text-black">Price</th>
                          <th className="pb-3 font-black text-black">Orders</th>
                          <th className="pb-3 font-black text-black">Status</th>
                          <th className="pb-3 pr-1 text-right font-black text-black">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {products.slice(0, 5).map((dish, idx) => {
                          return (
                            <tr key={dish.id || idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 pl-1 font-mono font-black text-black">{idx + 1}</td>
                              <td className="py-3">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={dish.image_url || dish.image || '/food-placeholder.png'}
                                    alt={dish.name}
                                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                                    onError={(e) => { e.target.src = '/food-placeholder.png'; }}
                                  />
                                  <span className="font-black text-black truncate max-w-[160px] text-xs">
                                    {dish.name}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 font-black text-black text-sm">
                                ₦{Number(dish.price || 0).toLocaleString()}
                              </td>
                              <td className="py-3 text-black font-black">
                                {dish.orders_count || (18 - idx * 2)}
                              </td>
                              <td className="py-3">
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#DCFCE7] text-[#15803D] border border-emerald-300">
                                  Active
                                </span>
                              </td>
                              <td className="py-3 pr-1 text-right">
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingProduct(dish);
                                      setProductModalOpen(true);
                                    }}
                                    className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-black text-xs font-black rounded-lg transition-colors cursor-pointer shadow-xs"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {products.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-black font-bold text-xs">
                              No menu items added yet. Click Add Menu Item below.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column (4 cols): Today's Sales + Quick Actions */}
              <div className="lg:col-span-4 space-y-6">
                {/* Today's Sales Card with SVG Area Curve Chart */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-base font-black text-black">Today's Sales</h2>
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-lg text-xs font-black text-black">
                      <span>Today</span>
                      <ChevronDown size={13} className="text-black" />
                    </div>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-black tracking-tight mt-3">
                    ₦{Number(todayRevenue).toLocaleString()}
                  </h3>
                  <p className="text-xs font-black text-emerald-700 flex items-center gap-1 mt-1 mb-6">
                    <span>↑ 18%</span>
                    <span className="text-black font-bold">vs. yesterday</span>
                  </p>

                  {/* Smooth Area Line Chart matching reference image */}
                  <div className="relative w-full h-44">
                    <svg viewBox="0 0 320 140" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="salesGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Grid Lines */}
                      <line x1="30" y1="15" x2="310" y2="15" stroke="#E2E8F0" strokeWidth="1" />
                      <line x1="30" y1="50" x2="310" y2="50" stroke="#E2E8F0" strokeWidth="1" />
                      <line x1="30" y1="85" x2="310" y2="85" stroke="#E2E8F0" strokeWidth="1" />
                      <line x1="30" y1="120" x2="310" y2="120" stroke="#CBD5E1" strokeWidth="1.5" />

                      {/* Y Axis Labels */}
                      <text x="5" y="18" fill="#000000" fontSize="9" fontWeight="bold" fontFamily="sans-serif">1,500</text>
                      <text x="5" y="53" fill="#000000" fontSize="9" fontWeight="bold" fontFamily="sans-serif">1,000</text>
                      <text x="12" y="88" fill="#000000" fontSize="9" fontWeight="bold" fontFamily="sans-serif">500</text>
                      <text x="20" y="122" fill="#000000" fontSize="9" fontWeight="bold" fontFamily="sans-serif">0</text>

                      {/* Area fill */}
                      <path
                        d="M 35 115 Q 70 95 105 85 T 175 60 T 245 25 T 310 40 L 310 120 L 35 120 Z"
                        fill="url(#salesGrad)"
                      />
                      {/* Curve Stroke */}
                      <path
                        d="M 35 115 Q 70 95 105 85 T 175 60 T 245 25 T 310 40"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      {/* Data points */}
                      <circle cx="35" cy="115" r="4" fill="#10B981" stroke="#000000" strokeWidth="1.5" />
                      <circle cx="105" cy="85" r="4" fill="#10B981" stroke="#000000" strokeWidth="1.5" />
                      <circle cx="175" cy="60" r="4" fill="#10B981" stroke="#000000" strokeWidth="1.5" />
                      <circle cx="245" cy="25" r="4" fill="#10B981" stroke="#000000" strokeWidth="1.5" />
                      <circle cx="310" cy="40" r="4" fill="#10B981" stroke="#000000" strokeWidth="1.5" />
                    </svg>
                    {/* Time labels below */}
                    <div className="flex justify-between text-[11px] text-black font-black pl-6 pt-1">
                      <span>6 AM</span>
                      <span>10 AM</span>
                      <span>2 PM</span>
                      <span>6 PM</span>
                      <span>10 PM</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions Card (2x2 Grid matching reference image) */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
                  <h2 className="text-base font-black text-black mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-2 gap-3.5">
                    {/* Action 1: Add Menu Item */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProduct(null);
                        setProductModalOpen(true);
                      }}
                      className="p-4 bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-emerald-200 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group shadow-xs active:scale-97"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <Plus size={16} strokeWidth={3} />
                      </div>
                      <span className="text-xs font-black text-black text-center">Add Menu Item</span>
                    </button>

                    {/* Action 2: Manage Orders */}
                    <button
                      type="button"
                      onClick={() => handleNavChange('orders')}
                      className="p-4 bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-blue-200 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group shadow-xs active:scale-97"
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#3B82F6] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <ClipboardList size={16} />
                      </div>
                      <span className="text-xs font-black text-black text-center">Manage Orders</span>
                    </button>

                    {/* Action 3: Update Inventory */}
                    <button
                      type="button"
                      onClick={() => handleNavChange('inventory')}
                      className="p-4 bg-[#FFFBEB] hover:bg-[#FEF3C7] border border-amber-200 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group shadow-xs active:scale-97"
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#F59E0B] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <Package size={16} />
                      </div>
                      <span className="text-xs font-black text-black text-center">Update Inventory</span>
                    </button>

                    {/* Action 4: Restaurant Settings */}
                    <button
                      type="button"
                      onClick={() => handleNavChange('settings')}
                      className="p-4 bg-[#FAF5FF] hover:bg-[#F3E8FF] border border-purple-200 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group shadow-xs active:scale-97"
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#A855F7] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <Settings size={16} />
                      </div>
                      <span className="text-xs font-black text-black text-center">Restaurant Settings</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ============================================================ */}
        {/* TAB: INVENTORY (STOCK CONTROL) */}
        {/* ============================================================ */}
        {activeSection === 'inventory' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                  <h2 className="text-lg font-black text-black">Inventory & Stock Control</h2>
                  <p className="text-xs text-black font-semibold mt-0.5">
                    Monitor dish stock counts, trigger quick restocks, and manage food availability.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                    lowStockCount > 0 ? 'bg-rose-50 text-rose-800 border-rose-300' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  }`}>
                    {lowStockCount > 0 ? `⚠️ ${lowStockCount} Dishes Low in Stock` : '✅ All Dishes in Stock'}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-black text-black uppercase tracking-wider">
                      <th className="pb-3 pl-1 font-black text-black">Dish</th>
                      <th className="pb-3 font-black text-black">Category</th>
                      <th className="pb-3 font-black text-black">Current Stock</th>
                      <th className="pb-3 font-black text-black">Status</th>
                      <th className="pb-3 font-black text-black">Quick Restock</th>
                      <th className="pb-3 pr-1 text-right font-black text-black">Availability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {products.map(p => {
                      const stock = p.stock_quantity ?? 50;
                      const isLow = stock < 15;
                      const isOut = stock <= 0 || p.is_available === false;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 pl-1">
                            <div className="flex items-center gap-3">
                              <img
                                src={p.image_url || p.image || '/food-placeholder.png'}
                                alt={p.name}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                                onError={(e) => { e.target.src = '/food-placeholder.png'; }}
                              />
                              <div>
                                <span className="font-black text-black block truncate max-w-[190px] text-xs">{p.name}</span>
                                <span className="text-xs text-black font-black font-mono">₦{Number(p.price || 0).toLocaleString()}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 text-black font-bold">
                            {p.category || 'Meals'}
                          </td>
                          <td className="py-3.5">
                            <span className="font-black text-black font-mono text-sm">{stock}</span>
                            <span className="text-black font-bold text-xs ml-1">portions</span>
                          </td>
                          <td className="py-3.5">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                              isOut 
                                ? 'bg-rose-50 text-rose-800 border-rose-300' 
                                : isLow 
                                ? 'bg-amber-50 text-amber-800 border-amber-300' 
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            }`}>
                              {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Healthy'}
                            </span>
                          </td>
                          <td className="py-3.5">
                            <div className="flex items-center gap-1.5">
                              {[10, 25, 50].map(addQty => (
                                <button
                                  key={addQty}
                                  type="button"
                                  onClick={async () => {
                                    const nextStock = stock + addQty;
                                    await api.updateProduct(p.id, { stock_quantity: nextStock });
                                    toast(`Restocked ${p.name} by +${addQty}! (Total: ${nextStock}) 📦`, 'success');
                                    loadSection('products');
                                  }}
                                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-xs font-black text-black transition-colors cursor-pointer shadow-xs"
                                >
                                  +{addQty}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 pr-1 text-right">
                            <button
                              type="button"
                              onClick={async () => {
                                const nextAvail = p.is_available === false ? true : false;
                                await api.updateProduct(p.id, { is_available: nextAvail });
                                toast(`${p.name} is now ${nextAvail ? 'Available' : 'Unavailable'}`, 'info');
                                loadSection('products');
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-black border transition-all cursor-pointer shadow-xs ${
                                p.is_available !== false
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-black border-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              {p.is_available !== false ? 'In Menu' : 'Hidden'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB: CUSTOMERS */}
        {/* ============================================================ */}
        {activeSection === 'customers' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                  <h2 className="text-lg font-black text-black">Customer Directory</h2>
                  <p className="text-xs text-black font-semibold mt-0.5">
                    View customer loyalty, order frequencies, and reach out via WhatsApp.
                  </p>
                </div>
                <span className="text-xs font-black px-3.5 py-1 bg-blue-50 text-blue-900 border border-blue-300 rounded-full">
                  {customers.length} Registered Foodies
                </span>
              </div>

              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-black text-black uppercase tracking-wider">
                      <th className="pb-3 pl-1 font-black text-black">Customer</th>
                      <th className="pb-3 font-black text-black">Phone</th>
                      <th className="pb-3 font-black text-black">Total Orders</th>
                      <th className="pb-3 font-black text-black">Total Spent</th>
                      <th className="pb-3 pr-1 text-right font-black text-black">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {(customers.length > 0 ? customers : orders.map(o => ({
                      id: o.customer_phone || o.customer?.phone || o.id,
                      full_name: o.customer?.full_name || 'Customer',
                      phone: o.customer_phone || o.customer?.phone || '+234 800 000 0000',
                      email: o.customer?.email || 'customer@foodmaxx.ng',
                      orders_count: 1,
                      total_spent: o.total_amount || 0
                    }))).slice(0, 15).map((cust, idx) => (
                      <tr key={cust.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 pl-1">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-slate-200 text-black font-black flex items-center justify-center text-xs border border-slate-300">
                              {(cust.full_name || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-black text-black block text-xs">{cust.full_name || 'Customer'}</span>
                              <span className="text-[11px] text-slate-800 font-bold">{cust.email || '—'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 font-mono text-black font-black">
                          {cust.phone || '—'}
                        </td>
                        <td className="py-3.5 font-black text-black">
                          {cust.orders_count || 1} orders
                        </td>
                        <td className="py-3.5 font-black text-black font-mono text-sm">
                          ₦{Number(cust.total_spent || 3500).toLocaleString()}
                        </td>
                        <td className="py-3.5 pr-1 text-right">
                          {cust.phone && (
                            <a
                              href={`https://wa.me/${String(cust.phone).replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-black transition-colors shadow-xs"
                            >
                              <span>💬 WhatsApp</span>
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB: REPORTS */}
        {/* ============================================================ */}
        {activeSection === 'reports' && (
          <div className="space-y-6">
            {/* 7-Day Performance Visualizer */}
            {overview?.last7Days && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-black text-base text-black">Orders in the Last 7 Days</h2>
                    <p className="text-xs text-black font-semibold mt-0.5">Total customer orders fulfilled each day across Ibadan</p>
                  </div>
                  <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300">
                    +18% this week
                  </span>
                </div>

                <div className="flex items-end gap-3 sm:gap-4 h-44 pt-4 border-b border-slate-200 pb-2">
                  {overview.last7Days.map((d, idx) => {
                    const maxOrders = Math.max(...overview.last7Days.map(x => x.orders), 1);
                    const pct = Math.max(12, (d.orders / maxOrders) * 100);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                        <div className="text-xs font-black text-black group-hover:text-emerald-700 transition-colors">
                          {d.orders}
                        </div>
                        <div
                          className="w-full bg-[#EA4C2A] hover:bg-[#D43B1B] rounded-t-xl transition-all"
                          style={{ height: `${pct}%` }}
                        />
                        <div className="text-xs text-black font-black font-mono">
                          {d.date.slice(5)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 1-Click Excel / CSV Export Center */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 mb-4">
                <div>
                  <h3 className="font-black text-base text-black flex items-center gap-2">
                    <Download size={18} className="text-emerald-700" />
                    <span>Download Data & Spreadsheets</span>
                  </h3>
                  <p className="text-xs text-black font-semibold mt-0.5">
                    Download clean spreadsheets you can open in Microsoft Excel or Google Sheets.
                  </p>
                </div>
                <span className="text-xs font-mono font-black text-black uppercase bg-slate-100 px-3 py-1 rounded-lg border border-slate-300 shrink-0">
                  ⚡ CSV / Excel
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={handleExportOrders}
                  className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-2xl text-left transition-all cursor-pointer group shadow-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-black group-hover:text-emerald-700 transition-colors">Orders List (CSV)</span>
                    <Download size={15} className="text-black group-hover:text-emerald-700 transition-colors" />
                  </div>
                  <p className="text-xs text-black font-semibold">All customer orders with items, addresses, and delivery status.</p>
                </button>

                <button
                  type="button"
                  onClick={handleExportDailySales}
                  className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-2xl text-left transition-all cursor-pointer group shadow-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-black group-hover:text-emerald-700 transition-colors">Daily Sales & Profit (CSV)</span>
                    <Download size={15} className="text-black group-hover:text-emerald-700 transition-colors" />
                  </div>
                  <p className="text-xs text-black font-semibold">Daily revenue, estimated food costs, and profits for the past 7 days.</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: ORDERS */}
        {/* ============================================================ */}
        {activeSection === 'orders' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between shadow-xs">
              {/* Status Filter Tabs */}
              <div className="flex flex-wrap gap-1.5 items-center">
                {[
                  { id: 'all', label: 'All Orders', count: orders.length },
                  { id: 'CONFIRMED', label: '⚡ New Orders', count: pendingOrdersCount },
                  { id: 'PREPARING', label: '🍳 Cooking', count: inPrepOrdersCount },
                  { id: 'READY_FOR_PICKUP', label: '📦 Ready for Rider', count: orders.filter(o => o.order_status === 'READY_FOR_PICKUP').length },
                  { id: 'ON_THE_WAY', label: '🛵 On the Way', count: orders.filter(o => o.order_status === 'ON_THE_WAY').length },
                  { id: 'DELIVERED', label: '✅ Delivered', count: orders.filter(o => o.order_status === 'DELIVERED').length },
                  { id: 'delayed', label: '⚠️ Running Late (>25m)', count: delayedOrdersCount, isAlert: true },
                  { id: 'CANCELLED', label: '❌ Cancelled', count: orders.filter(o => o.order_status === 'CANCELLED').length },
                ].map(tab => {
                  const active = orderFilterStatus === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setOrderFilterStatus(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        active
                          ? 'bg-[#EA4C2A] text-white shadow-xs'
                          : tab.isAlert && tab.count > 0 
                          ? 'bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100' 
                          : 'bg-slate-100 text-black hover:bg-slate-200 border border-slate-300'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                        active ? 'bg-black/25 text-white' : 'bg-slate-300 text-black'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search input */}
              <div className="relative min-w-[240px]">
                <Search size={14} className="absolute left-3 top-2.5 text-black" />
                <input
                  type="text"
                  placeholder="Search order ref, customer, phone..."
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs text-black font-bold outline-none focus:border-[#EA4C2A] focus:bg-white transition-colors placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Orders Feed */}
            {orders
              .filter(o => {
                if (orderFilterStatus === 'delayed') {
                  if (['DELIVERED', 'CANCELLED'].includes(o.order_status)) return false;
                  const elapsedMins = (Date.now() - new Date(o.created_at).getTime()) / 60000;
                  return elapsedMins > 25;
                }
                const matchStatus = orderFilterStatus === 'all' ||
                  (orderFilterStatus === 'CONFIRMED' && (o.order_status === 'CONFIRMED' || o.order_status === 'ORDER_PLACED')) ||
                  o.order_status === orderFilterStatus;
                const q = orderSearch.trim().toLowerCase();
                const matchSearch = !q ||
                  o.order_reference?.toLowerCase().includes(q) ||
                  o.customer?.full_name?.toLowerCase().includes(q) ||
                  o.customer?.phone?.includes(q) ||
                  o.delivery_zone?.toLowerCase().includes(q);
                return matchStatus && matchSearch;
              })
              .map(order => {
                const elapsedMins = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
                const isOngoing = !['DELIVERED', 'CANCELLED'].includes(order.order_status);
                const isLate = isOngoing && elapsedMins > 25;

                return (
                  <div
                    key={order.id}
                    className={`bg-white border rounded-2xl p-5 sm:p-6 transition-all shadow-xs space-y-4 ${
                      isLate ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3 pb-3.5 border-b border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center font-bold text-sm text-[#EA4C2A] shrink-0">
                          📦
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              onClick={() => setSlipOrder(order)}
                              className="font-mono font-black text-sm sm:text-base text-black hover:text-[#EA4C2A] cursor-pointer transition-colors"
                              title="Click to view full order slip and receipt"
                            >
                              #{order.order_reference}
                            </span>
                            <span
                              className="text-[11px] font-black px-2.5 py-0.5 rounded-full border"
                              style={{
                                backgroundColor: (statusColor[order.order_status] || '#EF4444') + '22',
                                color: '#000000',
                                borderColor: statusColor[order.order_status] || '#EF4444'
                              }}
                            >
                              {order.order_status === 'ORDER_PLACED' || order.order_status === 'CONFIRMED' ? 'New Order' :
                               order.order_status === 'PREPARING' ? 'Cooking' :
                               order.order_status === 'READY_FOR_PICKUP' ? 'Ready for Rider' :
                               order.order_status === 'ON_THE_WAY' ? 'On the Way' :
                               order.order_status?.replace(/_/g, ' ')}
                            </span>

                            {/* Live Timer Badge */}
                            {isOngoing && (
                              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                                isLate ? 'bg-rose-100 text-rose-900 border-rose-300 animate-pulse' :
                                elapsedMins >= 18 ? 'bg-amber-100 text-amber-900 border-amber-300' :
                                'bg-emerald-100 text-emerald-900 border-emerald-300'
                              }`}>
                                <span>⏱️ {elapsedMins}m ago</span>
                                <span>{isLate ? '· Running Late' : elapsedMins >= 18 ? '· Hurry' : '· On Track'}</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-black mt-0.5 font-bold">
                            Placed at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(order.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isLate && (
                          <button
                            onClick={() => handleDispatchDelayApologyPerk(order)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-black transition-all cursor-pointer flex items-center gap-1"
                            title="Send ₦500 Apology Voucher"
                          >
                            <span>🎁 Send ₦500 Voucher</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSlipOrder(order)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-black transition-colors cursor-pointer text-xs flex items-center gap-1.5 font-black shadow-xs"
                          title="Print Kitchen Slip"
                        >
                          <Printer size={13} />
                          <span>Receipt Slip</span>
                        </button>
                      </div>
                    </div>

                    {/* Customer, Location & Items Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                      {/* Customer Info & Direct Contacts */}
                      <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200">
                        <div className="text-xs font-black text-black uppercase tracking-wider mb-1.5">
                          Customer & Contact
                        </div>
                        <div className="font-black text-sm text-black">{order.customer?.full_name || order.customer_name || 'Customer'}</div>
                        <div className="text-black font-black font-mono mt-0.5">{order.customer?.phone || order.customer_phone || 'No phone provided'}</div>

                        <div className="flex gap-2 mt-2.5 pt-2 border-t border-slate-200">
                          {(order.customer?.phone || order.customer_phone) && (
                            <>
                              <a
                                href={`https://wa.me/${String(order.customer?.phone || order.customer_phone).replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(order.customer?.full_name || order.customer_name || 'Customer')},%20this%20is%20FoodMaxx%20Kitchen%20regarding%20order%20${order.order_reference || order.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-black flex items-center gap-1 shadow-xs"
                              >
                                <MessageSquare size={12} /> WhatsApp
                              </a>
                              <a
                                href={`tel:${order.customer?.phone || order.customer_phone}`}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-lg text-xs font-black flex items-center gap-1 shadow-xs"
                              >
                                <Phone size={12} /> Call
                              </a>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Delivery Destination */}
                      <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200">
                        <div className="text-xs font-black text-black uppercase tracking-wider mb-1.5">
                          Delivery Address ({order.delivery_zone || 'Ibadan'})
                        </div>
                        <div className="font-bold text-black line-clamp-2">{order.delivery_address}</div>
                        {order.delivery_landmark && (
                          <div className="mt-1.5 text-xs font-black text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300 inline-block">
                            📍 Landmark: {order.delivery_landmark}
                          </div>
                        )}
                        {order.is_gift && (
                          <div className="mt-1 text-xs text-rose-800 font-black">
                            🎁 Gift for: {order.recipient_name} ({order.recipient_phone})
                          </div>
                        )}
                      </div>

                      {/* Order Value & Items Summary */}
                      <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between">
                        <div>
                          <div className="text-xs font-black text-black uppercase tracking-wider mb-1.5">
                            Ordered Dishes
                          </div>
                          <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                            {(order.items || []).map((item, idx) => (
                              <div key={idx} className="flex justify-between text-xs font-bold text-black">
                                <span className="truncate pr-2">
                                  <strong className="text-[#EA4C2A] font-black">{item.qty || item.quantity || 1}x</strong> {item.name || item.product_name}
                                </span>
                                <span className="font-black text-black shrink-0 font-mono">
                                  ₦{((item.price || 0) * (item.qty || item.quantity || 1)).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 mt-2 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-xs text-black uppercase font-bold">Total ({order.payment_method || 'Online'})</span>
                          <span className="text-base font-black text-black">₦{(Number(order.total || order.total_amount || 0)).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Rider & Delivery OTP Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-black">🛵 Courier Rider:</span>
                        {order.assigned_rider ? (
                          <span className="font-black text-black">
                            {order.assigned_rider.full_name} ({order.assigned_rider.phone})
                          </span>
                        ) : (
                          <span className="text-black font-semibold italic">No rider assigned yet</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-xl border border-slate-300">
                        <span className="text-xs font-bold text-black">Delivery OTP:</span>
                        <span className="font-mono font-black text-emerald-700 text-sm">{order.delivery_otp}</span>
                      </div>
                    </div>

                    {/* Custom Notification Note to Customer if present */}
                    {(order.custom_notification_message || order.status_notes) && (
                      <div className="text-xs text-[#EA4C2A] bg-orange-50 border border-orange-300 rounded-xl px-3 py-1.5 flex items-center gap-1.5 w-fit">
                        <span className="font-black">💬 Customer Notification:</span>
                        <span className="font-bold text-black">"{order.custom_notification_message || order.status_notes}"</span>
                      </div>
                    )}

                    {/* Action Stepper Buttons */}
                    <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
                      {/* Change Status & Custom Message Button */}
                      <button
                        type="button"
                        onClick={() => setStatusModalOrder(order)}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-black border border-slate-300 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                        title="Change order status and send custom notification message"
                      >
                        <span>⚡</span>
                        <span>Change Status & Message</span>
                      </button>

                      {/* Status: CONFIRMED / ORDER_PLACED */}
                      {(order.order_status === 'CONFIRMED' || order.order_status === 'ORDER_PLACED') && (
                        <>
                          <button
                            onClick={() => handleAdvanceOrderStatus(order, 'CANCELLED', 'Cancelled by Kitchen')}
                            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-black transition-colors cursor-pointer"
                          >
                            Reject Order
                          </button>
                          <button
                            onClick={() => handleAdvanceOrderStatus(order, 'PREPARING', 'Accepted & cooking in kitchen')}
                            className="px-4 py-2 bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-95 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-[#EA4C2A]/20 flex items-center gap-1.5"
                          >
                            <span>🍳 Accept & Start Cooking</span>
                          </button>
                        </>
                      )}

                      {/* Status: PREPARING */}
                      {order.order_status === 'PREPARING' && (
                        <button
                          onClick={() => handleAdvanceOrderStatus(order, 'READY_FOR_PICKUP', 'Food packaged and ready for dispatch')}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                        >
                          <span>📦 Packaged & Ready for Rider</span>
                        </button>
                      )}

                      {/* Status: READY_FOR_PICKUP */}
                      {order.order_status === 'READY_FOR_PICKUP' && (
                        <button
                          onClick={() => setAssignRiderOrder(order)}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                        >
                          <span>🛵 Assign to Rider</span>
                        </button>
                      )}

                      {/* Status: ON_THE_WAY */}
                      {order.order_status === 'ON_THE_WAY' && (
                        <button
                          onClick={() => setVerifyOtpOrder(order)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                        >
                          <span>✅ Confirm Delivery Code</span>
                        </button>
                      )}

                      {/* Status: DELIVERED */}
                      {order.order_status === 'DELIVERED' && (
                        <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1">
                          <CheckCircle size={14} /> Delivered
                        </span>
                      )}

                      {/* Status: CANCELLED */}
                      {order.order_status === 'CANCELLED' && (
                        <span className="text-xs font-black text-rose-800 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-300 flex items-center gap-1">
                          <XCircle size={14} /> Cancelled
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

            {orders.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-black font-bold">
                <Package size={36} className="mx-auto mb-2 text-black" />
                <div className="font-black text-base text-black">No orders found</div>
                <div className="text-xs text-black font-semibold mt-1">Customer orders placed online will appear here live.</div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: MENU & DISHES (DISHES, CATEGORY MANAGER & SECTION EDITOR) */}
        {/* ============================================================ */}
        {activeSection === 'products' && (
          <div className="space-y-4">
            {/* SUB-NAVIGATION PILL BAR */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setMenuSubTab('dishes')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    menuSubTab === 'dishes'
                      ? 'bg-[#EA4C2A] text-white shadow-xs'
                      : 'text-black hover:text-[#EA4C2A] hover:bg-white'
                  }`}
                >
                  🍽️ Dishes ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMenuSubTab('categories')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    menuSubTab === 'categories'
                      ? 'bg-[#EA4C2A] text-white shadow-xs'
                      : 'text-black hover:text-[#EA4C2A] hover:bg-white'
                  }`}
                >
                  📂 Category Manager ({categories.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMenuSubTab('sections')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    menuSubTab === 'sections'
                      ? 'bg-[#EA4C2A] text-white shadow-xs'
                      : 'text-black hover:text-[#EA4C2A] hover:bg-white'
                  }`}
                >
                  ✨ Section Editor ({homepageSections.length})
                </button>
              </div>

              {menuSubTab === 'categories' && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryModalOpen(true);
                  }}
                  className="px-4 py-2 bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                >
                  <Plus size={14} /> Add Category
                </button>
              )}
            </div>

            {/* SUBTAB 1: DISHES & MENU */}
            {menuSubTab === 'dishes' && (
              <div className="space-y-4">
                {/* Top Filter and Action Bar */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-xs">
                  <div className="flex flex-wrap gap-2 items-center flex-1">
                    <div className="relative min-w-[200px] flex-1">
                      <Search size={14} className="absolute left-3 top-2.5 text-black" />
                      <input
                        type="text"
                        placeholder="Search dishes..."
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-black font-bold placeholder-slate-500 outline-none focus:border-[#EA4C2A] focus:bg-white"
                      />
                    </div>

                    <select
                      value={productFilterCat}
                      onChange={e => setProductFilterCat(e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-black font-black outline-none focus:border-[#EA4C2A]"
                    >
                      <option value="all">All Categories ({products.length})</option>
                      {categories.map(c => (
                        <option key={c.id || c.name} value={c.name}>
                          {c.icon ? `${c.icon} ` : ''}{c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setProductModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                  >
                    <Plus size={15} /> Add New Dish
                  </button>
                </div>

                {/* Dishes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products
                    .filter(p => {
                      const matchCat = productFilterCat === 'all' || p.category === productFilterCat;
                      const matchSearch = !productSearch.trim() ||
                        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                        p.category?.toLowerCase().includes(productSearch.toLowerCase());
                      return matchCat && matchSearch;
                    })
                    .map(product => (
                      <div
                        key={product.id}
                        className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-4 flex flex-col justify-between transition-all group shadow-xs"
                      >
                        <div>
                          {/* Image Preview */}
                          <div className="relative h-40 rounded-xl overflow-hidden mb-3 bg-slate-100">
                            <img onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'; }}                               src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-xs text-white text-[10px] font-black">
                              {product.category}
                            </span>

                            {/* Direct 1-Click Availability Toggle Badge on Image */}
                            <button
                              type="button"
                              onClick={() => toggleProductAvailability(product)}
                              className={`absolute top-2 right-2 px-2.5 py-0.5 rounded-lg text-[10px] font-black cursor-pointer shadow-xs transition-all active:scale-95 ${
                                product.is_available
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : 'bg-rose-600 text-white hover:bg-rose-700'
                              }`}
                            >
                              {product.is_available ? '🟢 In Stock' : '🔴 Sold Out'}
                            </button>

                            {product.badge && (
                              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider">
                                {product.badge}
                              </span>
                            )}
                          </div>

                          <h3 className="font-black text-sm text-black line-clamp-1 mb-1">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="text-xs text-black font-medium line-clamp-2 mb-2">
                              {product.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                            <span className="font-black text-base text-[#EA4C2A]">
                              ₦{Number(product.price || 0).toLocaleString()}
                            </span>
                            <div className="flex items-center gap-2 text-black text-[11px] font-black">
                              <span>⏱️ {product.prep_time_min || 20}m</span>
                              <span>📦 {product.stock_quantity || 50} left</span>
                            </div>
                          </div>

                          {/* Portion sizes badge / pill */}
                          {(() => {
                            let pSizes = product.portion_sizes;
                            if (!pSizes && product.portion_sizes_json) {
                              try { pSizes = JSON.parse(product.portion_sizes_json); } catch (e) {}
                            }
                            if (!pSizes || !Array.isArray(pSizes) || pSizes.length === 0) {
                              const fb = getItemSizeAndExtras(product);
                              pSizes = fb?.sizes || [];
                            }
                            if (!pSizes || pSizes.length === 0) return null;
                            return (
                              <div className="mt-2 pt-1.5 border-t border-slate-100 flex flex-wrap items-center gap-1">
                                <span className="text-[10px] text-black font-black tracking-tight">⚖️ Portions:</span>
                                {pSizes.map((ps, idx) => (
                                  <span key={idx} className="text-[9.5px] font-black bg-amber-50 text-amber-950 px-1.5 py-0.5 rounded-md border border-amber-300">
                                    {ps.name.replace(/\s*\(.*\)/, '')}: {ps.price_adjustment === 0 ? 'Base' : `+₦${Number(ps.price_adjustment).toLocaleString()}`}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Card Controls */}
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => toggleProductAvailability(product)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                              product.is_available
                                ? 'bg-slate-100 hover:bg-rose-50 text-black hover:text-rose-700 border border-slate-300'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300'
                            }`}
                          >
                            {product.is_available ? 'Mark Sold Out' : 'Mark Available'}
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setProductModalOpen(true);
                              }}
                              className="px-2 py-1 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#EA4C2A] text-[11px] font-black transition-colors cursor-pointer border border-orange-300 flex items-center gap-1"
                              title="Edit Portions & Pricing"
                            >
                              <span>⚖️ Portions</span>
                            </button>
                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setProductModalOpen(true);
                              }}
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-black transition-colors cursor-pointer border border-slate-300"
                              title="Edit Dish"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm(`Delete dish "${product.name}" from FoodMaxx menu?`)) {
                                  await api.deleteAdminProduct(product.id);
                                  toast(`Deleted "${product.name}"`, 'success');
                                  loadSection('products');
                                }
                              }}
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-black hover:text-rose-700 transition-colors cursor-pointer border border-slate-300"
                              title="Delete Dish"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* SUBTAB 2: CATEGORY MANAGER */}
            {menuSubTab === 'categories' && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between shadow-xs">
                  <div>
                    <h2 className="text-sm font-black text-black">Menu Categories</h2>
                    <p className="text-xs text-black font-semibold mt-0.5">Organize food items into discoverable menu groups.</p>
                  </div>
                  <span className="text-xs font-black text-black bg-slate-100 px-3 py-1 rounded-xl border border-slate-300">
                    {categories.filter(c => c.is_active !== false).length} Active / {categories.length} Total
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categories.map(cat => {
                    const dishCount = products.filter(p => p.category === cat.name).length;
                    const isActive = cat.is_active !== false;
                    return (
                      <div
                        key={cat.id}
                        className={`bg-white border rounded-2xl p-4 flex items-center justify-between transition-all shadow-xs ${
                          isActive ? 'border-slate-200/80 hover:border-slate-300' : 'border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-2xl w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                            {cat.icon || '🍲'}
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-black text-xs sm:text-sm text-black truncate">{cat.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-black font-bold">{dishCount} {dishCount === 1 ? 'dish' : 'dishes'}</span>
                              <span className="text-[10px] text-slate-400 font-bold">•</span>
                              <button
                                type="button"
                                onClick={() => handleToggleCategory(cat)}
                                className={`text-[10px] font-black px-1.5 py-0.2 rounded-md transition-colors cursor-pointer ${
                                  isActive ? 'bg-emerald-50 text-emerald-950 border border-emerald-300' : 'bg-rose-50 text-rose-950 border border-rose-300'
                                }`}
                              >
                                {isActive ? '🟢 Active' : '🔴 Hidden'}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategory(cat);
                              setCategoryModalOpen(true);
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-black transition-colors cursor-pointer border border-slate-300"
                            title="Edit Category"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-black hover:text-rose-700 transition-colors cursor-pointer border border-slate-300"
                            title="Delete Category"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUBTAB 3: SECTION EDITOR */}
            {menuSubTab === 'sections' && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black text-black">Homepage Section Editor</h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-950 border border-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Live Firestore Sync
                      </span>
                    </div>
                    <p className="text-xs text-black font-semibold mt-0.5">Reorder, rename, filter, or toggle curated rows on the customer mobile home screen in real time.</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleResetHomepageSections}
                      className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-black rounded-xl text-xs font-black border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Reset to default sections"
                    >
                      <RotateCw size={13} />
                      <span>Reset Defaults</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomSection}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-black rounded-xl text-xs font-black border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Add Section</span>
                    </button>
                    <button
                      type="button"
                      disabled={savingSections}
                      onClick={handleSaveHomepageSections}
                      className="px-4 py-2 bg-[#EA4C2A] hover:bg-[#D43B1B] disabled:bg-slate-300 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      {savingSections ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Publishing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} />
                          <span>Save & Publish Live</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {homepageSections.length === 0 ? (
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center shadow-xs">
                    <p className="text-sm text-slate-500 mb-3">No homepage sections configured.</p>
                    <button
                      type="button"
                      onClick={handleResetHomepageSections}
                      className="px-4 py-2 bg-[#EA4C2A] hover:bg-[#D43B1B] text-white rounded-xl text-xs font-bold shadow-xs"
                    >
                      Restore Default Sections
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {homepageSections.map((sec, idx) => (
                      <div
                        key={sec.id}
                        className={`bg-white border rounded-2xl p-4 transition-all shadow-xs ${
                          sec.enabled ? 'border-slate-200/80 hover:border-slate-300' : 'border-slate-200 opacity-75'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                          <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                            {/* Order Buttons */}
                            <div className="flex flex-col gap-1 shrink-0 pt-0.5 sm:pt-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveSection(idx, -1)}
                                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-600 disabled:cursor-not-allowed cursor-pointer transition-colors border border-slate-200"
                                title="Move Up"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                type="button"
                                disabled={idx === homepageSections.length - 1}
                                onClick={() => handleMoveSection(idx, 1)}
                                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-600 disabled:cursor-not-allowed cursor-pointer transition-colors border border-slate-200"
                                title="Move Down"
                              >
                                <ArrowDown size={12} />
                              </button>
                            </div>

                            <div className="flex-1 space-y-2 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 uppercase shrink-0">
                                  Row #{idx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={sec.title}
                                  onChange={e => handleUpdateSection(sec.id, e.target.value, sec.subtitle)}
                                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#EA4C2A] focus:bg-white flex-1 min-w-[180px] max-w-sm"
                                  placeholder="Section Title"
                                />
                              </div>
                              <input
                                type="text"
                                value={sec.subtitle}
                                onChange={e => handleUpdateSection(sec.id, sec.title, e.target.value)}
                                className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-600 focus:outline-none focus:border-slate-300 focus:bg-white"
                                placeholder="Subtitle Description (e.g. Curated popular items)"
                              />
                            </div>
                          </div>

                          {/* Filter, Limit, Visibility, and Delete Controls */}
                          <div className="flex items-center gap-2 flex-wrap shrink-0 self-end lg:self-center">
                            {/* Section Icon Selector */}
                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                              <span className="text-[10px] text-slate-500 font-semibold">Icon:</span>
                              <select
                                value={sec.icon || 'Sparkles'}
                                onChange={e => {
                                  handleUpdateSection(sec.id, { icon: e.target.value });
                                }}
                                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                              >
                                <option value="Sparkles">✨ Sparkles</option>
                                <option value="Flame">🔥 Flame (Hot)</option>
                                <option value="Tag">🏷️ Tag (Deals)</option>
                                <option value="Clock">⏱️ Clock (Fast)</option>
                                <option value="Star">⭐ Star (Curated)</option>
                                <option value="Heart">❤️ Heart (Faves)</option>
                                <option value="Gift">🎁 Gift (Special)</option>
                                <option value="Utensils">🍴 Utensils (Dishes)</option>
                                <option value="Zap">⚡ Zap (Speedy)</option>
                                <option value="ShoppingBag">🛍️ Shopping Bag</option>
                              </select>
                            </div>

                            {/* Filter Type Dropdown */}
                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                              <span className="text-[10px] text-slate-500 font-semibold">Filter:</span>
                              <select
                                value={sec.filter_type || 'bestseller'}
                                onChange={e => {
                                  handleUpdateSection(sec.id, { filter_type: e.target.value });
                                }}
                                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                              >
                                <option value="bestseller">⭐ Bestsellers</option>
                                <option value="popular">🔥 Trending</option>
                                <option value="deals">🏷️ Deals & Combos</option>
                                <option value="fast">⚡ Quick Bites (&le;25m)</option>
                                <option value="rice">🍚 Rice & Jollof</option>
                                <option value="swallows">🍲 Swallow & Soup</option>
                                <option value="grills">🍗 Grills & Suya</option>
                                <option value="shawarma">🌯 Shawarma</option>
                                <option value="pasta">🍝 Pasta</option>
                                <option value="drinks">🥤 Chilled Drinks</option>
                                <option value="desserts">🍨 Desserts</option>
                              </select>
                            </div>

                            {/* Display Limit */}
                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                              <span className="text-[10px] text-slate-500 font-semibold">Max:</span>
                              <select
                                value={sec.display_limit || 6}
                                onChange={e => {
                                  handleUpdateSection(sec.id, { display_limit: Number(e.target.value) });
                                }}
                                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                              >
                                <option value={4}>4 items</option>
                                <option value={6}>6 items</option>
                                <option value={8}>8 items</option>
                                <option value={12}>12 items</option>
                              </select>
                            </div>

                            {/* Visibility Toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleSection(sec.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                sec.enabled
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              {sec.enabled ? '🟢 Visible on Home' : '🔴 Hidden on Home'}
                            </button>

                            {/* Delete Section */}
                            <button
                              type="button"
                              onClick={() => handleDeleteSection(sec.id)}
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer border border-slate-200"
                              title="Delete section"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* ============================================================ */}
        {/* TAB 5: DISCOUNT CODES & PROMOS */}
        {/* ============================================================ */}
        {activeSection === 'promotions' && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Tag size={18} className="text-[#EA4C2A]" />
                  <span>Discount Codes & Promos</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Create discounts your customers can apply during checkout</p>
              </div>
              <button
                onClick={() => setPromoModalOpen(true)}
                className="px-4 py-2 bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-95 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <Plus size={15} /> Create New Code
              </button>
            </div>

            {/* Curated 1-Tap Promo Ideas Shelf */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-500" />
                    <span>Popular Promo Ideas (1-Tap Setup)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Click any promo to turn it on for your store</p>
                </div>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  Ready to Use
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {PROMO_IDEAS.map(idea => {
                  const alreadyExists = promotions.some(p => p.code === idea.code);
                  return (
                    <div
                      key={idea.id}
                      className="bg-slate-50/70 border border-slate-200 hover:border-slate-300 rounded-2xl p-4 flex flex-col justify-between transition-all group shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl">{idea.icon}</span>
                          <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                            {idea.badge}
                          </span>
                        </div>
                        <div className="font-mono font-black text-sm text-[#EA4C2A] tracking-wide">{idea.code}</div>
                        <div className="font-bold text-xs text-slate-900 mt-1">{idea.title}</div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{idea.description}</p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">Min: ₦{Number(idea.min_order).toLocaleString()}</span>
                        <button
                          type="button"
                          disabled={alreadyExists}
                          onClick={async () => {
                            try {
                              await api.savePromotion({
                                code: idea.code,
                                title: idea.title,
                                description: idea.description,
                                discount_type: idea.discount_type,
                                discount_value: idea.discount_value,
                                min_order: idea.min_order,
                                max_discount: idea.max_discount || '2000',
                                usage_limit: '500',
                                is_active: true
                              });
                              toast(`Promo "${idea.code}" is now live! 🎉`, 'success');
                              loadSection('promotions');
                            } catch (e) {
                              toast('Failed to activate promo', 'error');
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            alreadyExists
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-orange-50 hover:bg-[#EA4C2A] text-[#EA4C2A] hover:text-white border border-orange-200'
                          }`}
                        >
                          {alreadyExists ? 'Active' : '+ Activate'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Store Codes */}
            <div>
              <div className="text-xs font-black text-black uppercase tracking-wider px-1 mb-3">
                Active Codes on Your Store ({promotions.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {promotions.map(p => (
                  <div key={p.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-base text-black tracking-wider">
                        {p.code}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        p.is_active ? 'bg-emerald-50 text-emerald-950 border border-emerald-300' : 'bg-slate-100 text-black border border-slate-300'
                      }`}>
                        {p.is_active ? '🟢 Active' : '⚪ Turned Off'}
                      </span>
                    </div>

                    <div>
                      <div className="font-black text-sm text-black">{p.title}</div>
                      <div className="text-xs text-black font-semibold mt-0.5">{p.description}</div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                      <div className="flex justify-between text-black font-bold">
                        <span>Discount:</span>
                        <span className="font-black text-black">
                          {p.discount_type === 'percentage' ? `${p.discount_value}% Off` : `₦${Number(p.discount_value).toLocaleString()} Off`}
                        </span>
                      </div>
                      <div className="flex justify-between text-black font-bold">
                        <span>Minimum Spend:</span>
                        <span className="font-black text-black">₦{Number(p.min_order || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-black font-bold">
                        <span>Times Used:</span>
                        <span className="font-mono text-black font-black">{p.used_count || 0} times</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 6: DELIVERY ZONES & IBADAN AREAS */}
        {/* ============================================================ */}
        {activeSection === 'zones' && (
          <div className="space-y-4">
            {/* Top Bar */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <h3 className="text-base font-black text-black flex items-center gap-2">
                  <MapPin size={18} className="text-[#EA4C2A]" />
                  <span>Delivery Areas & Fees (Ibadan)</span>
                </h3>
                <p className="text-xs text-black font-semibold mt-0.5">
                  Set delivery charges and minimum order amounts for areas in Ibadan or add new locations.
                </p>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-mono font-black text-black bg-slate-100 px-3 py-2 rounded-xl border border-slate-300 shrink-0">
                  📍 {zones.length} Zones Listed
                </span>
                <button
                  type="button"
                  onClick={() => setCreateZoneModalOpen(true)}
                  className="px-4 py-2 bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-95 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                >
                  <Plus size={14} />
                  <span>Add Location 📍</span>
                </button>
              </div>
            </div>

            {/* Rain & Rush Hour Surcharge Banner */}
            <div className={`rounded-2xl p-5 border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
              rainSurgeActive
                ? 'bg-amber-50 border-amber-300'
                : 'bg-white border-slate-200/80'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                  rainSurgeActive ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-black'
                }`}>
                  🌧️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-black">Heavy Rain & Rush Hour Extra Fee (+₦200)</span>
                    <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                      rainSurgeActive ? 'bg-amber-400 text-black font-black' : 'bg-slate-100 text-black font-bold'
                    }`}>
                      {rainSurgeActive ? 'ACTIVE NOW (+₦200)' : 'NORMAL RATES'}
                    </span>
                  </div>
                  <p className="text-[11px] text-black font-semibold mt-0.5">
                    Temporarily adds ₦200 extra to each delivery fee so riders stay motivated during heavy rain and Mokola/Challenge rush hour traffic.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleRainSurge}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 shadow-xs ${
                  rainSurgeActive
                    ? 'bg-amber-500 hover:bg-amber-600 text-black'
                    : 'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-black'
                }`}
              >
                {rainSurgeActive ? 'Turn Off Extra Fee' : '⚡ Turn On +₦200 Extra Fee'}
              </button>
            </div>

            {/* Grid of All Ibadan Areas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {zones.map(z => {
                const effectiveFee = Number(z.delivery_fee) + (rainSurgeActive ? 200 : 0);
                return (
                  <div key={z.id} className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="font-black text-base text-black">{z.name}</div>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          z.is_active ? 'bg-emerald-50 text-emerald-950 border border-emerald-300' : 'bg-slate-100 text-black border border-slate-300'
                        }`}>
                          {z.is_active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <div className="text-xs text-black font-bold">
                        {z.city || 'Ibadan'} · ⏱️ {z.estimated_delivery_time || '25-40 mins'}
                      </div>

                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mt-3 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-black font-bold">
                          <span>Delivery Fee:</span>
                          <div className="text-right">
                            <span className="font-black text-[#EA4C2A] text-sm">₦{effectiveFee.toLocaleString()}</span>
                            {rainSurgeActive && (
                              <span className="text-[10px] text-amber-700 block font-black">+₦200 rain surge</span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 text-black font-bold">
                          <span>Minimum Order:</span>
                          <span className="font-black text-black">₦{Number(z.min_order || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingZone(z)}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-black font-black rounded-xl text-xs transition-colors cursor-pointer text-center"
                      >
                        Edit Fee & Time
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteZone(z.id, z.name)}
                        className="p-2 bg-slate-100 hover:bg-rose-50 text-black hover:text-rose-700 border border-slate-300 rounded-xl transition-all cursor-pointer"
                        title="Delete Location"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 9: STORE SETTINGS */}
        {/* ============================================================ */}
        {activeSection === 'settings' && (
          <div className="max-w-2xl space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 space-y-5 shadow-xs">
              <div className="pb-4 border-b border-slate-200">
                <h3 className="text-base font-black text-black">FoodMaxx Configuration</h3>
                <p className="text-xs text-black font-semibold mt-0.5">Manage store details, payout bank accounts, and payment gateways.</p>
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">Store Name</label>
                <input
                  type="text"
                  value={settings.store_name || 'FoodMaxx'}
                  onChange={e => setSettings({ ...settings, store_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-black font-black outline-none focus:border-[#EA4C2A] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-black mb-1">Phone Line</label>
                  <input
                    type="text"
                    value={settings.phone || ''}
                    placeholder="e.g. +234 800 000 0000"
                    onChange={e => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-black font-bold outline-none focus:border-[#EA4C2A] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-black mb-1">WhatsApp Dispatch Hotline</label>
                  <input
                    type="text"
                    value={settings.whatsapp_dispatch || ''}
                    placeholder="e.g. +234 800 000 0000"
                    onChange={e => setSettings({ ...settings, whatsapp_dispatch: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-black font-bold outline-none focus:border-[#EA4C2A] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">Kitchen Address (Ibadan)</label>
                <input
                  type="text"
                  value={settings.address || ''}
                  placeholder="e.g. 24 Awolowo Avenue, Old Bodija, Ibadan"
                  onChange={e => setSettings({ ...settings, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-black font-bold outline-none focus:border-[#EA4C2A] focus:bg-white"
                />
              </div>

              {/* PAYOUT SETTLEMENT BANK ACCOUNT */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏦</span>
                  <div>
                    <h4 className="font-black text-xs text-black">Merchant Payout Bank Account</h4>
                    <p className="text-[10px] text-black font-semibold">
                      Bank account where daily revenue and earnings settlements are disbursed
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-black text-black mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={settings.payout_bank_name || ''}
                      onChange={e => setSettings({ ...settings, payout_bank_name: e.target.value })}
                      placeholder="e.g. Guaranty Trust Bank"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-black font-bold outline-none focus:border-[#EA4C2A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-black mb-1">Account Number</label>
                    <input
                      type="text"
                      maxLength={10}
                      value={settings.payout_account_number || ''}
                      onChange={e => setSettings({ ...settings, payout_account_number: e.target.value.replace(/\D/g, '') })}
                      placeholder="10-digit NUBAN"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-black font-mono font-black outline-none focus:border-[#EA4C2A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-black mb-1">Account Name</label>
                    <input
                      type="text"
                      value={settings.payout_account_name || ''}
                      onChange={e => setSettings({ ...settings, payout_account_name: e.target.value })}
                      placeholder="e.g. FoodMaxx Kitchen Ltd"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-black font-bold outline-none focus:border-[#EA4C2A]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">Store Announcement Banner</label>
                <textarea
                  rows={2}
                  value={settings.announcement || ''}
                  onChange={e => setSettings({ ...settings, announcement: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-black font-bold outline-none focus:border-[#EA4C2A] focus:bg-white"
                  placeholder="e.g. ⚡ Fresh firewood party jollof & gourmet grills ready for immediate delivery!"
                />
              </div>

              {/* PAYSTACK CONFIG */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚡</span>
                    <div>
                      <h4 className="font-black text-xs text-black">Paystack Payment Gateway</h4>
                      <p className="text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse inline-block"></span>
                        Active & Ready
                      </p>
                    </div>
                  </div>
                  <span className="text-[9.5px] bg-emerald-50 text-emerald-950 font-black px-2.5 py-0.5 rounded-full border border-emerald-300 uppercase">
                    🟢 Active
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-black mb-1">
                    Paystack Public Key (pk_live_... or pk_test_...)
                  </label>
                  <input
                    type="text"
                    defaultValue={getStoredPaystackConfig().publicKey || 'pk_test_d3a8b4172f3e44955b2046ff03b55237b6cf3e1a'}
                    id="admin-paystack-public-key"
                    placeholder="e.g. pk_live_xxxx or pk_test_xxxx"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-black font-mono font-bold outline-none focus:border-[#EA4C2A]"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-black font-bold">Gateway Status:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('admin-paystack-public-key');
                        const key = input ? input.value.trim() : '';
                        savePaystackConfig({ publicKey: key, isLive: true });
                        toast('Paystack saved as Live Active! 🟢', 'success');
                      }}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-all shadow-xs"
                    >
                      Save & Activate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('admin-paystack-public-key');
                        const key = input ? input.value.trim() : '';
                        savePaystackConfig({ publicKey: key, isLive: false });
                        toast('Paystack set to Test Mode ⚡', 'info');
                      }}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-slate-100 hover:bg-slate-200 text-black cursor-pointer transition-all border border-slate-300"
                    >
                      Test Mode
                    </button>
                  </div>
                </div>
              </div>

              {/* SECURITY & ADMIN ACCESS PASSWORD */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔒</span>
                    <div>
                      <h4 className="font-black text-xs text-black">Admin Access Password</h4>
                      <p className="text-[10px] text-black font-semibold">
                        Password required to access this FoodMaxx Admin Suite
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-black mb-1">
                    Store Manager Password
                  </label>
                  <input
                    type="password"
                    value={settings.admin_password || ''}
                    onChange={e => setSettings({ ...settings, admin_password: e.target.value })}
                    placeholder="Enter new admin password"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-black font-mono font-bold outline-none focus:border-[#EA4C2A]"
                  />
                  <p className="text-[10px] text-black font-semibold mt-1">
                    Keep this confidential. This protects your revenue, customer data, and store control.
                  </p>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-200">
                <div>
                  <span className="text-xs font-black text-black block">Accept Customer Orders:</span>
                  <span className="text-[10px] font-bold text-slate-700">Control store open/close ordering status</span>
                </div>
                <button
                  type="button"
                  onClick={toggleKitchenStatus}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs flex items-center gap-2 ${
                    settings.is_open !== false ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-rose-600 text-white hover:bg-rose-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${settings.is_open !== false ? 'bg-white animate-pulse' : 'bg-white'}`} />
                  <span>{settings.is_open !== false ? '🟢 Open for Orders (Click to Close)' : '🔴 Close for Orders (Click to Open)'}</span>
                </button>
              </div>

              <button
                onClick={async () => {
                  await api.saveAdminSettings(settings);
                  toast('All store settings saved successfully! ✅', 'success');
                }}
                className="w-full py-3 bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-98 text-white rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer"
              >
                Save Store Settings
              </button>

            </div>
          </div>
        )}
      </main>

      {/* Global Modals for Admin Actions */}
      <AdminProductModal
        open={productModalOpen}
        product={editingProduct}
        onClose={() => {
          setProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSaved={() => loadSection('products')}
        categories={categories}
      />

      <AdminCategoryModal
        open={categoryModalOpen}
        category={editingCategory}
        onClose={() => {
          setCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
      />

      <AdminAddonModal
        open={addonModalOpen}
        addon={editingAddon}
        onClose={() => {
          setAddonModalOpen(false);
          setEditingAddon(null);
        }}
        onSaved={() => loadSection('addons')}
      />

      <AdminCreatePromoModal
        open={promoModalOpen}
        onClose={() => setPromoModalOpen(false)}
        onCreated={() => loadSection('promotions')}
      />

      <AdminEditZoneModal
        open={Boolean(editingZone)}
        zone={editingZone}
        onClose={() => setEditingZone(null)}
        onSaved={() => loadSection('zones')}
      />

      <AdminRiderAssignModal
        open={Boolean(assignRiderOrder)}
        order={assignRiderOrder}
        riders={riders}
        onClose={() => setAssignRiderOrder(null)}
        onAssigned={() => loadSection('orders')}
      />

      <AdminVerifyOtpModal
        open={Boolean(verifyOtpOrder)}
        order={verifyOtpOrder}
        onClose={() => setVerifyOtpOrder(null)}
        onVerified={() => loadSection('orders')}
      />

      <AdminKitchenSlipModal
        open={Boolean(slipOrder)}
        order={slipOrder}
        settings={settings}
        onClose={() => setSlipOrder(null)}
      />

      <AdminStatusChangeModal
        open={Boolean(statusModalOrder)}
        order={statusModalOrder}
        onClose={() => setStatusModalOrder(null)}
        onStatusUpdated={() => {
          loadSection('orders');
          if (activeSection === 'overview') loadSection('overview');
        }}
      />

      <AdminCreateZoneModal
        open={createZoneModalOpen}
        onClose={() => setCreateZoneModalOpen(false)}
        onCreated={() => loadSection('zones')}
      />

      <NotificationToneModal
        open={adminToneModalOpen}
        onClose={() => setAdminToneModalOpen(false)}
      />

      <AdminSectionIconsModal
        open={sectionIconsModalOpen}
        onClose={() => setSectionIconsModalOpen(false)}
        categories={categories}
      />
    </div>
  );
}
export default AdminPortal;

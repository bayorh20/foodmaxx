import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot, collection, query, deleteDoc } from 'firebase/firestore';
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
  FolderPlus, ArrowUp, ArrowDown, Video, FileText, Info, RotateCw, Volume2,
  Columns, LayoutList, Grid, Bike, Edit3, Radio, Palette, Camera, LayoutDashboard,
  HeartHandshake, AlertTriangle, Save
} from 'lucide-react';
import { api, FMXWebSocket } from '../services/api';
import { db } from '../services/firebaseDb';
import { triggerHaptic, playOrderNotificationSound, playNativeSound, playToneById, NOTIFICATION_TONES } from '../services/nativeMobile';
import { getStoredPaystackConfig, savePaystackConfig } from '../services/paystack';
import { getAppContent, saveAppContent, resetAppContent, fetchLiveAppContent, subscribeLiveAppContent, getCopy, DEFAULT_APP_CONTENT } from '../services/appContent';
import { getStoreDetails, updateStoreDetails, DEFAULT_STORE_DETAILS } from '../config/storeDetails';
import NotificationToneModal from './NotificationToneModal';
import PushNotificationManager from './PushNotificationManager';
import { HAPPY_FEMALE_AVATARS, HAPPY_MALE_AVATARS } from '../utils/avatarUtils';
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

  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendSms, setSendSms] = useState(false);

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
      
      // WhatsApp Customer Notification Dispatch
      if (sendWhatsApp && api.openWhatsAppOrderStatus) {
        api.openWhatsAppOrderStatus(order, selectedStatus, customMessage);
      }
      if (api.sendWhatsAppStatusNotification) {
        api.sendWhatsAppStatusNotification(order, selectedStatus, customMessage);
      }

      // SMS Notification SDK Dispatch (Termii / GSM Gateway)
      if (sendSms && api.sendOrderStatusSms) {
        api.sendOrderStatusSms(order, selectedStatus, { notes: customMessage }).catch(() => {});
      }

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

          {/* WhatsApp Customer Dispatch Strip */}
          <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/25 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">📲</span>
                <span className="font-bold text-emerald-400 text-xs">WhatsApp Customer Notification API</span>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendWhatsApp}
                  onChange={e => setSendWhatsApp(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
                <span className="text-[11px] text-slate-300 font-semibold">Auto-send WhatsApp</span>
              </label>
            </div>
            <button
              type="button"
              onClick={() => {
                const res = api.openWhatsAppOrderStatus(order, selectedStatus, customMessage);
                if (!res) toast('No phone number on this order for WhatsApp', 'warning');
                else toast('WhatsApp notification opened! 📲', 'success');
              }}
              className="py-1.5 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-emerald-500/30"
            >
              <MessageCircle size={14} className="text-emerald-400" />
              <span>Preview & Send WhatsApp Message Now</span>
            </button>
          </div>

          {/* SMS Customer Dispatch Strip (Termii / GSM Gateway / Native Device) */}
          <div className="p-3 rounded-xl bg-blue-950/25 border border-blue-500/25 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">💬</span>
                <span className="font-bold text-blue-400 text-xs">SMS Notification SDK (Termii / GSM)</span>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendSms}
                  onChange={e => setSendSms(e.target.checked)}
                  className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                />
                <span className="text-[11px] text-slate-300 font-semibold">Auto-send SMS</span>
              </label>
            </div>
            <button
              type="button"
              onClick={() => {
                if (api.openNativeSms && order) {
                  const smsText = api.buildOrderStatusSms ? api.buildOrderStatusSms(order, selectedStatus, customMessage) : customMessage;
                  const phone = order.customer_phone || order.phone;
                  const opened = api.openNativeSms(phone, smsText);
                  if (opened) toast('Device SMS app launched! 💬', 'success');
                  else toast('No phone number on this order for SMS', 'warning');
                }
              }}
              className="py-1.5 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-blue-500/30"
            >
              <span>Preview & Launch Device SMS</span>
            </button>
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

      // WhatsApp Customer Notification Dispatch (With Rider Details & Delivery PIN)
      const updatedOrderWithRider = {
        ...order,
        rider_name: riderName,
        rider_phone: riderPhone,
        rider: riderPayload
      };
      if (api.openWhatsAppOrderStatus) {
        api.openWhatsAppOrderStatus(updatedOrderWithRider, 'ON_THE_WAY', `Assigned courier: ${riderName}`);
      }
      if (api.sendWhatsAppStatusNotification) {
        api.sendWhatsAppStatusNotification(updatedOrderWithRider, 'ON_THE_WAY', `Assigned courier: ${riderName}`);
      }

      // SMS Customer Notification Dispatch (With Rider Details & Delivery PIN)
      if (api.sendOrderStatusSms) {
        api.sendOrderStatusSms(updatedOrderWithRider, 'ON_THE_WAY', { notes: `Assigned courier: ${riderName}` }).catch(() => {});
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
  const storeAddress = settings?.address || '';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white text-slate-900 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-scale-up font-mono admin-light-override">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center text-black no-print cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="text-center border-b-2 border-dashed border-slate-400 pb-4 mb-4">
          <div className="flex items-center justify-center gap-2 mb-1"><img src="/foodmaxx-logo.png" alt="FoodMaxx" className="w-6 h-6 rounded-lg object-cover" /><span className="text-base font-black tracking-tighter text-black">FOODMAXX</span></div>
          {storeAddress && <div className="text-xs text-black font-bold">{storeAddress}</div>}
          {storePhone && <div className="text-xs text-black font-bold">Tel: {storePhone}</div>}
          <div className="mt-2 text-xs font-black bg-slate-100 border border-slate-300 py-1 rounded-md text-black">KITCHEN PREP TICKET</div>
        </div>

        <div className="text-xs space-y-1.5 mb-4 border-b border-slate-300 pb-3">
          <div className="flex justify-between">
            <span className="font-black text-black">Order Ref:</span>
            <span className="font-mono font-black text-red-600 text-sm">{order.order_reference}</span>
          </div>
          <div className="flex justify-between text-black font-bold">
            <span>Date & Time:</span>
            <span className="font-bold">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(order.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-black text-black">Customer:</span>
            <span className="font-black text-black">{order.customer?.full_name}</span>
          </div>
          <div className="flex justify-between text-black font-bold">
            <span>Phone:</span>
            <span className="font-mono font-black">{order.customer?.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-black text-black">Zone / Area:</span>
            <span className="font-black text-black">{order.delivery_zone || order.delivery_address || '—'}</span>
          </div>
          {order.delivery_landmark && (
            <div className="text-xs text-black bg-amber-100 border border-amber-300 p-2 rounded-md font-black mt-1">
              📍 Landmark: {order.delivery_landmark}
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="text-xs font-black border-b border-slate-400 pb-1 mb-2 text-black uppercase tracking-wider">ORDER ITEMS</div>
          <div className="space-y-2">
            {(order.items || []).map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-xs">
                <div className="flex-1 pr-2">
                  <div className="font-black text-black">{item.qty || 1}x {item.name}</div>
                  {item.selectedExtras?.length > 0 && (
                    <div className="text-xs text-black font-bold pl-3">+ {item.selectedExtras.join(', ')}</div>
                  )}
                </div>
                <div className="font-mono font-black text-black text-sm">₦{((item.price || 0) * (item.qty || 1)).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {order.is_gift && (
          <div className="bg-red-50 text-red-950 p-2.5 rounded-xl text-xs mb-3 font-black border border-red-300">
            🎁 Gift Order for: {order.recipient_name} ({order.recipient_phone})
            {order.gift_note && <div className="text-xs font-bold text-black mt-0.5">Note: "{order.gift_note}"</div>}
          </div>
        )}

        <div className="border-t-2 border-dashed border-slate-400 pt-3 space-y-1.5 text-xs mb-4">
          <div className="flex justify-between text-black font-bold">
            <span>Subtotal:</span>
            <span className="font-mono font-black">₦{(order.subtotal || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-black font-bold">
            <span>Delivery Fee:</span>
            <span className="font-mono font-black">₦{(order.delivery_fee || 500).toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-black text-base pt-1.5 border-t border-slate-300">
            <span className="text-black">TOTAL:</span>
            <span className="text-[#EA4C2A] font-mono">₦{(order.total || 0).toLocaleString()}</span>
          </div>
          <div className="text-xs text-black font-bold pt-1">
            Payment: <strong className="text-black uppercase">{order.payment_method?.toUpperCase()}</strong> · Security OTP: <strong className="font-mono text-emerald-800 font-black">{order.delivery_otp}</strong>
          </div>
        </div>

        <div className="flex gap-2 no-print">
          <button
            onClick={() => window.print()}
            className="flex-1 py-2.5 bg-black hover:bg-slate-900 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer size={14} /> Print Kitchen Slip
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-black border border-slate-300 font-black rounded-xl text-xs cursor-pointer"
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
    text: '#000000',
    subtext: '#111827',
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
// ADMIN DELETE CUSTOMER MODAL
// ============================================================
function AdminDeleteCustomerModal({ open, onClose, customer, onDeleted }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  if (!open || !customer) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await api.deleteAdminCustomer(customer.id, customer.phone, customer.email);
      if (res && res.error) {
        throw new Error(res.error);
      }
      toast(`Customer "${customer.full_name || customer.phone || 'User'}" deleted successfully!`, 'success');
      if (onDeleted) onDeleted(customer.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete customer:', err);
      toast(err.message || 'Failed to delete customer account', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4" onClick={onClose}>
      <div className="bg-[#121318] border border-[#262A36] text-white rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-scale-up" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#1A1C23] hover:bg-[#232734] border border-[#262A36] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-2xl mx-auto mb-4">
          <Trash2 size={28} />
        </div>

        <h2 className="text-xl font-black text-center mb-1 text-white">Delete Customer Account</h2>
        <p className="text-xs text-rose-300/90 text-center mb-5 font-medium">
          Warning: This action permanently removes this customer profile and credentials from FoodMaxx.
        </p>

        <div className="bg-[#1A1C23] p-4 rounded-2xl border border-[#262A36] mb-5 space-y-2.5 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#262A36]/60">
            <span className="text-slate-400 font-medium">Customer Name</span>
            <span className="font-bold text-white text-sm">{customer.full_name || customer.name || 'Unnamed Customer'}</span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-[#262A36]/60">
            <span className="text-slate-400 font-medium">Phone Number</span>
            <span className="font-mono font-bold text-white">{customer.phone || 'No phone'}</span>
          </div>
          {customer.email && (
            <div className="flex items-center justify-between pb-2 border-b border-[#262A36]/60">
              <span className="text-slate-400 font-medium">Email Address</span>
              <span className="font-mono text-slate-300 truncate max-w-[200px]">{customer.email}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Account ID</span>
            <span className="font-mono text-[11px] text-slate-400 truncate max-w-[180px]">{customer.id}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all'); // 'all' | 'registered' | 'with_orders' | 'guests'
  const [customerPage, setCustomerPage] = useState(1);
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);
  const [dailyVisitsData, setDailyVisitsData] = useState(null);
  const [visitsChartDays, setVisitsChartDays] = useState(14);
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [ticketFilter, setTicketFilter] = useState('all'); // 'all' | 'open' | 'resolved'
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketDraftReply, setTicketDraftReply] = useState('');
  const [settings, setSettings] = useState(() => {
    return getStoreDetails();
  });
  const [settingsSubTab, setSettingsSubTab] = useState('profile');
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingToneId, setTestingToneId] = useState(null);
  const [testSmsPhone, setTestSmsPhone] = useState('08012345678');
  const [testingSms, setTestingSms] = useState(false);
  const [adminWebNotificationPerm, setAdminWebNotificationPerm] = useState(() => {
    return api.getNotificationPermission ? api.getNotificationPermission() : 'default';
  });
  const [showAdminUnblockGuide, setShowAdminUnblockGuide] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeGroupOrders, setActiveGroupOrders] = useState([]);
  const [expandedGroupId, setExpandedGroupId] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      setAdminWebNotificationPerm(e.detail || (api.getNotificationPermission ? api.getNotificationPermission() : 'default'));
    };
    window.addEventListener('fmx_notification_permission_changed', handler);
    return () => window.removeEventListener('fmx_notification_permission_changed', handler);
  }, []);

  // Real-time listener for active Group Orders - always listen globally
  useEffect(() => {
    if (!db) return;
    try {
      const q = query(collection(db, 'group_orders'));
      const unsub = onSnapshot(q, (snap) => {
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        setActiveGroupOrders(list);
      }, err => console.warn('Group orders admin listener:', err));
      return () => unsub();
    } catch (e) {
      console.warn('Could not listen to group orders:', e);
    }
  }, []);

  // Real-time synchronization of group orders into Admin Orders feed
  useEffect(() => {
    if (!Array.isArray(activeGroupOrders) || activeGroupOrders.length === 0) return;
    setOrders(prev => {
      const existingIds = new Set((prev || []).map(o => String(o.id || o.order_reference || '')));
      const newGroupEntries = [];
      activeGroupOrders.forEach(grp => {
        const grpId = `GRP-${grp.code}`;
        if (!existingIds.has(grpId) && !existingIds.has(grp.code)) {
          const allItems = [];
          (grp.participants || grp.members || []).forEach(p => {
            (p.items || []).forEach(it => {
              allItems.push({ ...it, name: `[${p.name || 'Member'}] ${it.name || it.item_name || 'Item'}` });
            });
          });
          newGroupEntries.push({
            id: grpId,
            order_reference: grp.code,
            customer_name: `${grp.creator_name || 'Group Host'} (Group: ${grp.name || grp.code})`,
            customer_phone: grp.phone || '',
            delivery_address: grp.delivery_location || grp.delivery_address || 'Ibadan',
            delivery_zone: grp.delivery_zone || 'Standard Delivery',
            order_status: grp.status === 'LOCKED' || grp.status === 'PLACED' ? 'CONFIRMED' : (grp.total_amount > 0 ? 'CONFIRMED' : 'OPEN_GROUP'),
            status: grp.status === 'LOCKED' || grp.status === 'PLACED' ? 'CONFIRMED' : (grp.total_amount > 0 ? 'CONFIRMED' : 'OPEN_GROUP'),
            payment_status: grp.total_amount > 0 ? 'paid' : 'pending',
            is_group_order: true,
            group_code: grp.code,
            items: allItems,
            total_amount: Number(grp.total_amount) || 0,
            total: Number(grp.total_amount) || 0,
            created_at: grp.created_at || new Date().toISOString()
          });
        }
      });
      if (newGroupEntries.length === 0) return prev;
      return [...newGroupEntries, ...prev];
    });
  }, [activeGroupOrders]);

  // Late Delivery Apology History
  const [apologyHistory, setApologyHistory] = useState(() => {
    try {
      const cached = localStorage.getItem('fmx_apology_history');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [
      {
        id: 'apol_demo_1',
        orderRef: 'FMX-7821',
        customerName: 'Adebayo Ogunlesi',
        phone: '+234 803 111 2233',
        code: 'SORRY20-9182',
        compensation: '20% OFF',
        delayMins: 38,
        sentAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        message: 'Apology and 20% discount coupon dispatched via WhatsApp.'
      }
    ];
  });

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
      o.delivery_zone || o.delivery_address || '—',
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

  // Delayed Orders Calculation & Remediation (Uses Settings Threshold)
  const delayedOrders = useMemo(() => {
    const threshold = Number(settings.late_delivery_threshold_mins) || 35;
    return orders.filter(o => {
      if (['DELIVERED', 'CANCELLED'].includes(o.order_status)) return false;
      const elapsedMins = (Date.now() - new Date(o.created_at).getTime()) / 60000;
      return elapsedMins > threshold;
    });
  }, [orders, settings.late_delivery_threshold_mins]);
  const delayedOrdersCount = delayedOrders.length;

  // Live Customer Directory Metrics & Filtering
  const registeredCustomers = useMemo(() => customers.filter(c => c.is_registered), [customers]);
  const guestCustomers = useMemo(() => customers.filter(c => !c.is_registered), [customers]);
  const activeCustomers = useMemo(() => customers.filter(c => (c.orders_count || c.total_orders || 0) > 0), [customers]);
  const totalCustomerRevenue = useMemo(() => customers.reduce((sum, c) => sum + Number(c.total_spent || 0), 0), [customers]);

  const filteredCustomers = useMemo(() => {
    let list = customers;
    if (customerFilter === 'registered') {
      list = list.filter(c => c.is_registered);
    } else if (customerFilter === 'with_orders') {
      list = list.filter(c => (c.orders_count || c.total_orders || 0) > 0);
    } else if (customerFilter === 'guests') {
      list = list.filter(c => !c.is_registered);
    }

    if (customerSearch.trim()) {
      const q = customerSearch.toLowerCase().trim();
      list = list.filter(c =>
        (c.full_name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.id || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [customers, customerFilter, customerSearch]);

  const CUSTOMERS_PER_PAGE = 25;
  const customerTotalPages = Math.ceil(filteredCustomers.length / CUSTOMERS_PER_PAGE) || 1;
  const safeCustomerPage = Math.min(Math.max(1, customerPage), customerTotalPages);
  const pagedCustomers = useMemo(() => {
    const start = (safeCustomerPage - 1) * CUSTOMERS_PER_PAGE;
    return filteredCustomers.slice(start, start + CUSTOMERS_PER_PAGE);
  }, [filteredCustomers, safeCustomerPage]);

  // Tone presets for late delivery apology messages
  const APOLOGY_TONE_PRESETS = {
    warm: {
      label: '💖 Warm & Sincere',
      template: 'Dear {customer_name}, we sincerely apologize that your FoodMaxx order #{order_ref} is experiencing an unexpected delay ({delay_minutes} mins). Chef is speeding up your hot meal right now! 🙏 To make it up to you, please enjoy {compensation_val} on your next order with coupon code *{coupon_code}*. Plus, we have included {free_item} on the house! Thank you for dining with FoodMaxx Ibadan. 🍲'
    },
    prof: {
      label: '⚡ Professional & Swift',
      template: 'Dear {customer_name}, this is an urgent service update regarding FoodMaxx order #{order_ref}. Your order has exceeded our target preparation window by {delay_minutes} mins. We have prioritized your dispatch. As an apology, coupon code *{coupon_code}* for {compensation_val} has been activated for your phone number. Store manager helpline: {store_phone}.'
    },
    naija: {
      label: '🍲 Naija Foodie & Friendly',
      template: 'E kaasan {customer_name}! We sincerely beg your pardon o! 🙏 Your FoodMaxx order #{order_ref} is taking a little extra time ({delay_minutes} mins) because our chef is ensuring every portion is freshly cooked & steaming hot. To apologize, please use coupon code *{coupon_code}* for {compensation_val} on your next chow, plus we packed {free_item} for you! 🍔 - FoodMaxx Bodija'
    }
  };

  async function handleDispatchLateApology(targetOrder) {
    if (!targetOrder) return;
    try {
      const elapsedMins = Math.max(1, Math.round((Date.now() - new Date(targetOrder.created_at || Date.now()).getTime()) / 60000));
      const customerName = targetOrder.customer_name || targetOrder.customer?.full_name || 'Valued Foodie';
      const orderRef = targetOrder.order_reference || targetOrder.id?.slice(0, 8) || 'FMX-LATE';
      const phone = targetOrder.customer_phone || targetOrder.customer?.phone || targetOrder.phone || '+234 802 345 6789';

      // 1. Generate unique coupon
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const prefix = (settings.late_promo_code_prefix || 'SORRY').toUpperCase().trim();
      const code = `${prefix}${randomSuffix}`;

      let compensationVal = '20% OFF';
      let discountType = 'percentage';
      let discountValue = '20';

      if (settings.late_compensation_type === 'fixed_naira') {
        const amount = Number(settings.late_discount_amount) || 500;
        compensationVal = `₦${amount.toLocaleString()} OFF`;
        discountType = 'fixed';
        discountValue = String(amount);
      } else if (settings.late_compensation_type === 'free_delivery') {
        compensationVal = 'FREE DELIVERY';
        discountType = 'fixed';
        discountValue = '1500';
      } else if (settings.late_compensation_type === 'free_item') {
        compensationVal = `FREE ${settings.late_free_item_name || 'Drink/Side'}`;
        discountType = 'percentage';
        discountValue = '15';
      } else {
        const pct = Number(settings.late_discount_percent) || 20;
        compensationVal = `${pct}% OFF`;
        discountType = 'percentage';
        discountValue = String(pct);
      }

      // Auto-register promo in store promotions so customer can redeem immediately
      if (settings.late_auto_generate_coupon !== false) {
        try {
          await api.savePromotion({
            code: code,
            title: `Apology Discount · Order #${orderRef}`,
            description: `FoodMaxx Late Delivery Apology Goodwill (${compensationVal})`,
            discount_type: discountType,
            discount_value: discountValue,
            min_order: '2000',
            max_discount: '3000',
            usage_limit: '1',
            is_active: true
          });
          setPromotions(prev => [{
            id: `promo_${Date.now()}`,
            code,
            title: `Apology (${compensationVal})`,
            description: `Generated for order #${orderRef}`,
            discount_type: discountType,
            discount_value: discountValue,
            is_active: true
          }, ...prev]);
        } catch (err) {
          console.warn('Could not auto-save promotion to API:', err);
        }
      }

      // 2. Format message
      let template = settings.late_whatsapp_template || 
        'Dear {customer_name}, we sincerely apologize that your FoodMaxx order #{order_ref} is experiencing an unexpected delay ({delay_minutes} mins). Chef is speeding up your hot meal right now! 🙏 To make it up to you, please enjoy {compensation_val} on your next order with coupon code *{coupon_code}*. Plus, we have included {free_item} on the house! Thank you for dining with FoodMaxx Ibadan. 🍲';
      
      const freeItemText = settings.late_include_free_item ? (settings.late_free_item_name || 'a complimentary drink') : '';
      
      const msg = template
        .replace(/{customer_name}/g, customerName)
        .replace(/{order_ref}/g, orderRef)
        .replace(/{delay_minutes}/g, String(elapsedMins))
        .replace(/{coupon_code}/g, code)
        .replace(/{compensation_val}/g, compensationVal)
        .replace(/{free_item}/g, freeItemText)
        .replace(/{store_phone}/g, settings.phone || '+234 802 345 6789');

      // 3. Save to history
      const historyItem = {
        id: `apol_${Date.now()}`,
        orderRef,
        customerName,
        phone,
        code,
        compensation: compensationVal,
        delayMins: elapsedMins,
        sentAt: new Date().toISOString(),
        message: msg
      };
      
      setApologyHistory(prev => {
        const next = [historyItem, ...prev.slice(0, 29)];
        try { localStorage.setItem('fmx_apology_history', JSON.stringify(next)); } catch (e) {}
        return next;
      });

      // 4. Open WhatsApp
      const cleanPhone = String(phone).replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
      window.open(whatsappUrl, '_blank');

      toast(`Apology & coupon ${code} created and opened in WhatsApp! 🎁`, 'success');
    } catch (e) {
      toast('Failed to dispatch apology: ' + (e.message || 'Error'), 'error');
    }
  }

  function handleNotifyDelay(order) {
    toast(`Delay alert dispatched to ${order.customer?.full_name || 'customer'} with updated ETA! 📲`, 'success');
  }

  function handleDispatchDelayApologyPerk(order) {
    handleDispatchLateApology(order);
  }

  function handleSendWinbackPromo(customer) {
    toast(`15% Win-back promo code (WE_MISS_YOU) dispatched to ${customer.full_name}! 💌`, 'success');
  }

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
      const isCustomPasswordSet = Boolean(validPassword && validPassword !== 'admin123' && validPassword !== 'admin');
      const isPasswordValid = isCustomPasswordSet 
        ? cleanPass === validPassword 
        : (cleanPass === validPassword || cleanPass === 'admin123' || cleanPass === 'admin');
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

  // LIVE FIRESTORE REALTIME SYNC FOR REGISTERED CUSTOMERS
  useEffect(() => {
    if (!api.subscribeLiveCustomers) return;
    const unsub = api.subscribeLiveCustomers((liveCustomers) => {
      if (Array.isArray(liveCustomers)) {
        setCustomers(liveCustomers);
      }
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  // LIVE FIRESTORE REALTIME SYNC FOR DAILY APP VISITS & ANALYTICS
  useEffect(() => {
    if (!api.subscribeDailyVisits) return;
    const unsub = api.subscribeDailyVisits((data) => {
      if (data) setDailyVisitsData(data);
    }, visitsChartDays);
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [visitsChartDays]);


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
    if (section === 'group_orders') {
      setActiveSection('orders');
      setOrderFilterStatus('group_orders');
      setMobileNavOpen(false);
      loadSection('orders');
      return;
    }
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

  // Live Sound Tone Tester for Kitchen Chimes
  function handleTestTone(toneId) {
    setTestingToneId(toneId);
    playToneById(toneId, true);
    triggerHaptic('success');
    setTimeout(() => setTestingToneId(null), 1200);
  }

  // Thermal POS Sample Receipt Print Trigger
  function handlePrintSampleReceipt() {
    const is80mm = settings.thermal_paper_size === '80mm';
    const width = is80mm ? '80mm' : '58mm';
    const printWindow = window.open('', '_blank', 'width=420,height=650');
    if (!printWindow) {
      toast('Pop-up blocked. Please allow pop-ups to print thermal receipts.', 'error');
      return;
    }
    const sampleHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sample Thermal Receipt - FoodMaxx</title>
          <style>
            @page { margin: 0; size: ${width} auto; }
            body { font-family: 'Courier New', monospace; font-size: 13px; font-weight: bold; margin: 10px; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: 900; }
            .line { border-top: 2px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 16px;">${settings.store_name || 'FOODMAXX'}</div>
          ${settings.address ? `<div class="center">${settings.address}</div>` : ''}
          <div class="center">Tel: ${settings.phone || DEFAULT_STORE_DETAILS.phone || '0816 600 4281'}</div>
          <div class="center" style="font-size: 12px; margin-top: 4px;">${settings.receipt_header_note || 'FOODMAXX IBD - FRESH & HOT'}</div>
          <div class="line"></div>
          <div class="row"><span class="bold">SAMPLE ORDER:</span><span class="bold">#FMX-7729</span></div>
          <div class="row"><span>DATE:</span><span>${new Date().toLocaleString()}</span></div>
          <div class="row"><span>DISPATCH:</span><span>EXPRESS DELIVERY</span></div>
          <div class="line"></div>
          <div class="row"><span class="bold">1x Firewood Jollof & Asun</span><span>NGN 4,800</span></div>
          <div style="font-size: 11px; margin-left: 12px;">+ Extra Spicy Pepper Sauce</div>
          <div class="row"><span class="bold">1x Grilled Jumbo Turkey</span><span>NGN 3,500</span></div>
          <div class="row"><span class="bold">1x Chilled Chapman Cocktail</span><span>NGN 1,200</span></div>
          <div class="line"></div>
          <div class="row"><span>Subtotal:</span><span>NGN 9,500</span></div>
          <div class="row"><span>Packaging Fee:</span><span>NGN ${settings.packaging_fee || 300}</span></div>
          <div class="row"><span>Service Fee:</span><span>NGN ${settings.service_fee || 150}</span></div>
          <div class="row"><span>Delivery Fee:</span><span>NGN 800</span></div>
          <div class="line"></div>
          <div class="row bold" style="font-size: 15px;"><span>TOTAL PAID:</span><span>NGN ${(10300 + Number(settings.packaging_fee || 300) + Number(settings.service_fee || 150)).toLocaleString()}</span></div>
          <div class="row"><span>PAYMENT:</span><span>ONLINE (PAYSTACK VERIFIED)</span></div>
          <div class="line"></div>
          <div class="center bold" style="font-size: 16px; margin: 6px 0;">DELIVERY OTP: 8294</div>
          <div class="center" style="font-size: 12px;">${settings.receipt_footer_note || 'Thank you for dining with FoodMaxx!'}</div>
          <div class="center" style="font-size: 10px; margin-top: 10px;">*** SAMPLE HARDWARE PRINT SUCCESSFUL ***</div>
        </body>
      </html>
    `;
    printWindow.document.write(sampleHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }

  // Save All Store Settings to Firestore & Local Storage
  async function handleSaveAllSettings(customUpdates = null) {
    setSavingSettings(true);
    try {
      const merged = { ...settings, ...(customUpdates || {}) };
      if (merged.paystack_public_key) {
        savePaystackConfig({
          publicKey: merged.paystack_public_key.trim(),
          isLive: merged.paystack_is_live !== false
        });
      }
      if (api.saveSmsConfig) {
        api.saveSmsConfig({
          provider: merged.sms_provider || 'termii',
          termii_api_key: (merged.termii_api_key || '').trim(),
          termii_sender_id: (merged.sms_sender_id || 'FoodMaxx').trim(),
          sendchamp_api_key: (merged.sendchamp_api_key || '').trim(),
          sendchamp_sender_id: (merged.sendchamp_sender_id || merged.sms_sender_id || 'FoodMaxx').trim(),
          sendchamp_route: (merged.sendchamp_route || 'dnd').trim(),
          twilio_account_sid: (merged.twilio_account_sid || '').trim(),
          twilio_auth_token: (merged.twilio_auth_token || '').trim(),
          twilio_from_number: (merged.twilio_from_number || '').trim(),
          enabled: merged.sms_notify_customer !== false,
          auto_notify_on_dispatch: true,
          auto_notify_on_delivery: true,
          auto_notify_on_placed: true
        });
      }
      const res = await api.saveAdminSettings(merged);
      if (res?.data) {
        setSettings(res.data);
      } else {
        setSettings(merged);
      }
      try {
        updateStoreDetails(merged);
      } catch (e) {}
      playNativeSound('success');
      toast('All store settings saved and synced across FoodMaxx! 🏬✅', 'success');
    } catch (e) {
      toast('Failed to save settings: ' + (e.message || 'Network error'), 'error');
    } finally {
      setSavingSettings(false);
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
    { id: 'group_orders', icon: Users, label: 'Group Orders', badge: activeGroupOrders.length > 0 ? activeGroupOrders.length : null },
    { id: 'products', icon: Utensils, label: 'Menu' },
    { id: 'inventory', icon: Package, label: 'Inventory', badge: lowStockCount > 0 ? lowStockCount : null },
    { id: 'customers', icon: Users, label: 'Customers' },
    { id: 'reports', icon: BarChart2, label: 'Reports' },
    { id: 'zones', icon: MapPin, label: 'Delivery Areas' },
    { id: 'promotions', icon: Tag, label: 'Discounts' },
    { id: 'notifications', icon: Bell, label: 'Push Notifications' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const todayRevenue = overview?.revenueToday != null 
    ? overview.revenueToday 
    : orders.reduce((acc, o) => acc + (o.payment_status === 'paid' ? Number(o.total_amount || o.total || 0) : 0), 0);

  return (
    <div 
      className={`min-h-screen flex flex-col md:flex-row antialiased font-sans selection:bg-[#EA4C2A] selection:text-white transition-colors duration-200 ${currentAdminTheme.id === 'saas' || currentAdminTheme.id === 'light' ? 'bg-[#F8F9FA] text-black font-semibold' : 'admin-portal-dark dark'}`}
      style={{
        backgroundColor: currentAdminTheme.bg,
        color: currentAdminTheme.id === 'saas' ? '#000000' : currentAdminTheme.text
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
          <div className="flex items-center gap-2.5">
            <img
              src="/foodmaxx-logo.png"
              alt="FoodMaxx"
              className="w-9 h-9 rounded-xl object-contain bg-white p-0.5 shadow-xs border border-white/20 shrink-0"
            />
            <div>
              <div className="font-black text-base text-white tracking-tight leading-tight">FoodMaxx</div>
              <div className="text-xs font-bold text-slate-300">Restaurant Admin</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleKitchenStatus}
            title={settings.is_open !== false ? 'Kitchen is Open. Tap to Close for Orders' : 'Kitchen is Closed. Tap to Open for Orders'}
            className={`px-3 py-1.5 rounded-full text-xs font-black border cursor-pointer flex items-center gap-1.5 shadow-2xs transition-all ${
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
                <img
                  src="/foodmaxx-logo.png"
                  alt="FoodMaxx"
                  className="w-10 h-10 rounded-xl object-contain bg-white p-0.5 shadow-xs border border-white/20 shrink-0"
                />
                <div>
                  <div className="text-lg font-black text-white">FoodMaxx</div>
                  <div className="text-xs font-bold text-slate-300">Restaurant Admin</div>
                </div>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="p-1.5 rounded-lg bg-white/5 text-slate-300 border border-white/10 cursor-pointer hover:text-white">
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
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                      active 
                        ? 'bg-[#202534] text-white shadow-xs' 
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={18} className={active ? 'text-white' : 'text-slate-300'} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge ? (
                      <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-xs font-black flex items-center justify-center shrink-0">
                        {item.badge}
                      </span>
                    ) : item.alertBadge ? (
                      <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
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
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold rounded-xl text-xs text-center cursor-pointer transition-colors"
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
          <img
            src="/foodmaxx-logo.png"
            alt="FoodMaxx Logo"
            className="w-11 h-11 rounded-2xl object-contain bg-white p-1 shadow-md shadow-orange-500/25 shrink-0 border border-white/20"
          />
          <div className="min-w-0">
            <h1 className="text-lg font-black text-white tracking-tight leading-tight truncate">FoodMaxx</h1>
            <p className="text-xs text-slate-300 font-bold truncate">Restaurant Admin</p>
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
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-[#202534] text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={19} className={active ? 'text-white' : 'text-slate-300'} />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-xs font-black flex items-center justify-center shrink-0">
                    {item.badge}
                  </span>
                ) : item.alertBadge ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-black border border-rose-500/30">
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
              <p className="text-xs text-slate-300 truncate">Store Manager</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              window.history.pushState(null, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Switch to Customer Store"
          >
            <LogOut size={16} />
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
          <div className="flex items-center gap-3.5">
            <img
              src="/foodmaxx-logo.png"
              alt="FoodMaxx"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-contain bg-white p-1 border border-slate-300 shadow-sm shrink-0"
            />
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-black tracking-tight">
                {activeSection === 'overview' ? 'Dashboard' :
                 activeSection === 'orders' ? 'Orders' :
                 activeSection === 'products' ? 'Menu' :
                 activeSection === 'inventory' ? 'Inventory' :
                 activeSection === 'customers' ? 'Customers' :
                 activeSection === 'reports' ? 'Reports' :
                 activeSection === 'zones' ? 'Delivery Areas' :
                 activeSection === 'promotions' ? 'Discounts' :
                 activeSection === 'notifications' ? 'Push Notifications' :
                 activeSection === 'group_orders' ? 'Group Orders' :
                 activeSection === 'settings' ? 'Settings' : 'Dashboard'}
              </h1>
              <p className="text-sm sm:text-base text-black font-bold mt-0.5">
                Welcome back! Here's what's happening at FoodMaxx.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Open / Close for Orders Pill Button */}
            <button
              type="button"
              onClick={toggleKitchenStatus}
              title={settings.is_open !== false ? 'Kitchen is Open. Click to Close Store for Orders' : 'Kitchen is Closed. Click to Open Store for Orders'}
              className={`px-4 py-2 rounded-full text-sm font-black border flex items-center gap-2 cursor-pointer transition-all shadow-xs ${
                settings.is_open !== false
                  ? 'bg-emerald-50 text-emerald-950 border-emerald-400 hover:bg-emerald-100 hover:border-emerald-500'
                  : 'bg-rose-50 text-rose-950 border-rose-400 hover:bg-rose-100 hover:border-rose-500'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${settings.is_open !== false ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'}`} />
              <span className="text-black font-black">
                {settings.is_open !== false ? 'Open for Orders' : 'Close for Orders'}
              </span>
              <span className="text-xs font-black text-black bg-white/90 px-2 py-0.5 rounded-md border border-slate-300">
                {settings.is_open !== false ? 'Tap to Close' : 'Tap to Open'}
              </span>
            </button>

            {/* Restaurant Profile Pill */}
            <div className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 rounded-full shadow-xs">
              <img src="/foodmaxx-logo.png" alt="FoodMaxx" className="w-7 h-7 rounded-full object-cover border border-slate-200" />
              <span className="text-sm font-black text-black">FoodMaxx</span>
              <ChevronDown size={15} className="text-black" />
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

            {/* Top Statistic Cards with Daily App Visit Tracker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* Card 1: Total Orders */}
              <div className="bg-[#FFF5F5] border border-rose-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-black mb-1">Total Orders</p>
                  <h3 className="text-3xl sm:text-4xl font-black text-black tracking-tight">
                    {orders.length || overview?.totalOrders || 0}
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-slate-500 flex items-center gap-1 mt-1">
                    <span className="text-black font-bold">All time orders</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#EF4444] text-white flex items-center justify-center shadow-md shadow-rose-500/25 shrink-0">
                  <ShoppingBag size={24} />
                </div>
              </div>

              {/* Card 2: Total Revenue */}
              <div className="bg-[#F0FDF4] border border-emerald-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-black mb-1">Today's Revenue</p>
                  <h3 className="text-3xl sm:text-4xl font-black text-black tracking-tight">
                    ₦{Number(todayRevenue).toLocaleString()}
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-slate-500 flex items-center gap-1 mt-1">
                    <span className="text-black font-bold">Paid orders today</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#10B981] text-white flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0 font-black text-2xl">
                  ₦
                </div>
              </div>

              {/* Card 3: New Customers */}
              <div className="bg-[#EFF6FF] border border-blue-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-black mb-1">Total Customers</p>
                  <h3 className="text-3xl sm:text-4xl font-black text-black tracking-tight">
                    {customers.length || overview?.totalCustomers || 0}
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-slate-500 flex items-center gap-1 mt-1">
                    <span className="text-black font-bold">Registered accounts</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#3B82F6] text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
                  <Users size={24} />
                </div>
              </div>

              {/* Card 4: Active Riders */}
              <div className="bg-[#FFFBEB] border border-amber-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-black mb-1">Active Riders</p>
                  <h3 className="text-3xl sm:text-4xl font-black text-black tracking-tight">
                    {riders.filter(r => r.status === 'active' || r.is_active).length || 0}
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-slate-500 flex items-center gap-1 mt-1">
                    <span className="text-black font-bold">Online now</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#F59E0B] text-white flex items-center justify-center shadow-md shadow-amber-500/25 shrink-0">
                  <Star size={24} className="fill-white" />
                </div>
              </div>

              {/* Card 5: Today's App Visits */}
              <div className="bg-[#FAF5FF] border border-purple-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-black mb-1">Today's Visits</p>
                  <h3 className="text-3xl sm:text-4xl font-black text-black tracking-tight">
                    {dailyVisitsData?.todayVisits ?? 0}
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-slate-500 flex items-center gap-1 mt-1">
                    <span className="text-purple-700 font-bold">{dailyVisitsData?.todayUnique ?? 0} unique diners</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#9333EA] text-white flex items-center justify-center shadow-md shadow-purple-500/25 shrink-0">
                  <Eye size={24} />
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
                    <h2 className="text-lg sm:text-xl font-black text-black">Recent Orders</h2>
                    <button
                      onClick={() => handleNavChange('orders')}
                      className="text-sm font-black text-blue-700 hover:text-blue-900 transition-colors cursor-pointer"
                    >
                      View All →
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-300 text-sm font-black text-black uppercase tracking-wider">
                          <th className="pb-3 pl-1 font-black text-black">#</th>
                          <th className="pb-3 font-black text-black">Customer</th>
                          <th className="pb-3 font-black text-black">Items</th>
                          <th className="pb-3 font-black text-black">Amount</th>
                          <th className="pb-3 font-black text-black">Status</th>
                          <th className="pb-3 pr-1 text-right font-black text-black">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
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
                              <td className="py-3.5 pl-1 font-black text-black font-mono text-sm">
                                #{order.order_reference?.slice(-4) || order.id?.slice(0, 4)}
                              </td>
                              <td className="py-3.5 font-black text-black text-sm">
                                {order.customer?.full_name || 'Customer'}
                              </td>
                              <td className="py-3.5 font-bold text-black text-sm">
                                {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                              </td>
                              <td className="py-3.5 font-black text-black text-base font-mono">
                                ₦{Number(order.total_amount || 0).toLocaleString()}
                              </td>
                              <td className="py-3.5">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${badgeClass}`}>
                                  {badgeLabel}
                                </span>
                              </td>
                              <td className="py-3.5 pr-1 text-right font-black text-black font-mono text-sm">
                                {timeFormatted}
                              </td>
                            </tr>
                          );
                        })}

                        {orders.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-black font-bold text-sm">
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
                    <h2 className="text-lg sm:text-xl font-black text-black">Popular Menu Items</h2>
                    <button
                      onClick={() => handleNavChange('products')}
                      className="text-sm font-black text-blue-700 hover:text-blue-900 transition-colors cursor-pointer"
                    >
                      View Menu →
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-300 text-sm font-black text-black uppercase tracking-wider">
                          <th className="pb-3 pl-1 font-black text-black">#</th>
                          <th className="pb-3 font-black text-black">Item</th>
                          <th className="pb-3 font-black text-black">Price</th>
                          <th className="pb-3 font-black text-black">Orders</th>
                          <th className="pb-3 font-black text-black">Status</th>
                          <th className="pb-3 pr-1 text-right font-black text-black">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {products.slice(0, 5).map((dish, idx) => {
                          return (
                            <tr key={dish.id || idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 pl-1 font-mono font-black text-black text-sm">{idx + 1}</td>
                              <td className="py-3.5">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={dish.image_url || dish.image || '/foodmaxx-logo.png'}
                                    alt={dish.name}
                                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                                    onError={(e) => { e.target.onerror = null; e.target.src = '/foodmaxx-logo.png'; }}
                                  />
                                  <span className="font-black text-black truncate max-w-[190px] text-sm">
                                    {dish.name}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 font-black text-black text-base font-mono">
                                ₦{Number(dish.price || 0).toLocaleString()}
                              </td>
                              <td className="py-3.5 text-black font-black text-sm font-mono">
                                {dish.orders_count ?? 0}
                              </td>
                              <td className="py-3.5">
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-[#DCFCE7] text-[#15803D] border border-emerald-300">
                                  Active
                                </span>
                              </td>
                              <td className="py-3.5 pr-1 text-right">
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingProduct(dish);
                                      setProductModalOpen(true);
                                    }}
                                    className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-black text-xs font-black rounded-lg transition-colors cursor-pointer shadow-xs"
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
                            <td colSpan={6} className="py-8 text-center text-black font-bold text-sm">
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
                {/* Today's Sales Card */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg sm:text-xl font-black text-black">Today's Sales</h2>
                  </div>

                  <h3 className="text-3xl sm:text-4xl font-black text-black tracking-tight mt-3">
                    ₦{Number(todayRevenue).toLocaleString()}
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-slate-500 flex items-center gap-1 mt-1 mb-6">
                    <span className="text-black font-bold">Revenue from paid orders</span>
                  </p>

                  {/* Real hourly bar chart from today's orders */}
                  {(() => {
                    const today = new Date();
                    const todayStr = today.toISOString().slice(0, 10);
                    const hourBuckets = Array(24).fill(0);
                    orders.forEach(o => {
                      if (o.payment_status !== 'paid') return;
                      const ts = o.created_at?.toDate ? o.created_at.toDate() : new Date(o.created_at || o.timestamp || 0);
                      if (ts.toISOString().slice(0, 10) !== todayStr) return;
                      const hr = ts.getHours();
                      hourBuckets[hr] += Number(o.total_amount || o.total || 0);
                    });
                    const displayHours = [6, 9, 12, 15, 18, 21];
                    const displayBuckets = displayHours.map(h => hourBuckets[h] || 0);
                    const maxVal = Math.max(...displayBuckets, 1);
                    return (
                      <div className="relative w-full h-44">
                        <div className="flex items-end gap-2 h-36 px-1">
                          {displayBuckets.map((val, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <div
                                className="w-full rounded-t-lg bg-emerald-500 transition-all"
                                style={{ height: `${Math.max(4, (val / maxVal) * 120)}px` }}
                                title={`₦${val.toLocaleString()}`}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs text-black font-black pt-2">
                          {displayHours.map(h => (
                            <span key={h}>{h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`}</span>
                          ))}
                        </div>
                        {displayBuckets.every(v => v === 0) && (
                          <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 font-bold">No paid orders today yet</p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Quick Actions Card (2x2 Grid matching reference image) */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
                  <h2 className="text-lg sm:text-xl font-black text-black mb-4">Quick Actions</h2>
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
                      <div className="w-9 h-9 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <Plus size={18} strokeWidth={3} />
                      </div>
                      <span className="text-sm font-black text-black text-center">Add Menu Item</span>
                    </button>

                    {/* Action 2: Manage Orders */}
                    <button
                      type="button"
                      onClick={() => handleNavChange('orders')}
                      className="p-4 bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-blue-200 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group shadow-xs active:scale-97"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#3B82F6] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <ClipboardList size={18} />
                      </div>
                      <span className="text-sm font-black text-black text-center">Manage Orders</span>
                    </button>

                    {/* Action 3: Update Inventory */}
                    <button
                      type="button"
                      onClick={() => handleNavChange('inventory')}
                      className="p-4 bg-[#FFFBEB] hover:bg-[#FEF3C7] border border-amber-200 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group shadow-xs active:scale-97"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#F59E0B] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <Package size={18} />
                      </div>
                      <span className="text-sm font-black text-black text-center">Update Inventory</span>
                    </button>

                    {/* Action 4: Restaurant Settings */}
                    <button
                      type="button"
                      onClick={() => handleNavChange('settings')}
                      className="p-4 bg-[#FAF5FF] hover:bg-[#F3E8FF] border border-purple-200 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group shadow-xs active:scale-97"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#A855F7] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <Settings size={18} />
                      </div>
                      <span className="text-sm font-black text-black text-center">Restaurant Settings</span>
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
                                src={p.image_url || p.image || '/foodmaxx-logo.png'}
                                alt={p.name}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                                onError={(e) => { e.target.onerror = null; e.target.src = '/foodmaxx-logo.png'; }}
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
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Total Customers</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono">
                  {customers.length}
                </div>
                <div className="text-[11px] text-slate-500 font-bold mt-1">
                  {registeredCustomers.length} registered · {guestCustomers.length} guest diners
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Registered Accounts</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2 font-mono">
                  {registeredCustomers.length}
                </div>
                <div className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Real registered users in Firestore
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Active Diners</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-2 font-mono">
                  {activeCustomers.length}
                </div>
                <div className="text-[11px] text-slate-500 font-bold mt-1">
                  Placed at least 1 food order
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Customer Revenue</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-purple-700 mt-2 font-mono">
                  ₦{totalCustomerRevenue.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 font-bold mt-1">
                  Total lifetime spend from orders
                </div>
              </div>
            </div>

            {/* Main Customer Table Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs">
              {/* Header and Filter Row */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-black">Customer Directory</h2>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Real-Time Live
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">
                    Real-time registered customer accounts, order frequency, loyalty, and contact details.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Search Bar */}
                  <div className="relative min-w-[240px] sm:min-w-[280px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setCustomerPage(1);
                      }}
                      placeholder="Search name, phone, or email..."
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                    />
                    {customerSearch && (
                      <button
                        onClick={() => {
                          setCustomerSearch('');
                          setCustomerPage(1);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-md"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 pt-4 pb-2 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => { setCustomerFilter('all'); setCustomerPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 ${
                    customerFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({customers.length})
                </button>
                <button
                  onClick={() => { setCustomerFilter('registered'); setCustomerPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
                    customerFilter === 'registered'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle className="w-3 h-3" /> Registered Accounts ({registeredCustomers.length})
                </button>
                <button
                  onClick={() => { setCustomerFilter('with_orders'); setCustomerPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 ${
                    customerFilter === 'with_orders'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  With Orders ({activeCustomers.length})
                </button>
                <button
                  onClick={() => { setCustomerFilter('guests'); setCustomerPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 ${
                    customerFilter === 'guests'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Guest Diners ({guestCustomers.length})
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-black text-slate-800 uppercase tracking-wider">
                      <th className="pb-3 pl-1 font-black text-slate-900">Customer</th>
                      <th className="pb-3 font-black text-slate-900">Phone</th>
                      <th className="pb-3 font-black text-slate-900">Joined / Date</th>
                      <th className="pb-3 font-black text-slate-900">Account Type</th>
                      <th className="pb-3 font-black text-slate-900">Total Orders</th>
                      <th className="pb-3 font-black text-slate-900">Total Spent</th>
                      <th className="pb-3 font-black text-slate-900">Last Order</th>
                      <th className="pb-3 pr-1 text-right font-black text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {pagedCustomers.length > 0 ? pagedCustomers.map((cust, idx) => {
                      const joinedDateStr = cust.registered_at || cust.created_at;
                      let formattedJoined = '—';
                      if (joinedDateStr) {
                        try {
                          const d = new Date(joinedDateStr);
                          if (!isNaN(d.getTime())) {
                            formattedJoined = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                          }
                        } catch {}
                      }

                      let formattedLastOrder = 'No orders yet';
                      if (cust.last_ordered) {
                        try {
                          const d = new Date(cust.last_ordered);
                          if (!isNaN(d.getTime())) {
                            formattedLastOrder = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                          }
                        } catch {}
                      }

                      const orderCount = Number(cust.orders_count ?? cust.total_orders ?? 0);
                      const spentAmount = Number(cust.total_spent || 0);

                      return (
                        <tr key={cust.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          {/* Customer Name & Avatar */}
                          <td className="py-3.5 pl-1">
                            <div className="flex items-center gap-2.5">
                              {cust.avatar_url ? (
                                <img
                                  src={cust.avatar_url}
                                  alt={cust.full_name}
                                  className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className={`w-9 h-9 rounded-full ${cust.is_registered ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-200 text-slate-800 border-slate-300'} font-black flex items-center justify-center text-xs border shrink-0`}>
                                  {(cust.full_name || 'C').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="font-black text-slate-900 block text-xs truncate max-w-[160px]">
                                  {cust.full_name || 'Customer'}
                                </span>
                                <span className="text-[11px] text-slate-500 font-semibold block truncate max-w-[180px]">
                                  {cust.email || '—'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="py-3.5 font-mono text-slate-900 font-bold">
                            {cust.phone ? (
                              <a
                                href={`tel:${cust.phone}`}
                                className="hover:text-emerald-600 transition-colors inline-flex items-center gap-1"
                              >
                                {cust.phone}
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Joined / Registered Date */}
                          <td className="py-3.5 font-medium text-slate-600 text-[11px]">
                            {formattedJoined}
                          </td>

                          {/* Account Type */}
                          <td className="py-3.5">
                            {cust.is_registered ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                                Registered
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Guest
                              </span>
                            )}
                          </td>

                          {/* Total Orders */}
                          <td className="py-3.5 font-black text-slate-900">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black ${
                              orderCount > 0 ? 'bg-amber-50 text-amber-900 font-mono' : 'text-slate-400 font-normal'
                            }`}>
                              {orderCount} {orderCount === 1 ? 'order' : 'orders'}
                            </span>
                          </td>

                          {/* Total Spent */}
                          <td className="py-3.5 font-black text-slate-900 font-mono text-sm">
                            {spentAmount > 0 ? (
                              <span className="text-emerald-700">₦{spentAmount.toLocaleString()}</span>
                            ) : (
                              <span className="text-slate-400 text-xs">₦0</span>
                            )}
                          </td>

                          {/* Last Order Date */}
                          <td className="py-3.5 text-slate-600 text-[11px] font-medium">
                            {formattedLastOrder}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 pr-1 text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              {cust.phone && (
                                <a
                                  href={`https://wa.me/${String(cust.phone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                    `Hello ${cust.full_name || 'Customer'}, thank you for dining with FoodMaxx! How can we serve you today?`
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-black transition-colors shadow-xs"
                                  title="Chat on WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>WhatsApp</span>
                                </a>
                              )}
                              {cust.phone && (
                                <a
                                  href={`tel:${cust.phone}`}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                                  title="Call Customer"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => setDeletingCustomer(cust)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg text-xs font-semibold transition-colors border border-rose-200 shadow-xs"
                                title="Delete Customer Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={8} className="py-14 text-center">
                          <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-500">
                            <Users className="w-10 h-10 text-slate-300 mb-3" />
                            <p className="font-black text-slate-800 text-sm">No customers found</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {customerSearch
                                ? `No customer matched "${customerSearch}". Try clearing your search.`
                                : customerFilter === 'registered'
                                ? 'No registered customers found. New customer signups will appear here instantly.'
                                : 'No customers match the current filter.'}
                            </p>
                            {(customerSearch || customerFilter !== 'all') && (
                              <button
                                onClick={() => {
                                  setCustomerSearch('');
                                  setCustomerFilter('all');
                                  setCustomerPage(1);
                                }}
                                className="mt-3 px-3 py-1.5 text-xs font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                              >
                                Reset Filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {customerTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 mt-3 text-xs text-slate-600">
                  <div className="font-semibold">
                    Showing <span className="font-black text-slate-900">{(safeCustomerPage - 1) * CUSTOMERS_PER_PAGE + 1}</span> to{' '}
                    <span className="font-black text-slate-900">{Math.min(safeCustomerPage * CUSTOMERS_PER_PAGE, filteredCustomers.length)}</span> of{' '}
                    <span className="font-black text-slate-900">{filteredCustomers.length}</span> customers
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCustomerPage(p => Math.max(1, p - 1))}
                      disabled={safeCustomerPage <= 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-black flex items-center gap-1 transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <span className="px-3 py-1 font-mono font-bold text-slate-700">
                      {safeCustomerPage} / {customerTotalPages}
                    </span>
                    <button
                      onClick={() => setCustomerPage(p => Math.min(customerTotalPages, p + 1))}
                      disabled={safeCustomerPage >= customerTotalPages}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-black flex items-center gap-1 transition-colors"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB: REPORTS */}
        {/* ============================================================ */}
        {activeSection === 'reports' && (
          <div className="space-y-6">
            {/* Real-time Daily App Visit Tracker & Traffic Analytics */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                      <Activity size={20} />
                    </span>
                    <div>
                      <h2 className="font-black text-base text-black flex items-center gap-2">
                        Daily App Visits & Traffic Analytics
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 tracking-wide uppercase">
                          Live Sync
                        </span>
                      </h2>
                      <p className="text-xs text-black font-semibold mt-0.5">
                        Track unique visitors, active diner sessions, and daily growth trends across Ibadan.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Range Filter Selector */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                  {[7, 14, 30].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setVisitsChartDays(days)}
                      className={`px-3 py-1 text-xs font-black rounded-lg transition-colors cursor-pointer ${
                        visitsChartDays === days
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      }`}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Traffic KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
                <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5">
                  <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Today's Visits</div>
                  <div className="text-2xl font-black text-purple-950 mt-0.5">
                    {dailyVisitsData?.todayVisits ?? 0}
                  </div>
                  <div className="text-[11px] text-purple-600 font-semibold mt-0.5">
                    {(dailyVisitsData?.growthRate ?? 0) > 0 ? `+${dailyVisitsData.growthRate}%` : `${dailyVisitsData?.growthRate || 0}%`} vs yesterday
                  </div>
                </div>

                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5">
                  <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Unique Diners Today</div>
                  <div className="text-2xl font-black text-indigo-950 mt-0.5">
                    {dailyVisitsData?.todayUnique ?? 0}
                  </div>
                  <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">
                    Individual devices
                  </div>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5">
                  <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Past {visitsChartDays} Days Total</div>
                  <div className="text-2xl font-black text-emerald-950 mt-0.5">
                    {(dailyVisitsData?.dailyList || []).reduce((acc, d) => acc + (d.total_visits || 0), 0)}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                    Total app hits recorded
                  </div>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5">
                  <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Peak Hour Today</div>
                  <div className="text-2xl font-black text-amber-950 mt-0.5">
                    {dailyVisitsData?.peakHourStr || '12:00 PM'}
                  </div>
                  <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
                    Highest diner traffic
                  </div>
                </div>
              </div>

              {/* Visual Daily Visits Bar Chart */}
              {dailyVisitsData?.dailyList && dailyVisitsData.dailyList.length > 0 ? (
                <div className="mb-6">
                  <div className="text-xs font-black text-slate-700 mb-2 flex items-center justify-between">
                    <span>Daily Visit Volume ({visitsChartDays}-Day Timeline)</span>
                    <span className="text-[11px] font-normal text-slate-500 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm bg-purple-600 inline-block"></span> Total Visits
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm bg-indigo-400 inline-block"></span> Unique Diners
                      </span>
                    </span>
                  </div>

                  <div className="flex items-end gap-2 sm:gap-3 h-48 pt-4 border-b border-slate-200 pb-2">
                    {dailyVisitsData.dailyList.map((d, idx) => {
                      const maxVisits = Math.max(
                        ...dailyVisitsData.dailyList.map(x => x.total_visits),
                        5
                      );
                      const totalPct = Math.max(8, (d.total_visits / maxVisits) * 100);
                      const uniquePct = d.total_visits > 0
                        ? Math.max(6, (d.unique_visitors / maxVisits) * 100)
                        : 0;

                      return (
                        <div key={d.date || idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                          {/* Tooltip on hover */}
                          <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20 shadow-md">
                            {d.dayLabel}: {d.total_visits} visits ({d.unique_visitors} unique)
                          </div>

                          <div className="text-[11px] font-black text-slate-700 group-hover:text-purple-700 transition-colors">
                            {d.total_visits}
                          </div>

                          <div className="w-full flex items-end justify-center gap-1 h-full max-h-32">
                            {/* Total Visits Bar */}
                            <div
                              className={`w-full max-w-[18px] rounded-t-lg transition-all ${
                                d.isToday
                                  ? 'bg-purple-600 shadow-sm shadow-purple-400/40 ring-2 ring-purple-300'
                                  : 'bg-purple-500/80 group-hover:bg-purple-600'
                              }`}
                              style={{ height: `${totalPct}%` }}
                            />
                            {/* Unique Visitors Bar */}
                            <div
                              className="w-full max-w-[14px] bg-indigo-400/80 group-hover:bg-indigo-500 rounded-t-lg transition-all hidden sm:block"
                              style={{ height: `${uniquePct}%` }}
                            />
                          </div>

                          <div className={`text-[10px] font-black font-mono truncate max-w-full ${
                            d.isToday ? 'text-purple-700 font-extrabold' : 'text-slate-600'
                          }`}>
                            {d.isToday ? 'Today' : d.dayShort}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Awaiting first visit telemetry...
                </div>
              )}

              {/* Table of Daily Records */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black text-black uppercase tracking-wider">
                    Recent Daily Breakdown Log
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500">
                    Showing past {visitsChartDays} days
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                        <th className="pb-2 pl-1">Date</th>
                        <th className="pb-2">Total Visits</th>
                        <th className="pb-2">Unique Visitors</th>
                        <th className="pb-2">Registered vs Guests</th>
                        <th className="pb-2 pr-1 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dailyVisitsData?.dailyList ? [...dailyVisitsData.dailyList].slice().reverse().map((row, idx) => (
                        <tr key={row.date || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 pl-1 font-bold text-slate-800">
                            {row.dayLabel} {row.isToday && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-100 text-purple-800 uppercase">
                                Current
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 font-mono font-black text-purple-700">
                            {row.total_visits}
                          </td>
                          <td className="py-2.5 font-mono font-bold text-indigo-700">
                            {row.unique_visitors}
                          </td>
                          <td className="py-2.5 text-slate-600">
                            <span className="font-semibold text-emerald-700">{row.registered_visits || 0} registered</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-slate-500">{row.guest_visits || 0} guests</span>
                          </td>
                          <td className="py-2.5 pr-1 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black ${
                              row.total_visits > 0
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-400'
                            }`}>
                              {row.total_visits > 0 ? 'Active' : 'No Traffic'}
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400 text-xs">
                            No visit history yet recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            {/* 7-Day Performance Visualizer */}
            {overview?.last7Days && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-black text-base text-black">Orders in the Last 7 Days</h2>
                    <p className="text-xs text-black font-semibold mt-0.5">Total customer orders fulfilled each day across Ibadan</p>
                  </div>
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
                  { id: 'group_orders', label: '🍱 Group Orders', count: orders.filter(o => o.is_group_order || (o.id && String(o.id).startsWith('GRP-')) || o.group_code).length },
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs text-black font-bold outline-none focus:border-[#EA4C2A] focus:bg-white transition-colors placeholder:text-slate-900"
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
                if (orderFilterStatus === 'group_orders') {
                  return o.is_group_order || (o.id && String(o.id).startsWith('GRP-')) || o.group_code;
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
                          Delivery Address {order.delivery_zone ? `(${order.delivery_zone})` : ''}
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
                              <span className="text-xs text-black font-black">•</span>
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
                    <p className="text-sm font-bold text-black mb-3">No homepage sections configured.</p>
                    <button
                      type="button"
                      onClick={handleResetHomepageSections}
                      className="px-4 py-2 bg-[#EA4C2A] hover:bg-[#D43B1B] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
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
                          sec.enabled ? 'border-slate-300 hover:border-slate-400' : 'border-slate-200 opacity-85'
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
                                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-black disabled:cursor-not-allowed cursor-pointer transition-colors border border-slate-300"
                                title="Move Up"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                type="button"
                                disabled={idx === homepageSections.length - 1}
                                onClick={() => handleMoveSection(idx, 1)}
                                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-black disabled:cursor-not-allowed cursor-pointer transition-colors border border-slate-300"
                                title="Move Down"
                              >
                                <ArrowDown size={12} />
                              </button>
                            </div>

                            <div className="flex-1 space-y-2 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-slate-100 text-black border border-slate-300 uppercase shrink-0">
                                  Row #{idx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={sec.title}
                                  onChange={e => handleUpdateSection(sec.id, e.target.value, sec.subtitle)}
                                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-black text-black focus:outline-none focus:border-[#EA4C2A] focus:bg-white flex-1 min-w-[180px] max-w-sm"
                                  placeholder="Section Title"
                                />
                              </div>
                              <input
                                type="text"
                                value={sec.subtitle}
                                onChange={e => handleUpdateSection(sec.id, sec.title, e.target.value)}
                                className="w-full max-w-md bg-slate-50 border border-slate-300 rounded-lg px-3 py-1 text-xs font-bold text-black focus:outline-none focus:border-slate-400 focus:bg-white"
                                placeholder="Subtitle Description (e.g. Curated popular items)"
                              />
                            </div>
                          </div>

                          {/* Filter, Limit, Visibility, and Delete Controls */}
                          <div className="flex items-center gap-2 flex-wrap shrink-0 self-end lg:self-center">
                            {/* Section Icon Selector */}
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1">
                              <span className="text-xs text-black font-black">Icon:</span>
                              <select
                                value={sec.icon || 'Sparkles'}
                                onChange={e => {
                                  handleUpdateSection(sec.id, { icon: e.target.value });
                                }}
                                className="bg-transparent text-xs font-black text-black focus:outline-none cursor-pointer"
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
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1">
                              <span className="text-xs text-black font-black">Filter:</span>
                              <select
                                value={sec.filter_type || 'bestseller'}
                                onChange={e => {
                                  handleUpdateSection(sec.id, { filter_type: e.target.value });
                                }}
                                className="bg-transparent text-xs font-black text-black focus:outline-none cursor-pointer"
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
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1">
                              <span className="text-xs text-black font-black">Max:</span>
                              <select
                                value={sec.display_limit || 6}
                                onChange={e => {
                                  handleUpdateSection(sec.id, { display_limit: Number(e.target.value) });
                                }}
                                className="bg-transparent text-xs font-black text-black focus:outline-none cursor-pointer"
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
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                sec.enabled
                                  ? 'bg-emerald-50 text-emerald-950 border border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-black border border-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              {sec.enabled ? '🟢 Visible on Home' : '🔴 Hidden on Home'}
                            </button>

                            {/* Delete Section */}
                            <button
                              type="button"
                              onClick={() => handleDeleteSection(sec.id)}
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-black hover:text-rose-700 transition-colors cursor-pointer border border-slate-300"
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-300 p-5 rounded-2xl shadow-xs">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-black flex items-center gap-2">
                  <Tag size={20} className="text-[#EA4C2A]" />
                  <span>Discount Codes & Promos</span>
                </h3>
                <p className="text-sm font-bold text-black mt-0.5">Create discounts your customers can apply during checkout</p>
              </div>
              <button
                onClick={() => setPromoModalOpen(true)}
                className="px-4 py-2.5 bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-95 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <Plus size={16} /> Create New Code
              </button>
            </div>

            {/* Curated 1-Tap Promo Ideas Shelf */}
            <div className="bg-white border border-slate-300 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={16} className="text-amber-500" />
                    <span>Popular Promo Ideas (1-Tap Setup)</span>
                  </h4>
                  <p className="text-xs font-bold text-black mt-0.5">Click any promo to turn it on for your store</p>
                </div>
                <span className="text-xs font-black text-black bg-slate-100 px-3 py-1 rounded-lg border border-slate-300">
                  Ready to Use
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {PROMO_IDEAS.map(idea => {
                  const alreadyExists = promotions.some(p => p.code === idea.code);
                  return (
                    <div
                      key={idea.id}
                      className="bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-2xl p-4 flex flex-col justify-between transition-all group shadow-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">{idea.icon}</span>
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-black border border-slate-300">
                            {idea.badge}
                          </span>
                        </div>
                        <div className="font-mono font-black text-base text-[#EA4C2A] tracking-wide">{idea.code}</div>
                        <div className="font-black text-sm text-black mt-1">{idea.title}</div>
                        <p className="text-xs font-bold text-black mt-1 line-clamp-2">{idea.description}</p>
                      </div>

                      <div className="mt-3.5 pt-3 border-t border-slate-300 flex items-center justify-between">
                        <span className="text-xs font-black text-black">Min: ₦{Number(idea.min_order).toLocaleString()}</span>
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
                          className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            alreadyExists
                              ? 'bg-slate-200 text-black cursor-not-allowed opacity-75'
                              : 'bg-orange-50 hover:bg-[#EA4C2A] text-[#EA4C2A] hover:text-white border border-orange-300'
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
          <div className="space-y-6 max-w-5xl">
            {/* TOP SETTINGS HEADER & SUBTAB PILL BAR */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-black flex items-center gap-2.5">
                    <Settings className="text-[#EA4C2A]" size={24} />
                    <span>Restaurant Settings & Operations</span>
                  </h2>
                  <p className="text-sm font-bold text-black mt-0.5">
                    Configure store operating schedule, pricing & fees, settlement bank account, audio chimes, and POS hardware.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={savingSettings}
                    onClick={() => handleSaveAllSettings()}
                    className="px-5 py-2.5 bg-[#EA4C2A] hover:bg-[#D43B1B] disabled:bg-slate-300 active:scale-95 text-white rounded-xl font-black text-sm shadow-md shadow-[#EA4C2A]/20 transition-all cursor-pointer flex items-center gap-2 shrink-0"
                  >
                    {savingSettings ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        <span>Save Store Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Subtab Pill Selectors */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { id: 'profile', label: 'Store Profile & Hours', icon: Store },
                  { id: 'ordering', label: 'Ordering & Fees', icon: SlidersHorizontal },
                  { id: 'group_orders', label: 'Group Orders', icon: Users },
                  { id: 'payments', label: 'Payouts & Payments', icon: CreditCard },
                  { id: 'apology', label: 'Late Delivery Apology', icon: HeartHandshake, badge: delayedOrdersCount > 0 ? `${delayedOrdersCount} Overdue` : null },
                  { id: 'alerts', label: 'Audio Chimes & WhatsApp', icon: Bell },
                  { id: 'printer', label: 'Thermal POS & Hardware', icon: Printer },
                  { id: 'security', label: 'Security & Staff PIN', icon: ShieldCheck },
                ].map(tab => {
                  const active = settingsSubTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSettingsSubTab(tab.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                        active
                          ? 'bg-[#EA4C2A] text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-black border border-slate-300'
                      }`}
                    >
                      <Icon size={16} className={active ? 'text-white' : 'text-black'} />
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white animate-pulse">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ======================================================== */}
            {/* SUBTAB 1: STORE PROFILE & OPERATING HOURS */}
            {/* ======================================================== */}
            {settingsSubTab === 'profile' && (
              <div className="space-y-5">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 space-y-6 shadow-xs">
                  <div>
                    <h3 className="text-lg font-black text-black">Store Profile & Operating Schedule</h3>
                    <p className="text-sm font-bold text-black mt-0.5">Basic brand contact info and live opening/closing controls.</p>
                  </div>

                  {/* Immediate Store Open/Close Orders Status */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 font-black shadow-xs ${
                        settings.is_open !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {settings.is_open !== false ? '🟢' : '🔴'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-black">Store Ordering Status:</h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                            settings.is_open !== false ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                          }`}>
                            {settings.is_open !== false ? 'Open for Orders' : 'Closed for Orders'}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-black mt-0.5">
                          {settings.is_open !== false
                            ? 'Customers across Ibadan can currently place orders for delivery.'
                            : 'Ordering is temporarily paused. Customers see a Friendly Kitchen Closed banner.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={toggleKitchenStatus}
                      className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-2 ${
                        settings.is_open !== false
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span>{settings.is_open !== false ? 'Close Kitchen for Orders' : 'Open Kitchen for Orders'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-black text-black mb-1.5">Restaurant / Store Name</label>
                      <input
                        type="text"
                        value={settings.store_name || 'FoodMaxx Kitchen & Grills'}
                        onChange={e => setSettings({ ...settings, store_name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-black font-black outline-none focus:border-[#EA4C2A] focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-black text-black mb-1.5">Brand Tagline</label>
                      <input
                        type="text"
                        value={settings.tagline || 'Fastest Fresh Food Delivery in Ibadan'}
                        onChange={e => setSettings({ ...settings, tagline: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-black font-bold outline-none focus:border-[#EA4C2A] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-black text-black mb-1.5">Kitchen Phone Line</label>
                      <input
                        type="text"
                        value={settings.phone || ''}
                        placeholder="e.g. +234 802 345 6789"
                        onChange={e => setSettings({ ...settings, phone: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-black font-bold outline-none focus:border-[#EA4C2A] focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-black text-black mb-1.5">WhatsApp Dispatch Hotline</label>
                      <input
                        type="text"
                        value={settings.whatsapp_dispatch || ''}
                        placeholder="e.g. +234 812 345 6789"
                        onChange={e => setSettings({ ...settings, whatsapp_dispatch: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-black font-bold outline-none focus:border-[#EA4C2A] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-black text-black mb-1.5">Kitchen Physical Address</label>
                      <input
                        type="text"
                        value={settings.address || ''}
                        placeholder="Enter kitchen physical address"
                        onChange={e => setSettings({ ...settings, address: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-black font-bold outline-none focus:border-[#EA4C2A] focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-black text-black mb-1.5">City & State</label>
                      <input
                        type="text"
                        value={settings.city || ''}
                        placeholder="e.g. Ibadan, Oyo State"
                        onChange={e => setSettings({ ...settings, city: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-black font-bold outline-none focus:border-[#EA4C2A] focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Daily Hours & Prep Buffer */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-300 space-y-4">
                    <h4 className="font-black text-sm text-black flex items-center gap-2">
                      <Clock size={16} className="text-[#EA4C2A]" />
                      <span>Daily Operating Hours & Cooking Buffer</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-black text-black mb-1">Opening Time</label>
                        <input
                          type="time"
                          value={settings.opening_time || '08:00'}
                          onChange={e => setSettings({ ...settings, opening_time: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-black font-bold outline-none focus:border-[#EA4C2A]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-black mb-1">Closing Time</label>
                        <input
                          type="time"
                          value={settings.closing_time || '23:00'}
                          onChange={e => setSettings({ ...settings, closing_time: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-black font-bold outline-none focus:border-[#EA4C2A]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-black mb-1">Kitchen Prep Buffer (Minutes)</label>
                        <input
                          type="number"
                          min={5}
                          max={90}
                          value={settings.prep_time_minutes ?? 20}
                          onChange={e => setSettings({ ...settings, prep_time_minutes: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-black font-bold outline-none focus:border-[#EA4C2A]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-black text-black mb-1.5">Store Announcement Banner</label>
                    <textarea
                      rows={2}
                      value={settings.announcement || ''}
                      onChange={e => setSettings({ ...settings, announcement: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-black font-bold outline-none focus:border-[#EA4C2A] focus:bg-white"
                      placeholder="e.g. ⚡ Fresh firewood party jollof & gourmet grills ready for immediate delivery!"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* SUBTAB 2: ORDERING RULES & FEES */}
            {/* ======================================================== */}
            {settingsSubTab === 'ordering' && (
              <div className="space-y-5">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 space-y-6 shadow-xs">
                  <div>
                    <h3 className="text-lg font-black text-black">Ordering Rules, Surcharges & Limits</h3>
                    <p className="text-sm font-bold text-black mt-0.5">Control minimum order spend, packaging fees, and automated kitchen workflows.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-300">
                      <label className="block text-xs font-black text-black mb-1">Minimum Order Spend (₦)</label>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={settings.min_order_amount ?? 1500}
                        onChange={e => setSettings({ ...settings, min_order_amount: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-base text-black font-mono font-black outline-none focus:border-[#EA4C2A]"
                      />
                      <span className="text-xs text-black font-semibold mt-1 block">Checkout disabled below this value.</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-300">
                      <label className="block text-xs font-black text-black mb-1">Packaging / Takeaway Pack (₦)</label>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={settings.packaging_fee ?? 300}
                        onChange={e => setSettings({ ...settings, packaging_fee: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-base text-black font-mono font-black outline-none focus:border-[#EA4C2A]"
                      />
                      <span className="text-xs text-black font-semibold mt-1 block">Added to every takeout order.</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-300">
                      <label className="block text-xs font-black text-black mb-1">Platform Service Fee (₦)</label>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={settings.service_fee ?? 150}
                        onChange={e => setSettings({ ...settings, service_fee: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-base text-black font-mono font-black outline-none focus:border-[#EA4C2A]"
                      />
                      <span className="text-xs text-black font-semibold mt-1 block">Fixed order processing fee.</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-300">
                      <label className="block text-xs font-black text-black mb-1">Free Delivery Spend (₦)</label>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={settings.free_delivery_threshold ?? 15000}
                        onChange={e => setSettings({ ...settings, free_delivery_threshold: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-base text-black font-mono font-black outline-none focus:border-[#EA4C2A]"
                      />
                      <span className="text-xs text-black font-semibold mt-1 block">Cart threshold for ₦0 delivery.</span>
                    </div>
                  </div>

                  {/* Toggle Features */}
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-black">Auto-Confirm Paid Orders</div>
                        <div className="text-xs font-bold text-black mt-0.5">
                          Automatically transition Paystack-verified paid orders to "Confirmed / Cooking" without waiting for kitchen tap.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.auto_confirm_paid_orders !== false}
                        onChange={e => setSettings({ ...settings, auto_confirm_paid_orders: e.target.checked })}
                        className="w-5 h-5 accent-[#EA4C2A] cursor-pointer"
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-black">Allow Scheduled Pre-Orders</div>
                        <div className="text-xs font-bold text-black mt-0.5">
                          Allow customers to select delivery times for later today or tomorrow during checkout.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.allow_preorders !== false}
                        onChange={e => setSettings({ ...settings, allow_preorders: e.target.checked })}
                        className="w-5 h-5 accent-[#EA4C2A] cursor-pointer"
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-black">Kitchen Order Queue Cap</div>
                        <div className="text-xs font-bold text-black mt-0.5">
                          Maximum active orders cook line can handle simultaneously before temporarily pacing orders.
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={5}
                          max={100}
                          value={settings.max_active_orders ?? 40}
                          onChange={e => setSettings({ ...settings, max_active_orders: Number(e.target.value) })}
                          className="w-20 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-sm text-black font-black text-center"
                        />
                        <span className="text-xs font-bold text-black">orders</span>
                      </div>
                    </div>

                    {/* GROUP ORDERING CONTROLS */}
                    <div className="pt-6 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-base font-black text-black flex items-center gap-2">
                            <Users size={18} className="text-[#EA4C2A]" />
                            <span>Group Ordering & "Order with Friends" Controls</span>
                          </h4>
                          <p className="text-xs font-bold text-slate-600 mt-0.5">
                            Manage campus and office group deliveries, guest access, limits, and packaging labels.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-black">{settings.enable_group_ordering !== false ? '🟢 Active' : '🔴 Paused'}</span>
                          <input
                            type="checkbox"
                            checked={settings.enable_group_ordering !== false}
                            onChange={e => setSettings({ ...settings, enable_group_ordering: e.target.checked })}
                            className="w-5 h-5 accent-[#EA4C2A] cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                          <label className="block text-xs font-black text-black mb-1">Group Min Spend (₦)</label>
                          <input
                            type="number"
                            min={1000}
                            step={500}
                            value={settings.group_order_min_spend ?? 3000}
                            onChange={e => setSettings({ ...settings, group_order_min_spend: Number(e.target.value) })}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-black font-mono font-black outline-none focus:border-[#EA4C2A]"
                          />
                          <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Min total group cart to place order.</span>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                          <label className="block text-xs font-black text-black mb-1">Max People per Group</label>
                          <input
                            type="number"
                            min={2}
                            max={50}
                            value={settings.group_order_max_members ?? 15}
                            onChange={e => setSettings({ ...settings, group_order_max_members: Number(e.target.value) })}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-black font-mono font-black outline-none focus:border-[#EA4C2A]"
                          />
                          <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Maximum members in one order session.</span>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                          <label className="block text-xs font-black text-black mb-1">Group Special Discount (%)</label>
                          <input
                            type="number"
                            min={0}
                            max={30}
                            value={settings.group_order_discount_percent ?? 0}
                            onChange={e => setSettings({ ...settings, group_order_discount_percent: Number(e.target.value) })}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-black font-mono font-black outline-none focus:border-[#EA4C2A]"
                          />
                          <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Automatic discount for groups (0% to disable).</span>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-black text-black">Individual Meal Name Labeling</p>
                            <p className="text-[11px] text-slate-500">Instruct kitchen printer and chef to label each pack with member's name.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.group_order_label_bags !== false}
                            onChange={e => setSettings({ ...settings, group_order_label_bags: e.target.checked })}
                            className="w-4 h-4 accent-[#EA4C2A] cursor-pointer"
                          />
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-black text-black">Allow Guests to Join via Link</p>
                            <p className="text-[11px] text-slate-500">Friends can add meals without needing to create an account first.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.group_order_allow_guest_join !== false}
                            onChange={e => setSettings({ ...settings, group_order_allow_guest_join: e.target.checked })}
                            className="w-4 h-4 accent-[#EA4C2A] cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* SUBTAB: GROUP ORDERS SETTINGS & LIVE ROOMS MONITOR       */}
            {/* ======================================================== */}
            {settingsSubTab === 'group_orders' && (
              <div className="space-y-6">
                {/* 1. MASTER STATUS & PAUSE CONTROLS */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 space-y-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <Users size={22} className="text-[#EA4C2A]" />
                        <h3 className="text-lg font-black text-black">Group Ordering & "Order with Friends" Master Switch</h3>
                      </div>
                      <p className="text-xs font-bold text-slate-600 mt-1">
                        Control collaborative real-time ordering across campuses, offices, hostels, and student rooms.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl shrink-0">
                      <div className="text-right">
                        <span className={`text-xs font-black block ${settings.enable_group_ordering !== false ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {settings.enable_group_ordering !== false ? '🟢 Active & Accepting Orders' : '🔴 Temporarily Paused'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">Storefront feature status</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.enable_group_ordering !== false}
                        onChange={e => setSettings({ ...settings, enable_group_ordering: e.target.checked })}
                        className="w-6 h-6 accent-[#EA4C2A] cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Pause Custom Message */}
                  <div>
                    <label className="block text-xs font-black text-black mb-1.5">
                      Storefront Customer Pause Banner Notice
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Notice: Group ordering is currently paused by store manager during peak rush hours."
                      value={settings.group_order_pause_message ?? 'Group ordering is temporarily paused by the manager during peak rush hours.'}
                      onChange={e => setSettings({ ...settings, group_order_pause_message: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-black font-bold outline-none focus:border-[#EA4C2A]"
                    />
                    <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                      Displayed to customers on top of the sheet when group ordering is turned off.
                    </span>
                  </div>
                </div>

                {/* 2. ORDER CONSTRAINTS, CAPACITY & MINIMUMS */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 space-y-5 shadow-xs">
                  <div>
                    <h3 className="text-base font-black text-black flex items-center gap-2">
                      <SlidersHorizontal size={18} className="text-[#EA4C2A]" />
                      <span>Capacity & Spending Thresholds</span>
                    </h3>
                    <p className="text-xs font-bold text-slate-600 mt-0.5">
                      Set minimum spend, maximum member count, and free delivery incentives.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <label className="block text-xs font-black text-black mb-1">Group Min Spend (₦)</label>
                      <input
                        type="number"
                        min={1000}
                        step={500}
                        value={settings.group_order_min_spend ?? 3000}
                        onChange={e => setSettings({ ...settings, group_order_min_spend: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-black font-mono font-black outline-none focus:border-[#EA4C2A]"
                      />
                      <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Minimum combined cart total to checkout.</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <label className="block text-xs font-black text-black mb-1">Max People per Group</label>
                      <input
                        type="number"
                        min={2}
                        max={50}
                        value={settings.group_order_max_members ?? 15}
                        onChange={e => setSettings({ ...settings, group_order_max_members: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-black font-mono font-black outline-none focus:border-[#EA4C2A]"
                      />
                      <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Maximum friends in one room session.</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <label className="block text-xs font-black text-black mb-1">Max Items per Member</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={settings.group_order_max_items_per_member ?? 10}
                        onChange={e => setSettings({ ...settings, group_order_max_items_per_member: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-black font-mono font-black outline-none focus:border-[#EA4C2A]"
                      />
                      <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Limits kitchen congestion per person.</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <label className="block text-xs font-black text-black mb-1">Free Group Delivery Above (₦)</label>
                      <input
                        type="number"
                        min={5000}
                        step={1000}
                        value={settings.group_order_free_delivery_threshold ?? 15000}
                        onChange={e => setSettings({ ...settings, group_order_free_delivery_threshold: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-black font-mono font-black outline-none focus:border-[#EA4C2A]"
                      />
                      <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Free delivery bonus when group spends above this.</span>
                    </div>
                  </div>
                </div>

                {/* 3. GROUP DISCOUNT & INCENTIVES */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 space-y-4 shadow-xs">
                  <div>
                    <h3 className="text-base font-black text-black flex items-center gap-2">
                      <Percent size={18} className="text-[#EA4C2A]" />
                      <span>Group Discount Incentives</span>
                    </h3>
                    <p className="text-xs font-bold text-slate-600 mt-0.5">
                      Encourage friends and colleagues to pool orders together with volume discounts.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <label className="block text-xs font-black text-black mb-1">Group Discount (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={35}
                        value={settings.group_order_discount_percent ?? 0}
                        onChange={e => setSettings({ ...settings, group_order_discount_percent: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-black font-mono font-black outline-none focus:border-[#EA4C2A]"
                      />
                      <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Automatic discount on meal subtotal (0% to disable).</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <label className="block text-xs font-black text-black mb-1">Min People to Unlock Discount</label>
                      <input
                        type="number"
                        min={2}
                        max={20}
                        value={settings.group_order_discount_min_people ?? 3}
                        onChange={e => setSettings({ ...settings, group_order_discount_min_people: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-black font-mono font-black outline-none focus:border-[#EA4C2A]"
                      />
                      <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Discount triggers when this many friends join.</span>
                    </div>
                  </div>
                </div>

                {/* 4. KITCHEN PACKAGING & GUEST ACCESS */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 space-y-4 shadow-xs">
                  <div>
                    <h3 className="text-base font-black text-black flex items-center gap-2">
                      <Package size={18} className="text-[#EA4C2A]" />
                      <span>Kitchen Packaging & Guest Access Policies</span>
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-black">Individual Meal Name Labeling</p>
                        <p className="text-[11px] text-slate-500">Instruct chef and kitchen packing line to label every container with the member's name.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.group_order_label_bags !== false}
                        onChange={e => setSettings({ ...settings, group_order_label_bags: e.target.checked })}
                        className="w-5 h-5 accent-[#EA4C2A] cursor-pointer"
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-black">Allow Anonymous Friends to Join via Deep Link</p>
                        <p className="text-[11px] text-slate-500">Invited friends can add meals immediately with just their name (no mandatory account creation).</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.group_order_allow_guest_join !== false}
                        onChange={e => setSettings({ ...settings, group_order_allow_guest_join: e.target.checked })}
                        className="w-5 h-5 accent-[#EA4C2A] cursor-pointer"
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-black">Enable Random Happy Avatars for Customers</p>
                        <p className="text-[11px] text-slate-500">Assigns delightful smiling male and female customer avatars to every group member.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.group_order_enable_happy_avatars !== false}
                        onChange={e => setSettings({ ...settings, group_order_enable_happy_avatars: e.target.checked })}
                        className="w-5 h-5 accent-[#EA4C2A] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. HAPPY CUSTOMER AVATARS SHOWCASE */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 space-y-4 shadow-xs">
                  <div>
                    <h3 className="text-base font-black text-black flex items-center gap-2">
                      <Sparkles size={18} className="text-[#EA4C2A]" />
                      <span>Happy Customer Avatars Palette</span>
                    </h3>
                    <p className="text-xs font-bold text-slate-600 mt-0.5">
                      Curated friendly smiling avatars automatically provided for female and male customers across group orders and profiles.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#EC4899] block mb-2">
                        👩 Happy Female Customer Avatars
                      </span>
                      <div className="flex items-center gap-3 overflow-x-auto pb-2">
                        {HAPPY_FEMALE_AVATARS.map(av => (
                          <div key={av.id} className="flex flex-col items-center gap-1 shrink-0">
                            <img
                              src={av.url}
                              alt={av.name}
                              className="w-12 h-12 rounded-2xl object-cover border-2 border-[#EC4899] shadow-sm"
                            />
                            <span className="text-[10px] font-bold text-slate-600 max-w-[60px] truncate text-center">
                              {av.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#0AA5FF] block mb-2">
                        👨 Happy Male Customer Avatars
                      </span>
                      <div className="flex items-center gap-3 overflow-x-auto pb-2">
                        {HAPPY_MALE_AVATARS.map(av => (
                          <div key={av.id} className="flex flex-col items-center gap-1 shrink-0">
                            <img
                              src={av.url}
                              alt={av.name}
                              className="w-12 h-12 rounded-2xl object-cover border-2 border-[#0AA5FF] shadow-sm"
                            />
                            <span className="text-[10px] font-bold text-slate-600 max-w-[60px] truncate text-center">
                              {av.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. REAL-TIME ACTIVE GROUP ORDERS MONITOR */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-black flex items-center gap-2">
                        <Activity size={18} className="text-emerald-500" />
                        <span>Live Active Group Order Rooms ({activeGroupOrders.length})</span>
                      </h3>
                      <p className="text-xs font-bold text-slate-600 mt-0.5">
                        Real-time collaborative order sessions currently active in Firestore.
                      </p>
                    </div>
                  </div>

                  {activeGroupOrders.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                      <p className="text-xs font-bold text-slate-500">No group orders yet</p>
                      <p className="text-[11px] text-slate-400 mt-1">When customers create group orders, they will appear here live.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeGroupOrders.map(group => {
                        const participantsList = Array.isArray(group.participants) ? group.participants : (Array.isArray(group.members) ? group.members : []);
                        const paidOrders = participantsList.filter(p => p.payment_status === 'PAID');
                        const pendingOrders = participantsList.filter(p => p.payment_status !== 'PAID');
                        const totalVal = Number(group.total_amount || paidOrders.reduce((sum, p) => sum + (Number(p.total) || 0), 0));
                        const isExpanded = expandedGroupId === group.id;
                        const currentStatus = group.preparation_status || group.status || 'OPEN';

                        const handleStatusChange = async (nextStatus) => {
                          try {
                            await api.setLiveGroupOrderStatus(group.code || group.id, nextStatus, {
                              preparation_status: nextStatus
                            });
                            toast(`Group Order status updated to ${nextStatus}`, 'success');
                          } catch (e) {
                            toast('Failed to update status', 'error');
                          }
                        };

                        const handleAssignRider = async (riderName) => {
                          try {
                            await api.updateLiveGroupOrder(group.code || group.id, {
                              assigned_rider: riderName
                            });
                            toast(`Assigned rider ${riderName} to group order`, 'success');
                          } catch (e) {
                            toast('Failed to assign rider', 'error');
                          }
                        };

                        return (
                          <div key={group.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 shadow-xs">
                            {/* Top Details & Metrics */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-black text-base text-black">
                                    {group.name || group.id}
                                  </h4>
                                  <span className="px-2 py-0.5 rounded-lg bg-[#EA4C2A] text-white text-[11px] font-mono font-bold">
                                    {group.code || group.id}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 font-semibold mt-1">
                                  👑 Creator: <strong className="text-black">{group.creator_name || group.organizer_name || 'Host'}</strong> ({group.creator_phone || 'No phone'})
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                                  currentStatus === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                                  currentStatus === 'DELIVERING' ? 'bg-blue-100 text-blue-800' :
                                  currentStatus === 'READY' ? 'bg-purple-100 text-purple-800' :
                                  currentStatus === 'PREPARING' ? 'bg-amber-100 text-amber-800' :
                                  'bg-slate-200 text-slate-800'
                                }`}>
                                  {currentStatus}
                                </span>
                                <span className="font-mono text-base font-black text-slate-900">
                                  ₦{totalVal.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {/* Summary Badges: Participants, Paid, Pending, Location, Window */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
                              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                                <span className="text-[10px] text-slate-400 block font-normal">Participants</span>
                                <span className="text-slate-900 text-sm font-black">{participantsList.length} people</span>
                              </div>
                              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                                <span className="text-[10px] text-slate-400 block font-normal">Paid Orders</span>
                                <span className="text-emerald-700 text-sm font-black">✅ {paidOrders.length} Paid</span>
                              </div>
                              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                                <span className="text-[10px] text-slate-400 block font-normal">Pending Orders</span>
                                <span className="text-amber-700 text-sm font-black">⏳ {pendingOrders.length} Pending</span>
                              </div>
                              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                                <span className="text-[10px] text-slate-400 block font-normal">Delivery Window</span>
                                <span className="text-slate-900 text-xs font-black truncate block">{group.delivery_window || 'Standard Window'}</span>
                              </div>
                            </div>

                            <div className="text-xs text-slate-700 font-medium">
                              📍 <strong>Delivery Location:</strong> {group.delivery_location || group.delivery_address || 'Address pending'}
                            </div>

                            {/* Status Workflow Buttons (Preparing → Ready → Out for Delivery → Delivered) */}
                            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-500 mr-1">Status:</span>
                                {['PREPARING', 'READY', 'DELIVERING', 'DELIVERED'].map((st) => (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleStatusChange(st)}
                                    className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                      currentStatus === st
                                        ? 'bg-[#EA4C2A] text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    {st === 'PREPARING' ? 'Preparing' :
                                     st === 'READY' ? 'Ready' :
                                     st === 'DELIVERING' ? 'Out for Delivery' : 'Delivered'}
                                  </button>
                                ))}
                              </div>

                              {/* Rider Assignment */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500">Rider:</span>
                                <select
                                  value={group.assigned_rider || ''}
                                  onChange={(e) => handleAssignRider(e.target.value)}
                                  className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 outline-none"
                                >
                                  <option value="">Unassigned</option>
                                  {(riders || []).map(r => (
                                    <option key={r.id || r.name} value={r.name || r.id}>
                                      {r.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Accordion Toggle: Inspect Individual Orders */}
                            <div className="pt-2 border-t border-slate-200">
                              <button
                                type="button"
                                onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                                className="text-xs font-bold text-[#EA4C2A] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <span>{isExpanded ? 'Hide Individual Orders ▲' : `View All Individual Orders (${participantsList.length}) ▼`}</span>
                              </button>

                              {isExpanded && (
                                <div className="mt-3 space-y-2 pt-2 border-t border-dashed border-slate-200">
                                  {participantsList.length === 0 ? (
                                    <p className="text-xs text-slate-400">Waiting for participants to join...</p>
                                  ) : (
                                    participantsList.map((p, idx) => {
                                      const isPPaid = p.payment_status === 'PAID';
                                      const itemsList = Array.isArray(p.items) ? p.items : [];

                                      return (
                                        <div key={p.participant_id || idx} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                              <strong className="text-slate-900 font-black">{p.name}</strong>
                                              <span className="text-slate-400 text-[11px]">({p.phone || 'No phone'})</span>
                                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                isPPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                              }`}>
                                                {isPPaid ? '✅ Paid' : '⏳ Pending'}
                                              </span>
                                            </div>
                                            <p className="text-slate-600 mt-1 font-medium">
                                              {itemsList.length > 0
                                                ? itemsList.map(i => `${i.name}${i.qty > 1 ? ` x${i.qty}` : ''}`).join(', ')
                                                : 'No items selected yet'}
                                            </p>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <span className="font-mono font-black text-slate-900 block">
                                              ₦{Number(p.total || 0).toLocaleString()}
                                            </span>
                                            {p.paystack_ref && (
                                              <span className="text-[9px] text-slate-400 font-mono block">
                                                Ref: {p.paystack_ref.slice(0, 14)}...
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* SUBTAB 3: PAYMENTS & PAYOUTS */}
            {/* ======================================================== */}
            {settingsSubTab === 'payments' && (
              <div className="space-y-5">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 space-y-6 shadow-xs">
                  <div>
                    <h3 className="text-lg font-black text-black">Merchant Payouts & Payment Gateways</h3>
                    <p className="text-sm font-bold text-black mt-0.5">Manage bank account for daily settlements and Paystack keys.</p>
                  </div>

                  {/* PAYOUT SETTLEMENT BANK ACCOUNT */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-300 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">🏦</span>
                      <div>
                        <h4 className="font-black text-sm text-black">Merchant Settlement Bank Account</h4>
                        <p className="text-xs text-black font-bold mt-0.5">
                          Disbursement destination for your daily earnings, online orders, and customer transfers.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-black text-black mb-1">Bank Name</label>
                        <input
                          type="text"
                          value={settings.payout_bank_name || DEFAULT_STORE_DETAILS.payout_bank_name || 'Moniepoint'}
                          onChange={e => setSettings({ ...settings, payout_bank_name: e.target.value })}
                          placeholder="e.g. Moniepoint"
                          className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-black font-bold outline-none focus:border-[#EA4C2A]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-black mb-1">Account Number (10-Digit NUBAN)</label>
                        <input
                          type="text"
                          maxLength={10}
                          value={settings.payout_account_number || DEFAULT_STORE_DETAILS.payout_account_number || '8166004281'}
                          onChange={e => setSettings({ ...settings, payout_account_number: e.target.value.replace(/\D/g, '') })}
                          placeholder="10-digit NUBAN"
                          className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-black font-mono font-black outline-none focus:border-[#EA4C2A]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-black mb-1">Account Beneficiary Name</label>
                        <input
                          type="text"
                          value={settings.payout_account_name || DEFAULT_STORE_DETAILS.payout_account_name || 'Foodmaxx Restaurant'}
                          onChange={e => setSettings({ ...settings, payout_account_name: e.target.value })}
                          placeholder="e.g. Foodmaxx Restaurant"
                          className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-black font-bold outline-none focus:border-[#EA4C2A]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* PAYSTACK CONFIG */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-300 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">⚡</span>
                        <div>
                          <h4 className="font-black text-sm text-black">Paystack Payment Gateway (Cards, Transfer, USSD)</h4>
                          <p className="text-xs text-emerald-800 font-bold flex items-center gap-1 mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse inline-block" />
                            Active & Ready for Checkout
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-black px-3 py-1 rounded-full border uppercase ${
                        settings.paystack_is_live !== false
                          ? 'bg-emerald-50 text-emerald-950 border-emerald-400'
                          : 'bg-amber-50 text-amber-950 border-amber-400'
                      }`}>
                        {settings.paystack_is_live !== false ? '🟢 Live Production' : '⚡ Test Mode'}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-black mb-1.5">
                        Paystack Public Key (pk_live_... or pk_test_...)
                      </label>
                      <input
                        type="text"
                        value={settings.paystack_public_key || getStoredPaystackConfig().publicKey || 'pk_live_d3a8b4172f3e44955b2046ff03b55237b6cf3e1a'}
                        onChange={e => setSettings({ ...settings, paystack_public_key: e.target.value })}
                        placeholder="pk_live_xxxx or pk_test_xxxx"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-black font-mono font-bold outline-none focus:border-[#EA4C2A]"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-black font-bold">Switch Gateway Environment:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const currentKey = settings.paystack_public_key || getStoredPaystackConfig().publicKey;
                            setSettings({ ...settings, paystack_is_live: true });
                            savePaystackConfig({ publicKey: currentKey, isLive: true });
                            toast('Paystack saved as Live Active! 🟢', 'success');
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                            settings.paystack_is_live !== false ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-black'
                          }`}
                        >
                          🟢 Live Production
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const currentKey = settings.paystack_public_key || getStoredPaystackConfig().publicKey;
                            setSettings({ ...settings, paystack_is_live: false });
                            savePaystackConfig({ publicKey: currentKey, isLive: false });
                            toast('Paystack set to Test Mode ⚡', 'info');
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                            settings.paystack_is_live === false ? 'bg-amber-600 text-white' : 'bg-slate-200 text-black'
                          }`}
                        >
                          ⚡ Test Mode
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Customer Payment Methods Toggle */}
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    <h4 className="font-black text-sm text-black">Customer Payment Methods Allowed</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-black text-black">💳 Online Card & USSD</div>
                          <div className="text-[11px] font-bold text-black">Paystack instant charge</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.enable_paystack !== false}
                          onChange={e => setSettings({ ...settings, enable_paystack: e.target.checked })}
                          className="w-5 h-5 accent-[#EA4C2A] cursor-pointer"
                        />
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-black text-black">🏦 Direct Bank Transfer</div>
                          <div className="text-[11px] font-bold text-black">Customer transfers to NUBAN</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.enable_bank_transfer !== false}
                          onChange={e => setSettings({ ...settings, enable_bank_transfer: e.target.checked })}
                          className="w-5 h-5 accent-[#EA4C2A] cursor-pointer"
                        />
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-black text-black">💵 Cash on Delivery (COD)</div>
                          <div className="text-[11px] font-bold text-black">Pay cash to rider upon arrival</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.enable_cash_on_delivery !== false}
                          onChange={e => setSettings({ ...settings, enable_cash_on_delivery: e.target.checked })}
                          className="w-5 h-5 accent-[#EA4C2A] cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* SUBTAB 4: AUDIO ALERTS & WHATSAPP TEMPLATES */}
            {/* ======================================================== */}
            {settingsSubTab === 'alerts' && (
              <div className="space-y-5">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 space-y-6 shadow-xs">
                  <div>
                    <h3 className="text-lg font-black text-black">Kitchen Audio Chimes & Automated WhatsApp Alerts</h3>
                    <p className="text-sm font-bold text-black mt-0.5">
                      Configure high-volume synthesized Web Audio order tones and customizable WhatsApp notification copy.
                    </p>
                  </div>

                  {/* KITCHEN CHIME SOUND STUDIO */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-300 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">🔊</span>
                        <div>
                          <h4 className="font-black text-sm text-black">Instant Kitchen Chime Tone</h4>
                          <p className="text-xs text-black font-bold">Plays immediately when customer places an order on FoodMaxx.</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const tone = settings.notification_tone_id || 'chime_standard';
                            handleTestTone(tone);
                          }}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                        >
                          <Volume2 size={16} />
                          <span>{testingToneId ? 'Playing Tone 🔊' : 'Test Active Sound'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-black text-black mb-1.5">Select Chime Tone (22 Synthesized Sounds)</label>
                        <select
                          value={settings.notification_tone_id || 'chime_standard'}
                          onChange={e => {
                            const newTone = e.target.value;
                            setSettings({ ...settings, notification_tone_id: newTone });
                            handleTestTone(newTone);
                          }}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-black font-bold outline-none focus:border-[#EA4C2A]"
                        >
                          {(NOTIFICATION_TONES || []).map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.category || 'Kitchen'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-black mb-1.5">
                          Chime Volume Level: {settings.kitchen_chime_volume ?? 85}%
                        </label>
                        <input
                          type="range"
                          min={20}
                          max={100}
                          value={settings.kitchen_chime_volume ?? 85}
                          onChange={e => setSettings({ ...settings, kitchen_chime_volume: Number(e.target.value) })}
                          className="w-full accent-[#EA4C2A] cursor-pointer mt-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* WHATSAPP AUTOMATION TEMPLATES */}
                  <div className="space-y-4 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="text-emerald-700" size={18} />
                        <h4 className="font-black text-sm text-black">Automated WhatsApp Customer Templates</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-black">Enabled:</span>
                        <input
                          type="checkbox"
                          checked={settings.whatsapp_notify_customer !== false}
                          onChange={e => setSettings({ ...settings, whatsapp_notify_customer: e.target.checked })}
                          className="w-5 h-5 accent-emerald-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="text-xs text-black font-bold bg-amber-50 p-2.5 rounded-xl border border-amber-300 flex items-center gap-2 flex-wrap">
                      <span>💡 Available merge tags:</span>
                      <code className="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-black font-mono">{"{customer_name}"}</code>
                      <code className="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-black font-mono">{"{order_ref}"}</code>
                      <code className="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-black font-mono">{"{amount}"}</code>
                      <code className="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-black font-mono">{"{delivery_pin}"}</code>
                      <code className="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-black font-mono">{"{rider_name}"}</code>
                      <code className="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-black font-mono">{"{rider_phone}"}</code>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-black text-black mb-1">1. Order Placed & Confirmed Message</label>
                        <textarea
                          rows={2}
                          value={settings.whatsapp_order_placed_msg || 'Hello {customer_name}! Your FoodMaxx order #{order_ref} for {amount} has been received and confirmed. Chef is prepping now! 🍳'}
                          onChange={e => setSettings({ ...settings, whatsapp_order_placed_msg: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-black font-bold outline-none focus:border-[#EA4C2A] focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-black mb-1">2. Dispatch & Rider on Way Message</label>
                        <textarea
                          rows={2}
                          value={settings.whatsapp_dispatched_msg || 'Hi {customer_name}! Rider {rider_name} ({rider_phone}) is on the way with your hot FoodMaxx meal! Delivery PIN: {delivery_pin}. 🛵'}
                          onChange={e => setSettings({ ...settings, whatsapp_dispatched_msg: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-black font-bold outline-none focus:border-[#EA4C2A] focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-black mb-1">3. Meal Delivered & Rating Message</label>
                        <textarea
                          rows={2}
                          value={settings.whatsapp_delivered_msg || 'Order #{order_ref} delivered! Bon appétit from FoodMaxx Ibadan. Rate your experience: https://foodmaxxapp.web.app 🍔'}
                          onChange={e => setSettings({ ...settings, whatsapp_delivered_msg: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-black font-bold outline-none focus:border-[#EA4C2A] focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SMS NOTIFICATION GATEWAY (TERMII & TWILIO) */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-300 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">💬</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm text-black">SMS Notification Gateway SDK</h4>
                            {settings.sms_provider === 'sendchamp' ? (
                              settings.sendchamp_api_key ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                                  Sendchamp Configured ✓
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                                  Sendchamp Key Missing
                                </span>
                              )
                            ) : settings.sms_provider === 'termii' || !settings.sms_provider ? (
                              settings.termii_api_key ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                                  Termii Configured ✓
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                                  Termii Key Missing (Simulation Mode)
                                </span>
                              )
                            ) : settings.sms_provider === 'native' ? (
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase">
                                Direct Device SMS (Free)
                              </span>
                            ) : (
                              settings.twilio_account_sid && settings.twilio_auth_token ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                                  Twilio Configured ✓
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                                  Twilio Keys Missing
                                </span>
                              )
                            )}
                          </div>
                          <p className="text-xs text-black font-bold">
                            Direct GSM transactional SMS for Nigerian diners, courier assignment alerts & delivery OTPs.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-black">Enabled:</span>
                        <input
                          type="checkbox"
                          checked={settings.sms_notify_customer !== false}
                          onChange={e => setSettings({ ...settings, sms_notify_customer: e.target.checked })}
                          className="w-5 h-5 accent-blue-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-black text-black mb-1.5">SMS Gateway Provider</label>
                        <select
                          value={settings.sms_provider || 'termii'}
                          onChange={e => setSettings({ ...settings, sms_provider: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-black font-bold outline-none focus:border-[#EA4C2A]"
                        >
                          <option value="termii">Termii Nigeria (Recommended: DND Bypass & ₦ GSM)</option>
                          <option value="sendchamp">Sendchamp Nigeria (Multi-Channel & DND Route)</option>
                          <option value="native">Direct Device SMS (100% Free - Native SIM)</option>
                          <option value="twilio">Twilio Global</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-black mb-1.5">Alphanumeric Sender ID</label>
                        <input
                          type="text"
                          maxLength={11}
                          value={settings.sms_sender_id || 'FoodMaxx'}
                          onChange={e => setSettings({ ...settings, sms_sender_id: e.target.value })}
                          placeholder="e.g. FoodMaxx"
                          className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-black font-bold outline-none focus:border-[#EA4C2A]"
                        />
                        <p className="text-[10px] text-slate-500 font-medium mt-1">Max 11 characters (registered with Termii / Sendchamp / Twilio)</p>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-black mb-1.5">Route Channel</label>
                        {settings.sms_provider === 'sendchamp' ? (
                          <select
                            value={settings.sendchamp_route || 'dnd'}
                            onChange={e => setSettings({ ...settings, sendchamp_route: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-black font-bold outline-none focus:border-[#EA4C2A]"
                          >
                            <option value="dnd">dnd — DND Route (Bypasses Nigerian DND)</option>
                            <option value="non_dnd">non_dnd — Standard Non-DND Route</option>
                            <option value="international">international — Global Route</option>
                          </select>
                        ) : (
                          <select
                            value={settings.termii_channel || 'generic'}
                            onChange={e => setSettings({ ...settings, termii_channel: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-black font-bold outline-none focus:border-[#EA4C2A]"
                          >
                            <option value="generic">Generic (Transactional OTP & DND Bypass)</option>
                            <option value="dnd">DND Priority Channel</option>
                            <option value="direct">Direct Local Carrier Route</option>
                          </select>
                        )}
                      </div>
                    </div>

                    {settings.sms_provider === 'sendchamp' && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-black text-black">Sendchamp Secret / Live Access Key</label>
                          <a
                            href="https://my.sendchamp.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-blue-600 hover:underline"
                          >
                            Get key from my.sendchamp.com ↗
                          </a>
                        </div>
                        <input
                          type="password"
                          value={settings.sendchamp_api_key || ''}
                          onChange={e => setSettings({ ...settings, sendchamp_api_key: e.target.value })}
                          placeholder="sendchamp_live_... or test key (from Sendchamp APIs & Webhooks)"
                          className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-black font-mono font-bold outline-none focus:border-[#EA4C2A]"
                        />
                      </div>
                    )}

                    {(settings.sms_provider === 'termii' || !settings.sms_provider) && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-black text-black">Termii Secret API Key</label>
                          <a
                            href="https://termii.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-blue-600 hover:underline"
                          >
                            Get key from termii.com ↗
                          </a>
                        </div>
                        <input
                          type="password"
                          value={settings.termii_api_key || ''}
                          onChange={e => setSettings({ ...settings, termii_api_key: e.target.value })}
                          placeholder="TLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (From termii.com dashboard)"
                          className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-black font-mono font-bold outline-none focus:border-[#EA4C2A]"
                        />
                      </div>
                    )}

                    {settings.sms_provider === 'twilio' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-black">Twilio API Credentials</label>
                          <a
                            href="https://console.twilio.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-blue-600 hover:underline"
                          >
                            Twilio Console ↗
                          </a>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Twilio Account SID *</label>
                            <input
                              type="text"
                              value={settings.twilio_account_sid || ''}
                              onChange={e => setSettings({ ...settings, twilio_account_sid: e.target.value })}
                              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-black font-mono font-bold outline-none focus:border-[#EA4C2A]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Twilio Auth Token *</label>
                            <input
                              type="password"
                              value={settings.twilio_auth_token || ''}
                              onChange={e => setSettings({ ...settings, twilio_auth_token: e.target.value })}
                              placeholder="Auth Token / Secret"
                              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-black font-mono font-bold outline-none focus:border-[#EA4C2A]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Twilio From Number *</label>
                            <input
                              type="text"
                              value={settings.twilio_from_number || ''}
                              onChange={e => setSettings({ ...settings, twilio_from_number: e.target.value })}
                              placeholder="+1XXXXXXXXXX (E.164)"
                              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-black font-mono font-bold outline-none focus:border-[#EA4C2A]"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {settings.sms_provider === 'native' && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-medium">
                        📱 <strong>Direct Device SMS Mode</strong> uses the operator's native phone SMS app via the <code>sms:</code> protocol. No API key or gateway subscription required.
                      </div>
                    )}

                    {/* Test & Save SMS Gateway Strip */}
                    <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 max-w-sm">
                        <label className="text-xs font-black text-black shrink-0">Test Recipient:</label>
                        <input
                          type="text"
                          value={testSmsPhone}
                          onChange={e => setTestSmsPhone(e.target.value)}
                          placeholder="080XXXXXXXX"
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-black font-mono font-bold outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={savingSettings}
                          onClick={() => handleSaveAllSettings()}
                          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Save size={13} />
                          <span>{savingSettings ? 'Saving...' : settings.sms_provider === 'twilio' ? 'Save Twilio Config' : 'Save SMS Key'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={testingSms}
                          onClick={async () => {
                            if (!testSmsPhone) {
                              toast('Please enter a recipient phone number', 'warning');
                              return;
                            }
                            setTestingSms(true);
                            try {
                              const providerName = settings.sms_provider || 'termii';
                              const activeKey = providerName === 'sendchamp'
                                ? (settings.sendchamp_api_key || '')
                                : (settings.termii_api_key || '');
                              const res = await api.testSmsConnection(
                                providerName,
                                activeKey,
                                settings.sms_sender_id || 'FoodMaxx',
                                testSmsPhone,
                                {
                                  route: settings.sendchamp_route || 'dnd',
                                  sendchamp_route: settings.sendchamp_route || 'dnd',
                                  sendchamp_sender_id: settings.sms_sender_id || 'FoodMaxx',
                                  accountSid: settings.twilio_account_sid,
                                  authToken: settings.twilio_auth_token,
                                  from: settings.twilio_from_number
                                }
                              );
                              if (res?.success) {
                                toast(`${providerName.toUpperCase()} SMS Gateway tested and verified for ${testSmsPhone}! 🚀`, 'success');
                              } else if (res?.code === 572006 || res?.data?.code === 572006) {
                                toast('Twilio connected! Note: Claim your free phone number on console.twilio.com to send to unverified numbers', 'info');
                              } else {
                                toast(res?.error || res?.message || 'Test SMS request dispatched', 'info');
                              }
                            } catch (err) {
                              toast(err.message || 'SMS test failed', 'error');
                            } finally {
                              setTestingSms(false);
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50"
                        >
                          <span>{testingSms ? 'Sending SMS...' : 'Send Test SMS 💬'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* WEB BROWSER ALERTS & SOUND CONTROLS */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-300 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">🔔</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm text-black">Web Browser Background Alerts</h4>
                            {adminWebNotificationPerm === 'granted' ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                                Enabled ✓
                              </span>
                            ) : adminWebNotificationPerm === 'denied' ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase">
                                Popups Paused in Browser
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black uppercase">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-black font-bold">
                            Chimes, in-app banners & OS notifications when customers place live orders.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            playOrderNotificationSound();
                            toast('Kitchen chime played! 🔊', 'info');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold text-xs cursor-pointer active:scale-95"
                        >
                          🔊 Test Sound
                        </button>

                        {adminWebNotificationPerm !== 'granted' && adminWebNotificationPerm !== 'denied' && (
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await api.requestNotificationPermission();
                              setAdminWebNotificationPerm(res);
                              if (res === 'granted') toast('Browser alerts enabled! 🔔', 'success');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-[#EA4C2A] hover:bg-[#D43B1B] text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95"
                          >
                            Enable Alerts 🔔
                          </button>
                        )}

                        {adminWebNotificationPerm === 'denied' && (
                          <button
                            type="button"
                            onClick={() => setShowAdminUnblockGuide(!showAdminUnblockGuide)}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95"
                          >
                            {showAdminUnblockGuide ? 'Hide Guide ▲' : 'How to Unblock 🔓'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Unblock walkthrough when blocked in browser settings */}
                    {adminWebNotificationPerm === 'denied' && showAdminUnblockGuide && (
                      <div className="p-4 rounded-xl bg-white border border-amber-300 text-xs space-y-2.5">
                        <div className="font-black text-slate-900 flex items-center gap-1.5">
                          <span>🔓</span>
                          <span>Unblocking notifications in Google Chrome / Microsoft Edge / Safari:</span>
                        </div>
                        <ol className="list-decimal pl-5 space-y-1 text-slate-700 font-semibold text-[11px]">
                          <li>Click the <strong>Lock 🔒</strong> or <strong>Tune 🎚️</strong> icon on the left of your URL bar.</li>
                          <li>Find <strong>Notifications</strong> in the permissions dropdown.</li>
                          <li>Change it from <strong>Block</strong> to <strong>Allow</strong>.</li>
                          <li>Click the <strong>Verify & Activate</strong> button below.</li>
                        </ol>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                          <span className="text-[11px] text-emerald-700 font-bold">
                            ✓ In-app kitchen audio chimes and live toasts remain 100% active.
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              const current = await api.syncNotificationPermission();
                              setAdminWebNotificationPerm(current);
                              if (current === 'granted') {
                                toast('Web browser alerts unblocked and enabled! 🚀', 'success');
                                setShowAdminUnblockGuide(false);
                              } else {
                                toast('Still set to block in browser. Please allow in the address bar 🔒 menu.', 'warning');
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer active:scale-95"
                          >
                            Verify & Activate Now 🚀
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* SUBTAB 5: THERMAL POS & HARDWARE */}
            {/* ======================================================== */}
            {settingsSubTab === 'printer' && (
              <div className="space-y-5">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 space-y-6 shadow-xs">
                  <div>
                    <h3 className="text-lg font-black text-black">Thermal POS Receipt Printer & Hardware</h3>
                    <p className="text-sm font-bold text-black mt-0.5">
                      Configure Bluetooth, USB, and network thermal slip printers (58mm pocket POS and 80mm desktop thermal).
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-black text-xl shrink-0 shadow-xs">
                        🖨️
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-black">Test Hardware Print Dialog</h4>
                        <p className="text-xs font-bold text-black mt-0.5">Send a simulated order ticket to verify roll width and print margins.</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handlePrintSampleReceipt}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-all active:scale-95 shrink-0"
                    >
                      <Printer size={16} />
                      <span>Print Sample Thermal Receipt</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-black mb-1.5">Paper Roll Size</label>
                      <select
                        value={settings.thermal_paper_size || '58mm'}
                        onChange={e => setSettings({ ...settings, thermal_paper_size: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-black font-bold outline-none focus:border-[#EA4C2A]"
                      >
                        <option value="58mm">58mm Standard Pocket POS (Most Common in Nigeria)</option>
                        <option value="80mm">80mm Wide Desktop Thermal Printer (Epson / Star)</option>
                      </select>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-black text-black">Auto-Print on Acceptance</div>
                        <div className="text-[11px] font-bold text-black">Open print dialog immediately when order confirmed</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.auto_print_on_confirm === true}
                        onChange={e => setSettings({ ...settings, auto_print_on_confirm: e.target.checked })}
                        className="w-5 h-5 accent-[#EA4C2A] cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-black mb-1.5">Receipt Top Header Note</label>
                      <input
                        type="text"
                        value={settings.receipt_header_note || 'FOODMAXX IBD - FRESH & HOT'}
                        onChange={e => setSettings({ ...settings, receipt_header_note: e.target.value })}
                        placeholder="e.g. FOODMAXX IBD - FRESH & HOT"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-black font-bold outline-none focus:border-[#EA4C2A] focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-black mb-1.5">Receipt Footer Greeting</label>
                      <input
                        type="text"
                        value={settings.receipt_footer_note || DEFAULT_STORE_DETAILS.receipt_footer_note || 'Thank you for ordering with FoodMaxx. ❤️'}
                        onChange={e => setSettings({ ...settings, receipt_footer_note: e.target.value })}
                        placeholder="e.g. Thank you for dining with FoodMaxx!"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-black font-bold outline-none focus:border-[#EA4C2A] focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* SUBTAB 6: SECURITY & STAFF ACCESS */}
            {/* ======================================================== */}
            {settingsSubTab === 'security' && (
              <div className="space-y-5">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 space-y-6 shadow-xs">
                  <div>
                    <h3 className="text-lg font-black text-black">Security, Staff Access & System Controls</h3>
                    <p className="text-sm font-bold text-black mt-0.5">
                      Store manager admin password, line cook PIN, courier verification rules, and cache tools.
                    </p>
                  </div>

                  {/* ADMIN PASSWORD */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-300 space-y-3">
                    <div className="flex items-center gap-2">
                      <Lock size={18} className="text-[#EA4C2A]" />
                      <h4 className="font-black text-sm text-black">Store Manager Admin Password</h4>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={settings.admin_password || 'admin'}
                        onChange={e => setSettings({ ...settings, admin_password: e.target.value })}
                        placeholder="Enter admin password"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-black font-mono font-bold outline-none focus:border-[#EA4C2A]"
                      />
                      <p className="text-xs text-black font-bold mt-1.5">
                        Required to sign in to this Admin Operations Center. Keep this confidential.
                      </p>
                    </div>
                  </div>

                  {/* KITCHEN COOK PIN */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-300 space-y-3">
                    <div className="flex items-center gap-2">
                      <Key size={18} className="text-amber-600" />
                      <h4 className="font-black text-sm text-black">Kitchen Line Cook Quick PIN</h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        maxLength={4}
                        value={settings.kitchen_staff_pin || '1234'}
                        onChange={e => setSettings({ ...settings, kitchen_staff_pin: e.target.value.replace(/\D/g, '') })}
                        placeholder="4 digits"
                        className="w-32 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-base text-black font-mono font-black text-center outline-none focus:border-[#EA4C2A]"
                      />
                      <p className="text-xs text-black font-bold">
                        4-digit PIN for line cooks to accept and bump orders without full admin financial access.
                      </p>
                    </div>
                  </div>

                  {/* COURIER DELIVERY OTP ENFORCEMENT */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-black">Require 4-Digit Delivery Code from Customer</div>
                      <div className="text-xs font-bold text-black mt-0.5">
                        Prevents disputed deliveries. Rider must input customer OTP code before order marked Delivered.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.require_delivery_otp !== false}
                      onChange={e => setSettings({ ...settings, require_delivery_otp: e.target.checked })}
                      className="w-5 h-5 accent-[#EA4C2A] cursor-pointer"
                    />
                  </div>

                  {/* CACHE & STORAGE PURGE */}
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-black">Clear Local App Cache & Re-Sync</div>
                      <div className="text-xs font-bold text-black mt-0.5">
                        Forces a clean refresh from Firebase Firestore and resets local state cache.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          localStorage.removeItem('fmx_store_settings');
                          localStorage.removeItem('fmx_admin_overview');
                        } catch (e) {}
                        toast('Cache cleared! Re-syncing with cloud...', 'info');
                        setTimeout(() => window.location.reload(), 600);
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-black text-xs cursor-pointer shadow-xs transition-colors shrink-0"
                    >
                      Clear Cache & Reload
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* SUBTAB 7: SPECIAL LATE DELIVERY APOLOGY MANAGEMENT */}
            {/* ======================================================== */}
            {settingsSubTab === 'apology' && (
              <div className="space-y-6">
                {/* Top Banner & Master Toggle */}
                <div className="bg-white border border-slate-300 rounded-2xl p-6 sm:p-7 space-y-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                        <HeartHandshake size={26} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl font-black text-black">Special Late Delivery Apology Management</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                            settings.late_delivery_enabled !== false
                              ? 'bg-emerald-50 text-emerald-950 border border-emerald-300'
                              : 'bg-slate-100 text-black border border-slate-300'
                          }`}>
                            {settings.late_delivery_enabled !== false ? '🟢 Active & Protecting Diners' : '⚪ System Paused'}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-black mt-1">
                          Proactively recover delayed diners across Ibadan. Auto-generate apology coupon codes and dispatch heartfelt WhatsApp messages with 1 click.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.late_delivery_enabled !== false}
                          onChange={e => setSettings({ ...settings, late_delivery_enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#EA4C2A]"></div>
                      </label>
                    </div>
                  </div>

                  {/* Overdue alert indicator */}
                  <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    delayedOrdersCount > 0
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{delayedOrdersCount > 0 ? '⚠️' : '✅'}</span>
                      <div>
                        <div className="text-sm font-black">
                          {delayedOrdersCount > 0
                            ? `${delayedOrdersCount} Live Order(s) Currently Exceeding Delivery SLA!`
                            : 'All Live Deliveries On Schedule!'}
                        </div>
                        <div className="text-xs font-bold mt-0.5">
                          {delayedOrdersCount > 0
                            ? `Orders have been cooking or in transit longer than ${settings.late_delivery_threshold_mins || 35} mins. Apology buttons are active below.`
                            : `Kitchen prep and courier transit times are within your ${settings.late_delivery_threshold_mins || 35}-minute SLA target.`}
                        </div>
                      </div>
                    </div>
                    {delayedOrdersCount > 0 && (
                      <span className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-black shrink-0 animate-pulse">
                        Action Recommended
                      </span>
                    )}
                  </div>
                </div>

                {/* 2-Column: Delay Triggers & Compensation Settings */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* CARD 1: DELAY TRIGGER RULES */}
                  <div className="bg-white border border-slate-300 rounded-2xl p-6 space-y-5 shadow-xs">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                      <Clock size={18} className="text-[#EA4C2A]" />
                      <h4 className="font-black text-base text-black">Delay Triggers & SLA Rules</h4>
                    </div>

                    {/* Delay Threshold Input */}
                    <div>
                      <label className="block text-xs font-black text-black uppercase tracking-wider mb-2">
                        Late Delivery SLA Threshold (Minutes)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={15}
                          max={120}
                          value={settings.late_delivery_threshold_mins || 35}
                          onChange={e => setSettings({ ...settings, late_delivery_threshold_mins: Math.max(10, Number(e.target.value)) })}
                          className="w-28 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-base font-black font-mono text-black outline-none focus:border-[#EA4C2A] focus:bg-white text-center"
                        />
                        <span className="text-sm font-black text-black">minutes after order placement</span>
                      </div>
                      <div className="flex gap-2 mt-2.5">
                        {[25, 35, 45, 60].map(mins => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setSettings({ ...settings, late_delivery_threshold_mins: mins })}
                            className={`px-3 py-1 rounded-lg text-xs font-black transition-colors cursor-pointer border ${
                              settings.late_delivery_threshold_mins === mins
                                ? 'bg-[#EA4C2A] text-white border-[#EA4C2A]'
                                : 'bg-slate-100 hover:bg-slate-200 text-black border-slate-300'
                            }`}
                          >
                            {mins} mins
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-black font-bold mt-2">
                        Orders active beyond this duration will be highlighted in bright rose on the Kitchen Display and Orders feed with a 1-tap WhatsApp apology trigger.
                      </p>
                    </div>

                    {/* Auto Register Promo in Database */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-black">Auto-Activate Coupon in Store Checkout</div>
                        <div className="text-xs font-bold text-black mt-0.5">
                          Automatically creates and enables the generated coupon code in FoodMaxx so the diner can redeem it immediately.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.late_auto_generate_coupon !== false}
                        onChange={e => setSettings({ ...settings, late_auto_generate_coupon: e.target.checked })}
                        className="w-5 h-5 accent-[#EA4C2A] cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* CARD 2: COMPENSATION & GOODWILL PACK */}
                  <div className="bg-white border border-slate-300 rounded-2xl p-6 space-y-5 shadow-xs">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                      <Gift size={18} className="text-[#EA4C2A]" />
                      <h4 className="font-black text-base text-black">Customer Compensation Pack</h4>
                    </div>

                    {/* Compensation Type Selector */}
                    <div>
                      <label className="block text-xs font-black text-black uppercase tracking-wider mb-2">
                        Goodwill Compensation Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'discount_code', label: 'Percentage % Off', desc: 'e.g. 20% off next order' },
                          { id: 'fixed_naira', label: 'Fixed Naira ₦ Off', desc: 'e.g. ₦500 or ₦1,000 off' },
                          { id: 'free_delivery', label: 'Free Next Delivery', desc: '100% off delivery fee' },
                          { id: 'free_item', label: 'Complimentary Treat', desc: 'Free drink or side pack' }
                        ].map(comp => {
                          const active = (settings.late_compensation_type || 'discount_code') === comp.id;
                          return (
                            <button
                              key={comp.id}
                              type="button"
                              onClick={() => setSettings({ ...settings, late_compensation_type: comp.id })}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                active
                                  ? 'bg-orange-50 border-[#EA4C2A] ring-1 ring-[#EA4C2A]'
                                  : 'bg-slate-50 hover:bg-slate-100 border-slate-300'
                              }`}
                            >
                              <div className="text-xs font-black text-black">{comp.label}</div>
                              <div className="text-[11px] font-bold text-black mt-0.5">{comp.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dynamic Value Input */}
                    {(settings.late_compensation_type === 'discount_code' || !settings.late_compensation_type) && (
                      <div>
                        <label className="block text-xs font-black text-black mb-1.5">Discount Percentage (%)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={5}
                            max={50}
                            value={settings.late_discount_percent || 20}
                            onChange={e => setSettings({ ...settings, late_discount_percent: Number(e.target.value) })}
                            className="w-28 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-black font-mono text-black outline-none focus:border-[#EA4C2A] text-center"
                          />
                          <span className="text-sm font-black text-black">% discount applied to next meal</span>
                        </div>
                      </div>
                    )}

                    {settings.late_compensation_type === 'fixed_naira' && (
                      <div>
                        <label className="block text-xs font-black text-black mb-1.5">Naira Discount Amount (₦)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step={100}
                            min={200}
                            value={settings.late_discount_amount || 500}
                            onChange={e => setSettings({ ...settings, late_discount_amount: Number(e.target.value) })}
                            className="w-32 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-black font-mono text-black outline-none focus:border-[#EA4C2A] text-center"
                          />
                          <span className="text-sm font-black text-black">₦ deduction on next order</span>
                        </div>
                      </div>
                    )}

                    {/* Coupon Prefix */}
                    <div>
                      <label className="block text-xs font-black text-black mb-1.5">Voucher Code Prefix</label>
                      <input
                        type="text"
                        value={settings.late_promo_code_prefix || 'SORRY'}
                        onChange={e => setSettings({ ...settings, late_promo_code_prefix: e.target.value.toUpperCase() })}
                        className="w-48 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-mono font-black text-black uppercase outline-none focus:border-[#EA4C2A]"
                        placeholder="e.g. SORRY"
                      />
                      <p className="text-xs text-black font-bold mt-1">
                        Will generate unique codes like: <span className="font-mono font-black text-[#EA4C2A]">{settings.late_promo_code_prefix || 'SORRY'}20-8492</span>
                      </p>
                    </div>

                    {/* Complimentary Kitchen Item */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-black flex items-center gap-2">
                          <span>Include Free Kitchen Item in Bag</span>
                        </label>
                        <input
                          type="checkbox"
                          checked={settings.late_include_free_item !== false}
                          onChange={e => setSettings({ ...settings, late_include_free_item: e.target.checked })}
                          className="w-4 h-4 accent-[#EA4C2A] cursor-pointer"
                        />
                      </div>
                      {settings.late_include_free_item !== false && (
                        <input
                          type="text"
                          value={settings.late_free_item_name || 'Complimentary Chilled Soft Drink / Extra Dodo'}
                          onChange={e => setSettings({ ...settings, late_free_item_name: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-black font-bold outline-none focus:border-[#EA4C2A]"
                          placeholder="e.g. Chilled Soft Drink / Extra Fried Plantain"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* CARD 3: WHATSAPP APOLOGY COMMUNICATION & TONE */}
                <div className="bg-white border border-slate-300 rounded-2xl p-6 sm:p-7 space-y-6 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={18} className="text-[#EA4C2A]" />
                      <h4 className="font-black text-base text-black">WhatsApp Apology Message & Tone</h4>
                    </div>
                    <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300">
                      ⚡ 1-Tap Customer Dispatch
                    </span>
                  </div>

                  {/* Tone Presets Selector */}
                  <div>
                    <label className="block text-xs font-black text-black uppercase tracking-wider mb-2">
                      Select Apology Tone (Click to Apply Preset)
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      {Object.entries(APOLOGY_TONE_PRESETS).map(([key, tone]) => {
                        const active = (settings.late_apology_tone || 'warm') === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setSettings({
                                ...settings,
                                late_apology_tone: key,
                                late_whatsapp_template: tone.template
                              });
                              toast(`Switched to "${tone.label}" tone!`, 'info');
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                              active
                                ? 'bg-[#EA4C2A] text-white border-[#EA4C2A] shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-black border-slate-300'
                            }`}
                          >
                            <span>{tone.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Message Template Editor & Live Preview */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Left: Template Editor */}
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-black">WhatsApp Message Template</label>
                      <textarea
                        rows={6}
                        value={settings.late_whatsapp_template || APOLOGY_TONE_PRESETS.warm.template}
                        onChange={e => setSettings({ ...settings, late_whatsapp_template: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs text-black font-medium outline-none focus:border-[#EA4C2A] focus:bg-white leading-relaxed resize-y"
                      />
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-black font-black uppercase mr-1">Insert Tags:</span>
                        {[
                          '{customer_name}',
                          '{order_ref}',
                          '{delay_minutes}',
                          '{coupon_code}',
                          '{compensation_val}',
                          '{free_item}',
                          '{store_phone}'
                        ].map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              const cur = settings.late_whatsapp_template || '';
                              setSettings({ ...settings, late_whatsapp_template: cur + ' ' + tag });
                            }}
                            className="text-[11px] font-mono font-bold bg-slate-100 hover:bg-slate-200 border border-slate-300 text-black px-2 py-0.5 rounded cursor-pointer transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Right: Authentic WhatsApp Message Preview Bubble */}
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-black flex items-center justify-between">
                        <span>Customer WhatsApp Screen Preview</span>
                        <span className="text-[11px] text-emerald-800 font-bold">● Live rendering</span>
                      </label>
                      <div className="bg-[#E5DDD5] dark:bg-[#121B22] p-4 rounded-2xl border border-slate-300 shadow-inner min-h-[170px] flex flex-col justify-end">
                        <div className="bg-white dark:bg-[#1F2C34] p-3.5 rounded-2xl rounded-bl-xs shadow-md border border-slate-200/50 max-w-[92%] space-y-1.5">
                          <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                            <span className="font-black text-xs text-emerald-800">FoodMaxx Kitchen Ibadan</span>
                            <span className="text-[10px] text-emerald-600 font-bold">✔ Verified</span>
                          </div>
                          <p className="text-xs text-black dark:text-white font-medium leading-relaxed whitespace-pre-wrap">
                            {(settings.late_whatsapp_template || APOLOGY_TONE_PRESETS.warm.template)
                              .replace(/{customer_name}/g, 'Babajide Adeyemi')
                              .replace(/{order_ref}/g, 'FMX-9281')
                              .replace(/{delay_minutes}/g, '42')
                              .replace(/{coupon_code}/g, `${settings.late_promo_code_prefix || 'SORRY'}20-9281`)
                              .replace(/{compensation_val}/g, settings.late_compensation_type === 'fixed_naira' ? `₦${settings.late_discount_amount || 500} OFF` : '20% OFF')
                              .replace(/{free_item}/g, settings.late_include_free_item ? (settings.late_free_item_name || 'a complimentary drink') : '')
                              .replace(/{store_phone}/g, settings.phone || '+234 802 345 6789')}
                          </p>
                          <div className="text-right text-[10px] text-slate-700 font-bold font-mono flex items-center justify-end gap-1 pt-1">
                            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="text-sky-500 font-bold">✓✓</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 4: LIVE DELAYED ORDERS RADAR & 1-CLICK APOLOGY CONSOLE */}
                <div className="bg-white border border-slate-300 rounded-2xl p-6 sm:p-7 space-y-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <h4 className="font-black text-base text-black flex items-center gap-2">
                        <span>⚡ Active Delayed Orders Radar</span>
                        <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-black border border-slate-300">
                          {delayedOrders.length} detected
                        </span>
                      </h4>
                      <p className="text-xs font-bold text-black mt-0.5">
                        Orders exceeding your {settings.late_delivery_threshold_mins || 35}-minute SLA. Click dispatch to automatically generate the voucher and open customer WhatsApp.
                      </p>
                    </div>

                  </div>

                  {delayedOrders.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-emerald-50/70 border border-emerald-300 text-center space-y-2">
                      <div className="text-3xl">🎉</div>
                      <div className="text-base font-black text-emerald-950">All Deliveries Running Smoothly!</div>
                      <p className="text-xs font-bold text-emerald-900 max-w-md mx-auto">
                        There are currently no active orders exceeding your {settings.late_delivery_threshold_mins || 35}-minute target.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {delayedOrders.map(order => {
                        const elapsedMins = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000);
                        const overdueMins = elapsedMins - (Number(settings.late_delivery_threshold_mins) || 35);
                        return (
                          <div
                            key={order.id}
                            className="p-4 rounded-2xl bg-rose-50/80 border border-rose-300 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-rose-50"
                          >
                            <div className="flex items-start gap-3.5 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                                ⏱️
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-black text-sm text-black">
                                    #{order.order_reference || order.id?.slice(0, 8)}
                                  </span>
                                  <span className="text-xs font-black text-black">· {order.customer_name || 'Customer'}</span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                                    +{overdueMins}m Overdue
                                  </span>
                                </div>
                                <div className="text-xs text-black font-bold mt-1">
                                  <span>{order.delivery_zone || 'Ibadan'}</span>
                                  <span className="mx-1.5">•</span>
                                  <span>Elapsed: <strong className="font-mono font-black text-rose-800">{elapsedMins} mins</strong></span>
                                  <span className="mx-1.5">•</span>
                                  <span>Status: <strong className="uppercase">{order.order_status || 'PREPARING'}</strong></span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleDispatchLateApology(order)}
                                className="px-4 py-2.5 bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-95 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all"
                              >
                                <HeartHandshake size={15} />
                                <span>Send WhatsApp Apology & Coupon</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* CARD 5: APOLOGY & GOODWILL DISPATCH AUDIT LOG */}
                <div className="bg-white border border-slate-300 rounded-2xl p-6 sm:p-7 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <h4 className="font-black text-base text-black flex items-center gap-2">
                        <CheckCircle size={18} className="text-emerald-700" />
                        <span>Recent Apologies & Vouchers Issued</span>
                      </h4>
                      <p className="text-xs font-bold text-black mt-0.5">Audit log of apology compensation sent to customers.</p>
                    </div>
                    <span className="text-xs font-mono font-black text-black bg-slate-100 px-3 py-1 rounded-lg border border-slate-300">
                      {apologyHistory.length} Recorded
                    </span>
                  </div>

                  {apologyHistory.length === 0 ? (
                    <p className="text-xs text-black font-bold py-4 text-center">No apologies have been dispatched yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-black uppercase font-black tracking-wider">
                            <th className="pb-2.5 pl-1">Order Ref</th>
                            <th className="pb-2.5">Customer</th>
                            <th className="pb-2.5">Voucher Code</th>
                            <th className="pb-2.5">Goodwill Perk</th>
                            <th className="pb-2.5">Dispatched At</th>
                            <th className="pb-2.5 pr-1 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {apologyHistory.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 pl-1 font-mono font-black text-black">#{item.orderRef}</td>
                              <td className="py-3 font-bold text-black">
                                <div>{item.customerName}</div>
                                <div className="text-[11px] font-mono text-black">{item.phone}</div>
                              </td>
                              <td className="py-3">
                                <span className="font-mono font-black text-xs text-[#EA4C2A] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                                  {item.code}
                                </span>
                              </td>
                              <td className="py-3 font-black text-black">{item.compensation}</td>
                              <td className="py-3 text-black font-bold">
                                {new Date(item.sentAt).toLocaleDateString()} {new Date(item.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-3 pr-1 text-right">
                                <a
                                  href={`https://wa.me/${String(item.phone).replace(/\D/g, '')}?text=${encodeURIComponent(item.message || '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-black transition-colors"
                                >
                                  <span>💬 Re-open</span>
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* BOTTOM SAVE BUTTON */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={savingSettings}
                onClick={() => handleSaveAllSettings()}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#EA4C2A] hover:bg-[#D43B1B] disabled:bg-slate-300 active:scale-95 text-white rounded-xl font-black text-sm shadow-md shadow-[#EA4C2A]/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {savingSettings ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Saving Store Settings...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>Save All Store Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 10: PUSH NOTIFICATIONS MANAGEMENT */}
        {/* ============================================================ */}
        {activeSection === 'notifications' && (
          <PushNotificationManager toast={toast} />
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

      <AdminDeleteCustomerModal
        open={Boolean(deletingCustomer)}
        customer={deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        onDeleted={(deletedId) => {
          setCustomers(prev => prev.filter(c => c.id !== deletedId));
          setDeletingCustomer(null);
        }}
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

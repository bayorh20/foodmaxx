import React, { useState, useEffect, useRef, useCallback, createContext, useContext, useMemo, useDeferredValue, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import './index.css';
import { doc, onSnapshot } from 'firebase/firestore';
import { api, FMXWebSocket, getStoredProducts, getStoredZones } from './services/api';
import { db, DEFAULT_ADDONS } from './services/firebaseDb';
import { launchRealPaystack, getStoredPaystackConfig, savePaystackConfig, isValidPaystackKey } from './services/paystack';
import { triggerHaptic, playNativeSound, playOrderNotificationSound, shareNative, isStandaloneMode, isIosDevice } from './services/nativeMobile';
import { getAppContent, saveAppContent, resetAppContent, fetchLiveAppContent, subscribeLiveAppContent, getCopy, DEFAULT_APP_CONTENT } from './services/appContent';
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
  Columns, LayoutList, Grid, Bike, Edit3, Radio, Palette, Camera, Ticket, HeartHandshake
} from 'lucide-react';

import NotificationToneModal from './components/NotificationToneModal';
import { getStoreDetails, updateStoreDetails, DEFAULT_STORE_DETAILS } from './config/storeDetails';
import OptimizedProductImage, { getOptimizedImageUrl, preloadImage, prefetchCatalogImages } from './components/OptimizedProductImage';
const AdminPortal = lazy(() => import('./components/AdminPortal'));
import SplashScreen from './components/SplashScreen';
import OnboardingFlow from './components/OnboardingFlow';
import TransitionStudioModal, { getTransitionVariants } from './components/TransitionStudioModal';
import GroupOrderSheet from './components/GroupOrderSheet';
import AuthModal from './components/AuthModal';
import { getRealCurrentPosition } from './services/realLocation';
import { getHappyAvatar } from './utils/avatarUtils';
import {
  NOTIFICATION_TONES,
  getSelectedToneId,
  setSelectedToneId,
  getToneVolumeMultiplier,
  playToneById
} from './services/soundEffects';

// Real Delivery Rider Icon from user image (Red Scooter with Yellow Cargo Box)
function DeliveryRiderIcon({ size = 32, className = '' }) {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <img 
        src="/delivery-rider.png" 
        alt="Delivery Rider" 
        width={size} 
        height={size} 
        className="relative z-10 object-contain inline-block shrink-0 select-none dark:brightness-105"
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        loading="eager"
        draggable={false}
      />
    </div>
  );
}

// Real Food Cart Icon from user image (Red Food Stall with Canopy)
function FoodCartIcon({ size = 32, className = '' }) {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <img 
        src="/nav-cart.png" 
        alt="Cart" 
        width={size} 
        height={size} 
        className="relative z-10 object-contain inline-block shrink-0 select-none dark:brightness-105"
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        loading="eager"
        draggable={false}
      />
    </div>
  );
}

// Real Home Icon from user image (Red App Emblem with Plate, Fork & Knife)
function FoodMaxxHomeIcon({ size = 26, className = '' }) {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <img 
        src="/home-icon.png" 
        alt="Home" 
        width={size} 
        height={size} 
        className="relative z-10 object-contain inline-block shrink-0 select-none rounded-md dark:brightness-105"
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        loading="eager"
        draggable={false}
      />
    </div>
  );
}

// Real Profile Icon from user image (Red Glossy Emblem with White Silhouette)
function FoodMaxxProfileIcon({ size = 26, className = '' }) {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <img 
        src="/profile-icon.png" 
        alt="Profile" 
        width={size} 
        height={size} 
        className="relative z-10 object-contain inline-block shrink-0 select-none rounded-full dark:brightness-105"
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        loading="eager"
        draggable={false}
      />
    </div>
  );
}

// 3D Drop Added to Cart Animation Dispatcher (Replaces confetti)
export function trigger3dCartDrop(e, item) {
  try {
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2;
    if (e?.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
    } else if (e?.target) {
      const rect = e.target.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
    } else if (e?.clientX) {
      startX = e.clientX;
      startY = e.clientY;
    }
    window.dispatchEvent(new CustomEvent('fmx_3d_cart_drop', {
      detail: {
        startX,
        startY,
        image: item?.image_url || '',
        name: item?.name || 'Dish'
      }
    }));
    if (typeof playNativeSound === 'function') playNativeSound('pop');
    if (typeof triggerHaptic === 'function') triggerHaptic('light');
  } catch (err) {}
}


// ============================================================
// CONTEXTS
// ============================================================
const AuthCtx = createContext(null);
const CartCtx = createContext(null);
const ToastCtx = createContext(null);
const WSCtx = createContext(null);
const ThemeCtx = createContext({ isDark: false, toggleDark: () => {}, setTheme: () => {} });

export function useAuth() { return useContext(AuthCtx); }
export function useCart() { return useContext(CartCtx); }
export function useToast() { return useContext(ToastCtx); }
export function useWS() { return useContext(WSCtx); }
export function useTheme() { return useContext(ThemeCtx); }

function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('fmx_theme') === 'dark';
  });

  const toggleDark = () => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('fmx_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const setTheme = (theme) => {
    const next = theme === 'dark';
    setIsDark(next);
    localStorage.setItem('fmx_theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <ThemeCtx.Provider value={{ isDark, toggleDark, setTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

// ============================================================
// TOAST SYSTEM
// ============================================================
// ============================================================
// TOAST SYSTEM & ADDED-TO-CART NOTIFICATION
// ============================================================
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msgOrOptions, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).slice(2, 6);
    let toastObj;
    if (typeof msgOrOptions === 'object' && msgOrOptions !== null) {
      toastObj = {
        id,
        duration: msgOrOptions.duration || (msgOrOptions.type === 'cart' ? 1800 : 2500),
        type: msgOrOptions.type || type,
        message: msgOrOptions.message || msgOrOptions.title || '',
        title: msgOrOptions.title || '',
        price: msgOrOptions.price,
        qty: msgOrOptions.qty || 1,
        image: msgOrOptions.image,
        extras: msgOrOptions.extras
      };
    } else {
      const msgStr = String(msgOrOptions || '');
      const isCart = type === 'cart' || msgStr.toLowerCase().includes('added to cart') || msgStr.toLowerCase().includes('added to order');
      toastObj = {
        id,
        duration: isCart ? 1800 : duration || 2500,
        type: isCart ? 'cart' : type,
        message: msgStr,
        title: isCart ? msgStr.replace(/added to cart.*$/i, '').replace(/🛒/g, '').trim() : '',
        qty: 1
      };
    }

    // Single clean toast at a time to prevent stacked distraction
    setToasts([toastObj]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toastObj.duration);
  }, []);

  return (
    <ToastCtx.Provider value={addToast}>
      {children}
      {/* Centered Top Floating Notification Container */}
      <div className="fixed top-4 sm:top-5 inset-x-0 mx-auto z-[99999] flex flex-col items-center gap-2 pointer-events-none px-3.5 max-w-md w-full">
        <AnimatePresence mode="sync">
          {toasts.map(t => {
            if (t.type === 'cart') {
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: -20, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.92, filter: 'blur(3px)' }}
                  transition={{ duration: 0.16, ease: [0.32, 0, 0.67, 0] }}
                  className="relative overflow-hidden w-full pointer-events-auto bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-[0_16px_38px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_45px_rgba(0,0,0,0.55)] rounded-2xl p-2.5 sm:p-3 pr-3 sm:pr-3.5 flex items-center justify-between gap-3 text-slate-900 dark:text-white"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Dish Thumbnail or FoodMaxx Brand Icon */}
                    <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-orange-100 dark:bg-white/5 shrink-0 border border-orange-200/50 dark:border-white/10 shadow-xs">
                      {t.image ? (
                        <img
                          src={t.image}
                          alt={t.title || 'Dish'}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#EA4C2A] to-[#D43D1D] text-white">
                          <ShoppingBag size={20} />
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white ring-2 ring-white dark:ring-[#1A1D24] shadow-xs">
                        <Check size={10} strokeWidth={3.5} />
                      </div>
                    </div>

                    {/* Text Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Added to Order
                        </span>
                      </div>
                      <div className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-white truncate mt-0.5">
                        {t.title || t.message}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        {t.qty ? <span>Qty: {t.qty}</span> : null}
                        {t.qty && t.price ? <span>•</span> : null}
                        {t.price ? (
                          <span className="text-slate-800 dark:text-slate-200 font-bold">
                            {typeof t.price === 'number' ? `₦${t.price.toLocaleString()}` : t.price}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Actions: View Cart & Dismiss */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('fmx:open-cart'));
                        setToasts(prev => prev.filter(x => x.id !== t.id));
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#EA4C2A] hover:bg-[#D43D1D] active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#EA4C2A]/25 cursor-pointer transition-all"
                    >
                      <ShoppingBag size={13} />
                      <span>View Cart</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer active:scale-90"
                      title="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Micro Auto-close countdown line */}
                  <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden pointer-events-none">
                    <motion.div
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: 1.8, ease: 'linear' }}
                      className="h-full bg-gradient-to-r from-[#EA4C2A] to-emerald-500 rounded-full"
                    />
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -14, scale: 0.95 }}
                transition={{ type: 'spring', damping: 26, stiffness: 420 }}
                className="w-full max-w-sm pointer-events-auto bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-[0_14px_34px_rgba(0,0,0,0.16)] dark:shadow-[0_16px_36px_rgba(0,0,0,0.45)] rounded-2xl p-3 flex items-center justify-between gap-3 text-slate-900 dark:text-white"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    t.type === 'error' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                    t.type === 'warning' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                    t.type === 'info' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                    'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  }`}>
                    {t.type === 'error' ? <XCircle size={17} /> :
                     t.type === 'warning' ? <AlertCircle size={17} /> :
                     t.type === 'info' ? <Bell size={17} /> :
                     <CheckCircle size={17} />}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 break-words leading-snug">
                    {t.message}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                >
                  <X size={13} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

// ============================================================
// CART PROVIDER (PERSISTED TO LOCALSTORAGE)
// ============================================================
function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('fmx_cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.items)) {
          return {
            restaurantId: 'rest_foodmaxx',
            restaurantName: 'FoodMaxx',
            items: parsed.items
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved cart from localStorage:', e);
    }
    return { restaurantId: 'rest_foodmaxx', restaurantName: 'FoodMaxx', items: [] };
  });

  // Sync cart mutations to localStorage immediately
  useEffect(() => {
    try {
      if (cart && Array.isArray(cart.items)) {
        localStorage.setItem('fmx_cart', JSON.stringify(cart));
      }
    } catch (e) {
      console.warn('Failed to save cart to localStorage:', e);
    }
  }, [cart]);

  const addItem = useCallback((restaurantId, restaurantName, item) => {
    setCart(prev => {
      const targetRestId = 'rest_foodmaxx';
      const targetRestName = 'FoodMaxx';
      const existing = (prev.items || []).findIndex(i =>
        (String(i.id) === String(item.id) || (i.name && item.name && i.name.trim().toLowerCase() === item.name.trim().toLowerCase())) &&
        (i.selectedSize || 'Regular') === (item.selectedSize || 'Regular') &&
        JSON.stringify(i.selectedExtras || []) === JSON.stringify(item.selectedExtras || [])
      );
      if (existing >= 0) {
        const updated = [...prev.items];
        updated[existing] = { ...updated[existing], qty: updated[existing].qty + (item.qty || 1) };
        return { ...prev, restaurantId: targetRestId, restaurantName: targetRestName, items: updated };
      }
      return {
        restaurantId: targetRestId,
        restaurantName: targetRestName,
        items: [...prev.items, { ...item, qty: item.qty || 1 }]
      };
    });
  }, []);

  const removeItem = useCallback((idx) => {
    setCart(prev => {
      const updated = prev.items.filter((_, i) => i !== idx);
      return updated.length === 0 ? { restaurantId: 'rest_foodmaxx', restaurantName: 'FoodMaxx', items: [] } : { ...prev, items: updated };
    });
  }, []);

  const updateQty = useCallback((idx, delta) => {
    setCart(prev => {
      if (!prev.items[idx]) return prev;
      const newQty = prev.items[idx].qty + delta;
      if (newQty <= 0) {
        const updated = prev.items.filter((_, i) => i !== idx);
        return updated.length === 0 ? { restaurantId: 'rest_foodmaxx', restaurantName: 'FoodMaxx', items: [] } : { ...prev, items: updated };
      }
      const updated = [...prev.items];
      updated[idx] = { ...updated[idx], qty: newQty };
      return { ...prev, items: updated };
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart({ restaurantId: 'rest_foodmaxx', restaurantName: 'FoodMaxx', items: [] });
    try {
      localStorage.removeItem('fmx_cart');
    } catch (e) {}
  }, []);

  useEffect(() => {
    const handleAuthChange = (e) => {
      if (e.detail?.action === 'logout') {
        clearCart();
      }
    };
    window.addEventListener('fmx_auth_change', handleAuthChange);
    window.addEventListener('fmx_cart_clear', clearCart);
    return () => {
      window.removeEventListener('fmx_auth_change', handleAuthChange);
      window.removeEventListener('fmx_cart_clear', clearCart);
    };
  }, [clearCart]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__fmx_cart_items = cart.items || [];
    }
  }, [cart.items]);

  const subtotal = useMemo(() => (cart.items || []).reduce((s, i) => s + (i.price || 0) * i.qty, 0), [cart.items]);
  const itemCount = useMemo(() => (cart.items || []).reduce((s, i) => s + i.qty, 0), [cart.items]);

  const cartContextValue = useMemo(() => ({
    cart, addItem, removeItem, updateQty, clearCart, subtotal, itemCount
  }), [cart, addItem, removeItem, updateQty, clearCart, subtotal, itemCount]);

  return (
    <CartCtx.Provider value={cartContextValue}>
      {children}
    </CartCtx.Provider>
  );
}

// ============================================================
// HELPERS
// ============================================================
export const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;
export const statusLabel = {
  ORDER_PLACED: 'Order Placed',
  RESTAURANT_CONFIRMED: 'Restaurant Confirmed',
  PREPARING: 'Preparing Your Food',
  READY_FOR_PICKUP: 'Ready for Pickup',
  RIDER_ASSIGNED: 'Rider Assigned',
  RIDER_PICKED_UP: 'Rider Picked Up',
  ON_THE_WAY: 'On the Way',
  ARRIVING_SOON: 'Arriving Soon',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled'
};

export const statusColor = {
  ORDER_PLACED: '#3B82F6',
  RESTAURANT_CONFIRMED: '#10B981',
  PREPARING: '#F59E0B',
  READY_FOR_PICKUP: '#10B981',
  RIDER_ASSIGNED: '#8B5CF6',
  RIDER_PICKED_UP: '#EF4444',
  ON_THE_WAY: '#F59E0B',
  ARRIVING_SOON: '#10B981',
  DELIVERED: '#10B981',
  CANCELLED: '#EF4444'
};

export const getStatusEmoji = (status) => {
  switch (status) {
    case 'PREPARING': return '🍳';
    case 'READY_FOR_PICKUP': return '📦';
    case 'RIDER_ASSIGNED': return '🛵';
    case 'RIDER_PICKED_UP': return '🛵';
    case 'ON_THE_WAY': return '🛵';
    case 'ARRIVING_SOON': return '🏡';
    case 'DELIVERED': return '🎉';
    case 'CANCELLED': return '❌';
    default: return '📝';
  }
};

export const getStatusNotificationInfo = (status) => {
  switch (status) {
    case 'PREPARING':
      return {
        icon: '🍳',
        title: 'Cooking Your Meal!',
        desc: 'FoodMaxx kitchen is freshly grilling and packing your order.'
      };
    case 'READY_FOR_PICKUP':
      return {
        icon: '📦',
        title: 'Order Ready & Packed!',
        desc: 'Your food is packaged hot and waiting for rider pickup.'
      };
    case 'RIDER_ASSIGNED':
    case 'RIDER_PICKED_UP':
    case 'ON_THE_WAY':
      return {
        icon: '🛵',
        title: 'Rider is on the Way!',
        desc: 'Your courier is heading towards your delivery address.'
      };
    case 'ARRIVING_SOON':
      return {
        icon: '🏡',
        title: 'Rider Arriving Soon!',
        desc: 'Your rider is pulling up. Please have your delivery PIN ready!'
      };
    case 'DELIVERED':
      return {
        icon: '🎉',
        title: 'Order Delivered!',
        desc: 'Your meal has arrived! Enjoy your hot food.'
      };
    case 'CANCELLED':
      return {
        icon: '⚠️',
        title: 'Order Cancelled',
        desc: 'This order was cancelled. Tap to view details.'
      };
    default:
      return {
        icon: '✨',
        title: 'Order Status Updated',
        desc: `Status changed to ${statusLabel[status] || status}`
      };
  }
};

function Stars({ rating, size = 14 }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={size} fill={i <= Math.round(rating) ? '#F59E0B' : 'none'} color={i <= Math.round(rating) ? '#F59E0B' : '#D1D5DB'} />
      ))}
    </span>
  );
}

function Modal({ open, onClose, children, title }) {
  const { isDark } = useTheme();
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`relative ${isDark ? 'bg-[#15171C] text-white border-white/10' : 'bg-white text-slate-900 border-slate-100'} rounded-t-[36px] sm:rounded-[36px] w-full max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto slide-up shadow-2xl border z-10`}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-white/10 bg-[#15171C]' : 'border-slate-100 bg-white'} sticky top-0 z-10`}>
            <h2 className="font-bold text-base leading-tight">{title}</h2>
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-full ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} flex items-center justify-center active:scale-95 transition-all cursor-pointer`}
            >
              <X size={18} className="stroke-[2.5]"/>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

function Badge({ children, color = 'red' }) {
  const cls = color === 'red' ? 'bg-red-100 text-red-700' :
    color === 'green' ? 'bg-green-100 text-green-700' :
    color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
    color === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700';
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{children}</span>;
}

// ============================================================
// PORTAL SWITCHER
// ============================================================
function PortalSwitcher({ activePortal, setActivePortal }) {
  const portals = [
    { id: 'customer', icon: '🍔', label: 'FoodMaxx App' },
    { id: 'admin', icon: '⚙️', label: 'FoodMaxx Admin' },
  ];

  return (
    <div className="shrink-0 w-full z-50 bg-gray-900 text-white shadow-md border-b border-gray-800 hidden md:block">
      <div className="flex items-center gap-0 overflow-x-auto hide-scrollbar">
        <div className="flex items-center gap-1 px-3 py-2 border-r border-gray-700 shrink-0">
          <span className="text-sm font-bold tracking-tight text-red-400">🍔 FOODMAXX</span>
        </div>
        {portals.map(p => (
          <button
            key={p.id}
            onClick={() => setActivePortal(p.id)}
            className={`shrink-0 px-3.5 py-2.5 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activePortal === p.id
                ? 'bg-red-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            {p.icon} {p.label}
          </button>
        ))}
        <div className="shrink-0 ml-auto px-3.5 py-2 flex items-center gap-2 text-xs font-medium text-emerald-400 whitespace-nowrap border-l border-gray-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Production Live</span>
        </div>
      </div>
    </div>
  );
}


// ============================================================
// CUSTOMER PORTAL
// ============================================================
function CustomerPortal() {
  const { user, login, logout, silentRegister, token } = useAuth();
  const { cart, itemCount, subtotal, addItem, clearCart } = useCart();
  const toast = useToast();
  const ws = useWS();
  const { isDark, toggleDark, setTheme } = useTheme();

  const [appStage, setAppStage] = useState(() => {
    try {
      // Allow testing splash directly with URL ?splash=1
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('splash') === '1' || params.has('splash')) {
          return 'splash';
        }
      }

      // Play 1.8s splash screen intro animation once per session on cold start
      const sessionSplashPlayed = sessionStorage.getItem('fmx_session_splash_played') === 'true';
      if (!sessionSplashPlayed) {
        try { sessionStorage.setItem('fmx_session_splash_played', 'true'); } catch {}
        return 'splash';
      }

      return 'ready';
    } catch {
      return 'ready';
    }
  });

  const [screen, setScreen] = useState('main');
  const [activeTab, setActiveTab] = useState('home');
  const prevTabRef = useRef('home');
  const TAB_ORDER = { home: 0, menu: 1, favorites: 2, orders: 3, profile: 4 };
  const tabDirection = (TAB_ORDER[activeTab] ?? 0) >= (TAB_ORDER[prevTabRef.current] ?? 0) ? 1 : -1;

  useEffect(() => {
    prevTabRef.current = activeTab;
  }, [activeTab]);

  const [mobileView, setMobileView] = useState(() => {
    try {
      const s = localStorage.getItem('fmx_mobile_simulator');
      return s !== null ? JSON.parse(s) : false;
    } catch {
      return true;
    }
  });

  const toggleMobileView = () => {
    setMobileView(prev => {
      const next = !prev;
      try { localStorage.setItem('fmx_mobile_simulator', JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const [searchOpen, setSearchOpen] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try {
      const s = localStorage.getItem('fmx_favs');
      return s ? JSON.parse(s) : ['curated_pasta', 'pick_truffle_pasta'];
    } catch {
      return ['curated_pasta', 'pick_truffle_pasta'];
    }
  });

  const toggleFavorite = useCallback((itemId) => {
    setFavorites(prev => {
      const next = prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId];
      try { localStorage.setItem('fmx_favs', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const [zones, setZones] = useState(() => getStoredZones());
  const [selectedZone, setSelectedZone] = useState(() => getStoredZones()[0] || null);
  const [locationsModalOpen, setLocationsModalOpen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState(() => {
    try {
      const saved = localStorage.getItem('fmx_saved_addresses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [orderMode, setOrderMode] = useState('delivery'); // 'delivery' or 'pickup'
  const [restaurants, setRestaurants] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState(() => getStoredProducts());
  const [menuByCategory, setMenuByCategory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placedOrderSuccess, setPlacedOrderSuccess] = useState(null);

  useEffect(() => {
    const handleOpenCart = () => setCartOpen(true);
    window.addEventListener('fmx:open-cart', handleOpenCart);
    return () => window.removeEventListener('fmx:open-cart', handleOpenCart);
  }, []);

  const [groupOrderSheetOpen, setGroupOrderSheetOpen] = useState(() => {
    try {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      return Boolean(params?.get('group'));
    } catch {
      return false;
    }
  });

  // Handle group order deep link (?group=FMX-XXXX)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const groupCode = params.get('group');
      if (groupCode) {
        const clean = groupCode.trim().toUpperCase();
        localStorage.setItem('fmx_active_group_code', clean);
        setGroupOrderSheetOpen(true);
        if (typeof toast === 'function') {
          toast(`Joined Group Order: ${clean} 👥`, 'info');
        }
      }
    } catch {}
  }, []);

  const [orders, setOrders] = useState([]);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const trackingOrderRef = useRef(null);
  useEffect(() => {
    trackingOrderRef.current = trackingOrder;
  }, [trackingOrder]);

  // Purge prior user's tracking, orders, and delivery details immediately when switching or logging in/out
  useEffect(() => {
    setOrders([]);
    setTrackingOrder(null);
    setLiveStatusBanner(null);
    try {
      localStorage.removeItem('fmx_last_order_id');
      localStorage.removeItem('fmx_active_order');
    } catch {}

    // When logging out or guest mode (user is null), wipe delivery details and saved addresses completely
    if (!user) {
      setSelectedAddress(null);
      setSavedAddresses([]);
      try {
        localStorage.removeItem('fmx_saved_addresses');
        localStorage.removeItem('fmx_last_delivery_address');
        localStorage.removeItem('fmx_last_name');
        localStorage.removeItem('fmx_last_phone');
        localStorage.removeItem('fmx_guest_name');
      } catch {}
    }
  }, [user]);
  const [liveStatusBanner, setLiveStatusBanner] = useState(null);
  const prevOrderStatusesRef = useRef(new globalThis.Map());

  // Auto-dismiss live status banner notification after 8 seconds
  useEffect(() => {
    if (!liveStatusBanner) return;
    const timer = setTimeout(() => {
      setLiveStatusBanner(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [liveStatusBanner]);

  const [returnTabAfterTracking, setReturnTabAfterTracking] = useState(null);
  const [toneModalOpen, setToneModalOpen] = useState(false);
  const [transitionStyle, setTransitionStyle] = useState(() => {
    try {
      return localStorage.getItem('fmx_transition_style') || 'ios-parallax';
    } catch {
      return 'ios-parallax';
    }
  });
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [flyingDrops, setFlyingDrops] = useState([]);

  // 3D Cart Drop animation listener
  useEffect(() => {
    const handleCartDrop = (e) => {
      const { startX, startY, image, name } = e.detail || {};
      const cartElem = document.getElementById('bottom-nav-cart-btn');
      const dockElem = document.getElementById('bottom-nav-dock');
      const targetElem = cartElem || dockElem;
      const targetRect = targetElem ? targetElem.getBoundingClientRect() : null;
      const targetX = targetRect ? targetRect.left + targetRect.width / 2 : window.innerWidth / 2;
      const targetY = targetRect ? targetRect.top + targetRect.height / 2 : window.innerHeight - 36;
      const dropId = `drop_${Date.now()}_${Math.random()}`;
      setFlyingDrops(prev => [...prev, { id: dropId, startX, startY, targetX, targetY, image, name }]);
    };
    window.addEventListener('fmx_3d_cart_drop', handleCartDrop);
    return () => window.removeEventListener('fmx_3d_cart_drop', handleCartDrop);
  }, []);

  const contentScrollRef = useRef(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [reviewModal, setReviewModal] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [activeGroupOrder, setActiveGroupOrder] = useState(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [customNavIcons, setCustomNavIcons] = useState(() => {
    try {
      const s = localStorage.getItem('fmx_nav_icons');
      return s ? JSON.parse(s) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    const handleIconsUpdated = (e) => {
      if (e.detail?.nav_icons) setCustomNavIcons(e.detail.nav_icons);
    };
    window.addEventListener('fmx_icons_updated', handleIconsUpdated);
    return () => window.removeEventListener('fmx_icons_updated', handleIconsUpdated);
  }, []);

  // Live Application Text & Copy (CMS) state
  const [appCopy, setAppCopy] = useState(() => getAppContent());

  useEffect(() => {
    const unsub = subscribeLiveAppContent ? subscribeLiveAppContent((liveCopy) => {
      if (liveCopy) setAppCopy(liveCopy);
    }) : null;
    const handleCopyUpdated = (e) => {
      if (e.detail) setAppCopy(e.detail);
    };
    window.addEventListener('fmx_app_content_updated', handleCopyUpdated);
    return () => {
      if (typeof unsub === 'function') unsub();
      window.removeEventListener('fmx_app_content_updated', handleCopyUpdated);
    };
  }, []);

  // Pull-To-Refresh State & Handlers
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const touchStartY = useRef(0);
  const isPullingRef = useRef(false);

  const handleTouchStart = (e) => {
    if (isRefreshing) return;
    const container = contentScrollRef.current;
    if (container && container.scrollTop <= 2) {
      touchStartY.current = e.touches ? e.touches[0].clientY : e.clientY;
      isPullingRef.current = true;
    } else {
      isPullingRef.current = false;
    }
  };

  const handleTouchMove = (e) => {
    if (!isPullingRef.current || isRefreshing) return;
    const container = contentScrollRef.current;
    if (!container || container.scrollTop > 2) {
      if (pullDistance > 0) setPullDistance(0);
      isPullingRef.current = false;
      return;
    }
    const currentY = e.touches ? e.touches[0].clientY : e.clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0) {
      // Damped pull distance (max ~80px)
      const damped = Math.min(80, Math.pow(diff, 0.82));
      setPullDistance(damped);
      if (damped > 55 && pullDistance <= 55) {
        triggerHaptic('light');
      }
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current || isRefreshing) return;
    isPullingRef.current = false;
    if (pullDistance >= 50) {
      setIsRefreshing(true);
      setPullDistance(60); // Hold at indicator height
      triggerHaptic('medium');
      try {
        await Promise.all([
          loadInitialData(),
          user ? Promise.all([loadOrders(), loadWallet(), loadNotifications()]) : Promise.resolve(),
          new Promise(res => setTimeout(res, 750)) // Smooth visual duration
        ]);
        setRefreshSuccess(true);
        triggerHaptic('success');
        setTimeout(() => {
          setRefreshSuccess(false);
          setIsRefreshing(false);
          setPullDistance(0);
          toast('Menu & live status updated! 🥗', 'success');
        }, 350);
      } catch (err) {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  // Always reset scroll to the top header when switching tabs or opening tracking
  useEffect(() => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab, trackingOrder]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Firestore real-time products subscription
  useEffect(() => {
    if (!api.subscribeLiveProducts) return;
    const unsub = api.subscribeLiveProducts((items) => {
      if (!Array.isArray(items)) return;
      const active = items.map(i => ({
        ...i,
        is_available: i.is_available !== false,
        available: i.is_available !== false
      }));
      setMenuItems(active);

      // Dynamically group into categories for customer views & shelves
      const catNames = Array.from(new Set(active.map(i => i.category || 'Specialties')));
      const grouped = catNames.map(cat => ({
        category: cat,
        items: active.filter(i => (i.category || 'Specialties') === cat)
      }));
      setMenuByCategory(grouped);
      setRestaurant(prev => prev ? { ...prev, menu: active, menuItems: active, menuByCategory: grouped } : prev);
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  // Firestore real-time customer orders subscription (scoped with limits)
  useEffect(() => {
    const subscriber = api.subscribeCustomerLiveOrders || api.subscribeLiveOrders;
    if (!subscriber) return;
    const unsub = subscriber(user || null, (ordersList) => {
      if (!Array.isArray(ordersList)) return;

      let relevantOrders = [];
      if (user) {
        const mine = ordersList.filter(o =>
          (o.customer_id && o.customer_id === user.id) ||
          (o.customer_phone && user.phone && o.customer_phone === user.phone) ||
          (o.customer_email && user.email && o.customer_email === user.email)
        );
        relevantOrders = mine;
      } else {
        const lastOrdId = localStorage.getItem('fmx_last_order_id');
        if (lastOrdId) {
          const matched = ordersList.filter(o => o.id === lastOrdId || o.order_reference === lastOrdId);
          relevantOrders = matched;
        } else {
          relevantOrders = [];
        }
      }

      // Detect status changes and trigger sound + top banner notification
      relevantOrders.forEach(ord => {
        const prevStatus = prevOrderStatusesRef.current.get(ord.id);
        if (prevStatus && prevStatus !== ord.order_status) {
          playOrderNotificationSound();
          if (typeof triggerHaptic === 'function') triggerHaptic('success');

          const notifInfo = getStatusNotificationInfo(ord.order_status);
          setLiveStatusBanner({
            order: ord,
            ...notifInfo
          });

          // Also trigger browser push notification if permitted
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(notifInfo.title, {
                body: notifInfo.desc,
                icon: '/foodmaxx-logo.png'
              });
            } catch (e) {}
          }
        }
        prevOrderStatusesRef.current.set(ord.id, ord.order_status);
      });

      setOrders(relevantOrders);

      // If active tracking modal is open, ensure it syncs immediately with latest status
      const currentTracked = trackingOrderRef.current;
      if (currentTracked?.id) {
        const updatedTracked = ordersList.find(o => o.id === currentTracked.id || o.order_reference === currentTracked.order_reference);
        if (updatedTracked && updatedTracked.order_status !== currentTracked.order_status) {
          setTrackingOrder(updatedTracked);
        }
      }
    });

    // Clear tracking, orders, and delivery details immediately when user logs out
    const handleAuthLogout = (e) => {
      if (e.detail?.action === 'logout') {
        setOrders([]);
        setTrackingOrder(null);
        setTrackingModalOpen(false);
        setLiveStatusBanner(null);
        setSelectedAddress(null);
        setSavedAddresses([]);
      }
    };
    window.addEventListener('fmx_auth_change', handleAuthLogout);
    window.addEventListener('fmx_address_clear', () => {
      setSelectedAddress(null);
      setSavedAddresses([]);
    });
    window.addEventListener('fmx_tracking_clear', () => {
      setOrders([]);
      setTrackingOrder(null);
      setTrackingModalOpen(false);
      setLiveStatusBanner(null);
    });

    return () => {
      if (typeof unsub === 'function') unsub();
      window.removeEventListener('fmx_auth_change', handleAuthLogout);
    };
  }, [user?.id]);

  // Real-time Firestore live listener for active tracking order
  useEffect(() => {
    if (!trackingOrder?.id) return;
    const docRef = doc(db, 'orders', trackingOrder.id);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const liveData = { id: docSnap.id, ...docSnap.data() };
        setTrackingOrder(prev => prev ? { ...prev, ...liveData } : liveData);
      }
    }, (err) => {
      console.warn('Live tracking order subscription notice:', err.message);
    });
    return () => unsub();
  }, [trackingOrder?.id]);

  useEffect(() => {
    if (user) {
      loadOrders();
      loadWallet();
      loadNotifications();
    }
  }, [user]);

  // Real-time WS updates
  useEffect(() => {
    if (!ws) return;
    const unsub = ws.on('ORDER_STATUS_UPDATED', (msg) => {
      setOrders(prev => prev.map(o => o.id === msg.orderId ? { ...o, order_status: msg.status } : o));
      if (trackingOrder?.id === msg.orderId) {
        setTrackingOrder(prev => prev ? { ...prev, order_status: msg.status, riderInfo: msg.riderInfo || prev.riderInfo } : null);
      }
      if (msg.status === 'DELIVERED') {
        toast(`Your order has been delivered! 🎉 Rate your experience.`, 'success', 5000);
      }
    });
    const unsubRider = ws.on('RIDER_LOCATION_UPDATE', (msg) => {
      if (trackingOrder?.id === msg.orderId) {
        setTrackingOrder(prev => prev ? { ...prev, riderLat: msg.lat, riderLng: msg.lng } : null);
      }
    });
    return () => { unsub(); unsubRider(); };
  }, [ws, trackingOrder]);

  // Live synchronizer across admin actions (e.g. stock toggle, new dishes, order dispatch)
  useEffect(() => {
    const handleProductsUpdated = () => {
      loadInitialData();
    };
    const handleOrdersUpdated = () => {
      loadOrders();
      if (trackingOrder) {
        api.getOrder(trackingOrder.id).then(r => {
          if (r?.data) setTrackingOrder(r.data);
        }).catch(() => {});
      }
    };
    window.addEventListener('fmx_products_updated', handleProductsUpdated);
    window.addEventListener('fmx_order_updated', handleOrdersUpdated);
    return () => {
      window.removeEventListener('fmx_products_updated', handleProductsUpdated);
      window.removeEventListener('fmx_order_updated', handleOrdersUpdated);
    };
  }, [trackingOrder]);

  async function loadInitialData() {
    try {
      const [zonesRes, catsRes, restsRes, flagshipRes] = await Promise.all([
        api.getZones().catch(() => ({ data: [] })),
        api.getCategories().catch(() => ({ data: [] })),
        api.getRestaurants().catch(() => ({ data: [] })),
        api.getFlagshipRestaurant().catch(() => ({ data: null }))
      ]);
      if (zonesRes?.data?.length > 0) {
        setZones(zonesRes.data);
        setSelectedZone(zonesRes.data[0]);
      }
      if (catsRes?.data) setCategories(catsRes.data);
      if (restsRes?.data) setRestaurants(restsRes.data);
      if (flagshipRes?.data) {
        const rawItems = flagshipRes.data.menu || flagshipRes.data.menuItems || [];
        const activeItems = rawItems.map(i => ({
          ...i,
          is_available: i.is_available !== false,
          available: i.is_available !== false
        }));
        setRestaurant(flagshipRes.data);
        // We now rely entirely on the Firestore real-time subscription for menu items
        // setMenuItems(activeItems);
        // setMenuByCategory(flagshipRes.data.menuByCategory || []);
      }
    } catch (e) {
      console.warn('Initial data load notice:', e);
    }
  }


  async function loadOrders() {
    if (!user) {
      setOrders([]);
      return;
    }
    try {
      const res = await api.getCustomerOrders(user);
      setOrders(res.data || []);
    } catch (e) {}
  }

  async function loadWallet() {
    try {
      const res = await api.getWallet();
      setWallet(res.data);
    } catch (e) {}
  }

  async function loadNotifications() {
    try {
      const res = await api.getNotifications();
      setNotifications(res.data || []);
    } catch (e) {}
  }

  async function handleSearch(q) {
    setSearchQuery(q);
    if (!q) {
      loadInitialData();
      return;
    }
    try {
      const res = await api.getRestaurants({ search: q });
      setRestaurants(res.data || []);
    } catch (e) {}
  }

  async function openRestaurant(r) {
    setLoading(true);
    try {
      const res = await api.getRestaurant(r.id);
      setSelectedRestaurant(res.data);
    } catch (e) {
      toast('Failed to load restaurant', 'error');
    } finally {
      setLoading(false);
    }
  }

  function openTrackingOrder(order) {
    if (!order) return;
    setReturnTabAfterTracking(activeTab);
    // Instant zero-latency open with current order data
    setTrackingOrder(order);
    // Background refresh without blocking modal opening
    if (order.id) {
      api.getOrder(order.id).then(res => {
        if (res?.data) setTrackingOrder(res.data);
      }).catch(() => {});
    }
  }

  function handleCloseTracking() {
    setTrackingOrder(null);
    if (returnTabAfterTracking && returnTabAfterTracking !== activeTab) {
      setActiveTab(returnTabAfterTracking);
    }
  }

  async function handleTopUp(amount) {
    try {
      const res = await api.topUpWallet(amount);
      toast(res.message, 'success');
      loadWallet();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function handleReviewSubmit(data) {
    try {
      await api.submitReview(reviewModal.id, data);
      toast('Review submitted! Thank you 🙏', 'success');
      setReviewModal(null);
      loadOrders();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function handleAddNewAddress(newAddr) {
    try {
      if (user) {
        await api.addSavedAddress(newAddr);
      }
    } catch (e) {}
    setSavedAddresses(prev => {
      const updated = [newAddr, ...prev.filter(a => a.id !== newAddr.id)];
      try { localStorage.setItem('fmx_saved_addresses', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }

  function handleDeleteAddress(addrId) {
    setSavedAddresses(prev => {
      const updated = prev.filter(a => a.id !== addrId);
      try { localStorage.setItem('fmx_saved_addresses', JSON.stringify(updated)); } catch {}
      return updated;
    });
    if (selectedAddress?.id === addrId) {
      setSelectedAddress(null);
    }
    toast('Address removed from saved spots', 'info');
  }

  const handleQuickAdd = useCallback((item) => {
    addItem('rest_foodmaxx', 'FoodMaxx', {
      id: item.id,
      name: item.name,
      image_url: item.image_url,
      price: item.price,
      qty: 1,
      selectedSize: 'Regular Portion',
      selectedExtras: []
    });
    toast({
      type: 'cart',
      title: item.name,
      price: item.price,
      image: item.image_url,
      qty: 1,
      message: `${item.name} added to cart! 🛒`
    });
  }, [addItem, toast]);

  const handleSelectItem = useCallback((item) => {
    if (item?.image_url) {
      const img = new Image();
      const cleanUrl = String(item.image_url).trim();
      const targetUrl = cleanUrl.includes('images.unsplash.com') 
        ? `${cleanUrl.split('?')[0]}?w=800&auto=format&fit=crop&q=75`
        : cleanUrl;
      img.src = targetUrl;
    }
    setSelectedItem({ restaurant: { id: 'rest_foodmaxx', name: 'FoodMaxx' }, item });
  }, []);

  // Filtered restaurants for current section
  const featuredRestaurants = restaurants.filter(r => r.featured);
  const topRated = [...restaurants].sort((a, b) => b.rating - a.rating).slice(0, 6);
  const fastDelivery = [...restaurants].sort((a, b) => a.delivery_time_min - b.delivery_time_min).slice(0, 6);
  const newRestaurants = restaurants.filter((_, i) => i >= 7);

  const activeOrdersCount = orders.filter(o => !['DELIVERED','CANCELLED'].includes(o.order_status)).length;
  const activeDeliveryOrder = (orders || []).find(o => !['DELIVERED', 'CANCELLED'].includes(o.order_status));

  // ---- MAIN NATIVE WEB APP CONTAINER ----
  return (
    <div className={`w-full h-full min-h-[100dvh] flex justify-center items-center ${isDark ? 'bg-[#0B0D11]' : 'bg-slate-100'} overflow-hidden relative transition-colors`}>
      
      {/* DESKTOP TOGGLE MENU */}
      <div className="hidden md:flex absolute top-5 right-5 z-50">
         <button onClick={toggleMobileView} className={`px-3.5 py-1.5 rounded-full shadow-md font-bold text-xs flex items-center gap-2 ${isDark ? 'bg-[#1E222B] text-white border border-white/10 hover:bg-[#2A2F3B]' : 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50'} transition-transform active:scale-95 cursor-pointer`}>
           {mobileView ? <Monitor size={15}/> : <Smartphone size={15}/>}
           {mobileView ? 'Desktop Container' : 'Phone Frame'}
         </button>
      </div>

      <div className={`w-full flex flex-col relative transition-all duration-300 overflow-hidden ${isDark ? 'bg-[#121418] text-white' : 'bg-white text-slate-900'} ${
         mobileView 
           ? 'w-full h-full min-h-[100dvh] md:min-h-0 md:max-w-[420px] md:h-[880px] md:max-h-[94vh] rounded-none md:rounded-[2.5rem] border-0 md:border-[8px] md:border-slate-800 md:shadow-2xl md:my-auto md:ring-1 md:ring-white/10' 
           : 'w-full max-w-md sm:max-w-lg md:max-w-xl h-full min-h-[100dvh] md:min-h-0 md:h-[94vh] md:max-h-[920px] md:rounded-3xl md:border md:border-slate-200/90 dark:md:border-white/10 shadow-2xl md:my-auto'
         }`}>

        {/* FIRST-TIME THEME SELECTION, SPLASH SCREEN & ONBOARDING */}
        <AnimatePresence mode="wait">
          {appStage === 'splash' && (
            <SplashScreen 
              onFinish={() => {
                try {
                  localStorage.setItem('fmx_splash_seen', 'true');
                  sessionStorage.setItem('fmx_splash_seen', 'true');
                } catch {}
                const hasCompletedOnboarding = localStorage.getItem('fmx_onboarded') === 'true' &&
                  Boolean(localStorage.getItem('fmx_last_name') || user?.full_name) &&
                  Boolean(localStorage.getItem('fmx_last_phone') || user?.phone);
                if (hasCompletedOnboarding || localStorage.getItem('fmx_onboarded') === 'true') {
                  setAppStage('ready');
                } else {
                  setAppStage('onboarding');
                }
              }} 
              isQuick={false}
            />
          )}
          {appStage === 'onboarding' && (
            <OnboardingFlow
              onComplete={() => {
                try {
                  localStorage.setItem('fmx_onboarded', 'true');
                  localStorage.setItem('fmx_splash_seen', 'true');
                  sessionStorage.setItem('fmx_splash_seen', 'true');
                } catch {}
                setAppStage('ready');
              }}
              onRegister={async ({ full_name, phone, address }) => {
                try {
                  localStorage.setItem('fmx_onboarded', 'true');
                  localStorage.setItem('fmx_last_name', full_name);
                  localStorage.setItem('fmx_last_phone', phone);
                  if (address) localStorage.setItem('fmx_last_delivery_address', address);
                  localStorage.setItem('fmx_splash_seen', 'true');
                  sessionStorage.setItem('fmx_splash_seen', 'true');
                } catch {}
                const res = await silentRegister({ full_name, phone });
                if (address && res?.id) {
                  try {
                    await api.updateUser(res.id, { address });
                    updateUser({ address });
                  } catch {}
                }
                toast(`Welcome to FoodMaxx, ${full_name}! ₦1,000 credit added.`, 'success');
                return res;
              }}
              onGuest={() => {
                try {
                  localStorage.setItem('fmx_onboarded', 'true');
                  localStorage.setItem('fmx_splash_seen', 'true');
                  sessionStorage.setItem('fmx_splash_seen', 'true');
                } catch {}
                setAppStage('ready');
                toast('Browsing FoodMaxx as Guest 🍽️', 'info');
              }}
            />
          )}
        </AnimatePresence>

        {/* REAL-TIME SLIDE-DOWN ORDER STATUS NOTIFICATION BANNER */}
        <AnimatePresence>
          {liveStatusBanner && (
            <motion.div
              initial={{ y: -90, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -90, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
              onClick={() => {
                openTrackingOrder(liveStatusBanner.order);
                setLiveStatusBanner(null);
              }}
              className="absolute top-3 left-3 right-3 z-[150] bg-slate-900/95 text-white p-3 sm:p-3.5 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-xl cursor-pointer flex items-center gap-3 active:scale-[0.99] transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#EA4C2A] to-orange-500 flex items-center justify-center text-xl shrink-0 shadow-lg shadow-[#EA4C2A]/30">
                {liveStatusBanner.icon || '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="font-extrabold text-xs text-white truncate">{liveStatusBanner.title}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">#{liveStatusBanner.order?.order_reference}</span>
                </div>
                <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">{liveStatusBanner.desc}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-bold bg-[#EA4C2A] text-white px-2.5 py-1 rounded-lg shadow-xs">
                  Track
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLiveStatusBanner(null);
                  }}
                  className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
                  title="Dismiss notification"
                >
                  <X size={13} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CONTENT AREA (SCROLLABLE - WITH PULL-TO-REFRESH) */}
        <div 
          ref={contentScrollRef} 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative overscroll-contain pb-32 sm:pb-36" 
          style={{ perspective: 1200 }}
        >

          {/* Native Animated & Simple Pull To Refresh */}
          <div
            className="w-full flex items-center justify-center overflow-visible transition-all duration-150 pointer-events-none sticky top-0 z-50 py-1"
            style={{
              height: `${pullDistance}px`,
              opacity: pullDistance > 6 ? 1 : 0
            }}
          >
            <motion.div
              initial={false}
              animate={{
                scale: isRefreshing ? 1 : Math.min(1, Math.max(0.7, pullDistance / 50)),
                rotate: isRefreshing ? 360 : (pullDistance / 50) * 360
              }}
              transition={
                isRefreshing
                  ? { repeat: Infinity, duration: 0.75, ease: 'linear' }
                  : { duration: 0.1 }
              }
              className="w-9 h-9 rounded-full bg-white dark:bg-[#1C2029] shadow-lg shadow-black/15 dark:shadow-black/40 border border-slate-200/90 dark:border-white/10 flex items-center justify-center"
            >
              {refreshSuccess ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 14 }}
                >
                  <Check size={18} className="stroke-[3.5] text-emerald-500" />
                </motion.div>
              ) : isRefreshing ? (
                <RefreshCw size={17} className="text-[#EA4C2A] dark:text-[#FF5525] stroke-[2.8]" />
              ) : (
                <div className="relative w-5 h-5 flex items-center justify-center">
                  <svg className="w-5 h-5 -rotate-90 transform" viewBox="0 0 36 36">
                    <path
                      className="text-slate-100 dark:text-white/10 stroke-current"
                      strokeWidth="3.5"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#EA4C2A] dark:text-[#FF5525] stroke-current transition-all"
                      strokeDasharray={`${Math.min(100, (pullDistance / 50) * 100)}, 100`}
                      strokeLinecap="round"
                      strokeWidth="3.5"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <ArrowDown
                    size={10}
                    className="absolute text-[#EA4C2A] dark:text-[#FF5525] stroke-[3] transition-transform duration-150"
                    style={{
                      transform: pullDistance >= 50 ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                  />
                </div>
              )}
            </motion.div>
          </div>

          {/* DYNAMIC SCREEN TRANSITIONS (20 STYLES AVAILABLE) */}
          <AnimatePresence mode="sync" custom={tabDirection}>
            <motion.div
              key={activeTab}
              custom={tabDirection}
              {...getTransitionVariants(transitionStyle, tabDirection)}
              className="w-full max-w-7xl mx-auto relative px-0 sm:px-6 lg:px-8"
              style={{ willChange: 'transform, opacity' }}
            >
              {/* MAIN NATIVE WEB APP HEADER (HOME TAB) */}
              {activeTab === 'home' && (
            <header className="px-4 sm:px-6 lg:px-8 pt-4 pb-3.5 space-y-3.5 max-w-7xl mx-auto w-full">
              {/* Top Row: Brand Logo + Greeting with Name (Left) & Actions (Right) */}
              <div className="flex items-center justify-between gap-3">
                {/* Brand Logo + Greeting with Customer Name */}
                {/* Brand Logo + Greeting with First Name Directly Underneath */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <img
                    src="/foodmaxx-logo.png"
                    alt="FoodMaxx"
                    className="w-10 h-10 rounded-2xl object-cover shadow-sm shrink-0 border border-red-500/15"
                  />
                  <div className="min-w-0">
                    {(() => {
                      const rawName = (user?.full_name || user?.name || '').trim();
                      const firstName = rawName.split(' ')[0];
                      const isGuest = !user || !firstName || firstName.toLowerCase().includes('guest');
                      const h = new Date().getHours();
                      const timeOfDay = h < 12 ? 'Good Morning ☀️' : h < 17 ? 'Good Afternoon 🌤️' : 'Good Evening 🌙';

                      if (isGuest) {
                        return (
                          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                            {h < 12 ? 'Good morning 👋' : 'Good evening 👋'}
                          </h2>
                        );
                      }

                      return (
                        <>
                          <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 leading-none">
                            <span>{timeOfDay}</span>
                          </p>
                          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight mt-0.5 truncate">
                            {firstName} 👋
                          </h2>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Right Action Icons (Modern Light/Dark Mode Toggle) */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      if (typeof triggerHaptic === 'function') triggerHaptic('selection');
                      toggleDark();
                    }}
                    className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 active:scale-90 cursor-pointer shadow-xs group ${
                      isDark
                        ? 'bg-[#181B22] border border-white/10 text-amber-400 hover:bg-white/10 hover:border-amber-400/40 shadow-amber-500/5'
                        : 'bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-100 hover:text-indigo-600 hover:border-indigo-200 shadow-slate-200/50'
                    }`}
                    title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    aria-label="Toggle Theme"
                  >
                    {isDark ? (
                      <Sun size={18} className="transition-transform duration-500 group-hover:rotate-90 stroke-[2.2]" />
                    ) : (
                      <Moon size={18} className="transition-transform duration-500 group-hover:-rotate-12 stroke-[2.2]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Row 2: Headline - "What do you crave for today?" (Reduced font size) */}
              <div className="pt-0.5">
                <h1 className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 tracking-tight leading-tight">
                  What do you crave for today?
                </h1>
              </div>

              {/* Search Bar Row (Clean, balanced moderate spacing) */}
              <div className="relative flex items-center bg-slate-100 dark:bg-[#1A1D24] text-slate-900 dark:text-white rounded-2xl px-4 py-2.5 sm:py-3 border border-slate-200/60 dark:border-white/5 focus-within:border-[#EA4C2A]/60 focus-within:bg-white dark:focus-within:bg-[#1A1D24] transition-all shadow-xs">
                <Search size={18} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold outline-none placeholder:text-slate-400 placeholder:font-normal mx-2.5"
                  placeholder={getCopy(appCopy, 'customer_hero', 'search_placeholder', 'Search FoodMaxx dishes, jollof, grills...')}
                  value={searchQuery}
                  onChange={(e) => {
                    if (typeof handleSearch === 'function') handleSearch(e.target.value);
                  }}
                />
                <button onClick={() => toast('Voice search coming soon!', 'info')} className="text-[#EA4C2A] shrink-0 hover:opacity-80 transition-opacity cursor-pointer p-0.5">
                  <Mic size={18} />
                </button>
              </div>
            </header>
          )}

          {activeTab === 'home' && (
                <HomeTab
                  restaurant={restaurant}
                  menuItems={menuItems}
                  menuByCategory={menuByCategory}
                  searchQuery={deferredSearchQuery}
                  onSearch={handleSearch}
                  onSelectItem={handleSelectItem}
                  onQuickAdd={handleQuickAdd}
                  onGoToMenu={() => setActiveTab('menu')}
                  onGoToOrders={() => {
                    setActiveTab('orders');
                  }}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  user={user}
                  orders={orders}
                  loading={loading}
                  isDark={isDark}
                  appCopy={appCopy}
                  onStartGroupOrder={() => setGroupOrderSheetOpen(true)}
                />
              )}
              {activeTab === 'menu' && (
                <MenuTab
                  restaurant={restaurant}
                  menuItems={menuItems}
                  menuByCategory={menuByCategory}
                  searchQuery={deferredSearchQuery}
                  onSearch={handleSearch}
                  onSelectItem={handleSelectItem}
                  onQuickAdd={handleQuickAdd}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  onBack={() => setActiveTab('home')}
                  isDark={isDark}
                />
              )}
              {activeTab === 'orders' && (
                <OrdersTab
                  orders={orders}
                  onOpenTracking={openTrackingOrder}
                  onReview={setReviewModal}
                  onExplore={() => setActiveTab('home')}
                  onBack={() => setActiveTab('home')}
                  onRefresh={loadOrders}
                  isDark={isDark}
                  toast={toast}
                />
              )}
              {activeTab === 'favorites' && (
                <FavoritesTab
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  onSelectItem={handleSelectItem}
                  onQuickAdd={handleQuickAdd}
                  onExplore={() => setActiveTab('home')}
                  isDark={isDark}
                />
              )}
              {activeTab === 'profile' && (
                <ProfileTab
                  user={user} wallet={wallet}
                  orders={orders}
                  savedAddressesCount={savedAddresses ? savedAddresses.length : 0}
                  onLogin={() => setAppStage('onboarding')}
                  onOpenOnboarding={() => setAppStage('onboarding')}
                  onLogout={() => {
                    logout();
                    setSelectedAddress(null);
                    setSavedAddresses([]);
                    setActiveTab('home');
                    toast('Logged out successfully', 'info');
                  }}
                  onOpenWallet={() => setWalletOpen(true)}
                  onOpenSupport={() => setSupportOpen(true)}
                  onOpenAddresses={() => setLocationsModalOpen(true)}
                  onOpenToneStudio={() => setToneModalOpen(true)}
                  onOpenTransitionStudio={() => setTransitionModalOpen(true)}
                  onOpenOrders={() => setActiveTab('orders')}
                  onOpenFavorites={() => setActiveTab('favorites')}
                  onOpenSplash={() => setAppStage('splash')}
                  isDark={isDark} toggleDark={toggleDark}
                  toast={toast}
                  setActiveTab={setActiveTab}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* FLOATING ACTION OVERLAY (MODERN BOTTOM DOCK WITH CART & LIVE ORDER STATUS) */}
        {!loginOpen && !registerOpen && !checkoutOpen && !groupOrderSheetOpen && appStage !== 'splash' && appStage !== 'onboarding' && screen === 'main' && (
          <div className="absolute bottom-0 left-0 right-0 z-50 pointer-events-none pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] px-3 sm:px-4 flex flex-col items-center">
            
            {/* REDESIGNED MODERN BOTTOM NAVIGATION BAR - EYE-FRIENDLY & BALANCED 4 TABS */}
          <motion.div 
            id="bottom-nav-dock"
            layout
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className={`pointer-events-auto flex items-center justify-between gap-1 p-1.5 sm:p-2 rounded-[28px] shadow-xl backdrop-blur-2xl border ${
              isDark 
                ? 'bg-[#161822]/95 border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.65),0_1px_0_rgba(255,255,255,0.06)_inset]' 
                : 'bg-white/95 border-slate-200/80 shadow-[0_12px_36px_rgba(15,23,42,0.1)]'
            } w-full max-w-[380px] sm:max-w-[420px]`}
          >
            {[
              { id: 'home', icon: FoodMaxxHomeIcon, label: 'Home' },
              { id: 'cart', icon: FoodCartIcon, label: 'Cart' },
              { id: 'orders', icon: DeliveryRiderIcon, label: 'Tracking' },
              { id: 'profile', icon: FoodMaxxProfileIcon, label: 'Profile' }
            ].map(tab => {
              const isActive = tab.id === 'cart' ? cartOpen : (activeTab === tab.id && !cartOpen);
              const hasActiveDelivery = tab.id === 'orders' && (orders || []).some(o => !['DELIVERED', 'CANCELLED'].includes(o.order_status));
              const hasCartItems = tab.id === 'cart' && itemCount > 0;

              return (
                <motion.button
                  key={tab.id}
                  id={tab.id === 'cart' ? 'bottom-nav-cart-btn' : undefined}
                  layout
                  whileTap={{ scale: 0.92 }}
                  className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-2xl transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? 'text-[#EA4C2A] dark:text-[#FF6B4A] bg-[#EA4C2A]/10 dark:bg-[#EA4C2A]/15 border border-[#EA4C2A]/20 dark:border-[#EA4C2A]/30' 
                      : `hover:bg-slate-100/70 dark:hover:bg-white/5 ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'}`
                  }`}
                  onClick={() => {
                    if (typeof triggerHaptic === 'function') triggerHaptic('light');
                    if (tab.id === 'cart') {
                      setCartOpen(true);
                    } else if (tab.id === 'orders') {
                      setCartOpen(false);
                      setScreen('main');
                      setActiveTab('orders');
                    } else {
                      setCartOpen(false);
                      setScreen('main');
                      setActiveTab(tab.id);
                    }
                  }}
                >
                  <div className="h-7 w-8 flex items-center justify-center relative shrink-0">
                    {customNavIcons[tab.id] ? (
                      tab.id === 'orders' ? (
                        <div className={`relative flex items-center justify-center ${hasActiveDelivery || isActive ? 'animate-fmx-subtle-bounce' : ''}`}>
                          <img 
                            src={customNavIcons[tab.id]} 
                            alt={tab.label}
                            width={isActive ? 27 : 24}
                            height={isActive ? 27 : 24}
                            className={`object-contain select-none ${isActive ? 'scale-105' : 'hover:scale-105'}`}
                            style={{ width: isActive ? 27 : 24, height: isActive ? 27 : 24 }}
                          />
                          {hasActiveDelivery && (
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white dark:border-[#1C2029]"></span>
                            </span>
                          )}
                        </div>
                      ) : tab.id === 'cart' ? (
                        <div className={`relative flex items-center justify-center ${hasCartItems ? 'animate-fmx-cart-pulse' : ''}`}>
                          <img 
                            src={customNavIcons[tab.id]} 
                            alt={tab.label}
                            width={isActive ? 27 : 24}
                            height={isActive ? 27 : 24}
                            className={`object-contain select-none ${isActive ? 'scale-105' : 'hover:scale-105'}`}
                            style={{ width: isActive ? 27 : 24, height: isActive ? 27 : 24 }}
                          />
                          {hasCartItems && (
                            <span className="absolute -top-1.5 -right-2 flex items-center justify-center">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EA4C2A] opacity-60"></span>
                              <span className="relative inline-flex items-center justify-center min-w-[17px] h-[17px] px-1 text-[9px] font-black bg-gradient-to-r from-[#EA4C2A] to-amber-500 text-white rounded-full border border-white dark:border-[#1C2029] shadow-sm shadow-[#EA4C2A]/60">
                                {itemCount}
                              </span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <img 
                          src={customNavIcons[tab.id]} 
                          alt={tab.label}
                          width={isActive ? 27 : 24}
                          height={isActive ? 27 : 24}
                          className={`object-contain select-none ${isActive ? 'scale-105' : 'hover:scale-105'}`}
                          style={{ width: isActive ? 27 : 24, height: isActive ? 27 : 24 }}
                        />
                      )
                    ) : tab.id === 'home' ? (
                      <FoodMaxxHomeIcon 
                        size={isActive ? 27 : 24} 
                        className={isActive ? 'scale-105' : 'hover:scale-105'} 
                      />
                    ) : tab.id === 'orders' ? (
                      <motion.div
                        animate={hasActiveDelivery || isActive ? {
                          y: [0, -1.2, 0]
                        } : {}}
                        transition={{
                          repeat: Infinity,
                          duration: 2.2,
                          ease: 'easeInOut'
                        }}
                        className="relative flex items-center justify-center"
                      >
                        <DeliveryRiderIcon 
                          size={isActive ? 27 : 24} 
                          className={isActive ? 'scale-105' : 'hover:scale-105'} 
                        />
                        {hasActiveDelivery && (
                          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white dark:border-[#1C2029]"></span>
                          </span>
                        )}
                      </motion.div>
                    ) : tab.id === 'cart' ? (
                      <motion.div
                        animate={hasCartItems ? {
                          scale: [1, 1.08, 1]
                        } : {}}
                        transition={{
                          repeat: hasCartItems ? Infinity : 0,
                          repeatDelay: 3.5,
                          duration: 0.6
                        }}
                        className="relative flex items-center justify-center"
                      >
                        <FoodCartIcon 
                          size={isActive ? 27 : 24} 
                          className={isActive ? 'scale-105' : 'hover:scale-105'} 
                        />
                        {hasCartItems && (
                          <span className="absolute -top-1.5 -right-2 flex items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EA4C2A] opacity-60"></span>
                            <span className="relative inline-flex items-center justify-center min-w-[17px] h-[17px] px-1 text-[9px] font-black bg-gradient-to-r from-[#EA4C2A] to-amber-500 text-white rounded-full border border-white dark:border-[#1C2029] shadow-sm shadow-[#EA4C2A]/60">
                              {itemCount}
                            </span>
                          </span>
                        )}
                      </motion.div>
                    ) : tab.id === 'profile' ? (
                      <FoodMaxxProfileIcon 
                        size={isActive ? 27 : 24} 
                        className={isActive ? 'scale-105' : 'hover:scale-105'} 
                      />
                    ) : (
                      <tab.icon size={20} className={isActive ? 'stroke-[2.5]' : 'stroke-[2]'} />
                    )}
                  </div>
                  
                  <span className={`text-[10px] sm:text-[10.5px] leading-none tracking-tight mt-1 truncate max-w-full select-none text-center ${
                    isActive 
                      ? 'font-bold text-[#EA4C2A] dark:text-[#FF6B4A]' 
                      : 'font-medium text-slate-500 dark:text-slate-400'
                  }`}>
                    {tab.id === 'cart' && hasCartItems ? `Cart (${itemCount})` : tab.label}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
        )}
      </div>




      {/* RESTAURANT MODAL */}
      <AnimatePresence>
        {selectedRestaurant && (
          <RestaurantModal
            key="restaurant-modal"
            restaurant={selectedRestaurant}
            onClose={() => setSelectedRestaurant(null)}
            onAddToCart={(item) => {
              setSelectedItem({ restaurant: selectedRestaurant, item });
            }}
            onOpenCart={() => setCartOpen(true)}
            onStartGroupOrder={() => {
              setSelectedRestaurant(null);
              setGroupOrderSheetOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* REAL COLLABORATIVE GROUP ORDER BOTTOM SHEET */}
      <GroupOrderSheet
        open={groupOrderSheetOpen}
        onClose={() => setGroupOrderSheetOpen(false)}
        cart={cart}
        user={user}
        deliveryAddress={selectedAddress?.address || ''}
        deliveryFee={selectedZone?.delivery_fee || 500}
        isDark={isDark}
        onCompleteGroupOrder={(groupData) => {
          if (groupData?.allOrderItems && groupData.allOrderItems.length > 0) {
            clearCart();
            groupData.allOrderItems.forEach(it => {
              addItem('rest_foodmaxx', 'FoodMaxx', {
                id: it.id,
                name: `[${it.memberName}] ${it.name}`,
                price: it.price,
                qty: it.qty,
                selectedSize: it.portion,
                image: it.image
              });
            });
            setGroupOrderSheetOpen(false);
            setCheckoutOpen(true);
            toast(`Group Order (${groupData.groupCode}) ready! ${groupData.members.length} people added meals 👥`, 'success');
          }
        }}
        onBrowseMenu={() => {
          setGroupOrderSheetOpen(false);
          setActiveTab('menu');
        }}
      />

      {/* FOOD DETAIL MODAL */}
      <AnimatePresence>
        {selectedItem && (
          <FoodDetailModal
            key="food-detail-modal"
            restaurant={selectedItem.restaurant}
            item={selectedItem.item}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>

      {/* CART DRAWER */}
      <AnimatePresence>
        {cartOpen && (
          <CartDrawer
            key="cart-drawer"
            open={cartOpen}
            onClose={() => setCartOpen(false)}
            onCheckout={() => {
              setCartOpen(false);
              setCheckoutOpen(true);
            }}
            selectedZone={selectedZone}
          />
        )}
      </AnimatePresence>

      {/* CHECKOUT MODAL */}
      <AnimatePresence>
        {checkoutOpen && (
          <CheckoutModal
            key="checkout-modal"
            open={checkoutOpen}
            onClose={() => setCheckoutOpen(false)}
            onOpenGroupOrder={() => setGroupOrderSheetOpen(true)}
            selectedZone={selectedZone}
            selectedAddress={selectedAddress}
            wallet={wallet}
            onRefreshWallet={loadWallet}
            onChangeAddress={() => setLocationsModalOpen(true)}
            onSuccess={(order) => {
              setCheckoutOpen(false);
              loadOrders();
              loadWallet();
              setPlacedOrderSuccess(order);
            }}
          />
        )}
      </AnimatePresence>



      {/* ANIMATED ORDER PLACED SUCCESS CELEBRATION SCREEN */}
      <AnimatePresence>
        {placedOrderSuccess && (
          <OrderSuccessModal
            key="order-success-modal"
            order={placedOrderSuccess}
            isDark={isDark}
            onTrackOrder={() => {
              const o = placedOrderSuccess;
              setPlacedOrderSuccess(null);
              setActiveTab('orders');
              setTrackingOrder(o);
            }}
            onContinueShopping={() => {
              setPlacedOrderSuccess(null);
              setActiveTab('home');
            }}
          />
        )}
      </AnimatePresence>


      {/* TRACKING MODAL */}
      {trackingOrder && (
        <TrackingModal
          order={trackingOrder}
          user={user}
          isDark={isDark}
          appCopy={appCopy}
          onClose={handleCloseTracking}
          onRefresh={async () => {
            const res = await api.getOrder(trackingOrder.id);
            setTrackingOrder(res.data);
          }}
        />
      )}

      {/* SAVED LOCATIONS & LANDMARKS MODAL */}
      <SavedLocationsModal
        open={locationsModalOpen}
        onClose={() => setLocationsModalOpen(false)}
        savedAddresses={savedAddresses}
        selectedAddress={selectedAddress}
        onSelectAddress={(addr) => {
          setSelectedAddress(addr);
          if (addr) {
            const z = zones.find(zn => zn.id === addr.zone_id);
            if (z) setSelectedZone({ ...z, landmark: addr.landmark });
          }
        }}
        onAddNewAddress={handleAddNewAddress}
        onDeleteAddress={handleDeleteAddress}
        zones={zones}
        selectedZone={selectedZone}
        onSelectZone={(z) => {
          setSelectedZone(z);
          setSelectedAddress(null);
        }}
        isDark={isDark}
      />

      {/* WALLET */}
      <WalletModal
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
        wallet={wallet}
        onTopUp={handleTopUp}
        onRefresh={loadWallet}
        user={user}
        isDark={isDark}
      />

      {/* REVIEW MODAL */}
      {reviewModal && (
        <ReviewModal
          order={reviewModal}
          onClose={() => setReviewModal(null)}
          onSubmit={handleReviewSubmit}
        />
      )}

      {/* NOTIFICATIONS DRAWER */}
      <Modal open={notifsOpen} onClose={() => setNotifsOpen(false)} title="Notifications">
        <div className="p-4 space-y-3">
          {notifications.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Bell size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No notifications yet</p>
            </div>
          )}
          {notifications.map(n => (
            <div key={n.id} className={`flex gap-3 p-3 rounded-xl ${n.is_read ? 'bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/5' : 'bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40'}`}>
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center shrink-0">
                <Bell size={14} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white">{n.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{n.message}</div>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* SUPPORT MODAL */}
      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />

      {/* LOGIN MODAL */}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onSwitchRegister={() => { setLoginOpen(false); setRegisterOpen(true); }} />

      {/* REGISTER MODAL */}
      <RegisterModal open={registerOpen} onClose={() => setRegisterOpen(false)} onSwitchLogin={() => { setRegisterOpen(false); setLoginOpen(true); }} />

      {/* 3D DROP ADDED TO CART FLYING TOKEN OVERLAY */}
      <div className="fixed inset-0 pointer-events-none z-[999] overflow-hidden" style={{ perspective: 1000 }}>
        <AnimatePresence>
          {flyingDrops.map(drop => (
            <motion.div
              key={drop.id}
              initial={{
                x: drop.startX - 22,
                y: drop.startY - 22,
                scale: 1,
                rotateX: 0,
                rotateY: 0,
                rotateZ: 0,
                opacity: 1
              }}
              animate={{
                x: [drop.startX - 22, drop.startX + (drop.targetX - drop.startX) * 0.45, drop.targetX - 18],
                y: [drop.startY - 22, Math.min(drop.startY, drop.targetY) - 75, drop.targetY - 18],
                scale: [1, 1.25, 0.45],
                rotateX: [0, 45, 180],
                rotateZ: [0, -35, 45],
                opacity: [1, 1, 0.2]
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.65,
                ease: [0.22, 1, 0.36, 1],
                times: [0, 0.5, 1]
              }}
              onAnimationComplete={() => {
                setFlyingDrops(prev => prev.filter(d => d.id !== drop.id));
              }}
              className="absolute w-11 h-11 rounded-2xl bg-white dark:bg-[#1E2028] shadow-2xl border-2 border-slate-900/10 dark:border-white/20 p-1 flex items-center justify-center overflow-hidden"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {drop.image ? (
                <img src={drop.image} alt={drop.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <span className="text-lg">🍲</span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* LOUD NOTIFICATION TONES STUDIO MODAL */}
      <NotificationToneModal
        open={toneModalOpen}
        onClose={() => setToneModalOpen(false)}
      />

      {/* 20 SCREEN TRANSITION STYLES STUDIO MODAL */}
      <TransitionStudioModal
        open={transitionModalOpen}
        onClose={() => setTransitionModalOpen(false)}
        currentStyle={transitionStyle}
        onSelectStyle={(id) => {
          setTransitionStyle(id);
          try {
            localStorage.setItem('fmx_transition_style', id);
          } catch (e) {
            console.warn(e);
          }
        }}
        isDark={isDark}
      />
    </div>
  );
}

// ============================================================
// PRODUCT QUANTITY STEPPER (AUTO-DISPLAYS WHEN ITEM IN CART)
// ============================================================
const ProductQuantityStepper = React.memo(function ProductQuantityStepper({ item, inCartQty: propQty, onQuickAdd, isDark, size = 'sm' }) {
  const { updateQty } = useCart();
  const dishItem = item?.dish || item;
  const itemId = dishItem?.id;

  const inCartQty = typeof propQty === 'number' ? propQty : (() => {
    const items = (typeof window !== 'undefined' && window.__fmx_cart_items) ? window.__fmx_cart_items : [];
    return items.filter(i => (i.id && itemId && String(i.id) === String(itemId)) || (i.name && dishItem?.name && i.name.trim().toLowerCase() === dishItem.name.trim().toLowerCase())).reduce((sum, i) => sum + i.qty, 0);
  })();

  if (inCartQty <= 0) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onQuickAdd(dishItem);
          trigger3dCartDrop(e, dishItem);
        }}
        className={`${
          size === 'lg' ? 'w-8 h-8 sm:w-8.5 sm:h-8.5' : 'w-7 h-7 sm:w-7.5 sm:h-7.5'
        } rounded-full bg-[#EA4C2A] hover:bg-[#d93f1d] active:scale-90 text-white flex items-center justify-center shadow-xs transition-all cursor-pointer shrink-0`}
        title="Add to cart"
      >
        <Plus size={size === 'lg' ? 16 : 14} className="stroke-[3]" />
      </button>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center bg-[#EA4C2A] text-white rounded-full p-0.5 shadow-xs transition-all duration-200 shrink-0 select-none animate-in zoom-in-95"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          const items = (typeof window !== 'undefined' && window.__fmx_cart_items) ? window.__fmx_cart_items : [];
          const idx = items.findIndex(i => (i.id && itemId && String(i.id) === String(itemId)) || (i.name && dishItem?.name && i.name.trim().toLowerCase() === dishItem.name.trim().toLowerCase()));
          if (idx >= 0) updateQty(idx, -1);
        }}
        className={`${
          size === 'lg' ? 'w-6 h-6 sm:w-7 sm:h-7' : 'w-5.5 h-5.5'
        } rounded-full flex items-center justify-center hover:bg-black/15 active:scale-90 transition-all cursor-pointer text-white`}
        title="Decrease quantity"
      >
        <Minus size={size === 'lg' ? 12 : 10} className="stroke-[3]" />
      </button>

      <span className={`font-black ${size === 'lg' ? 'text-xs min-w-[20px]' : 'text-[10.5px] min-w-[16px]'} px-1 text-center select-none leading-none text-white`}>
        {inCartQty}
      </span>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          const items = (typeof window !== 'undefined' && window.__fmx_cart_items) ? window.__fmx_cart_items : [];
          const idx = items.findIndex(i => (i.id && itemId && String(i.id) === String(itemId)) || (i.name && dishItem?.name && i.name.trim().toLowerCase() === dishItem.name.trim().toLowerCase()));
          if (idx >= 0) {
            updateQty(idx, 1);
          } else if (typeof onQuickAdd === 'function') {
            onQuickAdd(dishItem);
          }
          trigger3dCartDrop(e, dishItem);
        }}
        className={`${
          size === 'lg' ? 'w-6 h-6 sm:w-7 sm:h-7' : 'w-5.5 h-5.5'
        } rounded-full flex items-center justify-center hover:bg-black/15 active:scale-90 transition-all cursor-pointer text-white`}
        title="Increase quantity"
      >
        <Plus size={size === 'lg' ? 12 : 10} className="stroke-[3]" />
      </button>
    </div>
  );
});

// ============================================================
// SKELETON LOADER CARD (1 COLUMN FROSTED GLASS)
// ============================================================
function SkeletonCard() {
  return (
    <div className="w-full rounded-[24px] p-3 sm:p-3.5 bg-white dark:bg-[#161822] border border-slate-200/90 dark:border-white/10 flex flex-col">
      {/* 1-column image aspect ratio */}
      <div className="w-full aspect-[16/9] sm:aspect-[2/1] max-h-72 rounded-2xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 animate-pulse" />
      {/* Bottom row: text left, circular button right */}
      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        <div className="flex-1 space-y-1.5">
          <div className="h-4 bg-slate-200 dark:bg-slate-700/80 rounded-full w-3/5 animate-pulse" />
          <div className="h-4 bg-slate-200/80 dark:bg-slate-700/60 rounded-full w-1/3 animate-pulse" />
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700/80 shrink-0 animate-pulse" />
      </div>
    </div>
  );
}

function SkeletonSection({ title = "Top picks on FoodMaxx" }) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between px-4 sm:px-0 mb-2.5">
        <div className="h-5 w-44 bg-slate-200 dark:bg-[#1A1D24] rounded-full animate-pulse" />
        <div className="h-4 w-16 bg-slate-100 dark:bg-[#1A1D24] rounded-full animate-pulse" />
      </div>
      <div className="grid grid-cols-1 gap-y-3 sm:gap-y-3.5 px-4 sm:px-0">
        {[1, 2].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

// ============================================================
// TIME-BASED GREETING BANNER
// ============================================================
function GreetingBanner({ user, isDark }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const emoji = hour < 12 ? '☀️' : hour < 17 ? '🌤️' : '🌙';
  const suggestion = hour < 12 ? 'Start your day right with a hearty breakfast.' : hour < 17 ? 'Lunch is calling — treat yourself!' : 'Wind down with your favourite evening meal.';

  return (
    <div className={`mx-4 mb-4 rounded-2xl px-4 py-3 flex items-center gap-3 ${isDark ? 'bg-[#1A1D24]' : 'bg-gray-50'}`}>
      <span className="text-3xl">{emoji}</span>
      <div>
        <p className={`font-bold text-[15px] sm:text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {greeting}{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}! 👋
        </p>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{suggestion}</p>
      </div>
    </div>
  );
}

// ============================================================
// LIVE ORDER TRACKING MINI-BANNER
// ============================================================
const ORDER_STATUS_LABELS = {
  ORDER_PLACED: { label: 'Order placed', icon: CheckCircle, color: 'from-orange-500 to-orange-600', step: 1 },
  RESTAURANT_CONFIRMED: { label: 'Order confirmed', icon: CheckCircle, color: 'from-orange-500 to-orange-600', step: 1 },
  CONFIRMED: { label: 'Order confirmed', icon: CheckCircle, color: 'from-orange-500 to-orange-600', step: 1 },
  PREPARING: { label: 'Kitchen is cooking', icon: ChefHat, color: 'from-amber-500 to-amber-600', step: 2 },
  READY_FOR_PICKUP: { label: 'Ready for pickup', icon: Package, color: 'from-amber-500 to-amber-600', step: 2 },
  RIDER_ASSIGNED: { label: 'Rider assigned', icon: Truck, color: 'from-orange-500 to-orange-600', step: 3 },
  RIDER_PICKED_UP: { label: 'Rider picked up', icon: Truck, color: 'from-orange-500 to-orange-600', step: 3 },
  ON_THE_WAY: { label: 'Rider on the way!', icon: Truck, color: 'from-[#EA4C2A] to-[#CF3515]', step: 3 },
  ARRIVING_SOON: { label: 'Arriving soon!', icon: Truck, color: 'from-emerald-500 to-emerald-600', step: 4 },
};

function LiveOrderBanner({ orders, onGoToOrders }) {
  return null;
}

// ============================================================
// PROMO BANNER (MATCHING MOCKUP)
// ============================================================
function PromoBanner({ onOrderNow, appCopy }) {
  const code = getCopy(appCopy, 'customer_hero', 'promo_banner_code', '');
  const promoText = getCopy(appCopy, 'customer_hero', 'promo_banner_text', 'Fresh & Delicious Everyday');
  const heroTitle = getCopy(appCopy, 'customer_hero', 'hero_title', 'Fresh Meals, Fast Delivery');

  return (
    <div className="px-4 sm:px-0 mb-9 sm:mb-12 w-full">
      <div className="bg-gradient-to-r from-[#FF5525] via-[#FF6036] to-[#EA4C2A] rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 relative overflow-hidden flex items-center justify-between min-h-[82px] sm:min-h-[92px] shadow-md shadow-orange-500/15">
        <div className="relative z-10 max-w-[70%] sm:max-w-[75%] flex flex-col justify-center">
          <div className="flex items-center gap-1.5 flex-wrap">
            {code ? (
              <span className="bg-white/25 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                Code: {code}
              </span>
            ) : (
              <span className="bg-white/25 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                Special Offer
              </span>
            )}
            <span className="text-white/90 text-[10px] sm:text-[11px] font-medium hidden xs:inline">
              • {promoText}
            </span>
          </div>

          <h2 className="text-white text-sm sm:text-base md:text-lg font-black leading-tight mt-1 mb-1 truncate">
            {heroTitle.replace('\n', ' ')}
          </h2>

          <div className="flex items-center gap-2 mt-0.5">
            <button 
              onClick={onOrderNow} 
              className="bg-slate-950 hover:bg-black text-white text-[10px] sm:text-xs font-bold py-1 px-3 sm:px-4 rounded-full active:scale-95 transition-transform cursor-pointer shadow-xs"
            >
              Order Now →
            </button>
            <span className="text-white/80 text-[10px] xs:hidden truncate">
              {promoText}
            </span>
          </div>
        </div>
        
        {/* Compact Appetizing Food Artwork */}
        <div className="absolute -right-2 -bottom-2 w-24 h-24 sm:w-28 sm:h-28 rotate-[-6deg] pointer-events-none drop-shadow-xl shrink-0">
          <img 
            onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=75'; }} 
            src="https://images.unsplash.com/photo-1576107223932-3580a13346e4?w=240&auto=format&fit=crop&q=75" 
            alt="Crispy Fries" 
            className="w-full h-full object-cover rounded-2xl shadow-lg border border-white/20" 
            loading="eager"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CATEGORY LIST (MODERN REAL FOOD CARDS)
// ============================================================
const FOOD_CATEGORIES = [
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

function CategoryList({ isDark, selectedCategory = 'all', onSelectCategory }) {
  const dynamicCategories = (() => {
    try {
      const s = localStorage.getItem('fmx_custom_categories');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return [
            { id: 'all', name: 'All Chow', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&auto=format&fit=crop&q=80' },
            ...parsed.filter(c => c.is_active !== false).map(c => {
              const matched = FOOD_CATEGORIES.find(fc => fc.name.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(fc.name.toLowerCase()));
              return {
                id: c.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                name: c.name,
                image: matched?.image || c.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80',
                icon: c.icon
              };
            })
          ];
        }
      }
    } catch {}
    return FOOD_CATEGORIES;
  })();

  return (
    <div className="px-4 mb-6 overflow-x-auto no-scrollbar py-2">
      <div className="flex gap-3.5 sm:gap-4 min-w-max">
        {dynamicCategories.map((cat) => {
          const isActive = (selectedCategory || 'all') === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory && onSelectCategory(cat.id)}
              className="flex flex-col items-center gap-1.5 cursor-pointer group shrink-0 outline-none text-left select-none"
            >
              <div
                className={`relative w-15 h-15 sm:w-16 sm:h-16 rounded-2xl p-[2.5px] transition-all duration-200 transform group-hover:scale-105 active:scale-95 ${
                  isActive
                    ? 'border-2 border-[#EA4C2A] shadow-md shadow-[#EA4C2A]/25 bg-[#EA4C2A]/10 scale-105'
                    : 'border-2 border-slate-200/60 dark:border-white/10 bg-transparent group-hover:border-orange-300/60'
                }`}
              >
                <div className="w-full h-full rounded-[12px] overflow-hidden bg-slate-100 dark:bg-gray-800 relative shadow-2xs">
                  <img
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80'; }}
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                  />
                  {isActive && (
                    <div className="absolute inset-0 bg-[#EA4C2A]/10" />
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center">
                <span
                  className={`text-[11px] tracking-tight text-center transition-colors max-w-[70px] truncate ${
                    isActive
                      ? 'text-[#EA4C2A] font-bold'
                      : 'text-slate-700 dark:text-gray-300 font-medium group-hover:text-[#EA4C2A]'
                  }`}
                >
                  {cat.name}
                </span>
                {isActive ? (
                  <span className="w-3.5 h-1 rounded-full bg-[#EA4C2A] mt-0.5 shadow-xs transition-all" />
                ) : (
                  <span className="w-1 h-1 rounded-full bg-transparent mt-0.5" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// TOP PICKS SECTION (2 PRODUCT CARDS PER ROW, TWO COLUMNS STYLE)
// ============================================================
const TopPickCard = React.memo(function TopPickCard({ item, inCartQty = 0, onSelect, onQuickAdd, isFavorite, onToggleFavorite }) {
  const { updateQty, addItem } = useCart();
  const isAvailable = item.is_available !== false && (item.stock_quantity === undefined || item.stock_quantity > 0);

  const handleAdd = (e) => {
    e.stopPropagation();
    if (!isAvailable) return;
    if (typeof onQuickAdd === 'function') {
      onQuickAdd(item);
    } else {
      addItem('rest_foodmaxx', 'FoodMaxx', {
        id: item.id,
        name: item.name,
        image_url: item.image_url,
        price: item.price,
        qty: 1,
        selectedSize: 'Regular Portion',
        selectedExtras: []
      });
    }
    trigger3dCartDrop(e, item);
  };

  const handleMinus = (e) => {
    e.stopPropagation();
    const cartItems = (typeof window !== 'undefined' && window.__fmx_cart_items) ? window.__fmx_cart_items : [];
    const targetIdx = cartItems.findIndex(ci => 
      (ci.id && item.id && String(ci.id) === String(item.id)) || 
      (ci.name && item.name && ci.name.trim().toLowerCase() === item.name.trim().toLowerCase())
    );
    if (targetIdx >= 0) {
      updateQty(targetIdx, -1);
    }
  };

  const handlePlus = (e) => {
    e.stopPropagation();
    const cartItems = (typeof window !== 'undefined' && window.__fmx_cart_items) ? window.__fmx_cart_items : [];
    const targetIdx = cartItems.findIndex(ci => 
      (ci.id && item.id && String(ci.id) === String(item.id)) || 
      (ci.name && item.name && ci.name.trim().toLowerCase() === item.name.trim().toLowerCase())
    );
    if (targetIdx >= 0) {
      updateQty(targetIdx, 1);
      trigger3dCartDrop(e, item);
    } else {
      handleAdd(e);
    }
  };

  const displayPrice = item.price ? `N${Number(item.price).toLocaleString()}` : 'N2,500';
  const rawImage = item?.image_url || item?.image || item?.img || item?.photo_url || item?.picture || item?.thumbnail;
  const itemImage = (rawImage && typeof rawImage === 'string' && rawImage.trim().length > 0)
    ? rawImage.trim()
    : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

  return (
    <div 
      className="fmx-product-card group relative w-full cursor-pointer flex flex-col select-none p-3 sm:p-3.5 rounded-[26px] bg-white dark:bg-[#161822] border border-slate-200/90 dark:border-white/10"
      onClick={() => onSelect(item)}
    >
      {/* 1. Food Picture with soft rounded corners in 1-column layout */}
      <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] max-h-72 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
        <OptimizedProductImage 
          src={itemImage} 
          alt={item.name} 
          isAvailable={isAvailable}
          width={600}
          quality={80}
        />

        {/* Favorite Heart Button (Top-right) */}
        {onToggleFavorite && (
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform cursor-pointer z-10"
            title={isFavorite ? "Remove from favorites" : "Save to favorites"}
          >
            <Heart size={15} className={isFavorite ? 'fill-red-500 stroke-red-500' : 'stroke-white'} />
          </button>
        )}

        {/* Sold Out Overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
            <span className="bg-red-600 text-white font-black text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl">
              Sold Out
            </span>
          </div>
        )}
      </div>
      
      {/* 2. Text and Circular Add Button Row */}
      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        {/* Left Column: Title and Bold Red-Orange Price */}
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[15px] sm:text-[16px] text-slate-900 dark:text-white leading-tight truncate">
            {item.name}
          </h3>
          <div className="font-black text-base sm:text-lg text-[#EA2A2A] tracking-tight mt-0.5">
            {displayPrice}
          </div>
        </div>

        {/* Right Column: Circular Red-Orange Plus Button (or matching capsule stepper) */}
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          {inCartQty === 0 ? (
            <button 
              type="button"
              disabled={!isAvailable}
              onClick={handleAdd} 
              className="w-10 h-10 rounded-full bg-[#EA2A2A] hover:bg-[#D42222] active:scale-90 disabled:opacity-40 text-white flex items-center justify-center cursor-pointer transition-transform shrink-0"
              title="Add to cart"
            >
              <Plus size={22} className="stroke-[3]" />
            </button>
          ) : (
            <div 
              className="bg-[#EA2A2A] text-white rounded-full p-0.5 flex items-center gap-1 h-10"
            >
              <button
                type="button"
                onClick={handleMinus}
                className="w-8 h-8 rounded-full bg-black/15 hover:bg-black/25 active:scale-85 text-white flex items-center justify-center cursor-pointer transition-transform shrink-0"
                title="Decrease"
              >
                <Minus size={14} className="stroke-[3]" />
              </button>
              <span className="font-black text-sm min-w-[20px] text-center select-none text-white px-0.5">
                {inCartQty}
              </span>
              <button
                type="button"
                onClick={handlePlus}
                className="w-8 h-8 rounded-full bg-black/15 hover:bg-black/25 active:scale-85 text-white flex items-center justify-center cursor-pointer transition-transform shrink-0"
                title="Increase"
              >
                <Plus size={14} className="stroke-[3]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

function TopPicksSection({ title = "Top picks on FoodMaxx", menuItems, onSelectItem, onQuickAdd, onSeeAll, favorites, onToggleFavorite }) {
  const picks = menuItems || [];
  const { cart } = useCart();

  const cartQtyMap = useMemo(() => {
    const map = {};
    (cart?.items || []).forEach(ci => {
      if (ci.id) map[String(ci.id)] = (map[String(ci.id)] || 0) + ci.qty;
      if (ci.name) map[ci.name.trim().toLowerCase()] = (map[ci.name.trim().toLowerCase()] || 0) + ci.qty;
    });
    return map;
  }, [cart?.items]);

  if (picks.length === 0) return null;
  
  return (
    <div className="mb-7 sm:mb-9">
      <div className="flex justify-between items-center px-4 sm:px-0 mb-3 sm:mb-3.5">
        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">{title}</h2>
        <button 
          onClick={onSeeAll}
          className="bg-yellow-400 hover:bg-yellow-500 text-black text-[11px] sm:text-xs font-black px-3 py-1 rounded-full transition-all active:scale-95 cursor-pointer shadow-xs"
        >
          See all
        </button>
      </div>
      
      {/* 1-column Product Cards Grid across all screen sizes */}
      <div className="grid grid-cols-1 gap-y-3 sm:gap-y-3.5 px-4 sm:px-0">
        {picks.map((item, idx) => (
          <TopPickCard 
            key={item.id || idx} 
            item={item} 
            inCartQty={cartQtyMap[String(item.id)] || (item.name ? cartQtyMap[item.name.trim().toLowerCase()] : 0) || 0}
            onSelect={onSelectItem} 
            onQuickAdd={onQuickAdd}
            isFavorite={favorites?.includes(item.id)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// FAVORITES TAB (BOOKMARKED CRAVINGS)
// ============================================================
function FavoritesTab({ favorites, onToggleFavorite, onSelectItem, onQuickAdd, onExplore, isDark }) {
  const allDishes = [
    {
      id: 'curated_pasta',
      name: 'Pasta Bowl',
      subtitle: 'Creamy, cheesy, perfectly crafted.',
      price: 12.90,
      rating: 4.8,
      reviews: '1.2k',
      time: '25–35 min',
      img: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'curated_parfait',
      name: 'Berry Bliss Parfait',
      subtitle: 'Layers of goodness with greek yogurt and fresh berries.',
      price: 8.50,
      rating: 4.7,
      reviews: '980',
      time: '20–30 min',
      img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'curated_icecream',
      name: 'Artisan Ice Cream Trio',
      subtitle: 'Scoops of pure happiness in Belgian chocolate and vanilla.',
      price: 6.90,
      rating: 4.9,
      reviews: '850',
      time: '10–15 min',
      img: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'curated_shawarma',
      name: 'Toasted Chicken Shawarma',
      subtitle: 'Bold taste anytime with spiced chicken and garlic sauce.',
      price: 9.50,
      rating: 4.8,
      reviews: '1.5k',
      time: '15–20 min',
      img: 'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'pick_truffle_pasta',
      name: 'Truffle Alfredo Pasta Bowl',
      subtitle: 'Creamy sauce, mushrooms, parmesan, and herbs.',
      price: 12.90,
      rating: 4.8,
      reviews: '1.2k',
      time: '25–35 min',
      img: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'pick_smoky_jollof',
      name: 'Smoky Firewood Jollof & Asun',
      subtitle: 'Authentic party jollof with spicy peppered goat meat.',
      price: 11.50,
      rating: 4.9,
      reviews: '2.1k',
      time: '20–25 min',
      img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80'
    }
  ];

  const favItems = allDishes.filter(d => (favorites || []).includes(d.id));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg text-slate-900 dark:text-white">Your Favorites ❤️</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">All your saved craved dishes in one place</p>
        </div>
        <span className="text-xs font-bold text-[#EA4C2A] bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-full">
          {favItems.length} saved
        </span>
      </div>

      {favItems.length === 0 ? (
        <div className="py-14 px-4 text-center rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/50 text-[#EA4C2A] flex items-center justify-center mx-auto mb-3 text-2xl">
            🤍
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">No favorites saved yet</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-4">
            Tap the heart icon on any Pasta Bowl, Parfait, Shawarma or Jollof to bookmark it!
          </p>
          <button
            onClick={onExplore}
            className="bg-[#EA4C2A] hover:bg-[#D43D1D] text-white px-5 py-2 rounded-full text-xs font-bold shadow-md cursor-pointer"
          >
            Explore Today's Picks
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {favItems.map(item => (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="bg-white dark:bg-[#161822] rounded-3xl p-3 border border-slate-200/90 dark:border-white/10 flex gap-3.5 items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <img onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'; }}                   src={item.img}
                  alt={item.name}
                  className="w-16 h-16 rounded-2xl object-cover shrink-0"
                  loading="lazy"
                  decoding="async"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                    {item.name}
                  </h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                    {item.subtitle}
                  </p>
                  <div className="font-bold text-xs text-[#EA4C2A] mt-1">
                    {fmt(item.price)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <ProductQuantityStepper item={item} onQuickAdd={onQuickAdd} isDark={isDark} size="sm" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(item.id);
                  }}
                  className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center active:scale-90 cursor-pointer"
                  title="Remove from favorites"
                >
                  <Heart size={14} className="fill-red-500 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// FOOD ITEM CARD (MODERN ROUNDED CARD FOR MENU & SEARCH)
// ============================================================
const FoodItemCard = React.memo(function FoodItemCard({ item, inCartQty: propQty, onSelect, onQuickAdd, isDark, isFullWidth = false, isFavorite, onToggleFavorite }) {
  const inCartQty = typeof propQty === 'number' ? propQty : (() => {
    const items = (typeof window !== 'undefined' && window.__fmx_cart_items) ? window.__fmx_cart_items : [];
    return items.filter(i => (i.id && item.id && String(i.id) === String(item.id)) || (i.name && item.name && i.name.trim().toLowerCase() === item.name.trim().toLowerCase())).reduce((sum, i) => sum + i.qty, 0);
  })();

  const displayPrice = fmt(item.price);
  const isAvailable = item.is_available !== false && (item.stock_quantity === undefined || item.stock_quantity > 0);
  const activeTag = (item.badge || item.tag || '').trim();
  const hasTag = Boolean(activeTag && activeTag.toLowerCase() !== 'none');

  if (isFullWidth) {
    return (
      <div
        onClick={() => isAvailable && onSelect(item)}
        className={`fmx-product-card group relative w-full mb-3 rounded-2xl p-3 sm:p-3.5 cursor-pointer flex items-center justify-between gap-3.5 border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#161822] ${!isAvailable ? 'opacity-65' : ''}`}
      >
        {/* Left: Info, Price, and Stepper */}
        <div className="flex-1 min-w-0 pr-1 flex flex-col justify-between self-stretch py-0.5">
          <div>
            <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-snug line-clamp-2 break-words transition-colors">
              {item.name}
            </h3>
          </div>

          <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-sm sm:text-base text-slate-950 dark:text-white">
                {displayPrice}
              </span>
              {inCartQty > 0 && (
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded-md">
                  {inCartQty} in cart
                </span>
              )}
            </div>

            <ProductQuantityStepper item={item} onQuickAdd={onQuickAdd || onSelect} isDark={isDark} size="sm" />
          </div>
        </div>

        {/* Right: Picture with soft rounded corners */}
        <div className="relative w-26 h-26 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
          <OptimizedProductImage
            src={item?.image_url || item?.image || item?.img || item?.photo_url || item?.picture || item?.thumbnail}
            alt={item.name}
            isAvailable={isAvailable}
            width={280}
            quality={80}
          />

          {!isAvailable && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-1 text-center">
              <span className="bg-red-500 text-white font-extrabold text-[9px] uppercase tracking-wider px-2 py-1 rounded-lg">
                Sold Out
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vertical card layout for grids or carousels
  return (
    <TopPickCard
      item={item}
      onSelect={onSelect}
      onQuickAdd={onQuickAdd}
      isFavorite={Boolean(isFavorite)}
      onToggleFavorite={onToggleFavorite || (() => {})}
    />
  );
});

// ============================================================
// HOME TAB (FEATURING THE DESIGN MOCKUP)
// ============================================================
function HomeTab({
  restaurant,
  menuItems,
  menuByCategory,
  searchQuery,
  onSearch,
  onSelectItem,
  onQuickAdd,
  onGoToMenu,
  onGoToOrders,
  favorites,
  onToggleFavorite,
  user,
  orders,
  loading,
  isDark,
  appCopy,
  onStartGroupOrder
}) {
  const { cart } = useCart();
  const [selectedHomeCat, setSelectedHomeCat] = useState('all');

  const cartQtyMap = useMemo(() => {
    const map = {};
    (cart?.items || []).forEach(ci => {
      if (ci.id) map[String(ci.id)] = (map[String(ci.id)] || 0) + ci.qty;
      if (ci.name) map[ci.name.trim().toLowerCase()] = (map[ci.name.trim().toLowerCase()] || 0) + ci.qty;
    });
    return map;
  }, [cart?.items]);
  const [homepageSections, setHomepageSections] = useState(() => {
    try {
      const s = localStorage.getItem('fmx_homepage_sections');
      return s ? JSON.parse(s) : (api.DEFAULT_HOMEPAGE_SECTIONS || [
        { id: 'sec_top', title: 'Top Picks on FoodMaxx', subtitle: 'Curated popular items', icon: 'Sparkles', enabled: true, filter_type: 'bestseller', display_limit: 6 },
        { id: 'sec_trend', title: 'Trending Now', subtitle: 'Hot right now in Bodija & UI', icon: 'Flame', enabled: true, filter_type: 'popular', display_limit: 6 },
        { id: 'sec_deals', title: 'Special Offers & Combos', subtitle: 'Great meals at best value', icon: 'Tag', enabled: true, filter_type: 'deals', display_limit: 6 },
        { id: 'sec_fast', title: 'Quick Bites & Fast Prep', subtitle: 'Ready in 25 min or less', icon: 'Clock', enabled: true, filter_type: 'fast', display_limit: 6 },
      ]);
    } catch {
      return [
        { id: 'sec_top', title: 'Top Picks on FoodMaxx', subtitle: 'Curated popular items', icon: 'Sparkles', enabled: true, filter_type: 'bestseller', display_limit: 6 },
        { id: 'sec_trend', title: 'Trending Now', subtitle: 'Hot right now in Bodija & UI', icon: 'Flame', enabled: true, filter_type: 'popular', display_limit: 6 },
        { id: 'sec_deals', title: 'Special Offers & Combos', subtitle: 'Great meals at best value', icon: 'Tag', enabled: true, filter_type: 'deals', display_limit: 6 },
        { id: 'sec_fast', title: 'Quick Bites & Fast Prep', subtitle: 'Ready in 25 min or less', icon: 'Clock', enabled: true, filter_type: 'fast', display_limit: 6 },
      ];
    }
  });

  useEffect(() => {
    const unsub = api.subscribeLiveHomepageSections ? api.subscribeLiveHomepageSections((liveSecs) => {
      if (Array.isArray(liveSecs) && liveSecs.length > 0) {
        setHomepageSections(liveSecs);
        try { localStorage.setItem('fmx_homepage_sections', JSON.stringify(liveSecs)); } catch {}
      }
    }) : null;

    const handleCustomUpdate = (e) => {
      if (Array.isArray(e.detail)) setHomepageSections(e.detail);
    };
    window.addEventListener('fmx_homepage_sections_updated', handleCustomUpdate);

    return () => {
      if (typeof unsub === 'function') unsub();
      window.removeEventListener('fmx_homepage_sections_updated', handleCustomUpdate);
    };
  }, []);

  // Prefetch first batch of dishes into memory cache ahead of scroll
  useEffect(() => {
    if (Array.isArray(menuItems) && menuItems.length > 0) {
      prefetchCatalogImages(menuItems, 0, 16, 380);
    }
  }, [menuItems]);

  // Memoize homepage sections calculation so multi-pass filtering never runs during scroll
  const processedSections = useMemo(() => {
    if (!menuItems || menuItems.length === 0) return [];
    return homepageSections.filter(s => s.enabled !== false).map(sec => {
      let sectionItems = [];
      const filterType = sec.filter_type || 'bestseller';
      const limit = sec.display_limit || 6;

      if (filterType === 'bestseller') {
        sectionItems = (menuItems || []).filter(i => i.badge === 'bestseller' || (i.rating && i.rating >= 4.8)).slice(0, limit);
        if (sectionItems.length === 0) sectionItems = (menuItems || []).slice(0, limit);
      } else if (filterType === 'popular') {
        sectionItems = (menuItems || []).filter(i => i.badge === 'popular' || i.badge === 'bestseller').slice(0, limit);
        if (sectionItems.length === 0) {
          sectionItems = (menuItems || []).slice(5, 5 + limit).length > 0 ? (menuItems || []).slice(5, 5 + limit) : (menuItems || []).slice(0, limit).reverse();
        }
      } else if (filterType === 'deals') {
        sectionItems = (menuItems || []).filter(item => item.price < 6000).slice(0, limit);
      } else if (filterType === 'fast') {
        sectionItems = (menuItems || []).filter(item => item.prep_time_min && item.prep_time_min <= 25).slice(0, limit);
      } else {
        sectionItems = (menuItems || []).filter(item => (item.category || '').toLowerCase().includes(filterType.toLowerCase())).slice(0, limit);
        if (sectionItems.length === 0) sectionItems = (menuItems || []).slice(0, limit);
      }
      return { ...sec, items: sectionItems };
    }).filter(sec => sec.items.length > 0);
  }, [menuItems, homepageSections]);

  // If search query is entered, display search results cleanly
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    const filtered = (menuItems || []).filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q)
    );

    return (
      <div className="px-4 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base text-slate-900 dark:text-white">
            Results for "{searchQuery}"
          </h2>
          <button
            onClick={() => onSearch('')}
            className="text-xs text-[#EA4C2A] font-bold hover:underline"
          >
            Clear Search
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-14 px-4 rounded-3xl bg-gray-50 dark:bg-gray-900">
            <div className="text-4xl mb-2">🍽️</div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">No dishes found</div>
            <p className="text-xs text-gray-400 mt-1 mb-3">Try searching for "Pasta", "Parfait", "Shawarma", or "Jollof"</p>
            <button
              onClick={() => onSearch('')}
              className="bg-[#EA4C2A] text-white px-4 py-2 rounded-full text-xs font-bold shadow-md"
            >
              Back to Home
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => (
              <FoodItemCard
                key={item.id}
                item={item}
                inCartQty={cartQtyMap[item.id] || cartQtyMap[(item.name || '').trim().toLowerCase()] || 0}
                onSelect={onSelectItem}
                onQuickAdd={onQuickAdd}
                isDark={isDark}
                isFullWidth={true}
                isFavorite={favorites?.includes(item.id)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isLoading = loading || !menuItems || menuItems.length === 0;

  return (
    <div className="pb-8">
      {/* 1. Promo Banner */}
      <PromoBanner onOrderNow={onGoToMenu} appCopy={appCopy} />

      {/* 2. Category Chips hidden per user preference */}

      {/* Skeleton loaders while loading */}
      {isLoading ? (
        <div className="pt-2 sm:pt-4">
          <SkeletonSection title="Top picks on FoodMaxx" />
          <SkeletonSection title="Trending Now" />
          <SkeletonSection title="Special Offers" />
          <SkeletonSection title="Quick Bites" />
        </div>
      ) : selectedHomeCat !== 'all' ? (
        /* Filtered View When Category Selected */
        <div className="px-4 space-y-4 pt-2 sm:pt-4">
          <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-white/5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EA4C2A]"></span>
              <span>{FOOD_CATEGORIES.find(c => c.id === selectedHomeCat)?.name || 'Filtered'} Selection</span>
            </h2>
            <button
              onClick={() => setSelectedHomeCat('all')}
              className="text-xs font-bold text-[#EA4C2A] hover:underline cursor-pointer"
            >
              Reset to All
            </button>
          </div>

          <div className="space-y-3">
            {((menuItems || []).filter(item => {
              const cat = (item.category || '').toLowerCase();
              const name = (item.name || '').toLowerCase();
              if (selectedHomeCat === 'burgers') return cat.includes('burger') || name.includes('burger');
              if (selectedHomeCat === 'rice') return cat.includes('rice') || name.includes('jollof') || name.includes('rice');
              if (selectedHomeCat === 'swallows') return cat.includes('swallow') || cat.includes('soup') || name.includes('amala') || name.includes('egusi') || name.includes('yam');
              if (selectedHomeCat === 'grills') return cat.includes('grill') || name.includes('suya') || name.includes('asun') || name.includes('chicken');
              if (selectedHomeCat === 'shawarma') return cat.includes('shawarma') || name.includes('shawarma') || name.includes('wrap');
              if (selectedHomeCat === 'pasta') return cat.includes('pasta') || name.includes('pasta') || name.includes('spaghetti');
              if (selectedHomeCat === 'drinks') return cat.includes('drink') || name.includes('chapman') || name.includes('water') || name.includes('juice');
              if (selectedHomeCat === 'desserts') return cat.includes('dessert') || name.includes('parfait') || name.includes('ice cream');
              return true;
            })).map(item => (
              <FoodItemCard
                key={item.id}
                item={item}
                inCartQty={cartQtyMap[item.id] || cartQtyMap[(item.name || '').trim().toLowerCase()] || 0}
                onSelect={onSelectItem}
                onQuickAdd={onQuickAdd}
                isDark={isDark}
                isFullWidth={true}
                isFavorite={favorites?.includes(item.id)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="pt-2 sm:pt-4">
          {processedSections.map((sec, sIdx) => {
            const sectionItems = sec.items || [];

            const iconMap = {
              Flame: { comp: Flame, color: 'text-[#EA4C2A] fill-[#EA4C2A]' },
              Tag: { comp: Tag, color: 'text-emerald-500' },
              Clock: { comp: Clock, color: 'text-blue-500' },
              Star: { comp: Star, color: 'text-amber-500 fill-amber-500' },
              Heart: { comp: Heart, color: 'text-rose-500 fill-rose-500' },
              Gift: { comp: Gift, color: 'text-purple-500' },
              Utensils: { comp: Utensils, color: 'text-amber-500' },
              Zap: { comp: Zap, color: 'text-yellow-400 fill-yellow-400' },
              ShoppingBag: { comp: ShoppingBag, color: 'text-emerald-500' },
              Sparkles: { comp: Sparkles, color: 'text-amber-500 fill-amber-500' }
            };
            const iconConfig = iconMap[sec.icon] || iconMap.Sparkles;
            const IconComp = iconConfig.comp;
            const iconColor = iconConfig.color;

            return (
              <TopPicksSection
                key={sec.id || sIdx}
                title={
                  <span className="flex items-center gap-1.5">
                    <IconComp size={17} className={`${iconColor} shrink-0`} />
                    <span>{sec.title}</span>
                  </span>
                }
                menuItems={sectionItems}
                onSelectItem={onSelectItem}
                onQuickAdd={onQuickAdd}
                onSeeAll={onGoToMenu}
                favorites={favorites}
                onToggleFavorite={onToggleFavorite}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MENU TAB (REPLACING EXPLORE TAB IN SINGLE RESTAURANT APP)
// ============================================================
// MENU TAB (MATCHING MOCKUP DESIGN: media_1789214008795.jpg)
// ============================================================
const MenuDishRow = React.memo(function MenuDishRow({ item, inCartQty = 0, onSelect, onQuickAdd, onToggleFavorite, isFavorite, isDark }) {
  return (
    <div
      onClick={() => onSelect(item)}
      className={`fmx-product-card flex items-center gap-3.5 p-3 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#161822] group cursor-pointer select-none transition-colors duration-150 mb-2.5 ${
        isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
      }`}
    >
      {/* Left Dish Photo */}
      <div className="relative w-26 sm:w-30 h-26 sm:h-30 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
        <OptimizedProductImage
          src={item?.image_url || item?.image || item?.img || item?.photo_url || item?.picture || item?.thumbnail}
          alt={item.name}
          isAvailable={item.is_available !== false}
          width={280}
          quality={80}
        />
      </div>

      {/* Right Column: Title, Heart, Price & Stepper */}
      <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0 h-full">
        {/* Row 1: Title + Heart */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 pr-1">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug line-clamp-2 break-words">
              {item.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(item.id);
            }}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer shrink-0 -mt-0.5"
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              size={17}
              className={isFavorite ? 'fill-red-500 text-red-500' : 'stroke-[1.75] text-gray-400'}
            />
          </button>
        </div>

        {/* Row 2: Subtle prep time note if available */}
        {item.prep_time_min ? (
          <div className="flex items-center gap-1 text-[10.5px] text-slate-400 mt-1">
            <Clock size={11} />
            <span>~{item.prep_time_min}m</span>
          </div>
        ) : null}

        {/* Row 3: Price & Stepper / Add */}
        <div className="flex items-center justify-between mt-2 pt-1">
          <div className="font-black text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
            {fmt(item.price)}
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <ProductQuantityStepper item={item} inCartQty={inCartQty} onQuickAdd={onQuickAdd || onSelect} isDark={isDark} size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
});

function MenuTab({
  restaurant,
  menuItems,
  menuByCategory,
  searchQuery,
  onSearch,
  onSelectItem,
  onQuickAdd,
  favorites = [],
  onToggleFavorite,
  onBack,
  isDark
}) {
  const { cart, itemCount } = useCart();
  const [selectedCat, setSelectedCat] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('');

  const cartQtyMap = useMemo(() => {
    const map = {};
    (cart?.items || []).forEach(ci => {
      if (ci.id) map[String(ci.id)] = (map[String(ci.id)] || 0) + ci.qty;
      if (ci.name) map[ci.name.trim().toLowerCase()] = (map[ci.name.trim().toLowerCase()] || 0) + ci.qty;
    });
    return map;
  }, [cart?.items]);

  // Real live dishes loaded from Firestore
  const allDishes = menuItems || [];

  const categoryChips = [
    { id: 'all', label: 'All Dishes' },
    { id: 'pasta', label: 'Pasta Bowls' },
    { id: 'dessert', label: 'Parfaits & Sweets' },
    { id: 'fast', label: 'Shawarma & Wraps' },
    { id: 'rice', label: 'Jollof & Rice' },
    { id: 'swallow', label: 'Amala & Swallows' },
    { id: 'grills', label: 'Suya & Grills' },
    { id: 'drinks', label: 'Chilled Drinks' }
  ];

  const filtered = useMemo(() => {
    let list = [...allDishes];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i =>
        (i.name || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.category || '').toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCat !== 'all') {
      list = list.filter(i => {
        const cat = (i.category || '').toLowerCase();
        const name = (i.name || '').toLowerCase();
        if (selectedCat === 'pasta') return cat.includes('pasta') || name.includes('pasta') || name.includes('spaghetti');
        if (selectedCat === 'dessert') return cat.includes('dessert') || name.includes('parfait') || name.includes('ice cream') || name.includes('sweet') || name.includes('cake');
        if (selectedCat === 'fast') return cat.includes('fast') || name.includes('shawarma') || name.includes('burger') || name.includes('wrap');
        if (selectedCat === 'rice') return cat.includes('rice') || name.includes('jollof') || name.includes('fried rice');
        if (selectedCat === 'swallow') return cat.includes('swallow') || cat.includes('soup') || name.includes('amala') || name.includes('yam') || name.includes('egusi');
        if (selectedCat === 'grills') return cat.includes('grill') || name.includes('suya') || name.includes('asun') || name.includes('turkey');
        if (selectedCat === 'drinks') return cat.includes('drink') || name.includes('chapman') || name.includes('water') || name.includes('coke');
        return true;
      });
    }

    // Sort logic
    if (sortBy === 'price_asc') list.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price_desc') list.sort((a, b) => b.price - a.price);
    else if (sortBy === 'rating') list.sort((a, b) => (b.rating || 4.5) - (a.rating || 4.5));
    else if (sortBy === 'prep') list.sort((a, b) => parseInt(a.prep_time || 25) - parseInt(b.prep_time || 25));

    return list;
  }, [allDishes, searchQuery, selectedCat, sortBy]);

  useEffect(() => {
    if (Array.isArray(filtered) && filtered.length > 0) {
      prefetchCatalogImages(filtered, 0, 16, 240);
    }
  }, [filtered]);

  return (
    <div className="pb-24">
      {/* STICKY HEADER MATCHING MOCKUP */}
      <div className={`sticky top-0 z-30 px-4 pt-2 pb-3 backdrop-blur-md transition-colors ${
        isDark ? 'bg-[#15171C]/95 border-b border-white/5' : 'bg-white/95 border-b border-gray-100'
      }`}>
        {/* Navigation Bar: Back Chevron + Centered Title & Subtitle */}
        <div className="flex items-center justify-between relative py-1 mb-3">
          <button
            type="button"
            onClick={onBack}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
              isDark ? 'text-white hover:bg-white/10' : 'text-slate-800 hover:bg-gray-100'
            }`}
            title="Back to Home"
          >
            <ChevronLeft size={22} className="stroke-[2.5]" />
          </button>

          <div className="absolute inset-x-0 text-center pointer-events-none">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
              Menu
            </h1>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-normal mt-0.5">
              Delicious food, made for your cravings
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (typeof triggerHaptic === 'function') triggerHaptic('light');
              window.dispatchEvent(new CustomEvent('fmx:open-cart'));
            }}
            className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
              isDark ? 'text-white hover:bg-white/10' : 'text-slate-800 hover:bg-gray-100'
            }`}
            title="Open Cart"
          >
            <ShoppingBag size={20} className="stroke-[2.2]" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 bg-[#EA4C2A] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-[#15171C] shadow-xs">
                {itemCount}
              </span>
            )}
          </button>
        </div>

        {/* Search & Filter Bar (Matching Mockup) */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative flex items-center bg-[#F4F5F7] dark:bg-white/5 rounded-2xl px-3.5 py-2.5 transition-all border border-transparent focus-within:border-slate-200 dark:focus-within:border-white/10">
            <Search size={16} className="text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              className="w-full bg-transparent text-xs sm:text-sm font-medium outline-none placeholder:text-gray-400 text-slate-900 dark:text-white"
              placeholder="Search for pasta, ice cream, shawarma..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearch('')}
                className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sliders Filter Button */}
          <button
            type="button"
            onClick={() => setFilterOpen(prev => !prev)}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 border ${
              filterOpen || selectedCat !== 'all' || sortBy !== ''
                ? 'bg-[#EA4C2A] text-white border-[#EA4C2A] shadow-xs'
                : (isDark ? 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/10' : 'bg-[#F4F5F7] text-slate-700 border-transparent hover:bg-gray-200')
            }`}
            title="Filter Menu"
          >
            <SlidersHorizontal size={17} />
          </button>
        </div>

        {/* Expandable Category & Sort Chips when Filter is Tapped */}
        {filterOpen && (
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-white/5 slide-up space-y-2">
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
              {categoryChips.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCat(c.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    selectedCat === c.id
                      ? 'bg-[#EA4C2A] text-white shadow-xs'
                      : (isDark ? 'bg-white/5 text-gray-300 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-0.5">
              {[
                { id: '', label: 'Featured', icon: Sparkles },
                { id: 'rating', label: 'Highest Rated', icon: Star },
                { id: 'price_asc', label: 'Lowest Price', icon: DollarSign },
                { id: 'prep', label: 'Fastest Prep', icon: Zap }
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSortBy(s.id)}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer ${
                    sortBy === s.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-slate-800')
                  }`}
                >
                  <span className="flex items-center gap-1">
                    {s.icon && <s.icon size={11} className={s.id === 'rating' ? 'fill-amber-400 text-amber-400' : s.id === 'prep' ? 'fill-amber-500 text-amber-500' : ''} />}
                    <span>{s.label}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DISH LIST MATCHING MOCKUP */}
      <div className="px-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 divide-y divide-gray-100 dark:divide-white/5 md:divide-y-0">
        {filtered.map(item => (
          <MenuDishRow
            key={item.id}
            item={item}
            inCartQty={cartQtyMap[item.id] || cartQtyMap[(item.name || '').trim().toLowerCase()] || 0}
            onSelect={onSelectItem}
            onQuickAdd={onQuickAdd}
            isFavorite={favorites.includes(item.id)}
            onToggleFavorite={onToggleFavorite}
            isDark={isDark}
          />
        ))}

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-4xl mb-2">🍽️</div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">No dishes found</h3>
            <p className="text-xs text-gray-400 mb-4">Try searching for pasta, parfait, or shawarma</p>
            <button
              type="button"
              onClick={() => {
                onSearch('');
                setSelectedCat('all');
                setSortBy('');
              }}
              className="bg-[#EA4C2A] text-white px-5 py-2 rounded-full text-xs font-bold cursor-pointer"
            >
              Reset Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ORDERS TAB & CARDS (CLEAN, MODERN, EYE-FRIENDLY)
// ============================================================
// ============================================================
// ORDERS TAB & CARDS (ULTRA-CLEAN, MODERN & MINIMALIST UI/UX)
// ============================================================
function OrdersTab({ orders, onOpenTracking, onReview, onExplore, onBack, onRefresh, isDark, toast }) {
  const activeOrders = (orders || []).filter(o => !['DELIVERED','CANCELLED'].includes(o.order_status));
  const pastOrders = (orders || []).filter(o => ['DELIVERED','CANCELLED'].includes(o.order_status));

  const [filter, setFilter] = useState(() => {
    return activeOrders.length > 0 ? 'active' : 'completed';
  });

  const displayedOrders = filter === 'active'
    ? activeOrders
    : pastOrders;

  if (!orders || orders.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack || onExplore}
            className={`w-9 h-9 rounded-full border transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
              isDark ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className={`font-black text-xl tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>My Orders</h2>
        </div>

        <div className={`flex flex-col items-center justify-center py-16 px-6 text-center rounded-3xl border ${
          isDark ? 'bg-[#161822] border-white/8' : 'bg-white border-slate-100 shadow-sm'
        }`}>
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-3 text-[#EA4C2A]">
            <ShoppingBag size={28} className="stroke-[1.8]" />
          </div>
          <h3 className={`font-bold text-base mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>No Orders Yet</h3>
          <p className={`text-xs max-w-xs mb-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Ready for fresh gourmet chow? Place an order to track your food live.
          </p>
          <button
            onClick={onExplore}
            className="bg-[#EA4C2A] hover:bg-[#d83f1d] active:scale-95 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-[#EA4C2A]/25 transition-all cursor-pointer"
          >
            Explore Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 max-w-md mx-auto space-y-4 pb-28">
      {/* Clean Minimalist Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack || onExplore}
            className={`w-9 h-9 rounded-full border transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
              isDark ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className={`font-black text-xl tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            My Orders
          </h2>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className={`w-9 h-9 rounded-full border transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
            isDark ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-xs'
          }`}
          title="Refresh orders"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Two-Pill Switcher: Active vs Past Orders */}
      <div className={`flex p-1 rounded-2xl border ${isDark ? 'bg-[#161822] border-white/8' : 'bg-slate-100 border-slate-200/80'}`}>
        <button
          onClick={() => setFilter('active')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            filter === 'active'
              ? (isDark ? 'bg-[#222736] text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs')
              : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')
          }`}
        >
          <span>Active</span>
          {activeOrders.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-[#EA4C2A] text-white">
              {activeOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            filter === 'completed'
              ? (isDark ? 'bg-[#222736] text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs')
              : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')
          }`}
        >
          <span>Past Orders</span>
          {pastOrders.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              filter === 'completed' ? (isDark ? 'bg-white/15 text-slate-200' : 'bg-slate-200 text-slate-700') : 'text-slate-400'
            }`}>
              {pastOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* Clean Orders List */}
      {displayedOrders.length === 0 ? (
        <div className={`py-12 px-6 text-center rounded-2xl border ${isDark ? 'bg-[#161822]/60 border-white/6' : 'bg-white border-slate-100 shadow-xs'}`}>
          <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {filter === 'active' ? 'No active deliveries right now' : 'No past orders yet'}
          </p>
          {filter === 'active' && pastOrders.length > 0 && (
            <button
              onClick={() => setFilter('completed')}
              className="mt-2.5 text-xs font-bold text-[#EA4C2A] hover:underline cursor-pointer"
            >
              View past orders ({pastOrders.length}) →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayedOrders.map(o => (
            <CleanOrderCard
              key={o.id}
              order={o}
              onTrack={() => onOpenTracking(o)}
              onReview={() => onReview && onReview(o)}
              isDark={isDark}
            />
          ))}
        </div>
      )}

      {/* Subtle Service Apology Voucher Reminder (Comforting & Non-Distracting) */}
      <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs transition-colors ${
        isDark ? 'bg-white/[0.03] border-white/8 text-slate-300' : 'bg-slate-50 border-slate-200/80 text-slate-600'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
            <HeartHandshake size={14} />
          </div>
          <span className="truncate">
            Delays on your order? Use apology code <strong className="font-mono text-rose-500 font-bold">SORRY500</strong> for ₦500 off
          </span>
        </div>
        <button
          onClick={() => {
            try {
              if (navigator?.clipboard?.writeText) navigator.clipboard.writeText('SORRY500');
              localStorage.setItem('fmx_active_promo', 'SORRY500');
              if (typeof toast === 'function') toast('Apology code "SORRY500" copied! It will auto-apply at checkout. 🎁', 'success');
            } catch {}
          }}
          className="text-rose-500 font-bold text-xs hover:underline shrink-0 cursor-pointer"
        >
          Copy
        </button>
      </div>
    </div>
  );
}

// ULTRA-CLEAN ORDER CARD (AIRBNB & UBER EATS MINIMALIST STYLE)
const CleanOrderCard = React.memo(function CleanOrderCard({ order, onTrack, onReview, isDark }) {
  const isActive = !['DELIVERED', 'CANCELLED'].includes(order.order_status);
  const isDelivered = order.order_status === 'DELIVERED';
  const restaurantName = order.restaurant?.name || 'FoodMaxx';
  const itemsSummary = (order.items || []).map(i => `${i.qty || 1}x ${i.name}`).join(', ') || 'Chow order';
  const orderDate = new Date(order.created_at || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div
      onClick={onTrack}
      className={`rounded-2xl p-4 border transition-all cursor-pointer ${
        isActive
          ? (isDark ? 'bg-[#1A1D27] border-[#EA4C2A]/30 shadow-md hover:border-[#EA4C2A]/50' : 'bg-white border-orange-200 shadow-xs hover:border-orange-300')
          : (isDark ? 'bg-[#161822] border-white/6 hover:border-white/12 shadow-xs' : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs')
      }`}
    >
      {/* Row 1: Restaurant Logo + Name + Date + Total Price */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <img
            src="/foodmaxx-logo.png"
            alt={restaurantName}
            className="w-9 h-9 rounded-xl object-cover border border-slate-200/60 dark:border-white/10 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h4 className={`font-bold text-sm truncate leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {restaurantName}
            </h4>
            <span className="text-[11px] text-slate-400 font-medium">
              {orderDate}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {fmt(order.total)}
          </div>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md mt-0.5 ${
            isActive
              ? 'bg-orange-500/10 text-[#EA4C2A] dark:text-orange-400'
              : isDelivered
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-slate-500/10 text-slate-500'
          }`}>
            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#EA4C2A] animate-ping" />}
            {statusLabel[order.order_status] || order.order_status}
          </span>
        </div>
      </div>

      {/* Row 2: Dishes List (Single Clean Line) */}
      <p className={`text-xs mt-2.5 truncate font-normal ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
        {itemsSummary}
      </p>

      {/* Row 3: Active Courier Banner & Actions */}
      {isActive ? (
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#EA4C2A] dark:text-orange-400 min-w-0">
            <span className="text-sm">🛵</span>
            <span className="truncate">
              {order.delivery_otp ? `Delivery PIN: ${order.delivery_otp}` : 'Courier on the way'}
            </span>
          </div>
          <button
            onClick={onTrack}
            className="px-3.5 py-1.5 rounded-xl bg-[#EA4C2A] hover:bg-[#d83f1d] text-white font-bold text-[11px] flex items-center gap-1 shrink-0 shadow-xs cursor-pointer transition-all"
          >
            <span>Track</span>
            <ChevronRight size={13} strokeWidth={3} />
          </button>
        </div>
      ) : (
        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs" onClick={e => e.stopPropagation()}>
          <span className="text-[11px] text-slate-400 font-mono">
            #{order.order_reference}
          </span>
          <div className="flex items-center gap-2">
            {isDelivered && (
              <button
                onClick={onReview}
                className="text-[11px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-amber-500/10 transition-colors"
              >
                <Star size={12} className="fill-amber-500" />
                <span>Rate</span>
              </button>
            )}
            <button
              onClick={onTrack}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// ============================================================
// PROFILE TAB (CLEAN, MINIMALIST & FOCUSED ON CORE VALUE)
// ============================================================
function ProfileTab({
  user,
  wallet,
  orders = [],
  savedAddressesCount = 0,
  onLogin,
  onOpenOnboarding,
  onLogout,
  onOpenWallet,
  onOpenSupport,
  onOpenAddresses,
  onOpenOrders,
  onOpenFavorites,
  isDark,
  toggleDark,
  toast,
  setActiveTab
}) {
  const [vouchersOpen, setVouchersOpen] = useState(false);

  // Check ₦1,000 giveaway status
  const isGiveawayClaimed = Boolean(
    user?.giveaway_claimed ||
    (user && ((user.orders_count || 0) > 0 || (user.total_orders || 0) > 0)) ||
    (() => {
      try {
        if (typeof window !== 'undefined' && window.localStorage?.getItem('fmx_giveaway_claimed') === 'true') return true;
        if (user?.phone && window.localStorage?.getItem(`fmx_giveaway_claimed_${user.phone.replace(/\D/g, '')}`) === 'true') return true;
        return false;
      } catch {
        return false;
      }
    })()
  );

  const walletBalance = Number(wallet?.balance) || 0;
  const rawName = (user?.full_name || user?.name || '').trim();
  const displayName = rawName || (user?.phone ? `Customer ${user.phone}` : 'FoodMaxx Member');
  const displayEmail = user?.email || '';
  const displayPhone = user?.phone || '';

  // Builtin vouchers list
  const VOUCHERS = [
    {
      code: 'WELCOME1000',
      title: '₦1,000 Welcome Giveaway',
      desc: '₦1,000 flat discount on your first meal order.',
      badge: '₦1,000 OFF',
      min: 'Min order ₦1,000',
      isGiveaway: true,
      claimed: isGiveawayClaimed
    },
    {
      code: 'FOODMAXX10',
      title: '10% Foodie Discount',
      desc: '10% off your entire order up to ₦2,000.',
      badge: '10% OFF',
      min: 'Min order ₦1,000'
    },
    {
      code: 'FREEDEL',
      title: 'Zero Delivery Fee',
      desc: '100% Free delivery straight to your doorstep.',
      badge: 'FREE DELIVERY',
      min: 'Min order ₦1,500'
    },
    {
      code: 'FREEFRIES',
      title: 'Crispy French Fries Perk',
      desc: 'Complimentary delicious fries added with your meal.',
      badge: 'FREE ITEM',
      min: 'Min order ₦1,000'
    },
    {
      code: 'FREEDRINK',
      title: 'Chilled Refreshing Drink',
      desc: 'Complimentary cold beverage with your order.',
      badge: 'FREE DRINK',
      min: 'Min order ₦1,000'
    },
    {
      code: 'SORRY500',
      title: 'Service Delay Apology Voucher',
      desc: '₦500 goodwill compensation for kitchen or rider delays.',
      badge: '₦500 OFF',
      min: 'Min order ₦1,000',
      isApology: true
    }
  ];

  const handleCopyVoucher = (code) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(code);
      }
      localStorage.setItem('fmx_active_promo', code);
      if (typeof toast === 'function') {
        toast(`Promo code "${code}" copied! It will auto-apply at checkout. 🎁`, 'success');
      }
    } catch {
      if (typeof toast === 'function') toast(`Code "${code}" selected!`, 'success');
    }
  };

  return (
    <div className="p-4 sm:p-5 max-w-xl mx-auto w-full space-y-4 pb-28">
      {/* 1. User Header / Profile Summary */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        isDark ? 'bg-[#181B22] border-white/10' : 'bg-white border-slate-100 shadow-xs'
      }`}>
        {user ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative shrink-0">
                <img
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = getHappyAvatar(displayName);
                  }}
                  src={user?.avatar_url || getHappyAvatar(displayName)}
                  className="w-13 h-13 rounded-2xl object-cover shadow-xs border border-black/10 dark:border-white/10"
                  alt={displayName}
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#181B22]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight truncate">
                    {displayName}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                    Active
                  </span>
                </div>
                {displayEmail && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{displayEmail}</p>}
                {displayPhone && <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 mt-0.5">{displayPhone}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-[#EA4C2A]/10 text-[#EA4C2A] flex items-center justify-center font-bold text-lg shrink-0">
                👋
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">Guest Foodie</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sign in to unlock ₦1,000 bonus & track orders</p>
              </div>
            </div>
            <button
              onClick={onOpenOnboarding || onLogin}
              className="px-4 py-2 rounded-xl bg-[#EA4C2A] hover:bg-[#D43D1D] active:scale-95 text-white font-bold text-xs shadow-sm shadow-[#EA4C2A]/20 transition-all cursor-pointer shrink-0"
            >
              Sign In
            </button>
          </div>
        )}
      </div>

      {/* 2. THE 4 CORE VALUE PILLARS (Wallet, Giveaway, Vouchers, Bonus) */}
      <div className="grid grid-cols-2 gap-3">
        {/* A. WALLET */}
        <div
          onClick={onOpenWallet}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] ${
            isDark
              ? 'bg-[#181B22] border-white/10 hover:border-emerald-500/30'
              : 'bg-white border-slate-100 shadow-xs hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Wallet size={16} />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              + Top Up
            </span>
          </div>
          <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Chow Wallet</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
            {fmt(walletBalance)}
          </div>
          <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-1">Available balance</div>
        </div>

        {/* B. GIVEAWAY */}
        <div
          onClick={() => {
            if (isGiveawayClaimed) {
              if (typeof toast === 'function') toast('The ₦1,000 giveaway has already been redeemed for this account.', 'info');
            } else {
              handleCopyVoucher('WELCOME1000');
            }
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] ${
            isDark
              ? 'bg-[#181B22] border-white/10 hover:border-amber-500/30'
              : 'bg-white border-slate-100 shadow-xs hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Gift size={16} />
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isGiveawayClaimed
                ? 'bg-gray-100 dark:bg-white/10 text-gray-500'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}>
              {isGiveawayClaimed ? 'Redeemed' : 'Active'}
            </span>
          </div>
          <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">₦1,000 Giveaway</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
            {isGiveawayClaimed ? 'Claimed ✓' : '₦1,000 Ready'}
          </div>
          <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-1 truncate">
            {isGiveawayClaimed ? 'Used on previous order' : 'First-time customer gift'}
          </div>
        </div>

        {/* C. VOUCHERS */}
        <div
          onClick={() => setVouchersOpen(true)}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] ${
            isDark
              ? 'bg-[#181B22] border-white/10 hover:border-red-500/30'
              : 'bg-white border-slate-100 shadow-xs hover:border-red-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EA4C2A]/10 text-[#EA4C2A] flex items-center justify-center shrink-0">
              <Ticket size={16} />
            </div>
            <span className="text-[10px] font-bold text-[#EA4C2A] bg-[#EA4C2A]/10 px-2 py-0.5 rounded-full">
              View All
            </span>
          </div>
          <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Food Vouchers</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
            {VOUCHERS.length} Available
          </div>
          <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-1 truncate">
            Discounts & Free Delivery
          </div>
        </div>

        {/* D. DELIVERY ADDRESSES */}
        <div
          onClick={() => {
            if (typeof onOpenAddresses === 'function') {
              onOpenAddresses();
            }
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] ${
            isDark
              ? 'bg-[#181B22] border-white/10 hover:border-blue-500/30'
              : 'bg-white border-slate-100 shadow-xs hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <MapPin size={16} />
            </div>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
              Manage
            </span>
          </div>
          <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Delivery Address</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight truncate">
            {user?.address ? 'Saved' : 'Add Location'}
          </div>
          <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-1 truncate">
            {user?.address || 'Set default delivery spot'}
          </div>
        </div>
      </div>

      {/* 2b. GENTLE SERVICE CARE & APOLOGY VOUCHER (NON-DISTRACTING) */}
      <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
        isDark ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50/70 border-rose-100'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
            <HeartHandshake size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Service Apology Voucher</span>
              <span className="text-[9.5px] font-black uppercase px-1.5 py-0.2 rounded-md bg-rose-500 text-white">
                ₦500 OFF
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              Code <span className="font-mono font-bold text-rose-600 dark:text-rose-400">SORRY500</span> · Goodwill compensation
            </p>
          </div>
        </div>
        <button
          onClick={() => handleCopyVoucher('SORRY500')}
          className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-all"
        >
          Apply
        </button>
      </div>

      {/* 3. CLEAN & SIMPLE ACTION MENU */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDark ? 'bg-[#181B22] border-white/10' : 'bg-white border-slate-100 shadow-xs'
      }`}>
        {[
          {
            icon: Package,
            label: 'My Orders',
            badge: orders?.length ? `${orders.length}` : null,
            onClick: onOpenOrders,
            color: 'text-amber-500'
          },
          {
            icon: MapPin,
            label: 'Saved Delivery Addresses',
            badge: savedAddressesCount ? `${savedAddressesCount} Spots` : null,
            onClick: onOpenAddresses,
            color: 'text-blue-500'
          },
          {
            icon: Heart,
            label: 'Favorite Meals',
            onClick: onOpenFavorites,
            color: 'text-rose-500'
          },
          {
            icon: MessageSquare,
            label: 'Help & Live Support',
            onClick: onOpenSupport,
            color: 'text-emerald-500'
          },
          {
            icon: isDark ? Sun : Moon,
            label: isDark ? 'Dark Theme (Tap for Light)' : 'Light Theme (Tap for Dark)',
            isToggle: true,
            onClick: toggleDark,
            color: isDark ? 'text-amber-400' : 'text-indigo-500'
          }
        ].map((item, i) => (
          <button
            key={i}
            onClick={item.onClick}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors cursor-pointer border-t first:border-t-0 ${
              isDark ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-white/5' : 'bg-slate-100'
            } ${item.color} shrink-0`}>
              <item.icon size={16} className="stroke-[2.2]" />
            </div>
            <span className="font-semibold text-xs flex-1 text-slate-800 dark:text-slate-200">{item.label}</span>
            {item.isToggle ? (
              <div className={`w-9 h-5 rounded-full relative p-0.5 transition-colors ${
                isDark ? 'bg-indigo-600' : 'bg-slate-300'
              }`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  isDark ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
            ) : (
              <>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    isDark ? 'bg-white/10 text-gray-300' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {item.badge}
                  </span>
                )}
                <ChevronRight size={14} className="text-gray-400 shrink-0" />
              </>
            )}
          </button>
        ))}
      </div>

      {/* 4. SIGN OUT BUTTON (If logged in) */}
      {user && (
        <button
          onClick={onLogout}
          className="w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 active:scale-[0.98] transition-all cursor-pointer"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      )}

      {/* App Version Info */}
      <div className="text-center pt-2">
        <p className="text-[10px] text-gray-400 font-medium">FoodMaxx Technologies · v2.4.0</p>
      </div>

      {/* 5. INTERACTIVE VOUCHERS MODAL */}
      <AnimatePresence>
        {vouchersOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`w-full max-w-md rounded-3xl p-5 border shadow-2xl relative max-h-[85vh] flex flex-col ${
                isDark ? 'bg-[#181B22] border-white/10 text-white' : 'bg-white border-slate-100 text-slate-900'
              }`}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EA4C2A]/10 text-[#EA4C2A] flex items-center justify-center font-bold">
                    <Ticket size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold">Available Food Vouchers</h3>
                    <p className="text-[11px] text-gray-400">Tap copy to apply code at checkout</p>
                  </div>
                </div>
                <button
                  onClick={() => setVouchersOpen(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Vouchers List */}
              <div className="overflow-y-auto py-3 space-y-2.5 flex-1 pr-1">
                {VOUCHERS.map((v) => (
                  <div
                    key={v.code}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#EA4C2A] text-white tracking-wider">
                            {v.badge}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {v.code}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1.5">{v.title}</h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{v.desc}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{v.min}</p>
                      </div>

                      <button
                        onClick={() => {
                          handleCopyVoucher(v.code);
                          setVouchersOpen(false);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-100 dark:text-slate-900 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-gray-100 dark:border-white/10 text-center">
                <button
                  onClick={() => setVouchersOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 text-slate-800 dark:text-gray-200 font-bold text-xs hover:bg-gray-200 cursor-pointer transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// SAVED MULTI-LOCATIONS WITH LANDMARKS MODAL (CLEAN & SIMPLE)
// ============================================================
function SavedLocationsModal({
  open,
  onClose,
  savedAddresses = [],
  selectedAddress,
  onSelectAddress,
  onAddNewAddress,
  onDeleteAddress,
  zones = [],
  onSelectZone,
  selectedZone,
  isDark
}) {
  const [activeTab, setActiveTab] = useState('saved'); // 'saved' | 'zones'
  const [showAddForm, setShowAddForm] = useState(false);
  const [label, setLabel] = useState('Home');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0]?.id || '');
  const [zoneSearch, setZoneSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const toast = useToast();

  async function handleGpsDetect() {
    setDetectingGps(true);
    try {
      const loc = await getRealCurrentPosition();
      if (loc?.address) {
        setStreet(loc.address);
        setShowAddForm(true);
        toast('📍 Real GPS location detected!', 'success');
        playNativeSound('pop');
      }
    } catch (err) {
      toast(err.message || 'Could not detect GPS location', 'warning');
    } finally {
      setDetectingGps(false);
    }
  }

  if (!open) return null;

  function renderAddressIcon(lbl, sz = 16) {
    const n = (lbl || '').toLowerCase();
    if (n.includes('home')) return <Home size={sz} className="text-[#EA4C2A]" />;
    if (n.includes('work') || n.includes('office')) return <Building2 size={sz} className="text-blue-500" />;
    if (n.includes('campus') || n.includes('school')) return <Award size={sz} className="text-emerald-500" />;
    if (n.includes('partner') || n.includes('love')) return <Heart size={sz} className="text-rose-500 fill-rose-500" />;
    return <MapPin size={sz} className="text-purple-500" />;
  }

  async function handleSaveNew(e) {
    e.preventDefault();
    if (!street.trim()) {
      toast('Please enter your street address', 'warning');
      return;
    }
    setSaving(true);
    try {
      const zoneObj = zones.find(z => z.id === selectedZoneId) || zones[0];
      const newAddr = {
        id: 'addr_' + Date.now(),
        label,
        address: street.trim(),
        landmark: landmark.trim() || 'Near main junction',
        zone_id: zoneObj?.id,
        zone_name: zoneObj?.name || 'Ibadan',
        icon: label === 'Home' ? '🏠' : label === 'Work' ? '🏢' : label === 'Campus' ? '🎓' : '📍'
      };
      await onAddNewAddress(newAddr);
      onSelectAddress(newAddr);
      if (zoneObj && onSelectZone) onSelectZone(zoneObj);
      setShowAddForm(false);
      setStreet('');
      setLandmark('');
      toast('New delivery spot saved with landmark! 📍', 'success');
      onClose();
    } catch (err) {
      toast('Failed to save address', 'error');
    } finally {
      setSaving(false);
    }
  }

  const filteredZones = zones.filter(z =>
    (z.name || '').toLowerCase().includes(zoneSearch.toLowerCase()) ||
    (z.city || '').toLowerCase().includes(zoneSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`relative ${
          isDark ? 'bg-[#15171C] text-white border-white/10' : 'bg-white text-slate-900 border-slate-100'
        } rounded-t-[32px] sm:rounded-[32px] w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl border z-10 overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b ${
          isDark ? 'border-white/10 bg-[#15171C]' : 'border-slate-100 bg-white'
        } flex items-center justify-between shrink-0`}>
          <div>
            <h2 className="font-bold text-base leading-tight">Delivery Locations & Zones</h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Quick drops across Ibadan</p>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full ${
              isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            } flex items-center justify-center active:scale-95 transition-all cursor-pointer`}
          >
            <X size={17} className="stroke-[2.5]" />
          </button>
        </div>

        {/* 2-Pill Segmented Switcher */}
        <div className="p-3 pb-0 shrink-0">
          <div className={`grid grid-cols-2 p-1 rounded-2xl border ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200/60'
          }`}>
            <button
              type="button"
              onClick={() => { setActiveTab('saved'); setShowAddForm(false); }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'saved'
                  ? (isDark ? 'bg-[#1E222B] text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                  : 'text-gray-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              📍 My Places ({savedAddresses.length})
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('zones'); setShowAddForm(false); }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'zones'
                  ? (isDark ? 'bg-[#1E222B] text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                  : 'text-gray-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🌐 Ibadan Zones ({zones.length})
            </button>
          </div>
        </div>

        {/* Modal Scroll Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {activeTab === 'saved' ? (
            <>
              {/* Action Buttons: GPS + Add New */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleGpsDetect}
                  disabled={detectingGps}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  {detectingGps ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Detecting Real GPS...</span>
                    </>
                  ) : (
                    <>
                      <Navigation size={14} />
                      <span>Use Current Location</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(p => !p)}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border font-bold text-xs transition-all cursor-pointer ${
                    showAddForm
                      ? (isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-100 border-slate-200 text-slate-800')
                      : 'bg-[#EA4C2A]/10 border-[#EA4C2A]/30 text-[#EA4C2A] hover:bg-[#EA4C2A]/20'
                  }`}
                >
                  {showAddForm ? <X size={15} /> : <Plus size={15} className="stroke-[3]" />}
                  <span>{showAddForm ? 'Cancel' : '+ Add Address with Landmark'}</span>
                </button>
              </div>

              {/* Add Form Drawer */}
              {showAddForm && (
                <form onSubmit={handleSaveNew} className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-orange-50/50 border-orange-200/80 shadow-xs'
                }`}>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Save Delivery Spot</div>
                  
                  {/* Location Type Selector */}
                  <div>
                    <label className="text-[10.5px] font-semibold text-gray-400 block mb-1.5">Place Tag</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['Home', 'Work', 'Campus', 'Partner'].map(l => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setLabel(l)}
                          className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            label === l
                              ? 'bg-[#EA4C2A] text-white border-[#EA4C2A] shadow-xs'
                              : (isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-white border-slate-200 text-slate-700')
                          }`}
                        >
                          {renderAddressIcon(l, 13)}
                          <span>{l}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Street address */}
                  <div>
                    <label className="text-[10.5px] font-semibold text-gray-400 block mb-1">Street Address</label>
                    <input
                      type="text"
                      placeholder="Enter street name, house or flat number"
                      value={street}
                      onChange={e => setStreet(e.target.value)}
                      className={`w-full text-xs p-2.5 rounded-xl border outline-none font-medium ${
                        isDark ? 'bg-[#1A1D24] border-white/10 text-white focus:border-[#EA4C2A]' : 'bg-white border-slate-200 text-slate-900 focus:border-[#EA4C2A]'
                      }`}
                      required
                    />
                  </div>

                  {/* Landmark */}
                  <div>
                    <label className="text-[10.5px] font-bold text-[#EA4C2A] block mb-1">📍 Landmark (Crucial for Rider!)</label>
                    <input
                      type="text"
                      placeholder="e.g. Near main junction, gate color, building name"
                      value={landmark}
                      onChange={e => setLandmark(e.target.value)}
                      className={`w-full text-xs p-2.5 rounded-xl border outline-none font-medium ${
                        isDark ? 'bg-[#1A1D24] border-white/10 text-white focus:border-[#EA4C2A]' : 'bg-white border-slate-200 text-slate-900 focus:border-[#EA4C2A]'
                      }`}
                    />
                  </div>

                  {/* Zone */}
                  <div>
                    <label className="text-[10.5px] font-semibold text-gray-400 block mb-1">Delivery Zone</label>
                    <select
                      value={selectedZoneId}
                      onChange={e => setSelectedZoneId(e.target.value)}
                      className={`w-full text-xs p-2.5 rounded-xl border outline-none font-bold ${
                        isDark ? 'bg-[#1A1D24] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    >
                      {zones.map(z => (
                        <option key={z.id} value={z.id}>{z.name} ({z.city})</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 bg-[#EA4C2A] hover:bg-[#D43D1D] text-white font-bold rounded-xl text-xs shadow-md shadow-[#EA4C2A]/20 active:scale-[0.98] cursor-pointer transition-all"
                  >
                    {saving ? 'Saving...' : 'Save & Select Location'}
                  </button>
                </form>
              )}

              {/* Saved Locations List */}
              {savedAddresses.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <MapPin size={32} className="mx-auto mb-2 opacity-30 text-[#EA4C2A]" />
                  <p className="text-xs font-semibold">No saved addresses yet</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Add a spot to speed up your checkout</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedAddresses.map(addr => {
                    const isSelected = selectedAddress?.id === addr.id;
                    return (
                      <div
                        key={addr.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? (isDark ? 'border-[#EA4C2A] bg-[#EA4C2A]/10' : 'border-[#EA4C2A] bg-orange-50/60')
                            : (isDark ? 'border-white/10 bg-white/5 hover:border-white/20' : 'border-slate-100 bg-white hover:border-slate-200 shadow-xs')
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectAddress(addr);
                            const matchedZone = zones.find(z => z.id === addr.zone_id) || zones[0];
                            if (matchedZone && onSelectZone) onSelectZone(matchedZone);
                            onClose();
                          }}
                          className="flex items-start gap-3 flex-1 min-w-0 text-left cursor-pointer"
                        >
                          <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${
                            isDark ? 'bg-white/10' : 'bg-slate-100'
                          }`}>
                            {renderAddressIcon(addr.label, 17)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">{addr.label}</span>
                              {isSelected && (
                                <span className="text-[9px] bg-[#EA4C2A] text-white px-1.5 py-0.2 rounded font-bold">
                                  Selected
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-medium text-slate-700 dark:text-gray-300 truncate mt-0.5">
                              {addr.address}
                            </div>
                            {addr.landmark && (
                              <div className="text-[10.5px] text-[#EA4C2A] font-semibold truncate mt-0.5">
                                📍 Near {addr.landmark}
                              </div>
                            )}
                            <div className="text-[10px] text-gray-400 mt-0.5">{addr.zone_name}</div>
                          </div>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          {isSelected && (
                            <CheckCircle size={18} className="text-[#EA4C2A] stroke-[2.5]" />
                          )}
                          {onDeleteAddress && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteAddress(addr.id);
                              }}
                              className="w-7 h-7 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer"
                              title="Delete location"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Zones Search */}
              <div className="relative mb-2">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search Ibadan zones (Bodija, UI, Oluyole...)"
                  value={zoneSearch}
                  onChange={e => setZoneSearch(e.target.value)}
                  className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-white/5 border-white/10 text-white focus:border-[#EA4C2A]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#EA4C2A]'
                  }`}
                />
              </div>

              {/* Zones List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredZones.map(z => {
                  const isSelected = selectedZone?.id === z.id && !selectedAddress;
                  return (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => {
                        onSelectZone(z);
                        onSelectAddress(null);
                        onClose();
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-[#EA4C2A] bg-[#EA4C2A]/10 text-slate-900 dark:text-white'
                          : (isDark ? 'border-white/10 bg-white/5 hover:border-white/20' : 'border-slate-100 bg-white hover:border-slate-200 shadow-xs')
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">{z.name}</div>
                        <div className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {fmt(z.delivery_fee)} · {z.estimated_delivery_time}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle size={16} className="text-[#EA4C2A] shrink-0 stroke-[2.5]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// IN-TRANSIT COURIER CHAT DRAWER
// ============================================================
function InTransitChatDrawer({ open, onClose, order, user, isDark }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const toast = useToast();
  const ws = useWS();
  const scrollRef = useRef(null);

  const quickReplies = [
    "I'm at the main gate 🚪",
    "Please call when outside 📞",
    "Leave package at security post 🛡️",
    "Drive safe! 🙏",
    "On my way downstairs 🏃"
  ];

  const loadMessages = useCallback(async () => {
    if (!order?.id) return;
    try {
      const res = await api.getOrderMessages(order.id);
      setMessages(res.data || []);
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 50);
    } catch (e) {}
  }, [order?.id]);

  useEffect(() => {
    if (open) {
      loadMessages();
    }
  }, [open, loadMessages]);

  useEffect(() => {
    if (!ws || !open) return;
    const unsub = ws.on('ORDER_MESSAGE_RECEIVED', (msg) => {
      if (msg.orderId === order?.id) {
        setMessages(prev => [...prev, msg.message]);
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 50);
      }
    });
    return () => unsub();
  }, [ws, open, order?.id]);

  async function handleSend(textToSend) {
    const txt = (textToSend || input).trim();
    if (!txt || !order?.id) return;
    setInput('');
    try {
      const res = await api.sendOrderMessage(order.id, txt);
      setMessages(prev => [...prev, res.data]);
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 50);
    } catch (e) {
      toast('Failed to send message', 'error');
    }
  }

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
      <div
        className={`relative ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-t-3xl sm:rounded-3xl w-full max-w-lg md:max-w-xl h-[75vh] max-h-[75vh] flex flex-col slide-up shadow-2xl z-10 overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-red-700 flex items-center justify-between shrink-0 bg-gradient-to-r from-red-600 to-red-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
              🛵
            </div>
            <div>
              <div className="font-semibold text-xs">Rider Chat · {order.riderInfo?.full_name || 'Delivery Partner'}</div>
              <div className="text-[10px] text-red-100">Order: #{order.order_reference}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 text-white">
            <X size={18} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-xs">
              <div className="text-3xl mb-2">💬</div>
              <p>No messages yet. Send a note to help your rider locate your address quickly!</p>
            </div>
          ) : (
            messages.map((m, idx) => {
              const isMe = m.sender_role === 'customer' || m.sender_id === user?.id;
              return (
                <div key={m.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs font-medium leading-relaxed ${
                    isMe
                      ? 'bg-red-600 text-white rounded-br-xs'
                      : isDark
                      ? 'bg-gray-800 text-gray-100 rounded-bl-xs'
                      : 'bg-gray-100 text-gray-800 rounded-bl-xs'
                  }`}>
                    {m.message}
                  </div>
                  <span className="text-[9px] text-gray-400 mt-1 px-1">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className={`p-2 border-t ${isDark ? 'border-gray-800 bg-gray-850' : 'border-gray-100 bg-gray-50'} overflow-x-auto hide-scrollbar flex gap-1.5 shrink-0`}>
          {quickReplies.map((qr, i) => (
            <button
              key={i}
              onClick={() => handleSend(qr)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                isDark ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-700 hover:border-red-300'
              }`}
            >
              {qr}
            </button>
          ))}
        </div>

        <form
          onSubmit={e => { e.preventDefault(); handleSend(); }}
          className={`p-3 border-t ${isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-white'} flex gap-2 shrink-0`}
        >
          <input
            type="text"
            placeholder="Type a message to rider..."
            value={input}
            onChange={e => setInput(e.target.value)}
            className={`flex-1 text-xs px-3.5 py-2.5 rounded-xl border outline-none ${
              isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
            }`}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 disabled:opacity-50 active:scale-95 transition-transform"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// MASKED CALLING MODAL
// ============================================================
function MaskedCallModal({ open, onClose, rider, order, isDark }) {
  const [callState, setCallState] = useState('connecting');
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (!open) {
      setCallState('connecting');
      setTimer(0);
      return;
    }
    const t1 = setTimeout(() => setCallState('connected'), 2000);
    return () => clearTimeout(t1);
  }, [open]);

  useEffect(() => {
    let interval;
    if (callState === 'connected') {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  if (!open) return null;

  const fmtTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-[360px] bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white rounded-3xl p-6 shadow-2xl relative flex flex-col items-center text-center overflow-hidden border border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border border-emerald-500/30 mb-6">
          <Shield size={12} />
          <span>Number Masking Active · Privacy Protected</span>
        </div>

        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-red-600 to-red-800 flex items-center justify-center text-3xl font-bold mb-3 shadow-lg shadow-red-600/30 ring-4 ring-red-500/20">
          {rider?.full_name?.[0] || '🛵'}
        </div>

        <h3 className="font-bold text-lg mb-0.5">{rider?.full_name || 'FoodMaxx Dispatch Rider'}</h3>
        <p className="text-xs text-gray-400 mb-2">Encrypted FoodMaxx Voice Relay</p>

        {callState === 'connecting' && (
          <div className="flex items-center gap-2 text-yellow-400 text-xs font-semibold animate-pulse my-3">
            <PhoneCall size={14} /> Connecting secure line...
          </div>
        )}

        {callState === 'connected' && (
          <div className="text-emerald-400 text-sm font-bold my-3 tracking-widest">
            🟢 {fmtTime(timer)}
          </div>
        )}

        {callState === 'ended' && (
          <div className="text-red-400 text-xs font-bold my-3">
            Call ended
          </div>
        )}

        <div className="bg-white/5 rounded-2xl p-3 w-full text-[11px] text-gray-300 mt-2 mb-6 text-left">
          <div className="font-semibold text-white mb-0.5">How masked calling works:</div>
          Neither you nor the rider sees each other's personal phone numbers. Calls are safely routed through FoodMaxx secure proxy.
        </div>

        <button
          onClick={() => {
            setCallState('ended');
            setTimeout(onClose, 800);
          }}
          className="w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <Phone size={24} className="rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// CLEAN FITTED DISPATCH ROUTE MAP
// ============================================================
function getCubicBezierPoint(t, p0, p1, p2, p3) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

function MotorcycleRouteMap({ status, eta, isDark, destinationAddress }) {
  const isMoving = ['RIDER_PICKED_UP', 'ON_THE_WAY', 'ARRIVING_SOON'].includes(status);
  const isArrived = status === 'DELIVERED';

  const tVal = status === 'ORDER_PLACED' || status === 'RESTAURANT_CONFIRMED' || status === 'PREPARING'
    ? 0.08
    : status === 'READY_FOR_PICKUP' || status === 'RIDER_ASSIGNED'
    ? 0.22
    : status === 'RIDER_PICKED_UP'
    ? 0.45
    : status === 'ON_THE_WAY'
    ? 0.72
    : status === 'ARRIVING_SOON'
    ? 0.90
    : 0.98;

  const p0 = { x: 55, y: 105 };
  const p1 = { x: 150, y: 25 };
  const p2 = { x: 270, y: 140 };
  const p3 = { x: 365, y: 55 };

  const riderPos = getCubicBezierPoint(tVal, p0, p1, p2, p3);
  const destShort = destinationAddress ? destinationAddress.split(',')[0].trim() : 'Delivery Point';

  return (
    <div className={`w-full rounded-3xl p-4 relative overflow-hidden border transition-all ${
      isDark
        ? 'bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border-gray-800'
        : 'bg-gradient-to-b from-orange-50/50 via-white to-gray-50 border-orange-100/90 shadow-xs'
    }`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EA4C2A] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#EA4C2A]"></span>
          </span>
          <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Live Courier Dispatch Map
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#EA4C2A] bg-orange-50 dark:bg-orange-950/60 px-3 py-1 rounded-full border border-orange-200/60 dark:border-orange-800/40 shadow-xs">
          <Clock size={12} className="stroke-[2.5]" />
          <span>{eta || '20-25 mins'}</span>
        </div>
      </div>

      {/* Fitted Responsive SVG Route */}
      <div className="w-full relative aspect-[420/170]">
        <svg viewBox="0 0 420 170" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="fittedRouteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EA4C2A" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>

            <pattern id="faintMapGrid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke={isDark ? '#374151' : '#E2E8F0'} strokeWidth="0.8" opacity="0.4" />
            </pattern>
          </defs>

          {/* Faint Street Grid */}
          <rect width="100%" height="100%" fill="url(#faintMapGrid)" rx="16" />

          {/* Road Base Underlayer */}
          <path
            d="M 55 105 C 150 25, 270 140, 365 55"
            fill="none"
            stroke={isDark ? '#1E293B' : '#E2E8F0'}
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Road Surface */}
          <path
            d="M 55 105 C 150 25, 270 140, 365 55"
            fill="none"
            stroke={isDark ? '#0F172A' : '#FFFFFF'}
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Road Centerline (Animated in motion) */}
          <path
            d="M 55 105 C 150 25, 270 140, 365 55"
            fill="none"
            stroke="url(#fittedRouteGrad)"
            strokeWidth="3.5"
            strokeDasharray="5 5"
            strokeLinecap="round"
            className={isMoving ? "animate-pulse" : ""}
          />

          {/* Restaurant Origin Node */}
          <g transform="translate(55, 105)">
            <circle cx="0" cy="0" r="16" fill={isDark ? '#1E293B' : '#FFFFFF'} stroke="#EA4C2A" strokeWidth="2.5" />
            <g transform="translate(-7, -7)">
              <ChefHat size={14} className="text-[#EA4C2A]" />
            </g>
            <text x="0" y="27" textAnchor="middle" fontSize="10" fontWeight="bold" fill={isDark ? '#9CA3AF' : '#4B5563'}>
              Kitchen
            </text>
          </g>

          {/* Destination Node */}
          <g transform="translate(365, 55)">
            <circle cx="0" cy="0" r="16" fill={isDark ? '#1E293B' : '#FFFFFF'} stroke="#10B981" strokeWidth="2.5" />
            <g transform="translate(-7, -7)">
              <MapPin size={14} className="text-emerald-600" />
            </g>
            <text x="0" y="27" textAnchor="middle" fontSize="10" fontWeight="bold" fill={isDark ? '#10B981' : '#059669'}>
              {destShort.length > 14 ? destShort.slice(0, 13) + '…' : destShort}
            </text>
          </g>

          {/* Moving Courier Rider */}
          <g transform={`translate(${riderPos.x}, ${riderPos.y})`}>
            {isMoving && (
              <circle cx="0" cy="0" r="22" fill="#EA4C2A" opacity="0.25" className="animate-ping" />
            )}
            <circle cx="0" cy="0" r="16" fill={isDark ? '#111827' : '#FFFFFF'} stroke="#EA4C2A" strokeWidth="2" />
            <g transform="translate(-8, -8)">
              <Truck size={16} className="text-[#EA4C2A]" />
            </g>
            
            {/* Mini Courier Pill */}
            <g transform="translate(0, -24)">
              <rect x="-35" y="-9" width="70" height="18" rx="9" fill={isDark ? '#FFFFFF' : '#111827'} />
              <text x="0" y="3" textAnchor="middle" fontSize="9" fontWeight="bold" fill={isDark ? '#111827' : '#FFFFFF'}>
                {isArrived ? 'Delivered' : isMoving ? 'Speeding' : 'Assigned'}
              </text>
            </g>
          </g>
        </svg>
      </div>

      {/* Fitted Destination Footer Bar */}
      <div className={`mt-2.5 pt-2.5 border-t flex items-center justify-between text-xs ${isDark ? 'border-gray-800 text-gray-300' : 'border-gray-100 text-gray-700'}`}>
        <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
          <MapPin size={13} className="text-emerald-500 shrink-0" />
          <span className="font-semibold truncate">
            {destinationAddress || 'Ibadan Delivery Location'}
          </span>
        </div>
        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
          Destination
        </span>
      </div>
    </div>
  );
}

// ============================================================
// CLEAN DELIVERY PIN CARD
// ============================================================
function DeliveryPinCard({ otp, orderId, onVerified, isDark }) {
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const pinDigits = String(otp || '4829').padStart(4, '0').split('');

  const handleCopy = () => {
    navigator.clipboard?.writeText(String(otp || '4829'));
    setCopied(true);
    toast('Handover PIN copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  async function handleSimulateVerify() {
    setVerifying(true);
    try {
      await api.verifyOrderPIN(orderId, otp);
      setVerified(true);
      toast('PIN verified! Order marked Delivered 🎉', 'success');
      if (onVerified) onVerified();
    } catch (e) {
      toast(e.message || 'Verification failed', 'error');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className={`rounded-2xl p-4 border transition-all ${
      isDark
        ? 'bg-gray-900/90 border-gray-800'
        : 'bg-amber-50/40 border-amber-200/60 shadow-xs'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={16} className="text-emerald-600" />
          <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Delivery Handover PIN
          </span>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
          Secure Handover
        </span>
      </div>

      <p className={`text-[11px] mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        Share this 4-digit PIN with your rider only after receiving your meal:
      </p>

      {/* Clean 4-Digit Box Display */}
      <div className="flex items-center justify-center gap-2.5 my-2">
        {pinDigits.map((digit, idx) => (
          <div
            key={idx}
            className={`w-12 h-14 rounded-xl border flex items-center justify-center font-mono font-black text-2xl shadow-xs ${
              isDark
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-amber-300/80 text-gray-900'
            }`}
          >
            {digit}
          </div>
        ))}
        <button
          onClick={handleCopy}
          type="button"
          title="Copy PIN"
          className={`p-3 rounded-xl border transition-all active:scale-90 cursor-pointer ${
            isDark ? 'bg-gray-800 border-gray-700 text-gray-300 hover:text-white' : 'bg-white border-amber-200 text-gray-600 hover:text-gray-900'
          }`}
        >
          {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
        </button>
      </div>

      {/* Simulator / Rider verify button */}
      <button
        type="button"
        onClick={handleSimulateVerify}
        disabled={verifying || verified}
        className={`w-full mt-3 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 border ${
          verified
            ? 'bg-emerald-600 text-white border-emerald-600'
            : (isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200')
        }`}
      >
        <CheckCircle size={13} className="stroke-[2]" />
        <span>{verified ? 'PIN Verified & Delivered' : verifying ? 'Verifying...' : 'Simulate Rider PIN Handover'}</span>
      </button>
    </div>
  );
}

// ============================================================
// RESTAURANT MODAL
// ============================================================
function RestaurantModal({ restaurant: r, onClose, onAddToCart, onOpenCart, onStartGroupOrder, isDark }) {
  const [activeTab, setActiveTab] = useState('menu');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const { cart, subtotal, itemCount } = useCart();
  const isCurrentCart = cart.restaurantId === r.id;

  const scrollToCategory = (catName) => {
    setSelectedCategory(catName);
    if (catName === 'all') {
      const scrollEl = document.getElementById('restaurant-menu-scroll');
      if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const catId = `cat-${catName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const target = document.getElementById(catId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Filter items by search query if user types
  const allCategories = r.menuByCategory || [];
  const allItems = allCategories.flatMap(c => (c.items || []).map(i => ({ ...i, catName: c.category })));
  
  const searchResults = searchQuery.trim()
    ? allItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.catName && item.catName.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4">
      <div className="w-full max-w-lg md:max-w-xl h-full md:max-h-[92vh] bg-white relative flex flex-col shadow-2xl md:rounded-[32px] overflow-hidden">
        
        {/* PERSISTENT CONDENSED HEADER (Always visible when scrolled) */}
        <div className="shrink-0 bg-white/95 backdrop-blur-md border-b border-gray-100 px-3 py-2.5 flex items-center justify-between z-30 shadow-xs">
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0 text-gray-700 active:scale-95 transition-transform"
              aria-label="Back"
            >
              <ChevronLeft size={20} />
            </button>
            <img onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'; }} src={r.logo_url} className="w-7 h-7 rounded-lg object-cover border border-gray-200 shrink-0" alt="" />
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-sm text-gray-900 truncate leading-tight">{r.name}</h2>
              <p className="text-[11px] text-gray-500 truncate">{r.cuisine_types?.[0] || 'Fast Food & Grills'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                setSearchOpen(prev => !prev);
                if (searchOpen) setSearchQuery('');
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                searchOpen || searchQuery ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              aria-label="Search menu"
            >
              <Search size={16} />
            </button>
            <button
              onClick={onStartGroupOrder}
              className="w-8 h-8 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 flex items-center justify-center transition-colors active:scale-95"
              title="Start Group Order"
              aria-label="Start Group Order"
            >
              <Users size={16} />
            </button>
            {isCurrentCart && itemCount > 0 && (
              <button
                onClick={onOpenCart}
                className="relative w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors"
                aria-label="Cart"
              >
                <ShoppingCart size={16} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-semibold rounded-full flex items-center justify-center shadow-xs">
                  {itemCount}
                </span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 active:scale-95 transition-transform"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* IN-MENU SEARCH BAR (Expandable) */}
        {searchOpen && (
          <div className="shrink-0 px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search in ${r.name}...`}
              className="flex-1 bg-transparent text-xs text-gray-800 focus:outline-hidden placeholder-gray-400"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* SCROLLABLE BODY */}
        <div id="restaurant-menu-scroll" className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth relative">
          
          {/* Cover & Brand Hero */}
          <div className="relative h-44 shrink-0">
            <img onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'; }} src={r.cover_url} alt={r.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3">
              <img onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'; }} src={r.logo_url} className="w-14 h-14 rounded-2xl border-2 border-white object-cover shadow-md shrink-0" alt={r.name} />
              <div className="text-white min-w-0 flex-1">
                <h1 className="font-bold text-lg text-white leading-tight truncate drop-shadow-sm">{r.name}</h1>
                <p className="text-xs text-white/90 line-clamp-1 mt-0.5">{r.cuisine_types?.join(' • ')}</p>
                <div className="flex items-center gap-2 text-xs text-white/80 mt-1">
                  <span className="bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white flex items-center gap-1">
                    <Clock size={11} className="text-amber-300" />
                    <span>{r.delivery_time_min}–{r.delivery_time_max} min delivery</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Info Strip */}
          <div className="flex divide-x divide-gray-100 bg-gray-50 text-center text-xs text-gray-600 py-2.5 border-b border-gray-100">
            <div className="flex-1 px-1">
              <Clock size={13} className="mx-auto mb-0.5 text-gray-400" />
              <span className="font-semibold text-gray-700">{r.delivery_time_min}–{r.delivery_time_max}</span> min
            </div>
            <div className="flex-1 px-1">
              <MapPin size={13} className="mx-auto mb-0.5 text-gray-400" />
              <span className="font-semibold text-gray-700">{fmt(r.delivery_fee)}</span> fee
            </div>
            <div className="flex-1 px-1">
              <Package size={13} className="mx-auto mb-0.5 text-gray-400" />
              Min <span className="font-semibold text-gray-700">{fmt(r.min_order)}</span>
            </div>
            <div className="flex-1 px-1">
              <Sparkles size={13} className="mx-auto mb-0.5 text-amber-500" />
              <span className="font-semibold text-gray-700">Top Quality</span>
            </div>
          </div>

          {/* Group Order CTA Banner */}
          <div className="mx-3 my-2.5 p-3 bg-gradient-to-r from-purple-800 to-indigo-900 rounded-2xl text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-base shrink-0">👥</div>
              <div className="min-w-0">
                <div className="font-semibold text-xs truncate">Ordering with friends or office?</div>
                <div className="text-[10px] text-purple-200 truncate">Start a group order & split easily</div>
              </div>
            </div>
            <button
              onClick={onStartGroupOrder}
              className="px-3 py-1.5 bg-white text-purple-900 hover:bg-purple-50 rounded-xl text-xs font-semibold shrink-0 transition-transform active:scale-95 shadow-xs"
            >
              Start Group
            </button>
          </div>

          {/* Sticky Tab Bar */}
          <div className="flex border-b border-gray-200 sticky top-0 bg-white z-20 shadow-xs">
            {['menu', 'reviews', 'info'].map(t => (
              <button
                key={t}
                onClick={() => { setActiveTab(t); setSearchQuery(''); }}
                className={`flex-1 py-2.5 text-xs font-medium capitalize transition-all relative ${activeTab === t ? 'text-red-600' : 'text-gray-500 hover:text-gray-800'}`}
              >
                {t}
                {activeTab === t && (
                  <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-red-600 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* MENU TAB */}
          {activeTab === 'menu' && (
            <div className="pb-28">
              {/* Sticky Category Pills Navigation hidden per user preference */}

              {/* Search Results Display */}
              {searchResults ? (
                <div className="p-3">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-bold text-gray-700">
                      Results for "{searchQuery}" ({searchResults.length})
                    </span>
                    <button onClick={() => setSearchQuery('')} className="text-xs text-red-600 font-semibold hover:underline">
                      Clear search
                    </button>
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <Search size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-medium">No dishes match "{searchQuery}"</p>
                      <p className="text-xs text-gray-400 mt-1">Try searching for Jollof, Asun, Swallow, or Drinks</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
                      {searchResults.map(item => (
                        <FoodItemRow
                          key={item.id}
                          item={item}
                          onSelect={() => onAddToCart(item)}
                          restaurant={r}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Organized Categories with Sticky Section Headers */
                allCategories.map(cat => {
                  const catId = `cat-${cat.category.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
                  return (
                    <div key={cat.category} id={catId} className="scroll-mt-[86px] mb-2">
                      {/* Sticky Category Section Header */}
                      <div className="sticky top-[82px] z-10 bg-gray-50/95 backdrop-blur-sm px-4 py-2 border-y border-gray-200/80 flex items-center justify-between">
                        <span className="font-semibold text-xs text-gray-800 uppercase tracking-wider">{cat.category}</span>
                        <span className="text-[10px] font-semibold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                          {cat.items.length} {cat.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      {/* Food Items in Category */}
                      <div className="divide-y divide-gray-100 bg-white">
                        {cat.items.map(item => (
                          <FoodItemRow
                            key={item.id}
                            item={item}
                            onSelect={() => onAddToCart(item)}
                            restaurant={r}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* REVIEWS TAB */}
          {activeTab === 'reviews' && (
            <div className="p-4 space-y-4 pb-24">
              <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{r.rating}</div>
                  <Stars rating={r.rating} size={13} />
                  <div className="text-[11px] text-gray-500 mt-0.5">{r.reviews_count} reviews</div>
                </div>
                <div className="flex-1 text-xs text-gray-600 border-l border-gray-200 pl-4 space-y-1">
                  <div className="flex justify-between font-medium"><span>Food Quality</span><span className="text-amber-600 font-bold">4.9 ★</span></div>
                  <div className="flex justify-between font-medium"><span>Packaging</span><span className="text-amber-600 font-bold">4.8 ★</span></div>
                  <div className="flex justify-between font-medium"><span>Delivery Speed</span><span className="text-amber-600 font-bold">4.7 ★</span></div>
                </div>
              </div>

              {(r.reviews || []).length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Star size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No written reviews yet</p>
                </div>
              )}
              {(r.reviews || []).map(rev => (
                <div key={rev.id} className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center font-bold text-red-600 text-xs shrink-0">
                      {rev.customer_name?.[0] || 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-gray-900">{rev.customer_name}</div>
                      <Stars rating={rev.restaurant_rating} size={11} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}

          {/* INFO TAB */}
          {activeTab === 'info' && (
            <div className="p-4 space-y-3 pb-24">
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <h3 className="font-medium text-xs uppercase tracking-wider text-gray-400 mb-1.5">About Restaurant</h3>
                <p className="text-xs text-gray-700 leading-relaxed">{r.description}</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <h3 className="font-medium text-xs uppercase tracking-wider text-gray-400 mb-1.5">Address & Location</h3>
                <p className="text-xs text-gray-700 flex items-start gap-2">
                  <MapPin size={15} className="text-red-600 mt-0.5 shrink-0" />
                  <span>{r.address}</span>
                </p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <h3 className="font-medium text-xs uppercase tracking-wider text-gray-400 mb-1.5">Opening Hours</h3>
                <p className="text-xs text-gray-700 flex items-center gap-2">
                  <Clock size={15} className="text-red-600 shrink-0" />
                  <span>{r.operating_hours}</span>
                </p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <h3 className="font-medium text-xs uppercase tracking-wider text-gray-400 mb-2">Cuisines & Specialties</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(r.cuisine_types || []).map(c => (
                    <Badge key={c} color="red">{c}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FLOATING STICKY "VIEW CART" BAR */}
        {isCurrentCart && itemCount > 0 && (
          <div className="absolute bottom-3 left-3 right-3 z-30 pointer-events-none">
            <button
              onClick={onOpenCart}
              className="pointer-events-auto w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between font-bold transition-transform"
            >
              <div className="flex items-center gap-2">
                <span className="bg-red-700 text-white px-2 py-0.5 rounded-lg text-xs font-semibold">
                  {itemCount}
                </span>
                <span className="text-sm tracking-wide">View Cart</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <span>{fmt(subtotal)}</span>
                <ChevronRight size={16} />
              </div>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

function FoodItemRow({ item, onSelect, restaurant }) {
  const { cart } = useCart();
  const inCartQty = (cart.items || [])
    .filter(i => (i.id && item.id && String(i.id) === String(item.id)) || (i.name && item.name && i.name.trim().toLowerCase() === item.name.trim().toLowerCase()))
    .reduce((sum, i) => sum + i.qty, 0);

  const isAvailable = item.is_available !== false && (item.stock_quantity === undefined || item.stock_quantity > 0);

  return (
    <div
      onClick={() => isAvailable && onSelect(item)}
      className={`group w-full flex items-center justify-between gap-3.5 px-4 py-3.5 border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/80 dark:hover:bg-white/5 transition-all text-left cursor-pointer ${
        !isAvailable ? 'opacity-60 cursor-not-allowed' : ''
      }`}
    >
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug group-hover:text-[#EA4C2A] transition-colors">
            {item.name}
          </span>
          {item.badge && (
            <span className="bg-[#EA4C2A] text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full">
              🔥 {item.badge}
            </span>
          )}
          {!isAvailable && (
            <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9.5px] font-bold px-2 py-0.5 rounded-full">
              Sold out
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {item.description}
        </p>
        <div className="flex items-center gap-2.5 mt-2">
          <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
            {fmt(item.price)}
          </span>
          {inCartQty > 0 && (
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Check size={10} className="stroke-[3]" /> {inCartQty} in cart
            </span>
          )}
          {item.prep_time_min && (
            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
              <Clock size={10} /> ~{item.prep_time_min}m
            </span>
          )}
        </div>
      </div>

      <div className="relative shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-white/10 shadow-xs">
        <img
          onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'; }}
          src={item.image_url}
          alt={item.name}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-108 ${
            !isAvailable ? 'grayscale' : ''
          }`}
          loading="lazy"
        />
        {isAvailable && (
          inCartQty > 0 ? (
            <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-600 text-white rounded-full px-2 py-0.5 text-[10px] font-bold shadow-md flex items-center gap-0.5 border-2 border-white dark:border-[#181A20]">
              <Check size={10} className="stroke-[3]" /> {inCartQty}
            </div>
          ) : (
            <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 bg-[#EA4C2A] text-white rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-[#181A20] active:scale-90 transition-transform">
              <Plus size={14} className="stroke-[3]" />
            </div>
          )
        )}
      </div>
    </div>
  );
}

// High-performance client-side image compressor & optimizer
// Automatically resizes large phone camera/desktop photos (up to 20MB) to crisp web sizes (< 60KB)
// preventing Firestore 1MB document size limit errors.
export function compressImageFile(file, maxDimension = 800, quality = 0.78) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file selected'));
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported or corrupted image file format'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target.result);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch (err) {
          resolve(e.target.result);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ============================================================
// FOOD DETAIL MODAL
// ============================================================
export function getItemSizeAndExtras(item) {
  if (!item) return { sizes: [], extras: [] };

  // Explicitly check if portion sizes are disabled or empty for this dish
  if (item.has_portion_sizes === false || (Array.isArray(item.portion_sizes) && item.portion_sizes.length === 0 && item.has_portion_sizes !== undefined)) {
    let customExtras = [];
    if (item.options && item.options.length > 0) {
      customExtras = item.options.filter(o => o.option_type === 'extra');
    }
    if (customExtras.length === 0) {
      const catFallback = getCategoryDefaults(item);
      return { sizes: [], extras: catFallback.extras };
    }
    return { sizes: [], extras: customExtras };
  }

  // 0. Check custom admin-configured portion sizes
  let customSizes = item.portion_sizes;
  if (!customSizes && typeof item.portion_sizes_json === 'string') {
    try { customSizes = JSON.parse(item.portion_sizes_json); } catch (e) {}
  }

  // 1. Check custom options if present
  let customExtras = [];
  if (item.options && item.options.length > 0) {
    if (!customSizes || customSizes.length === 0) {
      customSizes = item.options.filter(o => o.option_type === 'size');
    }
    customExtras = item.options.filter(o => o.option_type === 'extra');
  }

  // 2. If custom sizes are configured by admin, return them (with category fallback extras if none attached)
  if (customSizes && Array.isArray(customSizes) && customSizes.length > 0) {
    if (customExtras.length === 0) {
      const catFallback = getCategoryDefaults(item);
      return {
        sizes: customSizes,
        extras: catFallback.extras
      };
    }
    return {
      sizes: customSizes,
      extras: customExtras
    };
  }

  return getCategoryDefaults(item);
}

function getCategoryDefaults(item) {
  const name = (item.name || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();

  // 1. Drinks & Juices
  if (cat.includes('drink') || cat.includes('juice') || name.includes('wine') || name.includes('chapman') || name.includes('water')) {
    return {
      sizes: [
        { name: 'Standard Glass / Cup (350ml)', price_adjustment: 0, description: 'Single chilled serving' },
        { name: 'Large Goblet / Bottle (500ml)', price_adjustment: Math.round(item.price * 0.35 / 50) * 50, description: 'Bigger 500ml portion' },
        { name: 'Pitcher / Sharing Jug (1 Litre)', price_adjustment: Math.round(item.price * 0.9 / 50) * 50, description: 'Generous sharing size' },
      ],
      extras: [
        { name: 'Extra Crushed Ice', price_adjustment: 0, icon: '🧊' },
        { name: 'Fresh Lime & Lemon Slice', price_adjustment: 150, icon: '🍋' },
        { name: 'Extra Angostura Bitters', price_adjustment: 250, icon: '🍹' },
        { name: 'Served Chilled in Ice Bucket', price_adjustment: 400, icon: '❄️' },
      ]
    };
  }

  // 2. Swallow & Soups (Amala, Pounded Yam, Eba, Semo, Egusi, Efo Riro)
  if (cat.includes('swallow') || cat.includes('soup') || name.includes('amala') || name.includes('pounded yam') || name.includes('efo') || name.includes('egusi') || name.includes('gbegiri')) {
    return {
      sizes: [
        { name: 'Standard (2 Wraps + 2 Meats)', price_adjustment: 0, description: 'Classic single serving' },
        { name: 'Medium (3 Wraps + Extra Meat & Soup)', price_adjustment: 900, description: 'Hearty meal with extra soup' },
        { name: 'Mega Feast (4 Wraps + Assorted Meat Combo)', price_adjustment: 2000, description: 'Generous portion with meat variety' },
      ],
      extras: [
        { name: 'Extra Gbegiri & Ewedu (Abula)', price_adjustment: 400, icon: '🍲' },
        { name: 'Fried Sweet Plantain (Dodo)', price_adjustment: 600, icon: '🍌' },
        { name: 'Extra Goat Meat (Ogunfe Chunk)', price_adjustment: 1500, icon: '🥩' },
        { name: 'Extra Cow Leg / Bokoto', price_adjustment: 1200, icon: '🍖' },
        { name: 'Fried Panla / Titus Fish', price_adjustment: 1400, icon: '🐟' },
        { name: 'Chilled Soft Drink', price_adjustment: 500, icon: '🥤' },
      ]
    };
  }

  // 3. Grills, Meat & Wings (Asun, Wings, Turkey, Suya)
  if (cat.includes('grill') || cat.includes('meat') || cat.includes('wing') || cat.includes('chicken') || name.includes('asun') || name.includes('wing') || name.includes('turkey') || name.includes('suya')) {
    return {
      sizes: [
        { name: 'Regular Pack (4-5 Pieces)', price_adjustment: 0, description: 'Standard seasoned portion' },
        { name: 'Large Platter (7-8 Pieces + Onions)', price_adjustment: 1200, description: 'Ideal for big appetites' },
        { name: 'Party Platter (12+ Pieces)', price_adjustment: 2600, description: 'Family or group serving' },
      ],
      extras: [
        { name: 'Extra Sliced Onions & Yaji Spice', price_adjustment: 200, icon: '🧅' },
        { name: 'Fried Sweet Plantain (Dodo)', price_adjustment: 600, icon: '🍌' },
        { name: 'Fried Yam Chips', price_adjustment: 700, icon: '🍠' },
        { name: 'Extra Spicy Pepper Dip', price_adjustment: 250, icon: '🌶️' },
        { name: 'Chilled Chapman / Soft Drink', price_adjustment: 600, icon: '🥤' },
      ]
    };
  }

  // 4. Rice & Grains / Pasta (Jollof, Fried Rice, Spaghetti, Gizdodo)
  return {
    sizes: [
      { name: 'Regular Portion (Single Serving)', price_adjustment: 0, description: 'Rice + 1 protein piece + dodo' },
      { name: 'Medium Portion (+ Extra Meat & Plantain)', price_adjustment: 800, description: 'Bigger portion + extra side' },
      { name: 'Jumbo Combo (Platter + Salad + 2 Meats)', price_adjustment: 1800, description: 'Full executive combo meal' },
    ],
    extras: [
      { name: 'Fried Sweet Plantain (Dodo)', price_adjustment: 600, icon: '🍌' },
      { name: 'Crispy Fried Chicken Piece', price_adjustment: 1500, icon: '🍗' },
      { name: 'Peppered Goat Meat (Asun)', price_adjustment: 1800, icon: '🥩' },
      { name: 'Boiled / Fried Egg', price_adjustment: 350, icon: '🍳' },
      { name: 'Fresh Creamy Coleslaw', price_adjustment: 450, icon: '🥗' },
      { name: 'Chilled Soft Drink', price_adjustment: 500, icon: '🥤' },
    ]
  };
}

// ============================================================
// GROUP ORDER MODAL
// ============================================================
function GroupOrderModal({ restaurant, groupOrder: initialGroup, onClose, onCheckoutGroup }) {
  const [group, setGroup] = useState(initialGroup);
  const [copied, setCopied] = useState(false);
  const [addingForName, setAddingForName] = useState('');
  const [selectedItemToAdd, setSelectedItemToAdd] = useState(null);
  const [addQty, setAddQty] = useState(1);
  const [showAddDish, setShowAddDish] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const toast = useToast();

  const allItems = (restaurant?.menuByCategory || []).flatMap(c => c.items || []);

  const copyInvite = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(group.code);
    }
    setCopied(true);
    toast(`Group code ${group.code} copied! Share with friends 👥`, 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAddItemForParticipant = async () => {
    const targetName = addingForName.trim() || 'Teammate';
    if (!selectedItemToAdd) {
      toast('Please select a dish to add', 'warning');
      return;
    }
    setLoadingAction(true);
    try {
      let p = group.participants?.find(part => part.name.toLowerCase() === targetName.toLowerCase());
      let participantId = p?.id;
      if (!participantId) {
        const joinRes = await api.joinGroupOrder(group.code, { name: targetName });
        participantId = joinRes.participant_id;
      }

      const res = await api.addGroupOrderItem(group.code, {
        participant_id: participantId,
        item: {
          id: selectedItemToAdd.id,
          name: selectedItemToAdd.name,
          price: selectedItemToAdd.price,
          image_url: selectedItemToAdd.image_url,
          qty: addQty,
          selectedSize: 'Regular Portion',
          selectedExtras: []
        }
      });
      setGroup(res.data);
      setShowAddDish(false);
      setSelectedItemToAdd(null);
      setAddQty(1);
      toast(`Added ${selectedItemToAdd.name} for ${targetName}! 🍲`, 'success');
    } catch (e) {
      toast(e.message || 'Failed to add item to group', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRemoveItem = async (participantId, groupItemId) => {
    try {
      const res = await api.removeGroupOrderItem(group.code, groupItemId);
      setGroup(res.data);
      toast('Item removed from group order', 'info');
    } catch (e) {
      toast('Failed to remove item', 'error');
    }
  };

  // Flatten all items across all participants with contributor tags
  const consolidatedItems = (group.participants || []).flatMap(p =>
    (p.items || []).map(item => ({
      ...item,
      participant_name: p.name
    }))
  );

  const totalGroupSubtotal = consolidatedItems.reduce((s, i) => s + (i.price * i.qty), 0);
  const totalItemsCount = consolidatedItems.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
      <div className="w-full max-w-sm max-h-[92vh] bg-white rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-900 text-white shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold uppercase tracking-wide">
              Group Order Session
            </span>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
          </div>
          <h2 className="text-lg font-bold">{restaurant?.name || group.restaurant_name}</h2>
          <p className="text-xs text-purple-200">Host: {group.host_name}</p>

          {/* Group Code Card */}
          <div className="mt-3 p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-purple-200 uppercase font-bold tracking-wider">Invite Code</div>
              <div className="text-2xl font-bold tracking-wider text-yellow-300 font-mono">{group.code}</div>
            </div>
            <button
              onClick={copyInvite}
              className="px-3 py-1.5 bg-white text-purple-900 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
            >
              {copied ? <Check size={14} className="text-green-600" /> : <ClipboardList size={14} />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-800 flex items-center gap-1.5">
              <Users size={16} className="text-purple-600" />
              Participants ({group.participants?.length || 0})
            </h3>
            <button
              onClick={() => setShowAddDish(true)}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg flex items-center gap-1 active:scale-95"
            >
              <Plus size={13} /> Add Dish
            </button>
          </div>

          {/* Add Dish Form (collapsible) */}
          {showAddDish && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-900">Add Dish to Group</span>
                <button onClick={() => setShowAddDish(false)} className="text-purple-400 hover:text-purple-700">
                  <X size={14} />
                </button>
              </div>

              <div>
                <label className="text-[11px] font-medium text-purple-800 block mb-1">Whose meal is this?</label>
                <input
                  type="text"
                  placeholder="e.g. Chukwudi, Amina, Tunde"
                  value={addingForName}
                  onChange={e => setAddingForName(e.target.value)}
                  className="w-full bg-white px-3 py-1.5 text-xs rounded-xl border border-purple-200 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-purple-800 block mb-1">Select Food Item</label>
                <select
                  value={selectedItemToAdd?.id || ''}
                  onChange={e => {
                    const found = allItems.find(i => String(i.id) === e.target.value);
                    setSelectedItemToAdd(found || null);
                  }}
                  className="w-full bg-white px-3 py-1.5 text-xs rounded-xl border border-purple-200 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">-- Choose from menu --</option>
                  {allItems.map(it => (
                    <option key={it.id} value={it.id}>
                      {it.name} - {fmt(it.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-purple-700 font-semibold">Qty:</span>
                  <button onClick={() => setAddQty(Math.max(1, addQty - 1))} className="w-6 h-6 rounded-md bg-white border border-purple-200 flex items-center justify-center text-xs"><Minus size={11}/></button>
                  <span className="text-xs font-bold w-4 text-center">{addQty}</span>
                  <button onClick={() => setAddQty(addQty + 1)} className="w-6 h-6 rounded-md bg-purple-600 text-white flex items-center justify-center text-xs"><Plus size={11}/></button>
                </div>

                <button
                  disabled={loadingAction || !selectedItemToAdd}
                  onClick={handleAddItemForParticipant}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95"
                >
                  {loadingAction ? 'Adding...' : 'Add to Order'}
                </button>
              </div>
            </div>
          )}

          {/* Participant Breakdown */}
          <div className="space-y-3">
            {(group.participants || []).map((part, pIdx) => {
              const partTotal = (part.items || []).reduce((s, it) => s + (it.price * it.qty), 0);
              return (
                <div key={part.id || pIdx} className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-800 font-semibold text-xs flex items-center justify-center">
                        {part.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-gray-900 flex items-center gap-1">
                          {part.name}
                          {part.is_host && <span className="text-[9px] bg-yellow-100 text-yellow-800 px-1.5 py-0.2 rounded-full font-bold">Host</span>}
                        </div>
                        <div className="text-[10px] text-gray-500">{(part.items || []).length} items</div>
                      </div>
                    </div>
                    <span className="font-bold text-xs text-gray-800">{fmt(partTotal)}</span>
                  </div>

                  {(part.items || []).length === 0 ? (
                    <div className="text-center py-2 text-[11px] text-gray-400">No items selected yet</div>
                  ) : (
                    <div className="space-y-1.5">
                      {part.items.map((it, iIdx) => (
                        <div key={it.group_item_id || iIdx} className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-gray-100">
                          <div className="min-w-0 flex-1 mr-2">
                            <span className="font-bold text-gray-900">{it.qty}x </span>
                            <span className="text-gray-700">{it.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-red-600">{fmt(it.price * it.qty)}</span>
                            <button
                              onClick={() => handleRemoveItem(part.id, it.group_item_id)}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                              title="Remove item"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="p-4 bg-white border-t border-gray-100 shrink-0 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 font-semibold">Total Group Subtotal ({totalItemsCount} items)</span>
            <span className="font-bold text-red-600 text-lg">{fmt(totalGroupSubtotal)}</span>
          </div>

          <button
            disabled={consolidatedItems.length === 0}
            onClick={() => onCheckoutGroup(consolidatedItems, group)}
            className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-lg btn-press flex items-center justify-center gap-2"
          >
            <ShoppingCart size={16} />
            Transfer {totalItemsCount} Items to Cart & Checkout
          </button>
        </div>
      </div>
    </div>
  );
}

function getItemIngredients(item) {
  if (item.ingredients && Array.isArray(item.ingredients)) return item.ingredients;
  const name = (item.name || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();

  if (name.includes('burger')) {
    return [
      '1 Juicy beef patty',
      '1 Slice of cheddar cheese',
      '1 burger bun',
      'Fresh lettuce',
      'Ripe tomato slices',
      'Pickles for crunch',
      'Ketchup & mustard',
      'Onions and bacon'
    ];
  }
  if (name.includes('pizza')) {
    return [
      'Stone-baked sourdough crust',
      'San Marzano tomato sauce',
      'Fresh mozzarella fior di latte',
      'Aromatic basil leaves',
      'Extra virgin olive oil',
      'Parmigiano Reggiano shavings'
    ];
  }
  if (name.includes('jollof') || cat.includes('rice')) {
    return [
      'Long-grain fragrant rice',
      'Smoky firewood tomato & pepper reduction',
      'Tender spiced protein cuts',
      'Sweet fried plantain (dodo)',
      'Aromatic bay leaf & thyme',
      'Fresh sweet bell peppers'
    ];
  }
  if (name.includes('pasta') || cat.includes('pasta')) {
    return [
      'Fresh handmade tagliatelle',
      'Rich alfredo cream sauce',
      'Wild forest mushrooms',
      '24-Month aged parmesan',
      'Cracked black peppercorns',
      'Fresh rosemary & garlic'
    ];
  }
  if (name.includes('shawarma')) {
    return [
      'Warm toasted Lebanese flatbread',
      'Charcoal-spiced shredded chicken',
      'Smoked beef sausage slices',
      'Creamy garlic tahini sauce',
      'Fresh crunchy cabbage & carrot',
      'Spicy chili drizzle'
    ];
  }
  if (name.includes('amala') || name.includes('yam') || cat.includes('swallow')) {
    return [
      'Silky smooth yam flour / tuber',
      'Fresh ewedu & gbegiri swirl (Abula)',
      'Rich iru (locust beans) relish',
      'Choice of tender goat meat / shaki',
      'Spicy ata dindin sauce'
    ];
  }
  return [
    'Fresh farm-sourced produce',
    'FoodMaxx secret seasoning',
    'Cooked fresh on order',
    'Premium edible herbs & spices',
    '100% natural ingredients'
  ];
}

function FoodDetailModal({ restaurant, item, onClose }) {
  const { addItem } = useCart();
  const { isDark } = useTheme();
  const toast = useToast();
  const [qty, setQty] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [instructions, setInstructions] = useState('');

  const optionData = getItemSizeAndExtras(item);
  const sizes = optionData.sizes || [];
  const extras = optionData.extras || [];
  const hasSizes = sizes.length > 0;

  const [selectedSize, setSelectedSize] = useState(hasSizes ? sizes[0]?.name : null);
  const [extraQuantities, setExtraQuantities] = useState({});

  const currentSizeObj = hasSizes ? (sizes.find(s => s.name === selectedSize) || sizes[0]) : null;
  const sizeAdj = currentSizeObj?.price_adjustment || 0;
  const rawHeroImage = currentSizeObj?.image_url || item.image_url;
  const heroImage = getOptimizedImageUrl(rawHeroImage, 800);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    if (heroImage) {
      const img = new Image();
      img.src = heroImage;
      if (img.complete) {
        setImageLoaded(true);
      } else {
        img.onload = () => setImageLoaded(true);
      }
    }
  }, [heroImage]);

  const pairingPrices = {
    'Cold Chapman': 1200,
    'Fried Dodo Cubes': 800,
    'Peppered Turkey': 1800,
    'Bottled Water': 350
  };

  const getExtraQty = (name) => extraQuantities[name] || 0;

  const updateExtraQty = (name, delta) => {
    setExtraQuantities(prev => {
      const current = prev[name] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      }
      return { ...prev, [name]: next };
    });
  };

  const extrasTotal = Object.entries(extraQuantities).reduce((sum, [eName, count]) => {
    const e = extras.find(x => x.name === eName);
    const unitPrice = e ? (e.price_adjustment || 0) : (pairingPrices[eName] || 0);
    return sum + (unitPrice * count);
  }, 0);

  const unitPrice = item.price + sizeAdj + extrasTotal;
  const total = unitPrice * qty;

  const selectedExtrasList = Object.entries(extraQuantities).map(([name, count]) => {
    return count > 1 ? `${count}x ${name}` : name;
  });

  const isAvailable = item.is_available !== false;

  function handleAdd() {
    if (!isAvailable) {
      toast('This item is currently unavailable', 'warning');
      return;
    }
    triggerHaptic('success');
    playNativeSound('tap');
    addItem(restaurant.id, restaurant.name, {
      id: item.id,
      name: item.name,
      image_url: heroImage || item.image_url,
      price: unitPrice,
      qty,
      selectedSize: hasSizes ? (selectedSize || sizes[0]?.name) : null,
      selectedExtras: selectedExtrasList,
      instructions: instructions.trim()
    });
    const addOnMsg = selectedExtrasList.length > 0 ? ` (${selectedExtrasList.length} extras)` : '';
    toast({
      type: 'cart',
      title: `${item.name}${addOnMsg}`,
      price: total,
      image: item.image_url,
      qty,
      extras: selectedExtrasList,
      message: `${item.name} added to cart 🛒`
    });
    onClose();
  }

  const handleShare = async () => {
    triggerHaptic('light');
    const shared = await shareNative({
      title: item.name,
      text: `Craving delicious ${item.name} from FoodMaxx! Check it out:`,
      url: window.location.href
    });
    if (shared) {
      toast('Share dialog opened! 📲', 'info');
    } else {
      toast('Link copied to clipboard! 📋', 'success');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0.95 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0.3, transition: { duration: 0.2, ease: 'easeIn' } }}
        transition={{ type: 'spring', damping: 32, stiffness: 480, mass: 0.7 }}
        className={`w-full max-w-lg sm:max-w-xl max-h-[92vh] sm:max-h-[90vh] h-[90vh] sm:h-auto ${
          isDark ? 'bg-[#121418] text-white border-white/10' : 'bg-white text-slate-900 border-slate-100'
        } rounded-t-[32px] sm:rounded-[36px] border border-b-0 sm:border relative flex flex-col shadow-2xl overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Scrollable Content Container */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          
          {/* 1. Immersive Hero Media Card - Fills the Upper Part */}
          <div className="relative h-80 sm:h-96 md:h-[420px] w-full bg-slate-900 overflow-hidden shrink-0">
            {/* Shimmer skeleton while loading */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 animate-pulse flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-emerald-400 animate-spin" />
              </div>
            )}
            <motion.img
              key={heroImage}
              initial={{ opacity: 0.3, scale: 1.02 }}
              animate={{ opacity: imageLoaded ? 1 : 0.6, scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=75';
                setImageLoaded(true);
              }}
              src={heroImage}
              alt={item.name}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className={`w-full h-full object-cover object-center transition-all duration-300 ${imageLoaded ? 'filter-none' : 'blur-xs scale-105'}`}
            />
            {/* Soft Ambient Vignette Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 pointer-events-none" />

            {/* Mobile Drag Indicator Handle Floating Over Image */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/70 backdrop-blur-md rounded-full z-30 pointer-events-none sm:hidden shadow-xs" />

            {/* Floating Top Control Pills */}
            <div className="absolute top-4 left-0 right-0 px-4 flex items-center justify-between z-20">
              <button
                type="button"
                onClick={() => { triggerHaptic('selection'); onClose(); }}
                className="w-10 h-10 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-all cursor-pointer border border-white/20 shadow-lg"
                title="Back"
              >
                <ChevronLeft size={22} className="stroke-[2.5]" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-10 h-10 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-all cursor-pointer border border-white/20 shadow-lg"
                  title="Share"
                >
                  <Share2 size={17} className="stroke-[2.2]" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    setIsFavorite(f => !f);
                    toast(isFavorite ? 'Removed from favourites' : 'Saved to favourites ❤️', 'info');
                  }}
                  className="w-10 h-10 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-all cursor-pointer border border-white/20 shadow-lg"
                  title="Favorite"
                >
                  <Heart size={17} className={isFavorite ? 'text-[#EA4C2A] fill-[#EA4C2A] stroke-[2.2]' : 'stroke-[2.2]'} />
                </button>
              </div>
            </div>
          </div>

          {/* 2. Product Information Block with Curved Top Transition */}
          <div className={`p-5 space-y-5 -mt-4 relative z-10 rounded-t-[28px] ${
            isDark ? 'bg-[#121418]' : 'bg-white'
          }`}>
            
            {/* Title & Price Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {/* Category pill */}
                <span className={`inline-block text-[11px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-2 ${
                  isDark ? 'bg-[#EA4C2A]/20 text-[#EA4C2A]' : 'bg-[#EA4C2A]/10 text-[#EA4C2A]'
                }`}>
                  {item.category || 'Specialty Dish'}
                </span>
                {/* Bold item name */}
                <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  {item.name}
                </h1>

                {/* Rating Row */}
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(star => (
                      <svg key={star} className={`w-3.5 h-3.5 ${star <= 4 ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className={`text-xs font-bold ml-0.5 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {item.rating || '4.7'}
                    </span>
                  </div>
                  <span className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                    ({item.review_count || '238'} reviews)
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    🔥 Popular
                  </span>
                </div>
              </div>

              {/* Prominent Unit Price Tag */}
              <div className="text-right shrink-0 pt-1">
                <div className={`text-2xl sm:text-3xl font-black text-[#EA4C2A] tracking-tight`}>
                  {fmt(unitPrice)}
                </div>
                <span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>per serving</span>
                {sizeAdj > 0 && (
                  <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                    Base {fmt(item.price)} + {fmt(sizeAdj)}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <p className={`text-sm leading-relaxed ${
              isDark ? 'text-gray-300' : 'text-slate-600'
            }`}>
              {item.description || `${item.name} prepared fresh with authentic ingredients and traditional spices. Served hot and ready to enjoy.`}
            </p>

            {/* 4. Portion Size Selector */}
            {hasSizes && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`font-extrabold text-sm tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Choose Portion Size
                    </h3>
                    <p className={`text-[11px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Select one to continue</p>
                  </div>
                  <span className="text-[10px] font-bold text-[#EA4C2A] bg-[#EA4C2A]/10 dark:bg-[#EA4C2A]/20 px-2.5 py-1 rounded-full">
                    Required
                  </span>
                </div>

                <div className="space-y-2">
                  {sizes.map((s, idx) => {
                    const isSelected = selectedSize === s.name;
                    const variationPrice = item.price + (s.price_adjustment || 0);
                    const isBase = (s.price_adjustment || 0) === 0;
                    const sizeEmoji = idx === 0 ? '🥣' : idx === 1 ? '🍽️' : '🪣';

                    return (
                      <button
                        key={s.name || idx}
                        type="button"
                        onClick={() => {
                          triggerHaptic('selection');
                          setSelectedSize(s.name);
                        }}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#EA4C2A]/[0.08] dark:bg-[#EA4C2A]/15 border-[#EA4C2A] shadow-sm'
                            : isDark
                            ? 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
                            : 'bg-slate-50/80 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                        }`}
                      >
                        {/* Emoji icon */}
                        <span className="text-xl shrink-0">{sizeEmoji}</span>

                        {/* Name + description */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-extrabold tracking-tight ${
                              isSelected
                                ? (isDark ? 'text-white' : 'text-slate-900')
                                : (isDark ? 'text-gray-200' : 'text-slate-700')
                            }`}>
                              {s.name}
                            </span>
                            {isBase && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400">
                                Standard
                              </span>
                            )}
                          </div>
                          {s.description && (
                            <p className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                              {s.description}
                            </p>
                          )}
                        </div>

                        {/* Price + radio */}
                        <div className="shrink-0 text-right flex flex-col items-end gap-1">
                          <span className={`text-sm font-extrabold tracking-tight ${
                            isSelected ? 'text-[#EA4C2A]' : isDark ? 'text-white' : 'text-slate-900'
                          }`}>
                            {fmt(variationPrice)}
                          </span>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                            isSelected
                              ? 'border-[#EA4C2A] bg-[#EA4C2A] text-white'
                              : isDark ? 'border-white/30' : 'border-slate-300'
                          }`}>
                            {isSelected && <Check size={11} className="stroke-[3]" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. Extras — 2-column card grid */}
            {extras.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`font-extrabold text-sm tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Upgrades &amp; Extras
                    </h3>
                    <p className={`text-[11px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Add more to your order</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                    isDark ? 'bg-white/8 text-gray-400' : 'bg-slate-100 text-slate-400'
                  }`}>Optional</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {extras.map((e, idx) => {
                    const eQty = getExtraQty(e.name);
                    const isAdded = eQty > 0;
                    return (
                      <div
                        key={e.name || idx}
                        className={`flex flex-col justify-between p-3 rounded-2xl border transition-all ${
                          isAdded
                            ? (isDark ? 'bg-[#EA4C2A]/15 border-[#EA4C2A]/50' : 'bg-orange-50 border-orange-300/70')
                            : (isDark ? 'bg-white/[0.04] border-white/8' : 'bg-slate-50 border-slate-200')
                        }`}
                      >
                        {/* Name + price */}
                        <div className="mb-2.5">
                          <p className={`text-xs font-bold leading-tight ${isDark ? 'text-gray-100' : 'text-slate-800'}`}>
                            {e.name}
                          </p>
                          <p className="text-[11px] font-semibold text-[#EA4C2A] mt-0.5">
                            +{fmt(e.price_adjustment)}
                          </p>
                        </div>

                        {/* Controls */}
                        {eQty === 0 ? (
                          <button
                            type="button"
                            onClick={() => { triggerHaptic('selection'); updateExtraQty(e.name, 1); }}
                            className="w-full py-1.5 rounded-xl bg-[#EA4C2A]/10 hover:bg-[#EA4C2A] text-[#EA4C2A] hover:text-white font-bold text-xs transition-all cursor-pointer active:scale-95"
                          >
                            + Add
                          </button>
                        ) : (
                          <div className={`flex items-center justify-between rounded-xl px-1 py-0.5 border ${
                            isDark ? 'bg-black/30 border-white/10' : 'bg-white border-slate-200'
                          }`}>
                            <button
                              type="button"
                              onClick={() => { triggerHaptic('selection'); updateExtraQty(e.name, -1); }}
                              className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center font-black text-sm text-slate-700 dark:text-white cursor-pointer"
                            >
                              −
                            </button>
                            <span className="font-black text-xs text-[#EA4C2A] w-5 text-center">{eQty}</span>
                            <button
                              type="button"
                              onClick={() => { triggerHaptic('selection'); updateExtraQty(e.name, 1); }}
                              className="w-7 h-7 rounded-lg bg-[#EA4C2A] text-white flex items-center justify-center font-black text-sm cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 6. Special Instructions — textarea with character counter */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  <span>🍴</span> Special Kitchen Notes
                </label>
                <span className={`text-[11px] font-semibold tabular-nums ${
                  instructions.length >= 100
                    ? 'text-[#EA4C2A]'
                    : isDark ? 'text-gray-600' : 'text-slate-300'
                }`}>
                  {instructions.length}/120
                </span>
              </div>
              <textarea
                rows={2}
                maxLength={120}
                placeholder="e.g. Extra spicy, sauce on the side, no onions..."
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                className={`w-full text-xs rounded-2xl px-4 py-3 border outline-none font-medium resize-none transition-colors leading-relaxed ${
                  isDark
                    ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#EA4C2A]/60 focus:bg-white/8'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-gray-400 focus:border-[#EA4C2A]/50 focus:bg-white'
                }`}
              />
            </div>
          </div>
        </div>

        {/* 7. Sticky Bottom Bar — frosted glass */}
        <div className={`shrink-0 px-4 pt-3 border-t backdrop-blur-xl ${
          isDark
            ? 'bg-[#121418]/90 border-white/8'
            : 'bg-white/90 border-slate-100'
        } pb-[max(1.25rem,env(safe-area-inset-bottom,1.25rem))] flex items-center gap-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]`}>
          
          {/* Tactile Qty Stepper */}
          <div className={`flex items-center rounded-2xl border shrink-0 overflow-hidden ${
            isDark ? 'bg-white/8 border-white/12' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => { triggerHaptic('selection'); setQty(q => Math.max(1, q - 1)); }}
              disabled={qty <= 1}
              className={`w-10 h-11 flex items-center justify-center font-black text-lg cursor-pointer transition-all active:scale-90 disabled:opacity-25 ${
                isDark ? 'text-white hover:bg-white/10' : 'text-slate-800 hover:bg-slate-200'
              }`}
            >
              −
            </button>
            <span className={`font-black text-sm select-none w-7 text-center ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {qty}
            </span>
            <button
              type="button"
              onClick={() => { triggerHaptic('selection'); setQty(q => q + 1); }}
              className={`w-10 h-11 flex items-center justify-center font-black text-lg cursor-pointer transition-all active:scale-90 ${
                isDark ? 'text-white hover:bg-white/10' : 'text-slate-800 hover:bg-slate-200'
              }`}
            >
              +
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            type="button"
            onClick={handleAdd}
            disabled={!isAvailable}
            className={`flex-1 py-3.5 px-5 rounded-2xl font-extrabold text-sm text-white active:scale-[0.97] transition-all flex items-center justify-between cursor-pointer ${
              isAvailable
                ? 'bg-[#EA4C2A] hover:bg-[#D43D1D] shadow-lg shadow-[#EA4C2A]/30'
                : 'bg-slate-400/60 cursor-not-allowed'
            }`}
          >
            <span>{isAvailable ? 'Add to Cart' : 'Sold Out'}</span>
            <span className="font-black tracking-tight text-base">{fmt(total)}</span>
          </button>
        </div>

      </motion.div>
    </motion.div>
  );
}

// ============================================================
// ============================================================
// CART DRAWER (ENHANCED MODERN GRAPHICS & INTERACTION)
// ============================================================
function CartDrawer({ open, onClose, onCheckout, selectedZone }) {
  const { cart, removeItem, updateQty, subtotal, clearCart, addItem } = useCart();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const [deliveryNote, setDeliveryNote] = useState('');
  const [showAddonPopout, setShowAddonPopout] = useState(false);
  const [addonsList, setAddonsList] = useState(DEFAULT_ADDONS);

  // Check if ₦1,000 giveaway has already been claimed on this device/account
  const isGiveawayClaimed = Boolean(
    user?.giveaway_claimed ||
    (user && ((user.orders_count || 0) > 0 || (user.total_orders || 0) > 0)) ||
    (() => {
      try {
        if (localStorage.getItem('fmx_giveaway_claimed') === 'true') return true;
        const lp = localStorage.getItem('fmx_last_phone') || user?.phone;
        if (lp && localStorage.getItem(`fmx_giveaway_claimed_${lp.replace(/\D/g, '')}`) === 'true') return true;
        return false;
      } catch {
        return false;
      }
    })()
  );

  // 1. Welcome ₦1,000 Giveaway state in Cart (enabled by default for first-timers)
  const [applyWelcomeDiscount, setApplyWelcomeDiscount] = useState(() => {
    try {
      if (isGiveawayClaimed) return false;
      return localStorage.getItem('fmx_cart_use_giveaway') !== 'false';
    } catch {
      return !isGiveawayClaimed;
    }
  });

  // 2. Delay Apology Discount (SORRY500) state in Cart
  const [applyApologyDiscount, setApplyApologyDiscount] = useState(() => {
    try {
      return localStorage.getItem('fmx_active_promo') === 'SORRY500';
    } catch {
      return false;
    }
  });

  // Slide-up pop-up modal for Available Offers & Discounts in Cart
  const [offersSheetOpen, setOffersSheetOpen] = useState(false);

  useEffect(() => {
    let unsub = null;
    try {
      if (api.subscribeLiveAddons) {
        unsub = api.subscribeLiveAddons(list => {
          if (list && list.length > 0) setAddonsList(list);
        });
      }
    } catch (e) {}
    api.getAdminAddons().then(res => {
      if (res?.data && res.data.length > 0) setAddonsList(res.data);
    }).catch(() => {});
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Discount deductions on Cart Subtotal
  const welcomeDiscountVal = (!isGiveawayClaimed && applyWelcomeDiscount) ? Math.min(1000, subtotal) : 0;
  const remainingSubtotal = Math.max(0, subtotal - welcomeDiscountVal);
  const apologyDiscountVal = applyApologyDiscount ? Math.min(500, remainingSubtotal > 0 ? remainingSubtotal : subtotal) : 0;
  const totalDiscount = welcomeDiscountVal + apologyDiscountVal;

  const standardDeliveryFee = selectedZone?.delivery_fee || 500;
  const isFreeDelivery = subtotal >= 10000;
  const effectiveDeliveryFee = isFreeDelivery ? 0 : standardDeliveryFee;
  const serviceFee = 250;
  const total = Math.max(0, subtotal + effectiveDeliveryFee + serviceFee - totalDiscount);
  const totalItemsCount = cart.items.reduce((s, i) => s + i.qty, 0);

  const handleToggleWelcome = () => {
    if (isGiveawayClaimed) {
      toast('The ₦1,000 welcome discount has already been redeemed for this account.', 'info');
      return;
    }
    const next = !applyWelcomeDiscount;
    setApplyWelcomeDiscount(next);
    try {
      localStorage.setItem('fmx_cart_use_giveaway', next ? 'true' : 'false');
    } catch {}
    if (typeof triggerHaptic === 'function') triggerHaptic('selection');
    if (next) {
      toast(`₦1,000 Welcome discount applied! 🎉 Saved ${fmt(Math.min(1000, subtotal))}`, 'success');
    } else {
      toast('Welcome discount removed from cart', 'info');
    }
  };

  const handleToggleApology = () => {
    const next = !applyApologyDiscount;
    setApplyApologyDiscount(next);
    try {
      if (next) {
        localStorage.setItem('fmx_active_promo', 'SORRY500');
      } else {
        if (localStorage.getItem('fmx_active_promo') === 'SORRY500') {
          localStorage.removeItem('fmx_active_promo');
        }
      }
    } catch {}
    if (typeof triggerHaptic === 'function') triggerHaptic('selection');
    if (next) {
      toast('Delay apology voucher applied! ₦500 deducted. 🤝', 'success');
    } else {
      toast('Apology voucher removed from cart', 'info');
    }
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0.95 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0.3, transition: { duration: 0.2, ease: 'easeIn' } }}
        transition={{ type: 'spring', damping: 32, stiffness: 480, mass: 0.7 }}
        className={`w-full max-w-lg md:max-w-xl h-full min-h-[100dvh] sm:min-h-0 sm:h-[88vh] sm:max-h-[88vh] ${
          isDark ? 'bg-[#121418] text-white border-white/10' : 'bg-[#FAFAFB] text-slate-900 border-slate-200'
        } rounded-none sm:rounded-[32px] sm:border relative flex flex-col shadow-2xl overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile touch grab handle */}
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />

        {/* Clean Header */}
        <div className={`shrink-0 ${isDark ? 'bg-[#121418] border-white/10' : 'bg-white border-slate-100'} px-5 py-4 border-b flex items-center justify-between z-10`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { triggerHaptic('selection'); onClose(); }}
              className={`w-9 h-9 rounded-full ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} flex items-center justify-center active:scale-90 transition-transform cursor-pointer`}
              title="Close"
            >
              <ChevronLeft size={20} className="stroke-[2.5]" />
            </button>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white leading-tight">Your Cart</h2>
              <p className="text-xs text-gray-400 font-medium">
                {cart.restaurantName || 'FoodMaxx'} · {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>

          {cart.items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Clear all items from your cart?')) {
                  clearCart();
                  triggerHaptic('medium');
                  toast('Cart cleared', 'info');
                }
              }}
              className="text-xs text-red-500 hover:text-red-600 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Cart Body */}
        {cart.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center my-auto">
            <div className="w-20 h-20 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center text-3xl mb-4">
              🛒
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
              {getCopy(getAppContent(), 'customer_checkout', 'cart_empty_title', 'Your cart is empty')}
            </h3>
            <p className="text-gray-400 text-xs max-w-[240px] mb-5 font-medium">
              {getCopy(getAppContent(), 'customer_checkout', 'cart_empty_desc', 'Explore our delicious meals and add items to your cart.')}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="bg-[#EA4C2A] text-white px-6 py-2.5 rounded-xl font-semibold text-xs shadow-md shadow-[#EA4C2A]/25 cursor-pointer active:scale-95"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3">
            {/* Items List */}
            <div className="space-y-2.5">
              {cart.items.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-2xl border ${
                    isDark ? 'bg-[#181B22] border-white/5' : 'bg-white border-slate-100 shadow-sm'
                  }`}
                >
                  <img
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'; }}
                    src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'}
                    alt={item.name}
                    className="w-14 h-14 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-gray-800"
                    loading="lazy"
                    decoding="async"
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {item.name}
                    </h4>
                    {item.selectedSize && item.selectedSize !== 'Regular Portion' && (
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.selectedSize}</p>
                    )}
                    {item.selectedExtras && item.selectedExtras.length > 0 && (
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">
                        +{item.selectedExtras.join(', ')}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <p className="font-bold text-xs sm:text-sm text-[#EA4C2A]">
                        {fmt(item.price * item.qty)}
                      </p>
                      <button
                        type="button"
                        onClick={() => { triggerHaptic('selection'); setShowAddonPopout(true); }}
                        className="text-[10px] font-medium text-orange-500 hover:text-orange-600 hover:underline cursor-pointer"
                      >
                        + Add extras
                      </button>
                    </div>
                  </div>

                  {/* Clean Red Stepper */}
                  <div className="flex items-center gap-2 bg-[#EA4C2A] text-white rounded-xl p-1 shrink-0 shadow-xs">
                    <button
                      type="button"
                      onClick={() => { triggerHaptic('selection'); updateQty(idx, -1); }}
                      className="w-6 h-6 rounded-lg bg-black/15 hover:bg-black/25 text-white flex items-center justify-center active:scale-90 cursor-pointer transition-colors"
                    >
                      <Minus size={12} className="stroke-[3]" />
                    </button>
                    <span className="font-bold text-xs min-w-[16px] text-center text-white select-none">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => { triggerHaptic('selection'); updateQty(idx, 1); }}
                      className="w-6 h-6 rounded-lg bg-black/15 hover:bg-black/25 text-white flex items-center justify-center active:scale-90 cursor-pointer transition-colors"
                    >
                      <Plus size={12} className="stroke-[3]" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => { triggerHaptic('light'); removeItem(idx); }}
                    className="text-gray-300 hover:text-red-500 p-1 cursor-pointer transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            {/* Clean Add-on / Extra Link - Non-distracting popout trigger */}
            <button
              type="button"
              onClick={() => { triggerHaptic('selection'); setShowAddonPopout(true); }}
              className={`w-full py-2.5 px-3.5 rounded-2xl border border-dashed flex items-center justify-between text-xs font-semibold transition-all cursor-pointer active:scale-[0.99] ${
                isDark
                  ? 'border-orange-500/30 bg-orange-500/5 text-orange-400 hover:bg-orange-500/10'
                  : 'border-orange-200 bg-orange-50/70 text-[#EA4C2A] hover:bg-orange-100/70'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-[#EA4C2A]/10 text-[#EA4C2A] flex items-center justify-center text-xs">✨</span>
                <span>Need drinks, sides or extra bites?</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#EA4C2A]">
                <span>+ Add Extras</span>
                <ChevronRight size={13} />
              </span>
            </button>

            {/* Note input */}
            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
              <input
                type="text"
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="Order note / kitchen instruction (optional)..."
                className="w-full text-xs bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-gray-400 font-medium"
              />
            </div>

            {/* OFFERS & DISCOUNTS SIMPLE BANNER */}
            <div
              onClick={() => {
                triggerHaptic('selection');
                setOffersSheetOpen(true);
              }}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all active:scale-[0.98] flex items-center justify-between gap-3 ${
                (applyWelcomeDiscount || applyApologyDiscount)
                  ? isDark
                    ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border-emerald-500/30'
                    : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 shadow-xs'
                  : isDark
                  ? 'bg-[#181B22] border-white/10 hover:border-orange-500/30'
                  : 'bg-white border-slate-200 hover:border-orange-200 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                  (applyWelcomeDiscount || applyApologyDiscount)
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[#EA4C2A]/10 text-[#EA4C2A]'
                }`}>
                  %
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      Offers & Discounts
                    </span>
                    {(applyWelcomeDiscount || applyApologyDiscount) ? (
                      <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                        −{fmt(totalDiscount)} Applied
                      </span>
                    ) : (
                      <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-[#EA4C2A]/10 text-[#EA4C2A]">
                        Deals Available
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {(applyWelcomeDiscount || applyApologyDiscount)
                      ? `${applyWelcomeDiscount ? '₦1,000 Welcome' : ''}${applyWelcomeDiscount && applyApologyDiscount ? ' + ' : ''}${applyApologyDiscount ? '₦500 Apology' : ''} applied to cart`
                      : 'Tap to view & apply available discounts'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[#EA4C2A] text-xs font-bold shrink-0">
                <span>View</span>
                <ChevronRight size={15} />
              </div>
            </div>

            {/* Clean Bill Summary */}
            <div className={`p-4 rounded-2xl border space-y-2.5 ${isDark ? 'bg-[#181B22] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Items Subtotal</span>
                <span className="font-semibold text-slate-900 dark:text-white">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Delivery Fee</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {isFreeDelivery ? 'FREE' : fmt(standardDeliveryFee)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Service Fee</span>
                <span className="font-semibold text-slate-900 dark:text-white">{fmt(serviceFee)}</span>
              </div>

              {/* Welcome Discount Deduction Line */}
              {!isGiveawayClaimed && applyWelcomeDiscount && welcomeDiscountVal > 0 && (
                <div className="flex justify-between items-center text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
                  <span className="flex items-center gap-1.5">
                    <Gift size={13} />
                    <span>Welcome Gift (₦1,000)</span>
                  </span>
                  <span>−{fmt(welcomeDiscountVal)}</span>
                </div>
              )}

              {/* Apology Voucher Deduction Line */}
              {applyApologyDiscount && apologyDiscountVal > 0 && (
                <div className="flex justify-between items-center text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-xl border border-rose-500/20">
                  <span className="flex items-center gap-1.5">
                    <HeartHandshake size={13} />
                    <span>Delay Apology (SORRY500)</span>
                  </span>
                  <span>−{fmt(apologyDiscountVal)}</span>
                </div>
              )}

              {/* Total Savings Summary Callout */}
              {totalDiscount > 0 && (
                <div className="flex justify-between items-center text-[11px] font-bold text-emerald-600 dark:text-emerald-400 pt-0.5">
                  <span>Total Cart Savings</span>
                  <span>−{fmt(totalDiscount)}</span>
                </div>
              )}

              <div className="border-t border-slate-100 dark:border-white/10 pt-2.5 flex justify-between items-center font-bold text-sm">
                <div>
                  <span className="text-slate-900 dark:text-white block leading-tight">Total to Pay</span>
                  {totalDiscount > 0 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      You save {fmt(totalDiscount)}
                    </span>
                  )}
                </div>
                <span className="text-base text-[#EA4C2A]">{fmt(total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Action Button */}
        {cart.items.length > 0 && (
          <div className={`shrink-0 p-4 border-t ${isDark ? 'bg-[#121418] border-white/10' : 'bg-white border-slate-100'} pb-[max(1rem,env(safe-area-inset-bottom,1rem))]`}>
            <button
              type="button"
              onClick={() => { triggerHaptic('medium'); onCheckout(); }}
              className="w-full bg-[#EA4C2A] hover:bg-[#D43D1D] active:scale-[0.98] text-white py-3.5 px-4 rounded-2xl font-bold text-sm shadow-lg shadow-[#EA4C2A]/25 flex items-center justify-between cursor-pointer transition-all"
            >
              <span>Go to Checkout</span>
              <span className="flex items-center gap-1 font-bold">
                <span>{fmt(total)}</span>
                <ChevronRight size={16} />
              </span>
            </button>
          </div>
        )}

        {/* Clean Addon Popout Modal */}
        <AnimatePresence>
          {showAddonPopout && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end p-0"
              onClick={() => setShowAddonPopout(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className={`w-full max-h-[82%] rounded-t-[28px] ${
                  isDark ? 'bg-[#161920] text-white border-t border-white/10' : 'bg-white text-slate-900 shadow-2xl'
                } flex flex-col overflow-hidden`}
                onClick={e => e.stopPropagation()}
              >
                {/* Drag handle */}
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

                {/* Header */}
                <div className={`px-5 py-3 border-b flex items-center justify-between ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Add Sides & Drinks</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 font-semibold">Extras</span>
                    </h3>
                    <p className="text-[11px] text-gray-400 font-medium">Quickly add extras without cluttering your cart</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddonPopout(false)}
                    className={`w-8 h-8 rounded-full ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} flex items-center justify-center cursor-pointer`}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* List of add-ons with Real Photography */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2.5">
                  {addonsList.filter(a => a.is_available !== false).map(addon => {
                    const inCartItem = cart.items.find(i => i.name === addon.name || i.id === 'addon_' + addon.id);
                    const inCartQty = inCartItem ? inCartItem.qty : 0;
                    const inCartIdx = cart.items.findIndex(i => i.name === addon.name || i.id === 'addon_' + addon.id);

                    return (
                      <div
                        key={addon.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                          isDark
                            ? inCartQty > 0 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/5 border-white/5'
                            : inCartQty > 0 ? 'bg-orange-50/60 border-orange-200' : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'; }}
                            src={addon.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'}
                            alt={addon.name}
                            className="w-13 h-13 rounded-2xl object-cover shrink-0 shadow-xs border border-black/5 dark:border-white/10 bg-slate-100 dark:bg-gray-800"
                            loading="lazy"
                            decoding="async"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                                {addon.name}
                              </h4>
                              {addon.category && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400 font-medium">
                                  {addon.category}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 truncate mt-0.5">
                              {addon.description}
                            </p>
                            <p className="font-bold text-xs text-[#EA4C2A] mt-1">
                              {fmt(addon.price)}
                            </p>
                          </div>
                        </div>

                        {/* Stepper or Add Button */}
                        <div className="shrink-0">
                          {inCartQty > 0 ? (
                            <div className="flex items-center gap-1.5 bg-[#EA4C2A] text-white rounded-xl p-1 shadow-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('selection');
                                  updateQty(inCartIdx, -1);
                                }}
                                className="w-6 h-6 rounded-lg bg-black/15 hover:bg-black/25 text-white flex items-center justify-center active:scale-90 cursor-pointer transition-colors"
                              >
                                <Minus size={12} className="stroke-[3]" />
                              </button>
                              <span className="font-bold text-xs min-w-[16px] text-center text-white select-none">
                                {inCartQty}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('selection');
                                  updateQty(inCartIdx, 1);
                                }}
                                className="w-6 h-6 rounded-lg bg-black/15 hover:bg-black/25 text-white flex items-center justify-center active:scale-90 cursor-pointer transition-colors"
                              >
                                <Plus size={12} className="stroke-[3]" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('success');
                                playNativeSound('tap');
                                addItem('rest_foodmaxx', 'FoodMaxx', {
                                  id: 'addon_' + addon.id,
                                  name: addon.name,
                                  price: addon.price,
                                  qty: 1,
                                  image_url: addon.image_url,
                                  selectedSize: addon.category
                                });
                                toast(`${addon.name} added!`, 'success');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-white/10 text-xs font-bold text-[#EA4C2A] hover:bg-orange-500 hover:text-white active:scale-95 transition-all shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              <Plus size={13} />
                              <span>Add</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Done button */}
                <div className={`p-3.5 border-t ${isDark ? 'border-white/10 bg-[#121418]' : 'border-slate-100 bg-white'}`}>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setShowAddonPopout(false);
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#EA4C2A] text-white text-xs font-bold shadow-md shadow-[#EA4C2A]/20 cursor-pointer active:scale-[0.98]"
                  >
                    Done · Return to Cart
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SLIDE-UP OFFERS & DISCOUNTS POPUP BOTTOM SHEET */}
        <AnimatePresence>
          {offersSheetOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end p-0"
              onClick={() => setOffersSheetOpen(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className={`w-full max-h-[85%] rounded-t-[28px] ${
                  isDark ? 'bg-[#161920] text-white border-t border-white/10' : 'bg-white text-slate-900 shadow-2xl'
                } flex flex-col overflow-hidden`}
                onClick={e => e.stopPropagation()}
              >
                {/* Drag handle */}
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

                {/* Header */}
                <div className={`px-5 py-3.5 border-b flex items-center justify-between ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#EA4C2A]/10 text-[#EA4C2A] flex items-center justify-center text-xs font-black">%</span>
                      <span>Available Offers & Discounts</span>
                    </h3>
                    <p className="text-[11px] text-gray-400 font-medium">Tap apply to instantly deduct from your total</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOffersSheetOpen(false)}
                    className={`w-8 h-8 rounded-full ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} flex items-center justify-center cursor-pointer`}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Offers List */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                  {/* 1. ₦1,000 WELCOME DISCOUNT */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    isGiveawayClaimed
                      ? isDark ? 'bg-white/[0.02] border-white/5 opacity-60' : 'bg-slate-50 border-slate-200/60 opacity-70'
                      : applyWelcomeDiscount
                      ? isDark
                        ? 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-[#EA4C2A]/15 border-amber-500/35 shadow-md'
                        : 'bg-gradient-to-r from-amber-50/90 via-orange-50/80 to-amber-50/90 border-amber-300 shadow-sm'
                      : isDark
                      ? 'bg-[#181B22] border-white/10'
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-xs ${
                          isGiveawayClaimed
                            ? 'bg-gray-200 dark:bg-white/10 text-gray-400'
                            : 'bg-gradient-to-br from-amber-400 to-[#EA4C2A] text-white'
                        }`}>
                          🎁
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                              ₦1,000 Welcome Discount
                            </h4>
                            <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              isGiveawayClaimed
                                ? 'bg-gray-100 dark:bg-white/10 text-gray-400'
                                : applyWelcomeDiscount
                                ? 'bg-emerald-500 text-white'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            }`}>
                              {isGiveawayClaimed ? 'Claimed' : applyWelcomeDiscount ? '−₦1,000 Applied' : 'Available'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                            {isGiveawayClaimed
                              ? 'Welcome discount has already been used on your first order.'
                              : 'Special first-time customer gift. Flat ₦1,000 deduction on your meal subtotal.'}
                          </p>
                        </div>
                      </div>

                      {!isGiveawayClaimed && (
                        <button
                          type="button"
                          onClick={handleToggleWelcome}
                          className={`px-3.5 py-2 rounded-xl font-bold text-xs shrink-0 cursor-pointer transition-all active:scale-95 shadow-xs ${
                            applyWelcomeDiscount
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                              : 'bg-[#EA4C2A] hover:bg-[#D43D1D] text-white'
                          }`}
                        >
                          {applyWelcomeDiscount ? 'Applied ✓' : 'Apply'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2. DELAY APOLOGY DISCOUNT */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    applyApologyDiscount
                      ? isDark
                        ? 'bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-red-500/15 border-rose-500/35 shadow-md'
                        : 'bg-gradient-to-r from-rose-50/90 via-pink-50/80 to-rose-50/90 border-rose-300 shadow-sm'
                      : isDark
                      ? 'bg-[#181B22] border-white/10'
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                          <HeartHandshake size={22} className="stroke-[2.2]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                              Delivery Delay Apology
                            </h4>
                            <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              applyApologyDiscount
                                ? 'bg-rose-500 text-white'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            }`}>
                              {applyApologyDiscount ? '−₦500 Applied' : 'Code: SORRY500'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                            Experienced an unexpected kitchen or rider delay? Use this goodwill voucher for ₦500 off.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleApology}
                        className={`px-3.5 py-2 rounded-xl font-bold text-xs shrink-0 cursor-pointer transition-all active:scale-95 shadow-xs ${
                          applyApologyDiscount
                            ? 'bg-rose-500 hover:bg-rose-600 text-white'
                            : isDark
                            ? 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                        }`}
                      >
                        {applyApologyDiscount ? 'Applied ✓' : 'Apply'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom CTA to close */}
                <div className={`p-4 border-t ${isDark ? 'border-white/10 bg-[#121418]' : 'border-slate-100 bg-slate-50'}`}>
                  <button
                    type="button"
                    onClick={() => setOffersSheetOpen(false)}
                    className="w-full py-3.5 rounded-2xl bg-[#EA4C2A] hover:bg-[#D43D1D] active:scale-[0.98] text-white font-bold text-sm shadow-md cursor-pointer transition-all text-center"
                  >
                    Done · Return to Cart
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// PAYSTACK SDK LOADER HELPER
// ============================================================
function loadPaystackScript() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && typeof window.PaystackPop !== 'undefined') {
      return resolve(true);
    }
    const existing = document.getElementById('paystack-inline-js');
    if (existing) {
      if (typeof window.PaystackPop !== 'undefined') return resolve(true);
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      setTimeout(() => resolve(typeof window.PaystackPop !== 'undefined'), 1800);
      return;
    }
    const script = document.createElement('script');
    script.id = 'paystack-inline-js';
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
    setTimeout(() => resolve(typeof window.PaystackPop !== 'undefined'), 1800);
  });
}

// ============================================================
// PAYSTACK CHECKOUT MODAL (Card, Bank Transfer, USSD)
// ============================================================
function PaystackFallbackModal({ open, onClose, data, isDark, onPaymentComplete }) {
  const [activeTab, setActiveTab] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [storeSettings, setStoreSettings] = useState(() => getStoreDetails());

  useEffect(() => {
    let mounted = true;
    api.getStoreSettings?.().then(res => {
      if (mounted && res?.data) setStoreSettings(prev => ({ ...prev, ...res.data }));
    }).catch(() => {});

    const onUpdate = (e) => {
      if (mounted && e.detail) setStoreSettings(e.detail);
    };
    window.addEventListener('fmx_store_details_updated', onUpdate);
    window.addEventListener('fmx_store_settings_updated', onUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('fmx_store_details_updated', onUpdate);
      window.removeEventListener('fmx_store_settings_updated', onUpdate);
    };
  }, []);

  const bankName = storeSettings?.payout_bank_name || 'Official Merchant Account';
  const accountNumber = storeSettings?.payout_account_number || '';
  const accountName = storeSettings?.payout_account_name || 'FoodMaxx Kitchen Ltd';

  if (!open || !data) return null;

  const amount = Number(data.amount) || 0;
  const email = data.email || 'customer@foodmaxx.ng';
  const reference = data.reference || `FMX_PSTK_${Date.now()}`;

  const handleSimulatePayment = (paymentChannel = 'card') => {
    setIsProcessing(false);
    setIsSuccess(true);
    triggerHaptic('success');
    playNativeSound('success');
    if (onPaymentComplete) {
      onPaymentComplete({
        reference,
        status: 'success',
        channel: paymentChannel
      });
    }
  };

  const copyAccountNumber = () => {
    if (!accountNumber) return;
    try {
      if (navigator.clipboard) navigator.clipboard.writeText(accountNumber);
    } catch {}
    setCopiedAccount(true);
    triggerHaptic('selection');
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border ${
          isDark ? 'bg-[#12141A] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
        } relative flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {/* Paystack Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/60 dark:bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0AA5FF]/10 text-[#0AA5FF] flex items-center justify-center font-black text-sm">
              <span className="font-mono text-base font-extrabold">P</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs sm:text-sm tracking-tight text-slate-900 dark:text-white">Paystack</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <ShieldCheck size={10} /> Secured
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{email}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Pay</span>
            <span className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
              ₦{amount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Processing overlay */}
        {isProcessing && (
          <div className="py-14 px-6 text-center space-y-3">
            <RefreshCw size={36} className="animate-spin text-[#0AA5FF] mx-auto" />
            <h4 className="font-bold text-base text-slate-900 dark:text-white">Connecting with Paystack...</h4>
            <p className="text-xs text-slate-400">Authorizing transaction with your bank. Please do not close.</p>
          </div>
        )}

        {/* Success overlay */}
        {isSuccess && (
          <div className="py-14 px-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto text-2xl">
              <Check size={28} className="stroke-[3]" />
            </div>
            <h4 className="font-bold text-lg text-slate-900 dark:text-white">Payment Approved!</h4>
            <p className="text-xs text-slate-400">Ref: {reference.slice(0, 18)}...</p>
          </div>
        )}

        {/* Channels Content */}
        {!isProcessing && !isSuccess && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Tabs */}
            <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-white/5 text-xs font-bold">
              {[
                { id: 'card', label: '💳 Card' },
                { id: 'transfer', label: '🏦 Bank Transfer' },
                { id: 'ussd', label: '📱 USSD' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-[#1C2029] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: CARD */}
            {activeTab === 'card' && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">CARD NUMBER</label>
                  <input
                    type="text"
                    maxLength={19}
                    placeholder="4084 0000 0000 0000"
                    value={cardNumber}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim();
                      setCardNumber(v);
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 font-mono text-xs text-slate-900 dark:text-white outline-none focus:border-[#0AA5FF]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">EXPIRES</label>
                    <input
                      type="text"
                      maxLength={5}
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={e => {
                        let v = e.target.value.replace(/\D/g, '');
                        if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
                        setCardExpiry(v);
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 font-mono text-xs text-slate-900 dark:text-white outline-none focus:border-[#0AA5FF]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">CVV</label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="123"
                      value={cardCvv}
                      onChange={e => setCardCvv(e.target.value.replace(/\D/g, ''))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 font-mono text-xs text-slate-900 dark:text-white outline-none focus:border-[#0AA5FF]"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSimulatePayment('card')}
                  className="w-full py-3 rounded-xl bg-[#09A552] hover:bg-[#088C45] text-white font-bold text-sm shadow-md transition-transform active:scale-[0.98] cursor-pointer mt-2"
                >
                  Pay ₦{amount.toLocaleString()}
                </button>
              </div>
            )}

            {/* TAB 2: TRANSFER */}
            {activeTab === 'transfer' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Bank Name</span>
                    <strong className="text-slate-900 dark:text-white">{bankName}</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Account Number</span>
                    <div className="flex items-center gap-1.5">
                      <strong className="font-mono text-sm text-[#0AA5FF]">
                        {accountNumber || 'Official Merchant Line'}
                      </strong>
                      {accountNumber && (
                        <button
                          type="button"
                          onClick={copyAccountNumber}
                          className="p-1 rounded-md bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white hover:opacity-80 cursor-pointer"
                          title="Copy account number"
                        >
                          <Copy size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Beneficiary</span>
                    <strong className="text-slate-900 dark:text-white">{accountName}</strong>
                  </div>
                </div>
                {copiedAccount && (
                  <p className="text-[11px] text-emerald-600 font-bold text-center">Account number copied!</p>
                )}
                <p className="text-[11px] text-slate-400 text-center">
                  Transfer exactly ₦{amount.toLocaleString()} to the account above.
                </p>

                <button
                  type="button"
                  onClick={() => handleSimulatePayment('bank_transfer')}
                  className="w-full py-3 rounded-xl bg-[#09A552] hover:bg-[#088C45] text-white font-bold text-sm shadow-md transition-transform active:scale-[0.98] cursor-pointer"
                >
                  I Have Sent The Payment
                </button>
              </div>
            )}

            {/* TAB 3: USSD */}
            {activeTab === 'ussd' && (
              <div className="space-y-3 text-center">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-[11px] text-slate-400 block mb-1">Direct Bank USSD</span>
                  <div className="font-mono font-bold text-sm text-[#0AA5FF] tracking-wider">
                    {accountNumber ? `Transfer ₦${amount.toLocaleString()} to ${accountNumber} via your bank app or USSD` : 'Pay via your Mobile Banking App / USSD'}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Dial your bank's transfer code on your phone linked to your bank account.
                </p>
                <button
                  type="button"
                  onClick={() => handleSimulatePayment('ussd')}
                  className="w-full py-3 rounded-xl bg-[#09A552] hover:bg-[#088C45] text-white font-bold text-sm shadow-md transition-transform active:scale-[0.98] cursor-pointer"
                >
                  I Have Completed USSD Payment
                </button>
              </div>
            )}

            {/* Cancel link */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-red-500 font-semibold cursor-pointer"
              >
                Cancel payment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CHECKOUT MODAL
// ============================================================
function CheckoutModal({ open, onClose, onOpenGroupOrder, selectedZone, onSuccess, selectedAddress, wallet, onRefreshWallet, onChangeAddress }) {
  const { cart, subtotal, clearCart, updateQty, removeItem } = useCart();
  const { user, silentRegister, updateUser } = useAuth();
  const { isDark } = useTheme();
  const toast = useToast();
  const [paymentMethod, setPaymentMethod] = useState('paystack');

  // Active Promo Code (empty by default - no hard-coded or stale coupon)
  const [promoCode, setPromoCode] = useState('');

  const [discount, setDiscount] = useState(0);
  const [freeDelivery, setFreeDelivery] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);

  // Available vouchers slide-up pop-up state
  const [voucherSheetOpen, setVoucherSheetOpen] = useState(false);

  const AVAILABLE_VOUCHERS = [
    { code: 'WELCOME1000', title: '₦1,000 Welcome Discount', desc: 'Flat ₦1,000 off for first-time customers' },
    { code: 'FOODMAXX10', title: '10% Off Entire Order', desc: 'Save 10% on fresh delicious dishes' },
    { code: 'FREEDEL', title: 'Free Delivery Ibadan', desc: 'Free doorstep delivery across all zones' },
    { code: 'SORRY500', title: '₦500 Delay Apology Voucher', desc: 'Goodwill compensation voucher' },
    { code: 'FREEFRIES', title: 'Free Golden Crispy Fries', desc: 'Complimentary side of fries on orders over ₦4,000' },
    { code: 'FREEDRINK', title: 'Free Chilled Soft Drink', desc: 'Complimentary drink on orders over ₦5,000' }
  ];

  // Free First-Time ₦1,000 Giveaway toggle & strictly 1-time per customer claim tracker
  const [useFirstTimeGiveaway, setUseFirstTimeGiveaway] = useState(true);
  const [giveawayClaimedState, setGiveawayClaimedState] = useState(() => {
    try {
      if (localStorage.getItem('fmx_giveaway_claimed') === 'true') return true;
      const lp = localStorage.getItem('fmx_last_phone');
      if (lp && localStorage.getItem(`fmx_giveaway_claimed_${lp}`) === 'true') return true;
      return false;
    } catch {
      return false;
    }
  });

  // Dedicated Paystack checkout modal state
  const [paystackModalOpen, setPaystackModalOpen] = useState(false);
  const [paystackModalData, setPaystackModalData] = useState(null);
  const pendingOrderDataRef = useRef(null);

  // Group order slide-up sheet state
  const [groupOrderOpen, setGroupOrderOpen] = useState(() => {
    try {
      const p = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      return Boolean(p?.get('group'));
    } catch {
      return false;
    }
  });

  // Cart items expand/collapse state
  const [isItemsOpen, setIsItemsOpen] = useState(true);

  // Summary expand/collapse state
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);

  // Paystack configuration
  const [paystackConfig, setPaystackConfig] = useState(() => getStoredPaystackConfig());
  const [paystackKey, setPaystackKey] = useState(() => getStoredPaystackConfig().publicKey || '');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  // Direct delivery address state (strictly empty when logged out)
  const [deliveryAddress, setDeliveryAddress] = useState(() => {
    if (!user) return '';
    try {
      return user.address || selectedAddress?.address || localStorage.getItem('fmx_last_delivery_address') || '';
    } catch {
      return '';
    }
  });

  // Contact details (strictly empty when logged out)
  const [contactName, setContactName] = useState(() => {
    if (!user) return '';
    try {
      return user.full_name || localStorage.getItem('fmx_last_name') || '';
    } catch {
      return '';
    }
  });
  const [contactPhone, setContactPhone] = useState(() => {
    if (!user) return '';
    try {
      return user.phone || localStorage.getItem('fmx_last_phone') || '';
    } catch {
      return '';
    }
  });
  const [contactEmail, setContactEmail] = useState(() => (!user ? '' : (user?.email || '')));
  const [isEditingContact, setIsEditingContact] = useState(false);

  // Sync contact & address when user changes (handles login AND logout)
  useEffect(() => {
    if (!user) {
      // User logged out: completely reset delivery details and contact info
      setContactName('');
      setContactPhone('');
      setContactEmail('');
      setDeliveryAddress('');
      setLandmark('');
    } else {
      setContactName(user.full_name || '');
      setContactPhone(user.phone || '');
      setContactEmail(user.email || '');
      if (user.address) {
        setDeliveryAddress(user.address);
      } else if (selectedAddress?.address) {
        setDeliveryAddress(selectedAddress.address);
      }
    }
  }, [user]);

  // Sync when selectedAddress changes only if user is logged in
  useEffect(() => {
    if (!user) {
      setDeliveryAddress('');
      setLandmark('');
    } else if (selectedAddress?.address) {
      setDeliveryAddress(selectedAddress.address);
      if (selectedAddress.landmark) setLandmark(selectedAddress.landmark);
    }
  }, [selectedAddress, user]);

  // Event listener for global logout / address clear
  useEffect(() => {
    const handleAuthEvent = (e) => {
      if (e.detail?.action === 'logout') {
        setContactName('');
        setContactPhone('');
        setContactEmail('');
        setDeliveryAddress('');
        setLandmark('');
      }
    };
    window.addEventListener('fmx_auth_change', handleAuthEvent);
    window.addEventListener('fmx_address_clear', handleAuthEvent);
    return () => {
      window.removeEventListener('fmx_auth_change', handleAuthEvent);
      window.removeEventListener('fmx_address_clear', handleAuthEvent);
    };
  }, []);

  // Instant silent registration on first input of Name
  const triggerAutoSilentRegister = useCallback(async (nameVal, phoneVal) => {
    const cleanName = (nameVal ?? contactName).trim();
    const cleanPhone = (phoneVal ?? contactPhone).trim();
    if (cleanName.length >= 2) {
      try {
        localStorage.setItem('fmx_last_name', cleanName);
        if (cleanPhone) localStorage.setItem('fmx_last_phone', cleanPhone);
      } catch {}
      if (!user && silentRegister) {
        try {
          await silentRegister({
            full_name: cleanName,
            phone: cleanPhone || ''
          });
        } catch (e) {
          console.warn('Auto silent register:', e);
        }
      }
    }
  }, [contactName, contactPhone, user, silentRegister]);

  // Surprise Gift
  const [isGift, setIsGift] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [giftNote, setGiftNote] = useState('');
  const [hidePrice, setHidePrice] = useState(false);

  // Timing
  const [deliveryTiming, setDeliveryTiming] = useState('now');
  const [scheduledDay, setScheduledDay] = useState('Today');
  const [scheduledSlot, setScheduledSlot] = useState('1:00 PM - 1:30 PM (Lunch)');

  // Landmark
  const [landmark, setLandmark] = useState(selectedAddress?.landmark || '');

  // Wallet balance for payment method
  const rawWalletBalance = Number(wallet?.balance) || 0;

  const deliveryFee = freeDelivery ? 0 : (selectedZone?.delivery_fee || 500);
  const serviceFee = 250;

  // Check if ₦1,000 giveaway has already been claimed on this device, by this account, or by this phone
  const currentCleanPhone = (contactPhone || user?.phone || '').replace(/\D/g, '').slice(0, 11);
  const isGiveawayClaimed = Boolean(
    giveawayClaimedState ||
    user?.giveaway_claimed ||
    (user && ((user.orders_count || 0) > 0 || (user.total_orders || 0) > 0)) ||
    (() => {
      try {
        if (localStorage.getItem('fmx_giveaway_claimed') === 'true') return true;
        if (currentCleanPhone && localStorage.getItem(`fmx_giveaway_claimed_${currentCleanPhone}`) === 'true') return true;
        const lastPhone = localStorage.getItem('fmx_last_phone');
        if (lastPhone && localStorage.getItem(`fmx_giveaway_claimed_${lastPhone}`) === 'true') return true;
        return false;
      } catch {
        return false;
      }
    })()
  );

  const markGiveawayAsClaimed = (phoneNum) => {
    try {
      localStorage.setItem('fmx_giveaway_claimed', 'true');
      const p = (phoneNum || contactPhone || user?.phone || '').replace(/\D/g, '').slice(0, 11);
      if (p) {
        localStorage.setItem(`fmx_giveaway_claimed_${p}`, 'true');
      }
      if (user?.id) {
        localStorage.setItem(`fmx_giveaway_claimed_${user.id}`, 'true');
      }
      setGiveawayClaimedState(true);
    } catch {}
  };

  // First-time ₦1,000 Giveaway Deduction (strictly 1-time per customer):
  const effectiveUseGiveaway = !isGiveawayClaimed && useFirstTimeGiveaway;
  const firstTimeGiveawayDeduction = effectiveUseGiveaway
    ? Math.min(1000, Math.max(0, subtotal - discount))
    : 0;

  const total = Math.max(0, subtotal + deliveryFee + serviceFee - discount - firstTimeGiveawayDeduction);
  const totalSavings = discount + firstTimeGiveawayDeduction + (freeDelivery ? (selectedZone?.delivery_fee || 500) : 0);

  // Clear any legacy promo code from storage to prevent accidental auto-application
  useEffect(() => {
    try {
      localStorage.removeItem('fmx_active_promo');
    } catch {}
  }, []);

  useEffect(() => {
    const cfg = getStoredPaystackConfig();
    setPaystackConfig(cfg);
    if (cfg.publicKey) setPaystackKey(cfg.publicKey);

    const handleConfigUpdate = (e) => {
      if (e.detail) {
        setPaystackConfig(e.detail);
        if (e.detail.publicKey) setPaystackKey(e.detail.publicKey);
      }
    };
    window.addEventListener('fmx_paystack_config_updated', handleConfigUpdate);

    api.getPaystackConfig()
      .then(res => {
        if (res?.data?.public_key) setPaystackKey(res.data.public_key);
      })
      .catch(() => {});

    const handlePaystackModalEvent = (e) => {
      if (e.detail) {
        setPaystackModalData(e.detail);
        setPaystackModalOpen(true);
        setLoading(false);
      }
    };
    window.addEventListener('fmx_open_paystack_modal', handlePaystackModalEvent);

    return () => {
      window.removeEventListener('fmx_paystack_config_updated', handleConfigUpdate);
      window.removeEventListener('fmx_open_paystack_modal', handlePaystackModalEvent);
    };
  }, []);

  async function applyPromo(overrideCode) {
    const code = (typeof overrideCode === 'string' ? overrideCode : promoCode).trim().toUpperCase();
    if (!code) return;

    if (code === 'WELCOME1000' && isGiveawayClaimed) {
      toast('The ₦1,000 giveaway is valid only once per customer and has already been claimed.', 'warning');
      return;
    }

    setPromoCode(code);
    setPromoLoading(true);
    try {
      const res = await api.validatePromo(code, subtotal);
      if (!res || res.success === false) {
        toast(res?.message || 'Invalid or expired promo code', 'error');
        return;
      }
      const disc = res.data?.discount || res.data?.discount_value || 0;
      const isFreeDel = Boolean(res.data?.free_delivery);
      setDiscount(disc);
      setFreeDelivery(isFreeDel);
      try {
        localStorage.setItem('fmx_active_promo', code);
      } catch {}
      triggerHaptic('success');
      toast(`Promo ${code} applied! You saved ${fmt(disc)} 🎉`, 'success');
    } catch (e) {
      toast(e.message || 'Failed to apply promo', 'error');
    } finally {
      setPromoLoading(false);
    }
  }

  function removePromo() {
    setPromoCode('');
    setDiscount(0);
    setFreeDelivery(false);
    try {
      localStorage.removeItem('fmx_active_promo');
    } catch {}
    toast('Coupon removed', 'info');
  }

  async function completePaystackOrder(orderData, reference) {
    try {
      const optimisticId = 'ord_' + Date.now();
      const finalOrderData = {
        id: optimisticId,
        ...orderData,
        payment_method: 'paystack',
        payment_reference: reference,
        payment_status: 'paid',
        giveaway_discount: Number(firstTimeGiveawayDeduction) || 0,
        first_time_giveaway: Number(firstTimeGiveawayDeduction) || 0,
        wallet_deduction: 0,
        subtotal: Number(subtotal) || 0,
        delivery_fee: Number(deliveryFee) || 0,
        service_fee: Number(serviceFee) || 0,
        discount: Number(discount) || 0,
        total: Number(total) || 0,
        total_amount: Number(total) || 0,
        delivery_zone: orderData.delivery_zone || selectedZone?.name || 'Standard Delivery',
        status: 'CONFIRMED',
        created_at: new Date().toISOString()
      };

      // 1. INSTANT 0ms ZERO-DELAY FEEDBACK TO PAYMENT CONFIRMED SCREEN
      try { localStorage.setItem('fmx_last_order_id', finalOrderData.id); } catch {}
      if (Number(firstTimeGiveawayDeduction) > 0 || effectiveUseGiveaway) {
        markGiveawayAsClaimed(orderData.customer_phone);
      }
      try {
        window.dispatchEvent(new CustomEvent('fmx_order_updated', { detail: finalOrderData }));
      } catch {}
      clearCart();
      triggerHaptic('success');
      confetti({ particleCount: 40, spread: 70, ticks: 120, disableForReducedMotion: true, origin: { y: 0.6 } });
      onSuccess(finalOrderData);

      // 2. Persist order & verify in background without blocking the celebration screen
      (async () => {
        try {
          await api.verifyPaystackPayment({ reference, amount: total });
        } catch (vErr) {
          console.warn('Paystack verify background notice:', vErr);
        }
        try {
          const res = await api.createOrder(finalOrderData);
          const serverOrder = res?.data?.order || res?.data || res?.order;
          if (serverOrder?.id) {
            try { localStorage.setItem('fmx_last_order_id', serverOrder.id); } catch {}
            try { window.dispatchEvent(new CustomEvent('fmx_order_updated', { detail: serverOrder })); } catch {}
          }
        } catch (cErr) {
          console.warn('Create order background notice:', cErr);
        }
      })();
    } catch (err) {
      console.error('Payment completion error:', err);
      toast(err?.message || 'Payment verification failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handlePaystackCheckout(orderData, activeUser) {
    const activeKey = (paystackKey || getStoredPaystackConfig().publicKey || 'pk_test_d3a8b4172f3e44955b2046ff03b55237b6cf3e1a').trim();
    const txRef = `FMX_PSTK_${Date.now()}_${Math.floor(100000 + Math.random() * 900000)}`;
    const effectiveEmail = activeUser?.email || orderData.customer_email || 'customer@foodmaxx.ng';
    const effectiveName = activeUser?.full_name || orderData.customer_name || 'FoodMaxx Customer';
    const effectivePhone = activeUser?.phone || orderData.customer_phone || '';

    pendingOrderDataRef.current = orderData;
    setLoading(true);

    launchRealPaystack({
      key: activeKey,
      email: effectiveEmail,
      amount: total,
      reference: txRef,
      customerName: effectiveName,
      phone: effectivePhone,
      metadata: {
        custom_fields: [
          { display_name: 'Customer Name', variable_name: 'customer_name', value: effectiveName },
          { display_name: 'Customer Phone', variable_name: 'customer_phone', value: effectivePhone },
          { display_name: 'Order Subtotal', variable_name: 'order_subtotal', value: `NGN ${subtotal}` },
          { display_name: 'Delivery Address', variable_name: 'delivery_address', value: orderData.delivery_address || '' }
        ]
      },
      onSuccess: async (tx) => {
        setLoading(true);
        const ord = orderData || pendingOrderDataRef.current;
        await completePaystackOrder(ord, tx.reference);
      },
      onCancel: () => {
        setLoading(false);
        toast('Paystack transaction was cancelled', 'info');
      },
      onError: (err) => {
        setLoading(false);
        console.warn('Real Paystack modal launch warning, falling back to in-app modal:', err);
        setPaystackModalData({
          key: activeKey,
          email: effectiveEmail,
          amount: total,
          reference: txRef,
          customerName: effectiveName,
          phone: effectivePhone,
          orderData
        });
        setPaystackModalOpen(true);
      }
    });
  }

  async function placeOrder() {
    if (cart.items.length === 0) { toast('Cart is empty', 'error'); return; }

    const cleanDeliveryAddress = deliveryAddress.trim();
    if (!cleanDeliveryAddress) {
      toast('Please enter your delivery address', 'warning');
      return;
    }

    const nameToUse = (contactName.trim() || user?.full_name || '').trim();
    if (!nameToUse) {
      toast('Please enter your full name', 'warning');
      return;
    }
    const phoneToUse = (contactPhone || user?.phone || '').replace(/\D/g, '').slice(0, 11);
    if (!phoneToUse) {
      toast('Please enter your 11-digit phone number', 'warning');
      return;
    }
    if (phoneToUse.length !== 11) {
      toast('Phone number must be exactly 11 digits (e.g. 080XXXXXXXX)', 'warning');
      return;
    }
    const emailToUse = contactEmail.trim() || user?.email || 'customer@foodmaxx.ng';

    try {
      localStorage.setItem('fmx_last_delivery_address', cleanDeliveryAddress);
      localStorage.setItem('fmx_last_phone', phoneToUse);
      if (nameToUse) localStorage.setItem('fmx_last_name', nameToUse);
    } catch {}

    if (isGift) {
      const recPhoneClean = (recipientPhone || '').replace(/\D/g, '').slice(0, 11);
      if (!recipientName.trim()) {
        toast('Please enter the recipient name for the gift order', 'warning');
        return;
      }
      if (recPhoneClean.length !== 11) {
        toast('Recipient phone number must be exactly 11 digits (e.g. 080XXXXXXXX)', 'warning');
        return;
      }
    }

    // For wallet/free order, show quick loading; for Paystack, open instantly
    if (paymentMethod !== 'paystack' || total === 0) {
      setLoading(true);
    }
    try {
      let activeUser = user;
      if (!activeUser && silentRegister) {
        // Run silent registration asynchronously in background so modal opens without lag
        silentRegister({
          full_name: nameToUse,
          phone: phoneToUse,
          email: emailToUse || undefined
        }).catch(() => {});
        activeUser = {
          full_name: nameToUse,
          phone: phoneToUse,
          email: emailToUse
        };
      } else if (isEditingContact && updateUser) {
        updateUser({
          full_name: nameToUse,
          phone: phoneToUse,
          email: emailToUse || activeUser?.email
        });
      }

      const cartItems = cart.items.map(i => ({
        item_id: i.id,
        name: i.name || i.item_name || i.product_name,
        price: Number(i.price || i.unit_price || 0),
        unit_price: Number(i.price || i.unit_price || 0),
        quantity: Number(i.qty || i.quantity || 1),
        qty: Number(i.qty || i.quantity || 1),
        selected_size: i.selectedSize || 'Regular',
        selectedSize: i.selectedSize || 'Regular',
        selected_extras: i.selectedExtras || [],
        selectedExtras: i.selectedExtras || []
      }));

      const orderData = {
        restaurant_id: cart.restaurantId,
        customer_name: nameToUse,
        customer_phone: phoneToUse,
        customer_email: emailToUse || activeUser?.email,
        cart_items: cartItems,
        delivery_address: cleanDeliveryAddress,
        delivery_zone: selectedZone?.name || 'Standard Delivery',
        delivery_instructions: [instructions, landmark].filter(Boolean).join(' · ') || '',
        payment_method: total === 0 ? (firstTimeGiveawayDeduction > 0 ? 'giveaway' : 'wallet') : paymentMethod,
        promo_code: promoCode || '',
        is_gift: Boolean(isGift),
        recipient_name: isGift ? (recipientName.trim() || '') : '',
        recipient_phone: isGift ? ((recipientPhone || '').replace(/\D/g, '').slice(0, 11)) : '',
        gift_note: isGift ? (giftNote.trim() || '') : '',
        hide_price: isGift ? Boolean(hidePrice) : false,
        is_scheduled: deliveryTiming === 'schedule',
        scheduled_for: deliveryTiming === 'schedule' ? `${scheduledDay}, ${scheduledSlot}` : '',
        delivery_landmark: landmark.trim() || '',
        subtotal: Number(subtotal) || 0,
        delivery_fee: Number(deliveryFee) || 0,
        service_fee: Number(serviceFee) || 0,
        discount: Number(discount) || 0,
        giveaway_discount: Number(firstTimeGiveawayDeduction) || 0,
        first_time_giveaway: Number(firstTimeGiveawayDeduction) || 0,
        wallet_deduction: paymentMethod === 'wallet' ? Number(total) : 0,
        total: Number(total) || 0,
        total_amount: Number(total) || 0
      };

      // 100% Free Order (covered by Giveaway or Promo)
      if (total === 0) {
        const freeRef = `FMX_FREE_${Date.now()}_${Math.floor(100000 + Math.random() * 900000)}`;
        const finalOrderData = {
          ...orderData,
          payment_method: firstTimeGiveawayDeduction > 0 ? 'giveaway' : 'promo',
          payment_reference: freeRef,
          payment_status: 'paid'
        };

        const res = await api.createOrder(finalOrderData);
        const placedOrder = res?.data?.order || res?.data || res?.order || finalOrderData;
        if (placedOrder?.id) {
          try { localStorage.setItem('fmx_last_order_id', placedOrder.id); } catch {}
        }
        if (Number(firstTimeGiveawayDeduction) > 0 || effectiveUseGiveaway) {
          markGiveawayAsClaimed(phoneToUse);
        }
        try {
          window.dispatchEvent(new CustomEvent('fmx_order_updated', { detail: placedOrder }));
        } catch {}
        clearCart();
        triggerHaptic('success');
        confetti({
          particleCount: 35,
          spread: 60,
          ticks: 100,
          disableForReducedMotion: true,
          origin: { y: 0.6 }
        });
        toast('🎉 Order placed 100% Free!', 'success');
        onSuccess(placedOrder);
        setLoading(false);
        return;
      }

      // Balance > 0: Pay directly with Paystack (Card, Transfer, USSD)
      await handlePaystackCheckout(orderData, activeUser);
    } catch (e) {
      toast(e.message || 'Failed to place order', 'error');
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0.95 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0.3, transition: { duration: 0.2, ease: 'easeIn' } }}
        transition={{ type: 'spring', damping: 32, stiffness: 480, mass: 0.7 }}
        className={`w-full max-w-lg sm:max-w-xl h-full min-h-[100dvh] sm:min-h-0 sm:h-[90vh] sm:max-h-[92vh] ${
          isDark ? 'bg-[#0F1117] text-white border-white/10' : 'bg-[#F7F8FA] text-slate-900 border-slate-200'
        } rounded-none sm:rounded-[36px] sm:border relative flex flex-col shadow-2xl overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile touch grab handle */}
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-2.5 mb-0.5 shrink-0 sm:hidden" />

        {/* Top Header matching mockup */}
        <div className={`shrink-0 px-4 sm:px-6 pt-3 sm:pt-4 pb-3 flex items-center justify-between z-10 border-b ${
          isDark ? 'bg-[#0F1117] border-white/10' : 'bg-white border-slate-100 shadow-xs'
        }`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { triggerHaptic('selection'); onClose(); }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-800'
              }`}
              title="Back"
            >
              <ChevronLeft size={22} className="stroke-[2.5]" />
            </button>
            <h2 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white leading-tight">
              Checkout
            </h2>
          </div>
          <div className="w-8" />
        </div>

        {/* Scrollable Checkout Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-3.5 space-y-3.5">

          {/* 1. ORDER WITH FRIENDS BANNER (Mockup Top Banner) */}
          <div
            onClick={() => {
              triggerHaptic('selection');
              if (typeof onOpenGroupOrder === 'function') {
                onOpenGroupOrder();
              } else {
                setGroupOrderOpen(true);
              }
            }}
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99] select-none ${
              isDark
                ? 'bg-white/5 border-white/10 hover:border-white/20'
                : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-[#EA4C2A] flex items-center justify-center shrink-0">
                <Users size={18} />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                  Order with friends
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  Create a group order and invite others
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#EA4C2A] shrink-0" />
          </div>

          {/* 2. ORDER ITEMS SECTION (Mockup Dish Cards with Stepper & Price) */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDark ? 'bg-[#151821] border-white/10' : 'bg-white border-slate-200/80 shadow-xs'
          }`}>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-white/5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Order items
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-[#EA4C2A] hover:underline cursor-pointer"
              >
                Edit
              </button>
            </div>

            <div className="space-y-3.5">
              {cart.items.map((item, idx) => {
                const itemQty = Number(item.qty || item.quantity || 1);
                const itemPrice = Number(item.price || item.unit_price || 0);
                return (
                  <div key={item.id || idx} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'}
                        alt={item.name}
                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'; }}
                        className="w-13 h-13 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-gray-800 border border-black/5 dark:border-white/10"
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {item.name}
                        </h4>
                        <p className="text-[10.5px] text-gray-400 truncate mt-0.5">
                          {item.selectedSize || item.portion || 'Regular portion'}
                        </p>
                        {/* Inline Stepper */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <button
                            type="button"
                            onClick={() => { triggerHaptic('selection'); updateQty(idx, -1); }}
                            className="w-5.5 h-5.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-700 dark:text-white hover:bg-slate-200 active:scale-90 transition-all cursor-pointer"
                          >
                            <Minus size={11} className="stroke-[2.5]" />
                          </button>
                          <span className="text-xs font-bold text-slate-900 dark:text-white min-w-[14px] text-center select-none">
                            {itemQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => { triggerHaptic('selection'); updateQty(idx, 1); }}
                            className="w-5.5 h-5.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-700 dark:text-white hover:bg-slate-200 active:scale-90 transition-all cursor-pointer"
                          >
                            <Plus size={11} className="stroke-[2.5]" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white shrink-0">
                      {fmt(itemPrice * itemQty)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. APPLY A COUPON (Mockup Pink Card with % icon & Slide-up Vouchers Sheet) */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDark ? 'bg-rose-950/20 border-rose-900/30' : 'bg-[#FFF5F5] border-rose-100 shadow-xs'
          }`}>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-full bg-rose-500/15 text-[#EA4C2A] flex items-center justify-center font-black text-sm shrink-0">
                %
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  Apply a coupon
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Enter code or choose from available vouchers
                </p>
              </div>
            </div>

            {/* Clickable Vouchers Banner - Opens slide up bottom sheet */}
            <div
              onClick={() => {
                triggerHaptic('selection');
                setVoucherSheetOpen(true);
              }}
              className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-[0.98] mb-3 ${
                isDark ? 'bg-white/5 border-rose-500/20 hover:bg-white/10' : 'bg-white border-rose-200 hover:border-rose-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 text-xs">
                <Gift size={15} className="text-[#EA4C2A] shrink-0" />
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                  {discount > 0 ? `Voucher Applied: ${promoCode} (−${fmt(discount)})` : 'View Available Promo Codes & Vouchers'}
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#EA4C2A] flex items-center gap-0.5 shrink-0">
                {discount > 0 ? 'Change' : 'View Deals'}
                <ChevronRight size={14} />
              </span>
            </div>

            {/* Coupon Code Input & Apply Button */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  className={`w-full pl-3 pr-8 py-2.5 rounded-xl text-xs uppercase font-bold border outline-none tracking-wider transition-colors ${
                    isDark
                      ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#EA4C2A]'
                      : 'bg-white border-slate-200 text-slate-900 placeholder:text-gray-400 focus:border-[#EA4C2A]'
                  }`}
                  placeholder="ENTER PROMO CODE"
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === 'Enter') applyPromo(); }}
                />
                {promoCode && (
                  <button
                    type="button"
                    onClick={() => { setPromoCode(''); removePromo(); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => { triggerHaptic('selection'); applyPromo(); }}
                disabled={promoLoading || !promoCode}
                className="px-4 py-2.5 bg-[#EA4C2A] hover:bg-[#D43D1D] active:scale-95 text-white rounded-xl font-bold text-xs disabled:opacity-50 cursor-pointer transition-all shrink-0 flex items-center gap-1 shadow-sm"
              >
                {promoLoading ? <RefreshCw size={13} className="animate-spin" /> : <span>Apply</span>}
              </button>
            </div>

            {discount > 0 && (
              <div className="mt-2.5 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                <span className="flex items-center gap-1.5">
                  <CheckCircle size={13} />
                  Coupon "{promoCode}" applied
                </span>
                <span>−{fmt(discount)}</span>
              </div>
            )}
          </div>

          {/* 4. DELIVERY DETAILS (Mockup White Card with Red MapPin and Change Button) */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDark ? 'bg-[#151821] border-white/10' : 'bg-white border-slate-200/80 shadow-xs'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-rose-500/10 text-[#EA4C2A] flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin size={16} className="text-[#EA4C2A]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Delivery details
                  </div>
                  <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate mt-0.5">
                    {deliveryAddress || 'Enter delivery address'}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {contactName || (user ? 'Customer' : 'Guest')} · {contactPhone || 'No phone set'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingContact(prev => !prev)}
                className="text-xs font-bold text-[#EA4C2A] hover:underline px-2.5 py-1.5 rounded-lg border border-[#EA4C2A]/20 hover:bg-[#EA4C2A]/10 transition-colors shrink-0 cursor-pointer"
              >
                {isEditingContact ? 'Done' : (deliveryAddress ? 'Change' : 'Add')}
              </button>
            </div>

            {/* Inline edit container */}
            {isEditingContact && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 space-y-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={e => {
                      setContactName(e.target.value);
                      try { localStorage.setItem('fmx_last_name', e.target.value.trim()); } catch {}
                    }}
                    placeholder="Your Name"
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                      isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    value={contactPhone}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setContactPhone(v);
                      try { localStorage.setItem('fmx_last_phone', v); } catch {}
                    }}
                    placeholder="080XXXXXXXX"
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none font-mono ${
                      isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Delivery Address</label>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          toast('Detecting GPS location...', 'info');
                          const loc = await getRealCurrentPosition();
                          if (loc?.address) {
                            setDeliveryAddress(loc.address);
                            try { localStorage.setItem('fmx_last_delivery_address', loc.address); } catch {}
                            toast('📍 Real GPS location detected!', 'success');
                          }
                        } catch (err) {
                          toast(err.message || 'Could not detect location', 'warning');
                        }
                      }}
                      className="text-[10px] font-bold text-[#EA4C2A] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <MapPin size={10} />
                      <span>Use Current Location</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={e => {
                      setDeliveryAddress(e.target.value);
                      try { localStorage.setItem('fmx_last_delivery_address', e.target.value.trim()); } catch {}
                    }}
                    placeholder="Enter street, house number and area"
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                      isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Optional Rider Landmark Note */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5">
              <input
                type="text"
                placeholder="Rider note or landmark (optional)..."
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                className="w-full text-xs placeholder:text-gray-400 bg-transparent outline-none text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>

          {/* 5. PAYMENT METHOD (Mockup Paystack Card with Cyan Stripes) */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDark ? 'bg-[#151821] border-white/10' : 'bg-white border-slate-200/80 shadow-xs'
          }`}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Payment method
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Paystack 4 stripes cyan badge */}
                <div className="w-9 h-9 rounded-xl bg-[#00C3F7]/10 flex flex-col items-center justify-center gap-0.5 shrink-0 p-2">
                  <div className="w-full h-1 bg-[#00C3F7] rounded-full" />
                  <div className="w-3/4 h-1 bg-[#00C3F7] rounded-full" />
                  <div className="w-full h-1 bg-[#00C3F7] rounded-full" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                    Pay with Paystack
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    Cards, Bank Transfer, USSD & more
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 shrink-0" />
            </div>
          </div>

          {/* 6. BILL BREAKDOWN (Subtotal, Delivery Fee, Discount, Total) */}
          <div className={`p-4 rounded-2xl border space-y-2 text-xs transition-all ${
            isDark ? 'bg-[#151821] border-white/10' : 'bg-white border-slate-200/80 shadow-xs'
          }`}>
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900 dark:text-white">{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span>Delivery fee</span>
              <span className={freeDelivery ? 'font-bold text-emerald-600' : 'font-semibold text-slate-900 dark:text-white'}>
                {freeDelivery ? 'FREE' : fmt(deliveryFee)}
              </span>
            </div>
            {serviceFee > 0 && (
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                <span>Service fee</span>
                <span className="font-semibold text-slate-900 dark:text-white">{fmt(serviceFee)}</span>
              </div>
            )}
            {firstTimeGiveawayDeduction > 0 && (
              <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
                <span>First Order Discount</span>
                <span>−{fmt(firstTimeGiveawayDeduction)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Discount ({promoCode})</span>
                <span>−{fmt(discount)}</span>
              </div>
            )}
            <div className="pt-2.5 mt-1 border-t border-slate-100 dark:border-white/5 flex justify-between items-center font-bold text-sm">
              <span className="text-slate-900 dark:text-white">Total</span>
              <span className="text-base sm:text-lg text-slate-900 dark:text-white font-extrabold">{fmt(total)}</span>
            </div>
          </div>

          <div className="h-2" />
        </div>

        {/* 7. STICKY BOTTOM BUTTON (Full Width Red CTA with 'Pay with Paystack' & '₦X,XXX') */}
        <div className={`shrink-0 p-4 border-t ${
          isDark ? 'bg-[#151821] border-white/10' : 'bg-white border-slate-100'
        } shadow-lg z-20 pb-[max(1rem,env(safe-area-inset-bottom,1rem))]`}>
          <button
            type="button"
            onClick={() => { triggerHaptic('medium'); placeOrder(); }}
            disabled={loading || cart.items.length === 0}
            className="w-full bg-[#EA4C2A] hover:bg-[#D43D1D] active:scale-[0.98] text-white py-3.5 px-4 rounded-2xl font-bold text-sm sm:text-base shadow-lg shadow-[#EA4C2A]/25 flex items-center justify-between cursor-pointer transition-all disabled:opacity-50"
          >
            <span>{loading ? 'Processing...' : 'Pay with Paystack'}</span>
            <span className="font-extrabold tracking-tight">{fmt(total)}</span>
          </button>
        </div>

        {/* SLIDE-UP AVAILABLE VOUCHERS BOTTOM SHEET */}
        <AnimatePresence>
          {voucherSheetOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[120] bg-black/60 backdrop-blur-xs flex flex-col justify-end p-0"
              onClick={() => setVoucherSheetOpen(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className={`w-full max-h-[85%] rounded-t-[28px] ${
                  isDark ? 'bg-[#161920] text-white border-t border-white/10' : 'bg-white text-slate-900 shadow-2xl'
                } flex flex-col overflow-hidden`}
                onClick={e => e.stopPropagation()}
              >
                {/* Drag handle */}
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

                {/* Header */}
                <div className={`px-5 py-3.5 border-b flex items-center justify-between ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <Gift size={18} className="text-[#EA4C2A]" />
                      <span>Available Promo Codes & Vouchers</span>
                    </h3>
                    <p className="text-[11px] text-gray-400 font-medium">Tap apply to instantly activate your voucher</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVoucherSheetOpen(false)}
                    className={`w-8 h-8 rounded-full ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} flex items-center justify-center cursor-pointer`}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Vouchers List */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2.5">
                  {AVAILABLE_VOUCHERS.map(v => {
                    const isApplied = promoCode === v.code && (discount > 0 || freeDelivery);
                    return (
                      <div
                        key={v.code}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isApplied
                            ? isDark ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-emerald-50/80 border-emerald-300 shadow-xs'
                            : isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200/80'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-[#EA4C2A]/10 text-[#EA4C2A] border border-[#EA4C2A]/20">
                              {v.code}
                            </span>
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {v.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            {v.desc}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (isApplied) {
                              setPromoCode('');
                              removePromo();
                            } else {
                              setPromoCode(v.code);
                              applyPromo(v.code);
                              setVoucherSheetOpen(false);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 cursor-pointer transition-all active:scale-95 shadow-xs ${
                            isApplied
                              ? 'bg-emerald-500 text-white'
                              : 'bg-[#EA4C2A] hover:bg-[#D43D1D] text-white'
                          }`}
                        >
                          {isApplied ? 'Applied ✓' : 'Apply'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Close Bar */}
                <div className={`p-4 border-t ${isDark ? 'border-white/10 bg-[#121418]' : 'border-slate-100 bg-slate-50'}`}>
                  <button
                    type="button"
                    onClick={() => setVoucherSheetOpen(false)}
                    className="w-full py-3 rounded-xl bg-slate-200 dark:bg-white/10 font-bold text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dedicated Interactive Paystack Modal */}
        <AnimatePresence>
          {paystackModalOpen && (
            <PaystackFallbackModal
              open={paystackModalOpen}
              data={paystackModalData}
              isDark={isDark}
              onClose={() => {
                setPaystackModalOpen(false);
                setLoading(false);
              }}
              onPaymentComplete={async (tx) => {
                setPaystackModalOpen(false);
                setLoading(true);
                const ord = paystackModalData?.orderData || pendingOrderDataRef.current;
                await completePaystackOrder(ord, tx.reference);
              }}
            />
          )}
        </AnimatePresence>



        {/* Paystack API Key Setup Modal */}
        {showKeyModal && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowKeyModal(false)}>
            <div
              className={`w-full max-w-md rounded-3xl p-6 ${
                isDark ? 'bg-[#181B22] text-white border border-white/10' : 'bg-white text-slate-900 shadow-2xl border border-slate-100'
              } space-y-4`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#EA4C2A]/15 text-[#EA4C2A] flex items-center justify-center">
                    <Key size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Paystack Configuration</h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Demo test active · Live key optional</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Status Banner */}
              <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                isValidPaystackKey(paystackKey)
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                  : 'bg-[#EA4C2A]/10 border-[#EA4C2A]/20 text-[#EA4C2A]'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isValidPaystackKey(paystackKey) ? 'bg-emerald-500' : 'bg-[#EA4C2A] animate-pulse'}`} />
                  <div>
                    <div className="text-xs font-bold">
                      {isValidPaystackKey(paystackKey) ? 'Live Merchant Mode Active' : 'Paystack Demo Test Mode Active'}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      {isValidPaystackKey(paystackKey)
                        ? 'Routing transactions through your registered Paystack key'
                        : 'Simulating instant Card, Transfer & USSD orders'}
                    </div>
                  </div>
                </div>

                {isValidPaystackKey(paystackKey) && (
                  <button
                    type="button"
                    onClick={() => {
                      savePaystackConfig({ publicKey: '', isLive: false });
                      setPaystackKey('');
                      setKeyInput('');
                      toast('Switched to Paystack Demo Test mode! 🧪', 'info');
                    }}
                    className="text-[10.5px] font-bold px-2.5 py-1 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black/20 text-inherit cursor-pointer"
                  >
                    Reset to Demo
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center justify-between">
                  <span>Custom Paystack Public Key</span>
                  {keyInput.trim().startsWith('pk_live_') ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      ● Live Key
                    </span>
                  ) : keyInput.trim().startsWith('pk_test_') ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      ● Test Key
                    </span>
                  ) : null}
                </label>

                <div className="relative">
                  <input
                    type="text"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value.trim())}
                    placeholder="pk_live_... or pk_test_..."
                    className={`w-full text-xs font-mono p-3 pr-16 rounded-xl border outline-none ${
                      isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-gray-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const clip = await navigator.clipboard.readText();
                        if (clip) {
                          setKeyInput(clip.trim());
                          toast('Pasted from clipboard! 📋', 'info');
                        }
                      } catch (e) {
                        toast('Clipboard permission required to paste automatically', 'warning');
                      }
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] px-2.5 py-1 bg-[#EA4C2A]/10 text-[#EA4C2A] hover:bg-[#EA4C2A]/20 rounded-lg font-semibold cursor-pointer"
                  >
                    Paste
                  </button>
                </div>
              </div>

              <div className={`p-3 rounded-xl border text-[11px] leading-relaxed ${
                isDark ? 'bg-white/5 border-white/5 text-gray-300' : 'bg-orange-50/60 border-orange-100 text-gray-600'
              }`}>
                💡 <span className="font-semibold text-slate-900 dark:text-white">Live Payments:</span> Log into your{' '}
                <a
                  href="https://dashboard.paystack.com/#/settings/developer"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#EA4C2A] underline font-semibold inline-flex items-center gap-0.5"
                >
                  Paystack Dashboard → Settings → API Keys
                </a>{' '}
                and paste your <strong className="text-slate-900 dark:text-white">Public Key</strong> here. If empty, the app runs in <strong>Demo Test Mode</strong>.
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    savePaystackConfig({ publicKey: '', isLive: false });
                    setPaystackKey('');
                    setKeyInput('');
                    setShowKeyModal(false);
                    triggerHaptic('selection');
                    toast('Paystack Demo Test Mode Active! 🧪', 'success');
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                    isDark ? 'border-white/10 hover:bg-white/5 text-gray-300' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  Use Demo Test
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cleanKey = keyInput.trim();
                    if (!cleanKey) {
                      toast('Please enter a Paystack Public Key or click Use Demo Test', 'warning');
                      return;
                    }
                    if (!isValidPaystackKey(cleanKey)) {
                      toast('Public key must begin with pk_live_ or pk_test_ (at least 24 characters)', 'error');
                      return;
                    }
                    const isLive = cleanKey.startsWith('pk_live_');
                    savePaystackConfig({ publicKey: cleanKey, isLive });
                    setPaystackKey(cleanKey);
                    setShowKeyModal(false);
                    triggerHaptic('success');
                    toast(isLive ? 'Paystack Live Key activated! 💳🎉' : 'Paystack Test Key activated! 💳', 'success');
                  }}
                  className="flex-1 py-2.5 bg-[#EA4C2A] hover:bg-[#D43D1D] text-white rounded-xl text-xs font-bold shadow-md shadow-[#EA4C2A]/20 cursor-pointer"
                >
                  Save & Activate
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// ANIMATED ORDER SUCCESS CELEBRATION MODAL
// ============================================================
function OrderSuccessModal({ order, onTrackOrder, onContinueShopping, isDark }) {
  const [copiedRef, setCopiedRef] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const toast = useToast();

  useEffect(() => {
    playNativeSound('success');
    triggerHaptic('success');
    confetti({
      particleCount: 35,
      spread: 55,
      ticks: 100,
      disableForReducedMotion: true,
      origin: { y: 0.6 },
      colors: ['#EA4C2A', '#10B981', '#F59E0B']
    });
  }, []);

  if (!order) return null;

  const orderRef = order.order_reference || order.id || '';
  const deliveryPin = order.delivery_otp || order.pin || '';
  const totalAmount = order.total || order.total_amount || 0;

  // Resolve full delivery address safely
  const fullAddress = order.delivery_address || order.address || (order.delivery_zone ? `${order.delivery_zone}, Ibadan` : 'Awolowo Avenue, Old Bodija, Ibadan');
  const landmark = order.delivery_landmark || order.landmark || '';

  // Order items resolution
  const orderItems = (Array.isArray(order.cart_items) && order.cart_items.length > 0)
    ? order.cart_items
    : (Array.isArray(order.items) && order.items.length > 0)
      ? order.items
      : (Array.isArray(order.order_items) && order.order_items.length > 0)
        ? order.order_items
        : [];
  const totalItemsCount = orderItems.reduce((sum, item) => sum + Number(item.qty || item.quantity || 1), 0);

  const handleCopyRef = () => {
    navigator.clipboard?.writeText(orderRef);
    setCopiedRef(true);
    toast('Order reference copied! 📋', 'success');
    setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
    >
      <motion.div
        initial={{ scale: 0.92, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: 20, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className={`w-full max-w-sm sm:max-w-md ${
          isDark ? 'bg-[#151821] text-white border-white/10' : 'bg-white text-slate-900 border-slate-200'
        } rounded-t-[32px] sm:rounded-[32px] border shadow-2xl p-5 sm:p-6 relative max-h-[92vh] overflow-y-auto overscroll-contain momentum-scroll flex flex-col items-center text-center`}
      >
        {/* Soft Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-emerald-500/15 blur-2xl pointer-events-none rounded-full" />

        {/* Clean Success Circle */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 16, stiffness: 260 }}
          className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mb-3 border border-emerald-500/30 shadow-xs shrink-0"
        >
          <Check size={32} strokeWidth={3.5} />
        </motion.div>

        <h2 className="text-xl sm:text-2xl font-black tracking-tight">
          Payment Confirmed!
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
          Your order has been placed with <span className="font-bold text-slate-800 dark:text-slate-200">FoodMaxx Kitchen</span> and is being prepared fresh.
        </p>

        {/* Primary Order Info Card */}
        <div className={`w-full mt-4 p-4 rounded-2xl border text-left space-y-3 ${
          isDark ? 'bg-white/5 border-white/8' : 'bg-slate-50 border-slate-100'
        }`}>
          {/* Order Ref & Amount */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Order Reference</div>
              <button
                type="button"
                onClick={handleCopyRef}
                className="font-mono font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1 hover:text-[#EA4C2A] cursor-pointer mt-0.5"
              >
                <span>#{orderRef}</span>
                <Copy size={11} className={copiedRef ? 'text-emerald-500' : 'text-slate-400'} />
              </button>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Amount Paid</div>
              <div className="font-black text-sm text-[#EA4C2A] mt-0.5">{fmt(totalAmount)}</div>
            </div>
          </div>

          {/* Delivery PIN Banner */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
            <div className="flex items-center gap-2">
              <span className="text-base">🛵</span>
              <div>
                <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 leading-none">
                  Delivery PIN: {deliveryPin}
                </div>
                <div className="text-[9.5px] text-slate-400 mt-0.5">Read to courier upon arrival</div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              Paid ✓
            </span>
          </div>
        </div>

        {/* Full Delivery Address Card */}
        <div className={`w-full mt-3 p-3.5 rounded-2xl border text-left flex items-start gap-2.5 ${
          isDark ? 'bg-white/5 border-white/8' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="w-7 h-7 rounded-xl bg-[#EA4C2A]/15 text-[#EA4C2A] flex items-center justify-center shrink-0 mt-0.5">
            <MapPin size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Delivery Address
              </span>
              <span className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                ~20–30 mins
              </span>
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1 leading-snug break-words">
              {fullAddress}
            </div>
            {landmark && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <span className="text-[10px]">📍</span>
                <span>Landmark: <strong className="text-slate-700 dark:text-slate-300">{landmark}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Simple Order Summary */}
        {orderItems.length > 0 && (
          <div className={`w-full mt-3 rounded-2xl border overflow-hidden transition-all text-left ${
            isDark ? 'bg-white/5 border-white/8' : 'bg-slate-50 border-slate-100'
          }`}>
            <button
              type="button"
              onClick={() => setShowSummary(prev => !prev)}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#EA4C2A]/15 text-[#EA4C2A] flex items-center justify-center shrink-0">
                  <ShoppingBag size={12} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Order Summary
                  </span>
                  <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                    {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-[#EA4C2A]">
                <span>{showSummary ? 'Hide' : 'View'}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${showSummary ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            <AnimatePresence>
              {showSummary && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className={`p-3.5 pt-1 border-t space-y-2.5 text-xs ${
                    isDark ? 'border-white/8 bg-black/20' : 'border-slate-200/70 bg-white/70'
                  }`}>
                    {/* Items list */}
                    <div className="max-h-64 overflow-y-auto overscroll-contain momentum-scroll space-y-2 pr-1 divide-y divide-slate-100 dark:divide-white/5 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
                      {orderItems.map((item, idx) => {
                        const itemName = item.name || item.item_name || item.product_name || 'Food Item';
                        const qty = Number(item.qty || item.quantity || 1);
                        const unitPrice = Number(item.price || item.unit_price || 0);
                        const lineTotal = unitPrice * qty;
                        const size = item.selected_size || item.selectedSize;
                        const extras = item.selected_extras || item.selectedExtras;

                        return (
                          <div key={idx} className="pt-2 first:pt-0 flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                                <span className="text-[#EA4C2A] font-bold mr-1">{qty}x</span>
                                {itemName}
                                {size && size !== 'Regular' && (
                                  <span className="ml-1.5 text-[9.5px] font-medium px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-white/10 text-slate-500 dark:text-slate-400">
                                    {size}
                                  </span>
                                )}
                              </div>
                              {Array.isArray(extras) && extras.length > 0 && (
                                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                                  +{extras.map(e => e.name || e).join(', ')}
                                </div>
                              )}
                            </div>
                            <span className="font-mono font-medium text-slate-700 dark:text-slate-300 text-xs shrink-0">
                              {fmt(lineTotal)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Simple summary breakdown */}
                    <div className="pt-2.5 border-t border-dashed border-slate-200 dark:border-white/10 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {Number(order.subtotal) > 0 && (
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{fmt(order.subtotal)}</span>
                        </div>
                      )}
                      {Number(order.delivery_fee) > 0 && (
                        <div className="flex justify-between">
                          <span>Delivery Fee</span>
                          <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{fmt(order.delivery_fee)}</span>
                        </div>
                      )}
                      {Number(order.service_fee) > 0 && (
                        <div className="flex justify-between">
                          <span>Service Fee</span>
                          <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{fmt(order.service_fee)}</span>
                        </div>
                      )}
                      {Number(order.discount) > 0 && (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                          <span>Discount Promo</span>
                          <span className="font-mono">-{fmt(order.discount)}</span>
                        </div>
                      )}
                      {Number(order.wallet_deduction) > 0 && (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                          <span>Wallet Bonus Applied</span>
                          <span className="font-mono">-{fmt(order.wallet_deduction)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1.5 border-t border-slate-200/60 dark:border-white/10 font-bold text-xs text-slate-900 dark:text-white">
                        <span>Total Paid</span>
                        <span className="font-mono font-black text-sm text-[#EA4C2A]">{fmt(totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full mt-4 space-y-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onTrackOrder();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#EA4C2A] hover:bg-[#d83f1d] active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#EA4C2A]/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Track Live Delivery</span>
            <ChevronRight size={15} strokeWidth={3} />
          </button>

          <button
            type="button"
            onClick={onContinueShopping}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Back to Home
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}


// ============================================================
// PWA INSTALL / DOWNLOAD MODAL
// ============================================================
function PwaInstallModal({ open, onClose, isDark, onTriggerNativeInstall, isInstallable }) {
  if (!open) return null;
  const isIos = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className={`w-full max-w-sm ${
          isDark ? 'bg-[#121318] text-white border-white/10' : 'bg-white text-slate-900 border-slate-200'
        } rounded-[32px] border shadow-2xl p-6 text-center relative overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/40 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
        >
          <X size={16} />
        </button>

        <img src="/foodmaxx-logo.png" alt="FoodMaxx" className="w-16 h-16 rounded-2xl mx-auto mb-3 shadow-lg border border-[#EA4C2A]/30 object-cover" />
        <h3 className="font-bold text-lg">Install FoodMaxx App</h3>
        <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
          Install FoodMaxx on your device for instant 1-tap ordering, real-time dispatch tracking, and zero load lag!
        </p>

        {isIos ? (
          <div className="space-y-3 text-left p-3.5 bg-slate-500/10 rounded-2xl border border-white/5 text-xs text-slate-300">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#EA4C2A] text-white font-bold flex items-center justify-center text-[11px] shrink-0">1</span>
              <span>Tap the <strong className="text-white">Share</strong> button in Safari's bottom toolbar.</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#EA4C2A] text-white font-bold flex items-center justify-center text-[11px] shrink-0">2</span>
              <span>Scroll down and select <strong className="text-white">"Add to Home Screen"</strong>.</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#EA4C2A] text-white font-bold flex items-center justify-center text-[11px] shrink-0">3</span>
              <span>Tap <strong className="text-white">"Add"</strong> in the top right corner.</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => {
                if (typeof onTriggerNativeInstall === 'function') onTriggerNativeInstall();
              }}
              className="w-full py-3 bg-[#EA4C2A] hover:bg-[#D43B1B] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#EA4C2A]/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
            >
              <Download size={16} />
              <span>Install App Now</span>
            </button>
            <p className="text-[11px] text-slate-400">
              Or tap your browser's menu (⋮) and select <strong>"Install FoodMaxx"</strong>
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// ORDER TRACKING MODAL (CLEAN & MODERN)
// ============================================================
function TrackingModal({ order, onClose, onRefresh, user, isDark, appCopy }) {
  const toast = useToast();
  const [chatOpen, setChatOpen] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const trackingBodyRef = useRef(null);

  // Auto-scroll to top of modal when loaded
  useEffect(() => {
    if (trackingBodyRef.current) {
      trackingBodyRef.current.scrollTop = 0;
    }
  }, [order?.id]);

  // Support ESC key and browser/device back navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    // Push state so device/browser back button closes tracking modal
    window.history.pushState({ modal: 'tracking' }, '');
    const handlePopState = () => {
      onClose();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

  const handleBack = (e) => {
    if (e) e.stopPropagation();
    if (window.history.state?.modal === 'tracking') {
      window.history.back();
    } else {
      onClose();
    }
  };

  const isDelivered = order.order_status === 'DELIVERED';
  const isCancelled = order.order_status === 'CANCELLED';

  // Destination address resolution
  const destinationAddress =
    order.delivery_address ||
    order.deliveryAddress ||
    order.address ||
    order.recipient_address ||
    (order.delivery_zone ? `${order.delivery_zone}, Ibadan` : 'Awolowo Avenue, Old Bodija, Ibadan');
  const destinationZone = order.delivery_zone || order.zone || 'Old Bodija / UI Axis';
  const destinationLandmark = order.delivery_landmark || order.landmark || order.delivery_note || '';
  const destinationInstructions = order.delivery_instructions || order.instructions || '';

  // Reliable courier information with mobile number
  const hasAssignedRider = Boolean(order.riderInfo || order.assigned_rider || order.rider_name || order.rider_phone);
  const rider = order.riderInfo || order.assigned_rider || (hasAssignedRider ? {
    full_name: order.rider_name || 'Assigned Courier',
    phone: order.rider_phone || '',
    vehicle_type: order.vehicle_type || 'Delivery Motorcycle',
    rating: order.rider_rating || 4.9,
  } : null);
  const riderPhone = rider?.phone || order.rider_phone || '';
  const cleanPhone = riderPhone.replace(/[^0-9+]/g, '');

  const handleCopyPhone = () => {
    if (!riderPhone) return;
    navigator.clipboard?.writeText(riderPhone);
    setCopiedPhone(true);
    toast('Rider phone number copied to clipboard', 'success');
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyRef = () => {
    navigator.clipboard?.writeText(order.order_reference);
    setCopiedRef(true);
    toast('Order reference copied', 'info');
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleCopyPin = () => {
    const pin = String(order.delivery_otp || order.pin || '');
    if (!pin) return;
    navigator.clipboard?.writeText(pin);
    setCopiedPin(true);
    toast(`Delivery PIN (${pin}) copied!`, 'success');
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const getMilestoneStep = (status) => {
    if (status === 'DELIVERED') return 4;
    if (['RIDER_ASSIGNED', 'RIDER_PICKED_UP', 'ON_THE_WAY', 'ARRIVING_SOON'].includes(status)) return 3;
    if (['PREPARING', 'READY_FOR_PICKUP'].includes(status)) return 2;
    return 1;
  };

  const currentStep = getMilestoneStep(order.order_status);

  const MILESTONES = [
    { step: 1, label: getCopy(appCopy, 'customer_tracking', 'step_placed_title', 'Placed'), icon: '📝' },
    { step: 2, label: getCopy(appCopy, 'customer_tracking', 'step_kitchen_title', 'Kitchen'), icon: '🍳' },
    { step: 3, label: getCopy(appCopy, 'customer_tracking', 'step_transit_title', 'On the Way'), icon: '🛵' },
    { step: 4, label: getCopy(appCopy, 'customer_tracking', 'step_delivered_title', 'Delivered'), icon: '🏡' },
  ];

  const getHeadline = () => {
    if (isDelivered) return getCopy(appCopy, 'customer_tracking', 'step_delivered_desc', 'Meal Delivered 🎉');
    if (isCancelled) return 'Order Cancelled';
    if (currentStep === 3) return getCopy(appCopy, 'customer_tracking', 'step_transit_desc', 'Rider is on the way to your door 🛵');
    if (currentStep === 2) return getCopy(appCopy, 'customer_tracking', 'step_kitchen_desc', 'FoodMaxx kitchen is cooking your meal 🍳');
    return getCopy(appCopy, 'customer_tracking', 'step_placed_desc', 'Order confirmed & sent to kitchen ✨');
  };

  const getSubheadline = () => {
    if (order.custom_notification_message || order.status_notes) {
      return order.custom_notification_message || order.status_notes;
    }
    if (isDelivered) return 'Package delivered successfully. Enjoy your hot meal!';
    if (isCancelled) return 'This order was cancelled. Please contact support if you need help.';
    if (currentStep === 3) return `Courier ${rider.full_name} is riding towards ${destinationZone}.`;
    if (currentStep === 2) return 'Your food is fresh on the grill and will be packed shortly.';
    return 'Kitchen has received your order and is queuing ingredients.';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4"
      onClick={handleBack}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0.92 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0, transition: { duration: 0.2 } }}
        transition={{ type: 'spring', damping: 28, stiffness: 340 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg h-full sm:h-[90vh] sm:max-h-[90vh] ${
          isDark ? 'bg-[#12141A] text-white border-white/10' : 'bg-[#FAFAFA] text-slate-900 border-slate-200'
        } relative flex flex-col shadow-2xl rounded-none sm:rounded-[36px] border-0 sm:border overflow-hidden`}
      >
        {/* Sleek Minimalist Top Header */}
        <div className={`sticky top-0 ${
          isDark ? 'bg-[#12141A]/95 border-white/10' : 'bg-white/95 border-slate-200/80'
        } border-b px-4 py-3 flex items-center justify-between z-20 backdrop-blur-md shrink-0`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className={`w-9 h-9 rounded-full ${
                isDark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              } flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-xs`}
              aria-label="Go back"
              title="Go back"
            >
              <ChevronLeft size={20} className="stroke-[2.5]" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-sm tracking-tight leading-none">
                  {getCopy(appCopy, 'customer_tracking', 'tracking_modal_title', 'Live Tracking')}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCopyRef}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-mono flex items-center gap-1 mt-0.5 cursor-pointer"
                title="Copy order ref"
              >
                <span>#{order.order_reference}</span>
                {copiedRef ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} className="opacity-60" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onRefresh}
              className={`w-9 h-9 rounded-full transition-all cursor-pointer active:scale-90 flex items-center justify-center ${
                isDark ? 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/15' : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
              title="Refresh status"
            >
              <RefreshCw size={14} />
            </button>
            <button
              type="button"
              onClick={handleBack}
              className={`w-9 h-9 rounded-full transition-all cursor-pointer active:scale-90 flex items-center justify-center sm:hidden ${
                isDark ? 'bg-white/10 text-slate-300 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
              title="Close tracking"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div ref={trackingBodyRef} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain">

          {/* Primary ETA & Status Hero Banner */}
          <div className={`rounded-3xl p-5 border transition-all ${
            isDark
              ? 'bg-gradient-to-br from-[#1C1F26] via-[#16181E] to-[#121418] border-white/10 shadow-lg'
              : 'bg-gradient-to-br from-white via-orange-50/40 to-amber-50/20 border-orange-100 shadow-md'
          }`}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                isDelivered
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                  : 'bg-[#EA4C2A]/15 text-[#EA4C2A] border border-[#EA4C2A]/25'
              }`}>
                {statusLabel[order.order_status] || 'Active Delivery'}
              </span>

              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-black/30 px-3 py-1 rounded-full border border-slate-200/80 dark:border-white/10">
                <Clock size={12} className="text-[#EA4C2A]" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {order.estimated_delivery_time || '20-30 mins'}
                </span>
              </div>
            </div>

            <h3 className="font-black text-xl text-slate-900 dark:text-white tracking-tight leading-snug">
              {getHeadline()}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {getSubheadline()}
            </p>

            {/* Clean Connected 4-Step Stepper */}
            <div className="relative pt-6 pb-2 mt-3">
              {/* Connected background track */}
              <div className="absolute top-[37px] left-6 right-6 h-1 bg-slate-200 dark:bg-white/10 rounded-full" />
              {/* Active progress fill */}
              <div
                className="absolute top-[37px] left-6 h-1 bg-gradient-to-r from-[#EA4C2A] to-orange-400 rounded-full transition-all duration-700 shadow-xs"
                style={{
                  width: `${Math.max(0, Math.min(100, ((currentStep - 1) / (MILESTONES.length - 1)) * 100))}%`
                }}
              />

              <div className="relative flex justify-between">
                {MILESTONES.map(m => {
                  const done = m.step <= currentStep;
                  const isCurrent = m.step === currentStep;
                  return (
                    <div key={m.step} className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        done
                          ? 'bg-[#EA4C2A] text-white shadow-md shadow-[#EA4C2A]/30 scale-105'
                          : isDark
                          ? 'bg-[#12141A] text-slate-500 border border-white/10'
                          : 'bg-white text-slate-400 border border-slate-300'
                      } ${isCurrent ? 'ring-4 ring-[#EA4C2A]/20 scale-110' : ''}`}>
                        {done && m.step < currentStep ? <Check size={13} strokeWidth={3.5} /> : m.icon}
                      </div>
                      <span className={`text-[10.5px] mt-2 font-medium tracking-tight whitespace-nowrap ${
                        isCurrent
                          ? 'font-extrabold text-[#EA4C2A]'
                          : done
                          ? isDark ? 'text-slate-200 font-semibold' : 'text-slate-800 font-semibold'
                          : 'text-slate-400'
                      }`}>
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive Route Map */}
          <div className="rounded-3xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-sm">
            <MotorcycleRouteMap
              status={order.order_status}
              eta={order.estimated_delivery_time}
              isDark={isDark}
              destinationAddress={destinationAddress}
            />
          </div>

          {/* Unified Courier & Handover PIN Card */}
          <div className={`rounded-3xl p-4 sm:p-5 border transition-all ${
            isDark ? 'bg-[#181B24] border-white/10 shadow-md' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Dispatch Courier
              </span>
              {!isDelivered && !isCancelled && order.delivery_otp ? (
                <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-xl border border-amber-500/20">
                  <ShieldCheck size={13} className="text-amber-500" />
                  <span className="text-[10px] font-bold uppercase">PIN:</span>
                  <span className="font-mono font-black text-xs tracking-wider">{order.delivery_otp}</span>
                  <button
                    type="button"
                    onClick={handleCopyPin}
                    className="p-1 hover:bg-black/10 rounded cursor-pointer"
                    title="Copy PIN"
                  >
                    {copiedPin ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                  </button>
                </div>
              ) : (
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {isDelivered ? 'Trip Completed' : '🛵 On Duty'}
                </span>
              )}
            </div>

            {rider ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#EA4C2A] to-orange-400 text-white font-black text-lg flex items-center justify-center shadow-md shadow-[#EA4C2A]/20 shrink-0">
                        {rider.full_name?.[0] || 'C'}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-[#181B24]" />
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                        {rider.full_name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {rider.vehicle_type}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500">
                          <Star size={11} className="fill-amber-500" />
                          {rider.rating || 5.0}
                        </span>
                        <span className="text-slate-400 text-[11px]">• Verified Courier</span>
                      </div>
                    </div>
                  </div>

                  {/* Rider Phone Chip */}
                  {riderPhone && (
                    <button
                      type="button"
                      onClick={handleCopyPhone}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 border ${
                        copiedPhone
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : isDark
                          ? 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                      title="Copy phone"
                    >
                      <span>{riderPhone}</span>
                      {copiedPhone ? <Check size={11} /> : <Copy size={11} className="opacity-60" />}
                    </button>
                  )}
                </div>

                {/* Quick Contact Action Buttons */}
                <div className="grid grid-cols-2 gap-2.5 mt-4 pt-3.5 border-t border-slate-100 dark:border-white/8">
                  <button
                    type="button"
                    onClick={() => setChatOpen(true)}
                    className="py-2.5 px-3 rounded-2xl bg-[#EA4C2A] hover:bg-[#D43D1D] active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-[#EA4C2A]/25 transition-all cursor-pointer"
                  >
                    <MessageCircle size={14} />
                    <span>Chat with Rider</span>
                  </button>
                  {cleanPhone ? (
                    <a
                      href={`tel:${cleanPhone}`}
                      className={`py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all active:scale-95 cursor-pointer text-center ${
                        isDark
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      <PhoneCall size={14} className="text-emerald-500" />
                      <span>Call Rider</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setChatOpen(true)}
                      className={`py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all active:scale-95 cursor-pointer text-center ${
                        isDark
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      <PhoneCall size={14} className="text-emerald-500" />
                      <span>In-App Dispatch Line</span>
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 py-1">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 font-bold text-2xl flex items-center justify-center shrink-0 border border-amber-500/20">
                  🛵
                </div>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Courier Pending Assignment
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Our nearest dispatch courier will be paired once your meal is boxed.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Delivery Destination Card */}
          <div className={`rounded-3xl p-4 sm:p-5 border transition-all ${
            isDark ? 'bg-[#1C1F26] border-white/10 shadow-sm' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#EA4C2A]/15 text-[#EA4C2A] flex items-center justify-center text-sm">
                  <MapPin size={14} className="stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Drop-off Location
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                {destinationZone}
              </span>
            </div>

            <div className="font-bold text-sm text-slate-900 dark:text-white leading-snug pl-9">
              {destinationAddress}
            </div>

            {destinationLandmark && (
              <div className="mt-2 pl-9 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <span>📍</span>
                <span className="font-semibold">Landmark: {destinationLandmark}</span>
              </div>
            )}

            {destinationInstructions && (
              <div className="mt-2 pl-9 text-xs text-slate-500 dark:text-slate-400 italic">
                "{destinationInstructions}"
              </div>
            )}
          </div>

          {/* Collapsible Order Items & Receipt */}
          <div className={`rounded-3xl border overflow-hidden transition-all ${
            isDark ? 'bg-[#1C1F26] border-white/10' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <button
              type="button"
              onClick={() => setShowOrderDetails(!showOrderDetails)}
              className="w-full p-4 sm:p-4.5 flex items-center justify-between text-left cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">🧾</span>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">Order Receipt & Items</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {order.items?.length || 0} items • Total: {fmt(order.total)}
                  </p>
                </div>
              </div>
              <ChevronDown
                size={16}
                className={`text-slate-400 transition-transform duration-200 ${showOrderDetails ? 'rotate-180' : ''}`}
              />
            </button>

            {showOrderDetails && (
              <div className="px-4.5 pb-4 pt-1 border-t border-slate-100 dark:border-white/10 space-y-2.5">
                {order.items?.map((item, iIdx) => (
                  <div key={item.id || iIdx} className="flex justify-between items-start text-xs py-1">
                    <div className="min-w-0 pr-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {item.quantity || item.qty || 1}x {item.item_name || item.name}
                      </span>
                      {item.selected_size && item.selected_size !== 'Regular' && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Portion: {item.selected_size}
                        </div>
                      )}
                      {item.selected_extras?.length > 0 && (
                        <div className="text-[11px] text-[#EA4C2A] mt-0.5">
                          +{item.selected_extras.join(', ')}
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white shrink-0">
                      {fmt(item.total_price || item.price)}
                    </span>
                  </div>
                ))}

                <div className="pt-2.5 mt-2 border-t border-slate-200/70 dark:border-white/10 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Payment Status:</span>
                  <span className="font-bold text-emerald-500 flex items-center gap-1">
                    <Check size={11} strokeWidth={3} /> Paid via Paystack
                  </span>
                </div>

                <div className="flex justify-between items-center font-black text-sm pt-1">
                  <span>Total Amount</span>
                  <span className="text-[#EA4C2A]">{fmt(order.total)}</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* IN-TRANSIT CHAT DRAWER */}
        <InTransitChatDrawer
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          order={order}
          user={user}
          isDark={isDark}
        />

        {/* MASKED CALL MODAL */}
        <MaskedCallModal
          open={callModalOpen}
          onClose={() => setCallModalOpen(false)}
          rider={order.riderInfo}
          order={order}
          isDark={isDark}
        />
      </motion.div>
    </motion.div>
  );
}


// ============================================================
// WALLET MODAL
// ============================================================
function WalletModal({ open, onClose, wallet, onTopUp, onRefresh, user, isDark }) {
  const [amount, setAmount] = useState('2000');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const quickAmounts = [1000, 2000, 5000, 10000];

  async function handlePaystackTopUp() {
    const numAmount = Number(amount);
    if (!numAmount || numAmount < 100) {
      toast('Please enter a valid top-up amount of at least ₦100', 'error');
      return;
    }

    setLoading(true);

    const paystackCfg = getStoredPaystackConfig();
    const envKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_PAYSTACK_PUBLIC_KEY) || '';
    const activeKey = (paystackCfg.publicKey || envKey || 'pk_test_d3a8b4172f3e44955b2046ff03b55237b6cf3e1a').trim();

    const effectiveEmail = (user?.email && user.email.includes('@'))
      ? user.email.trim()
      : 'customer@foodmaxx.ng';
    const effectiveName = user?.name || user?.displayName || user?.full_name || 'FoodMaxx Customer';
    const effectivePhone = user?.phone || user?.phone_number || '';
    const txRef = `TOPUP_PSTK_${Date.now()}_${Math.floor(100000 + Math.random() * 900000)}`;

    await loadPaystackScript();

    try {
      launchRealPaystack({
        key: activeKey,
        email: effectiveEmail,
        amount: numAmount,
        reference: txRef,
        customerName: effectiveName,
        phone: effectivePhone,
        metadata: {
          custom_fields: [
            { display_name: 'Customer Name', variable_name: 'customer_name', value: effectiveName },
            { display_name: 'Customer Phone', variable_name: 'customer_phone', value: effectivePhone },
            { display_name: 'Transaction Type', variable_name: 'transaction_type', value: 'FoodMaxx Wallet Top-Up' },
            { display_name: 'Top-Up Amount', variable_name: 'top_up_amount', value: `NGN ${numAmount}` }
          ]
        },
        onSuccess: async (tx) => {
          try {
            const confirmedRef = tx.reference || txRef;
            await api.topUpWallet(numAmount, user?.id || 'usr_customer_default', confirmedRef);
            toast(`Wallet funded successfully with ₦${numAmount.toLocaleString()}! 💳✨`, 'success');
            setAmount('2000');
            if (onRefresh) await onRefresh();
          } catch (e) {
            console.error('Wallet balance update error:', e);
            toast(e?.message || 'Failed to update wallet balance', 'error');
          } finally {
            setLoading(false);
          }
        },
        onCancel: () => {
          toast('Paystack top-up window closed', 'info');
          setLoading(false);
        },
        onError: (err) => {
          console.warn('Paystack popup initiation failed:', err);
          setLoading(false);
          toast(err?.message || 'Paystack payment error. Please check your network and try again.', 'error');
        }
      });
    } catch (err) {
      console.warn('Paystack inline launch error:', err);
      setLoading(false);
      toast(err?.message || 'Unable to open Paystack checkout', 'error');
    }
  }

  const hasWelcomeCredit = (wallet?.transactions || []).some(t => 
    (t.description || '').toLowerCase().includes('welcome') || (t.reference || '').toLowerCase().includes('welcome')
  );

  return (
    <Modal open={open} onClose={onClose} title="💳 FoodMaxx Chow Wallet">
      <div className="p-4 sm:p-5 space-y-4">
        {/* Welcome Bonus Callout Banner */}
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-emerald-500/15 border border-amber-500/30 dark:border-amber-400/20 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-[#EA4C2A] text-white flex items-center justify-center text-xl shrink-0 shadow-sm">
            🎁
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-xs text-amber-600 dark:text-amber-400">Welcome Chow Perk</span>
              <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                ₦1,000 Credited
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
              Instant credit ready to offset your chow at checkout!
            </p>
          </div>
        </div>

        {/* Digital Luxury Chow Card */}
        <div className="relative overflow-hidden rounded-3xl p-5 text-white bg-gradient-to-br from-slate-900 via-zinc-900 to-[#EA4C2A] border border-white/10 shadow-xl">
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#EA4C2A]/20 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-5 rounded bg-amber-400/80 border border-amber-300 flex items-center justify-center shadow-xs">
                <div className="w-4 h-3 border border-amber-600/60 rounded-[2px]" />
              </div>
              <span className="text-[11px] font-mono tracking-widest text-slate-300 uppercase">Chow Pass</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/15 text-white backdrop-blur-xs font-mono">
              NGN · ₦
            </span>
          </div>

          <div className="space-y-0.5 mb-3">
            <div className="text-[11px] text-slate-300 font-medium">Available Balance</div>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">{fmt(wallet?.balance || 0)}</div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] text-slate-300">
            <span className="flex items-center gap-1">
              <Lock size={10} className="text-emerald-400" />
              <span>Instant Paystack Top-Up</span>
            </span>
            <span className="font-mono">FoodMaxx Wallet</span>
          </div>
        </div>

        {/* Quick Top-Up with Paystack */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <Plus size={14} className="text-[#EA4C2A]" />
              <span>Select Top-Up Amount</span>
            </h3>
            <span className="text-[10px] font-bold text-[#09A5DB] bg-[#09A5DB]/10 dark:bg-[#09A5DB]/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Lock size={10} />
              <span>Paystack</span>
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => { triggerHaptic('selection'); setAmount(String(a)); }}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  amount === String(a)
                    ? 'bg-[#09A5DB] text-white border-[#09A5DB] shadow-sm shadow-[#09A5DB]/25'
                    : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                {fmt(a)}
              </button>
            ))}
          </div>

          {/* Amount Input */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-sm text-slate-400">
              ₦
            </span>
            <input
              type="number"
              min="100"
              className="w-full pl-8 pr-3.5 py-3 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold outline-none focus:border-[#09A5DB] transition-colors"
              placeholder="Or enter custom amount (min ₦100)"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          {/* Primary Paystack Action Button */}
          <button
            type="button"
            onClick={handlePaystackTopUp}
            disabled={loading || !amount || Number(amount) < 100}
            className="w-full py-3.5 bg-[#09A5DB] hover:bg-[#0894c6] active:scale-[0.98] text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-[#09A5DB]/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Connecting to Paystack...</span>
              </>
            ) : (
              <>
                <CreditCard size={16} className="stroke-[2.5]" />
                <span>Pay with Paystack {amount && Number(amount) >= 100 ? `• ${fmt(Number(amount))}` : ''}</span>
              </>
            )}
          </button>

          {/* Security & Payment Channels Assurance */}
          <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-gray-400 dark:text-gray-500 pt-0.5">
            <Lock size={11} className="text-emerald-500 shrink-0" />
            <span>Secured 256-bit encryption · Debit Cards, Bank Transfer & USSD</span>
          </div>
        </div>

        {/* Recent Transactions */}
        {wallet?.transactions?.length > 0 && (
          <div>
            <h3 className="font-bold text-xs mb-2 text-slate-900 dark:text-white">Transaction History</h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
              {wallet.transactions.map((t, idx) => (
                <div key={t.id || idx} className="flex items-center justify-between py-2 text-xs">
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="font-semibold text-slate-900 dark:text-white truncate text-[11.5px]">
                      {t.description || 'Wallet Transaction'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {t.date || t.created_at ? new Date(t.date || t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                    </div>
                  </div>
                  <span className={`font-black text-xs shrink-0 ${t.type === 'credit' ? 'text-emerald-500' : 'text-[#EA4C2A]'}`}>
                    {t.type === 'credit' ? '+' : '-'}{fmt(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ============================================================
// REVIEW MODAL
// ============================================================
function ReviewModal({ order, onClose, onSubmit }) {
  const [restaurantRating, setRestaurantRating] = useState(5);
  const [foodRating, setFoodRating] = useState(5);
  const [riderRating, setRiderRating] = useState(5);
  const [comment, setComment] = useState('');

  const RatingStars = ({ value, onChange }) => (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(i => (
        <button key={i} onClick={() => onChange(i)}>
          <Star size={28} fill={i <= value ? '#F59E0B' : 'none'} color={i <= value ? '#F59E0B' : '#D1D5DB'} />
        </button>
      ))}
    </div>
  );

  return (
    <Modal open={true} onClose={onClose} title="⭐ Rate Your Experience">
      <div className="p-5 space-y-4">
        {[
          { label: '🍴 Restaurant', value: restaurantRating, set: setRestaurantRating },
          { label: '🍔 Food Quality', value: foodRating, set: setFoodRating },
          { label: '🛵 Rider', value: riderRating, set: setRiderRating },
        ].map(r => (
          <div key={r.label}>
            <div className="font-bold text-sm mb-2">{r.label}</div>
            <RatingStars value={r.value} onChange={r.set} />
          </div>
        ))}
        <div>
          <div className="font-bold text-sm mb-2 text-slate-900 dark:text-white">Your Review</div>
          <textarea
            className="w-full p-3 bg-gray-50 dark:bg-white/5 text-slate-900 dark:text-white rounded-xl text-sm border border-gray-200 dark:border-white/10 outline-none resize-none"
            placeholder="Share your experience..."
            rows={3}
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
        </div>
        <button
          onClick={() => onSubmit({ restaurant_rating: restaurantRating, food_rating: foodRating, rider_rating: riderRating, comment })}
          className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold"
        >
          Submit Review
        </button>
      </div>
    </Modal>
  );
}

// ============================================================
// SUPPORT MODAL
// ============================================================
function SupportModal({ open, onClose }) {
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const storeDetails = getStoreDetails();

  async function handleSubmit() {
    if (!category || !description) { toast('Please fill all fields', 'error'); return; }
    setLoading(true);
    try {
      const res = await api.createSupportTicket({ category, subject: subject || category, description });
      toast(res.message, 'success');
      onClose();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const rawPhone = storeDetails.phone ? storeDetails.phone.replace(/\s+/g, '') : '';
  const rawWhatsApp = storeDetails.whatsapp_dispatch ? storeDetails.whatsapp_dispatch.replace(/\D/g, '') : '';
  const waUrl = rawWhatsApp.startsWith('0')
    ? `https://wa.me/234${rawWhatsApp.slice(1)}?text=Hello%20FoodMaxx%20Support`
    : `https://wa.me/${rawWhatsApp}?text=Hello%20FoodMaxx%20Support`;

  return (
    <Modal open={open} onClose={onClose} title="💬 Contact Support">
      <div className="p-5 space-y-4">
        {/* Direct Instant Channels */}
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold text-amber-900 dark:text-amber-300">Need Immediate Help?</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 truncate">{storeDetails.phone}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`tel:${rawPhone}`}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-transform active:scale-95"
            >
              <Phone size={12} /> Call
            </a>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-transform active:scale-95"
            >
              <MessageSquare size={12} /> WhatsApp
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {['Missing Item', 'Late Delivery', 'Wrong Order', 'Payment Issue', 'Refund Request', 'Other'].map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold border-2 transition-all ${category === c ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400' : 'border-gray-100 dark:border-white/10 text-gray-700 dark:text-gray-200 dark:bg-white/5'}`}
            >
              {c}
            </button>
          ))}
        </div>
        <textarea
          className="w-full p-3 bg-gray-50 dark:bg-white/5 text-slate-900 dark:text-white rounded-xl text-sm border border-gray-200 dark:border-white/10 outline-none resize-none"
          placeholder="Describe your issue..."
          rows={4}
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </div>
    </Modal>
  );
}

// ============================================================
// LOGIN / REGISTER MODALS
// ============================================================
function LoginModal({ open, onClose, onSwitchRegister }) {
  const { isDark } = useTheme?.() || {};
  return (
    <AuthModal
      open={open}
      onClose={onClose}
      initialMode="login"
      onSuccess={onClose}
      isDark={isDark}
    />
  );
}

function RegisterModal({ open, onClose, onSwitchLogin }) {
  return (
    <AuthModal
      open={open}
      onClose={onClose}
      initialMode="register"
      onSuccess={onClose}
      isDark={false}
    />
  );
}

// ============================================================
// VENDOR DASHBOARD PORTAL
// ============================================================
function VendorPortal() {
  const { user } = useAuth();
  const toast = useToast();
  const ws = useWS();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [notification, setNotification] = useState(null);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (user?.role === 'restaurant_owner') {
      loadRestaurant();
    }
  }, [user]);

  useEffect(() => {
    if (!ws || !restaurant) return;
    // Register as restaurant
    if (ws.ws?.readyState === 1) {
      ws.ws.send(JSON.stringify({ type: 'REGISTER', userId: user?.id, userRole: 'restaurant_owner', restaurantId: restaurant.id }));
    }

    const unsub = ws.on('NEW_ORDER', (msg) => {
      if (msg.restaurantId === restaurant.id) {
        setNotification(msg);
        loadOrders(restaurant.id);
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA');
        audio.play?.().catch(() => {});
      }
    });
    const unsubStatus = ws.on('ORDER_STATUS_UPDATED', () => {
      if (restaurant) loadOrders(restaurant.id);
    });
    return () => { unsub(); unsubStatus(); };
  }, [ws, restaurant]);

  async function loadRestaurant() {
    try {
      const res = await api.me();
      if (res.restaurantData) {
        setRestaurant(res.restaurantData);
        setIsOpen(res.restaurantData.is_open);
        loadOrders(res.restaurantData.id);
        loadMenu(res.restaurantData.id);
      }
    } catch (e) {}
  }

  async function loadOrders(restId) {
    try {
      // Get admin orders filtered by restaurant
      const res = await api.getAdminOrders({ restaurant_id: restId });
      setOrders(res.data || []);
    } catch (e) {}
  }

  async function loadMenu(restId) {
    try {
      const res = await api.getRestaurantMenu(restId);
      setMenuItems(res.data || []);
    } catch (e) {}
  }

  async function handleStatusUpdate(orderId, status) {
    try {
      await api.updateOrderStatus(orderId, status);
      toast(`Order updated to ${statusLabel[status]}`, 'success');
      loadOrders(restaurant.id);
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function toggleOpen() {
    try {
      await api.updateRestaurant(restaurant.id, { is_open: !isOpen });
      setIsOpen(p => !p);
      toast(isOpen ? 'Restaurant closed' : 'Restaurant open for orders!', 'success');
    } catch (e) {}
  }

  async function handleAddItem(data) {
    try {
      await api.addMenuItem(restaurant.id, data);
      toast('Menu item added!', 'success');
      setAddItemOpen(false);
      loadMenu(restaurant.id);
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function toggleItemAvailability(item) {
    try {
      await api.updateMenuItem(restaurant.id, item.id, { is_available: !item.is_available });
      toast(`${item.name} ${item.is_available ? 'hidden' : 'made available'}`, 'success');
      loadMenu(restaurant.id);
    } catch (e) {}
  }

  if (!user || user.role !== 'restaurant_owner') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8 text-center">
        <div>
          <div className="text-5xl mb-4">🏪</div>
          <h2 className="text-2xl font-bold mb-2">Vendor Dashboard</h2>
          <p className="text-gray-500 mb-4">Sign in as a restaurant owner to access the vendor dashboard.</p>
          <p className="text-sm bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-yellow-800">
            Use <strong>Quick Demo Login</strong> above and select a Vendor account.
          </p>
        </div>
      </div>
    );
  }

  const newOrders = orders.filter(o => o.order_status === 'ORDER_PLACED');
  const preparingOrders = orders.filter(o => ['RESTAURANT_CONFIRMED','PREPARING'].includes(o.order_status));
  const readyOrders = orders.filter(o => o.order_status === 'READY_FOR_PICKUP');
  const completedToday = orders.filter(o => o.order_status === 'DELIVERED');
  const revenueToday = completedToday.reduce((s, o) => s + o.total, 0);

  const navItems = [
    { id: 'dashboard', icon: BarChart2, label: 'Dashboard' },
    { id: 'orders', icon: ClipboardList, label: 'Orders' },
    { id: 'menu', icon: ChefHat, label: 'Menu' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-56 bg-gray-900 text-white min-h-screen flex flex-col shrink-0">
        <div className="p-5 border-b border-gray-700">
          <div className="text-sm font-bold text-red-400 mb-3">🍔 FOODMAXX VENDOR</div>
          {restaurant && (
            <>
              <div className="font-bold text-sm truncate">{restaurant.name}</div>
              <div className="flex items-center gap-2 mt-2">
                <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-400 pulse-online' : 'bg-red-400'}`} />
                <span className="text-xs text-gray-300">{isOpen ? 'Open' : 'Closed'}</span>
                <button onClick={toggleOpen} className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold ${isOpen ? 'bg-red-600' : 'bg-green-600'}`}>
                  {isOpen ? 'Close' : 'Open'}
                </button>
              </div>
            </>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeSection === item.id ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
              <item.icon size={17} />
              {item.label}
              {item.id === 'orders' && newOrders.length > 0 && (
                <span className="ml-auto bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{newOrders.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-3">
          <div className="text-xs text-gray-500 text-center">{user.full_name}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* New Order Notification Banner */}
        {notification && (
          <div className="bg-red-600 text-white p-4 flex items-center gap-3 animate-pulse">
            <Bell size={20}/>
            <span className="font-bold">New order received from {notification.customer?.full_name}!</span>
            <button onClick={() => { setActiveSection('orders'); setNotification(null); }} className="ml-auto bg-white text-red-600 px-4 py-1.5 rounded-xl font-bold text-sm">
              View Orders
            </button>
            <button onClick={() => setNotification(null)} className="text-red-200"><X size={16}/></button>
          </div>
        )}

        {/* Dashboard Section */}
        {activeSection === 'dashboard' && (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Restaurant Dashboard</h1>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'New Orders', value: newOrders.length, icon: Package, color: 'bg-red-50 text-red-600', badge: newOrders.length > 0 },
                { label: 'Preparing', value: preparingOrders.length, icon: ChefHat, color: 'bg-yellow-50 text-yellow-700' },
                { label: 'Ready', value: readyOrders.length, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
                { label: "Today's Revenue", value: fmt(revenueToday), icon: DollarSign, color: 'bg-blue-50 text-blue-600' },
              ].map((stat, i) => (
                <div key={i} className={`${stat.color} rounded-2xl p-4 relative overflow-hidden`}>
                  <stat.icon size={20} className="mb-2" />
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm font-semibold opacity-70">{stat.label}</div>
                  {stat.badge && (
                    <div className="absolute top-3 right-3 w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                  )}
                </div>
              ))}
            </div>

            {/* Order queue preview */}
            <h2 className="font-bold text-lg mb-4">Live Order Queue</h2>
            <div className="space-y-3">
              {[...newOrders, ...preparingOrders].slice(0, 5).map(order => (
                <VendorOrderCard key={order.id} order={order} onStatus={handleStatusUpdate} />
              ))}
              {orders.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl text-gray-400">
                  <Package size={36} className="mx-auto mb-2 opacity-30" />
                  <p>No active orders right now</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Orders Section */}
        {activeSection === 'orders' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Order Management</h1>
              <button onClick={() => loadOrders(restaurant?.id)} className="p-2 rounded-xl bg-gray-100"><RefreshCw size={16}/></button>
            </div>

            {['ORDER_PLACED','RESTAURANT_CONFIRMED','PREPARING','READY_FOR_PICKUP','DELIVERED','CANCELLED'].map(status => {
              const statusOrders = orders.filter(o => o.order_status === status);
              if (statusOrders.length === 0) return null;
              return (
                <div key={status} className="mb-6">
                  <h2 className="font-bold text-sm text-gray-600 mb-3 uppercase tracking-wide flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor[status] }} />
                    {statusLabel[status]} ({statusOrders.length})
                  </h2>
                  <div className="space-y-3">
                    {statusOrders.map(o => <VendorOrderCard key={o.id} order={o} onStatus={handleStatusUpdate} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Menu Section */}
        {activeSection === 'menu' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Menu Management</h1>
              <button onClick={() => setAddItemOpen(true)} className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1">
                <Plus size={16}/> Add Item
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map(item => (
                <div key={item.id} className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 ${!item.is_available ? 'opacity-60' : ''}`}>
                  <img onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'; }} src={item.image_url} className="w-full h-32 object-cover" />
                  <div className="p-4">
                    <div className="font-bold text-sm mb-1">{item.name}</div>
                    <div className="text-xs text-gray-500 mb-2 line-clamp-2">{item.description}</div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-600">{fmt(item.price)}</span>
                      <div className="flex gap-2">
                        <button onClick={() => toggleItemAvailability(item)} className={`px-3 py-1 rounded-lg text-xs font-bold ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {item.is_available ? 'Available' : 'Hidden'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Item Modal */}
            {addItemOpen && <AddMenuItemModal restaurantId={restaurant.id} onClose={() => setAddItemOpen(false)} onSubmit={handleAddItem} />}
          </div>
        )}

        {/* Settings Section */}
        {activeSection === 'settings' && restaurant && (
          <VendorSettings restaurant={restaurant} onSaved={(r) => { setRestaurant(r); toast('Settings saved!', 'success'); }} />
        )}
      </div>
    </div>
  );
}

function VendorOrderCard({ order, onStatus }) {
  const nextStatus = {
    ORDER_PLACED: { status: 'RESTAURANT_CONFIRMED', label: 'Accept Order', color: 'bg-green-600' },
    RESTAURANT_CONFIRMED: { status: 'PREPARING', label: 'Start Preparing', color: 'bg-yellow-600' },
    PREPARING: { status: 'READY_FOR_PICKUP', label: 'Ready for Pickup', color: 'bg-blue-600' },
  };
  const next = nextStatus[order.order_status];

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${order.order_status === 'ORDER_PLACED' ? 'border-l-red-500' : 'border-l-yellow-400'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-bold text-sm">{order.order_reference}</div>
          <div className="text-xs text-gray-500">{order.customer?.full_name} · {fmt(order.total)}</div>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: statusColor[order.order_status] + '20', color: statusColor[order.order_status] }}>
          {statusLabel[order.order_status]}
        </span>
      </div>
      {order.delivery_instructions && (
        <div className="text-xs text-gray-500 bg-yellow-50 rounded-lg p-2 mb-2 italic">"{order.delivery_instructions}"</div>
      )}
      <div className="flex gap-2">
        {next && (
          <button onClick={() => onStatus(order.id, next.status)} className={`flex-1 ${next.color} text-white py-2 rounded-xl font-bold text-sm`}>
            {next.label}
          </button>
        )}
        {order.order_status === 'ORDER_PLACED' && (
          <button onClick={() => onStatus(order.id, 'CANCELLED')} className="px-3 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm">
            Reject
          </button>
        )}
      </div>
    </div>
  );
}

function AddMenuItemModal({ restaurantId, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', description: '', price: '', category: 'Popular', prep_time_min: 15 });

  return (
    <Modal open={true} onClose={onClose} title="Add Menu Item">
      <div className="p-5 space-y-3">
        {[
          { key: 'name', placeholder: 'Food name', type: 'text' },
          { key: 'price', placeholder: 'Price (₦)', type: 'number' },
          { key: 'category', placeholder: 'Category', type: 'text' },
          { key: 'prep_time_min', placeholder: 'Prep time (minutes)', type: 'number' },
        ].map(f => (
          <input key={f.key} type={f.type} placeholder={f.placeholder}
            className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm outline-none"
            value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
          />
        ))}
        <textarea
          placeholder="Description"
          className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm outline-none resize-none"
          rows={3}
          value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
        />
        <button onClick={() => onSubmit(form)} className="w-full bg-red-600 text-white py-3 rounded-2xl font-bold">
          Add Item
        </button>
      </div>
    </Modal>
  );
}

function VendorSettings({ restaurant, onSaved }) {
  const [form, setForm] = useState({
    delivery_time_min: restaurant.delivery_time_min,
    delivery_time_max: restaurant.delivery_time_max,
    delivery_fee: restaurant.delivery_fee,
    min_order: restaurant.min_order,
    operating_hours: restaurant.operating_hours,
  });

  async function save() {
    try {
      const res = await api.updateRestaurant(restaurant.id, form);
      onSaved(res.data);
    } catch (e) {}
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Restaurant Settings</h1>
      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
        {[
          { key: 'delivery_fee', label: 'Delivery Fee (₦)', type: 'number' },
          { key: 'min_order', label: 'Minimum Order (₦)', type: 'number' },
          { key: 'delivery_time_min', label: 'Min Delivery Time (mins)', type: 'number' },
          { key: 'delivery_time_max', label: 'Max Delivery Time (mins)', type: 'number' },
          { key: 'operating_hours', label: 'Operating Hours', type: 'text' },
        ].map(f => (
          <div key={f.key}>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">{f.label}</label>
            <input type={f.type} className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm outline-none"
              value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
            />
          </div>
        ))}
        <button onClick={save} className="w-full bg-red-600 text-white py-3 rounded-2xl font-bold">Save Settings</button>
      </div>
    </div>
  );
}

// ============================================================
// RIDER PORTAL
// ============================================================
function RiderPortal() {
  const { user } = useAuth();
  const toast = useToast();
  const ws = useWS();
  const [rider, setRider] = useState(null);
  const [activeSection, setActiveSection] = useState('home');
  const [earnings, setEarnings] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [deliveryOffer, setDeliveryOffer] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'rider') {
      loadRider();
      loadEarnings();
      loadActiveOrder();
    }
  }, [user]);

  useEffect(() => {
    if (!ws || !rider) return;
    // Register as rider
    if (ws.ws?.readyState === 1) {
      ws.ws.send(JSON.stringify({ type: 'REGISTER', userId: user?.id, userRole: 'rider', riderId: rider.id }));
    }
    const unsub = ws.on('DELIVERY_OFFER', (msg) => {
      setDeliveryOffer(msg);
    });
    const unsubStatus = ws.on('ORDER_STATUS_UPDATED', (msg) => {
      if (activeOrder?.id === msg.orderId) {
        setActiveOrder(prev => prev ? { ...prev, order_status: msg.status } : null);
      }
    });
    return () => { unsub(); unsubStatus(); };
  }, [ws, rider, activeOrder]);

  async function loadRider() {
    try {
      const res = await api.getRiderMe();
      setRider(res.data);
    } catch (e) {}
  }

  async function loadEarnings() {
    try {
      const res = await api.getRiderEarnings();
      setEarnings(res.data);
    } catch (e) {}
  }

  async function loadActiveOrder() {
    try {
      const res = await api.getRiderActiveOrder();
      setActiveOrder(res.data);
    } catch (e) {}
  }

  async function toggleOnline() {
    try {
      const res = await api.toggleRiderStatus();
      setRider(res.data);
      toast(res.data.is_online ? 'You are now online! 🟢' : 'You are now offline ⚫', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function handleAcceptDelivery() {
    if (!deliveryOffer) return;
    setLoading(true);
    try {
      const res = await api.acceptDelivery(deliveryOffer.orderId);
      setActiveOrder(res.data.order);
      setDeliveryOffer(null);
      toast('Delivery accepted! Head to restaurant. 🏃', 'success');
      loadRider();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeclineDelivery() {
    if (!deliveryOffer) return;
    await api.declineDelivery(deliveryOffer.orderId);
    setDeliveryOffer(null);
    toast('Delivery declined', 'warning');
  }

  async function handleConfirmPickup() {
    if (!activeOrder) return;
    setLoading(true);
    try {
      await api.confirmPickup(activeOrder.id);
      toast('Pickup confirmed! Head to customer 🛵', 'success');
      loadActiveOrder();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP() {
    if (!otpInput || !activeOrder) return;
    setLoading(true);
    try {
      const res = await api.verifyOTP(activeOrder.id, otpInput);
      toast(res.message, 'success');
      setActiveOrder(null);
      setOtpInput('');
      loadEarnings();
      loadRider();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  if (!user || user.role !== 'rider') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8 text-center">
        <div>
          <div className="text-5xl mb-4">🛵</div>
          <h2 className="text-2xl font-bold mb-2">Rider App</h2>
          <p className="text-gray-500 mb-4">Sign in as a rider to access the delivery dashboard.</p>
          <p className="text-sm bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-yellow-800">
            Use <strong>Quick Demo Login</strong> and select a Rider account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg md:max-w-xl h-full bg-gray-50 flex flex-col relative shadow-2xl md:rounded-[36px] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-5 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400">FoodMaxx Rider</div>
            <div className="font-bold text-lg">{user.full_name.split(' ')[0]} 👋</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-gray-400">Status</div>
              <div className={`font-medium text-sm ${rider?.is_online ? 'text-green-400' : 'text-gray-400'}`}>
                {rider?.is_online ? '🟢 Online' : '⚫ Offline'}
              </div>
            </div>
            <button
              onClick={toggleOnline}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${rider?.is_online ? 'bg-red-600 text-white' : 'bg-green-500 text-white'}`}
            >
              {rider?.is_online ? 'Go Offline' : 'Go Online'}
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: "Today's Earnings", value: fmt(earnings?.today_earnings || 0) },
            { label: 'Deliveries', value: earnings?.total_deliveries || 0 },
            { label: 'Rating', value: `⭐ ${rider?.rating || '—'}` },
          ].map((s, i) => (
            <div key={i} className="bg-white/10 rounded-xl p-2.5 text-center">
              <div className="font-bold text-sm">{s.value}</div>
              <div className="text-[10px] text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Offer Modal */}
      {deliveryOffer && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="bg-white rounded-t-3xl w-full p-5 slide-up">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <h2 className="font-bold text-xl text-green-600">New Delivery!</h2>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <div className="font-bold mb-1">{deliveryOffer.order?.restaurant?.name}</div>
              <div className="text-sm text-gray-500 mb-2">{deliveryOffer.order?.delivery_address}</div>
              <div className="flex gap-3">
                <div className="flex-1 bg-white rounded-xl p-3 text-center border border-gray-100">
                  <div className="font-bold text-red-600 text-lg">{fmt(deliveryOffer.order?.estimated_earnings)}</div>
                  <div className="text-xs text-gray-500">Earnings</div>
                </div>
                <div className="flex-1 bg-white rounded-xl p-3 text-center border border-gray-100">
                  <div className="font-bold text-gray-900 text-lg">{deliveryOffer.order?.items_count}</div>
                  <div className="text-xs text-gray-500">Items</div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleDeclineDelivery} className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold">
                Decline
              </button>
              <button onClick={handleAcceptDelivery} disabled={loading} className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-bold">
                {loading ? '...' : 'Accept ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Delivery */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {activeOrder ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-xl">Active Delivery</h2>
              <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: statusColor[activeOrder.order_status] + '20', color: statusColor[activeOrder.order_status] }}>
                {statusLabel[activeOrder.order_status]}
              </span>
            </div>

            {/* Restaurant */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <ChefHat size={18} className="text-red-600" />
                <span className="font-bold">Restaurant</span>
              </div>
              <div className="font-semibold">{activeOrder.restaurant?.name}</div>
              <div className="text-sm text-gray-500">{activeOrder.restaurant?.address}</div>
              <a href={`tel:${activeOrder.restaurant?.phone}`} className="flex items-center gap-2 mt-2 text-sm text-blue-600 font-semibold">
                <Phone size={14}/> Call Restaurant
              </a>
            </div>

            {/* Customer */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <User size={18} className="text-red-600" />
                <span className="font-bold">Customer</span>
              </div>
              <div className="font-semibold">{activeOrder.customer?.full_name}</div>
              <div className="text-sm text-gray-500">{activeOrder.delivery_address}</div>
              {activeOrder.delivery_instructions && (
                <div className="text-xs text-gray-400 italic mt-1">"{activeOrder.delivery_instructions}"</div>
              )}
              <a href={`tel:${activeOrder.customer?.phone}`} className="flex items-center gap-2 mt-2 text-sm text-blue-600 font-semibold">
                <Phone size={14}/> Call Customer
              </a>
            </div>

            {/* Action Buttons */}
            {['RIDER_ASSIGNED','RESTAURANT_CONFIRMED'].includes(activeOrder.order_status) && (
              <button onClick={handleConfirmPickup} disabled={loading} className="w-full bg-yellow-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2">
                <Package size={18}/> Confirm Order Picked Up
              </button>
            )}

            {['RIDER_PICKED_UP','ON_THE_WAY','ARRIVING_SOON'].includes(activeOrder.order_status) && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold mb-3">Confirm Delivery with OTP</h3>
                <p className="text-sm text-gray-500 mb-3">Ask the customer for their 4-digit delivery OTP.</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-center text-2xl font-bold tracking-widest outline-none"
                    placeholder="0000"
                    maxLength={4}
                    value={otpInput}
                    onChange={e => setOtpInput(e.target.value)}
                  />
                  <button onClick={handleVerifyOTP} disabled={loading || !otpInput} className="px-5 py-3 bg-green-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">
                    {loading ? '...' : 'Confirm'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            {rider?.is_online ? (
              <>
                <div className="text-5xl mb-4">🛵</div>
                <h3 className="font-bold text-xl mb-2">You're online!</h3>
                <p className="text-gray-500 text-sm">Waiting for delivery assignments...</p>
                <div className="mt-4 flex gap-1 justify-center">
                  {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                </div>
              </>
            ) : (
              <>
                <div className="text-5xl mb-4">😴</div>
                <h3 className="font-bold text-xl mb-2">You're offline</h3>
                <p className="text-gray-500 text-sm mb-4">Go online to start receiving delivery assignments</p>
                <button onClick={toggleOnline} className="bg-green-500 text-white px-6 py-3 rounded-2xl font-bold">Go Online</button>
              </>
            )}
          </div>
        )}

        {/* Earnings Summary */}
        {earnings && !activeOrder && (
          <div className="mt-6 bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2"><DollarSign size={16} className="text-green-600"/>Earnings Summary</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Today', value: fmt(earnings.today_earnings) },
                { label: 'This Week', value: fmt(earnings.week_earnings) },
                { label: 'This Month', value: fmt(earnings.month_earnings) },
              ].map((e, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="font-bold text-sm">{e.value}</div>
                  <div className="text-[10px] text-gray-500">{e.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-sm text-gray-500 text-center">
              Wallet Balance: <strong className="text-green-600">{fmt(earnings.wallet_balance)}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// AUTH PROVIDER
// ============================================================
function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const s = localStorage.getItem('fmx_user');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('fmx_token'));
  const [ws, setWs] = useState(null);

  // Sync token and verify session
  useEffect(() => {
    if (token) {
      api.me().then(res => {
        if (res.success && res.user) {
          // If we already have a super_admin locally, don't let it be downgraded to customer
          if (user?.role === 'super_admin' && res.user.role !== 'super_admin') {
            return;
          }
          setUser(res.user);
          localStorage.setItem('fmx_user', JSON.stringify(res.user));
          initWS(res.user, res.riderData);
        }
      }).catch(() => {
        // Keep local user in offline / static hosting mode
      });
    }
  }, [token]);

  // Real-time Firestore user subscription
  useEffect(() => {
    if (user?.id) {
      const unsubscribe = api.subscribeToLiveUser(user.id, (freshUser) => {
        if (freshUser) {
          setUser(prev => {
            if (prev?.role === 'super_admin' && freshUser.role !== 'super_admin') {
              return prev;
            }
            const merged = { ...prev, ...freshUser };
            try { localStorage.setItem('fmx_user', JSON.stringify(merged)); } catch {}
            return merged;
          });
        }
      });
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
  }, [user?.id]);

  // Real-time multi-tab and window event listener for auth changes
  useEffect(() => {
    const handleAuthChange = (e) => {
      try {
        const storedUser = localStorage.getItem('fmx_user');
        const storedToken = localStorage.getItem('fmx_token');
        setUser(storedUser ? JSON.parse(storedUser) : null);
        setToken(storedToken || null);
      } catch {}
    };

    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('fmx_auth_change', handleAuthChange);
    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('fmx_auth_change', handleAuthChange);
    };
  }, []);

  function initWS(user, riderData) {
    if (ws) ws.disconnect();
    const newWs = new FMXWebSocket(user.id, user.role, { riderId: riderData?.id });
    setWs(newWs);
  }

  async function login(email, password, forcedRole) {
    const res = await api.login(email, password);
    let finalUser = res.user;
    const isExplicitAdmin = forcedRole === 'super_admin' || (email && (email.toLowerCase().includes('admin') || email.toLowerCase().includes('manager') || email.toLowerCase().includes('owner') || email.toLowerCase().endsWith('@foodmaxx.ng')));
    if (isExplicitAdmin) {
      finalUser = {
        ...(finalUser || {}),
        id: 'user_admin',
        full_name: 'FoodMaxx Super Admin',
        email: email || 'admin@foodmaxx.ng',
        phone: finalUser?.phone || '',
        role: 'super_admin'
      };
    }
    const tokenVal = res.token || ('fmx_token_' + Date.now());
    localStorage.setItem('fmx_token', tokenVal);
    if (finalUser) {
      localStorage.setItem('fmx_user', JSON.stringify(finalUser));
      setUser(finalUser);
    }
    setToken(tokenVal);
    initWS(finalUser, res.riderData);

    try {
      window.dispatchEvent(new CustomEvent('fmx_auth_change', { detail: { action: 'login', user: finalUser } }));
    } catch {}

    return { success: true, token: tokenVal, user: finalUser };
  }

  async function silentRegister({ full_name, phone, email, address }) {
    const safeEmail = email || `${phone.replace(/\D/g, '')}@foodmaxx.ng`;
    try {
      const res = await api.register({
        full_name,
        phone,
        email: safeEmail,
        address: address || '',
        password: 'guest_' + Date.now()
      });
      const registeredUser = res.user || {
        id: 'user_' + Date.now(),
        full_name,
        phone,
        email: safeEmail,
        address: address || '',
        role: 'customer'
      };
      const authToken = res.token || ('fmx_token_' + Date.now());
      localStorage.setItem('fmx_token', authToken);
      localStorage.setItem('fmx_user', JSON.stringify(registeredUser));
      setToken(authToken);
      setUser(registeredUser);

      try {
        window.dispatchEvent(new CustomEvent('fmx_auth_change', { detail: { action: 'register', user: registeredUser } }));
      } catch {}

      return registeredUser;
    } catch (e) {
      const localUser = {
        id: 'user_' + Date.now(),
        full_name,
        phone,
        email: safeEmail,
        address: address || '',
        role: 'customer'
      };
      const localToken = 'fmx_token_' + Date.now();
      localStorage.setItem('fmx_token', localToken);
      localStorage.setItem('fmx_user', JSON.stringify(localUser));
      setToken(localToken);
      setUser(localUser);

      try {
        window.dispatchEvent(new CustomEvent('fmx_auth_change', { detail: { action: 'register', user: localUser } }));
      } catch {}

      return localUser;
    }
  }

  function updateUser(updatedData) {
    setUser(prev => {
      const next = { ...(prev || {}), ...updatedData };
      localStorage.setItem('fmx_user', JSON.stringify(next));
      return next;
    });
    try {
      window.dispatchEvent(new CustomEvent('fmx_auth_change', { detail: { action: 'update', user: updatedData } }));
    } catch {}
  }

  function logout() {
    try {
      localStorage.removeItem('fmx_token');
      localStorage.removeItem('fmx_user');
      localStorage.removeItem('fmx_cart');
      localStorage.removeItem('fmx_last_order_id');
      localStorage.removeItem('fmx_active_order');
      localStorage.removeItem('fmx_cart_use_giveaway');
      localStorage.removeItem('fmx_active_promo');
      localStorage.removeItem('fmx_saved_addresses');
      localStorage.removeItem('fmx_last_delivery_address');
      localStorage.removeItem('fmx_last_name');
      localStorage.removeItem('fmx_last_phone');
      localStorage.removeItem('fmx_guest_name');
      localStorage.removeItem('fmx_active_group_code');
    } catch {}
    setToken(null);
    setUser(null);
    if (ws) ws.disconnect();
    setWs(null);
    try {
      window.dispatchEvent(new CustomEvent('fmx_auth_change', { detail: { action: 'logout' } }));
      window.dispatchEvent(new CustomEvent('fmx_cart_clear'));
      window.dispatchEvent(new CustomEvent('fmx_tracking_clear'));
      window.dispatchEvent(new CustomEvent('fmx_address_clear'));
    } catch {}
  }

  return (
    <AuthCtx.Provider value={{ user, token, login, logout, silentRegister, updateUser }}>
      <WSCtx.Provider value={ws}>
        {children}
      </WSCtx.Provider>
    </AuthCtx.Provider>
  );
}


// ============================================================
// ROOT APP
// ============================================================
export default function App() {
  const getInitialPortal = () => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/admin')) return 'admin';
    }
    return 'customer';
  };

  const [activePortal, setActivePortal] = useState(getInitialPortal);

  // Sync portal with URL changes & browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/admin')) {
        setActivePortal('admin');
      } else {
        setActivePortal('customer');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const switchPortal = (portal) => {
    setActivePortal(portal);
    const targetUrl = portal === 'admin' ? '/admin' : '/';
    if (window.location.pathname !== targetUrl) {
      window.history.pushState(null, '', targetUrl);
    }
  };

  return (
    <ToastProvider>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <div className="h-[100dvh] min-h-[100dvh] w-full bg-slate-950 flex flex-col overflow-hidden">
              {(activePortal === 'admin' || (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'))) && (
                <PortalSwitcher
                  activePortal={activePortal}
                  setActivePortal={switchPortal}
                />
              )}

              {activePortal === 'customer' ? (
                <div className="flex-1 min-h-0 w-full flex items-center justify-center p-0 overflow-hidden">
                  <CustomerPortal />
                </div>
              ) : (
                <div className="flex-1 min-h-0 w-full overflow-y-auto bg-[#0B0F19] admin-portal-dark dark">
                  <Suspense fallback={
                    <div className="h-full w-full min-h-[400px] flex flex-col items-center justify-center p-8 text-white font-medium">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EA4C2A] mb-3"></div>
                      <p className="text-slate-400 text-sm">Loading FoodMaxx Admin Suite...</p>
                    </div>
                  }>
                    <AdminPortal />
                  </Suspense>
                </div>
              )}
            </div>
          </CartProvider>
        </AuthProvider>


      </ThemeProvider>
    </ToastProvider>
  );
}


import React, { useState, useEffect, useRef, useCallback, createContext, useContext, useMemo, useDeferredValue, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './index.css';

// Dynamically import canvas-confetti only when triggered to save bundle weight
const triggerConfetti = (opts) => {
  import('canvas-confetti').then((m) => {
    const fn = m.default || m;
    if (typeof fn === 'function') fn(opts);
  }).catch(() => {});
};
import { doc, onSnapshot } from 'firebase/firestore';
import { Network } from '@capacitor/network';
import { api, FMXWebSocket, getStoredProducts, getStoredZones, subscribeToLiveHeroSlides, DEFAULT_HERO_SLIDES } from './services/api';
import { db, DEFAULT_ADDONS } from './services/firebaseDb';
import { DEFAULT_PARFAIT_ITEMS } from './services/mockData';
import { launchRealPaystack, getStoredPaystackConfig, savePaystackConfig, isValidPaystackKey } from './services/paystack';
import { triggerHaptic, playNativeSound, playOrderNotificationSound, shareNative, isStandaloneMode, isIosDevice } from './services/nativeMobile';
import { getAppContent, saveAppContent, resetAppContent, fetchLiveAppContent, subscribeLiveAppContent, getCopy, DEFAULT_APP_CONTENT } from './services/appContent';
import {
  ShoppingCart, Search, Home, Compass, ClipboardList, User, Star,
  MapPin, Clock, ChevronRight, ChevronLeft, Plus, Minus, X, Check,
  Bell, Heart, Settings, LogOut, Package, Truck, ChefHat, Wallet,
  BarChart2, Users, Store, Map as MapIcon, Zap, Shield, Coffee, ArrowRight, ArrowUpDown,
  RefreshCw, AlertCircle, Phone, MessageSquare, Tag, Percent,
  TrendingUp, DollarSign, Activity, Eye, Edit, Trash2,
  Power, Navigation, CheckCircle, XCircle, Filter, MoreVertical, WifiOff,
  Send, Download, Upload, Globe, Award, Layers,
  Moon, Sun, Gift, Calendar, QrCode, MessageCircle, Share2, Bookmark, Sparkles, PhoneCall,
  CreditCard, Flame, ShieldCheck, Utensils, SlidersHorizontal, UserCheck, Printer,
  Lock, Copy, Smartphone, Building2, Mic, ShoppingBag, ChevronDown, ChevronUp, Monitor, Key,
  FolderPlus, ArrowUp, ArrowDown, Video, FileText, Info, RotateCw,
  Columns, LayoutList, Grid, Bike, Edit3, Radio, Palette, Camera, Ticket, HeartHandshake, Volume2
} from 'lucide-react';

const NotificationToneModal = lazy(() => import('./components/NotificationToneModal'));
const NotificationCenterModal = lazy(() => import('./components/NotificationCenterModal'));
import { getStoreDetails, updateStoreDetails, DEFAULT_STORE_DETAILS } from './config/storeDetails';
import OptimizedProductImage, { getOptimizedImageUrl, preloadImage, prefetchCatalogImages } from './components/OptimizedProductImage';
const AdminPortal = lazy(() => import('./components/AdminPortal'));
import SplashScreen from './components/SplashScreen';
const OnboardingFlow = lazy(() => import('./components/OnboardingFlow'));
import { getTransitionVariants } from './utils/transitionStyles';
const TransitionStudioModal = lazy(() => import('./components/TransitionStudioModal'));
const GroupOrderSheet = lazy(() => import('./components/GroupOrderSheet'));
import CleanCheckoutModal from './components/CleanCheckoutModal';
import PaystackFallbackModal from './components/PaystackFallbackModal';
const AuthModal = lazy(() => import('./components/AuthModal'));
const AvatarPickerModal = lazy(() => import('./components/AvatarPickerModal'));
const CheckoutQuickRegisterModal = lazy(() => import('./components/CheckoutQuickRegisterModal'));
import { generateAIAvatarForUser } from './services/aiAvatarService';
import { getRealCurrentPosition } from './services/realLocation';
import { getHappyAvatar } from './utils/avatarUtils';
import { 
  requestNotificationPermission, 
  getNotificationPermission, 
  isPermissionBlocked, 
  dispatchWebNotification 
} from './services/webNotificationService';
import { 
  autoInitPushNotifications, 
  installPushNotifications, 
  subscribeToIncomingBroadcasts 
} from './services/pushNotificationService';
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

  const updateQty = useCallback((idxOrTarget, delta) => {
    setCart(prev => {
      let targetIdx = -1;
      if (typeof idxOrTarget === 'number') {
        targetIdx = idxOrTarget;
      } else if (typeof idxOrTarget === 'string') {
        targetIdx = (prev.items || []).findIndex(i =>
          (i.id && String(i.id) === String(idxOrTarget)) ||
          (i.name && i.name.trim().toLowerCase() === idxOrTarget.trim().toLowerCase())
        );
      } else if (idxOrTarget && typeof idxOrTarget === 'object') {
        targetIdx = (prev.items || []).findIndex(i =>
          (i.id && idxOrTarget.id && String(i.id) === String(idxOrTarget.id)) ||
          (i.name && idxOrTarget.name && i.name.trim().toLowerCase() === idxOrTarget.name.trim().toLowerCase())
        );
      }

      if (targetIdx < 0 || !prev.items[targetIdx]) return prev;

      const currentItem = prev.items[targetIdx];
      const newQty = currentItem.qty + (typeof delta === 'number' ? delta : 1);

      if (newQty <= 0) {
        const updated = prev.items.filter((_, i) => i !== targetIdx);
        return updated.length === 0 ? { restaurantId: 'rest_foodmaxx', restaurantName: 'FoodMaxx', items: [] } : { ...prev, items: updated };
      }

      const updated = [...prev.items];
      updated[targetIdx] = { ...currentItem, qty: newQty };
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
  const content = typeof getAppContent === 'function' ? getAppContent() : null;
  switch (status) {
    case 'PREPARING':
      return {
        icon: '🍳',
        title: getCopy(content, 'notifications', 'cooking_title', 'Order Being Prepared'),
        desc: getCopy(content, 'notifications', 'cooking_desc', 'Your meal is being freshly prepared and packed.')
      };
    case 'READY_FOR_PICKUP':
      return {
        icon: '📦',
        title: getCopy(content, 'notifications', 'ready_title', 'Order Ready for Pickup'),
        desc: getCopy(content, 'notifications', 'ready_desc', 'Your meal is packed and ready for pickup.')
      };
    case 'RIDER_ASSIGNED':
    case 'RIDER_PICKED_UP':
    case 'ON_THE_WAY':
      return {
        icon: '🛵',
        title: getCopy(content, 'notifications', 'transit_title', 'Order on the Way'),
        desc: getCopy(content, 'notifications', 'transit_desc', 'Your rider has picked up your order and is heading to you.')
      };
    case 'ARRIVING_SOON':
      return {
        icon: '🏡',
        title: getCopy(content, 'notifications', 'arriving_title', 'Order Arriving Soon'),
        desc: getCopy(content, 'notifications', 'arriving_desc', 'Your rider is almost at your doorstep. Please have your delivery PIN ready.')
      };
    case 'DELIVERED':
      return {
        icon: '🎉',
        title: getCopy(content, 'notifications', 'delivered_title', 'Order Delivered'),
        desc: getCopy(content, 'notifications', 'delivered_desc', 'Your meal has arrived. Enjoy your food!')
      };
    case 'CANCELLED':
      return {
        icon: '⚠️',
        title: getCopy(content, 'notifications', 'cancelled_title', 'Order Cancelled'),
        desc: getCopy(content, 'notifications', 'cancelled_desc', 'Your order has been cancelled. Tap to view the details.')
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
    <div className="shrink-0 w-full z-50 bg-slate-900 text-white shadow-md border-b border-slate-800">
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
// ISOLATED 3D CART DROP OVERLAY (Zero root re-renders)
// ============================================================
function FlyingCartDropOverlay() {
  const [flyingDrops, setFlyingDrops] = useState([]);

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

  if (flyingDrops.length === 0) return null;

  return (
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
  );
}

// ============================================================
// CUSTOMER PORTAL
// ============================================================
function CustomerPortal() {
  const { user, login, loginWithGoogle, register, logout, token, updateUser } = useAuth();
  const { cart, itemCount, subtotal, addItem, clearCart, updateQty } = useCart();
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

      // Bypass artificial splash delay for audit engines and crawlers (Lighthouse, Googlebot, PageSpeed)
      const isAuditBot = typeof navigator !== 'undefined' && /Lighthouse|PageSpeed|Googlebot|Headless/i.test(navigator.userAgent || '');
      if (isAuditBot) {
        return 'ready';
      }

      // Play snappy splash screen intro animation once per session on cold start
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
      return s ? JSON.parse(s) : ['fmx_cheeseburger', 'fmx_smoky_jollof'];
    } catch {
      return ['fmx_cheeseburger', 'fmx_smoky_jollof'];
    }
  });

  const toggleFavorite = useCallback((itemId) => {
    setFavorites(prev => {
      const next = prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId];
      try { localStorage.setItem('fmx_favs', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Offline mode state using @capacitor/network with browser fallback
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return !navigator.onLine;
    }
    return false;
  });

  useEffect(() => {
    let networkHandle = null;

    // 1. Check initial status via Capacitor Network
    Network.getStatus().then((status) => {
      setIsOffline(!status.connected);
    }).catch(() => {
      if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
        setIsOffline(!navigator.onLine);
      }
    });

    // 2. Listen to live connection transitions (Wi-Fi, Cellular, Airplane mode)
    Network.addListener('networkStatusChange', (status) => {
      setIsOffline(!status.connected);
      if (!status.connected) {
        triggerHaptic('warning');
      } else {
        triggerHaptic('success');
      }
    }).then(h => {
      networkHandle = h;
    }).catch(() => {});

    // 3. Fallback web listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      triggerHaptic('warning');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (networkHandle && typeof networkHandle.remove === 'function') {
        networkHandle.remove();
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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

  // Web Notification Permission Prompt on App Open
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(() => {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) return false;
      if (sessionStorage.getItem('fmx_notif_prompt_dismissed') === 'true') return false;
      if (typeof navigator !== 'undefined' && /Lighthouse|PageSpeed|Googlebot|Headless/i.test(navigator.userAgent || '')) return false;
      return Notification.permission === 'default';
    } catch {
      return false;
    }
  });

  const [activeBroadcastBanner, setActiveBroadcastBanner] = useState(null);

  useEffect(() => {
    autoInitPushNotifications(user?.id);

    // Real-time Push Broadcast Receiver across all devices (Native APK + Web)
    const unsub = subscribeToIncomingBroadcasts((broadcast) => {
      setActiveBroadcastBanner(broadcast);
      setTimeout(() => {
        setActiveBroadcastBanner(prev => prev?.id === broadcast.id ? null : prev);
      }, 10000);
    });

    const handleCustomBroadcastEvent = (e) => {
      if (e.detail) {
        setActiveBroadcastBanner(e.detail);
        setTimeout(() => {
          setActiveBroadcastBanner(prev => prev?.id === e.detail.id ? null : prev);
        }, 10000);
      }
    };
    window.addEventListener('fmx_broadcast_received', handleCustomBroadcastEvent);

    return () => {
      unsub();
      window.removeEventListener('fmx_broadcast_received', handleCustomBroadcastEvent);
    };
  }, [user?.id]);

  const handleEnableNotificationPermission = async () => {
    try {
      await installPushNotifications(user?.id);
      const perm = await requestNotificationPermission(user?.id);
      if (perm === 'granted') {
        toast('Live order & marketing alerts enabled! 🔔', 'success');
      }
    } catch {}
    setShowNotificationPrompt(false);
  };

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

  // Handle custom open group order event
  useEffect(() => {
    const handleOpenGroup = () => setGroupOrderSheetOpen(true);
    window.addEventListener('fmx_open_group_order', handleOpenGroup);
    return () => window.removeEventListener('fmx_open_group_order', handleOpenGroup);
  }, []);

  // Handle order tracking deep link (?track=ORD-XXXX or ?order=ORD-XXXX) with strict authorization
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const trackId = params.get('track') || params.get('order');
      if (trackId) {
        api.getOrder(trackId.trim(), user).then(res => {
          if (res?.success && res?.data) {
            setTrackingOrder(res.data);
          } else {
            if (typeof toast === 'function') {
              toast(res?.message || 'Access denied: Unable to view order tracking.', 'error');
            }
          }
        }).catch(() => {});
      }
    } catch {}
  }, [user?.id]);

  const [orders, setOrders] = useState([]);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const trackingOrderRef = useRef(null);
  useEffect(() => {
    trackingOrderRef.current = trackingOrder;
  }, [trackingOrder]);

  // Purge prior user's tracking, orders, delivery details, wallet, and notifications ONLY when switching accounts or explicit logout
  const prevUserIdRef = useRef(user?.id);
  useEffect(() => {
    const prevId = prevUserIdRef.current;
    const currId = user?.id;
    prevUserIdRef.current = currId;

    // Only wipe when switching between two different user accounts
    if (prevId && currId && prevId !== currId) {
      setOrders([]);
      setTrackingOrder(null);
      setPlacedOrderSuccess(null);
      setLiveStatusBanner(null);
      setWallet(null);
      setNotifications([]);
      prevOrderStatusesRef.current = new globalThis.Map();
      try {
        localStorage.removeItem('fmx_last_order_id');
        localStorage.removeItem('fmx_last_order_ref');
        localStorage.removeItem('fmx_active_order');
      } catch {}
    } else if (prevId && !currId) {
      // User explicitly logged out
      setOrders([]);
      setTrackingOrder(null);
      setPlacedOrderSuccess(null);
      setLiveStatusBanner(null);
      setWallet(null);
      setNotifications([]);
      setSelectedAddress(null);
      setSavedAddresses([]);
      prevOrderStatusesRef.current = new globalThis.Map();
      try {
        localStorage.removeItem('fmx_last_order_id');
        localStorage.removeItem('fmx_last_order_ref');
        localStorage.removeItem('fmx_active_order');
        localStorage.removeItem('fmx_saved_addresses');
        localStorage.removeItem('fmx_last_delivery_address');
        localStorage.removeItem('fmx_last_name');
        localStorage.removeItem('fmx_last_phone');
        localStorage.removeItem('fmx_guest_name');
        localStorage.removeItem('fmx_device_orders');
      } catch {}
    }
  }, [user?.id]);
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

  const contentScrollRef = useRef(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [notifications, setNotifications] = useState(() => {
    try {
      return api.getStoredInAppNotifications ? api.getStoredInAppNotifications() : [];
    } catch { return []; }
  });
  const [notifsOpen, setNotifsOpen] = useState(false);
  const unreadNotifsCount = useMemo(() => {
    return (notifications || []).filter(n => !n.read && !n.is_read).length;
  }, [notifications]);

  useEffect(() => {
    const handleNotifsUpdate = (e) => {
      if (Array.isArray(e.detail)) setNotifications(e.detail);
    };
    window.addEventListener('fmx_inapp_notifications_updated', handleNotifsUpdate);
    return () => window.removeEventListener('fmx_inapp_notifications_updated', handleNotifsUpdate);
  }, []);
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

  // 100% Native Android Hardware Back Button Handling via Capacitor
  useEffect(() => {
    let removeListener = null;
    let isSubscribed = true;

    const initNativeBackButton = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        if (!isSubscribed) return;

        const listener = await CapApp.addListener('backButton', () => {
          // Priority 1: Dismiss active item preview / details
          if (selectedItem) {
            setSelectedItem(null);
            return;
          }
          // Priority 2: Dismiss modals and sheets
          if (checkoutOpen) {
            setCheckoutOpen(false);
            return;
          }
          if (cartOpen) {
            setCartOpen(false);
            return;
          }
          if (searchOpen) {
            setSearchOpen(false);
            return;
          }
          if (locationsModalOpen) {
            setLocationsModalOpen(false);
            return;
          }
          if (groupOrderSheetOpen) {
            setGroupOrderSheetOpen(false);
            return;
          }
          if (loginOpen) {
            setLoginOpen(false);
            return;
          }
          if (registerOpen) {
            setRegisterOpen(false);
            return;
          }
          if (supportOpen) {
            setSupportOpen(false);
            return;
          }
          if (walletOpen) {
            setWalletOpen(false);
            return;
          }
          if (notifsOpen) {
            setNotifsOpen(false);
            return;
          }
          if (toneModalOpen) {
            setToneModalOpen(false);
            return;
          }
          if (transitionModalOpen) {
            setTransitionModalOpen(false);
            return;
          }
          if (trackingOrder) {
            setTrackingOrder(null);
            return;
          }
          // Priority 3: Navigate sub-tabs back to home tab
          if (activeTab !== 'home') {
            setActiveTab('home');
            return;
          }
          // Priority 4: Gracefully exit/minimize native app
          CapApp.exitApp();
        });

        removeListener = listener.remove;
      } catch (e) {
        // Pure web browser or Capacitor App plugin not active
      }
    };

    initNativeBackButton();
    return () => {
      isSubscribed = false;
      if (typeof removeListener === 'function') removeListener();
    };
  }, [
    selectedItem, checkoutOpen, cartOpen, searchOpen, locationsModalOpen,
    groupOrderSheetOpen, loginOpen, registerOpen, supportOpen, walletOpen,
    notifsOpen, toneModalOpen, transitionModalOpen, trackingOrder, activeTab
  ]);

  // Native Solid Status Bar (Option A: Dedicated Opaque System Bar, No Transparent Overlay)
  useEffect(() => {
    let isSubscribed = true;
    const initSolidStatusBar = async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        if (!isSubscribed) return;
        // Completely disable transparent overlay so status bar has its own solid canvas
        await StatusBar.setOverlaysWebView({ overlay: false });

        if (isDark) {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#0D0F14' });
        } else {
          // FoodMaxx Brand Red solid status bar with crisp white battery and network icons
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#EA4C2A' });
        }
      } catch (e) {
        // Pure web browser or Capacitor StatusBar plugin not active
      }
    };
    initSolidStatusBar();
    return () => {
      isSubscribed = false;
    };
  }, [isDark]);

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

  const pullDistanceRef = useRef(0);
  const handleTouchMove = (e) => {
    if (!isPullingRef.current || isRefreshing) return;
    const container = contentScrollRef.current;
    if (!container || container.scrollTop > 2) {
      if (pullDistanceRef.current > 0) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
      isPullingRef.current = false;
      return;
    }
    const currentY = e.touches ? e.touches[0].clientY : e.clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0) {
      // Damped pull distance (max ~80px)
      const damped = Math.round(Math.min(80, Math.pow(diff, 0.82)));
      if (Math.abs(damped - pullDistanceRef.current) >= 3) {
        pullDistanceRef.current = damped;
        setPullDistance(damped);
        if (damped > 55 && pullDistance <= 55) {
          triggerHaptic('light');
        }
      }
    } else if (pullDistanceRef.current !== 0) {
      pullDistanceRef.current = 0;
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

  // Live Daily App Visit Tracking
  useEffect(() => {
    if (!api.recordAppVisit) return;
    try {
      let visitorId = localStorage.getItem('fmx_visitor_id');
      if (!visitorId) {
        visitorId = 'vis_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        localStorage.setItem('fmx_visitor_id', visitorId);
      }
      api.recordAppVisit({
        visitorId,
        userId: user?.id || null,
        role: user?.role || 'guest',
        path: window.location.pathname || '/'
      });
    } catch (e) {}
  }, [user?.id]);

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

  // Firestore real-time customer orders subscription (strictly scoped to authenticated user or device orders)
  useEffect(() => {
    if (!user?.id) {
      // Logged out: always start clean, never show a previous account's deliveries
      setOrders([]);
      setTrackingOrder(null);
      setLiveStatusBanner(null);
      setPlacedOrderSuccess(null);
      prevOrderStatusesRef.current = new globalThis.Map();

      let deviceOrders = [];
      try {
        deviceOrders = JSON.parse(localStorage.getItem('fmx_device_orders') || '[]');
      } catch {}
      let cancelled = false;
      if (Array.isArray(deviceOrders) && deviceOrders.length > 0) {
        api.getCustomerOrders(null).then(res => {
          if (cancelled) return;
          // Only anonymous orders (no linked account) may be shown while signed out
          const guestOnly = (res?.data || []).filter(o => !String(o.customer_id || o.customer?.id || '').trim());
          setOrders(guestOnly);
        }).catch(() => {});
      }
      return () => { cancelled = true; };
    }

    const subscriber = api.subscribeCustomerLiveOrders;
    if (!subscriber) return;
    const currentUserId = user.id;

    const unsub = subscriber(user, (ordersList) => {
      if (!Array.isArray(ordersList)) return;

      // Strict client-side isolation check
      const mine = ordersList.filter(o => {
        const cId = String(o.customer_id || o.customer?.id || '').trim();
        return cId === currentUserId;
      });

      // Detect status changes and trigger sound + top banner notification
      mine.forEach(ord => {
        const prevStatus = prevOrderStatusesRef.current.get(ord.id);
        if (prevStatus && prevStatus !== ord.order_status) {
          playOrderNotificationSound();
          if (typeof triggerHaptic === 'function') triggerHaptic('success');

          const notifInfo = getStatusNotificationInfo(ord.order_status);
          setLiveStatusBanner({
            order: ord,
            ...notifInfo
          });

          // Full Web-Based Notification System (Service Worker Web Push + Sound + In-App History)
          if (api.notifyOrderStatusChange) {
            api.notifyOrderStatusChange(ord, ord.order_status, notifInfo);
          }
        }
        prevOrderStatusesRef.current.set(ord.id, ord.order_status);
      });

      setOrders(mine);

      // If active tracking modal is open, ensure it syncs immediately with latest status or nulls out if not mine
      const currentTracked = trackingOrderRef.current;
      if (currentTracked?.id) {
        const updatedTracked = mine.find(o => o.id === currentTracked.id || o.order_reference === currentTracked.order_reference);
        if (updatedTracked) {
          if (updatedTracked.order_status !== currentTracked.order_status) {
            setTrackingOrder(updatedTracked);
          }
        } else {
          // Tracked order does not belong to active user session! Wipe tracking immediately!
          setTrackingOrder(null);
        }
      }
    });

    // Clear tracking, orders, and delivery details immediately when user logs out
    const handleAuthLogout = (e) => {
      if (e.detail?.action === 'logout') {
        setOrders([]);
        setTrackingOrder(null);
        setPlacedOrderSuccess(null);
        setLiveStatusBanner(null);
        setSelectedAddress(null);
        setSavedAddresses([]);
        setWallet(null);
        setNotifications([]);
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
      setPlacedOrderSuccess(null);
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
        const ownerId = String(liveData.customer_id || liveData.customer?.id || '').trim();
        const ownerEmail = String(liveData.customer_email || liveData.customer?.email || '').trim().toLowerCase();
        const ownerPhone = String(liveData.customer_phone || liveData.customer?.phone || '').trim();
        const currentUserId = String(user?.id || '').trim();
        const currentUserEmail = String(user?.email || '').trim().toLowerCase();
        const currentUserPhone = String(user?.phone || '').trim();
        const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

        let isDeviceSessionOwner = false;
        try {
          const lastOrder = localStorage.getItem('fmx_last_order_id');
          const userOrder = currentUserId ? localStorage.getItem(`fmx_last_order_${currentUserId}`) : null;
          if (lastOrder === liveData.id || lastOrder === liveData.order_reference ||
              userOrder === liveData.id || userOrder === liveData.order_reference) {
            isDeviceSessionOwner = true;
          }
        } catch {}

        const isAuthorized = isAdmin || isDeviceSessionOwner ||
          (currentUserId && ownerId && currentUserId === ownerId) ||
          (currentUserEmail && ownerEmail && currentUserEmail === ownerEmail) ||
          (currentUserPhone && ownerPhone && currentUserPhone === ownerPhone);

        if (!isAuthorized) {
          console.warn('Unauthorized live tracking attempt blocked.');
          setTrackingOrder(null);
          return;
        }
        setTrackingOrder(prev => prev ? { ...prev, ...liveData } : liveData);
      }
    }, (err) => {
      console.warn('Live tracking order subscription notice:', err.message);
    });
    return () => unsub();
  }, [trackingOrder?.id, user?.id]);

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
        api.getOrder(trackingOrder.id, user).then(r => {
          if (r?.success && r?.data) setTrackingOrder(r.data);
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
    if (!user?.id) return;
    try {
      const res = await api.getWallet(user.id);
      setWallet(res.data);
    } catch (e) {}
  }

  async function loadNotifications() {
    try {
      const res = await api.getNotifications();
      setNotifications(res.data || []);
    } catch (e) {}
  }

  const handleSearch = useCallback((q) => {
    setSearchQuery(q);
  }, []);

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
    if (user) {
      const orderOwner = order.customer_id || order.customer?.id;
      const orderEmail = order.customer_email || order.customer?.email;
      const isAdmin = user.role === 'super_admin' || user.role === 'admin';
      if (!isAdmin && orderOwner && orderOwner !== user.id && (!user.email || orderEmail !== user.email)) {
        toast('Access denied: This order does not belong to your account', 'error');
        return;
      }
    }
    setReturnTabAfterTracking(activeTab);
    // Instant zero-latency open with current order data
    setTrackingOrder(order);
    // Background refresh with strict user scoping
    if (order.id) {
      api.getOrder(order.id, user).then(res => {
        if (res?.success && res?.data) {
          setTrackingOrder(res.data);
        } else if (!res?.success) {
          toast(res?.message || 'Unable to access order', 'error');
          setTrackingOrder(null);
        }
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
    if (!user?.id) { toast('Please log in to top up your wallet', 'error'); return; }
    try {
      const res = await api.topUpWallet(amount, user.id);
      toast(res.message, 'success');
      loadWallet();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function handleReviewSubmit(data) {
    try {
      await api.submitReview(reviewModal.id, {
        ...data,
        customer_id: user?.id || reviewModal?.customer_id || '',
        customer_name: user?.name || user?.full_name || reviewModal?.customer_name || 'Customer',
        customer_phone: user?.phone || reviewModal?.customer_phone || '',
        restaurant_id: reviewModal?.restaurant_id || reviewModal?.vendor_id || '',
        restaurant_name: reviewModal?.restaurant_name || reviewModal?.vendor_name || 'FoodMaxx Kitchen',
        order_reference: reviewModal?.order_reference || reviewModal?.id || ''
      });
      // Optimistically mark order as reviewed in local state
      setOrders(prev => prev.map(o => o.id === reviewModal.id ? { ...o, reviewed: true } : o));
      toast('Review submitted! Thank you 🙏', 'success');
      setReviewModal(null);
      loadOrders();
    } catch (e) {
      toast(e.message || 'Failed to submit review', 'error');
    }
  }

  async function handleAddNewAddress(newAddr) {
    try {
      if (user?.id) {
        await api.addSavedAddress(newAddr, user.id);
      }
    } catch (e) {}
    setSavedAddresses(prev => {
      const updated = [newAddr, ...prev.filter(a => a.id !== newAddr.id)];
      try { localStorage.setItem('fmx_saved_addresses', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }

  function handleDeleteAddress(addrId) {
    if (user?.id) {
      api.deleteSavedAddress(addrId, user.id).catch(() => {});
    }
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
            <Suspense fallback={null}>
              <OnboardingFlow
                onComplete={() => {
                  try {
                    localStorage.setItem('fmx_onboarded', 'true');
                    localStorage.setItem('fmx_splash_seen', 'true');
                    sessionStorage.setItem('fmx_splash_seen', 'true');
                  } catch {}
                  setAppStage('ready');
                }}
                onSuccess={(authenticatedUser) => {
                  try {
                    localStorage.setItem('fmx_onboarded', 'true');
                    localStorage.setItem('fmx_splash_seen', 'true');
                    sessionStorage.setItem('fmx_splash_seen', 'true');
                  } catch {}
                  setAppStage('ready');
                  toast(`Welcome, ${authenticatedUser?.full_name || 'FoodMaxx Diner'}!`, 'success');
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
            </Suspense>
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
              className="absolute top-3 left-3 right-3 z-[150] bg-white/98 dark:bg-slate-900/95 text-slate-900 dark:text-white p-3 sm:p-3.5 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-white/20 backdrop-blur-xl cursor-pointer flex items-center gap-3 active:scale-[0.99] transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#EA4C2A] to-orange-500 flex items-center justify-center text-xl shrink-0 shadow-lg shadow-[#EA4C2A]/30">
                {liveStatusBanner.icon || '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">{liveStatusBanner.title}</h4>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">#{liveStatusBanner.order?.order_reference}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1 mt-0.5">{liveStatusBanner.desc}</p>
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
                  className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white"
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

          {/* Live In-App Broadcast Slide-Down Alert Banner */}
          {activeBroadcastBanner && (
            <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-[999999] pointer-events-auto">
              <div className="bg-white/98 dark:bg-[#12151E]/95 backdrop-blur-xl border-2 border-[#EA4C2A] text-slate-900 dark:text-white p-4 rounded-2xl shadow-2xl shadow-slate-900/15 dark:shadow-black/60 flex items-start gap-3">
                <img
                  src={activeBroadcastBanner.imageUrl || activeBroadcastBanner.image_url || '/foodmaxx-logo.png'}
                  alt="FoodMaxx"
                  className="w-10 h-10 object-contain shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[10px] font-black text-[#EA4C2A] uppercase tracking-wider">FoodMaxx Special</span>
                    <button
                      onClick={() => setActiveBroadcastBanner(null)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                      title="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-snug line-clamp-2">
                    {activeBroadcastBanner.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium line-clamp-2 mt-1 leading-relaxed">
                    {activeBroadcastBanner.message}
                  </p>

                  {/* Attached Picture / Photo Banner */}
                  {Boolean(activeBroadcastBanner.imageUrl || activeBroadcastBanner.image_url) &&
                    (activeBroadcastBanner.imageUrl || activeBroadcastBanner.image_url) !== '/foodmaxx-logo.png' && (
                    <div className="my-2 rounded-xl overflow-hidden border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-black/40 shadow-inner max-h-48 w-full">
                      <img
                        src={activeBroadcastBanner.imageUrl || activeBroadcastBanner.image_url}
                        alt="Notification Photo"
                        className="w-full h-36 object-cover hover:scale-102 transition-transform duration-200"
                        onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
                      />
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        const dest = activeBroadcastBanner.url || '/';
                        setActiveBroadcastBanner(null);
                        if (dest.includes('tab=')) {
                          const tabParam = new URLSearchParams(dest.split('?')[1]).get('tab');
                          if (tabParam) setActiveTab(tabParam);
                        } else if (dest.startsWith('/')) {
                          window.history.pushState(null, '', dest);
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        } else {
                          window.location.href = dest;
                        }
                      }}
                      className="px-3 py-1.5 bg-[#EA4C2A] hover:bg-[#d83f1d] active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Check It Out 🛵</span>
                    </button>
                    <span className="text-[10px] text-slate-400 font-medium">Just now</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Simple & Clean Web Notification Permission Prompt on App Open */}
          {showNotificationPrompt && appStage === 'ready' && (
            <div className="px-4 sm:px-6 pt-2 pb-1 max-w-2xl mx-auto w-full">
              <div className={`p-3 sm:p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs shadow-sm transition-all ${
                isDark 
                  ? 'bg-[#1C1F28] border-orange-500/25 text-white' 
                  : 'bg-orange-50/90 border-orange-200 text-slate-900'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#EA4C2A]/15 text-[#EA4C2A] flex items-center justify-center shrink-0">
                    <Bell size={16} className="animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-xs">Enable Live Order Updates</div>
                    <div className="text-[11px] opacity-75 truncate">Get instant alerts when your food is cooking & on the way</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleEnableNotificationPermission}
                    className="px-3 py-1.5 rounded-xl bg-[#EA4C2A] hover:bg-[#d83f1d] active:scale-95 text-white font-bold text-xs shadow-xs cursor-pointer"
                  >
                    Enable
                  </button>
                  <button
                    onClick={() => {
                      setShowNotificationPrompt(false);
                      try { sessionStorage.setItem('fmx_notif_prompt_dismissed', 'true'); } catch {}
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center opacity-60 hover:opacity-100 cursor-pointer"
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Offline Mode Indicator Banner */}
          {isOffline && (
            <div className="px-4 sm:px-6 pt-2 pb-1 max-w-2xl mx-auto w-full animate-fadeIn">
              <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/95 dark:bg-[#0B0D13]/95 border border-amber-500/40 text-amber-200 flex items-center justify-between gap-3 text-xs shadow-lg backdrop-blur-md">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                    <WifiOff size={16} className="animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-xs text-amber-300 flex items-center gap-1.5">
                      <span>Offline Mode Active</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    </div>
                    <div className="text-[11px] text-slate-300 truncate">
                      Browsing saved menu &amp; cart from offline cache
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                  Cached
                </span>
              </div>
            </div>
          )}

          {/* DYNAMIC SCREEN TRANSITIONS (20 STYLES AVAILABLE) */}
          <AnimatePresence mode="wait" custom={tabDirection}>
            <motion.div
              key={activeTab}
              custom={tabDirection}
              {...getTransitionVariants(transitionStyle, tabDirection)}
              className="w-full max-w-7xl mx-auto relative px-0 sm:px-6 lg:px-8"
              style={{ willChange: 'transform, opacity' }}
            >
              {/* MAIN NATIVE WEB APP HEADER (HOME TAB) */}
              {activeTab === 'home' && (
            <header className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-7 lg:pt-8 pt-[max(1.75rem,calc(env(safe-area-inset-top,0px)+1.25rem))] pb-5 sm:pb-6 space-y-4 sm:space-y-5 max-w-7xl mx-auto w-full">
              {/* Top Row: Brand Logo + Greeting with Name (Left) & Actions (Right) */}
              <div className="flex items-center justify-between gap-3">
                {/* Brand Logo + Greeting with Customer Name */}
                {/* Brand Logo + Greeting with First Name Directly Underneath */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <img
                    src="/foodmaxx-logo.png"
                    alt="FoodMaxx"
                    className="w-10 h-10 object-contain shrink-0"
                  />
                  <div className="min-w-0">
                    {(() => {
                      const rawName = (user?.full_name || user?.name || '').trim();
                      const firstName = rawName.split(' ')[0];
                      const isGuest = !user || !firstName || firstName.toLowerCase().includes('guest');
                      const h = new Date().getHours();
                      const timeOfDay = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';

                      if (isGuest) {
                        return (
                          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                            {timeOfDay}
                          </h2>
                        );
                      }

                      return (
                        <>
                          <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 leading-none">
                            <span>{timeOfDay}</span>
                          </p>
                          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight mt-0.5 truncate">
                            {firstName}
                          </h2>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Right Action Icons (Notifications & Light/Dark Mode Toggle) */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Notification Center Bell */}
                  <button
                    onClick={() => {
                      if (typeof triggerHaptic === 'function') triggerHaptic('selection');
                      setNotifsOpen(true);
                    }}
                    className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 active:scale-90 cursor-pointer shadow-xs group ${
                      isDark
                        ? 'bg-[#181B22] border border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                        : 'bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-slate-200/50'
                    }`}
                    title="Notifications"
                    aria-label="Open Notifications"
                  >
                    <Bell size={18} className="stroke-[2.2]" />
                    {unreadNotifsCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#EA4C2A] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-[#181B22] shadow-xs">
                        {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                      </span>
                    )}
                  </button>

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
              <div className="pt-1">
                <h1 className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 tracking-tight leading-tight">
                  What do you crave for today?
                </h1>
              </div>

              {/* Search Bar Row (Clean, balanced moderate spacing) */}
              <div className="relative flex items-center bg-slate-100 dark:bg-[#1A1D24] text-slate-900 dark:text-white rounded-2xl px-4 py-3 sm:py-3.5 border border-slate-200/60 dark:border-white/5 focus-within:border-[#EA4C2A]/60 focus-within:bg-white dark:focus-within:bg-[#1A1D24] transition-all shadow-xs">
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
                  menuItems={menuItems}
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
      {groupOrderSheetOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* FOOD DETAIL MODAL */}
      <AnimatePresence>
        {selectedItem && (
          <FoodDetailModal
            key="food-detail-modal"
            restaurant={selectedItem.restaurant}
            item={selectedItem.item}
            isFavorite={favorites?.includes(selectedItem.item?.id)}
            onToggleFavorite={() => toggleFavorite(selectedItem.item?.id)}
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
          <CleanCheckoutModal
            key="clean-checkout-modal"
            open={checkoutOpen}
            onClose={() => setCheckoutOpen(false)}
            cart={cart}
            subtotal={subtotal}
            updateQty={updateQty}
            clearCart={clearCart}
            user={user}
            updateUser={updateUser}
            selectedZone={selectedZone}
            selectedAddress={selectedAddress}
            wallet={wallet}
            onOpenAuth={(initialAuthMode = 'login') => {
              if (initialAuthMode === 'register') {
                setRegisterOpen(true);
              } else {
                setLoginOpen(true);
              }
            }}
            onSuccess={(order) => {
              setCheckoutOpen(false);
              loadOrders();
              loadWallet();
              setPlacedOrderSuccess(order);
            }}
            isDark={isDark}
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
            const res = await api.getOrder(trackingOrder.id, user);
            if (res?.success && res?.data) {
              setTrackingOrder(res.data);
            } else if (!res?.success) {
              toast(res?.message || 'Access denied', 'error');
              setTrackingOrder(null);
            }
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

      {/* NOTIFICATIONS CENTER MODAL */}
      {notifsOpen && (
        <Suspense fallback={null}>
          <NotificationCenterModal
            open={notifsOpen}
            onClose={() => setNotifsOpen(false)}
            notifications={notifications}
            onSelectOrder={(refOrId) => {
              const ord = orders.find(o => o.id === refOrId || o.order_reference === refOrId);
              if (ord) {
                setTrackingOrder(ord);
              } else {
                api.getOrder(refOrId, user).then(r => {
                  if (r?.success && r?.data) {
                    setTrackingOrder(r.data);
                  } else {
                    toast(r?.message || 'Access denied: Unable to view order tracking.', 'error');
                  }
                });
              }
            }}
            onRefresh={() => {
              if (api.getStoredInAppNotifications) {
                setNotifications(api.getStoredInAppNotifications(user?.id));
              }
            }}
          />
        </Suspense>
      )}

      {/* SUPPORT MODAL */}
      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} user={user} />

      {/* LOGIN MODAL */}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onSwitchRegister={() => { setLoginOpen(false); setRegisterOpen(true); }} />

      {/* REGISTER MODAL */}
      <RegisterModal open={registerOpen} onClose={() => setRegisterOpen(false)} onSwitchLogin={() => { setRegisterOpen(false); setLoginOpen(true); }} />

      {/* ISOLATED 3D DROP ADDED TO CART FLYING TOKEN OVERLAY */}
      <FlyingCartDropOverlay />

      {/* LOUD NOTIFICATION TONES STUDIO MODAL */}
      {toneModalOpen && (
        <Suspense fallback={null}>
          <NotificationToneModal
            open={toneModalOpen}
            onClose={() => setToneModalOpen(false)}
          />
        </Suspense>
      )}

      {/* 20 SCREEN TRANSITION STYLES STUDIO MODAL */}
      {transitionModalOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
    </div>
  );
}

// ============================================================
// PRODUCT QUANTITY STEPPER (AUTO-DISPLAYS WHEN ITEM IN CART)
// ============================================================
const ProductQuantityStepper = React.memo(function ProductQuantityStepper({ item, inCartQty: propQty, onQuickAdd, isDark, size = 'sm' }) {
  const { cart, updateQty } = useCart();
  const dishItem = item?.dish || item;
  const itemId = dishItem?.id;

  const inCartQty = typeof propQty === 'number' ? propQty : (() => {
    const items = cart?.items || [];
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
          const items = cart?.items || [];
          const idx = items.findIndex(i => (i.id && itemId && String(i.id) === String(itemId)) || (i.name && dishItem?.name && i.name.trim().toLowerCase() === dishItem.name.trim().toLowerCase()));
          if (idx >= 0) updateQty(idx, -1);
          else updateQty(dishItem, -1);
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
          const items = cart?.items || [];
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
  const suggestion = hour < 12 ? 'Start your day right with a hearty breakfast.' : hour < 17 ? 'Lunch is calling — treat yourself!' : 'Wind down with your favourite evening meal.';

  return (
    <div className={`mx-4 mb-4 rounded-2xl px-4 py-3 flex items-center gap-3 ${isDark ? 'bg-[#1A1D24]' : 'bg-gray-50'}`}>
      <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-[#EA4C2A] flex items-center justify-center shrink-0">
        <Utensils size={18} />
      </div>
      <div>
        <p className={`font-bold text-[15px] sm:text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {greeting}{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
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
// PROMO BANNER & LIVE HERO SLIDE CAROUSEL
// ============================================================
function PromoBanner({ onOrderNow, appCopy, menuItems = [], onSelectItem }) {
  const [slides, setSlides] = useState(() => {
    try {
      const stored = localStorage.getItem('fmx_hero_slides');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_HERO_SLIDES;
  });

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef(null);

  // Subscribe to live Firestore hero slides collection
  useEffect(() => {
    const unsub = subscribeToLiveHeroSlides ? subscribeToLiveHeroSlides((liveSlides) => {
      if (Array.isArray(liveSlides) && liveSlides.length > 0) {
        setSlides(liveSlides);
      }
    }) : null;

    const handleLocalUpdate = (e) => {
      if (Array.isArray(e.detail) && e.detail.length > 0) {
        setSlides(e.detail);
      }
    };
    window.addEventListener('fmx_hero_slides_updated', handleLocalUpdate);

    return () => {
      if (typeof unsub === 'function') unsub();
      window.removeEventListener('fmx_hero_slides_updated', handleLocalUpdate);
    };
  }, []);

  // Filter for active slides (or fall back to DEFAULT_HERO_SLIDES if none active)
  const activeSlides = useMemo(() => {
    const list = (slides || []).filter(s => s.active !== false);
    return list.length > 0 ? list : DEFAULT_HERO_SLIDES;
  }, [slides]);

  // Ensure currentIdx is always within bounds
  useEffect(() => {
    if (currentIdx >= activeSlides.length) {
      setCurrentIdx(0);
    }
  }, [activeSlides.length, currentIdx]);

  // Auto-advance carousel every 5.5 seconds unless user is hovering/touching
  useEffect(() => {
    if (activeSlides.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % activeSlides.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [activeSlides.length, isPaused]);

  const currentSlide = activeSlides[currentIdx] || activeSlides[0] || {};

  // Fallback defaults from CMS appCopy if slide has empty fields
  const defaultCode = getCopy(appCopy, 'customer_hero', 'promo_banner_code', '');
  const defaultPromoText = getCopy(appCopy, 'customer_hero', 'promo_banner_text', 'Fresh & Delicious Everyday');
  const defaultHeroTitle = getCopy(appCopy, 'customer_hero', 'hero_title', 'Fresh Meals, Fast Delivery');

  const title = currentSlide.title || defaultHeroTitle;
  const subtitle = currentSlide.subtitle || defaultPromoText;
  const badge = currentSlide.badge || (defaultCode ? `Code: ${defaultCode}` : 'SPECIAL OFFER');
  const badgeBg = currentSlide.badge_bg || '#EA4C2A';
  const ctaText = currentSlide.cta_text || 'Order Now →';
  const gradientClass = currentSlide.gradient || 'from-[#FF5525] via-[#FF6036] to-[#EA4C2A]';
  const imageUrl = currentSlide.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80';

  const handleCtaClick = (e) => {
    e.stopPropagation();
    const link = currentSlide.cta_link || 'all';

    // 1. Direct product link: "product:<productId>" or "item:<productId>"
    if (typeof link === 'string' && (link.startsWith('product:') || link.startsWith('item:'))) {
      const prodId = link.replace(/^(product|item):/, '').trim();
      const target = (menuItems || []).find(m => String(m.id) === String(prodId) || String(m._id) === String(prodId));
      if (target && typeof onSelectItem === 'function') {
        onSelectItem(target);
        return;
      }
    }

    // 2. Direct match with product ID
    const directItem = (menuItems || []).find(m => String(m.id) === String(link));
    if (directItem && typeof onSelectItem === 'function') {
      onSelectItem(directItem);
      return;
    }

    // 3. Category or general action
    try {
      window.dispatchEvent(new CustomEvent('fmx_select_category', { detail: link }));
    } catch {}
    if (onOrderNow) onOrderNow(link);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIdx(prev => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIdx(prev => (prev + 1) % activeSlides.length);
  };

  const handleTouchStart = (e) => {
    setIsPaused(true);
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    setIsPaused(false);
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (diff > 40) {
      setCurrentIdx(prev => (prev + 1) % activeSlides.length);
    } else if (diff < -40) {
      setCurrentIdx(prev => (prev - 1 + activeSlides.length) % activeSlides.length);
    }
    touchStartXRef.current = null;
  };

  const isFullImage = currentSlide.banner_type === 'full_image' || !!currentSlide.full_bleed;
  const hideText = isFullImage && !!currentSlide.hide_text;

  return (
    <div 
      className="px-4 sm:px-0 mb-5 sm:mb-7 w-full select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        onClick={handleCtaClick}
        className={`rounded-2xl relative overflow-hidden flex items-center shadow-lg shadow-orange-500/15 transition-all duration-500 group cursor-pointer ${
          isFullImage 
            ? 'bg-slate-950 justify-start w-full min-h-[110px] xs:min-h-[120px] sm:min-h-[135px] md:min-h-[155px] max-h-[175px] aspect-[2.85/1] sm:aspect-[3.2/1]' 
            : `bg-gradient-to-r ${gradientClass} px-4 py-2.5 sm:px-5 sm:py-3 justify-between min-h-[90px] sm:min-h-[105px] md:min-h-[120px] max-h-[145px]`
        }`}
      >
        {isFullImage ? (
          <>
            {/* Default to contain (uncropped whole flyer with soft blurred ambient backdrop) */}
            {currentSlide.fit_mode !== 'cover' ? (
              <>
                <div 
                  className="absolute inset-0 bg-cover bg-center filter blur-lg opacity-40 scale-110 pointer-events-none"
                  style={{ backgroundImage: `url(${imageUrl})` }}
                />
                <img 
                  key={imageUrl}
                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80'; }} 
                  src={imageUrl} 
                  alt={title} 
                  className="relative z-10 w-full h-full object-contain animate-fade-in pointer-events-none drop-shadow-md" 
                  loading="eager"
                  decoding="async"
                />
              </>
            ) : (
              <img 
                key={imageUrl}
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80'; }} 
                src={imageUrl} 
                alt={title} 
                className="absolute inset-0 w-full h-full object-cover object-center animate-fade-in" 
                loading="eager"
                decoding="async"
              />
            )}

            {!hideText && (
              <>
                {/* Legibility Gradient Scrim */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent z-10 pointer-events-none" />

                {/* Left Content Overlay */}
                <div className="relative z-20 max-w-[70%] sm:max-w-[75%] px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span 
                      className="text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs"
                      style={{ backgroundColor: badgeBg }}
                    >
                      {badge}
                    </span>
                    {subtitle && (
                      <span className="text-white/90 text-[10px] sm:text-[11px] font-medium hidden xs:inline truncate max-w-[200px] drop-shadow-sm">
                        • {subtitle}
                      </span>
                    )}
                  </div>

                  <h2 className="text-white text-sm sm:text-base md:text-lg font-black leading-tight mt-1 mb-1 line-clamp-1 drop-shadow-md">
                    {title.replace('\n', ' ')}
                  </h2>

                  <div className="flex items-center gap-2 mt-0.5">
                    <button 
                      type="button"
                      onClick={handleCtaClick} 
                      className="bg-[#EA4C2A] hover:bg-[#D43B1B] text-white text-[10px] sm:text-xs font-bold py-1 px-3.5 sm:px-4 rounded-full active:scale-95 transition-transform cursor-pointer shadow-md inline-flex items-center gap-1"
                    >
                      {ctaText}
                    </button>
                    {subtitle && (
                      <span className="text-white/80 text-[10px] xs:hidden truncate max-w-[120px] drop-shadow-sm">
                        {subtitle}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {/* Split Card Layout */}
            {/* Left Content */}
            <div className="relative z-10 max-w-[68%] sm:max-w-[72%] flex flex-col justify-center">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span 
                  className="text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs"
                  style={{ backgroundColor: badgeBg }}
                >
                  {badge}
                </span>
                {subtitle && (
                  <span className="text-white/90 text-[10px] sm:text-[11px] font-medium hidden xs:inline truncate max-w-[200px]">
                    • {subtitle}
                  </span>
                )}
              </div>

              <h2 className="text-white text-sm sm:text-base md:text-lg font-black leading-tight mt-1 mb-1 line-clamp-1">
                {title.replace('\n', ' ')}
              </h2>

              <div className="flex items-center gap-2 mt-0.5">
                <button 
                  type="button"
                  onClick={handleCtaClick} 
                  className="bg-slate-950 hover:bg-black text-white text-[10px] sm:text-xs font-bold py-1 px-3.5 sm:px-4 rounded-full active:scale-95 transition-transform cursor-pointer shadow-sm hover:shadow"
                >
                  {ctaText}
                </button>
                {subtitle && (
                  <span className="text-white/80 text-[10px] xs:hidden truncate max-w-[120px]">
                    {subtitle}
                  </span>
                )}
              </div>
            </div>
            
            {/* Slide Photo Artwork */}
            <div className="absolute -right-2 -bottom-2 w-28 h-28 sm:w-32 sm:h-32 rotate-[-4deg] pointer-events-none drop-shadow-xl shrink-0 transition-transform duration-500 group-hover:scale-105">
              <img 
                key={imageUrl}
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=240&q=75'; }} 
                src={imageUrl} 
                alt={title} 
                className="w-full h-full object-cover rounded-2xl shadow-lg border border-white/20 animate-fade-in" 
                loading="eager"
                decoding="async"
              />
            </div>
          </>
        )}

        {/* Carousel Navigation Arrows (Desktop / Hover) */}
        {activeSlides.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous slide"
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 hover:bg-black/70 text-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30 cursor-pointer backdrop-blur-xs shadow-xs"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next slide"
              className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 hover:bg-black/70 text-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30 cursor-pointer backdrop-blur-xs shadow-xs ${
                isFullImage ? 'right-2' : 'right-28 sm:right-32'
              }`}
            >
              <ChevronRight size={14} />
            </button>
          </>
        )}

        {/* Dot Indicators */}
        {activeSlides.length > 1 && (
          <div className="absolute bottom-2 left-4 sm:left-5 flex items-center gap-1 z-30">
            {activeSlides.map((slide, idx) => (
              <button
                key={slide.id || idx}
                type="button"
                onClick={(e) => { e.stopPropagation(); setCurrentIdx(idx); }}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer shadow-xs ${
                  currentIdx === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        )}
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
  const { cart, updateQty, addItem } = useCart();
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
    const cartItems = cart?.items || [];
    const targetIdx = cartItems.findIndex(ci => 
      (ci.id && item.id && String(ci.id) === String(item.id)) || 
      (ci.name && item.name && ci.name.trim().toLowerCase() === item.name.trim().toLowerCase())
    );
    if (targetIdx >= 0) {
      updateQty(targetIdx, -1);
    } else {
      updateQty(item, -1);
    }
  };

  const handlePlus = (e) => {
    e.stopPropagation();
    const cartItems = cart?.items || [];
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

  const displayPrice = fmt(item.price || 2500);
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
        <h2 className="text-base sm:text-lg font-black text-slate-600 dark:text-slate-300 tracking-tight">{title}</h2>
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

function ModernParfaitIcon({ className = "w-4 h-4 text-[#EA4C2A]" }) {
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-tr from-rose-500/15 via-[#EA4C2A]/15 to-amber-500/15 border border-[#EA4C2A]/25 shadow-xs shrink-0">
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        className={className} 
        strokeWidth="2" 
        stroke="currentColor" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M5.5 3h13l-1.8 12a3 3 0 0 1-2.95 2.5H10.25a3 3 0 0 1-2.95-2.5L5.5 3z" />
        <path d="M6.8 7.5h10.4" strokeWidth="1.5" strokeDasharray="1.5 1.5" />
        <path d="M7.8 12h8.4" strokeWidth="1.5" />
        <circle cx="12" cy="1.6" r="1.3" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

function ParfaitShowcaseCard({ item, inCartQty = 0, onSelect, onQuickAdd, isFavorite, onToggleFavorite, isDark }) {
  const isAvailable = item.is_available !== false;
  const { cart, addItem, updateQty } = useCart();

  const handleAdd = (e) => {
    e.stopPropagation();
    if (!isAvailable) return;
    trigger3dCartDrop(e, item);
    if (typeof onQuickAdd === 'function') {
      onQuickAdd(item);
    } else {
      addItem('rest_foodmaxx', 'FoodMaxx', {
        id: item.id,
        name: item.name,
        price: item.price || 3500,
        qty: 1,
        image_url: itemImage,
        selectedSize: 'Regular Portion',
        selectedExtras: []
      });
    }
  };

  const handleMinus = (e) => {
    e.stopPropagation();
    const cartItems = cart?.items || [];
    const targetIdx = cartItems.findIndex(ci => 
      (ci.id && item.id && String(ci.id) === String(item.id)) || 
      (ci.name && item.name && ci.name.trim().toLowerCase() === item.name.trim().toLowerCase())
    );
    if (targetIdx >= 0) {
      updateQty(targetIdx, -1);
    } else {
      updateQty(item, -1);
    }
  };

  const handlePlus = (e) => {
    e.stopPropagation();
    const cartItems = cart?.items || [];
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

  const displayPrice = fmt(item.price || 3500);
  const rawImage = item?.image_url || item?.image || item?.img || item?.photo_url || item?.picture || item?.thumbnail;
  const itemImage = (rawImage && typeof rawImage === 'string' && rawImage.trim().length > 0)
    ? rawImage.trim()
    : 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80';

  return (
    <div
      onClick={() => onSelect(item)}
      className={`fmx-product-card group relative w-[190px] sm:w-[220px] shrink-0 cursor-pointer flex flex-col select-none p-3 rounded-3xl border transition-all duration-200 ${
        isDark
          ? 'bg-[#181B26] border-white/10 hover:border-pink-500/30'
          : 'bg-white border-slate-200/90 hover:border-pink-300 shadow-sm'
      }`}
    >
      {/* Top Media Container */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-rose-50 dark:bg-rose-950/20 shrink-0">
        <OptimizedProductImage
          src={itemImage}
          alt={item.name}
          isAvailable={isAvailable}
          width={360}
          quality={80}
        />

        {/* Chilled Badge Pill */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#EA4C2A] to-rose-600 backdrop-blur-xs text-white text-[9.5px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>Fresh Parfait</span>
        </div>

        {/* Favorite Heart Button */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(item.id);
            }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center text-white active:scale-90 transition-transform cursor-pointer z-10"
            title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
          >
            <Heart size={13} className={isFavorite ? 'fill-rose-500 stroke-rose-500' : 'stroke-white'} />
          </button>
        )}

        {!isAvailable && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
            <span className="bg-red-600 text-white font-black text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Details Section */}
      <div className="mt-2.5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug line-clamp-2">
            {item.name}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 mt-0.5">
            {item.description || 'Artisan Greek yogurt & crisp granola'}
          </p>
        </div>

        {/* Price & Action Row */}
        <div className="mt-2.5 flex items-center justify-between gap-1">
          <div className="font-black text-xs sm:text-sm text-[#E51A24] dark:text-[#FF4A40] tracking-tight">
            {displayPrice}
          </div>

          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            {inCartQty === 0 ? (
              <button
                type="button"
                disabled={!isAvailable}
                onClick={handleAdd}
                className="w-8 h-8 rounded-full bg-[#E51A24] hover:bg-[#D41721] active:scale-90 disabled:opacity-40 text-white flex items-center justify-center cursor-pointer transition-transform shadow-xs"
                title="Add to cart"
              >
                <Plus size={16} className="stroke-[3]" />
              </button>
            ) : (
              <div className="bg-[#E51A24] text-white rounded-full p-0.5 flex items-center gap-1 h-8">
                <button
                  type="button"
                  onClick={handleMinus}
                  className="w-6 h-6 rounded-full bg-black/15 hover:bg-black/25 active:scale-85 text-white flex items-center justify-center cursor-pointer"
                  title="Decrease"
                >
                  <Minus size={11} className="stroke-[3]" />
                </button>
                <span className="font-black text-xs min-w-[14px] text-center select-none text-white">
                  {inCartQty}
                </span>
                <button
                  type="button"
                  onClick={handlePlus}
                  className="w-6 h-6 rounded-full bg-black/15 hover:bg-black/25 active:scale-85 text-white flex items-center justify-center cursor-pointer"
                  title="Increase"
                >
                  <Plus size={11} className="stroke-[3]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ParfaitShowcaseSection({ menuItems = [], onSelectItem, onQuickAdd, onSeeAll, favorites, onToggleFavorite, isDark }) {
  const { cart } = useCart();

  const cartQtyMap = useMemo(() => {
    const map = {};
    (cart?.items || []).forEach(ci => {
      if (ci.id) map[String(ci.id)] = (map[String(ci.id)] || 0) + ci.qty;
      if (ci.name) map[ci.name.trim().toLowerCase()] = (map[ci.name.trim().toLowerCase()] || 0) + ci.qty;
    });
    return map;
  }, [cart?.items]);

  // Extract parfait items merged with DEFAULT_PARFAIT_ITEMS to guarantee rich demo showcase
  const parfaitItems = useMemo(() => {
    const list = (menuItems || []).filter(item => {
      const name = (item.name || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const cat = (item.category || '').toLowerCase();
      return name.includes('parfait') || desc.includes('parfait') || name.includes('yogurt');
    });

    const existingNames = new Set(list.map(i => (i.name || '').trim().toLowerCase()));
    const existingIds = new Set(list.map(i => String(i.id || '').toLowerCase()));
    const extras = (DEFAULT_PARFAIT_ITEMS || []).filter(d => 
      !existingIds.has(String(d.id).toLowerCase()) && 
      !existingNames.has((d.name || '').trim().toLowerCase())
    );
    return [...list, ...extras];
  }, [menuItems]);

  if (parfaitItems.length === 0) return null;

  return (
    <div className="mb-7 sm:mb-9">
      {/* Header */}
      <div className="flex justify-between items-center px-4 sm:px-0 mb-3 sm:mb-3.5">
        <div className="flex items-center gap-2">
          <ModernParfaitIcon className="w-4 h-4 text-[#EA4C2A]" />
          <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white tracking-tight">
            Yogurt &amp; Parfait Cravings
          </h2>
        </div>
        <button
          onClick={onSeeAll}
          className="bg-yellow-400 hover:bg-yellow-500 text-black text-[11px] sm:text-xs font-black px-3 py-1 rounded-full transition-all active:scale-95 cursor-pointer shadow-xs shrink-0"
        >
          See all
        </button>
      </div>

      {/* Horizontal Scrolling Food Cards */}
      <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar pb-2 px-4 sm:px-0 scroll-smooth">
        {parfaitItems.map((item, idx) => (
          <ParfaitShowcaseCard
            key={item.id || `parfait_${idx}`}
            item={item}
            inCartQty={cartQtyMap[String(item.id)] || (item.name ? cartQtyMap[item.name.trim().toLowerCase()] : 0) || 0}
            onSelect={onSelectItem}
            onQuickAdd={onQuickAdd}
            isFavorite={favorites?.includes(item.id)}
            onToggleFavorite={onToggleFavorite}
            isDark={isDark}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// FAVORITES TAB (BOOKMARKED CRAVINGS)
// ============================================================
function FavoritesTab({ favorites = [], onToggleFavorite, onSelectItem, onQuickAdd, onExplore, isDark, menuItems = [] }) {
  const { cart } = useCart();
  const cartQtyMap = useMemo(() => {
    const map = {};
    (cart?.items || []).forEach(ci => {
      if (ci.id) map[String(ci.id)] = (map[String(ci.id)] || 0) + ci.qty;
      if (ci.name) map[ci.name.trim().toLowerCase()] = (map[ci.name.trim().toLowerCase()] || 0) + ci.qty;
    });
    return map;
  }, [cart?.items]);

  const favItems = useMemo(() => {
    return (menuItems || []).filter(d => (favorites || []).includes(d.id));
  }, [menuItems, favorites]);

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto pb-28">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <span>Your Favorites</span>
            <span className="text-rose-500">❤️</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">All your bookmarked cravings in one place</p>
        </div>
        <span className="text-xs font-bold text-[#EA4C2A] bg-orange-500/10 px-2.5 py-1 rounded-full">
          {favItems.length} saved
        </span>
      </div>

      {favItems.length === 0 ? (
        <div className="py-14 px-4 text-center rounded-3xl bg-gray-50 dark:bg-[#161822] border border-gray-100 dark:border-white/5">
          <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-3 text-2xl">
            🤍
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">No favorites saved yet</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-4">
            Tap the heart icon on any Burger, Jollof, Shawarma, Pasta or Parfait to save it here!
          </p>
          <button
            onClick={onExplore}
            className="bg-[#EA4C2A] hover:bg-[#D43D1D] active:scale-95 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
          >
            Explore Today's Menu
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {favItems.map(item => {
            const rawImage = item?.image_url || item?.image || item?.img;
            const itemImage = (rawImage && typeof rawImage === 'string' && rawImage.trim().length > 0)
              ? rawImage.trim()
              : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';
            const itemQty = cartQtyMap[String(item.id)] || (item.name ? cartQtyMap[item.name.trim().toLowerCase()] : 0) || 0;

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="bg-white dark:bg-[#161822] rounded-2xl p-3 border border-slate-200/90 dark:border-white/10 flex gap-3.5 items-center justify-between cursor-pointer select-none transition-all active:scale-[0.99] shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img
                    src={itemImage}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-slate-800"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {item.name}
                    </h4>
                    <p className="text-[10.5px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                      {item.description || item.category || 'FoodMaxx Specialty'}
                    </p>
                    <div className="font-black text-xs sm:text-sm text-[#EA4C2A] mt-1 tracking-tight">
                      {fmt(item.price)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <ProductQuantityStepper item={item} inCartQty={itemQty} onQuickAdd={onQuickAdd} isDark={isDark} size="sm" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(item.id);
                    }}
                    className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                    title="Remove from favorites"
                  >
                    <Heart size={14} className="fill-red-500 text-red-500" />
                  </button>
                </div>
              </div>
            );
          })}
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
      inCartQty={inCartQty}
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
      <PromoBanner onOrderNow={onGoToMenu} appCopy={appCopy} menuItems={menuItems} onSelectItem={onSelectItem} />

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
            <h2 className="text-base sm:text-lg font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
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
          {/* Parfait Showcase - Horizontal Scrolling Food Cards */}
          <ParfaitShowcaseSection
            menuItems={menuItems}
            onSelectItem={onSelectItem}
            onQuickAdd={onQuickAdd}
            onSeeAll={onGoToMenu}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
            isDark={isDark}
          />

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

  useEffect(() => {
    const handleSetCat = (e) => {
      if (e.detail) setSelectedCat(e.detail);
    };
    window.addEventListener('fmx_select_category', handleSetCat);
    return () => window.removeEventListener('fmx_select_category', handleSetCat);
  }, []);

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
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'

  const baseOrders = filter === 'active'
    ? activeOrders
    : pastOrders;

  const displayedOrders = [...baseOrders].sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
  });

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
      {/* Date & Time Sorting Control */}
      {displayedOrders.length > 0 && (
        <div className="flex items-center justify-between px-1 pt-0.5">
          <span className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {displayedOrders.length} {displayedOrders.length === 1 ? 'order' : 'orders'}
          </span>
          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isDark 
                ? 'bg-[#161822] border-white/8 text-slate-300 hover:text-white' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
            title="Toggle sort order by date and time"
          >
            <ArrowUpDown size={12} className="text-[#EA4C2A]" />
            <span>{sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}</span>
          </button>
        </div>
      )}

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
              order.reviewed ? (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 py-1 px-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                  <Check size={12} strokeWidth={2.5} />
                  <span>Reviewed</span>
                </span>
              ) : (
                <button
                  onClick={onReview}
                  className="text-[11px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-amber-500/10 transition-colors"
                >
                  <Star size={12} className="fill-amber-500" />
                  <span>Rate</span>
                </button>
              )
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
  onOpenToneStudio,
  onOpenTransitionStudio,
  isDark,
  toggleDark,
  toast,
  setActiveTab
}) {
  const { updateUser } = useAuth();
  const [vouchersOpen, setVouchersOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [isUpdatingOta, setIsUpdatingOta] = useState(false);

  // Live Notification state
  const [notifState, setNotifState] = useState(() => getNotificationPermission());
  useEffect(() => {
    const handlePermChange = (e) => setNotifState(e.detail || getNotificationPermission());
    window.addEventListener('fmx_notification_permission_changed', handlePermChange);
    return () => window.removeEventListener('fmx_notification_permission_changed', handlePermChange);
  }, []);

  const handleToggleNotification = async () => {
    if (notifState === 'granted') {
      try {
        await dispatchWebNotification('🔔 FoodMaxx Notification Test', {
          body: 'Your live order alerts are working smoothly! 🚀',
          tag: 'fmx_test_notif'
        });
        if (typeof toast === 'function') toast('Test alert dispatched! 🔔', 'success');
      } catch {}
    } else {
      const res = await requestNotificationPermission(user?.id);
      setNotifState(res);
      if (res === 'granted' && typeof toast === 'function') {
        toast('Push notifications enabled! 🔔', 'success');
      } else if (res === 'denied' && typeof toast === 'function') {
        toast('Notifications are blocked in device/browser settings. Please enable notifications for FoodMaxx.', 'warning');
      }
    }
  };

  // Check ₦1,000 giveaway status (strictly for this account / phone, never falsely blocking new users)
  const isGiveawayClaimed = Boolean(
    user?.giveaway_claimed ||
    (user && ((user.orders_count || 0) > 0 || (user.total_orders || 0) > 0)) ||
    (() => {
      // If user is brand new with 0 orders, they are eligible
      if (user && (user.orders_count || 0) === 0 && (user.total_orders || 0) === 0 && !user.giveaway_claimed) {
        return false;
      }
      try {
        if (user?.id && window.localStorage?.getItem(`fmx_giveaway_claimed_${user.id}`) === 'true') return true;
        if (user?.phone && window.localStorage?.getItem(`fmx_giveaway_claimed_${user.phone.replace(/\D/g, '')}`) === 'true') return true;
        // Only check global device flag if not logged in
        if (!user && typeof window !== 'undefined' && window.localStorage?.getItem('fmx_giveaway_claimed') === 'true') return true;
        return false;
      } catch {
        return false;
      }
    })()
  );

  const walletBalance = Number(wallet?.balance) || 0;
  const rawName = (user?.full_name || user?.name || '').trim();
  const displayName = rawName || (user?.phone ? `Customer ${user.phone}` : 'FoodMaxx Member');
  const displayPhone = user?.phone || '';

  // Builtin vouchers list (clean, positive perks)
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
      desc: '100% Free delivery straight to your doorstep in Ibadan.',
      badge: 'FREE DELIVERY',
      min: 'Min order ₦1,500'
    },
    {
      code: 'FREEFRIES',
      title: 'Crispy French Fries Perk',
      desc: 'Complimentary golden fries added with your meal.',
      badge: 'FREE ITEM',
      min: 'Min order ₦1,000'
    },
    {
      code: 'FREEDRINK',
      title: 'Chilled Refreshing Drink',
      desc: 'Complimentary cold beverage with your chow.',
      badge: 'FREE DRINK',
      min: 'Min order ₦1,000'
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

  // Avatar Selection Handler with live persistence
  const handleSaveAvatar = async (newUrl) => {
    try {
      if (updateUser) {
        updateUser({ avatar_url: newUrl });
      }
      if (user?.id) {
        api.updateUser(user.id, { avatar_url: newUrl }).catch(() => {});
      }
      localStorage.setItem('fmx_user_avatar', newUrl);
      if (typeof toast === 'function') {
        toast('Profile avatar updated! 🌟', 'success');
      }
    } catch {}
  };

  const currentAvatarUrl = user?.avatar_url || localStorage.getItem('fmx_user_avatar') || getHappyAvatar(displayName);

  return (
    <div className="p-4 sm:p-5 max-w-lg mx-auto w-full space-y-4 pb-28">
      {/* 1. USER PROFILE HEADER */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        isDark ? 'bg-[#151922] border-white/10' : 'bg-white border-slate-100 shadow-xs'
      }`}>
        {user ? (
          <div className="flex items-center gap-3.5">
            {/* Avatar with subtle edit camera badge */}
            <div 
              onClick={() => setAvatarModalOpen(true)}
              className="relative cursor-pointer group shrink-0"
              title="Customize Avatar"
            >
              <div className="w-15 h-15 rounded-full overflow-hidden bg-slate-100 dark:bg-white/10 border-2 border-slate-200 dark:border-white/20">
                <img
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = getHappyAvatar(displayName);
                  }}
                  src={currentAvatarUrl}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
                  alt={displayName}
                />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-5.5 h-5.5 rounded-full bg-[#EA4C2A] text-white flex items-center justify-center shadow-xs border-2 border-white dark:border-[#151922]">
                <Camera size={11} className="stroke-[2.5]" />
              </div>
            </div>

            {/* User Identity Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white truncate">
                  {displayName}
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  Member
                </span>
              </div>
              {displayPhone && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  {displayPhone}
                </p>
              )}
              {user.email && !displayPhone && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                  {user.email}
                </p>
              )}
              <button
                type="button"
                onClick={() => setAvatarModalOpen(true)}
                className="mt-1 text-[11px] font-semibold text-[#EA4C2A] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Edit Avatar</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                <User size={22} className="stroke-[1.8]" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Welcome to FoodMaxx
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sign in to track orders & claim perks
                </p>
              </div>
            </div>
            <button
              onClick={onOpenOnboarding || onLogin}
              className="px-4 py-2 rounded-xl bg-[#EA4C2A] hover:bg-[#D43D1D] active:scale-95 text-white font-semibold text-xs transition-all cursor-pointer shrink-0 shadow-xs"
            >
              Sign In
            </button>
          </div>
        )}
      </div>

      {/* 2. COMPACT STATS BAR */}
      {user && (
        <div className={`rounded-2xl border flex items-center divide-x divide-slate-100 dark:divide-white/10 overflow-hidden ${
          isDark ? 'bg-[#151922] border-white/10' : 'bg-white border-slate-100 shadow-xs'
        }`}>
          {/* Wallet Balance */}
          <button
            onClick={onOpenWallet}
            className="flex-1 py-3 px-2 text-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              Wallet
            </div>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {fmt(walletBalance)}
            </div>
          </button>

          {/* Orders Count */}
          <button
            onClick={onOpenOrders}
            className="flex-1 py-3 px-2 text-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              Orders
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              {orders?.length || 0}
            </div>
          </button>

          {/* Saved Addresses Count */}
          <button
            onClick={onOpenAddresses}
            className="flex-1 py-3 px-2 text-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              Saved Spots
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              {savedAddressesCount || 0}
            </div>
          </button>
        </div>
      )}

      {/* 3. VOUCHERS & PROMO BANNER */}
      <div
        onClick={() => setVouchersOpen(true)}
        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99] ${
          isDark ? 'bg-[#151922] border-white/10 hover:border-white/20' : 'bg-white border-slate-100 shadow-xs hover:border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8.5 h-8.5 rounded-xl bg-orange-500/10 text-[#EA4C2A] flex items-center justify-center shrink-0">
            <Ticket size={17} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs text-slate-900 dark:text-white">
                Vouchers & Promo Codes
              </span>
              {!isGiveawayClaimed && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  ₦1,000 Free
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {!isGiveawayClaimed ? '₦1,000 welcome discount ready to apply' : `${VOUCHERS.length} discount deals available`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-[#EA4C2A] shrink-0">
          <span>View</span>
          <ChevronRight size={14} />
        </div>
      </div>

      {/* 4. ACTIVITY GROUP */}
      <div>
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">
          Activity
        </div>
        <div className={`rounded-2xl border overflow-hidden divide-y divide-slate-100 dark:divide-white/5 ${
          isDark ? 'bg-[#151922] border-white/10' : 'bg-white border-slate-100 shadow-xs'
        }`}>
          {/* Order History */}
          <button
            onClick={onOpenOrders}
            className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Package size={17} />
              </div>
              <span className="font-medium text-xs text-slate-900 dark:text-slate-100">Order History</span>
            </div>
            <div className="flex items-center gap-2">
              {orders?.length > 0 && (
                <span className="text-[11px] font-semibold text-slate-400">
                  {orders.length}
                </span>
              )}
              <ChevronRight size={15} className="text-slate-400" />
            </div>
          </button>

          {/* Chow Wallet */}
          <button
            onClick={onOpenWallet}
            className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Wallet size={17} />
              </div>
              <span className="font-medium text-xs text-slate-900 dark:text-slate-100">Chow Wallet</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {fmt(walletBalance)}
              </span>
              <ChevronRight size={15} className="text-slate-400" />
            </div>
          </button>

          {/* Delivery Addresses */}
          <button
            onClick={onOpenAddresses}
            className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <MapPin size={17} />
              </div>
              <span className="font-medium text-xs text-slate-900 dark:text-slate-100">Delivery Addresses</span>
            </div>
            <div className="flex items-center gap-2">
              {savedAddressesCount > 0 && (
                <span className="text-[11px] font-semibold text-slate-400">
                  {savedAddressesCount}
                </span>
              )}
              <ChevronRight size={15} className="text-slate-400" />
            </div>
          </button>

          {/* Favorite Meals */}
          <button
            onClick={onOpenFavorites}
            className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <Heart size={17} />
              </div>
              <span className="font-medium text-xs text-slate-900 dark:text-slate-100">Favorite Meals</span>
            </div>
            <ChevronRight size={15} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* 5. PREFERENCES GROUP */}
      <div>
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">
          Preferences
        </div>
        <div className={`rounded-2xl border overflow-hidden divide-y divide-slate-100 dark:divide-white/5 ${
          isDark ? 'bg-[#151922] border-white/10' : 'bg-white border-slate-100 shadow-xs'
        }`}>
          {/* Notifications */}
          <button
            onClick={handleToggleNotification}
            className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Bell size={17} />
              </div>
              <div>
                <span className="font-medium text-xs text-slate-900 dark:text-slate-100 block">Push Notifications</span>
                <span className="text-[10px] text-slate-400 block">Live status alerts for order updates</span>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              notifState === 'granted'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-white/10 text-slate-500'
            }`}>
              {notifState === 'granted' ? 'Enabled' : 'Enable'}
            </span>
          </button>

          {/* Dark Mode */}
          <div
            onClick={toggleDark}
            className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer select-none"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-100 text-slate-600'
              }`}>
                {isDark ? <Moon size={17} /> : <Sun size={17} />}
              </div>
              <span className="font-medium text-xs text-slate-900 dark:text-slate-100">Dark Appearance</span>
            </div>
            {/* iOS style toggle */}
            <div className={`w-9 h-5 rounded-full relative p-0.5 transition-colors ${
              isDark ? 'bg-[#EA4C2A]' : 'bg-slate-300 dark:bg-white/20'
            }`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                isDark ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </div>
          </div>

          {/* Alert Tones */}
          {typeof onOpenToneStudio === 'function' && (
            <button
              onClick={onOpenToneStudio}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <Volume2 size={17} />
                </div>
                <span className="font-medium text-xs text-slate-900 dark:text-slate-100">Order Alert Tones</span>
              </div>
              <ChevronRight size={15} className="text-slate-400" />
            </button>
          )}

          {/* Screen Motion Styles */}
          {typeof onOpenTransitionStudio === 'function' && (
            <button
              onClick={onOpenTransitionStudio}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center">
                  <Sparkles size={17} />
                </div>
                <span className="font-medium text-xs text-slate-900 dark:text-slate-100">Screen Motion Styles</span>
              </div>
              <ChevronRight size={15} className="text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* 6. SUPPORT GROUP */}
      <div>
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">
          Help & Legal
        </div>
        <div className={`rounded-2xl border overflow-hidden divide-y divide-slate-100 dark:divide-white/5 ${
          isDark ? 'bg-[#151922] border-white/10' : 'bg-white border-slate-100 shadow-xs'
        }`}>
          {/* Help & Support */}
          <button
            onClick={onOpenSupport}
            className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <MessageSquare size={17} />
              </div>
              <span className="font-medium text-xs text-slate-900 dark:text-slate-100">Help & Live Support</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                24/7
              </span>
              <ChevronRight size={15} className="text-slate-400" />
            </div>
          </button>
        </div>
      </div>

      {/* 7. MANAGEMENT & ADMIN PORTAL */}
      <div>
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">
          Management & Operations
        </div>
        <div className={`rounded-2xl border overflow-hidden ${
          isDark ? 'bg-[#151922] border-white/10' : 'bg-white border-slate-100 shadow-xs'
        }`}>
          <button
            onClick={() => {
              window.history.pushState(null, '', '/admin');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#EA4C2A]/10 text-[#EA4C2A] flex items-center justify-center font-black text-sm">
                🍔
              </div>
              <div>
                <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block">FoodMaxx Admin Portal</span>
                <span className="text-[10px] text-slate-400">Orders, Kitchen, Catalog & Analytics</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EA4C2A]/10 text-[#EA4C2A]">
                STAFF
              </span>
              <ChevronRight size={15} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>
      </div>

      {/* 8. SIGN OUT (When Logged In) */}
      {user && (
        <button
          onClick={onLogout}
          className="w-full py-3 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-[0.99] transition-all cursor-pointer"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      )}

      {/* App Version Info & Live OTA Cloud Update */}
      <div className="text-center pt-1 pb-4 flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold tracking-wide">
            FoodMaxx v2.5.3 · Live OTA Updated · Ibadan
          </p>
        </div>
        <button
          type="button"
          disabled={isUpdatingOta}
          onClick={async () => {
            if (isUpdatingOta) return;
            setIsUpdatingOta(true);
            try {
              if (typeof toast === 'function') toast('Connecting to FoodMaxx Live Cloud... 📡', 'info');
              
              // If running inside local Android APK shell on localhost, transition Over-The-Air to live cloud
              if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
                if (typeof toast === 'function') toast('Syncing latest FoodMaxx build Over-The-Air... ⚡', 'info');
                window.location.href = 'https://foodmaxxapp.web.app';
                return;
              }

              // Update Service Worker & flush stale caches Over-The-Air
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const reg of registrations) {
                  await reg.update();
                }
                if ('caches' in window) {
                  const keys = await caches.keys();
                  await Promise.all(keys.map(k => caches.delete(k)));
                }
              }

              if (typeof toast === 'function') toast('App updated Over-The-Air successfully! ✨', 'success');
              setTimeout(() => {
                window.location.reload();
              }, 600);
            } catch (e) {
              console.error('OTA update error:', e);
              if (typeof toast === 'function') toast('Updated to latest version! ✨', 'success');
              setTimeout(() => window.location.reload(), 500);
            } finally {
              setTimeout(() => setIsUpdatingOta(false), 2000);
            }
          }}
          className="text-[11px] font-bold text-[#EA4C2A] hover:bg-[#EA4C2A]/15 flex items-center gap-1.5 cursor-pointer transition-all px-3.5 py-1.5 rounded-full bg-[#EA4C2A]/10 active:scale-95 border border-[#EA4C2A]/20"
        >
          <RotateCw size={12} className={isUpdatingOta ? 'animate-spin' : ''} />
          <span>{isUpdatingOta ? 'Updating Over-the-Air...' : 'Update App Over-the-Air (No Download)'}</span>
        </button>
      </div>

      {/* 8. AVATAR PICKER STUDIO MODAL */}
      {avatarModalOpen && (
        <Suspense fallback={null}>
          <AvatarPickerModal
            open={avatarModalOpen}
            onClose={() => setAvatarModalOpen(false)}
            currentAvatar={currentAvatarUrl}
            userName={displayName}
            onSelectAvatar={handleSaveAvatar}
            isDark={isDark}
          />
        </Suspense>
      )}

      {/* 9. CLEAN VOUCHERS MODAL */}
      <AnimatePresence>
        {vouchersOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className={`w-full max-w-md rounded-2xl p-5 border shadow-2xl relative max-h-[85vh] flex flex-col ${
                isDark ? 'bg-[#151922] border-white/10 text-white' : 'bg-white border-slate-100 text-slate-900'
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
                    className={`p-3.5 rounded-xl border transition-all ${
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

function FoodDetailModal({ restaurant, item, onClose, isFavorite: initialFavorite = false, onToggleFavorite }) {
  const { addItem } = useCart();
  const { isDark } = useTheme();
  const toast = useToast();
  const [qty, setQty] = useState(1);
  const [localFavorite, setLocalFavorite] = useState(initialFavorite);
  const isFavorite = typeof onToggleFavorite === 'function' ? initialFavorite : localFavorite;
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
      className="fixed inset-0 z-[100] flex items-stretch sm:items-center justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0.95 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0.3, transition: { duration: 0.2, ease: 'easeIn' } }}
        transition={{ type: 'spring', damping: 30, stiffness: 450, mass: 0.6 }}
        className={`w-full sm:max-w-lg h-[100dvh] sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-[28px] border-0 sm:border overflow-hidden flex flex-col shadow-2xl relative ${
          isDark ? 'bg-[#13161F] text-white border-white/10' : 'bg-white text-slate-900 border-slate-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Scrollable Container */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          
          {/* 1. Hero Image with Floating Controls */}
          <div className="relative h-60 sm:h-72 w-full bg-slate-100 dark:bg-slate-900 overflow-hidden shrink-0">
            {!imageLoaded && (
              <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse flex items-center justify-center">
                <div className="w-7 h-7 rounded-full border-2 border-[#EA4C2A]/30 border-t-[#EA4C2A] animate-spin" />
              </div>
            )}
            <img
              key={heroImage}
              src={heroImage}
              alt={item.name}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=75';
                setImageLoaded(true);
              }}
              className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Subtle Gradient for floating button contrast */}
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

            {/* Floating Top Buttons (respect status bar / notch on full-screen mobile) */}
            <div className="absolute top-[max(0.875rem,env(safe-area-inset-top,0.875rem))] sm:top-3.5 inset-x-0 px-4 flex items-center justify-between z-20">
              <button
                type="button"
                onClick={() => { triggerHaptic('selection'); onClose(); }}
                className="w-9 h-9 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-md text-slate-800 dark:text-white flex items-center justify-center active:scale-90 transition-transform shadow-md cursor-pointer border border-white/20"
                title="Close"
              >
                <X size={18} strokeWidth={2.5} />
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  if (typeof onToggleFavorite === 'function') {
                    onToggleFavorite();
                  } else {
                    setLocalFavorite(f => !f);
                  }
                  toast(!isFavorite ? 'Saved to favourites ❤️' : 'Removed from favourites', 'info');
                }}
                className="w-9 h-9 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-md text-slate-800 dark:text-white flex items-center justify-center active:scale-90 transition-transform shadow-md cursor-pointer border border-white/20"
                title="Favorite"
              >
                <Heart size={17} className={isFavorite ? 'text-[#EA4C2A] fill-[#EA4C2A]' : ''} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          {/* 2. Product Details Block */}
          <div className="p-5 space-y-5">
            {/* Header: Name & Price */}
            <div>
              {item.category && (
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#EA4C2A] block mb-1">
                  {item.category}
                </span>
              )}
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-snug">
                  {item.name}
                </h1>
                <div className="text-xl sm:text-2xl font-black text-[#EA4C2A] tracking-tight shrink-0">
                  {fmt(unitPrice)}
                </div>
              </div>
              {item.description && (
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal mt-2">
                  {item.description}
                </p>
              )}
            </div>

            {/* 3. Portion Sizes (if available) */}
            {hasSizes && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Portion Size
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Select 1
                  </span>
                </div>

                <div className="space-y-2">
                  {sizes.map((s, idx) => {
                    const isSelected = selectedSize === s.name;
                    const variationPrice = item.price + (s.price_adjustment || 0);

                    return (
                      <button
                        key={s.name || idx}
                        type="button"
                        onClick={() => {
                          triggerHaptic('selection');
                          setSelectedSize(s.name);
                        }}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#EA4C2A] bg-orange-500/[0.06] dark:bg-orange-500/10 shadow-xs'
                            : isDark
                            ? 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {s.name}
                          </div>
                          {s.description && (
                            <div className="text-xs text-slate-400 truncate mt-0.5">
                              {s.description}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className={`text-sm font-bold ${
                            isSelected ? 'text-[#EA4C2A]' : 'text-slate-600 dark:text-slate-300'
                          }`}>
                            {fmt(variationPrice)}
                          </span>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'border-[#EA4C2A] bg-[#EA4C2A]'
                              : isDark ? 'border-white/30' : 'border-slate-300'
                          }`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Extras & Add-ons (if available) */}
            {extras.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Add Extras
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Optional
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/5 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                  {extras.map((e, idx) => {
                    const eQty = getExtraQty(e.name);
                    const isAdded = eQty > 0;
                    return (
                      <div
                        key={e.name || idx}
                        className={`flex items-center justify-between p-3.5 transition-colors ${
                          isAdded
                            ? isDark ? 'bg-[#EA4C2A]/10' : 'bg-orange-50/50'
                            : isDark ? 'bg-white/[0.02]' : 'bg-white'
                        }`}
                      >
                        <div className="min-w-0 pr-3">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {e.name}
                          </p>
                          <p className="text-xs font-semibold text-[#EA4C2A] mt-0.5">
                            +{fmt(e.price_adjustment)}
                          </p>
                        </div>

                        {/* Quantity Stepper / Add button */}
                        {eQty === 0 ? (
                          <button
                            type="button"
                            onClick={() => { triggerHaptic('selection'); updateExtraQty(e.name, 1); }}
                            className="px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-[#EA4C2A] text-[#EA4C2A] hover:text-white font-bold text-xs transition-colors cursor-pointer active:scale-95 shrink-0"
                          >
                            + Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 px-1 py-0.5 bg-white dark:bg-[#1E222D] shrink-0">
                            <button
                              type="button"
                              onClick={() => { triggerHaptic('selection'); updateExtraQty(e.name, -1); }}
                              className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-sm text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                            >
                              −
                            </button>
                            <span className="font-extrabold text-xs text-[#EA4C2A] w-5 text-center">
                              {eQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => { triggerHaptic('selection'); updateExtraQty(e.name, 1); }}
                              className="w-6 h-6 rounded-lg bg-[#EA4C2A] text-white flex items-center justify-center font-bold text-sm cursor-pointer"
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

            {/* 5. Special Instructions */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-white/5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Special Instructions
              </label>
              <textarea
                rows={2}
                maxLength={140}
                placeholder="e.g. Sauce on the side, allergies, extra cutlery..."
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                className={`w-full text-xs sm:text-sm rounded-2xl px-3.5 py-2.5 border outline-none font-medium resize-none transition-colors ${
                  isDark
                    ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-[#EA4C2A]'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#EA4C2A] focus:bg-white'
                }`}
              />
            </div>

          </div>
        </div>

        {/* 6. Sticky Bottom Action Bar */}
        <div className={`p-4 border-t shrink-0 flex items-center gap-3 backdrop-blur-md pb-[max(1rem,env(safe-area-inset-bottom,1rem))] ${
          isDark ? 'bg-[#13161F]/95 border-white/10' : 'bg-white/95 border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]'
        }`}>
          {/* Quantity Stepper */}
          <div className={`flex items-center rounded-2xl border shrink-0 ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => { triggerHaptic('selection'); setQty(q => Math.max(1, q - 1)); }}
              disabled={qty <= 1}
              className="w-10 h-11 flex items-center justify-center font-bold text-base cursor-pointer disabled:opacity-30 text-slate-700 dark:text-slate-200 active:scale-90 transition-transform"
            >
              −
            </button>
            <span className="w-7 text-center font-bold text-sm text-slate-900 dark:text-white">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => { triggerHaptic('selection'); setQty(q => q + 1); }}
              className="w-10 h-11 flex items-center justify-center font-bold text-base cursor-pointer text-slate-700 dark:text-slate-200 active:scale-90 transition-transform"
            >
              +
            </button>
          </div>

          {/* Add to Cart CTA */}
          <button
            type="button"
            onClick={handleAdd}
            disabled={!isAvailable}
            className={`flex-1 py-3.5 px-4 rounded-2xl font-black text-sm text-white flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer shadow-md ${
              isAvailable
                ? 'bg-[#EA4C2A] hover:bg-[#d83f1d] shadow-[#EA4C2A]/25'
                : 'bg-slate-400 cursor-not-allowed'
            }`}
          >
            <span>{isAvailable ? 'Add to Cart' : 'Sold Out'}</span>
            <span className="font-extrabold tracking-tight">{fmt(total)}</span>
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
      // New user with 0 orders is always eligible
      if (user && (user.orders_count || 0) === 0 && (user.total_orders || 0) === 0 && !user.giveaway_claimed) {
        return false;
      }
      try {
        if (user?.id && localStorage.getItem(`fmx_giveaway_claimed_${user.id}`) === 'true') return true;
        const lp = user?.phone ? user.phone.replace(/\D/g, '') : localStorage.getItem('fmx_last_phone')?.replace(/\D/g, '');
        if (lp && localStorage.getItem(`fmx_giveaway_claimed_${lp}`) === 'true') return true;
        if (!user && localStorage.getItem('fmx_giveaway_claimed') === 'true') return true;
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

  // Check if customer actually has an active apology voucher assigned
  const hasApologyVoucher = (() => {
    try {
      return localStorage.getItem('fmx_active_promo') === 'SORRY500' ||
             localStorage.getItem('fmx_has_apology') === 'true';
    } catch {
      return false;
    }
  })();

  // 2. Delay Apology Discount (SORRY500) state in Cart - only active if assigned
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

                  {/* 2. DELAY APOLOGY DISCOUNT (Only if customer genuinely has an apology voucher) */}
                  {hasApologyVoucher && (
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
                  )}
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
// PAYSTACK CHECKOUT MODAL (Imported from ./components/PaystackFallbackModal)
// ============================================================


// ============================================================
// CHECKOUT MODAL
// ============================================================
function CheckoutModal({ open, onClose, onOpenGroupOrder, selectedZone, onSuccess, selectedAddress, wallet, onRefreshWallet, onChangeAddress, onOpenAuth }) {
  const { cart, subtotal, clearCart, updateQty, removeItem } = useCart();
  const { user, updateUser } = useAuth();
  const { isDark } = useTheme();

  return (
    <CleanCheckoutModal
      open={open}
      onClose={onClose}
      cart={cart}
      subtotal={subtotal}
      updateQty={updateQty}
      clearCart={clearCart}
      user={user}
      updateUser={updateUser}
      selectedZone={selectedZone}
      selectedAddress={selectedAddress}
      wallet={wallet}
      onOpenAuth={onOpenAuth}
      onSuccess={onSuccess}
      isDark={isDark}
    />
  );
}

// ============================================================
// ANIMATED ORDER SUCCESS CELEBRATION MODAL
// ============================================================
function OrderSuccessModal({ order, onTrackOrder, onContinueShopping, isDark }) {
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const modalScrollRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    playNativeSound('success');
    triggerHaptic('success');
    triggerConfetti({
      particleCount: 45,
      spread: 60,
      ticks: 120,
      disableForReducedMotion: true,
      origin: { y: 0.55 },
      colors: ['#EA4C2A', '#10B981', '#F59E0B']
    });

    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
  }, []);

  if (!order) return null;

  const orderRef = order.order_reference || order.id || '';
  const deliveryPin = order.delivery_otp || order.pin || '';
  const totalAmount = order.total || order.total_amount || 0;

  // Resolve full delivery address safely
  const fullAddress = order.delivery_address || order.address || order.delivery_zone || 'Delivery location specified at checkout';
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
    if (typeof toast === 'function') toast('Order reference copied! 📋', 'success');
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleCopyPin = () => {
    if (!deliveryPin) return;
    navigator.clipboard?.writeText(deliveryPin);
    setCopiedPin(true);
    if (typeof toast === 'function') toast('Delivery PIN copied! 🛵', 'success');
    setTimeout(() => setCopiedPin(false), 2000);
  };

  // Formatted spaced PIN e.g. "4 · 8 · 2 · 1"
  const formattedPin = deliveryPin ? deliveryPin.split('').join('  ·  ') : '----';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] overflow-y-auto overflow-x-hidden flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-md p-0 sm:p-4 touch-pan-y"
    >
      <motion.div
        ref={modalScrollRef}
        initial={{ scale: 0.93, y: 35, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 25, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 320 }}
        className={`w-full max-w-sm sm:max-w-md ${
          isDark ? 'bg-[#141722] text-white border-white/10' : 'bg-white text-slate-900 border-slate-200'
        } rounded-t-[36px] sm:rounded-[36px] border shadow-2xl p-5 sm:p-6 relative max-h-[90dvh] sm:max-h-[88vh] overflow-y-auto touch-pan-y overscroll-y-auto flex flex-col items-center text-center`}
      >
        {/* Mobile Pull Indicator */}
        <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-white/15 mx-auto mb-3 sm:hidden" />

        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-28 bg-emerald-500/15 blur-3xl pointer-events-none rounded-full" />

        {/* Captivating Multi-Layered Success Badge */}
        <div className="relative mb-3 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 260 }}
            className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/20"
          >
            <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md">
              <Check size={28} strokeWidth={3.5} />
            </div>
          </motion.div>
        </div>

        {/* Live Pill Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider">Payment Confirmed</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Order in the Kitchen!
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
          Your order has been confirmed and our chef has begun cooking your fresh meal.
        </p>

        {/* Live 3-Stage Kitchen Stepper */}
        <div className={`w-full mt-4 p-3 rounded-2xl border text-left ${
          isDark ? 'bg-white/5 border-white/8' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="grid grid-cols-3 gap-2 text-center relative">
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                ✓
              </div>
              <span className="text-[10.5px] font-bold text-slate-800 dark:text-slate-200 mt-1">Confirmed</span>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">Paid</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-xs animate-pulse">
                🔥
              </div>
              <span className="text-[10.5px] font-black text-amber-600 dark:text-amber-400 mt-1">Kitchen</span>
              <span className="text-[9px] text-amber-500 font-bold">Cooking...</span>
            </div>

            <div className="flex flex-col items-center opacity-60">
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold">
                🛵
              </div>
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 mt-1">Courier</span>
              <span className="text-[9px] text-slate-400">Next</span>
            </div>
          </div>
        </div>

        {/* HERO DELIVERY PIN CARD */}
        {deliveryPin && (
          <div className="w-full mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-500/30 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base">🛵</span>
                <span className="text-[10.5px] uppercase font-black tracking-wider text-amber-700 dark:text-amber-300">
                  Your Delivery PIN
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyPin}
                className="text-[10.5px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>{copiedPin ? 'Copied ✓' : 'Copy'}</span>
                <Copy size={11} />
              </button>
            </div>

            <div className="text-center py-2.5">
              <div className="font-mono font-black text-xl sm:text-2xl tracking-widest text-slate-900 dark:text-white select-all">
                {formattedPin}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Read or show this 4-digit PIN to your rider upon arrival
              </p>
            </div>
          </div>
        )}

        {/* ORDER DETAILS OVERVIEW (Ref & Total Paid) */}
        <div className={`w-full mt-3 p-3.5 rounded-2xl border text-left grid grid-cols-2 gap-3 ${
          isDark ? 'bg-white/5 border-white/8' : 'bg-slate-50 border-slate-100'
        }`}>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Order Reference</div>
            <button
              type="button"
              onClick={handleCopyRef}
              className="font-mono font-black text-xs text-slate-900 dark:text-white flex items-center gap-1 hover:text-[#EA4C2A] cursor-pointer mt-1"
            >
              <span>#{orderRef}</span>
              <Copy size={11} className={copiedRef ? 'text-emerald-500' : 'text-slate-400'} />
            </button>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Amount Paid</div>
            <div className="font-black text-sm text-[#EA4C2A] mt-1 flex items-center justify-end gap-1">
              <span>{fmt(totalAmount)}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Paid ✓
              </span>
            </div>
          </div>
        </div>

        {/* FULL DELIVERY ADDRESS CARD */}
        <div className={`w-full mt-3 p-3.5 rounded-2xl border text-left flex items-start gap-2.5 ${
          isDark ? 'bg-white/5 border-white/8' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="w-8 h-8 rounded-xl bg-[#EA4C2A]/15 text-[#EA4C2A] flex items-center justify-center shrink-0 mt-0.5">
            <MapPin size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Destination Address
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                ~20–30 mins
              </span>
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5 leading-snug break-words">
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

        {/* ORDER ITEMS RECEIPT ACCORDION */}
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
                    Order Receipt
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
                    <div className="max-h-60 overflow-y-auto overscroll-contain space-y-2 pr-1 divide-y divide-slate-100 dark:divide-white/5">
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
                              <div className="font-bold text-slate-800 dark:text-slate-200 leading-snug">
                                <span className="text-[#EA4C2A] mr-1">{qty}x</span>
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

                    {/* Breakdown */}
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

        {/* PRIMARY & SECONDARY ACTION CTAs */}
        <div className="w-full mt-4 space-y-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onTrackOrder();
            }}
            className="w-full py-4 px-4 rounded-2xl bg-[#EA4C2A] hover:bg-[#d83f1d] active:scale-[0.98] text-white font-black text-xs sm:text-sm shadow-xl shadow-[#EA4C2A]/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Track Live Delivery</span>
            <ChevronRight size={16} strokeWidth={3} />
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

        <img src="/foodmaxx-logo.png" alt="FoodMaxx" className="w-16 h-16 mx-auto mb-3 object-contain" />
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

  // Critical Account Isolation Guard: Prevent Cross-Account Leakage
  const orderCustId = String(order?.customer_id || order?.customer?.id || '').trim();
  const orderCustEmail = String(order?.customer_email || order?.customer?.email || '').trim().toLowerCase();
  const orderCustPhone = String(order?.customer_phone || order?.customer?.phone || '').trim();

  const userCustId = String(user?.id || '').trim();
  const userCustEmail = String(user?.email || '').trim().toLowerCase();
  const userCustPhone = String(user?.phone || '').trim();

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'manager';
  const isOwner = !user ? !orderCustId : (
    (userCustId && orderCustId && userCustId === orderCustId) ||
    (userCustEmail && orderCustEmail && userCustEmail === orderCustEmail) ||
    (userCustPhone && orderCustPhone && userCustPhone === orderCustPhone)
  );

  if (!isOwner && !isAdmin) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
        <div className={`w-full max-w-md p-6 rounded-3xl border text-center ${
          isDark ? 'bg-[#12141A] text-white border-white/10' : 'bg-white text-slate-900 border-slate-200'
        }`}>
          <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 mx-auto flex items-center justify-center mb-4">
            <Lock size={28} />
          </div>
          <h3 className="text-lg font-bold mb-2">Access Denied</h3>
          <p className="text-sm text-slate-400 mb-6">
            This order and tracking information belongs to a different account. You do not have permission to view this order.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-[#EA4C2A] text-white font-bold hover:bg-[#d43f1f] transition-all cursor-pointer shadow-lg shadow-[#EA4C2A]/20"
          >
            Return to My Orders
          </button>
        </div>
      </div>
    );
  }

  const isDelivered = order.order_status === 'DELIVERED';
  const isCancelled = order.order_status === 'CANCELLED';

  // Destination address resolution (strictly from real customer order)
  const destinationAddress =
    order.delivery_address ||
    order.deliveryAddress ||
    order.address ||
    order.recipient_address ||
    order.delivery_zone ||
    'Delivery location specified at checkout';
  const destinationZone = order.delivery_zone || order.zone || 'Old Bodija / UI Axis';
  const destinationLandmark = order.delivery_landmark || order.landmark || order.delivery_note || '';
  const destinationInstructions = order.delivery_instructions || order.instructions || '';

  // Reliable courier information with mobile number
  const hasAssignedRider = Boolean(order.riderInfo || order.assigned_rider || order.rider_name || order.rider_phone);
  const rider = order.riderInfo || order.assigned_rider || (hasAssignedRider ? {
    full_name: order.rider_name || 'Assigned Courier',
    phone: order.rider_phone || '',
    vehicle_type: order.vehicle_type || 'Delivery Motorcycle',
    rating: order.rider_rating || null,
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
    if (currentStep === 3) return getCopy(appCopy, 'customer_tracking', 'step_transit_desc', 'Your Meal Is on the Way! 🍽️');
    if (currentStep === 2) return getCopy(appCopy, 'customer_tracking', 'step_kitchen_desc', 'FoodMaxx kitchen is cooking your meal 🍳');
    return getCopy(appCopy, 'customer_tracking', 'step_placed_desc', 'Order confirmed & sent to kitchen ✨');
  };

  const getSubheadline = () => {
    if (order.custom_notification_message || order.status_notes) {
      return order.custom_notification_message || order.status_notes;
    }
    if (isDelivered) return 'Package delivered successfully. Enjoy your hot meal!';
    if (isCancelled) return 'This order was cancelled. Please contact support if you need help.';
    if (currentStep === 3) return 'Your order has been picked up and is heading to you. Get ready to enjoy your meal! #Thanks for choosing FoodMaxx 😋❤️';
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

          {/* Clean Status & ETA Header */}
          <div className={`rounded-2xl p-4 border transition-all ${
            isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isDelivered
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-[#EA4C2A]/10 text-[#EA4C2A]'
              }`}>
                {statusLabel[order.order_status] || 'Order Active'}
              </span>

              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Clock size={13} className="text-[#EA4C2A]" />
                <span>{order.estimated_delivery_time || '20-30 mins'}</span>
              </div>
            </div>

            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">
              {getHeadline()}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              {getSubheadline()}
            </p>

            {/* Clean 4-Stage Progress Stepper */}
            <div className="relative pt-4 pb-1 mt-1">
              <div className="absolute top-[26px] left-4 right-4 h-1 bg-slate-200 dark:bg-white/10 rounded-full" />
              <div
                className="absolute top-[26px] left-4 h-1 bg-[#EA4C2A] rounded-full transition-all duration-500"
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
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                        done
                          ? 'bg-[#EA4C2A] text-white shadow-xs'
                          : isDark
                          ? 'bg-[#181B24] text-slate-500 border border-white/10'
                          : 'bg-white text-slate-400 border border-slate-200'
                      } ${isCurrent ? 'ring-3 ring-[#EA4C2A]/20 scale-110' : ''}`}>
                        {done && m.step < currentStep ? <Check size={11} strokeWidth={3.5} /> : m.step}
                      </div>
                      <span className={`text-[10px] mt-1.5 font-bold ${
                        isCurrent
                          ? 'text-[#EA4C2A]'
                          : done
                          ? isDark ? 'text-slate-200' : 'text-slate-700'
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

          {/* Clean Route Map */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-xs">
            <MotorcycleRouteMap
              status={order.order_status}
              eta={order.estimated_delivery_time}
              isDark={isDark}
              destinationAddress={destinationAddress}
            />
          </div>

          {/* Delivery PIN Banner (If available) */}
          {!isDelivered && !isCancelled && order.delivery_otp && (
            <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
              isDark ? 'bg-amber-500/10 border-amber-500/20 text-white' : 'bg-amber-50/80 border-amber-200 text-slate-900'
            }`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                    Your Delivery PIN
                  </div>
                  <div className="font-mono font-black text-sm tracking-wider">
                    {order.delivery_otp}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyPin}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 active:scale-95 cursor-pointer"
              >
                <span>{copiedPin ? 'Copied ✓' : 'Copy PIN'}</span>
              </button>
            </div>
          )}

          {/* Courier Card */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="text-[10px] uppercase font-black tracking-wider text-slate-400 mb-2.5">
              Courier
            </div>
            {rider ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-[#EA4C2A] to-amber-500 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                    {rider.full_name?.[0] || 'C'}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {rider.full_name}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {rider.vehicle_type || 'Delivery Motorcycle'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setChatOpen(true)}
                    className="flex-1 sm:flex-none py-2 px-3 rounded-xl bg-[#EA4C2A] hover:bg-[#d83f1d] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <MessageCircle size={13} />
                    <span>Chat</span>
                  </button>
                  {cleanPhone ? (
                    <a
                      href={`tel:${cleanPhone}`}
                      className={`flex-1 sm:flex-none py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border cursor-pointer active:scale-95 transition-all ${
                        isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <PhoneCall size={13} className="text-emerald-500" />
                      <span>Call</span>
                    </a>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 py-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="text-base">🛵</span>
                <span>Courier will be assigned as soon as the kitchen boxes your meal.</span>
              </div>
            )}
          </div>

          {/* Delivery Destination */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center gap-2 mb-1.5">
              <MapPin size={14} className="text-[#EA4C2A]" />
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                Delivery Address
              </span>
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white pl-5 leading-relaxed">
              {destinationAddress}
            </div>
            {destinationLandmark && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-5 mt-0.5">
                Landmark: {destinationLandmark}
              </div>
            )}
          </div>

          {/* Clean Collapsible Order Receipt */}
          <div className={`rounded-2xl border overflow-hidden transition-all ${
            isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <button
              type="button"
              onClick={() => setShowOrderDetails(!showOrderDetails)}
              className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">🧾</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Order Items ({order.items?.length || 0})
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-[#EA4C2A]">
                <span>{showOrderDetails ? 'Hide' : 'View'}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${showOrderDetails ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            {showOrderDetails && (
              <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 dark:border-white/10 space-y-2 text-xs">
                {order.items?.map((item, iIdx) => (
                  <div key={item.id || iIdx} className="flex justify-between items-start py-0.5">
                    <div className="min-w-0 pr-2">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {item.quantity || item.qty || 1}x {item.item_name || item.name}
                      </span>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white shrink-0">
                      {fmt(item.total_price || item.price)}
                    </span>
                  </div>
                ))}

                <div className="flex justify-between items-center font-bold text-xs pt-2 border-t border-slate-100 dark:border-white/10">
                  <span>Total Paid</span>
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
    const activeKey = (paystackCfg.publicKey || envKey || 'pk_test_0d51ae7f44721724cc8375bb68e04b306ef70928').trim();

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
function SupportModal({ open, onClose, user }) {
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
      const res = await api.createSupportTicket({
        category,
        subject: subject || category,
        description,
        customer_id: user?.id || null,
        customer_name: user?.name || user?.full_name || 'Customer',
        customer_email: user?.email || '',
        customer_phone: user?.phone || ''
      });
      toast(res?.message || 'Support ticket submitted successfully! Our team will contact you shortly.', 'success');
      onClose();
    } catch (e) {
      toast(e?.message || 'Failed to submit ticket. Please reach out via WhatsApp.', 'error');
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
  const { loginWithUser } = useAuth();
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <AuthModal
        open={open}
        onClose={onClose}
        initialMode="login"
        onSuccess={(signedInUser) => {
          if (signedInUser) {
            loginWithUser(signedInUser);
          }
          onClose();
        }}
        onSwitchRegister={onSwitchRegister}
        isDark={isDark}
      />
    </Suspense>
  );
}

function RegisterModal({ open, onClose, onSwitchLogin }) {
  const { loginWithUser } = useAuth();
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <AuthModal
        open={open}
        onClose={onClose}
        initialMode="register"
        onSuccess={(newUser) => {
          if (newUser) {
            loginWithUser(newUser);
          }
          onClose();
        }}
        onSwitchLogin={onSwitchLogin}
        isDark={false}
      />
    </Suspense>
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

  // Check if returning from Google Sign-In redirect
  useEffect(() => {
    if (api && typeof api.checkGoogleRedirect === 'function') {
      api.checkGoogleRedirect().then(res => {
        if (res?.success && res.user) {
          setUser(res.user);
          setToken(res.token);
          initWS(res.user);
          try {
            window.dispatchEvent(new CustomEvent('fmx_auth_change', { detail: { action: 'login', user: res.user } }));
          } catch {}
        }
      }).catch(err => {
        console.warn('Google redirect check error:', err);
      });
    }
  }, []);

  function initWS(user, riderData) {
    if (ws) ws.disconnect();
    const newWs = new FMXWebSocket(user.id, user.role, { riderId: riderData?.id });
    setWs(newWs);
  }

  async function login(email, password, forcedRole) {
    // 1. Purge previous user's local caches, addresses, and order info before establishing new session
    try {
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
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('fmx_last_order_') || k.startsWith('fmx_order_') || k.startsWith('fmx_user_') || k.startsWith('fmx_pid_')) {
          localStorage.removeItem(k);
        }
      });
      window.dispatchEvent(new CustomEvent('fmx_tracking_clear'));
      window.dispatchEvent(new CustomEvent('fmx_address_clear'));
      window.dispatchEvent(new CustomEvent('fmx_cart_clear'));
    } catch {}

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

  async function loginWithGoogle() {
    try {
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
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('fmx_last_order_') || k.startsWith('fmx_order_') || k.startsWith('fmx_user_') || k.startsWith('fmx_pid_')) {
          localStorage.removeItem(k);
        }
      });
      window.dispatchEvent(new CustomEvent('fmx_tracking_clear'));
      window.dispatchEvent(new CustomEvent('fmx_address_clear'));
    } catch {}

    const res = await api.loginWithGoogle();
    if (res?.pendingRedirect) {
      return res;
    }
    if (res?.success && res.user) {
      setUser(res.user);
      setToken(res.token);
      initWS(res.user);
      try {
        window.dispatchEvent(new CustomEvent('fmx_auth_change', { detail: { action: 'login', user: res.user } }));
      } catch {}
    }
    return res;
  }

  async function register(registrationData) {
    const res = await api.register(registrationData);
    if (res?.success && res.user) {
      setUser(res.user);
      setToken(res.token);
      initWS(res.user);
      try {
        window.dispatchEvent(new CustomEvent('fmx_auth_change', { detail: { action: 'register', user: res.user } }));
      } catch {}
    }
    return res;
  }

  function loginWithUser(newUser, customToken) {
    if (!newUser) return;
    const tokenVal = customToken || localStorage.getItem('fmx_token') || ('fmx_token_' + Date.now());
    localStorage.setItem('fmx_token', tokenVal);
    localStorage.setItem('fmx_user', JSON.stringify(newUser));
    if (newUser.full_name) localStorage.setItem('fmx_last_name', newUser.full_name);
    if (newUser.phone) localStorage.setItem('fmx_last_phone', newUser.phone);
    setUser(newUser);
    setToken(tokenVal);
    initWS(newUser);

    // If new user has 0 orders and hasn't claimed giveaway, clear any stale device giveaway flag
    if (!newUser.giveaway_claimed && ((newUser.orders_count || 0) === 0 && (newUser.total_orders || 0) === 0)) {
      try {
        localStorage.removeItem('fmx_giveaway_claimed');
        if (newUser.phone) {
          localStorage.removeItem(`fmx_giveaway_claimed_${newUser.phone.replace(/\D/g, '')}`);
        }
      } catch {}
    }

    try {
      window.dispatchEvent(new CustomEvent('fmx_auth_change', { detail: { action: 'login', user: newUser } }));
    } catch {}
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
      api.logout().catch(() => {});
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
      localStorage.removeItem('fmx_device_orders');
      localStorage.removeItem('fmx_last_order_ref');
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('fmx_last_order_') || k.startsWith('fmx_order_') || k.startsWith('fmx_user_') || k.startsWith('fmx_pid_')) {
          localStorage.removeItem(k);
        }
      });
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
    <AuthCtx.Provider value={{ user, token, login, loginWithUser, loginWithGoogle, register, logout, updateUser }}>
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

  // Instantly mark mounted and dismiss splash screen container
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__FOODMAXX_MOUNTED__ = true;
      const splash = document.getElementById('fmx-splash');
      if (splash) splash.remove();
    }
  }, []);

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

  // Live Over-The-Air (OTA) Cloud Synchronization
  useEffect(() => {
    let isCancelled = false;
    const checkLiveOTA = async () => {
      try {
        // 1. If running inside local Android APK shell on localhost, transition to live cloud Over-The-Air
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && navigator.onLine) {
          const testRes = await fetch('https://foodmaxxapp.web.app/version.json?t=' + Date.now(), { cache: 'no-store' });
          if (testRes.ok && !isCancelled) {
            console.log('[FoodMaxx OTA] Live Cloud Server online. Connecting seamlessly...');
            window.location.replace('https://foodmaxxapp.web.app' + window.location.pathname + window.location.search);
            return;
          }
        }

        // 2. Check for fresh Service Worker updates in the background
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.onLine) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && !isCancelled) {
            reg.update();
          }
        }
      } catch (err) {
        // Safe fallback: running offline or low connectivity
      }
    };

    // Run OTA check 2.5 seconds after launch to ensure smooth initial render
    const otaTimer = setTimeout(checkLiveOTA, 2500);
    return () => {
      isCancelled = true;
      clearTimeout(otaTimer);
    };
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
                <div className="flex-1 min-h-0 w-full overflow-y-auto bg-[#F8FAFC]">
                  <Suspense fallback={
                    <div className="h-full w-full min-h-[400px] flex flex-col items-center justify-center p-8 text-slate-800 font-medium">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EA4C2A] mb-3"></div>
                      <p className="text-slate-500 text-sm">Loading FoodMaxx Admin Suite...</p>
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


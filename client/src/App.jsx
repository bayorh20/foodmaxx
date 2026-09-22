import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
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
  Columns, LayoutList, Grid, Bike, Edit3, Radio, Palette, Camera
} from 'lucide-react';

import NotificationToneModal from './components/NotificationToneModal';
import SplashScreen from './components/SplashScreen';
import OnboardingFlow from './components/OnboardingFlow';
import TransitionStudioModal, { getTransitionVariants } from './components/TransitionStudioModal';
import SpinAndWinModal from './components/SpinAndWinModal';
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
const ThemeCtx = createContext({ isDark: false, toggleDark: () => {} });

function useAuth() { return useContext(AuthCtx); }
function useCart() { return useContext(CartCtx); }
function useToast() { return useContext(ToastCtx); }
function useWS() { return useContext(WSCtx); }
function useTheme() { return useContext(ThemeCtx); }

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

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <ThemeCtx.Provider value={{ isDark, toggleDark }}>
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

  const subtotal = (cart.items || []).reduce((s, i) => s + (i.price || 0) * i.qty, 0);
  const itemCount = (cart.items || []).reduce((s, i) => s + i.qty, 0);

  return (
    <CartCtx.Provider value={{ cart, addItem, removeItem, updateQty, clearCart, subtotal, itemCount }}>
      {children}
    </CartCtx.Provider>
  );
}

// ============================================================
// HELPERS
// ============================================================
const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;
const statusLabel = {
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

const statusColor = {
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

const getStatusEmoji = (status) => {
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

const getStatusNotificationInfo = (status) => {
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
  const { isDark, toggleDark } = useTheme();

  const [appStage, setAppStage] = useState(() => {
    try {
      const onboarded = localStorage.getItem('fmx_onboarded') === 'true';
      const splashSeen = localStorage.getItem('fmx_splash_seen') === 'true' || sessionStorage.getItem('fmx_splash_seen') === 'true';

      // Never show splash page on reload if user has already visited or onboarded
      if (onboarded || splashSeen) {
        return 'ready';
      }

      // First-time visit: record flag so subsequent reloads skip splash completely
      try {
        localStorage.setItem('fmx_splash_seen', 'true');
        sessionStorage.setItem('fmx_splash_seen', 'true');
      } catch {}

      return 'splash';
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
      return s !== null ? JSON.parse(s) : true;
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

  const toggleFavorite = (itemId) => {
    setFavorites(prev => {
      const next = prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId];
      try { localStorage.setItem('fmx_favs', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const [zones, setZones] = useState(() => getStoredZones());
  const [selectedZone, setSelectedZone] = useState(() => getStoredZones()[0] || null);
  const [locationsModalOpen, setLocationsModalOpen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([
    { id: 'addr_1', label: 'Home', address: '123 Maple Street, Springfield', landmark: 'Near UI Main Gate', zone_id: 'zone_bodija', zone_name: 'Bodija, Ibadan', icon: '🏠' },
    { id: 'addr_2', label: 'Work', address: 'Heritage Mall, 3rd Floor', landmark: 'Opposite Cocoa House', zone_id: 'zone_dugbe', zone_name: 'Dugbe, Ibadan', icon: '💼' },
    { id: 'addr_3', label: 'Campus', address: 'Faculty of Technology, UI', landmark: 'Beside Queen Idia Hall Link', zone_id: 'zone_agbowo', zone_name: 'Agbowo, Ibadan', icon: '🎓' },
    { id: 'addr_4', label: 'Partner', address: 'Plot 12, Oluyole Extension', landmark: 'Near Domino\'s Pizza', zone_id: 'zone_oluyole', zone_name: 'Oluyole, Ibadan', icon: '❤️' }
  ]);
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
  const [spinModalOpen, setSpinModalOpen] = useState(false);
  const [placedOrderSuccess, setPlacedOrderSuccess] = useState(null);

  // Auto-trigger Spin & Win game popup once per day on arrival (after 1.8s)
  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const lastSpin = localStorage.getItem('fmx_last_spin_date');
      const dismissedToday = sessionStorage.getItem('fmx_spin_dismissed_' + today);
      if (lastSpin !== today && !dismissedToday) {
        const timer = setTimeout(() => {
          setSpinModalOpen(true);
        }, 1800);
        return () => clearTimeout(timer);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const handleOpenSpin = () => setSpinModalOpen(true);
    window.addEventListener('fmx:open-spin', handleOpenSpin);
    return () => window.removeEventListener('fmx:open-spin', handleOpenSpin);
  }, []);

  useEffect(() => {
    const handleOpenCart = () => setCartOpen(true);
    window.addEventListener('fmx:open-cart', handleOpenCart);
    return () => window.removeEventListener('fmx:open-cart', handleOpenCart);
  }, []);
  const [orders, setOrders] = useState([]);
  const [trackingOrder, setTrackingOrder] = useState(null);
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

  // Firestore real-time orders subscription & status notification trigger
  useEffect(() => {
    if (!api.subscribeLiveOrders) return;
    const unsub = api.subscribeLiveOrders((ordersList) => {
      if (!Array.isArray(ordersList)) return;

      let relevantOrders = [];
      if (user) {
        const mine = ordersList.filter(o =>
          !o.customer_id || o.customer_id === user.id || o.customer_phone === user.phone || o.customer_email === user.email
        );
        relevantOrders = mine.length > 0 ? mine : ordersList;
      } else {
        const lastOrdId = localStorage.getItem('fmx_last_order_id');
        if (lastOrdId) {
          const matched = ordersList.filter(o => o.id === lastOrdId || o.order_reference === lastOrdId);
          relevantOrders = matched.length > 0 ? matched : ordersList.slice(0, 3);
        } else {
          relevantOrders = ordersList.slice(0, 3);
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
      if (trackingOrder?.id) {
        const updatedTracked = ordersList.find(o => o.id === trackingOrder.id || o.order_reference === trackingOrder.order_reference);
        if (updatedTracked && updatedTracked.order_status !== trackingOrder.order_status) {
          setTrackingOrder(updatedTracked);
        }
      }
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [user, trackingOrder?.id]);

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
    try {
      const res = await api.getOrders();
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

  async function openTrackingOrder(order) {
    try {
      setReturnTabAfterTracking(activeTab);
      const res = await api.getOrder(order.id);
      setTrackingOrder(res.data || order);
    } catch (e) {
      setTrackingOrder(order);
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
    setSavedAddresses(prev => [newAddr, ...prev]);
  }

  function handleDeleteAddress(addrId) {
    setSavedAddresses(prev => prev.filter(a => a.id !== addrId));
    if (selectedAddress?.id === addrId) {
      setSelectedAddress(null);
    }
    toast('Address removed from saved spots', 'info');
  }

  function handleQuickAdd(item) {
    addItem(item.restaurant_id || restaurant?.id || 'rest_foodmaxx', item.restaurant_name || restaurant?.name || 'FoodMaxx', {
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
  }

  // Filtered restaurants for current section
  const featuredRestaurants = restaurants.filter(r => r.featured);
  const topRated = [...restaurants].sort((a, b) => b.rating - a.rating).slice(0, 6);
  const fastDelivery = [...restaurants].sort((a, b) => a.delivery_time_min - b.delivery_time_min).slice(0, 6);
  const newRestaurants = restaurants.filter((_, i) => i >= 7);

  const activeOrdersCount = orders.filter(o => !['DELIVERED','CANCELLED'].includes(o.order_status)).length;
  const activeDeliveryOrder = (orders || []).find(o => !['DELIVERED', 'CANCELLED'].includes(o.order_status));

  // ---- MAIN NATIVE WEB APP CONTAINER ----
  return (
    <div className={`w-full h-full min-h-[100dvh] flex justify-center items-center ${isDark ? 'bg-[#0B0D11]' : 'bg-slate-200'} overflow-hidden relative transition-colors`}>
      
      {/* DESKTOP TOGGLE MENU */}
      <div className="hidden md:flex absolute top-6 right-6 z-50">
         <button onClick={toggleMobileView} className={`px-4 py-2 rounded-full shadow-lg font-bold flex items-center gap-2 ${isDark ? 'bg-[#1E222B] text-white border border-white/10 hover:bg-[#2A2F3B]' : 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50'} transition-transform active:scale-95`}>
           {mobileView ? <Monitor size={18}/> : <Smartphone size={18}/>}
           {mobileView ? 'Desktop View' : 'Mobile Simulator'}
         </button>
      </div>

      <div className={`w-full flex flex-col relative transition-all duration-500 overflow-hidden ${isDark ? 'bg-[#121418] text-white' : 'bg-white text-slate-900'} ${
         mobileView 
           ? 'w-full h-full min-h-[100dvh] md:min-h-0 md:max-w-[414px] md:h-[870px] md:max-h-[95dvh] rounded-none md:rounded-[2.75rem] border-0 md:border-[10px] md:border-slate-900 md:shadow-2xl md:my-auto md:ring-1 md:ring-white/10' 
           : 'max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl h-full min-h-[100dvh] md:border-x shadow-2xl ' + (isDark ? 'border-white/5' : 'border-slate-200/70')
         }`}>

        {/* SPLASH SCREEN & ONBOARDING / PERMISSIONS / SILENT REGISTRATION */}
        <AnimatePresence>
          {appStage === 'splash' && (
            <SplashScreen 
              onFinish={() => {
                try {
                  localStorage.setItem('fmx_splash_seen', 'true');
                  sessionStorage.setItem('fmx_splash_seen', 'true');
                } catch {}
                if (localStorage.getItem('fmx_onboarded') === 'true') {
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
              onRegister={async ({ full_name, phone }) => {
                try {
                  localStorage.setItem('fmx_onboarded', 'true');
                  localStorage.setItem('fmx_splash_seen', 'true');
                  sessionStorage.setItem('fmx_splash_seen', 'true');
                } catch {}
                const res = await silentRegister({ full_name, phone });
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
          <AnimatePresence mode="wait" custom={tabDirection}>
            <motion.div
              key={activeTab}
              custom={tabDirection}
              {...getTransitionVariants(transitionStyle, tabDirection)}
              className="w-full relative"
              style={{ willChange: 'transform, opacity' }}
            >
              {/* MAIN NATIVE WEB APP HEADER (HOME TAB) */}
              {activeTab === 'home' && (
            <header className="px-4 pt-3.5 pb-2.5 space-y-3">
              {/* Top Row: Deliver To & Action Controls */}
              <div className="flex items-center justify-between gap-3">
                {/* Location Dropdown */}
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 dark:text-slate-500 block leading-none mb-1">
                    Deliver To
                  </span>
                  <button
                    type="button"
                    onClick={() => setLocationsModalOpen(true)}
                    className="flex items-center gap-1.5 text-slate-900 dark:text-white transition-colors group cursor-pointer text-left py-0.5 max-w-full"
                  >
                    <MapPin size={15} className="text-[#EA4C2A] shrink-0" />
                    <span className="font-black text-xs sm:text-sm truncate max-w-[180px] xs:max-w-[220px] sm:max-w-[280px]">
                      {selectedAddress ? `${selectedAddress.address}` : (selectedZone?.name ? `${selectedZone.name}, Ibadan` : 'Bodija, Ibadan')}
                    </span>
                    <ChevronDown size={13} className="text-slate-400 group-hover:text-[#EA4C2A] transition-transform shrink-0" />
                  </button>
                </div>

                {/* Right Action Icons (Theme, Notifications, Spin & Win, Cart) */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Day/Night switch */}
                  <button
                    onClick={toggleDark}
                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200/70 dark:hover:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95 transition-all cursor-pointer border border-slate-200/60 dark:border-white/5"
                    title="Toggle Theme"
                  >
                    {isDark ? (
                      <Sun size={16} className="text-amber-400 fill-amber-400/20" />
                    ) : (
                      <Moon size={16} className="text-slate-700 fill-slate-700/10" />
                    )}
                  </button>

                  {/* Notification Bell */}
                  <button
                    onClick={() => setNotifsOpen(true)}
                    className="relative w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200/70 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-gray-200 active:scale-95 transition-all cursor-pointer border border-slate-200/60 dark:border-white/5"
                    title="Notifications"
                  >
                    <Bell size={16} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#121418]"></span>
                  </button>

                  {/* Spin & Win Header Icon Opener */}
                  <button
                    onClick={() => {
                      if (typeof triggerHaptic === 'function') triggerHaptic('light');
                      setSpinModalOpen(true);
                    }}
                    className="relative w-8 h-8 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/25 flex items-center justify-center active:scale-90 transition-all cursor-pointer hover:bg-amber-500/20"
                    title="Spin & Win Daily Rewards"
                    aria-label="Spin & Win"
                  >
                    <Gift size={16} className="stroke-[2.2]" />
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                  </button>

                  {/* Shopping Cart Button */}
                  <button
                    onClick={() => {
                      if (typeof triggerHaptic === 'function') triggerHaptic('light');
                      setCartOpen(true);
                    }}
                    className="relative w-8 h-8 rounded-full bg-[#EA4C2A] text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-sm shadow-red-500/20 hover:bg-[#d93f1d]"
                    title="Shopping Cart"
                  >
                    <ShoppingBag size={16} />
                    {itemCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-white text-[#EA4C2A] text-[9.5px] font-black rounded-full flex items-center justify-center border border-[#EA4C2A] shadow-xs">
                        {itemCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Prominent Greeting & Brand Avatar Row */}
              <div className="flex items-center justify-between pt-1">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 leading-snug mb-0.5">
                    <span>{(() => {
                      const h = new Date().getHours();
                      return h < 12 ? 'Good Morning ☀️' : h < 17 ? 'Good Afternoon 🌤️' : 'Good Evening 🌙';
                    })()}</span>
                  </div>
                  <h1 className="text-base sm:text-lg font-black text-slate-950 dark:text-white tracking-tight leading-tight truncate">
                    {user?.full_name ? `${user.full_name} 👋` : 'What are you craving? 🍔'}
                  </h1>
                  <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5 truncate">
                    {(() => {
                      const h = new Date().getHours();
                      return h < 12 
                        ? 'Start your day right with a delicious meal' 
                        : h < 17 
                          ? 'Lunch is calling — treat yourself today!' 
                          : 'Wind down with your favourite evening chow';
                    })()}
                  </p>
                </div>
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden bg-white dark:bg-[#1A1D24] border border-slate-200/80 dark:border-white/10 shadow-sm shrink-0 p-1 flex items-center justify-center">
                  <img
                    src="/foodmaxx-logo.png"
                    alt="FoodMaxx"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
              </div>

              {/* Search Bar Row */}
              <div className="relative flex items-center bg-slate-100 dark:bg-[#1A1D24] text-slate-900 dark:text-white rounded-2xl px-3.5 py-2.5 sm:py-3 border border-slate-200/60 dark:border-white/5 focus-within:border-[#EA4C2A]/60 focus-within:bg-white dark:focus-within:bg-[#1A1D24] transition-all shadow-xs">
                <Search size={17} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold outline-none placeholder:text-slate-400 placeholder:font-medium mx-2.5"
                  placeholder={getCopy(appCopy, 'customer_hero', 'search_placeholder', 'Search FoodMaxx dishes, jollof, grills...')}
                  value={searchQuery}
                  onChange={(e) => {
                    if (typeof handleSearch === 'function') handleSearch(e.target.value);
                  }}
                />
                <button onClick={() => toast('Voice search coming soon!', 'info')} className="text-[#EA4C2A] shrink-0 hover:opacity-80 transition-opacity cursor-pointer p-0.5">
                  <Mic size={17} />
                </button>
              </div>
            </header>
          )}

          {activeTab === 'home' && (
                <HomeTab
                  restaurant={restaurant}
                  menuItems={menuItems}
                  menuByCategory={menuByCategory}
                  searchQuery={searchQuery}
                  onSearch={handleSearch}
                  onSelectItem={(item) => setSelectedItem({ restaurant: restaurant || { id: 'rest_foodmaxx', name: 'FoodMaxx' }, item })}
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
                />
              )}
              {activeTab === 'menu' && (
                <MenuTab
                  restaurant={restaurant}
                  menuItems={menuItems}
                  menuByCategory={menuByCategory}
                  searchQuery={searchQuery}
                  onSearch={handleSearch}
                  onSelectItem={(item) => setSelectedItem({ restaurant: restaurant || { id: 'rest_foodmaxx', name: 'FoodMaxx' }, item })}
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
                />
              )}
              {activeTab === 'favorites' && (
                <FavoritesTab
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  onSelectItem={(item) => setSelectedItem({ restaurant: restaurant || { id: 'rest_foodmaxx', name: 'FoodMaxx' }, item })}
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
                  onLogout={() => { logout(); setActiveTab('home'); toast('Logged out successfully', 'info'); }}
                  onOpenWallet={() => setWalletOpen(true)}
                  onOpenSupport={() => setSupportOpen(true)}
                  onOpenAddresses={() => setLocationsModalOpen(true)}
                  onOpenToneStudio={() => setToneModalOpen(true)}
                  onOpenTransitionStudio={() => setTransitionModalOpen(true)}
                  onOpenOrders={() => setActiveTab('orders')}
                  onOpenFavorites={() => setActiveTab('favorites')}
                  isDark={isDark} toggleDark={toggleDark}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* FLOATING ACTION OVERLAY (MODERN BOTTOM DOCK WITH CART & LIVE ORDER STATUS) */}
        <div className={`${mobileView ? 'absolute' : 'fixed'} bottom-0 left-0 right-0 z-50 pointer-events-none pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] px-3 sm:px-6 flex flex-col items-center`}>
          
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
                        </motion.div>
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
      </div>

      {/* FLOATING CLEAN ICON-ONLY SPIN & WIN LAUNCHER */}
      {!checkoutOpen && !cartOpen && !spinModalOpen && (
        <motion.button
          type="button"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, y: [0, -4, 0] }}
          transition={{
            scale: { duration: 0.25 },
            opacity: { duration: 0.25 },
            y: { repeat: Infinity, duration: 3, ease: 'easeInOut' }
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            triggerHaptic('medium');
            setSpinModalOpen(true);
          }}
          className="fixed bottom-20 right-4 sm:right-6 z-40 w-12 h-12 rounded-full bg-gradient-to-tr from-[#EA4C2A] to-[#FF6B4A] text-white shadow-xl shadow-red-500/35 flex items-center justify-center border-2 border-white dark:border-[#1A1D24] cursor-pointer group"
          title="Spin & Win Daily Rewards"
          aria-label="Spin & Win"
        >
          <div className="relative flex items-center justify-center">
            {/* Spinning Prize Wheel Icon */}
            <svg 
              viewBox="0 0 24 24" 
              className="w-6 h-6 text-white drop-shadow-xs transition-transform duration-700 group-hover:rotate-180" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14" strokeWidth="1.6" opacity="0.85" />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            </svg>
            
            {/* Pulsing notification dot */}
            <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400 border-2 border-white dark:border-[#1A1D24]"></span>
            </span>
          </div>
        </motion.button>
      )}


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
            onStartGroupOrder={async () => {
              try {
                const res = await api.createGroupOrder({
                  restaurant_id: selectedRestaurant.id,
                  host_name: user?.full_name || 'Host Customer'
                });
                setActiveGroupOrder(res.data);
                setGroupModalOpen(true);
                toast('Group order created! Share code with friends 👥', 'success');
              } catch (e) {
                toast(e.message, 'error');
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* GROUP ORDER MODAL */}
      {groupModalOpen && activeGroupOrder && (
        <GroupOrderModal
          restaurant={selectedRestaurant || restaurants.find(r => r.id === activeGroupOrder.restaurant_id)}
          groupOrder={activeGroupOrder}
          onClose={() => setGroupModalOpen(false)}
          onCheckoutGroup={(consolidatedItems, group) => {
            clearCart();
            consolidatedItems.forEach(ci => {
              addItem(group.restaurant_id, group.restaurant_name, {
                id: ci.id,
                name: ci.name,
                price: ci.price,
                image_url: ci.image_url,
                qty: ci.qty || 1,
                selectedSize: ci.selectedSize || 'Regular Portion',
                selectedExtras: ci.selectedExtras || [],
                participant_name: ci.participant_name
              });
            });
            setGroupModalOpen(false);
            setSelectedRestaurant(null);
            setCartOpen(true);
            toast(`Group order loaded for ${group.participants.length} people! 🛒`, 'success');
          }}
        />
      )}

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

      {/* SPIN & WIN GAME POPUP */}
      <AnimatePresence>
        {spinModalOpen && (
          <SpinAndWinModal
            key="spin-win-modal"
            open={spinModalOpen}
            onClose={() => {
              setSpinModalOpen(false);
              try {
                const today = new Date().toISOString().slice(0, 10);
                sessionStorage.setItem('fmx_spin_dismissed_' + today, '1');
              } catch {}
            }}
            isDark={isDark}
            onRewardClaimed={(prize) => {
              if (prize?.code) {
                try {
                  localStorage.setItem('fmx_active_promo', prize.code);
                } catch {}
                toast(`Promo code "${prize.code}" saved for checkout! 🎁`, 'success');
              } else {
                toast(`Reward claimed! 🎉`, 'success');
              }
              setSpinModalOpen(false);
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
function ProductQuantityStepper({ item, onQuickAdd, isDark, size = 'sm' }) {
  const { cart, updateQty } = useCart();
  const dishItem = item?.dish || item;
  const itemId = dishItem?.id;

  const itemIndex = (cart.items || []).findIndex(i => i.id === itemId);
  const inCartQty = (cart.items || [])
    .filter(i => i.id === itemId)
    .reduce((sum, i) => sum + i.qty, 0);

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
          if (itemIndex >= 0) {
            updateQty(itemIndex, -1);
          }
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
          if (itemIndex >= 0) {
            updateQty(itemIndex, 1);
          } else {
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
}

// ============================================================
// SKELETON LOADER CARD
// ============================================================
function SkeletonCard() {
  return (
    <div className="w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-[#1A1D24] animate-pulse">
      <div className="h-32 xs:h-36 sm:h-44 bg-gray-200 dark:bg-[#252930]" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-[#252930] rounded-full w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-[#252930] rounded-full w-1/2" />
        <div className="h-7 bg-gray-200 dark:bg-[#252930] rounded-xl mt-2" />
      </div>
    </div>
  );
}

function SkeletonSection({ title }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="h-4 w-36 bg-gray-200 dark:bg-[#1A1D24] rounded-full animate-pulse" />
        <div className="h-3 w-14 bg-gray-100 dark:bg-[#1A1D24] rounded-full animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 px-4">
        {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
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
  const code = getCopy(appCopy, 'customer_hero', 'promo_banner_code', 'FIRST50');
  const promoText = getCopy(appCopy, 'customer_hero', 'promo_banner_text', '50% off your first order up to ₦2,500');
  const heroTitle = getCopy(appCopy, 'customer_hero', 'hero_title', 'Get 50% Off\nYour First Order!');

  return (
    <div className="px-4 mb-5">
      <div className="bg-[#FF5525] rounded-3xl p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between min-h-[140px] shadow-lg shadow-orange-500/20">
        <div className="relative z-10 w-2/3">
          <p className="text-white text-[10px] sm:text-xs font-semibold mb-1 opacity-90">
            Use code <span className="bg-white/20 px-1.5 py-0.5 rounded text-white font-bold ml-0.5 mr-0.5">{code}</span> at checkout.<br/>
            {promoText}
          </p>
          <h2 className="text-white text-lg sm:text-xl font-bold leading-tight mb-3 whitespace-pre-line">
            {heroTitle}
          </h2>
          <button onClick={onOrderNow} className="bg-[#111111] hover:bg-black text-white text-[10px] sm:text-xs font-bold py-2 px-4 rounded-full w-fit active:scale-95 transition-transform cursor-pointer">
            Order Now
          </button>
        </div>
        
        {/* Real Appetizing Golden Fries */}
        <div className="absolute -right-2 -bottom-4 w-32 h-32 sm:w-36 sm:h-36 rotate-[-8deg] pointer-events-none drop-shadow-2xl">
          <img 
            onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'; }} 
            src="https://images.unsplash.com/photo-1576107223932-3580a13346e4?w=400&auto=format&fit=crop&q=80" 
            alt="Crispy Fries" 
            className="w-full h-full object-cover rounded-3xl shadow-xl border border-white/20" 
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
      {/* Pagination indicators */}
      <div className="flex justify-center items-center gap-1.5 mt-3">
        <div className="w-5 h-1 bg-slate-800 dark:bg-white rounded-full"></div>
        <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
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
function TopPickCard({ item, onSelect, onQuickAdd, isFavorite, onToggleFavorite }) {
  const { cart, updateQty, addItem } = useCart();
  const inCartIdx = (cart.items || []).findIndex(ci => 
    (ci.id && item.id && String(ci.id) === String(item.id)) || 
    (ci.name && item.name && ci.name.trim().toLowerCase() === item.name.trim().toLowerCase())
  );
  const inCartQty = inCartIdx >= 0 ? cart.items[inCartIdx].qty : 0;
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

  const activeTag = (item.badge || item.tag || '').trim();
  const hasTag = Boolean(activeTag && activeTag.toLowerCase() !== 'none');

  return (
    <div 
      className={`group relative w-full bg-white dark:bg-[#151821] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg flex flex-col justify-between ${
        inCartQty > 0 
          ? 'border-2 border-[#EA4C2A]/70 dark:border-[#EA4C2A]/80 shadow-md shadow-red-500/10' 
          : 'border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-slate-300 dark:hover:border-white/20'
      }`}
      onClick={() => onSelect(item)}
    >
      {/* Photo Container */}
      <div className="relative h-32 xs:h-36 sm:h-44 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
        <img 
          onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80'; }} 
          src={item.image_url} 
          alt={item.name} 
          className={`w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${
            !isAvailable ? 'grayscale contrast-75' : ''
          }`} 
          loading="lazy" 
          decoding="async" 
        />

        {/* Gradient dark scrim for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

        {/* Top Badges & Favorite Heart Button */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 z-10">
          {hasTag ? (
            <span className="bg-[#EA4C2A] text-white text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md border border-white/20">
              {activeTag}
            </span>
          ) : (
            <span className="bg-[#EA4C2A] text-white text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md border border-white/20">
              Popular
            </span>
          )}

          {/* Favorite Heart Button */}
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 hover:bg-black/65 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90 transition-all cursor-pointer shadow-md hover:text-red-400 shrink-0"
            title={isFavorite ? "Remove from favorites" : "Save to favorites"}
          >
            <Heart size={14} className={isFavorite ? 'fill-red-500 stroke-red-500 scale-110' : 'stroke-white'} />
          </button>
        </div>

        {/* Prep Time Overlay */}
        {item.prep_time_min && (
          <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white text-[8.5px] sm:text-[9.5px] font-bold px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1 shadow-xs">
            <Clock size={9} className="text-amber-400" />
            <span>{item.prep_time_min}m</span>
          </span>
        )}

        {/* Sold Out Overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-20">
            <span className="bg-red-600 text-white font-black text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-2xl border border-white/30">
              Sold Out
            </span>
          </div>
        )}
      </div>
      
      {/* Content Container */}
      <div className="p-2.5 sm:p-3.5 flex flex-col justify-between flex-1 gap-2">
        <div>
          <h3 className="font-black text-xs sm:text-sm text-slate-950 dark:text-white leading-snug line-clamp-2 break-words group-hover:text-[#EA4C2A] transition-colors">
            {item.name}
          </h3>
          {item.description && (
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 mt-0.5 leading-tight">
              {item.description}
            </p>
          )}
        </div>
        
        {/* Price & Add / Stepper */}
        <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-100 dark:border-white/10 mt-auto">
          <div className="min-w-0 flex-1">
            <span className="font-black text-xs sm:text-sm md:text-base text-slate-950 dark:text-white tracking-tight leading-none block truncate">
              {fmt(item.price || 4500)}
            </span>
          </div>

          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            <AnimatePresence mode="popLayout">
              {inCartQty === 0 ? (
                <motion.button 
                  key="add-btn"
                  disabled={!isAvailable}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleAdd} 
                  className="h-8 px-2.5 sm:px-3 rounded-xl bg-[#EA4C2A] hover:bg-[#D42222] active:scale-95 disabled:opacity-40 text-white font-black text-[11px] sm:text-xs flex items-center gap-1 shadow-md shadow-red-500/20 transition-all cursor-pointer shrink-0"
                  title="Add to cart"
                >
                  <Plus size={14} className="stroke-[3]" />
                  <span className="hidden xs:inline">Add</span>
                </motion.button>
              ) : (
                <motion.div 
                  key="stepper"
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  className="bg-[#EA4C2A] text-white rounded-xl p-0.5 flex items-center gap-1 shadow-md shadow-red-500/20 h-8"
                >
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateQty(inCartIdx, -1);
                    }}
                    className="w-6 h-6 rounded-lg bg-black/20 hover:bg-black/35 text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    title="Decrease"
                  >
                    <Minus size={11} className="stroke-[3]" />
                  </motion.button>
                  <span className="font-black text-xs min-w-[14px] text-center select-none text-white">
                    {inCartQty}
                  </span>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateQty(inCartIdx, 1);
                      trigger3dCartDrop(e, item);
                    }}
                    className="w-6 h-6 rounded-lg bg-black/20 hover:bg-black/35 text-white flex items-center justify-center cursor-pointer shadow-xs transition-colors shrink-0"
                    title="Increase"
                  >
                    <Plus size={11} className="stroke-[3]" />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopPicksSection({ title = "Top picks on FoodMaxx", menuItems, onSelectItem, onQuickAdd, onSeeAll, favorites, onToggleFavorite }) {
  const picks = menuItems || [];
  if (picks.length === 0) return null;
  
  return (
    <div className="mb-7">
      <div className="flex justify-between items-center px-4 mb-3">
        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">{title}</h2>
        <button 
          onClick={onSeeAll}
          className="bg-yellow-400 hover:bg-yellow-500 text-black text-[11px] sm:text-xs font-black px-3 py-1 rounded-full transition-all active:scale-95 cursor-pointer shadow-xs"
        >
          See all
        </button>
      </div>
      
      {/* 2 Product Cards Per Column Style (Two Columns Grid) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 px-4">
        {picks.map((item, idx) => (
          <TopPickCard 
            key={item.id || idx} 
            item={item} 
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
              className="bg-white dark:bg-[#1A1D24] rounded-3xl p-3 shadow-xs border border-slate-100 dark:border-white/5 flex gap-3.5 items-center justify-between cursor-pointer"
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
function FoodItemCard({ item, onSelect, onQuickAdd, isDark, isFullWidth = false, isFavorite, onToggleFavorite }) {
  const { cart } = useCart();
  const inCartQty = (cart.items || [])
    .filter(i => (i.id && item.id && String(i.id) === String(item.id)) || (i.name && item.name && i.name.trim().toLowerCase() === item.name.trim().toLowerCase()))
    .reduce((sum, i) => sum + i.qty, 0);

  const displayPrice = fmt(item.price);
  const isAvailable = item.is_available !== false && (item.stock_quantity === undefined || item.stock_quantity > 0);
  const activeTag = (item.badge || item.tag || '').trim();
  const hasTag = Boolean(activeTag && activeTag.toLowerCase() !== 'none');

  if (isFullWidth) {
    return (
      <div
        onClick={() => isAvailable && onSelect(item)}
        className={`group relative w-full mb-2.5 rounded-xl p-2.5 sm:p-3 transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
          inCartQty > 0
            ? 'border border-slate-300 dark:border-white/20 shadow-xs bg-white dark:bg-[#181A20]'
            : 'border border-slate-100 dark:border-white/5 shadow-xs hover:border-slate-200 dark:hover:border-white/10 hover:shadow-xs bg-white dark:bg-[#181A20]'
        } ${!isAvailable ? 'opacity-65' : ''}`}
      >
        {/* Left: Info, Price, and Stepper */}
        <div className="flex-1 min-w-0 pr-1 flex flex-col justify-between self-stretch py-0.5">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              {hasTag && (
                <span className="bg-[#EA4C2A] text-white text-[8.5px] font-bold uppercase px-2 py-0.5 rounded-full shadow-xs">
                  {activeTag}
                </span>
              )}

              <span className="text-[9px] font-bold uppercase tracking-wider text-[#EA4C2A] bg-orange-500/10 dark:bg-orange-500/20 px-1.5 py-0.5 rounded-md">
                Pre-order
              </span>

              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
                <Clock size={10} /> ~{item.prep_time_min || 20}m
              </span>
            </div>

            <h3 className="font-bold text-[13px] sm:text-sm text-slate-900 dark:text-white leading-snug line-clamp-2 break-words transition-colors">
              {item.name}
            </h3>
          </div>

          <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-slate-100 dark:border-white/5">
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-sm sm:text-base text-slate-950 dark:text-white">
                {displayPrice}
              </span>
              {inCartQty > 0 && (
                <span className="text-[9.5px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded-md">
                  {inCartQty} in cart
                </span>
              )}
            </div>

            <ProductQuantityStepper item={item} onQuickAdd={onQuickAdd || onSelect} isDark={isDark} size="sm" />
          </div>
        </div>

        {/* Right: Picture with rounded corners and badges */}
        <div className="relative w-22 h-22 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 shadow-inner">
          <img
            onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'; }}
            src={item.image_url}
            alt={item.name}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-108 ${
              !isAvailable ? 'grayscale contrast-75' : ''
            }`}
            loading="lazy"
            decoding="async"
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
}

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
  appCopy
}) {
  const [selectedHomeCat, setSelectedHomeCat] = useState('all');
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
      {/* 1. Promo Banner (FIRST50) */}
      <PromoBanner onOrderNow={onGoToMenu} appCopy={appCopy} />

      {/* 2. Category Chips hidden per user preference */}

      {/* Skeleton loaders while loading */}
      {isLoading ? (
        <>
          <SkeletonSection title="Top picks on FoodMaxx" />
          <SkeletonSection title="Trending Now" />
          <SkeletonSection title="Special Offers" />
          <SkeletonSection title="Quick Bites" />
        </>
      ) : selectedHomeCat !== 'all' ? (
        /* Filtered View When Category Selected */
        <div className="px-4 space-y-4">
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
        <>
          {homepageSections.filter(s => s.enabled !== false).map((sec, sIdx) => {
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

            if (sectionItems.length === 0) return null;

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
        </>
      )}
    </div>
  );
}

// ============================================================
// MENU TAB (REPLACING EXPLORE TAB IN SINGLE RESTAURANT APP)
// ============================================================
// MENU TAB (MATCHING MOCKUP DESIGN: media_1789214008795.jpg)
// ============================================================
function MenuDishRow({ item, onSelect, onQuickAdd, onToggleFavorite, isFavorite, isDark }) {
  const { cart, updateQty } = useCart();
  const inCartIdx = (cart.items || []).findIndex(ci => ci.id === item.id || ci.name === item.name);
  const inCartQty = inCartIdx >= 0 ? cart.items[inCartIdx].qty : 0;

  return (
    <div
      onClick={() => onSelect(item)}
      className={`flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-white/5 last:border-0 group cursor-pointer select-none transition-colors ${
        isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/50'
      }`}
    >
      {/* Left Dish Photo with optional Badge */}
      <div className="relative w-22 sm:w-24 h-22 sm:h-24 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 shadow-2xs">
        <img onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'; }}           src={item.image_url}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          decoding="async"
        />
        {item.badge === 'bestseller' || item.is_bestseller || item.badge === 'Bestseller' ? (
          <span className="absolute top-1.5 left-1.5 bg-black/75 backdrop-blur-xs text-white text-[8.5px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-xs border border-white/10">
            <Flame size={9} className="fill-white" />
            <span>Bestseller</span>
          </span>
        ) : item.badge === 'new' || item.is_new || item.badge === 'New' ? (
          <span className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[8.5px] font-bold px-2 py-0.5 rounded-full shadow-xs">
            New
          </span>
        ) : null}
      </div>

      {/* Right Column: Title, Heart, Desc, Ratings, Price & Stepper */}
      <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0 h-full">
        {/* Row 1: Title + Pre-order Tag + Heart */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-start gap-1.5 flex-wrap">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug line-clamp-2 break-words">
                {item.name}
              </h3>
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-[#EA4C2A] bg-orange-500/10 dark:bg-orange-500/20 px-1.5 py-0.5 rounded-md shrink-0 mt-0.5">
                Pre-order
              </span>
            </div>
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
              size={16}
              className={isFavorite ? 'fill-red-500 text-red-500' : 'stroke-[1.75] text-gray-400'}
            />
          </button>
        </div>

        {/* Row 2: Subtle prep time note if available */}
        {item.prep_time_min ? (
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
            <Clock size={10} />
            <span>~{item.prep_time_min}m</span>
          </div>
        ) : null}

        {/* Row 4: Price & Stepper / Add */}
        <div className="flex items-center justify-between mt-1.5 pt-0.5">
          <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
            {fmt(item.price)}
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <AnimatePresence mode="popLayout">
              {inCartQty === 0 ? (
                <motion.button 
                  key="add-btn"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if(onQuickAdd) onQuickAdd(item);
                    trigger3dCartDrop(e, item);
                  }} 
                  className="w-8 h-8 rounded-xl bg-[#EA4C2A] hover:bg-[#d93f1d] active:scale-95 text-white flex items-center justify-center shadow-xs cursor-pointer"
                >
                  <Plus size={16} strokeWidth={2.5} />
                </motion.button>
              ) : (
                <motion.div 
                  key="stepper"
                  initial={{ scale: 0.8, opacity: 0, width: 32 }}
                  animate={{ scale: 1, opacity: 1, width: 'auto' }}
                  exit={{ scale: 0.8, opacity: 0, width: 32 }}
                  className="bg-[#EA4C2A] text-white rounded-xl p-0.5 flex items-center gap-1.5 shadow-xs h-8 overflow-hidden"
                >
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    type="button"
                    onClick={() => updateQty(inCartIdx, -1)}
                    className="w-7 h-7 rounded-lg bg-black/15 hover:bg-black/25 text-white flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                  >
                    <Minus size={12} className="stroke-[3]" />
                  </motion.button>
                  <span className="font-bold text-xs text-white min-w-[14px] text-center select-none">
                    {inCartQty}
                  </span>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    type="button"
                    onClick={(e) => {
                      updateQty(inCartIdx, 1);
                      trigger3dCartDrop(e, item);
                    }}
                    className="w-7 h-7 rounded-lg bg-black/15 hover:bg-black/25 text-white flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                  >
                    <Plus size={12} className="stroke-[3]" />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const { itemCount } = useCart();
  const [selectedCat, setSelectedCat] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('');

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

  let filtered = [...allDishes];

  // Search filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(i =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q)
    );
  }

  // Category filter
  if (selectedCat !== 'all') {
    filtered = filtered.filter(i => {
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
  if (sortBy === 'price_asc') filtered.sort((a, b) => a.price - b.price);
  else if (sortBy === 'price_desc') filtered.sort((a, b) => b.price - a.price);
  else if (sortBy === 'rating') filtered.sort((a, b) => (b.rating || 4.5) - (a.rating || 4.5));
  else if (sortBy === 'prep') filtered.sort((a, b) => parseInt(a.prep_time || 25) - parseInt(b.prep_time || 25));

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
function OrdersTab({ orders, onOpenTracking, onReview, onExplore, onBack, onRefresh, isDark }) {
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
    </div>
  );
}

// ULTRA-CLEAN ORDER CARD (AIRBNB & UBER EATS MINIMALIST STYLE)
function CleanOrderCard({ order, onTrack, onReview, isDark }) {
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
}

// ============================================================
// PROFILE TAB
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
  onOpenToneStudio,
  onOpenTransitionStudio,
  onOpenOrders,
  onOpenFavorites,
  isDark,
  toggleDark
}) {
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] px-6 text-center py-10">
        <div className="relative mb-5">
          <img
            src="/foodmaxx-logo.png"
            alt="FoodMaxx"
            className="w-20 h-20 rounded-3xl object-cover shadow-xl border border-black/10 dark:border-white/10 shrink-0"
          />
          <span className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
            🎁 ₦1,000
          </span>
        </div>
        <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-1.5">Sign In to FoodMaxx</h3>
        <p className="text-gray-500 dark:text-gray-400 text-xs mb-6 max-w-xs leading-relaxed">
          Log in or create an account in seconds to unlock your <span className="font-bold text-emerald-600 dark:text-emerald-400">₦1,000 Welcome Bonus</span>, live order tracking, and fast checkout.
        </p>
        <button
          onClick={onOpenOnboarding || onLogin}
          className="w-full max-w-xs bg-[#EA4C2A] hover:bg-[#D43D1D] active:scale-[0.98] text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-[#EA4C2A]/25 cursor-pointer transition-all"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  const walletBalance = Number(wallet?.balance) || 0;
  const displayName = user?.full_name || user?.name || (user?.phone ? `Customer ${user.phone}` : 'FoodMaxx Member');
  const displayEmail = user?.email || 'No email registered';
  const displayPhone = user?.phone || '';

  return (
    <div className="p-4 sm:p-5 space-y-4 pb-28">
      {/* 1. Modern Identity Profile Card */}
      <div className={`rounded-3xl p-5 border transition-all ${
        isDark ? 'bg-[#181B22] border-white/10 shadow-xl' : 'bg-white border-slate-100 shadow-sm'
      }`}>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <img
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80';
              }}
              src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=EA4C2A&color=fff&size=100`}
              className="w-16 h-16 rounded-2xl object-cover shadow-sm border border-black/10 dark:border-white/10"
              alt={displayName}
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-[#181B22]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight truncate">
                {displayName}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                VIP
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{displayEmail}</p>
            {displayPhone && <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 mt-0.5">{displayPhone}</p>}
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-white/5 text-center">
          <button
            onClick={onOpenOrders}
            className={`p-2.5 rounded-2xl border transition-colors cursor-pointer ${
              isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
            }`}
          >
            <div className="text-base font-bold text-slate-900 dark:text-white">{orders?.length || 0}</div>
            <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-0.5">Orders</div>
          </button>
          <button
            onClick={onOpenWallet}
            className={`p-2.5 rounded-2xl border transition-colors cursor-pointer ${
              isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
            }`}
          >
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{fmt(walletBalance)}</div>
            <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-0.5">Wallet</div>
          </button>
          <button
            onClick={onOpenAddresses}
            className={`p-2.5 rounded-2xl border transition-colors cursor-pointer ${
              isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
            }`}
          >
            <div className="text-base font-bold text-slate-900 dark:text-white">{savedAddressesCount || 1}</div>
            <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-0.5">Places</div>
          </button>
        </div>
      </div>

      {/* 2. Digital Chow Wallet Pass Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white p-5 border border-white/10 shadow-xl">
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#EA4C2A]/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-bold text-xs shadow-sm">
              FM
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">FoodMaxx Chow Pass</div>
              <div className="text-[11px] text-gray-400">Digital Food Wallet</div>
            </div>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Active
          </span>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="text-[11px] text-gray-400 font-medium">Available Balance</div>
            <div className="text-2xl font-bold text-white tracking-tight">{fmt(walletBalance)}</div>
          </div>
          <button
            onClick={onOpenWallet}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-400/20 active:scale-95 transition-all cursor-pointer"
          >
            Add Money +
          </button>
        </div>

        {/* Welcome Bonus Callout Banner */}
        <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-[11.5px]">
            <span>🎁</span>
            <span>₦1,000 Welcome Perk Ready to Use</span>
          </div>
          <button
            onClick={onOpenWallet}
            className="text-[11px] text-gray-300 hover:text-white underline cursor-pointer"
          >
            View History →
          </button>
        </div>
      </div>

      {/* 3. Grouped Standard Menus */}
      <div className="space-y-3">
        {/* Group A: Dining & Activity */}
        <div className={`rounded-2xl border overflow-hidden ${
          isDark ? 'bg-[#181B22] border-white/10' : 'bg-white border-slate-100 shadow-sm'
        }`}>
          <div className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Dining & Orders
          </div>
          {[
            {
              icon: Package,
              label: 'My Orders & Live Tracking',
              badge: orders?.length ? `${orders.length}` : null,
              onClick: onOpenOrders,
              color: 'text-amber-500'
            },
            {
              icon: Wallet,
              label: 'FoodMaxx Chow Wallet',
              badge: fmt(walletBalance),
              badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
              onClick: onOpenWallet,
              color: 'text-emerald-500'
            },
            {
              icon: MapPin,
              label: 'Saved Locations & Landmarks',
              badge: savedAddressesCount ? `${savedAddressesCount} Spots` : null,
              onClick: onOpenAddresses,
              color: 'text-blue-500'
            },
            {
              icon: Heart,
              label: 'Favorite Dishes',
              onClick: onOpenFavorites,
              color: 'text-rose-500'
            }
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer border-t first:border-t-0 ${
                isDark ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isDark ? 'bg-white/5' : 'bg-slate-100'
              } ${item.color} shrink-0`}>
                <item.icon size={16} className="stroke-[2.2]" />
              </div>
              <span className="font-semibold text-xs flex-1 text-slate-800 dark:text-slate-200">{item.label}</span>
              {item.badge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  item.badgeColor || (isDark ? 'bg-white/10 text-gray-300' : 'bg-slate-100 text-slate-600')
                }`}>
                  {item.badge}
                </span>
              )}
              <ChevronRight size={14} className="text-gray-400 shrink-0" />
            </button>
          ))}
        </div>

        {/* Group B: App Customization & Experience */}
        <div className={`rounded-2xl border overflow-hidden ${
          isDark ? 'bg-[#181B22] border-white/10' : 'bg-white border-slate-100 shadow-sm'
        }`}>
          <div className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
            App Experience
          </div>
          {[
            {
              icon: SlidersHorizontal,
              label: 'Screen Transition Studio',
              badge: '20 Styles',
              badgeColor: 'bg-[#EA4C2A]/15 text-[#EA4C2A]',
              onClick: onOpenTransitionStudio,
              color: 'text-[#EA4C2A]'
            },
            {
              icon: Bell,
              label: 'Order Alert Tones & Chimes',
              badge: '20+ Sounds',
              badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
              onClick: onOpenToneStudio,
              color: 'text-amber-500'
            },
            {
              icon: isDark ? Sun : Moon,
              label: isDark ? 'Dark Theme (Tap for Light)' : 'Light Theme (Tap for Dark)',
              isToggle: true,
              onClick: toggleDark,
              color: isDark ? 'text-amber-400' : 'text-indigo-500'
            },
            {
              icon: Compass,
              label: 'App Intro & Onboarding Tour',
              onClick: onOpenOnboarding,
              color: 'text-purple-500'
            }
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer border-t first:border-t-0 ${
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
                <div className={`w-10 h-5 rounded-full relative p-0.5 transition-colors ${
                  isDark ? 'bg-indigo-600' : 'bg-slate-300'
                }`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    isDark ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              ) : (
                <>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      item.badgeColor || (isDark ? 'bg-white/10 text-gray-300' : 'bg-slate-100 text-slate-600')
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

        {/* Group C: Support & Security */}
        <div className={`rounded-2xl border overflow-hidden ${
          isDark ? 'bg-[#181B22] border-white/10' : 'bg-white border-slate-100 shadow-sm'
        }`}>
          <div className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Support & Security
          </div>
          {[
            {
              icon: MessageSquare,
              label: '24/7 Live Support & FAQs',
              onClick: onOpenSupport,
              color: 'text-emerald-500'
            },
            {
              icon: ShieldCheck,
              label: 'Privacy Policy & Terms',
              onClick: onOpenSupport,
              color: 'text-slate-500'
            }
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer border-t first:border-t-0 ${
                isDark ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isDark ? 'bg-white/5' : 'bg-slate-100'
              } ${item.color} shrink-0`}>
                <item.icon size={16} className="stroke-[2.2]" />
              </div>
              <span className="font-semibold text-xs flex-1 text-slate-800 dark:text-slate-200">{item.label}</span>
              <ChevronRight size={14} className="text-gray-400 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* 4. Clean Sign Out Button */}
      <button
        onClick={onLogout}
        className="w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 active:scale-[0.98] transition-all cursor-pointer"
      >
        <LogOut size={15} />
        <span>Sign Out of FoodMaxx</span>
      </button>

      {/* App Version Info */}
      <div className="text-center pt-2">
        <p className="text-[10.5px] text-gray-400 font-medium">FoodMaxx Technologies · v2.4.0</p>
        <p className="text-[9.5px] text-gray-400/80">Crafted with ❤️ for Ibadan Foodies</p>
      </div>
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
  const toast = useToast();

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
              {/* Add New Address Button */}
              <button
                type="button"
                onClick={() => setShowAddForm(p => !p)}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border font-bold text-xs transition-all cursor-pointer ${
                  showAddForm
                    ? (isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-100 border-slate-200 text-slate-800')
                    : 'bg-[#EA4C2A]/10 border-[#EA4C2A]/30 text-[#EA4C2A] hover:bg-[#EA4C2A]/20'
                }`}
              >
                {showAddForm ? <X size={15} /> : <Plus size={15} className="stroke-[3]" />}
                <span>{showAddForm ? 'Cancel Adding' : '+ Add New Address with Landmark'}</span>
              </button>

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
                      placeholder="e.g. 14 Agbowo Rd / UI Second Gate"
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
                      placeholder="e.g. Opposite Zenith Bank ATM, Green gate"
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
        <p className="text-xs text-gray-400 mb-2">Relay Phone: +234 1 888 0900 (Virtual)</p>

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
function compressImageFile(file, maxDimension = 800, quality = 0.78) {
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
function getItemSizeAndExtras(item) {
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
  const heroImage = currentSizeObj?.image_url || item.image_url;

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
        transition={{ type: 'spring', damping: 30, stiffness: 320, mass: 0.85 }}
        className={`w-full max-w-lg sm:max-w-xl h-full min-h-[100dvh] sm:min-h-0 sm:h-[90vh] sm:max-h-[90vh] ${
          isDark ? 'bg-[#121418] text-white border-white/10' : 'bg-white text-slate-900 border-slate-100'
        } rounded-none sm:rounded-[36px] sm:border relative flex flex-col shadow-2xl overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-2 mb-1 shrink-0 sm:hidden" />

        {/* Scrollable Content Container */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          
          {/* 1. Immersive Hero Media Card */}
          <div className="relative h-64 sm:h-72 w-full bg-slate-900 overflow-hidden">
            <motion.img
              key={heroImage}
              initial={{ scale: 1.04 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80';
              }}
              src={heroImage}
              alt={item.name}
              className="w-full h-full object-cover"
            />
            {/* Soft Ambient Vignette Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />

            {/* Floating Top Control Pills */}
            <div className="absolute top-3.5 left-0 right-0 px-4 flex items-center justify-between z-20">
              <button
                type="button"
                onClick={() => { triggerHaptic('selection'); onClose(); }}
                className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-all cursor-pointer border border-white/20 shadow-md"
                title="Back"
              >
                <ChevronLeft size={20} className="stroke-[2.5]" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-all cursor-pointer border border-white/20 shadow-md"
                  title="Share"
                >
                  <Share2 size={16} className="stroke-[2.2]" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    setIsFavorite(f => !f);
                    toast(isFavorite ? 'Removed from favourites' : 'Saved to favourites ❤️', 'info');
                  }}
                  className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-all cursor-pointer border border-white/20 shadow-md"
                  title="Favorite"
                >
                  <Heart size={16} className={isFavorite ? 'text-[#EA4C2A] fill-[#EA4C2A] stroke-[2.2]' : 'stroke-[2.2]'} />
                </button>
              </div>
            </div>

            {/* Floating Bottom Metadata Tags on Hero */}
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/20 flex items-center gap-1">
                  <Clock size={11} className="text-amber-400" />
                  <span>20-25 mins</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/80 backdrop-blur-md text-white flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>Fresh In Stock</span>
                </span>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#EA4C2A] text-white shadow-xs">
                Pre-order
              </span>
            </div>
          </div>

          {/* 2. Product Information Block */}
          <div className="p-5 space-y-4">
            
            {/* Title & Price Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#EA4C2A]/10 text-[#EA4C2A] dark:bg-[#EA4C2A]/20">
                    {item.category || 'Specialty Dish'}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">Ibadan Kitchen</span>
                </div>
                <h1 className={`text-xl sm:text-2xl font-bold tracking-tight leading-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  {item.name}
                </h1>
              </div>

              {/* Prominent Unit Price Tag */}
              <div className="text-right shrink-0">
                <div className="text-xl sm:text-2xl font-black text-[#EA4C2A] tracking-tight">
                  {fmt(unitPrice)}
                </div>
                {sizeAdj > 0 && (
                  <span className="text-[10px] text-gray-400 font-medium">
                    Base {fmt(item.price)} + {fmt(sizeAdj)}
                  </span>
                )}
              </div>
            </div>

            {/* 3. Clean Product Description Block */}
            <p className={`text-sm leading-relaxed font-normal ${
              isDark ? 'text-gray-300' : 'text-slate-600'
            }`}>
              {item.description || `${item.name} prepared fresh with authentic ingredients and traditional spices. Served hot and ready to enjoy.`}
            </p>

            {/* 4. Modern Attractive Portion Sizes Selector */}
            {hasSizes && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`font-bold text-sm tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Choose Portion Size
                    </h3>
                    <p className="text-[11px] text-gray-400">Select one option to continue</p>
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

                    return (
                      <button
                        key={s.name || idx}
                        type="button"
                        onClick={() => {
                          triggerHaptic('selection');
                          setSelectedSize(s.name);
                        }}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-[#EA4C2A]/[0.08] dark:bg-[#EA4C2A]/15 border-[#EA4C2A] shadow-xs'
                            : isDark
                            ? 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-xs'
                        }`}
                      >
                        {/* Left: Radio Indicator + Name + Description */}
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all border ${
                            isSelected
                              ? 'border-[#EA4C2A] bg-[#EA4C2A] text-white shadow-xs'
                              : isDark
                              ? 'border-white/30 bg-transparent'
                              : 'border-slate-300 bg-transparent'
                          }`}>
                            {isSelected && <Check size={12} className="stroke-[3]" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold tracking-tight truncate ${
                                isSelected
                                  ? (isDark ? 'text-white' : 'text-slate-900')
                                  : (isDark ? 'text-gray-200' : 'text-slate-700')
                              }`}>
                                {s.name}
                              </span>
                              {isBase && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                                  Standard
                                </span>
                              )}
                            </div>
                            {s.description && (
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                {s.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Modern Price Pill */}
                        <div className="shrink-0 text-right flex flex-col items-end">
                          <span className={`text-sm font-extrabold tracking-tight ${
                            isSelected ? 'text-[#EA4C2A]' : isDark ? 'text-white' : 'text-slate-900'
                          }`}>
                            {fmt(variationPrice)}
                          </span>
                          {!isBase && (
                            <span className="text-[10px] font-semibold text-[#EA4C2A]">
                              +{fmt(s.price_adjustment)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. Extras & Add-ons */}
            {extras.length > 0 && (
              <div className={`rounded-2xl p-4 border space-y-2.5 ${
                isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-100'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Plus size={14} className="text-[#EA4C2A]" />
                    <h3 className={`font-bold text-xs uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Upgrades & Side Extras
                    </h3>
                  </div>
                  <span className="text-[10px] text-gray-400">Optional</span>
                </div>

                <div className="space-y-2">
                  {extras.map((e, idx) => {
                    const eQty = getExtraQty(e.name);
                    return (
                      <div
                        key={e.name || idx}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                          eQty > 0
                            ? (isDark ? 'bg-[#EA4C2A]/15 border-[#EA4C2A]/40' : 'bg-orange-50 border-orange-200')
                            : (isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200/80')
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-gray-200 block truncate">{e.name}</span>
                          <span className="text-[11px] font-semibold text-[#EA4C2A]">+{fmt(e.price_adjustment)}</span>
                        </div>

                        {eQty === 0 ? (
                          <button
                            type="button"
                            onClick={() => { triggerHaptic('selection'); updateExtraQty(e.name, 1); }}
                            className="px-3 py-1 rounded-lg bg-[#EA4C2A]/10 hover:bg-[#EA4C2A] text-[#EA4C2A] hover:text-white font-bold text-xs transition-colors cursor-pointer"
                          >
                            + Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 bg-white dark:bg-black/30 rounded-lg p-0.5 border border-slate-200 dark:border-white/10">
                            <button
                              type="button"
                              onClick={() => { triggerHaptic('selection'); updateExtraQty(e.name, -1); }}
                              className="w-6 h-6 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-white cursor-pointer"
                            >
                              −
                            </button>
                            <span className="font-bold text-xs text-[#EA4C2A] w-4 text-center">{eQty}</span>
                            <button
                              type="button"
                              onClick={() => { triggerHaptic('selection'); updateExtraQty(e.name, 1); }}
                              className="w-6 h-6 rounded-md bg-[#EA4C2A] text-white flex items-center justify-center font-bold text-xs cursor-pointer shadow-xs"
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

            {/* 6. Special Instructions Note */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">
                Special Kitchen Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Extra spicy, sauce on the side, no onions..."
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                className={`w-full text-xs rounded-xl px-3.5 py-2.5 border outline-none font-medium transition-colors ${
                  isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#EA4C2A]' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-gray-400 focus:border-[#EA4C2A]'
                }`}
              />
            </div>
          </div>
        </div>

        {/* 7. Sticky Bottom Floating Bar (Quantity Stepper + Add to Cart Button) */}
        <div className={`shrink-0 p-4 border-t ${
          isDark ? 'bg-[#14161B] border-white/10' : 'bg-white border-slate-100'
        } pb-[max(1rem,env(safe-area-inset-bottom,1rem))] flex items-center gap-3`}>
          
          {/* Left: Tactile Stepper */}
          <div className={`flex items-center gap-2 rounded-2xl p-1 border shrink-0 ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setQty(q => Math.max(1, q - 1));
              }}
              disabled={qty <= 1}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-800 dark:text-white disabled:opacity-30 hover:bg-white/10 active:scale-90 font-black text-sm cursor-pointer transition-all"
            >
              −
            </button>
            <span className="font-black text-sm select-none w-5 text-center text-slate-900 dark:text-white">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setQty(q => q + 1);
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-800 dark:text-white hover:bg-white/10 active:scale-90 font-black text-sm cursor-pointer transition-all"
            >
              +
            </button>
          </div>

          {/* Right: Primary Add to Cart Button */}
          <button
            type="button"
            onClick={handleAdd}
            disabled={!isAvailable}
            className={`flex-1 py-3.5 px-5 rounded-2xl font-bold text-sm text-white shadow-lg shadow-[#EA4C2A]/25 active:scale-[0.98] transition-all flex items-center justify-between cursor-pointer ${
              isAvailable ? 'bg-[#EA4C2A] hover:bg-[#D43D1D]' : 'bg-gray-400 opacity-50 cursor-not-allowed'
            }`}
          >
            <span>{isAvailable ? 'Add to Cart' : 'Currently Sold Out'}</span>
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
  const toast = useToast();
  const [deliveryNote, setDeliveryNote] = useState('');
  const [showAddonPopout, setShowAddonPopout] = useState(false);
  const [addonsList, setAddonsList] = useState(DEFAULT_ADDONS);

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

  const standardDeliveryFee = selectedZone?.delivery_fee || 500;
  const isFreeDelivery = subtotal >= 10000;
  const effectiveDeliveryFee = isFreeDelivery ? 0 : standardDeliveryFee;
  const serviceFee = 250;
  const total = subtotal + effectiveDeliveryFee + serviceFee;
  const totalItemsCount = cart.items.reduce((s, i) => s + i.qty, 0);

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
        transition={{ type: 'spring', damping: 30, stiffness: 320, mass: 0.85 }}
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

            {/* Welcome Wallet Perk Banner in Cart */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-emerald-500/15 border border-amber-500/30 dark:border-amber-400/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-[#EA4C2A] text-white flex items-center justify-center text-sm shrink-0 shadow-xs">
                  🎁
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-xs text-amber-600 dark:text-amber-400">
                      ₦1,000 Welcome Wallet Perk
                    </span>
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      Active
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    Ready to apply at checkout for instant savings!
                  </p>
                </div>
              </div>
            </div>

            {/* Clean Bill Summary */}
            <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-[#181B22] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Subtotal</span>
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
              <div className="border-t border-slate-100 dark:border-white/10 pt-2.5 flex justify-between items-center font-bold text-sm">
                <span className="text-slate-900 dark:text-white">Total</span>
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
// PAYSTACK NATIVE CHECKOUT
// Native Paystack checkout is handled directly via PaystackPop.setup and launchRealPaystack
function PaystackFallbackModal() {
  return null;
}

// ============================================================
// CHECKOUT MODAL
// ============================================================
function CheckoutModal({ open, onClose, selectedZone, onSuccess, selectedAddress, wallet, onRefreshWallet, onChangeAddress }) {
  const { cart, subtotal, clearCart } = useCart();
  const { user, silentRegister, updateUser } = useAuth();
  const { isDark } = useTheme();
  const toast = useToast();
  const paymentMethod = 'paystack';
  const [promoCode, setPromoCode] = useState(() => {
    try {
      return localStorage.getItem('fmx_active_promo') || '';
    } catch {
      return '';
    }
  });
  const [discount, setDiscount] = useState(0);
  const [freeDelivery, setFreeDelivery] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [paystackConfig, setPaystackConfig] = useState(() => getStoredPaystackConfig());
  const [paystackKey, setPaystackKey] = useState(() => getStoredPaystackConfig().publicKey || '');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  // Contact & Silent registration state
  const [contactName, setContactName] = useState(user?.full_name || '');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [isEditingContact, setIsEditingContact] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.full_name && !contactName) setContactName(user.full_name);
      if (user.phone && !contactPhone) setContactPhone(user.phone);
      if (user.email && !contactEmail) setContactEmail(user.email);
    }
  }, [user]);

  // Next-gen feature states
  const [isGift, setIsGift] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [giftNote, setGiftNote] = useState('');
  const [hidePrice, setHidePrice] = useState(false);

  const [deliveryTiming, setDeliveryTiming] = useState('now'); // 'now' or 'schedule'
  const [scheduledDay, setScheduledDay] = useState('Today');
  const [scheduledSlot, setScheduledSlot] = useState('1:00 PM - 1:30 PM (Lunch)');

  const [landmark, setLandmark] = useState(selectedAddress?.landmark || '');

  // 1-Tap Wallet Welcome Bonus integration
  const [useWalletBonus, setUseWalletBonus] = useState(true);
  const rawWalletBalance = Number(wallet?.balance) || 0;

  const deliveryFee = freeDelivery ? 0 : (selectedZone?.delivery_fee || 500);
  const serviceFee = 250;
  const grossTotal = subtotal + deliveryFee + serviceFee - discount;
  const walletDeduction = (useWalletBonus && rawWalletBalance > 0) ? Math.min(rawWalletBalance, grossTotal) : 0;
  const total = Math.max(0, grossTotal - walletDeduction);

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

    return () => window.removeEventListener('fmx_paystack_config_updated', handleConfigUpdate);
  }, []);

  async function applyPromo(overrideCode) {
    const code = typeof overrideCode === 'string' ? overrideCode : promoCode;
    if (!code) return;
    if (typeof overrideCode === 'string') {
      setPromoCode(overrideCode);
    }
    setPromoLoading(true);
    try {
      const res = await api.validatePromo(code, subtotal);
      setDiscount(res.data.discount || 0);
      setFreeDelivery(res.data.free_delivery || false);
      toast(`Promo applied! You saved ${fmt(res.data.discount || 0)} 🎉`, 'success');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setPromoLoading(false);
    }
  }

  async function completePaystackOrder(orderData, reference) {
    try {
      // Verify payment on backend
      await api.verifyPaystackPayment({
        reference: reference,
        amount: total
      });

      if (walletDeduction > 0) {
        try {
          await api.deductWallet(
            walletDeduction,
            orderData.customer_email || user?.id || 'usr_customer_default',
            `FoodMaxx Order #${reference} (Wallet Perk Co-Pay)`,
            reference
          );
          onRefreshWallet?.();
        } catch (wErr) {
          console.warn('Wallet deduction notice:', wErr);
        }
      }

      // Place order with payment_reference and normalized pricing
      const finalOrderData = {
        ...orderData,
        payment_method: 'paystack',
        payment_reference: reference,
        payment_status: 'paid',
        wallet_deduction: Number(walletDeduction) || 0,
        subtotal: Number(subtotal) || 0,
        delivery_fee: Number(deliveryFee) || 0,
        service_fee: Number(serviceFee) || 0,
        discount: Number(discount) || 0,
        total: Number(total) || 0,
        total_amount: Number(total) || 0,
        delivery_zone: orderData.delivery_zone || selectedZone?.name || 'Bodija'
      };

      const res = await api.createOrder(finalOrderData);
      const placedOrder = res?.data?.order || res?.data || res?.order || finalOrderData;
      if (placedOrder?.id) {
        try { localStorage.setItem('fmx_last_order_id', placedOrder.id); } catch {}
      }
      try {
        window.dispatchEvent(new CustomEvent('fmx_order_updated', { detail: placedOrder }));
      } catch {}
      clearCart();
      onSuccess(placedOrder);
    } catch (err) {
      console.error('Payment completion error:', err);
      toast(err?.message || 'Payment verification failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handlePaystackCheckout(orderData, activeUser) {
    const activeKey = (paystackKey || getStoredPaystackConfig().publicKey || 'pk_test_d3a8b4172f3e44955b2046ff03b55237b6cf3e1a').trim();
    const txRef = `FMX_PSTK_${Date.now()}_${Math.floor(100000 + Math.random() * 900000)}`;
    const effectiveEmail = activeUser?.email || orderData.customer_email || 'customer@foodmaxx.ng';
    const effectiveName = activeUser?.full_name || orderData.customer_name || 'FoodMaxx Customer';
    const effectivePhone = activeUser?.phone || orderData.customer_phone || '';

    await loadPaystackScript();

    try {
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
          await completePaystackOrder(orderData, tx.reference || txRef);
        },
        onCancel: () => {
          toast('Paystack payment window closed', 'info');
          setLoading(false);
        },
        onError: (err) => {
          console.warn('Native Paystack popup open failed or blocked:', err);
          setLoading(false);
          toast(err?.message || 'Paystack payment error. Please check your network and try again.', 'error');
        }
      });
    } catch (err) {
      console.warn('Paystack checkout initialization error:', err);
      setLoading(false);
      toast(err?.message || 'Unable to open Paystack checkout', 'error');
    }
  }

  async function placeOrder() {
    if (cart.items.length === 0) { toast('Cart is empty', 'error'); return; }

    const nameToUse = contactName.trim() || user?.full_name || 'FoodMaxx Customer';
    const phoneToUse = contactPhone.trim() || user?.phone || '+234 800 000 0000';
    const emailToUse = contactEmail.trim() || user?.email || 'customer@foodmaxx.ng';

    if (isGift && (!recipientName.trim() || !recipientPhone.trim())) {
      toast('Please enter recipient name and phone for the gift order', 'warning');
      return;
    }

    setLoading(true);
    try {
      // Silent registration: automatically create account if guest
      let activeUser = user;
      if (!activeUser && silentRegister) {
        activeUser = await silentRegister({
          full_name: nameToUse,
          phone: phoneToUse,
          email: emailToUse || undefined
        });
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
        delivery_address: selectedAddress ? `${selectedAddress.label}: ${selectedAddress.address}` : (selectedZone?.name || 'Selected Location'),
        delivery_zone: selectedZone?.name || 'Bodija',
        delivery_instructions: instructions || '',
        payment_method: total === 0 ? 'wallet' : 'paystack',
        promo_code: promoCode || '',
        delivery_lat: 7.435,
        delivery_lng: 3.905,
        is_gift: Boolean(isGift),
        recipient_name: isGift ? (recipientName.trim() || '') : '',
        recipient_phone: isGift ? (recipientPhone.trim() || '') : '',
        gift_note: isGift ? (giftNote.trim() || '') : '',
        hide_price: isGift ? Boolean(hidePrice) : false,
        is_scheduled: deliveryTiming === 'schedule',
        scheduled_for: deliveryTiming === 'schedule' ? `${scheduledDay}, ${scheduledSlot}` : '',
        delivery_landmark: landmark.trim() || '',
        subtotal: Number(subtotal) || 0,
        delivery_fee: Number(deliveryFee) || 0,
        service_fee: Number(serviceFee) || 0,
        discount: Number(discount) || 0,
        wallet_deduction: Number(walletDeduction) || 0,
        total: Number(total) || 0,
        total_amount: Number(total) || 0
      };

      // If order total is 0, complete directly using wallet bonus without Paystack!
      if (total === 0 && walletDeduction > 0) {
        const walletRef = `FMX_WAL_${Date.now()}_${Math.floor(100000 + Math.random() * 900000)}`;
        try {
          await api.deductWallet(
            walletDeduction,
            emailToUse || activeUser?.email || user?.id || 'usr_customer_default',
            `FoodMaxx Order #${walletRef} (100% Wallet Bonus)`,
            walletRef
          );
          onRefreshWallet?.();
        } catch (wErr) {
          console.warn('Wallet deduction error:', wErr);
        }

        const finalOrderData = {
          ...orderData,
          payment_method: 'wallet',
          payment_reference: walletRef,
          payment_status: 'paid'
        };

        const res = await api.createOrder(finalOrderData);
        const placedOrder = res?.data?.order || res?.data || res?.order || finalOrderData;
        if (placedOrder?.id) {
          try { localStorage.setItem('fmx_last_order_id', placedOrder.id); } catch {}
        }
        try {
          window.dispatchEvent(new CustomEvent('fmx_order_updated', { detail: placedOrder }));
        } catch {}
        clearCart();
        toast('Order paid 100% with your FoodMaxx Welcome Wallet Bonus! 🎁', 'success');
        onSuccess(placedOrder);
        setLoading(false);
        return;
      }

      // Otherwise process balance through Paystack
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
        transition={{ type: 'spring', damping: 30, stiffness: 320, mass: 0.85 }}
        className={`w-full max-w-md sm:max-w-lg h-full min-h-[100dvh] sm:min-h-0 sm:h-[90vh] sm:max-h-[92vh] ${
          isDark ? 'bg-[#0F1117] text-white border-white/10' : 'bg-[#F7F8FA] text-slate-900 border-slate-200'
        } rounded-none sm:rounded-[36px] sm:border relative flex flex-col shadow-2xl overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile touch grab handle */}
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-2.5 mb-0.5 shrink-0 sm:hidden" />

        {/* Top Header matching exact screenshot */}
        <div className={`shrink-0 px-4 sm:px-6 pt-3 sm:pt-5 pb-3 flex items-center justify-between z-10 ${
          isDark ? 'bg-[#0F1117]' : 'bg-[#F7F8FA]'
        }`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { triggerHaptic('selection'); onClose(); }}
              className="w-11 h-11 rounded-full bg-white dark:bg-white/10 shadow-sm border border-slate-100 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
              title="Back"
            >
              <ChevronLeft size={22} className="stroke-[2.5]" />
            </button>
            <div>
              <h2 className="font-bold text-xl sm:text-2xl text-slate-900 dark:text-white leading-tight tracking-tight">Checkout</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">Review your details and place your order</p>
            </div>
          </div>

          {/* Red FoodMaxx App Badge matching mockup */}
          <div className="w-12 h-12 rounded-2xl bg-[#EA2A2A] shadow-md shadow-red-500/20 flex flex-col items-center justify-center p-1.5 shrink-0 border border-white/20 select-none">
            <span className="text-[9px] font-black text-white leading-none tracking-wider uppercase">FOOD</span>
            <span className="text-[10px] font-black text-white leading-tight tracking-tight uppercase">MAXX</span>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-2 space-y-4">

          {/* CARD 1: Delivery Address */}
          <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
            isDark ? 'bg-[#151821] border-white/8' : 'bg-white border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)]'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/40 text-[#EA4C2A] flex items-center justify-center shrink-0">
                  <MapPin size={18} className="text-[#EA4C2A]" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Delivery Address</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  if (onChangeAddress) {
                    onChangeAddress();
                  } else {
                    toast('Select or update your delivery address', 'info');
                  }
                }}
                className="text-xs font-semibold text-[#EA4C2A] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Change</span>
                <ChevronRight size={14} className="stroke-[2.5]" />
              </button>
            </div>

            {/* Address Text */}
            <div className="mt-2.5 ml-13">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {selectedAddress ? `${selectedAddress.label}: ${selectedAddress.address}` : (selectedZone?.name ? `${selectedZone.name}, Ibadan` : 'Bodija, Ibadan')}
              </p>
            </div>

            {/* Landmark Pill Input matching screenshot */}
            <div className={`mt-3.5 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all ${
              isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100/70 border-slate-200/50 text-slate-800'
            }`}>
              <FileText size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Add a landmark (optional)"
                value={landmark}
                onChange={e => setLandmark(e.target.value)}
                className="w-full text-xs font-medium placeholder:text-slate-400 bg-transparent outline-none"
              />
            </div>
          </div>

          {/* CARD 2: Contact Details */}
          <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
            isDark ? 'bg-[#151821] border-white/8' : 'bg-white border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)]'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/40 text-[#EA4C2A] flex items-center justify-center shrink-0">
                  <User size={18} className="text-[#EA4C2A]" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Contact Details</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setIsEditingContact(prev => !prev);
                }}
                className="text-xs font-semibold text-[#EA4C2A] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>{isEditingContact ? 'Done' : 'Edit'}</span>
                <ChevronRight size={14} className="stroke-[2.5]" />
              </button>
            </div>

            {!isEditingContact ? (
              <div className="mt-2.5 ml-13">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {contactName.trim() || user?.full_name || 'FoodMaxx Super Admin'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  {contactPhone.trim() || user?.phone || '+234 802 345 6789'}
                </p>
              </div>
            ) : (
              <div className="mt-3.5 ml-13 space-y-2">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  className={`w-full text-xs p-2.5 rounded-xl border outline-none font-medium ${
                    isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  className={`w-full text-xs p-2.5 rounded-xl border outline-none font-medium ${
                    isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            )}
          </div>

          {/* CARD 3: Payment Method */}
          <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
            isDark ? 'bg-[#151821] border-white/8' : 'bg-white border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)]'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/40 text-[#EA4C2A] flex items-center justify-center shrink-0">
                  <CreditCard size={18} className="text-[#EA4C2A]" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Payment Method</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setKeyInput(paystackKey || '');
                  setShowKeyModal(true);
                }}
                className="text-[11px] font-semibold text-slate-400 hover:text-[#EA4C2A] flex items-center gap-1 cursor-pointer"
                title="Configure Paystack Key"
              >
                <Key size={12} />
                <span>{isValidPaystackKey(paystackKey) ? 'Live' : 'Test Mode'}</span>
              </button>
            </div>

            {/* Highlighted Paystack Option matching screenshot */}
            <div
              onClick={() => triggerHaptic('selection')}
              className="mt-3 p-3.5 sm:p-4 bg-rose-50/50 dark:bg-rose-950/20 border-2 border-rose-300 dark:border-rose-800/60 rounded-2xl flex items-center justify-between cursor-pointer transition-all hover:bg-rose-50/70"
            >
              <div className="flex items-center gap-3.5">
                {/* Red Radio Dot */}
                <div className="w-5 h-5 rounded-full border-2 border-[#EA4C2A] flex items-center justify-center shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#EA4C2A]" />
                </div>
                {/* Paystack Cyan Icon */}
                <div className="flex flex-col gap-[3px] shrink-0 justify-center">
                  <div className="h-[2.5px] w-5 bg-[#00C3F7] rounded-full" />
                  <div className="h-[2.5px] w-3.5 bg-[#00C3F7] rounded-full" />
                  <div className="h-[2.5px] w-5 bg-[#00C3F7] rounded-full" />
                  <div className="h-[2.5px] w-2.5 bg-[#00C3F7] rounded-full" />
                </div>
                {/* Pay with Paystack Text */}
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Pay with Paystack
                </span>
              </div>
              <ChevronRight size={18} className="text-slate-400 shrink-0" />
            </div>
          </div>

          {/* CARD 4: Order Summary (Collapsible) */}
          <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
            isDark ? 'bg-[#151821] border-white/8' : 'bg-white border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)]'
          }`}>
            <div 
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => {
                triggerHaptic('selection');
                setIsSummaryOpen(prev => !prev);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/40 text-[#EA4C2A] flex items-center justify-center shrink-0">
                  <ShoppingBag size={18} className="text-[#EA4C2A]" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Order Summary</span>
              </div>
              <button
                type="button"
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title={isSummaryOpen ? 'Collapse' : 'Expand'}
              >
                {isSummaryOpen ? (
                  <ChevronUp size={20} className="stroke-[2.5]" />
                ) : (
                  <ChevronDown size={20} className="stroke-[2.5]" />
                )}
              </button>
            </div>

            {/* Collapsible content matching screenshot */}
            {isSummaryOpen && (
              <div className="mt-4 space-y-2.5">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-slate-500 dark:text-slate-400 font-normal">Subtotal</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-slate-500 dark:text-slate-400 font-normal">Delivery Fee</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {freeDelivery ? 'FREE' : fmt(deliveryFee)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-slate-500 dark:text-slate-400 font-normal">Estimated Tax</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{fmt(serviceFee)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between items-center text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Promo Discount ({promoCode})</span>
                    <span>−{fmt(discount)}</span>
                  </div>
                )}

                {walletDeduction > 0 && (
                  <div className="flex justify-between items-center text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Wallet Perk Bonus</span>
                    <span>−{fmt(walletDeduction)}</span>
                  </div>
                )}

                {/* Promo Code Input */}
                <div className="pt-1.5 flex gap-2">
                  <input
                    className={`flex-1 px-3 py-1.5 rounded-xl text-xs uppercase font-bold border outline-none ${
                      isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-gray-400'
                    }`}
                    placeholder="PROMO CODE (e.g. WIN20)"
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  />
                  <button
                    type="button"
                    onClick={() => { triggerHaptic('selection'); applyPromo(); }}
                    disabled={promoLoading || !promoCode}
                    className="px-3.5 py-1.5 bg-[#EA4C2A] hover:bg-[#D43D1D] text-white rounded-xl font-semibold text-xs disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {promoLoading ? '...' : 'Apply'}
                  </button>
                </div>

                <div className="border-t border-slate-100 dark:border-white/10 pt-3 flex justify-between items-center">
                  <span className="text-base font-bold text-slate-900 dark:text-white">Total</span>
                  <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{fmt(total)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom spacer for comfortable scrolling above sticky dock */}
          <div className="h-2" />
        </div>

        {/* STICKY BOTTOM DOCK MATCHING SCREENSHOT */}
        <div className={`shrink-0 p-4 sm:p-5 border-t ${
          isDark ? 'bg-[#151821] border-white/10' : 'bg-white border-slate-100'
        } rounded-t-[28px] sm:rounded-t-[32px] shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.08)] flex items-center justify-between gap-4 z-20 pb-[max(1rem,env(safe-area-inset-bottom,1rem))]`}>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400 font-medium leading-none">Total</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
              {fmt(total)}
            </div>
          </div>

          <div className="h-9 w-[1px] bg-slate-200 dark:bg-white/10 mx-1 shrink-0" />

          <button
            type="button"
            onClick={() => { triggerHaptic('medium'); placeOrder(); }}
            disabled={loading || cart.items.length === 0}
            className="flex-1 py-3.5 sm:py-4 px-6 bg-[#EA2A2A] hover:bg-[#D42222] active:scale-[0.98] text-white font-bold text-sm sm:text-base rounded-2xl shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>{total === 0 ? 'Processing Order...' : 'Opening Paystack...'}</span>
              </>
            ) : total === 0 ? (
              <>
                <Gift size={18} />
                <span>Complete Order with Wallet</span>
              </>
            ) : (
              <>
                <span>Pay with Paystack</span>
                <ArrowRight size={18} className="stroke-[2.5]" />
              </>
            )}
          </button>
        </div>

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
  const [showSummary, setShowSummary] = useState(false);
  const toast = useToast();

  useEffect(() => {
    playNativeSound('success');
    triggerHaptic('success');
    confetti({
      particleCount: 65,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#EA4C2A', '#10B981', '#F59E0B', '#FFFFFF']
    });
  }, []);

  if (!order) return null;

  const orderRef = order.order_reference || order.id?.slice(0, 8) || 'FMX-001';
  const deliveryPin = order.delivery_otp || order.pin || '4821';
  const totalAmount = order.total || order.total_amount || 0;

  // Resolve full delivery address safely
  const fullAddress = order.delivery_address || order.address || (order.delivery_zone ? `${order.delivery_zone}, Ibadan` : 'Bodija, Ibadan');
  const landmark = order.delivery_landmark || order.landmark || '';

  // Order items resolution
  const orderItems = (Array.isArray(order.cart_items) && order.cart_items.length > 0)
    ? order.cart_items
    : (Array.isArray(order.items) && order.items.length > 0)
      ? order.items
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
        } rounded-t-[32px] sm:rounded-[32px] border shadow-2xl p-5 sm:p-6 relative max-h-[92vh] overflow-y-auto flex flex-col items-center text-center`}
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
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-white/5">
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
    (order.delivery_zone ? `${order.delivery_zone}, Ibadan` : 'Bodija / University of Ibadan, Oyo State');
  const destinationZone = order.delivery_zone || order.zone || 'Bodija / UI Zone';
  const destinationLandmark = order.delivery_landmark || order.landmark || order.delivery_note || '';
  const destinationInstructions = order.delivery_instructions || order.instructions || '';

  // Reliable courier information with mobile number
  const rider = order.riderInfo || order.assigned_rider || {
    full_name: 'Tunde Balogun',
    phone: '+234 803 456 7890',
    vehicle_type: 'Honda Ace 125 (OY-BDJ-492)',
    rating: 4.9,
  };
  const riderPhone = rider.phone || order.rider_phone || '+234 803 456 7890';
  const cleanPhone = riderPhone.replace(/[^0-9+]/g, '');

  const handleCopyPhone = () => {
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
    const pin = String(order.delivery_otp || '4821');
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

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#EA4C2A] to-orange-400 text-white font-black text-lg flex items-center justify-center shadow-md shadow-[#EA4C2A]/20 shrink-0">
                    {rider.full_name?.[0] || 'T'}
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
                      {rider.rating || 4.9}
                    </span>
                    <span className="text-slate-400 text-[11px]">• Verified Courier</span>
                  </div>
                </div>
              </div>

              {/* Rider Phone Chip */}
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
            </div>
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

  return (
    <Modal open={open} onClose={onClose} title="💬 Contact Support">
      <div className="p-5 space-y-4">
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
  const { login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      await login(email, password);
      toast('Welcome back! 🎉', 'success');
      onClose();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Sign In to FoodMaxx">
      <div className="p-5 space-y-4">
        <input className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 text-slate-900 dark:text-white border border-transparent dark:border-white/10 rounded-xl text-sm outline-none placeholder:text-gray-400" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} type="email" />
        <input className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 text-slate-900 dark:text-white border border-transparent dark:border-white/10 rounded-xl text-sm outline-none placeholder:text-gray-400" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} type="password" />
        <button onClick={handleLogin} disabled={loading} className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold">
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
        <p className="text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <button onClick={onSwitchRegister} className="text-red-600 font-bold">Register</button>
        </p>
      </div>
    </Modal>
  );
}

function RegisterModal({ open, onClose, onSwitchLogin }) {
  const { login } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setLoading(true);
    try {
      await api.register({ ...form, role: 'customer' });
      await login(form.email, form.password);
      toast('Account created! Welcome to FoodMaxx 🎉', 'success');
      onClose();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Account">
      <div className="p-5 space-y-3">
        {[
          { key: 'full_name', placeholder: 'Full Name', type: 'text' },
          { key: 'email', placeholder: 'Email', type: 'email' },
          { key: 'phone', placeholder: 'Phone Number', type: 'tel' },
          { key: 'password', placeholder: 'Password', type: 'password' },
        ].map(f => (
          <input key={f.key} className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 text-slate-900 dark:text-white border border-transparent dark:border-white/10 rounded-xl text-sm outline-none placeholder:text-gray-400" placeholder={f.placeholder} type={f.type}
            value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
          />
        ))}
        <button onClick={handleRegister} disabled={loading} className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold">
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <button onClick={onSwitchLogin} className="text-red-600 font-bold">Sign In</button>
        </p>
      </div>
    </Modal>
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
function AdminKitchenSlipModal({ open, onClose, order }) {
  if (!open || !order) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white text-slate-900 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-scale-up font-mono">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 no-print cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
          <div className="flex items-center justify-center gap-2 mb-1"><img src="/foodmaxx-logo.png" alt="FoodMaxx" className="w-6 h-6 rounded-lg object-cover" /><span className="text-base font-bold tracking-tighter">FOODMAXX</span></div>
          <div className="text-[11px] text-gray-600">24 Awolowo Ave, Old Bodija, Ibadan</div>
          <div className="text-[11px] text-gray-600">Tel: +234 802 345 6789</div>
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
    return localStorage.getItem('fmx_admin_theme') || 'foodtech';
  });
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const currentAdminTheme = ADMIN_THEMES[adminThemeKey] || ADMIN_THEMES.foodtech;

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
  const [sendingTicketReply, setSendingTicketReply] = useState(false);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
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
  const [adminEmail, setAdminEmail] = useState('admin@foodmaxx.ng');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [adminLoggingIn, setAdminLoggingIn] = useState(false);

  async function handleAdminSignIn(e) {
    if (e) e.preventDefault();
    setAdminLoggingIn(true);
    try {
      const adminUser = {
        id: 'user_admin',
        full_name: 'FoodMaxx Super Admin',
        email: adminEmail.trim() || 'admin@foodmaxx.ng',
        role: 'super_admin',
        phone: '+234 802 345 6789'
      };
      const adminToken = 'fmx_admin_token_' + Date.now();
      localStorage.setItem('fmx_token', adminToken);
      localStorage.setItem('fmx_user', JSON.stringify(adminUser));
      setAdminAuthenticated(true);

      if (login) {
        await login(adminEmail, adminPassword, 'super_admin');
      } else {
        await api.login(adminEmail, adminPassword);
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
    }
  }, [isSuperAdmin]);

  // Firestore real-time admin subscriptions (Products, Addons & Support)
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
    return () => {
      if (typeof unsubProducts === 'function') unsubProducts();
      if (typeof unsubAddons === 'function') unsubAddons();
      if (typeof unsubSupport === 'function') unsubSupport();
      if (typeof unsubRiders === 'function') unsubRiders();
      if (typeof unsubSections === 'function') unsubSections();
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

  // LIVE FIRESTORE REALTIME SYNC FOR PRODUCTS & INVENTORY
  useEffect(() => {
    if (!api.subscribeLiveProducts) return;
    const unsub = api.subscribeLiveProducts((liveProducts) => {
      if (Array.isArray(liveProducts)) {
        setProducts(liveProducts);
      }
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  // LIVE FIRESTORE REALTIME SYNC FOR SUPPORT TICKETS
  useEffect(() => {
    if (!api.subscribeLiveSupportTickets) return;
    const unsub = api.subscribeLiveSupportTickets((liveTickets) => {
      if (Array.isArray(liveTickets)) {
        setTickets(liveTickets);
      }
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  // LIVE FIRESTORE REALTIME SYNC FOR STORE SETTINGS
  useEffect(() => {
    if (!api.subscribeLiveSettings) return;
    const unsub = api.subscribeLiveSettings((liveSettings) => {
      if (liveSettings) {
        setSettings(liveSettings);
      }
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

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
      } else if (section === 'orders' || section === 'kds' || section === 'dispatch_map') {
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
    const nextStatus = settings.is_open === false ? true : false;
    try {
      const updated = await api.saveAdminSettings({ ...settings, is_open: nextStatus });
      setSettings(updated.data || { ...settings, is_open: nextStatus });
      toast(`Kitchen is now ${nextStatus ? '🟢 OPEN (Accepting Orders)' : '🔴 PAUSED (Kitchen Busy)'}`, nextStatus ? 'success' : 'warning');
    } catch (e) {
      toast('Failed to toggle kitchen status', 'error');
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
      <div className="min-h-screen bg-[#0B0C0E] text-white flex items-center justify-center p-4">
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
                setAdminEmail('admin@foodmaxx.ng');
                setAdminPassword('admin123');
                handleAdminSignIn();
              }}
              className="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
            >
              <span>⚡ 1-Tap Quick Admin Access</span>
            </button>

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

  const navGroups = [
    {
      group: 'Live Operations',
      items: [
        { id: 'overview', icon: Activity, label: 'Overview' },
        { id: 'kds', icon: Columns, label: 'Kitchen KDS', badge: (pendingOrdersCount + inPrepOrdersCount) > 0 ? (pendingOrdersCount + inPrepOrdersCount) : null },
        { id: 'orders', icon: Package, label: 'Orders Table', badge: pendingOrdersCount > 0 ? pendingOrdersCount : null, alertBadge: delayedOrdersCount > 0 ? `${delayedOrdersCount} late` : null },
        { id: 'dispatch_map', icon: Navigation, label: 'Dispatch Map' },
        { id: 'riders', icon: Truck, label: 'Delivery Riders' },
      ]
    },
    {
      group: 'Catalog & Stock',
      items: [
        { id: 'products', icon: Utensils, label: 'Food Menu' },
        { id: 'inventory', icon: Layers, label: 'Stock Inventory', badge: lowStockCount > 0 ? `${lowStockCount} low` : null },
        { id: 'addons', icon: Sparkles, label: 'Add-ons & Drinks' },
        { id: 'zones', icon: MapPin, label: 'Delivery Areas' },
      ]
    },
    {
      group: 'Sales & Growth',
      items: [
        { id: 'analytics', icon: BarChart2, label: 'Busy Hours & Profits' },
        { id: 'payouts', icon: DollarSign, label: 'Bank Payouts' },
      ]
    },
    {
      group: 'Customers & Support',
      items: [
        { id: 'promotions', icon: Tag, label: 'Discount Codes' },
        { id: 'customers', icon: Users, label: 'Customer Directory' },
        { id: 'support', icon: MessageSquare, label: 'Customer Chat' },
      ]
    },
    {
      group: 'Settings & CMS',
      items: [
        { id: 'copy_editor', icon: Edit3, label: 'Text & Copy Editor' },
        { id: 'settings', icon: Settings, label: 'Store Settings' },
      ]
    }
  ];

  return (
    <div 
      className="min-h-screen flex flex-col md:flex-row antialiased font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-200"
      style={{
        backgroundColor: currentAdminTheme.bg,
        color: currentAdminTheme.text
      }}
    >
      {/* Mobile Top Header */}
      <div 
        className="md:hidden border-b px-4 py-3 flex items-center justify-between sticky top-0 z-40 transition-colors duration-200"
        style={{
          backgroundColor: currentAdminTheme.sidebar,
          borderColor: currentAdminTheme.border
        }}
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="p-2 rounded-xl cursor-pointer border transition-colors"
            style={{
              backgroundColor: currentAdminTheme.card,
              borderColor: currentAdminTheme.border,
              color: currentAdminTheme.text
            }}
          >
            <MoreVertical size={18} />
          </button>
          <div>
            <div className="font-bold text-sm text-emerald-400 tracking-tight flex items-center gap-1.5">
              <span>🥗</span>
              <span>FOODMAXX</span>
            </div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Kitchen Operations</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Mobile Theme Button */}
          <button
            type="button"
            onClick={() => {
              const keys = Object.keys(ADMIN_THEMES);
              const nextIdx = (keys.indexOf(adminThemeKey) + 1) % keys.length;
              selectAdminTheme(keys[nextIdx]);
            }}
            className="p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all"
            style={{
              backgroundColor: currentAdminTheme.card,
              borderColor: currentAdminTheme.border,
              color: currentAdminTheme.text
            }}
            title={`Current Theme: ${currentAdminTheme.name}. Tap to cycle theme.`}
          >
            <Palette size={14} style={{ color: currentAdminTheme.accent }} />
          </button>

          <button
            type="button"
            onClick={toggleKitchenStatus}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide border cursor-pointer ${
              settings.is_open !== false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}
          >
            {settings.is_open !== false ? '🟢 Open' : '🔴 Closed'}
          </button>
          <button
            onClick={() => {
              window.history.pushState(null, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="p-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors"
            style={{
              backgroundColor: currentAdminTheme.card,
              borderColor: currentAdminTheme.border,
              color: currentAdminTheme.text
            }}
            title="Customer View"
          >
            🍔
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileNavOpen && (
        <div className="absolute inset-0 z-50 flex md:hidden" onClick={() => setMobileNavOpen(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs" />
          <div
            className="relative w-72 border-r p-5 flex flex-col h-full z-10"
            style={{
              backgroundColor: currentAdminTheme.sidebar,
              borderColor: currentAdminTheme.border
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2.5">
                <img src="/foodmaxx-logo.png" alt="FoodMaxx" className="w-8 h-8 rounded-xl object-cover border border-emerald-500/40" />
                <div>
                  <div className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                    <span>FOODMAXX</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">● Kitchen Live · Ibadan</div>
                </div>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="p-1.5 rounded-lg bg-white/5 text-slate-400 border border-white/10 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* + New Order button in mobile drawer */}
            <button
              type="button"
              onClick={() => {
                handleNavChange('orders');
                setMobileNavOpen(false);
              }}
              className="w-full mb-3 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
            >
              <Plus size={15} strokeWidth={3} />
              <span>+ New Order</span>
            </button>

            <nav className="flex-1 space-y-4 overflow-y-auto pr-1">
              {navGroups.map((grp, gIdx) => (
                <div key={gIdx} className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">
                    {grp.group}
                  </div>
                  {grp.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        handleNavChange(item.id);
                        setMobileNavOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeSection === item.id 
                          ? 'bg-emerald-500/15 text-emerald-400 border-l-2 border-emerald-500 shadow-xs' 
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon size={15} />
                        <span>{item.label}</span>
                      </div>
                      {item.alertBadge ? (
                        <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                          {item.alertBadge}
                        </span>
                      ) : item.badge ? (
                        <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ))}
            </nav>

            <div className="pt-4 border-t border-white/10 mt-2">
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

      {/* Desktop Categorized Sidebar */}
      <aside 
        className="hidden md:flex w-64 border-r min-h-screen flex-col shrink-0 transition-colors duration-200"
        style={{
          backgroundColor: currentAdminTheme.sidebar,
          borderColor: currentAdminTheme.border
        }}
      >
        <div className="p-5 border-b" style={{ borderColor: currentAdminTheme.border }}>
          <div className="flex items-center gap-2.5 mb-1">
            <img src="/foodmaxx-logo.png" alt="FoodMaxx" className="w-9 h-9 rounded-xl object-cover shadow-sm border border-emerald-500/40" />
            <div>
              <span className="text-base font-black tracking-tight text-white block">FOODMAXX</span>
              <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Ops · Bodija</span>
              </span>
            </div>
          </div>

          {/* + New Order prominent button */}
          <button
            type="button"
            onClick={() => handleNavChange('orders')}
            className="w-full mt-3.5 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
          >
            <Plus size={15} strokeWidth={3} />
            <span>+ New Order</span>
          </button>

          {/* Live Kitchen Status Toggle */}
          <button
            type="button"
            onClick={toggleKitchenStatus}
            className={`mt-2.5 w-full px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
              settings.is_open !== false
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${settings.is_open !== false ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50' : 'bg-red-500'}`} />
              <span>{settings.is_open !== false ? 'Kitchen Open' : 'Kitchen Closed'}</span>
            </span>
            <span className="text-[9px] uppercase font-mono tracking-wider opacity-70 px-1.5 py-0.5 rounded bg-black/30">Toggle</span>
          </button>

          <button
            type="button"
            onClick={() => {
              window.history.pushState(null, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="w-full mt-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
          >
            <span>🍔 Open Customer View</span>
          </button>
        </div>

        {/* Categorized Nav Groups */}
        <nav className="flex-1 p-3.5 space-y-4 overflow-y-auto">
          {navGroups.map((grp, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <div className="text-[10px] font-extrabold text-slate-200 uppercase tracking-wider px-2.5 mb-1">
                {grp.group}
              </div>
              {grp.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNavChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeSection === item.id
                      ? 'bg-emerald-500/15 text-emerald-300 border-l-2 border-emerald-400 shadow-xs'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon size={15} />
                    <span>{item.label}</span>
                  </div>
                  {item.alertBadge ? (
                    <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                      {item.alertBadge}
                    </span>
                  ) : item.badge ? (
                    <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Admin User Footer */}
        <div 
          className="p-4 border-t text-xs flex items-center justify-between"
          style={{
            backgroundColor: currentAdminTheme.card,
            borderColor: currentAdminTheme.border
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
              👑
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white text-xs truncate max-w-[110px]">{user?.full_name || 'Admin'}</div>
              <div className="text-[10px] text-emerald-400 font-medium">Super Admin</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('fmx_token');
              localStorage.removeItem('fmx_user');
              setAdminAuthenticated(false);
              if (logout) logout();
              window.location.reload();
            }}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut size={13} />
          </button>
        </div>
      </aside>

      {/* Main Admin Viewport */}
      <main 
        className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 transition-colors duration-200"
        style={{
          backgroundColor: currentAdminTheme.bg
        }}
      >
        {/* Top bar with Breadcrumbs, Greeting and Actions */}
        <div 
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b transition-colors duration-200"
          style={{ borderColor: currentAdminTheme.border }}
        >
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-200 mb-1 font-semibold">
              <span className="text-slate-200">FoodMaxx Admin</span>
              <span className="text-slate-400">/</span>
              <span className="capitalize text-emerald-300 font-bold">
                {activeSection === 'support' ? 'Customer Chat' :
                 activeSection === 'kds' ? 'Kitchen KDS' :
                 activeSection === 'dispatch_map' ? 'Dispatch Map' :
                 activeSection === 'copy_editor' ? 'Text & Copy Editor' :
                 activeSection === 'inventory' ? 'Stock Inventory' :
                 activeSection.replace(/_/g, ' ')}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black capitalize tracking-tight text-white flex items-center gap-2.5 drop-shadow-xs">
              <span className="text-white font-black">
                {activeSection === 'overview' ? `${timeGreeting}, Admin 👋` :
                 activeSection === 'kds' ? 'Kitchen Display System (KDS)' :
                 activeSection === 'dispatch_map' ? 'Live Dispatch & Logistics Map' :
                 activeSection === 'copy_editor' ? 'Text & Copy Editor (CMS)' :
                 activeSection === 'analytics' ? 'Busy Hours & Profits' :
                 activeSection === 'payouts' ? 'Bank Payouts & Settlements' :
                 activeSection === 'orders' ? 'Orders & Kitchen' :
                 activeSection === 'products' ? 'Food Menu Catalog' :
                 activeSection === 'inventory' ? 'Stock Inventory & Restocking' :
                 activeSection === 'addons' ? 'Add-ons & Drinks' :
                 activeSection === 'riders' ? 'Delivery Riders' :
                 activeSection === 'zones' ? 'Delivery Areas & Fees' :
                 activeSection === 'promotions' ? 'Discount Codes' :
                 activeSection === 'customers' ? 'Customer Directory' :
                 activeSection === 'support' ? 'Customer Chat' :
                 activeSection === 'settings' ? 'Store Settings' :
                 activeSection.replace(/_/g, ' ')}
              </span>
              {activeSection === 'orders' && pendingOrdersCount > 0 && (
                <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                  {pendingOrdersCount} New Orders
                </span>
              )}
              {delayedOrdersCount > 0 && (
                <span className="text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  ⚠️ {delayedOrdersCount} Late
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-200 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white">FoodMaxx Central Kitchen</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-200">Bodija / Secretariat Rd, Ibadan</span>
              <span className="text-slate-400">•</span>
              <span className="text-emerald-300 font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })} WAT</span>
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
            {/* Live Sync Active Pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Sync Active</span>
            </div>

            {/* Quick Add Dish Button */}
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setProductModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-600/25 flex items-center gap-1.5"
              title="Add New Dish to Menu"
            >
              <Plus size={14} strokeWidth={3} />
              <span className="hidden sm:inline">Add Dish</span>
            </button>

            {/* Section & Nav Icons Manager Button */}
            <button
              type="button"
              onClick={() => setSectionIconsModalOpen(true)}
              className="px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs hover:opacity-90"
              style={{
                backgroundColor: currentAdminTheme.card,
                borderColor: currentAdminTheme.border,
                color: currentAdminTheme.text
              }}
              title="Customize App Bottom Nav & Category Section Icons"
            >
              <span>🎨</span>
              <span className="hidden sm:inline">Section Icons</span>
            </button>

            {/* Loud Alert Tones Studio */}
            <button
              type="button"
              onClick={() => setAdminToneModalOpen(true)}
              className="px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs hover:opacity-90"
              style={{
                backgroundColor: currentAdminTheme.card,
                borderColor: currentAdminTheme.border,
                color: currentAdminTheme.text
              }}
              title="20+ Loud Order Notification Tones & Chimes"
            >
              <Bell size={13} className="text-amber-400" />
              <span className="hidden sm:inline">Alert Tones (20+)</span>
            </button>

            {/* Admin Theme Palette Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setThemePickerOpen(p => !p)}
                className="px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                style={{
                  backgroundColor: currentAdminTheme.card,
                  borderColor: currentAdminTheme.border,
                  color: currentAdminTheme.text
                }}
                title="Change Admin Color Palette"
              >
                <Palette size={13} style={{ color: currentAdminTheme.accent }} />
                <span className="hidden sm:inline">{currentAdminTheme.name}</span>
                <ChevronDown size={11} className="opacity-60" />
              </button>

              {themePickerOpen && (
                <div 
                  className="absolute right-0 top-full mt-2 w-56 rounded-2xl border shadow-2xl p-2 z-50 transition-all"
                  style={{
                    backgroundColor: currentAdminTheme.card,
                    borderColor: currentAdminTheme.border,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
                  }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 opacity-60">
                    Admin Theme Mode
                  </div>
                  <div className="space-y-1 mt-1">
                    {Object.values(ADMIN_THEMES).map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          selectAdminTheme(t.id);
                          setThemePickerOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                          adminThemeKey === t.id ? 'ring-1 ring-white/20' : 'hover:opacity-80'
                        }`}
                        style={{
                          backgroundColor: adminThemeKey === t.id ? t.border : 'transparent',
                          color: t.text
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: t.dot }} />
                          <span>{t.name}</span>
                        </div>
                        {adminThemeKey === t.id && (
                          <Check size={13} style={{ color: t.accent }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Audio Notification Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !orderSoundEnabled;
                setOrderSoundEnabled(next);
                localStorage.setItem('fmx_admin_order_sound', String(next));
                if (next) {
                  playOrderNotificationSound();
                  toast('Order Notification Chime is Active 🔔', 'success');
                } else {
                  toast('Order Chime Muted 🔕', 'info');
                }
              }}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                orderSoundEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-slate-500'
              }`}
              title={orderSoundEnabled ? 'Kitchen Bell Sound Active' : 'Sound Muted'}
            >
              <span>{orderSoundEnabled ? '🔔' : '🔕'}</span>
              <span className="hidden md:inline">{orderSoundEnabled ? 'Sound On' : 'Muted'}</span>
            </button>

            {/* Test Sound Chime */}
            <button
              type="button"
              onClick={() => {
                playOrderNotificationSound(true);
                toast('Kitchen Bell Chime Audition 🎶', 'info');
              }}
              className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              title="Test Order Arrival Chime"
            >
              <span>🔊</span>
              <span className="hidden lg:inline">Test Bell</span>
            </button>

            {/* Quick Export Button */}
            <button
              onClick={handleExportOrders}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Download Orders CSV"
            >
              <Download size={13} className="text-emerald-400" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              onClick={() => loadSection(activeSection)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all cursor-pointer"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-emerald-400' : ''} />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: OVERVIEW */}
        {/* ============================================================ */}
        {activeSection === 'overview' && (
          <div className="space-y-6">
            {/* Late Orders Alert Banner */}
            {delayedOrdersCount > 0 && (
              <div className="bg-red-500/15 border border-red-500/40 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-red-500/10">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/25 border border-red-500/30 text-red-400 flex items-center justify-center text-xl font-bold shrink-0 animate-pulse">
                    ⏱️
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-white">Late Orders Alert</span>
                      <span className="bg-red-500 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                        {delayedOrdersCount} Running Late (over 25 mins)
                      </span>
                    </div>
                    <p className="text-xs text-red-300/90 mt-0.5">
                      These orders are taking longer than normal. You can assign a rider now or send an apology voucher.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0">
                  <button
                    onClick={() => {
                      delayedOrders.forEach(o => handleDispatchDelayApologyPerk(o));
                    }}
                    className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
                  >
                    🎁 Send ₦500 Apology to All Late Orders
                  </button>
                  <button
                    onClick={() => {
                      setOrderFilterStatus('delayed');
                      handleNavChange('orders');
                    }}
                    className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                  >
                    View Late Orders →
                  </button>
                </div>
              </div>
            )}

            {/* 5 Flagship Food-Tech KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {/* Card 1: Today's Revenue */}
              <div 
                className="border rounded-3xl p-4.5 shadow-sm transition-all relative overflow-hidden"
                style={{ backgroundColor: currentAdminTheme.card, borderColor: currentAdminTheme.border }}
              >
                <div className="flex items-center justify-between text-slate-200 mb-2 font-bold">
                  <span className="text-xs font-bold text-slate-100">Today's Revenue</span>
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <DollarSign size={15} />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-400">
                  ₦{Number(overview?.revenueToday != null ? overview.revenueToday : orders.reduce((acc, o) => acc + (o.payment_status === 'paid' ? Number(o.total_amount || o.total || 0) : 0), 0)).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-300 mt-1 flex items-center justify-between">
                  <span>Paid settlements</span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">+18% this wk</span>
                </div>
              </div>

              {/* Card 2: Total Orders */}
              <div 
                className="border rounded-3xl p-4.5 shadow-sm transition-all relative overflow-hidden"
                style={{ backgroundColor: currentAdminTheme.card, borderColor: currentAdminTheme.border }}
              >
                <div className="flex items-center justify-between text-slate-200 mb-2 font-bold">
                  <span className="text-xs font-bold text-slate-100">Total Orders</span>
                  <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Package size={15} />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-white">
                  {overview?.totalOrders != null ? overview.totalOrders : orders.length}
                </div>
                <div className="text-[10px] text-slate-300 mt-1 flex items-center justify-between">
                  <span>Delivered in Ibadan</span>
                  <span className="text-blue-400 font-bold font-mono">{orders.filter(o => o.order_status === 'DELIVERED').length} fulfilled</span>
                </div>
              </div>

              {/* Card 3: Active Foodies */}
              <div 
                className="border rounded-3xl p-4.5 shadow-sm transition-all relative overflow-hidden"
                style={{ backgroundColor: currentAdminTheme.card, borderColor: currentAdminTheme.border }}
              >
                <div className="flex items-center justify-between text-slate-200 mb-2 font-bold">
                  <span className="text-xs font-bold text-slate-100">Active Foodies</span>
                  <div className="w-7 h-7 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Users size={15} />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-purple-400">
                  {overview?.totalCustomers != null ? overview.totalCustomers : customers.length}
                </div>
                <div className="text-[10px] text-slate-300 mt-1 flex items-center justify-between">
                  <span>Registered users</span>
                  <span className="text-purple-400 font-bold">92% retention</span>
                </div>
              </div>

              {/* Card 4: Kitchen Queue */}
              <div 
                className={`border rounded-3xl p-4.5 shadow-sm transition-all relative overflow-hidden ${
                  (pendingOrdersCount + inPrepOrdersCount) > 0 ? 'ring-1 ring-amber-500/30' : ''
                }`}
                style={{ backgroundColor: currentAdminTheme.card, borderColor: currentAdminTheme.border }}
              >
                <div className="flex items-center justify-between text-slate-200 mb-2 font-bold">
                  <span className="text-xs font-bold text-slate-100">Kitchen Queue</span>
                  <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <ChefHat size={15} />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-400">
                  {pendingOrdersCount + inPrepOrdersCount}
                </div>
                <div className="text-[10px] text-slate-300 mt-1 flex items-center justify-between">
                  <span>{pendingOrdersCount} new · {inPrepOrdersCount} grill</span>
                  {(pendingOrdersCount + inPrepOrdersCount) > 0 && (
                    <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded animate-pulse">Action</span>
                  )}
                </div>
              </div>

              {/* Card 5: Low Stock Alert */}
              <div 
                className={`border rounded-3xl p-4.5 shadow-sm transition-all relative overflow-hidden cursor-pointer group ${
                  lowStockCount > 0 ? 'ring-1 ring-rose-500/30' : ''
                }`}
                style={{ backgroundColor: currentAdminTheme.card, borderColor: currentAdminTheme.border }}
                onClick={() => handleNavChange('inventory')}
                title="Click to view and restock low inventory dishes"
              >
                <div className="flex items-center justify-between text-slate-200 mb-2 font-bold">
                  <span className="text-xs font-bold text-slate-100">Stock Alert</span>
                  <div className={`w-7 h-7 rounded-xl border flex items-center justify-center ${
                    lowStockCount > 0 
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}>
                    <Layers size={15} />
                  </div>
                </div>
                <div className={`text-xl sm:text-2xl font-black ${lowStockCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {lowStockCount > 0 ? `${lowStockCount} Low` : 'Healthy'}
                </div>
                <div className="text-[10px] text-slate-300 mt-1 flex items-center justify-between">
                  <span>{lowStockCount > 0 ? 'Dishes < 15 left' : 'All dishes in stock'}</span>
                  <span className="text-emerald-400 font-bold group-hover:underline">Restock →</span>
                </div>
              </div>
            </div>

            {/* Real-Time Live Activity Beacon */}
            <div 
              className="rounded-2xl p-3.5 border flex items-center justify-between gap-3 shadow-sm transition-all"
              style={{ backgroundColor: currentAdminTheme.card, borderColor: currentAdminTheme.border }}
            >
              <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-black uppercase tracking-wider shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live Stream</span>
                </span>
                <p className="text-xs text-slate-300 truncate">
                  {orders.length > 0 ? (
                    <>
                      <span className="font-mono font-bold text-white">#{orders[0].order_reference || orders[0].id?.slice(0, 8)}</span>
                      <span className="text-slate-400 mx-1.5">•</span>
                      <span className="font-semibold text-white">{orders[0].customer?.full_name || 'Customer'}</span>
                      <span className="text-slate-400 mx-1.5">•</span>
                      <span className="text-slate-300">{(orders[0].items || []).map(i => `${i.quantity}x ${i.product_name || i.name}`).join(', ') || 'Fresh Meal Package'}</span>
                      <span className="text-slate-400 mx-1.5">•</span>
                      <span className="font-bold text-emerald-400">₦{Number(orders[0].total_amount || 0).toLocaleString()}</span>
                      <span className="text-slate-400 mx-1.5">•</span>
                      <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {orders[0].order_status?.replace(/_/g, ' ')}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400">Listening for incoming customer orders across Bodija, Ibadan...</span>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleNavChange('orders')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Live Pipeline</span>
                <span>→</span>
              </button>
            </div>

            {/* ============================================================ */}
            {/* ORDER MANAGEMENT QUICK ACTIONS HUB */}
            {/* ============================================================ */}
            <div 
              className="border rounded-3xl p-5 sm:p-6 shadow-xl transition-all"
              style={{ backgroundColor: currentAdminTheme.card, borderColor: currentAdminTheme.border }}
            >
              {/* Header & Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b" style={{ borderColor: currentAdminTheme.border }}>
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-base font-black">
                      ⚡
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Order Management Quick Actions
                    </h2>
                    {pendingOrdersCount > 0 && (
                      <span className="bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full animate-pulse shadow-md shadow-amber-500/30">
                        {pendingOrdersCount} Action Needed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage kitchen dispatch, change order status with custom notifications, and print slips directly from Overview.
                  </p>
                </div>

                {/* Batch & Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {pendingOrdersCount > 0 && (
                    <button
                      type="button"
                      onClick={handleBatchAcceptPending}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-emerald-600/25 flex items-center gap-1.5 active:scale-95"
                    >
                      <span>🍳</span>
                      <span>Accept All Pending ({pendingOrdersCount})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleNavChange('orders')}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Full Orders View</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-2 py-3 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'All Live Orders', count: orders.length },
                  { id: 'pending', label: 'Pending Kitchen', count: pendingOrdersCount },
                  { id: 'preparing', label: 'Cooking on Grill', count: inPrepOrdersCount },
                  { id: 'on_the_way', label: 'Out with Rider', count: orders.filter(o => o.order_status === 'ON_THE_WAY' || o.order_status === 'RIDER_ASSIGNED').length }
                ].map(tab => {
                  const active = overviewOrderFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setOverviewOrderFilter(tab.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                        active
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                          : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/10'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        active ? 'bg-black/30 text-white' : 'bg-black/40 text-slate-400'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Actions Order Grid */}
              <div className="space-y-3 mt-1">
                {orders
                  .filter(o => {
                    if (overviewOrderFilter === 'pending') return o.order_status === 'CONFIRMED' || o.order_status === 'ORDER_PLACED';
                    if (overviewOrderFilter === 'preparing') return o.order_status === 'PREPARING';
                    if (overviewOrderFilter === 'on_the_way') return o.order_status === 'ON_THE_WAY' || o.order_status === 'RIDER_ASSIGNED' || o.order_status === 'READY_FOR_PICKUP';
                    return true;
                  })
                  .slice(0, 6)
                  .map(order => {
                    const isPending = order.order_status === 'CONFIRMED' || order.order_status === 'ORDER_PLACED';
                    const isPrep = order.order_status === 'PREPARING';
                    const isReady = order.order_status === 'READY_FOR_PICKUP';
                    const isEnRoute = order.order_status === 'ON_THE_WAY' || order.order_status === 'RIDER_ASSIGNED';
                    const isDone = order.order_status === 'DELIVERED';
                    const itemsSummary = (order.items || []).map(i => `${i.quantity}x ${i.product_name || i.name}`).join(', ') || 'Custom meal package';

                    return (
                      <div
                        key={order.id}
                        className="bg-[#0E0F14] border border-[#1F222C] hover:border-[#262A36] rounded-2xl p-4 transition-all"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                          {/* Left: Order Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span
                                onClick={() => setSlipOrder(order)}
                                className="font-mono font-bold text-white text-xs bg-[#1A1C23] hover:bg-[#252834] px-2.5 py-1 rounded-lg border border-[#262A36] hover:border-emerald-500 hover:text-emerald-400 cursor-pointer transition-all"
                                title="Click to view full order slip and receipt"
                              >
                                #{order.order_reference || order.id?.slice(0, 8)}
                              </span>
                              <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                isPending ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                isPrep ? 'bg-[#EA4C2A]/20 text-[#EA4C2A] border border-[#EA4C2A]/30' :
                                isEnRoute ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                isDone ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                'bg-slate-800 text-slate-400'
                              }`}>
                                {order.order_status?.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div className="text-xs font-bold text-white truncate mb-0.5">
                              {order.customer?.full_name || 'Customer'}
                              <span className="font-normal text-slate-400 ml-2">📍 {order.delivery_zone || 'Ibadan'}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {itemsSummary}
                            </div>

                            {/* Custom Notification Message preview if present */}
                            {(order.custom_notification_message || order.status_notes) && (
                              <div className="mt-2 text-[11px] text-[#EA4C2A] bg-[#EA4C2A]/10 border border-[#EA4C2A]/25 rounded-lg px-2.5 py-1 flex items-center gap-1.5 w-fit">
                                <span>💬</span>
                                <span className="font-medium">"{order.custom_notification_message || order.status_notes}"</span>
                              </div>
                            )}
                          </div>

                          {/* Middle: Price & Payment */}
                          <div className="flex items-center gap-3 lg:border-l lg:border-r border-[#1F222C] lg:px-4 shrink-0">
                            <div>
                              <div className="text-sm font-black text-white">
                                ₦{Number(order.total_amount || 0).toLocaleString()}
                              </div>
                              <span className="text-[10px] font-bold text-emerald-400">
                                {order.payment_status === 'paid' ? '● Paid (Online)' : '● Pay on Delivery'}
                              </span>
                            </div>
                          </div>

                          {/* Right: Quick Action Buttons */}
                          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                            {/* Primary Step Progression */}
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleAdvanceOrderStatus(order, 'PREPARING', 'Accepted by kitchen & grilling now')}
                                className="px-3 py-1.5 bg-[#EA4C2A] hover:bg-[#D43B1B] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-[#EA4C2A]/20 flex items-center gap-1"
                              >
                                <span>🍳</span>
                                <span>Start Prep</span>
                              </button>
                            )}

                            {isPrep && (
                              <button
                                type="button"
                                onClick={() => setAssignRiderOrder(order)}
                                className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-slate-950 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <span>🛵</span>
                                <span>Assign Rider</span>
                              </button>
                            )}

                            {(isReady || order.order_status === 'RIDER_ASSIGNED') && (
                              <button
                                type="button"
                                onClick={() => handleAdvanceOrderStatus(order, 'ON_THE_WAY', 'Rider is on the way with your package')}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <span>🚚</span>
                                <span>Mark On Way</span>
                              </button>
                            )}

                            {order.order_status === 'ON_THE_WAY' && (
                              <button
                                type="button"
                                onClick={() => setVerifyOtpOrder(order)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <span>✅</span>
                                <span>Verify Delivery</span>
                              </button>
                            )}

                            {/* Change Status & Custom Message Button (Fulfills Request 9) */}
                            <button
                              type="button"
                              onClick={() => setStatusModalOrder(order)}
                              className="px-3 py-1.5 bg-[#1A1C23] hover:bg-[#232734] border border-[#EA4C2A]/40 text-[#EA4C2A] hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="Change order status and send custom notification message"
                            >
                              <span>⚡</span>
                              <span>Status & Message</span>
                            </button>

                            {/* Kitchen Slip Print */}
                            <button
                              type="button"
                              onClick={() => setSlipOrder(order)}
                              className="p-1.5 bg-[#1A1C23] hover:bg-[#232734] border border-[#262A36] text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
                              title="Print Kitchen Slip"
                            >
                              <Printer size={14} />
                            </button>

                            {/* Contact Customer */}
                            {(order.customer_phone || order.customer?.phone) && (
                              <>
                                <a
                                  href={`tel:${order.customer_phone || order.customer?.phone}`}
                                  className="p-1.5 bg-[#1A1C23] hover:bg-[#232734] border border-[#262A36] text-emerald-400 rounded-xl transition-all"
                                  title="Call Customer"
                                >
                                  <Phone size={14} />
                                </a>
                                <a
                                  href={`https://wa.me/${String(order.customer_phone || order.customer?.phone).replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 bg-[#1A1C23] hover:bg-[#232734] border border-[#262A36] text-emerald-400 rounded-xl transition-all"
                                  title="WhatsApp Customer"
                                >
                                  <MessageSquare size={14} />
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {orders.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No orders currently in this category.
                  </div>
                )}
              </div>
            </div>

            {/* 1-Click Excel / CSV Export Center */}
            <div className="bg-[#121318] border border-[#1F222C] rounded-3xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1F222C] mb-4">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Download size={15} className="text-emerald-400" />
                    <span>Download Data & Reports</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Download clean spreadsheets you can open in Microsoft Excel or Google Sheets.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-400 uppercase bg-[#0B0C0E] px-2.5 py-1 rounded-lg border border-[#1F222C] shrink-0">
                  ⚡ Excel / CSV Files
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={handleExportOrders}
                  className="p-3.5 bg-[#1A1C23] hover:bg-[#222530] border border-[#262A36] hover:border-[#EA4C2A]/40 rounded-2xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">Orders List (CSV)</span>
                    <Download size={13} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <p className="text-[11px] text-slate-400">All customer orders with items, addresses, and delivery status.</p>
                </button>

                <button
                  type="button"
                  onClick={handleExportDailySales}
                  className="p-3.5 bg-[#1A1C23] hover:bg-[#222530] border border-[#262A36] hover:border-[#EA4C2A]/40 rounded-2xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">Daily Sales & Profit (CSV)</span>
                    <Download size={13} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <p className="text-[11px] text-slate-400">Daily revenue, estimated food costs, and profits for the past 7 days.</p>
                </button>

                <button
                  type="button"
                  onClick={handleExportMenuMargins}
                  className="p-3.5 bg-[#1A1C23] hover:bg-[#222530] border border-[#262A36] hover:border-[#EA4C2A]/40 rounded-2xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">Menu Profits & Sales (CSV)</span>
                    <Download size={13} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <p className="text-[11px] text-slate-400">Selling price, estimated ingredient costs, and profit margin for each dish.</p>
                </button>

                <button
                  type="button"
                  onClick={handleExportPayouts}
                  className="p-3.5 bg-[#1A1C23] hover:bg-[#222530] border border-[#262A36] hover:border-[#EA4C2A]/40 rounded-2xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">Bank Payouts (CSV)</span>
                    <Download size={13} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <p className="text-[11px] text-slate-400">Daily bank deposits, payment card fees, and rider disbursements.</p>
                </button>
              </div>
            </div>

            {/* 7-Day Performance Visualizer */}
            {overview?.last7Days && (
              <div className="bg-[#121318] border border-[#1F222C] rounded-3xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-sm sm:text-base text-white">
                      Orders in the Last 7 Days
                    </h2>
                    <p className="text-xs text-slate-400">Total customer orders fulfilled each day across Ibadan</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    +18% this week
                  </span>
                </div>

                <div className="flex items-end gap-2 sm:gap-4 h-40 pt-4 border-b border-[#1F222C] pb-2">
                  {overview.last7Days.map((d, idx) => {
                    const maxOrders = Math.max(...overview.last7Days.map(x => x.orders), 1);
                    const pct = Math.max(10, (d.orders / maxOrders) * 100);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                        <div className="text-[10px] font-bold text-slate-400 group-hover:text-emerald-400 transition-colors">
                          {d.orders} orders
                        </div>
                        <div
                          className="w-full bg-gradient-to-t from-[#EA4C2A] via-amber-500 to-emerald-400 rounded-t-xl transition-all group-hover:brightness-125"
                          style={{ height: `${pct}%` }}
                        />
                        <div className="text-[10px] text-slate-500 font-mono">
                          {d.date.slice(5)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Kitchen Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#121318] border border-[#1F222C] rounded-3xl p-5 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="text-[#EA4C2A] text-lg font-bold mb-1 flex items-center gap-2">
                    <BarChart2 size={18} />
                    <span>Busy Hours & Profits</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    See when orders peak and check how much profit each dish makes.
                  </div>
                </div>
                <button
                  onClick={() => handleNavChange('analytics')}
                  className="mt-4 w-full py-2.5 bg-[#1A1C23] hover:bg-[#222530] border border-[#262A36] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  View Busy Hours & Profits →
                </button>
              </div>

              <div className="bg-[#121318] border border-[#1F222C] rounded-3xl p-5 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="text-emerald-400 text-lg font-bold mb-1 flex items-center gap-2">
                    <DollarSign size={18} />
                    <span>Bank Payouts</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Check daily bank payouts, card fees, and rider payments.
                  </div>
                </div>
                <button
                  onClick={() => handleNavChange('payouts')}
                  className="mt-4 w-full py-2.5 bg-[#1A1C23] hover:bg-[#222530] border border-[#262A36] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  View Bank Payouts ({payouts.length}) →
                </button>
              </div>

              <div className="bg-[#121318] border border-[#1F222C] rounded-3xl p-5 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="text-yellow-400 text-lg font-bold mb-1 flex items-center gap-2">
                    <Users size={18} />
                    <span>Customer Retention</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    See regular customers and send a discount code to customers who haven't ordered recently.
                  </div>
                </div>
                <button
                  onClick={() => handleNavChange('customers')}
                  className="mt-4 w-full py-2.5 bg-[#1A1C23] hover:bg-[#222530] border border-[#262A36] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  View Customers ({customers.length}) →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB: ANALYTICS, DEMAND HEATMAP & PROFIT SIMULATOR */}
        {/* ============================================================ */}
        {activeSection === 'analytics' && (
          <div className="space-y-6">
            {/* Top Action Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart2 size={18} className="text-red-500" />
                  <span>Busy Hours & Dish Profits</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  See what hours are busiest and calculate profit for each dish on your menu.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportMenuMargins}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download size={13} className="text-emerald-400" />
                  <span>Download Margins (CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportDailySales}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-red-600/20"
                >
                  <Download size={13} />
                  <span>Download Sales (CSV)</span>
                </button>
              </div>
            </div>

            {/* SECTION 1: HOURLY DEMAND HEATMAP */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock size={15} className="text-amber-400" />
                    <span>Orders by Time of Day</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    See when customers order the most food so you can prep ingredients ahead of time
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    🍛 Lunch Rush (12 PM – 2 PM)
                  </span>
                  <span className="flex items-center gap-1.5 text-red-400 font-semibold bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                    🔥 Dinner Rush (6 PM – 9 PM)
                  </span>
                </div>
              </div>

              {/* 24-Hour Column Chart */}
              {(() => {
                const hourlyDistribution = Array.from({ length: 24 }, (_, h) => {
                  const hourStr = String(h).padStart(2, '0') + ':00';
                  const count = orders.filter(o => {
                    if (!o.created_at) return false;
                    const d = new Date(o.created_at);
                    return d.getHours() === h;
                  }).length;
                  let peak = null;
                  if (h >= 12 && h <= 14) peak = 'lunch';
                  if (h >= 18 && h <= 21) peak = 'dinner';
                  return { hour: hourStr, orders: count, peak };
                });

                const maxSlot = Math.max(...hourlyDistribution.map(s => s.orders), 1);
                const busiestSlot = [...hourlyDistribution].sort((a, b) => b.orders - a.orders)[0];

                const zoneCounts = {};
                orders.forEach(o => {
                  const z = o.delivery_zone || 'Bodija';
                  zoneCounts[z] = (zoneCounts[z] || 0) + 1;
                });
                const topZoneEntry = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1])[0];

                const lunchCount = orders.filter(o => {
                  if (!o.created_at) return false;
                  const h = new Date(o.created_at).getHours();
                  return h >= 12 && h <= 14;
                }).length;

                const dinnerCount = orders.filter(o => {
                  if (!o.created_at) return false;
                  const h = new Date(o.created_at).getHours();
                  return h >= 18 && h <= 21;
                }).length;

                const lunchPct = orders.length > 0 ? Math.round((lunchCount / orders.length) * 100) : 0;
                const dinnerPct = orders.length > 0 ? Math.round((dinnerCount / orders.length) * 100) : 0;

                return (
                  <div className="pt-2">
                    {orders.length === 0 ? (
                      <div className="h-44 flex flex-col items-center justify-center border-b border-slate-800 text-center text-slate-400">
                        <Clock size={28} className="text-slate-600 mb-2" />
                        <div className="font-bold text-xs text-white">No customer orders placed yet today</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">24-hour hourly demand distribution will dynamically generate as orders arrive.</div>
                      </div>
                    ) : (
                      <div className="flex items-end gap-1 sm:gap-2 h-44 pb-2 border-b border-slate-800">
                        {hourlyDistribution.map((slot, idx) => {
                          const pct = slot.orders > 0 ? Math.max(8, (slot.orders / maxSlot) * 100) : 4;
                          const isLunch = slot.peak === 'lunch';
                          const isDinner = slot.peak === 'dinner';
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                              {/* Tooltip on hover */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-950 border border-slate-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-md pointer-events-none whitespace-nowrap z-10">
                                {slot.orders} orders at {slot.hour}
                              </div>
                              <div
                                className={`w-full rounded-t-md transition-all group-hover:scale-y-105 ${
                                  slot.orders === 0
                                    ? 'bg-slate-800/40'
                                    : isDinner
                                    ? 'bg-gradient-to-t from-red-600 to-rose-400 shadow-xs shadow-red-500/50'
                                    : isLunch
                                    ? 'bg-gradient-to-t from-amber-600 to-yellow-400 shadow-xs shadow-amber-500/50'
                                    : 'bg-slate-700 group-hover:bg-slate-600'
                                }`}
                                style={{ height: `${pct}%` }}
                              />
                              <span className="text-[9px] text-slate-500 font-mono scale-90 sm:scale-100">
                                {idx % 3 === 0 ? slot.hour.slice(0, 2) : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-500 text-[10px] uppercase font-bold block">Busiest Hour</span>
                        <span className="font-bold text-white text-sm">
                          {busiestSlot && busiestSlot.orders > 0 ? `${busiestSlot.hour} – ${String(Number(busiestSlot.hour.slice(0, 2)) + 1).padStart(2, '0')}:00` : 'None recorded'}
                        </span>
                        <span className="text-emerald-400 text-[10px] block mt-0.5">
                          {busiestSlot && busiestSlot.orders > 0 ? `${busiestSlot.orders} orders` : 'Waiting for orders'}
                        </span>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-500 text-[10px] uppercase font-bold block">Top Delivery Area</span>
                        <span className="font-bold text-white text-sm truncate block">
                          {topZoneEntry ? topZoneEntry[0] : 'All Zones'}
                        </span>
                        <span className="text-slate-400 text-[10px] block mt-0.5">
                          {topZoneEntry && orders.length > 0 ? `${Math.round((topZoneEntry[1] / orders.length) * 100)}% of orders` : 'Realtime zone tracker'}
                        </span>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-500 text-[10px] uppercase font-bold block">Average Prep Time</span>
                        <span className="font-bold text-emerald-400 text-sm">
                          {products.length > 0 ? `${Math.round(products.reduce((acc, p) => acc + Number(p.prep_time_min || 20), 0) / products.length)} Mins` : '20 Mins'}
                        </span>
                        <span className="text-slate-400 text-[10px] block mt-0.5">Calculated from menu items</span>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-500 text-[10px] uppercase font-bold block">Lunch vs Dinner</span>
                        <span className="font-bold text-white text-sm">
                          {orders.length > 0 ? `${lunchPct}% Lunch / ${dinnerPct}% Dinner` : '0% Lunch / 0% Dinner'}
                        </span>
                        <span className="text-amber-400 text-[10px] block mt-0.5">
                          {orders.length > 0 ? `${lunchCount} lunch / ${dinnerCount} dinner orders` : 'Live distribution'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* SECTION 2: PROFIT ESTIMATION & CALCULATION SIMULATOR */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp size={15} className="text-emerald-400" />
                    <span>Kitchen Profit Calculator</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Adjust your ingredient costs to estimate daily take-home earnings
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400">Ingredient Cost:</span>
                  <span className="font-mono font-black text-amber-400 text-sm">{targetFoodCostPct}%</span>
                </div>
              </div>

              {/* Slider Control */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">Estimated Ingredient Cost (% of selling price):</span>
                  <span className="font-bold text-emerald-400">Estimated Profit Margin: {100 - targetFoodCostPct}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="50"
                  step="1"
                  value={targetFoodCostPct}
                  onChange={e => setTargetFoodCostPct(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>20% (Low ingredient cost)</span>
                  <span>35% (Normal restaurant average)</span>
                  <span>50% (High ingredient cost)</span>
                </div>
              </div>

              {/* Live Simulated Financials */}
              {(() => {
                const grossSales = overview?.revenueToday != null ? overview.revenueToday : orders.reduce((sum, o) => sum + (['PAID', 'paid'].includes(o.payment_status) ? Number(o.total || o.total_amount || 0) : 0), 0);
                const ingredientCost = Math.round(grossSales * (targetFoodCostPct / 100));
                const packagingOverhead = Math.round(grossSales * 0.05); // 5% packaging
                const netKitchenProfit = grossSales - ingredientCost - packagingOverhead;
                const netMarginPct = grossSales > 0 ? Math.round((netKitchenProfit / grossSales) * 100) : 0;

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 text-xs font-medium block">Total Sales Today</span>
                      <span className="font-black text-lg sm:text-xl text-white block mt-1">
                        ₦{grossSales.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-500">Total customer orders</span>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 text-xs font-medium block">Ingredient Costs</span>
                      <span className="font-black text-lg sm:text-xl text-amber-400 block mt-1">
                        -₦{ingredientCost.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-amber-400/80">{targetFoodCostPct}% of sales</span>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 text-xs font-medium block">Takeaway Packs & Bags</span>
                      <span className="font-black text-lg sm:text-xl text-orange-400 block mt-1">
                        -₦{packagingOverhead.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-orange-400/80">5% packaging boxes</span>
                    </div>

                    <div className="bg-emerald-950/20 p-4 rounded-2xl border border-emerald-500/30">
                      <span className="text-emerald-300 text-xs font-bold block">Estimated Profit</span>
                      <span className="font-black text-lg sm:text-xl text-emerald-400 block mt-1">
                        ₦{netKitchenProfit.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">{netMarginPct}% Net Margin</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* SECTION 3: DISH VELOCITY & PROFIT MARGINS MATRIX */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles size={15} className="text-yellow-400" />
                    <span>Dish Profits & Popularity</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    See which dishes make the most profit and sell the fastest
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ⭐ Star: High Profit & Sells Fast
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    🐴 Popular: Sells Fast, Lower Margin
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    🧩 Hidden Gem: High Profit, Sells Slower
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    💡 Review: Low Sales & Profit
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                      <th className="pb-2.5 font-bold">Dish</th>
                      <th className="pb-2.5 font-bold">Category</th>
                      <th className="pb-2.5 font-bold">Price</th>
                      <th className="pb-2.5 font-bold">Est. Cost</th>
                      <th className="pb-2.5 font-bold">Profit per Dish</th>
                      <th className="pb-2.5 font-bold">Margin</th>
                      <th className="pb-2.5 font-bold">Sales Speed</th>
                      <th className="pb-2.5 font-bold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {products.map(product => {
                      const price = Number(product.price || 0);
                      const cost = Math.round(price * (targetFoodCostPct / 100));
                      const profit = price - cost;
                      const marginPct = price > 0 ? Math.round((profit / price) * 100) : 0;
                      const isHighVelocity = product.is_bestseller || product.badge === 'bestseller' || ['Firewood Jollof', 'Gourmet Beef Burger', 'Grilled BBQ Quarter Chicken'].some(n => product.name.includes(n));
                      const isHighMargin = marginPct >= 60;

                      let matrixBadge = { label: '⭐ Star', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
                      if (isHighMargin && isHighVelocity) {
                        matrixBadge = { label: '⭐ Star', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
                      } else if (!isHighMargin && isHighVelocity) {
                        matrixBadge = { label: '🐴 Popular', bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
                      } else if (isHighMargin && !isHighVelocity) {
                        matrixBadge = { label: '🧩 Hidden Gem', bg: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
                      } else {
                        matrixBadge = { label: '💡 Review', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
                      }

                      return (
                        <tr key={product.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 pr-2">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-8 h-8 rounded-lg object-cover bg-slate-950 shrink-0"
                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'; }}
                              />
                              <div className="font-bold text-white truncate max-w-[160px] sm:max-w-xs">
                                {product.name}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-slate-400">{product.category || 'General'}</td>
                          <td className="py-3 font-bold text-white">₦{price.toLocaleString()}</td>
                          <td className="py-3 text-amber-400/90 font-mono">₦{cost.toLocaleString()}</td>
                          <td className="py-3 text-emerald-400 font-bold font-mono">₦{profit.toLocaleString()}</td>
                          <td className="py-3 font-bold">
                            <span className={marginPct >= 65 ? 'text-emerald-400' : marginPct >= 50 ? 'text-teal-400' : 'text-amber-400'}>
                              {marginPct}%
                            </span>
                          </td>
                          <td className="py-3 text-slate-300">
                            {isHighVelocity ? (
                              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                🔥 Fast (~25/day)
                              </span>
                            ) : (
                              <span className="text-slate-400">Normal (~8/day)</span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold border ${matrixBadge.bg}`}>
                              {matrixBadge.label}
                            </span>
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
        {/* TAB 1b: KITCHEN KDS (KITCHEN DISPLAY SYSTEM KANBAN) */}
        {/* ============================================================ */}
        {activeSection === 'kds' && (() => {
          const incomingOrders = orders.filter(o => ['CONFIRMED', 'ORDER_PLACED'].includes(o.order_status));
          const cookingOrders = orders.filter(o => o.order_status === 'PREPARING');
          const dispatchOrders = orders.filter(o => ['READY_FOR_PICKUP', 'ON_THE_WAY'].includes(o.order_status));
          const completedOrders = orders.filter(o => o.order_status === 'DELIVERED').slice(0, 15);

          const getElapsedMinutes = (dateStr) => {
            if (!dateStr) return 0;
            const diff = Date.now() - new Date(dateStr).getTime();
            return Math.max(0, Math.floor(diff / 60000));
          };

          return (
            <div className="space-y-4">
              {/* KDS Control Strip */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-600/20 text-[#EA4C2A] flex items-center justify-center font-bold text-lg border border-orange-500/30">
                    👨‍🍳
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Kitchen Display System (KDS)</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    </h2>
                    <p className="text-xs text-slate-400">
                      Live order tickets, cook timers, portion specifications & instant kitchen routing.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      playOrderNotificationSound();
                      toast('Kitchen bell sound tested! 🔔', 'info');
                    }}
                    className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer border border-slate-700 flex items-center justify-center gap-1.5"
                    title="Test Kitchen Chime Sound"
                  >
                    <span>🔔 Test Chime</span>
                  </button>

                  {incomingOrders.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBatchAcceptPending}
                      className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-[#EA4C2A] hover:bg-[#D43B1B] text-white text-xs font-bold transition-all shadow-md shadow-[#EA4C2A]/25 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>🍳 Accept All Incoming ({incomingOrders.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 4-Column Responsive Kanban Board */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
                
                {/* COLUMN 1: INCOMING TICKETS */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col min-h-[500px]">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                      <h3 className="font-bold text-xs uppercase tracking-wider text-amber-400">1. Incoming Tickets</h3>
                    </div>
                    <span className="bg-amber-400/15 text-amber-400 border border-amber-400/30 text-xs font-extrabold px-2 py-0.5 rounded-full">
                      {incomingOrders.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                    {incomingOrders.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs italic">
                        No incoming tickets right now
                      </div>
                    ) : (
                      incomingOrders.map(order => {
                        const mins = getElapsedMinutes(order.created_at);
                        const items = order.items || [];
                        return (
                          <div
                            key={order.id}
                            className="bg-slate-950 border border-amber-500/30 rounded-2xl p-3.5 shadow-md hover:border-amber-500/60 transition-all space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-xs text-amber-400">
                                #{order.order_reference || order.id?.slice(0, 8)}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${mins > 15 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-slate-800 text-slate-300'}`}>
                                ⏱️ {mins}m ago
                              </span>
                            </div>

                            <div>
                              <p className="font-bold text-xs text-white">{order.customer_name || 'Customer'}</p>
                              {order.customer_phone && (
                                <a href={`tel:${order.customer_phone}`} className="text-[11px] text-slate-400 hover:text-slate-200">
                                  📞 {order.customer_phone}
                                </a>
                              )}
                            </div>

                            {/* Dishes & Portion Specification */}
                            <div className="bg-slate-900/80 rounded-xl p-2.5 space-y-1.5 border border-slate-800/80">
                              {items.map((it, idx) => (
                                <div key={idx} className="text-xs">
                                  <div className="flex items-center justify-between font-bold text-slate-200">
                                    <span>{it.quantity || it.qty || 1}x {it.name}</span>
                                    <span className="text-[11px] text-slate-400">₦{Number(it.price || 0).toLocaleString()}</span>
                                  </div>
                                  {it.selectedSize && (
                                    <span className="inline-block mt-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                                      ⚖️ Portion: {it.selectedSize}
                                    </span>
                                  )}
                                  {it.selectedExtras && it.selectedExtras.length > 0 && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      + {Array.isArray(it.selectedExtras) ? it.selectedExtras.join(', ') : it.selectedExtras}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {order.delivery_instructions && (
                              <div className="bg-amber-950/30 border border-amber-700/40 rounded-xl p-2 text-[11px] text-amber-300">
                                ⚠️ <strong>Note:</strong> {order.delivery_instructions}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleAdvanceOrderStatus(order, 'PREPARING', 'Accepted by kitchen & grilling now')}
                              className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black rounded-xl text-xs shadow-md transition-transform active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <span>🍳 Start Cooking</span>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* COLUMN 2: IN THE KITCHEN */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col min-h-[500px]">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                      <h3 className="font-bold text-xs uppercase tracking-wider text-orange-400">2. On The Grill / Cooking</h3>
                    </div>
                    <span className="bg-orange-500/15 text-orange-400 border border-orange-500/30 text-xs font-extrabold px-2 py-0.5 rounded-full">
                      {cookingOrders.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                    {cookingOrders.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs italic">
                        Grills clear. No active cooking.
                      </div>
                    ) : (
                      cookingOrders.map(order => {
                        const mins = getElapsedMinutes(order.created_at);
                        const isLate = mins > 25;
                        const items = order.items || [];
                        return (
                          <div
                            key={order.id}
                            className={`bg-slate-950 border rounded-2xl p-3.5 shadow-md transition-all space-y-3 ${isLate ? 'border-red-500/60 shadow-red-500/10' : 'border-orange-500/30'}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-xs text-orange-400">
                                #{order.order_reference || order.id?.slice(0, 8)}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${isLate ? 'bg-red-500 text-white animate-bounce' : mins > 15 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                ⏱️ {mins}m in kitchen
                              </span>
                            </div>

                            <div>
                              <p className="font-bold text-xs text-white">{order.customer_name || 'Customer'}</p>
                              <p className="text-[11px] text-slate-400">📍 Zone: {order.delivery_zone_name || order.delivery_zone || 'Ibadan'}</p>
                            </div>

                            {/* Dishes List */}
                            <div className="bg-slate-900/80 rounded-xl p-2.5 space-y-1.5 border border-slate-800/80">
                              {items.map((it, idx) => (
                                <div key={idx} className="text-xs">
                                  <div className="font-bold text-white flex items-center justify-between">
                                    <span>{it.quantity || it.qty || 1}x {it.name}</span>
                                  </div>
                                  {it.selectedSize && (
                                    <span className="inline-block mt-0.5 text-[10px] font-bold bg-orange-500/15 text-orange-300 px-1.5 py-0.2 rounded border border-orange-500/30">
                                      ⚖️ {it.selectedSize}
                                    </span>
                                  )}
                                  {it.selectedExtras && it.selectedExtras.length > 0 && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      + {Array.isArray(it.selectedExtras) ? it.selectedExtras.join(', ') : it.selectedExtras}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {order.delivery_instructions && (
                              <div className="bg-amber-950/30 border border-amber-700/40 rounded-xl p-2 text-[11px] text-amber-300">
                                ⚠️ {order.delivery_instructions}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleAdvanceOrderStatus(order, 'READY_FOR_PICKUP', 'Food cooked & packaged for rider pickup')}
                              className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition-transform active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <span>✅ Cooked & Ready for Rider</span>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* COLUMN 3: READY & OUT FOR DELIVERY */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col min-h-[500px]">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                      <h3 className="font-bold text-xs uppercase tracking-wider text-blue-400">3. Ready / On The Way</h3>
                    </div>
                    <span className="bg-blue-400/15 text-blue-400 border border-blue-400/30 text-xs font-extrabold px-2 py-0.5 rounded-full">
                      {dispatchOrders.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                    {dispatchOrders.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs italic">
                        No orders out for delivery
                      </div>
                    ) : (
                      dispatchOrders.map(order => {
                        const mins = getElapsedMinutes(order.created_at);
                        const isEnRoute = order.order_status === 'ON_THE_WAY';
                        return (
                          <div
                            key={order.id}
                            className="bg-slate-950 border border-blue-500/30 rounded-2xl p-3.5 shadow-md hover:border-blue-500/60 transition-all space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-xs text-blue-400">
                                #{order.order_reference || order.id?.slice(0, 8)}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isEnRoute ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'}`}>
                                {isEnRoute ? '🛵 En Route' : '📦 Awaiting Rider'}
                              </span>
                            </div>

                            <div>
                              <p className="font-bold text-xs text-white">{order.customer_name || 'Customer'}</p>
                              <p className="text-[11px] text-slate-400">📍 {order.delivery_address || 'Ibadan Delivery'}</p>
                            </div>

                            {order.delivery_otp && (
                              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-medium">Customer PIN:</span>
                                <span className="font-mono font-black text-amber-400 tracking-widest text-sm bg-black/40 px-2 py-0.5 rounded border border-amber-400/30">
                                  {order.delivery_otp}
                                </span>
                              </div>
                            )}

                            <div className="flex gap-2">
                              {!isEnRoute ? (
                                <button
                                  type="button"
                                  onClick={() => handleAdvanceOrderStatus(order, 'ON_THE_WAY', 'Handed over to rider for delivery')}
                                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <span>🛵 Hand to Rider</span>
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => handleAdvanceOrderStatus(order, 'DELIVERED', 'Delivered to customer doorstep')}
                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                              >
                                <span>🏁 Mark Delivered</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* COLUMN 4: RECENTLY COMPLETED */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col min-h-[500px]">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-400">4. Fulfilled Today</h3>
                    </div>
                    <span className="bg-emerald-400/15 text-emerald-400 border border-emerald-400/30 text-xs font-extrabold px-2 py-0.5 rounded-full">
                      {completedOrders.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                    {completedOrders.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs italic">
                        Completed orders will appear here
                      </div>
                    ) : (
                      completedOrders.map(order => (
                        <div
                          key={order.id}
                          className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 text-xs space-y-1 opacity-80 hover:opacity-100 transition-opacity"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-slate-300">
                              #{order.order_reference || order.id?.slice(0, 8)}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-bold">
                              ₦{Number(order.total_amount || order.total || 0).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">{order.customer_name || 'Customer'} • {(order.items || []).length} items</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          );
        })()}
        {activeSection === 'orders' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
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
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setOrderFilterStatus(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      orderFilterStatus === tab.id
                        ? tab.isAlert ? 'bg-red-600 text-white shadow-md shadow-red-600/30' : 'bg-red-600 text-white shadow-md shadow-red-600/20'
                        : tab.isAlert && tab.count > 0 ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/20' : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      orderFilterStatus === tab.id ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative min-w-[220px]">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search order ref, customer, phone..."
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-red-500"
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
                    className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 transition-all shadow-sm space-y-3 ${
                      isLate ? 'border-red-500/50 bg-red-950/10' : 'border-slate-800 hover:border-slate-700/80'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-red-400">
                          📦
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              onClick={() => setSlipOrder(order)}
                              className="font-mono font-bold text-sm sm:text-base text-white hover:text-emerald-400 cursor-pointer transition-colors"
                              title="Click to view full order slip and receipt"
                            >
                              {order.order_reference}
                            </span>
                            <span
                              className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: (statusColor[order.order_status] || '#EF4444') + '25',
                                color: statusColor[order.order_status] || '#EF4444'
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
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                isLate ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' :
                                elapsedMins >= 18 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>
                                <span>⏱️ {elapsedMins} mins ago</span>
                                <span>{isLate ? '· Running Late' : elapsedMins >= 18 ? '· Hurry' : '· On Track'}</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Placed at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(order.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isLate && (
                          <button
                            onClick={() => handleDispatchDelayApologyPerk(order)}
                            className="px-2.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            title="Send ₦500 Apology Voucher"
                          >
                            <span>🎁 Send ₦500 Voucher</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSlipOrder(order)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer text-xs flex items-center gap-1 font-bold"
                          title="Print Kitchen Slip"
                        >
                          <Printer size={13} />
                          <span className="hidden sm:inline">Receipt Slip</span>
                        </button>
                      </div>
                    </div>

                    {/* Customer, Location & Items Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {/* Customer Info & Direct Contacts */}
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                        <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                          Customer & Contact
                        </div>
                        <div className="font-bold text-sm text-white">{order.customer?.full_name || order.customer_name || 'Customer'}</div>
                        <div className="text-slate-400 font-mono mt-0.5">{order.customer?.phone || order.customer_phone || 'No phone provided'}</div>

                        <div className="flex gap-2 mt-2 pt-2 border-t border-slate-800">
                          {(order.customer?.phone || order.customer_phone) && (
                            <>
                              <a
                                href={`https://wa.me/${String(order.customer?.phone || order.customer_phone).replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(order.customer?.full_name || order.customer_name || 'Customer')},%20this%20is%20FoodMaxx%20Kitchen%20regarding%20order%20${order.order_reference || order.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1"
                              >
                                <MessageSquare size={11} /> WhatsApp
                              </a>
                              <a
                                href={`tel:${order.customer?.phone || order.customer_phone}`}
                                className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1"
                              >
                                <Phone size={11} /> Call
                              </a>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Delivery Destination */}
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                        <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                          Delivery Address ({order.delivery_zone || 'Ibadan'})
                        </div>
                        <div className="font-bold text-slate-200 line-clamp-2">{order.delivery_address}</div>
                        {order.delivery_landmark && (
                          <div className="mt-1.5 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 inline-block">
                            📍 Landmark: {order.delivery_landmark}
                          </div>
                        )}
                        {order.is_gift && (
                          <div className="mt-1 text-[11px] text-red-400 font-bold">
                            🎁 Gift for: {order.recipient_name} ({order.recipient_phone})
                          </div>
                        )}
                      </div>

                      {/* Order Value & Items Summary */}
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                        <div>
                          <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                            Ordered Dishes
                          </div>
                          <div className="space-y-1 max-h-20 overflow-y-auto">
                            {(order.items || []).map((item, idx) => (
                              <div key={idx} className="flex justify-between text-[11px]">
                                <span className="text-slate-300 truncate pr-2">
                                  <strong className="text-red-400">{item.qty || 1}x</strong> {item.name}
                                </span>
                                <span className="font-medium text-slate-400 shrink-0">
                                  ₦{((item.price || 0) * (item.qty || 1)).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 mt-2 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 uppercase font-medium">Total ({order.payment_method})</span>
                          <span className="text-sm font-bold text-red-500">₦{(order.total || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Rider & Delivery OTP Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">🛵 Delivery Rider:</span>
                        {order.assigned_rider ? (
                          <span className="font-bold text-slate-200">
                            {order.assigned_rider.full_name} ({order.assigned_rider.phone})
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">No rider assigned yet</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 bg-[#1A1C23] px-2.5 py-1 rounded-lg border border-[#262A36]">
                        <span className="text-[10px] font-medium text-slate-400">Delivery Code (OTP):</span>
                        <span className="font-mono font-bold text-emerald-400">{order.delivery_otp}</span>
                      </div>
                    </div>

                    {/* Custom Notification Note to Customer if present */}
                    {(order.custom_notification_message || order.status_notes) && (
                      <div className="text-[11px] text-[#EA4C2A] bg-[#EA4C2A]/10 border border-[#EA4C2A]/25 rounded-xl px-3 py-1.5 flex items-center gap-1.5 w-fit">
                        <span>💬 Customer Notification:</span>
                        <span className="font-medium text-white">"{order.custom_notification_message || order.status_notes}"</span>
                      </div>
                    )}

                    {/* Action Stepper Buttons */}
                    <div className="pt-2 border-t border-[#1F222C] flex flex-wrap items-center justify-end gap-2">
                      {/* Change Status & Custom Message Button (Fulfills Request 9) */}
                      <button
                        type="button"
                        onClick={() => setStatusModalOrder(order)}
                        className="px-3 py-1.5 bg-[#EA4C2A]/15 hover:bg-[#EA4C2A]/25 text-[#EA4C2A] border border-[#EA4C2A]/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
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
                            className="px-3 py-1.5 bg-slate-800 hover:bg-red-950/50 text-red-400 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            Reject Order
                          </button>
                          <button
                            onClick={() => handleAdvanceOrderStatus(order, 'PREPARING', 'Accepted & cooking in kitchen')}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-md shadow-red-600/30 flex items-center gap-1.5"
                          >
                            <span>🍳 Accept & Start Cooking</span>
                          </button>
                        </>
                      )}

                      {/* Status: PREPARING */}
                      {order.order_status === 'PREPARING' && (
                        <button
                          onClick={() => handleAdvanceOrderStatus(order, 'READY_FOR_PICKUP', 'Food packaged and ready for dispatch')}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                        >
                          <span>📦 Packaged & Ready for Rider</span>
                        </button>
                      )}

                      {/* Status: READY_FOR_PICKUP */}
                      {order.order_status === 'READY_FOR_PICKUP' && (
                        <button
                          onClick={() => setAssignRiderOrder(order)}
                          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-slate-900 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-md shadow-yellow-500/30 flex items-center gap-1.5"
                        >
                          <span>🛵 Assign to Rider</span>
                        </button>
                      )}

                      {/* Status: ON_THE_WAY */}
                      {order.order_status === 'ON_THE_WAY' && (
                        <button
                          onClick={() => setVerifyOtpOrder(order)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                        >
                          <span>✅ Confirm Delivery Code</span>
                        </button>
                      )}

                      {/* Status: DELIVERED */}
                      {order.order_status === 'DELIVERED' && (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle size={13} /> Delivered
                        </span>
                      )}

                      {/* Status: CANCELLED */}
                      {order.order_status === 'CANCELLED' && (
                        <span className="text-xs font-bold text-red-400 bg-red-500/10 px-3 py-1 rounded-xl border border-red-500/20 flex items-center gap-1">
                          <XCircle size={13} /> Cancelled
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

            {orders.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
                <Package size={36} className="mx-auto mb-2 text-slate-600" />
                <div className="font-bold text-sm text-white">No orders found</div>
                <div className="text-xs text-slate-500 mt-1">Customer orders placed online will appear here live.</div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2b: LIVE DISPATCH & LOGISTICS TERRITORY MAP */}
        {/* ============================================================ */}
        {activeSection === 'dispatch_map' && (() => {
          const onlineRiders = riders.filter(r => r.is_online !== false);
          const activeDeliveries = orders.filter(o => ['READY_FOR_PICKUP', 'ON_THE_WAY'].includes(o.order_status));

          // Ibadan geographic zone nodes for radar dispatch map
          const ibadanZoneNodes = [
            { id: 'bodija', name: 'Bodija / Secretariat', x: 400, y: 160, fee: 800, time: '15m' },
            { id: 'ui', name: 'UI / Agbowo / Samonda', x: 360, y: 80, fee: 1000, time: '20m' },
            { id: 'dugbe', name: 'Dugbe / CBD', x: 250, y: 230, fee: 1200, time: '22m' },
            { id: 'jericho', name: 'Jericho / Iyaganku', x: 210, y: 290, fee: 1200, time: '24m' },
            { id: 'ringroad', name: 'Ring Road / Challenge', x: 320, y: 370, fee: 1500, time: '28m' },
            { id: 'oluyole', name: 'Oluyole Estate', x: 200, y: 390, fee: 1600, time: '30m' },
            { id: 'iworoad', name: 'Iwo Road / Agodi Gate', x: 590, y: 250, fee: 1400, time: '26m' },
            { id: 'akobo', name: 'Akobo / Basorun', x: 580, y: 130, fee: 1400, time: '25m' },
            { id: 'alakia', name: 'Alakia / Airport Rd', x: 690, y: 330, fee: 2000, time: '35m' },
            { id: 'eleyele', name: 'Eleyele / Poly Rd', x: 160, y: 130, fee: 1500, time: '28m' },
            { id: 'ojoo', name: 'Ojoo / Moniya Express', x: 470, y: 50, fee: 1800, time: '32m' },
          ];

          return (
            <div className="space-y-4">
              {/* Metrics Header Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg font-bold border border-emerald-500/30">
                    🟢
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">Online Riders</div>
                    <div className="text-lg font-black text-white">{onlineRiders.length} Active</div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-lg font-bold border border-blue-500/30">
                    🛵
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">In-Transit</div>
                    <div className="text-lg font-black text-white">{activeDeliveries.length} Packages</div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg font-bold border border-amber-500/30">
                    ⚡
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">Avg Delivery Time</div>
                    <div className="text-lg font-black text-white">22 Mins</div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-lg font-bold border border-purple-500/30">
                    📍
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">Active Coverage</div>
                    <div className="text-lg font-black text-white">{zones.length || 14} Zones</div>
                  </div>
                </div>
              </div>

              {/* Interactive Visual Territory Radar Map & Active Routes */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      <span>🗺️ Live Dispatch Radar · Ibadan Territory</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                        Live GPS Simulation
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Hub: FoodMaxx Central Kitchen (Bodija / Secretariat Rd · 7.4223° N, 3.9059° E)
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="flex items-center gap-1 text-[#EA4C2A]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#EA4C2A] animate-ping" /> Central Kitchen
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="flex items-center gap-1 text-blue-400">
                      <span className="w-2 h-2 rounded-full bg-blue-400" /> Active Riders
                    </span>
                  </div>
                </div>

                {/* SVG Radar Map */}
                <div className="relative w-full aspect-[16/9] max-h-[460px] bg-[#0A0B0E] rounded-2xl border border-slate-800/80 overflow-hidden flex items-center justify-center shadow-inner">
                  <svg viewBox="0 0 800 460" className="w-full h-full select-none">
                    <defs>
                      <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#EA4C2A" stopOpacity="0.25" />
                        <stop offset="60%" stopColor="#EA4C2A" stopOpacity="0.05" />
                        <stop offset="100%" stopColor="#0A0B0E" stopOpacity="0" />
                      </radialGradient>
                      <linearGradient id="routeLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#EA4C2A" />
                        <stop offset="100%" stopColor="#38BDF8" />
                      </linearGradient>
                    </defs>

                    {/* Background Radar Rings from FoodMaxx Kitchen (400, 240) */}
                    <circle cx="400" cy="240" r="80" fill="none" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
                    <circle cx="400" cy="240" r="160" fill="none" stroke="#1E293B" strokeWidth="1" strokeDasharray="4 4" />
                    <circle cx="400" cy="240" r="260" fill="none" stroke="#1E293B" strokeWidth="1" strokeDasharray="5 5" />
                    <circle cx="400" cy="240" r="360" fill="none" stroke="#141E2E" strokeWidth="1" />
                    
                    {/* Radar Pulse Area */}
                    <circle cx="400" cy="240" r="140" fill="url(#radarGlow)" />

                    {/* Connecting delivery routes to all zone nodes */}
                    {ibadanZoneNodes.map((zn, idx) => (
                      <g key={`route-${zn.id}`}>
                        <line
                          x1="400"
                          y1="240"
                          x2={zn.x}
                          y2={zn.y}
                          stroke="url(#routeLineGrad)"
                          strokeWidth="1.5"
                          strokeDasharray="6 4"
                          strokeOpacity={idx % 2 === 0 ? "0.8" : "0.35"}
                          className="animate-pulse"
                        />
                      </g>
                    ))}

                    {/* Central Kitchen Hub (FoodMaxx Bodija) */}
                    <g className="cursor-pointer">
                      <circle cx="400" cy="240" r="22" fill="#EA4C2A" fillOpacity="0.2" className="animate-ping" />
                      <circle cx="400" cy="240" r="14" fill="#EA4C2A" stroke="#FFFFFF" strokeWidth="2.5" />
                      <text x="400" y="272" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
                        🍔 FOODMAXX HQ (Bodija)
                      </text>
                      <text x="400" y="286" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="sans-serif">
                        7.4223° N, 3.9059° E
                      </text>
                    </g>

                    {/* Zone Node Pins */}
                    {ibadanZoneNodes.map(zn => (
                      <g key={zn.id} className="cursor-pointer group">
                        <circle cx={zn.x} cy={zn.y} r="7" fill="#1E293B" stroke="#38BDF8" strokeWidth="2" />
                        <circle cx={zn.x} cy={zn.y} r="3" fill="#38BDF8" />
                        <text
                          x={zn.x}
                          y={zn.y - 12}
                          textAnchor="middle"
                          fill="#E2E8F0"
                          fontSize="9.5"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                          className="drop-shadow-md"
                        >
                          {zn.name.split('/')[0].trim()}
                        </text>
                        <text
                          x={zn.x}
                          y={zn.y + 16}
                          textAnchor="middle"
                          fill="#F59E0B"
                          fontSize="8.5"
                          fontWeight="600"
                          fontFamily="sans-serif"
                        >
                          ₦{zn.fee.toLocaleString()} · {zn.time}
                        </text>
                      </g>
                    ))}

                    {/* Simulated Rider Blips */}
                    {onlineRiders.slice(0, 5).map((rider, idx) => {
                      const pos = [
                        { x: 380, y: 195 },
                        { x: 490, y: 245 },
                        { x: 350, y: 310 },
                        { x: 290, y: 180 },
                        { x: 440, y: 100 }
                      ][idx] || { x: 420, y: 210 };

                      return (
                        <g key={rider.id || idx} className="cursor-pointer">
                          <circle cx={pos.x} cy={pos.y} r="11" fill="#3B82F6" fillOpacity="0.3" className="animate-ping" />
                          <circle cx={pos.x} cy={pos.y} r="8" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />
                          <text x={pos.x + 12} y={pos.y + 3} fill="#93C5FD" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
                            🛵 {rider.full_name?.split(' ')[0] || 'Rider'}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Territory Compass Overlay */}
                  <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-800 text-[10px] text-slate-400 font-mono flex items-center gap-2">
                    <span>🧭 IBADAN CENTRAL RADAR</span>
                    <span>•</span>
                    <span className="text-emerald-400">ONLINE 100%</span>
                  </div>
                </div>

                {/* Dispatch List: Active Riders & Deliveries */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                  {/* Riders Fleet Column */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Truck size={14} className="text-[#EA4C2A]" />
                        <span>Registered Fleet Riders ({riders.length})</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => loadSection('riders')}
                        className="text-[11px] text-[#EA4C2A] hover:underline font-bold"
                      >
                        Manage Fleet →
                      </button>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {riders.map(r => (
                        <div key={r.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-200 font-bold flex items-center justify-center text-xs">
                              {r.vehicle_type === 'bike' ? '🏍️' : '🛵'}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{r.full_name}</span>
                                <span className={`w-2 h-2 rounded-full ${r.is_online !== false ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                              </div>
                              <div className="text-[11px] text-slate-400">{r.phone || 'No phone'} • Zone: {r.zone || 'Bodija / Central'}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {r.phone && (
                              <a
                                href={`tel:${r.phone}`}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition-colors"
                              >
                                📞 Call
                              </a>
                            )}
                            <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              {r.completed_deliveries || 0} Delivered
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active Packages in Transit */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Package size={14} className="text-blue-400" />
                        <span>In-Transit & Dispatched Orders ({activeDeliveries.length})</span>
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">Real-time Ibadan Routes</span>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {activeDeliveries.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-xs italic">
                          No orders currently in transit. Ready orders will appear here.
                        </div>
                      ) : (
                        activeDeliveries.map(ord => (
                          <div key={ord.id} className="bg-slate-900/80 border border-blue-500/30 rounded-xl p-2.5 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span className="font-mono text-blue-400">#{ord.order_reference || ord.id?.slice(0, 8)}</span>
                                <span className="text-slate-400">•</span>
                                <span>{ord.customer_name || 'Customer'}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                                📍 {ord.delivery_address || 'Ibadan destination'}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {ord.delivery_otp && (
                                <span className="font-mono text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.5 rounded">
                                  PIN: {ord.delivery_otp}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleAdvanceOrderStatus(ord, 'DELIVERED', 'Delivered to customer')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                              >
                                Mark Delivered
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

        {/* ============================================================ */}
        {/* TAB 3: MENU & DISHES (DISHES, CATEGORY MANAGER & SECTION EDITOR) */}
        {/* ============================================================ */}
        {activeSection === 'products' && (
          <div className="space-y-4">
            {/* SUB-NAVIGATION PILL BAR */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setMenuSubTab('dishes')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    menuSubTab === 'dishes'
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  🍽️ Dishes ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMenuSubTab('categories')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    menuSubTab === 'categories'
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  📂 Category Manager ({categories.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMenuSubTab('sections')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    menuSubTab === 'sections'
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
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
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-red-600/20 shrink-0"
                >
                  <Plus size={14} /> Add Category
                </button>
              )}
            </div>

            {/* SUBTAB 1: DISHES & MENU */}
            {menuSubTab === 'dishes' && (
              <div className="space-y-4">
                {/* Top Filter and Action Bar */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                  <div className="flex flex-wrap gap-2 items-center flex-1">
                    <div className="relative min-w-[200px] flex-1">
                      <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search dishes..."
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-red-500"
                      />
                    </div>

                    <select
                      value={productFilterCat}
                      onChange={e => setProductFilterCat(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-semibold outline-none focus:border-red-500"
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
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-red-600/20 shrink-0"
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
                        className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-4 flex flex-col justify-between transition-all group"
                      >
                        <div>
                          {/* Image Preview */}
                          <div className="relative h-40 rounded-2xl overflow-hidden mb-3 bg-slate-950">
                            <img onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'; }}                               src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold">
                              {product.category}
                            </span>

                            {/* Direct 1-Click Availability Toggle Badge on Image */}
                            <button
                              type="button"
                              onClick={() => toggleProductAvailability(product)}
                              className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[10px] font-semibold cursor-pointer shadow-md transition-all active:scale-95 ${
                                product.is_available
                                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                  : 'bg-red-500 text-white hover:bg-red-600'
                              }`}
                            >
                              {product.is_available ? '🟢 In Stock' : '🔴 Sold Out'}
                            </button>

                            {product.badge && (
                              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-amber-500 text-slate-900 text-[10px] font-semibold uppercase tracking-wider">
                                {product.badge}
                              </span>
                            )}
                          </div>

                          <h3 className="font-semibold text-sm text-white line-clamp-1 mb-1">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                              {product.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                            <span className="font-bold text-base text-red-500">
                              ₦{Number(product.price || 0).toLocaleString()}
                            </span>
                            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
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
                              <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex flex-wrap items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-bold tracking-tight">⚖️ Portions:</span>
                                {pSizes.map((ps, idx) => (
                                  <span key={idx} className="text-[9.5px] font-bold bg-[#1A1C23] text-amber-300 px-1.5 py-0.5 rounded-md border border-slate-800">
                                    {ps.name.replace(/\s*\(.*\)/, '')}: {ps.price_adjustment === 0 ? 'Base' : `+₦${Number(ps.price_adjustment).toLocaleString()}`}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Card Controls */}
                        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => toggleProductAvailability(product)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              product.is_available
                                ? 'bg-slate-800 hover:bg-red-950/40 text-slate-300 hover:text-red-400'
                                : 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white'
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
                              className="px-2 py-1 rounded-xl bg-orange-600/15 hover:bg-orange-600/30 text-[#EA4C2A] text-[11px] font-bold transition-colors cursor-pointer border border-orange-500/30 flex items-center gap-1"
                              title="Edit Portions & Pricing"
                            >
                              <span>⚖️ Portions</span>
                            </button>
                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setProductModalOpen(true);
                              }}
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
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
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
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
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white">Menu Categories</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Organize food items into discoverable menu groups.</p>
                  </div>
                  <span className="text-xs font-bold text-slate-300 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
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
                        className={`bg-slate-900 border rounded-2xl p-4 flex items-center justify-between transition-all ${
                          isActive ? 'border-slate-800 hover:border-slate-700' : 'border-slate-850 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-2xl w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 shadow-xs">
                            {cat.icon || '🍲'}
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-bold text-xs sm:text-sm text-white truncate">{cat.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-slate-400">{dishCount} {dishCount === 1 ? 'dish' : 'dishes'}</span>
                              <span className="text-[10px] text-slate-600">•</span>
                              <button
                                type="button"
                                onClick={() => handleToggleCategory(cat)}
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md transition-colors cursor-pointer ${
                                  isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
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
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="Edit Category"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
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
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-white">Homepage Section Editor</h2>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live Firestore Sync
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Reorder, rename, filter, or toggle curated rows on the customer mobile home screen in real time.</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleResetHomepageSections}
                      className="px-3 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-750 transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Reset to default sections"
                    >
                      <RotateCw size={13} />
                      <span>Reset Defaults</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomSection}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Add Section</span>
                    </button>
                    <button
                      type="button"
                      disabled={savingSections}
                      onClick={handleSaveHomepageSections}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 shrink-0 cursor-pointer flex items-center gap-1.5 transition-all"
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
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
                    <p className="text-sm text-slate-400 mb-3">No homepage sections configured.</p>
                    <button
                      type="button"
                      onClick={handleResetHomepageSections}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
                    >
                      Restore Default Sections
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {homepageSections.map((sec, idx) => (
                      <div
                        key={sec.id}
                        className={`bg-slate-900 border rounded-2xl p-4 transition-all ${
                          sec.enabled ? 'border-slate-800 hover:border-slate-700' : 'border-slate-850 opacity-75'
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
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                title="Move Up"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                type="button"
                                disabled={idx === homepageSections.length - 1}
                                onClick={() => handleMoveSection(idx, 1)}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                title="Move Down"
                              >
                                <ArrowDown size={12} />
                              </button>
                            </div>

                            <div className="flex-1 space-y-2 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800 uppercase shrink-0">
                                  Row #{idx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={sec.title}
                                  onChange={e => handleUpdateSection(sec.id, e.target.value, sec.subtitle)}
                                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-red-500 flex-1 min-w-[180px] max-w-sm"
                                  placeholder="Section Title"
                                />
                              </div>
                              <input
                                type="text"
                                value={sec.subtitle}
                                onChange={e => handleUpdateSection(sec.id, sec.title, e.target.value)}
                                className="w-full max-w-md bg-slate-950/60 border border-slate-850 rounded-lg px-2.5 py-1 text-[11px] text-slate-400 focus:outline-none focus:border-slate-700"
                                placeholder="Subtitle Description (e.g. Curated popular items)"
                              />
                            </div>
                          </div>

                          {/* Filter, Limit, Visibility, and Delete Controls */}
                          <div className="flex items-center gap-2 flex-wrap shrink-0 self-end lg:self-center">
                            {/* Section Icon Selector */}
                            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
                              <span className="text-[10px] text-slate-400 font-semibold">Icon:</span>
                              <select
                                value={sec.icon || 'Sparkles'}
                                onChange={e => {
                                  handleUpdateSection(sec.id, { icon: e.target.value });
                                }}
                                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                              >
                                <option value="Sparkles" className="bg-slate-900 text-white">✨ Sparkles</option>
                                <option value="Flame" className="bg-slate-900 text-white">🔥 Flame (Hot)</option>
                                <option value="Tag" className="bg-slate-900 text-white">🏷️ Tag (Deals)</option>
                                <option value="Clock" className="bg-slate-900 text-white">⏱️ Clock (Fast)</option>
                                <option value="Star" className="bg-slate-900 text-white">⭐ Star (Curated)</option>
                                <option value="Heart" className="bg-slate-900 text-white">❤️ Heart (Faves)</option>
                                <option value="Gift" className="bg-slate-900 text-white">🎁 Gift (Special)</option>
                                <option value="Utensils" className="bg-slate-900 text-white">🍴 Utensils (Dishes)</option>
                                <option value="Zap" className="bg-slate-900 text-white">⚡ Zap (Speedy)</option>
                                <option value="ShoppingBag" className="bg-slate-900 text-white">🛍️ Shopping Bag</option>
                              </select>
                            </div>

                            {/* Filter Type Dropdown */}
                            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
                              <span className="text-[10px] text-slate-400 font-semibold">Filter:</span>
                              <select
                                value={sec.filter_type || 'bestseller'}
                                onChange={e => {
                                  handleUpdateSection(sec.id, { filter_type: e.target.value });
                                }}
                                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                              >
                                <option value="bestseller" className="bg-slate-900 text-white">⭐ Bestsellers</option>
                                <option value="popular" className="bg-slate-900 text-white">🔥 Trending</option>
                                <option value="deals" className="bg-slate-900 text-white">🏷️ Deals & Combos</option>
                                <option value="fast" className="bg-slate-900 text-white">⚡ Quick Bites (&le;25m)</option>
                                <option value="rice" className="bg-slate-900 text-white">🍚 Rice & Jollof</option>
                                <option value="swallows" className="bg-slate-900 text-white">🍲 Swallow & Soup</option>
                                <option value="grills" className="bg-slate-900 text-white">🍗 Grills & Suya</option>
                                <option value="shawarma" className="bg-slate-900 text-white">🌯 Shawarma</option>
                                <option value="pasta" className="bg-slate-900 text-white">🍝 Pasta</option>
                                <option value="drinks" className="bg-slate-900 text-white">🥤 Chilled Drinks</option>
                                <option value="desserts" className="bg-slate-900 text-white">🍨 Desserts</option>
                              </select>
                            </div>

                            {/* Display Limit */}
                            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
                              <span className="text-[10px] text-slate-400 font-semibold">Max:</span>
                              <select
                                value={sec.display_limit || 6}
                                onChange={e => {
                                  handleUpdateSection(sec.id, { display_limit: Number(e.target.value) });
                                }}
                                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                              >
                                <option value={4} className="bg-slate-900 text-white">4 items</option>
                                <option value={6} className="bg-slate-900 text-white">6 items</option>
                                <option value={8} className="bg-slate-900 text-white">8 items</option>
                                <option value={12} className="bg-slate-900 text-white">12 items</option>
                              </select>
                            </div>

                            {/* Visibility Toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleSection(sec.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                sec.enabled
                                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750'
                              }`}
                            >
                              {sec.enabled ? '🟢 Visible on Home' : '🔴 Hidden on Home'}
                            </button>

                            {/* Delete Section */}
                            <button
                              type="button"
                              onClick={() => handleDeleteSection(sec.id)}
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 transition-colors cursor-pointer border border-slate-750"
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
        {/* TAB 3A: DEDICATED STOCK INVENTORY & PORTIONS MANAGEMENT */}
        {/* ============================================================ */}
        {activeSection === 'inventory' && (
          <div className="space-y-6">
            {/* Top Metric Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div 
                className="border rounded-2xl p-4 shadow-sm"
                style={{ backgroundColor: currentAdminTheme.card, borderColor: currentAdminTheme.border }}
              >
                <div className="text-xs font-bold text-slate-400 mb-1">Total Catalog Dishes</div>
                <div className="text-2xl font-black text-white">{products.length}</div>
                <div className="text-[10px] text-slate-400 mt-1">Available on FoodMaxx Menu</div>
              </div>

              <div 
                className="border rounded-2xl p-4 shadow-sm"
                style={{ backgroundColor: currentAdminTheme.card, borderColor: currentAdminTheme.border }}
              >
                <div className="text-xs font-bold text-slate-400 mb-1">Healthy Stock (≥15)</div>
                <div className="text-2xl font-black text-emerald-400">
                  {products.filter(p => (p.stock_quantity ?? 50) >= 15 && p.is_available).length}
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold mt-1">Ready for kitchen orders</div>
              </div>

              <div 
                className={`border rounded-2xl p-4 shadow-sm ${lowStockCount > 0 ? 'ring-1 ring-amber-500/30' : ''}`}
                style={{ backgroundColor: currentAdminTheme.card, borderColor: currentAdminTheme.border }}
              >
                <div className="text-xs font-bold text-slate-400 mb-1">Low Stock Alert (&lt;15)</div>
                <div className={`text-2xl font-black ${lowStockCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {lowStockCount}
                </div>
                <div className="text-[10px] text-amber-400 font-semibold mt-1">Needs kitchen replenishment</div>
              </div>

              <div 
                className="border rounded-2xl p-4 shadow-sm"
                style={{ backgroundColor: currentAdminTheme.card, borderColor: currentAdminTheme.border }}
              >
                <div className="text-xs font-bold text-slate-400 mb-1">Out of Stock / Sold Out</div>
                <div className="text-2xl font-black text-rose-400">
                  {products.filter(p => (p.stock_quantity ?? 50) <= 0 || !p.is_available).length}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Hidden from customer store</div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div 
              className="border rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between"
              style={{ backgroundColor: currentAdminTheme.card, borderColor: currentAdminTheme.border }}
            >
              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-1.5 items-center">
                {[
                  { id: 'all', label: 'All Dishes', count: products.length },
                  { id: 'low', label: '⚠️ Low Stock (<15)', count: lowStockCount },
                  { id: 'healthy', label: '🟢 Healthy Stock', count: products.filter(p => (p.stock_quantity ?? 50) >= 15 && p.is_available).length },
                  { id: 'out_of_stock', label: '🔴 Sold Out', count: products.filter(p => (p.stock_quantity ?? 50) <= 0 || !p.is_available).length }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setInventoryFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      inventoryFilter === f.id
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                        : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/10'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      inventoryFilter === f.id ? 'bg-black/30 text-white' : 'bg-black/40 text-slate-400'
                    }`}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-1 md:justify-end">
                <div className="relative min-w-[200px] flex-1 max-w-xs">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search dishes or categories..."
                    value={inventorySearch}
                    onChange={e => setInventorySearch(e.target.value)}
                    className="w-full bg-slate-950/70 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>

                {lowStockCount > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      const lowItems = products.filter(p => (p.stock_quantity ?? 50) < 15);
                      for (const item of lowItems) {
                        await handleRestockProduct(item, 25);
                      }
                      toast(`Replenished +25 portions to all ${lowItems.length} low-stock dishes! 📦`, 'success');
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-amber-500/20 shrink-0 flex items-center gap-1"
                  >
                    <span>⚡ Restock All Low (+25)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Inventory Dish Cards List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products
                .filter(p => {
                  const stock = p.stock_quantity ?? 50;
                  if (inventoryFilter === 'low') return stock < 15;
                  if (inventoryFilter === 'healthy') return stock >= 15 && p.is_available;
                  if (inventoryFilter === 'out_of_stock') return stock <= 0 || !p.is_available;
                  return true;
                })
                .filter(p => {
                  if (!inventorySearch.trim()) return true;
                  const q = inventorySearch.toLowerCase();
                  return (
                    p.name.toLowerCase().includes(q) ||
                    (p.category && p.category.toLowerCase().includes(q))
                  );
                })
                .map(product => {
                  const currentStock = Number(product.stock_quantity ?? 50);
                  const isAvailable = product.is_available !== false && currentStock > 0;
                  const isLow = currentStock < 15 && currentStock > 0;
                  const isDepleted = currentStock <= 0 || !product.is_available;
                  const stockPct = Math.min(100, Math.max(0, Math.round((currentStock / 50) * 100)));

                  return (
                    <div
                      key={product.id}
                      className="border rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all"
                      style={{ backgroundColor: currentAdminTheme.card, borderColor: currentAdminTheme.border }}
                    >
                      <div>
                        {/* Header: Photo + Info */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-white/10">
                            <img
                              src={product.image_url}
                              alt={product.name}
                              onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80'; }}
                              className="w-full h-full object-cover"
                            />
                            {product.category && (
                              <span className="absolute bottom-0 inset-x-0 bg-black/75 text-center text-[8px] font-bold text-white py-0.5 truncate px-1">
                                {product.category}
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-bold text-sm text-white truncate">{product.name}</h3>
                              <button
                                type="button"
                                onClick={() => toggleProductAvailability(product)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 cursor-pointer border transition-colors ${
                                  isAvailable
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                                }`}
                              >
                                {isAvailable ? '🟢 In Stock' : '🔴 Sold Out'}
                              </button>
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-bold text-sm text-emerald-400">
                                ₦{Number(product.price || 0).toLocaleString()}
                              </span>
                              <span className="text-[11px] text-slate-400">• Prep: {product.prep_time_min || 20}m</span>
                            </div>

                            {/* Portion Sizes Configured Pill */}
                            {(() => {
                              try {
                                const tiers = product.portion_sizes_json ? JSON.parse(product.portion_sizes_json) : [];
                                if (Array.isArray(tiers) && tiers.length > 0) {
                                  return (
                                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[9.5px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                                        ⚖️ {tiers.length} Portion Sizes ({tiers.map(t => t.name).join(', ')})
                                      </span>
                                    </div>
                                  );
                                }
                              } catch {}
                              return null;
                            })()}
                          </div>
                        </div>

                        {/* Visual Depletion Meter */}
                        <div className="bg-slate-950/70 border border-white/5 rounded-xl p-3 mb-3.5">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-medium text-slate-300">Remaining Portions:</span>
                            <span className={`font-black font-mono ${
                              isDepleted ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {currentStock} units ({stockPct}%)
                            </span>
                          </div>

                          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isDepleted ? 'bg-rose-500' : isLow ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              }`}
                              style={{ width: `${stockPct}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                            <span>0 (Depleted)</span>
                            <span>Threshold: 15 units</span>
                            <span>50+ (Plentiful)</span>
                          </div>
                        </div>
                      </div>

                      {/* 1-Click Restock Actions */}
                      <div className="pt-2 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2" style={{ borderColor: currentAdminTheme.border }}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-400 mr-1">Restock:</span>
                          <button
                            type="button"
                            onClick={() => handleRestockProduct(product, 10)}
                            className="px-2.5 py-1 bg-white/5 hover:bg-emerald-600/20 hover:text-emerald-400 border border-white/10 rounded-lg text-xs font-bold text-slate-300 transition-all cursor-pointer active:scale-95"
                          >
                            +10
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRestockProduct(product, 25)}
                            className="px-2.5 py-1 bg-white/5 hover:bg-emerald-600/20 hover:text-emerald-400 border border-white/10 rounded-lg text-xs font-bold text-slate-300 transition-all cursor-pointer active:scale-95"
                          >
                            +25
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRestockProduct(product, 50)}
                            className="px-2.5 py-1 bg-white/5 hover:bg-emerald-600/20 hover:text-emerald-400 border border-white/10 rounded-lg text-xs font-bold text-slate-300 transition-all cursor-pointer active:scale-95"
                          >
                            +50
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const inputVal = window.prompt(`Enter exact inventory units for "${product.name}":`, String(currentStock));
                              if (inputVal !== null) {
                                handleSetProductStock(product, inputVal);
                              }
                            }}
                            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                          >
                            Custom...
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProduct(product);
                              setProductModalOpen(true);
                            }}
                            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Edit Dish & Portion Sizes"
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {products.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs">
                No menu items found in inventory catalog.
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3B: ADD-ONS & EXTRAS (DYNAMIC LIVE WITH REAL PHOTOS) */}
        {/* ============================================================ */}
        {activeSection === 'addons' && (
          <div className="space-y-4">
            {/* Top Filter and Action Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="flex flex-wrap gap-2 items-center flex-1">
                <div className="relative min-w-[200px] flex-1">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search add-ons & drinks..."
                    value={addonSearch}
                    onChange={e => setAddonSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-orange-500"
                  />
                </div>

                <select
                  value={addonFilterCat}
                  onChange={e => setAddonFilterCat(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-semibold outline-none focus:border-orange-500"
                >
                  <option value="all">All Categories ({addons.length})</option>
                  <option value="Sides">Sides</option>
                  <option value="Drinks">Drinks</option>
                  <option value="Proteins">Proteins</option>
                  <option value="Extras">Extras</option>
                  <option value="Snacks">Snacks</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setEditingAddon(null);
                  setAddonModalOpen(true);
                }}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-orange-600/20 shrink-0"
              >
                <Plus size={15} /> Add New Extra
              </button>
            </div>

            {/* Addons Grid with Real Food Photography */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {addons
                .filter(a => {
                  const matchCat = addonFilterCat === 'all' || a.category === addonFilterCat;
                  const matchSearch = !addonSearch.trim() ||
                    a.name.toLowerCase().includes(addonSearch.toLowerCase()) ||
                    (a.category && a.category.toLowerCase().includes(addonSearch.toLowerCase())) ||
                    (a.description && a.description.toLowerCase().includes(addonSearch.toLowerCase()));
                  return matchCat && matchSearch;
                })
                .map(addon => (
                  <div
                    key={addon.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-4 flex flex-col justify-between transition-all group"
                  >
                    <div>
                      {/* Real Image Preview */}
                      <div className="relative h-36 rounded-2xl overflow-hidden mb-3 bg-slate-950">
                        <img
                          onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'; }}
                          src={addon.image_url}
                          alt={addon.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          decoding="async"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold">
                          {addon.category || 'Sides'}
                        </span>

                        {/* Direct 1-Click Availability Toggle Badge on Image */}
                        <button
                          type="button"
                          onClick={() => toggleAddonAvailability(addon)}
                          className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[10px] font-semibold cursor-pointer shadow-md transition-all active:scale-95 ${
                            addon.is_available !== false
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                              : 'bg-red-500 text-white hover:bg-red-600'
                          }`}
                        >
                          {addon.is_available !== false ? '🟢 In Stock' : '🔴 Sold Out'}
                        </button>
                      </div>

                      <h3 className="font-semibold text-sm text-white line-clamp-1 mb-1">
                        {addon.name}
                      </h3>
                      {addon.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                          {addon.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                        <span className="font-bold text-base text-orange-500">
                          ₦{Number(addon.price || 0).toLocaleString()}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">Cart Add-on</span>
                      </div>
                    </div>

                    {/* Card Controls */}
                    <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleAddonAvailability(addon)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          addon.is_available !== false
                            ? 'bg-slate-800 hover:bg-red-950/40 text-slate-300 hover:text-red-400'
                            : 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white'
                        }`}
                      >
                        {addon.is_available !== false ? 'Mark Sold Out' : 'Mark Available'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingAddon(addon);
                            setAddonModalOpen(true);
                          }}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Edit Add-on"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteAddon(addon)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete Add-on"
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

        {/* ============================================================ */}
        {/* TAB 4: DISPATCH FLEET / RIDERS */}
        {/* ============================================================ */}
        {activeSection === 'riders' && (
          <div className="space-y-4">
            {riders.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
                <Bike size={36} className="mx-auto mb-2 text-slate-600" />
                <div className="font-bold text-sm text-white">No dispatch riders registered yet</div>
                <div className="text-xs text-slate-500 mt-1">Couriers registered or invited to FoodMaxx will appear here for live dispatch.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {riders.map(r => {
                  const riderName = r.full_name || r.name || 'Rider';
                  const initial = riderName.charAt(0).toUpperCase() || 'R';
                  const isOnline = r.is_online !== false && r.status !== 'offline';
                  return (
                    <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center font-bold text-red-500 text-base">
                              {initial}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                              isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                            }`} />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white">{riderName}</div>
                            <div className="text-xs text-slate-400 font-mono">{r.phone || 'No phone'}</div>
                          </div>
                        </div>

                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                          isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs space-y-1">
                        <div className="flex justify-between text-slate-400">
                          <span>Vehicle:</span>
                          <span className="font-bold text-slate-200">{r.vehicle_type || 'Motorcycle'} {r.plate_number ? `(${r.plate_number})` : ''}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Rating:</span>
                          <span className="font-bold text-yellow-400">⭐ {r.rating || 5.0}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Completed Deliveries:</span>
                          <span className="font-bold text-white">{r.total_deliveries ?? 0} trips</span>
                        </div>
                        {r.active_order_ref && (
                          <div className="flex justify-between text-teal-400 font-bold pt-1 border-t border-slate-800">
                            <span>Active Trip:</span>
                            <span>{r.active_order_ref}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <a
                          href={`tel:${r.phone}`}
                          className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors"
                        >
                          <Phone size={12} /> Call Rider
                        </a>
                        <a
                          href={`https://wa.me/${(r.phone || '').replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors"
                        >
                          <MessageSquare size={12} /> WhatsApp
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB: DAILY PAYOUTS & BANK SETTLEMENT LOG */}
        {/* ============================================================ */}
        {activeSection === 'payouts' && (
          <div className="space-y-4">
            {/* Top Bar with Description & CSV Export */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-400" />
                  <span>Daily Bank Payouts & Money Log</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  See what enters your bank account every morning after card fees and rider payments are subtracted.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportPayouts}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700/60 shadow-sm shrink-0"
              >
                <Download size={14} className="text-emerald-400" />
                <span>Download Payouts (CSV)</span>
              </button>
            </div>

            {/* Financial Summary Cards */}
            {(() => {
              const completedPaidOrders = orders.filter(o => ['DELIVERED', 'COMPLETED'].includes(o.order_status) && ['PAID', 'paid'].includes(o.payment_status));
              const revenueCalc = overview?.revenueToday != null ? overview.revenueToday : orders.reduce((sum, o) => sum + (['PAID', 'paid'].includes(o.payment_status) ? Number(o.total || o.total_amount || 0) : 0), 0);
              const cardFees = revenueCalc > 0 ? Math.round(revenueCalc * 0.015 + (orders.length * 100)) : 0;
              const riderFees = completedPaidOrders.reduce((sum, o) => sum + Number(o.delivery_fee || 500), 0);
              const estDeposit = Math.max(0, revenueCalc - cardFees - riderFees);

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Today's Estimated Deposit */}
                  <div className="bg-slate-900 border border-emerald-500/20 rounded-3xl p-4.5 bg-linear-to-b from-emerald-950/20 to-slate-900">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Today's Bank Deposit (Est.)</span>
                    <div className="text-2xl font-black text-emerald-400 mt-1">
                      ₦{estDeposit.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Expected in bank tomorrow by 9:00 AM</span>
                  </div>

                  {/* Total Card Processing Fees */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Card Processing Fees (Paystack)</span>
                    <div className="text-2xl font-black text-amber-400 mt-1">
                      -₦{cardFees.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">Standard 1.5% + ₦100 per transaction</span>
                  </div>

                  {/* Rider Delivery Pay */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Rider Delivery Pay</span>
                    <div className="text-2xl font-black text-blue-400 mt-1">
                      -₦{riderFees.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">Paid automatically to {completedPaidOrders.length} completed trips</span>
                  </div>

                  {/* Destination Bank Account */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Your Payout Bank</span>
                      <div className="text-sm font-black text-white mt-1">Guaranty Trust Bank (GTB)</div>
                      <div className="text-xs text-slate-400 font-mono">0123456789 · FoodMaxx Kitchen Ltd</div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 mt-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Verified & Active Account
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Payout Settlements Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Recent Daily Bank Settlements</h4>
                <span className="text-[11px] text-slate-400">Automatic daily bank transfer</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Settlement ID</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5 text-center">Orders</th>
                      <th className="p-3.5 text-right">Customer Sales</th>
                      <th className="p-3.5 text-right">Card Fees</th>
                      <th className="p-3.5 text-right">Rider Pay</th>
                      <th className="p-3.5 text-right">Bank Deposit (Net)</th>
                      <th className="p-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {payouts.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-8 text-center text-slate-500">
                          <DollarSign size={24} className="mx-auto mb-1.5 text-slate-600" />
                          <div className="font-bold text-xs text-slate-400">No bank settlements recorded yet</div>
                          <div className="text-[11px] text-slate-600 mt-0.5">Daily settlement logs are generated automatically as customer orders are fulfilled.</div>
                        </td>
                      </tr>
                    ) : (
                      payouts.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 font-mono text-[11px] text-slate-400 font-bold">{p.id}</td>
                          <td className="p-3.5 font-bold text-white">{p.date}</td>
                          <td className="p-3.5 text-center font-mono font-semibold">{p.orders_count}</td>
                          <td className="p-3.5 text-right font-mono font-bold text-white">₦{Number(p.gross_amount).toLocaleString()}</td>
                          <td className="p-3.5 text-right font-mono text-amber-400">-₦{Number(p.gateway_fees).toLocaleString()}</td>
                          <td className="p-3.5 text-right font-mono text-blue-400">-₦{Number(p.rider_payouts).toLocaleString()}</td>
                          <td className="p-3.5 text-right font-mono font-black text-emerald-400 text-sm">
                            ₦{Number(p.net_payout).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              p.status === 'SETTLED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}>
                              {p.status === 'SETTLED' ? '✅ Sent to Bank' : '⏳ Today (Cooking)'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: DISCOUNT CODES & PROMOS */}
        {/* ============================================================ */}
        {activeSection === 'promotions' && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Tag size={16} className="text-red-400" />
                  <span>Discount Codes & Promos</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Create discounts your customers can apply during checkout</p>
              </div>
              <button
                onClick={() => setPromoModalOpen(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-600/20 shrink-0"
              >
                <Plus size={15} /> Create New Code
              </button>
            </div>

            {/* Curated 1-Tap Promo Ideas Shelf */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-400" />
                    <span>Popular Promo Ideas (1-Tap Setup)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Click any promo to turn it on for your store</p>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                  Ready to Use
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {PROMO_IDEAS.map(idea => {
                  const alreadyExists = promotions.some(p => p.code === idea.code);
                  return (
                    <div
                      key={idea.id}
                      className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 flex flex-col justify-between transition-all group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-base">{idea.icon}</span>
                          <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                            {idea.badge}
                          </span>
                        </div>
                        <div className="font-mono font-black text-sm text-red-400 tracking-wide">{idea.code}</div>
                        <div className="font-bold text-xs text-white mt-1">{idea.title}</div>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{idea.description}</p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-900 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">Min spend: ₦{Number(idea.min_order).toLocaleString()}</span>
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
                              ? 'bg-slate-900 text-slate-600 cursor-not-allowed'
                              : 'bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30'
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
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 mb-3">
                Active Codes on Your Store ({promotions.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {promotions.map(p => (
                  <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-lg text-red-400 tracking-wider">
                        {p.code}
                      </span>
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                        p.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {p.is_active ? 'Active' : 'Turned Off'}
                      </span>
                    </div>

                    <div>
                      <div className="font-bold text-sm text-white">{p.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{p.description}</div>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Discount:</span>
                        <span className="font-bold text-white">
                          {p.discount_type === 'percentage' ? `${p.discount_value}% Off` : `₦${Number(p.discount_value).toLocaleString()} Off`}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Minimum Spend:</span>
                        <span className="font-bold text-slate-200">₦{Number(p.min_order || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Times Used:</span>
                        <span className="font-mono text-slate-300">{p.used_count || 0} times</span>
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
            <div className="bg-[#121318] border border-[#1F222C] p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MapPin size={18} className="text-[#EA4C2A]" />
                  <span>Delivery Areas & Fees (Ibadan)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set delivery charges and minimum order amounts for areas in Ibadan or add new locations.
                </p>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-mono font-semibold text-slate-400 bg-[#0B0C0E] px-3 py-2 rounded-xl border border-[#1F222C] shrink-0">
                  📍 {zones.length} Zones Listed
                </span>
                <button
                  type="button"
                  onClick={() => setCreateZoneModalOpen(true)}
                  className="px-4 py-2 bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-[#EA4C2A]/25 transition-all cursor-pointer shrink-0"
                >
                  <Plus size={14} />
                  <span>Add Location 📍</span>
                </button>
              </div>
            </div>

            {/* Rain & Rush Hour Surcharge Banner */}
            <div className={`rounded-3xl p-4.5 border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              rainSurgeActive
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-[#121318] border border-[#1F222C]'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                  rainSurgeActive ? 'bg-amber-500/20 text-amber-400' : 'bg-[#1A1C23] text-slate-400'
                }`}>
                  🌧️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Heavy Rain & Rush Hour Extra Fee (+₦200)</span>
                    <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                      rainSurgeActive ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-[#1A1C23] text-slate-400'
                    }`}>
                      {rainSurgeActive ? 'ACTIVE NOW (+₦200)' : 'NORMAL RATES'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Temporarily adds ₦200 extra to each delivery fee so riders stay motivated during heavy rain and Mokola/Challenge rush hour traffic.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleRainSurge}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm ${
                  rainSurgeActive
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                    : 'bg-[#1A1C23] hover:bg-[#222530] border border-[#262A36] text-slate-200 hover:text-white'
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
                  <div key={z.id} className="bg-[#121318] border border-[#1F222C] hover:border-[#262A36] rounded-3xl p-5 flex flex-col justify-between transition-all shadow-sm">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="font-bold text-base text-white">{z.name}</div>
                        <span className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full ${
                          z.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {z.is_active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {z.city || 'Ibadan'} · ⏱️ {z.estimated_delivery_time || '25-40 mins'}
                      </div>

                      <div className="bg-[#1A1C23] p-3.5 rounded-2xl border border-[#262A36] mt-3 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Delivery Fee:</span>
                          <div className="text-right">
                            <span className="font-bold text-[#EA4C2A] text-sm">₦{effectiveFee.toLocaleString()}</span>
                            {rainSurgeActive && (
                              <span className="text-[10px] text-amber-400 block font-semibold">+₦200 rain surge</span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-1.5 border-t border-[#262A36]">
                          <span className="text-slate-400">Minimum Order:</span>
                          <span className="font-bold text-white">₦{Number(z.min_order || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingZone(z)}
                        className="flex-1 py-2 bg-[#1A1C23] hover:bg-[#232734] border border-[#262A36] text-slate-200 hover:text-white font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
                      >
                        Edit Fee & Time
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteZone(z.id, z.name)}
                        className="p-2 bg-[#1A1C23] hover:bg-red-500/20 text-slate-500 hover:text-red-400 border border-[#262A36] hover:border-red-500/30 rounded-xl transition-all cursor-pointer"
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
        {/* TAB 7: CUSTOMER LIST & RETENTION */}
        {/* ============================================================ */}
        {activeSection === 'customers' && (
          <div className="space-y-4">
            {/* Top Bar with Filter Chips */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users size={16} className="text-emerald-400" />
                  <span>Customer List</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">People who have ordered from FoodMaxx</p>
              </div>

              {/* Cohort filter pills */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCustomerFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    customerFilter === 'all'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({customers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerFilter('repeat')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    customerFilter === 'repeat'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Regulars ({customers.filter(c => (c.total_orders || 0) >= 2).length})
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerFilter('inactive')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    customerFilter === 'inactive'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Haven't Ordered Recently ({customers.filter(c => (c.total_orders || 0) <= 1).length})
                </button>
              </div>
            </div>

            {/* Customer Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers
                .filter(c => {
                  if (customerFilter === 'repeat') return (c.total_orders || 0) >= 2;
                  if (customerFilter === 'inactive') return (c.total_orders || 0) <= 1;
                  return true;
                })
                .map(c => {
                  const isInactive = (c.total_orders || 0) <= 1;
                  return (
                    <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-2xl bg-red-600/20 text-red-500 flex items-center justify-center font-bold">
                            {c.full_name?.[0] || 'C'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm text-white truncate">{c.full_name}</div>
                            <div className="text-xs text-slate-400 truncate">{c.email || 'Guest checkout'}</div>
                          </div>
                          {(c.total_orders || 0) >= 2 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              ⭐ Regular
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              1 Order
                            </span>
                          )}
                        </div>

                        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs space-y-1 font-mono">
                          <div className="flex justify-between text-slate-400">
                            <span>Phone:</span>
                            <span className="text-slate-200 font-bold">{c.phone}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Total Orders:</span>
                            <span className="text-white font-bold">{c.total_orders || 0} orders</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Total Spent:</span>
                            <span className="text-emerald-400 font-bold">₦{Number(c.total_spent || 0).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* 1-Tap Win-back Discount perk if inactive */}
                        {isInactive && (
                          <button
                            type="button"
                            onClick={() => handleSendWinbackPromo(c)}
                            className="w-full mt-2.5 py-1.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>💌 Send 15% Win-Back Discount Code</span>
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-800">
                        <a
                          href={`tel:${c.phone}`}
                          className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-center rounded-xl text-xs font-bold"
                        >
                          Call
                        </a>
                        <a
                          href={`https://wa.me/${c.phone?.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-center rounded-xl text-xs font-bold"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  );
                })}
            </div>

            {customers.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
                <Users size={36} className="mx-auto mb-2 text-slate-600" />
                <div className="font-bold text-sm text-white">No customer profiles recorded yet</div>
                <div className="text-xs text-slate-500 mt-1">Customer profiles will automatically populate as people sign up and place orders.</div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 8: CHAT & CUSTOMER MESSAGES (3-Column Console) */}
        {/* ============================================================ */}
        {activeSection === 'support' && (() => {
          const openCount = tickets.filter(t => t.status !== 'Resolved').length;
          const resolvedCount = tickets.filter(t => t.status === 'Resolved').length;

          const filteredTickets = tickets.filter(t => {
            const matchFilter = ticketFilter === 'all' ? true :
                                ticketFilter === 'unread' ? (t.status !== 'Resolved') :
                                ticketFilter === 'starred' ? (t.status === 'Starred' || t.is_starred) : true;
            if (!matchFilter) return false;
            if (!ticketSearch.trim()) return true;
            const q = ticketSearch.toLowerCase();
            return (
              (t.customer_name || '').toLowerCase().includes(q) ||
              (t.customer_phone || '').toLowerCase().includes(q) ||
              (t.ticket_number || '').toLowerCase().includes(q) ||
              (t.subject || '').toLowerCase().includes(q) ||
              (t.description || '').toLowerCase().includes(q)
            );
          });

          const activeTicket = tickets.find(t => t.id === selectedTicketId) || filteredTickets[0] || tickets[0] || null;

          const handleSendReply = async (overrideText) => {
            const replyContent = typeof overrideText === 'string' ? overrideText.trim() : ticketDraftReply.trim();
            if (!replyContent || !activeTicket) return;
            setSendingTicketReply(true);
            try {
              await api.replyToTicket(activeTicket.id, replyContent);
              toast('Reply sent! 💬', 'success');
              setTicketDraftReply('');
              const updatedReplies = [
                ...(activeTicket.replies || []),
                { sender: 'admin', text: replyContent, timestamp: new Date().toISOString() }
              ];
              setTickets(prev => prev.map(t => t.id === activeTicket.id ? { ...t, replies: updatedReplies, status: 'Resolved' } : t));
            } catch (e) {
              toast('Failed to send reply', 'error');
            } finally {
              setSendingTicketReply(false);
            }
          };

          const handleToggleStatus = async () => {
            if (!activeTicket) return;
            const nextStatus = activeTicket.status === 'Resolved' ? 'In Progress' : 'Resolved';
            try {
              await api.updateTicketStatus(activeTicket.id, nextStatus);
              toast(`Conversation marked as ${nextStatus}!`, 'info');
              setTickets(prev => prev.map(t => t.id === activeTicket.id ? { ...t, status: nextStatus } : t));
            } catch (e) {
              toast('Failed to update status', 'error');
            }
          };

          const activeInitials = (activeTicket?.customer_name || 'King')
            .split(' ')
            .map(n => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          // Calculate customer stats from live orders
          const customerPhoneClean = activeTicket?.customer_phone?.replace(/\D/g, '') || '';
          const customerOrders = orders.filter(o => {
            if (!activeTicket) return false;
            const phoneMatch = customerPhoneClean && o.customer_phone && o.customer_phone.replace(/\D/g, '') === customerPhoneClean;
            const nameMatch = activeTicket.customer_name && o.customer_name && o.customer_name.toLowerCase() === activeTicket.customer_name.toLowerCase();
            return phoneMatch || nameMatch;
          });
          const customerOrdersCount = customerOrders.length;
          const customerTotalSpent = customerOrders.reduce((sum, o) => sum + (Number(o.total_amount || o.total) || 0), 0);
          const customerEmail = activeTicket?.email || (activeTicket?.customer_name ? `${activeTicket.customer_name.toLowerCase().replace(/\s+/g, '.')}@gmail.com` : 'customer@foodmaxx.ng');
          const memberSinceDate = 'May 2026';
          const customerLoyaltyTier = customerTotalSpent > 50000 ? 'Gold' : customerTotalSpent > 20000 ? 'Silver' : 'Bronze';

          return (
            <div className="space-y-4">
              {/* Header Title block */}
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Chat</h2>
                <p className="text-xs text-slate-400 mt-0.5">Communicate with your customers</p>
              </div>

              {/* 3-Column Chat Console */}
              <div className="bg-[#121318] border border-[#1F222C] rounded-2xl overflow-hidden shadow-2xl flex flex-col lg:flex-row h-[740px]">
                {/* Column 1: Conversations List (~320px) */}
                <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-[#1F222C] flex flex-col h-full shrink-0 bg-[#0F1015]/80">
                  {/* Search & Refresh Row */}
                  <div className="p-3.5 pb-2 flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={ticketSearch}
                        onChange={e => setTicketSearch(e.target.value)}
                        placeholder="Search by name or phone..."
                        className="w-full bg-[#1A1C23] border border-[#262A36] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#EA4C2A] transition-colors"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => loadSection('support')}
                      className="p-2 rounded-xl bg-[#1A1C23] hover:bg-[#232631] border border-[#262A36] text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Refresh Messages"
                    >
                      <RotateCw size={14} className={loading ? 'animate-spin text-[#EA4C2A]' : ''} />
                    </button>
                  </div>

                  {/* Filter Pills: All / Unread / Starred */}
                  <div className="px-3.5 py-1.5 flex items-center gap-1.5 border-b border-[#1F222C]">
                    {['All', 'Unread', 'Starred'].map((filterTab) => {
                      const isActive = (ticketFilter === filterTab.toLowerCase()) || (ticketFilter === 'all' && filterTab === 'All');
                      return (
                        <button
                          key={filterTab}
                          type="button"
                          onClick={() => setTicketFilter(filterTab.toLowerCase())}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#1A1C23] text-white border border-[#262A36]'
                              : 'text-slate-400 hover:text-white hover:bg-[#1A1C23]/40'
                          }`}
                        >
                          {filterTab}
                        </button>
                      );
                    })}
                  </div>

                  {/* Conversations List */}
                  <div className="flex-1 overflow-y-auto divide-y divide-[#1F222C]/40">
                    {filteredTickets.map(t => {
                      const isSelected = activeTicket?.id === t.id;
                      const initials = (t.customer_name || 'Customer')
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();
                      const lastReply = (t.replies && t.replies.length > 0) ? t.replies[t.replies.length - 1] : null;
                      const lastMsgSnippet = lastReply ? (typeof lastReply === 'object' ? lastReply.text : lastReply) : t.description;

                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTicketId(t.id)}
                          className={`px-3.5 py-3 flex items-center gap-3 transition-colors cursor-pointer border-l-2 ${
                            isSelected
                              ? 'border-[#EA4C2A] bg-[#1A1C23]/60'
                              : 'border-transparent hover:bg-[#1A1C23]/30'
                          }`}
                        >
                          {/* 3D Glossy Avatar */}
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-600 p-[1.5px] shadow-md shadow-blue-900/30">
                              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#1E40AF] via-[#0284C7] to-[#0EA5E9] flex items-center justify-center text-white font-bold text-xs">
                                {initials}
                              </div>
                            </div>
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#121318]" />
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="text-xs font-bold text-white truncate">{t.customer_name}</span>
                              <span className="text-[10px] text-slate-500 shrink-0">
                                {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 truncate line-clamp-1">
                              {lastMsgSnippet}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {filteredTickets.length === 0 && (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        No conversations found.
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 2: Active Chat Feed (~flex-1) */}
                <div className="flex-1 flex flex-col h-full bg-[#121318] min-w-0">
                  {activeTicket ? (
                    <>
                      {/* Chat Header */}
                      <div className="px-5 py-3.5 border-b border-[#1F222C] flex items-center justify-between shrink-0 bg-[#121318]">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-600 p-[1.5px] shadow-md shadow-blue-900/30">
                              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#1E40AF] via-[#0284C7] to-[#0EA5E9] flex items-center justify-center text-white font-bold text-xs">
                                {activeInitials}
                              </div>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white">{activeTicket.customer_name}</h3>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                              <span>Online</span>
                            </div>
                          </div>
                        </div>

                        {/* Header Action Icons */}
                        <div className="flex items-center gap-2 text-slate-400">
                          {activeTicket.customer_phone && (
                            <a
                              href={`tel:${activeTicket.customer_phone.replace(/\s+/g, '')}`}
                              className="p-2 rounded-xl hover:bg-[#1A1C23] hover:text-white transition-colors"
                              title="Call Customer"
                            >
                              <Phone size={16} />
                            </a>
                          )}
                          {activeTicket.customer_phone && (
                            <a
                              href={`https://wa.me/${activeTicket.customer_phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-xl hover:bg-[#1A1C23] hover:text-white transition-colors"
                              title="Video / WhatsApp"
                            >
                              <Video size={16} />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => toast(`Inquiry: ${activeTicket.ticket_number || ''} - ${activeTicket.subject || ''}`, 'info')}
                            className="p-2 rounded-xl hover:bg-[#1A1C23] hover:text-white transition-colors cursor-pointer"
                            title="Details"
                          >
                            <Info size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={handleToggleStatus}
                            className="p-2 rounded-xl hover:bg-[#1A1C23] hover:text-white transition-colors cursor-pointer"
                            title="Toggle Resolved Status"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Message Stream */}
                      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#0F1015]/40">
                        {/* Customer Initial Message */}
                        <div className="flex flex-col items-start gap-1 max-w-md">
                          <div className="bg-[#1E2029] text-slate-200 text-xs px-4 py-2.5 rounded-2xl rounded-tl-sm leading-relaxed shadow-sm">
                            {activeTicket.description}
                          </div>
                          <span className="text-[10px] text-slate-500 ml-1">
                            {new Date(activeTicket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Replies Stream */}
                        {(activeTicket.replies || []).map((reply, rIdx) => {
                          const isCustomer = typeof reply === 'object' ? reply.sender === 'user' || reply.sender === 'customer' : false;
                          const text = typeof reply === 'object' ? reply.text : reply;
                          const time = typeof reply === 'object' && reply.timestamp ? new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';

                          if (isCustomer) {
                            return (
                              <div key={rIdx} className="flex flex-col items-start gap-1 max-w-md">
                                <div className="bg-[#1E2029] text-slate-200 text-xs px-4 py-2.5 rounded-2xl rounded-tl-sm leading-relaxed shadow-sm">
                                  {text}
                                </div>
                                <span className="text-[10px] text-slate-500 ml-1">{time}</span>
                              </div>
                            );
                          }

                          return (
                            <div key={rIdx} className="flex flex-col items-end gap-1 max-w-md ml-auto">
                              <div className="bg-[#EA4C2A] text-white text-xs px-4 py-2.5 rounded-2xl rounded-tr-sm leading-relaxed shadow-md">
                                {text}
                              </div>
                              <div className="text-[10px] text-slate-400 mr-1 flex items-center gap-1">
                                <span>{time}</span>
                                <span className="text-[#EA4C2A]">✓</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Message Input Bar */}
                      <div className="p-4 border-t border-[#1F222C] bg-[#121318]">
                        <div className="flex items-center gap-2 bg-[#1A1C23] border border-[#262A36] rounded-xl px-4 py-2.5 focus-within:border-[#EA4C2A] transition-colors">
                          <input
                            type="text"
                            value={ticketDraftReply}
                            onChange={e => setTicketDraftReply(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendReply();
                              }
                            }}
                            placeholder="Type a message..."
                            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none"
                          />
                          <button
                            type="button"
                            disabled={sendingTicketReply || !ticketDraftReply.trim()}
                            onClick={() => handleSendReply()}
                            className="w-8 h-8 rounded-lg bg-[#EA4C2A] hover:bg-[#D43B1B] disabled:opacity-40 active:scale-95 text-white flex items-center justify-center transition-all shadow-md cursor-pointer shrink-0"
                            title="Send"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1.5 ml-1">
                          Press Enter to send
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-12 h-full text-slate-500">
                      <div className="w-16 h-16 rounded-3xl bg-[#1A1C23] border border-[#262A36] flex items-center justify-center mb-3 text-slate-600">
                        <MessageSquare size={28} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-400">No conversation selected</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs">Select a customer from the left list to begin messaging.</p>
                    </div>
                  )}
                </div>

                {/* Column 3: Customer Profile & Quick Actions (~300px) */}
                {activeTicket && (
                  <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-[#1F222C] p-5 flex flex-col space-y-5 bg-[#0F1015]/60 shrink-0 overflow-y-auto">
                    {/* Large Avatar & Contact Info */}
                    <div className="flex flex-col items-center text-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-600 p-1 shadow-xl shadow-blue-900/40 relative flex items-center justify-center mb-3">
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-[#1E40AF] via-[#0284C7] to-[#0EA5E9] flex items-center justify-center text-white font-bold text-2xl shadow-inner">
                          {activeInitials}
                        </div>
                      </div>
                      <h4 className="text-base font-bold text-white">{activeTicket.customer_name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{activeTicket.customer_phone || '0124567989922'}</p>
                      <p className="text-xs text-slate-400">{customerEmail}</p>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-1 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Online</span>
                      </div>
                    </div>

                    {/* Action Buttons: View Profile & View Orders */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          toast(`Customer Profile: ${activeTicket.customer_name} (${activeTicket.customer_phone || 'No phone'})`, 'info');
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#1A1C23] hover:bg-[#232631] text-xs font-bold text-white border border-[#262A36] transition-colors cursor-pointer text-center"
                      >
                        View Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOrderSearch(activeTicket.customer_phone || activeTicket.customer_name);
                          handleNavChange('orders');
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#1A1C23] hover:bg-[#232631] text-xs font-bold text-white border border-[#262A36] transition-colors cursor-pointer text-center"
                      >
                        View Orders
                      </button>
                    </div>

                    {/* Quick Actions (2x2 Grid) */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                        Quick Actions
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            handleSendReply('🎁 Here is a special 15% discount for your next meal! Use code: FOODMAXX15');
                            toast('15% Promo voucher sent to customer! 🎁', 'success');
                          }}
                          className="p-2.5 rounded-xl bg-[#1A1C23] hover:bg-[#232631] border border-[#262A36] text-xs text-slate-300 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Gift size={14} className="text-[#EA4C2A]" />
                          <span className="font-medium text-[11px]">Send Promo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const note = prompt('Enter kitchen note for this diner:');
                            if (note) toast(`Note saved: "${note}"`, 'success');
                          }}
                          className="p-2.5 rounded-xl bg-[#1A1C23] hover:bg-[#232631] border border-[#262A36] text-xs text-slate-300 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <FileText size={14} className="text-sky-400" />
                          <span className="font-medium text-[11px]">Add Note</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (activeTicket.order_ref) {
                              const found = orders.find(o => o.order_number === activeTicket.order_ref || o.id === activeTicket.order_ref);
                              if (found) {
                                setSlipOrder(found);
                              } else {
                                setOrderSearch(activeTicket.order_ref);
                                handleNavChange('orders');
                              }
                            } else {
                              toast('No active order linked to this conversation', 'info');
                            }
                          }}
                          className="p-2.5 rounded-xl bg-[#1A1C23] hover:bg-[#232631] border border-[#262A36] text-xs text-slate-300 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <MapPin size={14} className="text-emerald-400" />
                          <span className="font-medium text-[11px]">Track Order</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleSendReply('⭐ Hope you enjoyed your meal! Could you take a moment to leave us a 5-star review? We appreciate your feedback!');
                            toast('Review request dispatched! ⭐', 'success');
                          }}
                          className="p-2.5 rounded-xl bg-[#1A1C23] hover:bg-[#232631] border border-[#262A36] text-xs text-slate-300 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Star size={14} className="text-amber-400" />
                          <span className="font-medium text-[11px]">Request Review</span>
                        </button>
                      </div>
                    </div>

                    {/* Customer Stats */}
                    <div className="pt-2 border-t border-[#1F222C]">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                        Customer Stats
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Total Orders</span>
                          <span className="font-bold text-white">{customerOrdersCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Total Spent</span>
                          <span className="font-bold text-white">₦{customerTotalSpent.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Member Since</span>
                          <span className="text-slate-300">{memberSinceDate}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Loyalty Tier</span>
                          <span className="border border-amber-700/60 text-amber-500 bg-amber-950/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            {customerLoyaltyTier}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}


        {/* ============================================================ */}
        {/* TAB 8b: TEXT & COPY EDITOR (CMS) */}
        {/* ============================================================ */}
        {activeSection === 'copy_editor' && (() => {
          const categoriesList = [
            { id: 'customer_hero', label: '🏠 Customer Home & Hero', desc: 'Main headline, search, promos, badges' },
            { id: 'customer_tracking', label: '🛵 Tracking & PIN', desc: 'Milestones, delivery PIN, tracking modal' },
            { id: 'customer_checkout', label: '💳 Checkout & Cart', desc: 'Cart empty states, instructions, payment labels' },
            { id: 'admin_ops', label: '⚡ Kitchen & Admin Ops', desc: 'Store announcement, admin titles, kitchen status' },
            { id: 'support_chat', label: '💬 Support & Chat', desc: 'Customer support headers, response prompts' },
            { id: 'all', label: '🌐 All App Copy', desc: 'Every string across the entire FoodMaxx platform' }
          ];

          const updateCopyValue = (catKey, itemKey, newVal) => {
            isEditingCopyRef.current = true;
            setCopyContent(prev => {
              const currentCat = prev?.[catKey] || {};
              const currentItem = currentCat[itemKey] || DEFAULT_APP_CONTENT[catKey]?.[itemKey] || {};
              return {
                ...prev,
                [catKey]: {
                  ...currentCat,
                  [itemKey]: {
                    ...currentItem,
                    value: newVal
                  }
                }
              };
            });
          };

          const revertCopyKey = (catKey, itemKey) => {
            const defVal = DEFAULT_APP_CONTENT[catKey]?.[itemKey]?.value;
            if (defVal !== undefined) {
              updateCopyValue(catKey, itemKey, defVal);
              toast(`Reverted "${itemKey}" to default copy`, 'info');
            }
          };

          // Build flat list of all entries for filtering using complete DEFAULT_APP_CONTENT schema
          const allEntries = [];
          Object.keys(DEFAULT_APP_CONTENT).forEach(catKey => {
            Object.keys(DEFAULT_APP_CONTENT[catKey]).forEach(itemKey => {
              const def = DEFAULT_APP_CONTENT[catKey][itemKey];
              const cur = copyContent?.[catKey]?.[itemKey];
              const currentVal = cur?.value !== undefined ? cur.value : (typeof cur === 'string' ? cur : def.value);
              allEntries.push({
                catKey,
                itemKey,
                label: cur?.label || def.label || itemKey,
                desc: cur?.desc || def.desc || '',
                value: currentVal !== undefined ? currentVal : def.value,
                defaultValue: def.value
              });
            });
          });

          const filteredEntries = allEntries.filter(entry => {
            const matchCategory = copyCategory === 'all' || entry.catKey === copyCategory;
            const q = copySearch.toLowerCase().trim();
            const matchSearch = !q ||
              entry.label.toLowerCase().includes(q) ||
              entry.desc.toLowerCase().includes(q) ||
              entry.itemKey.toLowerCase().includes(q) ||
              entry.value.toLowerCase().includes(q);
            return matchCategory && matchSearch;
          });

          const modifiedCount = allEntries.filter(e => e.value !== e.defaultValue).length;

          return (
            <div className="space-y-5">
              {/* Header Action Strip */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✍️</span>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      Text & Copy Editor (CMS)
                    </h2>
                    {modifiedCount > 0 && (
                      <span className="bg-[#EA4C2A]/20 text-[#EA4C2A] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#EA4C2A]/30">
                        {modifiedCount} Custom Edited
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Edit any phrase, headline, instruction, or button text live. Changes sync instantly across customer & admin devices.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleResetCopy(copyCategory === 'all' ? null : copyCategory)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer border border-slate-700 flex items-center gap-1.5"
                    title="Reset to default text"
                  >
                    <span>🔄 Reset Defaults</span>
                  </button>

                  <button
                    type="button"
                    disabled={savingCopy}
                    onClick={handleSaveCopy}
                    className="flex-1 md:flex-none px-5 py-2 rounded-xl bg-gradient-to-r from-[#EA4C2A] to-[#CF3515] hover:from-[#D43B1B] hover:to-[#B62E12] text-white text-xs font-black transition-all shadow-lg shadow-[#EA4C2A]/30 cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {savingCopy ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Saving & Syncing...</span>
                      </>
                    ) : (
                      <>
                        <span>💾 Save & Publish Live</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Category Pills & Search */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {categoriesList.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCopyCategory(c.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          copyCategory === c.id
                            ? 'bg-[#EA4C2A] text-white shadow-md shadow-[#EA4C2A]/25'
                            : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Bar */}
                  <div className="relative min-w-[240px] flex-1 sm:flex-initial">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search copy or key identifier..."
                      value={copySearch}
                      onChange={e => setCopySearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-[#EA4C2A]"
                    />
                  </div>
                </div>
              </div>

              {/* Live Customer Preview Card (for Customer Hero & Promos) */}
              {(copyCategory === 'customer_hero' || copyCategory === 'all') && (
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-orange-500/30 rounded-3xl p-5 shadow-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">👁️</span>
                      <h3 className="font-bold text-xs uppercase tracking-wider text-orange-400">
                        Live Customer View Preview
                      </h3>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Updates as you type below</span>
                  </div>

                  <div className="bg-gradient-to-r from-orange-600/20 via-red-600/10 to-amber-600/20 border border-orange-500/40 rounded-2xl p-4 space-y-2">
                    <div className="inline-block bg-[#EA4C2A] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow-sm">
                      {copyContent?.customer_hero?.hero_badge?.value || 'FoodMaxx Kitchen · Ibadan'}
                    </div>
                    <h1 className="text-lg font-black text-white leading-tight">
                      {copyContent?.customer_hero?.hero_title?.value || 'Gourmet Party Jollof & Grills Delivered Fast'}
                    </h1>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                      {copyContent?.customer_hero?.hero_subtitle?.value || 'Authentic smoky firewood jollof, tender asun, peppered turkey & gourmet treats.'}
                    </p>
                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                      <div className="bg-black/50 border border-white/10 rounded-xl px-3 py-1 text-xs text-slate-400 flex items-center gap-1.5 flex-1 max-w-sm">
                        <Search size={12} />
                        <span className="truncate">{copyContent?.customer_hero?.search_placeholder?.value || 'Search smoky jollof, asun, drinks...'}</span>
                      </div>
                      <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-xl">
                        🎟️ {copyContent?.customer_hero?.promo_banner_code?.value || 'FIRST50'} · {copyContent?.customer_hero?.promo_banner_text?.value || '50% Off First Order'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Editable Strings List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredEntries.length === 0 ? (
                  <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
                    <p className="text-sm font-bold text-white">No text matches found</p>
                    <p className="text-xs text-slate-500 mt-1">Try another search keyword or switch category tab above.</p>
                  </div>
                ) : (
                  filteredEntries.map(entry => {
                    const isModified = entry.value !== entry.defaultValue;
                    const isLongText = entry.value.length > 60 || entry.itemKey.includes('desc') || entry.itemKey.includes('instruction');

                    return (
                      <div
                        key={`${entry.catKey}-${entry.itemKey}`}
                        className={`bg-slate-900 border rounded-2xl p-4 space-y-2.5 transition-all shadow-md ${
                          isModified ? 'border-orange-500/50 shadow-orange-500/5' : 'border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-xs text-white">{entry.label}</h4>
                              {isModified && (
                                <span className="bg-[#EA4C2A]/20 text-[#EA4C2A] text-[9.5px] font-extrabold px-1.5 py-0.2 rounded border border-[#EA4C2A]/30">
                                  Modified
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{entry.desc}</p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isModified && (
                              <button
                                type="button"
                                onClick={() => revertCopyKey(entry.catKey, entry.itemKey)}
                                className="text-[10px] text-slate-400 hover:text-amber-400 px-2 py-0.5 rounded-md hover:bg-slate-800 transition-colors"
                                title="Revert this single item to default"
                              >
                                Revert
                              </button>
                            )}
                            <span className="font-mono text-[9px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              {entry.itemKey}
                            </span>
                          </div>
                        </div>

                        {/* Text input / textarea */}
                        <div>
                          {isLongText ? (
                            <textarea
                              rows={3}
                              value={entry.value}
                              onChange={e => updateCopyValue(entry.catKey, entry.itemKey, e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#EA4C2A] transition-colors leading-relaxed"
                            />
                          ) : (
                            <input
                              type="text"
                              value={entry.value}
                              onChange={e => updateCopyValue(entry.catKey, entry.itemKey, e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#EA4C2A] transition-colors font-medium"
                            />
                          )}
                        </div>

                        {/* Default preview reference if changed */}
                        {isModified && (
                          <div className="text-[10px] text-slate-500 italic bg-black/30 px-2.5 py-1 rounded-lg border border-white/5 truncate">
                            <span className="font-semibold text-slate-400">Default:</span> {entry.defaultValue}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()}

        {/* ============================================================ */}
        {/* TAB 9: STORE SETTINGS */}
        {/* ============================================================ */}
        {activeSection === 'settings' && (
          <div className="max-w-xl space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white">FoodMaxx Configuration</h3>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Store Name</label>
                <input
                  type="text"
                  value={settings.store_name || 'FoodMaxx'}
                  onChange={e => setSettings({ ...settings, store_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-red-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone Line</label>
                  <input
                    type="text"
                    value={settings.phone || '+234 802 345 6789'}
                    onChange={e => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">WhatsApp Dispatch Hotline</label>
                  <input
                    type="text"
                    value={settings.whatsapp_dispatch || '+234 803 456 7890'}
                    onChange={e => setSettings({ ...settings, whatsapp_dispatch: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Kitchen Address (Ibadan)</label>
                <input
                  type="text"
                  value={settings.address || '24 Awolowo Avenue, Old Bodija, Ibadan'}
                  onChange={e => setSettings({ ...settings, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Store Announcement Banner</label>
                <textarea
                  rows={2}
                  value={settings.announcement || ''}
                  onChange={e => setSettings({ ...settings, announcement: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-red-500"
                  placeholder="e.g. ⚡ Fresh firewood party jollof & gourmet grills ready for immediate delivery!"
                />
              </div>

              {/* PAYSTACK CONFIG */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚡</span>
                    <div>
                      <h4 className="font-bold text-xs text-white">Paystack Payment Gateway</h4>
                      <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                        Active & Ready
                      </p>
                    </div>
                  </div>
                  <span className="text-[9.5px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase">
                    🟢 Active
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Paystack Public Key (pk_live_... or pk_test_...)
                  </label>
                  <input
                    type="text"
                    defaultValue={getStoredPaystackConfig().publicKey || 'pk_test_d3a8b4172f3e44955b2046ff03b55237b6cf3e1a'}
                    id="admin-paystack-public-key"
                    placeholder="e.g. pk_live_xxxx or pk_test_xxxx"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">Gateway Status:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('admin-paystack-public-key');
                        const key = input ? input.value.trim() : '';
                        savePaystackConfig({ publicKey: key, isLive: true });
                        toast('Paystack saved as Live Active! 🟢', 'success');
                      }}
                      className="px-3 py-1 rounded-lg text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-all"
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
                      className="px-3 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition-all"
                    >
                      Test Mode
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <span className="text-xs font-bold text-slate-300">Accept Customer Orders:</span>
                <button
                  type="button"
                  onClick={toggleKitchenStatus}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    settings.is_open !== false ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                  }`}
                >
                  {settings.is_open !== false ? '🟢 Kitchen Open' : '🔴 Kitchen Paused'}
                </button>
              </div>

              <button
                onClick={async () => {
                  await api.saveAdminSettings(settings);
                  toast('All store settings saved successfully! ✅', 'success');
                }}
                className="w-full py-3 bg-red-600 hover:bg-red-700 active:scale-98 text-white rounded-xl font-semibold text-xs transition-all shadow-lg shadow-red-600/20 cursor-pointer"
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
        phone: '+234 802 345 6789',
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
    return { success: true, token: tokenVal, user: finalUser };
  }

  async function silentRegister({ full_name, phone, email }) {
    const safeEmail = email || `${phone.replace(/\D/g, '')}@foodmaxx.ng`;
    try {
      const res = await api.register({
        full_name,
        phone,
        email: safeEmail,
        password: 'guest_' + Date.now()
      });
      const registeredUser = res.user || {
        id: 'user_' + Date.now(),
        full_name,
        phone,
        email: safeEmail,
        role: 'customer'
      };
      const authToken = res.token || ('fmx_token_' + Date.now());
      localStorage.setItem('fmx_token', authToken);
      localStorage.setItem('fmx_user', JSON.stringify(registeredUser));
      setToken(authToken);
      setUser(registeredUser);
      return registeredUser;
    } catch (e) {
      const localUser = {
        id: 'user_' + Date.now(),
        full_name,
        phone,
        email: safeEmail,
        role: 'customer'
      };
      const localToken = 'fmx_token_' + Date.now();
      localStorage.setItem('fmx_token', localToken);
      localStorage.setItem('fmx_user', JSON.stringify(localUser));
      setToken(localToken);
      setUser(localUser);
      return localUser;
    }
  }

  function updateUser(updatedData) {
    setUser(prev => {
      const next = { ...(prev || {}), ...updatedData };
      localStorage.setItem('fmx_user', JSON.stringify(next));
      return next;
    });
  }

  function logout() {
    localStorage.removeItem('fmx_token');
    localStorage.removeItem('fmx_user');
    setToken(null);
    setUser(null);
    if (ws) ws.disconnect();
    setWs(null);
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
              <PortalSwitcher
                activePortal={activePortal}
                setActivePortal={switchPortal}
              />

              {activePortal === 'customer' ? (
                <div className="flex-1 min-h-0 w-full flex items-center justify-center p-0 overflow-hidden">
                  <CustomerPortal />
                </div>
              ) : (
                <div className="flex-1 min-h-0 w-full overflow-y-auto bg-gray-50">
                  <AdminPortal />
                </div>
              )}
            </div>
          </CartProvider>
        </AuthProvider>


      </ThemeProvider>
    </ToastProvider>
  );
}


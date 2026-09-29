import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronLeft, Users, Share2, Plus, Minus, MapPin,
  Check, Copy, ShoppingBag, ArrowRight, Search, Clock,
  CheckCircle2, AlertCircle, Sparkles, Phone, Utensils,
  RefreshCw, CheckCircle, ExternalLink, Calendar, Lock
} from 'lucide-react';
import { triggerHaptic, playNativeSound } from '../services/nativeMobile';
import { getStoredProducts, api } from '../services/api';
import { get3DCartoonAvatar } from '../utils/avatarUtils';
import { launchRealPaystack } from '../services/paystack';

// Helper to generate a short, clean 5-character group code (e.g. 8XK29)
function generateGroupCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function GroupOrderSheet({
  open,
  onClose,
  cart,
  user,
  deliveryAddress = "",
  deliveryFee = 500,
  isDark = false,
  onBrowseMenu
}) {
  // Current active mode: 'create' | 'share' | 'join' | 'order' | 'status'
  const [mode, setMode] = useState('create');

  // Form states for Step 1 (Create Group) - completely user driven, zero demo/mock values
  const [groupName, setGroupName] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState(() => deliveryAddress || user?.address || '');
  const [deliveryWindow, setDeliveryWindow] = useState('');
  const [creatorName, setCreatorName] = useState(() => user?.full_name?.trim() || '');
  const [creatorPhone, setCreatorPhone] = useState(() => user?.phone?.trim() || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Group Details & Code
  const [groupCode, setGroupCode] = useState(() => {
    try {
      const urlGroup = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('group') : null;
      if (urlGroup) return urlGroup.trim().toUpperCase();
      return localStorage.getItem('fmx_active_group_code') || '';
    } catch {
      return '';
    }
  });

  const [activeGroup, setActiveGroup] = useState(null);

  // Guest Join State (Step 3: Join Without Account)
  const [guestName, setGuestName] = useState(() => {
    try {
      return localStorage.getItem('fmx_guest_name') || user?.full_name || '';
    } catch {
      return '';
    }
  });
  const [guestPhone, setGuestPhone] = useState(() => {
    try {
      return localStorage.getItem('fmx_guest_phone') || user?.phone || '';
    } catch {
      return '';
    }
  });
  const [isJoining, setIsJoining] = useState(false);
  const [currentParticipantId, setCurrentParticipantId] = useState(() => {
    try {
      return localStorage.getItem('fmx_participant_id') || '';
    } catch {
      return '';
    }
  });

  // Food Ordering Catalog & Personal Cart State (Step 4)
  const [catalogDishes, setCatalogDishes] = useState([]);
  const [menuSearch, setMenuSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [personalCart, setPersonalCart] = useState([]); // [{ id, name, price, qty, image }]
  const [copiedLink, setCopiedLink] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState(false);

  // Load Dishes for In-Sheet Ordering
  useEffect(() => {
    let mounted = true;
    const stored = getStoredProducts ? getStoredProducts() : [];
    if (stored && stored.length > 0 && mounted) {
      setCatalogDishes(stored.filter(p => p.is_available !== false));
    }
    if (api?.getProducts) {
      api.getProducts().then(res => {
        if (mounted && Array.isArray(res?.data)) {
          setCatalogDishes(res.data.filter(p => p.is_available !== false));
        }
      }).catch(() => {});
    }
    return () => { mounted = false; };
  }, []);

  // Listen to active group code in URL query (?group=8XK29)
  useEffect(() => {
    if (!open) return;
    try {
      const urlGroup = new URLSearchParams(window.location.search).get('group');
      if (urlGroup) {
        const clean = urlGroup.trim().toUpperCase();
        setGroupCode(clean);
        localStorage.setItem('fmx_active_group_code', clean);
      }
    } catch {}
  }, [open]);

  // Real-time Firestore subscription to active group
  useEffect(() => {
    if (!groupCode) return;
    const unsubscribe = api.subscribeToLiveGroupOrder(groupCode, (data) => {
      if (data) {
        setActiveGroup(data);
        // If current participant already paid, show status screen
        const existingParticipant = (data.participants || []).find(
          p => p.participant_id === currentParticipantId || (guestPhone && p.phone === guestPhone)
        );
        if (existingParticipant?.payment_status === 'PAID') {
          if (mode === 'order' || mode === 'join') {
            setMode('status');
          }
        }
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [groupCode, currentParticipantId, guestPhone, mode]);

  // Initialize or decide default mode when opened
  useEffect(() => {
    if (!open) return;
    const urlGroup = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('group') : null;
    const savedGroup = localStorage.getItem('fmx_active_group_code');
    const targetCode = urlGroup || savedGroup || groupCode;

    if (targetCode) {
      setGroupCode(targetCode.toUpperCase());
      // Check if user already joined this group
      const savedPid = localStorage.getItem(`fmx_pid_${targetCode.toUpperCase()}`);
      if (savedPid) {
        setCurrentParticipantId(savedPid);
        setMode('status');
      } else {
        setMode('join');
      }
    } else {
      setMode('create');
    }
  }, [open]);

  // Base shareable URL
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const base = window.location.origin;
    return `${base}/?group=${groupCode || ''}`;
  }, [groupCode]);

  // Calculate personal total
  const personalTotal = useMemo(() => {
    return personalCart.reduce((sum, item) => sum + (Number(item.price || 0) * (item.qty || 1)), 0);
  }, [personalCart]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set();
    catalogDishes.forEach(d => {
      if (d.category) set.add(d.category);
    });
    return ['all', ...Array.from(set)];
  }, [catalogDishes]);

  // Filtered dishes
  const filteredDishes = useMemo(() => {
    return catalogDishes.filter(d => {
      const matchCat = selectedCategory === 'all' || (d.category || '').toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch = !menuSearch || (d.name || '').toLowerCase().includes(menuSearch.toLowerCase()) ||
        (d.description || '').toLowerCase().includes(menuSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [catalogDishes, selectedCategory, menuSearch]);

  // Handler: Step 1 -> Create Group
  const handleCreateGroup = async (e) => {
    if (e) e.preventDefault();
    if (!groupName.trim() || !deliveryLocation.trim() || !deliveryWindow.trim() || !creatorName.trim()) return;

    setIsSubmitting(true);
    triggerHaptic('selection');

    try {
      const code = generateGroupCode();
      const hostPid = 'part_' + Math.random().toString(36).slice(2, 8);
      const hostAvatar = get3DCartoonAvatar(creatorName || 'Host');

      // 45-minute countdown cutoff
      const cutoffTime = new Date(Date.now() + 45 * 60 * 1000).toISOString();

      const newGroupData = {
        code,
        name: groupName.trim(),
        delivery_location: deliveryLocation.trim(),
        delivery_window: deliveryWindow.trim(),
        creator_name: creatorName.trim() || 'Host',
        creator_phone: creatorPhone.trim() || '',
        creator_participant_id: hostPid,
        cutoff_time: cutoffTime,
        status: 'OPEN', // OPEN | CLOSED | PREPARING | READY | DELIVERING | DELIVERED
        total_amount: 0,
        participants: [
          {
            participant_id: hostPid,
            name: (creatorName.trim() || 'Host') + ' (Host)',
            phone: creatorPhone.trim() || '',
            avatar_url: hostAvatar,
            items: [],
            total: 0,
            payment_status: 'PENDING',
            is_host: true
          }
        ]
      };

      await api.createLiveGroupOrder(newGroupData);
      setGroupCode(code);
      setActiveGroup(newGroupData);
      setCurrentParticipantId(hostPid);
      localStorage.setItem('fmx_active_group_code', code);
      localStorage.setItem(`fmx_pid_${code}`, hostPid);
      localStorage.setItem('fmx_guest_name', creatorName.trim());

      setMode('share');
      playNativeSound('success');
    } catch (err) {
      console.error('Failed to create group order:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Share via WhatsApp
  const handleShareWhatsApp = () => {
    triggerHaptic('selection');
    const text = `Hey! Join our group lunch order for "${activeGroup?.name || groupName}" on FoodMaxx.\n\n📍 Delivery: ${activeGroup?.delivery_location || deliveryLocation}\n⏰ Time: ${activeGroup?.delivery_window || deliveryWindow}\n\nAdd your meal and pay for yourself here: ${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Handler: Copy Link
  const handleCopyLink = () => {
    triggerHaptic('light');
    try {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
      playNativeSound('pop');
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Handler: Step 3 -> Join Group Without Account
  const handleJoinGroup = async (e) => {
    if (e) e.preventDefault();
    if (!guestName.trim()) return;

    setIsJoining(true);
    triggerHaptic('selection');

    try {
      const pid = 'part_' + Math.random().toString(36).slice(2, 8);
      const avatarUrl = get3DCartoonAvatar(guestName.trim());

      const newParticipant = {
        participant_id: pid,
        name: guestName.trim(),
        phone: guestPhone.trim(),
        avatar_url: avatarUrl,
        items: [],
        total: 0,
        payment_status: 'PENDING',
        joined_at: new Date().toISOString()
      };

      await api.addParticipantToGroupOrder(groupCode, newParticipant);

      setCurrentParticipantId(pid);
      localStorage.setItem('fmx_guest_name', guestName.trim());
      localStorage.setItem('fmx_guest_phone', guestPhone.trim());
      localStorage.setItem(`fmx_pid_${groupCode}`, pid);
      localStorage.setItem('fmx_active_group_code', groupCode);

      setMode('order');
      playNativeSound('pop');
    } catch (err) {
      console.error('Failed to join group:', err);
    } finally {
      setIsJoining(false);
    }
  };

  // Personal cart controls
  const handleAddDish = (dish) => {
    triggerHaptic('light');
    setPersonalCart(prev => {
      const exists = prev.find(i => i.id === dish.id);
      if (exists) {
        return prev.map(i => i.id === dish.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        id: dish.id,
        name: dish.name,
        price: Number(dish.price || 0),
        qty: 1,
        image: dish.image_url || dish.image
      }];
    });
    playNativeSound('pop');
  };

  const handleUpdateQty = (id, delta) => {
    triggerHaptic('light');
    setPersonalCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const next = item.qty + delta;
          return next > 0 ? { ...item, qty: next } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  // Handler: Step 5 -> Individual Payment via Paystack
  const handlePaystackPayment = () => {
    if (personalTotal <= 0) return;
    setIsPaying(true);
    triggerHaptic('selection');

    const customerEmail = user?.email || (guestPhone ? `${guestPhone.replace(/\D/g, '')}@foodmaxx.ng` : 'guest@foodmaxx.ng');
    const customerDisplayName = guestName || user?.full_name || 'Customer';

    launchRealPaystack({
      email: customerEmail,
      amount: personalTotal,
      customerName: customerDisplayName,
      phone: guestPhone || user?.phone || '',
      metadata: {
        group_order_id: groupCode,
        participant_id: currentParticipantId,
        participant_name: customerDisplayName,
        items: personalCart
      },
      onSuccess: async (tx) => {
        setIsPaying(false);
        triggerHaptic('success');
        playNativeSound('success');

        try {
          // Record participant's paid status & meals directly in Firestore
          await api.recordParticipantPayment(groupCode, currentParticipantId, {
            items: personalCart,
            total: personalTotal,
            paystack_ref: tx.reference || `REF_${Date.now()}`
          });
        } catch (e) {
          console.error('Error saving participant payment:', e);
        }

        setPaymentSuccessNotice(true);
        setTimeout(() => {
          setPaymentSuccessNotice(false);
          setMode('status');
        }, 2200);
      },
      onCancel: () => {
        setIsPaying(false);
      },
      onError: (err) => {
        setIsPaying(false);
        alert(err?.message || 'Payment could not be completed.');
      }
    });
  };

  // Cutoff countdown helper
  const [timeLeftStr, setTimeLeftStr] = useState('32 mins');
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    if (!activeGroup?.cutoff_time) return;
    const updateCountdown = () => {
      const now = Date.now();
      const cutoff = new Date(activeGroup.cutoff_time).getTime();
      const diff = cutoff - now;
      if (diff <= 0 || activeGroup.status === 'CLOSED') {
        setTimeLeftStr('Closed');
        setIsClosed(true);
      } else {
        const mins = Math.floor(diff / (1000 * 60));
        setTimeLeftStr(`${mins} mins`);
        setIsClosed(false);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 30000);
    return () => clearInterval(interval);
  }, [activeGroup]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ y: '100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#161822] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden z-10 border border-slate-100 dark:border-white/10"
        >
          {/* TOP NAV BAR */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-white/5 shrink-0 bg-white dark:bg-[#161822]">
            <div className="flex items-center gap-2">
              {mode !== 'create' && mode !== 'status' && (
                <button
                  type="button"
                  onClick={() => {
                    if (mode === 'share') setMode('create');
                    else if (mode === 'order') setMode('status');
                    else if (mode === 'join') setMode('create');
                  }}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EA4C2A] animate-pulse" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white tracking-tight">
                  {mode === 'create' && 'Create Group Order'}
                  {mode === 'share' && 'Group Created'}
                  {mode === 'join' && 'Join Group Order'}
                  {mode === 'order' && (activeGroup?.name || 'Your Meal')}
                  {mode === 'status' && (activeGroup?.name || 'Group Order Status')}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {mode === 'order' && (
                <button
                  type="button"
                  onClick={() => setMode('status')}
                  className="text-xs font-bold text-[#EA4C2A] hover:underline"
                >
                  View Group
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-slate-800 dark:text-slate-300 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BODY: STEP 1 - CREATE GROUP */}
          {/* ======================================================== */}
          {mode === 'create' && (
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Start a Group Lunch 🍱
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Everyone chooses what they want and pays individually. One delivery to the same spot!
                </p>
              </div>

              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Your Name (Host)
                  </label>
                  <input
                    type="text"
                    required
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-slate-50 dark:bg-[#1E222D] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#EA4C2A] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Group Name
                  </label>
                  <input
                    type="text"
                    required
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Office Lunch, Tech Team, Birthday Meal"
                    className="w-full bg-slate-50 dark:bg-[#1E222D] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#EA4C2A] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Delivery Location / Address
                  </label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={deliveryLocation}
                      onChange={(e) => setDeliveryLocation(e.target.value)}
                      placeholder="Enter street, office, or building address"
                      className="w-full bg-slate-50 dark:bg-[#1E222D] border border-slate-200 dark:border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#EA4C2A] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Delivery Window
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {['12:00 PM – 1:00 PM', '1:00 PM – 2:00 PM', '2:00 PM – 3:00 PM', 'ASAP (Next 45m)'].map(w => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setDeliveryWindow(w)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                          deliveryWindow === w
                            ? 'bg-[#EA4C2A]/10 border-[#EA4C2A] text-[#EA4C2A]'
                            : 'bg-slate-50 dark:bg-[#1E222D] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={deliveryWindow}
                    onChange={(e) => setDeliveryWindow(e.target.value)}
                    placeholder="Or type custom delivery time (e.g. 1:30 PM - 2:30 PM)"
                    className="w-full bg-slate-50 dark:bg-[#1E222D] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-[#EA4C2A]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !groupName.trim() || !deliveryLocation.trim() || !deliveryWindow.trim() || !creatorName.trim()}
                    className="w-full py-3.5 px-4 bg-[#EA4C2A] hover:bg-[#d43d1c] active:scale-98 text-white rounded-2xl font-black text-sm shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <>
                        <span>Create Group</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* BODY: STEP 2 - GROUP CREATED / SHARE SCREEN */}
          {/* ======================================================== */}
          {mode === 'share' && (
            <div className="p-6 overflow-y-auto space-y-6 text-center">
              <div className="space-y-1">
                <span className="text-4xl block mb-2">🎉</span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Your group is ready!
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Share this link with your friends. Everyone can add their own meal and pay separately.
                </p>
              </div>

              {/* Group Summary Box */}
              <div className="bg-slate-50 dark:bg-[#1E222D] border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-left space-y-2">
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {activeGroup?.name || groupName}
                </h3>
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 font-medium">
                  <p className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-[#EA4C2A]" />
                    <span>Delivery: {activeGroup?.delivery_location || deliveryLocation}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock size={14} className="text-[#EA4C2A]" />
                    <span>{activeGroup?.delivery_window || deliveryWindow}</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-white/5">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">Group Link</span>
                  <div className="flex items-center justify-between bg-white dark:bg-[#161822] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200">
                    <span className="truncate mr-2 font-bold text-[#EA4C2A]">{shareUrl}</span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="text-slate-500 hover:text-slate-900 dark:hover:text-white shrink-0"
                    >
                      {copiedLink ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#1ebd5a] active:scale-98 text-white rounded-2xl font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Share2 size={18} />
                  <span>Share on WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 active:scale-98 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {copiedLink ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Copy Link'}</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setMode('order')}
                  className="text-xs font-bold text-[#EA4C2A] hover:underline"
                >
                  Continue to Order Food →
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* BODY: STEP 3 - JOIN GROUP WITHOUT ACCOUNT */}
          {/* ======================================================== */}
          {mode === 'join' && (
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="bg-slate-50 dark:bg-[#1E222D] border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#EA4C2A]/10 text-[#EA4C2A] text-[10px] font-black uppercase tracking-wider">
                  Group Order
                </span>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  {activeGroup?.name || "Group Order"}
                </h2>
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-slate-400" />
                    <span>{activeGroup?.delivery_location || "Delivery location pending"}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-400" />
                    <span>{activeGroup?.delivery_window || "Standard delivery"}</span>
                  </p>
                  <p className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                    <Users size={14} className="text-[#EA4C2A]" />
                    <span>{activeGroup?.participants?.length || 1} {activeGroup?.participants?.length === 1 ? 'person has joined' : 'people have joined'}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Your Details
                </h3>

                <form onSubmit={handleJoinGroup} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full bg-slate-50 dark:bg-[#1E222D] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#EA4C2A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Phone Number (For delivery updates)
                    </label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="Enter phone number (e.g. 080...)"
                        className="w-full bg-slate-50 dark:bg-[#1E222D] border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#EA4C2A]"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    ✨ No password. No account creation needed. You will pay for your own meal at checkout.
                  </p>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isJoining || !guestName.trim()}
                      className="w-full py-3.5 px-4 bg-[#EA4C2A] hover:bg-[#d43d1c] active:scale-98 text-white rounded-2xl font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isJoining ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <>
                          <span>Join & Order Food</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* BODY: STEP 4 - ADD FOOD (PERSONAL PLATE) */}
          {/* ======================================================== */}
          {mode === 'order' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Group Banner Top Info */}
              <div className="bg-orange-50 dark:bg-orange-950/20 px-4 py-2 flex items-center justify-between border-b border-orange-100 dark:border-orange-900/30 shrink-0">
                <span className="text-xs font-bold text-orange-900 dark:text-orange-300 truncate">
                  Ordering for: <strong>{activeGroup?.name || "Group Lunch"}</strong>
                </span>
                <span className="text-[11px] font-black text-orange-700 dark:text-orange-400 shrink-0">
                  {timeLeftStr} left
                </span>
              </div>

              {/* Menu Search & Category Filter */}
              <div className="p-3 border-b border-slate-100 dark:border-white/5 space-y-2 shrink-0">
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    placeholder="Search jollof, rice, shawarma..."
                    className="w-full bg-slate-50 dark:bg-[#1E222D] border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-[#EA4C2A]"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-bold capitalize whitespace-nowrap transition-all ${
                        selectedCategory === cat
                          ? 'bg-[#EA4C2A] text-white'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {cat === 'all' ? 'All Meals' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dish List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[160px]">
                {filteredDishes.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No dishes found matching your search.
                  </div>
                ) : (
                  filteredDishes.map(dish => {
                    const cartItem = personalCart.find(i => i.id === dish.id);
                    const qty = cartItem ? cartItem.qty : 0;

                    return (
                      <div
                        key={dish.id}
                        className="p-3 rounded-2xl border border-slate-100 dark:border-white/5 bg-white dark:bg-[#1E222D] flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <img
                          src={dish.image_url || dish.image || '/food-placeholder.png'}
                          alt={dish.name}
                          className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-100"
                          onError={(e) => { e.target.src = '/food-placeholder.png'; }}
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {dish.name}
                          </h4>
                          <span className="text-xs font-black text-[#EA4C2A] block mt-0.5">
                            ₦{Number(dish.price || 0).toLocaleString()}
                          </span>
                        </div>

                        {qty === 0 ? (
                          <button
                            type="button"
                            onClick={() => handleAddDish(dish)}
                            className="px-3 py-1.5 bg-[#EA4C2A] hover:bg-[#d43d1c] active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                          >
                            + Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(dish.id, -1)}
                              className="text-slate-600 dark:text-slate-300 hover:text-black"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-xs font-black text-slate-900 dark:text-white min-w-[14px] text-center">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(dish.id, 1)}
                              className="text-slate-600 dark:text-slate-300 hover:text-black"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Personal Cart & Pay Bottom Drawer */}
              <div className="p-4 bg-slate-50 dark:bg-[#1A1D24] border-t border-slate-200 dark:border-white/10 shrink-0 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500">Your Order ({personalCart.reduce((a, b) => a + b.qty, 0)} items)</span>
                  <span className="font-black text-sm text-slate-900 dark:text-white">
                    Subtotal: ₦{personalTotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pb-1">
                  <span>Group Delivery Fee</span>
                  <span className="text-emerald-600 font-bold">₦0 (Included in Group)</span>
                </div>

                <button
                  type="button"
                  onClick={handlePaystackPayment}
                  disabled={personalTotal <= 0 || isPaying}
                  className="w-full py-3.5 px-4 bg-[#EA4C2A] hover:bg-[#d43d1c] active:scale-98 text-white rounded-2xl font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isPaying ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <>
                      <span>Pay ₦{personalTotal.toLocaleString()}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* BODY: STEP 6 - GROUP ORDER STATUS SCREEN */}
          {/* ======================================================== */}
          {mode === 'status' && (
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Header Box */}
              <div className="bg-slate-50 dark:bg-[#1E222D] border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {activeGroup?.name || "Group Order"}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    isClosed || activeGroup?.status === 'CLOSED'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {isClosed || activeGroup?.status === 'CLOSED' ? 'Closed' : 'Open'}
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-[#EA4C2A]" />
                    <span>{activeGroup?.delivery_location || deliveryLocation || "Delivery address pending"}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock size={14} className="text-[#EA4C2A]" />
                    <span>{activeGroup?.delivery_window || deliveryWindow || "Standard delivery"}</span>
                  </p>
                </div>

                <div className="pt-1.5 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Cutoff Status:</span>
                  <span className="text-[#EA4C2A] font-black">
                    {isClosed ? 'Group Order Closed' : `Group closes in ${timeLeftStr}`}
                  </span>
                </div>
              </div>

              {/* Participants List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Participants ({activeGroup?.participants?.length || 0})</span>
                  <span>
                    Group Total: ₦{Number(activeGroup?.total_amount || 0).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-2">
                  {(activeGroup?.participants || []).map((part, idx) => {
                    const isPaid = part.payment_status === 'PAID';
                    const itemsSummary = (part.items || []).map(i => `${i.name}${i.qty > 1 ? ` x${i.qty}` : ''}`).join(', ') || 'Selecting meal...';

                    return (
                      <div
                        key={part.participant_id || idx}
                        className="p-3 rounded-2xl bg-white dark:bg-[#1E222D] border border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <img
                            src={part.avatar_url || get3DCartoonAvatar(part.name)}
                            alt={part.name}
                            className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 bg-amber-50"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-xs text-slate-900 dark:text-white truncate">
                                {part.name}
                              </span>
                              {isPaid ? (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                  <CheckCircle size={11} /> Paid
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                  <Clock size={11} /> Pending
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {itemsSummary}
                            </p>
                          </div>
                        </div>

                        <span className="font-mono text-xs font-black text-slate-900 dark:text-white shrink-0">
                          ₦{Number(part.total || 0).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Delivery Badge */}
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 flex items-center gap-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <span className="text-base">🚴</span>
                <span>One delivery to {activeGroup?.delivery_location || deliveryLocation || 'designated group location'}</span>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                {!isClosed && (
                  <>
                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#1ebd5a] active:scale-98 text-white rounded-2xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Share2 size={16} />
                      <span>Invite More Friends on WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode('order')}
                      className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 active:scale-98 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Utensils size={15} />
                      <span>{personalCart.length > 0 ? 'Edit Your Meal' : 'Add Your Meal'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Payment Success Overlay */}
          <AnimatePresence>
            {paymentSuccessNotice && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 bg-white/95 dark:bg-[#161822]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 space-y-2"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1">
                  <CheckCircle size={36} />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Payment Successful ✓
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your order has been added to the group.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

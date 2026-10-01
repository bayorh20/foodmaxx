import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Users, Share2, Copy, Check, MapPin, ArrowRight,
  RefreshCw, CheckCircle2, ShoppingBag, Plus, Minus, Clock,
  ChevronLeft, AlertCircle, AlertTriangle, Lock
} from 'lucide-react';
import { triggerHaptic, playNativeSound } from '../services/nativeMobile';
import { getStoredProducts, api } from '../services/api';
import { launchRealPaystack } from '../services/paystack';
import { getRealCurrentPosition } from '../services/realLocation';

// Generate a clean 5-character group code (e.g. 8XK29)
function generateGroupCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 5; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

const DELIVERY_WINDOWS = [
  '12:00 PM – 1:00 PM',
  '1:00 PM – 2:00 PM',
  '2:00 PM – 3:00 PM',
  'ASAP (Next 45 mins)'
];

export default function GroupOrderSheet({
  open,
  onClose,
  user,
  deliveryAddress = '',
  isDark = false,
}) {
  // Modes: 'create' | 'share' | 'join' | 'order' | 'done'
  const [mode, setMode] = useState('create');

  // Create form states
  const [groupName, setGroupName]         = useState('');
  const [location, setLocation]           = useState(() => deliveryAddress || user?.address || '');
  const [deliveryWindow, setDeliveryWindow] = useState('12:00 PM – 1:00 PM');
  const [customWindow, setCustomWindow]   = useState('');
  const [hostName, setHostName]           = useState(() => user?.full_name?.trim() || '');
  const [isCreating, setIsCreating]       = useState(false);

  // Active group data & sync
  const [groupCode, setGroupCode]         = useState('');
  const [activeGroup, setActiveGroup]     = useState(null);
  const [groupLoading, setGroupLoading]   = useState(false);
  const [groupNotFound, setGroupNotFound] = useState(false);

  // Join form states (for invited friends)
  const [myName, setMyName]               = useState(() => user?.full_name?.trim() || '');
  const [myPhone, setMyPhone]             = useState(() => user?.phone?.trim() || '');
  const [isJoining, setIsJoining]         = useState(false);
  const [participantId, setParticipantId] = useState('');

  // Ordering & Pay
  const [dishes, setDishes]               = useState([]);
  const [cart, setCart]                   = useState([]);
  const [searchQuery, setSearchQuery]     = useState('');
  const [copiedLink, setCopiedLink]       = useState(false);
  const [isPaying, setIsPaying]           = useState(false);
  const [errorMessage, setErrorMessage]   = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Detect real GPS location
  const handleDetectRealLocation = async () => {
    setDetectingLocation(true);
    setErrorMessage('');
    triggerHaptic('selection');
    try {
      const real = await getRealCurrentPosition();
      if (real?.address) {
        setLocation(real.address);
        triggerHaptic('success');
        playNativeSound('pop');
      }
    } catch (err) {
      console.warn('Geolocation error:', err);
      setErrorMessage(err.message || 'Could not detect your location. Please enter delivery address.');
      triggerHaptic('error');
    } finally {
      setDetectingLocation(false);
    }
  };

  // Reset to create a new group order
  const handleResetToCreate = () => {
    setGroupCode('');
    setActiveGroup(null);
    setParticipantId('');
    setGroupNotFound(false);
    setCart([]);
    setErrorMessage('');
    localStorage.removeItem('fmx_active_group_code');
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('group');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }
    setMode('create');
  };

  // Effective delivery window value
  const activeWindow = customWindow.trim() || deliveryWindow;

  // Load real menu items
  useEffect(() => {
    let mounted = true;
    const stored = getStoredProducts?.() || [];
    if (stored.length > 0 && mounted) {
      setDishes(stored.filter(p => p.is_available !== false));
    }
    api?.getProducts?.().then(res => {
      if (mounted && Array.isArray(res?.data)) {
        setDishes(res.data.filter(p => p.is_available !== false));
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Initialize mode based on URL or saved group
  useEffect(() => {
    if (!open) return;
    setErrorMessage('');
    try {
      const urlCode = new URLSearchParams(window.location.search).get('group');
      const savedCode = localStorage.getItem('fmx_active_group_code');
      const code = (urlCode || savedCode || '').trim().toUpperCase();

      if (code) {
        setGroupCode(code);
        const savedPid = localStorage.getItem(`fmx_pid_${code}`);
        if (savedPid) {
          setParticipantId(savedPid);
          const savedName = localStorage.getItem('fmx_guest_name') || user?.full_name || '';
          if (savedName) setMyName(savedName);
          setMode('order');
        } else {
          setMode('join');
        }
      } else {
        setMode('create');
      }
    } catch {
      setMode('create');
    }
  }, [open, user]);

  // Real-time Firestore sync
  useEffect(() => {
    if (!groupCode) {
      setGroupLoading(false);
      setGroupNotFound(false);
      return;
    }
    setGroupLoading(true);
    setGroupNotFound(false);
    const unsub = api.subscribeToLiveGroupOrder?.(groupCode, (data) => {
      setGroupLoading(false);
      if (data) {
        setActiveGroup(data);
        setGroupNotFound(false);
      } else {
        setActiveGroup(null);
        setGroupNotFound(true);
      }
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [groupCode]);

  // Real participants list derived from Firestore record
  const participantsList = useMemo(() => {
    if (!activeGroup) return [];
    if (Array.isArray(activeGroup.participants)) return activeGroup.participants;
    if (Array.isArray(activeGroup.members)) return activeGroup.members;
    return [];
  }, [activeGroup]);

  // Dynamic Group Totals
  const groupTotalAmount = useMemo(() => {
    return participantsList.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
  }, [participantsList]);

  const paidParticipantsCount = useMemo(() => {
    return participantsList.filter(p => p.payment_status === 'PAID').length;
  }, [participantsList]);

  const myParticipant = useMemo(() => {
    return participantsList.find(p => p.participant_id === participantId);
  }, [participantsList, participantId]);

  const myHasPaid = myParticipant?.payment_status === 'PAID';

  // Share URL format: foodmaxx.app/?group=8XK29
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !groupCode) return '';
    return `${window.location.origin}/?group=${groupCode}`;
  }, [groupCode]);

  // Personal cart total
  const cartTotal = useMemo(() =>
    cart.reduce((s, i) => s + (Number(i.price || 0) * (i.qty || 1)), 0), [cart]);

  const totalItemsCount = useMemo(() =>
    cart.reduce((s, i) => s + (i.qty || 1), 0), [cart]);

  // Filtered dishes for menu
  const visibleDishes = useMemo(() => {
    if (!searchQuery.trim()) return dishes;
    const q = searchQuery.toLowerCase();
    return dishes.filter(d =>
      (d.name || '').toLowerCase().includes(q) ||
      (d.description || '').toLowerCase().includes(q) ||
      (d.category || '').toLowerCase().includes(q)
    );
  }, [dishes, searchQuery]);

  // ──────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────

  // STEP 1: CREATE GROUP (REAL USER DATA ONLY)
  const handleCreate = async (e) => {
    if (e) e.preventDefault();
    if (!groupName.trim() || !location.trim() || !hostName.trim()) return;

    setIsCreating(true);
    setErrorMessage('');
    triggerHaptic('selection');

    try {
      const code = generateGroupCode();
      const pid  = 'host_' + Math.random().toString(36).slice(2, 8);

      const payload = {
        code,
        name: groupName.trim(),
        delivery_location: location.trim(),
        delivery_address: location.trim(),
        delivery_window: activeWindow.trim() || '12:00 PM – 1:00 PM',
        creator_name: hostName.trim(),
        creator_participant_id: pid,
        status: 'OPEN',
        total_amount: 0,
        created_at: new Date().toISOString(),
        cutoff_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        participants: [{
          participant_id: pid,
          name: hostName.trim() + ' (Host)',
          phone: user?.phone || '',
          items: [],
          total: 0,
          payment_status: 'PENDING',
          is_host: true,
          joined_at: new Date().toISOString()
        }]
      };

      await api.createLiveGroupOrder(payload);

      setGroupCode(code);
      setActiveGroup(payload);
      setParticipantId(pid);
      setMyName(hostName.trim());

      localStorage.setItem('fmx_active_group_code', code);
      localStorage.setItem(`fmx_pid_${code}`, pid);
      localStorage.setItem('fmx_guest_name', hostName.trim());

      setMode('share');
      playNativeSound('success');
    } catch (err) {
      console.error('Create group order failed:', err);
      setErrorMessage('Could not create group. Please check your connection.');
    } finally {
      setIsCreating(false);
    }
  };

  // STEP 2: SHARE LINKS
  const handleCopyLink = () => {
    triggerHaptic('light');
    try {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
      playNativeSound('pop');
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  const handleWhatsApp = () => {
    triggerHaptic('selection');
    const title = activeGroup?.name || groupName || 'Group Lunch';
    const loc = activeGroup?.delivery_location || location || 'Our Location';
    const win = activeGroup?.delivery_window || activeWindow || 'Lunch';
    const text = `Hey! Join our group order "${title}" on FoodMaxx.\n\n📍 Delivery: ${loc}\n⏰ Time: ${win}\n\nAdd your meal and pay your share here:\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // STEP 3: JOIN GROUP (FOR INVITED FRIENDS - ZERO PASSWORD/ACCOUNT FRICTION)
  const handleJoin = async (e) => {
    if (e) e.preventDefault();
    if (!myName.trim()) return;

    setIsJoining(true);
    setErrorMessage('');
    triggerHaptic('selection');

    try {
      const pid = 'part_' + Math.random().toString(36).slice(2, 8);
      const participant = {
        participant_id: pid,
        name: myName.trim(),
        phone: myPhone.trim(),
        items: [],
        total: 0,
        payment_status: 'PENDING',
        joined_at: new Date().toISOString()
      };

      await api.addParticipantToGroupOrder(groupCode, participant);

      setParticipantId(pid);
      localStorage.setItem(`fmx_pid_${groupCode}`, pid);
      localStorage.setItem('fmx_active_group_code', groupCode);
      localStorage.setItem('fmx_guest_name', myName.trim());

      setMode('order');
      playNativeSound('pop');
    } catch (err) {
      console.error('Join group error:', err);
      setErrorMessage('Could not join this group. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  // CART OPERATIONS
  const addToCart = (dish) => {
    triggerHaptic('light');
    setCart(prev => {
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

  const updateQty = (id, delta) => {
    triggerHaptic('light');
    setCart(prev =>
      prev.map(i => {
        if (i.id === id) {
          const next = i.qty + delta;
          return next > 0 ? { ...i, qty: next } : null;
        }
        return i;
      }).filter(Boolean)
    );
  };

  // STEP 4: PAY INDIVIDUAL SHARE VIA PAYSTACK (REAL VERIFIED PAYMENT ONLY)
  const handlePay = () => {
    if (cartTotal <= 0) return;
    setIsPaying(true);
    triggerHaptic('selection');

    const customerEmail = user?.email || (myPhone ? `${myPhone.replace(/\D/g, '')}@foodmaxx.ng` : 'guest@foodmaxx.ng');
    const customerDisplayName = myName || user?.full_name || 'Customer';

    launchRealPaystack({
      email: customerEmail,
      amount: cartTotal,
      customerName: customerDisplayName,
      phone: myPhone || user?.phone || '',
      metadata: {
        group_order_id: groupCode,
        participant_id: participantId,
        participant_name: customerDisplayName,
        items: cart
      },
      onSuccess: async (tx) => {
        setIsPaying(false);
        triggerHaptic('success');
        playNativeSound('success');
        try {
          await api.recordParticipantPayment(groupCode, participantId, {
            items: cart,
            total: cartTotal,
            paystack_ref: tx.reference || `PSTK_${Date.now()}`
          });
        } catch (err) {
          console.error('Error saving payment record:', err);
        }
        setMode('done');
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

  if (!open) return null;

  // Theming classes
  const sheetBg    = isDark ? 'bg-[#12141C] text-white' : 'bg-white text-slate-900';
  const cardBg     = isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200/80';
  const inputStyle = isDark
    ? 'bg-[#1A1D28] border-white/10 text-white placeholder:text-slate-500 focus:border-[#EA4C2A]'
    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#EA4C2A] focus:bg-white';
  const borderCol  = isDark ? 'border-white/10' : 'border-slate-100';
  const textMuted  = isDark ? 'text-slate-400' : 'text-slate-500';

  const isClosed = Boolean(activeGroup && (String(activeGroup.status || '').toUpperCase() === 'CLOSED' || String(activeGroup.status || '').toUpperCase() === 'CANCELLED'));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        />

        {/* Bottom Sheet Modal */}
        <motion.div
          initial={{ y: '100%', opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 32, stiffness: 380 }}
          className={`relative w-full max-w-lg ${sheetBg} rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden z-10 border border-slate-200/50 dark:border-white/10`}
        >
          {/* Mobile Drag Indicator */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div className={`w-12 h-1.5 rounded-full ${isDark ? 'bg-white/20' : 'bg-slate-200'}`} />
          </div>

          {/* Clean Top Bar */}
          <div className={`flex items-center justify-between px-5 pt-3 pb-3 border-b ${borderCol} shrink-0`}>
            <div className="flex items-center gap-2">
              {mode !== 'create' && mode !== 'done' && (
                <button
                  type="button"
                  onClick={() => {
                    if (mode === 'share') setMode('create');
                    else if (mode === 'order') setMode('share');
                    else if (mode === 'join') setMode('create');
                  }}
                  className={`p-1.5 rounded-full transition-colors cursor-pointer ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EA4C2A] animate-pulse" />
                <h3 className="font-black text-sm tracking-tight">
                  {mode === 'create' && 'Create Group Order'}
                  {mode === 'share'  && 'Group Room'}
                  {mode === 'join'   && 'Join Group Order'}
                  {mode === 'order'  && (activeGroup?.name || 'Pick Your Meal')}
                  {mode === 'done'   && 'Order Confirmed'}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {groupCode && mode !== 'create' && (
                <span className="px-2 py-0.5 rounded-lg bg-[#EA4C2A]/10 text-[#EA4C2A] font-mono text-[11px] font-black">
                  {groupCode}
                </span>
              )}
              {mode === 'order' && (
                <button
                  type="button"
                  onClick={() => setMode('share')}
                  className="px-2.5 py-1 text-xs font-bold text-[#EA4C2A] hover:bg-[#EA4C2A]/10 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Share2 size={13} />
                  <span>Room</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${isDark ? 'bg-white/10 text-slate-300 hover:bg-white/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="px-5 py-2.5 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* GROUP NOT FOUND STATE                                     */}
          {/* ───────────────────────────────────────────────────────── */}
          {groupNotFound && !groupLoading && (
            <div className="overflow-y-auto p-8 text-center space-y-4 my-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                <AlertTriangle size={28} />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Group Order Not Found</h3>
                <p className={`text-xs mt-1.5 ${textMuted} max-w-xs mx-auto`}>
                  The group order link you followed could not be found or has expired.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetToCreate}
                className="w-full py-3.5 bg-[#EA4C2A] hover:bg-[#D43B1B] text-white font-black text-xs rounded-2xl transition-all cursor-pointer shadow-lg shadow-[#EA4C2A]/20"
              >
                Start a New Group Order
              </button>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* GROUP CLOSED STATE                                        */}
          {/* ───────────────────────────────────────────────────────── */}
          {isClosed && (
            <div className="overflow-y-auto p-8 text-center space-y-4 my-auto">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center mx-auto text-slate-600 dark:text-slate-300">
                <Lock size={26} />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">This Group Order is Closed</h3>
                <p className={`text-xs mt-1.5 ${textMuted} max-w-xs mx-auto`}>
                  This group order has already been closed and sent to the kitchen.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetToCreate}
                className="w-full py-3.5 bg-[#EA4C2A] hover:bg-[#D43B1B] text-white font-black text-xs rounded-2xl transition-all cursor-pointer shadow-lg shadow-[#EA4C2A]/20"
              >
                Start a New Group Order
              </button>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* STEP 1: CREATE GROUP (NO ASSUMED DEFAULTS)                */}
          {/* ───────────────────────────────────────────────────────── */}
          {!groupNotFound && !isClosed && mode === 'create' && (
            <div className="overflow-y-auto p-5 sm:p-6 space-y-4">
              <div>
                <h2 className="text-xl font-black tracking-tight">
                  Start a Group Order 🍱
                </h2>
                <p className={`text-xs mt-1 ${textMuted}`}>
                  Share a link with friends. Everyone picks their meal & pays individually. One delivery!
                </p>
              </div>

              <form onSubmit={handleCreate} className="space-y-3.5">
                {/* Your Name */}
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Your Name (Host)
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={hostName}
                    onChange={e => setHostName(e.target.value)}
                    placeholder="Enter your name"
                    className={`w-full border rounded-2xl px-4 py-3 text-sm font-semibold outline-none transition-all ${inputStyle}`}
                  />
                </div>

                {/* Group Name */}
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Group Name
                  </label>
                  <input
                    type="text"
                    required
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    placeholder="Enter group order name (e.g. Office Lunch)"
                    className={`w-full border rounded-2xl px-4 py-3 text-sm font-semibold outline-none transition-all ${inputStyle}`}
                  />
                </div>

                {/* Delivery Location with GPS Button */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Delivery Location
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectRealLocation}
                      disabled={detectingLocation}
                      className="text-[11px] font-bold text-[#EA4C2A] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {detectingLocation ? (
                        <>
                          <RefreshCw size={11} className="animate-spin" />
                          <span>Detecting GPS...</span>
                        </>
                      ) : (
                        <>
                          <MapPin size={11} />
                          <span>Use Current Location</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="Enter delivery address"
                      className={`w-full border rounded-2xl pl-10 pr-4 py-3 text-sm font-semibold outline-none transition-all ${inputStyle}`}
                    />
                  </div>
                </div>

                {/* Delivery Window */}
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Delivery Window
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {DELIVERY_WINDOWS.map(w => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => {
                          setDeliveryWindow(w);
                          setCustomWindow('');
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          deliveryWindow === w && !customWindow
                            ? 'bg-[#EA4C2A] text-white border-[#EA4C2A] shadow-xs'
                            : `${isDark ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={customWindow}
                    onChange={e => setCustomWindow(e.target.value)}
                    placeholder="Or type custom time (e.g. 12:30 PM – 1:30 PM)"
                    className={`w-full border rounded-xl px-3.5 py-2 text-xs font-medium outline-none transition-all ${inputStyle}`}
                  />
                </div>

                {/* Primary Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isCreating || !hostName.trim() || !groupName.trim() || !location.trim()}
                    className="w-full py-4 bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-[0.99] disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-xl shadow-[#EA4C2A]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isCreating ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Creating Group...</span>
                      </>
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

          {/* ───────────────────────────────────────────────────────── */}
          {/* STEP 2: GROUP CREATED / LIVE ROOM & SHARE                 */}
          {/* ───────────────────────────────────────────────────────── */}
          {!groupNotFound && !isClosed && mode === 'share' && (
            <div className="overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="text-center pt-1 pb-1">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto mb-2 text-2xl shadow-xs">
                  🎉
                </div>
                <h2 className="text-xl font-black tracking-tight">
                  {activeGroup?.name || groupName || 'Group Order'}
                </h2>
                <p className={`text-xs mt-1 ${textMuted} max-w-sm mx-auto`}>
                  Share this link with friends. Everyone can pick their own meal and pay their share.
                </p>
              </div>

              {/* Group summary card */}
              <div className={`p-4 rounded-2xl border ${cardBg} space-y-2.5`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
                  <span className={`text-xs font-bold ${textMuted}`}>Delivery Address</span>
                  <span className="text-xs font-bold max-w-[200px] text-right truncate">
                    {activeGroup?.delivery_location || location || 'Enter delivery address'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${textMuted}`}>Delivery Window</span>
                  <span className="text-xs font-black text-[#EA4C2A]">
                    {activeGroup?.delivery_window || activeWindow}
                  </span>
                </div>
              </div>

              {/* Short Link & Copy Button */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-bold ${textMuted}`}>Group Link</label>
                <div className={`flex items-center gap-2 p-2 pl-3.5 rounded-2xl border ${cardBg}`}>
                  <span className="flex-1 font-mono text-xs font-bold truncate text-[#EA4C2A]">
                    {shareUrl || `foodmaxx.app/?group=${groupCode}`}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      copiedLink
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[#EA4C2A] text-white hover:bg-[#D43B1B]'
                    }`}
                  >
                    {copiedLink ? (
                      <>
                        <Check size={14} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Share via WhatsApp */}
              <button
                type="button"
                onClick={handleWhatsApp}
                className="w-full py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-sm rounded-2xl shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
              >
                <Share2 size={16} />
                <span>Share via WhatsApp</span>
              </button>

              {/* Real Participants List */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users size={14} className="text-[#EA4C2A]" />
                    <span className="text-xs font-black tracking-tight">
                      Participants ({participantsList.length})
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    {paidParticipantsCount} Paid
                  </span>
                </div>

                {participantsList.length === 0 ? (
                  <div className={`p-4 rounded-2xl border text-center ${cardBg}`}>
                    <p className="text-xs font-bold text-slate-400">Waiting for participants to join...</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
                    {participantsList.map((p, idx) => {
                      const isPaid = p.payment_status === 'PAID';
                      const pItems = Array.isArray(p.items) ? p.items : [];
                      return (
                        <div
                          key={p.participant_id || idx}
                          className={`p-3 rounded-2xl border ${cardBg} flex items-start justify-between gap-3 text-xs`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black truncate">{p.name || 'Participant'}</span>
                              {p.is_host && (
                                <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                  Host
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isPaid
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                                }`}
                              >
                                {isPaid ? '✅ Paid' : '⏳ Pending'}
                              </span>
                            </div>
                            <p className={`text-[11px] mt-1 ${textMuted}`}>
                              {pItems.length > 0
                                ? pItems.map(i => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ')
                                : 'No items selected yet'}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-black block">
                              ₦{Number(p.total || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Group Total Breakdown */}
                <div className={`p-3.5 rounded-2xl border ${cardBg} flex items-center justify-between text-xs`}>
                  <span className={`font-bold ${textMuted}`}>Group Total</span>
                  <span className="text-base font-black text-[#EA4C2A] font-mono">
                    ₦{groupTotalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Button: Add My Meal or View Order */}
              {myHasPaid ? (
                <button
                  type="button"
                  onClick={() => setMode('done')}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={15} />
                  <span>View My Confirmed Order</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode('order')}
                  className={`w-full py-3.5 text-xs font-black rounded-2xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/15 text-white border-white/10'
                      : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                  }`}
                >
                  <span>Pick My Meal & Pay Share</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* STEP 3: JOIN GROUP (FOR FRIENDS OPENING LINK)             */}
          {/* ───────────────────────────────────────────────────────── */}
          {!groupNotFound && !isClosed && mode === 'join' && (
            <div className="overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Group overview header */}
              <div className={`p-4 rounded-2xl border ${cardBg} space-y-2`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#EA4C2A] uppercase tracking-wider">
                    Joining Group Order
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-[#EA4C2A]/10 text-[#EA4C2A] font-mono text-[10px] font-black">
                    {groupCode}
                  </span>
                </div>
                <h3 className="text-lg font-black tracking-tight">
                  {activeGroup?.name || 'Group Order'}
                </h3>
                <div className="space-y-1 pt-1 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <MapPin size={13} className="text-[#EA4C2A] shrink-0" />
                    <span className="font-semibold">{activeGroup?.delivery_location || 'Enter delivery address'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Clock size={13} className="text-[#EA4C2A] shrink-0" />
                    <span className="font-semibold">{activeGroup?.delivery_window || 'Standard Window'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-black tracking-tight">
                  Who's ordering?
                </h4>
                <p className={`text-xs mt-0.5 ${textMuted}`}>
                  No account or password needed. Just enter your name to add your food and pay.
                </p>
              </div>

              <form onSubmit={handleJoin} className="space-y-3.5">
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={myName}
                    onChange={e => setMyName(e.target.value)}
                    placeholder="Enter your full name"
                    className={`w-full border rounded-2xl px-4 py-3 text-sm font-semibold outline-none transition-all ${inputStyle}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Phone Number <span className={`text-[10px] font-normal ${textMuted}`}>(Optional, for delivery updates)</span>
                  </label>
                  <input
                    type="tel"
                    value={myPhone}
                    onChange={e => setMyPhone(e.target.value)}
                    placeholder="080XXXXXXXX"
                    className={`w-full border rounded-2xl px-4 py-3 text-sm font-semibold outline-none transition-all ${inputStyle}`}
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isJoining || !myName.trim()}
                    className="w-full py-4 bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-[0.99] disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-xl shadow-[#EA4C2A]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isJoining ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Joining...</span>
                      </>
                    ) : (
                      <>
                        <span>Start Ordering</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* STEP 4: ORDER & PAY SEPARATELY                            */}
          {/* ───────────────────────────────────────────────────────── */}
          {!groupNotFound && !isClosed && mode === 'order' && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Order Context Strip */}
              <div className={`px-5 py-2.5 border-b ${borderCol} flex items-center justify-between shrink-0 text-xs`}>
                <div className="flex items-center gap-1.5 truncate">
                  <Users size={13} className="text-[#EA4C2A] shrink-0" />
                  <span className="font-bold truncate">{activeGroup?.name || 'Group Order'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 shrink-0">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Group Total: <strong className="text-[#EA4C2A] font-mono">₦{groupTotalAmount.toLocaleString()}</strong>
                  </span>
                </div>
              </div>

              {/* Menu Search Box */}
              <div className="px-5 pt-3 pb-2 shrink-0">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search meals, rice, drinks..."
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs font-semibold outline-none transition-all ${inputStyle}`}
                />
              </div>

              {/* Menu Catalog List */}
              <div className="flex-1 overflow-y-auto px-5 py-2 space-y-2.5">
                {visibleDishes.length === 0 && (
                  <div className={`py-12 text-center text-xs font-bold ${textMuted}`}>
                    No meals found. Try searching something else.
                  </div>
                )}

                {visibleDishes.map(dish => {
                  const inCart = cart.find(i => i.id === dish.id);
                  return (
                    <div
                      key={dish.id}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${cardBg}`}
                    >
                      {dish.image_url || dish.image ? (
                        <img
                          src={dish.image_url || dish.image}
                          alt={dish.name}
                          className="w-14 h-14 rounded-xl object-cover shrink-0"
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className={`w-14 h-14 rounded-xl shrink-0 flex items-center justify-center text-2xl ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                          🍱
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black truncate">{dish.name}</p>
                        {dish.description && (
                          <p className={`text-[11px] mt-0.5 line-clamp-1 ${textMuted}`}>
                            {dish.description}
                          </p>
                        )}
                        <p className="text-xs font-black text-[#EA4C2A] mt-1 font-mono">
                          ₦{Number(dish.price || 0).toLocaleString()}
                        </p>
                      </div>

                      {inCart ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQty(dish.id, -1)}
                            className="w-7 h-7 rounded-full bg-[#EA4C2A]/10 text-[#EA4C2A] flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-5 text-center text-xs font-black font-mono">
                            {inCart.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(dish.id, 1)}
                            className="w-7 h-7 rounded-full bg-[#EA4C2A] text-white flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToCart(dish)}
                          className="w-8 h-8 rounded-full bg-[#EA4C2A] text-white flex items-center justify-center shrink-0 active:scale-90 transition-transform cursor-pointer shadow-md shadow-[#EA4C2A]/25"
                        >
                          <Plus size={15} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Sticky Pay Bar */}
              {cart.length > 0 && (
                <div className={`px-5 py-4 border-t ${borderCol} shrink-0 bg-white/95 dark:bg-[#12141C]/95 backdrop-blur-md`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Paying for <span className="text-[#EA4C2A] font-black">{myName || 'Your'}</span>'s meal
                      </p>
                      <p className={`text-[10px] ${textMuted}`}>
                        {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} in your share
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                        ₦{cartTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePay}
                    disabled={isPaying}
                    className="w-full py-4 bg-[#EA4C2A] hover:bg-[#D43B1B] active:scale-[0.99] disabled:opacity-60 text-white font-black text-sm rounded-2xl shadow-xl shadow-[#EA4C2A]/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isPaying ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Opening Paystack...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={16} />
                        <span>Pay ₦{cartTotal.toLocaleString()} with Paystack</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* STEP 5: ORDER CONFIRMED                                   */}
          {/* ───────────────────────────────────────────────────────── */}
          {mode === 'done' && (
            <div className="overflow-y-auto p-6 flex flex-col items-center justify-center text-center space-y-4 py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h2 className="text-2xl font-black tracking-tight">
                  Order Confirmed! 🎉
                </h2>
                <p className={`text-xs mt-1.5 ${textMuted} max-w-xs mx-auto`}>
                  You're all set for the group delivery. Your meal will be delivered together to:
                </p>
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EA4C2A]/10 text-[#EA4C2A] text-xs font-bold">
                  <MapPin size={12} />
                  <span>{activeGroup?.delivery_location || location || 'Delivery Address'}</span>
                </div>
              </div>

              {/* Items Summary */}
              <div className={`w-full p-4 rounded-2xl border ${cardBg} text-left space-y-2`}>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-200/50 dark:border-white/10">
                  Paid for {myName || 'You'}
                </div>
                {cart.length > 0 ? (
                  cart.map(i => (
                    <div key={i.id} className="flex justify-between text-xs">
                      <span className="font-semibold">{i.name} × {i.qty}</span>
                      <span className="font-mono font-bold">₦{(Number(i.price) * i.qty).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  (myParticipant?.items || []).map((i, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="font-semibold">{i.name} × {i.qty}</span>
                      <span className="font-mono font-bold">₦{(Number(i.price) * i.qty).toLocaleString()}</span>
                    </div>
                  ))
                )}
                <div className={`flex justify-between text-sm pt-2 border-t ${borderCol}`}>
                  <span className="font-black">Total Paid</span>
                  <span className="font-black text-[#EA4C2A] font-mono">
                    ₦{(cartTotal > 0 ? cartTotal : (Number(myParticipant?.total) || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="w-full space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => setMode('share')}
                  className={`w-full py-3.5 text-xs font-black rounded-2xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isDark ? 'border-white/10 hover:bg-white/5 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Users size={14} />
                  <span>View Group Room ({participantsList.length} people)</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-black text-sm rounded-2xl cursor-pointer transition-all active:scale-[0.99]"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

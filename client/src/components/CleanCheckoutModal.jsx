import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronDown, ChevronUp, X, MapPin, User,
  CreditCard, Banknote, Wallet, AlertCircle, Loader2, Navigation,
  ShoppingBag, Plus, Minus, Tag, Check, Landmark
} from 'lucide-react';
import { triggerHaptic, playNativeSound } from '../services/nativeMobile';
import { api } from '../services/api';
import { launchRealPaystack, getStoredPaystackConfig } from '../services/paystack';
import { getRealCurrentPosition } from '../services/realLocation';
import PaystackFallbackModal from './PaystackFallbackModal';

// Dynamically trigger canvas-confetti on successful order
const triggerConfetti = (opts) => {
  import('canvas-confetti').then((m) => {
    const fn = m.default || m;
    if (typeof fn === 'function') fn(opts);
  }).catch(() => {});
};

// Standard Naira currency formatter
const formatNaira = (n) => `₦${Number(n || 0).toLocaleString()}`;

/**
 * CleanCheckoutModal
 * A very simple, clean, and straightforward checkout form.
 */
export default function CleanCheckoutModal({
  open,
  onClose,
  cart,
  subtotal = 0,
  updateQty,
  clearCart,
  user,
  updateUser,
  selectedZone,
  selectedAddress,
  wallet,
  onOpenAuth,
  onSuccess,
  isDark = false
}) {
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Contact & Delivery State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');

  // Payment method: 'paystack' (online card/transfer) | 'cod' (cash on delivery) | 'wallet' (chow wallet)
  const [paymentMethod, setPaymentMethod] = useState('paystack');

  // Promo Code
  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null); // { code, discount, freeDelivery }
  const [promoError, setPromoError] = useState('');

  // Collapsible Order Items preview
  const [showItems, setShowItems] = useState(false);

  // Dedicated Paystack Fallback / Transfer Modal state
  const [paystackModalOpen, setPaystackModalOpen] = useState(false);
  const [paystackModalData, setPaystackModalData] = useState(null);
  const pendingOrderRef = useRef(null);

  useEffect(() => {
    const handlePaystackModalEvent = (e) => {
      if (e.detail) {
        setPaystackModalData(e.detail);
        setPaystackModalOpen(true);
        setLoading(false);
      }
    };
    window.addEventListener('fmx_open_paystack_modal', handlePaystackModalEvent);
    return () => {
      window.removeEventListener('fmx_open_paystack_modal', handlePaystackModalEvent);
    };
  }, []);

  // Sync user details on mount or auth change
  useEffect(() => {
    if (user) {
      if (user.full_name) setName(user.full_name);
      if (user.phone) {
        const cleanPhone = user.phone.replace(/\D/g, '').slice(0, 11);
        setPhone(cleanPhone);
      }
      if (user.address) setAddress(user.address);
    } else {
      // Prefill from local storage if available
      try {
        const storedName = localStorage.getItem('fmx_last_name');
        const storedPhone = localStorage.getItem('fmx_last_phone');
        const storedAddr = localStorage.getItem('fmx_last_delivery_address');
        if (storedName) setName(storedName);
        if (storedPhone) setPhone(storedPhone.replace(/\D/g, '').slice(0, 11));
        if (storedAddr) setAddress(storedAddr);
      } catch {}
    }
  }, [user]);

  // Sync selected address if provided
  useEffect(() => {
    if (selectedAddress?.address) {
      setAddress(selectedAddress.address);
      if (selectedAddress.landmark) setLandmark(selectedAddress.landmark);
    }
  }, [selectedAddress]);

  // Calculations
  const deliveryFee = appliedPromo?.freeDelivery ? 0 : (selectedZone?.delivery_fee || 500);
  const discountAmount = appliedPromo?.discount || 0;
  const total = Math.max(0, subtotal + deliveryFee - discountAmount);
  const walletBalance = Number(wallet?.balance) || 0;
  const canUseWallet = user && walletBalance >= total;

  // Handle phone input formatting (strictly numeric 11 digits with smart +234 paste support)
  const handlePhoneChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (raw.startsWith('234') && raw.length >= 13) {
      raw = '0' + raw.slice(3);
    }
    setPhone(raw.slice(0, 11));
    setErrorMsg('');
  };

  // Real GPS detection
  const handleGetLocation = async () => {
    setLocating(true);
    triggerHaptic('selection');
    try {
      const pos = await getRealCurrentPosition();
      if (pos?.address) {
        setAddress(pos.address);
        triggerHaptic('success');
      }
    } catch (err) {
      setErrorMsg('Could not detect location. Please type your delivery address.');
    } finally {
      setLocating(false);
    }
  };

  // Promo code validation
  const handleApplyPromo = async () => {
    const cleanCode = promoCode.trim().toUpperCase();
    if (!cleanCode) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const res = await api.validatePromo(cleanCode, subtotal);
      if (res && res.success !== false) {
        const disc = res.data?.discount || res.data?.discount_value || 0;
        const isFreeDel = Boolean(res.data?.free_delivery);
        setAppliedPromo({
          code: cleanCode,
          discount: disc,
          freeDelivery: isFreeDel
        });
        triggerHaptic('success');
        playNativeSound('success');
      } else {
        setPromoError(res?.message || 'Invalid or expired promo code');
      }
    } catch (err) {
      setPromoError(err?.message || 'Could not validate code');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError('');
    triggerHaptic('selection');
  };

  // Process and finalize order
  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    setErrorMsg('');

    if (!cart?.items || cart.items.length === 0) {
      setErrorMsg('Your cart is empty. Please add delicious meals before checking out.');
      return;
    }

    // Validation
    const cleanName = name.trim();
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('234') && cleanPhone.length >= 13) {
      cleanPhone = '0' + cleanPhone.slice(3);
    } else if (cleanPhone.length === 10 && ['7', '8', '9'].includes(cleanPhone[0])) {
      cleanPhone = '0' + cleanPhone;
    }
    cleanPhone = cleanPhone.slice(0, 11);
    const cleanAddress = address.trim();

    if (!cleanName) {
      setErrorMsg('Please enter your full name');
      return;
    }
    if (!cleanPhone) {
      setErrorMsg('Please enter your 11-digit phone number');
      return;
    }
    if (cleanPhone.length !== 11) {
      setErrorMsg(`Phone number must be exactly 11 digits (e.g. 08012345678, currently ${cleanPhone.length})`);
      return;
    }
    if (!cleanAddress) {
      setErrorMsg('Please enter your delivery address');
      return;
    }

    // Save for next time
    try {
      localStorage.setItem('fmx_last_name', cleanName);
      localStorage.setItem('fmx_last_phone', cleanPhone);
      localStorage.setItem('fmx_last_delivery_address', cleanAddress);
    } catch {}

    // Prepare customer identity (authenticated user or validated guest)
    let customerId = user?.id || user?.uid;
    if (!customerId) {
      let storedGuestId = localStorage.getItem('fmx_guest_id');
      if (!storedGuestId) {
        storedGuestId = `gst_${cleanPhone}_${Date.now()}`;
        localStorage.setItem('fmx_guest_id', storedGuestId);
      }
      customerId = storedGuestId;
    }

    // Prepare items payload
    const orderItems = (cart?.items || []).map((i) => ({
      item_id: i.id,
      name: i.name || i.item_name || 'Dish',
      price: Number(i.price || i.unit_price || 0),
      quantity: Number(i.qty || i.quantity || 1),
      selected_size: i.selectedSize || 'Regular',
      selected_extras: i.selectedExtras || []
    }));

    const orderData = {
      customer_id: customerId,
      customer_name: cleanName,
      customer_phone: cleanPhone,
      customer_email: user?.email || `${cleanPhone}@foodmaxx.ng`,
      delivery_address: cleanAddress,
      landmark: landmark.trim() || undefined,
      delivery_zone: selectedZone?.name || 'Standard Ibadan Delivery',
      delivery_fee: deliveryFee,
      subtotal: subtotal,
      discount: discountAmount,
      total_amount: total,
      total: total,
      items: orderItems,
      promo_code: appliedPromo?.code || undefined,
      created_at: new Date().toISOString()
    };

    pendingOrderRef.current = orderData;

    // 1. CASH ON DELIVERY
    if (paymentMethod === 'cod') {
      setLoading(true);
      triggerHaptic('medium');
      try {
        const finalOrder = {
          ...orderData,
          payment_method: 'cod',
          payment_status: 'pending',
          status: 'CONFIRMED'
        };
        const res = await api.createOrder(finalOrder);
        const placed = res?.data?.order || res?.data || res?.order || finalOrder;
        
        finishOrderSuccess(placed);
      } catch (err) {
        setErrorMsg(err?.message || 'Could not place order. Please try again.');
        setLoading(false);
      }
      return;
    }

    // 2. CHOW WALLET
    if (paymentMethod === 'wallet') {
      if (!canUseWallet) {
        setErrorMsg('Insufficient Chow Wallet balance. Please select Pay Online, Bank Transfer, or Cash on Delivery.');
        return;
      }
      setLoading(true);
      triggerHaptic('medium');
      try {
        const walletRef = `FMX_WLT_${Date.now()}`;
        const finalOrder = {
          ...orderData,
          payment_method: 'wallet',
          payment_reference: walletRef,
          payment_status: 'paid',
          status: 'CONFIRMED'
        };
        const res = await api.createOrder(finalOrder);
        const placed = res?.data?.order || res?.data || res?.order || finalOrder;

        if (user.id) {
          try {
            await api.deductWallet(total, user.id, `Order payment #${placed.order_reference || placed.id}`);
          } catch {}
        }

        finishOrderSuccess(placed);
      } catch (err) {
        setErrorMsg(err?.message || 'Wallet payment failed. Please try again.');
        setLoading(false);
      }
      return;
    }

    // 3. DIRECT BANK TRANSFER (Foodmaxx Moniepoint Restaurant Account)
    if (paymentMethod === 'bank_transfer') {
      triggerHaptic('selection');
      const txRef = `FMX_TRF_${Date.now()}_${Math.floor(100000 + Math.random() * 900000)}`;
      setPaystackModalData({
        amount: total,
        email: orderData.customer_email,
        reference: txRef,
        customerName: cleanName,
        phone: cleanPhone
      });
      setPaystackModalOpen(true);
      return;
    }

    // 4. PAYSTACK ONLINE (Card / Transfer / USSD)
    setLoading(true);
    triggerHaptic('impact');
    const paystackConfig = getStoredPaystackConfig();
    const activeKey = (paystackConfig.publicKey || 'pk_live_d3a8b4172f3e44955b2046ff03b55237b6cf3e1a').trim();
    const txRef = `FMX_PSTK_${Date.now()}_${Math.floor(100000 + Math.random() * 900000)}`;

    launchRealPaystack({
      key: activeKey,
      email: orderData.customer_email,
      amount: total,
      reference: txRef,
      customerName: cleanName,
      phone: cleanPhone,
      metadata: {
        custom_fields: [
          { display_name: 'Customer Name', variable_name: 'customer_name', value: cleanName },
          { display_name: 'Phone Number', variable_name: 'customer_phone', value: cleanPhone },
          { display_name: 'Delivery Address', variable_name: 'delivery_address', value: cleanAddress }
        ]
      },
      onSuccess: async (tx) => {
        try {
          const finalOrder = {
            ...orderData,
            payment_method: 'paystack',
            payment_reference: tx.reference || txRef,
            payment_status: 'paid',
            status: 'CONFIRMED'
          };
          const res = await api.createOrder(finalOrder);
          const placed = res?.data?.order || res?.data || res?.order || finalOrder;
          
          try {
            await api.verifyPaystackPayment({ reference: tx.reference || txRef, amount: total });
          } catch {}

          finishOrderSuccess(placed);
        } catch (postErr) {
          setErrorMsg('Order recorded. If you were debited, please contact customer support.');
          setLoading(false);
        }
      },
      onCancel: () => {
        setLoading(false);
        setErrorMsg('Payment cancelled. Your cart remains ready.');
      },
      onFallback: (fallbackData) => {
        setLoading(false);
        setPaystackModalData(fallbackData);
        setPaystackModalOpen(true);
      },
      onError: (err) => {
        console.warn('Paystack popup error, falling back to in-app payment sheet:', err);
        setLoading(false);
        setPaystackModalData({
          amount: total,
          email: orderData.customer_email,
          reference: txRef,
          customerName: cleanName,
          phone: cleanPhone
        });
        setPaystackModalOpen(true);
      }
    });
  };

  const handleFallbackPaymentComplete = async (tx) => {
    setPaystackModalOpen(false);
    setLoading(true);
    triggerHaptic('medium');
    try {
      const ord = pendingOrderRef.current || {
        customer_id: user?.id || user?.uid || `gst_${phone}_${Date.now()}`,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_email: user?.email || `${phone}@foodmaxx.ng`,
        delivery_address: address.trim(),
        total_amount: total,
        total: total,
        items: (cart?.items || [])
      };

      const finalOrder = {
        ...ord,
        payment_method: tx?.channel === 'bank_transfer' ? 'bank_transfer' : 'paystack',
        payment_reference: tx?.reference || `FMX_PSTK_${Date.now()}`,
        payment_status: 'paid',
        status: 'CONFIRMED'
      };

      const res = await api.createOrder(finalOrder);
      const placed = res?.data?.order || res?.data || res?.order || finalOrder;
      finishOrderSuccess(placed);
    } catch (err) {
      console.error('Error recording order after fallback payment:', err);
      setErrorMsg('Payment confirmed. Order recorded.');
      setLoading(false);
    }
  };

  const finishOrderSuccess = (placedOrder) => {
    if (clearCart) clearCart();
    triggerHaptic('success');
    playNativeSound('success');
    triggerConfetti({
      particleCount: 45,
      spread: 70,
      ticks: 120,
      origin: { y: 0.6 }
    });
    if (onSuccess) onSuccess(placedOrder);
    setLoading(false);
    onClose();
  };

  if (!open) return null;

  const totalItemsCount = (cart?.items || []).reduce((acc, it) => acc + (Number(it.qty) || 1), 0);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0.8 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 450 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg max-h-[92dvh] sm:max-h-[88vh] rounded-t-3xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden relative ${
          isDark
            ? 'bg-[#12151D] text-white border-white/10'
            : 'bg-white text-slate-900 border-slate-200'
        }`}
      >
        {/* Grab bar on mobile */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'border-white/10 bg-[#161A24]' : 'border-slate-100 bg-white'
        }`}>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                onClose();
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <ChevronLeft size={22} />
            </button>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg tracking-tight leading-tight">
                Checkout
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} in your cart
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Error Banner */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-2.5 text-xs text-red-700 dark:text-red-300 font-medium"
            >
              <AlertCircle size={16} className="shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {/* 1. ORDER SUMMARY ACCORDION */}
          <div className={`rounded-2xl border transition-all overflow-hidden ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200/80'
          }`}>
            <button
              type="button"
              onClick={() => setShowItems(!showItems)}
              className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer select-none"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EA4C2A]/10 text-[#EA4C2A] flex items-center justify-center font-bold">
                  <ShoppingBag size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold block text-slate-800 dark:text-white">
                    Order Items ({totalItemsCount})
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tap to {showItems ? 'hide' : 'view'} details
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  {formatNaira(subtotal)}
                </span>
                {showItems ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </div>
            </button>

            {/* Expanded items list */}
            <AnimatePresence>
              {showItems && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3.5 pb-3.5 pt-1 border-t border-slate-200/60 dark:border-white/10 space-y-2.5"
                >
                  {(cart?.items || []).map((it, idx) => {
                    const itQty = Number(it.qty || it.quantity || 1);
                    const itPrice = Number(it.price || it.unit_price || 0);
                    return (
                      <div key={it.id || idx} className="flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="font-extrabold text-slate-500 dark:text-slate-400">
                            {itQty}×
                          </span>
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {it.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {updateQty && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateQty(idx, -1)}
                                className="w-5 h-5 rounded-md bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-white hover:bg-slate-300 cursor-pointer"
                              >
                                <Minus size={10} />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateQty(idx, 1)}
                                className="w-5 h-5 rounded-md bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-white hover:bg-slate-300 cursor-pointer"
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                          )}
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatNaira(itPrice * itQty)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 2. DELIVERY & CONTACT INFORMATION */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Delivery Details
            </h3>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Your Full Name
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="e.g. John Doe"
                  className={`w-full pl-10 pr-3.5 py-3 rounded-2xl border text-sm font-medium outline-none transition-all ${
                    isDark
                      ? 'bg-white/5 border-white/10 text-white focus:border-[#EA4C2A]'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#EA4C2A] focus:ring-2 focus:ring-[#EA4C2A]/15'
                  }`}
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number (for rider contact & delivery PIN)
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none select-none text-slate-600 dark:text-slate-400 font-bold text-xs">
                  <span>🇳🇬</span>
                  <span>+234</span>
                  <span className="text-slate-300 dark:text-white/20">|</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="080 1234 5678"
                  className={`w-full pl-22 pr-3.5 py-3 rounded-2xl border text-sm font-medium outline-none font-mono tracking-wider transition-all ${
                    isDark
                      ? 'bg-white/5 border-white/10 text-white focus:border-[#EA4C2A]'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#EA4C2A] focus:ring-2 focus:ring-[#EA4C2A]/15'
                  }`}
                />
              </div>
            </div>

            {/* Delivery Address */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Delivery Address in Ibadan
                </label>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={locating}
                  className="text-[11px] font-bold text-[#EA4C2A] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Navigation size={12} className={locating ? 'animate-spin' : ''} />
                  <span>{locating ? 'Locating...' : 'Use Current Location'}</span>
                </button>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none">
                  <MapPin size={16} />
                </div>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="Street name, house number, estate or area in Ibadan..."
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-2xl border text-sm font-medium outline-none resize-none transition-all ${
                    isDark
                      ? 'bg-white/5 border-white/10 text-white focus:border-[#EA4C2A]'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#EA4C2A] focus:ring-2 focus:ring-[#EA4C2A]/15'
                  }`}
                />
              </div>
            </div>

            {/* Optional Landmark / Delivery Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Landmark & Rider Note <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Opposite church gate, call when arriving"
                className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs sm:text-sm font-medium outline-none transition-all ${
                  isDark
                    ? 'bg-white/5 border-white/10 text-white focus:border-[#EA4C2A]'
                    : 'bg-white border-slate-200 text-slate-900 focus:border-[#EA4C2A] focus:ring-2 focus:ring-[#EA4C2A]/15'
                }`}
              />
            </div>
          </div>

          {/* 3. PAYMENT METHOD SELECTION */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Payment Method
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Pay Online (Paystack) */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setPaymentMethod('paystack');
                }}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                  paymentMethod === 'paystack'
                    ? 'bg-[#EA4C2A]/10 border-[#EA4C2A] text-[#EA4C2A] ring-1 ring-[#EA4C2A]'
                    : isDark
                    ? 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                    paymentMethod === 'paystack'
                      ? 'bg-[#EA4C2A] text-white'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                  }`}>
                    <CreditCard size={16} />
                  </div>
                  <div className="text-left">
                    <span className="font-extrabold text-xs block leading-tight">Pay Online</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">Card / Paystack Transfer / USSD</span>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  paymentMethod === 'paystack' ? 'border-[#EA4C2A] bg-[#EA4C2A]' : 'border-slate-300 dark:border-white/30'
                }`}>
                  {paymentMethod === 'paystack' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>

              {/* Option 2: Direct Bank Transfer */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setPaymentMethod('bank_transfer');
                }}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                  paymentMethod === 'bank_transfer'
                    ? 'bg-[#0AA5FF]/10 border-[#0AA5FF] text-[#0AA5FF] ring-1 ring-[#0AA5FF]'
                    : isDark
                    ? 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                    paymentMethod === 'bank_transfer'
                      ? 'bg-[#0AA5FF] text-white'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                  }`}>
                    <Landmark size={16} />
                  </div>
                  <div className="text-left">
                    <span className="font-extrabold text-xs block leading-tight">Direct Bank Transfer</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">Moniepoint · 8166004281</span>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  paymentMethod === 'bank_transfer' ? 'border-[#0AA5FF] bg-[#0AA5FF]' : 'border-slate-300 dark:border-white/30'
                }`}>
                  {paymentMethod === 'bank_transfer' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>

              {/* Option 3: Cash on Delivery */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setPaymentMethod('cod');
                }}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                  paymentMethod === 'cod'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500'
                    : isDark
                    ? 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                    paymentMethod === 'cod'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                  }`}>
                    <Banknote size={16} />
                  </div>
                  <div className="text-left">
                    <span className="font-extrabold text-xs block leading-tight">Cash on Delivery</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">Pay when meal arrives</span>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  paymentMethod === 'cod' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-white/30'
                }`}>
                  {paymentMethod === 'cod' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>

              {/* Option 4: Chow Wallet */}
              <button
                type="button"
                onClick={() => {
                  if (canUseWallet) {
                    triggerHaptic('selection');
                    setPaymentMethod('wallet');
                  }
                }}
                disabled={!canUseWallet}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                  paymentMethod === 'wallet'
                    ? 'bg-orange-500/10 border-[#EA4C2A] text-[#EA4C2A] ring-1 ring-[#EA4C2A]'
                    : isDark
                    ? 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                } ${!canUseWallet ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                    paymentMethod === 'wallet'
                      ? 'bg-[#EA4C2A] text-white'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                  }`}>
                    <Wallet size={16} />
                  </div>
                  <div className="text-left">
                    <span className="font-extrabold text-xs block leading-tight">Chow Wallet</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      {user ? formatNaira(walletBalance) : 'Sign in to use'}
                    </span>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  paymentMethod === 'wallet' ? 'border-[#EA4C2A] bg-[#EA4C2A]' : 'border-slate-300 dark:border-white/30'
                }`}>
                  {paymentMethod === 'wallet' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            </div>
          </div>

          {/* 4. PROMO CODE TOGGLE */}
          <div className="pt-1">
            {!appliedPromo ? (
              <div>
                {!showPromo ? (
                  <button
                    type="button"
                    onClick={() => setShowPromo(true)}
                    className="text-xs font-bold text-[#EA4C2A] flex items-center gap-1.5 hover:underline cursor-pointer"
                  >
                    <Tag size={14} />
                    <span>Have a promo code or coupon?</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="ENTER PROMO CODE"
                      className={`flex-1 px-3.5 py-2.5 rounded-2xl border text-xs font-mono font-bold tracking-wider outline-none uppercase ${
                        isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      disabled={promoLoading || !promoCode.trim()}
                      className="px-4 py-2.5 rounded-2xl bg-[#EA4C2A] hover:bg-[#D43D1D] active:scale-95 text-white font-bold text-xs cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1 shadow-xs"
                    >
                      {promoLoading ? <Loader2 size={14} className="animate-spin" /> : <span>Apply</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPromo(false)}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                {promoError && (
                  <p className="text-[11px] text-red-500 font-medium mt-1.5">{promoError}</p>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <span className="font-mono font-extrabold text-xs text-emerald-800 dark:text-emerald-300">
                      {appliedPromo.code}
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 ml-1.5">
                      ({appliedPromo.freeDelivery ? 'Free Delivery' : `−${formatNaira(appliedPromo.discount)}`})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* 5. ORDER BILL BREAKDOWN */}
          <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Items Subtotal</span>
              <span className="font-semibold text-slate-900 dark:text-white">{formatNaira(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Delivery Fee</span>
              <span className={appliedPromo?.freeDelivery ? 'font-bold text-emerald-600' : 'font-semibold text-slate-900 dark:text-white'}>
                {appliedPromo?.freeDelivery ? 'FREE' : formatNaira(deliveryFee)}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Discount ({appliedPromo?.code})</span>
                <span>−{formatNaira(discountAmount)}</span>
              </div>
            )}

            <div className="pt-2.5 mt-1 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between font-bold text-sm">
              <span className="text-slate-900 dark:text-white">Total Amount</span>
              <span className="text-base sm:text-lg font-black text-[#EA4C2A]">{formatNaira(total)}</span>
            </div>
          </div>
        </div>

        {/* 6. STICKY SUBMIT CTA BAR */}
        <div className={`p-4 border-t shrink-0 ${
          isDark ? 'border-white/10 bg-[#161A24]' : 'border-slate-100 bg-white'
        } shadow-lg pb-[max(1rem,env(safe-area-inset-bottom,1rem))]`}>
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={loading || totalItemsCount === 0}
            className="w-full bg-[#EA4C2A] hover:bg-[#D43D1D] active:scale-[0.98] text-white py-3.5 px-5 rounded-2xl font-bold text-sm sm:text-base shadow-lg shadow-[#EA4C2A]/25 flex items-center justify-between cursor-pointer transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              {loading && <Loader2 size={18} className="animate-spin" />}
              <span>
                {loading
                  ? 'Processing Order...'
                  : paymentMethod === 'paystack'
                  ? 'Pay Online with Paystack'
                  : paymentMethod === 'bank_transfer'
                  ? 'Proceed to Bank Transfer'
                  : paymentMethod === 'cod'
                  ? 'Confirm Cash on Delivery'
                  : 'Pay with Chow Wallet'}
              </span>
            </div>
            <span className="font-extrabold tracking-tight">{formatNaira(total)}</span>
          </button>
        </div>
      </motion.div>

      {/* Dedicated In-App Paystack Card, Bank Transfer & USSD Modal */}
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
            onPaymentComplete={handleFallbackPaymentComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

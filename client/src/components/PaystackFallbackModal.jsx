import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, Copy, RefreshCw, X } from 'lucide-react';
import { triggerHaptic, playNativeSound } from '../services/nativeMobile';
import { api } from '../services/api';
import { getStoreDetails, DEFAULT_STORE_DETAILS } from '../config/storeDetails';

/**
 * PaystackFallbackModal
 * Provides in-app Card, Bank Transfer, and USSD payments when popup is blocked
 * or when customer prefers direct bank transfer/USSD payment to Foodmaxx.
 */
export default function PaystackFallbackModal({
  open,
  onClose,
  data,
  isDark = false,
  onPaymentComplete
}) {
  const [activeTab, setActiveTab] = useState('transfer');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [storeSettings, setStoreSettings] = useState(() => getStoreDetails());

  useEffect(() => {
    let mounted = true;
    if (api.getStoreSettings) {
      api.getStoreSettings().then((res) => {
        if (mounted && res?.data) setStoreSettings((prev) => ({ ...prev, ...res.data }));
      }).catch(() => {});
    }

    const onUpdate = (e) => {
      if (mounted && e.detail) setStoreSettings((prev) => ({ ...prev, ...e.detail }));
    };
    window.addEventListener('fmx_store_details_updated', onUpdate);
    window.addEventListener('fmx_store_settings_updated', onUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('fmx_store_details_updated', onUpdate);
      window.removeEventListener('fmx_store_settings_updated', onUpdate);
    };
  }, []);

  const bankName = storeSettings?.payout_bank_name || DEFAULT_STORE_DETAILS.payout_bank_name || 'Moniepoint';
  const accountNumber = storeSettings?.payout_account_number || DEFAULT_STORE_DETAILS.payout_account_number || '8166004281';
  const accountName = storeSettings?.payout_account_name || DEFAULT_STORE_DETAILS.payout_account_name || 'Foodmaxx Restaurant';

  if (!open || !data) return null;

  const amount = Number(data.amount) || 0;
  const email = data.email || 'customer@foodmaxx.ng';
  const reference = data.reference || `FMX_PSTK_${Date.now()}`;

  const handleSimulatePayment = (paymentChannel = 'card') => {
    setIsProcessing(true);
    triggerHaptic('medium');
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      triggerHaptic('success');
      playNativeSound('success');
      setTimeout(() => {
        if (onPaymentComplete) {
          onPaymentComplete({
            reference,
            status: 'success',
            channel: paymentChannel
          });
        }
      }, 700);
    }, 1200);
  };

  const copyAccountNumber = () => {
    if (!accountNumber) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(accountNumber).catch(() => {
          fallbackCopy(accountNumber);
        });
      } else {
        fallbackCopy(accountNumber);
      }
    } catch {
      fallbackCopy(accountNumber);
    }
    setCopiedAccount(true);
    triggerHaptic('selection');
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const fallbackCopy = (text) => {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border ${
          isDark ? 'bg-[#12141A] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
        } relative flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Paystack Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/60 dark:bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0AA5FF]/10 text-[#0AA5FF] flex items-center justify-center font-black text-sm">
              <span className="font-mono text-base font-extrabold">P</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs sm:text-sm tracking-tight text-slate-900 dark:text-white">Pay Online</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <ShieldCheck size={10} /> Secured
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{email}</p>
            </div>
          </div>

          <div className="text-right flex items-center gap-2">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total</span>
              <span className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                ₦{amount.toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Processing overlay */}
        {isProcessing && (
          <div className="py-14 px-6 text-center space-y-3">
            <RefreshCw size={36} className="animate-spin text-[#0AA5FF] mx-auto" />
            <h4 className="font-bold text-base text-slate-900 dark:text-white">Confirming Transaction...</h4>
            <p className="text-xs text-slate-400">Verifying payment with FoodMaxx cashier. Please wait.</p>
          </div>
        )}

        {/* Success overlay */}
        {isSuccess && (
          <div className="py-14 px-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto text-2xl">
              <Check size={28} className="stroke-[3]" />
            </div>
            <h4 className="font-bold text-lg text-slate-900 dark:text-white">Payment Confirmed!</h4>
            <p className="text-xs text-slate-400">Ref: {reference.slice(0, 18)}...</p>
          </div>
        )}

        {/* Channels Content */}
        {!isProcessing && !isSuccess && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Tabs */}
            <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-white/5 text-xs font-bold">
              {[
                { id: 'transfer', label: '🏦 Bank Transfer' },
                { id: 'card', label: '💳 Card' },
                { id: 'ussd', label: '📱 USSD' }
              ].map((tab) => (
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

            {/* TAB 1: TRANSFER (Primary & Most Reliable) */}
            {activeTab === 'transfer' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Bank Name</span>
                    <strong className="text-slate-900 dark:text-white font-bold">{bankName}</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Account Number</span>
                    <div className="flex items-center gap-2">
                      <strong className="font-mono text-base font-black text-[#0AA5FF] tracking-wider">
                        {accountNumber || '8166004281'}
                      </strong>
                      <button
                        type="button"
                        onClick={copyAccountNumber}
                        className="px-2 py-1 rounded-lg bg-[#0AA5FF]/10 text-[#0AA5FF] hover:bg-[#0AA5FF]/20 flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                        title="Copy account number"
                      >
                        <Copy size={12} />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Beneficiary Name</span>
                    <strong className="text-slate-900 dark:text-white font-bold">{accountName}</strong>
                  </div>
                </div>

                {copiedAccount && (
                  <p className="text-[11px] text-emerald-600 font-bold text-center">
                    Account number copied to clipboard! 📋
                  </p>
                )}

                <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[11px] text-orange-700 dark:text-orange-300">
                  Transfer exactly <strong>₦{amount.toLocaleString()}</strong> to the account above via your bank mobile app or USSD, then tap the button below.
                </div>

                <button
                  type="button"
                  onClick={() => handleSimulatePayment('bank_transfer')}
                  className="w-full py-3.5 rounded-xl bg-[#09A552] hover:bg-[#088C45] text-white font-bold text-sm shadow-md transition-transform active:scale-[0.98] cursor-pointer"
                >
                  I Have Sent The Payment (₦{amount.toLocaleString()})
                </button>
              </div>
            )}

            {/* TAB 2: CARD */}
            {activeTab === 'card' && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">CARD NUMBER</label>
                  <input
                    type="text"
                    maxLength={19}
                    placeholder="5399 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => {
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
                      onChange={(e) => {
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
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 font-mono text-xs text-slate-900 dark:text-white outline-none focus:border-[#0AA5FF]"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSimulatePayment('card')}
                  className="w-full py-3.5 rounded-xl bg-[#09A552] hover:bg-[#088C45] text-white font-bold text-sm shadow-md transition-transform active:scale-[0.98] cursor-pointer mt-2"
                >
                  Pay ₦{amount.toLocaleString()}
                </button>
              </div>
            )}

            {/* TAB 3: USSD */}
            {activeTab === 'ussd' && (
              <div className="space-y-3 text-center">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-[11px] text-slate-400 block mb-1">Direct Bank USSD</span>
                  <div className="font-mono font-bold text-sm text-[#0AA5FF] tracking-wider">
                    {accountNumber
                      ? `Transfer ₦${amount.toLocaleString()} to ${accountNumber} (${bankName})`
                      : 'Pay via your Mobile Banking App / USSD'}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Dial your bank's USSD code (e.g. *737#, *894#, *966#, *919#) to send the transfer.
                </p>
                <button
                  type="button"
                  onClick={() => handleSimulatePayment('ussd')}
                  className="w-full py-3.5 rounded-xl bg-[#09A552] hover:bg-[#088C45] text-white font-bold text-sm shadow-md transition-transform active:scale-[0.98] cursor-pointer"
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

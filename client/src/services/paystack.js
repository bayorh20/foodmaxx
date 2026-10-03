// Environment or default Paystack configuration
const FALLBACK_PAYSTACK_KEY = 'pk_test_0d51ae7f44721724cc8375bb68e04b306ef70928';
const ENV_PAYSTACK_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_PAYSTACK_PUBLIC_KEY) || '';
const DEFAULT_PAYSTACK_KEY = ENV_PAYSTACK_KEY || FALLBACK_PAYSTACK_KEY;

const memoryStore = {};
const safeStorage = {
  getItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) return window.localStorage.getItem(key);
    } catch (e) {}
    return memoryStore[key] || null;
  },
  setItem(key, value) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, String(value));
        return;
      }
    } catch (e) {}
    memoryStore[key] = String(value);
  }
};
const localStorage = safeStorage;

/**
 * Validate format of Paystack public key
 */
export function isValidPaystackKey(key) {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  return (trimmed.startsWith('pk_live_') || trimmed.startsWith('pk_test_')) && trimmed.length >= 24;
}

/**
 * Get active Paystack configuration from localStorage, environment, or default
 */
export function getStoredPaystackConfig() {
  if (typeof window === 'undefined') {
    return {
      publicKey: DEFAULT_PAYSTACK_KEY,
      isLive: DEFAULT_PAYSTACK_KEY.startsWith('pk_live_'),
      currency: 'NGN'
    };
  }

  try {
    const stored = localStorage.getItem('fmx_paystack_config');
    if (stored) {
      const parsed = JSON.parse(stored);
      let activeKey = (parsed.publicKey || ENV_PAYSTACK_KEY || DEFAULT_PAYSTACK_KEY).trim();
      if (activeKey === 'pk_test_d3a8b4172f3e44955b2046ff03b55237b6cf3e1a') {
        activeKey = DEFAULT_PAYSTACK_KEY;
      }
      return {
        publicKey: activeKey,
        isLive: parsed.isLive !== undefined ? parsed.isLive : activeKey.startsWith('pk_live_'),
        currency: parsed.currency || 'NGN'
      };
    }
  } catch (e) {}

  return {
    publicKey: DEFAULT_PAYSTACK_KEY,
    isLive: DEFAULT_PAYSTACK_KEY.startsWith('pk_live_'),
    currency: 'NGN'
  };
}

/**
 * Save Paystack configuration (from Admin Dashboard settings)
 */
export function savePaystackConfig(config) {
  if (typeof window === 'undefined') return;
  const current = getStoredPaystackConfig();
  const next = { ...current, ...config };
  localStorage.setItem('fmx_paystack_config', JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('fmx_paystack_config_updated', { detail: next }));
  return next;
}

/**
 * Launch Real Official Paystack Native Inline Checkout
 */
export async function launchRealPaystack({
  key,
  email,
  amount,
  reference,
  customerName,
  phone,
  metadata = {},
  onSuccess,
  onCancel,
  onError
}) {
  const config = getStoredPaystackConfig();
  const activeKey = (key || config.publicKey || DEFAULT_PAYSTACK_KEY).trim();
  const amountInKobo = Math.round(Number(amount) * 100);

  if (!activeKey) {
    if (onError) onError(new Error('Paystack Public Key is missing. Configure it in Admin Settings.'));
    return;
  }

  if (!email) {
    if (onError) onError(new Error('Customer email is required for Paystack checkout.'));
    return;
  }

  if (!amountInKobo || amountInKobo <= 0) {
    if (onError) onError(new Error('Invalid order amount for Paystack checkout.'));
    return;
  }

  const txRef = reference || `FMX_PSTK_${Date.now()}_${Math.floor(100000 + Math.random() * 900000)}`;

  // Priority 1: Main native Paystack Screen (window.PaystackPop.setup)
  // This is the default, standard native Paystack iframe popup known across all Paystack apps
  if (typeof window !== 'undefined' && window.PaystackPop && typeof window.PaystackPop.setup === 'function') {
    try {
      const handler = window.PaystackPop.setup({
        key: activeKey,
        email: email.trim(),
        amount: amountInKobo,
        currency: 'NGN',
        ref: txRef,
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
        metadata: {
          custom_fields: [
            { display_name: 'Customer Name', variable_name: 'customer_name', value: customerName || 'FoodMaxx Customer' },
            { display_name: 'Customer Phone', variable_name: 'customer_phone', value: phone || '' },
            ...(metadata.custom_fields || [])
          ],
          ...metadata
        },
        callback: (transaction) => {
          if (onSuccess) {
            onSuccess({
              reference: transaction.reference || transaction.trxref || txRef,
              status: 'success',
              trans: transaction.trans,
              transaction: transaction.transaction,
              message: transaction.message || 'Approved'
            });
          }
        },
        onClose: () => {
          if (onCancel) onCancel();
        }
      });
      handler.openIframe();
      return;
    } catch (setupErr) {
      console.warn('PaystackPop.setup failed, falling back to new PaystackPop:', setupErr);
    }
  }

  // Priority 2: PaystackPop instance via @paystack/inline-js
  try {
    const { default: PaystackPop } = await import('@paystack/inline-js');
    const paystack = new PaystackPop();
    if (typeof paystack.checkout === 'function') {
      paystack.checkout({
        key: activeKey,
        email: email.trim(),
        amount: amountInKobo,
        currency: 'NGN',
        reference: txRef,
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
        metadata: {
          custom_fields: [
            { display_name: 'Customer Name', variable_name: 'customer_name', value: customerName || 'FoodMaxx Customer' },
            { display_name: 'Customer Phone', variable_name: 'customer_phone', value: phone || '' },
            ...(metadata.custom_fields || [])
          ],
          ...metadata
        },
        onSuccess: (transaction) => {
          if (onSuccess) {
            onSuccess({
              reference: transaction.reference || txRef,
              status: 'success',
              trans: transaction.trans,
              transaction: transaction.transaction,
              message: transaction.message || 'Approved'
            });
          }
        },
        onCancel: () => {
          if (onCancel) onCancel();
        }
      }).catch(() => {
        window.dispatchEvent(new CustomEvent('fmx_open_paystack_modal', {
          detail: { key: activeKey, email, amount, reference: txRef, customerName, phone, metadata, onSuccess, onCancel }
        }));
      });
      return;
    }
  } catch (err) {
    console.warn('Paystack checkout initialization error:', err);
  }

  // Priority 3: Fallback interactive Paystack modal directly in app
  window.dispatchEvent(new CustomEvent('fmx_open_paystack_modal', {
    detail: { key: activeKey, email, amount, reference: txRef, customerName, phone, metadata, onSuccess, onCancel }
  }));
}


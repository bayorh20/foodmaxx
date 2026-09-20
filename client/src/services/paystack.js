import PaystackPop from '@paystack/inline-js';

// Environment or default Paystack configuration
const ENV_PAYSTACK_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_PAYSTACK_PUBLIC_KEY) || '';
const DEFAULT_PAYSTACK_KEY = ENV_PAYSTACK_KEY || '';

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
      secretKey: '',
      isLive: DEFAULT_PAYSTACK_KEY.startsWith('pk_live_'),
      currency: 'NGN'
    };
  }

  try {
    const stored = localStorage.getItem('fmx_paystack_config');
    if (stored) {
      const parsed = JSON.parse(stored);
      const activeKey = parsed.publicKey || ENV_PAYSTACK_KEY || DEFAULT_PAYSTACK_KEY;
      return {
        publicKey: activeKey,
        secretKey: parsed.secretKey || '',
        isLive: parsed.isLive !== undefined ? parsed.isLive : activeKey.startsWith('pk_live_'),
        currency: parsed.currency || 'NGN'
      };
    }
  } catch (e) {}

  return {
    publicKey: DEFAULT_PAYSTACK_KEY,
    secretKey: '',
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
 * Launch Real Official Paystack Inline Checkout
 */
export function launchRealPaystack({
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
  const activeKey = key || config.publicKey || DEFAULT_PAYSTACK_KEY;
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

  try {
    const paystack = new PaystackPop();
    paystack.newTransaction({
      key: activeKey,
      publicKey: activeKey,
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
      },
      onError: (err) => {
        console.warn('Paystack inline error:', err);
        if (onError) onError(err);
      }
    });
  } catch (err) {
    console.warn('PaystackPop instance error, trying fallback:', err);
    if (typeof window !== 'undefined' && window.PaystackPop) {
      try {
        if (typeof window.PaystackPop.setup === 'function') {
          const handler = window.PaystackPop.setup({
            key: activeKey,
            publicKey: activeKey,
            email: email.trim(),
            amount: amountInKobo,
            currency: 'NGN',
            ref: txRef,
            channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
            metadata,
            callback: (response) => {
              if (onSuccess) {
                onSuccess({
                  reference: response.reference || txRef,
                  status: 'success'
                });
              }
            },
            onClose: () => {
              if (onCancel) onCancel();
            }
          });
          handler.openIframe();
          return;
        }
      } catch (fallbackErr) {
        if (onError) onError(fallbackErr);
        return;
      }
    }
    if (onError) onError(err);
  }
}

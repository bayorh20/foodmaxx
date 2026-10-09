const LIVE_PAYSTACK_KEY = 'pk_live_d3a8b4172f3e44955b2046ff03b55237b6cf3e1a';
const TEST_PAYSTACK_KEY = 'pk_test_0d51ae7f44721724cc8375bb68e04b306ef70928';
const ENV_PAYSTACK_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_PAYSTACK_PUBLIC_KEY) || '';
const DEFAULT_PAYSTACK_KEY = (ENV_PAYSTACK_KEY && ENV_PAYSTACK_KEY.trim().startsWith('pk_'))
  ? ENV_PAYSTACK_KEY.trim()
  : LIVE_PAYSTACK_KEY;

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
      const activeKey = (parsed.publicKey || ENV_PAYSTACK_KEY || DEFAULT_PAYSTACK_KEY).trim();
      return {
        publicKey: activeKey,
        isLive: parsed.isLive !== undefined ? parsed.isLive : activeKey.startsWith('pk_live_'),
        currency: parsed.currency || 'NGN'
      };
    }
  } catch (e) {}

  try {
    const storeSettingsRaw = localStorage.getItem('fmx_store_settings');
    if (storeSettingsRaw) {
      const parsedStore = JSON.parse(storeSettingsRaw);
      if (parsedStore.paystack_public_key && isValidPaystackKey(parsedStore.paystack_public_key)) {
        const pKey = parsedStore.paystack_public_key.trim();
        return {
          publicKey: pKey,
          isLive: parsedStore.paystack_is_live !== undefined ? parsedStore.paystack_is_live : pKey.startsWith('pk_live_'),
          currency: 'NGN'
        };
      }
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
 * Dynamically load Paystack inline script if not yet loaded
 */
function loadPaystackScript() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.PaystackPop) return resolve(true);

    const existingScript = document.querySelector('script[src*="paystack.co"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(Boolean(window.PaystackPop)));
      existingScript.addEventListener('error', () => resolve(false));
      setTimeout(() => resolve(Boolean(window.PaystackPop)), 2500);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve(Boolean(window.PaystackPop));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
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
  onError,
  onFallback
}) {
  const config = getStoredPaystackConfig();
  const activeKey = (key || config.publicKey || DEFAULT_PAYSTACK_KEY).trim();
  const amountInKobo = Math.round(Number(amount) * 100);

  const fallbackPayload = {
    key: activeKey,
    email: (email && email.includes('@')) ? email.trim() : `${(phone || 'customer').replace(/\D/g, '') || 'diner'}@foodmaxx.ng`,
    amount,
    reference: reference || `FMX_PSTK_${Date.now()}_${Math.floor(100000 + Math.random() * 900000)}`,
    customerName,
    phone,
    metadata,
    onSuccess,
    onCancel
  };

  const triggerFallback = () => {
    if (typeof onFallback === 'function') {
      onFallback(fallbackPayload);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fmx_open_paystack_modal', {
        detail: fallbackPayload
      }));
    }
  };

  if (!activeKey) {
    triggerFallback();
    return;
  }

  // Ensure valid email for Paystack (fallback if phone-only guest)
  const cleanEmail = fallbackPayload.email;

  if (!amountInKobo || amountInKobo <= 0) {
    if (onError) onError(new Error('Invalid order amount for Paystack checkout.'));
    return;
  }

  const txRef = fallbackPayload.reference;

  // Try loading external inline script
  try {
    await loadPaystackScript();
  } catch (loadErr) {
    console.warn('Paystack script load error:', loadErr);
  }

  // Method A: window.PaystackPop.setup (Official standard inline popup v1)
  if (typeof window !== 'undefined' && window.PaystackPop && typeof window.PaystackPop.setup === 'function') {
    try {
      let isClosed = false;
      const handler = window.PaystackPop.setup({
        key: activeKey,
        email: cleanEmail,
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
          isClosed = true;
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
          if (!isClosed && onCancel) {
            onCancel();
          }
        }
      });

      if (handler && typeof handler.openIframe === 'function') {
        handler.openIframe();
        return;
      }
    } catch (setupErr) {
      console.warn('PaystackPop.setup encountered issue:', setupErr);
    }
  }

  // Method B: PaystackPop newTransaction via @paystack/inline-js v2
  try {
    const paystackModule = await import('@paystack/inline-js');
    const PaystackPop = paystackModule.default || paystackModule;
    if (PaystackPop) {
      const paystack = new PaystackPop();
      if (typeof paystack.newTransaction === 'function') {
        paystack.newTransaction({
          key: activeKey,
          email: cleanEmail,
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
                message: transaction.message || 'Approved'
              });
            }
          },
          onCancel: () => {
            if (onCancel) onCancel();
          },
          onError: (err) => {
            console.warn('PaystackPop error event, triggering in-app fallback:', err);
            triggerFallback();
          }
        });
        return;
      }
    }
  } catch (err) {
    console.warn('Paystack inline-js dynamic import issue:', err);
  }

  // Method C: In-app Paystack Transfer & Card fallback sheet
  triggerFallback();
}


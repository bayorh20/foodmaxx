import { db } from './firebaseDb.js';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

// Default application copy dictionary organized into logical categories
export const DEFAULT_APP_CONTENT = {
  customer_hero: {
    hero_badge: {
      label: 'Hero Badge Tag',
      desc: 'Top pill badge on customer home screen',
      value: 'FoodMaxx Kitchen & Grills · Ibadan'
    },
    hero_title: {
      label: 'Main Headline',
      desc: 'Primary headline on the hero banner',
      value: 'Gourmet Party Jollof & Grills Delivered Fast'
    },
    hero_subtitle: {
      label: 'Hero Subtitle',
      desc: 'Supporting description under the main headline',
      value: 'Authentic smoky firewood jollof, tender asun, peppered turkey & gourmet treats delivered piping hot across Ibadan.'
    },
    search_placeholder: {
      label: 'Search Input Placeholder',
      desc: 'Placeholder text inside the search bar',
      value: 'Search smoky jollof, asun, peppered turkey, drinks...'
    },
    promo_banner_code: {
      label: 'Promo Banner Coupon Code',
      desc: 'Optional code highlighted in the top announcement bar',
      value: ''
    },
    promo_banner_text: {
      label: 'Promo Banner Description',
      desc: 'Text explaining the promotion in the top banner',
      value: 'Fresh smoky jollof, tender grills & treats'
    }
  },
  customer_tracking: {
    tracking_modal_title: {
      label: 'Tracking Modal Header',
      desc: 'Top header in the live tracking screen',
      value: 'Live Tracking'
    },
    step_placed_title: {
      label: 'Step 1 Label',
      desc: 'First milestone title',
      value: 'Placed'
    },
    step_placed_desc: {
      label: 'Step 1 Subtitle',
      desc: 'Status text when order is confirmed',
      value: 'Order confirmed & sent to kitchen'
    },
    step_kitchen_title: {
      label: 'Step 2 Label',
      desc: 'Second milestone title',
      value: 'Kitchen'
    },
    step_kitchen_desc: {
      label: 'Step 2 Subtitle',
      desc: 'Status text when kitchen is cooking',
      value: 'FoodMaxx kitchen is cooking your meal'
    },
    step_transit_title: {
      label: 'Step 3 Label',
      desc: 'Third milestone title',
      value: 'On the Way'
    },
    step_transit_desc: {
      label: 'Step 3 Subtitle',
      desc: 'Status text when rider is en route',
      value: 'Rider is on the way to your door'
    },
    step_delivered_title: {
      label: 'Step 4 Label',
      desc: 'Fourth milestone title',
      value: 'Delivered'
    },
    step_delivered_desc: {
      label: 'Step 4 Subtitle',
      desc: 'Status text when meal is received',
      value: 'Meal Delivered · Enjoy your food!'
    },
    pin_label: {
      label: 'Delivery PIN Label',
      desc: 'Label for customer delivery confirmation code',
      value: 'Delivery Verification PIN'
    },
    pin_instruction: {
      label: 'Delivery PIN Instructions',
      desc: 'Help text shown under the delivery PIN',
      value: 'Share this 4-digit code with your rider upon arrival to complete delivery.'
    }
  },
  customer_checkout: {
    checkout_header: {
      label: 'Checkout Title',
      desc: 'Header of the checkout screen',
      value: 'Checkout'
    },
    delivery_instructions_placeholder: {
      label: 'Special Instructions Placeholder',
      desc: 'Placeholder in checkout notes field',
      value: 'E.g. Call when outside gate, leave at security post, please add extra cutlery...'
    },
    landmark_label: {
      label: 'Landmark Label',
      desc: 'Label for the delivery landmark field',
      value: 'Landmark & Directions'
    },
    paystack_cta_label: {
      label: 'Payment Button Text',
      desc: 'Primary button text to launch Paystack',
      value: 'Paystack Secure Checkout'
    },
    cart_empty_title: {
      label: 'Empty Cart Title',
      desc: 'Heading when cart has no items',
      value: 'Your cart is empty'
    },
    cart_empty_desc: {
      label: 'Empty Cart Description',
      desc: 'Help text encouraging customer to add food',
      value: 'Explore our smoky jollof, gourmet grills, and chilled drinks to get started!'
    }
  },
  admin_ops: {
    admin_title: {
      label: 'Admin Brand Header',
      desc: 'Title displayed in the admin top navigation',
      value: 'FoodMaxx Operations'
    },
    kitchen_announcement: {
      label: 'Store Announcement Banner',
      desc: 'Operational bulletin banner text',
      value: 'Fresh firewood party jollof & gourmet grills ready for immediate delivery across Ibadan!'
    },
    quick_actions_title: {
      label: 'Overview Quick Actions Title',
      desc: 'Heading for the 1-click actions hub in admin',
      value: 'Order Management Quick Actions'
    },
    kitchen_open_label: {
      label: 'Kitchen Open Status',
      desc: 'Badge text when kitchen is accepting orders',
      value: 'Kitchen Accepting Orders'
    },
    kitchen_busy_label: {
      label: 'Kitchen Paused Status',
      desc: 'Badge text when kitchen orders are paused',
      value: 'Kitchen Busy (Paused)'
    }
  },
  support_chat: {
    chat_header_title: {
      label: 'Chat Header Title',
      desc: 'Header for the customer chat drawer',
      value: 'Live Dispatch & Support'
    },
    chat_empty_prompt: {
      label: 'Chat Empty Placeholder',
      desc: 'Text shown before any messages are sent',
      value: 'Need directions or special food packaging? Chat directly with the FoodMaxx dispatch team.'
    },
    chat_composer_placeholder: {
      label: 'Chat Input Placeholder',
      desc: 'Placeholder inside chat text box',
      value: 'Type your message to FoodMaxx...'
    }
  }
};

const STORAGE_KEY = 'fmx_app_content_v1';
const FIRESTORE_DOC_PATH = ['settings', 'app_content'];

/**
 * Deeply merges any incoming content (from Firestore or localStorage)
 * with the DEFAULT_APP_CONTENT schema to ensure every key and category always exists.
 */
export function mergeWithDefaults(raw) {
  const merged = {};
  for (const cat of Object.keys(DEFAULT_APP_CONTENT)) {
    merged[cat] = {};
    for (const key of Object.keys(DEFAULT_APP_CONTENT[cat])) {
      const def = DEFAULT_APP_CONTENT[cat][key];
      const incoming = raw?.[cat]?.[key];
      if (typeof incoming === 'object' && incoming !== null) {
        merged[cat][key] = {
          label: incoming.label || def.label,
          desc: incoming.desc || def.desc,
          value: incoming.value !== undefined ? String(incoming.value) : def.value
        };
      } else if (typeof incoming === 'string') {
        merged[cat][key] = {
          ...def,
          value: incoming
        };
      } else {
        merged[cat][key] = { ...def };
      }
    }
  }
  return merged;
}

// Read stored content with defaults fallback
export function getAppContent() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return mergeWithDefaults(parsed);
      }
    }
  } catch (e) {
    console.warn('Error reading local app content:', e);
  }
  return mergeWithDefaults({});
}

// Helper to quickly and safely retrieve any copy value with fallback
export function getCopy(content, category, key, fallback = '') {
  return content?.[category]?.[key]?.value || fallback || DEFAULT_APP_CONTENT[category]?.[key]?.value || '';
}

// Save content updates to localStorage and Firestore
export async function saveAppContent(newContent) {
  const merged = mergeWithDefaults(newContent);

  // 1. Immediately cache locally & notify all components and listeners in current window
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent('fmx_app_content_updated', { detail: merged }));
    }
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }

  // 2. Persist to Firestore settings/app_content for cross-device sync
  try {
    const docRef = doc(db, FIRESTORE_DOC_PATH[0], FIRESTORE_DOC_PATH[1]);
    await setDoc(docRef, {
      content: merged,
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.error('Firestore app content sync error:', e);
    throw new Error('Cloud sync failed: ' + (e.message || 'Network error'));
  }

  return merged;
}

// Fetch live from Firestore
export async function fetchLiveAppContent() {
  try {
    const docRef = doc(db, FIRESTORE_DOC_PATH[0], FIRESTORE_DOC_PATH[1]);
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data()?.content) {
      const liveData = snap.data().content;
      const merged = mergeWithDefaults(liveData);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          window.dispatchEvent(new CustomEvent('fmx_app_content_updated', { detail: merged }));
        }
      } catch (e) {}
      return merged;
    }
  } catch (e) {
    console.warn('Could not fetch live app content:', e.message);
  }
  return getAppContent();
}

/**
 * Real-time Firestore subscription for app content.
 * Fires whenever admin publishes copy changes, syncing live to all customer devices.
 */
export function subscribeLiveAppContent(callback) {
  if (typeof window === 'undefined' || !db) return () => {};

  // First invoke callback with local cached data immediately so UI is responsive
  try {
    const cached = getAppContent();
    if (cached) callback(cached);
  } catch (e) {}

  try {
    const docRef = doc(db, FIRESTORE_DOC_PATH[0], FIRESTORE_DOC_PATH[1]);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists() && snap.data()?.content) {
        const liveData = snap.data().content;
        const merged = mergeWithDefaults(liveData);
        try {
          if (window.localStorage) {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            window.dispatchEvent(new CustomEvent('fmx_app_content_updated', { detail: merged }));
          }
        } catch (e) {}
        callback(merged);
      }
    }, (error) => {
      console.warn('Firestore live app content subscription warning:', error);
    });

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to live app content:', err);
    return () => {};
  }
}

// Reset specific category or all to defaults
export async function resetAppContent(category = null) {
  const current = getAppContent();
  if (category && DEFAULT_APP_CONTENT[category]) {
    current[category] = { ...DEFAULT_APP_CONTENT[category] };
  } else {
    for (const cat of Object.keys(DEFAULT_APP_CONTENT)) {
      current[cat] = { ...DEFAULT_APP_CONTENT[cat] };
    }
  }
  await saveAppContent(current);
  return current;
}

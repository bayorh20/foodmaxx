/**
 * FOODMAXX CENTRAL STORE CONFIGURATION & DUMMY DETAILS MANAGER
 * 
 * All components (Checkout, Support, Admin Portal, WhatsApp dispatch, 
 * Receipts, and Payment modals) reference this configuration.
 */

export const DEFAULT_STORE_DETAILS = {
  // 1. BRAND IDENTITY
  store_name: 'FoodMaxx Food Delivery',
  tagline: 'Your Favourite Food Delivery Plug!',
  slogan: 'We Serve Joy on a Platter!',

  // 2. CONTACT & DISPATCH
  phone: '0816 600 4281',
  whatsapp_dispatch: '0816 600 4281',
  support_email: 'orders@foodmaxx.ng',

  // 3. PHYSICAL LOCATION & OPERATING HOURS
  address: 'Ibadan, Oyo state',
  city: 'Ibadan',
  opening_time: '08:00',
  closing_time: '23:00',
  prep_time_minutes: 20,

  // 4. BANK TRANSFER & USSD DETAILS (FALLBACK PAYMENT)
  payout_bank_name: 'Moniepoint',
  payout_account_number: '8166004281',
  payout_account_name: 'Foodmaxx Restaurant',

  // 5. RECEIPT & CATERING MESSAGES
  receipt_header_note: 'FoodMaxx Food Delivery',
  receipt_footer_note: 'Thank you for ordering with FoodMaxx. ❤️',
  announcement: 'Fresh and hot meals ready for immediate delivery across Ibadan!',

  // 6. PRICING & ORDER POLICIES
  min_order_amount: 1500,
  packaging_fee: 300,
  service_fee: 150,
  free_delivery_threshold: 15000,
  auto_confirm_paid_orders: true,
  allow_preorders: true,
  max_active_orders: 40,
  is_open: true,
  isOpen: true,
  kitchen_status: 'open',

  // 6b. GROUP ORDERING CONTROLS
  enable_group_ordering: true,
  group_order_min_spend: 3000,
  group_order_max_members: 15,
  group_order_max_items_per_member: 10,
  group_order_label_bags: true,
  group_order_discount_percent: 0,
  group_order_discount_min_people: 3,
  group_order_allow_guest_join: true,
  group_order_pause_message: 'Group ordering is temporarily paused by the manager during peak rush hours.',
  group_order_free_delivery_threshold: 15000,
  group_order_enable_happy_avatars: true,
  group_order_require_host_ready: true,

  // 7. PAYMENT GATEWAY (PAYSTACK)
  paystack_public_key: 'pk_live_d3a8b4172f3e44955b2046ff03b55237b6cf3e1a',
  paystack_is_live: true,
  enable_paystack: true,
  enable_bank_transfer: true,
  enable_cash_on_delivery: true,

  // 8. SECURITY & ACCESS
  admin_password: 'admin',
  kitchen_staff_pin: '1234',
  require_delivery_otp: true,

  // 9. SOUND & NOTIFICATIONS
  sound_alert_enabled: true,
  kitchen_chime_volume: 85,
  notification_tone_id: 'chime_standard',
  whatsapp_notify_customer: true,
  whatsapp_order_placed_msg: 'Hello {customer_name}! Your FoodMaxx order #{order_ref} for {amount} has been received and confirmed. Chef is prepping now! 🍳',
  whatsapp_dispatched_msg: 'Hi {customer_name}! Rider {rider_name} ({rider_phone}) is on the way with your hot FoodMaxx meal! Delivery PIN: {delivery_pin}. 🛵',
  whatsapp_delivered_msg: 'Order #{order_ref} delivered! Bon appétit from FoodMaxx Ibadan. Rate your experience: https://foodmaxxapp.web.app 🍔',

  // 10. HARDWARE & PRINTING
  thermal_printer_enabled: true,
  thermal_paper_size: '58mm',
  auto_print_on_confirm: false,

  // 11. DELAY APOLOGY / COMPENSATION
  late_delivery_enabled: true,
  late_delivery_threshold_mins: 35,
  late_compensation_type: 'discount_code',
  late_discount_percent: 20,
  late_discount_amount: 500,
  late_promo_code_prefix: 'SORRY',
  late_apology_tone: 'warm',
  late_whatsapp_template: 'Dear {customer_name}, we sincerely apologize that your FoodMaxx order #{order_ref} is experiencing an unexpected delay ({delay_minutes} mins). Chef is speeding up your hot meal right now! 🙏 To make it up to you, please enjoy {compensation_val} on your next order with coupon code *{coupon_code}*. Plus, we have included {free_item} on the house! Thank you for dining with FoodMaxx Ibadan. 🍲',
  late_include_free_item: true,
  late_free_item_name: 'Complimentary Chilled Soft Drink / Extra Dodo',
  late_auto_generate_coupon: true
};

const STORAGE_KEY = 'fmx_store_settings';

/**
 * Retrieves the current store details, merging stored custom overrides with defaults.
 * Automatically cleanses legacy placeholder strings.
 */
export function getStoreDetails() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = window.localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Cleanse legacy dummy placeholders if previously cached in the browser
        if (parsed.payout_account_number === '0123456789') delete parsed.payout_account_number;
        if (parsed.payout_bank_name === 'Guaranty Trust Bank (GTBank)') delete parsed.payout_bank_name;
        if (parsed.payout_account_name === 'FoodMaxx Kitchen Ltd') delete parsed.payout_account_name;
        if (parsed.phone === '+234 802 345 6789') delete parsed.phone;
        if (parsed.whatsapp_dispatch === '+234 812 345 6789') delete parsed.whatsapp_dispatch;
        if (parsed.address === '24 Awolowo Avenue, Old Bodija, Ibadan, Oyo State') delete parsed.address;
        if (parsed.store_name === 'FoodMaxx Kitchen & Grills') delete parsed.store_name;
        if (parsed.tagline === 'Fastest Fresh Food Delivery in Ibadan') delete parsed.tagline;
        if (parsed.slogan === 'Authentic Firewood Jollof & Gourmet Grills') delete parsed.slogan;
        if (parsed.receipt_header_note === 'FOODMAXX IBD - FRESH & HOT') delete parsed.receipt_header_note;
        if (parsed.receipt_footer_note?.includes('08023456789') || parsed.receipt_footer_note?.includes('+234 802 345 6789')) delete parsed.receipt_footer_note;
        if (parsed.announcement?.includes('firewood party jollof & gourmet grills')) delete parsed.announcement;

        return { ...DEFAULT_STORE_DETAILS, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Failed to read store details from localStorage:', e);
  }
  return { ...DEFAULT_STORE_DETAILS };
}

/**
 * Updates store details, saves to localStorage, and broadcasts an update event.
 */
export function updateStoreDetails(updates) {
  try {
    const current = getStoreDetails();
    const updated = { ...current, ...updates, updated_at: new Date().toISOString() };
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('fmx_store_details_updated', { detail: updated }));
      window.dispatchEvent(new CustomEvent('fmx_store_settings_updated', { detail: updated }));
    }
    return updated;
  } catch (e) {
    console.error('Failed to save store details:', e);
    return getStoreDetails();
  }
}

/**
 * Resets store details back to defaults.
 */
export function resetStoreDetails() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('fmx_store_details_updated', { detail: DEFAULT_STORE_DETAILS }));
      window.dispatchEvent(new CustomEvent('fmx_store_settings_updated', { detail: DEFAULT_STORE_DETAILS }));
    }
  } catch (e) {}
  return { ...DEFAULT_STORE_DETAILS };
}

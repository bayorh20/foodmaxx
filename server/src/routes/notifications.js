const express = require('express');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

/**
 * Normalizes phone number into international WhatsApp format (e.g. 2348012345678)
 */
function normalizeWhatsAppPhone(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '234' + cleaned.slice(1);
  } else if (cleaned.length === 10) {
    cleaned = '234' + cleaned;
  }
  return cleaned;
}

/**
 * Pre-formatted templates for each order lifecycle state
 */
const WHATSAPP_TEMPLATES = {
  ORDER_PLACED: (o) => `*FOODMAXX ORDER RECEIVED!* 🛍️\nHello *${o.customer_name || 'Customer'}*, your order *#${o.order_ref}* has been received! Total: ₦${Number(o.total || 0).toLocaleString()}. Live tracking: ${o.tracking_url}`,
  CONFIRMED: (o) => `*FOODMAXX ORDER CONFIRMED!* 🛍️🍲\nHello *${o.customer_name || 'Customer'}*, your order *#${o.order_ref}* has been confirmed by FoodMaxx! Our kitchen will begin preparing your meal shortly.\n\n📍 Delivery: ${o.delivery_address || 'Ibadan'}\n📲 Live Tracking:\n${o.tracking_url}`,
  PREPARING: (o) => `*FOODMAXX KITCHEN UPDATE* 🍳🔥\nHello *${o.customer_name || 'Customer'}*, your order *#${o.order_ref}* is now cooking in our Bodija kitchen!\n${o.notes ? `💬 Note: ${o.notes}\n` : ''}📲 Track live progress:\n${o.tracking_url}`,
  READY_FOR_PICKUP: (o) => `*ORDER PACKED & READY!* 📦✨\nHello *${o.customer_name || 'Customer'}*, your order *#${o.order_ref}* is packaged hot and waiting for courier dispatch.\n📲 ${o.tracking_url}`,
  ON_THE_WAY: (o) => `*YOUR RIDER IS ON THE WAY!* 🛵💨\nHello *${o.customer_name || 'Customer'}*, your order *#${o.order_ref}* is on the way!\n${o.rider_name ? `🛵 Rider: ${o.rider_name} (${o.rider_phone || 'Courier'})\n` : ''}${o.otp ? `🔐 Your Delivery Security PIN: *${o.otp}*\n(Give this PIN to rider only after receiving food)\n` : ''}📲 Live Courier Map:\n${o.tracking_url}`,
  ARRIVING_SOON: (o) => `*RIDER ARRIVING AT YOUR GATE!* 🏡🔔\nHello *${o.customer_name || 'Customer'}*, rider has arrived at your location for order *#${o.order_ref}*!\n${o.otp ? `🔐 PIN: *${o.otp}*\n` : ''}Please meet the rider to collect your food. Enjoy! 🍽️`,
  DELIVERED: (o) => `*ORDER DELIVERED!* 🎉🍽️\nHello *${o.customer_name || 'Customer'}*, order *#${o.order_ref}* has been delivered!\nThank you for dining with FoodMaxx! Rate your experience:\n${o.tracking_url}&rate=true`,
  CANCELLED: (o) => `*FOODMAXX ORDER CANCELLED* ⚠️\nHello *${o.customer_name || 'Customer'}*, order *#${o.order_ref}* was cancelled.\n${o.notes ? `Reason: ${o.notes}\n` : ''}Details: ${o.tracking_url}`
};

// ============================================================
// 1. IN-APP NOTIFICATIONS
// ============================================================
router.get('/', requireAuth, (req, res) => {
  try {
    const notifs = db.query('notifications', n => n.user_id === req.user.userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 30);
    res.json({ success: true, data: notifs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 2. WHATSAPP ORDER STATUS NOTIFICATION API
// ============================================================

/**
 * GET /api/notifications/whatsapp/templates
 * Returns all status templates
 */
router.get('/whatsapp/templates', (req, res) => {
  res.json({
    success: true,
    statuses: Object.keys(WHATSAPP_TEMPLATES),
    preview: {
      CONFIRMED: WHATSAPP_TEMPLATES.CONFIRMED({
        customer_name: 'Adebayo',
        order_ref: 'FMX-7824',
        total: 8500,
        delivery_address: 'Bodija, Ibadan',
        tracking_url: 'https://foodmaxxapp.web.app?track=FMX-7824'
      })
    }
  });
});

/**
 * POST /api/notifications/whatsapp/send-status
 * Dispatches or formats WhatsApp order status notification
 */
router.post('/whatsapp/send-status', (req, res) => {
  try {
    const {
      orderId,
      orderRef,
      phone,
      status,
      customerName,
      riderName,
      riderPhone,
      otp,
      notes,
      totalAmount,
      deliveryAddress,
      customMessage
    } = req.body;

    const normPhone = normalizeWhatsAppPhone(phone);
    const trackingUrl = `https://foodmaxxapp.web.app?track=${orderRef || orderId || ''}`;

    let message = customMessage;
    if (!message) {
      const templateFn = WHATSAPP_TEMPLATES[status] || WHATSAPP_TEMPLATES.CONFIRMED;
      message = templateFn({
        customer_name: customerName,
        order_ref: orderRef || orderId,
        total: totalAmount,
        delivery_address: deliveryAddress,
        rider_name: riderName,
        rider_phone: riderPhone,
        otp: otp,
        notes: notes,
        tracking_url: trackingUrl
      });
    }

    const waUrl = normPhone ? `https://wa.me/${normPhone}?text=${encodeURIComponent(message)}` : null;

    // Record notification log
    const logEntry = {
      id: `walog_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      order_id: orderId || null,
      order_ref: orderRef || null,
      phone: normPhone,
      customer_name: customerName || 'Customer',
      status: status || 'UPDATED',
      message: message,
      wa_url: waUrl,
      created_at: new Date().toISOString()
    };

    try {
      db.insert('whatsapp_logs', logEntry);
    } catch (e) {
      // In-memory or logging fallback
    }

    res.json({
      success: true,
      data: {
        logId: logEntry.id,
        phone: normPhone,
        message,
        wa_url: waUrl,
        tracking_url: trackingUrl
      }
    });
  } catch (err) {
    console.error('WhatsApp send-status error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/notifications/whatsapp/logs
 * Retrieve recent WhatsApp dispatches
 */
router.get('/whatsapp/logs', (req, res) => {
  try {
    const logs = db.query('whatsapp_logs', () => true)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

// ============================================================
// 3. WEB PUSH NOTIFICATION SUBSCRIPTION API
// ============================================================
router.post('/web-push/subscribe', requireAuth, (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription) {
      return res.status(400).json({ success: false, error: 'Please enable notifications in your browser.' });
    }
    // Save web push subscription for user
    db.insert('push_subscriptions', {
      id: `sub_${Date.now()}`,
      user_id: req.user.userId,
      subscription,
      created_at: new Date().toISOString()
    });
    res.json({ success: true, message: 'Browser notifications turned on successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 4. SMS NOTIFICATION GATEWAY API (Termii & Twilio)
// ============================================================
const { dispatchSms } = require('../services/smsNotificationSdk');

/**
 * POST /api/notifications/sms/send
 */
router.post('/sms/send', async (req, res) => {
  try {
    const { phone, message, provider, apiKey, senderId, accountSid, authToken, from } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ success: false, error: 'Please provide a phone number and message.' });
    }
    const result = await dispatchSms({ phone, message, provider, apiKey, senderId, accountSid, authToken, from });
    res.json({ success: result.success !== false, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/notifications/sms/send-order-status
 */
router.post('/sms/send-order-status', async (req, res) => {
  try {
    const { orderId, orderRef, phone, status, message, provider, apiKey, senderId, accountSid, authToken, from } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ success: false, error: 'Please provide a phone number and message.' });
    }
    const result = await dispatchSms({ phone, message, provider, apiKey, senderId, accountSid, authToken, from });

    try {
      db.insert('sms_logs', {
        id: `smslog_${Date.now()}`,
        order_id: orderId || null,
        order_ref: orderRef || null,
        phone,
        status: status || 'SENT',
        provider: provider || 'termii',
        message,
        success: result.success !== false,
        created_at: new Date().toISOString()
      });
    } catch (e) {}

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/notifications/sms/test
 */
router.post('/sms/test', async (req, res) => {
  try {
    const { phone, message, provider, apiKey, senderId, accountSid, authToken, from } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Please provide a phone number.' });
    }
    const result = await dispatchSms({
      phone,
      message: message || 'FoodMaxx SMS alerts connected successfully! 🚀',
      provider,
      apiKey,
      senderId,
      accountSid,
      authToken,
      from
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/notifications/sms/logs
 */
router.get('/sms/logs', (req, res) => {
  try {
    const logs = db.query('sms_logs', () => true)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

router.post('/payments', (req, res) => {
  // Webhook for payment events
  res.json({ success: true });
});

module.exports = router;

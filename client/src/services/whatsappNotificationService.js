// ============================================================
// FOODMAXX WHATSAPP ORDER STATUS NOTIFICATION API & SERVICE
// Formats professional WhatsApp status messages, generates 1-click
// direct WhatsApp links, and triggers automated dispatch API.
// ============================================================

import { db } from './firebaseDb';
import { collection, addDoc } from 'firebase/firestore';

/**
 * Normalizes phone number into international WhatsApp format (e.g. 2348012345678)
 * @param {string} phone 
 * @returns {string}
 */
export function normalizeWhatsAppPhone(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '234' + cleaned.slice(1);
  } else if (cleaned.startsWith('234')) {
    // Already normalized
  } else if (cleaned.length === 10) {
    cleaned = '234' + cleaned;
  }
  return cleaned;
}

/**
 * Build professional, rich Nigerian WhatsApp message for any order status
 * @param {object} order 
 * @param {string} status 
 * @param {string} extraNotes 
 * @returns {string}
 */
export function buildWhatsAppStatusMessage(order, status, extraNotes = '') {
  if (!order) return '';

  const customerName = order.customer_name || order.customer?.full_name || 'Valued Diner';
  const orderRef = order.order_reference || order.id?.slice(0, 8) || 'FMX-ORDER';
  const trackingUrl = `https://foodmaxxapp.web.app?track=${orderRef}`;
  const totalAmount = order.total_amount ? `₦${Number(order.total_amount).toLocaleString()}` : '';

  // Extract items list
  let itemsSummary = '';
  if (Array.isArray(order.items) && order.items.length > 0) {
    itemsSummary = order.items.map(it => `• ${it.quantity}x ${it.name || it.item_name}`).join('\n');
  }

  const riderName = order.rider_name || order.rider?.name;
  const riderPhone = order.rider_phone || order.rider?.phone;
  const deliveryOtp = order.delivery_otp || order.otp;

  switch (status) {
    case 'CONFIRMED':
    case 'ORDER_PLACED':
      return `*FOODMAXX ORDER CONFIRMED!* 🛍️🍲

Hello *${customerName}*, your order *#${orderRef}* has been received & confirmed!

${itemsSummary ? `📦 *Your Meal:*\n${itemsSummary}\n` : ''}
${totalAmount ? `💰 *Total Amount:* ${totalAmount}\n` : ''}📍 *Delivery Location:* ${order.delivery_address || order.delivery_zone || 'Ibadan'}
⏱️ *Estimated Delivery:* 20–35 mins

📲 *Live Order Tracking:*
${trackingUrl}

${extraNotes ? `💬 *Chef Note:* ${extraNotes}\n` : ''}Thank you for dining with FoodMaxx!`;

    case 'PREPARING':
      return `Hello ${customerName}, your order #${orderRef} is now being prepared in our kitchen.

Our chefs are cooking your meal fresh and getting it ready for delivery.
${extraNotes ? `\n💬 Note: ${extraNotes}\n` : ''}
📲 Track Your Order:
${trackingUrl}

Your meal will be ready soon. ❤️`;

    case 'READY_FOR_PICKUP':
      return `ORDER PACKED & READY! 📦

Hello ${customerName}, your order #${orderRef} is freshly packed and ready for dispatch.

We’re now assigning a delivery rider to your order so it can be on its way to you shortly.

📲 Track Your Order:
${trackingUrl}

Thank you for choosing FoodMaxx. ❤️`;

    case 'ON_THE_WAY':
    case 'RIDER_ASSIGNED':
    case 'RIDER_PICKED_UP':
      return `YOUR RIDER IS ON THE WAY! 🛵

Hello ${customerName}, your order #${orderRef} is on the way.

${riderName ? `Rider: ${riderName}${riderPhone ? ` (${riderPhone})` : ''}\n` : ''}${deliveryOtp ? `PIN: ${deliveryOtp}\n` : ''}Address: ${order.delivery_address || order.delivery_zone || 'Your delivery address'}

Please give the PIN to the rider after receiving your order.

Track Order:
${trackingUrl}`;

    case 'ARRIVING_SOON':
      return `RIDER HAS ARRIVED! 🛵

Hello ${customerName}, your FoodMaxx rider is at your doorstep with order #${orderRef}.

${riderName ? `Rider: ${riderName}${riderPhone ? ` (${riderPhone})` : ''}\n` : ''}${deliveryOtp ? `Delivery PIN: ${deliveryOtp}\n` : ''}
Please meet the rider to collect your order.

Enjoy your meal! ❤️

THANK YOU FOR CHOOSING FOODMAXX! ❤️`;

    case 'DELIVERED':
      return `*ORDER DELIVERED!* 🎉

Hello *${customerName}*, your FoodMaxx order *#${orderRef}* has been delivered successfully.

We hope you enjoy your meal! ❤️

⭐ *Rate your experience:*
${trackingUrl}&rate=true

*Delivery issue?* Contact Support: *${order.support_phone || '08166004281'}*

*THANK YOU FOR CHOOSING FOODMAXX!* ❤️`;

    case 'ORDER_DELAY':
    case 'DELAY_NOTICE':
      return `*ORDER DELAY NOTICE*

Hello *${customerName}*, we’re sorry your order *#${orderRef}* is taking longer than expected.

Our team is working to get your meal to you as quickly as possible.

As an apology, enjoy *15%* off your next order with code *SORRY15*. We’ve also added *a chilled drink* to your order for your enjoyment. ❤️

Thank you for your patience and for choosing *FoodMaxx*.`;

    case 'CANCELLED':
      return `*FOODMAXX ORDER CANCELLED* ⚠️

Hello *${customerName}*, your order *#${orderRef}* could not be fulfilled and has been marked as cancelled.
${extraNotes ? `\nReason: ${extraNotes}\n` : ''}
If you paid online via Paystack/Wallet, any refund or wallet credit has been initiated. Tap below to review your receipt:
${trackingUrl}`;

    default:
      return `*FOODMAXX ORDER STATUS UPDATE* 📢

Hello *${customerName}*, your order *#${orderRef}* status has been updated to *${status.replace(/_/g, ' ')}*.
${extraNotes ? `\nNote: ${extraNotes}\n` : ''}
📲 *View Live Details:*
${trackingUrl}`;
  }
}

/**
 * Generate a direct WhatsApp deep link url
 * @param {string} phone 
 * @param {string} message 
 * @returns {string}
 */
export function getWhatsAppShareUrl(phone, message) {
  const norm = normalizeWhatsAppPhone(phone);
  return `https://wa.me/${norm}?text=${encodeURIComponent(message)}`;
}

/**
 * Launch WhatsApp in a new tab with the prepared message
 * @param {object} order 
 * @param {string} status 
 * @param {string} extraNotes 
 * @param {string} customPhone 
 * @returns {boolean}
 */
export function openWhatsAppOrderStatus(order, status, extraNotes = '', customPhone = '') {
  const targetPhone = customPhone || order?.customer_phone || order?.customer?.phone || order?.phone;
  if (!targetPhone) {
    console.warn('Cannot open WhatsApp: No customer phone found on order.');
    return false;
  }
  const message = buildWhatsAppStatusMessage(order, status, extraNotes);
  const url = getWhatsAppShareUrl(targetPhone, message);
  window.open(url, '_blank', 'noopener,noreferrer');
  logWhatsAppDispatch(order, status, targetPhone, message);
  return true;
}

/**
 * Audit & log every dispatched WhatsApp notification in Firestore for records
 * @param {object} order 
 * @param {string} status 
 * @param {string} phone 
 * @param {string} message 
 */
export async function logWhatsAppDispatch(order, status, phone, message) {
  try {
    if (!db) return;
    const normPhone = normalizeWhatsAppPhone(phone);
    await addDoc(collection(db, 'whatsapp_logs'), {
      order_id: order?.id || 'unknown',
      order_ref: order?.order_reference || 'unknown',
      customer_name: order?.customer_name || order?.customer?.full_name || 'Customer',
      phone: normPhone,
      status: status || 'UPDATED',
      message_preview: message?.slice(0, 150),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Could not record WhatsApp log:', err);
  }
}

import { getSmsConfig } from './smsNotificationSdk';

/**
 * Trigger backend or Sendchamp WhatsApp API endpoint (with fallback to client link)
 * @param {object} payload 
 * @returns {Promise<object>}
 */
export async function sendWhatsAppNotificationApi(payload) {
  const normPhone = normalizeWhatsAppPhone(payload.phone);
  const message = payload.message || buildWhatsAppStatusMessage(payload.order, payload.status, payload.extraNotes);
  const config = typeof getSmsConfig === 'function' ? getSmsConfig() : {};
  const scKey = (config.sendchamp_api_key || '').trim();

  // 1. If Sendchamp live key is configured, attempt direct background WhatsApp dispatch
  if (scKey) {
    try {
      const senderVal = config.sendchamp_whatsapp_sender || config.sendchamp_sender_id || 'FoodMaxx';
      const scRes = await fetch('https://api.sendchamp.com/api/v1/whatsapp/message/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${scKey}`
        },
        body: JSON.stringify({
          sender: senderVal,
          recipient: normPhone,
          message: message,
          type: 'text'
        })
      });
      const scData = await scRes.json();
      if (scRes.ok && (scData.status === 'success' || scData.code === 200)) {
        await logWhatsAppDispatch(payload.order, payload.status, normPhone, message);
        return { success: true, provider: 'sendchamp_whatsapp', data: scData };
      }
      console.warn('Sendchamp WhatsApp dispatch notice:', scData.message || scData);
    } catch (scErr) {
      console.warn('Sendchamp WhatsApp request error:', scErr);
    }
  }

  // 2. Try backend WhatsApp proxy endpoint if available
  try {
    const res = await fetch('/api/notifications/whatsapp/send-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        phone: normPhone,
        message
      })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    // 3. Fallback to 1-click WhatsApp deep link
    return {
      success: true,
      mode: 'client_link',
      wa_url: getWhatsAppShareUrl(normPhone, message)
    };
  }
}

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
      return `*FOODMAXX KITCHEN UPDATE* 🍳🔥

Hello *${customerName}*, your order *#${orderRef}* is now cooking in our Bodija kitchen!

Our chefs are preparing and grilling your meal fresh.
${extraNotes ? `💬 *Kitchen Update:* ${extraNotes}\n` : ''}
📲 *Track Live Cooking:*
${trackingUrl}`;

    case 'READY_FOR_PICKUP':
      return `*ORDER PACKED & READY!* 📦✨

Hello *${customerName}*, your order *#${orderRef}* is packed fresh & hot!
We are pairing your order with an active courier now for rapid dispatch.

📲 *Track Progress:*
${trackingUrl}`;

    case 'ON_THE_WAY':
    case 'RIDER_ASSIGNED':
      return `*YOUR RIDER IS ON THE WAY!* 🛵💨

Hello *${customerName}*, your meal for order *#${orderRef}* has left the kitchen and is speeding to you!

${riderName ? `🛵 *Rider:* ${riderName} ${riderPhone ? `(${riderPhone})` : ''}\n` : ''}${deliveryOtp ? `🔐 *Your Delivery Security PIN:* *${deliveryOtp}*\n_(Give this 4-digit PIN to the rider only after receiving your package)_\n` : ''}📍 *Destination:* ${order.delivery_address || order.delivery_zone || 'Your location'}

📲 *Live Courier Map Tracking:*
${trackingUrl}
${extraNotes ? `\n💬 *Note:* ${extraNotes}` : ''}`;

    case 'ARRIVING_SOON':
      return `*RIDER ARRIVING AT YOUR GATE!* 🏡🔔

Hello *${customerName}*, your FoodMaxx rider is right at your delivery gate or doorstep for order *#${orderRef}*!

${riderName ? `🛵 *Rider:* ${riderName} ${riderPhone ? `(${riderPhone})` : ''}\n` : ''}${deliveryOtp ? `🔐 *Your Delivery PIN:* *${deliveryOtp}*\n` : ''}Please meet the rider to collect your hot meal. Enjoy your food! 🍽️`;

    case 'DELIVERED':
      return `*ORDER DELIVERED!* 🎉🍽️

Hello *${customerName}*, your FoodMaxx order *#${orderRef}* has been successfully delivered!

We hope you thoroughly enjoy your feast!
⭐ *Rate your food & rider experience:*
${trackingUrl}&rate=true

Have questions? We are always here on WhatsApp to assist you.`;

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

/**
 * Trigger backend WhatsApp API endpoint (with fallback to client link)
 * @param {object} payload 
 * @returns {Promise<object>}
 */
export async function sendWhatsAppNotificationApi(payload) {
  try {
    const res = await fetch('/api/notifications/whatsapp/send-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return data;
  } catch (err) {
    // If backend is offline or in client-only mode, return structured fallback
    return {
      success: true,
      mode: 'client_link',
      wa_url: getWhatsAppShareUrl(payload.phone, payload.message || buildWhatsAppStatusMessage(payload.order, payload.status))
    };
  }
}

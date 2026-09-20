const express = require('express');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/riders/me - rider profile
router.get('/me', requireAuth, (req, res) => {
  const rider = db.findOne('riders', r => r.user_id === req.user.userId);
  if (!rider) return res.status(404).json({ success: false, message: 'Rider profile not found' });
  res.json({ success: true, data: rider });
});

// POST /api/riders/toggle-status - go online/offline
router.post('/toggle-status', requireAuth, (req, res) => {
  const rider = db.findOne('riders', r => r.user_id === req.user.userId);
  if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });
  const updated = db.update('riders', rider.id, { is_online: !rider.is_online, is_available: !rider.is_online });
  global.broadcast({ type: 'RIDER_STATUS_CHANGED', riderId: rider.id, is_online: updated.is_online }, c => c.userRole === 'super_admin');
  res.json({ success: true, data: updated });
});

// POST /api/riders/accept-delivery - accept dispatch
router.post('/accept-delivery', requireAuth, (req, res) => {
  try {
    const { order_id } = req.body;
    const rider = db.findOne('riders', r => r.user_id === req.user.userId);
    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });

    const order = db.findById('orders', order_id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Assign rider to order
    db.update('orders', order_id, { rider_id: rider.id, order_status: 'RIDER_ASSIGNED' });
    db.insert('order_status_history', {
      order_id,
      status: 'RIDER_ASSIGNED',
      notes: `Rider ${rider.id} accepted delivery`,
      updated_by_user_id: req.user.userId
    });

    // Update rider delivery record
    const delivery = db.findOne('rider_deliveries', d => d.order_id === order_id);
    if (delivery) {
      db.update('rider_deliveries', delivery.id, {
        status: 'accepted',
        accepted_at: new Date().toISOString()
      });
    }

    const restaurant = db.findById('restaurants', order.restaurant_id);
    const riderUser = db.findById('users', rider.user_id);
    global.broadcast({
      type: 'ORDER_STATUS_UPDATED',
      orderId: order_id,
      status: 'RIDER_ASSIGNED',
      riderInfo: { ...rider, full_name: riderUser.full_name, phone: riderUser.phone },
      order: db.findById('orders', order_id)
    });

    res.json({ success: true, data: { order: db.findById('orders', order_id), restaurant } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to accept delivery' });
  }
});

// POST /api/riders/decline-delivery
router.post('/decline-delivery', requireAuth, (req, res) => {
  const { order_id } = req.body;
  const rider = db.findOne('riders', r => r.user_id === req.user.userId);
  if (!rider) return res.status(404).json({ success: false, message: 'Not found' });
  db.update('riders', rider.id, { is_available: true, active_order_id: null });
  res.json({ success: true, message: 'Delivery declined' });
});

// POST /api/riders/confirm-pickup
router.post('/confirm-pickup', requireAuth, (req, res) => {
  const { order_id } = req.body;
  const order = db.findById('orders', order_id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  db.update('orders', order_id, { order_status: 'RIDER_PICKED_UP' });
  db.insert('order_status_history', {
    order_id,
    status: 'RIDER_PICKED_UP',
    notes: 'Rider confirmed pickup from restaurant',
    updated_by_user_id: req.user.userId
  });

  const delivery = db.findOne('rider_deliveries', d => d.order_id === order_id);
  if (delivery) db.update('rider_deliveries', delivery.id, { status: 'picked_up', picked_up_at: new Date().toISOString() });

  global.broadcast({ type: 'ORDER_STATUS_UPDATED', orderId: order_id, status: 'RIDER_PICKED_UP' });

  // Auto-transition to ON_THE_WAY
  setTimeout(() => {
    db.update('orders', order_id, { order_status: 'ON_THE_WAY' });
    db.insert('order_status_history', { order_id, status: 'ON_THE_WAY', notes: 'Rider en route to customer', updated_by_user_id: req.user.userId });
    global.broadcast({ type: 'ORDER_STATUS_UPDATED', orderId: order_id, status: 'ON_THE_WAY' });
  }, 3000);

  res.json({ success: true });
});

// POST /api/riders/update-location
router.post('/update-location', requireAuth, (req, res) => {
  const { lat, lng } = req.body;
  const rider = db.findOne('riders', r => r.user_id === req.user.userId);
  if (!rider) return res.status(404).json({ success: false, message: 'Not found' });

  db.update('riders', rider.id, { current_lat: lat, current_lng: lng });

  // Insert location history
  db.insert('rider_locations', {
    rider_id: rider.id,
    latitude: lat,
    longitude: lng
  });

  // Broadcast to customer of active order
  if (rider.active_order_id) {
    global.broadcast({ type: 'RIDER_LOCATION_UPDATE', orderId: rider.active_order_id, lat, lng });
  }

  res.json({ success: true });
});

// POST /api/riders/verify-otp - confirm delivery with OTP
router.post('/verify-otp', requireAuth, (req, res) => {
  try {
    const { order_id, otp } = req.body;
    const order = db.findById('orders', order_id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.delivery_otp !== String(otp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please confirm with customer.' });
    }

    const rider = db.findOne('riders', r => r.user_id === req.user.userId);

    // Mark delivered
    db.update('orders', order_id, { order_status: 'DELIVERED' });
    db.insert('order_status_history', {
      order_id,
      status: 'DELIVERED',
      notes: 'Delivery confirmed via customer OTP',
      updated_by_user_id: req.user.userId
    });

    // Credit rider wallet
    if (rider) {
      db.update('riders', rider.id, {
        is_available: true,
        active_order_id: null,
        total_deliveries: (rider.total_deliveries || 0) + 1
      });

      const delivery = db.findOne('rider_deliveries', d => d.order_id === order_id);
      if (delivery) {
        db.update('rider_deliveries', delivery.id, {
          status: 'delivered',
          delivered_at: new Date().toISOString()
        });
      }

      const riderWallet = db.findOne('wallets', w => w.user_id === rider.user_id);
      if (riderWallet) {
        const earnings = Math.floor(order.delivery_fee * 0.8);
        db.update('wallets', riderWallet.id, { balance: riderWallet.balance + earnings });
        db.insert('wallet_transactions', {
          wallet_id: riderWallet.id,
          user_id: rider.user_id,
          reference: `RDR-EARN-${Date.now()}`,
          type: 'credit',
          amount: earnings,
          status: 'successful',
          description: `Delivery earnings — Order ${order.order_reference}`
        });
      }
    }

    // Broadcast delivered to all parties
    global.broadcast({ type: 'ORDER_STATUS_UPDATED', orderId: order_id, status: 'DELIVERED', order: db.findById('orders', order_id) });

    // Notify customer to review
    db.insert('notifications', {
      user_id: order.customer_id,
      title: 'Order Delivered! 🎉',
      message: `Your order from ${db.findById('restaurants', order.restaurant_id)?.name} has been delivered. Rate your experience!`,
      type: 'order_delivered',
      link_url: `/orders/${order_id}`,
      is_read: false
    });

    res.json({ success: true, message: 'Delivery confirmed! Great work! 🎉' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to confirm delivery' });
  }
});

// GET /api/riders/earnings
router.get('/earnings', requireAuth, (req, res) => {
  const rider = db.findOne('riders', r => r.user_id === req.user.userId);
  if (!rider) return res.status(404).json({ success: false, message: 'Not found' });

  const wallet = db.findOne('wallets', w => w.user_id === req.user.userId);
  const transactions = db.query('wallet_transactions', t => t.user_id === req.user.userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now - 7 * 86400000).toISOString();
  const monthAgo = new Date(now - 30 * 86400000).toISOString();

  const todayEarnings = transactions.filter(t => t.type === 'credit' && t.created_at.startsWith(today)).reduce((s, t) => s + t.amount, 0);
  const weekEarnings = transactions.filter(t => t.type === 'credit' && t.created_at >= weekAgo).reduce((s, t) => s + t.amount, 0);
  const monthEarnings = transactions.filter(t => t.type === 'credit' && t.created_at >= monthAgo).reduce((s, t) => s + t.amount, 0);

  const deliveries = db.query('rider_deliveries', d => d.rider_id === rider.id);

  res.json({
    success: true,
    data: {
      wallet_balance: wallet?.balance || 0,
      today_earnings: todayEarnings,
      week_earnings: weekEarnings,
      month_earnings: monthEarnings,
      total_deliveries: rider.total_deliveries || 0,
      completed_today: deliveries.filter(d => d.status === 'delivered' && d.delivered_at?.startsWith(today)).length,
      rating: rider.rating,
      transactions: transactions.slice(0, 20)
    }
  });
});

// GET /api/riders/active-order - get current active order
router.get('/active-order', requireAuth, (req, res) => {
  const rider = db.findOne('riders', r => r.user_id === req.user.userId);
  if (!rider) return res.status(404).json({ success: false, message: 'Not found' });

  if (!rider.active_order_id) return res.json({ success: true, data: null });

  const order = db.findById('orders', rider.active_order_id);
  if (!order) return res.json({ success: true, data: null });

  const restaurant = db.findById('restaurants', order.restaurant_id);
  const customer = db.findById('users', order.customer_id);
  const items = db.query('order_items', i => i.order_id === order.id);

  res.json({
    success: true,
    data: {
      ...order,
      restaurant,
      customer: { full_name: customer.full_name, phone: customer.phone },
      items
    }
  });
});

module.exports = router;

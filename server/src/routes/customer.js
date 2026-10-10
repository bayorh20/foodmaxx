const express = require('express');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// GET /api/customer/profile
router.get('/profile', requireAuth, (req, res) => {
  const user = db.findById('users', req.user.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User profile not found. Please sign in again.' });
  const { password_hash, ...safe } = user;
  const wallet = db.findOne('wallets', w => w.user_id === user.id);
  const addresses = db.query('addresses', a => a.user_id === user.id);
  const favs = db.query('reviews', r => r.customer_id === user.id);
  res.json({ success: true, data: { ...safe, wallet, addresses } });
});

// GET /api/customer/addresses
router.get('/addresses', requireAuth, (req, res) => {
  const addresses = db.query('addresses', a => a.user_id === req.user.userId);
  res.json({ success: true, data: addresses });
});

// POST /api/customer/addresses
router.post('/addresses', requireAuth, (req, res) => {
  const { label, address_line, city, state, latitude, longitude, zone_id, landmark, is_default } = req.body;
  if (is_default) {
    // Unset other defaults
    db.query('addresses', a => a.user_id === req.user.userId && a.is_default)
      .forEach(a => db.update('addresses', a.id, { is_default: false }));
  }
  const addr = db.insert('addresses', {
    user_id: req.user.userId,
    label: label || 'Home',
    address_line: address_line || 'Delivery Address',
    landmark: landmark || '',
    city: city || 'Ibadan',
    state: state || 'Oyo State',
    latitude: latitude || 0,
    longitude: longitude || 0,
    zone_id: zone_id || 'zone_bodija',
    is_default: Boolean(is_default)
  });
  res.json({ success: true, data: addr });
});

// DELETE /api/customer/addresses/:id
router.delete('/addresses/:id', requireAuth, (req, res) => {
  const addr = db.findById('addresses', req.params.id);
  if (!addr || addr.user_id !== req.user.userId) {
    return res.status(404).json({ success: false, message: 'Delivery address could not be found.' });
  }
  db.delete('addresses', addr.id);
  res.json({ success: true, message: 'Delivery address removed successfully.' });
});

// GET /api/customer/wallet
router.get('/wallet', requireAuth, (req, res) => {
  const wallet = db.findOne('wallets', w => w.user_id === req.user.userId);
  if (!wallet) return res.status(404).json({ success: false, message: 'Wallet account not found.' });
  const transactions = db.query('wallet_transactions', t => t.user_id === req.user.userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 30);
  res.json({ success: true, data: { ...wallet, transactions } });
});

// POST /api/customer/wallet/topup - sandbox top-up
router.post('/wallet/topup', requireAuth, (req, res) => {
  const { amount } = req.body;
  if (!amount || amount < 100) return res.status(400).json({ success: false, message: 'The minimum wallet top-up is ₦100.' });

  const wallet = db.findOne('wallets', w => w.user_id === req.user.userId);
  if (!wallet) return res.status(404).json({ success: false, message: 'Wallet account not found.' });

  const updated = db.update('wallets', wallet.id, { balance: wallet.balance + Number(amount) });
  db.insert('wallet_transactions', {
    wallet_id: wallet.id,
    user_id: req.user.userId,
    reference: `WTX-TOPUP-${Date.now()}`,
    type: 'credit',
    amount: Number(amount),
    status: 'successful',
    description: 'Wallet top-up (Sandbox)'
  });

  res.json({ success: true, data: updated, message: `₦${Number(amount).toLocaleString()} added to your wallet!` });
});

// GET /api/customer/notifications
router.get('/notifications', requireAuth, (req, res) => {
  const notifs = db.query('notifications', n => n.user_id === req.user.userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 20);
  res.json({ success: true, data: notifs });
});

// PUT /api/customer/notifications/:id/read
router.put('/notifications/:id/read', requireAuth, (req, res) => {
  db.update('notifications', req.params.id, { is_read: true });
  res.json({ success: true });
});

// POST /api/customer/support - create ticket
router.post('/support', requireAuth, (req, res) => {
  const { order_id, category, subject, description } = req.body;
  const user = db.findById('users', req.user.userId);
  const ticketNum = `SUP-${Math.floor(10000 + Math.random() * 89999)}`;
  const ticket = db.insert('support_tickets', {
    ticket_number: ticketNum,
    customer_id: req.user.userId,
    customer_name: user.full_name,
    order_id: order_id || null,
    category: category || 'General',
    subject, description,
    priority: 'medium',
    status: 'Open',
    assigned_agent_id: null
  });
  db.insert('support_messages', {
    ticket_id: ticket.id,
    sender_id: req.user.userId,
    sender_role: 'customer',
    sender_name: user.full_name,
    message: description
  });
  res.json({ success: true, data: ticket, message: `Your help request (${ticketNum}) has been submitted. Our team will get back to you shortly!` });
});

// GET /api/customer/support
router.get('/support', requireAuth, (req, res) => {
  const tickets = db.query('support_tickets', t => t.customer_id === req.user.userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const enriched = tickets.map(t => ({
    ...t,
    messages: db.query('support_messages', m => m.ticket_id === t.id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }));
  res.json({ success: true, data: enriched });
});

module.exports = router;

const express = require('express');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const notifs = db.query('notifications', n => n.user_id === req.user.userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20);
  res.json({ success: true, data: notifs });
});

router.post('/payments', (req, res) => {
  // Webhook placeholder for Paystack/Flutterwave
  res.json({ success: true });
});

module.exports = router;

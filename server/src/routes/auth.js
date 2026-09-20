const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, phone, role = 'customer' } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'Email, password and full name are required' });
    }
    const existing = db.findOne('users', u => u.email === email.toLowerCase());
    if (existing) {
      if (phone && !existing.phone) {
        db.update('users', existing.id, { phone });
      }
      if (full_name && !existing.full_name) {
        db.update('users', existing.id, { full_name });
      }
      const token = signToken({ userId: existing.id, role: existing.role, email: existing.email });
      const { password_hash, ...safeExisting } = existing;
      return res.json({ success: true, token, user: safeExisting });
    }
    const allowedRoles = ['customer', 'restaurant_owner', 'rider'];
    const safeRole = allowedRoles.includes(role) ? role : 'customer';
    const hash = bcrypt.hashSync(password, 8);
    const user = db.insert('users', {
      id: `user_${uuidv4().split('-')[0]}`,
      email: email.toLowerCase(),
      password_hash: hash,
      full_name,
      phone: phone || '',
      role: safeRole,
      status: 'active'
    });

    // Auto-create wallet for customer
    if (safeRole === 'customer') {
      db.insert('wallets', {
        id: `wallet_${user.id}`,
        user_id: user.id,
        balance: 0,
        currency: 'NGN'
      });
    }

    const token = signToken({ userId: user.id, role: user.role, email: user.email });
    const { password_hash, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.findOne('users', u => u.email === email?.toLowerCase());
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    if (user.status === 'suspended') return res.status(403).json({ success: false, message: 'Account suspended. Contact support.' });
    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const token = signToken({ userId: user.id, role: user.role, email: user.email });
    const { password_hash, ...safeUser } = user;

    // Attach rider data if rider
    let riderData = null;
    if (user.role === 'rider') {
      riderData = db.findOne('riders', r => r.user_id === user.id);
    }
    // Attach restaurant data if vendor
    let restaurantData = null;
    if (user.role === 'restaurant_owner') {
      restaurantData = db.findOne('restaurants', r => r.owner_user_id === user.id);
    }

    res.json({ success: true, token, user: safeUser, riderData, restaurantData });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.findById('users', req.user.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const { password_hash, ...safeUser } = user;
  let riderData = null;
  let restaurantData = null;
  if (user.role === 'rider') riderData = db.findOne('riders', r => r.user_id === user.id);
  if (user.role === 'restaurant_owner') restaurantData = db.findOne('restaurants', r => r.owner_user_id === user.id);
  const wallet = db.findOne('wallets', w => w.user_id === user.id);
  res.json({ success: true, user: safeUser, riderData, restaurantData, wallet });
});

// PUT /api/auth/profile - update user profile
router.put('/profile', requireAuth, (req, res) => {
  try {
    const { full_name, phone, avatar_url } = req.body;
    const updates = {};
    if (full_name) updates.full_name = full_name.trim();
    if (phone) updates.phone = phone.trim();
    if (avatar_url) updates.avatar_url = avatar_url.trim();

    const updated = db.update('users', req.user.userId, updates);
    if (!updated) return res.status(404).json({ success: false, message: 'User not found' });
    const { password_hash, ...safeUser } = updated;
    res.json({ success: true, user: safeUser, message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// PUT /api/auth/change-password - change password
router.put('/change-password', requireAuth, (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password || new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }
    const user = db.findById('users', req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const valid = bcrypt.compareSync(current_password, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    const hash = bcrypt.hashSync(new_password, 10);
    db.update('users', user.id, { password_hash: hash });
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

module.exports = router;

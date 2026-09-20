const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/restaurants', require('./routes/restaurants'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/riders', require('./routes/riders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/customer', require('./routes/customer'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/group-orders', require('./routes/groupOrders'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', platform: 'FoodMaxx', env: process.env.NODE_ENV || 'production', time: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = app;

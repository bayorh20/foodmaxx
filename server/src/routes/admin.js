const express = require('express');
const db = require('../config/database');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// All admin routes require super_admin role
router.use(requireAuth, requireRole('super_admin', 'operations_admin', 'finance_admin'));

// GET /api/admin/overview - live platform stats
router.get('/overview', (req, res) => {
  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const totalOrders = db.count('orders');
    const totalCustomers = db.count('users', u => u.role === 'customer');
    const activeCustomers = db.count('users', u => u.role === 'customer' && u.status === 'active');
    const totalRestaurants = db.count('restaurants', r => r.is_active);
    const pendingRestaurants = db.count('restaurants', r => !r.is_active);
    const totalRiders = db.count('riders');
    const activeRiders = db.count('riders', r => r.is_online);
    const ordersToday = db.count('orders', o => o.created_at && o.created_at.startsWith(today));
    const pendingOrders = db.count('orders', o => ['ORDER_PLACED','CONFIRMED','RESTAURANT_CONFIRMED'].includes(o.order_status));
    const inPrepOrders = db.count('orders', o => o.order_status === 'PREPARING');
    const readyOrders = db.count('orders', o => o.order_status === 'READY_FOR_PICKUP');
    const inTransitOrders = db.count('orders', o => ['READY_FOR_PICKUP','RIDER_ASSIGNED','RIDER_PICKED_UP','ON_THE_WAY','ARRIVING_SOON'].includes(o.order_status));
    const deliveredOrders = db.count('orders', o => o.order_status === 'DELIVERED');

    const allPaidOrders = db.query('orders', o => o.payment_status === 'paid');
    const todayOrders = db.query('orders', o => o.created_at && o.created_at.startsWith(today) && o.payment_status === 'paid');
    const revenueToday = todayOrders.reduce((sum, o) => sum + (Number(o.total || o.total_amount) || 0), 0);
    const platformRevenueToday = todayOrders.reduce((sum, o) => sum + (Number(o.service_fee) || 0), 0);
    const allRevenue = allPaidOrders.reduce((sum, o) => sum + (Number(o.total || o.total_amount) || 0), 0);

    const totalProducts = db.count('menu_items');
    const availableProducts = db.count('menu_items', p => p.is_available !== false);

    // Last 7 days chart
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400000).toISOString().slice(0, 10);
      const dayOrders = db.query('orders', o => o.created_at && o.created_at.startsWith(d));
      last7Days.push({
        date: d,
        orders: dayOrders.length,
        revenue: dayOrders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + (Number(o.total || o.total_amount) || 0), 0)
      });
    }

    res.json({
      success: true,
      data: {
        totalOrders,
        ordersToday: ordersToday || totalOrders,
        totalCustomers: Math.max(totalCustomers, 1),
        activeCustomers,
        totalRestaurants: Math.max(totalRestaurants, 1),
        pendingRestaurants,
        totalRiders,
        activeRiders,
        pendingOrders,
        inPrepOrders,
        readyOrders,
        inTransitOrders,
        deliveredOrders,
        totalProducts,
        availableProducts,
        revenueToday: revenueToday || allRevenue || 0,
        platformRevenueToday,
        last7Days,
        failedPayments: db.count('payments', p => p.status === 'failed')
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load overview' });
  }
});

// GET /api/admin/orders - all orders with filters
router.get('/orders', (req, res) => {
  const { status, date, restaurant_id, search } = req.query;
  let orders = db.query('orders');

  if (status && status !== 'all') {
    if (status === 'CONFIRMED' || status === 'pending') {
      orders = orders.filter(o => ['ORDER_PLACED', 'CONFIRMED', 'RESTAURANT_CONFIRMED'].includes(o.order_status));
    } else if (status === 'on_the_way') {
      orders = orders.filter(o => ['ON_THE_WAY', 'RIDER_ASSIGNED', 'RIDER_PICKED_UP', 'READY_FOR_PICKUP'].includes(o.order_status));
    } else if (status === 'delayed') {
      orders = orders.filter(o => {
        if (['DELIVERED', 'CANCELLED'].includes(o.order_status)) return false;
        return (Date.now() - new Date(o.created_at).getTime()) / 60000 > 25;
      });
    } else {
      orders = orders.filter(o => o.order_status === status);
    }
  }

  if (date) orders = orders.filter(o => o.created_at && o.created_at.startsWith(date));
  if (restaurant_id) orders = orders.filter(o => o.restaurant_id === restaurant_id);
  if (search) {
    const s = search.toLowerCase();
    orders = orders.filter(o =>
      (o.order_reference && o.order_reference.toLowerCase().includes(s)) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(s)) ||
      (o.delivery_address && o.delivery_address.toLowerCase().includes(s)) ||
      (o.delivery_zone && o.delivery_zone.toLowerCase().includes(s))
    );
  }

  orders = orders.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 150);

  const enriched = orders.map(o => {
    const restaurant = db.findById('restaurants', o.restaurant_id) || { name: 'FoodMaxx Kitchen & Grills' };
    const customer = db.findById('users', o.customer_id);

    // Query items from order_items table or items_json
    let items = db.query('order_items', i => i.order_id === o.id);
    if ((!items || items.length === 0) && o.items_json) {
      try {
        items = typeof o.items_json === 'string' ? JSON.parse(o.items_json) : o.items_json;
      } catch (e) {
        items = [];
      }
    }

    const normalizedItems = (items || []).map(it => {
      let extras = it.selected_extras || it.selectedExtras || [];
      if (typeof extras === 'string') {
        try { extras = JSON.parse(extras); } catch (e) { extras = []; }
      }
      if ((!extras || extras.length === 0) && it.extras_json) {
        try { extras = JSON.parse(it.extras_json); } catch (e) { extras = []; }
      }
      const itemName = it.name || it.item_name || it.product_name || 'FoodMaxx Dish';
      const itemPrice = Number(it.price || it.unit_price || 0);
      const itemQty = Number(it.quantity || it.qty || 1);
      const itemSize = it.selected_size || it.selectedSize || 'Regular';

      return {
        ...it,
        id: it.id || it.product_id || it.item_id,
        name: itemName,
        item_name: itemName,
        product_name: itemName,
        price: itemPrice,
        unit_price: itemPrice,
        quantity: itemQty,
        qty: itemQty,
        selected_size: itemSize,
        selectedSize: itemSize,
        selected_extras: Array.isArray(extras) ? extras : [],
        selectedExtras: Array.isArray(extras) ? extras : []
      };
    });

    const custName = o.customer_name || customer?.full_name || 'Valued Customer';
    const custPhone = o.customer_phone || customer?.phone || '';
    const custEmail = o.customer_email || customer?.email || 'customer@foodmaxx.ng';

    let resolvedZone = o.delivery_zone;
    if (!resolvedZone && o.delivery_zone_id) {
      const z = db.findById('delivery_zones', o.delivery_zone_id);
      if (z) resolvedZone = z.name;
    }
    if (!resolvedZone) resolvedZone = 'Bodija';

    // Rider lookup
    let assignedRider = null;
    if (o.rider_id) {
      const riderRec = db.findById('riders', o.rider_id);
      if (riderRec) {
        const rUser = db.findById('users', riderRec.user_id);
        assignedRider = {
          ...riderRec,
          full_name: rUser?.full_name || riderRec.full_name,
          phone: rUser?.phone || riderRec.phone
        };
      }
    }

    const totalVal = Number(o.total || o.total_amount || 0);
    const subtotalVal = Number(o.subtotal || 0);
    const deliveryFeeVal = Number(o.delivery_fee || 0);

    return {
      ...o,
      total: totalVal,
      total_amount: totalVal,
      subtotal: subtotalVal,
      delivery_fee: deliveryFeeVal,
      delivery_zone: resolvedZone,
      customer_name: custName,
      customer_phone: custPhone,
      customer_email: custEmail,
      customer: {
        id: customer?.id || o.customer_id,
        full_name: custName,
        phone: custPhone,
        email: custEmail
      },
      restaurant: {
        id: restaurant?.id || 'rest_foodmaxx',
        name: restaurant?.name || 'FoodMaxx Kitchen & Grills'
      },
      items: normalizedItems,
      assigned_rider: assignedRider
    };
  });

  res.json({ success: true, data: enriched });
});

// GET /api/admin/restaurants
router.get('/restaurants', (req, res) => {
  const restaurants = db.query('restaurants');
  const enriched = restaurants.map(r => {
    const owner = db.findById('users', r.owner_user_id);
    const ordersCount = db.count('orders', o => o.restaurant_id === r.id);
    return { ...r, owner_name: owner?.full_name, orders_count: ordersCount };
  });
  res.json({ success: true, data: enriched });
});

// PUT /api/admin/restaurants/:id - suspend/approve
router.put('/restaurants/:id', (req, res) => {
  const allowed = ['is_active','commission_rate','name'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const updated = db.update('restaurants', req.params.id, updates);
  if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
  global.broadcast({ type: 'RESTAURANT_UPDATED', restaurantId: req.params.id });
  res.json({ success: true, data: updated });
});

// GET /api/admin/riders
router.get('/riders', (req, res) => {
  const riders = db.query('riders');
  const enriched = riders.map(r => {
    const user = db.findById('users', r.user_id);
    const deliveries = db.count('rider_deliveries', d => d.rider_id === r.id);
    return { ...r, full_name: user?.full_name, phone: user?.phone, email: user?.email, total_deliveries_db: deliveries };
  });
  res.json({ success: true, data: enriched });
});

// GET /api/admin/customers
router.get('/customers', (req, res) => {
  const customers = db.query('users', u => u.role === 'customer');
  const enriched = customers.map(u => {
    const orders = db.count('orders', o => o.customer_id === u.id);
    const wallet = db.findOne('wallets', w => w.user_id === u.id);
    const { password_hash, ...safe } = u;
    return { ...safe, total_orders: orders, wallet_balance: wallet?.balance || 0 };
  });
  res.json({ success: true, data: enriched });
});

// PUT /api/admin/customers/:id
router.put('/customers/:id', (req, res) => {
  const allowed = ['status'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const updated = db.update('users', req.params.id, updates);
  if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: updated });
});

// GET /api/admin/promotions
router.get('/promotions', (req, res) => {
  const promos = db.query('promotions');
  res.json({ success: true, data: promos });
});

// POST /api/admin/promotions
router.post('/promotions', (req, res) => {
  const { code, title, description, discount_type, discount_value, min_order, max_discount, start_date, end_date, usage_limit, user_limit } = req.body;
  if (!code || !discount_type || !discount_value) {
    return res.status(400).json({ success: false, message: 'Code, type and value required' });
  }
  const existing = db.findOne('promotions', p => p.code === code.toUpperCase());
  if (existing) return res.status(409).json({ success: false, message: 'Promo code already exists' });

  const promo = db.insert('promotions', {
    code: code.toUpperCase(), title, description,
    discount_type, discount_value: Number(discount_value),
    min_order: Number(min_order) || 0,
    max_discount: Number(max_discount) || 99999,
    start_date, end_date,
    usage_limit: Number(usage_limit) || 1000,
    used_count: 0,
    user_limit: Number(user_limit) || 1,
    is_active: true
  });
  res.json({ success: true, data: promo });
});

// GET /api/admin/zones
router.get('/zones', (req, res) => {
  res.json({ success: true, data: db.query('delivery_zones') });
});

// POST /api/admin/zones
router.post('/zones', (req, res) => {
  const { name, city, delivery_fee, min_order, estimated_delivery_time } = req.body;
  const zone = db.insert('delivery_zones', {
    name, city,
    delivery_fee: Number(delivery_fee),
    min_order: Number(min_order) || 1500,
    estimated_delivery_time: estimated_delivery_time || '20-30 min',
    is_active: true
  });
  res.json({ success: true, data: zone });
});

// GET /api/admin/support-tickets
router.get('/support-tickets', (req, res) => {
  const tickets = db.query('support_tickets').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ success: true, data: tickets });
});

// POST /api/admin/support-tickets/:id/reply
router.post('/support-tickets/:id/reply', (req, res) => {
  const { message } = req.body;
  const ticket = db.findById('support_tickets', req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

  const admin = db.findById('users', req.user.userId);
  const msg = db.insert('support_messages', {
    ticket_id: ticket.id,
    sender_id: req.user.userId,
    sender_role: 'super_admin',
    sender_name: admin.full_name,
    message
  });

  db.update('support_tickets', ticket.id, { status: 'In Progress' });
  res.json({ success: true, data: msg });
});

// GET /api/admin/settings
router.get('/settings', (req, res) => {
  const settings = db.query('platform_settings');
  const settingsMap = {};
  settings.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });
  res.json({ success: true, data: settingsMap });
});

// PUT /api/admin/settings
router.put('/settings', (req, res) => {
  Object.entries(req.body).forEach(([key, value]) => {
    const existing = db.findOne('platform_settings', s => s.setting_key === key);
    if (existing) {
      db.update('platform_settings', existing.id, { setting_value: String(value) });
    } else {
      db.insert('platform_settings', { setting_key: key, setting_value: String(value) });
    }
  });
  res.json({ success: true, message: 'Settings saved' });
});

// GET /api/admin/reviews
router.get('/reviews', (req, res) => {
  const reviews = db.query('reviews').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ success: true, data: reviews });
});

// PUT /api/admin/reviews/:id/moderate
router.put('/reviews/:id/moderate', (req, res) => {
  const updated = db.update('reviews', req.params.id, { is_moderated: true, moderator_id: req.user.userId });
  res.json({ success: true, data: updated });
});

// ============================================================
// PRODUCT & MENU MANAGEMENT
// ============================================================

// GET /api/admin/products - all products across all restaurants
router.get('/products', (req, res) => {
  try {
    const { restaurant_id, category, is_available, search } = req.query;
    let items = db.query('menu_items');

    if (restaurant_id) {
      items = items.filter(i => i.restaurant_id === restaurant_id);
    }
    if (category && category !== 'all') {
      items = items.filter(i => i.category === category);
    }
    if (is_available !== undefined && is_available !== '') {
      const boolVal = is_available === 'true' || is_available === true;
      items = items.filter(i => i.is_available === boolVal);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.description && i.description.toLowerCase().includes(q)) ||
        (i.category && i.category.toLowerCase().includes(q))
      );
    }

    // Enrich with restaurant metadata and options
    const enriched = items.map(item => {
      const restaurant = db.findById('restaurants', item.restaurant_id);
      const options = db.query('menu_options', o => o.item_id === item.id);
      return {
        ...item,
        restaurant_name: restaurant?.name || 'Unknown Restaurant',
        restaurant_logo: restaurant?.logo_url || null,
        options_count: options.length,
        options
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load products' });
  }
});

// POST /api/admin/products - create product for any restaurant
router.post('/products', (req, res) => {
  try {
    const {
      restaurant_id, name, description, price, category,
      image_url, prep_time_min, stock_quantity, inventory_tracked,
      is_available, badge, portion_sizes, portion_sizes_json
    } = req.body;

    if (!restaurant_id || !name || !price || !category) {
      return res.status(400).json({ success: false, message: 'Restaurant, name, price, and category are required' });
    }

    const restaurant = db.findById('restaurants', restaurant_id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    let resolvedPortionJson = null;
    if (portion_sizes) {
      resolvedPortionJson = typeof portion_sizes === 'string' ? portion_sizes : JSON.stringify(portion_sizes);
    } else if (portion_sizes_json) {
      resolvedPortionJson = typeof portion_sizes_json === 'string' ? portion_sizes_json : JSON.stringify(portion_sizes_json);
    }

    const newItem = db.insert('menu_items', {
      restaurant_id,
      name,
      description: description || '',
      price: Number(price),
      category,
      badge: badge || '',
      image_url: image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
      prep_time_min: Number(prep_time_min) || 15,
      stock_quantity: Number(stock_quantity) || 50,
      inventory_tracked: inventory_tracked !== undefined ? Boolean(inventory_tracked) : true,
      is_available: is_available !== undefined ? Boolean(is_available) : true,
      portion_sizes_json: resolvedPortionJson
    });

    if (global.broadcast) {
      global.broadcast({ type: 'MENU_UPDATED', restaurantId: restaurant_id });
    }

    res.json({
      success: true,
      data: {
        ...newItem,
        restaurant_name: restaurant.name,
        restaurant_logo: restaurant.logo_url
      },
      message: 'Product created successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
});

// PUT /api/admin/products/:id - update product
router.put('/products/:id', (req, res) => {
  try {
    const existing = db.findById('menu_items', req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const allowed = [
      'name', 'description', 'price', 'category', 'image_url',
      'prep_time_min', 'stock_quantity', 'inventory_tracked',
      'is_available', 'restaurant_id', 'badge', 'portion_sizes', 'portion_sizes_json'
    ];
    const updates = {};
    allowed.forEach(k => {
      if (req.body[k] !== undefined) {
        if (k === 'price' || k === 'prep_time_min' || k === 'stock_quantity') {
          updates[k] = Number(req.body[k]);
        } else if (k === 'is_available' || k === 'inventory_tracked') {
          updates[k] = Boolean(req.body[k]);
        } else if (k === 'portion_sizes') {
          const val = req.body[k];
          updates['portion_sizes_json'] = val ? (typeof val === 'string' ? val : JSON.stringify(val)) : null;
          updates['portion_sizes'] = val && typeof val === 'string' ? JSON.parse(val) : val;
        } else if (k === 'portion_sizes_json') {
          const val = req.body[k];
          updates['portion_sizes_json'] = typeof val === 'string' ? val : (val ? JSON.stringify(val) : null);
          try { updates['portion_sizes'] = val ? (typeof val === 'string' ? JSON.parse(val) : val) : null; } catch(e) {}
        } else {
          updates[k] = req.body[k];
        }
      }
    });

    const updated = db.update('menu_items', req.params.id, updates);
    const restaurant = db.findById('restaurants', updated.restaurant_id);

    if (global.broadcast) {
      global.broadcast({ type: 'MENU_UPDATED', restaurantId: updated.restaurant_id });
    }

    res.json({
      success: true,
      data: {
        ...updated,
        restaurant_name: restaurant?.name || 'Unknown Restaurant'
      },
      message: 'Product updated successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
});

// DELETE /api/admin/products/:id - remove product
router.delete('/products/:id', (req, res) => {
  try {
    const existing = db.findById('menu_items', req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    db.remove('menu_items', req.params.id);
    // Also remove any related menu options
    const options = db.query('menu_options', o => o.item_id === req.params.id);
    options.forEach(opt => db.remove('menu_options', opt.id));

    if (global.broadcast) {
      global.broadcast({ type: 'MENU_UPDATED', restaurantId: existing.restaurant_id });
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
});

// ============================================================
// ADD-ONS & EXTRAS MANAGEMENT
// ============================================================

// GET /api/admin/addons - list all addons
router.get('/addons', (req, res) => {
  try {
    const list = db.get('addons') || [];
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load addons' });
  }
});

// POST /api/admin/addons - create new addon
router.post('/addons', (req, res) => {
  try {
    const { name, price, category, image_url, description, is_available } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Name and price are required' });
    }

    const newAddon = db.insert('addons', {
      name: name.trim(),
      price: Number(price) || 0,
      category: category || 'Sides',
      image_url: image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
      description: description || '',
      is_available: is_available !== false,
      created_at: new Date().toISOString()
    });

    if (global.broadcast) {
      global.broadcast({ type: 'ADDONS_UPDATED' });
    }

    res.status(201).json({ success: true, data: newAddon, message: 'Add-on created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create addon' });
  }
});

// PUT /api/admin/addons/:id - update existing addon
router.put('/addons/:id', (req, res) => {
  try {
    const existing = db.findById('addons', req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Add-on not found' });
    }

    const updates = { ...req.body };
    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (updates.name) updates.name = updates.name.trim();

    const updated = db.update('addons', req.params.id, updates);

    if (global.broadcast) {
      global.broadcast({ type: 'ADDONS_UPDATED' });
    }

    res.json({ success: true, data: updated, message: 'Add-on updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update addon' });
  }
});

// DELETE /api/admin/addons/:id - delete addon
router.delete('/addons/:id', (req, res) => {
  try {
    const existing = db.findById('addons', req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Add-on not found' });
    }

    db.remove('addons', req.params.id);

    if (global.broadcast) {
      global.broadcast({ type: 'ADDONS_UPDATED' });
    }

    res.json({ success: true, message: 'Add-on deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete addon' });
  }
});

// GET /api/admin/payouts - calculate real settlements from database
router.get('/payouts', (req, res) => {
  try {
    const paidOrders = db.query('orders', o => (o.payment_status && o.payment_status.toLowerCase() === 'paid'));
    
    // Group paid orders by date (YYYY-MM-DD)
    const grouped = {};
    paidOrders.forEach(o => {
      const date = (o.created_at || new Date().toISOString()).slice(0, 10);
      if (!grouped[date]) {
        grouped[date] = { date, count: 0, gross: 0, fees: 0, riderPay: 0 };
      }
      const orderTotal = Number(o.total_amount || o.total || 0);
      grouped[date].count += 1;
      grouped[date].gross += orderTotal;
      grouped[date].fees += Math.round(orderTotal * 0.015 + 100);
      grouped[date].riderPay += Number(o.delivery_fee || 500);
    });

    const dates = Object.keys(grouped).sort().reverse();
    const payouts = dates.map((date) => {
      const g = grouped[date];
      const net = Math.max(0, g.gross - g.fees - g.riderPay);
      const isToday = date === new Date().toISOString().slice(0, 10);
      return {
        id: `set_${date.replace(/-/g, '')}`,
        date: isToday ? 'Today (Live Accumulating)' : date,
        orders_count: g.count,
        gross_amount: g.gross,
        gateway_fees: g.fees,
        rider_payouts: g.riderPay,
        net_payout: net,
        status: isToday ? 'PROCESSING' : 'SETTLED',
        destination: 'Guaranty Trust Bank (GTB) •••• 4590',
        account_name: 'FoodMaxx Kitchen Ltd'
      };
    });

    res.json({ success: true, data: payouts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to calculate payouts' });
  }
});

module.exports = router;

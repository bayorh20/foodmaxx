const express = require('express');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/restaurants - discovery with filters
router.get('/', (req, res) => {
  try {
    const { zone_id, category, search, sort, featured } = req.query;
    let restaurants = db.query('restaurants', r => r.is_active);

    if (zone_id) restaurants = restaurants.filter(r => r.zone_id === zone_id);
    if (search) {
      const q = search.toLowerCase();
      restaurants = restaurants.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.cuisine_types && r.cuisine_types.some(c => c.toLowerCase().includes(q)))
      );
    }
    if (featured === 'true') restaurants = restaurants.filter(r => r.featured);

    if (sort === 'rating') restaurants.sort((a, b) => b.rating - a.rating);
    else if (sort === 'delivery_time') restaurants.sort((a, b) => a.delivery_time_min - b.delivery_time_min);
    else if (sort === 'delivery_fee') restaurants.sort((a, b) => a.delivery_fee - b.delivery_fee);

    // Attach live order counts
    const enriched = restaurants.map(r => {
      const pendingOrders = db.count('orders', o =>
        o.restaurant_id === r.id && !['DELIVERED','CANCELLED'].includes(o.order_status)
      );
      return { ...r, pendingOrders };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load restaurants' });
  }
});

// GET /api/restaurants/primary/flagship - single flagship restaurant with complete menu
router.get('/primary/flagship', (req, res) => {
  try {
    let restaurant = db.findOne('restaurants', r => r.id === 'rest_foodmaxx') || db.table('restaurants')[0];
    
    // Override brand identity to FoodMaxx Kitchen & Grills (Single Restaurant)
    const flagship = {
      ...(restaurant || {}),
      id: 'rest_foodmaxx',
      name: 'FoodMaxx Kitchen & Grills',
      slug: 'foodmaxx-kitchen-grills',
      description: 'The premier kitchen for authentic Nigerian food in Ibadan. Famous for smoky firewood Party Jollof, silky soft Amala Dudu, tender goat meat Asun, and sizzling Beef Suya.',
      logo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=160&auto=format&fit=crop&q=80',
      cover_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80',
      cuisine_types: ['Authentic Nigerian', 'Swallow & Soups', 'Jollof & Rice', 'Grills & Suya'],
      rating: 4.9,
      reviews_count: 1280,
      delivery_time_min: 20,
      delivery_time_max: 30,
      delivery_fee: 500,
      min_order: 1500,
      address: 'Plot 12, Awolowo Avenue, Old Bodija, Ibadan',
      operating_hours: '8:00 AM - 10:30 PM',
      is_open: true,
      badge: 'Flagship Kitchen'
    };

    // Load all menu items across the database so FoodMaxx offers the full complete menu
    const allMenuItems = db.table('menu_items');
    const menuWithOptions = allMenuItems.map(item => {
      const options = db.query('menu_options', o => o.item_id === item.id);
      return {
        ...item,
        restaurant_id: 'rest_foodmaxx',
        restaurant_name: 'FoodMaxx Kitchen & Grills',
        options
      };
    });

    // Categorize
    const categories = [...new Set(menuWithOptions.map(i => i.category))];
    const menuByCategory = categories.map(cat => ({
      category: cat,
      items: menuWithOptions.filter(i => i.category === cat)
    }));

    // Reviews
    const reviews = db.table('reviews').slice(0, 15);

    res.json({ success: true, data: { ...flagship, menu: menuWithOptions, menuItems: menuWithOptions, menuByCategory, reviews } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load flagship restaurant' });
  }
});

// GET /api/restaurants/zones/all
router.get('/zones/all', (req, res) => {
  const zones = db.table('delivery_zones');
  res.json({ success: true, data: zones });
});

// GET /api/restaurants/categories/global
router.get('/categories/global', (req, res) => {
  const cats = db.table('menu_categories');
  res.json({ success: true, data: cats.length > 0 ? cats : [
    { id: 'cat_burgers', name: 'Burgers & Sandwiches', icon: '🍔' },
    { id: 'cat_rice', name: 'Rice & Grains', icon: '🍚' },
    { id: 'cat_swallow', name: 'Swallows & Soups', icon: '🍲' },
    { id: 'cat_grills', name: 'Grills & Suya', icon: '🍗' },
    { id: 'cat_pasta', name: 'Pasta & Gourmet Bowls', icon: '🍝' },
    { id: 'cat_shawarma', name: 'Shawarma & Wraps', icon: '🌯' },
    { id: 'cat_dessert', name: 'Desserts & Chilled', icon: '🍨' },
    { id: 'cat_drinks', name: 'Drinks & Refreshers', icon: '🍹' }
  ] });
});

// GET /api/restaurants/:id - single restaurant with menu
router.get('/:id', (req, res) => {
  try {
    const restaurant = db.findById('restaurants', req.params.id) || db.findOne('restaurants', r => r.id === 'rest_foodmaxx');
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    // Fetch menu items
    let menuItems = db.query('menu_items', i => i.restaurant_id === restaurant.id);
    if (!menuItems || menuItems.length === 0) {
      menuItems = db.table('menu_items');
    }

    // Attach options to each item
    const menuWithOptions = menuItems.map(item => {
      const options = db.query('menu_options', o => o.item_id === item.id);
      return { ...item, options };
    });

    // Group by category
    const categories = [...new Set(menuItems.map(i => i.category))];
    const menuByCategory = categories.map(cat => ({
      category: cat,
      items: menuWithOptions.filter(i => i.category === cat)
    }));

    // Fetch recent reviews
    const reviews = db.query('reviews', r => r.restaurant_id === restaurant.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    res.json({ success: true, data: { ...restaurant, menuByCategory, reviews } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load restaurant' });
  }
});

// GET /api/restaurants/:id/menu - just the menu
router.get('/:id/menu', (req, res) => {
  try {
    let items = db.query('menu_items', i => i.restaurant_id === req.params.id);
    if (!items || items.length === 0) {
      items = db.table('menu_items');
    }
    const withOptions = items.map(item => ({
      ...item,
      options: db.query('menu_options', o => o.item_id === item.id)
    }));
    res.json({ success: true, data: withOptions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load menu' });
  }
});


// Vendor: PUT /api/restaurants/:id - update restaurant
router.put('/:id', requireAuth, (req, res) => {
  try {
    const restaurant = db.findById('restaurants', req.params.id);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Not found' });
    if (restaurant.owner_user_id !== req.user.userId && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const allowed = ['name','description','is_open','operating_hours','delivery_fee','min_order','delivery_time_min','delivery_time_max'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const updated = db.update('restaurants', req.params.id, updates);
    global.broadcast({ type: 'RESTAURANT_UPDATED', restaurantId: req.params.id, data: updated });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// Vendor: POST /api/restaurants/:id/menu - add food item
router.post('/:id/menu', requireAuth, (req, res) => {
  try {
    const restaurant = db.findById('restaurants', req.params.id);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Not found' });
    if (restaurant.owner_user_id !== req.user.userId && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const { name, description, price, category, image_url, prep_time_min } = req.body;
    if (!name || !price || !category) {
      return res.status(400).json({ success: false, message: 'Name, price and category required' });
    }
    const item = db.insert('menu_items', {
      restaurant_id: req.params.id,
      name, description, price: Number(price), category,
      image_url: image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80',
      prep_time_min: prep_time_min || 15,
      is_available: true,
      inventory_tracked: false,
      stock_quantity: 99
    });
    global.broadcast({ type: 'MENU_UPDATED', restaurantId: req.params.id });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add item' });
  }
});

// Vendor: PUT /api/restaurants/:restId/menu/:itemId
router.put('/:restId/menu/:itemId', requireAuth, (req, res) => {
  try {
    const restaurant = db.findById('restaurants', req.params.restId);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Not found' });
    if (restaurant.owner_user_id !== req.user.userId && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const allowed = ['name','description','price','category','image_url','is_available','prep_time_min','stock_quantity','badge','portion_sizes','portion_sizes_json'];
    const updates = {};
    allowed.forEach(k => {
      if (req.body[k] !== undefined) {
        if (k === 'portion_sizes') {
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
    const updated = db.update('menu_items', req.params.itemId, updates);
    global.broadcast({ type: 'MENU_UPDATED', restaurantId: req.params.restId });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

module.exports = router;


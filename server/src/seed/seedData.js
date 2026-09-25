const bcrypt = require('bcryptjs');
const db = require('../config/database');

function seedDatabase() {
  console.log('📦 Initializing FoodMaxx production catalog and baseline entities...');

  // Ensure initial admin exists
  const existingAdmin = db.findOne('users', u => u.role === 'super_admin');
  let adminId = existingAdmin ? existingAdmin.id : 'user_admin';
  if (!existingAdmin) {
    const adminPasswordHash = bcrypt.hashSync(process.env.INITIAL_ADMIN_PASSWORD || 'admin123', 10);
    const adminUser = db.insert('users', {
      id: 'user_admin',
      email: process.env.INITIAL_ADMIN_EMAIL || 'admin@foodmaxx.ng',
      password_hash: adminPasswordHash,
      full_name: 'FoodMaxx Super Admin',
      phone: '',
      role: 'super_admin',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
      status: 'active'
    });
    adminId = adminUser.id;
    console.log('✅ Super Admin account created:', adminUser.email);
  }

  // Flagship Restaurant
  const existingRest = db.findById('restaurants', 'rest_foodmaxx');
  if (!existingRest) {
    db.insert('restaurants', {
      id: 'rest_foodmaxx',
      owner_user_id: adminId,
      name: 'FoodMaxx Kitchen & Grills',
      slug: 'foodmaxx-kitchen-grills',
      description: 'The premier culinary house in Ibadan crafting authentic firewood party jollof, Abula feasts, artisan pasta bowls, and sizzling grills.',
      logo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=160&auto=format&fit=crop&q=80',
      cover_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80',
      cuisine_types_json: JSON.stringify(['Rice & Grains', 'Swallows & Soups', 'Grills & Suya', 'Pasta & Bowls', 'Shawarma & Wraps', 'Desserts & Refreshers']),
      rating: 4.9,
      reviews_count: 0,
      delivery_time_min: 20,
      delivery_time_max: 35,
      delivery_fee: 500,
      min_order: 2000,
      address: '24 Awolowo Avenue, Old Bodija, Ibadan, Oyo State',
      is_open: 1,
      is_active: 1,
      commission_rate: 0.15
    });
    console.log('✅ Flagship restaurant configured: FoodMaxx Kitchen & Grills');
  }

  // Categories
  if (db.table('menu_categories').length === 0) {
    const categories = [
      { id: 'cat_burgers', name: 'Burgers & Sandwiches', icon: '🍔', image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&auto=format&fit=crop&q=80', sort_order: 1 },
      { id: 'cat_rice', name: 'Rice & Grains', icon: '🍚', image_url: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=200&auto=format&fit=crop&q=80', sort_order: 2 },
      { id: 'cat_swallow', name: 'Swallows & Soups', icon: '🍲', image_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=200&auto=format&fit=crop&q=80', sort_order: 3 },
      { id: 'cat_grills', name: 'Grills & Suya', icon: '🍗', image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&auto=format&fit=crop&q=80', sort_order: 4 },
      { id: 'cat_pasta', name: 'Pasta & Gourmet Bowls', icon: '🍝', image_url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=200&auto=format&fit=crop&q=80', sort_order: 5 },
      { id: 'cat_shawarma', name: 'Shawarma & Wraps', icon: '🌯', image_url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=200&auto=format&fit=crop&q=80', sort_order: 6 },
      { id: 'cat_dessert', name: 'Desserts & Chilled', icon: '🍨', image_url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=200&auto=format&fit=crop&q=80', sort_order: 7 },
      { id: 'cat_drinks', name: 'Drinks & Refreshers', icon: '🍹', image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=200&auto=format&fit=crop&q=80', sort_order: 8 }
    ];
    categories.forEach(c => db.insert('menu_categories', c));
  }

  // Delivery Zones
  if (db.table('delivery_zones').length === 0) {
    const zones = [
      { id: 'zone_bodija', name: 'Bodija & Old Bodija', city: 'Ibadan', hub: 'Bodija Hub', delivery_fee: 500, min_order: 2000, estimated_delivery_time: '15–25 min', free_delivery_threshold: 10000, is_active: 1 },
      { id: 'zone_uicampus', name: 'UI Campus & Agbowo', city: 'Ibadan', hub: 'Campus Hub', delivery_fee: 500, min_order: 1500, estimated_delivery_time: '15–25 min', free_delivery_threshold: 8000, is_active: 1 },
      { id: 'zone_samonda', name: 'Samonda, Sango & Poly Ibadan', city: 'Ibadan', hub: 'North-West Hub', delivery_fee: 600, min_order: 2000, estimated_delivery_time: '20–30 min', free_delivery_threshold: 10000, is_active: 1 },
      { id: 'zone_ikolaba', name: 'Ikolaba, Agodi GRA & Govt House', city: 'Ibadan', hub: 'Central GRA', delivery_fee: 700, min_order: 2500, estimated_delivery_time: '20–30 min', free_delivery_threshold: 12000, is_active: 1 },
      { id: 'zone_mokola', name: 'Mokola & Cultural Centre', city: 'Ibadan', hub: 'Central Hub', delivery_fee: 600, min_order: 2000, estimated_delivery_time: '20–30 min', free_delivery_threshold: 10000, is_active: 1 },
      { id: 'zone_dugbe', name: 'Dugbe & Cocoa House Commercial Hub', city: 'Ibadan', hub: 'Commercial Core', delivery_fee: 700, min_order: 2500, estimated_delivery_time: '25–35 min', free_delivery_threshold: 12000, is_active: 1 },
      { id: 'zone_jericho', name: 'Jericho & Iyaganku GRA', city: 'Ibadan', hub: 'South-West GRA', delivery_fee: 800, min_order: 3000, estimated_delivery_time: '25–35 min', free_delivery_threshold: 12000, is_active: 1 },
      { id: 'zone_ringroad', name: 'Ring Road, Osuntokun & Challenge', city: 'Ibadan', hub: 'Ring Road Corridor', delivery_fee: 900, min_order: 3000, estimated_delivery_time: '30–40 min', free_delivery_threshold: 15000, is_active: 1 },
      { id: 'zone_oluyole', name: 'Oluyole Estate & Industrial Layout', city: 'Ibadan', hub: 'South Industrial', delivery_fee: 900, min_order: 3000, estimated_delivery_time: '30–40 min', free_delivery_threshold: 15000, is_active: 1 },
      { id: 'zone_akobo', name: 'Akobo, General Gas & Oju-Irin', city: 'Ibadan', hub: 'East Corridor', delivery_fee: 1000, min_order: 3500, estimated_delivery_time: '35–45 min', free_delivery_threshold: 15000, is_active: 1 },
      { id: 'zone_alakia', name: 'Alakia, Iwo Road & Airport Axis', city: 'Ibadan', hub: 'Airport Corridor', delivery_fee: 1200, min_order: 4000, estimated_delivery_time: '40–50 min', free_delivery_threshold: 18000, is_active: 1 },
      { id: 'zone_eleyele', name: 'Eleyele, Ologuneru & NIHORT', city: 'Ibadan', hub: 'North-West Suburb', delivery_fee: 1000, min_order: 3500, estimated_delivery_time: '35–45 min', free_delivery_threshold: 15000, is_active: 1 },
      { id: 'zone_ojoo', name: 'Ojoo & Moniya / Train Station Axis', city: 'Ibadan', hub: 'North Terminal', delivery_fee: 1200, min_order: 4000, estimated_delivery_time: '40–55 min', free_delivery_threshold: 18000, is_active: 1 },
      { id: 'zone_apata', name: 'Apata & Odo-Ona Corridor', city: 'Ibadan', hub: 'Abeokuta Road', delivery_fee: 1100, min_order: 3500, estimated_delivery_time: '35–50 min', free_delivery_threshold: 16000, is_active: 1 }
    ];
    zones.forEach(z => db.insert('delivery_zones', z));
  }

  // Products
  if (db.table('menu_items').length === 0) {
    const dishes = [
      {
        id: 'fmx_smoky_jollof',
        restaurant_id: 'rest_foodmaxx',
        name: 'Smoky Firewood Jollof & Asun',
        category: 'Rice & Grains',
        description: 'Authentic Nigerian party jollof cooked over slow firewood embers, served with spicy fire-roasted goat meat (Asun) and sweet fried plantain.',
        price: 4800,
        rating: 4.9,
        reviews_count: '2.4k',
        prep_time_min: 20,
        badge: 'bestseller',
        is_bestseller: 1,
        image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
        is_available: 1,
        stock_quantity: 120
      },
      {
        id: 'fmx_cheeseburger',
        restaurant_id: 'rest_foodmaxx',
        name: 'Cheeseburger Deluxe',
        category: 'Burgers & Sandwiches',
        description: 'Flame-grilled double beef patty, melted cheddar cheese, fresh crisp lettuce, ripe tomatoes, crunchy pickles, and house secret sauce on a toasted sesame brioche bun.',
        price: 4500,
        rating: 4.8,
        reviews_count: '335',
        prep_time_min: 31,
        badge: 'bestseller',
        is_bestseller: 1,
        image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
        is_available: 1,
        stock_quantity: 80
      },
      {
        id: 'fmx_bbq_bacon_burger',
        restaurant_id: 'rest_foodmaxx',
        name: 'BBQ Bacon Burger',
        category: 'Burgers & Sandwiches',
        description: 'Double beef patties, crispy caramelized bacon, smoky barbecue glaze, aged Monterey Jack cheese, and golden onion rings.',
        price: 4800,
        rating: 4.9,
        reviews_count: '410',
        prep_time_min: 27,
        badge: 'popular',
        is_bestseller: 1,
        image_url: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&auto=format&fit=crop&q=80',
        is_available: 1,
        stock_quantity: 75
      },
      {
        id: 'fmx_ofada_deluxe',
        restaurant_id: 'rest_foodmaxx',
        name: 'Ofada Rice & Ayamase Designer Stew',
        category: 'Rice & Grains',
        description: 'Heritage unpolished Ofada rice served in aromatic broad leaves with spicy green pepper bleaching sauce, assorted meats, boiled eggs, and iru.',
        price: 5200,
        rating: 4.9,
        reviews_count: '1.6k',
        prep_time_min: 25,
        badge: 'chef_special',
        is_bestseller: 1,
        image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
        is_available: 1,
        stock_quantity: 80
      },
      {
        id: 'fmx_fried_rice_turkey',
        restaurant_id: 'rest_foodmaxx',
        name: 'Golden Coconut Fried Rice & Glazed Turkey',
        category: 'Rice & Grains',
        description: 'Aromatic basmati stir-fried with sweet corn, carrots, liver cubes, and green peas, topped with a seasoned jumbo peppered turkey wing.',
        price: 5500,
        rating: 4.8,
        reviews_count: '980',
        prep_time_min: 20,
        badge: 'popular',
        is_bestseller: 0,
        image_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=80',
        is_available: 1,
        stock_quantity: 90
      },
      {
        id: 'fmx_amala_abula',
        restaurant_id: 'rest_foodmaxx',
        name: 'Authentic Oyo Amala & Abula Feast',
        category: 'Swallows & Soups',
        description: 'Piping hot, silky black yam flour Amala whipped to velvet perfection, served with steaming Gbegiri (beans soup), dark Ewedu, spicy Buka stew, Ogunfe (goat meat), and cow tripe (shaki).',
        price: 4600,
        rating: 5.0,
        reviews_count: '3.1k',
        prep_time_min: 15,
        badge: 'bestseller',
        is_bestseller: 1,
        image_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop&q=80',
        is_available: 1,
        stock_quantity: 150
      },
      {
        id: 'fmx_poundedyam_egusi',
        restaurant_id: 'rest_foodmaxx',
        name: 'Fluffy Pounded Yam & Rich Egusi Soup',
        category: 'Swallows & Soups',
        description: 'Lump-free fluffy pounded yam paired with slow-simmered melon seed soup laced with fluted pumpkin (Ugwu) leaves, stockfish, dry catfish, and tender bushmeat cut.',
        price: 5000,
        rating: 4.8,
        reviews_count: '1.2k',
        prep_time_min: 20,
        badge: 'popular',
        is_bestseller: 0,
        image_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop&q=80',
        is_available: 1,
        stock_quantity: 80
      },
      {
        id: 'fmx_seafood_okra',
        restaurant_id: 'rest_foodmaxx',
        name: 'Gourmet Seafood Okra Pot',
        category: 'Swallows & Soups',
        description: 'Chunky green okra simmered in aromatic fish stock with giant tiger prawns, blue swimming crabs, calamari rings, fresh snails, and fragrant scent leaves.',
        price: 6800,
        rating: 4.9,
        reviews_count: '750',
        prep_time_min: 30,
        badge: 'chef_special',
        is_bestseller: 0,
        image_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop&q=80',
        is_available: 1,
        stock_quantity: 45
      },
      {
        id: 'fmx_grilled_bbq_chicken',
        restaurant_id: 'rest_foodmaxx',
        name: 'Flame-Kissed BBQ Quarter Chicken',
        category: 'Grills & Suya',
        description: 'Prime chicken quarter marinated for 24 hours in Nigerian native herbs, charred over hardwood coals, and basted with honey-chili glaze.',
        price: 3800,
        rating: 4.9,
        reviews_count: '1.8k',
        prep_time_min: 25,
        badge: 'bestseller',
        is_bestseller: 1,
        image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80',
        is_available: 1,
        stock_quantity: 100
      },
      {
        id: 'fmx_beef_suya_platter',
        restaurant_id: 'rest_foodmaxx',
        name: 'Signature Yaji Beef Suya Platter',
        category: 'Grills & Suya',
        description: 'Thinly sliced boneless beef skewers rolled in fiery Kano kuli-kuli Yaji spice, flame-charred and served with red onions, ripe tomatoes, and cabbage slaw.',
        price: 4000,
        rating: 4.9,
        reviews_count: '2.1k',
        prep_time_min: 15,
        badge: 'bestseller',
        is_bestseller: 1,
        image_url: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=600&auto=format&fit=crop&q=80',
        is_available: 1,
        stock_quantity: 110
      },
      {
        id: 'fmx_croaker_fish',
        restaurant_id: 'rest_foodmaxx',
        name: 'Whole Char-Grilled Spicy Croaker Fish',
        category: 'Grills & Suya',
        description: 'Fresh jumbo Atlantic Croaker scored and basted in hot pepper-rosemary reduction, roasted over charcoal, garnished with spiced fried plantain and roasted potatoes.',
        price: 6500,
        rating: 5.0,
        reviews_count: '1.5k',
        prep_time_min: 35,
        badge: 'chef_special',
        is_bestseller: 1,
        image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80',
        is_available: 1,
        stock_quantity: 60
      },
      {
        id: 'fmx_creamy_alfredo',
        restaurant_id: 'rest_foodmaxx',
        name: 'Creamy Garlic Penne Alfredo with Chicken',
        category: 'Pasta & Gourmet Bowls',
        description: 'Al dente Italian penne tossed in velvety aged Parmesan garlic cream sauce, seasoned with cracked black peppercorn and crowned with juicy seared chicken breast slices.',
        price: 5200,
        rating: 4.8,
        reviews_count: '840',
        prep_time_min: 25,
        badge: 'popular',
        is_bestseller: 0,
        image_url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?w=600&auto=format&fit=crop&q=80',
        is_available: 1,
        stock_quantity: 70
      },
      {
        id: 'fmx_spicy_stirfry_spag',
        restaurant_id: 'rest_foodmaxx',
        name: 'Nigerian Party Stir-Fry Spaghetti & Gizzards',
        category: 'Pasta & Gourmet Bowls',
        description: 'Spaghetti ribbons pan-fried with colorful bell peppers, sweet spring onions, diced spicy peppered gizzards, and aromatic thyme.',
        price: 4400,
        rating: 4.9,
        reviews_count: '1.9k',
        prep_time_min: 20,
        badge: 'bestseller',
        is_bestseller: 1,
        image_url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80',
        is_available: 1,
        stock_quantity: 120
      },
      {
        id: 'fmx_special_shawarma',
        restaurant_id: 'rest_foodmaxx',
        name: 'FoodMaxx Jumbo Shawarma (Double Sausage)',
        category: 'Shawarma & Wraps',
        description: 'Warm toasted Lebanese flatbread packed with spiced shredded chicken thigh, two sizzling beef franks, shredded cabbage, carrots, and secret creamy chili garlic cream.',
        price: 3200,
        rating: 4.9,
        reviews_count: '2.8k',
        prep_time_min: 15,
        badge: 'bestseller',
        is_bestseller: 1,
        image_url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80',
        is_available: 1,
        stock_quantity: 140
      },
      {
        id: 'fmx_cold_chapman',
        restaurant_id: 'rest_foodmaxx',
        name: 'Authentic Bodija Chapman with Citrus',
        category: 'Drinks & Refreshers',
        description: 'Classic Nigerian mocktail blend of Fanta, Sprite, Angostura aromatic bitters, freshly squeezed lime, and sliced cucumbers.',
        price: 1500,
        rating: 4.9,
        reviews_count: '1.7k',
        prep_time_min: 5,
        badge: 'popular',
        is_bestseller: 1,
        image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
        is_available: 1,
        stock_quantity: 180
      },
      {
        id: 'fmx_coke_chilled',
        restaurant_id: 'rest_foodmaxx',
        name: 'Ice Cold Coca-Cola (50cl Pet)',
        category: 'Drinks & Refreshers',
        description: 'Sub-zero crisp Coca-Cola served chilled for maximum thirst refreshment.',
        price: 600,
        rating: 4.8,
        reviews_count: '4.2k',
        prep_time_min: 2,
        badge: 'popular',
        is_bestseller: 0,
        image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&auto=format&fit=crop&q=80',
        is_available: 1,
        stock_quantity: 300
      }
    ];
    dishes.forEach(d => db.insert('menu_items', d));
    console.log('✅ Populated ' + dishes.length + ' authentic dishes into SQLite.');
  }

  // Add-ons
  if (db.table('addons').length === 0) {
    const addons = [
      { id: 'addon_chapman', name: 'Cold Chapman Mocktail', price: 1200, category: 'Drinks', image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400', description: 'Classic Nigerian mocktail with cucumber, lemon & bitters', is_available: 1 },
      { id: 'addon_dodo', name: 'Fried Sweet Dodo Cubes', price: 800, category: 'Sides', image_url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=400', description: 'Golden caramelized fried sweet plantain cubes', is_available: 1 },
      { id: 'addon_turkey', name: 'Peppered Turkey Cut', price: 1800, category: 'Proteins', image_url: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400', description: 'Succulent fried turkey tossed in rich spicy pepper glaze', is_available: 1 },
      { id: 'addon_coke', name: 'Chilled Soft Drink (50cl)', price: 500, category: 'Drinks', image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400', description: 'Ice-cold Coca-Cola / Fanta / Sprite', is_available: 1 },
      { id: 'addon_water', name: 'Bottled Natural Water (75cl)', price: 350, category: 'Drinks', image_url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400', description: 'Chilled premium pure spring water', is_available: 1 },
      { id: 'addon_sauce', name: 'Spicy Ata Dindin Sauce', price: 300, category: 'Extras', image_url: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=400', description: 'FoodMaxx signature hot pepper dipping reduction', is_available: 1 },
      { id: 'addon_yam_chips', name: 'Crispy Fried Yam Chips', price: 700, category: 'Sides', image_url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=400', description: 'Crispy golden deep-fried yam chips with dip', is_available: 1 },
      { id: 'addon_meat_pie', name: 'Flaky Beef Meat Pie', price: 950, category: 'Snacks', image_url: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400', description: 'Golden butter crust packed with spiced minced beef', is_available: 1 }
    ];
    addons.forEach(a => db.insert('addons', a));
  }

  // Active Promotions
  if (db.table('promotions').length === 0) {
    const promos = [
      { id: 'promo_first50', code: 'FIRST50', title: '50% First Order Discount', description: '50% off first order up to ₦2,500', discount_type: 'percentage', discount_value: 50, min_order: 3000, max_discount: 2500, is_active: 1 },
      { id: 'promo_foodmaxx10', code: 'FOODMAXX10', title: '10% Foodie Feast', description: '10% off entire order', discount_type: 'percentage', discount_value: 10, min_order: 2000, max_discount: 1000, is_active: 1 }
    ];
    promos.forEach(p => db.insert('promotions', p));
  }

  console.log('🎉 Production catalog initialization complete. No mock orders or fake data created.');
}

module.exports = { seedDatabase };

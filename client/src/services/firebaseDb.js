import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { FOODMAXX_MENU_ITEMS } from './mockData.js';
import { DEFAULT_STORE_DETAILS, getStoreDetails } from '../config/storeDetails.js';

// LIVE FIREBASE FIRESTORE DATABASE CONFIGURATION (Standard Native Instance: projects/foodmaxxapp/databases/(default))
const firebaseConfig = {
  projectId: 'foodmaxxapp',
  appId: '1:1089997088415:web:926dc33ca57ee61efba4aa',
  storageBucket: 'foodmaxxapp.firebasestorage.app',
  apiKey: 'AIzaSyAF6AcT8cCNQO81_1rknzUR1LYCLWE0zGM',
  authDomain: 'foodmaxxapp.firebaseapp.com',
  messagingSenderId: '1089997088415'
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Standard high-speed Firestore instance
let dbInstance;
try {
  dbInstance = getFirestore(app);
} catch (e) {
  try {
    dbInstance = initializeFirestore(app, {});
  } catch (err) {
    dbInstance = getFirestore(app);
  }
}
export const db = dbInstance;

// COLLECTIONS
const COLL_PRODUCTS = 'menu_items';
const COLL_ORDERS = 'orders';
const COLL_ZONES = 'delivery_zones';
const COLL_PROMOTIONS = 'promotions';
const COLL_REVIEWS = 'reviews';
const COLL_WALLETS = 'wallets';
const COLL_USERS = 'users';
const COLL_ADDONS = 'addons';
const COLL_CATEGORIES = 'categories';
const COLL_RIDERS = 'riders';
const COLL_SETTINGS = 'settings';
const COLL_SUPPORT = 'support_tickets';
const COLL_DAILY_VISITS = 'daily_visits';

export const DEFAULT_ADDONS = [];

export async function ensureLiveDatabaseSeeded() {
  try {
    const configRef = doc(db, COLL_SETTINGS, 'store_config');
    const configSnap = await getDoc(configRef);
    const configData = configSnap.exists() ? configSnap.data() : {};

    // If starter demo products have already been seeded previously, respect current state
    // so any merchant edits, replacements, or deletions are permanently preserved.
    if (configData.starter_seeded) {
      return true;
    }

    const snap = await getDocs(collection(db, COLL_PRODUCTS));
    if (snap.empty) {
      const seedPromises = FOODMAXX_MENU_ITEMS.map((item, idx) => {
        const docRef = doc(db, COLL_PRODUCTS, item.id);
        const data = cleanFirestoreObject({
          ...item,
          sort_order: idx + 1,
          is_available: true,
          stock_quantity: Number(item.stock_quantity) || 50,
          prep_time_min: Number(item.prep_time_min) || 20,
          has_portion_sizes: true,
          portion_sizes: [
            { name: 'Regular Portion', price_adjustment: 0, description: 'Standard single serving', image_url: '' },
            { name: 'Medium Feast', price_adjustment: 800, description: 'Bigger portion + extra side', image_url: '' },
            { name: 'Jumbo Executive Combo', price_adjustment: 1800, description: 'Full combo with extra protein', image_url: '' }
          ],
          flavors: [
            { name: 'Mild & Herb-Infused', price: 0 },
            { name: 'Authentic Spicy Firewood', price: 0 },
            { name: 'Extra Fiery Pepper Glaze', price: 200 }
          ],
          created_at: new Date().toISOString()
        });
        return setDoc(docRef, data, { merge: true });
      });
      await Promise.all(seedPromises);
    }

    // Record that starter products are seeded in Firestore
    await setDoc(configRef, { starter_seeded: true }, { merge: true });
  } catch (err) {
    console.warn('ensureLiveDatabaseSeeded notice:', err.message);
  }
  return true;
}

/**
 * Recursively strips undefined values so Firestore operations never fail
 * with "Unsupported field value: undefined" errors.
 */
export function cleanFirestoreObject(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanFirestoreObject(item)).filter(item => item !== undefined);
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        res[k] = cleanFirestoreObject(v);
      }
    }
    return res;
  }
  return obj;
}

// -------------------------------------------------------------
// SWR IN-MEMORY CACHE (Eliminates redundant Firestore reads)
// -------------------------------------------------------------
const memoryCache = {
  products: { data: null, timestamp: 0 },
  categories: { data: null, timestamp: 0 },
  zones: { data: null, timestamp: 0 },
  settings: { data: null, timestamp: 0 }
};
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// -------------------------------------------------------------
// LIVE PRODUCTS (MENU ITEMS) API
// -------------------------------------------------------------
export async function getLiveProducts() {
  const now = Date.now();
  if (memoryCache.products.data && (now - memoryCache.products.timestamp < CACHE_TTL_MS)) {
    return memoryCache.products.data;
  }
  let snap = await getDocs(collection(db, COLL_PRODUCTS));
  if (snap.empty) {
    await ensureLiveDatabaseSeeded();
    snap = await getDocs(collection(db, COLL_PRODUCTS));
  }
  const list = [];
  snap.forEach(d => {
    const data = d.data();
    list.push({
      id: d.id,
      ...data,
      name: data.name || 'Dish',
      price: Number(data.price || data.selling_price || 0),
      category: data.category || 'Specialties',
      is_available: data.is_available !== false && data.inStock !== false,
      stock_quantity: Number(data.stock_quantity ?? data.stockQuantity ?? 50),
      image_url: data.image_url || data.image || data.thumbnail || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=360&q=75'
    });
  });
  list.sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999) || (a.name || '').localeCompare(b.name || ''));
  memoryCache.products = { data: list, timestamp: now };
  return list;
}

export function subscribeToLiveProducts(callback) {
  const q = collection(db, COLL_PRODUCTS);
  return onSnapshot(q, (snapshot) => {
    const items = [];
    snapshot.forEach(d => {
      const data = d.data();
      items.push({
        id: d.id,
        ...data,
        name: data.name || 'Dish',
        price: Number(data.price || data.selling_price || 0),
        category: data.category || 'Specialties',
        is_available: data.is_available !== false && data.inStock !== false,
        stock_quantity: Number(data.stock_quantity ?? data.stockQuantity ?? 50),
        image_url: data.image_url || data.image || data.thumbnail || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=360&q=75'
      });
    });
    items.sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999) || (a.name || '').localeCompare(b.name || ''));
    memoryCache.products = { data: items, timestamp: Date.now() };
    callback(items);
  }, (err) => {
    console.warn('Live products onSnapshot error:', err.message);
  });
}

export async function createLiveProduct(productData) {
  const id = productData.id || ('fmx_' + Date.now());
  const docRef = doc(db, COLL_PRODUCTS, id);
  const rawData = {
    ...productData,
    id,
    name: productData.name || 'New Dish',
    price: Number(productData.price) || 0,
    category: productData.category || 'Specialties',
    is_available: productData.is_available !== false,
    stock_quantity: Number(productData.stock_quantity) || 50,
    prep_time_min: Number(productData.prep_time_min) || 20,
    has_portion_sizes: productData.has_portion_sizes !== false,
    portion_sizes: Array.isArray(productData.portion_sizes) ? productData.portion_sizes : [],
    flavors: Array.isArray(productData.flavors) ? productData.flavors : (Array.isArray(productData.options) ? productData.options : []),
    options: Array.isArray(productData.options) ? productData.options : (Array.isArray(productData.flavors) ? productData.flavors : []),
    created_at: new Date().toISOString()
  };
  const data = cleanFirestoreObject(rawData);
  await setDoc(docRef, data, { merge: true });
  return data;
}

export async function updateLiveProduct(productId, updates) {
  const docRef = doc(db, COLL_PRODUCTS, productId);
  const rawUpdates = { ...updates, updated_at: new Date().toISOString() };
  if (rawUpdates.price !== undefined) rawUpdates.price = Number(rawUpdates.price);
  if (rawUpdates.stock_quantity !== undefined) rawUpdates.stock_quantity = Number(rawUpdates.stock_quantity);
  if (rawUpdates.prep_time_min !== undefined) rawUpdates.prep_time_min = Number(rawUpdates.prep_time_min);
  if (rawUpdates.has_portion_sizes !== undefined) rawUpdates.has_portion_sizes = Boolean(rawUpdates.has_portion_sizes);
  if (rawUpdates.portion_sizes !== undefined && Array.isArray(rawUpdates.portion_sizes)) {
    rawUpdates.portion_sizes = rawUpdates.portion_sizes;
  }
  if (rawUpdates.flavors !== undefined && Array.isArray(rawUpdates.flavors)) {
    rawUpdates.flavors = rawUpdates.flavors;
  }
  if (rawUpdates.options !== undefined && Array.isArray(rawUpdates.options)) {
    rawUpdates.options = rawUpdates.options;
  }
  const clean = cleanFirestoreObject(rawUpdates);
  await updateDoc(docRef, clean);
  const updatedDoc = await getDoc(docRef);
  return { id: updatedDoc.id, ...updatedDoc.data() };
}

export async function deleteLiveProduct(productId) {
  const docRef = doc(db, COLL_PRODUCTS, productId);
  await deleteDoc(docRef);
  return { success: true, id: productId };
}

// -------------------------------------------------------------
// LIVE CATEGORIES API
// -------------------------------------------------------------
export async function getLiveCategories() {
  const now = Date.now();
  if (memoryCache.categories.data && (now - memoryCache.categories.timestamp < CACHE_TTL_MS)) {
    return memoryCache.categories.data;
  }
  const snap = await getDocs(collection(db, COLL_CATEGORIES));
  const list = [];
  snap.forEach(d => list.push({ id: d.id, ...d.data() }));
  list.sort((a, b) => (a.sort_order || 99) - (b.sort_order || 99));
  memoryCache.categories = { data: list, timestamp: now };
  return list;
}

export function subscribeToLiveCategories(callback) {
  const q = collection(db, COLL_CATEGORIES);
  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
    list.sort((a, b) => (a.sort_order || 99) - (b.sort_order || 99));
    memoryCache.categories = { data: list, timestamp: Date.now() };
    callback(list);
  }, (err) => {
    console.warn('Live categories onSnapshot error:', err.message);
  });
}

export async function createLiveCategory(categoryData) {
  const id = categoryData.id || ('cat_' + Date.now());
  const docRef = doc(db, COLL_CATEGORIES, id);
  const data = {
    ...categoryData,
    id,
    name: categoryData.name || 'Category',
    icon: categoryData.icon || '🍽️',
    is_active: categoryData.is_active !== false,
    sort_order: Number(categoryData.sort_order || 10),
    created_at: new Date().toISOString()
  };
  await setDoc(docRef, data, { merge: true });
  return data;
}

export async function updateLiveCategory(categoryId, updates) {
  const docRef = doc(db, COLL_CATEGORIES, categoryId);
  await updateDoc(docRef, { ...updates, updated_at: new Date().toISOString() });
  const snap = await getDoc(docRef);
  return { id: snap.id, ...snap.data() };
}

export async function deleteLiveCategory(categoryId) {
  const docRef = doc(db, COLL_CATEGORIES, categoryId);
  await deleteDoc(docRef);
  return { success: true, id: categoryId };
}

// -------------------------------------------------------------
// LIVE ADD-ONS & EXTRAS API
// -------------------------------------------------------------
export async function getLiveAddons() {
  const snap = await getDocs(collection(db, COLL_ADDONS));
  const list = [];
  snap.forEach(d => list.push({ id: d.id, ...d.data() }));
  return list;
}

export function subscribeToLiveAddons(callback) {
  const q = collection(db, COLL_ADDONS);
  return onSnapshot(q, (snapshot) => {
    const items = [];
    snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    items.sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || ''));
    callback(items);
  }, (err) => {
    console.warn('Live addons onSnapshot error:', err.message);
  });
}

export async function createLiveAddon(addonData) {
  const id = addonData.id || ('addon_' + Date.now());
  const docRef = doc(db, COLL_ADDONS, id);
  const data = {
    ...addonData,
    id,
    price: Number(addonData.price) || 0,
    is_available: addonData.is_available !== false,
    created_at: new Date().toISOString()
  };
  await setDoc(docRef, data, { merge: true });
  return data;
}

export async function updateLiveAddon(addonId, updates) {
  const docRef = doc(db, COLL_ADDONS, addonId);
  const cleanUpdates = { ...updates, updated_at: new Date().toISOString() };
  if (cleanUpdates.price !== undefined) cleanUpdates.price = Number(cleanUpdates.price);
  await updateDoc(docRef, cleanUpdates);
  const updatedDoc = await getDoc(docRef);
  return { id: updatedDoc.id, ...updatedDoc.data() };
}

export async function deleteLiveAddon(addonId) {
  const docRef = doc(db, COLL_ADDONS, addonId);
  await deleteDoc(docRef);
  return { success: true, id: addonId };
}

// -------------------------------------------------------------
// LIVE ORDERS API (REALTIME CUSTOMER & ADMIN WORKFLOW)
// -------------------------------------------------------------
function normalizeOrder(docId, data) {
  let created_at = new Date().toISOString();
  if (data.created_at) {
    created_at = data.created_at;
  } else if (data.createdAt?.seconds) {
    created_at = new Date(data.createdAt.seconds * 1000).toISOString();
  } else if (typeof data.createdAt === 'string') {
    created_at = data.createdAt;
  }

  let items = [];
  if (Array.isArray(data.items)) {
    items = data.items.map((it, idx) => {
      if (typeof it === 'string') {
        return { id: 'it_' + idx, name: it, price: 0, qty: 1, selectedSize: 'Standard', selectedExtras: [] };
      }
      return {
        id: it.id || it.item_id || ('it_' + idx),
        name: it.name || 'Dish',
        price: Number(it.price || it.unit_price || 0),
        qty: Number(it.qty || it.quantity || 1),
        selectedSize: it.selectedSize || it.selected_size || 'Standard',
        selectedExtras: it.selectedExtras || it.selected_extras || []
      };
    });
  }

  let customer = {
    id: data.customer_id || ('cust_' + docId),
    full_name: typeof data.customer === 'string' ? data.customer : (data.customer?.full_name || data.customer_name || 'Customer'),
    phone: data.phone || data.customer_phone || data.customer?.phone || '',
    email: data.email || data.customer_email || data.customer?.email || ''
  };

  const subtotal = Number(data.subtotal !== undefined ? data.subtotal : (data.total || 0));
  const delivery_fee = Number(data.delivery_fee || 0);
  const service_fee = Number(data.service_fee || 0);
  const discount = Number(data.discount || 0);
  const total = Number(data.total !== undefined ? data.total : (subtotal + delivery_fee + service_fee - discount));

  const rawStatus = (data.order_status || data.status || 'ORDER_PLACED').toUpperCase();
  const normalizedStatus = rawStatus === 'PENDING' ? 'ORDER_PLACED' : rawStatus;

  return {
    ...data,
    id: docId,
    order_reference: data.order_reference || docId,
    delivery_otp: String(data.delivery_otp || data.otp || ''),
    order_status: normalizedStatus,
    status: normalizedStatus,
    payment_status: data.payment_status || data.paymentStatus || 'paid',
    payment_method: data.payment_method || data.paymentMethod || 'paystack',
    payment_reference: data.payment_reference || data.paymentReference || '',
    delivery_address: data.delivery_address || data.branch || 'Bodija, Ibadan',
    delivery_zone: data.delivery_zone || 'Bodija',
    items,
    customer,
    customer_name: customer.full_name,
    customer_phone: customer.phone,
    customer_email: customer.email,
    subtotal,
    delivery_fee,
    service_fee,
    discount,
    total,
    created_at,
    status_history: Array.isArray(data.status_history) ? data.status_history : [
      { status: normalizedStatus, timestamp: created_at, note: 'Order placed' }
    ]
  };
}

export function subscribeToCustomerLiveOrders(customerFilter, callback) {
  const userId = typeof customerFilter === 'string' ? customerFilter.trim() : (customerFilter?.id || '');
  if (!userId) {
    if (typeof callback === 'function') callback([]);
    return () => {};
  }
  const q = query(
    collection(db, COLL_ORDERS),
    where('customer_id', '==', userId),
    limit(40)
  );
  return onSnapshot(q, (snapshot) => {
    const orders = [];
    snapshot.forEach(doc => {
      orders.push(normalizeOrder(doc.id, doc.data()));
    });
    orders.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    callback(orders);
  }, (err) => {
    console.warn('Customer live orders subscription notice:', err?.message);
    if (typeof callback === 'function') callback([]);
  });
}

export async function getCustomerLiveOrders(userId, userPhone = '', deviceOrderIds = []) {
  const cleanId = typeof userId === 'string' ? userId.trim() : (userId?.id || '');
  const cleanPhone = typeof userPhone === 'string' ? userPhone.trim() : (userId?.phone || '');
  const idList = Array.isArray(deviceOrderIds) ? deviceOrderIds.map(x => String(x).trim()).filter(Boolean) : [];

  if (!cleanId && !cleanPhone && idList.length === 0) return [];
  try {
    const orderMap = new Map();

    // 1. Query by customer_id if available
    if (cleanId) {
      try {
        const q = query(
          collection(db, COLL_ORDERS),
          where('customer_id', '==', cleanId),
          limit(50)
        );
        const snap = await getDocs(q);
        snap.forEach(d => {
          const norm = normalizeOrder(d.id, d.data());
          orderMap.set(norm.id, norm);
        });
      } catch (e) {
        console.warn('Query orders by customer_id notice:', e?.message);
      }
    }

    // 2. Query by customer_phone if available
    if (cleanPhone) {
      try {
        const qPhone = query(
          collection(db, COLL_ORDERS),
          where('customer_phone', '==', cleanPhone),
          limit(50)
        );
        const snapPhone = await getDocs(qPhone);
        snapPhone.forEach(d => {
          const norm = normalizeOrder(d.id, d.data());
          orderMap.set(norm.id, norm);
        });
      } catch (e) {
        console.warn('Query orders by customer_phone notice:', e?.message);
      }
    }

    // 3. Fetch device-specific orders
    if (idList.length > 0) {
      for (const ordId of idList.slice(0, 15)) {
        if (!orderMap.has(ordId)) {
          try {
            const single = await getLiveOrderById(ordId);
            if (single?.id) {
              orderMap.set(single.id, single);
            }
          } catch {}
        }
      }
    }

    const orders = Array.from(orderMap.values());
    orders.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return orders;
  } catch (err) {
    console.warn('getCustomerLiveOrders notice:', err?.message);
    return [];
  }
}

export async function getLiveOrderById(orderId) {
  const cleanId = String(orderId || '').trim();
  if (!cleanId) return null;
  try {
    const docRef = doc(db, COLL_ORDERS, cleanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return normalizeOrder(snap.id, snap.data());
    }
    const q = query(collection(db, COLL_ORDERS), where('order_reference', '==', cleanId), limit(1));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      const firstDoc = querySnap.docs[0];
      return normalizeOrder(firstDoc.id, firstDoc.data());
    }
    return null;
  } catch (err) {
    console.warn('getLiveOrderById notice:', err?.message);
    return null;
  }
}


export function subscribeToLiveOrders(callback, maxOrders = 60) {
  const q = query(collection(db, COLL_ORDERS), limit(maxOrders));
  return onSnapshot(q, (snapshot) => {
    const orders = [];
    snapshot.forEach(doc => {
      orders.push(normalizeOrder(doc.id, doc.data()));
    });
    orders.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    callback(orders);
  }, (err) => {
    console.warn('Live orders onSnapshot error:', err.message);
  });
}

export async function getLiveOrders(maxOrders = 60) {
  const q = query(collection(db, COLL_ORDERS), limit(maxOrders));
  const snap = await getDocs(q);
  const orders = [];
  snap.forEach(d => orders.push(normalizeOrder(d.id, d.data())));
  orders.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return orders;
}

export async function createLiveOrder(orderData) {
  const id = orderData.id || ('ORD-' + Math.floor(100000 + Math.random() * 900000));
  const ref = orderData.order_reference || ('FMX-' + Math.floor(100000 + Math.random() * 900000));
  const otp = orderData.delivery_otp || String(Math.floor(1000 + Math.random() * 9000));

  const items = (Array.isArray(orderData.items) && orderData.items.length > 0)
    ? orderData.items
    : (Array.isArray(orderData.cart_items) ? orderData.cart_items : []).map(ci => ({
        id: ci.item_id || ci.id || ('it_' + Date.now()),
        name: ci.name || 'FoodMaxx Dish',
        price: Number(ci.price) || 0,
        qty: Number(ci.quantity || ci.qty || 1),
        selectedSize: ci.selected_size || ci.selectedSize || 'Standard',
        selectedExtras: ci.selected_extras || ci.selectedExtras || []
      }));

  const customer = orderData.customer || {
    id: orderData.customer_id || ('usr_' + Date.now()),
    full_name: orderData.customer_name || 'Customer',
    phone: orderData.customer_phone || '',
    email: orderData.customer_email || ''
  };

  const subtotal = Number(orderData.subtotal !== undefined ? orderData.subtotal : items.reduce((sum, i) => sum + (Number(i.price || 0) * Number(i.qty || 1)), 0));
  const delivery_fee = Number(orderData.delivery_fee !== undefined ? orderData.delivery_fee : 500);
  const service_fee = Number(orderData.service_fee !== undefined ? orderData.service_fee : 250);
  const discount = Number(orderData.discount || 0);
  const total = Number(orderData.total !== undefined ? orderData.total : Math.max(0, subtotal + delivery_fee + service_fee - discount));

  const nowIso = new Date().toISOString();
  const orderDoc = {
    ...orderData,
    id,
    order_reference: ref,
    delivery_otp: otp,
    order_status: orderData.order_status || 'ORDER_PLACED',
    status: orderData.order_status || 'ORDER_PLACED',
    payment_status: orderData.payment_status || 'paid',
    payment_method: orderData.payment_method || 'paystack',
    payment_reference: orderData.payment_reference || ('PAY-' + Date.now()),
    items,
    customer,
    customer_id: customer.id,
    customer_name: customer.full_name,
    customer_phone: customer.phone,
    customer_email: customer.email,
    subtotal,
    delivery_fee,
    service_fee,
    discount,
    total,
    delivery_address: orderData.delivery_address || 'Bodija, Ibadan',
    delivery_zone: orderData.delivery_zone || 'Bodija',
    created_at: nowIso,
    status_history: [
      { status: 'ORDER_PLACED', timestamp: nowIso, note: 'Order placed by customer via Paystack / Card' }
    ]
  };

  const cleanedOrderDoc = cleanFirestoreObject(orderDoc);
  const docRef = doc(db, COLL_ORDERS, id);
  await setDoc(docRef, cleanedOrderDoc, { merge: true });
  return cleanedOrderDoc;
}

export async function updateLiveOrderStatus(orderId, newStatus, note = '') {
  let docRef = doc(db, COLL_ORDERS, orderId);
  let snap = await getDoc(docRef);

  if (!snap.exists()) {
    const q = query(collection(db, COLL_ORDERS), where('order_reference', '==', orderId));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      const matched = querySnap.docs[0];
      docRef = doc(db, COLL_ORDERS, matched.id);
      snap = matched;
    } else {
      throw new Error('Order not found');
    }
  }

  const current = snap.data();
  const history = current.status_history || [];
  history.push({
    status: newStatus,
    timestamp: new Date().toISOString(),
    note: note || ('Status updated to ' + newStatus)
  });

  const updates = cleanFirestoreObject({
    order_status: newStatus,
    status: newStatus,
    status_notes: note || '',
    status_history: history,
    updated_at: new Date().toISOString()
  });
  await updateDoc(docRef, updates);
  return { ...current, ...updates };
}

export async function assignLiveRider(orderId, riderData, status = 'ON_THE_WAY') {
  let docRef = doc(db, COLL_ORDERS, orderId);
  let snap = await getDoc(docRef);

  if (!snap.exists()) {
    const q = query(collection(db, COLL_ORDERS), where('order_reference', '==', orderId));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      const matched = querySnap.docs[0];
      docRef = doc(db, COLL_ORDERS, matched.id);
      snap = matched;
    } else {
      throw new Error('Order not found');
    }
  }

  const current = snap.data();
  const history = current.status_history || [];
  const riderName = riderData.full_name || riderData.name || 'Assigned Courier';
  const riderPhone = riderData.phone || '';
  const riderVehicle = riderData.vehicle_type || 'Motorcycle';

  history.push({
    status: status,
    timestamp: new Date().toISOString(),
    note: `Assigned dispatch rider: ${riderName} (${riderPhone})`
  });

  const normalizedRiderPayload = {
    id: riderData.id || 'r_assigned',
    full_name: riderName,
    name: riderName,
    phone: riderPhone,
    vehicle_type: riderVehicle,
    plate_number: riderData.plate_number || '',
    rating: riderData.rating || 4.9
  };

  const updates = cleanFirestoreObject({
    assigned_rider: normalizedRiderPayload,
    riderInfo: normalizedRiderPayload,
    rider_name: riderName,
    rider_phone: riderPhone,
    rider_vehicle: riderVehicle,
    order_status: status,
    status: status,
    status_notes: `Assigned to ${riderName}`,
    status_history: history,
    updated_at: new Date().toISOString()
  });

  await updateDoc(docRef, updates);

  // If rider has an ID in COLL_RIDERS, mark as busy & record active order
  if (riderData.id) {
    try {
      const riderRef = doc(db, COLL_RIDERS, riderData.id);
      await updateDoc(riderRef, {
        status: 'busy',
        active_order_ref: current.order_reference || snap.id,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Could not update rider doc status:', e.message);
    }
  }

  return { ...current, ...updates };
}

export async function verifyLiveOrderOtp(orderId, enteredOtp) {
  const docRef = doc(db, COLL_ORDERS, orderId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return { success: false, message: 'Order not found' };
  const order = snap.data();
  if (String(order.delivery_otp).trim() === String(enteredOtp).trim()) {
    await updateLiveOrderStatus(orderId, 'DELIVERED', 'Verified with Customer Delivery OTP');
    return { success: true, message: 'OTP verified successfully! Order marked DELIVERED.' };
  }
  return { success: false, message: 'Incorrect OTP. Please check customer phone app.' };
}

// -------------------------------------------------------------
// LIVE RIDERS API
// -------------------------------------------------------------
export function normalizeRider(id, data = {}) {
  const name = data.full_name || data.name || 'Courier';
  return {
    ...data,
    id: id || data.id,
    name,
    full_name: name,
    phone: data.phone || data.mobile || '',
    status: data.status || 'available',
    is_online: data.is_online !== undefined ? Boolean(data.is_online) : (data.status !== 'offline'),
    vehicle_type: data.vehicle_type || 'Motorcycle',
    plate_number: data.plate_number || '',
    rating: typeof data.rating === 'number' ? data.rating : 5.0,
    total_deliveries: typeof data.total_deliveries === 'number' ? data.total_deliveries : 0,
    zone: data.zone || 'Bodija'
  };
}

export async function getLiveRiders() {
  const snap = await getDocs(collection(db, COLL_RIDERS));
  const list = [];
  snap.forEach(d => list.push(normalizeRider(d.id, d.data())));
  return list;
}

export function subscribeToLiveRiders(callback) {
  const q = collection(db, COLL_RIDERS);
  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach(d => list.push(normalizeRider(d.id, d.data())));
    callback(list);
  }, (err) => {
    console.warn('Live riders onSnapshot error:', err.message);
  });
}

export async function createLiveRider(riderData) {
  const id = riderData.id || ('r_' + Date.now());
  const docRef = doc(db, COLL_RIDERS, id);
  const data = {
    ...riderData,
    id,
    name: riderData.name || riderData.full_name || 'Rider',
    full_name: riderData.name || riderData.full_name || 'Rider',
    phone: riderData.phone || '',
    status: riderData.status || 'available',
    is_online: riderData.is_online !== false,
    created_at: new Date().toISOString()
  };
  await setDoc(docRef, data, { merge: true });
  return data;
}

export async function updateLiveRider(riderId, updates) {
  const docRef = doc(db, COLL_RIDERS, riderId);
  await updateDoc(docRef, { ...updates, updated_at: new Date().toISOString() });
  const snap = await getDoc(docRef);
  return { id: snap.id, ...snap.data() };
}

export async function toggleLiveRiderStatus(riderId) {
  const docRef = doc(db, COLL_RIDERS, riderId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Rider not found');
  const current = snap.data();
  const nextStatus = current.status === 'available' ? 'busy' : 'available';
  await updateDoc(docRef, { status: nextStatus, is_online: nextStatus === 'available', updated_at: new Date().toISOString() });
  return { ...current, status: nextStatus, is_online: nextStatus === 'available' };
}

// -------------------------------------------------------------
// LIVE ZONES API
// -------------------------------------------------------------
export async function getLiveZones() {
  const snap = await getDocs(collection(db, COLL_ZONES));
  const zones = [];
  snap.forEach(d => zones.push({ id: d.id, ...d.data() }));
  return zones;
}

export function subscribeToLiveZones(callback) {
  const q = collection(db, COLL_ZONES);
  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
    callback(list);
  }, (err) => {
    console.warn('Live zones onSnapshot error:', err.message);
  });
}

export async function updateLiveZone(zoneId, updates) {
  const docRef = doc(db, COLL_ZONES, zoneId);
  await updateDoc(docRef, { ...updates, updated_at: new Date().toISOString() });
  const snap = await getDoc(docRef);
  return { id: snap.id, ...snap.data() };
}

export async function createLiveZone(zoneData) {
  const id = zoneData.id || ('zone_' + (zoneData.name || '').toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-4));
  const docRef = doc(db, COLL_ZONES, id);
  const data = {
    ...zoneData,
    id,
    name: zoneData.name || 'New Delivery Zone',
    city: zoneData.city || 'Ibadan',
    delivery_fee: Number(zoneData.delivery_fee) || 600,
    min_order: Number(zoneData.min_order) || 2000,
    estimated_delivery_time: zoneData.estimated_delivery_time || '25-35 min',
    is_active: zoneData.is_active !== false,
    created_at: new Date().toISOString()
  };
  await setDoc(docRef, data, { merge: true });
  return data;
}

export async function deleteLiveZone(zoneId) {
  const docRef = doc(db, COLL_ZONES, zoneId);
  await deleteDoc(docRef);
  return { success: true, id: zoneId };
}

// -------------------------------------------------------------
// LIVE PROMOTIONS API
// -------------------------------------------------------------
export async function getLivePromotions() {
  const snap = await getDocs(collection(db, COLL_PROMOTIONS));
  const list = [];
  snap.forEach(d => list.push({ id: d.id, ...d.data() }));
  return list;
}

export async function createLivePromotion(promoData) {
  const id = promoData.id || ('promo_' + (promoData.code || '').toLowerCase());
  const docRef = doc(db, COLL_PROMOTIONS, id);
  const data = {
    ...promoData,
    id,
    code: (promoData.code || '').toUpperCase().trim(),
    discount_type: promoData.discount_type || 'percentage',
    discount_value: Number(promoData.discount_value) || 10,
    max_discount: Number(promoData.max_discount) || 1000,
    min_order: Number(promoData.min_order) || 2000,
    is_active: promoData.is_active !== false,
    created_at: new Date().toISOString()
  };
  await setDoc(docRef, data, { merge: true });
  return data;
}

export async function updateLivePromotion(promoId, updates) {
  const docRef = doc(db, COLL_PROMOTIONS, promoId);
  await updateDoc(docRef, { ...updates, updated_at: new Date().toISOString() });
  const snap = await getDoc(docRef);
  return { id: snap.id, ...snap.data() };
}

export async function deleteLivePromotion(promoId) {
  const docRef = doc(db, COLL_PROMOTIONS, promoId);
  await deleteDoc(docRef);
  return { success: true, id: promoId };
}

// -------------------------------------------------------------
// LIVE STORE SETTINGS API
// -------------------------------------------------------------
export async function getLiveSettings() {
  const now = Date.now();
  if (memoryCache.settings.data && (now - memoryCache.settings.timestamp < CACHE_TTL_MS)) {
    return memoryCache.settings.data;
  }
  const docRef = doc(db, COLL_SETTINGS, 'store_config');
  const snap = await getDoc(docRef);
  const baseDefaults = getStoreDetails();
  let res;
  if (snap.exists()) {
    const data = snap.data();
    const isStoreOpen = data.is_open !== undefined ? (data.is_open === true || data.is_open === 'true') : (data.isOpen !== false);
    res = {
      ...baseDefaults,
      ...data,
      phone: data.supportContact || data.phone || baseDefaults.phone,
      address: data.address || baseDefaults.address,
      is_open: isStoreOpen,
      isOpen: isStoreOpen,
      kitchen_status: isStoreOpen ? 'open' : 'closed'
    };
  } else {
    res = {
      ...baseDefaults,
      is_open: true,
      isOpen: true,
      kitchen_status: 'open'
    };
  }
  memoryCache.settings = { data: res, timestamp: now };
  return res;
}

export function subscribeToLiveSettings(callback) {
  const docRef = doc(db, COLL_SETTINGS, 'store_config');
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      const baseDefaults = getStoreDetails();
      const isStoreOpen = data.is_open !== undefined ? (data.is_open === true || data.is_open === 'true') : (data.isOpen !== false);
      const payload = {
        ...baseDefaults,
        ...data,
        phone: data.supportContact || data.phone || baseDefaults.phone,
        address: data.address || baseDefaults.address,
        is_open: isStoreOpen,
        isOpen: isStoreOpen,
        kitchen_status: isStoreOpen ? 'open' : 'closed'
      };
      memoryCache.settings = { data: payload, timestamp: Date.now() };
      callback(payload);
    }
  }, (err) => {
    console.warn('Live settings onSnapshot error:', err.message);
  });
}

export async function updateLiveSettings(updates) {
  const docRef = doc(db, COLL_SETTINGS, 'store_config');
  const targetOpen = updates.is_open !== undefined ? (updates.is_open === true || updates.is_open === 'true') : (updates.isOpen !== undefined ? (updates.isOpen === true || updates.isOpen === 'true') : true);
  const clean = cleanFirestoreObject({
    ...updates,
    isOpen: targetOpen,
    is_open: targetOpen,
    kitchen_status: targetOpen ? 'open' : 'closed',
    updated_at: new Date().toISOString()
  });
  await setDoc(docRef, clean, { merge: true });
  // Invalidate memory cache so immediate reads are fresh!
  memoryCache.settings = { data: null, timestamp: 0 };
  return getLiveSettings();
}

// -------------------------------------------------------------
// LIVE HOMEPAGE SECTIONS API
// -------------------------------------------------------------
export const DEFAULT_HOMEPAGE_SECTIONS = [
  { id: 'sec_top', title: 'Top Picks on FoodMaxx', subtitle: 'Curated popular items', icon: 'Sparkles', enabled: true, filter_type: 'bestseller', display_limit: 6 },
  { id: 'sec_trend', title: 'Trending Now', subtitle: 'Hot right now in Bodija & UI', icon: 'Flame', enabled: true, filter_type: 'popular', display_limit: 6 },
  { id: 'sec_deals', title: 'Special Offers & Combos', subtitle: 'Great meals at best value', icon: 'Tag', enabled: true, filter_type: 'deals', display_limit: 6 },
  { id: 'sec_fast', title: 'Quick Bites & Fast Prep', subtitle: 'Ready in 25 min or less', icon: 'Clock', enabled: true, filter_type: 'fast', display_limit: 6 },
];

export async function getLiveHomepageSections() {
  try {
    const docRef = doc(db, COLL_SETTINGS, 'homepage_sections');
    const snap = await getDoc(docRef);
    if (snap.exists() && Array.isArray(snap.data()?.sections) && snap.data().sections.length > 0) {
      return snap.data().sections;
    }
  } catch (e) {
    console.warn('Error reading live homepage sections:', e);
  }
  return DEFAULT_HOMEPAGE_SECTIONS;
}

export function subscribeToLiveHomepageSections(callback) {
  const docRef = doc(db, COLL_SETTINGS, 'homepage_sections');
  return onSnapshot(docRef, (snap) => {
    if (snap.exists() && Array.isArray(snap.data()?.sections) && snap.data().sections.length > 0) {
      callback(snap.data().sections);
    } else {
      callback(DEFAULT_HOMEPAGE_SECTIONS);
    }
  }, (err) => {
    console.warn('Live homepage sections onSnapshot error:', err.message);
  });
}

export async function updateLiveHomepageSections(sections) {
  const docRef = doc(db, COLL_SETTINGS, 'homepage_sections');
  const clean = cleanFirestoreObject({
    sections: Array.isArray(sections) ? sections : DEFAULT_HOMEPAGE_SECTIONS,
    updated_at: new Date().toISOString()
  });
  await setDoc(docRef, clean, { merge: true });
  return clean.sections;
}

// -------------------------------------------------------------
// LIVE WALLET & USER API
// -------------------------------------------------------------
export async function getLiveWallet(userId) {
  const cleanId = String(userId || '').trim();
  if (!cleanId || cleanId === 'usr_customer_default') {
    return { balance: 0, currency: 'NGN', transactions: [] };
  }
  const docRef = doc(db, COLL_WALLETS, cleanId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    // If wallet has zero balance and no transactions, seed welcome bonus
    if ((!data.balance || data.balance === 0) && (!data.transactions || data.transactions.length === 0)) {
      const welcomeBalance = 1000;
      const initialWithBonus = {
        user_id: cleanId,
        balance: welcomeBalance,
        currency: 'NGN',
        transactions: [{
          id: 'tx_welcome_' + Date.now(),
          type: 'credit',
          amount: welcomeBalance,
          description: '🎁 ₦1,000 Welcome Bonus Credit',
          reference: 'WELCOME-BONUS',
          date: new Date().toISOString()
        }]
      };
      await setDoc(docRef, initialWithBonus, { merge: true });
      return initialWithBonus;
    }
    return data;
  }
  const initial = {
    user_id: cleanId,
    balance: 1000,
    currency: 'NGN',
    transactions: [{
      id: 'tx_welcome_' + Date.now(),
      type: 'credit',
      amount: 1000,
      description: '🎁 ₦1,000 Welcome Bonus Credit',
      reference: 'WELCOME-BONUS',
      date: new Date().toISOString()
    }]
  };
  await setDoc(docRef, initial, { merge: true });
  return initial;
}

export async function topUpLiveWallet(userId, amount, reference) {
  const cleanId = String(userId || '').trim();
  if (!cleanId || cleanId === 'usr_customer_default') {
    throw new Error('Authenticated user required for wallet top-up');
  }
  const docRef = doc(db, COLL_WALLETS, cleanId);
  const wallet = await getLiveWallet(cleanId);
  const newBalance = (wallet.balance || 0) + Number(amount);
  const txs = wallet.transactions || [];
  txs.unshift({
    id: 'tx_' + Date.now(),
    type: 'credit',
    amount: Number(amount),
    description: reference ? `Paystack Top-up (${reference})` : 'Wallet Top-up via Paystack',
    reference: reference || ('TOPUP-' + Date.now()),
    date: new Date().toISOString()
  });
  await setDoc(docRef, { balance: newBalance, transactions: txs }, { merge: true });
  return { balance: newBalance, transactions: txs };
}

export async function deductLiveWallet(userId, amount, description = 'Order Payment', reference = '') {
  const cleanId = String(userId || '').trim();
  if (!cleanId || cleanId === 'usr_customer_default') {
    throw new Error('Authenticated user required for wallet deduction');
  }
  const docRef = doc(db, COLL_WALLETS, cleanId);
  const wallet = await getLiveWallet(cleanId);
  if ((wallet.balance || 0) < Number(amount)) {
    throw new Error('Insufficient wallet balance');
  }
  const newBalance = wallet.balance - Number(amount);
  const txs = wallet.transactions || [];
  txs.unshift({
    id: 'tx_' + Date.now(),
    type: 'debit',
    amount: Number(amount),
    description,
    reference,
    date: new Date().toISOString()
  });
  await setDoc(docRef, { balance: newBalance, transactions: txs }, { merge: true });
  return { balance: newBalance, transactions: txs };
}

// -------------------------------------------------------------
// LIVE USERS & CUSTOMERS API
// -------------------------------------------------------------
export function processLiveCustomers(usersDocs = [], ordersDocs = []) {
  const customerMap = new Map();
  const phoneToUserId = new Map();
  const emailToUserId = new Map();

  const cleanPhone = (p) => p ? String(p).replace(/\D/g, '').slice(-10) : '';
  const cleanEmail = (e) => e ? String(e).toLowerCase().trim() : '';

  // 1. Ingest all registered users from COLL_USERS
  usersDocs.forEach(docItem => {
    const id = docItem.id;
    const data = typeof docItem.data === 'function' ? docItem.data() : docItem;
    if (!id || !data) return;

    // Filter out internal admin / staff / rider accounts
    const email = cleanEmail(data.email);
    const role = (data.role || '').toLowerCase();
    const isAdmin = id === 'user_admin' ||
                    role === 'super_admin' ||
                    role === 'admin' ||
                    role === 'kitchen_staff' ||
                    role === 'rider' ||
                    email === 'admin@foodmaxx.ng' ||
                    email === 'superadmin@foodmaxx.ng' ||
                    email.startsWith('admin@');

    if (isAdmin) return;

    const fullName = data.full_name || data.name || (email ? email.split('@')[0] : 'Customer');
    const phone = data.phone || '';
    const cPhone = cleanPhone(phone);
    const regDate = data.registered_at || data.created_at || (data.updated_at ? data.updated_at : null);

    // Check if we already processed this exact user document ID
    if (customerMap.has(id)) {
      return;
    }

    const customerObj = {
      id,
      full_name: fullName,
      email: data.email || '',
      phone: phone,
      avatar_url: data.avatar_url || data.photo || '',
      gender: data.gender || '',
      status: data.status || 'active',
      is_registered: true,
      registered_at: regDate,
      created_at: data.created_at || regDate,
      orders_count: Number(data.orders_count) || 0,
      total_orders: Number(data.total_orders || data.orders_count) || 0,
      total_spent: Number(data.total_spent) || 0,
      last_ordered: data.last_ordered || null,
      addresses: Array.isArray(data.savedAddresses) ? data.savedAddresses : (data.address ? [data.address] : [])
    };

    customerMap.set(id, customerObj);
    if (cPhone && !phoneToUserId.has(cPhone)) phoneToUserId.set(cPhone, id);
    if (email && email !== 'customer@foodmaxx.ng' && !emailToUserId.has(email)) emailToUserId.set(email, id);
  });

  // 2. Correlate with real orders from COLL_ORDERS
  const guestMap = new Map();

  ordersDocs.forEach(orderItem => {
    const oData = typeof orderItem.data === 'function' ? orderItem.data() : orderItem;
    if (!oData) return;

    const oCustId = oData.customer_id || oData.customer?.id;
    const oEmail = cleanEmail(oData.customer_email || oData.email || oData.customer?.email);
    const rawPhone = oData.customer_phone || oData.phone || oData.customer?.phone;
    const oPhone = cleanPhone(rawPhone);
    const orderTotal = Number(oData.total || oData.total_amount || 0);
    const orderDate = oData.created_at || oData.createdAt;

    // Check if order belongs to internal admin - skip if so
    if (oEmail === 'admin@foodmaxx.ng' && (!rawPhone || !phoneToUserId.has(oPhone))) {
      // Internal test order placed under admin account
      return;
    }

    // Match order to registered customer
    let matchedId = null;
    if (oCustId && customerMap.has(oCustId)) {
      matchedId = oCustId;
    } else if (oEmail && emailToUserId.has(oEmail)) {
      matchedId = emailToUserId.get(oEmail);
    } else if (oPhone && phoneToUserId.has(oPhone)) {
      matchedId = phoneToUserId.get(oPhone);
    }

    if (matchedId && customerMap.has(matchedId)) {
      const regCust = customerMap.get(matchedId);
      regCust.orders_count += 1;
      regCust.total_orders += 1;
      regCust.total_spent += orderTotal;

      if (!regCust.phone && rawPhone) {
        regCust.phone = rawPhone;
        if (oPhone && !phoneToUserId.has(oPhone)) phoneToUserId.set(oPhone, matchedId);
      }
      if (!regCust.email && oEmail) {
        regCust.email = oData.customer_email || oData.email || oData.customer?.email;
        if (!emailToUserId.has(oEmail)) emailToUserId.set(oEmail, matchedId);
      }
      if ((!regCust.full_name || regCust.full_name === 'Customer') && (oData.customer_name || oData.customer?.full_name)) {
        regCust.full_name = oData.customer_name || oData.customer?.full_name;
      }
      if (orderDate && (!regCust.last_ordered || new Date(orderDate) > new Date(regCust.last_ordered))) {
        regCust.last_ordered = orderDate;
      }
    } else {
      // Guest or unregistered buyer
      const guestKey = oPhone || oEmail || ('guest_' + (oData.id || Math.random()));
      let guest = guestMap.get(guestKey);
      if (!guest) {
        guest = {
          id: 'guest_' + (oPhone || (oEmail ? oEmail.replace(/[^a-z0-9]/g, '_') : (oData.id || Date.now()))),
          full_name: oData.customer_name || (typeof oData.customer === 'string' ? oData.customer : oData.customer?.full_name) || 'Guest Diner',
          email: oData.customer_email || oData.email || oData.customer?.email || '',
          phone: rawPhone || '',
          status: 'guest',
          is_registered: false,
          registered_at: null,
          created_at: orderDate || null,
          orders_count: 0,
          total_orders: 0,
          total_spent: 0,
          last_ordered: null,
          addresses: []
        };
        guestMap.set(guestKey, guest);
      }
      guest.orders_count += 1;
      guest.total_orders += 1;
      guest.total_spent += orderTotal;
      if (orderDate && (!guest.last_ordered || new Date(orderDate) > new Date(guest.last_ordered))) {
        guest.last_ordered = orderDate;
      }
    }
  });

  const registeredList = Array.from(new Set(customerMap.values()));
  const guestList = Array.from(guestMap.values());

  // Sort registered customers: newest registration / activity first
  registeredList.sort((a, b) => {
    const dateA = new Date(a.registered_at || a.last_ordered || a.created_at || 0).getTime();
    const dateB = new Date(b.registered_at || b.last_ordered || b.created_at || 0).getTime();
    return dateB - dateA;
  });

  // Sort guest buyers by latest order
  guestList.sort((a, b) => {
    const dateA = new Date(a.last_ordered || 0).getTime();
    const dateB = new Date(b.last_ordered || 0).getTime();
    return dateB - dateA;
  });

  return [...registeredList, ...guestList];
}

export async function getLiveCustomers() {
  const [usersSnap, ordersSnap] = await Promise.all([
    getDocs(collection(db, COLL_USERS)),
    getDocs(collection(db, COLL_ORDERS))
  ]);
  return processLiveCustomers(usersSnap.docs, ordersSnap.docs);
}

export function subscribeToLiveCustomers(callback) {
  if (typeof callback !== 'function') return () => {};

  let currentUsersDocs = [];
  let currentOrdersDocs = [];
  let unsubUsers = null;
  let unsubOrders = null;

  const emit = () => {
    try {
      const customers = processLiveCustomers(currentUsersDocs, currentOrdersDocs);
      callback(customers);
    } catch (e) {
      console.warn('Error processing live customers:', e);
    }
  };

  try {
    unsubUsers = onSnapshot(collection(db, COLL_USERS), (snap) => {
      currentUsersDocs = snap.docs;
      emit();
    }, (err) => console.warn('Live users onSnapshot error:', err.message));

    unsubOrders = onSnapshot(collection(db, COLL_ORDERS), (snap) => {
      currentOrdersDocs = snap.docs;
      emit();
    }, (err) => console.warn('Live orders for customers onSnapshot error:', err.message));
  } catch (err) {
    console.warn('Error setting up subscribeToLiveCustomers:', err);
  }

  return () => {
    if (unsubUsers) unsubUsers();
    if (unsubOrders) unsubOrders();
  };
}

export async function getLiveUser(userId) {
  const docRef = doc(db, COLL_USERS, userId);
  const snap = await getDoc(docRef);
  if (snap.exists()) return { id: snap.id, ...snap.data() };
  return null;
}

export function subscribeToLiveUser(userId, callback) {
  if (!userId) return () => {};
  const docRef = doc(db, COLL_USERS, userId);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists() && typeof callback === 'function') {
      callback({ id: snap.id, ...snap.data() });
    }
  }, (err) => {
    console.warn('Live user onSnapshot error:', err.message);
  });
}

export async function updateLiveUser(userId, updates) {
  const docRef = doc(db, COLL_USERS, userId);
  const cleaned = cleanFirestoreObject({ ...updates, updated_at: new Date().toISOString() });
  await setDoc(docRef, cleaned, { merge: true });
  const snap = await getDoc(docRef);
  return { id: snap.id, ...snap.data() };
}

export async function deleteLiveUser(userId, phone = '', email = '') {
  if (!userId) return false;
  try {
    // 1. Delete primary user document in COLL_USERS
    const docRef = doc(db, COLL_USERS, userId);
    await deleteDoc(docRef);

    // 2. Remove legacy duplicate user profiles by normalized phone or unique email
    const cleanPhone = (p) => p ? String(p).replace(/\D/g, '').slice(-10) : '';
    const cleanEmail = (e) => e ? String(e).toLowerCase().trim() : '';

    const cPhone = cleanPhone(phone);
    const cEmail = cleanEmail(email);

    if (cPhone || (cEmail && cEmail !== 'customer@foodmaxx.ng')) {
      const snap = await getDocs(collection(db, COLL_USERS));
      const deletes = [];
      snap.forEach(d => {
        if (d.id === userId) return;
        const data = d.data();
        const dPhone = cleanPhone(data.phone);
        const dEmail = cleanEmail(data.email);
        if ((cPhone && dPhone === cPhone) || (cEmail && cEmail !== 'customer@foodmaxx.ng' && dEmail === cEmail)) {
          deletes.push(deleteDoc(doc(db, COLL_USERS, d.id)));
        }
      });
      if (deletes.length > 0) {
        await Promise.all(deletes);
      }
    }

    // 3. Clean up user's wallet document if one exists
    try {
      await deleteDoc(doc(db, COLL_WALLETS, userId));
    } catch {}

    return true;
  } catch (err) {
    console.error('Failed to delete user in Firestore:', err);
    throw err;
  }
}

export async function addLiveAddress(userId, addressData) {
  const docRef = doc(db, COLL_USERS, userId);
  const snap = await getDoc(docRef);
  const addresses = snap.exists() ? (snap.data().savedAddresses || []) : [];
  const newAddr = {
    id: 'addr_' + Date.now(),
    ...addressData
  };
  addresses.push(newAddr);
  await setDoc(docRef, { savedAddresses: addresses }, { merge: true });
  return addresses;
}

export async function deleteLiveAddress(userId, addressId) {
  const docRef = doc(db, COLL_USERS, userId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return [];
  const addresses = (snap.data().savedAddresses || []).filter(a => a.id !== addressId);
  await setDoc(docRef, { savedAddresses: addresses }, { merge: true });
  return addresses;
}

// -------------------------------------------------------------
// LIVE SUPPORT TICKETS API
// -------------------------------------------------------------
export async function getLiveSupportTickets() {
  const snap = await getDocs(collection(db, COLL_SUPPORT));
  const list = [];
  snap.forEach(d => list.push({ id: d.id, ...d.data() }));
  list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return list;
}

export function subscribeToLiveSupportTickets(callback) {
  const q = collection(db, COLL_SUPPORT);
  return onSnapshot(q, (snapshot) => {
    const items = [];
    snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    items.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    callback(items);
  }, (err) => {
    console.warn('Live support tickets onSnapshot error:', err.message);
  });
}

export async function createLiveSupportTicket(ticketData) {
  const id = ticketData.id || ('st_' + Date.now());
  const docRef = doc(db, COLL_SUPPORT, id);
  const data = {
    ...ticketData,
    id,
    ticket_number: ticketData.ticket_number || ('TK-' + Math.floor(1000 + Math.random() * 9000)),
    status: ticketData.status || 'Open',
    created_at: new Date().toISOString(),
    replies: ticketData.replies || []
  };
  await setDoc(docRef, data, { merge: true });
  return data;
}

export async function replyLiveSupportTicket(ticketId, message) {
  const docRef = doc(db, COLL_SUPPORT, ticketId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Ticket not found');
  const current = snap.data();
  const replies = current.replies || [];
  replies.push({
    sender: 'admin',
    text: message,
    timestamp: new Date().toISOString()
  });
  const updates = {
    replies,
    status: 'Resolved',
    updated_at: new Date().toISOString()
  };
  await updateDoc(docRef, updates);
  return { ...current, ...updates };
}

export async function updateLiveTicketStatus(ticketId, status) {
  const docRef = doc(db, COLL_SUPPORT, ticketId);
  await updateDoc(docRef, {
    status,
    updated_at: new Date().toISOString()
  });
  const snap = await getDoc(docRef);
  return { id: snap.id, ...snap.data() };
}

// -------------------------------------------------------------
// LIVE REVIEWS API
// -------------------------------------------------------------
export async function getLiveReviews() {
  const snap = await getDocs(collection(db, COLL_REVIEWS));
  const list = [];
  snap.forEach(d => list.push({ id: d.id, ...d.data() }));
  return list;
}

export async function createLiveReview(reviewData) {
  const id = reviewData.id || ('rev_' + Date.now());
  const docRef = doc(db, COLL_REVIEWS, id);
  const data = {
    ...reviewData,
    id,
    rating: Number(reviewData.rating) || 5,
    created_at: new Date().toISOString()
  };
  await setDoc(docRef, data, { merge: true });
  return data;
}

// -------------------------------------------------------------
// LIVE REAL-TIME GROUP ORDERS API
// -------------------------------------------------------------
const COLL_GROUP_ORDERS = 'group_orders';

export async function createLiveGroupOrder(groupData) {
  const code = (groupData.code || `FMX-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase();
  const docRef = doc(db, COLL_GROUP_ORDERS, code);
  const data = {
    code,
    name: groupData.name || '',
    status: groupData.status || 'OPEN',
    creator_name: groupData.creator_name || groupData.organizer_name || '',
    creator_participant_id: groupData.creator_participant_id || groupData.organizer_id || '',
    organizer_id: groupData.organizer_id || groupData.creator_participant_id || '',
    organizer_name: groupData.organizer_name || groupData.creator_name || '',
    delivery_location: groupData.delivery_location || groupData.delivery_address || '',
    delivery_address: groupData.delivery_address || groupData.delivery_location || '',
    delivery_zone: groupData.delivery_zone || '',
    delivery_window: groupData.delivery_window || '',
    total_amount: Number(groupData.total_amount) || 0,
    cutoff_time: groupData.cutoff_time || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    participants: groupData.participants || groupData.members || [],
    members: groupData.members || groupData.participants || [],
    created_at: groupData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  await setDoc(docRef, data, { merge: true });

  // Sync to COLL_ORDERS ('orders') so Admin, Kitchen KDS, and Rider Dispatch immediately see this group order!
  try {
    const orderDocRef = doc(db, COLL_ORDERS, `GRP-${code}`);
    await setDoc(orderDocRef, {
      id: `GRP-${code}`,
      order_reference: code,
      customer_name: `${data.creator_name || 'Group Organizer'} (Group: ${data.name || code})`,
      customer_phone: groupData.phone || '',
      delivery_address: data.delivery_location || data.delivery_address || '',
      delivery_zone: data.delivery_zone || 'Standard Delivery',
      delivery_window: data.delivery_window || '',
      order_status: 'OPEN_GROUP',
      status: 'OPEN_GROUP',
      payment_status: 'pending',
      payment_method: 'group_split',
      is_group_order: true,
      group_code: code,
      items: [],
      total_amount: Number(data.total_amount) || 0,
      total: Number(data.total_amount) || 0,
      created_at: data.created_at,
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Sync group order to orders collection notice:', err);
  }

  return data;
}

export async function getLiveGroupOrder(code) {
  if (!code) return null;
  try {
    const docRef = doc(db, COLL_GROUP_ORDERS, code.toUpperCase());
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.warn('Failed to fetch live group order:', e);
    return null;
  }
}

export function subscribeToLiveGroupOrder(code, callback) {
  if (!code) return () => {};
  try {
    const docRef = doc(db, COLL_GROUP_ORDERS, code.toUpperCase());
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      } else {
        callback(null);
      }
    }, (err) => {
      console.warn('Group order real-time subscription notice:', err.message);
    });
  } catch (e) {
    console.warn('Error setting up group order listener:', e);
    return () => {};
  }
}

export async function updateLiveGroupOrderMembers(code, members) {
  if (!code) return null;
  try {
    const docRef = doc(db, COLL_GROUP_ORDERS, code.toUpperCase());
    await setDoc(docRef, {
      members,
      updated_at: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.error('Failed to update group members:', e);
    return false;
  }
}

export async function updateLiveGroupOrder(code, data) {
  if (!code) return null;
  try {
    const docRef = doc(db, COLL_GROUP_ORDERS, code.toUpperCase());
    await setDoc(docRef, {
      ...data,
      updated_at: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.error('Failed to update group order:', e);
    return false;
  }
}

export async function setLiveGroupOrderStatus(code, status, extra = {}) {
  if (!code) return null;
  try {
    const docRef = doc(db, COLL_GROUP_ORDERS, code.toUpperCase());
    await setDoc(docRef, {
      status,
      ...extra,
      updated_at: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.error('Failed to set group order status:', e);
    return false;
  }
}

export async function getAllLiveGroupOrders() {
  try {
    const snap = await getDocs(collection(db, COLL_GROUP_ORDERS));
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return list;
  } catch (e) {
    console.warn('Failed to fetch all live group orders:', e);
    return [];
  }
}

export function subscribeToAllLiveGroupOrders(callback) {
  try {
    const q = query(collection(db, COLL_GROUP_ORDERS));
    return onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      callback(list);
    }, (err) => {
      console.warn('Live group orders subscription warning:', err);
    });
  } catch (e) {
    console.warn('Failed to subscribe to group orders:', e);
    return () => {};
  }
}

export async function addParticipantToGroupOrder(code, participant) {
  if (!code || !participant) return false;
  try {
    const docRef = doc(db, COLL_GROUP_ORDERS, code.toUpperCase());
    const snap = await getDoc(docRef);
    if (!snap.exists()) return false;
    const current = snap.data();
    const existingParticipants = Array.isArray(current.participants) ? current.participants : [];
    
    // Check if participant already exists by phone or ID
    const exists = existingParticipants.find(p => 
      p.participant_id === participant.participant_id || 
      (participant.phone && p.phone === participant.phone)
    );
    
    let updated;
    if (exists) {
      updated = existingParticipants.map(p => 
        (p.participant_id === participant.participant_id || (participant.phone && p.phone === participant.phone))
          ? { ...p, ...participant }
          : p
      );
    } else {
      updated = [...existingParticipants, participant];
    }
    
    await setDoc(docRef, {
      participants: updated,
      updated_at: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.error('Failed to add participant to group:', e);
    return false;
  }
}

export async function recordParticipantPayment(code, participantId, paymentData = {}) {
  if (!code || !participantId) return false;
  try {
    const docRef = doc(db, COLL_GROUP_ORDERS, code.toUpperCase());
    const snap = await getDoc(docRef);
    if (!snap.exists()) return false;
    const current = snap.data();
    const existingParticipants = Array.isArray(current.participants) ? current.participants : [];
    
    const updated = existingParticipants.map(p => {
      if (p.participant_id === participantId || p.id === participantId) {
        return {
          ...p,
          items: paymentData.items || p.items || [],
          total: paymentData.total !== undefined ? paymentData.total : p.total,
          payment_status: 'PAID',
          paid: true,
          paystack_ref: paymentData.paystack_ref || paymentData.reference || `PSTK_${Date.now()}`,
          paid_at: new Date().toISOString()
        };
      }
      return p;
    });

    const totalPaidAmount = updated
      .filter(p => p.payment_status === 'PAID')
      .reduce((sum, p) => sum + (Number(p.total) || 0), 0);

    await setDoc(docRef, {
      participants: updated,
      total_amount: totalPaidAmount,
      updated_at: new Date().toISOString()
    }, { merge: true });

    // Sync to COLL_ORDERS ('orders') so Admin, Kitchen, and Radar show items and revenue
    try {
      const allItems = [];
      updated.forEach(p => {
        (p.items || []).forEach(it => {
          allItems.push({
            ...it,
            participant_name: p.name,
            name: `[${p.name}] ${it.name || it.item_name || 'Item'}`
          });
        });
      });
      const allPaid = updated.length > 0 && updated.every(p => p.payment_status === 'PAID');
      const orderDocRef = doc(db, COLL_ORDERS, `GRP-${code.toUpperCase()}`);
      await setDoc(orderDocRef, {
        items: allItems,
        total_amount: totalPaidAmount,
        total: totalPaidAmount,
        payment_status: allPaid ? 'paid' : (totalPaidAmount > 0 ? 'partial' : 'pending'),
        order_status: totalPaidAmount > 0 ? 'CONFIRMED' : 'OPEN_GROUP',
        status: totalPaidAmount > 0 ? 'CONFIRMED' : 'OPEN_GROUP',
        updated_at: new Date().toISOString()
      }, { merge: true });
    } catch (syncErr) {
      console.warn('Sync group order payment to orders notice:', syncErr);
    }

    return true;
  } catch (e) {
    console.error('Failed to record participant payment:', e);
    return false;
  }
}

// -------------------------------------------------------------
// LIVE SUBSCRIPTIONS API
// -------------------------------------------------------------
const COLL_SUBSCRIPTIONS = 'subscriptions';

export async function getLiveSubscriptions() {
  try {
    const snap = await getDocs(collection(db, COLL_SUBSCRIPTIONS));
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return list;
  } catch (e) {
    console.warn('Failed to fetch subscriptions:', e);
    return [];
  }
}

export function subscribeToLiveSubscriptions(callback) {
  try {
    const q = query(collection(db, COLL_SUBSCRIPTIONS));
    return onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      callback(list);
    }, err => console.warn('Subscriptions listener warning:', err));
  } catch (e) {
    return () => {};
  }
}

export async function createLiveSubscription(subData) {
  try {
    const id = subData.id || `SUB-${Date.now().toString().slice(-6)}`;
    const docRef = doc(db, COLL_SUBSCRIPTIONS, id);
    const cleaned = cleanFirestoreObject({
      ...subData,
      id,
      status: subData.status || 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    await setDoc(docRef, cleaned, { merge: true });
    return cleaned;
  } catch (e) {
    console.error('Failed to create subscription:', e);
    return null;
  }
}

export async function updateLiveSubscription(id, data) {
  if (!id) return false;
  try {
    const docRef = doc(db, COLL_SUBSCRIPTIONS, id);
    await setDoc(docRef, {
      ...cleanFirestoreObject(data),
      updated_at: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.error('Failed to update subscription:', e);
    return false;
  }
}

// -------------------------------------------------------------
// LIVE INVENTORY AUDIT & STOCK TRANSACTIONS API
// -------------------------------------------------------------
const COLL_INVENTORY_TRANSACTIONS = 'inventory_transactions';

export async function adjustLiveStockWithAudit(itemId, deltaQty, reason = 'Restock', performedBy = 'Admin') {
  if (!itemId || !deltaQty) return false;
  try {
    const productRef = doc(db, COLL_PRODUCTS, itemId);
    const snap = await getDoc(productRef);
    if (!snap.exists()) return false;
    
    const prod = snap.data();
    const currentStock = Number(prod.stock_quantity ?? prod.stockQuantity ?? 50);
    const newStock = Math.max(0, currentStock + deltaQty);
    
    // Update product stock in Firestore
    await setDoc(productRef, {
      stock_quantity: newStock,
      is_available: newStock > 0,
      updated_at: new Date().toISOString()
    }, { merge: true });

    // Record audit trail
    const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const txRef = doc(db, COLL_INVENTORY_TRANSACTIONS, txId);
    await setDoc(txRef, {
      id: txId,
      product_id: itemId,
      product_name: prod.name || 'Dish',
      previous_stock: currentStock,
      change_quantity: deltaQty,
      new_stock: newStock,
      reason,
      performed_by: performedBy,
      timestamp: new Date().toISOString()
    });
    return newStock;
  } catch (e) {
    console.error('Failed to adjust stock with audit:', e);
    return false;
  }
}

// -------------------------------------------------------------
// LIVE PRODUCTION BATCHES API (Kitchen Batching)
// -------------------------------------------------------------
const COLL_PRODUCTION_BATCHES = 'production_batches';

export async function getLiveProductionBatches() {
  try {
    const snap = await getDocs(collection(db, COLL_PRODUCTION_BATCHES));
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return list;
  } catch (e) {
    console.warn('Failed to fetch production batches:', e);
    return [];
  }
}

export function subscribeToLiveProductionBatches(callback) {
  try {
    const q = query(collection(db, COLL_PRODUCTION_BATCHES));
    return onSnapshot(q, snap => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      callback(list);
    }, err => console.warn('Batches listener warning:', err));
  } catch (e) {
    return () => {};
  }
}

export async function createLiveProductionBatch(batchData) {
  try {
    const id = batchData.id || `BATCH-${Date.now().toString().slice(-6)}`;
    const docRef = doc(db, COLL_PRODUCTION_BATCHES, id);
    const cleaned = cleanFirestoreObject({
      ...batchData,
      id,
      status: batchData.status || 'SCHEDULED', // SCHEDULED | IN_PREP | READY | COMPLETED
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    await setDoc(docRef, cleaned, { merge: true });
    return cleaned;
  } catch (e) {
    console.error('Failed to create production batch:', e);
    return null;
  }
}

export async function updateLiveProductionBatchStatus(batchId, status) {
  if (!batchId) return false;
  try {
    const docRef = doc(db, COLL_PRODUCTION_BATCHES, batchId);
    await setDoc(docRef, {
      status,
      updated_at: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.error('Failed to update batch status:', e);
    return false;
  }
}

// -------------------------------------------------------------
// LIVE DAILY APP VISITS & ANALYTICS TRACKING API
// -------------------------------------------------------------
export async function recordLiveAppVisit({ visitorId = '', userId = null, role = 'guest', path = '/' } = {}) {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const hour = new Date().getHours();
    const docRef = doc(db, COLL_DAILY_VISITS, todayStr);

    let isNewDailyUnique = false;
    if (typeof window !== 'undefined') {
      const storageKey = `fmx_visit_${todayStr}`;
      if (!localStorage.getItem(storageKey)) {
        isNewDailyUnique = true;
        try { localStorage.setItem(storageKey, '1'); } catch {}
      }
    }

    const snap = await getDoc(docRef);
    const nowIso = new Date().toISOString();
    let current = snap.exists() ? snap.data() : {
      date: todayStr,
      total_visits: 0,
      unique_visitors: 0,
      registered_visits: 0,
      guest_visits: 0,
      hourly_visits: {},
      created_at: nowIso
    };

    const hourly = current.hourly_visits || {};
    hourly[hour] = (hourly[hour] || 0) + 1;

    const payload = {
      date: todayStr,
      total_visits: (current.total_visits || 0) + 1,
      unique_visitors: isNewDailyUnique ? ((current.unique_visitors || 0) + 1) : Math.max(1, current.unique_visitors || 1),
      registered_visits: userId ? ((current.registered_visits || 0) + 1) : (current.registered_visits || 0),
      guest_visits: !userId ? ((current.guest_visits || 0) + 1) : (current.guest_visits || 0),
      hourly_visits: hourly,
      last_visit_at: nowIso,
      updated_at: nowIso
    };

    await setDoc(docRef, cleanFirestoreObject(payload), { merge: true });
    return payload;
  } catch (err) {
    console.warn('recordLiveAppVisit notice:', err.message);
    return null;
  }
}

export function formatDailyVisitsData(docs = [], days = 14) {
  const visitMap = new Map();
  docs.forEach(d => {
    const data = typeof d.data === 'function' ? d.data() : d;
    if (data?.date) {
      visitMap.set(data.date, data);
    }
  });

  const dailyList = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() - i);
    const dateStr = targetDate.toISOString().slice(0, 10);
    const dayLabel = targetDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const dayShort = targetDate.toLocaleDateString('en-US', { weekday: 'short' });

    const existing = visitMap.get(dateStr) || {
      date: dateStr,
      total_visits: 0,
      unique_visitors: 0,
      registered_visits: 0,
      guest_visits: 0,
      hourly_visits: {}
    };

    dailyList.push({
      date: dateStr,
      dayLabel,
      dayShort,
      total_visits: Number(existing.total_visits || 0),
      unique_visitors: Number(existing.unique_visitors || 0),
      registered_visits: Number(existing.registered_visits || 0),
      guest_visits: Number(existing.guest_visits || 0),
      hourly_visits: existing.hourly_visits || {},
      isToday: i === 0
    });
  }

  const todayStr = today.toISOString().slice(0, 10);
  const yesterdayDate = new Date(today);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

  const todayData = visitMap.get(todayStr) || { total_visits: 0, unique_visitors: 0 };
  const yesterdayData = visitMap.get(yesterdayStr) || { total_visits: 0, unique_visitors: 0 };

  const last7DaysTotal = dailyList.slice(-7).reduce((acc, d) => acc + d.total_visits, 0);
  const last7DaysUnique = dailyList.slice(-7).reduce((acc, d) => acc + d.unique_visitors, 0);

  // Compute peak hour today
  const hourlyToday = todayData.hourly_visits || {};
  let peakHour = 12;
  let peakHourCount = 0;
  Object.entries(hourlyToday).forEach(([h, count]) => {
    if (Number(count) > peakHourCount) {
      peakHourCount = Number(count);
      peakHour = Number(h);
    }
  });

  return {
    dailyList,
    todayVisits: Number(todayData.total_visits || 0),
    todayUnique: Number(todayData.unique_visitors || 0),
    yesterdayVisits: Number(yesterdayData.total_visits || 0),
    last7DaysTotal,
    last7DaysUnique,
    peakHourStr: `${peakHour % 12 || 12}:00 ${peakHour >= 12 ? 'PM' : 'AM'}`,
    growthRate: yesterdayData.total_visits > 0
      ? Math.round(((todayData.total_visits - yesterdayData.total_visits) / yesterdayData.total_visits) * 100)
      : (todayData.total_visits > 0 ? 100 : 0)
  };
}

export async function getLiveDailyVisits(days = 14) {
  try {
    const snap = await getDocs(collection(db, COLL_DAILY_VISITS));
    return formatDailyVisitsData(snap.docs, days);
  } catch (err) {
    console.warn('getLiveDailyVisits notice:', err.message);
    return formatDailyVisitsData([], days);
  }
}

export function subscribeToLiveDailyVisits(callback, days = 14) {
  if (typeof callback !== 'function') return () => {};
  try {
    const q = query(collection(db, COLL_DAILY_VISITS));
    return onSnapshot(q, (snap) => {
      const formatted = formatDailyVisitsData(snap.docs, days);
      callback(formatted);
    }, (err) => console.warn('Daily visits snapshot error:', err.message));
  } catch (err) {
    console.warn('Error subscribing to live daily visits:', err);
    return () => {};
  }
}

// -------------------------------------------------------------
// LIVE ORDER CHAT & MESSAGING
// -------------------------------------------------------------
export async function getLiveOrderMessages(orderId) {
  if (!orderId) return [];
  try {
    const docRef = doc(db, COLL_ORDERS, orderId);
    const snap = await getDoc(docRef);
    if (snap.exists() && Array.isArray(snap.data().messages)) {
      return snap.data().messages;
    }
  } catch (err) {
    console.warn('getLiveOrderMessages error:', err);
  }
  try {
    const stored = localStorage.getItem(`fmx_chat_${orderId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function sendLiveOrderMessage(orderId, text, sender = 'customer') {
  if (!orderId || !text) return null;
  const newMsg = {
    id: 'msg_' + Date.now(),
    order_id: orderId,
    sender,
    text,
    created_at: new Date().toISOString()
  };
  try {
    const docRef = doc(db, COLL_ORDERS, orderId);
    const snap = await getDoc(docRef);
    const current = snap.exists() && Array.isArray(snap.data().messages) ? snap.data().messages : [];
    const updated = [...current, newMsg];
    await updateDoc(docRef, { messages: updated });
  } catch (err) {
    console.warn('sendLiveOrderMessage error:', err);
  }
  try {
    const key = `fmx_chat_${orderId}`;
    const stored = localStorage.getItem(key);
    const list = stored ? JSON.parse(stored) : [];
    localStorage.setItem(key, JSON.stringify([...list, newMsg]));
  } catch {}
  return newMsg;
}

// ============================================================
// HERO CAROUSEL SLIDES & BANNER MANAGEMENT
// ============================================================
const COLL_HERO_SLIDES = 'hero_slides';

export const DEFAULT_HERO_SLIDES = [
  {
    id: 'slide_default_1',
    title: 'Super Delicious Asun Pasta Combo',
    subtitle: 'Pasta + Plantain + Fried Chicken starting from ₦3,500.',
    badge: 'HOT & SPICY',
    badge_bg: '#E51A24',
    image_url: '/asun-pasta-combo-banner.png',
    banner_type: 'full',
    fit_mode: 'cover',
    hide_text: true,
    cta_text: 'Order Now →',
    cta_link: 'pasta',
    gradient: 'from-[#990000] via-[#C5110E] to-[#E51A24]',
    active: true,
    sort_order: 1
  },
  {
    id: 'slide_default_2',
    title: 'Smoky Firewood Jollof Feast',
    subtitle: 'Authentic party jollof with crispy fried plantain and peppered beef.',
    badge: 'CUSTOMER FAVORITE',
    badge_bg: '#D97706',
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
    banner_type: 'split',
    fit_mode: 'contain',
    hide_text: false,
    cta_text: 'Explore Jollof →',
    cta_link: 'jollof',
    gradient: 'from-[#D97706] via-[#EA580C] to-[#C2410C]',
    active: true,
    sort_order: 2
  },
  {
    id: 'slide_default_3',
    title: 'Peppered Asun & Suya Grills',
    subtitle: 'Spicy, flame-grilled goat meat and beef seasoned with suya spices.',
    badge: 'WEEKEND SPECIAL',
    badge_bg: '#DC2626',
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80',
    banner_type: 'split',
    fit_mode: 'contain',
    hide_text: false,
    cta_text: 'Get Grills →',
    cta_link: 'grills',
    gradient: 'from-[#B91C1C] via-[#991B1B] to-[#7F1D1D]',
    active: true,
    sort_order: 3
  }
];

export async function getLiveHeroSlides() {
  try {
    const snap = await getDocs(collection(db, COLL_HERO_SLIDES));
    let isInitialized = false;
    try {
      isInitialized = localStorage.getItem('fmx_hero_slides_initialized') === 'true';
    } catch (e) {}

    if (snap.empty) {
      if (isInitialized) return [];
      // Auto-seed defaults into Firestore as real documents
      for (const d of DEFAULT_HERO_SLIDES) {
        await setDoc(doc(db, COLL_HERO_SLIDES, d.id), d, { merge: true });
      }
      try { localStorage.setItem('fmx_hero_slides_initialized', 'true'); } catch {}
      return DEFAULT_HERO_SLIDES;
    }

    try { localStorage.setItem('fmx_hero_slides_initialized', 'true'); } catch {}
    const slides = [];
    snap.forEach(d => slides.push({ id: d.id, ...d.data() }));
    slides.sort((a, b) => (Number(a.sort_order) || 99) - (Number(b.sort_order) || 99));

    // Filter out deleted slides
    let deletedIds = [];
    try { deletedIds = JSON.parse(localStorage.getItem('fmx_deleted_hero_slides') || '[]'); } catch {}
    const finalSlides = slides.filter(s => !deletedIds.includes(s.id));

    return finalSlides;
  } catch (err) {
    console.warn('getLiveHeroSlides error:', err);
    try {
      const stored = localStorage.getItem('fmx_hero_slides');
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_HERO_SLIDES;
  }
}

export function subscribeToLiveHeroSlides(callback) {
  try {
    const q = query(collection(db, COLL_HERO_SLIDES));
    return onSnapshot(q, async (snapshot) => {
      let isInitialized = false;
      try {
        isInitialized = localStorage.getItem('fmx_hero_slides_initialized') === 'true';
      } catch (e) {}

      if (snapshot.empty) {
        if (isInitialized) {
          // Admin deliberately deleted all slides
          callback([]);
          return;
        }
        // First-time visit: auto-seed defaults into Firestore as real documents!
        try {
          for (const d of DEFAULT_HERO_SLIDES) {
            await setDoc(doc(db, COLL_HERO_SLIDES, d.id), d, { merge: true });
          }
          await setDoc(doc(db, COLL_SETTINGS, 'hero_slides_config'), { initialized: true }, { merge: true });
          localStorage.setItem('fmx_hero_slides_initialized', 'true');
        } catch (seedErr) {
          console.warn('Auto-seed hero slides notice:', seedErr);
        }
        callback(DEFAULT_HERO_SLIDES);
        return;
      }

      try {
        localStorage.setItem('fmx_hero_slides_initialized', 'true');
      } catch (e) {}

      const slides = [];
      snapshot.forEach(d => slides.push({ id: d.id, ...d.data() }));
      slides.sort((a, b) => (Number(a.sort_order) || 99) - (Number(b.sort_order) || 99));

      // Filter out any explicitly deleted slides to prevent resurrecting
      let deletedIds = [];
      try {
        deletedIds = JSON.parse(localStorage.getItem('fmx_deleted_hero_slides') || '[]');
      } catch (e) {}
      const finalSlides = slides.filter(s => !deletedIds.includes(s.id));

      try {
        localStorage.setItem('fmx_hero_slides', JSON.stringify(finalSlides));
      } catch {}
      callback(finalSlides);
    }, (err) => {
      console.warn('subscribeToLiveHeroSlides snapshot error:', err);
      try {
        const stored = localStorage.getItem('fmx_hero_slides');
        if (stored) {
          callback(JSON.parse(stored));
          return;
        }
      } catch {}
      callback(DEFAULT_HERO_SLIDES);
    });
  } catch (err) {
    console.warn('subscribeToLiveHeroSlides catch error:', err);
    callback(DEFAULT_HERO_SLIDES);
    return () => {};
  }
}

export async function createLiveHeroSlide(slideData) {
  try {
    const id = slideData.id || `slide_${Date.now()}`;
    const docRef = doc(db, COLL_HERO_SLIDES, id);
    const payload = {
      ...slideData,
      id,
      active: slideData.active !== false,
      sort_order: Number(slideData.sort_order) || 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await setDoc(docRef, payload, { merge: true });
    // Also remove from deleted IDs list if recreating
    try {
      const deleted = JSON.parse(localStorage.getItem('fmx_deleted_hero_slides') || '[]');
      const filtered = deleted.filter(d => d !== id);
      localStorage.setItem('fmx_deleted_hero_slides', JSON.stringify(filtered));
      localStorage.setItem('fmx_hero_slides_initialized', 'true');
    } catch (e) {}
    return payload;
  } catch (err) {
    console.error('createLiveHeroSlide error:', err);
    throw err;
  }
}

export async function updateLiveHeroSlide(slideId, updates) {
  try {
    const docRef = doc(db, COLL_HERO_SLIDES, slideId);
    const payload = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    await setDoc(docRef, payload, { merge: true });
    try {
      localStorage.setItem('fmx_hero_slides_initialized', 'true');
    } catch (e) {}
    return { id: slideId, ...payload };
  } catch (err) {
    console.error('updateLiveHeroSlide error:', err);
    throw err;
  }
}

export async function deleteLiveHeroSlide(slideId) {
  try {
    // 1. Mark as deleted in local storage immediately so it can never be resurrected
    try {
      const deleted = JSON.parse(localStorage.getItem('fmx_deleted_hero_slides') || '[]');
      if (!deleted.includes(slideId)) {
        deleted.push(slideId);
        localStorage.setItem('fmx_deleted_hero_slides', JSON.stringify(deleted));
      }
      const stored = JSON.parse(localStorage.getItem('fmx_hero_slides') || '[]');
      const updated = stored.filter(s => s.id !== slideId);
      localStorage.setItem('fmx_hero_slides', JSON.stringify(updated));
      localStorage.setItem('fmx_hero_slides_initialized', 'true');
      window.dispatchEvent(new CustomEvent('fmx_hero_slides_updated', { detail: updated }));
    } catch (e) {}

    // 2. Mark initialized in settings so empty collection won't respawn defaults
    try {
      const cfgRef = doc(db, COLL_SETTINGS, 'hero_slides_config');
      await setDoc(cfgRef, { initialized: true, updated_at: new Date().toISOString() }, { merge: true });
    } catch (e) {}

    // 3. Check if Firestore had only virtual defaults or real docs
    const snap = await getDocs(collection(db, COLL_HERO_SLIDES));
    if (snap.empty) {
      // If Firestore was empty and user deleted one default slide, seed the REMAINING ones!
      const remaining = DEFAULT_HERO_SLIDES.filter(s => s.id !== slideId);
      for (const s of remaining) {
        await setDoc(doc(db, COLL_HERO_SLIDES, s.id), s, { merge: true });
      }
    } else {
      // Physically delete the document from Firestore
      const docRef = doc(db, COLL_HERO_SLIDES, slideId);
      await deleteDoc(docRef);
    }
    return true;
  } catch (err) {
    console.error('deleteLiveHeroSlide error:', err);
    throw err;
  }
}



